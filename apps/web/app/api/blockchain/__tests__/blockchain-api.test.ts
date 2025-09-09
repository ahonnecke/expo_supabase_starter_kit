import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { POST as createTokenHandler } from '../create-token/route';
import { POST as mintTokensHandler } from '../mint-tokens/route';

// Mock Supabase
jest.mock('@supa/supabase/src/server', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(() => ({
        data: { user: { id: 'test-user-id' } }
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(() => ({
            data: {
              id: 'test-user-id',
              preferences: { isAdmin: true }
            },
            error: null
          }))
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          error: null
        }))
      }))
    }))
  }))
}));

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn(() => ({})),
    Wallet: jest.fn(() => ({
      address: '0x1234567890123456789012345678901234567890'
    })),
    parseEther: jest.fn((value) => BigInt(value) * BigInt(10**18)),
    formatEther: jest.fn((value) => (Number(value) / 10**18).toString())
  }
}));

// Mock BlockchainService
jest.mock('@rentinity/blockchain/src', () => ({
  BlockchainService: jest.fn(() => ({
    connectWallet: jest.fn(),
    createPropertyToken: jest.fn(() => '0xabcdef1234567890abcdef1234567890abcdef12'),
    mintTokens: jest.fn(() => '0x1111222233334444555566667777888899990000'),
    setKycStatus: jest.fn()
  })),
  NetworkType: {
    TESTNET: 'testnet'
  }
}));

describe('Blockchain API Endpoints', () => {
  describe('/api/blockchain/create-token', () => {
    it('should create a property token successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          propertyId: 'test-property-1'
        }
      });

      // Mock successful property fetch
      const mockSupabase = require('@supa/supabase/src/server').createServerClient();
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'test-property-1',
                address: '123 Test St',
                price: 1000000,
                annual_yield_percent: 7.5,
                total_shares: 100000
              },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null }))
        }))
      });

      await createTokenHandler(req as any);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.tokenAddress).toBeDefined();
    });

    it('should reject non-admin users', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          propertyId: 'test-property-1'
        }
      });

      // Mock non-admin user
      const mockSupabase = require('@supa/supabase/src/server').createServerClient();
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'test-user-id',
                preferences: { isAdmin: false }
              },
              error: null
            }))
          }))
        }))
      });

      await createTokenHandler(req as any);

      expect(res._getStatusCode()).toBe(403);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Admin access required');
    });

    it('should handle missing property ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {}
      });

      await createTokenHandler(req as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Property ID is required');
    });
  });

  describe('/api/blockchain/mint-tokens', () => {
    it('should mint tokens successfully', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          propertyId: 'test-property-1',
          walletAddress: '0x1234567890123456789012345678901234567890',
          shares: 1000
        }
      });

      // Mock successful ownership fetch
      const mockSupabase = require('@supa/supabase/src/server').createServerClient();
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'ownership-1',
                shares_owned: 1000,
                properties: {
                  token_contract_address: '0xabcdef1234567890abcdef1234567890abcdef12'
                },
                metadata: {}
              },
              error: null
            }))
          }))
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => ({ error: null }))
        }))
      });

      await mintTokensHandler(req as any);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.transactionHash).toBeDefined();
    });

    it('should reject excessive token minting', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: {
          propertyId: 'test-property-1',
          walletAddress: '0x1234567890123456789012345678901234567890',
          shares: 2000 // More than owned
        }
      });

      // Mock ownership with fewer shares
      const mockSupabase = require('@supa/supabase/src/server').createServerClient();
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({
              data: {
                id: 'ownership-1',
                shares_owned: 1000, // Less than requested
                properties: {
                  token_contract_address: '0xabcdef1234567890abcdef1234567890abcdef12'
                },
                metadata: {}
              },
              error: null
            }))
          }))
        }))
      });

      await mintTokensHandler(req as any);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Cannot mint more tokens than shares owned');
    });
  });
});
