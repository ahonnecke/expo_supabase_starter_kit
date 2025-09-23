"use client";
export const dynamic = "force-dynamic";

import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Property {
	id: string;
	address: string;
	token_contract_address: string | null;
	status: string;
}

interface Investor {
	id: string;
	user_id: string;
	shares_owned: number;
	wallet_address: string | null;
	metadata: any;
	user_email?: string;
}

export default function BatchMintPage() {
	return (
		<ProtectedRoute>
			<BatchMintContent />
		</ProtectedRoute>
	);
}

function BatchMintContent() {
	const { user } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [isAdmin, setIsAdmin] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const [properties, setProperties] = useState<Property[]>([]);
	const [selectedProperty, setSelectedProperty] = useState<string>("");
	const [investors, setInvestors] = useState<Investor[]>([]);
	const [privateKey, setPrivateKey] = useState<string>("");
	const [isMinting, setIsMinting] = useState(false);
	const [results, setResults] = useState<any>(null);

	useEffect(() => {
		if (!user) return;

		const checkAdmin = async () => {
			try {
				const supabase = createPublicClient();

				// Check if user is admin
				const { data: profile, error: profileError } = await supabase
					.from("user_profiles")
					.select("preferences")
					.eq("id", user.id)
					.single();

				if (profileError) throw profileError;

				const admin = profile?.preferences?.is_admin === true;
				setIsAdmin(admin);

				if (!admin) {
					router.push("/app/dashboard");
					return;
				}

				// Fetch properties with tokens
				const { data: propertiesData, error: propertiesError } = await supabase
					.from("properties")
					.select("id, address, token_contract_address, status")
					.not("token_contract_address", "is", null)
					.eq("status", "active")
					.order("created_at", { ascending: false });

				if (propertiesError) throw propertiesError;

				setProperties(propertiesData || []);

				if (propertiesData && propertiesData.length > 0) {
					setSelectedProperty(propertiesData[0].id);
				}
			} catch (err: any) {
				console.error("Error checking admin status:", err);
				setError(err.message || "Failed to load admin data");
			} finally {
				setLoading(false);
			}
		};

		checkAdmin();
	}, [user, router]);

	useEffect(() => {
		if (!selectedProperty || !isAdmin) return;

		const fetchInvestors = async () => {
			try {
				setLoading(true);
				const supabase = createPublicClient();

				// Fetch investors for the selected property
				const { data: investorsData, error: investorsError } = await supabase
					.from("ownership_ledger")
					.select(`
            id,
            user_id,
            shares_owned,
            wallet_address,
            metadata,
            users:user_id(email)
          `)
					.eq("property_id", selectedProperty)
					.not("wallet_address", "is", null);

				if (investorsError) throw investorsError;

				// Format investors data
				const formattedInvestors = (investorsData || []).map(
					(investor: any) => ({
						id: investor.id,
						user_id: investor.user_id,
						shares_owned: investor.shares_owned,
						wallet_address: investor.wallet_address,
						metadata: investor.metadata || {},
						user_email: investor.users?.email,
					}),
				);

				setInvestors(formattedInvestors);
			} catch (err: any) {
				console.error("Error fetching investors:", err);
				setError(err.message || "Failed to load investors");
			} finally {
				setLoading(false);
			}
		};

		fetchInvestors();
	}, [selectedProperty, isAdmin]);

	const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedProperty(e.target.value);
		setResults(null);
		setError(null);
		setSuccess(null);
	};

	const handleBatchMint = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedProperty || !privateKey) {
			setError(
				"Please select a property and enter your admin wallet private key",
			);
			return;
		}

		try {
			setIsMinting(true);
			setError(null);
			setSuccess(null);
			setResults(null);

			const response = await fetch("/api/blockchain/batch-mint-tokens", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					propertyId: selectedProperty,
					adminWalletPrivateKey: privateKey,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to batch mint tokens");
			}

			setResults(data);
			setSuccess(
				`Successfully minted tokens for ${data.successfulMints} investors`,
			);

			// Clear private key for security
			setPrivateKey("");

			// Refresh investors list
			const supabase = createPublicClient();
			const { data: refreshedInvestors, error: refreshError } = await supabase
				.from("ownership_ledger")
				.select(`
          id,
          user_id,
          shares_owned,
          wallet_address,
          metadata,
          users:user_id(email)
        `)
				.eq("property_id", selectedProperty)
				.not("wallet_address", "is", null);

			if (!refreshError && refreshedInvestors) {
				const formattedInvestors = refreshedInvestors.map((investor: any) => ({
					id: investor.id,
					user_id: investor.user_id,
					shares_owned: investor.shares_owned,
					wallet_address: investor.wallet_address,
					metadata: investor.metadata || {},
					user_email: investor.users?.email,
				}));

				setInvestors(formattedInvestors);
			}
		} catch (err: any) {
			console.error("Error batch minting tokens:", err);
			setError(err.message || "Failed to batch mint tokens");
		} finally {
			setIsMinting(false);
		}
	};

	const getPendingInvestors = () => {
		return investors.filter((investor) => !investor.metadata?.tokens_minted);
	};

	const getMintedInvestors = () => {
		return investors.filter((investor) => investor.metadata?.tokens_minted);
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
		title: {
			fontSize: 24,
			fontWeight: "bold" as const,
			marginBottom: 8,
		},
		subtitle: {
			fontSize: 16,
			color: "#666",
			marginBottom: 24,
		},
		backLink: {
			display: "flex",
			alignItems: "center",
			color: "#0070f3",
			textDecoration: "none",
			fontSize: 14,
			marginBottom: 16,
		},
		section: {
			marginBottom: 32,
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: "bold" as const,
			marginBottom: 16,
		},
		form: {
			display: "flex",
			flexDirection: "column" as const,
			gap: 16,
			maxWidth: 600,
		},
		formGroup: {
			display: "flex",
			flexDirection: "column" as const,
			gap: 8,
		},
		label: {
			fontWeight: "bold" as const,
			fontSize: 14,
		},
		select: {
			padding: "10px 12px",
			borderRadius: 4,
			border: "1px solid #ddd",
			fontSize: 14,
		},
		input: {
			padding: "10px 12px",
			borderRadius: 4,
			border: "1px solid #ddd",
			fontSize: 14,
		},
		button: {
			padding: "12px 16px",
			borderRadius: 4,
			border: "none",
			cursor: "pointer",
			fontSize: 16,
			fontWeight: "bold" as const,
		},
		mintButton: {
			backgroundColor: "#0070f3",
			color: "white",
		},
		disabledButton: {
			backgroundColor: "#cccccc",
			cursor: "not-allowed",
		},
		error: {
			color: "crimson",
			marginBottom: 16,
			padding: 12,
			backgroundColor: "#ffebee",
			borderRadius: 4,
		},
		success: {
			color: "#4caf50",
			marginBottom: 16,
			padding: 12,
			backgroundColor: "#e8f5e9",
			borderRadius: 4,
		},
		warning: {
			color: "#ff9800",
			marginBottom: 16,
			padding: 12,
			backgroundColor: "#fff3e0",
			borderRadius: 4,
		},
		table: {
			width: "100%",
			borderCollapse: "collapse" as const,
			marginTop: 16,
		},
		th: {
			textAlign: "left" as const,
			padding: "12px 8px",
			borderBottom: "2px solid #eee",
			fontWeight: "bold" as const,
		},
		td: {
			padding: "12px 8px",
			borderBottom: "1px solid #eee",
		},
		badge: {
			padding: "4px 8px",
			borderRadius: 4,
			fontSize: 12,
			fontWeight: "bold" as const,
		},
		mintedBadge: {
			backgroundColor: "#4caf50",
			color: "white",
		},
		pendingBadge: {
			backgroundColor: "#ff9800",
			color: "white",
		},
		resultSection: {
			marginTop: 24,
			padding: 16,
			backgroundColor: "#f5f5f5",
			borderRadius: 8,
		},
		resultTitle: {
			fontSize: 16,
			fontWeight: "bold" as const,
			marginBottom: 8,
		},
		resultItem: {
			padding: 8,
			borderBottom: "1px solid #eee",
			fontSize: 14,
		},
		helpText: {
			fontSize: 12,
			color: "#666",
			marginTop: 4,
		},
	};

	if (loading) {
		return (
			<div style={styles.container}>
				<h1>Batch Token Minting</h1>
				<p>Loading...</p>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div style={styles.container}>
				<h1>Unauthorized</h1>
				<p>You do not have permission to access this page.</p>
				<Link href="/app/dashboard" style={styles.backLink}>
					&larr; Back to Dashboard
				</Link>
			</div>
		);
	}

	const pendingInvestors = getPendingInvestors();
	const mintedInvestors = getMintedInvestors();
	const selectedPropertyData = properties.find(
		(p) => p.id === selectedProperty,
	);

	return (
		<div style={styles.container}>
			<Link href="/app/admin/properties" style={styles.backLink}>
				&larr; Back to Properties
			</Link>

			<h1 style={styles.title}>Batch Token Minting</h1>
			<p style={styles.subtitle}>
				Mint tokens for multiple investors at once for a property
			</p>

			{error && <div style={styles.error}>{error}</div>}
			{success && <div style={styles.success}>{success}</div>}

			<div style={styles.section}>
				<h2 style={styles.sectionTitle}>Select Property</h2>

				{properties.length === 0 ? (
					<div style={styles.warning}>
						No properties with token contracts found. Create a token contract
						for a property first.
					</div>
				) : (
					<form onSubmit={handleBatchMint} style={styles.form}>
						<div style={styles.formGroup}>
							<label htmlFor="property" style={styles.label}>
								Property
							</label>
							<select
								id="property"
								value={selectedProperty}
								onChange={handlePropertyChange}
								style={styles.select}
								required
							>
								{properties.map((property) => (
									<option key={property.id} value={property.id}>
										{property.address}{" "}
										{property.token_contract_address
											? `(${property.token_contract_address.substring(0, 8)}...)`
											: ""}
									</option>
								))}
							</select>
						</div>

						{selectedPropertyData && (
							<div style={styles.formGroup}>
								<label htmlFor="privateKey" style={styles.label}>
									Admin Wallet Private Key
								</label>
								<input
									id="privateKey"
									type="password"
									value={privateKey}
									onChange={(e) => setPrivateKey(e.target.value)}
									style={styles.input}
									placeholder="Enter your admin wallet private key"
									required
								/>
								<p style={styles.helpText}>
									This key is used only for this transaction and is not stored.
								</p>
							</div>
						)}

						{pendingInvestors.length > 0 ? (
							<button
								type="submit"
								disabled={isMinting || !selectedProperty || !privateKey}
								style={{
									...styles.button,
									...styles.mintButton,
									...(isMinting || !selectedProperty || !privateKey
										? styles.disabledButton
										: {}),
								}}
							>
								{isMinting
									? "Minting..."
									: `Mint Tokens for ${pendingInvestors.length} Investors`}
							</button>
						) : (
							<div style={styles.warning}>
								No pending investors found for this property. All investors have
								tokens minted or no investors have connected wallets.
							</div>
						)}
					</form>
				)}
			</div>

			{results && (
				<div style={styles.resultSection}>
					<h3 style={styles.resultTitle}>Batch Minting Results</h3>
					<p>Total Investors: {results.totalInvestors}</p>
					<p>Pending Investors: {results.pendingInvestors}</p>
					<p>Successful Mints: {results.successfulMints}</p>
					<p>Failed Mints: {results.failedMints}</p>

					{results.results.length > 0 && (
						<>
							<h4>Successful Transactions:</h4>
							{results.results.map((result: any, index: number) => (
								<div key={index} style={styles.resultItem}>
									{result.walletAddress.substring(0, 8)}... -{" "}
									{result.sharesOwned} tokens -
									<a
										href={`https://mumbai.polygonscan.com/tx/${result.transactionHash}`}
										target="_blank"
										rel="noopener noreferrer"
										style={{ marginLeft: 8, color: "#0070f3" }}
									>
										View Transaction
									</a>
								</div>
							))}
						</>
					)}

					{results.errors.length > 0 && (
						<>
							<h4>Failed Transactions:</h4>
							{results.errors.map((error: any, index: number) => (
								<div key={index} style={styles.resultItem}>
									Investor ID: {error.investorId} - Error: {error.error}
								</div>
							))}
						</>
					)}
				</div>
			)}

			<div style={styles.section}>
				<h2 style={styles.sectionTitle}>Investors Status</h2>

				{investors.length === 0 ? (
					<div style={styles.warning}>
						No investors found for this property or no investors have connected
						wallets.
					</div>
				) : (
					<table style={styles.table}>
						<thead>
							<tr>
								<th style={styles.th}>Investor</th>
								<th style={styles.th}>Wallet Address</th>
								<th style={styles.th}>Shares</th>
								<th style={styles.th}>Status</th>
								<th style={styles.th}>Transaction</th>
							</tr>
						</thead>
						<tbody>
							{investors.map((investor) => (
								<tr key={investor.id}>
									<td style={styles.td}>
										{investor.user_email || investor.user_id}
									</td>
									<td style={styles.td}>
										{investor.wallet_address?.substring(0, 8)}...
									</td>
									<td style={styles.td}>{investor.shares_owned}</td>
									<td style={styles.td}>
										{investor.metadata?.tokens_minted ? (
											<span style={{ ...styles.badge, ...styles.mintedBadge }}>
												Minted
											</span>
										) : (
											<span style={{ ...styles.badge, ...styles.pendingBadge }}>
												Pending
											</span>
										)}
									</td>
									<td style={styles.td}>
										{investor.metadata?.mint_transaction_hash ? (
											<a
												href={`https://mumbai.polygonscan.com/tx/${investor.metadata.mint_transaction_hash}`}
												target="_blank"
												rel="noopener noreferrer"
												style={{ color: "#0070f3" }}
											>
												View Transaction
											</a>
										) : (
											"-"
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}
