import { KYCProviderFactory } from "@supa/shared/src/kyc";
import { createServerClient } from "@supa/supabase/src/server";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
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

		console.log("⚠️ POC MODE: Always returning verified KYC status for testing");

		// Check if the user already has a verification record
		const { data: existingVerification } = await supabase
			.from("kyc_verifications")
			.select("id")
			.eq("user_id", user.id)
			.maybeSingle();

		let verificationId;
		let createdAt = new Date().toISOString();
		let updatedAt = new Date().toISOString();

		// If no verification exists, create one
		if (!existingVerification) {
			// Create a mock verification record
			const { data: newVerification, error: insertError } = await supabase
				.from("kyc_verifications")
				.insert({
					user_id: user.id,
					status: "verified", // Always verified for POC
					provider: "mock",
					provider_reference_id: `mock_${user.id}_${Date.now()}`,
					metadata: {
						mock: true,
						poc: true,
						note: "Auto-verified for POC testing",
					},
				})
				.select()
				.single();

			if (insertError) {
				console.error("Error creating mock verification:", insertError);
				// Continue anyway - we want this to always succeed
			} else if (newVerification) {
				verificationId = newVerification.id;
				createdAt = newVerification.created_at;
				updatedAt = newVerification.updated_at;
			}
		} else {
			verificationId = existingVerification.id;

			// Update the verification to be verified if it's not already
			const { error: updateError } = await supabase
				.from("kyc_verifications")
				.update({
					status: "verified",
					metadata: {
						mock: true,
						poc: true,
						note: "Auto-verified for POC testing",
						updated: new Date().toISOString(),
					},
				})
				.eq("id", verificationId);

			if (updateError) {
				console.error("Error updating verification record:", updateError);
			}
		}

		// Always update the user profile to be KYC verified
		await supabase
			.from("user_profiles")
			.update({ kyc_verified: true })
			.eq("id", user.id);

		// Always return a verified status
		return NextResponse.json({
			id: verificationId || `mock_${user.id}_${Date.now()}`,
			status: "verified", // Always verified for POC
			created_at: createdAt,
			updated_at: updatedAt,
			mock: true,
			poc: true,
		});
	} catch (error) {
		console.error("Error checking verification status:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
