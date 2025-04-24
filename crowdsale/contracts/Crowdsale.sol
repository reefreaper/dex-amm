// SPDX-License-Identifier: MIT
// Crowdsale contract for token sale
pragma solidity ^0.8.0;

import "./Token.sol";

contract Crowdsale {
    address public owner;
    Token public token;
    uint256 public price;
    uint256 public maxTokens;
    uint256 public tokensSold;


    // Address of the wallet where funds will be sent
    event Buy(uint256 amount, address buyer);
    event Finalize(uint256 tokensSold, uint256 etherRaised);

    constructor(
        Token _token,
        uint256 _price,
        uint256 _maxTokens
        ) {
        owner = msg.sender;
        token = _token;
        price = _price;
        maxTokens = _maxTokens;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, 'Only the owner can call this function');
        _;
    }   

    receive() external payable {
        //buyTokens(msg.value);
        uint256 amount = msg.value / price;
        buyTokens(amount * 1e18);
    }

    function buyTokens(uint256 _amount) public payable {
        require(msg.value == _amount / 1e18 * price); // Ensure the value sent matches the token amount
        require(token.balanceOf(address(this)) >= _amount);
        require(token.transfer(msg.sender, _amount));

        tokensSold += _amount;

        emit Buy(_amount, msg.sender);
        // Transfer the ether to the contract owner
    }

    function setPrice(uint256 _price) public onlyOwner {
        price = _price;
    }


    function finalize() public onlyOwner {
        // Transfer remaining tokens to the owner
        require(token.transfer(owner, token.balanceOf(address(this))));

        // Transfer ether to the owner
        //payable(owner).transfer(address(this).balance);
        uint256 balance = address(this).balance;
        (bool sent, ) = owner.call{value: balance}("");
        require(sent);

        emit Finalize(tokensSold, balance);
    }

}
