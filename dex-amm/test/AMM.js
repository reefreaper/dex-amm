const { expect } = require('chai');
const { ethers } = require('hardhat');

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether')
}

const ether = tokens

describe('AMM', () => {
  let accounts, deployer, token1, token2, amm

  beforeEach(async () => {
    accounts = await ethers.getSigners()
    deployer = accounts[0]

    const Token = await ethers.getContractFactory('Token')
    token1 = await Token.deploy('Dapp University', 'DAPP', '1000000') // 1 Million Tokens
    token2 = await Token.deploy('USD Token', 'USD', '1000000') // 1 Million Tokens

    const AMM = await ethers.getContractFactory('AMM')
    amm = await AMM.deploy()

  })

  describe('Deployment', () => {

    it('has an address', async () => {
      expect(await amm.name).to.not.equal(0x0)
    })

  

  })

})
