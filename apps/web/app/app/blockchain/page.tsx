"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import { WalletProvider, useWallet } from "@rentinity/blockchain";
import WalletConnect from "../../components/WalletConnect";
import TransferTokens from "../../components/TransferTokens";
import Link from "next/link";

interface Investment {
  id: string;
  property_id: string;
  property_address: string;
  shares_owned: number;
  wallet_address: string | null;
  token_contract_address: string | null;
  lockup_end_date?: string | null;
  onChainBalance?: string;
  metadata?: any;
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
  const [tokenBalances, setTokenBalances] = useState<Record<string, string>>({});
  const [showTransfer, setShowTransfer] = useState(false);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

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
            lockup_end_date,
            metadata,
            properties!inner(
              address,
              token_contract_address
            )
          `)
          .eq("user_id", user.id);
        
        if (fetchError) throw fetchError;
        
        // Add type assertion to fix TypeScript errors
        const formattedInvestments = data?.map((item: any) => ({
          id: item.id,
          property_id: item.property_id,
          property_address: item.properties.address,
          shares_owned: item.shares_owned,
          wallet_address: item.wallet_address,
          token_contract_address: item.properties.token_contract_address,
          lockup_end_date: item.lockup_end_date,
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

  // Fetch token balances from blockchain when wallet is connected
  useEffect(() => {
    if (!isConnected || !address || investments.length === 0) return;
    if (!blockchainService) return;
    
    const fetchTokenBalances = async () => {
      try {
        const balances: Record<string, string> = {};
        
        for (const investment of investments) {
          if (investment.token_contract_address) {
            try {
              const balance = await blockchainService.getTokenBalance(
                investment.token_contract_address,
                address
              );
              
              balances[investment.id] = blockchainService.formatTokenAmount(balance, 18);
            } catch (err) {
              console.error(`Error fetching balance for ${investment.id}:`, err);
              balances[investment.id] = '0';
            }
          }
        }
        
        setTokenBalances(balances);
      } catch (err) {
        console.error('Error fetching token balances:', err);
      }
    };
    
    fetchTokenBalances();
  }, [isConnected, address, investments, blockchainService]);

  const handleTransferComplete = () => {
    // Refresh token balances 
    setShowTransfer(false);
    setSelectedInvestment(null);
    // Re-fetch investments to get updated state
    if (user) {
      fetchInvestments();
    }
  };

  const fetchInvestments = async () => {
    if (!user) return;
    
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
      
      // Add type assertion to fix TypeScript errors
      const formattedInvestments = data?.map((item: any) => ({
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

  const handleShowTransfer = (investment: Investment) => {
    setSelectedInvestment(investment);
    setShowTransfer(true);
  };

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
        // Enhanced error handling with more specific messages
        if (data.code === 'UNAUTHORIZED') {
          throw new Error('You do not have permission to mint tokens for this property');
        } else if (data.code === 'ALREADY_MINTED') {
          throw new Error('Tokens have already been minted for this investment');
        } else if (data.code === 'CONTRACT_ERROR') {
          throw new Error(`Smart contract error: ${data.error || 'Unknown contract error'}`);
        } else {
          throw new Error(data.error || "Failed to mint tokens");
        }
      }

      // Update the investment in state
      setInvestments(prev => prev.map(inv => 
        inv.id === investment.id 
          ? { ...inv, wallet_address: address, metadata: { ...inv.metadata, tokens_minted: investment.shares_owned } }
          : inv
      ));

      // Show success message with transaction details and link
      const txHash = data.transactionHash;
      const explorerUrl = blockchainService?.getTransactionUrl(txHash) || 
                         `https://mumbai.polygonscan.com/tx/${txHash}`;
      
      // Create a styled success message
      const successElement = document.createElement('div');
      successElement.innerHTML = `
        <div style="padding: 16px; background-color: #d4edda; color: #155724; border-radius: 4px; margin-bottom: 16px;">
          <h4 style="margin-top: 0;">Transaction Successful!</h4>
          <p>Successfully minted ${investment.shares_owned} tokens for property at ${investment.property_address}</p>
          <p>Transaction Hash: <a href="${explorerUrl}" target="_blank" rel="noopener noreferrer">${txHash.substring(0, 10)}...${txHash.substring(txHash.length - 8)}</a></p>
        </div>
      `;
      
