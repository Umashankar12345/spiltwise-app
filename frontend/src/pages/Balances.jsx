import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Wallet, ArrowRightLeft } from 'lucide-react';

const Balances = () => {
  const { token } = useContext(AuthContext);
  const [balanceSummary, setBalanceSummary] = useState(null);

  useEffect(() => {
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
    fetchMyBalances();
  }, [token]);

  if (!balanceSummary) return <div className="text-center mt-20">Loading...</div>;

  const { totalPaid, totalOwed, netBalance } = balanceSummary;

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

      <div className="bg-white p-6 rounded-lg shadow-sm text-center py-10">
        <ArrowRightLeft className="w-12 h-12 mx-auto text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Ready to Settle Up?</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Settling up records a payment to clear out your outstanding balances across your groups.
        </p>
        <button className="bg-primary text-white px-8 py-3 rounded-full hover:bg-primary-dark transition shadow-md font-medium">
          Settle Up Now
        </button>
      </div>
    </div>
  );
};

export default Balances;
