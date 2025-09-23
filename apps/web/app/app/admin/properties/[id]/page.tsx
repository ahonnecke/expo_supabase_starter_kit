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
	price: number;
	lease_term_months: number;
	tenant_info: any;
	annual_yield_percent: number;
	total_shares: number;
	status: string;
	created_at: string;
	metadata: any;
	token_contract_address?: string;
	lockup_end_date?: string | null;
}

export default function AdminPropertyReviewPage({
	params,
}: { params: { id: string } }) {
	return (
		<ProtectedRoute>
			<AdminPropertyReviewContent id={params.id} />
		</ProtectedRoute>
	);
}

function AdminPropertyReviewContent({ id }: { id: string }) {
	const { user } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [property, setProperty] = useState<Property | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [isUpdating, setIsUpdating] = useState(false);
	const [isCreatingToken, setIsCreatingToken] = useState(false);

	// Form state
	const [address, setAddress] = useState("");
	const [price, setPrice] = useState("");
	const [leaseTerm, setLeaseTerm] = useState("");
	const [tenantInfo, setTenantInfo] = useState("");
	const [annualYield, setAnnualYield] = useState("");
	const [totalShares, setTotalShares] = useState("");
	const [status, setStatus] = useState("");
	const [lockupEndDate, setLockupEndDate] = useState<string>("");

	useEffect(() => {
		if (!user || !id) return;

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

				// Fetch property details
				const { data: propertyData, error: propertyError } = await supabase
					.from("properties")
					.select("*")
					.eq("id", id)
					.single();

				if (propertyError) throw propertyError;

				setProperty(propertyData);

				// Set form state
				setAddress(propertyData.address);
				setPrice(propertyData.price.toString());
				setLeaseTerm(propertyData.lease_term_months.toString());
				setTenantInfo(
					typeof propertyData.tenant_info === "string"
						? propertyData.tenant_info
						: JSON.stringify(propertyData.tenant_info, null, 2),
				);
				setAnnualYield(propertyData.annual_yield_percent.toString());
				setTotalShares(propertyData.total_shares.toString());
				setStatus(propertyData.status);
				setLockupEndDate(propertyData.lockup_end_date || "");
			} catch (err: any) {
				setError(err.message || "Failed to load property details");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [user, id]);

	const handleUpdate = async () => {
		if (!user || !property) return;

		try {
			setIsUpdating(true);
			setError(null);

			// Validate inputs
			const priceValue = Number.parseFloat(price);
			const leaseTermValue = Number.parseInt(leaseTerm);
			const annualYieldValue = Number.parseFloat(annualYield);
			const totalSharesValue = Number.parseInt(totalShares);

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

			// Update property
			const { error: updateError } = await supabase
				.from("properties")
				.update({
					address,
					price: priceValue,
					lease_term_months: leaseTermValue,
					tenant_info: tenantInfoJson,
					annual_yield_percent: annualYieldValue,
					total_shares: totalSharesValue,
					status,
					lockup_end_date: lockupEndDate || null,
					metadata: {
						...property.metadata,
						last_updated_by: user.id,
						last_updated_at: new Date().toISOString(),
					},
				})
				.eq("id", property.id);

			if (updateError) throw updateError;

			// Redirect back to admin properties page
			router.push("/app/admin/properties");
		} catch (err: any) {
			setError(err.message || "Failed to update property");
		} finally {
			setIsUpdating(false);
		}
	};

	const handleApprove = () => {
		setStatus("active");
	};

	const handleReject = () => {
		setStatus("rejected");
	};

	const handleCreateToken = async () => {
		if (!property) return;

		try {
			setIsCreatingToken(true);
			setError(null);

			const response = await fetch("/api/blockchain/create-token", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					propertyId: property.id,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.error || "Failed to create token");
			}

			// Refresh property data to show the new token address
			const supabase = createPublicClient();
			const { data: updatedProperty, error: fetchError } = await supabase
				.from("properties")
				.select("*")
				.eq("id", property.id)
				.single();

			if (!fetchError && updatedProperty) {
				setProperty(updatedProperty);
			}

			alert(`Token created successfully! Address: ${data.tokenAddress}`);
		} catch (err: any) {
			setError(err.message || "Failed to create token");
		} finally {
			setIsCreatingToken(false);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const styles = {
		container: {
			padding: 24,
			maxWidth: 800,
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
		},
		form: {
			display: "flex",
			flexDirection: "column" as const,
			gap: 16,
		},
		formGroup: {
			display: "flex",
			flexDirection: "column" as const,
			gap: 8,
		},
		label: {
			fontWeight: "bold" as const,
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
			resize: "vertical" as const,
		},
		statusSelect: {
			padding: 12,
			border: "1px solid #ddd",
			borderRadius: 8,
			fontSize: 16,
		},
		buttonGroup: {
			display: "flex",
			gap: 16,
			marginTop: 24,
		},
		button: {
			padding: "12px 24px",
			border: "none",
			borderRadius: 8,
			cursor: "pointer",
			fontSize: 16,
		},
		updateButton: {
			backgroundColor: "#0070f3",
			color: "white",
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
		error: {
			color: "crimson",
			marginTop: 16,
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
		activeBadge: {
			backgroundColor: "#DCFCE7",
			color: "#166534",
		},
		rejectedBadge: {
			backgroundColor: "#FEE2E2",
			color: "#991B1B",
		},
	};

	const getStatusBadgeStyle = () => {
		switch (status) {
			case "pending":
				return { ...styles.statusBadge, ...styles.pendingBadge };
			case "active":
				return { ...styles.statusBadge, ...styles.activeBadge };
			case "rejected":
				return { ...styles.statusBadge, ...styles.rejectedBadge };
			default:
				return styles.statusBadge;
		}
	};

	if (loading) {
		return (
			<div style={styles.container}>
				<h1>Admin: Property Review</h1>
				<p>Loading property details...</p>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div style={styles.container}>
				<h1>Access Denied</h1>
				<p>You do not have permission to access this page.</p>
				<Link
					href="/app/properties"
					style={{ ...styles.button, ...styles.updateButton }}
				>
					Back to Properties
				</Link>
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
				<Link
					href="/app/admin/properties"
					style={{ ...styles.button, ...styles.updateButton }}
				>
					Back to Admin Dashboard
				</Link>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1>Admin: Property Review</h1>
				<Link href="/app/admin/properties" style={styles.backButton}>
					Back to Admin Dashboard
				</Link>
			</div>

			<div style={getStatusBadgeStyle()}>
				Status: {status.charAt(0).toUpperCase() + status.slice(1)}
			</div>

			{error && <p style={{ color: "crimson" }}>{error}</p>}

			<form style={styles.form}>
				<div style={styles.formGroup}>
					<label htmlFor="address" style={styles.label}>
						Property Address
					</label>
					<input
						id="address"
						type="text"
						value={address}
						onChange={(e) => setAddress(e.target.value)}
						style={styles.input}
						required
					/>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="price" style={styles.label}>
						Property Price ($)
					</label>
					<input
						id="price"
						type="number"
						value={price}
						onChange={(e) => setPrice(e.target.value)}
						style={styles.input}
						required
						min="1"
						step="0.01"
					/>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="leaseTerm" style={styles.label}>
						Lease Term (months)
					</label>
					<input
						id="leaseTerm"
						type="number"
						value={leaseTerm}
						onChange={(e) => setLeaseTerm(e.target.value)}
						style={styles.input}
						required
						min="1"
					/>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="tenantInfo" style={styles.label}>
						Tenant Information
					</label>
					<textarea
						id="tenantInfo"
						value={tenantInfo}
						onChange={(e) => setTenantInfo(e.target.value)}
						style={styles.textarea}
						required
					/>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="annualYield" style={styles.label}>
						Expected Annual Yield (%)
					</label>
					<input
						id="annualYield"
						type="number"
						value={annualYield}
						onChange={(e) => setAnnualYield(e.target.value)}
						style={styles.input}
						required
						min="0.1"
						step="0.1"
					/>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="totalShares" style={styles.label}>
						Total Shares
					</label>
					<input
						id="totalShares"
						type="number"
						value={totalShares}
						onChange={(e) => setTotalShares(e.target.value)}
						style={styles.input}
						required
						min="1"
					/>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="status" style={styles.label}>
						Status
					</label>
					<select
						id="status"
						value={status}
						onChange={(e) => setStatus(e.target.value)}
						style={styles.statusSelect}
						required
					>
						<option value="pending">Pending</option>
						<option value="active">Active</option>
						<option value="rejected">Rejected</option>
					</select>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="lockupEndDate" style={styles.label}>
						Lockup End Date
					</label>
					<input
						id="lockupEndDate"
						type="date"
						value={lockupEndDate}
						onChange={(e) => setLockupEndDate(e.target.value)}
						style={styles.input}
					/>
					<p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
						If set, tokens cannot be transferred until after this date.
					</p>
				</div>

				<div style={styles.buttonGroup}>
					{property.status === "pending" && (
						<>
							<button
								type="button"
								style={{ ...styles.button, ...styles.approveButton }}
								onClick={handleApprove}
							>
								Approve
							</button>
							<button
								type="button"
								style={{ ...styles.button, ...styles.rejectButton }}
								onClick={handleReject}
							>
								Reject
							</button>
						</>
					)}

					{property.status === "active" && !property.token_contract_address && (
						<button
							type="button"
							style={{
								...styles.button,
								...styles.approveButton,
								...(isCreatingToken ? styles.disabledButton : {}),
							}}
							onClick={handleCreateToken}
							disabled={isCreatingToken}
						>
							{isCreatingToken
								? "Creating Token..."
								: "Create Blockchain Token"}
						</button>
					)}

					<button
						type="button"
						style={{
							...styles.button,
							...styles.updateButton,
							...(isUpdating ? styles.disabledButton : {}),
						}}
						onClick={handleUpdate}
						disabled={isUpdating}
					>
						{isUpdating ? "Updating..." : "Save Changes"}
					</button>
				</div>
			</form>

			<div style={{ marginTop: 32 }}>
				<h3>Blockchain Status</h3>
				{property.token_contract_address ? (
					<div>
						<p>
							<strong>Token Contract:</strong> {property.token_contract_address}
						</p>
						<p>
							<strong>Token Symbol:</strong>{" "}
							{property.metadata?.token_symbol || "N/A"}
						</p>
						<p>
							<strong>Token Name:</strong>{" "}
							{property.metadata?.token_name || "N/A"}
						</p>
						<p>
							<strong>Created:</strong>{" "}
							{property.metadata?.blockchain_created_at
								? new Date(
										property.metadata.blockchain_created_at,
									).toLocaleString()
								: "N/A"}
						</p>
						<a
							href={`https://mumbai.polygonscan.com/address/${property.token_contract_address}`}
							target="_blank"
							rel="noopener noreferrer"
							style={{ color: "#0070f3", textDecoration: "underline" }}
						>
							View on Polygon Mumbai Explorer
						</a>
					</div>
				) : (
					<p>
						No blockchain token created yet. Approve the property first, then
						create a token.
					</p>
				)}
			</div>

			<div style={{ marginTop: 32 }}>
				<h3>Submission Details</h3>
				<p>Submitted: {new Date(property.created_at).toLocaleString()}</p>
				{property.metadata?.submitted_by && (
					<p>Submitted by: {property.metadata.submitted_by}</p>
				)}
				{property.metadata?.last_updated_at && (
					<p>
						Last updated:{" "}
						{new Date(property.metadata.last_updated_at).toLocaleString()}
					</p>
				)}
			</div>
		</div>
	);
}
