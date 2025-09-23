import { createServerClient } from "@supa/supabase/src/server";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		// Initialize Supabase client
		const supabase = createServerClient();

		// Get the current user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Parse request body
		const body = await request.json();
		const { proposalId, optionId } = body;

		// Validate required fields
		if (!proposalId || !optionId) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// Get proposal details
		const { data: proposal, error: proposalError } = await supabase
			.from("proposals")
			.select("id, property_id, status, start_date, end_date")
			.eq("id", proposalId)
			.single();

		if (proposalError || !proposal) {
			return NextResponse.json(
				{ error: "Proposal not found" },
				{ status: 404 },
			);
		}

		// Check if proposal is active
		if (proposal.status !== "active") {
			return NextResponse.json(
				{ error: "Proposal is not active" },
				{ status: 400 },
			);
		}

		// Check if proposal is within voting period
		const now = new Date();
		const startDate = new Date(proposal.start_date);
		const endDate = new Date(proposal.end_date);

		if (now < startDate || now > endDate) {
			return NextResponse.json(
				{ error: "Voting period is not active" },
				{ status: 400 },
			);
		}

		// Check if option belongs to proposal
		const { data: option, error: optionError } = await supabase
			.from("proposal_options")
			.select("id")
			.eq("id", optionId)
			.eq("proposal_id", proposalId)
			.single();

		if (optionError || !option) {
			return NextResponse.json(
				{ error: "Invalid option for this proposal" },
				{ status: 400 },
			);
		}

		// Get user's ownership weight
		const { data: ownership, error: ownershipError } = await supabase
			.from("ownership_ledger")
			.select("shares_owned")
			.eq("user_id", user.id)
			.eq("property_id", proposal.property_id)
			.single();

		if (ownershipError || !ownership) {
			return NextResponse.json(
				{ error: "You do not own shares in this property" },
				{ status: 403 },
			);
		}

		// Check if user has already voted
		const { data: existingVote, error: voteCheckError } = await supabase
			.from("votes")
			.select("id")
			.eq("proposal_id", proposalId)
			.eq("user_id", user.id)
			.maybeSingle();

		if (existingVote) {
			// Update existing vote
			const { data: updatedVote, error: updateError } = await supabase
				.from("votes")
				.update({
					option_id: optionId,
					weight: ownership.shares_owned,
				})
				.eq("id", existingVote.id)
				.select()
				.single();

			if (updateError) {
				console.error("Error updating vote:", updateError);
				return NextResponse.json(
					{ error: "Failed to update vote" },
					{ status: 500 },
				);
			}

			return NextResponse.json({
				message: "Vote updated successfully",
				vote: updatedVote,
			});
		} else {
			// Create new vote
			const { data: newVote, error: insertError } = await supabase
				.from("votes")
				.insert({
					proposal_id: proposalId,
					option_id: optionId,
					user_id: user.id,
					weight: ownership.shares_owned,
				})
				.select()
				.single();

			if (insertError) {
				console.error("Error creating vote:", insertError);
				return NextResponse.json(
					{ error: "Failed to create vote" },
					{ status: 500 },
				);
			}

			return NextResponse.json({
				message: "Vote recorded successfully",
				vote: newVote,
			});
		}
	} catch (error) {
		console.error("Error processing vote:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
