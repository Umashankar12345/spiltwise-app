# AI_USAGE.md: AI Usage Log

## AI Tools Used
- Antigravity (Google DeepMind AI Coding Assistant).

## Key Prompts
- *"Please add a CSV import feature to the Splitwise app that detects anomalies like negative amounts, invalid users, and missing descriptions, and produces an import report."*
- *"Generate the SCOPE.md, DECISIONS.md, and Import Report as per the assignment requirements."*

## Concrete Cases Where AI Produced Something Wrong

1. **Incorrect Route Placement**
   - *What happened*: The AI initially planned to put the CSV import endpoint in `routes/expenses.js`.
   - *How it was caught*: During review, it was noticed that the endpoint requires context of the group to validate group members.
   - *What was changed*: The endpoint was moved to `routes/groups.js` (`POST /api/groups/:id/expenses/import`) to easily query `group_members`.

2. **Unhandled Promise Rejection with `fs.unlinkSync`**
   - *What happened*: The AI wrote code that called `fs.unlinkSync(filePath)` to clean up the uploaded file, but didn't wrap all potential failure branches in `try/catch` or check if the file existed, causing a crash on invalid uploads.
   - *How it was caught*: Reviewing the code structure before execution revealed missing `fs.existsSync` checks in the error blocks.
   - *What was changed*: Wrapped cleanup logic in `if (fs.existsSync(filePath))` across all error handlers.

3. **Floating Point Rounding Errors**
   - *What happened*: When splitting the imported expense equally among members, the AI initially just divided the amount `exp.amount / members.length`.
   - *How it was caught*: Knowing that $100 split 3 ways yields 33.3333..., the total would not add up to $100 in the database, breaking the balance calculation logic.
   - *What was changed*: Implemented a remainder calculation: computing the rounded split for each member and adding the leftover cents to the final member's owed amount to ensure the sum exactly matches the total.
