// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title SimpleStorage
 * @dev A simple storage contract that stores and retrieves a uint256 value
 *      with owner-only access control and event emission
 */
contract SimpleStorage {
    // State variables
    address public owner;
    uint256 private storedValue;

    // Events
    event ValueChanged(uint256 oldValue, uint256 newValue, address changedBy);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // Errors (gas-efficient custom errors)
    error NotOwner(address caller);
    error InvalidValue(uint256 value);

    /**
     * @dev Constructor sets the deployer as the initial owner
     */
    constructor() {
        owner = msg.sender;
        emit OwnershipTransferred(address(0), owner);
    }

    /**
     * @dev Modifier to restrict function access to the owner only
     */
    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert NotOwner(msg.sender);
        }
        _;
    }

    /**
     * @dev Store a new value in the contract
     * @param _value The uint256 value to store
     * Emits a {ValueChanged} event
     */
    function setValue(uint256 _value) external onlyOwner {
        uint256 oldValue = storedValue;
        storedValue = _value;
        emit ValueChanged(oldValue, _value, msg.sender);
    }

    /**
     * @dev Retrieve the currently stored value
     * @return The stored uint256 value
     */
    function getValue() external view returns (uint256) {
        return storedValue;
    }

    /**
     * @dev Transfer ownership to a new address
     * @param _newOwner The address of the new owner
     * Emits an {OwnershipTransferred} event
     */
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "SimpleStorage: new owner is zero address");
        address previousOwner = owner;
        owner = _newOwner;
        emit OwnershipTransferred(previousOwner, _newOwner);
    }

    /**
     * @dev Renounce ownership of the contract
     *      Sets owner to zero address (permanently disables owner functions)
     * Emits an {OwnershipTransferred} event
     */
    function renounceOwnership() external onlyOwner {
        address previousOwner = owner;
        owner = address(0);
        emit OwnershipTransferred(previousOwner, address(0));
    }
}
