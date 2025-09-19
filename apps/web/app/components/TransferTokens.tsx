"use client";

import { useState } from "react";
import { useWallet } from "@rentinity/blockchain";
import { ethers } from "ethers";

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
}: TransferTokensProps) {
  const { isConnected, address, blockchainService } = useWallet();
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
          amount: parseFloat(amount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to prepare transfer");
      }

      // Step 2: Execute the transfer using the user's wallet
      const txHash = await blockchainService.transferTokens(
        tokenAddress,
        recipientAddress,
        ethers.parseEther(amount)
      );

      setSuccess(`Transfer successful! Transaction hash: ${txHash}`);
      setRecipientAddress("");
      setAmount("");
      
      if (onTransferComplete) {
        onTransferComplete();
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
      fontWeight: "bold" as "bold",
      marginBottom: 16,
    },
    form: {
      display: "flex",
      flexDirection: "column" as "column",
      gap: 16,
    },
    inputGroup: {
      display: "flex",
      flexDirection: "column" as "column",
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
      fontWeight: "bold" as "bold",
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
      color: "green",
      fontSize: 14,
      marginTop: 8,
    },
  };

  const isDisabled = !isConnected || !tokenAddress || !walletAddress || loading;

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>Transfer Tokens</h3>
      
      {!isConnected && (
        <p style={styles.error}>Please connect your wallet to transfer tokens</p>
      )}
      
      {isConnected && !tokenAddress && (
        <p style={styles.error}>No token contract available for this property</p>
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
            ...(isDisabled ? styles.disabledButton : {})
          }}
          disabled={isDisabled}
        >
          {loading ? "Processing..." : "Transfer Tokens"}
        </button>
      </form>
      
      {error && <p style={styles.error}>{error}</p>}
      {success && <p style={styles.success}>{success}</p>}
    </div>
  );
}
