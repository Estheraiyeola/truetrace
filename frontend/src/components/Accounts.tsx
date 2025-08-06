// app/components/Accounts.tsx
'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';

interface Account {
  accountId: string;
  privateKey: string;
  publicKey: string;
}

const Accounts = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createAccounts = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('http://localhost:3001/api/createAccounts');
      setAccounts(response.data.accounts);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    createAccounts();
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Hedera Accounts</h2>
      {error && <p className="text-red-600">{error}</p>}
      {loading && <p className="text-gray-600">Creating accounts...</p>}
      <button
        onClick={createAccounts}
        disabled={loading}
        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
      >
        {loading ? 'Creating...' : 'Create Accounts'}
      </button>
      {accounts.length > 0 && (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li key={account.accountId} className="flex justify-between items-center">
              <span>
                {account.accountId} (
                {account.accountId === '0.0.6451900'
                  ? 'Chukwudi (Wholesaler)'
                  : account.accountId === '0.0.6451901'
                  ? 'Esther (Retailer)'
                  : 'Simi (Consumer)'}
                )
              </span>
              <Link href="/verify">
                <button className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
                  Verify with Account
                </button>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Accounts;