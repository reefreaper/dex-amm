import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256'
import { Buffer } from 'buffer'

// Make Buffer available globally for keccak256
window.Buffer = Buffer

const Mint = ({ provider, nft, cost, setIsLoading, isWhitelisted, whitelistOnly, account }) => {
    const [isWaiting, setIsWaiting] = useState(false)
    const [mintAmount, setMintAmount] = useState(1)
    const [maxMintAmount, setMaxMintAmount] = useState(5)
    const [requestingWhitelist, setRequestingWhitelist] = useState(false)
    const [error, setError] = useState('') // Add this line to define the error state

    // Fetch max mint amount
    useEffect(() => {
        const fetchMaxMintAmount = async () => {
            if (!nft) return
            
            try {
                const amount = await nft.maxMintAmount()
                setMaxMintAmount(amount.toNumber())
            } catch (error) {
                console.error("Error fetching max mint amount:", error)
            }
        }
        
        fetchMaxMintAmount()
    }, [nft])

    const requestWhitelist = async () => {
        if (!nft || !account) return
        
        setRequestingWhitelist(true)
        setError('')
        
        const currentMerkleRoot = await nft.merkleRoot()
        console.log("Current merkle root:", currentMerkleRoot)
        
        try {
            const signer = await provider.getSigner()
            
            // Check if user is owner
            const owner = await nft.owner()
            const isOwner = owner.toLowerCase() === account.toLowerCase()
            console.log("Current user is owner:", isOwner)
            
            if (isOwner) {
                try {
                    console.log("Setting merkle root as owner")
                    
                    // Create a new merkle tree with just the user's address
                    // IMPORTANT: Use the same hashing method as the contract
                    const leaf = keccak256(Buffer.from(account.slice(2), 'hex'))
                    const leaves = [leaf]
                    const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })
                    const root = merkleTree.getHexRoot()
                    
                    console.log("Generated Merkle root:", root)
                    console.log("For address:", account)
                    
                    // Set the new merkle root
                    const transaction = await nft.connect(signer).setMerkleRoot(root, {
                        gasLimit: 100000 // Explicit gas limit
                    })
                    await transaction.wait()
                    console.log("Successfully updated merkle root")
                    
                    // Store the whitelist in localStorage for future use
                    localStorage.setItem('whitelistedAddresses', JSON.stringify([account]))
                    console.log("Stored whitelist addresses:", [account])
                    
                    window.alert("Successfully added to whitelist!")
                    
                    // Force a page reload to update all states
                    window.location.reload()
                } catch (error) {
                    console.error("Error updating merkle root:", error)
                    window.alert(`Failed to add to whitelist: ${error.message}`)
                    setRequestingWhitelist(false)
                    return
                }
            } else {
                console.log("Not owner, attempting to disable whitelist requirement")
                
                try {
                    // Try to disable whitelist requirement with explicit gas limit
                    const transaction = await nft.connect(signer).setWhitelistOnly(false, {
                        gasLimit: 100000 // Explicit gas limit
                    })
                    await transaction.wait()
                    console.log("Successfully disabled whitelist requirement")
                    window.alert("Whitelist requirement has been disabled for everyone!")
                    
                    // Force a page reload to update all states
                    window.location.reload()
                } catch (error) {
                    console.error("Failed to disable whitelist:", error)
                    window.alert("You don't have permission to modify the whitelist. Please use the contract owner account.")
                    setRequestingWhitelist(false)
                    return
                }
            }
        } catch (error) {
            console.error("Error in whitelist request:", error)
            window.alert(`Whitelist request failed: ${error.message}`)
        }
        
        setRequestingWhitelist(false)
    }

    const generateMerkleProof = (address, whitelistedAddresses) => {
        // Create leaf nodes - IMPORTANT: Use the same hashing method as the contract
        const leaves = whitelistedAddresses.map(addr => 
            keccak256(Buffer.from(addr.slice(2), 'hex'))
        )
        
        // Create Merkle Tree
        const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true })
        
        // Create leaf for the address - IMPORTANT: Use the same hashing method as the contract
        const leaf = keccak256(Buffer.from(address.slice(2), 'hex'))
        
        // Generate proof
        return merkleTree.getHexProof(leaf)
    }

    const mintHandler = async (e) => {
        e.preventDefault()
        setIsWaiting(true)

        try {
            const signer = await provider.getSigner()
            
            // Ensure mintAmount is within bounds
            const amount = Math.min(Math.max(1, mintAmount), maxMintAmount)
            
            // Calculate total cost
            const totalCost = cost.mul(amount)
            
            console.log(`Minting ${amount} NFTs for ${ethers.utils.formatEther(totalCost)} ETH`)
            
            // Check if whitelist is required
            const whitelistRequired = await nft.whitelistOnly()
            console.log("Whitelist required:", whitelistRequired)
            
            let merkleProof = []
            if (whitelistRequired) {
                // Try to get stored whitelist from localStorage
                const storedAddresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]')
                console.log("Stored whitelist addresses for minting:", storedAddresses)
                console.log("Current account for minting:", account)
                
                if (storedAddresses.includes(account)) {
                    // Generate proof if the address is in our stored whitelist
                    merkleProof = generateMerkleProof(account, storedAddresses)
                    console.log("Generated Merkle proof for minting:", merkleProof)
                    
                    // Verify the proof works
                    const isWhitelisted = await nft.isWhitelisted(account, merkleProof)
                    console.log("Whitelist verification result:", isWhitelisted)
                    
                    if (!isWhitelisted) {
                        console.error("Merkle proof verification failed")
                        window.alert("Whitelist verification failed. Please try requesting whitelist access again.")
                        setIsWaiting(false)
                        return
                    }
                } else {
                    // Check if user is owner
                    const owner = await nft.owner()
                    const isOwner = owner.toLowerCase() === account.toLowerCase()
                    
                    if (!isOwner) {
                        console.error("Not whitelisted and not owner")
                        window.alert("You are not whitelisted. Please request whitelist access first.")
                        setIsWaiting(false)
                        return
                    } else {
                        console.log("User is owner, proceeding with empty proof")
                    }
                }
            }
            
            // Call the contract's mint function with the selected amount and merkle proof
            const transaction = await nft.connect(signer).mint(amount, merkleProof, {
                value: totalCost,
                gasLimit: 500000 + (amount * 100000) // Base + per token
            })
            await transaction.wait()
            
            console.log("Minting successful!")
            window.alert("Minting successful!")
            
            // Refresh the page to show the new NFT
            window.location.reload()
        } catch (error) {
            console.error("Transaction error:", error)
            window.alert(`Transaction failed: ${error.message || 'User rejected transaction'}`)
        }

        setIsWaiting(false)
        setIsLoading(true)
    }

    return (
        <form onSubmit={mintHandler} className="max-w-md mx-auto text-gray-800">
            {isWaiting ? (
                <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-700">Processing transaction...</span>
                </div>
            ) : (
                <>
                    {error && (
                        <div className="mb-4 p-3 border rounded bg-red-50 border-red-200 text-red-800">
                            {error}
                        </div>
                    )}
                    
                    {whitelistOnly && !isWhitelisted && (
                        <div className="mb-4 p-3 border rounded bg-yellow-50 border-yellow-200 text-yellow-800">
                            <p>Your address is not whitelisted. Click the button below to request whitelisting.</p>
                            <div className="mt-2">
                                <button 
                                    className="border border-yellow-500 text-yellow-700 hover:bg-yellow-500 hover:text-white font-medium py-1 px-3 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                    type="button"
                                    onClick={requestWhitelist}
                                    disabled={requestingWhitelist}
                                >
                                    {requestingWhitelist ? 'Processing...' : 'Request Whitelist Access'}
                                </button>
                            </div>
                        </div>
                    )}
                    
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-medium mb-2">
                            Number of NFTs to mint (max: {maxMintAmount})
                        </label>
                        <input
                            type="number" 
                            min="1" 
                            max={maxMintAmount} 
                            value={mintAmount}
                            onChange={(e) => {
                                const value = parseInt(e.target.value);
                                if (isNaN(value)) {
                                    setMintAmount(1);
                                } else {
                                    setMintAmount(Math.min(Math.max(1, value), maxMintAmount));
                                }
                            }}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        />
                    </div>
                    <div>
                        <button 
                            className={`w-full font-medium py-2 px-4 rounded focus:outline-none focus:shadow-outline ${
                                whitelistOnly && !isWhitelisted 
                                    ? "bg-gray-200 text-gray-400 cursor-not-allowed" 
                                    : "bg-blue-400 hover:bg-blue-500 text-white"
                            }`}
                            type="submit" 
                            disabled={whitelistOnly && !isWhitelisted}
                        >
                            {whitelistOnly && !isWhitelisted 
                                ? "Not Whitelisted" 
                                : `Mint ${mintAmount} NFT${mintAmount > 1 ? 's' : ''} for ${ethers.utils.formatEther(cost.mul(mintAmount))} ETH`
                            }
                        </button>
                    </div>
                </>
            )}
        </form>
    )
}

export default Mint;
