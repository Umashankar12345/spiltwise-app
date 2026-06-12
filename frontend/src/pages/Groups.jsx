import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { PlusCircle, Users } from 'lucide-react';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/groups', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newGroupName })
      });
      if (response.ok) {
        setNewGroupName('');
        fetchGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-dark flex items-center gap-2">
          <Users className="w-8 h-8 text-primary" /> My Groups
        </h2>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm mb-8">
        <form onSubmit={handleCreateGroup} className="flex gap-4">
          <input 
            type="text" 
            placeholder="New Group Name" 
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            value={newGroupName} 
            onChange={e => setNewGroupName(e.target.value)} 
            required 
          />
          <button type="submit" className="bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary-dark transition flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map(group => (
          <Link key={group.id} to={`/groups/${group.id}`} className="block">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-transparent hover:border-primary transition cursor-pointer">
              <h3 className="text-xl font-semibold mb-2">{group.name}</h3>
              <p className="text-gray-500 text-sm">Created on {new Date(group.created_at).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-8">
            You are not part of any groups yet. Create one to get started!
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
