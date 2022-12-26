// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "./ERC20.sol";

contract Vault {
    ERC20 public immutable token;

    constructor(address _token) {
        token = ERC20(_token);
    }

    function deposite(uint amount) external {
        token.transferFrom(msg.sender, address(this), amount);
    }

    function depositeWithPermit(uint amount, uint deadline, uint8 v, bytes32 r, bytes32 s) external {
        token.permit(msg.sender, address(this), amount, deadline, v, r, s);
        token.transferFrom(msg.sender, address(this), amount);
    }
}