import { Client, TokenCreateTransaction, TokenType, Hbar, PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';


dotenv.config();

const client = Client.forTestnet().setOperator(
  process.env.HEDERA_ACCOUNT_ID!,
  PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY!)
);

export async function mintProductNFT(batchId: string, cartonId: string, productId: string, metadata: { sustainability: { ecoPackaging: boolean } }) {
  try {
    console.log(`Starting mintProductNFT for productId: ${productId}`);
    const compactMetadata = {
      bId: batchId,
      cId: cartonId,
      pId: productId,
      eco: metadata.sustainability.ecoPackaging,
    };
    const metadataString = JSON.stringify(compactMetadata);
    if (Buffer.from(metadataString).length > 100) {
      throw new Error(`Metadata too long: ${Buffer.from(metadataString).length} bytes`);
    }
    console.log(`Metadata size: ${Buffer.from(metadataString).length} bytes`);

    if (!client.operatorPublicKey) {
      throw new Error('Operator public key is not set');
    }
    const transaction = new TokenCreateTransaction()
      .setTokenName(`Product ${productId}`)
      .setTokenSymbol('TTRACE')
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(process.env.HEDERA_ACCOUNT_ID!) // From previous fix
      .setSupplyKey(client.operatorPublicKey)
      .setMetadata(Buffer.from(metadataString))
      .setMaxTransactionFee(new Hbar(10));

    console.log(`Executing TokenCreateTransaction for productId: ${productId}`);
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const tokenId = receipt.tokenId?.toString();
    if (!tokenId) throw new Error('Failed to retrieve token ID');
    console.log(`Minted product NFT: ${tokenId}`);
    return tokenId;
  } catch (error) {
    console.error('Error minting product NFT:', error);
    throw error;
  }
}