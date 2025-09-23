// KYC Provider Types
export type KYCStatus = "pending" | "verified" | "rejected" | "expired";

export interface KYCVerification {
	id: string;
	status: KYCStatus;
	created_at: string;
	updated_at: string;
	provider: string;
	provider_reference_id: string;
	user_id: string;
	metadata?: Record<string, any>;
}

export interface KYCProviderConfig {
	provider: string;
	apiKey: string;
	webhookSecret?: string;
	options?: Record<string, any>;
}

export interface KYCProvider {
	createVerificationSession(userId: string): Promise<{
		clientSecret: string;
		verificationId: string;
		url?: string;
	}>;
	getVerificationStatus(verificationId: string): Promise<KYCVerification>;
	handleWebhook(payload: any, signature: string): Promise<KYCVerification>;
}
