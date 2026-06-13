import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import AddExpense from './pages/AddExpense';
import ExpenseDetail from './pages/ExpenseDetail';
import EditExpense from './pages/EditExpense';
import Balances from './pages/Balances';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Navigate to="/groups" />} />
      
      <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
      <Route path="/groups/:id" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
      <Route path="/groups/:id/expenses/new" element={<ProtectedRoute><AddExpense /></ProtectedRoute>} />
      <Route path="/expenses/:id" element={<ProtectedRoute><ExpenseDetail /></ProtectedRoute>} />
      <Route path="/expenses/:id/edit" element={<ProtectedRoute><EditExpense /></ProtectedRoute>} />
      <Route path="/balances" element={<ProtectedRoute><Balances /></ProtectedRoute>} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-slate-50 flex flex-col">
          <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center shadow-sm">
            <Link to="/groups" className="text-2xl font-extrabold text-indigo-600 tracking-tight">
              Splitwise Clone
            </Link>
            <div className="flex space-x-6 items-center">
              <Link to="/groups" className="text-slate-600 hover:text-indigo-600 font-medium transition">Groups</Link>
              <Link to="/balances" className="text-slate-600 hover:text-indigo-600 font-medium transition">Balances</Link>
              <AuthContext.Consumer>
                {({ user, logout }) => user && (
                  <button onClick={logout} className="bg-slate-100 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-200 transition">
                    Logout
                  </button>
                )}
              </AuthContext.Consumer>
            </div>
          </nav>
          <main className="container mx-auto p-4 flex-1">
            <AppRoutes />
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
