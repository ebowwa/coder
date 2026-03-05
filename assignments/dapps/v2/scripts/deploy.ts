/**
 * Deployment Script
 * Deploys SimpleStorage contract to specified network
 */

import { ethers } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  
  console.log('Deploying SimpleStorage...');
  console.log('Deployer address:', deployer.address);
  console.log('Account balance:', (await ethers.provider.getBalance(deployer.address)).toString());

  const SimpleStorage = await ethers.getContractFactory('SimpleStorage');
  const contract = await SimpleStorage.deploy();

  await contract.waitForDeployment();

  const address = await contract.getAddress();
  
  console.log('\nDeployment successful!');
  console.log('Contract address:', address);
  console.log('Transaction hash:', contract.deploymentTransaction()?.hash);
  console.log('Block number:', await ethers.provider.getBlockNumber());

  // Verify initial state
  console.log('\nInitial state:');
  console.log('  Owner:', await contract.owner());
  console.log('  Value:', await contract.getValue());

  return address;
}

main()
  .then((address) => {
    console.log('\n✅ Deploy complete:', address);
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Deployment failed:', error);
    process.exit(1);
  });
