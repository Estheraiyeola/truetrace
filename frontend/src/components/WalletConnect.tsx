// frontend/src/components/WalletConnect.tsx
'use client';

import { useWallet } from '../context/WalletContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const WalletConnect = () => {
  const { accountId, connectWallet } = useWallet();
  const router = useRouter();

  const handleConnect = async () => {
    try {
      await connectWallet();
      const role = await axios.post('http://localhost:3001/api/wallet-paired', { accountId });
      localStorage.setItem('token', role.data.token);
      localStorage.setItem('role', role.data.role);
      localStorage.setItem('accountId', accountId!);
      router.push('/generate');
    } catch (error: any) {
      console.error('Wallet connect error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Connect HashPack Wallet</h2>
      <button
        onClick={handleConnect}
        className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        disabled={!!accountId}
      >
        {accountId ? `Connected: ${accountId}` : 'Connect Wallet'}
      </button>
    </div>
  );
};

export default WalletConnect;