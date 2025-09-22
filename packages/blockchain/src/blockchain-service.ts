import { ethers } from 'ethers';
import { 
  PropertyToken, 
  PropertyTokenMetadata, 
  CreatePropertyTokenParams, 
  TokenBalance, 
  NetworkType,
  BlockchainTransactionResponse,
  KycStatusResponse
} from './types';
import { getBlockchainConfig, getCurrentNetwork } from './config';

// ABI definitions (simplified for the main functions we need)
const PROPERTY_TOKEN_FACTORY_ABI = [
  "function createPropertyToken(string propertyId, string name, string symbol, string propertyAddress, uint256 propertyValue, uint256 annualYieldPercent, uint256 lockupPeriodDays, uint256 totalSupply, address initialHolder) external returns (address)",
  "function getPropertyTokenByPropertyId(string propertyId) external view returns (address)",
  "function getPropertyTokenCount() external view returns (uint256)",
  "function getPropertyTokenByIndex(uint256 index) external view returns (address)",
  "function propertyIdToToken(string) external view returns (address)",
  "event PropertyTokenCreated(string indexed propertyId, address indexed tokenAddress, string propertyAddress, uint256 propertyValue, uint256 annualYieldPercent, uint256 totalSupply)"
];

const PROPERTY_TOKEN_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function propertyAddress() external view returns (string)",
  "function propertyValue() external view returns (uint256)",
  "function annualYieldPercent() external view returns (uint256)",
  "function lockupPeriodEnd() external view returns (uint256)",
  "function transfersRestricted() external view returns (bool)",
  "function kycWhitelist(address) external view returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function setKycStatus(address account, bool isWhitelisted) external",
  "function batchSetKycStatus(address[] accounts, bool isWhitelisted) external",
  "function setTransferRestrictions(bool restricted) external",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event KycStatusChanged(address indexed account, bool isWhitelisted)"
];

export class BlockchainService {
  private provider: ethers.Provider;
  private signer?: ethers.Signer;
  private network: NetworkType;
  private config: any;

  constructor(network?: NetworkType) {
    this.network = network || getCurrentNetwork();
    this.config = getBlockchainConfig(this.network);
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
  }

  /**
   * Connect a wallet signer
   */
  async connectWallet(signer: ethers.Signer) {
    this.signer = signer;
  }

  /**
   * Get the PropertyTokenFactory contract instance
   */
  private getFactoryContract(withSigner = false): ethers.Contract {
    const signerOrProvider = withSigner && this.signer ? this.signer : this.provider;
    return new ethers.Contract(
      this.config.propertyTokenFactoryAddress,
      PROPERTY_TOKEN_FACTORY_ABI,
      signerOrProvider
    );
  }

  /**
   * Get a PropertyToken contract instance
   */
  private getTokenContract(tokenAddress: string, withSigner = false): ethers.Contract {
    const signerOrProvider = withSigner && this.signer ? this.signer : this.provider;
    return new ethers.Contract(tokenAddress, PROPERTY_TOKEN_ABI, signerOrProvider);
  }

  /**
   * Create a new property token
   */
  async createPropertyToken(params: CreatePropertyTokenParams): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const factory = this.getFactoryContract(true);
    
    const tx = await factory.createPropertyToken(
      params.propertyId,
      params.name,
      params.symbol,
      params.propertyAddress,
      params.propertyValue,
      params.annualYieldPercent,
      params.lockupPeriodDays,
      params.totalSupply,
      params.initialHolder
    );

    const receipt = await tx.wait();
    
