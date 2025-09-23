import { createServerClient } from "@supa/supabase/src/server";
import { type NextRequest, NextResponse } from "next/server";

interface Params {
	params: {
		id: string;
	};
}

export async function GET(request: NextRequest, { params }: Params) {
	try {
		const { id } = params;

		// Initialize Supabase client
		const supabase = createServerClient();

		// Get the current user
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Get proposal details
		const { data: proposal, error: proposalError } = await supabase
			.from("proposals")
			.select(`
        *,
        property:properties(id, address),
        creator:created_by(id, email)
      `)
			.eq("id", id)
			.single();

		if (proposalError || !proposal) {
			return NextResponse.json(
				{ error: "Proposal not found" },
				{ status: 404 },
			);
		}

		// Get proposal options
		const { data: options, error: optionsError } = await supabase
			.from("proposal_options")
			.select("*")
			.eq("proposal_id", id)
			.order("created_at", { ascending: true });

		if (optionsError) {
			console.error("Error fetching proposal options:", optionsError);
			return NextResponse.json(
				{ error: "Failed to fetch proposal options" },
				{ status: 500 },
			);
		}

		// Get vote results
		const { data: results, error: resultsError } = await supabase
			.from("proposal_results")
			.select("*")
			.eq("proposal_id", id);

		if (resultsError) {
			console.error("Error fetching proposal results:", resultsError);
			return NextResponse.json(
				{ error: "Failed to fetch proposal results" },
				{ status: 500 },
			);
		}

		// Get user's vote
		const { data: userVote, error: voteError } = await supabase
			.from("votes")
			.select("option_id, weight")
			.eq("proposal_id", id)
			.eq("user_id", user.id)
			.maybeSingle();

		if (voteError) {
			console.error("Error fetching user vote:", voteError);
		}

		// Calculate total votes
		const totalVotes =
			results?.reduce((sum, result) => sum + (result.total_votes || 0), 0) || 0;

		// Format results with percentages
		const formattedResults = options?.map((option) => {
			const result = results?.find((r) => r.option_id === option.id);
			const votes = result?.total_votes || 0;
			const percentage = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;

			return {
				...option,
				votes,
				vote_count: result?.vote_count || 0,
				percentage: Number.parseFloat(percentage.toFixed(2)),
			};
		});

		return NextResponse.json({
			proposal,
			options: formattedResults,
			userVote,
			totalVotes,
		});
	} catch (error) {
		console.error("Error fetching proposal details:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
