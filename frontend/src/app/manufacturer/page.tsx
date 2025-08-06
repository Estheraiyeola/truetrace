// 'use client';

// import React, { useState, useEffect } from 'react';
// import QRCode from 'qrcode.react';
// import { getHashConnect, initHashConnect } from '../config';
// import { PrivateKey } from '@hashgraph/sdk';

// export default function ManufacturerDashboard() {
//   const [productDetails, setProductDetails] = useState({
//     name: '',
//     batchNumber: '',
//     manufacturingDate: '',
//     expiryDate: '',
//     manufacturerId: '',
//     wholesalerId: '',
//   });
//   const [qrCodeValue, setQrCodeValue] = useState<string | null>(null);
//   const [accountId, setAccountId] = useState<string | null>(null);
//   const [walletData, setWalletData] = useState<any>(null);
//   const [pairingString, setPairingString] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   // Mock wallet for demo
//   const useMockWallet = () => {
//     setAccountId('0.0.123456');
//     setError(null);
//     console.log('Using mock wallet for demo');
//   };

//   useEffect(() => {
//     initHashConnect()
//       .then(({ hashConnect, saveData }) => {
//         console.log('Setting wallet data:', { saveData });
//         setWalletData({ hashConnect, saveData });
//         setPairingString(saveData.pairingString);

//         if (!saveData.privateKey) {
//           console.warn('No privateKey available, prompting mock wallet');
//           setError('Wallet connection failed, please use mock wallet or retry');
//           return;
//         }

//         hashConnect.pairingEvent.once((pairingData) => {
//           console.log('Pairing event received:', JSON.stringify(pairingData, null, 2));
//           const accountId = pairingData.accountIds?.[0];
//           if (accountId) {
//             setAccountId(accountId);
//             setError(null);
//             console.log(`- Paired account id: ${accountId}`);
//             saveData.pairedAccounts = pairingData.accountIds;
//             saveData.pairedWalletData = pairingData;
//             localStorage.setItem('hashconnectData', JSON.stringify(saveData));
//           } else {
//             setError('No account ID received in pairing data');
//           }
//         });

//         hashConnect.acknowledgeMessageEvent.once((message) => {
//           console.log('Acknowledge message received:', JSON.stringify(message, null, 2));
//           try {
//             const decrypted = hashConnect.decryptMessage(message, saveData.privateKey);
//             console.log('Decrypted message:', JSON.stringify(decrypted, null, 2));
//           } catch (error) {
//             console.error('Decryption failed:', error, 'Raw message:', JSON.stringify(message, null, 2));
//             setError(`Decryption failed: ${error.message}`);
//           }
//         });

//         hashConnect.connectionStatusChangeEvent.once((status) => {
//           console.log('Connection status:', status);
//         });

//         if (saveData.pairingString) {
//           hashConnect.connectToLocalWallet(saveData.pairingString);
//         }
//       })
//       .catch((err) => {
//         console.error('HashConnect initialization failed:', err);
//         setError(`Initialization error: ${err.message}, please use mock wallet`);
//       });

//     return () => {
//       const hashConnect = getHashConnect();
//       hashConnect.pairingEvent.clear();
//       hashConnect.connectionStatusChangeEvent.clear();
//       hashConnect.acknowledgeMessageEvent.clear();
//     };
//   }, []);

//   const connectWallet = () => {
//     if (walletData && pairingString) {
//       console.log('Connecting to local wallet with pairing string:', pairingString);
//       walletData.hashConnect.connectToLocalWallet(pairingString);
//     } else {
//       setError('WalletConnect not initialized, please use mock wallet');
//     }
//   };

//   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     setProductDetails({ ...productDetails, [e.target.name]: e.target.value });
//   };

//   const registerProduct = async () => {
//     if (!accountId) {
//       setError('Please connect your wallet or use mock wallet');
//       return;
//     }

//     try {
//       const message = 'Register product for TrueTrace Nigeria';
//       const privateKey = PrivateKey.generate(); // For demo; use HashPack in production
//       const signature = privateKey.sign(Buffer.from(message)).toString('hex');

//       const response = await fetch('/api/registerProduct', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ productDetails, accountId, signature, message }),
//       });
//       const data = await response.json();
//       if (data.success) {
//         setQrCodeValue(data.transactionId);
//         setError(null);
//       } else {
//         setError('Error registering product: ' + data.error);
//       }
//     } catch (error) {
//       console.error('Registration Error:', error);
//       setError('Registration failed');
//     }
//   };

//   return (
//     <div style={{ padding: '20px' }}>
//       <h1>Register Product</h1>
//       {!accountId ? (
//         <div>
//           <button onClick={connectWallet} style={{ margin: '10px 0' }}>
//             Connect Wallet
//           </button>
//           <button onClick={useMockWallet} style={{ margin: '10px 0' }}>
//             Use Mock Wallet
//           </button>
//           {pairingString && (
//             <div>
//               <h3>Scan to Connect</h3>
//               <QRCode value={pairingString} size={200} />
//             </div>
//           )}
//         </div>
//       ) : (
//         <p>Connected Account: {accountId}</p>
//       )}
//       <input
//         type="text"
//         name="name"
//         placeholder="Product Name"
//         value={productDetails.name}
//         onChange={handleInputChange}
//         style={{ display: 'block', margin: '10px 0' }}
//       />
//       <input
//         type="text"
//         name="batchNumber"
//         placeholder="Batch Number"
//         value={productDetails.batchNumber}
//         onChange={handleInputChange}
//         style={{ display: 'block', margin: '10px 0' }}
//       />
//       <input
//         type="date"
//         name="manufacturingDate"
//         value={productDetails.manufacturingDate}
//         onChange={handleInputChange}
//         style={{ display: 'block', margin: '10px 0' }}
//       />
//       <input
//         type="date"
//         name="expiryDate"
//         value={productDetails.expiryDate}
//         onChange={handleInputChange}
//         style={{ display: 'block', margin: '10px 0' }}
//       />
//       <input
//         type="text"
//         name="manufacturerId"
//         placeholder="Manufacturer ID"
//         value={productDetails.manufacturerId}
//         onChange={handleInputChange}
//         style={{ display: 'block', margin: '10px 0' }}
//       />
//       <input
//         type="text"
//         name="wholesalerId"
//         placeholder="Wholesaler ID"
//         value={productDetails.wholesalerId}
//         onChange={handleInputChange}
//         style={{ display: 'block', margin: '10px 0' }}
//       />
//       <button onClick={registerProduct} style={{ margin: '10px 0' }}>
//         Register and Generate QR Code
//       </button>
//       {qrCodeValue && (
//         <div>
//           <h2>QR Code for Product</h2>
//           <QRCode value={qrCodeValue} size={200} />
//           <p>Transaction ID: {qrCodeValue}</p>
//         </div>
//       )}
//       {error && <p style={{ color: 'red' }}>{error}</p>}
//     </div>
//   );
// }