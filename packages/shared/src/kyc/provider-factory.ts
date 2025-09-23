import { KYCProvider, KYCProviderConfig } from './types';
import { StripeIdentityProvider } from './stripe-identity';
import { MockKYCProvider } from './mock-provider';

export class KYCProviderFactory {
  static createProvider(config: KYCProviderConfig): KYCProvider {
    // Check if mock KYC is enabled via environment variable
    const mockKycEnabled = typeof process !== 'undefined' && 
      (process.env.MOCK_KYC === 'true' || process.env.NEXT_PUBLIC_MOCK_KYC === 'true');
    
    if (mockKycEnabled) {
      console.log('⚠️ MOCK KYC ENABLED - Using mock KYC provider for testing purposes');
      return new MockKYCProvider();
    }
    
    // Use the specified provider if mock is not enabled
    switch (config.provider.toLowerCase()) {
      case 'stripe':
        return new StripeIdentityProvider(config.apiKey);
      // Add more providers as needed
      // case 'persona':
      //   return new PersonaProvider(config.apiKey, config.options);
      // case 'alloy':
      //   return new AlloyProvider(config.apiKey, config.options);
      default:
        throw new Error(`Unsupported KYC provider: ${config.provider}`);
    }
  }
}
