// Dynamic configuration using environment variables
const config = {
  [import.meta.env.NETWORK_ID || '31337']: {
    nft: {
      address: import.meta.env.NFT_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3'
    }
  }
};

export default config;