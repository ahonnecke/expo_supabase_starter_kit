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
	annual_yield_percent: number;
	total_shares: number;
	status: string;
}

interface RentPayment {
	id: string;
	property_id: string;
	payment_date: string;
	amount: number;
	status: string;
	created_at: string;
}

export default function AdminRentPage() {
	return (
		<ProtectedRoute>
			<AdminRentContent />
		</ProtectedRoute>
	);
}

function AdminRentContent() {
	const { user } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isAdmin, setIsAdmin] = useState(false);
	const [properties, setProperties] = useState<Property[]>([]);
	const [rentPayments, setRentPayments] = useState<RentPayment[]>([]);
	const [selectedProperty, setSelectedProperty] = useState<string>("");

	// Form state for new rent payment
	const [paymentDate, setPaymentDate] = useState<string>(
		new Date().toISOString().split("T")[0],
	);
	const [paymentAmount, setPaymentAmount] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState(false);

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

				// Fetch active properties
				const { data: propertiesData, error: propertiesError } = await supabase
					.from("properties")
					.select(
						"id, address, price, annual_yield_percent, total_shares, status",
					)
					.eq("status", "active");

				if (propertiesError) throw propertiesError;

				setProperties(propertiesData || []);

				// Fetch recent rent payments
				const { data: paymentsData, error: paymentsError } = await supabase
					.from("rent_payments")
					.select("*")
					.order("payment_date", { ascending: false })
					.limit(50);

				if (paymentsError) throw paymentsError;

				setRentPayments(paymentsData || []);
			} catch (err: any) {
				setError(err.message || "Failed to load data");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [user]);

	const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		const propertyId = e.target.value;
		setSelectedProperty(propertyId);

		// Calculate default payment amount based on property yield
		if (propertyId) {
			const property = properties.find((p) => p.id === propertyId);
			if (property) {
				const monthlyYield =
					(property.price * (property.annual_yield_percent / 100)) / 12;
				setPaymentAmount(monthlyYield.toFixed(2));
			}
		} else {
			setPaymentAmount("");
		}
	};

	const handleSubmitRentPayment = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!selectedProperty || !paymentDate || !paymentAmount) {
			setError("Please fill in all fields");
			return;
		}

		try {
			setIsSubmitting(true);
			setError(null);

			const supabase = createPublicClient();

			// Create rent payment record
			const { data: paymentData, error: paymentError } = await supabase
				.from("rent_payments")
				.insert({
					property_id: selectedProperty,
					payment_date: paymentDate,
					amount: Number.parseFloat(paymentAmount),
					status: "pending",
					metadata: {
						created_by: user?.id,
						created_at: new Date().toISOString(),
					},
				})
				.select();

			if (paymentError) throw paymentError;

			// Get all ownership records for this property
			const { data: ownershipData, error: ownershipError } = await supabase
				.from("ownership_ledger")
				.select("user_id, shares_owned")
				.eq("property_id", selectedProperty);

			if (ownershipError) throw ownershipError;

			if (!ownershipData || ownershipData.length === 0) {
				throw new Error("No investors found for this property");
			}

			// Get property details
			const property = properties.find((p) => p.id === selectedProperty);
			if (!property) {
				throw new Error("Property not found");
			}

			// Calculate dividend distributions
			const totalShares = property.total_shares;
			const totalAmount = Number.parseFloat(paymentAmount);

			const distributions = ownershipData.map((ownership) => ({
				rent_payment_id: paymentData[0].id,
				user_id: ownership.user_id,
				property_id: selectedProperty,
				amount: (ownership.shares_owned / totalShares) * totalAmount,
				shares_owned: ownership.shares_owned,
				status: "pending",
				metadata: {
					distribution_percentage: (ownership.shares_owned / totalShares) * 100,
					created_at: new Date().toISOString(),
				},
			}));

			// Create dividend distribution records
			const { error: distributionError } = await supabase
				.from("dividend_distributions")
				.insert(distributions);

			if (distributionError) throw distributionError;

			// Refresh the rent payments list
			const { data: updatedPayments, error: refreshError } = await supabase
				.from("rent_payments")
				.select("*")
				.order("payment_date", { ascending: false })
				.limit(50);

			if (refreshError) throw refreshError;

			setRentPayments(updatedPayments || []);

			// Reset form
			setSelectedProperty("");
			setPaymentDate(new Date().toISOString().split("T")[0]);
			setPaymentAmount("");

			// Show success message
			alert("Rent payment and dividend distributions created successfully!");
		} catch (err: any) {
			setError(err.message || "Failed to process rent payment");
		} finally {
			setIsSubmitting(false);
		}
	};

	const processRentPayment = async (paymentId: string) => {
		try {
			setLoading(true);
			const supabase = createPublicClient();

			// Update rent payment status
			const { error: paymentError } = await supabase
				.from("rent_payments")
				.update({ status: "processed" })
				.eq("id", paymentId);

			if (paymentError) throw paymentError;

			// Update dividend distributions status
			const { error: distributionError } = await supabase
				.from("dividend_distributions")
				.update({
					status: "processed",
					payment_reference: `pmt_${Date.now()}`,
					metadata: {
						processed_at: new Date().toISOString(),
						processed_by: user?.id,
					},
				})
				.eq("rent_payment_id", paymentId);

			if (distributionError) throw distributionError;

			// Refresh the rent payments list
			const { data: updatedPayments, error: refreshError } = await supabase
				.from("rent_payments")
				.select("*")
				.order("payment_date", { ascending: false })
				.limit(50);

			if (refreshError) throw refreshError;

			setRentPayments(updatedPayments || []);

			// Show success message
			alert("Rent payment processed successfully!");
		} catch (err: any) {
			setError(err.message || "Failed to process rent payment");
		} finally {
			setLoading(false);
		}
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(amount);
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
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
			case "processed":
				backgroundColor = "#DCFCE7";
				color = "#166534";
				break;
			case "failed":
				backgroundColor = "#FEE2E2";
				color = "#991B1B";
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
		grid: {
			display: "grid",
			gridTemplateColumns: "1fr 2fr",
			gap: 24,
		},
		card: {
			border: "1px solid #ddd",
			borderRadius: 8,
			padding: 24,
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
		select: {
			padding: 12,
			border: "1px solid #ddd",
			borderRadius: 8,
			fontSize: 16,
		},
		button: {
			padding: "12px 24px",
			backgroundColor: "#0070f3",
			color: "white",
			border: "none",
			borderRadius: 8,
			cursor: "pointer",
			fontSize: 16,
		},
		processButton: {
			padding: "6px 12px",
			backgroundColor: "#10B981",
			color: "white",
			border: "none",
			borderRadius: 4,
			cursor: "pointer",
			fontSize: 14,
		},
		disabledButton: {
			backgroundColor: "#cccccc",
			cursor: "not-allowed",
		},
		table: {
			width: "100%",
			borderCollapse: "collapse" as const,
		},
		th: {
			textAlign: "left" as const,
			padding: "12px 16px",
			borderBottom: "2px solid #ddd",
		},
		td: {
			padding: "12px 16px",
			borderBottom: "1px solid #eee",
		},
		error: {
			color: "crimson",
			marginTop: 16,
		},
	};

	if (loading) {
		return (
			<div style={styles.container}>
				<h1>Admin: Rent Management</h1>
				<p>Loading data...</p>
			</div>
		);
	}

	if (!isAdmin) {
		return (
			<div style={styles.container}>
				<h1>Access Denied</h1>
				<p>You do not have permission to access this page.</p>
				<Link href="/app/properties" style={styles.button}>
					Back to Properties
				</Link>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1>Admin: Rent Management</h1>
				<Link href="/app/admin/properties" style={styles.backButton}>
					Back to Admin Dashboard
				</Link>
			</div>

			<div style={styles.grid}>
				<div style={styles.card}>
					<h2>Record Rent Payment</h2>
					<p>
						Record a new rent payment and automatically distribute dividends to
						investors.
					</p>

					{error && <p style={{ color: "crimson" }}>{error}</p>}

					<form onSubmit={handleSubmitRentPayment} style={styles.form}>
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
								<option value="">Select a property</option>
								{properties.map((property) => (
									<option key={property.id} value={property.id}>
										{property.address}
									</option>
								))}
							</select>
						</div>

						<div style={styles.formGroup}>
							<label htmlFor="paymentDate" style={styles.label}>
								Payment Date
							</label>
							<input
								id="paymentDate"
								type="date"
								value={paymentDate}
								onChange={(e) => setPaymentDate(e.target.value)}
								style={styles.input}
								required
							/>
						</div>

						<div style={styles.formGroup}>
							<label htmlFor="paymentAmount" style={styles.label}>
								Payment Amount ($)
							</label>
							<input
								id="paymentAmount"
								type="number"
								value={paymentAmount}
								onChange={(e) => setPaymentAmount(e.target.value)}
								placeholder="1000.00"
								style={styles.input}
								required
								min="0.01"
								step="0.01"
							/>
						</div>

						<button
							type="submit"
							style={{
								...styles.button,
								...(isSubmitting ? styles.disabledButton : {}),
							}}
							disabled={isSubmitting}
						>
							{isSubmitting ? "Processing..." : "Record Payment"}
						</button>
					</form>
				</div>

				<div>
					<h2>Recent Rent Payments</h2>

					{rentPayments.length === 0 ? (
						<p>No rent payments recorded yet.</p>
					) : (
						<table style={styles.table}>
							<thead>
								<tr>
									<th style={styles.th}>Property</th>
									<th style={styles.th}>Date</th>
									<th style={styles.th}>Amount</th>
									<th style={styles.th}>Status</th>
									<th style={styles.th}>Actions</th>
								</tr>
							</thead>
							<tbody>
								{rentPayments.map((payment) => {
									const property = properties.find(
										(p) => p.id === payment.property_id,
									);
									return (
										<tr key={payment.id}>
											<td style={styles.td}>
												{property?.address || "Unknown Property"}
											</td>
											<td style={styles.td}>
												{formatDate(payment.payment_date)}
											</td>
											<td style={styles.td}>
												{formatCurrency(payment.amount)}
											</td>
											<td style={styles.td}>
												<span style={getStatusBadge(payment.status)}>
													{payment.status.charAt(0).toUpperCase() +
														payment.status.slice(1)}
												</span>
											</td>
											<td style={styles.td}>
												{payment.status === "pending" && (
													<button
														style={styles.processButton}
														onClick={() => processRentPayment(payment.id)}
													>
														Process Payment
													</button>
												)}
												<Link
													href={`/app/admin/rent/${payment.id}`}
													style={{
														...styles.processButton,
														marginLeft: 8,
														backgroundColor: "#0070f3",
													}}
												>
													View Details
												</Link>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					)}
				</div>
			</div>
		</div>
	);
}
