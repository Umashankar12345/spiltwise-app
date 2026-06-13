import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Receipt, DollarSign, UserPlus, Trash2, Users } from 'lucide-react';

const GroupDetail = () => {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    fetchExpenses();
    fetchBalances();
    fetchMembers();
  }, [id, token]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setExpenses(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchBalances = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/balances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setBalances(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMembers(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/invite`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ invited_email: inviteEmail })
      });
      if (res.ok) {
        alert('Invite sent!');
        setInviteEmail('');
      } else {
        const data = await res.json();
        alert(data.error);
      }
    } catch (err) { console.error(err); }
  };

  const handleRemoveMember = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to remove ${userName} from the group?`)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/members/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchMembers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to remove member');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const myBalance = balances[user?.id] || 0;

  return (
    <div className="max-w-5xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="text-primary" /> Group Expenses
          </h2>
          <Link to={`/groups/${id}/expenses/new`} className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition">
            Add Expense
          </Link>
        </div>

        <div className="space-y-4">
          {expenses.map(exp => (
            <Link key={exp.id} to={`/expenses/${exp.id}`}>
              <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center hover:bg-gray-50 transition cursor-pointer border border-transparent hover:border-gray-200">
                <div>
                  <h4 className="font-semibold">{exp.description}</h4>
                  <p className="text-sm text-gray-500">{new Date(exp.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg">${parseFloat(exp.total_amount).toFixed(2)}</p>
                </div>
              </div>
            </Link>
          ))}
          {expenses.length === 0 && <p className="text-gray-500 text-center py-4">No expenses yet.</p>}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><DollarSign className="text-primary" /> My Balance</h3>
          <div className={`text-2xl font-bold ${myBalance > 0 ? 'text-green-600' : myBalance < 0 ? 'text-red-600' : 'text-gray-700'}`}>
            {myBalance > 0 ? '+' : ''}{myBalance.toFixed(2)}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {myBalance > 0 ? 'You are owed' : myBalance < 0 ? 'You owe' : 'Settled up'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><UserPlus className="text-primary" /> Invite Member</h3>
          <form onSubmit={handleInvite}>
            <input 
              type="email" 
              placeholder="Email address" 
              className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50"
              value={inviteEmail} 
              onChange={e => setInviteEmail(e.target.value)} 
              required 
            />
            <button type="submit" className="w-full bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition font-medium">
              Send Invite
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Users className="text-primary" /> Group Members</h3>
          <div className="space-y-3">
            {members.map(m => {
              const bal = balances[m.id] || 0;
              return (
                <div key={m.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-semibold text-sm">{m.name} {m.id === user?.id && '(You)'}</p>
                    <p className={`text-xs ${bal > 0 ? 'text-green-600' : bal < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {bal > 0 ? `gets $${bal.toFixed(2)}` : bal < 0 ? `owes $${Math.abs(bal).toFixed(2)}` : 'settled'}
                    </p>
                  </div>
                  {m.id !== user?.id && (
                    <button 
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition"
                      title="Remove member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;