      // Replace the alert with a more user-friendly notification
      const container = document.querySelector('#blockchain-container');
      if (container) {
        container.prepend(successElement);
        // Auto-remove after 10 seconds
        setTimeout(() => successElement.remove(), 10000);
      } else {
        // Fallback to alert if container not found
        alert(`Successfully minted ${investment.shares_owned} tokens! Transaction: ${txHash}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to mint tokens");
      
      // Show error in a more user-friendly way
      const errorElement = document.createElement('div');
      errorElement.innerHTML = `
        <div style="padding: 16px; background-color: #f8d7da; color: #721c24; border-radius: 4px; margin-bottom: 16px;">
          <h4 style="margin-top: 0;">Transaction Failed</h4>
          <p>${err.message || "Failed to mint tokens"}</p>
          <button style="background: none; border: none; color: #721c24; text-decoration: underline; cursor: pointer; padding: 0;" 
                  onclick="this.parentElement.remove()">
            Dismiss
          </button>
        </div>
      `;
      
      const container = document.querySelector('#blockchain-container');
      if (container) {
        container.prepend(errorElement);
      }
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

  const isLocked = (investment: Investment): boolean => {
    if (!investment.lockup_end_date) return false;
    const lockupEndDate = new Date(investment.lockup_end_date);
    const currentDate = new Date();
    return currentDate < lockupEndDate;
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
    navLinks: {
      display: "flex",
      gap: 16,
    },
    navLink: {
      color: "#0070f3",
      textDecoration: "none",
      fontSize: 14,
      padding: "8px 16px",
      borderRadius: 4,
      border: "1px solid #0070f3",
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
    lockupBadge: {
      backgroundColor: "#ff9800",
      color: "white",
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 12,
    },
    unlockBadge: {
      backgroundColor: "#4caf50",
      color: "white",
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 12,
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
    <div id="blockchain-container" style={styles.container}>
      <div style={styles.header}>
        <h1>Blockchain Integration</h1>
        <div style={styles.navLinks}>
          <Link href="/app/dashboard" style={styles.navLink}>
            Dashboard
          </Link>
          <Link href="/app/wallet-onboarding" style={styles.navLink}>
            Wallet Onboarding
          </Link>
          <Link href="/app/governance" style={styles.navLink}>
            Governance
          </Link>
        </div>
      </div>
      
      {/* Navigation Menu */}
      <div style={{ 
        marginBottom: 24, 
        padding: 16, 
        backgroundColor: '#f5f5f5', 
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ marginBottom: 12, fontSize: 16 }}>Quick Navigation</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/app/dashboard" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#0070f3', 
            color: 'white', 
            borderRadius: 4, 
            fontSize: 14,
            textDecoration: 'none'
          }}>
            Dashboard
          </Link>
          <Link href="/app/properties" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#34a853', 
            color: 'white', 
            borderRadius: 4, 
            fontSize: 14,
            textDecoration: 'none'
          }}>
            Properties
          </Link>
          <Link href="/app/wallet-onboarding" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#673ab7', 
            color: 'white', 
            borderRadius: 4, 
            fontSize: 14,
            textDecoration: 'none'
          }}>
            Wallet Onboarding
          </Link>
          <Link href="/app/governance" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#ff9800', 
            color: 'white', 
            borderRadius: 4, 
            fontSize: 14,
            textDecoration: 'none'
          }}>
            Governance
          </Link>
        </div>
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
                <th style={styles.th}>Token Balance</th>
                <th style={styles.th}>Lockup Period</th>
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
                    {isConnected && investment.token_contract_address ? (
                      <span>{tokenBalances[investment.id] || '0'}</span>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    {investment.lockup_end_date ? (
                      <span style={isLocked(investment) ? styles.lockupBadge : styles.unlockBadge}>
                        {isLocked(investment) ? 
                          `Locked until ${new Date(investment.lockup_end_date).toLocaleDateString()}` : 
                          'Unlocked'}
                      </span>
                    ) : (
                      <span>No lockup</span>
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
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <span style={styles.mintedBadge}>✓ Minted</span>
                        <button
                          onClick={() => handleShowTransfer(investment)}
                          disabled={!isConnected || chainId !== 80001 || isLocked(investment)}
                          style={{
                            ...styles.button,
                            backgroundColor: '#4caf50',
                            ...(!isConnected || chainId !== 80001 || isLocked(investment) ? styles.disabledButton : {})
                          }}
                          title={isLocked(investment) ? `Tokens locked until ${new Date(investment.lockup_end_date!).toLocaleDateString()}` : ''}
                        >
                          Transfer
                        </button>
                      </div>
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
      
      {showTransfer && selectedInvestment && (
        <TransferTokens
          propertyId={selectedInvestment.property_id}
          tokenAddress={selectedInvestment.token_contract_address}
          walletAddress={selectedInvestment.wallet_address}
          onTransferComplete={handleTransferComplete}
        />
      )}
    </div>
  );
}
