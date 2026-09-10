import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { API_URL } from '../config';

/**
 * Public landing page.
 * Quick demo path: create a room instantly (no auth required) and share the
 * link. Auth (Login/Signup) is optional for users who want persistence.
 */
function Home() {
  const [joinId, setJoinId] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const createRoom = async () => {
    setCreating(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Project' }),
      });
      if (!res.ok) throw new Error('Failed to create room');
      const room = await res.json();
      navigate(`/room/${room.roomId}`);
    } catch (err) {
      setError(err.message || 'Something went wrong');
      setCreating(false);
    }
  };

  const joinRoom = () => {
    const id = joinId.trim();
    if (id) navigate(`/room/${id}`);
  };

  return (
    <div className="cce-app cce-fade-up">
      <div className="cce-bg-grid" />

      {/* nav */}
      <nav className="cce-nav" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="cce-brand">
          <span className="cce-brand-mark">{'</>'}</span>
          <span>Collab</span>
        </div>
        <span style={{ flex: 1 }} />
        <Link className="cce-nav-link" to="/login">Sign in</Link>
        <button className="cce-btn cce-btn-primary" onClick={() => navigate('/login')} style={{ height: 36, fontSize: 13 }}>
          Get started
        </button>
      </nav>

      {/* hero */}
      <section className="cce-hero">
        <span className="cce-hero-badge">
          <span className="cce-dot cce-dot-live" style={{ width: 6, height: 6 }} />
          Realtime · conflict-free · open source
        </span>

        <h1 className="cce-hero-title">
          Code together,
          <br />
          <span className="grad">without the chaos.</span>
        </h1>

        <p className="cce-hero-sub">
          Collab is a browser-based code editor with live cursors, operational-transform
          conflict resolution, inline chat, version history and one-click execution —
          built on React, Socket.io and MongoDB.
        </p>

        <div className="cce-hero-cta">
          <button className="cce-btn cce-btn-primary" onClick={createRoom} disabled={creating} style={{ minWidth: 200 }}>
            {creating ? <span className="cce-spinner" /> : null}
            {creating ? 'Creating…' : 'Create a room'}
          </button>
          <Link className="cce-btn cce-btn-ghost" to="/signup">
            Sign up free
          </Link>
        </div>

        <form
          className="cce-hero-join"
          onSubmit={(e) => {
            e.preventDefault();
            joinRoom();
          }}
        >
          <input
            className="cce-input"
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="or enter a room code — e.g. aX9kLp2Q"
            aria-label="Room code"
          />
          <button className="cce-btn cce-btn-ghost-2" type="submit" style={{ height: 40 }}>
            Join →
          </button>
        </form>

        {error && (
          <div className="cce-form-error" style={{ margin: '16px auto 0', maxWidth: 420 }}>
            {error}
          </div>
        )}
{/* mock editor window */}
        <div className="cce-code-window">
          <div className="bar">
            <span className="dots"><i /><i /><i /></span>
            <span className="title" style={{ flex: 1 }}>room aX9kLp2Q · app.js</span>
            <span className="cce-pill"><span className="cce-dot cce-dot-live" /> 2 online</span>
          </div>
          <pre>
<span className="ln">1</span> <span className="cce-tok-cmt">// Identical edits, zero overwrites.</span>{'\n'}
<span className="ln">2</span> <span className="cce-tok-kw">const</span> welcome = <span className="cce-tok-str">'hi team!'</span>;{'\n'}
<span className="ln">3</span> <span className="cce-tok-kw">function</span> <span className="cce-tok-fn">greet</span>(name) {'{'}{'\n'}
<span className="ln">4</span>   <span className="cce-tok-kw">return</span> <span className="cce-tok-str">`</span>{'${'}welcome{'}'} <span className="cce-tok-str">`</span> + name;{'\n'}
<span className="ln">5</span> {'}'}          <span className="cce-tok-cmt">// ← Sarah is typing too</span>{'\n'}
<span className="ln">6</span> <span className="cce-tok-fn">console</span>.<span className="cce-tok-fn">log</span>(<span className="cce-tok-fn">greet</span>(<span className="cce-tok-str">'Ayesha'</span>));
          </pre>
        </div>
      </section>

      {/* features */}
      <section className="cce-features">
        <div className="cce-feature">
          <div className="emoji">⚡</div>
          <h3>True realtime sync</h3>
          <p>Every keystroke is an OT operation — reconstructed and rebroadcast in milliseconds over WebSockets.</p>
        </div>
        <div className="cce-feature">
          <div className="emoji">🧩</div>
          <h3>Conflict-proof typing</h3>
          <p>Operational Transformation merges concurrent edits deterministically. No last-writer-wins data loss.</p>
        </div>
        <div className="cce-feature">
          <div className="emoji">📦</div>
          <h3>Run in the browser</h3>
          <p>JavaScript, Python, C++ and Java execute through a Judge0-backed sandbox with a terminal-style output.</p>
        </div>
        <div className="cce-feature">
          <div className="emoji">🕘</div>
          <h3>Version history</h3>
          <p>Save checkpoints and restore any snapshot. Content persists in MongoDB with debounced auto-save.</p>
        </div>
      </section>

      <footer className="cce-footer">
        <span>Collab — built for learning, engineered for production.</span>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>React · Socket.io · OT · MongoDB · Redis · Judge0</span>
      </footer>
    </div>
  );
}

export default Home;