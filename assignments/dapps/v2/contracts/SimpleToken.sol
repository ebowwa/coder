// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleToken
 * @dev ERC20 token implementation with minting and burning capabilities
 *      Name: "DAppToken", Symbol: "DAPP"
 *      Initial supply: 1,000,000 tokens (18 decimals)
 *      Written from scratch following OpenZeppelin patterns
 */
contract SimpleToken {
    // Token metadata
    string public constant name = "DAppToken";
    string public constant symbol = "DAPP";
    uint8 public constant decimals = 18;

    // State variables
    address public owner;
    uint256 private _totalSupply;
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;

    // Events (ERC20 standard)
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Mint(address indexed to, uint256 value);
    event Burn(address indexed from, uint256 value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Errors
    error NotOwner(address caller);
    error InsufficientBalance(uint256 balance, uint256 amount);
    error InsufficientAllowance(uint256 allowance, uint256 amount);
    error TransferToZeroAddress();
    error MintToZeroAddress();
    error BurnFromZeroAddress();
    error BurnAmountExceedsBalance(uint256 balance, uint256 amount);

    /**
     * @dev Constructor mints initial supply to deployer
     *      Initial supply: 1,000,000 tokens
     */
    constructor() {
        owner = msg.sender;
        uint256 initialSupply = 1_000_000 * (10 ** uint256(decimals));
        _mint(msg.sender, initialSupply);
        emit OwnershipTransferred(address(0), owner);
    }

    // ============ Modifiers ============

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner(msg.sender);
        }
        _;
    }

    // ============ View Functions ============

    /**
     * @dev Returns the total token supply
     */
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev Returns the balance of a given account
     * @param account The address to query
     */
    function balanceOf(address account) external view returns (uint256) {
        return _balances[account];
    }

    /**
     * @dev Returns the remaining tokens that spender can spend on behalf of owner
     * @param tokenOwner The address owning the tokens
     * @param spender The address authorized to spend the tokens
     */
    function allowance(address tokenOwner, address spender) external view returns (uint256) {
        return _allowances[tokenOwner][spender];
    }

    // ============ ERC20 Core Functions ============

    /**
     * @dev Transfer tokens from caller to recipient
     * @param to The recipient address
     * @param amount The amount to transfer
     * @return success True if transfer succeeded
     */
    function transfer(address to, uint256 amount) external returns (bool success) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev Approve spender to spend tokens on behalf of caller
     * @param spender The address authorized to spend
     * @param amount The maximum amount spendable
     * @return success True if approval succeeded
     */
    function approve(address spender, uint256 amount) external returns (bool success) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    /**
     * @dev Transfer tokens from one address to another using allowance
     * @param from The source address
     * @param to The destination address
     * @param amount The amount to transfer
     * @return success True if transfer succeeded
     */
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) external returns (bool success) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance < amount) {
            revert InsufficientAllowance(currentAllowance, amount);
        }

        _approve(from, msg.sender, currentAllowance - amount);
        _transfer(from, to, amount);
        return true;
    }

    // ============ Mint & Burn Functions ============

    /**
     * @dev Mint new tokens to a specified address (owner only)
     * @param to The address to receive minted tokens
     * @param amount The amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Burn tokens from caller's balance
     * @param amount The amount to burn
     */
    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    /**
     * @dev Burn tokens from another address using allowance (owner only)
     * @param from The address to burn tokens from
     * @param amount The amount to burn
     */
    function burnFrom(address from, uint256 amount) external onlyOwner {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance < amount) {
            revert InsufficientAllowance(currentAllowance, amount);
        }

        _approve(from, msg.sender, currentAllowance - amount);
        _burn(from, amount);
    }

    // ============ Ownership Functions ============

    /**
     * @dev Transfer ownership to a new address
     * @param newOwner The address of the new owner
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "SimpleToken: new owner is zero address");
        address previousOwner = owner;
        owner = newOwner;
        emit OwnershipTransferred(previousOwner, newOwner);
    }

    // ============ Internal Functions ============

    /**
     * @dev Internal transfer function
     */
    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) {
            revert TransferToZeroAddress();
        }

        uint256 fromBalance = _balances[from];
        if (fromBalance < amount) {
            revert InsufficientBalance(fromBalance, amount);
        }

        _balances[from] = fromBalance - amount;
        _balances[to] += amount;

        emit Transfer(from, to, amount);
    }

    /**
     * @dev Internal mint function
     */
    function _mint(address to, uint256 amount) internal {
        if (to == address(0)) {
            revert MintToZeroAddress();
        }

        _totalSupply += amount;
        _balances[to] += amount;

        emit Transfer(address(0), to, amount);
        emit Mint(to, amount);
    }

    /**
     * @dev Internal burn function
     */
    function _burn(address from, uint256 amount) internal {
        if (from == address(0)) {
            revert BurnFromZeroAddress();
        }

        uint256 fromBalance = _balances[from];
        if (fromBalance < amount) {
            revert BurnAmountExceedsBalance(fromBalance, amount);
        }

        _balances[from] = fromBalance - amount;
        _totalSupply -= amount;

        emit Transfer(from, address(0), amount);
        emit Burn(from, amount);
    }

    /**
     * @dev Internal approve function
     */
    function _approve(
        address tokenOwner,
        address spender,
        uint256 amount
    ) internal {
        _allowances[tokenOwner][spender] = amount;
        emit Approval(tokenOwner, spender, amount);
    }
}
