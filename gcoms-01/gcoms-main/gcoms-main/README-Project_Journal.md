
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Project Journal

### Current State (Updated: June 10, 2025)

1. **React + Vite Application**: The project is a React application using Vite as the build tool with HMR and ESLint configured.

2. **Blockchain Integration**: The app integrates with Ethereum using ethers.js, with functionality for:
   - NFT minting
   - Whitelist management using Merkle trees
   - Asset documentation and metadata creation

3. **Asset Documentation System**: There's a system for creating digital asset documentation with:
   - Metadata forms for asset details
   - Image generation for visual representation of assets
   - IPFS integration via Pinata for storing assets

4. **UI Components**: The app has a layout shell with navigation and various pages including contracts, facilities, calendar, etc.

5. **Unified Asset Workflow**: Initial implementation of a unified component that combines:
   - Step-based UI flow for asset creation
   - Metadata form handling
   - Image generation
   - IPFS uploading
   - NFT minting
   - Whitelist verification

### Current Core Functionality

1. **NFT Minting in Contracts.jsx**:
   - Users can mint NFTs for a fixed cost plus gas fee
   - Whitelist verification using Merkle proofs
   - Display of minted NFTs with selection capability
   - Print view for NFT documents

2. **Asset Creation Workflow**:
   - `AssetMetadataForm.jsx` - Form for entering asset details (basic info, ownership, value, visual styling)
   - `AssetImageGenerator.jsx` - Generates document images based on metadata
   - `CreateAsset.jsx` - Orchestrates the asset creation and minting process

3. **Whitelist Management**:
   - `WhitelistManager` component for adding addresses to whitelist
   - Merkle tree implementation for efficient verification
   - Owner-only whitelist functionality
   - UI improvements for whitelist status and account switching

4. **Unified Asset Workflow (In Progress)**:
   - `UnifiedAssetWorkflow.jsx` - Combines metadata creation, image generation, and minting
   - Implements step-based UI for guiding users through the process
   - Includes whitelist verification and management
   - Handles IPFS uploads for both images and metadata

### Development Log

#### [June 1, 2025] Initial Project Setup
- Created React + Vite application
- Set up ESLint and basic project structure
- Implemented basic UI components and navigation

#### [June 3, 2025] Blockchain Integration
- Added ethers.js for Ethereum interaction
- Implemented NFT contract integration
- Set up Merkle tree for whitelist verification

#### [June 5, 2025] Asset Documentation System
- Created metadata form components
- Implemented image generation based on metadata
- Added initial IPFS integration

#### [June 7, 2025] Fixed IPFS Integration
- Resolved Pinata API authentication issues
- Improved error handling in IPFS upload utilities
- Enhanced logging for better debugging of upload processes
- Updated environment variable handling for Vite compatibility

#### [June 8, 2025] Code Improvements and Analysis
- Modernized Axios implementation for multipart form data
- Added more robust error reporting
- Ensured proper environment variable access patterns
- Analyzed code duplication between `Contracts.jsx` and `CreateAsset.jsx`
- Identified `UnifiedAssetWorkflow.jsx` as the foundation for integration
- **Challenges:** Encountered issues with Pinata API authentication due to incorrect environment variable handling in Vite
- **Solution:** Updated the Axios request format and improved error logging to diagnose and fix the authentication issues

#### [June 10, 2025] Whitelist Functionality Improvements
- Enhanced error handling for contract function calls
- Improved whitelist verification process
- Added owner-only whitelist functionality
- Implemented account switching for better user experience
- Added detailed status feedback for whitelist operations
- **Challenges:** Encountered issues with the `whitelistOnly()` function in the contract
- **Solution:** Added robust error handling and fallback mechanisms

## Environment Setup

This project uses environment variables to manage sensitive information like API keys. To set up your environment:

1. Copy the `.env.example` file to a new file named `.env`
2. Fill in your own values for each environment variable
3. Never commit the `.env` file to version control

### Required Environment Variables:

- `VITE_PINATA_API_KEY`: Your Pinata API key for IPFS storage
- `VITE_PINATA_SECRET_API_KEY`: Your Pinata secret API key
- `NFT_CONTRACT_ADDRESS`: The address of your deployed NFT contract
- `NETWORK_ID`: The network ID where your contract is deployed (default: 31337 for local Hardhat network)

