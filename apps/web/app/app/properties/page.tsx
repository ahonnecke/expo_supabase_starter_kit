"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import Link from "next/link";

interface Property {
  id: string;
  address: string;
  price: number;
  lease_term_months: number;
  annual_yield_percent: number;
  total_shares: number;
  status: string;
  created_at: string;
}

export default function PropertiesPage() {
  return (
    <ProtectedRoute>
      <PropertiesContent />
    </ProtectedRoute>
  );
}

function PropertiesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
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
        
        if (profileError) throw profileError;
        
        const userIsAdmin = profile?.preferences?.isAdmin === true;
        setIsAdmin(userIsAdmin);
        
        // Fetch properties
        let query = supabase
          .from("properties")
          .select("*");
        
        // If not admin, only show approved properties
        if (!userIsAdmin) {
          query = query.eq("status", "active");
        }
        
        const { data, error: fetchError } = await query.order("created_at", { ascending: false });
        
        if (fetchError) throw fetchError;
        
        setProperties(data || []);
      } catch (err: any) {
        setError(err.message || "Failed to load properties");
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const getStatusBadge = (status: string) => {
    let backgroundColor = "#f3f4f6";
    let color = "#374151";
    
    switch (status) {
      case "pending":
        backgroundColor = "#FEF9C3";
        color = "#854D0E";
        break;
      case "active":
        backgroundColor = "#DCFCE7";
        color = "#166534";
        break;
      case "sold":
        backgroundColor = "#DBEAFE";
        color = "#1E40AF";
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
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))",
      gap: 24,
    },
    card: {
      border: "1px solid #ddd",
      borderRadius: 8,
      overflow: "hidden",
    },
    cardImage: {
      height: 200,
      backgroundColor: "#f3f4f6",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#9ca3af",
    },
    cardContent: {
      padding: 16,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 8,
    },
    cardPrice: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 16,
    },
    cardDetail: {
      display: "flex",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    cardActions: {
      marginTop: 16,
      display: "flex",
      justifyContent: "space-between",
    },
    viewButton: {
      padding: "8px 16px",
      backgroundColor: "#0070f3",
      color: "white",
      border: "none",
      borderRadius: 4,
      cursor: "pointer",
      textDecoration: "none",
      fontSize: 14,
    },
    emptyState: {
      textAlign: "center" as "center",
      padding: "40px 0",
    },
  };
  
  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Properties</h1>
        <p>Loading properties...</p>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Properties</h1>
        {isAdmin && (
          <Link href="/app/properties/submit" style={styles.button}>
            Submit New Property
          </Link>
        )}
      </div>
      
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      
      {properties.length === 0 ? (
        <div style={styles.emptyState}>
          <h2>No properties available</h2>
          <p>Check back later for new investment opportunities.</p>
          {isAdmin && (
            <Link href="/app/properties/submit" style={{ ...styles.button, marginTop: 16, display: "inline-block" }}>
              Submit New Property
            </Link>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {properties.map((property) => (
            <div key={property.id} style={styles.card}>
              <div style={styles.cardImage}>
                Property Image
              </div>
              <div style={styles.cardContent}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <h2 style={styles.cardTitle}>{property.address}</h2>
                  <span style={getStatusBadge(property.status)}>
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </span>
                </div>
                <p style={styles.cardPrice}>{formatCurrency(property.price)}</p>
                
                <div style={styles.cardDetail}>
                  <span>Annual Yield</span>
                  <span>{property.annual_yield_percent}%</span>
                </div>
                
                <div style={styles.cardDetail}>
                  <span>Lease Term</span>
                  <span>{property.lease_term_months} months</span>
                </div>
                
                <div style={styles.cardDetail}>
                  <span>Share Price</span>
                  <span>{formatCurrency(property.price / property.total_shares)}</span>
                </div>
                
                <div style={styles.cardActions}>
                  <Link href={`/app/properties/${property.id}`} style={styles.viewButton}>
                    View Details
                  </Link>
                  
                  {isAdmin && property.status === "pending" && (
                    <button 
                      style={{ ...styles.viewButton, backgroundColor: "#10B981" }}
                      onClick={() => router.push(`/app/admin/properties/${property.id}`)}
                    >
                      Review
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
