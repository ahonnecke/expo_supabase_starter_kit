import { createServerClient } from '@supa/supabase/src/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { BlockchainService, NetworkType } from '@rentinity/blockchain/src';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { propertyId, walletAddress, shares } = body;
    
    if (!propertyId || !walletAddress || !shares) {
      return NextResponse.json(
        { error: 'Property ID, wallet address, and shares are required' },
        { status: 400 }
      );
    }
    
    // Get property details and verify user has ownership
    const { data: ownership, error: ownershipError } = await supabase
      .from('ownership_ledger')
      .select(`
        *,
        properties!inner(*)
      `)
      .eq('user_id', user.id)
      .eq('property_id', propertyId)
      .single();
    
    if (ownershipError || !ownership) {
      return NextResponse.json(
        { error: 'No ownership found for this property' },
        { status: 404 }
      );
    }
    
    const property = ownership.properties;
    
    if (!property.token_contract_address) {
      return NextResponse.json(
        { error: 'Property token not yet created on blockchain' },
        { status: 400 }
      );
    }
    
    // Verify the requested shares don't exceed ownership
    if (shares > ownership.shares_owned) {
      return NextResponse.json(
        { error: 'Cannot mint more tokens than shares owned' },
        { status: 400 }
      );
    }
    
    // Initialize blockchain service with admin wallet
    const blockchainService = new BlockchainService(NetworkType.TESTNET);
    
    // Create admin signer (in production, use secure key management)
    const provider = new ethers.JsonRpcProvider(process.env.POLYGON_MUMBAI_RPC_URL);
    const adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY || '', provider);
    await blockchainService.connectWallet(adminWallet);
    
    // Convert shares to token amount (assuming 1:1 ratio)
    const tokenAmount = ethers.parseEther(shares.toString());
    
    // Mint tokens to user's wallet
    const txHash = await blockchainService.mintTokens(
      property.token_contract_address,
      walletAddress,
      tokenAmount
    );
    
    // Update ownership record to track minted tokens
    const { error: updateError } = await supabase
      .from('ownership_ledger')
      .update({
        wallet_address: walletAddress,
        metadata: {
          ...ownership.metadata,
          tokens_minted: shares,
          mint_transaction_hash: txHash,
          minted_at: new Date().toISOString()
        }
      })
      .eq('id', ownership.id);
    
    if (updateError) {
      console.error('Error updating ownership record:', updateError);
    }
    
    // Set KYC status for the wallet address (assuming user is KYC verified)
    try {
      await blockchainService.setKycStatus(
        property.token_contract_address,
        walletAddress,
        true
      );
    } catch (kycError) {
      console.error('Error setting KYC status:', kycError);
      // Continue even if KYC setting fails
    }
    
    return NextResponse.json({
      success: true,
      transactionHash: txHash,
      tokenAddress: property.token_contract_address,
      tokensMinted: shares,
      walletAddress
    });
  } catch (error: any) {
    console.error('Error minting tokens:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
