import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { io } from 'socket.io-client';
import { MessageSquare, Send, Trash2 } from 'lucide-react';

const ExpenseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useContext(AuthContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
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

    newSocket.on('delete_message', (deletedMsg) => {
      setMessages(prev => prev.map(m => m.id === deletedMsg.id ? deletedMsg : m));
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

  const handleDeleteExpense = async () => {
    if (!window.confirm('Delete this expense?')) return;
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

  return (
    <div className="max-w-4xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold">Expense Details</h2>
            <button onClick={handleDeleteExpense} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          <p className="text-gray-500 mb-4">Expense ID: {id}</p>
          <div className="bg-gray-50 p-4 rounded-lg border">
            <p className="text-sm text-gray-600">Breakdown feature pending detailed member fetching.</p>
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
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-lg p-3 ${isMe ? 'bg-primary text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {isDeleted ? (
                    <span className="italic text-sm opacity-70">This message was deleted.</span>
                  ) : (
                    <>
                      <p>{msg.message}</p>
                      {isMe && (
                        <button onClick={() => handleDeleteMessage(msg.id)} className="text-xs mt-1 opacity-70 hover:opacity-100 underline">
                          Delete
                        </button>
                      )}
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
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            value={newMessage} 
            onChange={e => setNewMessage(e.target.value)} 
          />
          <button type="submit" className="bg-primary text-white p-2 rounded-lg hover:bg-primary-dark transition">
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseDetail;
