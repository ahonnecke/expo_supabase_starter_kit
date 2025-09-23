import type { KYCProvider, KYCVerification } from "./types";

/**
 * Mock KYC provider for testing purposes
 * This provider automatically approves all verification requests without requiring
 * actual identity verification. USE ONLY FOR TESTING!
 */
export class MockKYCProvider implements KYCProvider {
	constructor() {
		console.log("⚠️ MOCK KYC PROVIDER - NOT FOR PRODUCTION USE ⚠️");
	}

	async createVerificationSession(userId: string): Promise<{
		clientSecret: string;
		verificationId: string;
		url?: string;
	}> {
		// Generate a mock verification ID
		const verificationId = `mock_${userId}_${Date.now()}`;

		console.log(`[MockKYC] Created verification session for user ${userId}`);

		return {
			clientSecret: "mock_client_secret",
			verificationId,
			url: "/api/kyc/mock-verification", // This URL doesn't need to exist
		};
	}

	async getVerificationStatus(
		verificationId: string,
	): Promise<KYCVerification> {
		// Always return verified status
		console.log(
			`[MockKYC] Returning verified status for verification ${verificationId}`,
		);

		const userId = verificationId.split("_")[1] || "unknown";

		return {
			id: verificationId,
			status: "verified",
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			provider: "mock",
			provider_reference_id: verificationId,
			user_id: userId,
			metadata: {
				mock: true,
				note: "This is a mock verification for testing purposes only",
			},
		};
	}

	async handleWebhook(
		payload: any,
		signature: string,
	): Promise<KYCVerification> {
		// Mock webhook handler
		console.log("[MockKYC] Mock webhook received");

		return {
			id: `mock_webhook_${Date.now()}`,
			status: "verified",
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			provider: "mock",
			provider_reference_id: `mock_webhook_${Date.now()}`,
			user_id: payload?.user_id || "unknown",
			metadata: {
				mock: true,
				webhook: true,
				payload: payload,
			},
		};
	}
}
