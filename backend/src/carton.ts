import { Client, TokenCreateTransaction, TokenType, Hbar, TokenAssociateTransaction, PrivateKey } from '@hashgraph/sdk';
import dotenv from 'dotenv';

dotenv.config();

const client = Client.forTestnet().setOperator(
  process.env.HEDERA_ACCOUNT_ID!,
  PrivateKey.fromStringED25519(process.env.HEDERA_PRIVATE_KEY!)
);

export async function mintCartonNFT(batchId: string, cartonId: string, metadata: { sustainability: { ecoPackaging: boolean } }) {
  try {
    console.log(`Starting mintCartonNFT for cartonId: ${cartonId}`);
    const compactMetadata = {
      bId: batchId,
      cId: cartonId,
      eco: metadata.sustainability.ecoPackaging,
    };
    const metadataString = JSON.stringify(compactMetadata);
    if (Buffer.from(metadataString).length > 100) {
      throw new Error(`Metadata too long: ${Buffer.from(metadataString).length} bytes`);
    }
    console.log(`Metadata size: ${Buffer.from(metadataString).length} bytes`);

    const transaction = new TokenCreateTransaction()
      .setTokenName(`Carton ${cartonId}`)
      .setTokenSymbol('TTRACE')
      .setTokenType(TokenType.NonFungibleUnique)
      .setTreasuryAccountId(process.env.HEDERA_ACCOUNT_ID!)
      .setSupplyKey(
        client.operatorPublicKey ??
        (() => { throw new Error('Operator public key is null'); })()
      )
      .setMetadata(Buffer.from(metadataString))
      .setMaxTransactionFee(new Hbar(10));

    console.log(`Executing TokenCreateTransaction for cartonId: ${cartonId}`);
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const tokenId = receipt.tokenId?.toString();
    if (!tokenId) throw new Error('Failed to retrieve token ID');
    console.log(`Minted carton NFT: ${tokenId}`);
    return tokenId;
  } catch (error) {
    console.error('Error minting carton NFT:', error);
    throw error;
  }
}

export async function associateCarton(accountId: string, tokenId: string) {
  try {
    // Skip association if accountId is the treasury (already associated)
    if (accountId === process.env.HEDERA_ACCOUNT_ID) {
      console.log(`Skipping association for treasury account ${accountId} (already associated)`);
      return;
    }
    console.log(`Associating carton NFT: ${tokenId} with account: ${accountId}`);
    const transaction = new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([tokenId]);
    console.log(`Built TokenAssociateTransaction for tokenId: ${tokenId}`);
    const txResponse = await transaction.execute(client);
    console.log(`Executed TokenAssociateTransaction for tokenId: ${tokenId}`);
    await txResponse.getReceipt(client);
    console.log(`Associated carton NFT: ${tokenId} with account: ${accountId}`);
  } catch (error: any) {
    if (error.status && error.status.toString() === 'TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT') {
      console.log(`Token ${tokenId} already associated with account ${accountId}, proceeding`);
      return;
    }
    console.error('Error associating carton NFT:', error);
    throw error;
  }
}