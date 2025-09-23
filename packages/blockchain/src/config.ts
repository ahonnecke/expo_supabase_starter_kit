import { type BlockchainConfig, NetworkType } from "./types";

export const BLOCKCHAIN_CONFIGS: Record<NetworkType, BlockchainConfig> = {
	[NetworkType.LOCALHOST]: {
		chainId: 31337,
		rpcUrl: "http://127.0.0.1:8545",
		propertyTokenFactoryAddress: "", // Will be filled after deployment
		explorerUrl: "http://localhost:8545",
	},
	[NetworkType.TESTNET]: {
		chainId: 80001, // Polygon Mumbai
		rpcUrl:
			process.env.NEXT_PUBLIC_POLYGON_MUMBAI_RPC_URL ||
			"https://rpc-mumbai.maticvigil.com",
		propertyTokenFactoryAddress:
			process.env.NEXT_PUBLIC_PROPERTY_TOKEN_FACTORY_ADDRESS || "",
		explorerUrl: "https://mumbai.polygonscan.com",
	},
	[NetworkType.MAINNET]: {
		chainId: 137, // Polygon Mainnet
		rpcUrl: "https://polygon-rpc.com",
		propertyTokenFactoryAddress: "", // Will be set for mainnet
		explorerUrl: "https://polygonscan.com",
	},
};

export const getBlockchainConfig = (network: NetworkType): BlockchainConfig => {
	return BLOCKCHAIN_CONFIGS[network];
};

export const getCurrentNetwork = (): NetworkType => {
	if (
		typeof window !== "undefined" &&
		window.location.hostname === "localhost"
	) {
		return NetworkType.LOCALHOST;
	}
	return NetworkType.TESTNET; // Default to testnet for now
};
