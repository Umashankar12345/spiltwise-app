import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { PlusCircle, Users } from 'lucide-react';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [newGroupName, setNewGroupName] = useState('');
  const [invites, setInvites] = useState([]);
  const { token } = useContext(AuthContext);

  useEffect(() => {
    fetchGroups();
    fetchInvites();
  }, [token]); // Adding token dependency

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

  const fetchInvites = async () => {
    if (!token) return;
    try {
      const response = await fetch('http://localhost:5000/api/groups/invites/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setInvites(data);
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

  const handleAcceptInvite = async (groupId, inviteId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/groups/${groupId}/invites/${inviteId}/accept`, {
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
    <div className="max-w-4xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-dark flex items-center gap-2">
          <Users className="w-8 h-8 text-primary" /> My Groups
        </h2>
      </div>

      {invites.length > 0 && (
        <div className="bg-yellow-50 p-6 rounded-lg shadow-sm border border-yellow-200 mb-8">
          <h3 className="text-xl font-bold text-yellow-800 mb-4">Pending Invites</h3>
          <div className="space-y-3">
            {invites.map(invite => (
              <div key={invite.id} className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
                <div>
                  <p className="font-semibold text-gray-800">Group: {invite.group_name}</p>
                  <p className="text-sm text-gray-500">Invited by: {invite.invited_by_name}</p>
                </div>
                <button 
                  onClick={() => handleAcceptInvite(invite.group_id, invite.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                >
                  Accept
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

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
