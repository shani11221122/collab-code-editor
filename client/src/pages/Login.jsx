import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { email, password });
      // 1. Token aur user info localStorage mein save karo
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      navigate('/'); // home page pe le jao
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleLogin} className="h-screen flex flex-col items-center justify-center gap-3 bg-gray-900 text-white">
      <h2 className="text-xl font-bold">Login</h2>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="px-2 py-1 rounded text-black" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="px-2 py-1 rounded text-black" />
      <button type="submit" className="bg-blue-600 px-4 py-2 rounded">Login</button>
    </form>
  );
}

export default Login;