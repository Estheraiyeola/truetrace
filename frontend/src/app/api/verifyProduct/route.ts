import { NextRequest, NextResponse } from 'next/server';
import { Client, AccountId, PrivateKey, TransactionReceiptQuery, PublicKey } from '@hashgraph/sdk';
import fs from 'fs/promises';
import path from 'path';

const PRODUCTS_FILE = path.join(process.cwd(), 'data', 'products.json');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const transactionId = searchParams.get('transactionId');
  const role = searchParams.get('role'); // consumer, retailer, wholesaler
  const accountId = searchParams.get('accountId');
  const signature = searchParams.get('signature');
  const message = searchParams.get('message');

  if (!transactionId || !role || !accountId || !signature || !message) {
    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
  }

  try {
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.HEDERA_OPERATOR_ID!),
      PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY!)
    );

    // Verify wallet signature
    const { AccountInfoQuery } = await import('@hashgraph/sdk');
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(AccountId.fromString(accountId))
      .execute(client);
    const publicKey = accountInfo.key as PublicKey;
    const isValidSignature = publicKey.verify(Buffer.from(message), Buffer.from(signature, 'hex'));

    if (!isValidSignature) {
      return NextResponse.json({ success: false, error: 'Invalid wallet signature' }, { status: 401 });
    }

    // Query the transaction record to get productId from the transaction memo
    const { TransactionRecordQuery } = await import('@hashgraph/sdk');
    const record = await new TransactionRecordQuery()
      .setTransactionId(transactionId)
      .execute(client);

    const productId = record.transactionMemo;
    if (!productId) {
      return NextResponse.json({ success: false, error: 'No product ID found in transaction' }, { status: 404 });
    }

    // Retrieve product details from products.json
    const fileContent = await fs.readFile(PRODUCTS_FILE, 'utf-8');
    const products = JSON.parse(fileContent);
    const productDetails = products[productId];

    if (!productDetails) {
      return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    // Role-based verification logic
    let verificationResult;
    if (role === 'consumer') {
      const isExpired = new Date(productDetails.expiryDate) < new Date();
      verificationResult = {
        authenticity: isExpired ? 'Expired' : 'Verified',
        productName: productDetails.name,
        expiryDate: productDetails.expiryDate,
      };
    } else if (role === 'retailer') {
      verificationResult = {
        authenticity: 'Verified',
        productName: productDetails.name,
        wholesalerId: productDetails.wholesalerId,
      };
    } else if (role === 'wholesaler') {
      verificationResult = {
        authenticity: 'Verified',
        productName: productDetails.name,
        manufacturerId: productDetails.manufacturerId,
        batchNumber: productDetails.batchNumber,
      };
    } else {
      return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      verificationResult,
    });
  } catch (error) {
    console.error('Verification Error:', error);
    return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
  }
}