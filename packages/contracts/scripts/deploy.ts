import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy PropertyTokenFactory
  const PropertyTokenFactory = await ethers.getContractFactory("PropertyTokenFactory");
  const propertyTokenFactory = await PropertyTokenFactory.deploy(deployer.address);
  await propertyTokenFactory.waitForDeployment();

  const propertyTokenFactoryAddress = await propertyTokenFactory.getAddress();
  console.log("PropertyTokenFactory deployed to:", propertyTokenFactoryAddress);

  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    propertyTokenFactory: propertyTokenFactoryAddress,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`Deployment info saved to ${network.name}.json`);

  // Create a sample property token for testing (only on local networks)
  if (network.name === "localhost" || network.name === "hardhat") {
    console.log("Creating a sample property token...");
    
    const propertyId = "property-1";
    const name = "Sample Property Token";
    const symbol = "PROP1";
    const propertyAddress = "123 Main St, Anytown, USA";
    const propertyValue = ethers.parseEther("1000000"); // $1M
    const annualYieldPercent = 750; // 7.5%
    const lockupPeriodDays = 60;
    const totalSupply = ethers.parseEther("100000"); // 100,000 tokens
    
    const tx = await propertyTokenFactory.createPropertyToken(
      propertyId,
      name,
      symbol,
      propertyAddress,
      propertyValue,
      annualYieldPercent,
      lockupPeriodDays,
      totalSupply,
      deployer.address
    );
    
    await tx.wait();
    
    const tokenAddress = await propertyTokenFactory.propertyIdToToken(propertyId);
    console.log(`Sample property token created at: ${tokenAddress}`);
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
