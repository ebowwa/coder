/**
 * @file deploy.ts
 * @dev Deployment script for DApp smart contracts
 * Supports deployment to multiple networks using ethers.js
 */

import { ethers, Contract, ContractFactory, Wallet } from "ethers";

// Contract ABIs - these would typically be imported from compiled artifacts
import SimpleStorageABI from "../src/abis/SimpleStorage.json";
import SimpleTokenABI from "../src/abis/SimpleToken.json";
import SimpleNFTABI from "../src/abis/SimpleNFT.json";

// Contract Bytecode - these would typically be imported from compiled artifacts
// Placeholder - replace with actual bytecode from compilation
const SIMPLE_STORAGE_BYTECODE = "0x...";
const SIMPLE_TOKEN_BYTECODE = "0x...";
const SIMPLE_NFT_BYTECODE = "0x...";

// Network configuration
interface NetworkConfig {
  rpcUrl: string;
  chainId: number;
  privateKey?: string;
  gasPrice?: number;
  gasLimit?: number;
}

const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    rpcUrl: "http://127.0.0.1:8545",
    chainId: 31337,
  },
  sepolia: {
    rpcUrl: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
    chainId: 11155111,
  },
  mainnet: {
    rpcUrl: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
    chainId: 1,
  },
  polygon: {
    rpcUrl: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    chainId: 137,
  },
  arbitrum: {
    rpcUrl: process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
    chainId: 42161,
  },
};

// Deployment result interface
interface DeploymentResult {
  contract: Contract;
  address: string;
  transactionHash: string;
  blockNumber: number;
  gasUsed: bigint;
}

// Deployer class for managing deployments
class ContractDeployer {
  private provider: ethers.JsonRpcProvider;
  private signer: Wallet;
  private network: string;

  constructor(network: string = "localhost", privateKey?: string) {
    const config = NETWORKS[network];
    if (!config) {
      throw new Error(`Unknown network: ${network}`);
    }

    this.network = network;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);

    const key = privateKey || process.env.PRIVATE_KEY;
    if (!key) {
      throw new Error("Private key required for deployment");
    }

    this.signer = new Wallet(key, this.provider);
  }

  /**
   * Deploy a contract and return deployment details
   */
  async deployContract(
    name: string,
    abi: unknown[],
    bytecode: string,
    constructorArgs: unknown[] = [],
    options: { gasPrice?: number; gasLimit?: number } = {}
  ): Promise<DeploymentResult> {
    console.log(`\n📦 Deploying ${name}...`);
    console.log(`   Network: ${this.network}`);
    console.log(`   Deployer: ${this.signer.address}`);

    const factory = new ContractFactory(abi, bytecode, this.signer);

    // Override gas settings if provided
    const deployOptions: Record<string, unknown> = {};
    if (options.gasPrice) {
      deployOptions.gasPrice = options.gasPrice;
    }
    if (options.gasLimit) {
      deployOptions.gasLimit = options.gasLimit;
    }

    const contract = await factory.deploy(...constructorArgs, deployOptions);
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    const deploymentTx = contract.deploymentTransaction();

    if (!deploymentTx) {
      throw new Error("Deployment transaction not found");
    }

    const receipt = await this.provider.getTransactionReceipt(deploymentTx.hash);

    console.log(`   ✅ Deployed to: ${address}`);
    console.log(`   📝 Transaction: ${deploymentTx.hash}`);
    if (receipt) {
      console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
    }

    return {
      contract,
      address,
      transactionHash: deploymentTx.hash,
      blockNumber: receipt?.blockNumber || 0,
      gasUsed: receipt?.gasUsed || BigInt(0),
    };
  }

  /**
   * Verify contract on block explorer (placeholder)
   */
  async verifyContract(
    address: string,
    constructorArguments: unknown[]
  ): Promise<void> {
    console.log(`\n🔍 Verifying contract at ${address}...`);
    // Implementation depends on the block explorer API
    // This is a placeholder for etherscan verification
    console.log("   Note: Manual verification may be required on block explorer");
  }
}

/**
 * Deploy all DApp contracts
 */
