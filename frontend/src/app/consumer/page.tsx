'use client';

import React, { useState, useEffect } from 'react';
import { QrReader } from 'react-qr-reader';
import QRCode from 'qrcode.react';
import { getHashConnect, initHashConnect } from '../config';
import { PrivateKey } from '@hashgraph/sdk';

export default function ConsumerVerification() {
  const [role, setRole] = useState<string>('consumer');
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [pairingString, setPairingString] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Mock wallet for demo
  const useMockWallet = () => {
    setAccountId('0.0.123456'); // Mock account ID
    setError(null);
    console.log('Using mock wallet for demo');
  };

  useEffect(() => {
    initHashConnect()
      .then(({ initData, state, pairingString }) => {
        console.log('Setting wallet data:', { initData, state, pairingString });
        setWalletData({ hashconnect: getHashConnect(), initData, state });
        setPairingString(pairingString);

        const hashConnect = getHashConnect();
        hashConnect.pairingEvent.on((pairingData) => {
          console.log('Pairing event received:', pairingData);
          const accountId = pairingData.accountIds?.[0];
          if (accountId) {
            setAccountId(accountId);
            setError(null);
          } else {
            setError('No account ID received in pairing data');
          }
        });

        hashConnect.connectionStatusChangeEvent.on((status) => {
          console.log('Connection status:', status);
        });

        hashConnect.acknowledgeMessageEvent.on((message) => {
          console.log('Message received:', JSON.stringify(message, null, 2));
        });
      })
      .catch((err) => {
        console.error('HashConnect initialization failed:', err);
        setError(`Initialization error: ${err.message}`);
      });

    return () => {
      const hashConnect = getHashConnect();
      hashConnect.pairingEvent.offAll();
      hashConnect.connectionStatusChangeEvent.offAll();
      hashConnect.acknowledgeMessageEvent.offAll();
    };
  }, []);

  const connectWallet = () => {
    if (walletData && pairingString) {
      console.log('Connecting to local wallet with pairing string:', pairingString);
      getHashConnect().connectToLocalWallet();
    } else {
      setError('WalletConnect not initialized');
    }
  };

  const handleScan = async (data: string | null) => {
    if (data && data !== scanResult && accountId) {
      setScanResult(data);
      try {
        const message = 'Verify product for TrueTrace Nigeria';
        const privateKey = PrivateKey.generate(); // For demo; use HashPack in production
        const signature = privateKey.sign(Buffer.from(message)).toString();

        const response = await fetch(`/api/verifyProduct?transactionId=${data}&role=${role}&accountId=${accountId}&signature=${signature}&message=${message}`);
        const result = await response.json();
        if (result.success) {
          setVerificationResult(result.verificationResult);
          setError(null);
        } else {
          setVerificationResult({ error: result.error });
        }
      } catch (error) {
        console.error('Error:', error);
        setVerificationResult({ error: 'Verification failed' });
      }
    }
  };

  const handleError = (error: any) => {
    console.error('QR Scan Error:', error);
    setError('Error scanning QR code');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Verify Product</h1>
      {!accountId ? (
        <div>
          <button onClick={connectWallet} style={{ margin: '10px 0' }}>
            Connect Wallet
          </button>
          <button onClick={useMockWallet} style={{ margin: '10px 0' }}>
            Use Mock Wallet (Demo)
          </button>
          {pairingString && (
            <div>
              <h3>Scan to Connect</h3>
              <QRCode value={pairingString} size={200} />
            </div>
          )}
        </div>
      ) : (
        <p>Connected Account: {accountId}</p>
      )}
      <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginBottom: '20px' }}>
        <option value="consumer">Consumer</option>
        <option value="retailer">Retailer</option>
        <option value="wholesaler">Wholesaler</option>
      </select>
      <div style={{ width: '300px', margin: '0 auto' }}>
        <QrReader
          constraints={{ facingMode: 'environment' }}
          onResult={(result, error) => {
            if (result?.getText()) {
              handleScan(result.getText());
            } else if (error) {
              handleError(error);
            }
          }}
        />
      </div>
      {scanResult && (
        <div style={{ marginTop: '20px' }}>
          <h2>Scan Result: {scanResult}</h2>
          {verificationResult ? (
            verificationResult.error ? (
              <p style={{ color: 'red' }}>{verificationResult.error}</p>
            ) : (
              <div>
                {role === 'consumer' && (
                  <>
                    <p><strong>Product Name:</strong> {verificationResult.productName}</p>
                    <p><strong>Expiry Date:</strong> {verificationResult.expiryDate}</p>
                    <p><strong>Authenticity:</strong> {verificationResult.authenticity}</p>
                  </>
                )}
                {role === 'retailer' && (
                  <>
                    <p><strong>Product Name:</strong> {verificationResult.productName}</p>
                    <p><strong>Wholesaler ID:</strong> {verificationResult.wholesalerId}</p>
                    <p><strong>Authenticity:</strong> {verificationResult.authenticity}</p>
                  </>
                )}
                {role === 'wholesaler' && (
                  <>
                    <p><strong>Product Name:</strong> {verificationResult.productName}</p>
                    <p><strong>Manufacturer ID:</strong> {verificationResult.manufacturerId}</p>
                    <p><strong>Batch Number:</strong> {verificationResult.batchNumber}</p>
                    <p><strong>Authenticity:</strong> {verificationResult.authenticity}</p>
                  </>
                )}
              </div>
            )
          ) : (
            <p>Verifying...</p>
          )}
        </div>
      )}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}