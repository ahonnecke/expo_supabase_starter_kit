import { KYCProviderFactory } from "@supa/shared/src/kyc";
import { createAdminClient } from "@supa/supabase/src/server-admin";
import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		// Get the raw request body
		const payload = await request.text();
		// Get the Stripe signature from the headers
		const signature = request.headers.get("stripe-signature") || "";

		// Create KYC provider
		const kycProvider = KYCProviderFactory.createProvider({
			provider: "stripe",
			apiKey: process.env.STRIPE_SECRET_KEY || "",
			webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
		});

		// Process the webhook
		const verification = await kycProvider.handleWebhook(payload, signature);

		// Update the verification record in the database
		const supabase = createAdminClient();

		// Find the verification record by provider_reference_id
		const { data: existingVerification, error: fetchError } = await supabase
			.from("kyc_verifications")
			.select("id, status, user_id, metadata")
			.eq("provider_reference_id", verification.provider_reference_id)
			.maybeSingle();

		if (fetchError) {
			console.error("Error fetching verification record:", fetchError);
			return NextResponse.json(
				{ error: "Failed to process webhook" },
				{ status: 500 },
			);
		}

		if (!existingVerification) {
			console.error(
				"Verification record not found:",
				verification.provider_reference_id,
			);
			return NextResponse.json(
				{ error: "Verification record not found" },
				{ status: 404 },
			);
		}

		// Update the verification record
		const { error: updateError } = await supabase
			.from("kyc_verifications")
			.update({
				status: verification.status,
				metadata: {
					...(existingVerification.metadata || {}),
					provider_metadata: verification.metadata,
				},
				updated_at: new Date().toISOString(),
			})
			.eq("id", existingVerification.id);

		if (updateError) {
			console.error("Error updating verification record:", updateError);
			return NextResponse.json(
				{ error: "Failed to update verification record" },
				{ status: 500 },
			);
		}

		// If verified, update the user profile
		if (
			verification.status === "verified" &&
			existingVerification.status !== "verified"
		) {
			const { error: profileUpdateError } = await supabase
				.from("user_profiles")
				.update({ kyc_verified: true })
				.eq("id", existingVerification.user_id);

			if (profileUpdateError) {
				console.error("Error updating user profile:", profileUpdateError);
			}
		}

		return NextResponse.json({ received: true });
	} catch (error) {
		console.error("Error processing webhook:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
