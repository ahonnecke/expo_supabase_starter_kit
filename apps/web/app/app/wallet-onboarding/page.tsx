"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import { WalletProvider, useWallet } from "@rentinity/blockchain";
import Link from "next/link";

export default function WalletOnboardingPage() {
  return (
    <WalletProvider>
      <ProtectedRoute>
        <WalletOnboardingContent />
      </ProtectedRoute>
    </WalletProvider>
  );
}

function WalletOnboardingContent() {
  const { user } = useAuth();
  const router = useRouter();
  const { 
    isConnected, 
    address, 
    chainId, 
    connectWallet, 
    disconnectWallet, 
    switchNetwork 
  } = useWallet();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [investments, setInvestments] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchInvestments = async () => {
      try {
        setLoading(true);
        const supabase = createPublicClient();
        
        // Fetch user's investments
        const { data, error: fetchError } = await supabase
          .from("ownership_ledger")
          .select(`
            id,
            property_id,
            shares_owned,
            wallet_address,
            properties!inner(
              address
            )
          `)
          .eq("user_id", user.id);
        
        if (fetchError) throw fetchError;
        
        setInvestments(data || []);
        
        // Check if user already has a connected wallet
        const hasConnectedWallet = data?.some(investment => investment.wallet_address);
        if (hasConnectedWallet) {
          setCurrentStep(3);
        }
      } catch (err: any) {
        console.error("Error fetching investments:", err);
        setError(err.message || "Failed to load investments");
      } finally {
        setLoading(false);
      }
    };
    
    fetchInvestments();
  }, [user]);
  
  const handleConnectWallet = async () => {
    try {
      setError(null);
      await connectWallet();
      setCurrentStep(2);
    } catch (err: any) {
      console.error("Error connecting wallet:", err);
      setError(err.message || "Failed to connect wallet");
    }
  };
  
  const handleSwitchNetwork = async () => {
    try {
      setError(null);
      await switchNetwork(80001); // Switch to Polygon Mumbai Testnet
    } catch (err: any) {
      console.error("Error switching network:", err);
      setError(err.message || "Failed to switch network");
    }
  };
  
  const handleSaveWalletAddress = async () => {
    if (!isConnected || !address || !user) {
      setError("Please connect your wallet first");
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const supabase = createPublicClient();
      
      // Update all investments with the wallet address
      const { error: updateError } = await supabase
        .from("ownership_ledger")
        .update({ wallet_address: address })
        .eq("user_id", user.id);
      
      if (updateError) throw updateError;
      
      setSuccess("Wallet address saved successfully!");
      setCurrentStep(3);
      
      // Refresh investments
      const { data: refreshedData, error: refreshError } = await supabase
        .from("ownership_ledger")
        .select(`
          id,
          property_id,
          shares_owned,
          wallet_address,
          properties!inner(
            address
          )
        `)
        .eq("user_id", user.id);
      
      if (!refreshError) {
        setInvestments(refreshedData || []);
      }
    } catch (err: any) {
      console.error("Error saving wallet address:", err);
      setError(err.message || "Failed to save wallet address");
    } finally {
      setSaving(false);
    }
  };
  
  const getStepStyle = (step: number) => {
    return {
      ...styles.step,
      ...(currentStep === step ? styles.activeStep : {}),
      ...(currentStep > step ? styles.completedStep : {})
    };
  };
  
  const styles = {
    container: {
      padding: 24,
      maxWidth: 800,
      margin: "0 auto",
    },
    header: {
      marginBottom: 32,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold" as "bold",
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: "#666",
      marginBottom: 24,
    },
    stepsContainer: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 40,
      position: "relative" as "relative",
    },
    stepsLine: {
      position: "absolute" as "absolute",
      top: "50%",
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: "#eee",
      zIndex: -1,
    },
    step: {
      display: "flex",
      flexDirection: "column" as "column",
      alignItems: "center",
      width: 120,
    },
    stepNumber: {
      width: 32,
      height: 32,
      borderRadius: "50%",
      backgroundColor: "#eee",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
      fontWeight: "bold" as "bold",
      color: "#666",
    },
    activeStep: {
      fontWeight: "bold" as "bold",
      color: "#0070f3",
    },
    activeStepNumber: {
      backgroundColor: "#0070f3",
      color: "white",
    },
    completedStep: {
      color: "#4caf50",
    },
    completedStepNumber: {
      backgroundColor: "#4caf50",
      color: "white",
    },
    stepTitle: {
      fontSize: 14,
      textAlign: "center" as "center",
    },
    section: {
      marginBottom: 32,
      padding: 24,
      border: "1px solid #eee",
      borderRadius: 8,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold" as "bold",
      marginBottom: 16,
    },
    walletInfo: {
      display: "flex",
      alignItems: "center",
      gap: 16,
      marginBottom: 16,
    },
    walletAddress: {
      padding: "8px 12px",
      backgroundColor: "#f5f5f5",
      borderRadius: 4,
      fontSize: 14,
      fontFamily: "monospace",
    },
    button: {
      padding: "10px 16px",
      borderRadius: 4,
      border: "none",
      cursor: "pointer",
      fontSize: 14,
      fontWeight: "bold" as "bold",
    },
    primaryButton: {
      backgroundColor: "#0070f3",
      color: "white",
    },
    secondaryButton: {
      backgroundColor: "#f5f5f5",
      color: "#333",
      border: "1px solid #ddd",
    },
    disabledButton: {
      backgroundColor: "#cccccc",
      cursor: "not-allowed",
    },
    warningButton: {
      backgroundColor: "#ff9800",
      color: "white",
    },
    error: {
      color: "crimson",
      marginBottom: 16,
      padding: 12,
      backgroundColor: "#ffebee",
      borderRadius: 4,
    },
    success: {
      color: "#4caf50",
      marginBottom: 16,
      padding: 12,
      backgroundColor: "#e8f5e9",
      borderRadius: 4,
    },
    warning: {
      color: "#ff9800",
      marginBottom: 16,
      padding: 12,
      backgroundColor: "#fff3e0",
      borderRadius: 4,
    },
    infoBox: {
      backgroundColor: "#e3f2fd",
      padding: 16,
      borderRadius: 8,
      marginBottom: 24,
    },
    table: {
      width: "100%",
      borderCollapse: "collapse" as "collapse",
      marginTop: 16,
    },
    th: {
      textAlign: "left" as "left",
      padding: "12px 8px",
      borderBottom: "2px solid #eee",
      fontWeight: "bold" as "bold",
    },
    td: {
      padding: "12px 8px",
      borderBottom: "1px solid #eee",
    },
    badge: {
      padding: "4px 8px",
      borderRadius: 4,
      fontSize: 12,
      fontWeight: "bold" as "bold",
    },
    connectedBadge: {
      backgroundColor: "#4caf50",
      color: "white",
    },
    pendingBadge: {
      backgroundColor: "#ff9800",
      color: "white",
    },
    backLink: {
      display: "flex",
      alignItems: "center",
      color: "#0070f3",
      textDecoration: "none",
      fontSize: 14,
      marginBottom: 16,
    },
  };
  
  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Wallet Onboarding</h1>
        <p>Loading...</p>
      </div>
    );
  }
  
  if (investments.length === 0) {
    return (
      <div style={styles.container}>
        <h1>Wallet Onboarding</h1>
        <div style={styles.warning}>
          You don't have any property investments yet. Purchase shares in a property to get started.
        </div>
        <Link href="/app/properties" style={styles.backLink}>
          &larr; Browse Properties
        </Link>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Wallet Onboarding</h1>
        <p style={styles.subtitle}>
          Connect your blockchain wallet to access your property tokens
        </p>
      </div>
      
      <div style={styles.stepsContainer}>
        <div style={styles.stepsLine}></div>
        
        <div style={getStepStyle(1)}>
          <div style={{
            ...styles.stepNumber,
            ...(currentStep === 1 ? styles.activeStepNumber : {}),
            ...(currentStep > 1 ? styles.completedStepNumber : {})
          }}>
            {currentStep > 1 ? "✓" : "1"}
          </div>
          <div style={styles.stepTitle}>Connect Wallet</div>
        </div>
        
        <div style={getStepStyle(2)}>
          <div style={{
            ...styles.stepNumber,
            ...(currentStep === 2 ? styles.activeStepNumber : {}),
            ...(currentStep > 2 ? styles.completedStepNumber : {})
          }}>
            {currentStep > 2 ? "✓" : "2"}
          </div>
          <div style={styles.stepTitle}>Save Address</div>
        </div>
        
        <div style={getStepStyle(3)}>
          <div style={{
            ...styles.stepNumber,
            ...(currentStep === 3 ? styles.activeStepNumber : {})
          }}>
            {currentStep > 3 ? "✓" : "3"}
          </div>
          <div style={styles.stepTitle}>Complete</div>
        </div>
      </div>
      
      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}
      
      {currentStep === 1 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Step 1: Connect Your Wallet</h2>
          
          <div style={styles.infoBox}>
            <p>
              To access your property tokens on the blockchain, you need to connect a Web3 wallet like MetaMask.
              This will allow you to view and transfer your tokens.
            </p>
          </div>
          
          {!isConnected ? (
            <button 
              onClick={handleConnectWallet}
              style={{
                ...styles.button,
                ...styles.primaryButton
              }}
            >
              Connect Wallet
            </button>
          ) : (
            <div>
              <div style={styles.walletInfo}>
                <span>Connected Wallet:</span>
                <span style={styles.walletAddress}>
                  {address?.substring(0, 6)}...{address?.substring(address.length - 4)}
                </span>
              </div>
              
              {chainId !== 80001 && (
                <div style={styles.warning}>
                  Please switch to the Polygon Mumbai Testnet to continue.
                  <button 
                    onClick={handleSwitchNetwork}
                    style={{
                      ...styles.button,
                      ...styles.warningButton,
                      marginLeft: 16
                    }}
                  >
                    Switch Network
                  </button>
                </div>
              )}
              
              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                <button 
                  onClick={() => setCurrentStep(2)}
                  style={{
                    ...styles.button,
                    ...styles.primaryButton,
                    ...(chainId !== 80001 ? styles.disabledButton : {})
                  }}
                  disabled={chainId !== 80001}
                >
                  Continue
                </button>
                
                <button 
                  onClick={disconnectWallet}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton
                  }}
                >
                  Disconnect
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      
      {currentStep === 2 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Step 2: Save Your Wallet Address</h2>
          
          <div style={styles.infoBox}>
            <p>
              Your wallet address will be associated with your property investments.
              This will allow you to receive your property tokens on the blockchain.
            </p>
          </div>
          
          <div style={styles.walletInfo}>
            <span>Wallet Address:</span>
            <span style={styles.walletAddress}>
              {address}
            </span>
          </div>
          
          <div style={{ marginTop: 24 }}>
            <h3>Your Property Investments</h3>
            <p>
              The following properties will be associated with this wallet address:
            </p>
            
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Property</th>
                  <th style={styles.th}>Shares Owned</th>
                </tr>
              </thead>
              <tbody>
                {investments.map(investment => (
                  <tr key={investment.id}>
                    <td style={styles.td}>{investment.properties.address}</td>
                    <td style={styles.td}>{investment.shares_owned}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
            <button 
              onClick={handleSaveWalletAddress}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                ...(saving ? styles.disabledButton : {})
              }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Wallet Address"}
            </button>
            
            <button 
              onClick={() => setCurrentStep(1)}
              style={{
                ...styles.button,
                ...styles.secondaryButton,
                ...(saving ? styles.disabledButton : {})
              }}
              disabled={saving}
            >
              Back
            </button>
          </div>
        </div>
      )}
      
      {currentStep === 3 && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Step 3: Onboarding Complete</h2>
          
          <div style={styles.success}>
            <p>
              <strong>Congratulations!</strong> Your wallet has been successfully connected to your account.
            </p>
          </div>
          
          <div style={styles.infoBox}>
            <p>
              Your wallet address is now associated with your property investments.
              You can now view and manage your property tokens on the blockchain.
            </p>
          </div>
          
          <div style={{ marginTop: 24 }}>
            <h3>Your Connected Properties</h3>
            
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Property</th>
                  <th style={styles.th}>Shares Owned</th>
                  <th style={styles.th}>Wallet Status</th>
                </tr>
              </thead>
              <tbody>
                {investments.map(investment => (
                  <tr key={investment.id}>
                    <td style={styles.td}>{investment.properties.address}</td>
                    <td style={styles.td}>{investment.shares_owned}</td>
                    <td style={styles.td}>
                      {investment.wallet_address ? (
                        <span style={{ ...styles.badge, ...styles.connectedBadge }}>
                          Connected
                        </span>
                      ) : (
                        <span style={{ ...styles.badge, ...styles.pendingBadge }}>
                          Not Connected
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div style={{ marginTop: 24, display: "flex", gap: 8 }}>
            <Link href="/app/blockchain">
              <button 
                style={{
                  ...styles.button,
                  ...styles.primaryButton
                }}
              >
                Go to Blockchain Dashboard
              </button>
            </Link>
            
            {isConnected && address && (
              <button 
                onClick={disconnectWallet}
                style={{
                  ...styles.button,
                  ...styles.secondaryButton
                }}
              >
                Disconnect Wallet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
