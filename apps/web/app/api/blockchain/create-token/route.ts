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

		// Check if user is admin
		const { data: profile, error: profileError } = await supabase
			.from("user_profiles")
			.select("preferences")
			.eq("id", user.id)
			.single();

		if (profileError || !profile?.preferences?.isAdmin) {
			return NextResponse.json(
				{ error: "Admin access required" },
				{ status: 403 },
			);
		}

		const body = await request.json();
		const { propertyId } = body;

		if (!propertyId) {
			return NextResponse.json(
				{ error: "Property ID is required" },
				{ status: 400 },
			);
		}

		// Get property details from database
		const { data: property, error: propertyError } = await supabase
			.from("properties")
			.select("*")
			.eq("id", propertyId)
			.single();

		if (propertyError || !property) {
			return NextResponse.json(
				{ error: "Property not found" },
				{ status: 404 },
			);
		}

		// Initialize blockchain service with admin wallet
		const blockchainService = new BlockchainService(NetworkType.TESTNET);

		// Create admin signer (in production, use secure key management)
		const provider = new ethers.JsonRpcProvider(
			process.env.POLYGON_MUMBAI_RPC_URL,
		);
		const adminWallet = new ethers.Wallet(
			process.env.PRIVATE_KEY || "",
			provider,
		);
		await blockchainService.connectWallet(adminWallet);

		// Prepare token parameters
		const tokenParams = {
			propertyId: property.id,
			name: `${property.address} Token`,
			symbol: `PROP${property.id.slice(-4).toUpperCase()}`,
			propertyAddress: property.address,
			propertyValue: ethers.parseEther(property.price.toString()),
			annualYieldPercent: Math.floor(property.annual_yield_percent * 100), // Convert to basis points
			lockupPeriodDays: 60,
			totalSupply: ethers.parseEther(property.total_shares.toString()),
			initialHolder: adminWallet.address,
		};

		// Create the token on blockchain
		const tokenAddress =
			await blockchainService.createPropertyToken(tokenParams);

		// Update property record with token contract address
		const { error: updateError } = await supabase
			.from("properties")
			.update({
				token_contract_address: tokenAddress,
				metadata: {
					...property.metadata,
					blockchain_created_at: new Date().toISOString(),
					token_symbol: tokenParams.symbol,
					token_name: tokenParams.name,
				},
			})
			.eq("id", propertyId);

		if (updateError) {
			console.error("Error updating property with token address:", updateError);
			// Token was created but database update failed
			return NextResponse.json(
				{
					tokenAddress,
					warning: "Token created but database update failed",
					error: updateError.message,
				},
				{ status: 207 }, // Multi-status
			);
		}

		return NextResponse.json({
			success: true,
			tokenAddress,
			tokenSymbol: tokenParams.symbol,
			tokenName: tokenParams.name,
		});
	} catch (error: any) {
		console.error("Error creating property token:", error);
		return NextResponse.json(
			{ error: error.message || "Internal server error" },
			{ status: 500 },
		);
	}
}
