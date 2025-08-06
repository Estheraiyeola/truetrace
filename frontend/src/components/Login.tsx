// src/components/Login.tsx
'use client';

import { useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';

const Login = () => {
  const [accountId, setAccountId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/login', { accountId, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('role', response.data.role);
      setError('');
      router.push('/generate'); // Redirect to /generate or /verify based on role
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Login</h2>
      <input
        type="text"
        placeholder="Account ID (e.g., 0.0.6451900)"
        value={accountId}
        onChange={(e) => setAccountId(e.target.value)}
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
      />
      <button
        onClick={handleLogin}
        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        Login
      </button>
      {error && <p className="text-red-600 text-center">{error}</p>}
    </div>
  );
};

export default Login;