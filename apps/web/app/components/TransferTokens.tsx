"use client";

import { useWallet } from "@rentinity/blockchain";
import { ethers } from "ethers";
import type React from "react";
import { useState } from "react";

interface TransferTokensProps {
	propertyId: string;
	tokenAddress: string | null;
	walletAddress: string | null;
	onTransferComplete?: () => void;
}

export default function TransferTokens({
	propertyId,
	tokenAddress,
	walletAddress,
	onTransferComplete,
}: TransferTokensProps): React.ReactElement {
	const { isConnected, address, blockchainService } = useWallet();
	const [recipientAddress, setRecipientAddress] = useState("");
	const [amount, setAmount] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [lockupEndDate, setLockupEndDate] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const handleTransfer = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!isConnected || !address) {
			setError("Please connect your wallet first");
			return;
		}

		if (!tokenAddress) {
			setError("Token contract address not available");
			return;
		}

		if (!ethers.isAddress(recipientAddress)) {
			setError("Invalid recipient address");
			return;
		}

		try {
			setLoading(true);
			setError(null);
			setSuccess(null);

			// Step 1: Call our API to validate the transfer and get transfer data
			const response = await fetch("/api/blockchain/transfer-tokens", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					propertyId,
					fromAddress: address,
					toAddress: recipientAddress,
					amount: Number.parseFloat(amount),
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				// Check if the error is related to lockup period
				if (data.lockupEndDate) {
					setLockupEndDate(data.lockupEndDate);
					throw new Error(
						`Tokens are in lockup period until ${new Date(data.lockupEndDate).toLocaleDateString()}`,
					);
				} else {
					throw new Error(data.error || "Failed to prepare transfer");
				}
			}

			// Step 2: Execute the transfer using the user's wallet
			try {
				if (!blockchainService) {
					setError("Blockchain service not initialized");
					return;
				}

				const txHash = await blockchainService.transferTokens(
					tokenAddress,
					recipientAddress,
					ethers.parseEther(amount),
				);

				setSuccess(`Transfer successful! Transaction hash: ${txHash}`);
				setRecipientAddress("");
				setAmount("");

				if (onTransferComplete) {
					onTransferComplete();
				}
			} catch (err: any) {
				setError(err.message || "Failed to transfer tokens");
			}
		} catch (err: any) {
			setError(err.message || "Failed to transfer tokens");
		} finally {
			setLoading(false);
		}
	};

	const styles = {
		container: {
			border: "1px solid #eee",
			borderRadius: 8,
			padding: 16,
			marginTop: 24,
		},
		title: {
			fontSize: 18,
			fontWeight: "bold" as const,
			marginBottom: 16,
		},
		form: {
			display: "flex",
			flexDirection: "column" as const,
			gap: 16,
		},
		inputGroup: {
			display: "flex",
			flexDirection: "column" as const,
			gap: 4,
		},
		label: {
			fontSize: 14,
			fontWeight: "medium" as any,
		},
		input: {
			padding: "8px 12px",
			border: "1px solid #ddd",
			borderRadius: 4,
			fontSize: 14,
		},
		button: {
			padding: "10px 16px",
			backgroundColor: "#0070f3",
			color: "white",
			border: "none",
			borderRadius: 4,
			fontSize: 14,
			fontWeight: "bold" as const,
			cursor: "pointer",
		},
		disabledButton: {
			backgroundColor: "#cccccc",
			cursor: "not-allowed",
		},
		error: {
			color: "crimson",
			fontSize: 14,
			marginTop: 8,
		},
		success: {
			color: "#4caf50",
			marginTop: 8,
		},
		lockupWarning: {
			backgroundColor: "#fff3cd",
			color: "#856404",
			padding: 8,
			borderRadius: 4,
			marginTop: 8,
			marginBottom: 8,
		},
	};

	const isDisabled = !isConnected || !tokenAddress || !walletAddress || loading;

	return (
		<div style={styles.container}>
			<h3 style={styles.title}>Transfer Tokens</h3>

			{!isConnected && (
				<p style={styles.error}>
					Please connect your wallet to transfer tokens
				</p>
			)}

			{isConnected && !tokenAddress && (
				<p style={styles.error}>
					No token contract available for this property
				</p>
			)}

			{isConnected && tokenAddress && walletAddress !== address && (
				<p style={styles.error}>
					Connected wallet ({address}) doesn't match your registered wallet
				</p>
			)}

			<form style={styles.form} onSubmit={handleTransfer}>
				<div style={styles.inputGroup}>
					<label style={styles.label}>Recipient Address</label>
					<input
						style={styles.input}
						type="text"
						placeholder="0x..."
						value={recipientAddress}
						onChange={(e) => setRecipientAddress(e.target.value)}
						disabled={isDisabled}
					/>
				</div>

				<div style={styles.inputGroup}>
					<label style={styles.label}>Amount</label>
					<input
						style={styles.input}
						type="number"
						step="0.000001"
						min="0"
						placeholder="0.0"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
						disabled={isDisabled}
					/>
				</div>

				<button
					type="submit"
					style={{
						...styles.button,
						...(isDisabled ? styles.disabledButton : {}),
					}}
					disabled={isDisabled}
				>
					{loading ? "Processing..." : "Transfer Tokens"}
				</button>
			</form>

			{error && <div style={styles.error}>{error}</div>}
			{lockupEndDate && (
				<div style={styles.lockupWarning}>
					<span style={{ fontWeight: "bold" }}>⚠️ Lockup Period:</span> Tokens
					are locked until {new Date(lockupEndDate).toLocaleDateString()}
				</div>
			)}
			{success && <p style={styles.success}>{success}</p>}
		</div>
	);
}
