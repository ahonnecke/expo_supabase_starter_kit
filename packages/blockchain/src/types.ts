export interface PropertyTokenMetadata {
  propertyAddress: string;
  propertyValue: bigint;
  annualYieldPercent: number;
  lockupPeriodEnd: Date;
  transfersRestricted: boolean;
}

export interface PropertyToken {
  address: string;
  name: string;
  symbol: string;
  totalSupply: bigint;
  decimals: number;
  metadata: PropertyTokenMetadata;
}

export interface CreatePropertyTokenParams {
  propertyId: string;
  name: string;
  symbol: string;
  propertyAddress: string;
  propertyValue: bigint;
  annualYieldPercent: number;
  lockupPeriodDays: number;
  totalSupply: bigint;
  initialHolder: string;
}

export interface TokenBalance {
  token: PropertyToken;
  balance: bigint;
  formattedBalance: string;
}

export interface BlockchainConfig {
  chainId: number;
  rpcUrl: string;
  propertyTokenFactoryAddress: string;
  explorerUrl: string;
}

export enum NetworkType {
  LOCALHOST = 'localhost',
  TESTNET = 'testnet',
  MAINNET = 'mainnet'
}
