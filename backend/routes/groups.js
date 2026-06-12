const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/groups
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT g.id, g.name, g.created_at 
       FROM groups g 
       JOIN group_members gm ON g.id = gm.group_id 
       WHERE gm.user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups
router.post('/', async (req, res) => {
  const { name } = req.body;
  try {
    await db.query('BEGIN');
    const groupResult = await db.query(
      'INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING *',
      [name, req.user.id]
    );
    const group = groupResult.rows[0];

    await db.query(
      'INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)',
      [group.id, req.user.id]
    );
    await db.query('COMMIT');
    res.status(201).json(group);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/invite
router.post('/:id/invite', async (req, res) => {
  const { invited_email } = req.body;
  const groupId = req.params.id;
  try {
    // Check if user is already a member
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [invited_email]);
    if (userResult.rows.length > 0) {
      const isMember = await db.query(
        'SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2',
        [groupId, userResult.rows[0].id]
      );
      if (isMember.rows.length > 0) {
        return res.status(400).json({ error: 'User is already a member' });
      }
    }

    const inviteResult = await db.query(
      `INSERT INTO group_invites (group_id, invited_email, invited_by) 
       VALUES ($1, $2, $3) RETURNING *`,
      [groupId, invited_email, req.user.id]
    );
    res.status(201).json(inviteResult.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/invites/:inviteId/accept
router.post('/:id/invites/:inviteId/accept', async (req, res) => {
  const { id, inviteId } = req.params;
  try {
    const inviteRes = await db.query(
      'SELECT * FROM group_invites WHERE id = $1 AND group_id = $2 AND status = $3',
      [inviteId, id, 'pending']
    );
    if (inviteRes.rows.length === 0) {
      return res.status(404).json({ error: 'Invite not found or already processed' });
    }

    const invite = inviteRes.rows[0];
    if (invite.invited_email !== req.user.email) {
      return res.status(403).json({ error: 'Not authorized to accept this invite' });
    }

    await db.query('BEGIN');
    await db.query('UPDATE group_invites SET status = $1 WHERE id = $2', ['accepted', inviteId]);
    await db.query('INSERT INTO group_members (group_id, user_id) VALUES ($1, $2)', [id, req.user.id]);
    await db.query('COMMIT');
    res.json({ message: 'Invite accepted' });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/groups/:id/members/:userId
router.delete('/:id/members/:userId', async (req, res) => {
  const { id, userId } = req.params;
  try {
    await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id/expenses
router.get('/:id/expenses', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      'SELECT * FROM expenses WHERE group_id = $1 ORDER BY created_at DESC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/expenses
router.post('/:id/expenses', async (req, res) => {
  const { id } = req.params;
  const { description, total_amount, split_type, payers, splits } = req.body;
  // payers: [{user_id, amount_paid}]
  // splits: [{user_id, amount_owed, percentage, shares}]

  try {
    await db.query('BEGIN');
    const expenseRes = await db.query(
      `INSERT INTO expenses (group_id, description, total_amount, split_type, created_by) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, description, total_amount, split_type, req.user.id]
    );
    const expense = expenseRes.rows[0];

    for (const payer of payers) {
      await db.query(
        'INSERT INTO expense_payers (expense_id, user_id, amount_paid) VALUES ($1, $2, $3)',
        [expense.id, payer.user_id, payer.amount_paid]
      );
    }

    for (const split of splits) {
      await db.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed, percentage, shares) 
         VALUES ($1, $2, $3, $4, $5)`,
        [expense.id, split.user_id, split.amount_owed, split.percentage, split.shares]
      );
    }

    await db.query('COMMIT');
    res.status(201).json(expense);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/groups/:id/settlements
router.post('/:id/settlements', async (req, res) => {
  const { id } = req.params;
  const { paid_to, amount } = req.body;
  const paid_by = req.user.id;
  try {
    // Basic validation, further validation against computed balances would go here
    const result = await db.query(
      `INSERT INTO settlements (group_id, paid_by, paid_to, amount) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, paid_by, paid_to, amount]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id/balances
router.get('/:id/balances', async (req, res) => {
  const { id } = req.params;
  try {
    // We compute balances by aggregating payers, splits and settlements within this group
    // This is a simplified on-the-fly computation
    
    // Total paid by each user in this group
    const paidRes = await db.query(`
      SELECT user_id, SUM(amount_paid) as total_paid
      FROM expense_payers ep
      JOIN expenses e ON ep.expense_id = e.id
      WHERE e.group_id = $1
      GROUP BY user_id
    `, [id]);
    
    // Total owed by each user in this group
    const owedRes = await db.query(`
      SELECT user_id, SUM(amount_owed) as total_owed
      FROM expense_splits es
      JOIN expenses e ON es.expense_id = e.id
      WHERE e.group_id = $1
      GROUP BY user_id
    `, [id]);

    // Settlements paid out by user in group
    const setPaidRes = await db.query(`
      SELECT paid_by as user_id, SUM(amount) as settlements_paid
      FROM settlements
      WHERE group_id = $1
      GROUP BY paid_by
    `, [id]);

    // Settlements received by user in group
    const setRecvRes = await db.query(`
      SELECT paid_to as user_id, SUM(amount) as settlements_received
      FROM settlements
      WHERE group_id = $1
      GROUP BY paid_to
    `, [id]);

    // Combine all in memory (for simplicity and flexibility)
    const balances = {};
    
    const initUser = (userId) => {
      if (!balances[userId]) balances[userId] = { paid: 0, owed: 0, settlementsPaid: 0, settlementsReceived: 0 };
    };

    paidRes.rows.forEach(r => { initUser(r.user_id); balances[r.user_id].paid = parseFloat(r.total_paid); });
    owedRes.rows.forEach(r => { initUser(r.user_id); balances[r.user_id].owed = parseFloat(r.total_owed); });
    setPaidRes.rows.forEach(r => { initUser(r.user_id); balances[r.user_id].settlementsPaid = parseFloat(r.settlements_paid); });
    setRecvRes.rows.forEach(r => { initUser(r.user_id); balances[r.user_id].settlementsReceived = parseFloat(r.settlements_received); });

    // Net balance = (paid - owed) + (settlementsPaid - settlementsReceived)
    const netBalances = {};
    for (const [userId, b] of Object.entries(balances)) {
      netBalances[userId] = (b.paid - b.owed) + (b.settlementsPaid - b.settlementsReceived);
    }

    res.json(netBalances);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
