import { KYCProviderFactory } from "@supa/shared/src/kyc";
import { createServerClient } from "@supa/supabase/src/server";
import { cookies } from "next/headers";
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

		// POC MODE: Always return a successful mock response
		console.log("⚠️ USING MOCK KYC RESPONSE - For POC testing only");

		// Generate mock values
		const mockVerificationId = `mock_${user.id}_${Date.now()}`;
		const mockClientSecret = `mock_secret_${Date.now()}`;
		const mockUrl = "/api/kyc/mock-verification";

		// Store a mock verification record in database
		try {
			await supabase.from("kyc_verifications").insert({
				user_id: user.id,
				status: "pending",
				provider: "mock",
				provider_reference_id: mockVerificationId,
				metadata: {
					client_secret: mockClientSecret,
					mock: true,
					note: "This is a mock verification for POC testing",
				},
			});
		} catch (insertError) {
			// Log error but continue anyway - we want this endpoint to always succeed
			console.error("Error storing mock verification record:", insertError);
		}

		// Always return a successful response
		return NextResponse.json({
			clientSecret: mockClientSecret,
			verificationId: mockVerificationId,
			url: mockUrl,
		});
	} catch (error) {
		console.error("Error creating verification session:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
