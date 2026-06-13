import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const EditExpense = () => {
  const { id } = useParams(); // this is expenseId
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [expense, setExpense] = useState(null);
  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [members, setMembers] = useState([]);
  
  const [payers, setPayers] = useState({});
  const [splits, setSplits] = useState({});
  const [percentages, setPercentages] = useState({});
  const [shares, setShares] = useState({});

  useEffect(() => {
    const fetchExpenseDetails = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/expenses/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to fetch expense');
        const data = await res.json();
        setExpense(data);
        setDescription(data.description);
        setTotalAmount(parseFloat(data.total_amount).toFixed(2));
        setSplitType(data.split_type);

        // Populate Payers
        const initialPayers = {};
        data.payers.forEach(p => {
          initialPayers[p.user_id] = p.amount_paid;
        });
        setPayers(initialPayers);

        // Populate Splits based on type
        const initialSplits = {};
        const initialPcts = {};
        const initialShares = {};
        
        data.splits.forEach(s => {
          if (data.split_type === 'unequal') initialSplits[s.user_id] = s.amount_owed;
          if (data.split_type === 'percentage') initialPcts[s.user_id] = s.percentage;
          if (data.split_type === 'share') initialShares[s.user_id] = s.shares;
        });
        
        setSplits(initialSplits);
        setPercentages(initialPcts);
        setShares(initialShares);

        // Now fetch group members for this expense's group_id
        const membersRes = await fetch(`http://localhost:5000/api/groups/${data.group_id}/members`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (membersRes.ok) {
          setMembers(await membersRes.json());
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchExpenseDetails();
  }, [id, token]);

  const handlePayerChange = (userId, amount) => {
    setPayers(prev => ({ ...prev, [userId]: amount }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!expense) return;

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
      for (const m of members) {
        const amt = splits[m.id];
        const parsedAmt = parseFloat(amt || 0);
        calcSplitTotal += parsedAmt;
        finalSplits.push({ user_id: m.id, amount_owed: parsedAmt, percentage: null, shares: null });
      }
      if (Math.abs(calcSplitTotal - expenseTotal) > 0.01) {
        alert(`Total splits ($${calcSplitTotal.toFixed(2)}) does not match expense amount ($${expenseTotal.toFixed(2)})`);
        return;
      }
    } else if (splitType === 'percentage') {
      let totalPct = 0;
      for (const m of members) {
        const pct = parseFloat(percentages[m.id] || 0);
        totalPct += pct;
        finalSplits.push({ user_id: m.id, amount_owed: 0, percentage: pct, shares: null });
      }
      if (Math.abs(totalPct - 100) > 0.1) {
        alert(`Total percentage must sum to 100% (currently ${totalPct.toFixed(2)}%)`);
        return;
      }
    } else if (splitType === 'share') {
      let totalShares = 0;
      for (const m of members) {
        const s = parseInt(shares[m.id] || 0, 10);
        totalShares += s;
        finalSplits.push({ user_id: m.id, amount_owed: 0, percentage: null, shares: s });
      }
      if (totalShares <= 0) {
        alert('Total shares must be greater than zero');
        return;
      }
    }

    try {
      const res = await fetch(`http://localhost:5000/api/expenses/${id}`, {
        method: 'PUT',
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
        navigate(`/expenses/${id}`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update expense');
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!expense || members.length === 0) return <div className="text-center mt-20">Loading Edit Form...</div>;

  const totalShares = members.reduce((sum, member) => sum + parseInt(shares[member.id] || 0, 10), 0);

  return (
    <div className="max-w-2xl mx-auto mt-8 bg-white p-8 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6">Edit Expense</h2>
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
            <option value="percentage">By Percentages</option>
            <option value="share">By Shares</option>
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
                onChange={e => setSplits(prev => ({ ...prev, [m.id]: e.target.value }))} 
              />
            </div>
          ))}

          {splitType === 'percentage' && members.map(m => {
            const pct = parseFloat(percentages[m.id] || 0);
            const computedAmt = (parseFloat(totalAmount || 0) * (pct / 100)).toFixed(2);
            return (
              <div key={m.id} className="flex items-center gap-4 mb-2">
                <span className="w-32 truncate">{m.name}</span>
                <div className="flex-1 flex items-center gap-2">
                  <input 
                    type="number" step="0.01" placeholder="0" className="w-24 p-2 border rounded focus:ring-2 focus:ring-primary"
                    value={percentages[m.id] !== undefined ? percentages[m.id] : ''} 
                    onChange={e => setPercentages(prev => ({ ...prev, [m.id]: e.target.value }))} 
                  />
                  <span>%</span>
                  <span className="text-gray-500 font-medium ml-4">${computedAmt}</span>
                </div>
              </div>
            );
          })}

          {splitType === 'share' && members.map(m => {
            const userShare = parseInt(shares[m.id] || 0, 10);
            const computedAmt = totalShares > 0 ? (parseFloat(totalAmount || 0) * (userShare / totalShares)).toFixed(2) : "0.00";
            return (
              <div key={m.id} className="flex items-center gap-4 mb-2">
                <span className="w-32 truncate">{m.name}</span>
                <div className="flex-1 flex items-center gap-2">
                  <input 
                    type="number" step="1" placeholder="1" className="w-24 p-2 border rounded focus:ring-2 focus:ring-primary"
                    value={shares[m.id] !== undefined ? shares[m.id] : ''} 
                    onChange={e => setShares(prev => ({ ...prev, [m.id]: e.target.value }))} 
                  />
                  <span>shares</span>
                  <span className="text-gray-500 font-medium ml-4">${computedAmt}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-4 border-t border-gray-100 flex gap-4">
          <button type="button" onClick={() => navigate(-1)} className="px-6 py-3 border rounded-lg text-gray-600 hover:bg-gray-50">Cancel</button>
          <button type="submit" className="flex-1 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark font-medium transition">Update Expense</button>
        </div>
      </form>
    </div>
  );
};

export default EditExpense;
