// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title PropertyToken
 * @dev ERC20 token representing fractional ownership of a real estate property
 */
contract PropertyToken is ERC20, ERC20Burnable, Ownable, ERC20Permit {
    // Property metadata
    string public propertyAddress;
    uint256 public propertyValue;
    uint256 public annualYieldPercent;
    uint256 public lockupPeriodEnd;

    // Transfer restriction flag
    bool public transfersRestricted = true;

    // KYC whitelist for transfer restrictions
    mapping(address => bool) public kycWhitelist;

    // Events
    event KycStatusChanged(address indexed account, bool isWhitelisted);
    event TransferRestrictionsChanged(bool restricted);
    event PropertyMetadataUpdated(string propertyAddress, uint256 propertyValue, uint256 annualYieldPercent);

    /**
     * @dev Constructor to create a new property token
     * @param initialOwner The address that will own and control this contract
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param _propertyAddress The physical address of the property
     * @param _propertyValue The valuation of the property in USD (scaled by 1e18)
     * @param _annualYieldPercent The expected annual yield percentage (scaled by 1e2, e.g. 750 = 7.5%)
     * @param _lockupPeriodDays The number of days tokens are locked before they can be transferred
     */
    constructor(
        address initialOwner,
        string memory name,
        string memory symbol,
        string memory _propertyAddress,
        uint256 _propertyValue,
        uint256 _annualYieldPercent,
        uint256 _lockupPeriodDays
    )
        ERC20(name, symbol)
        Ownable(initialOwner)
        ERC20Permit(name)
    {
        propertyAddress = _propertyAddress;
        propertyValue = _propertyValue;
        annualYieldPercent = _annualYieldPercent;
        lockupPeriodEnd = block.timestamp + (_lockupPeriodDays * 1 days);
    }

    /**
     * @dev Mint new tokens to an address (only owner can call)
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Override transfer function to enforce restrictions
     */
    function _update(address from, address to, uint256 value) internal override {
        // Check transfer restrictions
        if (transfersRestricted) {
            // Allow minting and burning operations
            if (from != address(0) && to != address(0)) {
                // Check if both addresses are whitelisted first
                require(kycWhitelist[from] && kycWhitelist[to], "PropertyToken: addresses must be KYC whitelisted");

                // Then check if lockup period has ended
                require(block.timestamp >= lockupPeriodEnd, "PropertyToken: tokens are still in lockup period");
            }
        }

        super._update(from, to, value);
    }

    /**
     * @dev Add or remove an address from the KYC whitelist
     * @param account The address to update
     * @param isWhitelisted Whether the address is approved
     */
    function setKycStatus(address account, bool isWhitelisted) external onlyOwner {
        kycWhitelist[account] = isWhitelisted;
        emit KycStatusChanged(account, isWhitelisted);
    }

    /**
     * @dev Batch update KYC whitelist status for multiple addresses
     * @param accounts Array of addresses to update
     * @param isWhitelisted Whether the addresses are approved
     */
    function batchSetKycStatus(address[] calldata accounts, bool isWhitelisted) external onlyOwner {
        for (uint256 i = 0; i < accounts.length; i++) {
            kycWhitelist[accounts[i]] = isWhitelisted;
            emit KycStatusChanged(accounts[i], isWhitelisted);
        }
    }

    /**
     * @dev Enable or disable transfer restrictions
     * @param restricted Whether transfers should be restricted
     */
    function setTransferRestrictions(bool restricted) external onlyOwner {
        transfersRestricted = restricted;
        emit TransferRestrictionsChanged(restricted);
    }

    /**
     * @dev Update property metadata
     * @param _propertyAddress The physical address of the property
     * @param _propertyValue The valuation of the property in USD (scaled by 1e18)
     * @param _annualYieldPercent The expected annual yield percentage (scaled by 1e2)
     */
    function updatePropertyMetadata(
        string memory _propertyAddress,
        uint256 _propertyValue,
        uint256 _annualYieldPercent
    ) external onlyOwner {
        propertyAddress = _propertyAddress;
        propertyValue = _propertyValue;
        annualYieldPercent = _annualYieldPercent;

        emit PropertyMetadataUpdated(_propertyAddress, _propertyValue, _annualYieldPercent);
    }

    /**
     * @dev Extend the lockup period
     * @param _additionalDays The number of additional days to lock tokens
     */
    function extendLockupPeriod(uint256 _additionalDays) external onlyOwner {
        lockupPeriodEnd = lockupPeriodEnd + (_additionalDays * 1 days);
    }
}
