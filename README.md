# Splitwise Clone 💸

A fully-featured, full-stack replica of Splitwise built with the PERN stack (PostgreSQL, Express, React, Node.js). 

> **Built with Antigravity** – This project was entirely architected, written, and refined by Antigravity (a powerful agentic AI coding assistant designed by the Google DeepMind team).

## ✨ Features
- **Comprehensive Expense Splitting**: Supports Equal, Unequal (exact amounts), Percentage, and Share-based splits with multiple payers.
- **Group Management**: Create groups, send email invites (simulated), accept invites, and safely remove members.
- **Real-Time Chat**: Discuss expenses in a live Socket.io chat thread with inline Edit/Delete functionality.
- **Debt Resolution**: Live, dynamically calculated debts mapped across groups, with a secure "Settle Up" modal.
- **Modern UI**: Fully responsive frontend built with Tailwind CSS, featuring a polished Indigo/Slate aesthetic.

## 🚀 Live Deployment
- **Frontend App**: *[Pending Render Deployment URL]*
- **Backend API**: *[Pending Render Deployment URL]*

*Note: The app is configured for 1-click deployment on Render using the included `render.yaml` infrastructure-as-code file.*

## 💻 Local Setup

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose (for the PostgreSQL database)

### Installation
1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd spiltwise-app
   ```

2. **Start the PostgreSQL Database**
   Ensure Docker Desktop is running, then spin up the database container:
   ```bash
   docker-compose up -d
   ```
   *The initialization script (`backend/init.sql`) will automatically create the tables on the first run.*

3. **Configure Backend Environment Variables**
   Create a `.env` file in the `backend/` directory:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://user:password@localhost:5432/splitwise
   JWT_SECRET=your_super_secret_jwt_key
   ```

4. **Start the Backend Server**
   ```bash
   cd backend
   npm install
   npm run dev
   ```

5. **Start the Frontend App**
   Open a new terminal window:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

6. **Open your browser**
   Navigate to `http://localhost:5173` to view the app!

## 🧩 Known Limitations
- Automated tests (unit & integration) are not included. Verification was performed manually.
- The "Invite Member" functionality does not currently send actual emails; it relies on the invited user registering with the matching email address.
