const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/balances/me
router.get('/me', async (req, res) => {
  try {
    const userId = req.user.id;

    // Total paid by user across all groups
    const paidRes = await db.query(`
      SELECT SUM(amount_paid) as total_paid
      FROM expense_payers
      WHERE user_id = $1
    `, [userId]);
    
    // Total owed by user across all groups
    const owedRes = await db.query(`
      SELECT SUM(amount_owed) as total_owed
      FROM expense_splits
      WHERE user_id = $1
    `, [userId]);

    // Settlements paid out by user
    const setPaidRes = await db.query(`
      SELECT SUM(amount) as settlements_paid
      FROM settlements
      WHERE paid_by = $1
    `, [userId]);

    // Settlements received by user
    const setRecvRes = await db.query(`
      SELECT SUM(amount) as settlements_received
      FROM settlements
      WHERE paid_to = $1
    `, [userId]);

    const totalPaid = parseFloat(paidRes.rows[0].total_paid || 0);
    const totalOwed = parseFloat(owedRes.rows[0].total_owed || 0);
    const settlementsPaid = parseFloat(setPaidRes.rows[0].settlements_paid || 0);
    const settlementsReceived = parseFloat(setRecvRes.rows[0].settlements_received || 0);

    const netBalance = (totalPaid - totalOwed) + (settlementsPaid - settlementsReceived);

    // Compute detailed debts per group for the Settle Up UI
    const groupsRes = await db.query('SELECT group_id FROM group_members WHERE user_id = $1', [userId]);
    const groupIds = groupsRes.rows.map(r => r.group_id);
    
    let detailedDebts = [];

    for (let groupId of groupIds) {
      // Get all user balances in this group
      const bRes = await db.query(`
        WITH paid AS (
          SELECT user_id, SUM(amount_paid) as val FROM expense_payers ep JOIN expenses e ON ep.expense_id = e.id WHERE e.group_id = $1 GROUP BY user_id
        ),
        owed AS (
          SELECT user_id, SUM(amount_owed) as val FROM expense_splits es JOIN expenses e ON es.expense_id = e.id WHERE e.group_id = $1 GROUP BY user_id
        ),
        set_paid AS (
          SELECT paid_by as user_id, SUM(amount) as val FROM settlements WHERE group_id = $1 GROUP BY paid_by
        ),
        set_recv AS (
          SELECT paid_to as user_id, SUM(amount) as val FROM settlements WHERE group_id = $1 GROUP BY paid_to
        ),
        all_users AS (
          SELECT user_id FROM group_members WHERE group_id = $1
        )
        SELECT 
          u.user_id,
          us.name,
          COALESCE(p.val, 0) - COALESCE(o.val, 0) + COALESCE(sp.val, 0) - COALESCE(sr.val, 0) as net_balance
        FROM all_users u
        JOIN users us ON u.user_id = us.id
        LEFT JOIN paid p ON u.user_id = p.user_id
        LEFT JOIN owed o ON u.user_id = o.user_id
        LEFT JOIN set_paid sp ON u.user_id = sp.user_id
        LEFT JOIN set_recv sr ON u.user_id = sr.user_id
      `, [groupId]);

      const groupBalances = bRes.rows.map(r => ({ ...r, net_balance: parseFloat(r.net_balance) }));
      
      const myBalanceObj = groupBalances.find(b => b.user_id === userId);
      const myBalance = myBalanceObj ? myBalanceObj.net_balance : 0;

      // Simple greedy pairing to find who I owe (if myBalance < 0)
      if (myBalance < -0.01) {
        let amountIOwe = Math.abs(myBalance);
        // Find users with positive balances
        let creditors = groupBalances.filter(b => b.net_balance > 0.01).sort((a,b) => b.net_balance - a.net_balance);
        
        for (let cred of creditors) {
          if (amountIOwe <= 0.01) break;
          let settleAmount = Math.min(amountIOwe, cred.net_balance);
          amountIOwe -= settleAmount;
          detailedDebts.push({
            groupId: groupId,
            owedToId: cred.user_id,
            owedToName: cred.name,
            amount: settleAmount
          });
        }
      }
    }

    res.json({
      totalPaid,
      totalOwed,
      settlementsPaid,
      settlementsReceived,
      netBalance,
      detailedDebts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
