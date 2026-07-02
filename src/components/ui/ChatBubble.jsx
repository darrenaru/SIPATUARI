import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, ArrowLeft } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';
import { ROLES } from '../../constants/roles';

const ROLE_LABEL = { operator: 'Operator', upp: 'UPP', pemkab: 'PEMKAB' };

export default function ChatBubble() {
  const { user, role } = useAuth();
  const isAdmin = role === ROLES.ADMIN;
  const canChat = [ROLES.ADMIN, ROLES.OPERATOR, ROLES.UPP, ROLES.PEMKAB].includes(role);

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeUserId, setActiveUserId] = useState(null);
  const [input, setInput] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const activeUserIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => { activeUserIdRef.current = activeUserId; }, [activeUserId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const loadUnreadCount = async () => {
    if (!user) return;
    let q = supabase.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('is_read', false).neq('sender_id', user.id);
    if (!isAdmin) q = q.eq('user_id', user.id);
    const { count } = await q;
    setUnreadCount(count || 0);
  };

  const loadConversations = async () => {
    const { data: msgs } = await supabase.from('chat_messages')
      .select('user_id, sender_id, is_read, created_at')
      .order('created_at', { ascending: false });
    if (!msgs?.length) { setConversations([]); return; }

    const userIds = [...new Set(msgs.map((m) => m.user_id))];
    const { data: profiles } = await supabase.from('profiles')
      .select('id, nama, instansi, role').in('id', userIds);
    const pMap = {};
    (profiles || []).forEach((p) => { pMap[p.id] = p; });

    const convMap = {};
    msgs.forEach((msg) => {
      if (!convMap[msg.user_id]) {
        const p = pMap[msg.user_id] || {};
        convMap[msg.user_id] = {
          user_id: msg.user_id,
          nama: p.nama || '—',
          instansi: p.instansi || '',
          role: p.role || '',
          unread: 0,
          last_at: msg.created_at,
        };
      }
      if (!msg.is_read && msg.sender_id !== user.id) convMap[msg.user_id].unread++;
    });
    setConversations(Object.values(convMap).sort((a, b) => new Date(b.last_at) - new Date(a.last_at)));
  };

  const loadMessages = async (userId) => {
    const { data } = await supabase.from('chat_messages').select('*')
      .eq('user_id', userId).order('created_at', { ascending: true });
    setMessages(data || []);
    await supabase.from('chat_messages').update({ is_read: true })
      .eq('user_id', userId).neq('sender_id', user.id).eq('is_read', false);
    loadUnreadCount();
    if (isAdmin) loadConversations();
  };

  useEffect(() => { if (user) loadUnreadCount(); }, [user, role]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('chat-bubble')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, (payload) => {
        const msg = payload.new;
        if (activeUserIdRef.current && msg.user_id === activeUserIdRef.current) {
          setMessages((prev) => [...prev, msg]);
        }
        if (msg.sender_id !== user.id) {
          loadUnreadCount();
          if (isAdmin) loadConversations();
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [user]);

  const handleOpen = () => {
    setOpen(true);
    if (isAdmin) {
      loadConversations();
    } else if (user) {
      setActiveUserId(user.id);
      loadMessages(user.id);
    }
  };

  const handleSelectConversation = (userId) => {
    setActiveUserId(userId);
    loadMessages(userId);
  };

  const handleSend = async () => {
    const convId = isAdmin ? activeUserId : user?.id;
    if (!input.trim() || !convId) return;
    const trimmed = input.trim();
    setInput('');
    const { error } = await supabase.from('chat_messages').insert({ user_id: convId, sender_id: user.id, message: trimmed });
    if (error) {
      console.error('Chat insert error:', error);
      setInput(trimmed);
    }
  };

  if (!canChat || !user) return null;

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[calc(100vw-2rem)] sm:w-80 h-[min(420px,70vh)] bg-white rounded-2xl shadow-2xl border border-surface-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 bg-navy-900 text-white flex-shrink-0">
            {isAdmin && activeUserId && (
              <button onClick={() => { setActiveUserId(null); setMessages([]); }}
                className="p-0.5 hover:text-slate-300 transition-colors cursor-pointer flex-shrink-0">
                <ArrowLeft size={16} />
              </button>
            )}
            <span className="text-sm font-semibold flex-1 truncate">
              {isAdmin && activeUserId
                ? (conversations.find((c) => c.user_id === activeUserId)?.nama || '—')
                : isAdmin ? 'Pesan Masuk' : 'Hubungi Admin'}
            </span>
            <button onClick={() => setOpen(false)} className="p-0.5 hover:text-slate-300 transition-colors cursor-pointer flex-shrink-0">
              <X size={16} />
            </button>
          </div>

          {/* Admin: daftar percakapan */}
          {isAdmin && !activeUserId && (
            <div className="flex-1 overflow-y-auto divide-y divide-surface-100">
              {conversations.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  Belum ada pesan masuk.
                </div>
              ) : conversations.map((c) => (
                <button key={c.user_id} onClick={() => handleSelectConversation(c.user_id)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 text-left transition-colors cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-sea-500/15 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-sea-700">{c.nama?.[0]?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{c.nama}</p>
                    <p className="text-xs text-slate-400 truncate">{c.instansi || ROLE_LABEL[c.role] || c.role}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="flex-shrink-0 bg-danger-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Pesan */}
          {(!isAdmin || activeUserId) && (
            <>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 && (
                  <div className="flex items-center justify-center h-full text-sm text-slate-400 text-center px-4">
                    {isAdmin ? 'Belum ada pesan.' : 'Kirim pesan ke Admin untuk mendapatkan bantuan.'}
                  </div>
                )}
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                        isMine ? 'bg-sea-500 text-white rounded-br-sm' : 'bg-surface-100 text-navy-900 rounded-bl-sm'
                      }`}>
                        {msg.message}
                        <span className={`block text-[10px] mt-0.5 ${isMine ? 'text-sea-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 px-3 py-2.5 border-t border-surface-200 flex-shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder="Tulis pesan..."
                  className="flex-1 px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <button onClick={handleSend} disabled={!input.trim()}
                  className="w-8 h-8 rounded-full bg-sea-500 text-white flex items-center justify-center hover:bg-sea-600 disabled:opacity-40 transition-colors cursor-pointer flex-shrink-0">
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Tombol bubble */}
      <button
        onClick={open ? () => setOpen(false) : handleOpen}
        className="w-14 h-14 rounded-full bg-navy-900 text-white shadow-xl flex items-center justify-center hover:bg-navy-800 transition-colors cursor-pointer relative"
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
        {!open && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shadow">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
