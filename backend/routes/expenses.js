const express = require('express');
const db = require('../db');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

router.use(authMiddleware);

// PUT /api/expenses/:id
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { description, total_amount, split_type, payers, splits } = req.body;
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
    for (const split of splits) {
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
      'SELECT * FROM expense_messages WHERE expense_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
