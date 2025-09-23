'use client';
export const dynamic = 'force-dynamic';

import { useAuth } from '@supa/supabase/src/auth-context';
import { ProtectedRoute } from '@supa/supabase/src/auth-middleware';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function PendingPage({
  params
}: {
  params: { id: string };
}) {
  return (
    <ProtectedRoute>
      <PendingPageContent id={params.id} />
    </ProtectedRoute>
  );
}

function PendingPageContent({ id }: { id: string }) {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const amount = searchParams.get('amount') || '0';
  const shares = searchParams.get('shares') || '0';

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(amount));
  };

  const styles = {
    container: {
      padding: 24,
      maxWidth: 800,
      margin: '0 auto',
      textAlign: 'center' as const
    },
    card: {
      backgroundColor: '#f9fafb',
      borderRadius: 8,
      padding: 32,
      marginTop: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold' as const,
      marginBottom: 16
    },
    subtitle: {
      fontSize: 18,
      color: '#4b5563',
      marginBottom: 24
    },
    detail: {
      margin: '16px 0',
      fontSize: 16
    },
    highlight: {
      fontWeight: 'bold' as const,
      color: '#0070f3'
    },
    button: {
      display: 'inline-block',
      padding: '12px 24px',
      backgroundColor: '#0070f3',
      color: 'white',
      border: 'none',
      borderRadius: 8,
      cursor: 'pointer',
      fontSize: 16,
      marginTop: 24,
      textDecoration: 'none'
    },
    icon: {
      fontSize: 48,
      color: '#f59e0b',
      marginBottom: 16
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.icon}>⏳</div>
        <h1 style={styles.title}>Investment Request Submitted</h1>
        <p style={styles.subtitle}>
          Your investment request is pending approval from our team.
        </p>

        <div style={styles.detail}>
          <p>
            Amount:{' '}
            <span style={styles.highlight}>{formatCurrency(amount)}</span>
          </p>
          <p>
            Shares:{' '}
            <span style={styles.highlight}>
              {Number(shares).toLocaleString()}
            </span>
          </p>
        </div>

        <p style={{ marginTop: 24 }}>
          We'll review your request and process it as soon as possible. You'll
          receive a notification when your investment is approved.
        </p>

        <p style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
          Note: Investment requests are typically processed within 1-2 business
          days.
        </p>

        <Link href="/app/properties" style={styles.button}>
          Back to Properties
        </Link>
      </div>
    </div>
  );
}
