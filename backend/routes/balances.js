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

    res.json({
      totalPaid,
      totalOwed,
      settlementsPaid,
      settlementsReceived,
      netBalance
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
