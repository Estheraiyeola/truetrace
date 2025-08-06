import { Client, TokenCreateTransaction, TokenType, Hbar, TopicMessageSubmitTransaction, PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = Client.forTestnet().setOperator(
  process.env.HEDERA_ACCOUNT_ID!,
  PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY!)
);

export async function mintBatchNFT(batchId: string, metadata: { productName: string; sustainability: { ecoPackaging: boolean } }) {
  try {
    console.log(`Starting mintBatchNFT for batchId: ${batchId}`);
    const compactMetadata = {
      bId: batchId,
      pName: metadata.productName,
      eco: metadata.sustainability.ecoPackaging,
    };
    const metadataString = JSON.stringify(compactMetadata);
    if (Buffer.from(metadataString).length > 100) {
      throw new Error(`Metadata too long: ${Buffer.from(metadataString).length} bytes`);
    }
    console.log(`Metadata size: ${Buffer.from(metadataString).length} bytes`);

    const transaction = new TokenCreateTransaction()
      .setTokenName(`Batch ${batchId}`)
      .setTokenSymbol('TTRACE')
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(process.env.HEDERA_ACCOUNT_ID!)
      .setSupplyKey(
        client.operatorPublicKey ??
        (() => { throw new Error('Operator public key is null'); })()
      )
      .setMetadata(Buffer.from(metadataString))
      .setMaxTransactionFee(new Hbar(10));

    console.log(`Executing TokenCreateTransaction for batchId: ${batchId}`);
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const tokenId = receipt.tokenId?.toString();
    if (!tokenId) throw new Error('Failed to retrieve token ID');
    console.log(`Minted batch NFT: ${tokenId}`);
    return tokenId;
  } catch (error) {
    console.error('Error minting batch NFT:', error);
    throw error;
  }
}

export async function logBatchEvent(topicId: string, batchId: string, eventType: string, accountId: string) {
  try {
    console.log(`Logging event: ${eventType} for batchId: ${batchId}`);
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(
        Buffer.from(
          JSON.stringify({ batchId, eventType, accountId, timestamp: new Date().toISOString() })
        )
      );
    const txResponse = await transaction.execute(client);
    await txResponse.getReceipt(client);
    console.log(`Logged event: ${eventType} for batchId: ${batchId}`);
  } catch (error) {
    console.error('Error logging batch event:', error);
    throw error;
  }
}