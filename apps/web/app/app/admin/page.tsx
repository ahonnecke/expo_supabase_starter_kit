'use client';
export const dynamic = 'force-dynamic';

import { useAuth } from '@supa/supabase/src/auth-context';
import { ProtectedRoute } from '@supa/supabase/src/auth-middleware';
import { createPublicClient } from '@supa/supabase/src/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}

function AdminDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingProperties, setPendingProperties] = useState(0);
  const [pendingTransactions, setPendingTransactions] = useState(0);

  useEffect(() => {
    if (!user) return;

    const checkAdminAndLoadCounts = async () => {
      try {
        setLoading(true);
        const supabase = createPublicClient();

        // Check if user is admin
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('preferences')
          .eq('id', user.id)
          .single();

        if (profileError) throw profileError;

        const userIsAdmin = profile?.preferences?.isAdmin === true;
        setIsAdmin(userIsAdmin);

        if (!userIsAdmin) {
          router.push('/app/dashboard');
          return;
        }

        // Get pending properties count
        const { count: propertiesCount, error: propertiesError } =
          await supabase
            .from('properties')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (propertiesError) throw propertiesError;
        setPendingProperties(propertiesCount || 0);

        // Get pending transactions count
        const { count: transactionsCount, error: transactionsError } =
          await supabase
            .from('transaction_requests')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        if (transactionsError) throw transactionsError;
        setPendingTransactions(transactionsCount || 0);
      } catch (err: any) {
        setError(err.message || 'Failed to load admin dashboard');
      } finally {
        setLoading(false);
      }
    };

    checkAdminAndLoadCounts();
  }, [user, router]);

  const styles = {
    container: {
      padding: 24,
      maxWidth: 1200,
      margin: '0 auto'
    },
    header: {
      marginBottom: 32
    },
    cardsContainer: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: 24,
      marginBottom: 32
    },
    card: {
      padding: 24,
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      backgroundColor: 'white',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column' as const,
      gap: 16
    },
    cardHover: {
      transform: 'translateY(-4px)',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
    },
    cardTitle: {
      fontSize: 20,
      fontWeight: 'bold' as const,
      margin: 0
    },
    cardDescription: {
      margin: 0,
      color: '#666'
    },
    badge: {
      display: 'inline-block',
      padding: '4px 8px',
      borderRadius: 16,
      fontSize: 14,
      fontWeight: 'bold' as const,
      backgroundColor: '#FEF3C7',
      color: '#D97706'
    },
    section: {
      marginBottom: 32
    },
    sectionTitle: {
      fontSize: 24,
      marginBottom: 16
    }
  };

  const AdminCard = ({
    title,
    description,
    link,
    badge
  }: {
    title: string;
    description: string;
    link: string;
    badge?: number;
  }) => {
    const [hover, setHover] = useState(false);
    return (
      <Link href={link} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div
          style={{
            ...styles.card,
            ...(hover ? styles.cardHover : {})
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <h3 style={styles.cardTitle}>{title}</h3>
            {badge !== undefined && badge > 0 && (
              <span style={styles.badge}>{badge}</span>
            )}
          </div>
          <p style={styles.cardDescription}>{description}</p>
        </div>
      </Link>
    );
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <h1>Admin Dashboard</h1>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <h1>Access Denied</h1>
        <p>You do not have permission to access this page.</p>
        <Link
          href="/app/dashboard"
          style={{
            padding: '8px 16px',
            backgroundColor: '#0070f3',
            color: 'white',
            borderRadius: 4,
            textDecoration: 'none'
          }}
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Admin Dashboard</h1>
        <p>
          Welcome to the Rentinity admin dashboard. Manage all aspects of the
          platform from here.
        </p>
      </div>

      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Property Management</h2>
        <div style={styles.cardsContainer}>
          <AdminCard
            title="Property Listings"
            description="Manage all property listings, approve pending properties, and update property details."
            link="/app/admin/properties"
            badge={pendingProperties}
          />
          <AdminCard
            title="Transaction Requests"
            description="Review and approve pending transaction requests from users."
            link="/app/admin/transactions"
            badge={pendingTransactions}
          />
          <AdminCard
            title="Rent Distribution"
            description="Manage rent collection and distribution to property owners."
            link="/app/admin/rent"
          />
        </div>
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Blockchain Operations</h2>
        <div style={styles.cardsContainer}>
          <AdminCard
            title="Batch Mint Tokens"
            description="Mint property tokens in batch for multiple users."
            link="/app/admin/blockchain/batch-mint"
          />
        </div>
      </div>
    </div>
  );
}
