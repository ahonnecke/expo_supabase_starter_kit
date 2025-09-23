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
}

interface OwnershipRecord {
	property_id: string;
	properties: {
		id: string;
		address: string;
	};
}

interface ProposalOption {
	title: string;
	description: string;
}

export default function CreateProposalPage() {
	return (
		<ProtectedRoute>
			<CreateProposalContent />
		</ProtectedRoute>
	);
}

function CreateProposalContent() {
	const { user } = useAuth();
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [properties, setProperties] = useState<Property[]>([]);
	const [loadingProperties, setLoadingProperties] = useState(true);

	// Form state
	const [propertyId, setPropertyId] = useState("");
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [proposalType, setProposalType] = useState("maintenance");
	const [options, setOptions] = useState<ProposalOption[]>([
		{ title: "", description: "" },
		{ title: "", description: "" },
	]);

	useEffect(() => {
		if (!user) return;

		const fetchProperties = async () => {
			try {
				setLoadingProperties(true);
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
				const uniqueProperties: Property[] = [];

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

				// Set default property if available
				if (uniqueProperties.length > 0) {
					setPropertyId(uniqueProperties[0].id);
				}
			} catch (err: any) {
				console.error("Error fetching properties:", err);
				setError(err.message || "Failed to load properties");
			} finally {
				setLoadingProperties(false);
			}
		};

		fetchProperties();

		// Set default dates
		const today = new Date();
		const nextWeek = new Date();
		nextWeek.setDate(today.getDate() + 7);

		setStartDate(today.toISOString().split("T")[0]);
		setEndDate(nextWeek.toISOString().split("T")[0]);
	}, [user]);

	const handleOptionChange = (
		index: number,
		field: "title" | "description",
		value: string,
	) => {
		const updatedOptions = [...options];
		updatedOptions[index][field] = value;
		setOptions(updatedOptions);
	};

	const addOption = () => {
		setOptions([...options, { title: "", description: "" }]);
	};

	const removeOption = (index: number) => {
		if (options.length <= 2) {
			setError("A proposal must have at least two options");
			return;
		}

		const updatedOptions = [...options];
		updatedOptions.splice(index, 1);
		setOptions(updatedOptions);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			setLoading(true);
			setError(null);

			// Validate form
			if (
				!propertyId ||
				!title ||
				!description ||
				!startDate ||
				!endDate ||
				!proposalType
			) {
				throw new Error("Please fill in all required fields");
			}

			// Validate options
			if (options.length < 2) {
				throw new Error("A proposal must have at least two options");
			}

			for (const option of options) {
				if (!option.title) {
					throw new Error("All options must have a title");
				}
			}

			// Validate dates
			const start = new Date(startDate);
			const end = new Date(endDate);
			const today = new Date();

			if (end <= start) {
				throw new Error("End date must be after start date");
			}

			// Create proposal
			const response = await fetch("/api/governance/create-proposal", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					propertyId,
					title,
					description,
					startDate,
					endDate,
					proposalType,
					options,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Failed to create proposal");
			}

			const data = await response.json();

			// Redirect to the new proposal
			router.push(`/app/governance/${data.proposal.id}`);
		} catch (err: any) {
			setError(err.message || "Failed to create proposal");
			window.scrollTo(0, 0);
		} finally {
			setLoading(false);
		}
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
		backLink: {
			display: "flex",
			alignItems: "center",
			color: "#0070f3",
			textDecoration: "none",
			fontSize: 14,
			marginBottom: 16,
		},
		title: {
			fontSize: 24,
			fontWeight: "bold" as const,
			marginBottom: 24,
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
			fontSize: 14,
		},
		input: {
			padding: "10px 12px",
			borderRadius: 4,
			border: "1px solid #ddd",
			fontSize: 14,
		},
		select: {
			padding: "10px 12px",
			borderRadius: 4,
			border: "1px solid #ddd",
			fontSize: 14,
		},
		textarea: {
			padding: "10px 12px",
			borderRadius: 4,
			border: "1px solid #ddd",
			fontSize: 14,
			minHeight: 100,
			resize: "vertical" as const,
		},
		optionsContainer: {
			marginTop: 24,
			marginBottom: 24,
		},
		optionHeader: {
			display: "flex",
			justifyContent: "space-between",
			alignItems: "center",
			marginBottom: 16,
		},
		optionTitle: {
			fontSize: 18,
			fontWeight: "bold" as const,
		},
		addOptionButton: {
			backgroundColor: "#4caf50",
			color: "white",
			border: "none",
			borderRadius: 4,
			padding: "6px 12px",
			cursor: "pointer",
			fontSize: 14,
		},
		optionCard: {
			border: "1px solid #eee",
			borderRadius: 8,
			padding: 16,
			marginBottom: 16,
			position: "relative" as const,
		},
		optionNumber: {
			position: "absolute" as const,
			top: 12,
			right: 12,
			backgroundColor: "#f5f5f5",
			borderRadius: "50%",
			width: 24,
			height: 24,
			display: "flex",
			alignItems: "center",
			justifyContent: "center",
			fontSize: 12,
			fontWeight: "bold" as const,
		},
		removeOptionButton: {
			backgroundColor: "#f44336",
			color: "white",
			border: "none",
			borderRadius: 4,
			padding: "4px 8px",
			cursor: "pointer",
			fontSize: 12,
			marginTop: 8,
		},
		button: {
			padding: "12px 16px",
			borderRadius: 4,
			border: "none",
			cursor: "pointer",
			fontSize: 16,
			fontWeight: "bold" as const,
			marginTop: 16,
		},
		submitButton: {
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
		helpText: {
			fontSize: 12,
			color: "#666",
			marginTop: 4,
		},
	};

	if (loadingProperties) {
		return (
			<div style={styles.container}>
				<h1>Create Proposal</h1>
				<p>Loading properties...</p>
			</div>
		);
	}

	if (properties.length === 0) {
		return (
			<div style={styles.container}>
				<h1>Create Proposal</h1>
				<p>
					You need to own shares in at least one property to create a proposal.
				</p>
				<Link href="/app/governance" style={styles.backLink}>
					&larr; Back to Governance
				</Link>
			</div>
		);
	}

	return (
		<div style={styles.container}>
			<Link href="/app/governance" style={styles.backLink}>
				&larr; Back to Governance
			</Link>

			<h1 style={styles.title}>Create New Proposal</h1>

			{error && <div style={styles.error}>{error}</div>}

			<form onSubmit={handleSubmit} style={styles.form}>
				<div style={styles.formGroup}>
					<label htmlFor="property" style={styles.label}>
						Property *
					</label>
					<select
						id="property"
						value={propertyId}
						onChange={(e) => setPropertyId(e.target.value)}
						style={styles.select}
						required
					>
						{properties.map((property) => (
							<option key={property.id} value={property.id}>
								{property.address}
							</option>
						))}
					</select>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="title" style={styles.label}>
						Proposal Title *
					</label>
					<input
						id="title"
						type="text"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						style={styles.input}
						placeholder="e.g., Roof Repair Approval"
						required
						maxLength={100}
					/>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="description" style={styles.label}>
						Proposal Description *
					</label>
					<textarea
						id="description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						style={styles.textarea}
						placeholder="Describe the proposal in detail..."
						required
					/>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="proposalType" style={styles.label}>
						Proposal Type *
					</label>
					<select
						id="proposalType"
						value={proposalType}
						onChange={(e) => setProposalType(e.target.value)}
						style={styles.select}
						required
					>
						<option value="maintenance">Maintenance</option>
						<option value="rent_change">Rent Change</option>
						<option value="property_sale">Property Sale</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="startDate" style={styles.label}>
						Voting Start Date *
					</label>
					<input
						id="startDate"
						type="date"
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						style={styles.input}
						required
					/>
					<p style={styles.helpText}>When voting will begin</p>
				</div>

				<div style={styles.formGroup}>
					<label htmlFor="endDate" style={styles.label}>
						Voting End Date *
					</label>
					<input
						id="endDate"
						type="date"
						value={endDate}
						onChange={(e) => setEndDate(e.target.value)}
						style={styles.input}
						required
					/>
					<p style={styles.helpText}>When voting will end</p>
				</div>

				<div style={styles.optionsContainer}>
					<div style={styles.optionHeader}>
						<h2 style={styles.optionTitle}>Voting Options</h2>
						<button
							type="button"
							onClick={addOption}
							style={styles.addOptionButton}
						>
							+ Add Option
						</button>
					</div>

					{options.map((option, index) => (
						<div key={index} style={styles.optionCard}>
							<div style={styles.optionNumber}>{index + 1}</div>

							<div style={styles.formGroup}>
								<label htmlFor={`option-${index}-title`} style={styles.label}>
									Option Title *
								</label>
								<input
									id={`option-${index}-title`}
									type="text"
									value={option.title}
									onChange={(e) =>
										handleOptionChange(index, "title", e.target.value)
									}
									style={styles.input}
									placeholder={`e.g., ${index === 0 ? "Approve" : "Reject"}`}
									required
								/>
							</div>

							<div style={styles.formGroup}>
								<label
									htmlFor={`option-${index}-description`}
									style={styles.label}
								>
									Option Description
								</label>
								<textarea
									id={`option-${index}-description`}
									value={option.description}
									onChange={(e) =>
										handleOptionChange(index, "description", e.target.value)
									}
									style={styles.textarea}
									placeholder="Additional details about this option..."
								/>
							</div>

							{options.length > 2 && (
								<button
									type="button"
									onClick={() => removeOption(index)}
									style={styles.removeOptionButton}
								>
									Remove Option
								</button>
							)}
						</div>
					))}
				</div>

				<button
					type="submit"
					disabled={loading}
					style={{
						...styles.button,
						...styles.submitButton,
						...(loading ? styles.disabledButton : {}),
					}}
				>
					{loading ? "Creating..." : "Create Proposal"}
				</button>
			</form>
		</div>
	);
}
