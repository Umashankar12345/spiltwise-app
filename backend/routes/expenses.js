const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// GET /api/expenses/:id
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const expenseRes = await db.query('SELECT * FROM expenses WHERE id = $1', [id]);
    if (expenseRes.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    const expense = expenseRes.rows[0];

    const payersRes = await db.query(
      `SELECT ep.*, u.name 
       FROM expense_payers ep 
       JOIN users u ON ep.user_id = u.id 
       WHERE ep.expense_id = $1`, 
      [id]
    );
    const splitsRes = await db.query(
      `SELECT es.*, u.name 
       FROM expense_splits es 
       JOIN users u ON es.user_id = u.id 
       WHERE es.expense_id = $1`, 
      [id]
    );

    res.json({
      ...expense,
      payers: payersRes.rows,
      splits: splitsRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
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
    
    // Update expense
    const expenseRes = await db.query(
      `UPDATE expenses 
       SET description = $1, total_amount = $2, split_type = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 RETURNING *`,
      [description, total_amount, split_type, id]
    );

    if (expenseRes.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Expense not found' });
    }

    // Delete existing payers and splits
    await db.query('DELETE FROM expense_payers WHERE expense_id = $1', [id]);
    await db.query('DELETE FROM expense_splits WHERE expense_id = $1', [id]);

    // Re-insert payers
    for (const payer of payers) {
      await db.query(
        'INSERT INTO expense_payers (expense_id, user_id, amount_paid) VALUES ($1, $2, $3)',
        [id, payer.user_id, payer.amount_paid]
      );
    }

    // Re-insert splits
    for (const split of finalSplits) {
      await db.query(
        `INSERT INTO expense_splits (expense_id, user_id, amount_owed, percentage, shares) 
         VALUES ($1, $2, $3, $4, $5)`,
        [id, split.user_id, split.amount_owed, split.percentage, split.shares]
      );
    }

    await db.query('COMMIT');
    res.json(expenseRes.rows[0]);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM expenses WHERE id = $1', [id]);
    res.json({ message: 'Expense deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/expenses/:id/messages
router.get('/:id/messages', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query(
      `SELECT m.*, u.name as user_name 
       FROM expense_messages m 
       JOIN users u ON m.user_id = u.id 
       WHERE m.expense_id = $1 
       ORDER BY m.created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
