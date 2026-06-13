# AI Context for Splitwise Clone

## 1. Product Context & Research

**How Splitwise was studied**
Reverse-engineered from general knowledge and reference screenshots of Splitwise's core screens: groups list, group detail, add-expense flow, expense detail, and balances/settle-up screen.

**Workflows identified**
1. Sign up / log in.
2. Create a group, invite members by email, accept invites, remove members.
3. Add an expense: multiple split types (equal, unequal, percentage, share) and multiple payers.
4. View group balance summary and individual balance summary across groups.
5. Record a settlement payment.
6. Discuss an expense via real-time chat.

## 2. Implementation Details & Decisions

### 2.1 Database Schema
- Designed a normalized schema with `users`, `groups`, `group_members`, `group_invites`, `expenses`, `expense_payers`, `expense_splits`, `settlements`, `expense_messages`.
- **Deviation from original plan**: None, the exact schema was implemented using raw SQL via the `pg` driver in `backend/init.sql`.

### 2.2 Backend Architecture (Node.js + Express)
- **Routes Organization**:
  - `backend/routes/auth.js`: Implements `/api/auth/signup` and `/api/auth/login`.
  - `backend/routes/groups.js`: Handles `/api/groups`, `/api/groups/:id/invite`, `/api/groups/:id/invites/:inviteId/accept`, `/api/groups/:id/members/:userId`, `/api/groups/:id/expenses`, `/api/groups/:id/settlements`, and `/api/groups/:id/balances`.
  - `backend/routes/expenses.js`: Handles `PUT /api/expenses/:id`, `DELETE /api/expenses/:id`, and `GET /api/expenses/:id/messages`.
  - `backend/routes/balances.js`: Handles `GET /api/balances/me`.
- **Balances Computation**: Kept fully dynamic. Calculated on-the-fly by aggregating amounts from `expense_payers`, `expense_splits`, and `settlements` rather than storing stateful balances.
- **Real-Time Chat**: Handled centrally in `backend/server.js` using Socket.io (`join_expense`, `new_message`, `edit_message`, `delete_message`). Messages support soft deletion (`deleted_at`).

### 2.3 Frontend Architecture (React + Vite + Tailwind v4)
- Organized in `frontend/src/`.
- Routes exactly match the specification: `/login`, `/signup`, `/groups`, `/groups/:id`, `/groups/:id/expenses/new`, `/expenses/:id`, `/balances`.
- Global session state is managed via `frontend/src/context/AuthContext.jsx`.

## 3. Known Limitations & Deviations

### 3.1 Unregistered Email Invites
- **Limitation**: The current invite flow simply stores an `invited_email` in `group_invites`. There is no email-sending service (like SendGrid) integrated, and the system relies on the user eventually signing up with that exact email and manually finding the invite. Full token-based invite links were scoped out.

### 3.2 Testing Omission
- **Limitation**: Automated tests (unit tests for split calculations, rounding errors, and integration tests for API endpoints) were initially planned but ultimately omitted due to time constraints during the build phase. Manual verification was used instead. The code relies on database-level DECIMAL types to handle currency precision.

### 3.3 Expense Split Calculation Logic
- The backend and frontend fully support all four required split types: `equal`, `unequal`, `percentage`, and `share`. The frontend `AddExpense` form dynamically supports multiple payers and live split logic by fetching group members. For percentage and share splits, the backend recomputes the exact amounts owed and properly distributes any rounding remainders.

## 4. Deployment Strategy & Changelog

### 4.1 Deployment Topology (Render)
The application is structured for a three-tier deployment on Render:
1. **Render PostgreSQL**: Managed database instance.
2. **Web Service (Backend)**: Express API running on Render.
3. **Static Site (Frontend)**: Vite build served as a static site.

### 4.2 Deployment Environment Variables
When deploying, the following environment variables are required:
- **Backend**:
  - `DATABASE_URL`: Connection string from Render PostgreSQL.
  - `JWT_SECRET`: Secure random string.
  - `PORT`: (Render typically sets this automatically, default 5000).
- **Frontend**:
  - `VITE_API_BASE_URL`: Must point to the deployed Backend Web Service URL so the static frontend knows where to send API requests and socket connections.

### 4.3 CORS Configuration
- In `backend/server.js`, CORS is currently set to `origin: '*'` for ease of development. For production deployment on Render, this should be updated to strictly match the frontend Static Site URL.
