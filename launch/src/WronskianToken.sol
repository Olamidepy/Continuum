// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @title Wronskian token
/// @notice Fixed-supply ERC-20 (WRON). The whole supply is minted once to the launch initializer.
/// @dev No owner, no mint after deployment, no transfer tax, no blacklist, no pause and no upgrade path.
///      Any holder can burn their own tokens, which permanently lowers `totalSupply`.
contract WronskianToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;

    uint256 public totalSupply;
    mapping(address account => uint256 balance) public balanceOf;
    mapping(address owner => mapping(address spender => uint256 amount)) public allowance;

    error InvalidTransfer();
    error InvalidMetadata();
    error InsufficientAllowance();

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);

    constructor(address inventoryOwner, string memory name_, string memory symbol_) {
        if (inventoryOwner == address(0)) revert InvalidTransfer();
        if (
            bytes(name_).length == 0 || bytes(name_).length > 64 || bytes(symbol_).length == 0
                || bytes(symbol_).length > 16
        ) revert InvalidMetadata();
        name = name_;
        symbol = symbol_;
        totalSupply = INITIAL_SUPPLY;
        balanceOf[inventoryOwner] = INITIAL_SUPPLY;
        emit Transfer(address(0), inventoryOwner, INITIAL_SUPPLY);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 approved = allowance[from][msg.sender];
        if (approved != type(uint256).max) {
            if (approved < amount) revert InsufficientAllowance();
            unchecked {
                allowance[from][msg.sender] = approved - amount;
            }
        }
        _transfer(from, to, amount);
        return true;
    }

    /// @notice Permanently destroys `amount` of the caller's tokens.
    function burn(uint256 amount) external {
        uint256 balance = balanceOf[msg.sender];
        if (balance < amount) revert InvalidTransfer();
        unchecked {
            balanceOf[msg.sender] = balance - amount;
            totalSupply -= amount;
        }
        emit Transfer(msg.sender, address(0), amount);
    }

    function _transfer(address from, address to, uint256 amount) private {
        if (to == address(0) || balanceOf[from] < amount) revert InvalidTransfer();
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}
