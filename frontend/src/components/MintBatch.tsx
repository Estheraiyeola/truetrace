'use client';
import { useState } from 'react';
import axios from 'axios';

const MintBatch = () => {
  const [batchId, setBatchId] = useState('');
  const [productName, setProductName] = useState('');
  const [cartonId, setCartonId] = useState('');
  const [productId, setProductId] = useState('');
  const [sustainability, setSustainability] = useState({ ecoPackaging: false });
  const [result, setResult] = useState('');

  const mintBatch = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/mintBatch', {
        batchId,
        productName,
        sustainability,
      });
      setResult(`Batch NFT: ${response.data.tokenId}`);
    } catch (error) {
      setResult('Error minting batch');
    }
  };

  const mintCarton = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/mintCarton', {
        batchId,
        cartonId,
        sustainability,
        accountId: '0.0.6398396',
      });
      setResult(`Carton NFT: ${response.data.tokenId}`);
    } catch (error) {
      setResult('Error minting carton');
    }
  };

  const mintProduct = async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/mintProduct', {
        batchId,
        cartonId,
        productId,
        sustainability,
      });
      setResult(`Product NFT: ${response.data.tokenId}`);
    } catch (error) {
      setResult('Error minting product');
    }
  };

  return (
    <div>
      <h2>Mint NFTs</h2>
      <input
        type="text"
        placeholder="Batch ID"
        value={batchId}
        onChange={(e) => setBatchId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Product Name"
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Carton ID"
        value={cartonId}
        onChange={(e) => setCartonId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Product ID"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
      />
      <label>
        <input
          type="checkbox"
          checked={sustainability.ecoPackaging}
          onChange={(e) => setSustainability({ ecoPackaging: e.target.checked })}
        />
        Eco-Friendly Packaging
      </label>
      <button onClick={mintBatch}>Mint Batch</button>
      <button onClick={mintCarton}>Mint Carton</button>
      <button onClick={mintProduct}>Mint Product</button>
      {result && <p>{result}</p>}
    </div>
  );
};

export default MintBatch;