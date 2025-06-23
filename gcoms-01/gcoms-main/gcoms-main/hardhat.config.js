// Import using dynamic import for ESM compatibility
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use require for Hardhat packages
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
const config = {
  solidity: {
    compilers: [
      {
        version: "0.8.9",
      },
      {
        version: "0.8.20",
      }
    ],
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    }
  }
};

export default config;
