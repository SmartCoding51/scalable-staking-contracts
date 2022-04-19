// SPDX-License-Identifier: MIT

pragma solidity ^0.8.2;

import "./ERC20.sol";

contract NaveToken is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint256 decimals_,
        uint256 initialBalance_,
        address tokenOwner_,
        address payable feeReceiver_
    ) payable ERC20(name_, symbol_, initialBalance_, decimals_, tokenOwner_) {
        payable(feeReceiver_).transfer(msg.value);
    }
}