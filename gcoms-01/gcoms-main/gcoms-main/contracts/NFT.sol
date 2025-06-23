// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "./ERC721Enumerable.sol";
import "./Ownable.sol";
import "./Strings.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

// Inherit from ERC721Enumerable
contract NFT is ERC721Enumerable, Ownable {
    using Strings for uint256;
    string public baseURI;
    string public baseExtension = '.json';
    uint256 public cost;
    uint256 public maxSupply;
    uint256 public maxMintAmount = 5;
    uint256 public allowMintingOn;

    // Merkle root for whitelist
    bytes32 public merkleRoot;
    bool public whitelistOnly = true;

    event Mint(uint256 amount, address indexed minter);
    event Withdraw(uint256 amount, address owner);
    event WhitelistOnlyChanged(bool indexed whitelistOnly);
    event MerkleRootChanged(bytes32 indexed newMerkleRoot);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _cost,
        uint256 _maxSupply,
        uint256 _allowMintingOn,
        string memory _baseURI,
        bytes32 _merkleRoot
    ) ERC721(_name, _symbol) {
        cost = _cost;
        maxSupply = _maxSupply;
        allowMintingOn = _allowMintingOn;
        baseURI = _baseURI;
        merkleRoot = _merkleRoot;
    }

    function mint(uint256 _mintAmount, bytes32[] calldata _merkleProof) public payable {
        // Only allow minting after specified time
        require(block.timestamp >= allowMintingOn);
        // Must mint at least 1 token
        require(_mintAmount > 0);
        // Require enough payment
        require(msg.value >= cost * _mintAmount);
        // Require mint amount does not exceed 5 
        require(_mintAmount <= maxMintAmount, "Cannot mint more than maxMintAmount");
        
        // Check if whitelistOnly is enabled and if so, verify merkle proof
        if (whitelistOnly) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Invalid merkle proof");
        }

        uint256 supply = totalSupply();

        // Do not let them mint more tokens than available
        require(supply + _mintAmount <= maxSupply);

        // Create tokens
        for(uint256 i = 1; i <= _mintAmount; i++) {
            _safeMint(msg.sender, supply + i);
        }

        // Emit event
        emit Mint(_mintAmount, msg.sender);
    }
    
    // Update the merkle root (owner only)
    function setMerkleRoot(bytes32 _merkleRoot) public onlyOwner {
        merkleRoot = _merkleRoot;
        emit MerkleRootChanged(_merkleRoot);
    }
    
    function setWhitelistOnly(bool _whitelistOnly) public onlyOwner {
        whitelistOnly = _whitelistOnly;
        emit WhitelistOnlyChanged(_whitelistOnly);
    }
    
    // Check if an address is whitelisted using merkle proof
    function isWhitelisted(address _address, bytes32[] calldata _merkleProof) public view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_address));
        return MerkleProof.verify(_merkleProof, merkleRoot, leaf);
    }

    // Add a function to set maxMintAmount (only owner)
    function setMaxMintAmount(uint256 _newMaxMintAmount) public onlyOwner {
        maxMintAmount = _newMaxMintAmount;
    }

    // Add this mapping to store individual token URIs
    mapping(uint256 => string) private _tokenURIs;

    // Add this function to set individual token URIs
    function setTokenURI(uint256 tokenId, string memory _tokenURI) public onlyOwner {
        require(_exists(tokenId), "ERC721Metadata: URI set of nonexistent token");
        _tokenURIs[tokenId] = _tokenURI;
    }

    // Override the tokenURI function to check for individual URIs first
    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override
        returns(string memory)
    {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
        
        // If we have a specific URI for this token, return it
        string memory _tokenURI = _tokenURIs[_tokenId];
        if (bytes(_tokenURI).length > 0) {
            return _tokenURI;
        }
        
        // Otherwise fall back to the baseURI pattern
        return
            string(
                abi.encodePacked(
                    baseURI,
                    _tokenId.toString(),
                    baseExtension
                )
            );
    }

    function walletOfOwner(address _owner) public view returns (uint256[] memory) {
        uint256 ownerTokenCount = balanceOf(_owner);
        uint256[] memory tokenIds = new uint256[](ownerTokenCount);
        for (uint256 i = 0; i < ownerTokenCount; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokenIds;
    }

    // Owner functions
    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;

        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success);

        emit Withdraw(balance, msg.sender);
    }

    function setCost(uint256 _newCost) public onlyOwner {
        cost = _newCost;
    }
}
