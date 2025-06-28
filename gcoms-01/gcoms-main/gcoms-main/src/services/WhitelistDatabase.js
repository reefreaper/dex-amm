// Import dependencies that work in browser
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

// Create a browser-compatible version of the database
class WhitelistDatabase {
  constructor() {
    this.initBrowserStorage();
  }

  initBrowserStorage() {
    // No SQLite initialization needed - we'll use localStorage
    console.log('Using browser localStorage for whitelist storage');
    
    try {
      // Initialize whitelist storage if it doesn't exist or is invalid
      const storedAddresses = localStorage.getItem('whitelistedAddresses');
      if (!storedAddresses) {
        console.log('Initializing empty whitelist in localStorage');
        localStorage.setItem('whitelistedAddresses', JSON.stringify([]));
      } else {
        // Validate the stored data
        try {
          const parsed = JSON.parse(storedAddresses);
          if (!Array.isArray(parsed)) {
            console.warn('Invalid whitelist data format, reinitializing');
            localStorage.setItem('whitelistedAddresses', JSON.stringify([]));
          } else {
            console.log(`Found ${parsed.length} addresses in whitelist`);
          }
        } catch (e) {
          console.error('Error parsing whitelist data, reinitializing', e);
          localStorage.setItem('whitelistedAddresses', JSON.stringify([]));
        }
      }
      
      // Initialize whitelist requests if they don't exist
      if (!localStorage.getItem('whitelistRequests')) {
        localStorage.setItem('whitelistRequests', JSON.stringify([]));
      }
    } catch (error) {
      console.error('Error initializing localStorage:', error);
      // Create in-memory fallback if localStorage is not available
      this._memoryFallback = {
        whitelistedAddresses: [],
        whitelistRequests: []
      };
      console.warn('Using in-memory fallback for whitelist storage');
    }
  }

  getWhitelistedAddresses() {
    return new Promise((resolve) => {
      try {
        let addresses;
        
        // Try to get from localStorage
        const storedData = localStorage.getItem('whitelistedAddresses');
        console.log('Raw whitelist data from localStorage:', storedData);
        
        if (storedData) {
          addresses = JSON.parse(storedData);
          if (!Array.isArray(addresses)) {
            console.warn('Invalid whitelist data format, using empty array');
            addresses = [];
          }
        } else {
          console.warn('No whitelist data found in localStorage, using empty array');
          addresses = [];
        }
        
        // If using memory fallback, use that instead
        if (this._memoryFallback) {
          addresses = this._memoryFallback.whitelistedAddresses;
        }
        
        console.log("Retrieved addresses from storage:", addresses);
        
        // If connected to a wallet, automatically add the current account
        if (window.ethereum && window.ethereum.selectedAddress) {
          const currentAccount = window.ethereum.selectedAddress;
          if (currentAccount && !addresses.map(a => a.toLowerCase()).includes(currentAccount.toLowerCase())) {
            console.log(`Adding current account ${currentAccount} to whitelist`);
            this.addToWhitelist(currentAccount);
            addresses.push(currentAccount);
          }
        }
        
        resolve(addresses);
      } catch (error) {
        console.error('Error getting addresses from storage:', error);
        resolve([]);
      }
    });
  }

  addToWhitelist(address) {
    return new Promise((resolve) => {
      try {
        // Normalize address to lowercase for consistent comparison
        const normalizedAddress = address.toLowerCase();
        const addresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
        
        // Check if address already exists (case-insensitive)
        const normalizedAddresses = addresses.map(addr => addr.toLowerCase());
        if (!normalizedAddresses.includes(normalizedAddress)) {
          addresses.push(address); // Keep original case for storage
          localStorage.setItem('whitelistedAddresses', JSON.stringify(addresses));
          console.log(`Added ${address} to whitelist in localStorage`);
          resolve(true);
        } else {
          console.log(`Address ${address} already in whitelist`);
          resolve(false);
        }
      } catch (error) {
        console.error('Error adding to whitelist in localStorage:', error);
        resolve(false);
      }
    });
  }

  addMultipleToWhitelist(addressList) {
    return new Promise((resolve) => {
      try {
        const addresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
        const normalizedExistingAddresses = addresses.map(addr => addr.toLowerCase());
        let added = 0;
        
        for (const address of addressList) {
          const normalizedAddress = address.toLowerCase();
          if (!normalizedExistingAddresses.includes(normalizedAddress)) {
            addresses.push(address); // Keep original case
            normalizedExistingAddresses.push(normalizedAddress);
            added++;
          }
        }
        
        localStorage.setItem('whitelistedAddresses', JSON.stringify(addresses));
        console.log(`Added ${added} addresses to whitelist in localStorage`);
        resolve(true);
      } catch (error) {
        console.error('Error adding multiple addresses to whitelist in localStorage:', error);
        resolve(false);
      }
    });
  }

  removeFromWhitelist(address) {
    return new Promise((resolve) => {
      try {
        const normalizedAddressToRemove = address.toLowerCase();
        const addresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
        
        const filteredAddresses = addresses.filter(
          addr => addr.toLowerCase() !== normalizedAddressToRemove
        );
        
        if (filteredAddresses.length < addresses.length) {
          localStorage.setItem('whitelistedAddresses', JSON.stringify(filteredAddresses));
          console.log(`Removed ${address} from whitelist in localStorage`);
          resolve(true);
        } else {
          console.log(`Address ${address} not found in whitelist`);
          resolve(false);
        }
      } catch (error) {
        console.error('Error removing from whitelist in localStorage:', error);
        resolve(false);
      }
    });
  }

