import { KYCProvider, KYCVerification } from './types';
import Stripe from 'stripe';

export class StripeIdentityProvider implements KYCProvider {
  private stripe: Stripe;
  
  constructor(apiKey: string) {
    this.stripe = new Stripe(apiKey, {
      apiVersion: '2025-08-27.basil', // Use the expected Stripe API version
    });
  }

  async createVerificationSession(userId: string): Promise<{
    clientSecret: string;
    verificationId: string;
    url?: string;
  }> {
    try {
      const session = await this.stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
          user_id: userId,
        },
        options: {
          document: {
            allowed_types: ['driving_license', 'passport', 'id_card'],
            require_matching_selfie: true,
          },
        },
      });

      return {
        clientSecret: session.client_secret as string,
        verificationId: session.id,
        url: session.url || undefined,
      };
    } catch (error) {
      console.error('Error creating Stripe Identity verification session:', error);
      throw new Error('Failed to create verification session');
    }
  }

  async getVerificationStatus(verificationId: string): Promise<KYCVerification> {
    try {
      const session = await this.stripe.identity.verificationSessions.retrieve(
        verificationId
      );

      // Map Stripe status to our KYC status
      let status: KYCVerification['status'];
      switch (session.status) {
        case 'requires_input':
        case 'processing':
          status = 'pending';
          break;
        case 'verified':
          status = 'verified';
          break;
        case 'canceled':
          status = 'expired';
          break;
        default:
          status = 'rejected';
      }

      return {
        id: session.id,
        status,
        created_at: new Date(session.created * 1000).toISOString(),
        updated_at: new Date(session.created * 1000).toISOString(),
        provider: 'stripe',
        provider_reference_id: session.id,
        user_id: session.metadata?.user_id as string,
        metadata: {
          last_error: session.last_error,
          last_verification_report: session.last_verification_report,
        },
      };
    } catch (error) {
      console.error('Error retrieving Stripe Identity verification status:', error);
      throw new Error('Failed to retrieve verification status');
    }
  }

  async handleWebhook(payload: any, signature: string): Promise<KYCVerification> {
    try {
      // Verify webhook signature
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET || ''
      );

      // Handle verification completion event
      if (event.type === 'identity.verification_session.verified' || 
          event.type === 'identity.verification_session.requires_input') {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        
        // Map Stripe status to our KYC status
        let status: KYCVerification['status'];
        switch (session.status) {
          case 'requires_input':
          case 'processing':
            status = 'pending';
            break;
          case 'verified':
            status = 'verified';
            break;
          case 'canceled':
            status = 'expired';
            break;
          default:
            status = 'rejected';
        }

        return {
          id: session.id,
          status,
          created_at: new Date(session.created * 1000).toISOString(),
          updated_at: new Date().toISOString(),
          provider: 'stripe',
          provider_reference_id: session.id,
          user_id: session.metadata?.user_id as string,
          metadata: {
            event_type: event.type,
            last_error: session.last_error,
            last_verification_report: session.last_verification_report,
          },
        };
      }
      
      throw new Error('Unhandled webhook event type');
    } catch (error) {
      console.error('Error handling Stripe Identity webhook:', error);
      throw new Error('Failed to process webhook');
    }
  }
}
