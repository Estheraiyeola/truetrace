// backend/src/index.ts
import express from 'express';
import cors from 'cors';
import { Client, TopicMessageSubmitTransaction, PrivateKey, AccountId, TopicCreateTransaction } from '@hashgraph/sdk';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { SignClient } from '@walletconnect/sign-client';

// Extend Express Request type to include 'user'
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

dotenv.config({ debug: true });

const app = express();
app.use(cors({ origin: 'http://localhost:3000' }));
app.use(express.json());

// Hedera client setup
const client = Client.forTestnet();
try {
  const accountId = AccountId.fromString(process.env.HEDERA_ACCOUNT_ID!);
  const privateKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!);
  client.setOperator(accountId, privateKey);
  console.log('Hedera client operator set:', accountId.toString());
} catch (error) {
  console.error('Error setting Hedera client operator:', error);
  process.exit(1);
}
const consumerClient = Client.forTestnet();
try {
  consumerClient.setOperator(
    process.env.HEDERA_ACCOUNT_ID!,
    PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!)
  );
} catch (error) {
  console.error('Error setting consumer client operator:', error);
  process.exit(1);
}
const submitKey = PrivateKey.fromStringECDSA(process.env.HEDERA_PRIVATE_KEY!);

// MongoDB setup
const mongoClient = new MongoClient(process.env.MONGODB_URI!, {
  serverApi: ServerApiVersion.v1,
});
let db: any;

