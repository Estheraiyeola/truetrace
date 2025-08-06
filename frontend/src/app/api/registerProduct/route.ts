import { NextRequest, NextResponse } from 'next/server';
import { Client, AccountId, PrivateKey, TransferTransaction, PublicKey } from '@hashgraph/sdk';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';

const PRODUCTS_FILE = path.join(process.cwd(), 'data', 'products.json');

export async function POST(request: NextRequest) {
  try {
    const { productDetails, accountId, signature, message } = await request.json();

    // Verify wallet signature
    const client = Client.forTestnet();
    client.setOperator(
      AccountId.fromString(process.env.HEDERA_OPERATOR_ID!),
      PrivateKey.fromString(process.env.HEDERA_OPERATOR_KEY!)
    );
    const { AccountInfoQuery } = await import('@hashgraph/sdk');
    const accountInfo = await new AccountInfoQuery()
      .setAccountId(AccountId.fromString(accountId))
      .execute(client);
    const publicKey = accountInfo.key as PublicKey;
    const isValidSignature = publicKey.verify(Buffer.from(message), Buffer.from(signature, 'hex'));

    if (!isValidSignature) {
      return NextResponse.json({ success: false, error: 'Invalid wallet signature' }, { status: 401 });
    }

    const { name, batchNumber, manufacturingDate, expiryDate, manufacturerId, wholesalerId } = productDetails;

    // Generate a unique product ID
    const productId = uuidv4();

    // Store only productId in transaction memo
    const transaction = new TransferTransaction()
      .addHbarTransfer(AccountId.fromString(process.env.HEDERA_OPERATOR_ID!), -1)
      .addHbarTransfer(AccountId.fromString('0.0.3'), 1) // Replace with valid account if needed
      .setTransactionMemo(productId);

    const receipt = await transaction.execute(client);
    const transactionId = receipt.transactionId.toString();

    // Save product details to products.json
    const productData = {
      [productId]: {
        name,
        batchNumber,
        manufacturingDate,
        expiryDate,
        manufacturerId,
        wholesalerId,
      },
    };

    let existingData = {};
    try {
      const fileContent = await fs.readFile(PRODUCTS_FILE, 'utf-8');
      existingData = JSON.parse(fileContent);
    } catch (error) {
      // File might not exist yet
    }

    const updatedData = { ...existingData, ...productData };
    await fs.writeFile(PRODUCTS_FILE, JSON.stringify(updatedData, null, 2));

    return NextResponse.json({ success: true, transactionId, productId });
  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}