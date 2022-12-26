// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ERC20.sol";

contract Token is ERC20 {
    constructor() ERC20("Token Name", "TKN", 0) {}

    function mint(address to, uint256 value) external {
        _mint(to, value);
    }
}