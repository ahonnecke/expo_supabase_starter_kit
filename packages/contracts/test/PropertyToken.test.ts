import { expect } from "chai";
import { ethers } from "hardhat";
import { PropertyToken, PropertyTokenFactory } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("PropertyToken", function () {
  let propertyToken: PropertyToken;
  let propertyTokenFactory: PropertyTokenFactory;
  let owner: HardhatEthersSigner;
  let investor1: HardhatEthersSigner;
  let investor2: HardhatEthersSigner;
  let propertyId: string;
  let tokenAddress: string;

  const propertyName = "Test Property Token";
  const propertySymbol = "TPT";
  const propertyAddress = "123 Test St, Test City, TS 12345";
  const propertyValue = ethers.parseEther("1000000"); // $1M
  const annualYieldPercent = 750; // 7.5%
  const lockupPeriodDays = 60;
  const totalSupply = ethers.parseEther("100000"); // 100,000 tokens

  beforeEach(async function () {
    // Get signers
    [owner, investor1, investor2] = await ethers.getSigners();

    // Deploy PropertyTokenFactory
    const PropertyTokenFactory = await ethers.getContractFactory("PropertyTokenFactory");
    propertyTokenFactory = await PropertyTokenFactory.deploy(owner.address);

    // Generate a unique property ID for each test
    propertyId = `property-${Date.now()}`;

    // Create a property token
    const tx = await propertyTokenFactory.createPropertyToken(
      propertyId,
      propertyName,
      propertySymbol,
      propertyAddress,
      propertyValue,
      annualYieldPercent,
      lockupPeriodDays,
      totalSupply,
      owner.address
    );
    await tx.wait();

    // Get the token address
    tokenAddress = await propertyTokenFactory.propertyIdToToken(propertyId);

    // Get the PropertyToken instance
    propertyToken = await ethers.getContractAt("PropertyToken", tokenAddress);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await propertyToken.owner()).to.equal(owner.address);
    });

    it("Should set the correct property metadata", async function () {
      expect(await propertyToken.propertyAddress()).to.equal(propertyAddress);
      expect(await propertyToken.propertyValue()).to.equal(propertyValue);
      expect(await propertyToken.annualYieldPercent()).to.equal(annualYieldPercent);
    });

    it("Should mint the initial supply to the owner", async function () {
      expect(await propertyToken.totalSupply()).to.equal(totalSupply);
      expect(await propertyToken.balanceOf(owner.address)).to.equal(totalSupply);
    });
  });

  describe("KYC Whitelist", function () {
    it("Should allow owner to whitelist addresses", async function () {
      await expect(propertyToken.setKycStatus(investor1.address, true))
        .to.emit(propertyToken, "KycStatusChanged")
        .withArgs(investor1.address, true);

      expect(await propertyToken.kycWhitelist(investor1.address)).to.be.true;
    });

    it("Should allow owner to batch whitelist addresses", async function () {
      await propertyToken.batchSetKycStatus([investor1.address, investor2.address], true);

      expect(await propertyToken.kycWhitelist(investor1.address)).to.be.true;
      expect(await propertyToken.kycWhitelist(investor2.address)).to.be.true;
    });

    it("Should prevent non-owners from whitelisting addresses", async function () {
      await expect(
        propertyToken.connect(investor1).setKycStatus(investor2.address, true)
      ).to.be.revertedWithCustomError(propertyToken, "OwnableUnauthorizedAccount");
    });
  });

  describe("Token Transfers", function () {
    it("Should prevent transfers when both addresses are not whitelisted", async function () {
      await expect(
        propertyToken.transfer(investor1.address, ethers.parseEther("1000"))
      ).to.be.revertedWith("PropertyToken: addresses must be KYC whitelisted");
    });

    it("Should prevent transfers during lockup period even if whitelisted", async function () {
      // Whitelist both addresses
      await propertyToken.batchSetKycStatus([owner.address, investor1.address], true);

      // Try to transfer
      await expect(
        propertyToken.transfer(investor1.address, ethers.parseEther("1000"))
      ).to.be.revertedWith("PropertyToken: tokens are still in lockup period");
    });

    it("Should allow transfers after lockup if addresses are whitelisted", async function () {
      // Whitelist both addresses
      await propertyToken.batchSetKycStatus([owner.address, investor1.address], true);

      // Fast forward time past the lockup period
      await ethers.provider.send("evm_increaseTime", [lockupPeriodDays * 24 * 60 * 60 + 1]);
      await ethers.provider.send("evm_mine", []);

      // Transfer should now succeed
      const transferAmount = ethers.parseEther("1000");
      await expect(propertyToken.transfer(investor1.address, transferAmount))
        .to.emit(propertyToken, "Transfer")
        .withArgs(owner.address, investor1.address, transferAmount);

      expect(await propertyToken.balanceOf(investor1.address)).to.equal(transferAmount);
    });

    it("Should allow transfers when restrictions are disabled", async function () {
      // Disable transfer restrictions
      await propertyToken.setTransferRestrictions(false);

      // Transfer should succeed even without KYC
      const transferAmount = ethers.parseEther("1000");
      await expect(propertyToken.transfer(investor1.address, transferAmount))
        .to.emit(propertyToken, "Transfer")
        .withArgs(owner.address, investor1.address, transferAmount);

      expect(await propertyToken.balanceOf(investor1.address)).to.equal(transferAmount);
    });
  });

  describe("PropertyTokenFactory", function () {
    it("Should track created tokens correctly", async function () {
      expect(await propertyTokenFactory.getPropertyTokenCount()).to.equal(1);
      expect(await propertyTokenFactory.getPropertyTokenByIndex(0)).to.equal(tokenAddress);
      expect(await propertyTokenFactory.getPropertyTokenByPropertyId(propertyId)).to.equal(tokenAddress);
    });

    it("Should prevent creating tokens with duplicate property IDs", async function () {
      await expect(
        propertyTokenFactory.createPropertyToken(
          propertyId, // Same property ID
          "Duplicate Token",
          "DUP",
          "456 Another St",
          propertyValue,
          annualYieldPercent,
          lockupPeriodDays,
          totalSupply,
          owner.address
        )
      ).to.be.revertedWith("PropertyTokenFactory: property ID already exists");
    });

    it("Should allow creating multiple property tokens", async function () {
      const newPropertyId = `property-${Date.now() + 1}`;
      
      await propertyTokenFactory.createPropertyToken(
        newPropertyId,
        "Second Property",
        "PROP2",
        "456 Second St",
        propertyValue,
        annualYieldPercent,
        lockupPeriodDays,
        totalSupply,
        owner.address
      );

      expect(await propertyTokenFactory.getPropertyTokenCount()).to.equal(2);
    });
  });
});
