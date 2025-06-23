import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import AssetMetadataForm from './AssetMetadataForm';
import AssetImageGenerator from './AssetImageGenerator';
import { uploadToPinata, uploadMetadataToPinata } from '../utils/ipfsUtils.js';
import NFT_ABI from '../abis/NFT.json';
import config from '../config.js';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import { Buffer } from 'buffer';
import WhitelistDatabase from '../services/WhitelistDatabase';

// Make Buffer available globally for keccak256
window.Buffer = Buffer;

const UnifiedAssetWorkflow = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [metadata, setMetadata] = useState(null);
  const [generatedImage, setGeneratedImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mintStatus, setMintStatus] = useState({ status: '', message: '' });
  
  // Add whitelist state
  const [account, setAccount] = useState(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [whitelistOnly, setWhitelistOnly] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [nftContract, setNftContract] = useState(null);

  // Check whitelist status on component mount
  useEffect(() => {
    const checkWhitelistStatus = async () => {
      try {
        // Get provider and account
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const userAccount = await signer.getAddress();
        setAccount(userAccount);

        // Get NFT contract instance
        const nft = new ethers.Contract(config[31337].nft.address, NFT_ABI, provider);
        setNftContract(nft);

        // Check if whitelist is required
        const whitelistRequired = await nft.whitelistOnly();
        setWhitelistOnly(whitelistRequired);
        
        if (whitelistRequired) {
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
            const whitelistStatus = await nft.isWhitelisted(userAccount, proof);
            setIsWhitelisted(whitelistStatus);
          } else {
            // Check if user is owner (owners are always allowed)
            try {
              const owner = await nft.owner();
              if (owner.toLowerCase() === userAccount.toLowerCase()) {
                setIsWhitelisted(true);
              } else {
                setIsWhitelisted(false);
              }
            } catch (error) {
              console.error("Error checking owner:", error);
              setIsWhitelisted(false);
            }
          }
        } else {
          // If whitelist is not required, consider everyone "whitelisted"
          setIsWhitelisted(true);
        }
      } catch (error) {
        console.error("Error checking whitelist status:", error);
        setIsWhitelisted(false);
      }
      
      setIsLoading(false);
    };

    checkWhitelistStatus();
  }, []);

  const handleMetadataSubmit = async (formData) => {
    setIsSubmitting(true);
    setMetadata(formData);
    setIsSubmitting(false);
    setCurrentStep(2); // Move to preview step
  };

  const handleImageGenerated = (imageDataUrl) => {
    setGeneratedImage(imageDataUrl);
  };

  const requestWhitelistAccess = async () => {
    if (!account) return;
    
    setMintStatus({ status: 'loading', message: 'Submitting whitelist request...' });
    
    try {
      // Get reason from user (optional)
      const reason = prompt('Please provide a reason for your whitelist request (optional):');
      
      // Submit request to database
      const result = await WhitelistDatabase.addWhitelistRequest(account, reason);
      
      if (result) {
        setMintStatus({ 
          status: 'success', 
          message: 'Your whitelist request has been submitted. Please wait for approval.' 
        });
      } else {
        setMintStatus({ 
          status: 'warning', 
          message: 'You already have a pending whitelist request.' 
        });
      }
    } catch (error) {
      console.error("Error requesting whitelist access:", error);
      setMintStatus({ 
        status: 'error', 
        message: `Failed to submit whitelist request: ${error.message}` 
      });
    }
  };

  const handleMint = async () => {
    setCurrentStep(3); // Move to minting step
    await mintAssetNFT();
  };

  const mintAssetNFT = async () => {
    if (!generatedImage || !metadata) {
      setMintStatus({ 
        status: 'error', 
        message: 'No image or metadata available to mint' 
      });
      return;
    }

    setMintStatus({ status: 'loading', message: 'Preparing to mint NFT...' });

    try {
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
      
      setMintStatus({ 
        status: 'success', 
        message: 'NFT minted successfully! Your asset is now on the blockchain.' 
      });
      
    } catch (error) {
      console.error("Error minting NFT:", error);
      setMintStatus({ 
        status: 'error', 
        message: `Failed to mint NFT: ${error.message || 'Unknown error'}` 
      });
    }
  };

  const renderStepIndicator = () => {
    return (
      <div className="flex items-center justify-center mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div 
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                currentStep === step 
                  ? 'bg-blue-500 text-white' 
                  : currentStep > step 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-200 text-gray-700'
              }`}
            >
              {currentStep > step ? '✓' : step}
            </div>
            {step < 3 && (
              <div 
                className={`h-1 w-16 ${
                  currentStep > step ? 'bg-green-500' : 'bg-gray-200'
                }`}
              ></div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Add this new function for the enhanced preview display
  const renderEnhancedPreview = () => {
    if (!metadata || !generatedImage) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Preview Header */}
        <div className="bg-gray-50 px-6 py-4 border-b">
          <h3 className="text-xl font-semibold text-gray-800">Asset Preview</h3>
          <p className="text-sm text-gray-500">Review your asset details before minting</p>
        </div>
        
        {/* Preview Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Image Preview */}
            <div className="flex flex-col">
              <h4 className="text-lg font-medium mb-3 text-gray-700">Document Preview</h4>
              <div className="border rounded-lg overflow-hidden shadow-sm bg-white">
                <img 
                  src={generatedImage} 
                  alt="Generated Asset Document" 
                  className="w-full h-auto"
                />
              </div>
              <div className="mt-3 text-sm text-gray-500">
                This image will be stored on IPFS and linked to your NFT
              </div>
            </div>
            
            {/* Metadata Preview */}
            <div className="flex flex-col">
              <h4 className="text-lg font-medium mb-3 text-gray-700">Asset Details</h4>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="space-y-3">
                  <div>
                    <h5 className="text-sm font-semibold text-gray-600">Basic Information</h5>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="text-sm text-gray-500">Title:</div>
                      <div className="text-sm font-medium">{metadata.basic.title}</div>
                      
                      <div className="text-sm text-gray-500">Asset Type:</div>
                      <div className="text-sm font-medium">{metadata.basic.assetType}</div>
                      
                      <div className="text-sm text-gray-500">Asset ID:</div>
                      <div className="text-sm font-medium">{metadata.basic.assetId || 'Auto-generated'}</div>
                      
                      <div className="text-sm text-gray-500">Description:</div>
                      <div className="text-sm font-medium">{metadata.basic.description || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <h5 className="text-sm font-semibold text-gray-600">Ownership Details</h5>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="text-sm text-gray-500">Owner:</div>
                      <div className="text-sm font-medium">{metadata.ownership.ownerName}</div>
                      
                      <div className="text-sm text-gray-500">Ownership %:</div>
                      <div className="text-sm font-medium">{metadata.ownership.ownershipPercentage}%</div>
                      
                      <div className="text-sm text-gray-500">Acquisition Date:</div>
                      <div className="text-sm font-medium">{metadata.ownership.acquisitionDate || 'N/A'}</div>
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t">
                    <h5 className="text-sm font-semibold text-gray-600">Valuation</h5>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <div className="text-sm text-gray-500">Estimated Value:</div>
                      <div className="text-sm font-medium">
                        {metadata.value.estimatedValue} {metadata.value.currency}
                      </div>
                      
                      <div className="text-sm text-gray-500">Valuation Date:</div>
                      <div className="text-sm font-medium">{metadata.value.valuationDate}</div>
                      
                      <div className="text-sm text-gray-500">Method:</div>
                      <div className="text-sm font-medium">{metadata.value.valuationMethod}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* IPFS & Blockchain Preview */}
          <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
            <h4 className="text-md font-medium mb-2 text-blue-700">Blockchain Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm font-semibold text-blue-600">NFT Details</div>
                <div className="text-sm mt-1">
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">Network:</span>
                    <span className="font-medium">Ethereum (Hardhat Local)</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-500 mr-2">Contract:</span>
                    <span className="font-medium truncate">{config[31337].nft.address}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-500 mr-2">Minting Cost:</span>
                    <span className="font-medium">
                      {nftContract ? ethers.utils.formatEther(cost || '0') : '0'} ETH + gas
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-blue-600">Storage Details</div>
                <div className="text-sm mt-1">
                  <div className="flex items-center">
                    <span className="text-gray-500 mr-2">Storage:</span>
                    <span className="font-medium">IPFS via Pinata</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-500 mr-2">Content:</span>
                    <span className="font-medium">Image + Metadata JSON</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-gray-500 mr-2">Permanence:</span>
                    <span className="font-medium">Decentralized & Permanent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="bg-gray-50 px-6 py-4 border-t flex justify-between">
          <button
            onClick={() => setCurrentStep(1)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to Edit
          </button>
          <button
            onClick={handleMint}
            disabled={isSubmitting}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Processing...' : 'Proceed to Mint'}
          </button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Create and Mint Asset</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
