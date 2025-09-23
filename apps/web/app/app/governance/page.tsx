"use client";
export const dynamic = "force-dynamic";

import { useAuth } from "@supa/supabase/src/auth-context";
import { ProtectedRoute } from "@supa/supabase/src/auth-middleware";
import { createPublicClient } from "@supa/supabase/src/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Proposal {
	id: string;
	title: string;
	description: string;
	status: string;
	start_date: string;
	end_date: string;
	proposal_type: string;
	property: {
		id: string;
		address: string;
	};
	creator: {
		id: string;
		email: string;
	};
	options: {
		id: string;
		title: string;
	}[];
	results: {
		option_id: string;
		option_title: string;
		total_votes: number;
		vote_count: number;
	}[];
	userVote: string | null;
	created_at: string;
}

export default function GovernancePage() {
	return (
		<ProtectedRoute>
			<GovernanceContent />
		</ProtectedRoute>
	);
}

function GovernanceContent() {
	const { user } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [proposals, setProposals] = useState<Proposal[]>([]);
	const [properties, setProperties] = useState<
		{ id: string; address: string }[]
	>([]);
	const [selectedProperty, setSelectedProperty] = useState<string>("");
	const [selectedStatus, setSelectedStatus] = useState<string>("");

	useEffect(() => {
		if (!user) return;

		const fetchProperties = async () => {
			try {
				const supabase = createPublicClient();

				// Fetch properties the user has invested in
				const { data, error: fetchError } = await supabase
					.from("ownership_ledger")
					.select(`
            property_id,
            properties:properties(id, address)
          `)
					.eq("user_id", user.id);

				if (fetchError) throw fetchError;

				// Extract properties from the data and ensure they're unique
				const uniqueProperties: { id: string; address: string }[] = [];

				if (data && Array.isArray(data)) {
					data.forEach((item) => {
						// Safely access nested properties with type checking
						const properties = item.properties;

						if (properties && typeof properties === "object") {
							// Use type assertion after validation
							const prop = properties as any;

							if (prop.id && prop.address) {
								const propertyId = String(prop.id);
								const propertyAddress = String(prop.address);

								if (!uniqueProperties.some((p) => p.id === propertyId)) {
									uniqueProperties.push({
										id: propertyId,
										address: propertyAddress,
									});
								}
							}
						}
					});
				}

				setProperties(uniqueProperties);
			} catch (err: any) {
				console.error("Error fetching properties:", err);
			}
		};

		fetchProperties();
	}, [user]);

	useEffect(() => {
		if (!user) return;

		const fetchProposals = async () => {
			try {
				setLoading(true);
				setError(null);

				// Build query params
				const params = new URLSearchParams();
				if (selectedProperty) {
					params.append("propertyId", selectedProperty);
				}
				if (selectedStatus) {
					params.append("status", selectedStatus);
				}

				// Fetch proposals
				const response = await fetch(
					`/api/governance/proposals?${params.toString()}`,
				);

				if (!response.ok) {
					throw new Error("Failed to fetch proposals");
				}

				const data = await response.json();
				setProposals(data.proposals);
			} catch (err: any) {
				setError(err.message || "Failed to load proposals");
			} finally {
				setLoading(false);
			}
		};

		fetchProposals();
	}, [user, selectedProperty, selectedStatus]);

	const handlePropertyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedProperty(e.target.value);
	};

	const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		setSelectedStatus(e.target.value);
	};

	const getStatusBadgeStyle = (status: string) => {
		switch (status) {
			case "active":
				return { ...styles.statusBadge, ...styles.activeBadge };
			case "completed":
				return { ...styles.statusBadge, ...styles.completedBadge };
			case "draft":
				return { ...styles.statusBadge, ...styles.draftBadge };
			case "cancelled":
				return { ...styles.statusBadge, ...styles.cancelledBadge };
			default:
				return styles.statusBadge;
		}
	};

	const formatDate = (dateString: string) => {
		const date = new Date(dateString);
		return date.toLocaleDateString();
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
		},
		createButton: {
			backgroundColor: "#0070f3",
			color: "white",
			border: "none",
			borderRadius: 4,
			padding: "8px 16px",
			cursor: "pointer",
			fontSize: 14,
		},
		filtersContainer: {
			display: "flex",
			gap: 16,
			marginBottom: 24,
		},
		select: {
			padding: "8px 12px",
			borderRadius: 4,
			border: "1px solid #ddd",
			minWidth: 200,
		},
		card: {
			border: "1px solid #eee",
			borderRadius: 8,
			padding: 16,
			marginBottom: 16,
			transition: "transform 0.2s",
			cursor: "pointer",
			backgroundColor: "white",
		},
		cardHover: {
			transform: "translateY(-2px)",
			boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
		},
		cardHeader: {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 8,
		},
		propertyAddress: {
			fontSize: 12,
			color: "#666",
			marginBottom: 8,
		},
		cardTitle: {
			fontSize: 18,
			fontWeight: "bold" as const,
			marginBottom: 8,
		},
		cardDescription: {
			fontSize: 14,
			color: "#444",
			marginBottom: 16,
			display: "-webkit-box",
			WebkitLineClamp: 2,
			WebkitBoxOrient: "vertical" as const,
			overflow: "hidden",
			textOverflow: "ellipsis",
		},
		cardFooter: {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			marginTop: 16,
			fontSize: 12,
			color: "#666",
		},
		statusBadge: {
			padding: "4px 8px",
			borderRadius: 4,
			fontSize: 12,
			fontWeight: "bold" as const,
		},
		activeBadge: {
			backgroundColor: "#4caf50",
			color: "white",
		},
		completedBadge: {
			backgroundColor: "#2196f3",
			color: "white",
		},
		draftBadge: {
			backgroundColor: "#ff9800",
			color: "white",
		},
		cancelledBadge: {
			backgroundColor: "#f44336",
			color: "white",
		},
		votedBadge: {
			backgroundColor: "#4caf50",
			color: "white",
			padding: "2px 6px",
			borderRadius: 4,
			fontSize: 10,
			marginLeft: 8,
		},
		emptyState: {
			textAlign: "center" as const,
			padding: "40px 0",
		},
		error: {
			color: "crimson",
			marginTop: 16,
		},
	};

	if (loading) {
		return (
			<div style={styles.container}>
				<h1>Governance</h1>
				<p>Loading proposals...</p>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h1 style={styles.title}>Property Governance</h1>
				<div style={{ display: "flex", gap: "12px" }}>
					<Link href="/app/governance/create">
						<button style={styles.createButton}>Create Proposal</button>
					</Link>
					<Link
						href="/app/dashboard"
						style={{
							padding: "8px 16px",
							backgroundColor: "#0070f3",
							color: "white",
							borderRadius: 4,
							fontSize: 14,
							textDecoration: "none",
							display: "flex",
							alignItems: "center",
						}}
					>
						Dashboard
					</Link>
				</div>
			</div>

			{/* Navigation Menu */}
			<div
				style={{
					marginBottom: 24,
					padding: 16,
					backgroundColor: "#f5f5f5",
					borderRadius: 8,
					boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
				}}
			>
				<h3 style={{ marginBottom: 12, fontSize: 16 }}>Quick Navigation</h3>
				<div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
					<Link
						href="/app/dashboard"
						style={{
							padding: "8px 12px",
							backgroundColor: "#0070f3",
							color: "white",
							borderRadius: 4,
							fontSize: 14,
							textDecoration: "none",
						}}
					>
						Dashboard
					</Link>
					<Link
						href="/app/properties"
						style={{
							padding: "8px 12px",
							backgroundColor: "#34a853",
							color: "white",
							borderRadius: 4,
							fontSize: 14,
							textDecoration: "none",
						}}
					>
						Properties
					</Link>
					<Link
						href="/app/blockchain"
						style={{
							padding: "8px 12px",
							backgroundColor: "#9c27b0",
							color: "white",
							borderRadius: 4,
							fontSize: 14,
							textDecoration: "none",
						}}
					>
						Blockchain
					</Link>
					<Link
						href="/app/wallet-onboarding"
						style={{
							padding: "8px 12px",
							backgroundColor: "#673ab7",
							color: "white",
							borderRadius: 4,
							fontSize: 14,
							textDecoration: "none",
						}}
					>
						Wallet Onboarding
					</Link>
				</div>
			</div>

			<div style={styles.filtersContainer}>
				<select
					value={selectedProperty}
					onChange={handlePropertyChange}
					style={styles.select}
				>
					<option value="">All Properties</option>
					{properties.map((property) => (
						<option key={property.id} value={property.id}>
							{property.address}
						</option>
					))}
				</select>

				<select
					value={selectedStatus}
					onChange={handleStatusChange}
					style={styles.select}
				>
					<option value="">All Statuses</option>
					<option value="active">Active</option>
					<option value="completed">Completed</option>
					<option value="draft">Draft</option>
					<option value="cancelled">Cancelled</option>
				</select>
			</div>

			{error && <div style={styles.error}>{error}</div>}

			{proposals.length === 0 ? (
				<div style={styles.emptyState}>
					<h3>No proposals found</h3>
					<p>
						{selectedProperty || selectedStatus
							? "Try changing your filters or create a new proposal."
							: "Create a new proposal to get started."}
					</p>
				</div>
			) : (
				proposals.map((proposal) => (
					<Link
						key={proposal.id}
						href={`/app/governance/${proposal.id}`}
						style={{ textDecoration: "none", color: "inherit" }}
					>
						<div
							style={styles.card}
							onMouseEnter={(e) => {
								Object.assign(e.currentTarget.style, styles.cardHover);
							}}
							onMouseLeave={(e) => {
								e.currentTarget.style.transform = "";
								e.currentTarget.style.boxShadow = "";
							}}
						>
							<div style={styles.cardHeader}>
								<span style={getStatusBadgeStyle(proposal.status)}>
									{proposal.status.charAt(0).toUpperCase() +
										proposal.status.slice(1)}
								</span>
								<span>
									{proposal.proposal_type.charAt(0).toUpperCase() +
										proposal.proposal_type.slice(1).replace("_", " ")}
									{proposal.userVote && (
										<span style={styles.votedBadge}>Voted</span>
									)}
								</span>
							</div>

							<div style={styles.propertyAddress}>
								{proposal.property.address}
							</div>

							<h3 style={styles.cardTitle}>{proposal.title}</h3>
							<p style={styles.cardDescription}>{proposal.description}</p>

							<div style={styles.cardFooter}>
								<span>
									Voting period: {formatDate(proposal.start_date)} -{" "}
									{formatDate(proposal.end_date)}
								</span>
								<span>Created: {formatDate(proposal.created_at)}</span>
							</div>
						</div>
					</Link>
				))
			)}
		</div>
	);
}
