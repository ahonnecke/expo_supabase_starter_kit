"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";

export default function PropertySubmissionPage() {
  return (
    <ProtectedRoute>
      <PropertySubmissionContent />
    </ProtectedRoute>
  );
}

function PropertySubmissionContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [leaseTerm, setLeaseTerm] = useState("");
  const [tenantInfo, setTenantInfo] = useState("");
  const [annualYield, setAnnualYield] = useState("");
  const [totalShares, setTotalShares] = useState("100000"); // Default to 100,000 shares
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Validate inputs
      const priceValue = parseFloat(price);
      const leaseTermValue = parseInt(leaseTerm);
      const annualYieldValue = parseFloat(annualYield);
      const totalSharesValue = parseInt(totalShares);
      
      if (isNaN(priceValue) || priceValue <= 0) {
        throw new Error("Please enter a valid price");
      }
      
      if (isNaN(leaseTermValue) || leaseTermValue <= 0) {
        throw new Error("Please enter a valid lease term");
      }
      
      if (isNaN(annualYieldValue) || annualYieldValue <= 0) {
        throw new Error("Please enter a valid annual yield percentage");
      }
      
      if (isNaN(totalSharesValue) || totalSharesValue <= 0) {
        throw new Error("Please enter a valid number of total shares");
      }
      
      // Parse tenant info as JSON
      let tenantInfoJson = {};
      try {
        tenantInfoJson = JSON.parse(tenantInfo || "{}");
      } catch (err) {
        tenantInfoJson = { description: tenantInfo };
      }
      
      const supabase = createPublicClient();
      
      // Submit property
      const { data, error: submitError } = await supabase
        .from("properties")
        .insert({
          address,
          price: priceValue,
          lease_term_months: leaseTermValue,
          tenant_info: tenantInfoJson,
          annual_yield_percent: annualYieldValue,
          total_shares: totalSharesValue,
          status: "pending",
          metadata: {
            submitted_by: user?.id,
            submitted_at: new Date().toISOString()
          }
        })
        .select();
      
      if (submitError) throw submitError;
      
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        router.push("/app/properties");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to submit property");
    } finally {
      setLoading(false);
    }
  };
  
  const styles = {
    container: {
      padding: 24,
      maxWidth: 800,
      margin: "0 auto",
    },
    form: {
      display: "flex",
      flexDirection: "column" as "column",
      gap: 16,
    },
    formGroup: {
      display: "flex",
      flexDirection: "column" as "column",
      gap: 8,
    },
    label: {
      fontWeight: "bold" as "bold",
    },
    input: {
      padding: 12,
      border: "1px solid #ddd",
      borderRadius: 8,
      fontSize: 16,
    },
    textarea: {
      padding: 12,
      border: "1px solid #ddd",
      borderRadius: 8,
      fontSize: 16,
      minHeight: 100,
      resize: "vertical" as "vertical",
    },
    button: {
      padding: "12px 24px",
      backgroundColor: "#0070f3",
      color: "white",
      border: "none",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 16,
      marginTop: 16,
    },
    disabledButton: {
      backgroundColor: "#cccccc",
      cursor: "not-allowed",
    },
    error: {
      color: "crimson",
      marginTop: 16,
    },
    success: {
      color: "green",
      marginTop: 16,
    },
    infoText: {
      fontSize: 14,
      color: "#666",
      marginTop: 4,
    },
  };
  
  if (success) {
    return (
      <div style={styles.container}>
        <h1>Submit Property</h1>
        <div style={styles.success}>
          <h2>Property Submitted Successfully!</h2>
          <p>Your property has been submitted for review. You will be redirected shortly.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      <h1>Submit Property</h1>
      
      <p>
        Submit a property for consideration as an investment opportunity on our platform.
        Our team will review the details and contact you if the property meets our criteria.
      </p>
      
      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          <label htmlFor="address" style={styles.label}>Property Address</label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, City, State, ZIP"
            style={styles.input}
            required
          />
        </div>
        
        <div style={styles.formGroup}>
          <label htmlFor="price" style={styles.label}>Property Price ($)</label>
          <input
            id="price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="1000000"
            style={styles.input}
            required
            min="1"
            step="0.01"
          />
          <p style={styles.infoText}>Enter the total property value in USD</p>
        </div>
        
        <div style={styles.formGroup}>
          <label htmlFor="leaseTerm" style={styles.label}>Lease Term (months)</label>
          <input
            id="leaseTerm"
            type="number"
            value={leaseTerm}
            onChange={(e) => setLeaseTerm(e.target.value)}
            placeholder="60"
            style={styles.input}
            required
            min="1"
          />
          <p style={styles.infoText}>Enter the lease term in months (e.g., 60 for a 5-year lease)</p>
        </div>
        
        <div style={styles.formGroup}>
          <label htmlFor="tenantInfo" style={styles.label}>Tenant Information</label>
          <textarea
            id="tenantInfo"
            value={tenantInfo}
            onChange={(e) => setTenantInfo(e.target.value)}
            placeholder="Describe the current tenant, their business, credit rating, etc."
            style={styles.textarea}
            required
          />
        </div>
        
        <div style={styles.formGroup}>
          <label htmlFor="annualYield" style={styles.label}>Expected Annual Yield (%)</label>
          <input
            id="annualYield"
            type="number"
            value={annualYield}
            onChange={(e) => setAnnualYield(e.target.value)}
            placeholder="7.5"
            style={styles.input}
            required
            min="0.1"
            step="0.1"
          />
          <p style={styles.infoText}>Enter the expected annual yield percentage</p>
        </div>
        
        <div style={styles.formGroup}>
          <label htmlFor="totalShares" style={styles.label}>Total Shares</label>
          <input
            id="totalShares"
            type="number"
            value={totalShares}
            onChange={(e) => setTotalShares(e.target.value)}
            placeholder="100000"
            style={styles.input}
            required
            min="1"
          />
          <p style={styles.infoText}>Number of shares to divide the property into (default: 100,000)</p>
        </div>
        
        <button
          type="submit"
          style={{
            ...styles.button,
            ...(loading ? styles.disabledButton : {})
          }}
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Property"}
        </button>
        
        {error && <p style={styles.error}>{error}</p>}
      </form>
    </div>
  );
}
