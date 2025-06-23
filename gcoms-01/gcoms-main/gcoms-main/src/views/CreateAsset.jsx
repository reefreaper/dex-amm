import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';
import { useMint } from '../context/useMint';
import AssetMetadataForm from '../components/AssetMetadataForm';
import AssetImageGenerator from '../components/AssetImageGenerator';
import { uploadToPinata, uploadMetadataToPinata } from '../utils/ipfsUtils.js';
import NFT_ABI from '../abis/NFT.json';
import config from '../config.js';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { Buffer } from 'buffer';

// Make Buffer available globally for keccak256
window.Buffer = Buffer;

function CreateAsset() {
  const navigate = useNavigate();
  const { setLatestMint } = useMint(); // Add this line to get setLatestMint from context
  
  const [metadata, setMetadata] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mintStatus, setMintStatus] = useState({ status: '', message: '' });
  const [showPreview, setShowPreview] = useState(false);
  
  // Add whitelist state
  const [account, setAccount] = useState(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [whitelistOnly, setWhitelistOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [nftContract, setNftContract] = useState(null);
  const [isOwner, setIsOwner] = useState(false);
  const [operationLocks, setOperationLocks] = useState({
    whitelist: false,
    mint: false,
    general: false
  });

  // Helper function to set a specific lock
  const setLock = (lockName, value) => {
    setOperationLocks(prev => ({
      ...prev,
      [lockName]: value
    }));
  };

  // Check if any operation is in progress
  const isAnyOperationInProgress = () => {
    return Object.values(operationLocks).some(lock => lock);
  };

  // Add this function to help users switch accounts
  const switchToOwnerAccount = async () => {
    try {
      setMintStatus({ status: 'loading', message: 'Please switch to the owner account in your wallet...' });
      
      // This will prompt the user to switch accounts in their wallet
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }],
      });
      
      // After switching, refresh the page to update all states
      window.location.reload();
    } catch (error) {
      console.error("Error switching accounts:", error);
      setMintStatus({ 
        status: 'error', 
        message: 'Failed to switch accounts. Please manually switch to the owner account in your wallet.' 
      });
    }
  };

  // Add this function to help maintain whitelist consistency
  const ensureWhitelistConsistency = async (nftContract, account) => {
    // Check if whitelist operation is already in progress
    if (operationLocks.whitelist || !nftContract || !account) return;
    
    try {
      // Set the whitelist lock
      setLock('whitelist', true);
      
      // Use the passed contract and account
      if (!nftContract || !account) {
        setOperationLocks(prev => ({
          ...prev,
          whitelist: false
        }));
        return;
      }
      
      console.log("Running whitelist consistency check...");
      
      // Get stored whitelist from localStorage
      const storedAddresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
      
      // If owner is not in whitelist, add them
      if (!storedAddresses.includes(account)) {
        console.log("Owner not in whitelist, adding...");
        storedAddresses.push(account);
        localStorage.setItem('whitelistedAddresses', JSON.stringify(storedAddresses));
      }
      
      // Generate merkle root from stored addresses
      if (storedAddresses.length > 0) {
        const leaves = storedAddresses.map(addr => 
          keccak256(Buffer.from(addr.slice(2), 'hex'))
        );
        
        const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        const generatedRoot = merkleTree.getHexRoot();
        
        // Get current root from contract
        const contractRoot = await nftContract.merkleRoot();
        
        // If roots don't match, update contract
        if (contractRoot !== generatedRoot) {
          console.log("Merkle roots don't match, updating contract...");
          console.log("Contract root:", contractRoot);
          console.log("Generated root:", generatedRoot);
          
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          
          const transaction = await nftContract.connect(signer).setMerkleRoot(generatedRoot, {
            gasLimit: 100000
          });
          await transaction.wait();
          
          console.log("Contract merkle root updated successfully");
        } else {
          console.log("Merkle roots match, no update needed");
        }
      }
    } catch (error) {
      console.error("Error in whitelist consistency check:", error);
    } finally {
      // Always release the lock
      setLock('whitelist', false);
    }
  };

  // Check whitelist status on component mount
  useEffect(() => {
    let isMounted = true; // Track if component is mounted
    
    const checkWhitelistStatus = async () => {
      // Check if whitelist operation is already in progress
      if (operationLocks.whitelist) return;
      
      try {
        // Set the whitelist lock
        if (isMounted) setLock('whitelist', true);
        
        // Get provider and account
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const userAccount = await signer.getAddress();
        
        if (!isMounted) return; // Check if component is still mounted
        setAccount(userAccount);

        // Get NFT contract instance
        const nft = new ethers.Contract(config[31337].nft.address, NFT_ABI, provider);
        if (!isMounted) return;
        setNftContract(nft);

        // Check if user is owner
        try {
          const owner = await nft.owner();
          const ownerStatus = owner.toLowerCase() === userAccount.toLowerCase();
          
          if (!isMounted) return;
          setIsOwner(ownerStatus);
          console.log("User is owner:", ownerStatus);
          
          // If user is owner, they're automatically whitelisted
          if (ownerStatus) {
            setIsWhitelisted(true);
            setIsLoading(false);
            
            // Run consistency check if owner - but don't await it
            // This prevents blocking the UI while consistency check runs
            if (isMounted) {
              setTimeout(() => {
                ensureWhitelistConsistency(nft, userAccount);
              }, 1000);
            }
            
            setOperationLocks(prev => ({
              ...prev,
              whitelist: false
            }));
            return;
          }
        } catch (ownerError) {
          console.error("Error checking owner status:", ownerError);
          if (!isMounted) return;
          setIsOwner(false);
        }

        // Check if whitelist is required
        let whitelistRequired = true;
        try {
          whitelistRequired = await nft.whitelistOnly();
          if (!isMounted) return;
          setWhitelistOnly(whitelistRequired);
        } catch (whitelistError) {
          console.log("Contract might not have whitelistOnly function, using default:", whitelistError);
        }
        
        if (!whitelistRequired) {
          // If whitelist is not required, everyone is "whitelisted"
          if (!isMounted) return;
          setIsWhitelisted(true);
          setIsLoading(false);
          setOperationLocks(prev => ({
            ...prev,
            whitelist: false
          }));
          return;
        }
        
        // Get stored whitelist from localStorage
        const storedAddresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
        
        if (storedAddresses.includes(userAccount)) {
          // Generate merkle proof
          const leaves = storedAddresses.map(addr => 
            keccak256(Buffer.from(addr.slice(2), 'hex'))
          );
          
          const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
          const leaf = keccak256(Buffer.from(userAccount.slice(2), 'hex'));
          const proof = merkleTree.getHexProof(leaf);
          
          // Verify whitelist status
          try {
            const whitelistStatus = await nft.isWhitelisted(userAccount, proof);
            if (!isMounted) return;
            setIsWhitelisted(whitelistStatus);
          } catch (error) {
            console.error("Error checking whitelist status with proof:", error);
            if (!isMounted) return;
            setIsWhitelisted(false);
          }
        } else {
          if (!isMounted) return;
          setIsWhitelisted(false);
        }
        
        if (!isMounted) return;
        setIsLoading(false);
        setOperationLocks(prev => ({
          ...prev,
          whitelist: false
        }));
      } catch (error) {
        console.error("Error checking whitelist status:", error);
        if (!isMounted) return;
        setIsWhitelisted(false);
        setIsOwner(false);
        setIsLoading(false);
        setOperationLocks(prev => ({
          ...prev,
          whitelist: false
        }));
      }
    };

    checkWhitelistStatus();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMetadataSubmit = async (formData) => {
    setIsSubmitting(true);
    setMetadata(formData);
    setIsSubmitting(false);
    setShowPreview(true); // Show preview after metadata is submitted
  };

  const handleImageGenerated = (imageDataUrl) => {
    setGeneratedImage(imageDataUrl);
  };

  const handleDownloadImage = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `asset-${metadata.basic.assetId || 'document'}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Modified requestWhitelist function to prevent racing conditions
  const requestWhitelist = async () => {
    // Check if whitelist operation is already in progress
    if (operationLocks.whitelist || !nftContract || !account) {
      setMintStatus({ 
        status: 'error', 
        message: operationLocks.whitelist ? 'Operation already in progress' : 'Contract or account not available' 
      });
      return;
    }
    
    try {
      // Set the whitelist lock
      setLock('whitelist', true);
      setMintStatus({ status: 'loading', message: 'Checking ownership status...' });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Check if user is owner
      const owner = await nftContract.owner();
      const isOwner = owner.toLowerCase() === account.toLowerCase();
      
      if (!isOwner) {
        setMintStatus({ 
          status: 'error', 
          message: 'Only the contract owner can whitelist themselves. Please use the contract owner account.' 
        });
        setOperationLocks(prev => ({
          ...prev,
          whitelist: false
        }));
        return;
      }
      
      // Owner is whitelisting themselves
      setMintStatus({ status: 'loading', message: 'Adding yourself to whitelist...' });
      
      // Create a new merkle tree with just the owner's address
      const leaf = keccak256(Buffer.from(account.slice(2), 'hex'));
      const leaves = [leaf];
      const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const root = merkleTree.getHexRoot();
      
      console.log("Generated merkle root:", root);
      console.log("For owner address:", account);
      
      // Set the new merkle root
      const transaction = await nftContract.connect(signer).setMerkleRoot(root, {
        gasLimit: 100000
      });
      await transaction.wait();
      
      // Store the whitelist in localStorage
      localStorage.setItem('whitelistedAddresses', JSON.stringify([account]));
      console.log("Stored whitelisted addresses in localStorage:", [account]);
      
      setMintStatus({ 
        status: 'success', 
        message: 'Successfully added yourself to whitelist! You can now create and mint assets.' 
      });
      
      setIsWhitelisted(true);
      
      // Try to disable whitelist requirement for others
      try {
        const disableWhitelistTx = await nftContract.connect(signer).setWhitelistOnly(false, {
          gasLimit: 100000
        });
        await disableWhitelistTx.wait();
        
        setWhitelistOnly(false);
        setMintStatus({ 
          status: 'success', 
          message: 'Successfully added yourself to whitelist and disabled whitelist requirement for others!' 
        });
      } catch (whitelistError) {
        console.log("Could not disable whitelist requirement:", whitelistError);
        // Continue with just the owner being whitelisted
      }
    } catch (error) {
      console.error("Error in whitelist request:", error);
      setMintStatus({ 
        status: 'error', 
        message: `Whitelist request failed: ${error.message}` 
      });
    } finally {
      // Always release the lock
      setLock('whitelist', false);
    }
  };

  const createAndMintAsset = async () => {
    if (!metadata) {
      setMintStatus({ 
        status: 'error', 
        message: 'Please complete the asset metadata form first' 
      });
      return;
    }

    setMintStatus({ status: 'loading', message: 'Generating asset document...' });
    
    // Wait for image generation if not already done
    if (!generatedImage) {
      setMintStatus({ 
        status: 'error', 
        message: 'Image generation in progress. Please wait...' 
      });
      return;
    }

    // Proceed with minting
    await mintAssetNFT();
  };

  // Modified mintAssetNFT function to prevent racing conditions
  const mintAssetNFT = async () => {
    // Check if mint operation is already in progress
    if (operationLocks.mint || !generatedImage || !metadata) {
      setMintStatus({ 
        status: 'error', 
        message: operationLocks.mint ? 'Minting already in progress' : 'No image or metadata available to mint' 
      });
      return;
    }

    try {
      // Set the mint lock
      setLock('mint', true);
      setMintStatus({ status: 'loading', message: 'Preparing to mint NFT...' });

      // Get provider and signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const account = await signer.getAddress();

      // Get NFT contract instance
      const nft = new ethers.Contract(config[31337].nft.address, NFT_ABI, signer);

      // 1. Upload image to Pinata
      setMintStatus({ status: 'loading', message: 'Uploading image to Pinata...' });
      
      // Convert data URL to Blob
      const imageBlob = await (await fetch(generatedImage)).blob();
      const assetName = metadata.basic.title || 'Asset Document';
      const assetId = metadata.basic.assetId || Date.now().toString();
      
      const { ipfsHash: imageIpfsHash } = await uploadToPinata(
        imageBlob, 
        `asset-${assetId}.png`
      );
      
      const imageIpfsUrl = `ipfs://${imageIpfsHash}`;
      
      // 2. Create and upload metadata JSON
      setMintStatus({ status: 'loading', message: 'Creating metadata...' });
      
      const metadataJSON = {
        name: assetName,
        description: metadata.basic.description || 'Asset document created on GCOMS',
        image: imageIpfsUrl,
        attributes: [
          { trait_type: 'Asset Type', value: metadata.basic.assetType },
          { trait_type: 'Asset ID', value: assetId },
          { trait_type: 'Owner', value: metadata.ownership.ownerName },
          { trait_type: 'Value', value: `${metadata.value.estimatedValue} ${metadata.value.currency}` },
          { trait_type: 'Valuation Date', value: metadata.value.valuationDate },
          { trait_type: 'Ownership Percentage', value: metadata.ownership.ownershipPercentage }
        ]
      };
      
      const { ipfsHash: metadataIpfsHash } = await uploadMetadataToPinata(
        metadataJSON, 
        `metadata-${assetId}.json`
      );
      
      // 3. Mint NFT with metadata reference
      setMintStatus({ status: 'loading', message: 'Minting NFT...' });
      
      // Check if whitelist is required
      const whitelistRequired = await nft.whitelistOnly();
      let merkleProof = [];
      
      if (whitelistRequired) {
        // Get stored whitelist from localStorage
        const storedAddresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
        
        if (storedAddresses.includes(account)) {
          // Generate merkle proof
          const leaves = storedAddresses.map(addr => 
            keccak256(Buffer.from(addr.slice(2), 'hex'))
          );
          
          // Create Merkle Tree
          const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
          
          // Create leaf for the address
          const leaf = keccak256(Buffer.from(account.slice(2), 'hex'));
          
          // Generate proof
          merkleProof = merkleTree.getHexProof(leaf);
        } else {
          throw new Error('Your address is not whitelisted. Please request whitelist access first.');
        }
      }
      
      // Call mint function with merkle proof
      const cost = await nft.cost();
      const mintTx = await nft.mint(1, merkleProof, {
        value: cost,
        gasLimit: 500000
      });
      
      setMintStatus({ status: 'loading', message: 'Transaction submitted. Waiting for confirmation...' });
      
      await mintTx.wait();
      
      // Set the token URI for this specific token
      const tokenId = await nft.totalSupply(); // Get the latest token ID
      const metadataIpfsUrl = `ipfs://${metadataIpfsHash}`;
      
      const setTokenURITx = await nft.connect(signer).setTokenURI(tokenId, metadataIpfsUrl, {
        gasLimit: 200000
      });
      await setTokenURITx.wait();
      console.log(`Token URI set for token ${tokenId}: ${metadataIpfsUrl}`);
      
      // Store the mint data in context
      const mintData = {
        tokenId: tokenId,
        imageIpfsHash,
        metadataIpfsHash,
        metadata: metadataJSON,
        timestamp: Date.now()
      };
      
      setLatestMint(mintData);
      
      setMintStatus({ 
        status: 'success', 
        message: 'NFT minted successfully! Your asset is now on the blockchain.' 
      });
      
      // Redirect to Contracts page after a short delay
      setTimeout(() => {
        navigate(`/contracts?newMint=true&ipfsHash=${metadataIpfsHash}`);
      }, 3000); // 3 second delay to let user see success message
      
    } catch (error) {
      console.error("Error minting NFT:", error);
      setMintStatus({ 
        status: 'error', 
        message: `Failed to mint NFT: ${error.message || 'Unknown error'}` 
      });
    } finally {
      // Always release the lock
      setLock('mint', false);
    }
  };

  // Add this debug function
  const debugWhitelist = async () => {
    try {
      setMintStatus({ status: 'loading', message: 'Checking whitelist status...' });
      
      // Get provider and account
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const userAccount = await signer.getAddress();
      
      // Get NFT contract instance
      const nft = new ethers.Contract(config[31337].nft.address, NFT_ABI, provider);
      
      // Check if user is owner
      const owner = await nft.owner();
      const ownerStatus = owner.toLowerCase() === userAccount.toLowerCase();
      
      // Check if whitelist is required
      let whitelistRequired = true;
      try {
        whitelistRequired = await nft.whitelistOnly();
      } catch (whitelistError) {
        console.log("Contract might not have whitelistOnly function");
      }
      
      // Get merkle root from contract
      let merkleRoot = "Unknown";
      try {
        merkleRoot = await nft.merkleRoot();
      } catch (error) {
        console.error("Error getting merkle root:", error);
      }
      
      // Get stored whitelist from localStorage
      const storedAddresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
      
      // Generate merkle tree from stored addresses
      let generatedRoot = "None";
      let isInWhitelist = false;
      let proofValid = false;
      
      if (storedAddresses.length > 0) {
        const leaves = storedAddresses.map(addr => 
          keccak256(Buffer.from(addr.slice(2), 'hex'))
        );
        
        const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
        generatedRoot = merkleTree.getHexRoot();
        
        isInWhitelist = storedAddresses.includes(userAccount);
        
        if (isInWhitelist) {
          const leaf = keccak256(Buffer.from(userAccount.slice(2), 'hex'));
          const proof = merkleTree.getHexProof(leaf);
          
          try {
            proofValid = await nft.isWhitelisted(userAccount, proof);
          } catch (error) {
            console.error("Error checking proof validity:", error);
          }
        }
      }
      
      const debugInfo = `
        Account: ${userAccount}
        Is Owner: ${ownerStatus}
        Whitelist Required: ${whitelistRequired}
        Contract Merkle Root: ${merkleRoot}
        Generated Merkle Root: ${generatedRoot}
        Stored Addresses: ${storedAddresses.length}
        Address in Whitelist: ${isInWhitelist}
        Proof Valid: ${proofValid}
      `;
      
      console.log("Whitelist Debug Info:", debugInfo);
      
      setMintStatus({ 
        status: 'info', 
        message: `Debug info logged to console. Root match: ${merkleRoot === generatedRoot}, Proof valid: ${proofValid}` 
      });
      
    } catch (error) {
      console.error("Error in debug function:", error);
      setMintStatus({ 
        status: 'error', 
        message: `Debug failed: ${error.message}` 
      });
    }
  };

  // Add these utility functions
  const backupWhitelist = () => {
    try {
      const storedAddresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]');
      if (storedAddresses.length === 0) {
        setMintStatus({ 
          status: 'warning', 
          message: 'No whitelist data to backup' 
        });
        return;
      }
      
      const backup = {
        timestamp: new Date().toISOString(),
        addresses: storedAddresses
      };
      
      const backupStr = JSON.stringify(backup);
      const backupKey = `whitelist_backup_${Date.now()}`;
      
      localStorage.setItem(backupKey, backupStr);
      
      setMintStatus({ 
        status: 'success', 
        message: `Whitelist backed up successfully (${storedAddresses.length} addresses)` 
      });
      
      console.log("Whitelist backup created:", backupKey);
    } catch (error) {
      console.error("Error backing up whitelist:", error);
      setMintStatus({ 
        status: 'error', 
        message: `Failed to backup whitelist: ${error.message}` 
      });
    }
  };

  const restoreWhitelist = () => {
    try {
      // Find the most recent backup
      let mostRecentBackup = null;
      let mostRecentTimestamp = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('whitelist_backup_')) {
          try {
            const backupData = JSON.parse(localStorage.getItem(key));
            const timestamp = new Date(backupData.timestamp).getTime();
            
            if (timestamp > mostRecentTimestamp) {
              mostRecentTimestamp = timestamp;
              mostRecentBackup = backupData;
            }
          } catch (e) {
            console.error("Error parsing backup:", e);
          }
        }
      }
      
      if (!mostRecentBackup) {
        setMintStatus({ 
          status: 'warning', 
          message: 'No whitelist backups found' 
        });
        return;
      }
      
      // Restore the whitelist
      localStorage.setItem('whitelistedAddresses', JSON.stringify(mostRecentBackup.addresses));
      
      setMintStatus({ 
        status: 'success', 
        message: `Whitelist restored from backup (${mostRecentBackup.addresses.length} addresses)` 
      });
      
      console.log("Whitelist restored from backup:", mostRecentBackup);
      
      // Refresh the page to update all states
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error restoring whitelist:", error);
      setMintStatus({ 
        status: 'error', 
        message: `Failed to restore whitelist: ${error.message}` 
      });
    }
  };

  const toggleWhitelistRequirement = async () => {
    // Check if whitelist operation is already in progress
    if (operationLocks.whitelist || !nftContract || !account) {
      setMintStatus({ 
        status: 'error', 
        message: operationLocks.whitelist ? 'Operation already in progress' : 'Contract or account not available' 
      });
      return;
    }
    
    try {
      // Set the whitelist lock
      setLock('whitelist', true);
      setMintStatus({ status: 'loading', message: 'Updating whitelist requirement...' });
      
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      
      // Verify owner status
      const owner = await nftContract.owner();
      const isOwnerAccount = owner.toLowerCase() === account.toLowerCase();
      
      if (!isOwnerAccount) {
        setMintStatus({ 
          status: 'error', 
          message: 'Only the contract owner can toggle whitelist requirement' 
        });
        setOperationLocks(prev => ({
          ...prev,
          whitelist: false
        }));
        return;
      }
      
      // Get current whitelist requirement
      const currentRequirement = await nftContract.whitelistOnly();
      
      // Toggle it
      const transaction = await nftContract.connect(signer).setWhitelistOnly(!currentRequirement, {
        gasLimit: 100000
      });
      await transaction.wait();
      
      setWhitelistOnly(!currentRequirement);
      setMintStatus({ 
        status: 'success', 
        message: `Successfully ${!currentRequirement ? 'enabled' : 'disabled'} whitelist requirement!` 
      });
    } catch (error) {
      console.error("Error toggling whitelist requirement:", error);
      setMintStatus({ 
        status: 'error', 
        message: `Failed to toggle whitelist requirement: ${error.message}` 
      });
    } finally {
      // Always release the lock
      setLock('whitelist', false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6">Create New Asset</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <p>Account:  {account}</p>
      <h2 className="text-2xl font-bold mb-6 mt-1.5">Create New Asset</h2>
      
      <div className="mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isOwner ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
          }`}>
            {isOwner ? 'Contract Owner' : 'Regular User'}
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isWhitelisted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isWhitelisted ? 'Whitelisted' : 'Not Whitelisted'}
          </div>
          
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            whitelistOnly ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
          }`}>
            Whitelist: {whitelistOnly ? 'Required' : 'Not Required'}
          </div>
          
          {isOwner && (
            <button
              onClick={debugWhitelist}
              className="ml-auto px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-full focus:outline-none"
            >
              Debug Status
            </button>
          )}
        </div>
      </div>

      {!isWhitelisted && (
        <div className="mt-6 p-4 border border-yellow-200 rounded-lg bg-yellow-50">
          <h3 className="text-lg font-medium mb-2">Whitelist Status</h3>
          
          {isOwner ? (
            <>
              <p className="text-sm text-gray-700 mb-3">
                <strong>Current status:</strong> You are the contract owner but haven't set up your whitelist yet.
              </p>
              <button
                onClick={requestWhitelist}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none disabled:opacity-50"
                disabled={operationLocks.whitelist}
              >
                {operationLocks.whitelist ? 'Processing...' : 'Setup Owner Whitelist'}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700 mb-3">
                <strong>Current status:</strong> Your address is not whitelisted. Only the contract owner can mint assets.
              </p>
              <p className="text-sm text-gray-600 mb-3">
                To mint assets, you need to use the contract owner account.
              </p>
              <button
                onClick={() => window.ethereum.request({
                  method: 'wallet_requestPermissions',
                  params: [{ eth_accounts: {} }]
                })}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
              >
                Switch Account
              </button>
            </>
          )}
          
          {mintStatus.message && (
            <div className={`mt-4 p-3 rounded ${
              mintStatus.status === 'success' ? 'bg-green-100 text-green-800' :
              mintStatus.status === 'error' ? 'bg-red-100 text-red-800' :
              mintStatus.status === 'loading' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {mintStatus.message}
            </div>
          )}
        </div>
      )}
      {!showPreview ? (
        <AssetMetadataForm 
          onMetadataSubmit={handleMetadataSubmit}
          isSubmitting={isSubmitting}
        />
      ) : (
        <>
          <div className="mb-4 flex justify-between items-center">
            <h3 className="text-lg font-medium">Asset Preview</h3>
            <button
              onClick={() => setShowPreview(false)}
              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Back to Form
            </button>
          </div>
          
          <AssetImageGenerator 
            metadata={metadata}
            onImageGenerated={handleImageGenerated}
          />
          
          {generatedImage && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Generated Asset Document</h3>
              <img 
                src={generatedImage} 
                alt="Generated Asset Document" 
                className="border rounded shadow-sm max-w-full h-auto"
              />
              <div className="mt-4 flex flex-wrap gap-4">
                <button
                  onClick={handleDownloadImage}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Download Document
                </button>
                <button
                  onClick={mintAssetNFT}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  disabled={mintStatus.status === 'loading'}
                >
                  {mintStatus.status === 'loading' ? 'Processing...' : 'Mint as NFT'}
                </button>
                <button
                  onClick={createAndMintAsset}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                  disabled={mintStatus.status === 'loading'}
                >
                  {mintStatus.status === 'loading' ? 'Processing...' : 'Create and Mint'}
                </button>
              </div>
              
              {mintStatus.message && (
                <div className={`mt-4 p-3 rounded ${
                  mintStatus.status === 'success' ? 'bg-green-100 text-green-800' :
                  mintStatus.status === 'error' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {mintStatus.message}
                </div>
              )}
            </div>
          )}
        </>
      )}
      {whitelistOnly && isOwner && (
        <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <h3 className="text-lg font-medium mb-2">Whitelist Management (Owner Only)</h3>
          <p className="text-sm text-gray-600 mb-3">
            As the contract owner, you have access to whitelist management tools.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={debugWhitelist}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none"
            >
              Debug Whitelist
            </button>
            <button
              onClick={backupWhitelist}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none"
            >
              Backup Whitelist
            </button>
            <button
              onClick={restoreWhitelist}
              className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 focus:outline-none"
            >
              Restore Whitelist
            </button>
            <button
              onClick={() => toggleWhitelistRequirement()}
              className={`px-4 py-2 ${whitelistOnly ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white rounded focus:outline-none`}
              disabled={operationLocks.whitelist}
            >
              {operationLocks.whitelist ? 'Processing...' : whitelistOnly ? 'Disable Whitelist' : 'Enable Whitelist'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateAsset;
