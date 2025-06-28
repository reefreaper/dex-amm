import { useState, useEffect, useCallback } from 'react'
import { MerkleTree } from 'merkletreejs'
import keccak256 from 'keccak256' // Used by WhitelistDatabase internally
import WhitelistDatabase from '../services/WhitelistDatabase';

const WhitelistManager = ({ provider, nft, account, setIsLoading }) => {
    const [address, setAddress] = useState('')
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [isOwner, setIsOwner] = useState(false)
    const [whitelistedAddresses, setWhitelistedAddresses] = useState([])
    const [merkleRoot, setMerkleRoot] = useState('')
    const [whitelistOnly, setWhitelistOnly] = useState(true)
    const [fileInput, setFileInput] = useState(null)
    const [pendingRequests, setPendingRequests] = useState([])
    const [activeTab, setActiveTab] = useState('whitelist') // 'whitelist' or 'requests'
    
    // Check if current user is owner
    const checkOwnership = useCallback(async () => {
        if (!nft || !account) return false
        
        try {
            const owner = await nft.owner()
            return owner.toLowerCase() === account.toLowerCase()
        } catch (error) {
            console.error("Error checking ownership:", error)
            return false
        }
    }, [nft, account])
    
    // Load whitelist from SQLite database
    const loadWhitelist = useCallback(async () => {
        try {
            const addresses = await WhitelistDatabase.getWhitelistedAddresses()
            setWhitelistedAddresses(addresses)
            console.log("Loaded whitelist from database:", addresses)
            return addresses
        } catch (error) {
            console.error("Error loading whitelist from database:", error)
            // Fallback to localStorage
            const storedAddresses = JSON.parse(localStorage.getItem('whitelistedAddresses') || '[]')
            setWhitelistedAddresses(storedAddresses)
            return storedAddresses
        }
    }, [])
    
    // Add this function to update the contract's Merkle root
    const updateContractMerkleRoot = async (addresses) => {
        if (!nft || !account) return null;
        
        try {
            setIsProcessing(true);
            
            // Verify owner status
            const ownerStatus = await checkOwnership();
            if (!ownerStatus) {
                setError("Only the contract owner can update the Merkle root");
                setIsProcessing(false);
                return null;
            }
            
            // Generate new Merkle root
            console.log("Generating Merkle root for addresses:", addresses);
            
            // Create leaf nodes
            const leaves = addresses.map(addr => 
                keccak256(Buffer.from(addr.slice(2), 'hex'))
            );
            
            if (leaves.length === 0) {
                console.warn("No addresses to create Merkle tree");
                setError("Cannot create Merkle tree with no addresses");
                setIsProcessing(false);
                return null;
            }
            
            // Create Merkle Tree
            const merkleTree = new MerkleTree(leaves, keccak256, { sortPairs: true });
            
            // Get root
            const root = merkleTree.getHexRoot();
            console.log("Generated Merkle root:", root);
            
            // Update Merkle root in contract
            const signer = await provider.getSigner();
            const transaction = await nft.connect(signer).setMerkleRoot(root, {
                gasLimit: 200000
            });
            
            console.log("Updating contract Merkle root, transaction:", transaction.hash);
            await transaction.wait();
            console.log("Contract Merkle root updated successfully");
            
            setMerkleRoot(root);
            setSuccess("Successfully updated contract Merkle root");
            
            return {
                root,
                merkleTree,
                addresses
            };
        } catch (error) {
            console.error("Error updating contract Merkle root:", error);
            setError(`Failed to update contract Merkle root: ${error.message}`);
            return null;
        } finally {
            setIsProcessing(false);
        }
    };

    // Add a single address to whitelist
    const addToWhitelist = async (e) => {
        e.preventDefault();
        if (!nft || !account || !address) return;
        
        setIsProcessing(true);
        setError('');
        setSuccess('');
        
        try {
            // Verify owner status
            const ownerStatus = await checkOwnership();
            if (!ownerStatus) {
                setError("Only the contract owner can add users to whitelist");
                setIsProcessing(false);
                return;
            }
            
            // Validate address format
            if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
                setError("Invalid Ethereum address format");
                setIsProcessing(false);
                return;
            }
            
            // Add to database
            await WhitelistDatabase.addToWhitelist(address);
            
            // Reload whitelist
            const newAddresses = await loadWhitelist();
            
            // Update contract Merkle root
            await updateContractMerkleRoot(newAddresses);
            
            setSuccess(`Successfully added ${address} to whitelist!`);
            setAddress(''); // Clear input
        } catch (error) {
            console.error("Error adding to whitelist:", error);
            setError(`Failed to add to whitelist: ${error.message}`);
        }
        
        setIsProcessing(false);
    }
    
    // Add multiple addresses to whitelist (comma-separated)
    const addMultipleToWhitelist = async () => {
        if (!nft || !account || !address) return;
        
        setIsProcessing(true);
        setError('');
        setSuccess('');
        
        try {
            // Verify owner status
            const ownerStatus = await checkOwnership();
            if (!ownerStatus) {
                setError("Only the contract owner can add users to whitelist");
                setIsProcessing(false);
                return;
            }
            
            // Parse addresses (comma or space separated)
            const addressList = address.split(/[\s,]+/).filter(addr => addr.trim() !== '');
            
            // Validate addresses
            for (const addr of addressList) {
                if (!addr.match(/^0x[a-fA-F0-9]{40}$/)) {
                    setError(`Invalid Ethereum address format: ${addr}`);
                    setIsProcessing(false);
                    return;
                }
            }
            
            // Add to database
            await WhitelistDatabase.addMultipleToWhitelist(addressList);
            
            // Reload whitelist
            const newAddresses = await loadWhitelist();
            
            // Update contract Merkle root
            await updateContractMerkleRoot(newAddresses);
            
            setSuccess(`Successfully added ${addressList.length} addresses to whitelist!`);
            setAddress(''); // Clear input
        } catch (error) {
            console.error("Error adding to whitelist:", error);
            setError(`Failed to add to whitelist: ${error.message}`);
        }
        
        setIsProcessing(false);
    }
    
    // Export whitelist as JSON
    const exportWhitelist = async () => {
        try {
            const data = await WhitelistDatabase.exportDatabase();
            if (!data) {
                setError("Failed to export whitelist data");
                return;
            }
            
            const dataStr = JSON.stringify(data, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'whitelist-export.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            setSuccess("Whitelist exported successfully");
        } catch (error) {
            console.error("Error exporting whitelist:", error);
            setError(`Failed to export whitelist: ${error.message}`);
        }
    }
    
    // Import whitelist from JSON file
    const importWhitelist = async (e) => {
        try {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    
                    if (!data.addresses || !Array.isArray(data.addresses)) {
                        setError("Invalid whitelist file format");
                        return;
                    }
                    
                    setIsProcessing(true);
                    
                    // Import addresses
                    const result = await WhitelistDatabase.importAddresses(data.addresses);
                    
                    if (result) {
                        // Reload whitelist
                        await loadWhitelist();
                        
                        // Generate new Merkle root
                        const { root } = await WhitelistDatabase.generateMerkleRoot();
                        setMerkleRoot(root);
                        
                        // Update contract if connected
                        if (nft && provider) {
                            const signer = await provider.getSigner();
                            const transaction = await nft.connect(signer).setMerkleRoot(root, {
                                gasLimit: 100000
                            });
                            await transaction.wait();
                        }
                        
                        setSuccess(`Successfully imported ${data.addresses.length} addresses`);
                    } else {
                        setError("Failed to import addresses");
                    }
                    
                    setIsProcessing(false);
                } catch (error) {
                    console.error("Error parsing import file:", error);
                    setError(`Import error: ${error.message}`);
                    setIsProcessing(false);
                }
            };
            
            reader.readAsText(file);
        } catch (error) {
            console.error("Error importing whitelist:", error);
            setError(`Failed to import whitelist: ${error.message}`);
            setIsProcessing(false);
        }
    }
    
    // Toggle whitelist requirement
    const toggleWhitelistRequirement = async () => {
        if (!nft || !account) return
        
        setIsProcessing(true)
        setError('')
        setSuccess('')
        
        try {
            const signer = await provider.getSigner()
            
            // Verify owner status
            const ownerStatus = await checkOwnership()
            if (!ownerStatus) {
                setError("Only the contract owner can toggle whitelist requirement")
                setIsProcessing(false)
                return
            }
            
            // Get current whitelist requirement
            const currentRequirement = await nft.whitelistOnly()
            
            // Toggle it
            const transaction = await nft.connect(signer).setWhitelistOnly(!currentRequirement, {
                gasLimit: 100000
            })
            await transaction.wait()
            
            setWhitelistOnly(!currentRequirement)
            setSuccess(`Successfully ${!currentRequirement ? 'enabled' : 'disabled'} whitelist requirement!`)
            setIsLoading(true) // Refresh UI
        } catch (error) {
            console.error("Error toggling whitelist requirement:", error)
            setError(`Failed to toggle whitelist requirement: ${error.message}`)
        }
        
        setIsProcessing(false)
    }
    
    // Remove address from whitelist
    const removeFromWhitelist = async (addressToRemove) => {
        if (!nft || !account) return;
        
        setIsProcessing(true);
        setError('');
        setSuccess('');
        
        try {
            // Verify owner status
            const ownerStatus = await checkOwnership();
            if (!ownerStatus) {
                setError("Only the contract owner can remove users from whitelist");
                setIsProcessing(false);
                return;
            }
            
            // Remove from database
            const result = await WhitelistDatabase.removeFromWhitelist(addressToRemove);
            
            if (result) {
                // Reload whitelist
                const newAddresses = await loadWhitelist();
                
                // Update contract Merkle root
                await updateContractMerkleRoot(newAddresses);
                
                setSuccess(`Successfully removed ${addressToRemove} from whitelist!`);
            } else {
                setError(`Address ${addressToRemove} not found in whitelist`);
            }
        } catch (error) {
            console.error("Error removing from whitelist:", error);
            setError(`Failed to remove from whitelist: ${error.message}`);
        }
        
        setIsProcessing(false);
    }
    
    // Load pending requests
    const loadPendingRequests = useCallback(async () => {
        try {
            // In a real app, this would come from a database or contract
            // For now, we'll use localStorage as a simple storage
            const requests = JSON.parse(localStorage.getItem('whitelistRequests') || '[]')
            setPendingRequests(requests)
            console.log("Loaded pending whitelist requests:", requests)
            return requests
        } catch (error) {
            console.error("Error loading pending requests:", error)
            setPendingRequests([])
            return []
        }
    }, [])
    
    // Approve a whitelist request
    const approveRequest = async (requestAddress, requestId) => {
        if (!nft || !account) return
        
        setIsProcessing(true)
        setError('')
        setSuccess('')
        
        try {
            const signer = await provider.getSigner()
            
            // Verify owner status
            const ownerStatus = await checkOwnership()
            if (!ownerStatus) {
                setError("Only the contract owner can approve whitelist requests")
                setIsProcessing(false)
                return
            }
            
            // Add to database
            await WhitelistDatabase.addToWhitelist(requestAddress)
            
            // Remove from pending requests
            const updatedRequests = pendingRequests.filter(req => req.id !== requestId)
            localStorage.setItem('whitelistRequests', JSON.stringify(updatedRequests))
            setPendingRequests(updatedRequests)
            
            // Reload whitelist
            await loadWhitelist()
            
            // Generate new Merkle root
            const { root } = await WhitelistDatabase.generateMerkleRoot()
            setMerkleRoot(root)
            
            // Update Merkle root in contract
            const transaction = await nft.connect(signer).setMerkleRoot(root, {
                gasLimit: 100000
            })
            await transaction.wait()
            
            setSuccess(`Successfully approved whitelist request for ${requestAddress}!`)
            setIsLoading(true) // Refresh UI
        } catch (error) {
            console.error("Error approving whitelist request:", error)
            setError(`Failed to approve request: ${error.message}`)
        }
        
        setIsProcessing(false)
    }
    
    // Reject a whitelist request
    const rejectRequest = async (requestId) => {
        setIsProcessing(true)
        setError('')
        setSuccess('')
        
        try {
            // Verify owner status
            const ownerStatus = await checkOwnership()
            if (!ownerStatus) {
                setError("Only the contract owner can reject whitelist requests")
                setIsProcessing(false)
                return
            }
            
            // Remove from pending requests
            const updatedRequests = pendingRequests.filter(req => req.id !== requestId)
            localStorage.setItem('whitelistRequests', JSON.stringify(updatedRequests))
            setPendingRequests(updatedRequests)
            
            setSuccess(`Successfully rejected whitelist request!`)
        } catch (error) {
            console.error("Error rejecting whitelist request:", error)
            setError(`Failed to reject request: ${error.message}`)
        }
        
        setIsProcessing(false)
    }
    
    // Check ownership when component mounts
    useEffect(() => {
        const checkOwner = async () => {
            const result = await checkOwnership()
            setIsOwner(result)
        }
        
        if (nft && account) {
            checkOwner()
        }
    }, [nft, account, checkOwnership])
    
    // Add this function after the loadWhitelist function
    const initializeWhitelistIfEmpty = useCallback(async () => {
        try {
            // Get current whitelist
            const addresses = await WhitelistDatabase.getWhitelistedAddresses();
            
            // If whitelist is empty and user is owner, add the owner account
            if (addresses.length === 0 && account) {
                console.log("Whitelist is empty, checking if current account is owner...");
                
                // Check if user is owner
                if (nft) {
                    const owner = await nft.owner();
                    const isOwnerAccount = owner.toLowerCase() === account.toLowerCase();
                    
                    if (isOwnerAccount) {
                        console.log("Current account is owner, adding to whitelist");
                        await WhitelistDatabase.addToWhitelist(account);
                        
                        // Generate new Merkle root
                        const result = await WhitelistDatabase.generateMerkleRoot();
                        if (result && result.root) {
                            // Update contract Merkle root
                            const signer = await provider.getSigner();
                            try {
                                const transaction = await nft.connect(signer).setMerkleRoot(result.root, {
                                    gasLimit: 200000
                                });
                                await transaction.wait();
                                console.log("Contract Merkle root updated successfully");
                                setMerkleRoot(result.root);
                                
                                // Reload whitelist
                                await loadWhitelist();
                            } catch (error) {
                                console.error("Error updating contract Merkle root:", error);
                            }
                        }
                    } else {
                        console.log("Current account is not owner, cannot initialize whitelist");
                    }
                }
            }
        } catch (error) {
            console.error("Error initializing whitelist:", error);
        }
    }, [nft, account, provider, loadWhitelist]);

    // Load whitelist and merkle root when component mounts
    useEffect(() => {
        const loadData = async () => {
            await loadWhitelist();
            await loadPendingRequests();
            await initializeWhitelistIfEmpty(); // Add this line
            
            // Get current merkle root from contract
            if (nft) {
                try {
                    const root = await nft.merkleRoot();
                    setMerkleRoot(root);
                    
                    // Get whitelist requirement status
                    const whitelistRequired = await nft.whitelistOnly();
                    setWhitelistOnly(whitelistRequired);
                } catch (error) {
                    console.error("Error getting contract data:", error);
                }
            }
        };
        
        loadData();
    }, [nft, loadWhitelist, loadPendingRequests, initializeWhitelistIfEmpty]); // Add initializeWhitelistIfEmpty to dependencies
    
    // Close database connection when component unmounts
    useEffect(() => {
        return () => {
            // Close database connection when component unmounts
            WhitelistDatabase.close();
        };
    }, []); 
    
    if (!isOwner) {
        return (
            <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 mb-4">
                <div className="flex items-center">
                    <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd"></path>
                    </svg>
                    <p>Whitelist management is only available to the contract owner.</p>
                </div>
            </div>
        )
    }
    
    return (
        <div className="mt-4 text-gray-800">
            <h4 className="text-xl font-semibold mb-3 text-gray-800">Whitelist Management (Merkle Tree)</h4>
            
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">{error}</div>}
            {success && <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">{success}</div>}
            
            <div className="mb-4 p-3 border rounded bg-blue-50 border-blue-200 text-blue-800">
                <p>Current Merkle Root: <span className="font-mono text-sm">{merkleRoot || 'Not set'}</span></p>
                <p>Addresses in whitelist: {whitelistedAddresses.length}</p>
                <p>Pending requests: {pendingRequests.length}</p>
                <p>Whitelist requirement: <span className={whitelistOnly ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {whitelistOnly ? 'Enabled' : 'Disabled'}
                </span></p>
            </div>
            
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-4">
                <nav className="-mb-px flex">
                    <button
                        className={`py-2 px-4 border-b-2 font-medium text-sm ${
                            activeTab === 'whitelist'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setActiveTab('whitelist')}
                    >
                        Whitelist Management
                    </button>
                    <button
                        className={`ml-8 py-2 px-4 border-b-2 font-medium text-sm ${
                            activeTab === 'requests'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                        onClick={() => setActiveTab('requests')}
                    >
                        Pending Requests {pendingRequests.length > 0 && (
                            <span className="ml-2 bg-red-100 text-red-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                                {pendingRequests.length}
                            </span>
                        )}
                    </button>
                </nav>
            </div>
            
            {/* Whitelist Management Tab */}
            {activeTab === 'whitelist' && (
                <>
                    <form onSubmit={addToWhitelist}>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Ethereum Address
                            </label>
                            <input 
                                type="text" 
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                placeholder="0x..." 
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                                disabled={isProcessing}
                            />
                            <p className="text-gray-600 text-xs italic mt-1">
                                Enter a single address or multiple addresses separated by commas
                            </p>
                        </div>
                        
                        <div className="flex gap-2 flex-wrap mb-6">
                            <button 
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                type="submit"
                                disabled={isProcessing || !address}
                            >
                                {isProcessing ? 'Processing...' : 'Add Address'}
                            </button>
                            
                            <button 
                                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                type="button"
                                onClick={addMultipleToWhitelist}
                                disabled={isProcessing || !address}
                            >
                                {isProcessing ? 'Processing...' : 'Add Multiple'}
                            </button>
                            
                            <button 
                                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                type="button"
                                onClick={exportWhitelist}
                                disabled={isProcessing || whitelistedAddresses.length === 0}
                            >
                                Export Whitelist
                            </button>
                            
                            <label className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50 cursor-pointer">
                                Import Whitelist
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={importWhitelist}
                                    disabled={isProcessing}
                                    ref={input => setFileInput(input)}
                                />
                            </label>
                            
                            <button 
                                className="ml-auto border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
                                type="button"
                                onClick={toggleWhitelistRequirement}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Processing...' : `${whitelistOnly ? 'Disable' : 'Enable'} Whitelist Requirement`}
                            </button>
                        </div>
                    </form>
                    
                    {/* Whitelist Table */}
                    {whitelistedAddresses.length > 0 && (
                        <div className="mt-6">
                            <h5 className="text-lg font-semibold mb-3 text-gray-800">Current Whitelist</h5>
                            <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Address
                                            </th>
                                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {whitelistedAddresses.map((addr, index) => (
                                            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                                    {addr}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button
                                                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-1 px-3 rounded focus:outline-none focus:shadow-outline"
                                                        onClick={() => removeFromWhitelist(addr)}
                                                        disabled={isProcessing}
                                                    >
                                                        {isProcessing ? 'Removing...' : 'Remove'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
            
            {/* Pending Requests Tab */}
            {activeTab === 'requests' && (
                <div>
                    <h5 className="text-lg font-medium mb-3">Pending Whitelist Requests</h5>
                    
                    {pendingRequests.length === 0 ? (
                        <div className="text-gray-500 italic">No pending whitelist requests.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Address
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Requested On
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Reason
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {pendingRequests.map((request) => (
                                        <tr key={request.id}>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-500">
                                                {request.address}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(request.timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {request.reason || 'No reason provided'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button
                                                    onClick={() => approveRequest(request.address, request.id)}
                                                    disabled={isProcessing}
                                                    className="text-green-600 hover:text-green-900 mr-4"
                                                >
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => rejectRequest(request.id)}
                                                    disabled={isProcessing}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
            
            {/* Toggle Whitelist Requirement Button */}
            <div className="mt-6 border-t pt-4">
                <button 
                    className={`${whitelistOnly ? 'bg-red-500 hover:bg-red-700' : 'bg-green-500 hover:bg-green-700'} text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50`}
                    type="button"
                    onClick={toggleWhitelistRequirement}
                    disabled={isProcessing}
                >
                    {whitelistOnly ? 'Disable Whitelist Requirement' : 'Enable Whitelist Requirement'}
                </button>
            </div>
        </div>
    )
}

export default WhitelistManager
