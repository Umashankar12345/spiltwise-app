import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Wallet, ArrowRightLeft, X } from 'lucide-react';

const Balances = () => {
  const { token } = useContext(AuthContext);
  const [balanceSummary, setBalanceSummary] = useState(null);
  
  // Settle Up Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [settleAmount, setSettleAmount] = useState('');

  useEffect(() => {
    fetchMyBalances();
  }, [token]);

  const fetchMyBalances = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/balances/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setBalanceSummary(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenModal = (debt) => {
    setSelectedDebt(debt);
    setSettleAmount(debt.amount.toFixed(2));
    setIsModalOpen(true);
  };

  const handleSettleUp = async (e) => {
    e.preventDefault();
    if (!selectedDebt) return;
    
    try {
      const res = await fetch(`http://localhost:5000/api/groups/${selectedDebt.groupId}/settlements`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paid_to: selectedDebt.owedToId,
          amount: parseFloat(settleAmount)
        })
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setSelectedDebt(null);
        fetchMyBalances(); // Refresh balances
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to settle up');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!balanceSummary) return <div className="text-center mt-20">Loading...</div>;

  const { totalPaid, totalOwed, netBalance, detailedDebts } = balanceSummary;

  return (
    <div className="max-w-3xl mx-auto mt-8">
      <h2 className="text-3xl font-bold text-dark mb-8 flex items-center gap-2">
        <Wallet className="w-8 h-8 text-primary" /> Cross-Group Balances
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-gray-400">
          <p className="text-gray-500 text-sm font-medium mb-1">Total You Paid</p>
          <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-red-400">
          <p className="text-gray-500 text-sm font-medium mb-1">Total You Owe</p>
          <p className="text-2xl font-bold">${totalOwed.toFixed(2)}</p>
        </div>
        <div className={`bg-white p-6 rounded-lg shadow-sm border-l-4 ${netBalance >= 0 ? 'border-green-500' : 'border-red-500'}`}>
          <p className="text-gray-500 text-sm font-medium mb-1">Net Balance</p>
          <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {netBalance >= 0 ? '+' : ''}${netBalance.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <h3 className="text-xl font-semibold mb-4">Detailed Debts (Who you owe)</h3>
        {detailedDebts && detailedDebts.length > 0 ? (
          <div className="space-y-4">
            {detailedDebts.map((debt, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="font-semibold text-gray-800">You owe {debt.owedToName}</p>
                  <p className="text-sm text-gray-500">Group ID: {debt.groupId}</p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-bold text-red-500">${debt.amount.toFixed(2)}</p>
                  <button 
                    onClick={() => handleOpenModal(debt)}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition text-sm font-medium"
                  >
                    Settle Up
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">You don't owe anyone right now. Great job!</p>
        )}
      </div>

      {/* Settle Up Modal */}
      {isModalOpen && selectedDebt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md relative">
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold mb-6">Settle Up</h3>
            <form onSubmit={handleSettleUp}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2">
                  Paying <strong>{selectedDebt.owedToName}</strong>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-500">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full p-3 pl-8 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                    value={settleAmount} 
                    onChange={e => setSettleAmount(e.target.value)} 
                    max={selectedDebt.amount}
                    required 
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">Maximum you can settle: ${selectedDebt.amount.toFixed(2)}</p>
              </div>
              <button 
                type="submit" 
                className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 font-medium transition"
              >
                Record Payment
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Balances;
