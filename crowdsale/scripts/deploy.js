// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
//const ethers = require("ethers");

const hre = require("hardhat");

async function main() {
    const NAME = "Dapp University";
    const SYMBOL = "DAPP";
    const MAXSUPPLY = "1000000";
    const PRICE = hre.ethers.utils.parseUnits('0.025', 'ether');
    
    // Deploy Token
    const Token = await hre.ethers.getContractFactory('Token');
    let token = await Token.deploy(NAME, SYMBOL, MAXSUPPLY);

    await token.deployed();
    console.log(`Token deployed to: ${token.address}\n`);   

    // Deploy Crowdsale
    const Crowdsale = await hre.ethers.getContractFactory('Crowdsale');
    const crowdsale = await Crowdsale.deploy(token.address, PRICE, ethers.utils.parseUnits(MAXSUPPLY, 'ether'));
    await token.deployed();

    console.log(`Crowdsale deployed to: ${crowdsale.address}\n`);

    // Send tokens to crowdsale
    const transaction = await token.transfer(crowdsale.address, ethers.utils.parseUnits(MAXSUPPLY, 'ether'));
    await transaction.wait();

    console.log(`Tokens transferred to Crowdsale\n`);

    console.log('Finished deployment!');
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
