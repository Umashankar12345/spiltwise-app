import React, { useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const AddExpense = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);

  const [description, setDescription] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [splitType, setSplitType] = useState('equal');

  // Simplification for the build plan: automatically assigning the current user as the sole payer
  // and splitting equally with a mocked second user or just the user themselves for demonstration.
  // In a full UI, we would fetch group members and have a dynamic list of payers and splitters.
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Fallback stub for multiple users logic. We assume user pays 100%, and owes 100% for now
    // in the absence of the member fetching logic which would go here.
    const payers = [{ user_id: user.id, amount_paid: totalAmount }];
    const splits = [{ user_id: user.id, amount_owed: totalAmount, percentage: null, shares: null }];

    try {
      const res = await fetch(`http://localhost:5000/api/groups/${id}/expenses`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          description,
          total_amount: totalAmount,
          split_type: splitType,
          payers,
          splits
        })
      });
      if (res.ok) {
        navigate(`/groups/${id}`);
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
          <label className="block text-gray-700 font-medium mb-2">Amount</label>
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
        <div>
          <label className="block text-gray-700 font-medium mb-2">Split Type</label>
          <select 
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
            value={splitType}
            onChange={e => setSplitType(e.target.value)}
          >
            <option value="equal">Equally</option>
            <option value="unequal">Unequally (Exact amounts)</option>
            <option value="percentage">By Percentages</option>
            <option value="share">By Shares</option>
          </select>
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