const connectMongo = async () => {
  try {
    await mongoClient.connect();
    db = mongoClient.db('true-trace');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

connectMongo();

// WalletConnect setup
const metadata = {
  name: 'TrueTrace Nigeria',
  description: 'Supply chain tracking for Nigeria',
  url: 'http://localhost:3000',
  icons: ['https://img.icons8.com/?size=100&id=auZrogBFe8Ul&format=png&color=000000'],
};

let saveData: any = {
  topic: '',
  pairedAccounts: [],
  session: null,
};

let signClient: any;

const initWalletConnect = async () => {
  try {
    if (!process.env.WALLETCONNECT_PROJECT_ID) {
      throw new Error('WALLETCONNECT_PROJECT_ID is not set in .env');
    }
    signClient = await SignClient.init({
      projectId: process.env.WALLETCONNECT_PROJECT_ID,
      metadata,
      relayUrl: 'wss://relay.walletconnect.com', // Primary relay
    });
    console.log('WalletConnect SignClient initialized');

    // Handle session proposal
    signClient.on('session_proposal', async (proposal: any) => {
      try {
        const { id, params } = proposal;
        const { optionalNamespaces } = params;
        const accounts = optionalNamespaces.hedera?.accounts || [];
        saveData.pairedAccounts = accounts.map((account: string) => account.split(':').pop());
        saveData.session = await signClient.approve({
          id,
          namespaces: {
            hedera: {
              chains: ['hedera:testnet'],
              methods: ['hedera_signAndExecuteTransaction', 'hedera_signTransaction'],
              events: ['chainChanged', 'accountsChanged'],
              accounts: saveData.pairedAccounts,
            },
          },
        });
        console.log('Session approved:', saveData.session);
      } catch (error) {
        console.error('Session proposal error:', error);
      }
    });

    signClient.on('session_delete', () => {
      saveData.session = null;
      saveData.pairedAccounts = [];
      console.log('Session deleted');
    });

    // Create topic dynamically
    try {
      const transaction = new TopicCreateTransaction()
        .setSubmitKey(submitKey)
        .setTopicMemo('TrueTrace Nigeria Supply Chain');
      const txResponse = await transaction.execute(client);
      const receipt = await txResponse.getReceipt(client);
      saveData.topic = receipt.topicId!.toString();
      console.log('Topic created:', saveData.topic);
    } catch (error) {
      console.error('Error creating topic:', error);
      throw error;
    }
  } catch (error) {
    console.error('WalletConnect initialization error:', error);
    throw error;
  }
};

initWalletConnect().catch((error) => {
  console.error('Failed to initialize WalletConnect:', error);
});

const createHash = (data: {
  batchId: string;
  cartonId: string;
  productId: string;
  productionDate: string;
  expiryDate: string;
}): string => {
  return `${data.batchId || ''}:${data.cartonId || ''}:${data.productId || ''}:${data.productionDate}:${data.expiryDate}`;
};

// Wallet connect endpoint with enhanced retry logic
app.get('/api/connect-wallet', async (req, res) => {
  try {
    console.log('Received request for /api/connect-wallet');
    if (!signClient) {
      throw new Error('WalletConnect SignClient not initialized');
    }
    const relayUrls = [
      'wss://relay.walletconnect.com',
      'wss://relay.walletconnect.org', // Fallback relay
    ];
    let result: any;
    let lastError: any;

    for (const relayUrl of relayUrls) {
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          console.log(`Attempting to connect using relay: ${relayUrl}, attempt ${attempt + 1}`);
          signClient = await SignClient.init({
            projectId: process.env.WALLETCONNECT_PROJECT_ID,
            metadata,
            relayUrl,
          });
          result = await signClient.connect({
            optionalNamespaces: {
              hedera: {
                chains: ['hedera:testnet'],
                methods: ['hedera_signAndExecuteTransaction', 'hedera_signTransaction'],
                events: ['chainChanged', 'accountsChanged'],
              },
            },
          });
          console.log('Connect successful with relay:', relayUrl);
          break;
        } catch (error: any) {
          attempt++;
          lastError = error;
          console.error(`Connect attempt ${attempt} failed with relay ${relayUrl}:`, error.message);
          if (attempt === maxRetries) {
            console.error(`All attempts failed for relay ${relayUrl}`);
            continue;
          }
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s before retry
        }
      }
      if (result) break;
    }

    if (!result) {
      throw new Error(`Failed to connect after trying all relays: ${lastError.message}`);
    }

    const { uri, session } = result;
    console.log('Generated pairing URI:', uri);
    if (session) {
      saveData.session = session;
      saveData.pairedAccounts = session.namespaces.hedera.accounts.map((account: string) => account.split(':').pop());
      console.log('Session established:', saveData.session);
    } else {
      // Wait for session proposal and approval
      await new Promise((resolve, reject) => {
        signClient.once('session_proposal', async (proposal: any) => {
          try {
            const approvedSession = await signClient.approve({
              id: proposal.id,
              namespaces: {
                hedera: {
                  chains: ['hedera:testnet'],
                  methods: ['hedera_signAndExecuteTransaction', 'hedera_signTransaction'],
                  events: ['chainChanged', 'accountsChanged'],
                  accounts: proposal.params.optionalNamespaces.hedera.accounts || [],
                },
              },
            });
            saveData.session = approvedSession;
            saveData.pairedAccounts = approvedSession.namespaces.hedera.accounts.map((account: string) => account.split(':').pop());
            console.log('Session approved:', saveData.session);
            resolve(approvedSession);
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    res.json({ pairingUri: uri });
  } catch (error: any) {
    console.error('Error in /api/connect-wallet:', error);
    res.status(500).json({ error: 'Failed to initialize wallet connection' });
  }
});

// Handle wallet pairing
app.post('/api/wallet-paired', async (req, res) => {
  const { accountId } = req.body;
  if (!accountId || !saveData.pairedAccounts.includes(accountId)) {
    return res.status(400).json({ error: 'Invalid or unpaired account' });
  }
  const role =
    accountId === '0.0.6451900' ? 'Manufacturer' :
    accountId === '0.0.6451901' ? 'Retailer' :
    accountId === '0.0.6451902' ? 'Wholesaler' : 'Consumer';
  const token = jwt.sign({ accountId, role }, process.env.JWT_SECRET!, { expiresIn: '1h' });
  res.json({ token, role, accountId });
});

// Auth middleware
const authMiddleware = (allowedRoles: string[]) => (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    if (!allowedRoles.includes(decoded.role)) {
      return res.status(403).json({ error: 'Unauthorized role' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Register QR code
app.post('/api/register', authMiddleware(['Manufacturer']), async (req, res) => {
  const { batchId, cartonId, productId, productionDate, expiryDate, accountId } = req.body;
  if (!batchId && !cartonId && !productId) {
    return res.status(400).json({ error: 'At least one of batchId, cartonId, or productId is required' });
  }
  if (!productionDate || !expiryDate) {
    return res.status(400).json({ error: 'Production and expiry dates are required' });
  }
  if (!saveData.session) {
    return res.status(400).json({ error: 'No wallet connected' });
  }
  const qrData = { batchId: batchId || '', cartonId: cartonId || '', productId: productId || '', productionDate, expiryDate };
  const qrHash = createHash(qrData);
  try {
    const existingQR = await db.collection('qrcodes').findOne({ hash: qrHash });
    if (existingQR) {
      return res.status(400).json({ error: 'QR code already registered' });
    }
    const event = {
      eventType: 'QRCodeRegistered',
      ...qrData,
      accountId,
      timestamp: new Date().toISOString(),
    };
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(saveData.topic)
      .setMessage(JSON.stringify(event));
    const transactionBytes = Buffer.from(transaction.toBytes()).toString('hex');
    const response = await signClient.request({
      topic: saveData.session.topic,
      chainId: 'hedera:testnet',
      request: {
        method: 'hedera_signAndExecuteTransaction',
        params: { transaction: transactionBytes },
      },
    });
    await db.collection('qrcodes').insertOne({ hash: qrHash, ...qrData, registeredAt: new Date() });
    res.status(200).json({ message: `QR Code registered on topic ${saveData.topic}`, transactionId: response.transactionId });
  } catch (error: any) {
    console.error('Error registering QR code:', error);
    res.status(500).json({ error: 'Failed to register QR code' });
  }
});

// Verify product
app.post('/api/verify', authMiddleware(['Manufacturer', 'Retailer', 'Wholesaler', 'Consumer']), async (req, res) => {
  const { batchId, cartonId, productId, productionDate, expiryDate, accountId, role } = req.body;
  if (!saveData.session) {
    return res.status(400).json({ error: 'No wallet connected' });
  }
  try {
    const currentDate = new Date();
    if (new Date(expiryDate) < currentDate) {
      return res.status(400).json({ error: 'Product has expired' });
    }
    const event = {
      eventType: `${role} Verified Product ${productId || cartonId || batchId}`,
      batchId: batchId || '',
      cartonId: cartonId || '',
      productId: productId || '',
      productionDate: productionDate || '',
      expiryDate: expiryDate || '',
      accountId,
      timestamp: new Date().toISOString(),
    };
    if (role === 'Consumer') {
      const existingVerification = await db.collection('verifications').findOne({
        productId: productId || undefined,
        role: 'Consumer',
      });
      if (existingVerification) {
        return res.status(400).json({ error: 'Product already verified by a consumer' });
      }
    }
    const transaction = new TopicMessageSubmitTransaction()
      .setTopicId(saveData.topic)
      .setMessage(JSON.stringify(event));
    const transactionBytes = Buffer.from(transaction.toBytes()).toString('hex');
    const response = await signClient.request({
      topic: saveData.session.topic,
      chainId: 'hedera:testnet',
      request: {
        method: 'hedera_signAndExecuteTransaction',
        params: { transaction: transactionBytes },
      },
    });
    await db.collection('verifications').insertOne({ ...event, verifiedAt: new Date() });
    res.status(200).json({ eventType: event.eventType, transactionId: response.transactionId });
  } catch (error: any) {
    console.error('Verification error:', error);
    res.status(400).json({ error: 'Verification failed' });
  }
});

// Feedback endpoint
app.post('/api/feedback', authMiddleware(['Manufacturer', 'Retailer', 'Wholesaler', 'Consumer']), async (req, res) => {
  const { feedback } = req.body;
  if (!feedback) {
    return res.status(400).json({ error: 'Feedback is required' });
  }
  try {
    await db.collection('feedback').insertOne({ feedback, submittedAt: new Date(), user: req.user });
    res.status(200).json({ message: 'Feedback submitted' });
  } catch (error: any) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Create new topic (fallback)
app.post('/api/create-topic', async (req, res) => {
  try {
    const transaction = new TopicCreateTransaction()
      .setSubmitKey(submitKey)
      .setTopicMemo('TrueTrace Nigeria Supply Chain');
    const txResponse = await transaction.execute(client);
    const receipt = await txResponse.getReceipt(client);
    const newTopicId = receipt.topicId!.toString();
    saveData.topic = newTopicId;
    res.status(200).json({ message: `New topic created: ${newTopicId}` });
  } catch (error: any) {
    console.error('Error creating topic:', error);
    res.status(500).json({ error: 'Failed to create topic' });
  }
});

app.listen(3001, () => {
  console.log('Backend running on port 3001');
});