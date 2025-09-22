import { createServerClient } from '@supa/supabase/src/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { 
  BlockchainService, 
  NetworkType
} from '@rentinity/blockchain';

// Temporary type definitions until the blockchain package is updated
interface BlockchainTransactionResponse {
  hash: string;
  success: boolean;
  error?: string;
}

interface KycStatusResponse extends BlockchainTransactionResponse {
  invalidAddresses?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Supabase client
    const supabase = createServerClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Authentication required', 
          message: 'You must be logged in to mint tokens',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { propertyId, walletAddress, shares } = body;
    
    if (!propertyId || !walletAddress || !shares) {
      return NextResponse.json(
        { 
          error: 'Missing required fields', 
          message: 'Property ID, wallet address, and shares are required',
          code: 'VALIDATION_ERROR',
          fields: {
            propertyId: !propertyId ? 'Property ID is required' : undefined,
            walletAddress: !walletAddress ? 'Wallet address is required' : undefined,
            shares: !shares ? 'Number of shares is required' : undefined
          }
        },
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
        { 
          error: 'Ownership record not found', 
          message: 'You do not have ownership rights for this property',
          code: 'NOT_FOUND',
          propertyId
        },
        { status: 404 }
      );
    }
    
    const property = ownership.properties;
    
    if (!property.token_contract_address) {
      return NextResponse.json(
        { 
          error: 'Token not available', 
          message: 'This property does not have a token contract deployed yet',
          code: 'CONTRACT_NOT_FOUND',
          propertyId
        },
        { status: 400 }
      );
    }
    
    // Verify the requested shares don't exceed ownership
    if (shares > ownership.shares_owned) {
      return NextResponse.json(
        { 
          error: 'Insufficient shares', 
          message: `Cannot mint more tokens than shares owned. You own ${ownership.shares_owned} shares.`,
          code: 'INSUFFICIENT_SHARES',
          available: ownership.shares_owned,
          requested: shares
        },
        { status: 400 }
      );
    }
    
    // Check if tokens were already minted
    if (ownership.metadata?.tokens_minted) {
      return NextResponse.json(
        { 
          error: 'Already minted', 
          message: 'Tokens have already been minted for this investment',
          code: 'ALREADY_MINTED',
          mintedAmount: ownership.metadata.tokens_minted,
          transactionHash: ownership.metadata.mint_transaction_hash
        },
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
    const mintResult = await blockchainService.mintTokens(
      property.token_contract_address,
      walletAddress,
      tokenAmount
    ) as unknown as BlockchainTransactionResponse;
    
    if (!mintResult.success) {
      return NextResponse.json(
        { 
          error: 'Minting failed', 
          message: mintResult.error || 'Failed to mint tokens on the blockchain',
          code: 'CONTRACT_ERROR'
        },
        { status: 500 }
      );
    }
    
    const txHash = mintResult.hash;
    
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
    let kycResult: KycStatusResponse = { success: true, hash: '' };
    try {
      kycResult = await blockchainService.setKycStatus(
        property.token_contract_address,
        walletAddress,
        true
      ) as unknown as KycStatusResponse;
      
      if (!kycResult.success) {
        console.error('Error setting KYC status:', kycResult.error);
        // Continue even if KYC setting fails
      }
    } catch (kycError: any) {
      console.error('Exception setting KYC status:', kycError?.message || kycError);
      // Continue even if KYC setting fails
    }
    
    return NextResponse.json({
      success: true,
      transactionHash: txHash,
      tokenAddress: property.token_contract_address,
      tokensMinted: shares,
      walletAddress,
      kycStatus: kycResult.success ? 'success' : 'warning',
      explorerUrl: `${process.env.POLYGON_EXPLORER_URL || 'https://mumbai.polygonscan.com'}/tx/${txHash}`
    });
  } catch (error: any) {
    console.error('Error minting tokens:', error);
    
    // Determine error type and provide appropriate response
    let statusCode = 500;
    let errorCode = 'INTERNAL_ERROR';
    let errorMessage = error.message || 'Internal server error';
    
    if (error.code === 'PGRST301') {
      statusCode = 404;
      errorCode = 'RECORD_NOT_FOUND';
      errorMessage = 'The requested record was not found';
    } else if (error.code === 'PGRST204') {
      statusCode = 403;
      errorCode = 'PERMISSION_DENIED';
      errorMessage = 'You do not have permission to perform this action';
    } else if (error.message && error.message.includes('network')) {
      statusCode = 503;
      errorCode = 'NETWORK_ERROR';
      errorMessage = 'Blockchain network is currently unavailable';
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        code: errorCode,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: statusCode }
    );
  }
}
