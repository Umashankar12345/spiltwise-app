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

// GET /api/groups/invites/pending
router.get('/invites/pending', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT gi.*, g.name as group_name, u.name as invited_by_name 
       FROM group_invites gi
       JOIN groups g ON gi.group_id = g.id
       LEFT JOIN users u ON gi.invited_by = u.id
       WHERE gi.invited_email = $1 AND gi.status = 'pending'`,
      [req.user.email]
    );
    res.json(result.rows);
  } catch (err) {
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
    const balanceQuery = `
      WITH paid AS (
        SELECT COALESCE(SUM(amount_paid), 0) as val FROM expense_payers ep JOIN expenses e ON ep.expense_id = e.id WHERE e.group_id = $1 AND ep.user_id = $2
      ),
      owed AS (
        SELECT COALESCE(SUM(amount_owed), 0) as val FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.group_id = $1 AND es.user_id = $2
      ),
      set_paid AS (
        SELECT COALESCE(SUM(amount), 0) as val FROM settlements WHERE group_id = $1 AND paid_by = $2
      ),
      set_recv AS (
        SELECT COALESCE(SUM(amount), 0) as val FROM settlements WHERE group_id = $1 AND paid_to = $2
      )
      SELECT (SELECT val FROM paid) - (SELECT val FROM owed) + (SELECT val FROM set_paid) - (SELECT val FROM set_recv) as net_balance
    `;
    const balanceRes = await db.query(balanceQuery, [id, userId]);
    const netBalance = parseFloat(balanceRes.rows[0].net_balance || 0);

    if (Math.abs(netBalance) > 0.01) {
      return res.status(400).json({ error: 'Cannot remove member: They have unsettled balances in this group.' });
    }

    await db.query('DELETE FROM group_members WHERE group_id = $1 AND user_id = $2', [id, userId]);
    res.json({ message: 'Member removed' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/groups/:id/members
router.get('/:id/members', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT u.id, u.name, u.email 
       FROM group_members gm 
       JOIN users u ON gm.user_id = u.id 
       WHERE gm.group_id = $1`,
      [id]
    );
    res.json(result.rows);
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

  let finalSplits = [...splits];
  const tAmount = parseFloat(total_amount);

  if (split_type === 'percentage') {
    let totalPct = finalSplits.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0);
    if (Math.abs(totalPct - 100) > 0.1) {
      return res.status(400).json({ error: 'Percentages must sum to 100' });
    }
    let calculatedSum = 0;
    for (let i = 0; i < finalSplits.length; i++) {
      let pct = parseFloat(finalSplits[i].percentage || 0);
      let amt = Math.round((tAmount * pct / 100) * 100) / 100;
      finalSplits[i].amount_owed = amt;
      calculatedSum += amt;
    }
    // Handle remainder
    let diff = Math.round((tAmount - calculatedSum) * 100) / 100;
    if (diff !== 0 && finalSplits.length > 0) {
      finalSplits[finalSplits.length - 1].amount_owed = Math.round((finalSplits[finalSplits.length - 1].amount_owed + diff) * 100) / 100;
    }
  } else if (split_type === 'share') {
    let totalShares = finalSplits.reduce((sum, s) => sum + parseInt(s.shares || 0, 10), 0);
    if (totalShares <= 0) {
      return res.status(400).json({ error: 'Total shares must be greater than zero' });
    }
    let calculatedSum = 0;
    for (let i = 0; i < finalSplits.length; i++) {
      let shares = parseInt(finalSplits[i].shares || 0, 10);
      if (shares < 0) return res.status(400).json({ error: 'Shares cannot be negative' });
      let amt = Math.round((tAmount * shares / totalShares) * 100) / 100;
      finalSplits[i].amount_owed = amt;
      calculatedSum += amt;
    }
    // Handle remainder
    let diff = Math.round((tAmount - calculatedSum) * 100) / 100;
    if (diff !== 0 && finalSplits.length > 0) {
      finalSplits[finalSplits.length - 1].amount_owed = Math.round((finalSplits[finalSplits.length - 1].amount_owed + diff) * 100) / 100;
    }
  }

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

    for (const split of finalSplits) {
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
    if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than zero' });

    // Validate against computed balances
    const balanceQuery = `
      WITH paid AS (
        SELECT COALESCE(SUM(amount_paid), 0) as val FROM expense_payers ep JOIN expenses e ON ep.expense_id = e.id WHERE e.group_id = $1 AND ep.user_id = $2
      ),
      owed AS (
        SELECT COALESCE(SUM(amount_owed), 0) as val FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.group_id = $1 AND es.user_id = $2
      ),
      set_paid AS (
        SELECT COALESCE(SUM(amount), 0) as val FROM settlements WHERE group_id = $1 AND paid_by = $2
      ),
      set_recv AS (
        SELECT COALESCE(SUM(amount), 0) as val FROM settlements WHERE group_id = $1 AND paid_to = $2
      )
      SELECT (SELECT val FROM paid) - (SELECT val FROM owed) + (SELECT val FROM set_paid) - (SELECT val FROM set_recv) as net_balance
    `;

    const paidByBalanceRes = await db.query(balanceQuery, [id, paid_by]);
    const paidByBalance = parseFloat(paidByBalanceRes.rows[0].net_balance || 0);

    if (paidByBalance >= -0.01) { // Allowing tiny floating point diffs
      return res.status(400).json({ error: 'You do not owe any money in this group' });
    }
    if (amount > Math.abs(paidByBalance) + 0.01) {
      return res.status(400).json({ error: 'Settlement amount cannot exceed your total owed amount' });
    }

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

const multer = require('multer');
const csvParser = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });

