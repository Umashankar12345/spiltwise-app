import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ArrowRight, CheckCircle2, WalletCards } from 'lucide-react';

const Balances = () => {
  const { token, user } = useContext(AuthContext);
  const [debts, setDebts] = useState([]);
  const [settleDebt, setSettleDebt] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');

  useEffect(() => {
    fetchDebts();
  }, [token]);

  const fetchDebts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/balances/debts', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setDebts(await res.json());
    } catch (err) { console.error(err); }
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    if (!settleDebt) return;
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${settleDebt.group_id}/expenses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description: 'Payment',
          total_amount: settleAmount,
          split_type: 'unequal',
          payers: [{ user_id: user.id, amount_paid: settleAmount }],
          splits: [{ user_id: settleDebt.owes_to_id, amount_owed: settleAmount, percentage: null, shares: null }]
        })
      });
      if (res.ok) {
        setSettleDebt(null);
        setSettleAmount('');
        fetchDebts();
      } else {
        alert('Failed to settle up');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openSettleModal = (debt) => {
    setSettleDebt(debt);
    setSettleAmount(parseFloat(debt.amount).toFixed(2));
  };

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex items-center gap-3 mb-8">
        <WalletCards className="w-8 h-8 text-indigo-600" />
        <h2 className="text-3xl font-extrabold text-slate-900">All Balances</h2>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {debts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 font-medium">
            You are all settled up! No active debts.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {debts.map((debt, index) => {
              const isOwedByMe = debt.who_owes_id === user?.id;
              const otherPersonName = isOwedByMe ? debt.owes_to_name : debt.who_owes_name;
              
              return (
                <div key={index} className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div>
                    <h3 className="font-bold text-slate-900 text-lg mb-1">{otherPersonName}</h3>
                    <p className="text-sm text-slate-500 font-medium">Group: {debt.group_name}</p>
                  </div>
                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="flex flex-col items-end">
                      <p className={`font-medium text-sm mb-1 ${isOwedByMe ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isOwedByMe ? 'You owe' : 'Owes you'}
                      </p>
                      <p className={`text-2xl font-extrabold ${isOwedByMe ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ${parseFloat(debt.amount).toFixed(2)}
                      </p>
                    </div>
                    {isOwedByMe && (
                      <button 
                        onClick={() => openSettleModal(debt)}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 transition font-semibold shadow-sm flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Settle
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {settleDebt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-xl">
            <h3 className="text-2xl font-extrabold text-slate-900 mb-6">Settle Up</h3>
            <p className="mb-6 text-slate-600 flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-900">{user.name}</span>
              <ArrowRight className="w-5 h-5 text-indigo-400" />
              <span className="font-bold text-slate-900">{settleDebt.owes_to_name}</span>
            </p>
            <form onSubmit={handleSettle} className="space-y-6">
              <div>
                <label className="block text-slate-700 font-semibold mb-2 text-sm">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-500 font-medium">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    max={parseFloat(settleDebt.amount).toFixed(2)}
                    className="w-full p-3 pl-8 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition text-lg font-medium"
                    value={settleAmount} 
                    onChange={e => setSettleAmount(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSettleDebt(null)} 
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Balances;
