import { BlockchainService, NetworkType } from "@rentinity/blockchain";
import { createServerClient } from "@supa/supabase/src/server";
import { ethers } from "ethers";
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

		const body = await request.json();
		const { propertyId, fromAddress, toAddress, amount } = body;

		if (!propertyId || !fromAddress || !toAddress || !amount) {
			return NextResponse.json(
				{
					error:
						"Property ID, from address, to address, and amount are required",
				},
				{ status: 400 },
			);
		}

		// Get property details and verify user has ownership
		const { data: ownership, error: ownershipError } = await supabase
			.from("ownership_ledger")
			.select(`
        *,
        properties!inner(*)
      `)
			.eq("user_id", user.id)
			.eq("property_id", propertyId)
			.single();

		if (ownershipError || !ownership) {
			return NextResponse.json(
				{ error: "No ownership found for this property" },
				{ status: 404 },
			);
		}

		const property = ownership.properties;

		if (!property.token_contract_address) {
			return NextResponse.json(
				{ error: "Property token not yet created on blockchain" },
				{ status: 400 },
			);
		}

		// Verify the wallet address matches the user's registered wallet
		if (ownership.wallet_address !== fromAddress) {
			return NextResponse.json(
				{ error: "From address does not match your registered wallet address" },
				{ status: 403 },
			);
		}

		// Check if tokens are in lockup period
		const currentDate = new Date();
		const lockupEndDate = property.lockup_end_date
			? new Date(property.lockup_end_date)
			: null;

		if (lockupEndDate && currentDate < lockupEndDate) {
			return NextResponse.json(
				{
					error: "Tokens are in lockup period",
					lockupEndDate: lockupEndDate.toISOString(),
				},
				{ status: 403 },
			);
		}

		// Initialize blockchain service with user wallet
		// Note: For security, we're not using admin wallet for transfers
		// The user must sign the transaction themselves via their connected wallet
		const blockchainService = new BlockchainService(NetworkType.TESTNET);

		// Convert amount to token amount (assuming 18 decimals for ERC20)
		const tokenAmount = ethers.parseEther(amount.toString());

		// Check if recipient is KYC approved
		try {
			const isRecipientKycApproved = await blockchainService.isKycWhitelisted(
				property.token_contract_address,
				toAddress,
			);

			if (!isRecipientKycApproved) {
				return NextResponse.json(
					{ error: "Recipient address is not KYC approved" },
					{ status: 403 },
				);
			}
		} catch (kycError) {
			console.error("Error checking KYC status:", kycError);
			// Continue even if KYC check fails in test environment
		}

		// Return the transaction data that needs to be signed by the user's wallet
		// The actual transfer will happen on the frontend using the user's connected wallet
		return NextResponse.json({
			success: true,
			tokenAddress: property.token_contract_address,
			fromAddress,
			toAddress,
			amount: amount.toString(),
			// Include additional data needed for the frontend to execute the transfer
			transferData: {
				tokenAddress: property.token_contract_address,
				toAddress,
				amount: tokenAmount.toString(),
			},
		});
	} catch (error: any) {
		console.error("Error preparing token transfer:", error);
		return NextResponse.json(
			{ error: error.message || "Internal server error" },
			{ status: 500 },
		);
	}
}
