// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PropertyToken.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PropertyTokenFactory
 * @dev Factory contract for creating new PropertyToken instances
 */
contract PropertyTokenFactory is Ownable {
    // Array to store all created property tokens
    address[] public propertyTokens;
    
    // Mapping from property ID to token address
    mapping(string => address) public propertyIdToToken;
    
    // Events
    event PropertyTokenCreated(
        string indexed propertyId,
        address indexed tokenAddress,
        string propertyAddress,
        uint256 propertyValue,
        uint256 annualYieldPercent,
        uint256 totalSupply
    );
    
    /**
     * @dev Constructor
     * @param initialOwner The address that will own and control this contract
     */
    constructor(address initialOwner) Ownable(initialOwner) {}
    
    /**
     * @dev Create a new property token
     * @param propertyId Unique identifier for the property (e.g. database ID)
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param propertyAddress The physical address of the property
     * @param propertyValue The valuation of the property in USD (scaled by 1e18)
     * @param annualYieldPercent The expected annual yield percentage (scaled by 1e2, e.g. 750 = 7.5%)
     * @param lockupPeriodDays The number of days tokens are locked before they can be transferred
     * @param totalSupply The total supply of tokens to mint initially
     * @param initialHolder The address that will receive the initial token supply
     * @return The address of the newly created property token
     */
    function createPropertyToken(
        string memory propertyId,
        string memory name,
        string memory symbol,
        string memory propertyAddress,
        uint256 propertyValue,
        uint256 annualYieldPercent,
        uint256 lockupPeriodDays,
        uint256 totalSupply,
        address initialHolder
    ) external onlyOwner returns (address) {
        // Check if property ID already exists
        require(propertyIdToToken[propertyId] == address(0), "PropertyTokenFactory: property ID already exists");
        
        // Create new property token
        PropertyToken newToken = new PropertyToken(
            owner(),
            name,
            symbol,
            propertyAddress,
            propertyValue,
            annualYieldPercent,
            lockupPeriodDays
        );
        
        // Mint initial supply to the specified address
        if (totalSupply > 0 && initialHolder != address(0)) {
            newToken.mint(initialHolder, totalSupply);
        }
        
        // Store token address
        address tokenAddress = address(newToken);
        propertyTokens.push(tokenAddress);
        propertyIdToToken[propertyId] = tokenAddress;
        
        // Emit event
        emit PropertyTokenCreated(
            propertyId,
            tokenAddress,
            propertyAddress,
            propertyValue,
            annualYieldPercent,
            totalSupply
        );
        
        return tokenAddress;
    }
    
    /**
     * @dev Get the number of property tokens created
     * @return The number of property tokens
     */
    function getPropertyTokenCount() external view returns (uint256) {
        return propertyTokens.length;
    }
    
    /**
     * @dev Get property token by index
     * @param index The index of the property token
     * @return The address of the property token
     */
    function getPropertyTokenByIndex(uint256 index) external view returns (address) {
        require(index < propertyTokens.length, "PropertyTokenFactory: index out of bounds");
        return propertyTokens[index];
    }
    
    /**
     * @dev Get property token by property ID
     * @param propertyId The property ID
     * @return The address of the property token
     */
    function getPropertyTokenByPropertyId(string memory propertyId) external view returns (address) {
        address tokenAddress = propertyIdToToken[propertyId];
        require(tokenAddress != address(0), "PropertyTokenFactory: property ID not found");
        return tokenAddress;
    }
}
