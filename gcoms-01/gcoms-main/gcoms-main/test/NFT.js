const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

// Add this helper function at the top of your test file, after the imports
const setupWhitelist = async (nft, minter) => {
  // Add minter to whitelist
  const transaction = await nft.addToWhitelist(minter.address)
  await transaction.wait()
}

describe('NFT', () => {
  const NAME = 'Dapp Punks'
  const SYMBOL = 'DP'
  const COST = ether(10)
  const MAX_SUPPLY = 25
  const BASE_URI = 'ipfs://QmQ2jnDYecFhrf3asEWjyjZRX1pZSsNWG3qHzmNDvXa9qg/'

  let nft,
      deployer,
      minter

  beforeEach(async () => {
    let accounts = await ethers.getSigners()
    deployer = accounts[0]
    minter = accounts[1]
  })

  describe('Deployment', () => {
    const ALLOW_MINTING_ON = (Date.now() + 120000).toString().slice(0, 10) // 2 minutes from now

    beforeEach(async () => {
      const NFT = await ethers.getContractFactory('NFT')
      nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
    })

    it('has correct name', async () => {
      expect(await nft.name()).to.equal(NAME)
    })

    it('has correct symbol', async () => {
      expect(await nft.symbol()).to.equal(SYMBOL)
    })

    it('returns the cost to mint', async () => {
      expect(await nft.cost()).to.equal(COST)
    })

    it('returns the maximum total supply', async () => {
      expect(await nft.maxSupply()).to.equal(MAX_SUPPLY)
    })

    it('returns the allowed minting time', async () => {
      expect(await nft.allowMintingOn()).to.equal(ALLOW_MINTING_ON)
    })

    it('returns the base URI', async () => {
      expect(await nft.baseURI()).to.equal(BASE_URI)
    })

    it('returns the owner', async () => {
      expect(await nft.owner()).to.equal(deployer.address)
    })

  })


  describe('Minting', () => {
    let transaction, result

    describe('Success', async () => {
      const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now

      beforeEach(async () => {
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist before testing minting
        await setupWhitelist(nft, minter)
        
        transaction = await nft.connect(minter).mint(1, { value: COST })
        result = await transaction.wait()
      })

      it('returns the address of the minter', async () => {
        expect(await nft.ownerOf(1)).to.equal(minter.address)
      })

      it('returns total number of tokens the minter owns', async () => {
        expect(await nft.balanceOf(minter.address)).to.equal(1)
      })

      it('returns IPFS URI', async () => {
        // EG: 'ipfs://QmQ2jnDYecFhrf3asEWjyjZRX1pZSsNWG3qHzmNDvXa9qg/1.json'
        // Uncomment this line to see example
        // console.log(await nft.tokenURI(1))
        expect(await nft.tokenURI(1)).to.equal(`${BASE_URI}1.json`)
      })

      it('updates the total supply', async () => {
        expect(await nft.totalSupply()).to.equal(1)
      })

      it('updates the contract ether balance', async () => {
        expect(await ethers.provider.getBalance(nft.address)).to.equal(COST)
      })

      it('emits Mint event', async () => {
        await expect(transaction).to.emit(nft, 'Mint')
          .withArgs(1, minter.address)
      })

    })

    describe('Failure', async () => {
      it('rejects insufficient payment', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)

        await expect(nft.connect(minter).mint(1, { value: ether(1) })).to.be.reverted
      })

      it('requires at least 1 NFT to be minted', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)

        await expect(nft.connect(minter).mint(0, { value: COST })).to.be.reverted
      })

      it('rejects minting before allowed time', async () => {
        const ALLOW_MINTING_ON = new Date('May 26, 2030 18:00:00').getTime().toString().slice(0, 10)
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)

        await expect(nft.connect(minter).mint(1, { value: COST })).to.be.reverted
      })

      it('does not allow more NFTs to be minted than max amount', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)

        await expect(nft.connect(minter).mint(100, { value: COST })).to.be.reverted
      })

      it('does not return URIs for invalid tokens', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)
        
        nft.connect(minter).mint(1, { value: COST })

        await expect(nft.tokenURI('99')).to.be.reverted
      })


    })

  })

  describe('Displaying NFTs', () => {
    let transaction, result

    const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now

    beforeEach(async () => {
      const NFT = await ethers.getContractFactory('NFT')
      nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
      
      // Add minter to whitelist
      await setupWhitelist(nft, minter)

      // Mint 3 nfts
      transaction = await nft.connect(minter).mint(3, { value: ether(30) })
      result = await transaction.wait()
    })

    it('returns all the NFTs for a given owner', async () => {
      let tokenIds = await nft.walletOfOwner(minter.address)
      // Uncomment this line to see the return value
      // console.log("owner wallet", tokenIds)
      expect(tokenIds.length).to.equal(3)
      expect(tokenIds[0].toString()).to.equal('1')
      expect(tokenIds[1].toString()).to.equal('2')
      expect(tokenIds[2].toString()).to.equal('3')
    })
  })

  describe('Withdrawing', () => {
    describe('Success', async () => {
      let transaction, result, balanceBefore
      const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now

      beforeEach(async () => {
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)

        transaction = await nft.connect(minter).mint(1, { value: COST })
        result = await transaction.wait()

        balanceBefore = await ethers.provider.getBalance(deployer.address)

        transaction = await nft.connect(deployer).withdraw()
        result = await transaction.wait()
      })

      it('deducts contract balance', async () => {
        expect(await ethers.provider.getBalance(nft.address)).to.equal(0)
      })

      it('sends funds to the owner', async () => {
        expect(await ethers.provider.getBalance(deployer.address)).to.be.greaterThan(balanceBefore)
      })

      it('emits a withdraw event', async () => {
        expect(transaction).to.emit(nft, 'Withdraw')
          .withArgs(COST, deployer.address)
      })
    })

    describe('Failure', async () => {
      it('prevents non-owner from withdrawing', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)
        
        transaction = await nft.connect(minter).mint(1, { value: COST })
        await transaction.wait()

        await expect(nft.connect(minter).withdraw()).to.be.reverted
      })
    })
  })


  describe('Max Mint Amount', () => {
    let transaction, result

    describe('Success', async () => {
      const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now

      beforeEach(async () => {
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
      })

      it('returns the default max mint amount', async () => {
        expect(await nft.maxMintAmount()).to.equal(5)
      })

      it('allows owner to change max mint amount', async () => {
        transaction = await nft.connect(deployer).setMaxMintAmount(10)
        await transaction.wait()
        expect(await nft.maxMintAmount()).to.equal(10)
      })

      it('allows minting up to max mint amount', async () => {
        // Set max mint amount to 3
        transaction = await nft.connect(deployer).setMaxMintAmount(3)
        await transaction.wait()
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)
        
        // Mint 3 NFTs (should succeed)
        transaction = await nft.connect(minter).mint(3, { value: ether(30) })
        result = await transaction.wait()
        expect(await nft.totalSupply()).to.equal(3)
      })
    })

    describe('Failure', async () => {
      it('prevents non-owner from changing max mint amount', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)

        await expect(nft.connect(minter).setMaxMintAmount(10)).to.be.reverted
      })

      it('prevents minting more than max mint amount', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Add minter to whitelist
        await setupWhitelist(nft, minter)
        
        // Set max mint amount to 3
        transaction = await nft.connect(deployer).setMaxMintAmount(3)
        await transaction.wait()
        
        // Try to mint 4 NFTs (should fail)
        await expect(nft.connect(minter).mint(4, { value: ether(40) })).to.be.reverted
      })
    })
  })

  describe('Whitelist', () => {
    let transaction, result

    describe('Success', async () => {
      const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now

      beforeEach(async () => {
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
      })

      it('whitelist is enabled by default', async () => {
        expect(await nft.whitelistOnly()).to.equal(true)
      })

      it('allows owner to add address to whitelist', async () => {
        transaction = await nft.connect(deployer).addToWhitelist(minter.address)
        await transaction.wait()
        
        expect(await nft.isWhitelisted(minter.address)).to.equal(true)
      })

      it('allows owner to add multiple addresses to whitelist', async () => {
        const addresses = [minter.address, deployer.address]
        transaction = await nft.connect(deployer).addManyToWhitelist(addresses)
        await transaction.wait()
        
        expect(await nft.isWhitelisted(minter.address)).to.equal(true)
        expect(await nft.isWhitelisted(deployer.address)).to.equal(true)
      })

      it('allows owner to remove address from whitelist', async () => {
        // First add to whitelist
        transaction = await nft.connect(deployer).addToWhitelist(minter.address)
        await transaction.wait()
        
        // Then remove
        transaction = await nft.connect(deployer).removeFromWhitelist(minter.address)
        await transaction.wait()
        
        expect(await nft.isWhitelisted(minter.address)).to.equal(false)
      })

      it('allows owner to toggle whitelist requirement', async () => {
        transaction = await nft.connect(deployer).setWhitelistOnly(false)
        await transaction.wait()
        
        expect(await nft.whitelistOnly()).to.equal(false)
      })

      it('allows whitelisted address to mint', async () => {
        // Add minter to whitelist
        transaction = await nft.connect(deployer).addToWhitelist(minter.address)
        await transaction.wait()
        
        // Mint NFT
        transaction = await nft.connect(minter).mint(1, { value: COST })
        await transaction.wait()
        
        expect(await nft.balanceOf(minter.address)).to.equal(1)
      })

      it('allows anyone to mint when whitelist is disabled', async () => {
        // Disable whitelist
        transaction = await nft.connect(deployer).setWhitelistOnly(false)
        await transaction.wait()
        
        // Mint NFT without being whitelisted
        transaction = await nft.connect(minter).mint(1, { value: COST })
        await transaction.wait()
        
        expect(await nft.balanceOf(minter.address)).to.equal(1)
      })
    })

    describe('Failure', async () => {
      it('prevents non-owner from adding to whitelist', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)

        await expect(nft.connect(minter).addToWhitelist(minter.address)).to.be.reverted
      })

      it('prevents non-whitelisted address from minting', async () => {
        const ALLOW_MINTING_ON = Date.now().toString().slice(0, 10) // Now
        const NFT = await ethers.getContractFactory('NFT')
        nft = await NFT.deploy(NAME, SYMBOL, COST, MAX_SUPPLY, ALLOW_MINTING_ON, BASE_URI)
        
        // Try to mint without being whitelisted
        await expect(nft.connect(minter).mint(1, { value: COST })).to.be.reverted
      })
    })
  })
})  
