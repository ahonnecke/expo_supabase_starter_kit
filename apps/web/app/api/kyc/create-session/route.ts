import { createServerClient } from '@supa/supabase/src/server';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { KYCProviderFactory } from '@supa/shared/src/kyc';

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
    
    // Create KYC provider
    const kycProvider = KYCProviderFactory.createProvider({
      provider: 'stripe',
      apiKey: process.env.STRIPE_SECRET_KEY || '',
    });
    
    // Create verification session
    const { clientSecret, verificationId, url } = await kycProvider.createVerificationSession(user.id);
    
    // Store verification record in database
    const { error: insertError } = await supabase
      .from('kyc_verifications')
      .insert({
        user_id: user.id,
        status: 'pending',
        provider: 'stripe',
        provider_reference_id: verificationId,
        metadata: { client_secret: clientSecret }
      });
    
    if (insertError) {
      console.error('Error storing verification record:', insertError);
      return NextResponse.json(
        { error: 'Failed to create verification session' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      clientSecret,
      verificationId,
      url
    });
  } catch (error) {
    console.error('Error creating verification session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
