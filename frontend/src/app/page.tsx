'use client';

import { useEffect, useState } from 'react';
import { initHashConnect } from './config';
import QRCode from 'qrcode.react';

export default function ManufacturerDashboard() {
  const [walletData, setWalletData] = useState<{
    saveData: {
      topic: string;
      pairingString: string;
      privateKey: string;
      pairedAccounts: string[];
      pairedWalletData: any;
    };
  } | null>(null);
  const [pairingString, setPairingString] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const initialize = async () => {
    try {
      setError(null);
      const initData = await initHashConnect();
      console.log('Setting wallet data:', { saveData: initData });
      setWalletData({
        saveData: {
          topic: initData.topic,
          pairingString: initData.pairingString,
          privateKey: initData.privKey,
          pairedAccounts: initData.savedPairings?.flatMap((p: any) => p.accountIds) || [],
          pairedWalletData: initData.savedPairings?.[0] || null,
        },
      });
      setPairingString(initData.pairingString);
      if (!initData.privKey) {
        console.log('No privateKey available, using mock wallet');
        setMockWallet();
      }
    } catch (error: any) {
      console.error('Failed to initialize HashConnect:', error);
      setError('Failed to initialize wallet or connect to HashPack. Please try again or use mock wallet.');
      setMockWallet();
    }
  };

  useEffect(() => {
    initialize();
  }, []);

  const setMockWallet = () => {
    const mockData = {
      saveData: {
        topic: 'mock-topic',
        pairingString: 'mock-pairing-string',
        privateKey: 'mock-private-key',
        pairedAccounts: ['0.0.12345'],
        pairedWalletData: { name: 'Mock HashPack' },
      },
    };
    setWalletData(mockData);
    console.log('Mock wallet set:', mockData);
  };

  const handlePairing = () => {
    if (pairingString) {
      console.log('Use this pairing string in HashPack:', pairingString);
      alert(`Please scan the QR code or copy this pairing string in HashPack:\n${pairingString}`);
    } else {
      console.error('No pairing string available');
      alert('No pairing string available. Please refresh the page.');
    }
  };

  const handleRetry = () => {
    console.log('Retrying HashConnect initialization...');
    initialize();
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>TrueTrace Nigeria Manufacturer Dashboard</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {walletData ? (
        <>
          <p>Connected to topic: {walletData.saveData.topic}</p>
          {walletData.saveData.pairedAccounts.length > 0 ? (
            <p>Paired accounts: {walletData.saveData.pairedAccounts.join(', ')}</p>
          ) : (
            <div>
              <p>No wallet paired. Scan the QR code or copy the pairing string to connect with HashPack.</p>
              {pairingString && (
                <>
                  <QRCode value={pairingString} size={200} />
                  <p style={{ wordBreak: 'break-all', marginTop: '10px' }}>
                    Pairing String: {pairingString}
                  </p>
                  <button onClick={handlePairing} style={{ marginTop: '10px', marginRight: '10px' }}>
                    Copy Pairing String
                  </button>
                  <button onClick={handleRetry} style={{ marginTop: '10px' }}>
                    Retry Connection
                  </button>
                </>
              )}
            </div>
          )}
          <button
            onClick={() => console.log('Register product')}
            disabled={walletData.saveData.pairedAccounts.length === 0}
            style={{ marginTop: '20px' }}
          >
            Register Product
          </button>
        </>
      ) : (
        <p>Initializing wallet...</p>
      )}
    </div>
  );
}