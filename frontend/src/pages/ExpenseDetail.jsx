import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { MessageSquare, Send, Trash2, Edit2, Check, X } from 'lucide-react';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);
  
  const [expense, setExpense] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);

  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingMsgText, setEditingMsgText] = useState('');

  useEffect(() => {
    // Fetch Expense Details
    fetch(`http://localhost:5000/api/expenses/${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch expense');
      return res.json();
    })
    .then(data => setExpense(data))
    .catch(err => console.error(err));

    // Fetch initial messages
    fetch(`http://localhost:5000/api/expenses/${id}/messages`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(res => res.json())
    .then(data => setMessages(data))
    .catch(err => console.error(err));

    // Connect socket
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_expense', id);
    });

    newSocket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    newSocket.on('edit_message', (editedMsg) => {
      setMessages(prev => prev.map(m => m.id === editedMsg.id ? { ...m, message: editedMsg.message, updated_at: editedMsg.updated_at } : m));
    });

    newSocket.on('delete_message', (deletedMsg) => {
      setMessages(prev => prev.map(m => m.id === deletedMsg.id ? { ...m, deleted_at: deletedMsg.deleted_at } : m));
    });

    return () => newSocket.close();
  }, [id, token]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket) return;
    socket.emit('new_message', { expenseId: id, userId: user.id, message: newMessage });
    setNewMessage('');
  };

  const handleDeleteMessage = (msgId) => {
    if (!socket) return;
    socket.emit('delete_message', { messageId: msgId, expenseId: id });
  };

  const startEditingMessage = (msg) => {
    setEditingMsgId(msg.id);
    setEditingMsgText(msg.message);
  };

  const saveEditMessage = () => {
    if (!socket || !editingMsgText.trim()) return;
    socket.emit('edit_message', { messageId: editingMsgId, expenseId: id, newText: editingMsgText });
    setEditingMsgId(null);
    setEditingMsgText('');
  };

  const cancelEditMessage = () => {
    setEditingMsgId(null);
    setEditingMsgText('');
  };

  const handleDeleteExpense = async () => {
    if (!window.confirm('Delete this expense completely? This will affect balances.')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/expenses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        navigate(-1);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!expense) return <div className="text-center mt-20">Loading Expense...</div>;

  return (
    <div className="max-w-5xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold">{expense.description}</h2>
              <p className="text-gray-500 text-sm">Created on {new Date(expense.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex gap-2">
              <Link to={`/expenses/${id}/edit`} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition">
                <Edit2 className="w-5 h-5" />
              </Link>
              <button onClick={handleDeleteExpense} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="mb-6">
            <p className="text-3xl font-bold text-gray-800">${parseFloat(expense.total_amount).toFixed(2)}</p>
            <p className="text-sm text-gray-500 uppercase tracking-wider font-semibold mt-1">Total Amount • {expense.split_type} split</p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4">
            <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Who Paid</h3>
            <ul className="space-y-2">
              {expense.payers && expense.payers.map(p => (
                <li key={p.id} className="flex justify-between items-center text-sm">
                  <span>{p.name}</span>
                  <span className="font-medium">${parseFloat(p.amount_paid).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-3 border-b pb-2">Who Owes What</h3>
            <ul className="space-y-2">
              {expense.splits && expense.splits.map(s => (
                <li key={s.id} className="flex justify-between items-center text-sm">
                  <span>{s.name}</span>
                  <span className="font-medium text-red-600">${parseFloat(s.amount_owed).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="flex flex-col h-[600px] bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b bg-gray-50 flex items-center gap-2 font-semibold">
          <MessageSquare className="w-5 h-5 text-primary" /> Discussion
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => {
            const isMe = msg.user_id === user.id;
            const isDeleted = msg.deleted_at !== null;
            const isEdited = msg.updated_at !== null && msg.updated_at !== msg.created_at && !isDeleted;
            const isEditing = editingMsgId === msg.id;

            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] min-w-[50%] rounded-lg p-3 ${isMe ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {!isMe && <p className="text-xs font-bold mb-1 opacity-70">{msg.user_name || 'Group Member'}</p>}
                  
                  {isDeleted ? (
                    <span className="italic text-sm opacity-70">This message was deleted.</span>
                  ) : isEditing ? (
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={editingMsgText}
                        onChange={(e) => setEditingMsgText(e.target.value)}
                        className="text-black p-1 rounded text-sm w-full outline-none"
                        autoFocus
                      />
                      <button onClick={saveEditMessage} className="text-white hover:text-green-300"><Check className="w-4 h-4" /></button>
                      <button onClick={cancelEditMessage} className="text-white hover:text-red-300"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <>
                      <p className="break-words">{msg.message}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] opacity-60">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          {isEdited && ' (edited)'}
                        </span>
                        {isMe && (
                          <div className="flex gap-2 mt-2">
                            <button onClick={() => startEditingMessage(msg)} className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteMessage(msg.id)} className="text-xs opacity-70 hover:opacity-100 flex items-center gap-1">
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t flex gap-2">
          <input 
            type="text" 
            placeholder="Type a message..." 
            className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-gray-50"
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)} 
          />
          <button type="submit" className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-dark transition font-medium">
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseDetail;
