import { useEffect, useState, useRef } from 'react';
import socket from '../socket';

/**
 * File-scoped chat. The server relays every message to the whole room
 * (io.to(fileId)), so everyone viewing the file shares one timeline.
 */
function Chat({ fileId, users = [] }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const me = JSON.parse(localStorage.getItem('user') || 'null')?.username || 'Guest';

  useEffect(() => {
    socket.on('chat-message', (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    return () => socket.off('chat-message');
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    socket.emit('chat-message', { fileId, message: text, username: me });
    setInput('');
  };

  const formatTime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <aside className="cce-chat-panel">
      <div className="cce-pane-head">
        <span>Team</span>
      </div>

      <div className="cce-chat-presence">
        <span className="head">On this file</span>
        {users.length === 0 && <span className="row" style={{ color: 'var(--text-3)' }}>You're alone in here</span>}
        {users.map((u, i) => (
          <span key={i} className="row">
            <span className="cce-dot cce-dot-live" style={{ color: u.color, width: 7, height: 7 }} />
            {u.username}
            {u.username === me && <span style={{ color: 'var(--text-3)' }}>(you)</span>}
          </span>
        ))}
      </div>

      <div className="cce-pane-head" style={{ borderBottom: '1px solid var(--border)' }}>
        <span>Chat</span>
      </div>

      <div className="cce-msg-list">
        {messages.length === 0 && (
          <div className="cce-empty" style={{ paddingTop: 0 }}>
            No messages yet — say hi 👋
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`cce-msg ${m.username === me ? 'is-mine' : ''}`}>
            <div className="meta">
              <span className="who">{m.username}</span>
              <span>{formatTime(m.at)}</span>
            </div>
            <div className="body">{m.message}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="cce-composer">
        <input
          className="cce-input-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
          }}
          placeholder="Message…"
          aria-label="Chat message"
        />
        <button className="cce-btn cce-btn-ghost" onClick={sendMessage} aria-label="Send message" style={{ height: 32, padding: '0 12px', fontSize: 12 }}>
          Send
        </button>
      </div>
    </aside>
  );
}

export default Chat;