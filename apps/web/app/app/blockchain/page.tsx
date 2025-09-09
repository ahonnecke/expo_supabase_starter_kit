"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import { WalletProvider, useWallet } from "@rentinity/blockchain/src/wallet-context";
import WalletConnect from "../../components/WalletConnect";

interface Investment {
  id: string;
  property_id: string;
  property_address: string;
  shares_owned: number;
  wallet_address: string | null;
  token_contract_address: string | null;
  metadata: any;
}

export default function BlockchainPage() {
  return (
    <WalletProvider>
      <ProtectedRoute>
        <BlockchainContent />
      </ProtectedRoute>
    </WalletProvider>
  );
}

function BlockchainContent() {
  const { user } = useAuth();
  const { isConnected, address, chainId, blockchainService } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [mintingStates, setMintingStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user) return;
    
    const fetchInvestments = async () => {
      try {
        setLoading(true);
        const supabase = createPublicClient();
        
        // Fetch user's investments with property details
        const { data, error: fetchError } = await supabase
          .from("ownership_ledger")
          .select(`
            id,
            property_id,
            shares_owned,
            wallet_address,
            metadata,
            properties!inner(
              address,
              token_contract_address
            )
          `)
          .eq("user_id", user.id);
        
        if (fetchError) throw fetchError;
        
        const formattedInvestments = data?.map(item => ({
          id: item.id,
          property_id: item.property_id,
          property_address: item.properties.address,
          shares_owned: item.shares_owned,
          wallet_address: item.wallet_address,
          token_contract_address: item.properties.token_contract_address,
          metadata: item.metadata || {}
        })) || [];
        
        setInvestments(formattedInvestments);
      } catch (err: any) {
        setError(err.message || "Failed to load investments");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvestments();
  }, [user]);

  const handleMintTokens = async (investment: Investment) => {
    if (!isConnected || !address) {
      setError("Please connect your wallet first");
      return;
    }

    if (chainId !== 80001) {
      setError("Please switch to Polygon Mumbai testnet");
      return;
    }

    try {
      setMintingStates(prev => ({ ...prev, [investment.id]: true }));
      setError(null);

      const response = await fetch("/api/blockchain/mint-tokens", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          propertyId: investment.property_id,
          walletAddress: address,
          shares: investment.shares_owned,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to mint tokens");
      }

      // Update the investment in state
      setInvestments(prev => prev.map(inv => 
        inv.id === investment.id 
          ? { ...inv, wallet_address: address, metadata: { ...inv.metadata, tokens_minted: investment.shares_owned } }
          : inv
      ));

      alert(`Successfully minted ${investment.shares_owned} tokens! Transaction: ${data.transactionHash}`);
    } catch (err: any) {
      setError(err.message || "Failed to mint tokens");
    } finally {
      setMintingStates(prev => ({ ...prev, [investment.id]: false }));
    }
  };

  const getTokensMinted = (investment: Investment): number => {
    return investment.metadata?.tokens_minted || 0;
  };

  const isTokensMinted = (investment: Investment): boolean => {
    return getTokensMinted(investment) > 0;
  };

  const styles = {
    container: {
      padding: 24,
      maxWidth: 1200,
      margin: "0 auto",
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 24,
    },
    walletSection: {
      border: "1px solid #ddd",
      borderRadius: 8,
      padding: 24,
      marginBottom: 32,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      marginBottom: 16,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse" as "collapse",
    },
    th: {
      textAlign: "left" as "left",
      padding: "12px 16px",
      borderBottom: "2px solid #ddd",
    },
    td: {
      padding: "12px 16px",
      borderBottom: "1px solid #eee",
    },
    button: {
      padding: "8px 16px",
      border: "none",
      borderRadius: 4,
      cursor: "pointer",
      fontSize: 14,
      fontWeight: "bold",
    },
    mintButton: {
      backgroundColor: "#0070f3",
      color: "white",
    },
    disabledButton: {
      backgroundColor: "#cccccc",
      color: "#666",
      cursor: "not-allowed",
    },
    mintedBadge: {
      backgroundColor: "#4caf50",
      color: "white",
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 12,
    },
    noTokenBadge: {
      backgroundColor: "#ff9800",
      color: "white",
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 12,
    },
    emptyState: {
      textAlign: "center" as "center",
      padding: "40px 0",
    },
    error: {
      color: "crimson",
      marginTop: 16,
    },
    infoBox: {
      backgroundColor: "#f0f8ff",
      border: "1px solid #0070f3",
      borderRadius: 8,
      padding: 16,
      marginBottom: 24,
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Blockchain Integration</h1>
        <p>Loading your investments...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Blockchain Integration</h1>
      </div>

      <div style={styles.infoBox}>
        <h3>About Blockchain Integration</h3>
        <p>
          Connect your wallet to mint ERC20 tokens representing your property investments. 
          These tokens can be traded, transferred, or used in DeFi protocols while maintaining 
          compliance through KYC requirements.
        </p>
      </div>

      <div style={styles.walletSection}>
        <h2 style={styles.sectionTitle}>Wallet Connection</h2>
        <WalletConnect />
        
        {isConnected && chainId !== 80001 && (
          <div style={styles.error}>
            Please switch to Polygon Mumbai testnet to interact with property tokens.
          </div>
        )}
      </div>

      <div>
        <h2 style={styles.sectionTitle}>Your Property Investments</h2>
        
        {error && <div style={styles.error}>{error}</div>}
        
        {investments.length === 0 ? (
          <div style={styles.emptyState}>
            <h3>No investments found</h3>
            <p>You need to invest in properties before you can mint tokens.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Property</th>
                <th style={styles.th}>Shares Owned</th>
                <th style={styles.th}>Token Status</th>
                <th style={styles.th}>Blockchain Status</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((investment) => (
                <tr key={investment.id}>
                  <td style={styles.td}>{investment.property_address}</td>
                  <td style={styles.td}>{investment.shares_owned.toLocaleString()}</td>
                  <td style={styles.td}>
                    {investment.token_contract_address ? (
                      <span style={styles.mintedBadge}>Token Created</span>
                    ) : (
                      <span style={styles.noTokenBadge}>No Token</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {isTokensMinted(investment) ? (
                      <span style={styles.mintedBadge}>
                        {getTokensMinted(investment)} Tokens Minted
                      </span>
                    ) : investment.wallet_address ? (
                      <span style={styles.noTokenBadge}>Wallet Connected</span>
                    ) : (
                      <span>Not Minted</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {investment.token_contract_address && !isTokensMinted(investment) ? (
                      <button
                        onClick={() => handleMintTokens(investment)}
                        disabled={
                          !isConnected || 
                          chainId !== 80001 || 
                          mintingStates[investment.id]
                        }
                        style={{
                          ...styles.button,
                          ...(!isConnected || chainId !== 80001 || mintingStates[investment.id]
                            ? styles.disabledButton
                            : styles.mintButton)
                        }}
                      >
                        {mintingStates[investment.id] ? "Minting..." : "Mint Tokens"}
                      </button>
                    ) : investment.token_contract_address && isTokensMinted(investment) ? (
                      <span style={styles.mintedBadge}>✓ Minted</span>
                    ) : (
                      <span style={{ color: "#666", fontSize: 12 }}>
                        Token not available
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
