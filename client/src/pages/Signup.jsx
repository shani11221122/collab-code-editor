import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/signup', { username, email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      const msg = err.response?.data?.error || 'Signup failed. Try again.';
      // Mongoose emits a useful code ("E11000") for duplicate keys.
      if (String(msg).includes('E11000')) {
        setError('That username or email is already taken.');
      } else {
        setError(Array.isArray(msg) ? msg[0]?.msg || 'Signup failed.' : msg);
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="cce-auth">
      <div className="cce-bg-grid" />
      <div className="cce-auth-card cce-fade-up">
        <div className="flex items-center gap-2 mb-6">
          <span className="cce-brand-mark">{'</>'}</span>
          <span style={{ fontWeight: 700 }}>Collab</span>
        </div>

        <h1 className="title mb-1">Create your account</h1>
        <p className="subtitle mt-1">Free forever — just pick a username.</p>

        <form onSubmit={handleSignup} style={{ display: 'grid', gap: 16, marginTop: 22 }}>
          {error && <div className="cce-form-error">{error}</div>}

          <div className="cce-field">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              className="cce-input"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="ayesha_khan"
              minLength={3}
              required
            />
            <span className="hint">Shown to teammates in the room.</span>
          </div>

          <div className="cce-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              className="cce-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="cce-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="cce-input"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="at least 6 characters"
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="cce-btn cce-btn-primary" disabled={submitting}>
            {submitting ? <span className="cce-spinner" /> : null}
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="subtitle" style={{ marginTop: 20, textAlign: 'center' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;