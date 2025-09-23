"use client";
export const dynamic = "force-dynamic";

import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface TransactionRequest {
	id: string;
	user_id: string;
	property_id: string;
	transaction_type: string;
	amount: number;
	shares: number;
	status: string;
	created_at: string;
	metadata: any;
	user_profile?: {
		first_name: string;
		last_name: string;
		email: string;
	};
	property?: {
		address: string;
	};
}

export default function AdminTransactionsPage() {
	return (
		<ProtectedRoute>
			<AdminTransactionsContent />
		</ProtectedRoute>
	);
}

function AdminTransactionsContent() {
	const { user } = useAuth();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [requests, setRequests] = useState<TransactionRequest[]>([]);
	const [isAdmin, setIsAdmin] = useState(false);
	const [processingId, setProcessingId] = useState<string | null>(null);

	useEffect(() => {
		if (!user) return;

		const checkAdminAndLoadRequests = async () => {
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

				const isUserAdmin = profile?.preferences?.isAdmin === true;
				setIsAdmin(isUserAdmin);

				if (!isUserAdmin) {
					setError("You do not have permission to access this page");
					setLoading(false);
					return;
				}

				// Fetch transaction requests
				const { data, error: requestsError } = await supabase
					.from("transaction_requests")
					.select(`
            *,
            user_profile:user_profiles(first_name, last_name, email),
            property:properties(address)
          `)
					.order("created_at", { ascending: false });

				if (requestsError) throw requestsError;

				setRequests(data || []);
			} catch (err: any) {
				setError(err.message || "Failed to load transaction requests");
			} finally {
				setLoading(false);
			}
		};

		checkAdminAndLoadRequests();
	}, [user]);

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleString();
	};

	const handleApprove = async (request: TransactionRequest) => {
		if (!user || processingId) return;

		try {
			setProcessingId(request.id);
			const supabase = createPublicClient();

			// Start a transaction (not a real DB transaction, just a sequence of operations)

			// 1. Create transaction record
			const { error: transactionError } = await supabase
				.from("transactions")
				.insert({
					user_id: request.user_id,
					property_id: request.property_id,
					transaction_type: request.transaction_type,
					amount: request.amount,
					shares: request.shares,
					status: "completed",
					metadata: {
						...request.metadata,
						approved_at: new Date().toISOString(),
						approved_by: user.id,
					},
				});

			if (transactionError) throw transactionError;

			// 2. Update or create ownership record
			const currentOwnership = request.metadata?.current_ownership;

			if (currentOwnership) {
				// Update existing ownership
				const sharePrice = request.metadata.share_price;
				const { error: updateError } = await supabase
					.from("ownership_ledger")
					.update({
						shares_owned: currentOwnership.shares_owned + request.shares,
						purchase_price_per_share:
							(currentOwnership.purchase_price_per_share + sharePrice) / 2, // Average price
						updated_at: new Date().toISOString(),
					})
					.eq("id", currentOwnership.id);

				if (updateError) throw updateError;
			} else {
				// Create new ownership record
				const sharePrice = request.metadata.share_price;
				const { error: createError } = await supabase
					.from("ownership_ledger")
					.insert({
						user_id: request.user_id,
						property_id: request.property_id,
						shares_owned: request.shares,
						purchase_price_per_share: sharePrice,
						lockup_end_date: new Date(
							Date.now() + 60 * 24 * 60 * 60 * 1000,
						).toISOString(), // 60 days from now
					});

				if (createError) throw createError;
			}

			// 3. Update request status
			const { error: updateRequestError } = await supabase
				.from("transaction_requests")
				.update({
					status: "approved",
					metadata: {
						...request.metadata,
						approved_at: new Date().toISOString(),
						approved_by: user.id,
					},
				})
				.eq("id", request.id);

			if (updateRequestError) throw updateRequestError;

			// 4. Refresh the list
			const { data, error: refreshError } = await supabase
				.from("transaction_requests")
				.select(`
          *,
          user_profile:user_profiles(first_name, last_name, email),
          property:properties(address)
        `)
				.order("created_at", { ascending: false });

			if (refreshError) throw refreshError;

			setRequests(data || []);
		} catch (err: any) {
			setError(err.message || "Failed to approve transaction request");
		} finally {
			setProcessingId(null);
		}
	};

	const handleReject = async (request: TransactionRequest) => {
		if (!user || processingId) return;

		try {
			setProcessingId(request.id);
			const supabase = createPublicClient();

			// Update request status
			const { error: updateRequestError } = await supabase
				.from("transaction_requests")
				.update({
					status: "rejected",
					metadata: {
						...request.metadata,
						rejected_at: new Date().toISOString(),
						rejected_by: user.id,
					},
				})
				.eq("id", request.id);

			if (updateRequestError) throw updateRequestError;

			// Refresh the list
			const { data, error: refreshError } = await supabase
				.from("transaction_requests")
				.select(`
          *,
          user_profile:user_profiles(first_name, last_name, email),
          property:properties(address)
        `)
				.order("created_at", { ascending: false });

			if (refreshError) throw refreshError;

			setRequests(data || []);
		} catch (err: any) {
			setError(err.message || "Failed to reject transaction request");
		} finally {
			setProcessingId(null);
		}
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
		backButton: {
			padding: "8px 16px",
			backgroundColor: "#f3f4f6",
			color: "#374151",
			border: "none",
			borderRadius: 8,
			cursor: "pointer",
			textDecoration: "none",
			fontSize: 14,
			display: "inline-flex",
			alignItems: "center",
			gap: 8,
		},
		table: {
			width: "100%",
			borderCollapse: "collapse" as const,
			marginTop: 24,
		},
		th: {
			textAlign: "left" as const,
			padding: 12,
			borderBottom: "2px solid #e5e7eb",
			fontWeight: "bold" as const,
		},
		td: {
			padding: 12,
			borderBottom: "1px solid #e5e7eb",
		},
		button: {
			padding: "8px 16px",
			border: "none",
			borderRadius: 4,
			cursor: "pointer",
			fontSize: 14,
			marginRight: 8,
		},
		approveButton: {
			backgroundColor: "#10B981",
			color: "white",
		},
		rejectButton: {
			backgroundColor: "#EF4444",
			color: "white",
		},
		disabledButton: {
			backgroundColor: "#cccccc",
			cursor: "not-allowed",
		},
		badge: {
			display: "inline-block",
			padding: "4px 8px",
			borderRadius: 4,
			fontSize: 12,
			fontWeight: "bold" as const,
		},
		pendingBadge: {
			backgroundColor: "#FEF3C7",
			color: "#D97706",
		},
		approvedBadge: {
			backgroundColor: "#D1FAE5",
			color: "#059669",
		},
		rejectedBadge: {
			backgroundColor: "#FEE2E2",
			color: "#DC2626",
		},
		error: {
			color: "crimson",
			marginTop: 16,
		},
	};

	if (loading) {
		return (
			<div style={styles.container}>
				<h1>Transaction Requests</h1>
				<p>Loading transaction requests...</p>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div style={styles.container}>
				<h1>Access Denied</h1>
				<p>You do not have permission to access this page.</p>
				<Link href="/app/dashboard" style={styles.backButton}>
					Back to Dashboard
				</Link>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1>Transaction Requests</h1>
				<Link href="/app/admin/dashboard" style={styles.backButton}>
					Back to Admin Dashboard
				</Link>
			</div>

			{error && <p style={styles.error}>{error}</p>}

			{requests.length === 0 ? (
				<p>No transaction requests found.</p>
			) : (
				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.th}>Date</th>
							<th style={styles.th}>User</th>
							<th style={styles.th}>Property</th>
							<th style={styles.th}>Type</th>
							<th style={styles.th}>Amount</th>
							<th style={styles.th}>Shares</th>
							<th style={styles.th}>Status</th>
							<th style={styles.th}>Actions</th>
						</tr>
					</thead>
					<tbody>
						{requests.map((request) => (
							<tr key={request.id}>
								<td style={styles.td}>{formatDate(request.created_at)}</td>
								<td style={styles.td}>
									{request.user_profile?.first_name}{" "}
									{request.user_profile?.last_name}
								</td>
								<td style={styles.td}>{request.property?.address}</td>
								<td style={styles.td}>{request.transaction_type}</td>
								<td style={styles.td}>{formatCurrency(request.amount)}</td>
								<td style={styles.td}>{request.shares.toLocaleString()}</td>
								<td style={styles.td}>
									<span
										style={{
											...styles.badge,
											...(request.status === "pending"
												? styles.pendingBadge
												: request.status === "approved"
													? styles.approvedBadge
													: styles.rejectedBadge),
										}}
									>
										{request.status}
									</span>
								</td>
								<td style={styles.td}>
									{request.status === "pending" && (
										<>
											<button
												onClick={() => handleApprove(request)}
												style={{
													...styles.button,
													...styles.approveButton,
													...(processingId ? styles.disabledButton : {}),
												}}
												disabled={!!processingId}
											>
												{processingId === request.id
													? "Processing..."
													: "Approve"}
											</button>
											<button
												onClick={() => handleReject(request)}
												style={{
													...styles.button,
													...styles.rejectButton,
													...(processingId ? styles.disabledButton : {}),
												}}
												disabled={!!processingId}
											>
												{processingId === request.id
													? "Processing..."
													: "Reject"}
											</button>
										</>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			)}
		</div>
	);
}
