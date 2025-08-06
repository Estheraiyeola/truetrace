// frontend/src/components/QRGenerator.tsx
'use client';

import { useState, useRef } from 'react';
import { useWallet } from '../context/WalletContext';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

interface QRData {
  batchId: string;
  cartonId: string;
  productId: string;
  productionDate: string;
  expiryDate: string;
}

const QRGenerator = () => {
  const { accountId, connectWallet } = useWallet();
  const role = localStorage.getItem('role');
  const [qrData, setQrData] = useState<QRData>({
    batchId: '',
    cartonId: '',
    productId: '',
    productionDate: '',
    expiryDate: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const qrRef = useRef<HTMLDivElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQrData({ ...qrData, [e.target.name]: e.target.value });
  };

  const validateInputs = (): boolean => {
    if (!qrData.batchId && !qrData.cartonId && !qrData.productId) {
      setError('At least one of Batch ID, Carton ID, or Product ID is required');
      return false;
    }
    if (!qrData.productionDate || !qrData.expiryDate) {
      setError('Production and Expiry Dates are required');
      return false;
    }
    setError('');
    return true;
  };

  const registerQRCode = async () => {
    if (!accountId) {
      setError('Please connect your wallet');
      return;
    }
    if (role !== 'Manufacturer') {
      setError('Only Manufacturers can generate QR codes');
      return;
    }
    if (!validateInputs()) return;

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:3001/api/register',
        { ...qrData, accountId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(`QR Code registered: ${response.data.message}`);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error registering QR code');
      setSuccess('');
    }
  };

  const downloadQRCode = () => {
    if (!validateInputs()) return;

    const svg = qrRef.current?.querySelector('svg');
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `QRCode-${qrData.batchId || qrData.cartonId || qrData.productId}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Generate QR Code</h2>
      {!accountId ? (
        <button
          onClick={connectWallet}
          className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Connect Wallet
        </button>
      ) : role !== 'Manufacturer' ? (
        <p className="text-red-600 text-center">Only Manufacturers can generate QR codes</p>
      ) : (
        <>
          <input
            type="text"
            name="batchId"
            placeholder="Batch ID"
            value={qrData.batchId}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <input
            type="text"
            name="cartonId"
            placeholder="Carton ID"
            value={qrData.cartonId}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <input
            type="text"
            name="productId"
            placeholder="Product ID"
            value={qrData.productId}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <input
            type="date"
            name="productionDate"
            placeholder="Production Date"
            value={qrData.productionDate}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <input
            type="date"
            name="expiryDate"
            placeholder="Expiry Date"
            value={qrData.expiryDate}
            onChange={handleChange}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          <div className="flex space-x-4">
            <button
              onClick={registerQRCode}
              className="w-full bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Register QR Code
            </button>
            <button
              onClick={downloadQRCode}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              disabled={!qrData.batchId && !qrData.cartonId && !qrData.productId}
            >
              Download QR Code
            </button>
          </div>
          {error && <p className="text-red-600 text-center">{error}</p>}
          {success && <p className="text-green-600 text-center">{success}</p>}
          {(qrData.batchId || qrData.cartonId || qrData.productId) && (
            <div className="text-center mt-4" ref={qrRef}>
              <p className="text-gray-600">Generated QR Code:</p>
              <QRCodeSVG value={JSON.stringify(qrData)} size={128} />
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default QRGenerator;