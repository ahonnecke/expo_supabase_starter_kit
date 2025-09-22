"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import Link from "next/link";

interface Investment {
  property_id: string;
  property_address: string;
  shares_owned: number;
  purchase_price_per_share: number;
  total_investment: number;
  ownership_percentage: number;
  annual_yield_percent: number;
  expected_monthly_yield: number;
}

interface Dividend {
  id: string;
  property_id: string;
  property_address: string;
  amount: number;
  payment_date: string;
  status: string;
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [dividends, setDividends] = useState<Dividend[]>([]);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalDividends, setTotalDividends] = useState(0);
  const [monthlyYield, setMonthlyYield] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const supabase = createPublicClient();
        
        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from("user_profiles")
          .select("preferences")
          .eq("id", user.id)
          .single();
        
        if (!profileError && profile?.preferences?.isAdmin === true) {
          setIsAdmin(true);
        }
        
        // Fetch user's investments (ownership records)
        const { data: ownershipData, error: ownershipError } = await supabase
          .from("ownership_ledger")
          .select(`
            property_id,
            shares_owned,
            purchase_price_per_share
          `)
          .eq("user_id", user.id);
        
        if (ownershipError) throw ownershipError;
        
        if (!ownershipData || ownershipData.length === 0) {
          setInvestments([]);
          setDividends([]);
          setLoading(false);
          return;
        }
        
        // Get property details for each investment
        const propertyIds = ownershipData.map(o => o.property_id);
        const { data: propertiesData, error: propertiesError } = await supabase
          .from("properties")
          .select("id, address, annual_yield_percent, total_shares, price")
          .in("id", propertyIds);
        
        if (propertiesError) throw propertiesError;
        
        // Combine ownership and property data
        const investmentsData = ownershipData.map(ownership => {
          const property = propertiesData?.find(p => p.id === ownership.property_id);
          if (!property) return null;
          
          const totalInvestment = ownership.shares_owned * ownership.purchase_price_per_share;
          const ownershipPercentage = (ownership.shares_owned / property.total_shares) * 100;
          const expectedMonthlyYield = (property.price * (property.annual_yield_percent / 100) / 12) * (ownershipPercentage / 100);
          
          return {
            property_id: property.id,
            property_address: property.address,
            shares_owned: ownership.shares_owned,
            purchase_price_per_share: ownership.purchase_price_per_share,
            total_investment: totalInvestment,
            ownership_percentage: ownershipPercentage,
            annual_yield_percent: property.annual_yield_percent,
            expected_monthly_yield: expectedMonthlyYield
          };
        }).filter(Boolean) as Investment[];
        
        setInvestments(investmentsData);
        
        // Calculate totals
        const totalInvestedAmount = investmentsData.reduce((sum, inv) => sum + inv.total_investment, 0);
        const totalMonthlyYield = investmentsData.reduce((sum, inv) => sum + inv.expected_monthly_yield, 0);
        
        setTotalInvested(totalInvestedAmount);
        setMonthlyYield(totalMonthlyYield);
        
        // Fetch dividend distributions
        const { data: dividendData, error: dividendError } = await supabase
          .from("dividend_distributions")
          .select(`
            id,
            property_id,
            amount,
            status,
            rent_payments(payment_date)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        
        if (dividendError) throw dividendError;
        
        // Format dividend data
        const formattedDividends = dividendData?.map((dividend: any) => {
          const property = propertiesData?.find(p => p.id === dividend.property_id);
          return {
            id: dividend.id,
            property_id: dividend.property_id,
            property_address: property?.address || "Unknown Property",
            amount: dividend.amount,
            payment_date: dividend.rent_payments ? dividend.rent_payments.payment_date : null,
            status: dividend.status
          };
        }) || [];
        
        setDividends(formattedDividends);
        
        // Calculate total dividends received
        const totalDividendsReceived = formattedDividends
          .filter(d => d.status === "processed")
          .reduce((sum, d) => sum + d.amount, 0);
        
        setTotalDividends(totalDividendsReceived);
      } catch (err: any) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  const getStatusBadge = (status: string) => {
    let backgroundColor = "#f3f4f6";
    let color = "#374151";
    
    switch (status) {
      case "pending":
        backgroundColor = "#FEF9C3";
        color = "#854D0E";
        break;
      case "processed":
        backgroundColor = "#DCFCE7";
        color = "#166534";
        break;
      case "failed":
        backgroundColor = "#FEE2E2";
        color = "#991B1B";
        break;
      default:
        break;
    }
    
    return {
      display: "inline-block",
      padding: "4px 8px",
      borderRadius: "4px",
      fontSize: "12px",
      fontWeight: "bold",
      backgroundColor,
      color,
    };
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
    button: {
      padding: "10px 16px",
      backgroundColor: "#0070f3",
      color: "white",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      textDecoration: "none",
      fontSize: 14,
    },
    summaryCards: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
      gap: 24,
      marginBottom: 32,
    },
    card: {
      border: "1px solid #ddd",
      borderRadius: 8,
      padding: 24,
    },
    cardTitle: {
      fontSize: 14,
      color: "#6B7280",
      marginBottom: 8,
    },
    cardValue: {
      fontSize: 24,
      fontWeight: "bold",
    },
    section: {
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
    emptyState: {
      textAlign: "center" as "center",
      padding: "40px 0",
    },
  };
  
  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Dashboard</h1>
        <p>Loading your investment data...</p>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Investment Dashboard</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link href="/app/properties" style={styles.button}>
            Browse Properties
          </Link>
          <Link href="/app/blockchain" style={{ ...styles.button, backgroundColor: '#9c27b0' }}>
            Blockchain
          </Link>
          <Link href="/app/governance" style={{ ...styles.button, backgroundColor: '#ff9800' }}>
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
          <Link href="/app/properties/submit" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#4caf50', 
            color: 'white', 
            borderRadius: 4, 
            fontSize: 14,
            textDecoration: 'none'
          }}>
            Submit Property
          </Link>
          <Link href="/app/blockchain" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#9c27b0', 
            color: 'white', 
            borderRadius: 4, 
            fontSize: 14,
            textDecoration: 'none'
          }}>
            Blockchain
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
          <Link href="/app/governance/create" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#ff5722', 
            color: 'white', 
            borderRadius: 4, 
            fontSize: 14,
            textDecoration: 'none'
          }}>
            Create Proposal
          </Link>
          <Link href="/app/profile" style={{ 
            padding: '8px 12px', 
            backgroundColor: '#4caf50', 
            color: 'white', 
            borderRadius: 4, 
            fontSize: 14,
            textDecoration: 'none'
          }}>
            My Profile
          </Link>
        </div>
      </div>
      
      {/* Admin Features - Only visible to admin users */}
      {isAdmin && (
        <div style={{ 
          marginBottom: 24, 
          padding: 16, 
          backgroundColor: '#fff3e0', 
          borderRadius: 8,
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          border: '1px solid #ffcc80'
        }}>
          <h3 style={{ marginBottom: 12, fontSize: 16, color: '#e65100' }}>Admin Features</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <Link href="/app/admin/properties" style={{ 
              padding: '8px 12px', 
              backgroundColor: '#e65100', 
              color: 'white', 
              borderRadius: 4, 
              fontSize: 14,
              textDecoration: 'none'
            }}>
              Property Management
            </Link>
            <Link href="/app/properties/submit" style={{ 
              padding: '8px 12px', 
              backgroundColor: '#e65100', 
              color: 'white', 
              borderRadius: 4, 
              fontSize: 14,
              textDecoration: 'none'
            }}>
              Submit New Property
            </Link>
            <Link href="/app/admin/blockchain/batch-mint" style={{ 
              padding: '8px 12px', 
              backgroundColor: '#e65100', 
              color: 'white', 
              borderRadius: 4, 
              fontSize: 14,
              textDecoration: 'none'
            }}>
              Batch Mint Tokens
            </Link>
            <Link href="/app/admin/rent" style={{ 
              padding: '8px 12px', 
              backgroundColor: '#e65100', 
              color: 'white', 
              borderRadius: 4, 
              fontSize: 14,
              textDecoration: 'none'
            }}>
              Rent Management
            </Link>
          </div>
        </div>
      )}
      
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      
      <div style={styles.summaryCards}>
        <div style={styles.card}>
          <p style={styles.cardTitle}>Total Invested</p>
          <p style={styles.cardValue}>{formatCurrency(totalInvested)}</p>
        </div>
        
        <div style={styles.card}>
          <p style={styles.cardTitle}>Total Dividends Received</p>
          <p style={styles.cardValue}>{formatCurrency(totalDividends)}</p>
        </div>
        
        <div style={styles.card}>
          <p style={styles.cardTitle}>Expected Monthly Yield</p>
          <p style={styles.cardValue}>{formatCurrency(monthlyYield)}</p>
        </div>
        
        <div style={styles.card}>
          <p style={styles.cardTitle}>Annual Yield</p>
          <p style={styles.cardValue}>{formatCurrency(monthlyYield * 12)}</p>
        </div>
      </div>
      
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Your Investments</h2>
        
        {investments.length === 0 ? (
          <div style={styles.emptyState}>
            <h3>No investments yet</h3>
            <p>Start investing in properties to build your portfolio.</p>
            <Link href="/app/properties" style={{ ...styles.button, marginTop: 16, display: "inline-block" }}>
              Browse Properties
            </Link>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Property</th>
                <th style={styles.th}>Shares</th>
                <th style={styles.th}>Investment</th>
                <th style={styles.th}>Ownership</th>
                <th style={styles.th}>Monthly Yield</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((investment) => (
                <tr key={investment.property_id}>
                  <td style={styles.td}>{investment.property_address}</td>
                  <td style={styles.td}>{investment.shares_owned.toLocaleString()}</td>
                  <td style={styles.td}>{formatCurrency(investment.total_investment)}</td>
                  <td style={styles.td}>{investment.ownership_percentage.toFixed(4)}%</td>
                  <td style={styles.td}>{formatCurrency(investment.expected_monthly_yield)}</td>
                  <td style={styles.td}>
                    <Link 
                      href={`/app/properties/${investment.property_id}`} 
                      style={{ ...styles.button, padding: "6px 12px", fontSize: 12 }}
                    >
                      View Property
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recent Dividends</h2>
        
        {dividends.length === 0 ? (
          <div style={styles.emptyState}>
            <h3>No dividends yet</h3>
            <p>Dividends are distributed monthly based on your property ownership.</p>
          </div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Property</th>
                <th style={styles.th}>Amount</th>
                <th style={styles.th}>Payment Date</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {dividends.map((dividend) => (
                <tr key={dividend.id}>
                  <td style={styles.td}>{dividend.property_address}</td>
                  <td style={styles.td}>{formatCurrency(dividend.amount)}</td>
                  <td style={styles.td}>{formatDate(dividend.payment_date)}</td>
                  <td style={styles.td}>
                    <span style={getStatusBadge(dividend.status)}>
                      {dividend.status.charAt(0).toUpperCase() + dividend.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Feature Summary Section */}
      <div style={{
        marginTop: 32,
        padding: 24,
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}>
        <h2 style={{
          fontSize: 20,
          fontWeight: 'bold',
          marginBottom: 16,
          color: '#333',
          borderBottom: '2px solid #0070f3',
          paddingBottom: '0.5rem',
          display: 'inline-block'
        }}>Platform Features</h2>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
          gap: 16,
          marginTop: 16
        }}>
          <div style={{
            padding: 16,
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#0070f3' }}>Property Investment</h3>
            <p style={{ fontSize: 14, color: '#666' }}>Browse and invest in fractional real estate properties with transparent yield information.</p>
          </div>
          
          <div style={{
            padding: 16,
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#9c27b0' }}>Blockchain Integration</h3>
            <p style={{ fontSize: 14, color: '#666' }}>Connect your wallet and manage property tokens on the Polygon Mumbai testnet.</p>
          </div>
          
          <div style={{
            padding: 16,
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#ff9800' }}>Governance</h3>
            <p style={{ fontSize: 14, color: '#666' }}>Create and vote on property proposals with weighted voting based on token ownership.</p>
          </div>
          
          <div style={{
            padding: 16,
            backgroundColor: 'white',
            borderRadius: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#4caf50' }}>Lockup Periods</h3>
            <p style={{ fontSize: 14, color: '#666' }}>Tokens can be locked for a specified period, preventing transfers until the lockup expires.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
