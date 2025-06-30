// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;

import "hardhat/console.sol";
import "./Token.sol";

// [] Manage Pool
// [] Manage Deposits
// [] Facilitate Swaps (i.e. Trades)
// [] Manage Withdraws
    
contract AMM {
    Token public token1;
    Token public token2;

    uint256 public token1Balance;
    uint256 public token2Balance;
    uint256 public K;
    //uint256 public totalShares;

    constructor(Token _token1, Token _token2) {
        token1 = _token1;
        token2 = _token2;
    }

    function addLiquidity(uint256 _token1Amount, uint256 _token2Amount) external {
        // Deposit Tokens
        require(
            token1.transferFrom(msg.sender, address(this), _token1Amount),
            "failed to transer token 1"
        );

        require(
            token2.transferFrom(msg.sender, address(this), _token2Amount),
            "failed to transer token 2"
        );



        // Issue Shares

        // Manage Pool
        token1Balance += _token1Amount;
        token2Balance += _token2Amount;

        // Set K for constant during trades
        K = token1Balance * token2Balance;
    }

}
