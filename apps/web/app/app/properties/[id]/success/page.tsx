"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import Link from "next/link";

interface Property {
  id: string;
  address: string;
  price: number;
  annual_yield_percent: number;
  total_shares: number;
}

export default function InvestmentSuccessPage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <InvestmentSuccessContent id={params.id} />
    </ProtectedRoute>
  );
}

function InvestmentSuccessContent({ id }: { id: string }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  
  const amount = searchParams.get('amount');
  const shares = searchParams.get('shares');
  
  useEffect(() => {
    if (!user || !id) return;
    
    const fetchData = async () => {
      try {
        setLoading(true);
        const supabase = createPublicClient();
        
        // Fetch property details
        const { data: propertyData, error: propertyError } = await supabase
          .from("properties")
          .select("id, address, price, annual_yield_percent, total_shares")
          .eq("id", id)
          .single();
        
        if (propertyError) throw propertyError;
        
        setProperty(propertyData);
      } catch (err: any) {
        setError(err.message || "Failed to load property details");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user, id]);
  
  const formatCurrency = (amount: number | string) => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const styles = {
    container: {
      padding: 24,
      maxWidth: 800,
      margin: "0 auto",
      textAlign: "center" as "center",
    },
    successIcon: {
      fontSize: 64,
      color: "#10B981",
      marginBottom: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: "bold",
      marginBottom: 16,
    },
    subtitle: {
      fontSize: 18,
      color: "#4B5563",
      marginBottom: 32,
    },
    card: {
      border: "1px solid #ddd",
      borderRadius: 8,
      padding: 24,
      marginBottom: 32,
      textAlign: "left" as "left",
    },
    detailRow: {
      display: "flex",
      justifyContent: "space-between",
      padding: "12px 0",
      borderBottom: "1px solid #eee",
    },
    button: {
      padding: "12px 24px",
      backgroundColor: "#0070f3",
      color: "white",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 16,
      textDecoration: "none",
      display: "inline-block",
      margin: "0 8px",
    },
    secondaryButton: {
      padding: "12px 24px",
      backgroundColor: "#f3f4f6",
      color: "#374151",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 16,
      textDecoration: "none",
      display: "inline-block",
      margin: "0 8px",
    },
  };
  
  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Investment Confirmation</h1>
        <p>Loading investment details...</p>
      </div>
    );
  }
  
  if (!property) {
    return (
      <div style={styles.container}>
        <h1>Property Not Found</h1>
        <p>The property you invested in could not be found.</p>
        <Link href="/app/properties" style={styles.button}>
          Browse Properties
        </Link>
      </div>
    );
  }
  
  const sharePrice = property.price / property.total_shares;
  const monthlyYield = (property.price * (property.annual_yield_percent / 100)) / 12;
  const shareMonthlyYield = monthlyYield / property.total_shares;
  const sharesNum = shares ? parseInt(shares) : 0;
  
  return (
    <div style={styles.container}>
      <div style={styles.successIcon}>✓</div>
      <h1 style={styles.title}>Investment Successful!</h1>
      <p style={styles.subtitle}>
        Your investment in {property.address} has been processed successfully.
      </p>
      
      <div style={styles.card}>
        <h2>Investment Summary</h2>
        
        <div style={styles.detailRow}>
          <span>Property</span>
          <span>{property.address}</span>
        </div>
        
        <div style={styles.detailRow}>
          <span>Shares Purchased</span>
          <span>{sharesNum.toLocaleString()}</span>
        </div>
        
        <div style={styles.detailRow}>
          <span>Share Price</span>
          <span>{formatCurrency(sharePrice)}</span>
        </div>
        
        <div style={styles.detailRow}>
          <span>Total Investment</span>
          <span>{amount ? formatCurrency(amount) : 'N/A'}</span>
        </div>
        
        <div style={styles.detailRow}>
          <span>Expected Monthly Yield</span>
          <span>{formatCurrency(sharesNum * shareMonthlyYield)}</span>
        </div>
        
        <div style={styles.detailRow}>
          <span>Expected Annual Yield</span>
          <span>{formatCurrency(sharesNum * shareMonthlyYield * 12)}</span>
        </div>
        
        <div style={styles.detailRow}>
          <span>Ownership Percentage</span>
          <span>{((sharesNum / property.total_shares) * 100).toFixed(4)}%</span>
        </div>
        
        <div style={styles.detailRow}>
          <span>Lockup Period</span>
          <span>60 days</span>
        </div>
      </div>
      
      <p>
        You will receive your first dividend payment at the end of the current month.
        Your investment is subject to a 60-day lockup period before it can be traded.
      </p>
      
      <div style={{ marginTop: 32 }}>
        <Link href={`/app/properties/${property.id}`} style={styles.secondaryButton}>
          Back to Property
        </Link>
        <Link href="/app/properties" style={styles.button}>
          Browse More Properties
        </Link>
      </div>
    </div>
  );
}
