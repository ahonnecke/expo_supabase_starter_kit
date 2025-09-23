'use client';
export const dynamic = 'force-dynamic';

import { useAuth } from '@supa/supabase/src/auth-context';
import { ProtectedRoute } from '@supa/supabase/src/auth-middleware';
import { createPublicClient } from '@supa/supabase/src/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

interface Property {
  id: string;
  address: string;
  price: number;
  lease_term_months: number;
  tenant_info: any;
  annual_yield_percent: number;
  total_shares: number;
  status: string;
  created_at: string;
  metadata: any;
}

interface Ownership {
  id: string;
  user_id: string;
  property_id: string;
  shares_owned: number;
  purchase_price_per_share: number;
}

export default function PropertyDetailPage({
  params
}: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <PropertyDetailContent id={params.id} />
    </ProtectedRoute>
  );
}

function PropertyDetailContent({ id }: { id: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [property, setProperty] = useState<Property | null>(null);
  const [ownership, setOwnership] = useState<Ownership | null>(null);
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [investAmount, setInvestAmount] = useState('');
  const [investShares, setInvestShares] = useState(0);
  const [isInvesting, setIsInvesting] = useState(false);

  useEffect(() => {
    if (!user || !id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const supabase = createPublicClient();

        // Check if user is KYC verified
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('kyc_verified')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        setIsKycVerified(profile?.kyc_verified === true);

        // Fetch property details
        const { data: propertyData, error: propertyError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (propertyError) throw propertyError;

        setProperty(propertyData);

        // Check if user already owns shares
        const { data: ownershipData, error: ownershipError } = await supabase
          .from('ownership_ledger')
          .select('*')
          .eq('user_id', user.id)
          .eq('property_id', id)
          .maybeSingle();

        if (ownershipError) throw ownershipError;

        setOwnership(ownershipData);
      } catch (err: any) {
        setError(err.message || 'Failed to load property details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, id]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const handleInvestAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const amount = e.target.value;
    setInvestAmount(amount);

    if (property) {
      const sharePrice = property.price / property.total_shares;
      const shares = Math.floor(Number.parseFloat(amount) / sharePrice);
      setInvestShares(shares);
    }
  };

  const handleInvestSharesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const shares = e.target.value;
    setInvestShares(Number.parseInt(shares));

    if (property) {
      const sharePrice = property.price / property.total_shares;
      const amount = Number.parseInt(shares) * sharePrice;
      setInvestAmount(amount.toFixed(2));
    }
  };

  const handleInvest = async () => {
    if (!user || !property || !investShares) return;

    try {
      setIsInvesting(true);
      setError(null);

      const supabase = createPublicClient();
      const sharePrice = property.price / property.total_shares;

      // Create transaction request record
      const { error: requestError } = await supabase
        .from('transaction_requests')
        .insert({
          user_id: user.id,
          property_id: property.id,
          transaction_type: 'purchase',
          amount: Number.parseFloat(investAmount),
          shares: investShares,
          status: 'pending',
          metadata: {
            share_price: sharePrice,
            initiated_at: new Date().toISOString(),
            current_ownership: ownership
              ? {
                  id: ownership.id,
                  shares_owned: ownership.shares_owned,
                  purchase_price_per_share: ownership.purchase_price_per_share
                }
              : null
          }
        });

      if (requestError) throw requestError;

      // Redirect to pending page
      router.push(
        `/app/properties/${property.id}/pending?amount=${investAmount}&shares=${investShares}`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to process investment request');
    } finally {
      setIsInvesting(false);
    }
  };

  const styles = {
    container: {
      padding: 24,
      maxWidth: 1200,
      margin: '0 auto'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 24
    },
    backButton: {
      padding: '8px 16px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      textDecoration: 'none',
      fontSize: 14,
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: 24
    },
    propertyImage: {
      height: 400,
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#9ca3af',
      borderRadius: 8
    },
    propertyDetails: {
      marginTop: 24
    },
    propertyTitle: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16
    },
    propertyPrice: {
      fontSize: 32,
      fontWeight: 'bold',
      marginBottom: 24
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid #eee'
    },
    investmentCard: {
      border: '1px solid #ddd',
      borderRadius: 8,
      padding: 24
    },
    investmentTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16
    },
    formGroup: {
      marginBottom: 16
    },
    label: {
      display: 'block',
      marginBottom: 8,
      fontWeight: 'bold'
    },
    input: {
      width: '100%',
      padding: 12,
      border: '1px solid #ddd',
      borderRadius: 8,
      fontSize: 16
    },
    button: {
      width: '100%',
      padding: '12px 24px',
      backgroundColor: '#0070f3',
      color: 'white',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 16,
      marginTop: 16
    },
    disabledButton: {
      backgroundColor: '#cccccc',
      cursor: 'not-allowed'
    },
    kycWarning: {
      backgroundColor: '#FEF9C3',
      color: '#854D0E',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16
    },
    error: {
      color: 'crimson',
      marginTop: 16
    },
    ownershipCard: {
      backgroundColor: '#DCFCE7',
      padding: 16,
      borderRadius: 8,
      marginBottom: 16
    },
    tenantInfo: {
      marginTop: 24,
      padding: 16,
      backgroundColor: '#f9fafb',
      borderRadius: 8
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Property Details</h1>
        <p>Loading property details...</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div style={styles.container}>
        <h1>Property Not Found</h1>
        <p>
          The property you are looking for does not exist or has been removed.
        </p>
        <Link href="/app/properties" style={styles.backButton}>
          Back to Properties
        </Link>
      </div>
    );
  }

  const sharePrice = property.price / property.total_shares;
  const monthlyYield =
    (property.price * (property.annual_yield_percent / 100)) / 12;
  const shareMonthlyYield = monthlyYield / property.total_shares;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Property Details</h1>
        <Link href="/app/properties" style={styles.backButton}>
          Back to Properties
        </Link>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={styles.grid}>
        <div>
          <div style={styles.propertyImage}>Property Image</div>

          <div style={styles.propertyDetails}>
            <h2 style={styles.propertyTitle}>{property.address}</h2>
            <p style={styles.propertyPrice}>{formatCurrency(property.price)}</p>

            <div style={styles.detailRow}>
              <span>Annual Yield</span>
              <span>{property.annual_yield_percent}%</span>
            </div>

            <div style={styles.detailRow}>
              <span>Monthly Rent</span>
              <span>{formatCurrency(monthlyYield)}</span>
            </div>

            <div style={styles.detailRow}>
              <span>Lease Term</span>
              <span>{property.lease_term_months} months</span>
            </div>

            <div style={styles.detailRow}>
              <span>Total Shares</span>
              <span>{property.total_shares.toLocaleString()}</span>
            </div>

            <div style={styles.detailRow}>
              <span>Share Price</span>
              <span>{formatCurrency(sharePrice)}</span>
            </div>

            <div style={styles.detailRow}>
              <span>Monthly Yield per Share</span>
              <span>{formatCurrency(shareMonthlyYield)}</span>
            </div>

            <div style={styles.tenantInfo}>
              <h3>Tenant Information</h3>
              <p>
                {typeof property.tenant_info === 'string'
                  ? property.tenant_info
                  : property.tenant_info?.description ||
                    JSON.stringify(property.tenant_info)}
              </p>
            </div>
          </div>
        </div>

        <div>
          {ownership && (
            <div style={styles.ownershipCard}>
              <h3>Your Investment</h3>
              <p>
                You own {ownership.shares_owned.toLocaleString()} shares (
                {(
                  (ownership.shares_owned / property.total_shares) *
                  100
                ).toFixed(2)}
                %)
              </p>
              <p>
                Average purchase price:{' '}
                {formatCurrency(ownership.purchase_price_per_share)} per share
              </p>
              <p>
                Total investment:{' '}
                {formatCurrency(
                  ownership.shares_owned * ownership.purchase_price_per_share
                )}
              </p>
              <p>
                Monthly yield:{' '}
                {formatCurrency(ownership.shares_owned * shareMonthlyYield)}
              </p>
            </div>
          )}

          {property.status === 'active' && (
            <div style={styles.investmentCard}>
              <h3 style={styles.investmentTitle}>Invest in this Property</h3>

              {!isKycVerified && (
                <div style={styles.kycWarning}>
                  <p>
                    <strong>KYC Verification Required</strong>
                  </p>
                  <p>
                    You need to complete identity verification before investing.
                  </p>
                  <Link
                    href="/kyc/verification"
                    style={{
                      ...styles.button,
                      display: 'inline-block',
                      width: 'auto',
                      marginTop: 8
                    }}
                  >
                    Complete Verification
                  </Link>
                </div>
              )}

              <div style={styles.formGroup}>
                <label htmlFor="investAmount" style={styles.label}>
                  Investment Amount ($)
                </label>
                <input
                  id="investAmount"
                  type="number"
                  value={investAmount}
                  onChange={handleInvestAmountChange}
                  placeholder="1000"
                  style={styles.input}
                  min={sharePrice}
                  step={sharePrice}
                  disabled={!isKycVerified}
                />
                <p>Minimum investment: {formatCurrency(sharePrice)}</p>
              </div>

              <div style={styles.formGroup}>
                <label htmlFor="investShares" style={styles.label}>
                  Number of Shares
                </label>
                <input
                  id="investShares"
                  type="number"
                  value={investShares || ''}
                  onChange={handleInvestSharesChange}
                  placeholder="10"
                  style={styles.input}
                  min="1"
                  disabled={!isKycVerified}
                />
                <p>Each share costs {formatCurrency(sharePrice)}</p>
              </div>

              {investShares > 0 && (
                <div style={{ marginTop: 16 }}>
                  <p>
                    <strong>Summary:</strong>
                  </p>
                  <p>Shares: {investShares.toLocaleString()}</p>
                  <p>
                    Total Investment:{' '}
                    {formatCurrency(Number.parseFloat(investAmount))}
                  </p>
                  <p>
                    Expected Monthly Yield:{' '}
                    {formatCurrency(investShares * shareMonthlyYield)}
                  </p>
                  <p>
                    Expected Annual Yield:{' '}
                    {formatCurrency(investShares * shareMonthlyYield * 12)}
                  </p>
                </div>
              )}

              <button
                onClick={handleInvest}
                style={{
                  ...styles.button,
                  ...(isInvesting || !isKycVerified || investShares <= 0
                    ? styles.disabledButton
                    : {})
                }}
                disabled={isInvesting || !isKycVerified || investShares <= 0}
              >
                {isInvesting ? 'Processing...' : 'Request Investment'}
              </button>

              {error && <p style={styles.error}>{error}</p>}

              <p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
                Note: Investments have a 60-day lockup period before they can be
                traded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