  isWhitelisted(address) {
    return new Promise((resolve) => {
      try {
        const normalizedAddress = address.toLowerCase();
        const addresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
        const normalizedAddresses = addresses.map(addr => addr.toLowerCase());
        resolve(normalizedAddresses.includes(normalizedAddress));
      } catch (error) {
        console.error('Error checking whitelist in localStorage:', error);
        resolve(false);
      }
    });
  }

  async generateMerkleRoot() {
    try {
      const addresses = await this.getWhitelistedAddresses();
      
      if (addresses.length === 0) {
        console.warn("No addresses in whitelist, returning null merkle root");
        return null;
      }
      
      console.log("Generating Merkle tree with addresses:", addresses);
      
      // Create leaf nodes
      const leaves = addresses.map(addr => 
        keccak256(Buffer.from(addr.slice(2), 'hex'))
      );
      
      // Create Merkle Tree
      const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      
      // Get root
      const root = merkleTree.getHexRoot();
      console.log("Generated Merkle root:", root);
      
      return {
        root,
        merkleTree,
        addresses
      };
    } catch (error) {
      console.error('Error generating Merkle root:', error);
      return null;
    }
  }

  async getMerkleProof(address) {
    try {
      const result = await this.generateMerkleRoot();
      
      if (!result || !result.merkleTree) {
        console.error("Failed to generate Merkle tree");
        return null;
      }
      
      const normalizedAddress = address.toLowerCase();
      const normalizedAddresses = result.addresses.map(addr => addr.toLowerCase());
      
      if (!normalizedAddresses.includes(normalizedAddress)) {
        console.warn(`Address ${address} not in whitelist, cannot generate proof`);
        return null;
      }
      
      const leaf = keccak256(Buffer.from(address.slice(2), 'hex'));
      const proof = result.merkleTree.getHexProof(leaf);
      console.log(`Generated Merkle proof for ${address}:`, proof);
      
      return proof;
    } catch (error) {
      console.error('Error generating Merkle proof:', error);
      return null;
    }
  }

  async exportDatabase() {
    try {
      const addresses = await this.getWhitelistedAddresses();
      return {
        addresses,
        exportDate: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error exporting database:', error);
      return null;
    }
  }

  async importAddresses(addressList) {
    try {
      if (!Array.isArray(addressList) || addressList.length === 0) {
        return false;
      }
      
      // Validate addresses
      const validAddresses = addressList.filter(addr => 
        typeof addr === 'string' && addr.match(/^0x[a-fA-F0-9]{40}$/)
      );
      
      if (validAddresses.length === 0) {
        return false;
      }
      
      // Add to localStorage
      await this.addMultipleToWhitelist(validAddresses);
      return true;
    } catch (error) {
      console.error('Error importing addresses:', error);
      return false;
    }
  }

  close() {
    // Nothing to close in browser environment
    console.log('Database connection closed (browser mode)');
  }

  getPendingRequests() {
    return new Promise((resolve) => {
      try {
        const requests = JSON.parse(localStorage.getItem('whitelistRequests') || '[]');
        console.log("Retrieved pending requests from localStorage:", requests);
        resolve(requests);
      } catch (error) {
        console.error('Error getting pending requests from localStorage:', error);
        resolve([]);
      }
    });
  }

  addWhitelistRequest(address, reason = '') {
    return new Promise((resolve) => {
      try {
        // Get current requests
        const requests = JSON.parse(localStorage.getItem('whitelistRequests') || '[]');
        
        // Check if address already has a pending request
        if (requests.some(req => req.address.toLowerCase() === address.toLowerCase())) {
          console.log("Address already has a pending request:", address);
          resolve(false);
          return;
        }
        
        // Add new request
        const newRequest = {
          id: Date.now().toString(),
          address: address,
          timestamp: new Date().toISOString(),
          reason: reason
        };
        
        requests.push(newRequest);
        localStorage.setItem('whitelistRequests', JSON.stringify(requests));
        console.log("Added whitelist request for:", address);
        resolve(true);
      } catch (error) {
        console.error('Error adding whitelist request to localStorage:', error);
        resolve(false);
      }
    });
  }

  removeWhitelistRequest(requestId) {
    return new Promise((resolve) => {
      try {
        // Get current requests
        const requests = JSON.parse(localStorage.getItem('whitelistRequests') || '[]');
        
        // Filter out the request to remove
        const updatedRequests = requests.filter(req => req.id !== requestId);
        
        if (updatedRequests.length === requests.length) {
          // Request not found
          resolve(false);
          return;
        }
        
        localStorage.setItem('whitelistRequests', JSON.stringify(updatedRequests));
        console.log("Removed whitelist request:", requestId);
        resolve(true);
      } catch (error) {
        console.error('Error removing whitelist request from localStorage:', error);
        resolve(false);
      }
    });
  }
}

export default new WhitelistDatabase();
