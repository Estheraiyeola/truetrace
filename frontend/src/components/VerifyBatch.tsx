// frontend/src/components/VerifyBatch.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import axios from 'axios';

interface VerifyBatchProps {
  scannedData: { batchId?: string; cartonId?: string; productId?: string; productionDate?: string; expiryDate?: string };
}

const VerifyBatch = ({ scannedData }: VerifyBatchProps) => {
  const { accountId, connectWallet } = useWallet();
  const role = localStorage.getItem('role');
  const [batchId, setBatchId] = useState(scannedData.batchId || '');
  const [cartonId, setCartonId] = useState(scannedData.cartonId || '');
  const [productId, setProductId] = useState(scannedData.productId || '');
  const [productionDate, setProductionDate] = useState(scannedData.productionDate || '');
  const [expiryDate, setExpiryDate] = useState(scannedData.expiryDate || '');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setBatchId(scannedData.batchId || '');
    setCartonId(scannedData.cartonId || '');
    setProductId(scannedData.productId || '');
    setProductionDate(scannedData.productionDate || '');
    setExpiryDate(scannedData.expiryDate || '');
  }, [scannedData]);

  const verify = async () => {
    if (!accountId) {
      setResult('Please connect your wallet');
      return;
    }
    if (role === 'Manufacturer') {
      setResult('Manufacturers cannot verify products');
      return;
    }
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3001/api/verify',
        { batchId, cartonId, productId, productionDate, expiryDate, accountId, role },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResult(`Success: ${response.data.eventType}`);
    } catch (error: any) {
      setResult(error.response?.data?.error || 'Error during verification');
      console.error('Verification error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Verify Product</h2>
      {!accountId ? (
        <button
          onClick={connectWallet}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Connect Wallet
        </button>
      ) : role === 'Manufacturer' ? (
        <p className="text-red-600 text-center">Manufacturers cannot verify products</p>
      ) : (
        <>
          <input
            type="text"
            placeholder="Batch ID"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Carton ID"
            value={cartonId}
            onChange={(e) => setCartonId(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Product ID"
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
            disabled={loading}
          />
          <input
            type="date"
            placeholder="Production Date"
            value={productionDate}
            onChange={(e) => setProductionDate(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
            disabled={loading}
          />
          <input
            type="date"
            placeholder="Expiry Date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
            disabled={loading}
          />
          <button
            onClick={verify}
            disabled={loading || (!batchId && !cartonId && !productId)}
            className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 'Verify & Log'}
          </button>
          {result && <p className="text-sm text-gray-600">{result}</p>}
        </>
      )}
    </div>
  );
};

export default VerifyBatch;