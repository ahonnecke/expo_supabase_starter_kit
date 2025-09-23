// apps/web/app/page.tsx
import Link from "next/link";

export default function HomePage() {
	const styles = {
		container: {
			padding: "2rem",
			maxWidth: "1000px",
			margin: "0 auto",
			fontFamily: "system-ui, -apple-system, sans-serif",
		},
		header: {
			textAlign: "center" as const,
			marginBottom: "2rem",
			borderBottom: "1px solid #eaeaea",
			paddingBottom: "1rem",
		},
		title: {
			fontSize: "2.5rem",
			fontWeight: "bold",
			color: "#333",
		},
		subtitle: {
			fontSize: "1.2rem",
			color: "#666",
			marginTop: "0.5rem",
		},
		section: {
			marginTop: "2.5rem",
			padding: "1.5rem",
			borderRadius: "8px",
			backgroundColor: "#f9f9f9",
			boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
		},
		sectionTitle: {
			fontSize: "1.5rem",
			fontWeight: "bold",
			marginBottom: "1rem",
			color: "#333",
			borderBottom: "2px solid #0070f3",
			paddingBottom: "0.5rem",
			display: "inline-block",
		},
		buttonContainer: {
			display: "flex",
			flexWrap: "wrap" as const,
			gap: "1rem",
			marginTop: "1rem",
		},
		button: {
			padding: "0.75rem 1.25rem",
			borderRadius: "6px",
			textDecoration: "none",
			fontWeight: "500",
			fontSize: "1rem",
			transition: "all 0.2s ease",
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			minWidth: "180px",
		},
		primaryButton: {
			backgroundColor: "#0070f3",
			color: "white",
			border: "1px solid #0070f3",
			":hover": {
				backgroundColor: "#005cc5",
			},
		},
		secondaryButton: {
			backgroundColor: "#34a853",
			color: "white",
			border: "1px solid #34a853",
			":hover": {
				backgroundColor: "#2d9147",
			},
		},
		tertiaryButton: {
			backgroundColor: "#9c27b0",
			color: "white",
			border: "1px solid #9c27b0",
			":hover": {
				backgroundColor: "#7b1fa2",
			},
		},
		adminButton: {
			backgroundColor: "#ea4335",
			color: "white",
			border: "1px solid #ea4335",
			":hover": {
				backgroundColor: "#d73125",
			},
		},
		featureList: {
			marginTop: "1.5rem",
			display: "grid",
			gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
			gap: "1rem",
		},
		featureCard: {
			padding: "1.25rem",
			borderRadius: "8px",
			backgroundColor: "white",
			boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
			transition: "transform 0.2s ease",
			":hover": {
				transform: "translateY(-5px)",
				boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
			},
		},
		featureTitle: {
			fontSize: "1.1rem",
			fontWeight: "bold",
			marginBottom: "0.5rem",
			color: "#333",
		},
		featureDescription: {
			fontSize: "0.9rem",
			color: "#666",
			lineHeight: "1.5",
		},
		footer: {
			marginTop: "3rem",
			textAlign: "center" as const,
			color: "#666",
			fontSize: "0.9rem",
			padding: "1rem",
			borderTop: "1px solid #eaeaea",
		},
	};

	return (
		<main style={styles.container}>
			<div style={styles.header}>
				<h1 style={styles.title}>Welcome to Rentinity</h1>
				<p style={styles.subtitle}>
					A blockchain-powered real estate investment platform
				</p>
				<Link
					href="/app/dashboard"
					style={{
						display: "inline-block",
						marginTop: "1rem",
						padding: "0.75rem 1.5rem",
						backgroundColor: "#0070f3",
						color: "white",
						borderRadius: "6px",
						textDecoration: "none",
						fontWeight: "bold",
						fontSize: "1.1rem",
						boxShadow: "0 4px 14px rgba(0, 118, 255, 0.39)",
					}}
				>
					Go to Dashboard
				</Link>
			</div>

			<div style={styles.section}>
				<h2 style={styles.sectionTitle}>Authentication</h2>
				<p>Create an account or sign in to access the platform</p>
				<div style={styles.buttonContainer}>
					<Link
						href="/sign-in"
						style={{ ...styles.button, ...styles.primaryButton }}
					>
						Sign In
					</Link>
					<Link
						href="/sign-up"
						style={{ ...styles.button, ...styles.primaryButton }}
					>
						Sign Up
					</Link>
				</div>
			</div>

			<div style={styles.section}>
				<h2 style={styles.sectionTitle}>Core Features</h2>
				<p>Explore and invest in properties with blockchain integration</p>
				<div style={styles.buttonContainer}>
					<Link
						href="/app/dashboard"
						style={{ ...styles.button, ...styles.secondaryButton }}
					>
						Dashboard
					</Link>
					<Link
						href="/app/properties"
						style={{ ...styles.button, ...styles.secondaryButton }}
					>
						Browse Properties
					</Link>
					<Link
						href="/app/profile"
						style={{ ...styles.button, ...styles.secondaryButton }}
					>
						My Profile
					</Link>
				</div>
			</div>

			<div style={styles.section}>
				<h2 style={styles.sectionTitle}>Blockchain Features</h2>
				<p>Connect your wallet and manage your property tokens</p>
				<div style={styles.buttonContainer}>
					<Link
						href="/app/blockchain"
						style={{ ...styles.button, ...styles.tertiaryButton }}
					>
						Blockchain Dashboard
					</Link>
					<Link
						href="/app/wallet-onboarding"
						style={{ ...styles.button, ...styles.tertiaryButton }}
					>
						Wallet Onboarding
					</Link>
					<Link
						href="/app/governance"
						style={{ ...styles.button, ...styles.tertiaryButton }}
					>
						Governance
					</Link>
					<Link
						href="/app/governance/create"
						style={{ ...styles.button, ...styles.tertiaryButton }}
					>
						Create Proposal
					</Link>
				</div>
			</div>

			<div style={styles.section}>
				<h2 style={styles.sectionTitle}>Admin Features</h2>
				<p>
					Manage properties, approve listings, and mint tokens (admin access
					required)
				</p>
				<div style={styles.buttonContainer}>
					<Link
						href="/app/admin/properties"
						style={{ ...styles.button, ...styles.adminButton }}
					>
						Admin Properties
					</Link>
					<Link
						href="/app/admin/blockchain/batch-mint"
						style={{ ...styles.button, ...styles.adminButton }}
					>
						Batch Mint Tokens
					</Link>
					<Link
						href="/app/admin/rent"
						style={{ ...styles.button, ...styles.adminButton }}
					>
						Rent Management
					</Link>
				</div>
			</div>

			<div style={styles.section}>
				<h2 style={styles.sectionTitle}>Project Features</h2>
				<div style={styles.featureList}>
					<div style={styles.featureCard}>
						<h3 style={styles.featureTitle}>Lockup Period Enforcement</h3>
						<p style={styles.featureDescription}>
							Tokens can be locked for a specified period, preventing transfers
							until the lockup expires.
						</p>
					</div>
					<div style={styles.featureCard}>
						<h3 style={styles.featureTitle}>Voting Module</h3>
						<p style={styles.featureDescription}>
							Create and vote on property governance proposals with weighted
							voting based on token ownership.
						</p>
					</div>
					<div style={styles.featureCard}>
						<h3 style={styles.featureTitle}>Batch Token Issuance</h3>
						<p style={styles.featureDescription}>
							Admins can mint tokens to multiple wallets in a single transaction
							for efficient onboarding.
						</p>
					</div>
					<div style={styles.featureCard}>
						<h3 style={styles.featureTitle}>Wallet Onboarding</h3>
						<p style={styles.featureDescription}>
							Step-by-step process to connect your wallet and associate it with
							your property investments.
						</p>
					</div>
				</div>
			</div>

			<footer style={styles.footer}>
				<p>Rentinity - A blockchain-powered real estate investment platform</p>
			</footer>
		</main>
	);
}
