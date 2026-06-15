# DECISIONS.md: Decision Log

## Decision 1: CSV Parsing Library
- **Options Considered**: `csv-parser` vs writing a custom split function vs `papaparse`.
- **Decision**: Chose `csv-parser`.
- **Why**: `csv-parser` is a lightweight, reliable stream-based parser for Node.js. It avoids memory issues with large files and easily handles commas embedded within quotes.

## Decision 2: Handling Invalid Users in CSV
- **Options Considered**: 
  1. Auto-create a temporary user account.
  2. Map the expense to the user uploading the file.
  3. Skip the row entirely.
- **Decision**: Chose to skip the row.
- **Why**: Auto-creating users without passwords or context complicates the authentication flow. Mapping to the uploader obscures the original intent of the CSV. Skipping the row (and logging it in the anomaly report) is the safest approach to maintain data integrity.

## Decision 3: Splitting Logic for Imported Expenses
- **Options Considered**: 
  1. Require `split_type` and split breakdowns in the CSV.
  2. Default to an 'equal' split among all current group members.
- **Decision**: Chose 'equal' split.
- **Why**: Including complex split logic (percentages, exact shares) inside a simple CSV makes the file format brittle and difficult for users to author. Defaulting to an equal split ensures seamless bulk importing while still allowing users to edit the expense later in the UI if needed.
