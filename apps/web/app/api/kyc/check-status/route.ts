import { createServerClient } from '@supa/supabase/src/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { KYCProviderFactory } from '@supa/shared/src/kyc';

export async function GET(request: NextRequest) {
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
    
    // Get the latest verification record for the user
    const { data: verification, error: fetchError } = await supabase
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching verification record:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch verification status' },
        { status: 500 }
      );
    }
    
    if (!verification) {
      return NextResponse.json(
        { error: 'No verification found' },
        { status: 404 }
      );
    }
    
    // If the verification is still pending, check the latest status from the provider
    if (verification.status === 'pending') {
      try {
        // Create KYC provider
        const kycProvider = KYCProviderFactory.createProvider({
          provider: verification.provider,
          apiKey: process.env.STRIPE_SECRET_KEY || '',
        });
        
        // Get the latest status from the provider
        const updatedVerification = await kycProvider.getVerificationStatus(
          verification.provider_reference_id
        );
        
        // Update the verification record in the database if status has changed
        if (updatedVerification.status !== verification.status) {
          const { error: updateError } = await supabase
            .from('kyc_verifications')
            .update({
              status: updatedVerification.status,
              metadata: {
                ...verification.metadata,
                provider_metadata: updatedVerification.metadata
              }
            })
            .eq('id', verification.id);
          
          if (updateError) {
            console.error('Error updating verification record:', updateError);
          }
          
          // If verified, update the user profile
          if (updatedVerification.status === 'verified') {
            await supabase
              .from('user_profiles')
              .update({ kyc_verified: true })
              .eq('id', user.id);
          }
          
          verification.status = updatedVerification.status;
        }
      } catch (error) {
        console.error('Error checking verification status with provider:', error);
        // Continue with the existing status if there's an error
      }
    }
    
    return NextResponse.json({
      id: verification.id,
      status: verification.status,
      created_at: verification.created_at,
      updated_at: verification.updated_at
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
