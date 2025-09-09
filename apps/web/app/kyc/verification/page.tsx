"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";

export default function KYCVerificationPage() {
  return (
    <ProtectedRoute>
      <KYCVerificationContent />
    </ProtectedRoute>
  );
}

function KYCVerificationContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const checkExistingVerification = async () => {
      try {
        setLoading(true);
        const supabase = createPublicClient();
        
        // Check if user already has a verification
        const { data: existingVerification, error: fetchError } = await supabase
          .from("kyc_verifications")
          .select("status, provider_reference_id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (existingVerification) {
          setVerificationStatus(existingVerification.status);
          
          // If already verified, update user profile
          if (existingVerification.status === "verified") {
            await supabase
              .from("user_profiles")
              .update({ kyc_verified: true })
              .eq("id", user.id);
          }
        } else {
          // Create new verification session
          const response = await fetch("/api/kyc/create-session", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error("Failed to create verification session");
          }

          const data = await response.json();
          setClientSecret(data.clientSecret);
          setVerificationUrl(data.url);
          setVerificationStatus("pending");
        }
      } catch (err: any) {
        setError(err.message || "An error occurred during KYC verification");
      } finally {
        setLoading(false);
      }
    };

    checkExistingVerification();
  }, [user]);

  const handleStartVerification = () => {
    if (verificationUrl) {
      window.location.href = verificationUrl;
    }
  };

  const handleCheckStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/kyc/check-status", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to check verification status");
      }

      const data = await response.json();
      setVerificationStatus(data.status);
      
      if (data.status === "verified") {
        // Update user profile
        const supabase = createPublicClient();
        await supabase
          .from("user_profiles")
          .update({ kyc_verified: true })
          .eq("id", user?.id);
      }
    } catch (err: any) {
      setError(err.message || "Failed to check verification status");
    } finally {
      setLoading(false);
    }
  };

  const styles = {
    container: {
      padding: 24,
      maxWidth: 640,
      margin: "0 auto",
    },
    card: {
      padding: 24,
      border: "1px solid #ddd",
      borderRadius: 8,
      marginBottom: 24,
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
    statusBadge: {
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: 16,
      fontWeight: "bold",
      marginBottom: 16,
    },
    pendingBadge: {
      backgroundColor: "#FEF9C3",
      color: "#854D0E",
    },
    verifiedBadge: {
      backgroundColor: "#DCFCE7",
      color: "#166534",
    },
    rejectedBadge: {
      backgroundColor: "#FEE2E2",
      color: "#991B1B",
    },
    expiredBadge: {
      backgroundColor: "#F3F4F6",
      color: "#374151",
    },
  };

  const getStatusBadgeStyle = () => {
    switch (verificationStatus) {
      case "pending":
        return { ...styles.statusBadge, ...styles.pendingBadge };
      case "verified":
        return { ...styles.statusBadge, ...styles.verifiedBadge };
      case "rejected":
        return { ...styles.statusBadge, ...styles.rejectedBadge };
      case "expired":
        return { ...styles.statusBadge, ...styles.expiredBadge };
      default:
        return styles.statusBadge;
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Identity Verification</h1>
        <div style={styles.card}>
          <p>Loading verification status...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1>Identity Verification</h1>
      
      <div style={styles.card}>
        <h2>KYC Verification</h2>
        
        {verificationStatus && (
          <div style={getStatusBadgeStyle()}>
            Status: {verificationStatus.charAt(0).toUpperCase() + verificationStatus.slice(1)}
          </div>
        )}
        
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        
        {verificationStatus === "pending" && (
          <>
            <p>
              To comply with regulations, we need to verify your identity before you can invest in properties.
            </p>
            <p>
              You'll need to provide a government-issued ID and take a selfie for verification.
            </p>
            {verificationUrl && (
              <button 
                style={styles.button} 
                onClick={handleStartVerification}
              >
                Start Verification
              </button>
            )}
            <button 
              style={{ ...styles.button, marginLeft: 8 }} 
              onClick={handleCheckStatus}
            >
              Check Status
            </button>
          </>
        )}
        
        {verificationStatus === "verified" && (
          <>
            <p>
              Your identity has been successfully verified! You can now invest in properties.
            </p>
            <button 
              style={styles.button} 
              onClick={() => router.push("/app/properties")}
            >
              Browse Properties
            </button>
          </>
        )}
        
        {verificationStatus === "rejected" && (
          <>
            <p>
              Unfortunately, your verification was rejected. This could be due to:
            </p>
            <ul>
              <li>Unclear ID document images</li>
              <li>Mismatch between selfie and ID photo</li>
              <li>Expired ID document</li>
            </ul>
            <button 
              style={styles.button} 
              onClick={() => router.refresh()}
            >
              Try Again
            </button>
          </>
        )}
        
        {verificationStatus === "expired" && (
          <>
            <p>
              Your verification session has expired. Please start a new verification process.
            </p>
            <button 
              style={styles.button} 
              onClick={() => router.refresh()}
            >
              Start New Verification
            </button>
          </>
        )}
      </div>
    </div>
  );
}
