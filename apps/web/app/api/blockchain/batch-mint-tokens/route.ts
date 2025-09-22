import { createServerClient } from '@supa/supabase/src/server';
import { NextRequest, NextResponse } from 'next/server';
import { BlockchainService, NetworkType, getBlockchainConfig } from '@rentinity/blockchain';
import { ethers } from 'ethers';

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createServerClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Check if user is admin
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('preferences')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }
    
    const isAdmin = profile?.preferences?.is_admin === true;
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }
    
    // Parse request body
    const body = await request.json();
    const { propertyId, adminWalletPrivateKey } = body;
    
    if (!propertyId || !adminWalletPrivateKey) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Get property details
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .select('id, token_contract_address, status')
      .eq('id', propertyId)
      .single();
    
    if (propertyError || !property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }
    
    if (property.status !== 'active') {
      return NextResponse.json(
        { error: 'Property must be active to mint tokens' },
        { status: 400 }
      );
    }
    
    if (!property.token_contract_address) {
      return NextResponse.json(
        { error: 'Property does not have a token contract' },
        { status: 400 }
      );
    }
    
    // Get all investors for this property
    const { data: investors, error: investorsError } = await supabase
      .from('ownership_ledger')
      .select('id, user_id, shares_owned, wallet_address, metadata')
      .eq('property_id', propertyId)
      .not('wallet_address', 'is', null);
    
    if (investorsError) {
      return NextResponse.json(
        { error: 'Failed to fetch investors' },
        { status: 500 }
      );
    }
    
    if (!investors || investors.length === 0) {
      return NextResponse.json(
        { error: 'No investors with connected wallets found' },
        { status: 400 }
      );
    }
    
    // Filter out investors who already have tokens minted
    const pendingInvestors = investors.filter(investor => 
      !investor.metadata?.tokens_minted
    );
    
    if (pendingInvestors.length === 0) {
      return NextResponse.json(
        { message: 'All investors already have tokens minted' },
        { status: 200 }
      );
    }
    
    // Initialize blockchain service
    const blockchainService = new BlockchainService(NetworkType.TESTNET);
    
    // Connect wallet using private key
    const wallet = new ethers.Wallet(adminWalletPrivateKey, new ethers.JsonRpcProvider(getBlockchainConfig(NetworkType.TESTNET).rpcUrl));
    await blockchainService.connectWallet(wallet);
    
    // Batch mint tokens for each investor
    const results = [];
    const errors = [];
    
    for (const investor of pendingInvestors) {
      try {
        if (!investor.wallet_address) continue;
        
        // Mint tokens for the investor
        const txHash = await blockchainService.mintTokens(
          property.token_contract_address,
          investor.wallet_address,
          investor.shares_owned
        );
        
        // Update the investor's record
        const { error: updateError } = await supabase
          .from('ownership_ledger')
          .update({
            metadata: {
              ...investor.metadata,
              tokens_minted: true,
              mint_transaction_hash: txHash,
              mint_date: new Date().toISOString()
            }
          })
          .eq('id', investor.id);
        
        if (updateError) {
          errors.push({
            investorId: investor.id,
            error: updateError.message
          });
        } else {
          results.push({
            investorId: investor.id,
            walletAddress: investor.wallet_address,
            sharesOwned: investor.shares_owned,
            transactionHash: txHash
          });
        }
      } catch (err: any) {
        errors.push({
          investorId: investor.id,
          error: err.message || 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      property,
      totalInvestors: investors.length,
      pendingInvestors: pendingInvestors.length,
      successfulMints: results.length,
      failedMints: errors.length,
      results,
      errors
    });
    
  } catch (error: any) {
    console.error('Error in batch mint tokens:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
