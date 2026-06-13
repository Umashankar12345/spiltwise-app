import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AddExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [members, setMembers] = useState([]);
  
  // payers state: { userId: amount }
  const [payers, setPayers] = useState({});
  // splits state: { userId: amount } for 'unequal'
  const [splits, setSplits] = useState({});

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/groups/${id}/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setMembers(data);
          // Default payer is current user
          if (user) {
            setPayers({ [user.id]: '' });
          }
        }
      } catch (err) { console.error(err); }
    };
    fetchMembers();
  }, [id, token, user]);

  const handlePayerChange = (userId, amount) => {
    setPayers(prev => ({ ...prev, [userId]: amount }));
  };

  const handleSplitChange = (userId, amount) => {
    setSplits(prev => ({ ...prev, [userId]: amount }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Calculate total paid
    let calcTotal = 0;
    const finalPayers = [];
    for (const [uid, amt] of Object.entries(payers)) {
      const parsedAmt = parseFloat(amt);
      if (parsedAmt > 0) {
        calcTotal += parsedAmt;
        finalPayers.push({ user_id: uid, amount_paid: parsedAmt });
      }
    }
    
    const expenseTotal = parseFloat(totalAmount);
    if (Math.abs(calcTotal - expenseTotal) > 0.01) {
      alert(`Total paid ($${calcTotal.toFixed(2)}) does not match expense amount ($${expenseTotal.toFixed(2)})`);
      return;
    }

    const finalSplits = [];
    if (splitType === 'equal') {
      const splitAmount = expenseTotal / members.length;
      members.forEach(m => {
        finalSplits.push({ user_id: m.id, amount_owed: splitAmount, percentage: null, shares: null });
      });
    } else if (splitType === 'unequal') {
      let calcSplitTotal = 0;
      for (const [uid, amt] of Object.entries(splits)) {
        const parsedAmt = parseFloat(amt || 0);
        calcSplitTotal += parsedAmt;
        finalSplits.push({ user_id: uid, amount_owed: parsedAmt, percentage: null, shares: null });
      }
      if (Math.abs(calcSplitTotal - expenseTotal) > 0.01) {
        alert(`Total splits ($${calcSplitTotal.toFixed(2)}) does not match expense amount ($${expenseTotal.toFixed(2)})`);
        return;
      }
    }

    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/expenses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description,
          total_amount: expenseTotal,
          split_type: splitType,
          payers: finalPayers,
          splits: finalSplits
        })
      });
      if (res.ok) {
        navigate(`/groups/${id}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add expense');
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white p-8 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6">Add an Expense</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-gray-700 font-medium mb-2">Description</label>
          <input 
            type="text" 
            placeholder="e.g. Dinner at Mario's"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            required 
          />
        </div>
        <div>
          <label className="block text-gray-700 font-medium mb-2">Total Amount</label>
          <div className="relative">
            <span className="absolute left-3 top-3 text-gray-500">$</span>
            <input 
              type="number" 
              step="0.01"
              placeholder="0.00"
              className="w-full p-3 pl-8 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
              value={totalAmount} 
              onChange={e => setTotalAmount(e.target.value)} 
              required 
            />
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-gray-700 font-medium mb-2">Who Paid?</label>
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-4 mb-2">
              <span className="w-32 truncate">{m.name}</span>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-primary"
                value={payers[m.id] !== undefined ? payers[m.id] : ''} 
                onChange={e => handlePayerChange(m.id, e.target.value)} 
              />
            </div>
          ))}
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <label className="block text-gray-700 font-medium mb-2">Split Type</label>
          <select 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none mb-4"
            value={splitType}
            onChange={e => setSplitType(e.target.value)}
          >
            <option value="equal">Equally</option>
            <option value="unequal">Unequally (Exact amounts)</option>
          </select>

          {splitType === 'unequal' && members.map(m => (
            <div key={m.id} className="flex items-center gap-4 mb-2">
              <span className="w-32 truncate">{m.name}</span>
              <input 
                type="number" 
                step="0.01"
                placeholder="0.00"
                className="flex-1 p-2 border rounded focus:ring-2 focus:ring-primary"
                value={splits[m.id] !== undefined ? splits[m.id] : ''} 
                onChange={e => handleSplitChange(m.id, e.target.value)} 
              />
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-gray-100 flex gap-4">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark font-medium transition">Save Expense</button>
        </div>
      </form>
    </div>
  );
};

export default AddExpense;
