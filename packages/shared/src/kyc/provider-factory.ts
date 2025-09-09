import { KYCProvider, KYCProviderConfig } from './types';
import { StripeIdentityProvider } from './stripe-identity';

export class KYCProviderFactory {
  static createProvider(config: KYCProviderConfig): KYCProvider {
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
