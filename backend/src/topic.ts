import { Client, TopicCreateTransaction, PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = Client.forTestnet().setOperator(
  process.env.HEDERA_ACCOUNT_ID!,
  PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY!)
);

export async function createTopic(): Promise<string> {
  try {
    const transaction = new TopicCreateTransaction()
      .setTopicMemo('TrueTrace Nigeria Supply Chain Events')
      .setMaxTransactionFee(1);

    const txResponse = await transaction.execute(client);

    const receipt = await txResponse.getReceipt(client);

    const topicId = receipt.topicId?.toString();

    if (!topicId) {
      throw new Error('Failed to retrieve topic ID');
    }

    console.log(`Topic created with ID: ${topicId}`);
    return topicId;
  } catch (error) {
    console.error('Error creating topic:', error);
    throw new Error(`Failed to create topic: ${error}`);
  }
}

