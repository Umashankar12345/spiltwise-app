# AI Context for Splitwise Clone

## Implementation Details & Decisions

### 1. Database Schema
- Designed a normalized schema with `users`, `groups`, `group_members`, `group_invites`, `expenses`, `expense_payers`, `expense_splits`, `settlements`, `expense_messages`.
- Handled soft deletion for messages via `deleted_at`.
- Kept raw SQL implementations using the `pg` driver for performance and control.

### 2. Backend Architecture
- **Express + Node.js**: Modularized routes into `auth.js`, `groups.js`, `expenses.js`, and `balances.js`.
- **Authentication**: JWT-based approach. The `/api/auth/signup` generates a token without requiring email verification for friction-less onboarding.
- **Balances Computation**: Fully dynamic on-the-fly calculation in `GET /api/groups/:id/balances` and `GET /api/balances/me`. We aggregate amounts from `expense_payers`, `expense_splits`, and `settlements`.
- **Real-Time Chat**: Integrated `socket.io` to create an event-driven architecture for `join_expense`, `new_message`, `edit_message`, and `delete_message`.

### 3. Frontend Architecture (To Be Implemented)
- **Vite + React**: Chosen for fast development server and modern bundling.
- **TailwindCSS v4**: Configured for styling to ensure a premium, sleek aesthetic.
- **Context API**: `AuthContext` to manage JWT tokens and user session state globally.

### 4. Deployment Strategy
- Local development is configured using `.env` files.
- The project is prepared for a split deployment: Static Frontend, Web Service Backend, and managed PostgreSQL Database on Render.
