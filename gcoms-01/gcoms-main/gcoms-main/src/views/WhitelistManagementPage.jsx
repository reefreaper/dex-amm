import React, { useState } from 'react';
import { ethers } from 'ethers';
import WhitelistManager from '../components/WhitelistManager';
import NFT_ABI from '../abis/NFT.json';
import config from '../config';

const WhitelistManagementPage = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState(null);
  const [nft, setNft] = useState(null);
  const [account, setAccount] = useState('');
  
  // Connect to wallet and contract
  const connectWallet = async () => {
    try {
      setIsLoading(true);
      
      // Connect to provider
      const ethProvider = new ethers.providers.Web3Provider(window.ethereum);
      await ethProvider.send("eth_requestAccounts", []);
      setProvider(ethProvider);
      
      // Get signer and account
      const signer = ethProvider.getSigner();
      const userAccount = await signer.getAddress();
      setAccount(userAccount);
      
      // Get NFT contract
      const nftContract = new ethers.Contract(
        config[31337].nft.address, 
        NFT_ABI, 
        signer
      );
      setNft(nftContract);
      
      setIsLoading(false);
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setIsLoading(false);
    }
  };
  
  return (
    <>
      <p>{account}</p>
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Whitelist Management</h1>
      {!account ? (
        <div className="text-center py-10">
          <p className="mb-4 text-gray-600">Connect your wallet to manage the whitelist</p>
          <button
            onClick={connectWallet}
            disabled={isLoading}
            className="bg-gray-500 hover:bg-dark-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
          >
            {isLoading ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      ) : (
        <WhitelistManager 
          provider={provider}
          nft={nft}
          account={account}
          setIsLoading={setIsLoading}
        />
      )}
    </div>
    </>
  );
};

export default WhitelistManagementPage;