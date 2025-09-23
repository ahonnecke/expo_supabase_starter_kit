import type { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import type { PropertyToken, PropertyTokenFactory } from "../typechain-types";

describe("Integration Tests", () => {
	let propertyTokenFactory: PropertyTokenFactory;
	let owner: HardhatEthersSigner;
	let investor1: HardhatEthersSigner;
	let investor2: HardhatEthersSigner;

	beforeEach(async () => {
		[owner, investor1, investor2] = await ethers.getSigners();

		// Deploy PropertyTokenFactory
		const PropertyTokenFactory = await ethers.getContractFactory(
			"PropertyTokenFactory",
		);
		propertyTokenFactory = await PropertyTokenFactory.deploy(owner.address);
	});

	describe("End-to-End Property Tokenization", () => {
		it("Should complete full property tokenization workflow", async () => {
			// 1. Create property token
			const propertyId = "test-property-1";
			const tokenName = "Test Property Token";
			const tokenSymbol = "TPT";
			const propertyAddress = "123 Test St, Test City";
			const propertyValue = ethers.parseEther("1000000"); // $1M
			const annualYieldPercent = 750; // 7.5%
			const lockupPeriodDays = 60;
			const totalSupply = ethers.parseEther("100000"); // 100,000 tokens

			const tx = await propertyTokenFactory.createPropertyToken(
				propertyId,
				tokenName,
				tokenSymbol,
				propertyAddress,
				propertyValue,
				annualYieldPercent,
				lockupPeriodDays,
				totalSupply,
				owner.address,
			);

			const receipt = await tx.wait();
			expect(receipt.status).to.equal(1);

			// 2. Get token address
			const tokenAddress =
				await propertyTokenFactory.propertyIdToToken(propertyId);
			expect(tokenAddress).to.not.equal(ethers.ZeroAddress);

			// 3. Get token contract instance
			const propertyToken = (await ethers.getContractAt(
				"PropertyToken",
				tokenAddress,
			)) as PropertyToken;

			// 4. Verify token properties
			expect(await propertyToken.name()).to.equal(tokenName);
			expect(await propertyToken.symbol()).to.equal(tokenSymbol);
			expect(await propertyToken.totalSupply()).to.equal(totalSupply);
			expect(await propertyToken.balanceOf(owner.address)).to.equal(
				totalSupply,
			);

			// 5. Verify property metadata
			expect(await propertyToken.propertyAddress()).to.equal(propertyAddress);
			expect(await propertyToken.propertyValue()).to.equal(propertyValue);
			expect(await propertyToken.annualYieldPercent()).to.equal(
				annualYieldPercent,
			);

			// 6. Test KYC functionality
			await propertyToken.setKycStatus(investor1.address, true);
			await propertyToken.setKycStatus(owner.address, true);
			expect(await propertyToken.kycWhitelist(investor1.address)).to.be.true;

			// 7. Test transfer restrictions (should fail due to lockup)
			const transferAmount = ethers.parseEther("1000");
			await expect(
				propertyToken.transfer(investor1.address, transferAmount),
			).to.be.revertedWith("PropertyToken: tokens are still in lockup period");

			// 8. Fast forward past lockup period
			await ethers.provider.send("evm_increaseTime", [
				lockupPeriodDays * 24 * 60 * 60 + 1,
			]);
			await ethers.provider.send("evm_mine", []);

			// 9. Transfer should now work
			await expect(propertyToken.transfer(investor1.address, transferAmount))
				.to.emit(propertyToken, "Transfer")
				.withArgs(owner.address, investor1.address, transferAmount);

			expect(await propertyToken.balanceOf(investor1.address)).to.equal(
				transferAmount,
			);
		});

		it("Should handle multiple properties correctly", async () => {
			const properties = [
				{
					id: "prop-1",
					name: "Property 1 Token",
					symbol: "PROP1",
					address: "123 First St",
					value: ethers.parseEther("500000"),
					yield: 600,
					supply: ethers.parseEther("50000"),
				},
				{
					id: "prop-2",
					name: "Property 2 Token",
					symbol: "PROP2",
					address: "456 Second St",
					value: ethers.parseEther("750000"),
					yield: 800,
					supply: ethers.parseEther("75000"),
				},
			];

			const tokenAddresses: string[] = [];

			// Create multiple properties
			for (const prop of properties) {
				await propertyTokenFactory.createPropertyToken(
					prop.id,
					prop.name,
					prop.symbol,
					prop.address,
					prop.value,
					prop.yield,
					60, // lockup days
					prop.supply,
					owner.address,
				);

				const tokenAddress = await propertyTokenFactory.propertyIdToToken(
					prop.id,
				);
				tokenAddresses.push(tokenAddress);
			}

			// Verify factory tracking
			expect(await propertyTokenFactory.getPropertyTokenCount()).to.equal(2);
			expect(await propertyTokenFactory.getPropertyTokenByIndex(0)).to.equal(
				tokenAddresses[0],
			);
			expect(await propertyTokenFactory.getPropertyTokenByIndex(1)).to.equal(
				tokenAddresses[1],
			);

			// Verify each token
			for (let i = 0; i < properties.length; i++) {
				const token = (await ethers.getContractAt(
					"PropertyToken",
					tokenAddresses[i],
				)) as PropertyToken;
				expect(await token.name()).to.equal(properties[i].name);
				expect(await token.symbol()).to.equal(properties[i].symbol);
				expect(await token.propertyValue()).to.equal(properties[i].value);
				expect(await token.annualYieldPercent()).to.equal(properties[i].yield);
			}
		});
	});

	describe("Error Handling", () => {
		it("Should prevent duplicate property IDs", async () => {
			const propertyId = "duplicate-test";

			// Create first property
			await propertyTokenFactory.createPropertyToken(
				propertyId,
				"First Token",
				"FIRST",
				"123 Test St",
				ethers.parseEther("1000000"),
				750,
				60,
				ethers.parseEther("100000"),
				owner.address,
			);

			// Attempt to create duplicate
			await expect(
				propertyTokenFactory.createPropertyToken(
					propertyId,
					"Second Token",
					"SECOND",
					"456 Test St",
					ethers.parseEther("1000000"),
					750,
					60,
					ethers.parseEther("100000"),
					owner.address,
				),
			).to.be.revertedWith("PropertyTokenFactory: property ID already exists");
		});

		it("Should handle non-existent property queries", async () => {
			await expect(
				propertyTokenFactory.getPropertyTokenByPropertyId("non-existent"),
			).to.be.revertedWith("PropertyTokenFactory: property ID not found");

			await expect(
				propertyTokenFactory.getPropertyTokenByIndex(999),
			).to.be.revertedWith("PropertyTokenFactory: index out of bounds");
		});
	});

	describe("Access Control", () => {
		it("Should restrict factory operations to owner", async () => {
			await expect(
				propertyTokenFactory
					.connect(investor1)
					.createPropertyToken(
						"test-prop",
						"Test Token",
						"TEST",
						"123 Test St",
						ethers.parseEther("1000000"),
						750,
						60,
						ethers.parseEther("100000"),
						investor1.address,
					),
			).to.be.revertedWithCustomError(
				propertyTokenFactory,
				"OwnableUnauthorizedAccount",
			);
		});

		it("Should restrict token operations to token owner", async () => {
			// Create a property token
			await propertyTokenFactory.createPropertyToken(
				"access-test",
				"Access Test Token",
				"ATT",
				"123 Access St",
				ethers.parseEther("1000000"),
				750,
				60,
				ethers.parseEther("100000"),
				owner.address,
			);

			const tokenAddress =
				await propertyTokenFactory.propertyIdToToken("access-test");
			const token = (await ethers.getContractAt(
				"PropertyToken",
				tokenAddress,
			)) as PropertyToken;

			// Non-owner should not be able to mint
			await expect(
				token
					.connect(investor1)
					.mint(investor1.address, ethers.parseEther("1000")),
			).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");

			// Non-owner should not be able to set KYC status
			await expect(
				token.connect(investor1).setKycStatus(investor2.address, true),
			).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
		});
	});
});
