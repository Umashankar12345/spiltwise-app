import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import AddExpense from './pages/AddExpense';
import ExpenseDetail from './pages/ExpenseDetail';
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
      <Route path="/balances" element={<ProtectedRoute><Balances /></ProtectedRoute>} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-light">
          <nav className="bg-primary text-white p-4 shadow-md flex justify-between items-center">
            <h1 className="text-2xl font-bold">Splitwise Clone</h1>
            <div className="flex space-x-4">
              <a href="/groups" className="hover:text-gray-200">Groups</a>
              <a href="/balances" className="hover:text-gray-200">Balances</a>
            </div>
          </nav>
          <main className="container mx-auto p-4">
            <AppRoutes />
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
