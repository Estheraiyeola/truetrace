import { HashConnect, HashConnectTypes } from '@hashgraph/hashconnect';

// Initialize HashConnect with debug mode
let hashconnect: HashConnect;
try {
  hashconnect = new HashConnect(true); // Debug mode enabled
  console.log('HashConnect instance created successfully');
} catch (error) {
  console.error('Failed to create HashConnect instance:', error);
  throw new Error('HashConnect initialization failed');
}

const appMetadata: HashConnectTypes.AppMetadata = {
  name: 'TrueTrace Nigeria',
  description: 'Product Verification DApp on Hedera',
  icon: 'https://your-app-url.com/icon.png',
  url: 'http://localhost:3000',
};

export const initHashConnect = async () => {
  try {
    console.log('Initializing HashConnect...');
    // Clear local storage to avoid stale data
    localStorage.removeItem('hashconnectData');

    // Initialize HashConnect
    const initData = await hashconnect.init(appMetadata, 'testnet', false); // multiAccount: false
    console.log('Init data:', JSON.stringify(initData, null, 2));

    // Use encryptionKey as privKey
    let privKey = initData.encryptionKey;
    if (!privKey) {
      console.error('No encryptionKey found in initData');
      throw new Error('Failed to retrieve encryptionKey from HashConnect initialization');
    }

    // Save encryptionKey to local storage
    hashconnect.hcData.encryptionKey = privKey;
    await hashconnect.saveDataInLocalstorage();
    console.log('Saved encryptionKey to local storage:', privKey);

    console.log('HashConnect initialized with topic:', initData.topic);
    return {
      topic: initData.topic,
      pairingString: initData.pairingString,
      privKey, // Map encryptionKey to privKey
      savedPairings: initData.savedPairings || [],
    };
  } catch (error) {
    console.error('HashConnect initialization failed:', error);
    throw new Error('Failed to initialize HashConnect');
  }
};

// Set up HashConnect events with safety checks
if (hashconnect.pairingEvent) {
  hashconnect.pairingEvent.on((pairingData) => {
    console.log('Pairing event details:', JSON.stringify(pairingData, null, 2));
    if (pairingData.accountIds && pairingData.accountIds.length > 0) {
      console.log('Successfully paired with accounts:', pairingData.accountIds);
      hashconnect.hcData.savedPairings = [pairingData];
      hashconnect.saveDataInLocalstorage();
      console.log('Saved pairing data to local storage:', pairingData);
    } else {
      console.warn('Pairing event received but no accountIds found');
    }
  });
} else {
  console.error('pairingEvent is undefined on hashconnect');
}

if (hashconnect.connectionStatusChangeEvent) {
  hashconnect.connectionStatusChangeEvent.on((status) => {
    console.log('Connection status:', status);
  });
} else {
  console.error('connectionStatusChangeEvent is undefined on hashconnect');
}

if (hashconnect.foundExtensionEvent) {
  hashconnect.foundExtensionEvent.on((metadata) => {
    console.log('Found wallet extension:', JSON.stringify(metadata, null, 2));
  });
} else {
  console.error('foundExtensionEvent is undefined on hashconnect');
}

if (hashconnect.messageErrorEvent) {
  hashconnect.messageErrorEvent.on((error, message) => {
    console.error('HashConnect message error:', JSON.stringify(error, null, 2));
    console.error('Failed message:', JSON.stringify(message, null, 2));
    console.error('Error details:', error.message, error.stack);
    console.error('Raw message data:', message?.data);
  });
} else {
  console.error('messageErrorEvent is undefined on hashconnect');
}

export default hashconnect;