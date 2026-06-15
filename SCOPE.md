# SCOPE.md: Anomaly Log and Database Schema

## Anomalies Checked & Handled during CSV Ingestion
The CSV Import endpoint handles expenses structured with the headers: `Date`, `Description`, `Amount`, `PaidByEmail`.
During ingestion, the following anomalies are actively detected and handled:

1. **Negative, Missing, or Non-Numeric Amount**
   - *Problem*: The `Amount` field cannot be parsed into a valid positive number.
   - *Action*: The row is skipped entirely to prevent corrupting balances.

2. **Missing or Invalid Payer Email**
   - *Problem*: The `PaidByEmail` field is either empty or belongs to an email address that is not currently a member of the group.
   - *Action*: The row is skipped, since an expense must be tied to a valid paying member.

3. **Missing Description**
   - *Problem*: The `Description` column is empty.
   - *Action*: This is an anomaly that can be auto-corrected. The system sets the description to `"Imported Expense"` and proceeds with the import.

## Database Schema
The database uses PostgreSQL. The relevant schema used for storing and splitting these imported expenses is:

- **`users`**: `id`, `name`, `email`, `password_hash`, `created_at`, `updated_at`
- **`groups`**: `id`, `name`, `created_by`, `created_at`, `updated_at`
- **`group_members`**: `id`, `group_id`, `user_id`, `joined_at`
- **`expenses`**: `id`, `group_id`, `description`, `total_amount`, `split_type`, `created_by`, `created_at`
- **`expense_payers`**: `id`, `expense_id`, `user_id`, `amount_paid`
- **`expense_splits`**: `id`, `expense_id`, `user_id`, `amount_owed`, `percentage`, `shares`

*Note: All CSV imports default to an 'equal' split type among all current group members.*
