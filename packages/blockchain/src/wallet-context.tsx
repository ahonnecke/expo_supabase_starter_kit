"use client";

import { ethers } from "ethers";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { BlockchainService } from "./blockchain-service";
import { NetworkType } from "./types";

interface WalletContextType {
	isConnected: boolean;
	address: string | null;
	chainId: number | null;
	balance: string | null;
	blockchainService: BlockchainService | null;
	connectWallet: () => Promise<void>;
	disconnectWallet: () => void;
	switchNetwork: (chainId: number) => Promise<void>;
	error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode }) {
	const [isConnected, setIsConnected] = useState(false);
	const [address, setAddress] = useState<string | null>(null);
	const [chainId, setChainId] = useState<number | null>(null);
	const [balance, setBalance] = useState<string | null>(null);
	const [blockchainService, setBlockchainService] =
		useState<BlockchainService | null>(null);
	const [error, setError] = useState<string | null>(null);

	// Initialize blockchain service
	useEffect(() => {
		const service = new BlockchainService(NetworkType.TESTNET);
		setBlockchainService(service);
	}, []);

	// Check if wallet is already connected
	useEffect(() => {
		checkConnection();
	}, []);

	// Listen for account changes
	useEffect(() => {
		if (typeof window !== "undefined" && window.ethereum) {
			window.ethereum.on("accountsChanged", handleAccountsChanged);
			window.ethereum.on("chainChanged", handleChainChanged);

			return () => {
				window.ethereum.removeListener(
					"accountsChanged",
					handleAccountsChanged,
				);
				window.ethereum.removeListener("chainChanged", handleChainChanged);
			};
		}
	}, []);

	const checkConnection = async () => {
		try {
			if (typeof window !== "undefined" && window.ethereum) {
				const accounts = await window.ethereum.request({
					method: "eth_accounts",
				});
				if (accounts.length > 0) {
					await handleConnection(accounts[0]);
				}
			}
		} catch (err) {
			console.error("Error checking wallet connection:", err);
		}
	};

	const handleConnection = async (account: string) => {
		try {
			setError(null);
			setAddress(account);
			setIsConnected(true);

			// Get chain ID
			const chainId = await window.ethereum.request({ method: "eth_chainId" });
			setChainId(Number.parseInt(chainId, 16));

			// Get balance
			const provider = new ethers.BrowserProvider(window.ethereum);
			const balance = await provider.getBalance(account);
			setBalance(ethers.formatEther(balance));

			// Connect blockchain service
			if (blockchainService) {
				const signer = await provider.getSigner();
				await blockchainService.connectWallet(signer);
			}
		} catch (err: any) {
			setError(err.message || "Failed to connect wallet");
		}
	};

	const handleAccountsChanged = (accounts: string[]) => {
		if (accounts.length === 0) {
			disconnectWallet();
		} else {
			handleConnection(accounts[0]);
		}
	};

	const handleChainChanged = (chainId: string) => {
		setChainId(Number.parseInt(chainId, 16));
		// Reload the page to reset the dapp state
		window.location.reload();
	};

	const connectWallet = async () => {
		try {
			setError(null);

			if (!window.ethereum) {
				throw new Error(
					"MetaMask is not installed. Please install MetaMask to continue.",
				);
			}

			const accounts = await window.ethereum.request({
				method: "eth_requestAccounts",
			});

			if (accounts.length > 0) {
				await handleConnection(accounts[0]);
			}
		} catch (err: any) {
			setError(err.message || "Failed to connect wallet");
		}
	};

	const disconnectWallet = () => {
		setIsConnected(false);
		setAddress(null);
		setChainId(null);
		setBalance(null);
		setError(null);
	};

	const switchNetwork = async (targetChainId: number) => {
		try {
			setError(null);

			if (!window.ethereum) {
				throw new Error("MetaMask is not installed");
			}

			const chainIdHex = `0x${targetChainId.toString(16)}`;

			try {
				await window.ethereum.request({
					method: "wallet_switchEthereumChain",
					params: [{ chainId: chainIdHex }],
				});
			} catch (switchError: any) {
				// This error code indicates that the chain has not been added to MetaMask
				if (switchError.code === 4902) {
					// Add Polygon Mumbai testnet
					if (targetChainId === 80001) {
						await window.ethereum.request({
							method: "wallet_addEthereumChain",
							params: [
								{
									chainId: chainIdHex,
									chainName: "Polygon Mumbai Testnet",
									nativeCurrency: {
										name: "MATIC",
										symbol: "MATIC",
										decimals: 18,
									},
									rpcUrls: ["https://rpc-mumbai.maticvigil.com"],
									blockExplorerUrls: ["https://mumbai.polygonscan.com/"],
								},
							],
						});
					} else {
						throw new Error("Unsupported network");
					}
				} else {
					throw switchError;
				}
			}
		} catch (err: any) {
			setError(err.message || "Failed to switch network");
		}
	};

	const value: WalletContextType = {
		isConnected,
		address,
		chainId,
		balance,
		blockchainService,
		connectWallet,
		disconnectWallet,
		switchNetwork,
		error,
	};

	return (
		<WalletContext.Provider value={value}>{children}</WalletContext.Provider>
	);
}

export function useWallet() {
	const context = useContext(WalletContext);
	if (context === undefined) {
		throw new Error("useWallet must be used within a WalletProvider");
	}
	return context;
}

// Type declaration for window.ethereum
declare global {
	interface Window {
		ethereum?: any;
	}
}
