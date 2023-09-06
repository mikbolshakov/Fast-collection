import { ethers } from "hardhat";
import hre from "hardhat";
import "hardhat-deploy";
import "hardhat-deploy-ethers";

// npx hardhat run scripts/deploy.ts --network chain
async function main() {
  const uri = "https://gateway.pinata.cloud/ipfs/";
  const defaultAdmin = "0x0d71a079a389817A832e43129Ba997002f01200a";
  const receiver = "0x0d71a079a389817A832e43129Ba997002f01200a";
  const feeNumerator = 750;

  const FastCollection = await ethers.getContractFactory("FastCollection");
  const fastCollection = await FastCollection.deploy(
    uri,
    defaultAdmin,
    receiver,
    feeNumerator
  );

  await fastCollection.deployed();
  console.log(`Staking deployed to ${fastCollection.address}`);

  await new Promise((resolve) => setTimeout(resolve, 30000));

  await hre.run("verify:verify", {
    address: fastCollection.address,
    constructorArguments: [uri, defaultAdmin, receiver, feeNumerator],
    contract: "contracts/FastCollection.sol:FastCollection",
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
