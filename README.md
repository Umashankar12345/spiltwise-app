# Splitwise Clone

A full-stack web application designed to track shared expenses, compute balances, and settle debts within groups. Built with React, Node.js, Express, and PostgreSQL.

This project was built iteratively alongside the **Antigravity AI Assistant**, executing a full product specification from requirements gathering through schema design, backend development, and frontend implementation.

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS v4, React Router, Socket.io-client
- **Backend**: Node.js, Express.js, Socket.io (for real-time chat)
- **Database**: PostgreSQL (raw SQL via `pg` driver, no ORM)
- **Authentication**: JWT (JSON Web Tokens)

## Local Development Setup

To run this application locally, you will need Node.js and Docker installed.

### 1. Start the Database
A `docker-compose.yml` file is provided to quickly spin up a local PostgreSQL 15 instance.

```bash
# Start the database container in the background
docker-compose up -d
```
*Note: This creates a database named `splitwise` with user `user` and password `password` exposed on port 5432.*

### 2. Set Up the Backend
The backend manages the REST API and Socket.io server.

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory with the following variables:
```env
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/splitwise
JWT_SECRET=supersecretjwtkey
```

Run the database initialization script to create the schema:
```bash
# Assuming you have psql installed locally, otherwise you can execute this inside the docker container
psql -U user -d splitwise -h localhost -f init.sql
```

Start the backend server:
```bash
npm run dev
```

### 3. Set Up the Frontend
The frontend is a Vite-powered React application.

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

---

## Known Limitations & Testing
- Automated testing was omitted in this build phase due to time constraints; manual verification was prioritized.
- Group invites currently rely on the invited email address subsequently registering an account. A full unregistered-token flow is not yet implemented.
