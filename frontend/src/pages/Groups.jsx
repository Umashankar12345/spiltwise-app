import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { PlusCircle, Users } from 'lucide-react';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [invites, setInvites] = useState([]);
  const { token, logout } = useContext(AuthContext);

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, [token]); 

  const fetchGroups = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setGroups(data);
      } else if (response.status === 400 || response.status === 401) {
        logout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvites = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/invites/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data);
      } else if (response.status === 400 || response.status === 401) {
        logout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups`, {
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

  const handleAcceptInvite = async (groupId, inviteId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/api/groups/${groupId}/invites/${inviteId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchInvites();
        fetchGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-indigo-600" /> My Groups
        </h2>
      </div>

      {invites.length > 0 && (
        <div className="bg-indigo-50 p-6 rounded-xl shadow-sm border border-indigo-100 mb-8">
          <h3 className="text-xl font-bold text-indigo-900 mb-4">Pending Invites</h3>
          <div className="space-y-3">
            {invites.map(invite => (
              <div key={invite.id} className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border border-slate-100">
                <div>
                  <p className="font-semibold text-slate-900">Group: {invite.group_name}</p>
                  <p className="text-sm text-slate-500">Invited by: {invite.invited_by_name}</p>
                </div>
                <button 
                  onClick={() => handleAcceptInvite(invite.group_id, invite.id)}
                  className="bg-indigo-600 text-white px-5 py-2 rounded-lg hover:bg-indigo-700 font-medium transition"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-8">
        <form onSubmit={handleCreateGroup} className="flex gap-4">
          <input 
            type="text" 
            placeholder="Create a new group..." 
            className="flex-1 p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
            value={newGroupName} 
            onChange={e => setNewGroupName(e.target.value)} 
            required 
          />
          <button type="submit" className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition flex items-center gap-2 font-medium">
            <PlusCircle className="w-5 h-5" /> Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {groups.map(group => (
          <Link key={group.id} to={`/groups/${group.id}`} className="block group">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 group-hover:border-indigo-300 group-hover:shadow-md transition-all duration-200">
              <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors">{group.name}</h3>
              <p className="text-slate-500 text-sm">Created on {new Date(group.created_at).toLocaleDateString()}</p>
            </div>
          </Link>
        ))}
        {groups.length === 0 && (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center text-slate-500">
            You are not part of any groups yet. Create one above to get started!
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