// POST /api/groups/:id/expenses/import
router.post('/:id/expenses/import', upload.single('file'), async (req, res) => {
  const { id } = req.params;
  const filePath = req.file?.path;
  
  if (!filePath) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const anomalies = [];
  const validExpenses = [];
  let rowCount = 0;

  try {
    // 1. Get group members
    const membersRes = await db.query(
      `SELECT u.id, u.email FROM group_members gm JOIN users u ON gm.user_id = u.id WHERE gm.group_id = $1`,
      [id]
    );
    const members = membersRes.rows;
    const memberEmails = members.map(m => m.email);

    if (members.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Group has no members' });
    }

    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (data) => {
        rowCount++;
        let isAnomaly = false;
        
        // Expected columns: Date, Description, Amount, PaidByEmail
        let { Date, Description, Amount, PaidByEmail } = data;
        
        // Check for anomalies
        if (!Amount || isNaN(parseFloat(Amount)) || parseFloat(Amount) <= 0) {
          anomalies.push({ row: rowCount, issue: 'Invalid or missing Amount', action: 'Skipped row', data });
          isAnomaly = true;
        }

        if (!PaidByEmail || !memberEmails.includes(PaidByEmail)) {
          anomalies.push({ row: rowCount, issue: 'PaidByEmail is missing or not a member of the group', action: 'Skipped row', data });
          isAnomaly = true;
        }

        if (!Description || Description.trim() === '') {
          anomalies.push({ row: rowCount, issue: 'Missing Description', action: 'Set description to "Imported Expense"', data });
          Description = 'Imported Expense';
        }

        if (!isAnomaly) {
          validExpenses.push({
            description: Description,
            amount: parseFloat(Amount),
            paidByEmail: PaidByEmail,
            date: Date
          });
        }
      })
      .on('end', async () => {
        let insertedCount = 0;
        try {
          await db.query('BEGIN');
          for (const exp of validExpenses) {
            const payer = members.find(m => m.email === exp.paidByEmail);
            
            const expenseRes = await db.query(
              `INSERT INTO expenses (group_id, description, total_amount, split_type, created_by) 
               VALUES ($1, $2, $3, $4, $5) RETURNING *`,
              [id, exp.description, exp.amount, 'equal', req.user.id]
            );
            const expenseId = expenseRes.rows[0].id;

            await db.query(
              'INSERT INTO expense_payers (expense_id, user_id, amount_paid) VALUES ($1, $2, $3)',
              [expenseId, payer.id, exp.amount]
            );

            const splitAmount = Math.round((exp.amount / members.length) * 100) / 100;
            let calculatedSum = 0;

            for (let i = 0; i < members.length; i++) {
              let amt = splitAmount;
              calculatedSum += amt;
              if (i === members.length - 1) {
                let diff = Math.round((exp.amount - calculatedSum) * 100) / 100;
                amt = Math.round((amt + diff) * 100) / 100;
              }
              await db.query(
                `INSERT INTO expense_splits (expense_id, user_id, amount_owed) VALUES ($1, $2, $3)`,
                [expenseId, members[i].id, amt]
              );
            }
            insertedCount++;
          }
          await db.query('COMMIT');
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

          res.json({
            message: 'Import complete',
            totalRows: rowCount,
            insertedCount,
            anomalies
          });
        } catch (dbErr) {
          await db.query('ROLLBACK');
          console.error(dbErr);
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          res.status(500).json({ error: 'Database error during import' });
        }
      });
  } catch (err) {
    console.error(err);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