async function deployAllContracts(
  network: string = "localhost",
  verify: boolean = false
): Promise<void> {
  console.log("🚀 Starting DApp Contract Deployment\n");
  console.log("=" .repeat(50));

  const deployer = new ContractDeployer(network);
  const deployments: Record<string, DeploymentResult> = {};

  try {
    // Deploy SimpleStorage
    deployments.SimpleStorage = await deployer.deployContract(
      "SimpleStorage",
      SimpleStorageABI.abi,
      SIMPLE_STORAGE_BYTECODE,
      []
    );

    // Deploy SimpleToken
    deployments.SimpleToken = await deployer.deployContract(
      "SimpleToken",
      SimpleTokenABI.abi,
      SIMPLE_TOKEN_BYTECODE,
      []
    );

    // Deploy SimpleNFT
    deployments.SimpleNFT = await deployer.deployContract(
      "SimpleNFT",
      SimpleNFTABI.abi,
      SIMPLE_NFT_BYTECODE,
      []
    );

    // Verify contracts if requested
    if (verify && network !== "localhost") {
      await deployer.verifyContract(deployments.SimpleStorage.address, []);
      await deployer.verifyContract(deployments.SimpleToken.address, []);
      await deployer.verifyContract(deployments.SimpleNFT.address, []);
    }

    // Print deployment summary
    console.log("\n" + "=".repeat(50));
    console.log("📋 Deployment Summary\n");

    for (const [name, result] of Object.entries(deployments)) {
      console.log(`${name}:`);
      console.log(`  Address: ${result.address}`);
      console.log(`  TX Hash: ${result.transactionHash}`);
      console.log(`  Block: ${result.blockNumber}`);
      console.log(`  Gas Used: ${result.gasUsed.toString()}`);
      console.log("");
    }

    // Save deployment addresses
    const deploymentInfo = {
      network,
      timestamp: new Date().toISOString(),
      contracts: Object.fromEntries(
        Object.entries(deployments).map(([name, result]) => [
          name,
          {
            address: result.address,
            transactionHash: result.transactionHash,
            blockNumber: result.blockNumber,
            gasUsed: result.gasUsed.toString(),
          },
        ])
      ),
    };

    console.log("💾 Deployment info:");
    console.log(JSON.stringify(deploymentInfo, null, 2));

  } catch (error) {
    console.error("❌ Deployment failed:", error);
    throw error;
  }
}

/**
 * Deploy individual contract
 */
async function deployContract(
  contractName: "SimpleStorage" | "SimpleToken" | "SimpleNFT",
  network: string = "localhost"
): Promise<string> {
  const deployer = new ContractDeployer(network);

  const contractConfigs = {
    SimpleStorage: {
      abi: SimpleStorageABI.abi,
      bytecode: SIMPLE_STORAGE_BYTECODE,
      args: [],
    },
    SimpleToken: {
      abi: SimpleTokenABI.abi,
      bytecode: SIMPLE_TOKEN_BYTECODE,
      args: [],
    },
    SimpleNFT: {
      abi: SimpleNFTABI.abi,
      bytecode: SIMPLE_NFT_BYTECODE,
      args: [],
    },
  };

  const config = contractConfigs[contractName];
  const result = await deployer.deployContract(
    contractName,
    config.abi,
    config.bytecode,
    config.args
  );

  return result.address;
}

// CLI argument parsing
function parseArgs(): { network: string; verify: boolean; contract?: string } {
  const args = process.argv.slice(2);
  let network = "localhost";
  let verify = false;
  let contract: string | undefined;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--network":
      case "-n":
        network = args[++i];
        break;
      case "--verify":
      case "-v":
        verify = true;
        break;
      case "--contract":
      case "-c":
        contract = args[++i];
        break;
      case "--help":
      case "-h":
        console.log(`
Usage: bun run scripts/deploy.ts [options]

Options:
  --network, -n <network>  Network to deploy to (default: localhost)
                           Options: localhost, sepolia, mainnet, polygon, arbitrum
  --verify, -v             Verify contracts on block explorer
  --contract, -c <name>    Deploy specific contract only
  --help, -h               Show this help message

Examples:
  bun run scripts/deploy.ts --network sepolia
  bun run scripts/deploy.ts -n mainnet -v
  bun run scripts/deploy.ts --contract SimpleToken -n localhost
        `);
        process.exit(0);
    }
  }

  return { network, verify, contract };
}

// Main execution
async function main(): Promise<void> {
  const { network, verify, contract } = parseArgs();

  if (contract) {
    const address = await deployContract(
      contract as "SimpleStorage" | "SimpleToken" | "SimpleNFT",
      network
    );
    console.log(`\n✅ ${contract} deployed to: ${address}`);
  } else {
    await deployAllContracts(network, verify);
  }
}

// Run if executed directly
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

// Export for use as module
export {
  deployAllContracts,
  deployContract,
  ContractDeployer,
  DeploymentResult,
  NETWORKS,
};
