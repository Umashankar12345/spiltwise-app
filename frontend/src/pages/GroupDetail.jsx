import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Receipt, DollarSign, UserPlus, Trash2, Users, UploadCloud } from 'lucide-react';

const GroupDetail = () => {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState({});
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [importReport, setImportReport] = useState(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    fetchExpenses();
    fetchBalances();
    fetchMembers();
  }, [id, token]);

  const fetchExpenses = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${id}/expenses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setExpenses(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchBalances = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${id}/balances`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setBalances(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${id}/members`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setMembers(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${id}/invite`, {
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
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${id}/members/${userId}`, {
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

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${id}/expenses/import`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setImportReport(data);
        fetchExpenses();
        fetchBalances();
      } else {
        alert(data.error || 'Import failed');
      }
    } catch (err) {
      console.error(err);
      alert('Error importing file');
    } finally {
      setIsImporting(false);
      e.target.value = null;
    }
  };

  const myBalance = balances[user?.id] || 0;

  return (
    <div className="max-w-5xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-2xl font-bold flex items-center gap-3 text-slate-900">
            <Receipt className="w-6 h-6 text-indigo-600" /> Group Expenses
          </h2>
          <div className="flex gap-3">
            <label className="cursor-pointer bg-slate-100 text-slate-700 px-5 py-2 rounded-lg hover:bg-slate-200 transition font-medium shadow-sm flex items-center gap-2">
              <UploadCloud className="w-4 h-4" />
              {isImporting ? 'Importing...' : 'Import CSV'}
              <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={isImporting} />
            </label>
            <Link to={`/groups/${id}/expenses/new`} className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium shadow-sm">
              Add Expense
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          {expenses.map(exp => (
            <Link key={exp.id} to={`/expenses/${exp.id}`} className="block">
              <div className="bg-white p-5 rounded-xl shadow-sm flex justify-between items-center hover:shadow-md border border-slate-200 hover:border-indigo-300 transition-all duration-200 cursor-pointer">
                <div>
                  <h4 className="font-bold text-slate-900 text-lg mb-1">{exp.description}</h4>
                  <p className="text-sm text-slate-500">{new Date(exp.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-xl text-slate-900">${parseFloat(exp.total_amount).toFixed(2)}</p>
                </div>
              </div>
            </Link>
          ))}
          {expenses.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-10 text-center text-slate-500">
              No expenses yet. Add one to get started!
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
            <DollarSign className="w-5 h-5 text-indigo-600" /> My Balance
          </h3>
          <div className={`text-3xl font-extrabold ${myBalance > 0 ? 'text-emerald-600' : myBalance < 0 ? 'text-rose-600' : 'text-slate-700'}`}>
            {myBalance > 0 ? '+' : ''}{myBalance.toFixed(2)}
          </div>
          <p className="text-sm text-slate-500 mt-2 font-medium">
            {myBalance > 0 ? 'You are owed' : myBalance < 0 ? 'You owe' : 'Settled up'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
            <UserPlus className="w-5 h-5 text-indigo-600" /> Invite Member
          </h3>
          <form onSubmit={handleInvite}>
            <input 
              type="email" 
              placeholder="Email address" 
              className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              value={inviteEmail} 
              onChange={e => setInviteEmail(e.target.value)} 
              required 
            />
            <button type="submit" className="w-full bg-slate-100 text-slate-800 px-4 py-3 rounded-lg hover:bg-slate-200 transition font-semibold">
              Send Invite
            </button>
          </form>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-900">
            <Users className="w-5 h-5 text-indigo-600" /> Group Members
          </h3>
          <div className="space-y-2">
            {members.map(m => {
              const bal = balances[m.id] || 0;
              return (
                <div key={m.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{m.name} {m.id === user?.id && <span className="text-slate-400 font-normal">(You)</span>}</p>
                    <p className={`text-xs font-medium mt-0.5 ${bal > 0 ? 'text-emerald-600' : bal < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {bal > 0 ? `gets $${bal.toFixed(2)}` : bal < 0 ? `owes $${Math.abs(bal).toFixed(2)}` : 'settled'}
                    </p>
                  </div>
                  {m.id !== user?.id && (
                    <button 
                      onClick={() => handleRemoveMember(m.id, m.name)}
                      className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-full transition-all"
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

      {importReport && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900">Import Report</h3>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-indigo-600 font-semibold mb-1">Total Rows Processed</p>
                  <p className="text-2xl font-bold text-indigo-900">{importReport.totalRows}</p>
                </div>
                <div className="bg-emerald-50 p-4 rounded-lg">
                  <p className="text-sm text-emerald-600 font-semibold mb-1">Expenses Imported</p>
                  <p className="text-2xl font-bold text-emerald-900">{importReport.insertedCount}</p>
                </div>
              </div>
              
              <h4 className="font-bold text-slate-800 mb-3">Anomalies Detected ({importReport.anomalies.length})</h4>
              {importReport.anomalies.length > 0 ? (
                <div className="space-y-3">
                  {importReport.anomalies.map((anom, i) => (
                    <div key={i} className="bg-rose-50 border border-rose-100 p-3 rounded-lg text-sm">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-rose-700">Row {anom.row}</span>
                        <span className="bg-rose-200 text-rose-800 text-xs px-2 py-1 rounded font-medium">{anom.action}</span>
                      </div>
                      <p className="text-rose-900 mb-2"><strong>Issue:</strong> {anom.issue}</p>
                      <div className="bg-white/50 p-2 rounded border border-rose-100 font-mono text-xs text-rose-800 overflow-x-auto">
                        {JSON.stringify(anom.data)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">No anomalies detected. Clean import!</p>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setImportReport(null)}
                className="bg-slate-800 text-white px-5 py-2 rounded-lg hover:bg-slate-900 transition font-medium"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
