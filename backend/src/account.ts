import {
  Client,
  AccountCreateTransaction,
  Hbar,
  PrivateKey,
  TransferTransaction,
  TopicMessageSubmitTransaction,
} from '@hashgraph/sdk';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

dotenv.config();

const client = Client.forTestnet().setOperator(
  process.env.HEDERA_ACCOUNT_ID!,
  PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY!)
);

interface AccountDetails {
  accountId: string;
  privateKey: string;
  publicKey: string;
}

export async function createAndFundAccounts(topicId: string): Promise<AccountDetails[]> {
  try {
    console.log('Starting account creation and funding');
    const accounts: AccountDetails[] = [];
    const users = [
      { name: 'Chukwudi', role: 'Wholesaler' },
      { name: 'Esther', role: 'Retailer' },
      { name: 'Simi', role: 'Consumer' },
    ];

    for (const user of users) {
      // Generate new key pair
      const privateKey = PrivateKey.generateED25519();
      const publicKey = privateKey.publicKey;

      // Create account
      const createTx = new AccountCreateTransaction()
        .setKeyWithoutAlias(publicKey)
        .setInitialBalance(new Hbar(0))
        .setMaxAutomaticTokenAssociations(10); // Enable token associations for NFTs
      const createResponse = await createTx.execute(client);
      const createReceipt = await createResponse.getReceipt(client);
      const accountId = createReceipt.accountId?.toString();
      if (!accountId) throw new Error('Failed to create account');

      // Fund account with 10 HBAR
      const fundTx = new TransferTransaction()
        .addHbarTransfer(process.env.HEDERA_ACCOUNT_ID!, new Hbar(-10))
        .addHbarTransfer(accountId, new Hbar(10));
      const fundResponse = await fundTx.execute(client);
      await fundResponse.getReceipt(client);

      // Log event to HCS
      const eventType = `Account Created for ${user.name} (${user.role})`;
      const message = JSON.stringify({
        accountId,
        role: user.role,
        timestamp: new Date().toISOString(),
      });
      const topicTx = new TopicMessageSubmitTransaction()
        .setTopicId(topicId)
        .setMessage(Buffer.from(message));
      const topicResponse = await topicTx.execute(client);
      await topicResponse.getReceipt(client);
      console.log(`Logged event: ${eventType}`);

      accounts.push({ accountId, privateKey: privateKey.toStringRaw(), publicKey: publicKey.toStringRaw() });
    }

    // Save accounts to JSON file
    const filePath = path.join(__dirname, '../accounts.json');
    await fs.writeFile(filePath, JSON.stringify(accounts, null, 2));
    console.log(`Saved account details to ${filePath}`);

    return accounts;
  } catch (error) {
    console.error('Error creating and funding accounts:', error);
    throw error;
  }
}