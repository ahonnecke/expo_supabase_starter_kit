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

export default function AdminPropertiesPage() {
  return (
    <ProtectedRoute>
      <AdminPropertiesContent />
    </ProtectedRoute>
  );
}

function AdminPropertiesContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
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
        
        if (!userIsAdmin) {
          router.push("/app/properties");
          return;
        }
        
        // Fetch properties
        let query = supabase
          .from("properties")
          .select("*");
        
        if (statusFilter !== "all") {
          query = query.eq("status", statusFilter);
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
  }, [user, statusFilter]);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
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
    headerButtons: {
      display: "flex",
      gap: 16,
    },
    filters: {
      display: "flex",
      gap: 16,
      marginBottom: 24,
    },
    filterButton: {
      padding: "8px 16px",
      border: "1px solid #ddd",
      borderRadius: 8,
      cursor: "pointer",
      backgroundColor: "#f9fafb",
    },
    activeFilter: {
      backgroundColor: "#0070f3",
      color: "white",
      borderColor: "#0070f3",
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
    actionButton: {
      padding: "6px 12px",
      border: "none",
      borderRadius: 4,
      cursor: "pointer",
      marginRight: 8,
      fontSize: 14,
    },
    reviewButton: {
      backgroundColor: "#0070f3",
      color: "white",
    },
    mintButton: {
      backgroundColor: "#4caf50",
      color: "white",
    },
    emptyState: {
      textAlign: "center" as "center",
      padding: "40px 0",
    },
  };
  
  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Admin: Property Management</h1>
        <p>Loading properties...</p>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
        <Link href="/app/properties" style={{ ...styles.actionButton, ...styles.reviewButton }}>
          Back to Properties
        </Link>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin: Property Management</h1>
        <div style={styles.headerButtons}>
          <Link href="/app/admin/blockchain/batch-mint" style={{ ...styles.actionButton, ...styles.mintButton }}>
            Batch Mint Tokens
          </Link>
          <Link href="/app/properties" style={{ ...styles.actionButton, ...styles.reviewButton }}>
            View Public Listings
          </Link>
        </div>
      </div>
      
      <div style={styles.filters}>
        <button 
          style={{ 
            ...styles.filterButton, 
            ...(statusFilter === "all" ? styles.activeFilter : {}) 
          }}
          onClick={() => setStatusFilter("all")}
        >
          All
        </button>
        <button 
          style={{ 
            ...styles.filterButton, 
            ...(statusFilter === "pending" ? styles.activeFilter : {}) 
          }}
          onClick={() => setStatusFilter("pending")}
        >
          Pending
        </button>
        <button 
          style={{ 
            ...styles.filterButton, 
            ...(statusFilter === "active" ? styles.activeFilter : {}) 
          }}
          onClick={() => setStatusFilter("active")}
        >
          Active
        </button>
        <button 
          style={{ 
            ...styles.filterButton, 
            ...(statusFilter === "sold" ? styles.activeFilter : {}) 
          }}
          onClick={() => setStatusFilter("sold")}
        >
          Sold
        </button>
      </div>
      
      {error && <p style={{ color: "crimson" }}>{error}</p>}
      
      {properties.length === 0 ? (
        <div style={styles.emptyState}>
          <h2>No properties found</h2>
          <p>There are no properties matching the selected filter.</p>
        </div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Address</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Yield</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Submitted</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id}>
                <td style={styles.td}>{property.address}</td>
                <td style={styles.td}>{formatCurrency(property.price)}</td>
                <td style={styles.td}>{property.annual_yield_percent}%</td>
                <td style={styles.td}>
                  <span style={getStatusBadge(property.status)}>
                    {property.status.charAt(0).toUpperCase() + property.status.slice(1)}
                  </span>
                </td>
                <td style={styles.td}>{formatDate(property.created_at)}</td>
                <td style={styles.td}>
                  <button 
                    style={{ ...styles.actionButton, ...styles.reviewButton }}
                    onClick={() => router.push(`/app/admin/properties/${property.id}`)}
                  >
                    {property.status === "pending" ? "Review" : "Edit"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