    // Find the PropertyTokenCreated event to get the token address
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === 'PropertyTokenCreated';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = factory.interface.parseLog(event);
      return parsed?.args.tokenAddress;
    }

    throw new Error('Failed to create property token');
  }

  /**
   * Get property token address by property ID
   */
  async getPropertyTokenAddress(propertyId: string): Promise<string> {
    const factory = this.getFactoryContract();
    return await factory.getPropertyTokenByPropertyId(propertyId);
  }

  /**
   * Get property token details
   */
  async getPropertyToken(tokenAddress: string): Promise<PropertyToken> {
    const token = this.getTokenContract(tokenAddress);
    
    const [
      name,
      symbol,
      decimals,
      totalSupply,
      propertyAddress,
      propertyValue,
      annualYieldPercent,
      lockupPeriodEnd,
      transfersRestricted
    ] = await Promise.all([
      token.name(),
      token.symbol(),
      token.decimals(),
      token.totalSupply(),
      token.propertyAddress(),
      token.propertyValue(),
      token.annualYieldPercent(),
      token.lockupPeriodEnd(),
      token.transfersRestricted()
    ]);

    return {
      address: tokenAddress,
      name,
      symbol,
      totalSupply,
      decimals,
      metadata: {
        propertyAddress,
        propertyValue,
        annualYieldPercent: Number(annualYieldPercent),
        lockupPeriodEnd: new Date(Number(lockupPeriodEnd) * 1000),
        transfersRestricted
      }
    };
  }

  /**
   * Get token balance for an address
   */
  async getTokenBalance(tokenAddress: string, userAddress: string): Promise<bigint> {
    const token = this.getTokenContract(tokenAddress);
    return await token.balanceOf(userAddress);
  }

  /**
   * Get all token balances for a user
   */
  async getUserTokenBalances(userAddress: string): Promise<TokenBalance[]> {
    const factory = this.getFactoryContract();
    const tokenCount = await factory.getPropertyTokenCount();
    
    const balances: TokenBalance[] = [];
    
    for (let i = 0; i < tokenCount; i++) {
      const tokenAddress = await factory.getPropertyTokenByIndex(i);
      const token = await this.getPropertyToken(tokenAddress);
      const balance = await this.getTokenBalance(tokenAddress, userAddress);
      
      if (balance > 0n) {
        balances.push({
          token,
          balance,
          formattedBalance: ethers.formatUnits(balance, token.decimals)
        });
      }
    }
    
    return balances;
  }

  /**
   * Transfer tokens with enhanced error handling
   */
  async transferTokens(tokenAddress: string, to: string, amount: bigint): Promise<BlockchainTransactionResponse> {
    if (!this.signer) {
      return { hash: '', success: false, error: 'Wallet not connected. Please connect your wallet and try again.' };
    }

    try {
      const token = this.getTokenContract(tokenAddress, true);
      
      // Check if the user has enough balance
      const signerAddress = await this.signer.getAddress();
      const balance = await token.balanceOf(signerAddress);
      
      if (balance < amount) {
        return { 
          hash: '', 
          success: false, 
          error: `Insufficient balance. You have ${ethers.formatUnits(balance, 18)} tokens but are trying to transfer ${ethers.formatUnits(amount, 18)}.` 
        };
      }
      
      // Check if transfers are restricted
      try {
        const transfersRestricted = await token.transfersRestricted();
        if (transfersRestricted) {
          // Check if recipient is whitelisted
          const isWhitelisted = await token.kycWhitelist(to);
          if (!isWhitelisted) {
            return { 
              hash: '', 
              success: false, 
              error: 'Transfer failed: Recipient address is not whitelisted for this token.' 
            };
          }
        }
      } catch (err) {
        // Some tokens might not have this function, so we'll continue if it fails
        console.warn('Could not check transfer restrictions:', err);
      }
      
      // Execute the transfer
      const tx = await token.transfer(to, amount);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: true };
    } catch (err: any) {
      // Handle specific error types
      if (err.code === 'ACTION_REJECTED') {
        return { hash: '', success: false, error: 'Transaction was rejected by the user.' };
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        return { hash: '', success: false, error: 'Insufficient ETH to pay for gas fees.' };
      } else if (err.message && err.message.includes('execution reverted')) {
        // Try to extract the revert reason if available
        const revertReason = err.message.includes('reverted with reason string') 
          ? err.message.split("'")[1] 
          : 'Transaction reverted by the smart contract.';
        return { hash: '', success: false, error: `Transaction failed: ${revertReason}` };
      }
      
      // Generic error handling
      return { 
        hash: '', 
        success: false, 
        error: `Transaction failed: ${err.message || 'Unknown error occurred'}` 
      };
    }
  }

  /**
   * Mint tokens (admin only) with enhanced error handling
   */
  async mintTokens(tokenAddress: string, to: string, amount: bigint): Promise<BlockchainTransactionResponse> {
    if (!this.signer) {
      return { hash: '', success: false, error: 'Wallet not connected. Please connect your wallet and try again.' };
    }

    try {
      const token = this.getTokenContract(tokenAddress, true);
      
      // Check if the address is valid
      if (!ethers.isAddress(to)) {
        return { hash: '', success: false, error: 'Invalid recipient address.' };
      }
      
      // Check if amount is valid
      if (amount <= 0n) {
        return { hash: '', success: false, error: 'Amount must be greater than zero.' };
      }
      
      // Execute the mint transaction
      const tx = await token.mint(to, amount);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: true };
    } catch (err: any) {
      // Handle specific error types
      if (err.code === 'ACTION_REJECTED') {
        return { hash: '', success: false, error: 'Transaction was rejected by the user.' };
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        return { hash: '', success: false, error: 'Insufficient ETH to pay for gas fees.' };
      } else if (err.message && err.message.includes('execution reverted')) {
        // Try to extract the revert reason if available
        const revertReason = err.message.includes('reverted with reason string') 
          ? err.message.split("'")[1] 
          : 'Transaction reverted by the smart contract.';
          
        // Check for common revert reasons
        if (revertReason.includes('Ownable: caller is not the owner')) {
          return { hash: '', success: false, error: 'Minting failed: You do not have admin rights to mint tokens.' };
        }
        
        return { hash: '', success: false, error: `Minting failed: ${revertReason}` };
      }
      
      // Generic error handling
      return { 
        hash: '', 
        success: false, 
        error: `Minting failed: ${err.message || 'Unknown error occurred'}` 
      };
    }
  }

  /**
   * Set KYC status for an address with enhanced error handling
   */
  async setKycStatus(tokenAddress: string, userAddress: string, isWhitelisted: boolean): Promise<KycStatusResponse> {
    if (!this.signer) {
      return { hash: '', success: false, error: 'Wallet not connected. Please connect your wallet and try again.' };
    }

    try {
      // Validate address
      if (!ethers.isAddress(userAddress)) {
        return { hash: '', success: false, error: 'Invalid user address.' };
      }
      
      const token = this.getTokenContract(tokenAddress, true);
      const tx = await token.setKycStatus(userAddress, isWhitelisted);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: true };
    } catch (err: any) {
      // Handle specific error types
      if (err.code === 'ACTION_REJECTED') {
        return { hash: '', success: false, error: 'Transaction was rejected by the user.' };
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        return { hash: '', success: false, error: 'Insufficient ETH to pay for gas fees.' };
      } else if (err.message && err.message.includes('execution reverted')) {
        // Try to extract the revert reason if available
        const revertReason = err.message.includes('reverted with reason string') 
          ? err.message.split("'")[1] 
          : 'Transaction reverted by the smart contract.';
          
        // Check for common revert reasons
        if (revertReason.includes('Ownable: caller is not the owner')) {
          return { hash: '', success: false, error: 'KYC update failed: You do not have admin rights to update KYC status.' };
        }
        
        return { hash: '', success: false, error: `KYC update failed: ${revertReason}` };
      }
      
      // Generic error handling
      return { 
        hash: '', 
        success: false, 
        error: `KYC update failed: ${err.message || 'Unknown error occurred'}` 
      };
    }
  }

  /**
   * Batch set KYC status for multiple addresses with enhanced error handling
   */
  async batchSetKycStatus(tokenAddress: string, addresses: string[], isWhitelisted: boolean): Promise<KycStatusResponse> {
    if (!this.signer) {
      return { hash: '', success: false, error: 'Wallet not connected. Please connect your wallet and try again.' };
    }

    try {
      // Validate addresses
      const invalidAddresses = addresses.filter(addr => !ethers.isAddress(addr));
      if (invalidAddresses.length > 0) {
        return { 
          hash: '', 
          success: false, 
          error: `Invalid addresses detected: ${invalidAddresses.length} addresses are invalid.`,
          invalidAddresses
        };
      }
      
      // Check if the array is empty
      if (addresses.length === 0) {
        return { hash: '', success: false, error: 'No addresses provided for KYC update.' };
      }
      
      const token = this.getTokenContract(tokenAddress, true);
      const tx = await token.batchSetKycStatus(addresses, isWhitelisted);
      const receipt = await tx.wait();
      
      return { hash: receipt.hash, success: true };
    } catch (err: any) {
      // Handle specific error types
      if (err.code === 'ACTION_REJECTED') {
        return { hash: '', success: false, error: 'Transaction was rejected by the user.' };
      } else if (err.code === 'INSUFFICIENT_FUNDS') {
        return { hash: '', success: false, error: 'Insufficient ETH to pay for gas fees.' };
      } else if (err.message && err.message.includes('execution reverted')) {
        // Try to extract the revert reason if available
        const revertReason = err.message.includes('reverted with reason string') 
          ? err.message.split("'")[1] 
          : 'Transaction reverted by the smart contract.';
          
        // Check for common revert reasons
        if (revertReason.includes('Ownable: caller is not the owner')) {
          return { hash: '', success: false, error: 'Batch KYC update failed: You do not have admin rights to update KYC status.' };
        }
        
        return { hash: '', success: false, error: `Batch KYC update failed: ${revertReason}` };
      }
      
      // Generic error handling
      return { 
        hash: '', 
        success: false, 
        error: `Batch KYC update failed: ${err.message || 'Unknown error occurred'}` 
      };
    }
  }

  /**
   * Check if address is KYC whitelisted
   */
  async isKycWhitelisted(tokenAddress: string, userAddress: string): Promise<boolean> {
    const token = this.getTokenContract(tokenAddress);
    return await token.kycWhitelist(userAddress);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string) {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Get current block number
   */
  async getCurrentBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }

  /**
   * Format token amount for display
   */
  formatTokenAmount(amount: bigint, decimals: number): string {
    return ethers.formatUnits(amount, decimals);
  }

  /**
   * Parse token amount from string
   */
  parseTokenAmount(amount: string, decimals: number): bigint {
    return ethers.parseUnits(amount, decimals);
  }

  /**
   * Get explorer URL for transaction
   */
  getTransactionUrl(txHash: string): string {
    return `${this.config.explorerUrl}/tx/${txHash}`;
  }

  /**
   * Get explorer URL for address
   */
  getAddressUrl(address: string): string {
    return `${this.config.explorerUrl}/address/${address}`;
  }
}
