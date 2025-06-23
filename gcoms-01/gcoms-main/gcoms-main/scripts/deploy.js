// For ESM projects, we need to import ethers directly
import { ethers } from 'ethers';
import process from 'process';
import hre from 'hardhat';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

async function main() {
  const NAME = 'GeoCities'
  const SYMBOL = 'GC'
  const COST = ethers.utils.parseUnits('10', 'ether')
  const MAX_SUPPLY = 1000
  const NFT_MINT_DATE = (Date.now() + 60000).toString().slice(0, 10)
  const IPFS_METADATA_URI = ''
  
  // Create a Merkle tree with a placeholder address for initial deployment
  // You can update this later with actual whitelist addresses
  const leaves = [keccak256("0x0000000000000000000000000000000000000000")]
  const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })
  const MERKLE_ROOT = merkleTree.getHexRoot()

  console.log("Deploying NFT contract...")
  console.log(`Name: ${NAME}`)
  console.log(`Symbol: ${SYMBOL}`)
  console.log(`Cost: ${ethers.utils.formatEther(COST)} ETH`)
  console.log(`Max Supply: ${MAX_SUPPLY}`)
  console.log(`Mint Date: ${new Date(parseInt(NFT_MINT_DATE) * 1000).toLocaleString()}`)
  console.log(`Merkle Root: ${MERKLE_ROOT}`)

  // Deploy NFT
  const NFT = await hre.ethers.getContractFactory('NFT')
  let nft = await NFT.deploy(
    NAME, 
    SYMBOL, 
    COST, 
    MAX_SUPPLY, 
    NFT_MINT_DATE, 
    IPFS_METADATA_URI,
    MERKLE_ROOT
  )

  await nft.deployed()
  console.log(`NFT deployed to: ${nft.address}\n`)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
