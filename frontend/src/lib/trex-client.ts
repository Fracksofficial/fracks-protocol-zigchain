/**
 * TREX Contract Client
 * Unified interface for interacting with TREX security token contracts
 */

import { SigningCosmWasmClient, CosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { GasPrice } from '@cosmjs/stargate';
import { TREX_CONTRACTS, getZigChainConfig } from './zigchain-config';
import type {
  TokenInfo,
  BalanceResponse,
  TokenQueryMsg,
  TokenExecuteMsg,
  IsVerifiedResponse,
  IdentityResponse,
  IRConfigResponse,
  IRQueryMsg,
  IRExecuteMsg,
  TIRQueryMsg,
  TIRExecuteMsg,
  AllIssuersResponse,
  CTRQueryMsg,
  CTRExecuteMsg,
  RequiredTopicsResponse,
  ComplianceConfigResponse,
  OIDQueryMsg,
  OIDExecuteMsg,
  ClaimResponse,
  ClaimsByTopicResponse,
  CanTransferResponse,
  ComplianceQueryMsg,
  ComplianceExecuteMsg,
  Coin,
  OIDInstantiateMsg,
  TrexToken,
  UserIdentity,
  TrexCompliance,
  FactoryConfig,
  TokenInfoFromFactory,
  AllTokensResponse,
  FactoryQueryMsg,
  FactoryExecuteMsg,
} from '@/types/trex-contracts';

export class TrexClient {
  private client: CosmWasmClient | SigningCosmWasmClient;
  private walletAddress?: string;
  private readonly inflightQueries = new Map<string, Promise<unknown>>();
  private readonly queryCache = new Map<
    string,
    { expiresAt: number; value: unknown }
  >();
  private readonly nativeBalanceCache = new Map<
    string,
    { expiresAt: number; value: string }
  >();
  private readonly userIdentityInflight = new Map<string, Promise<UserIdentity>>();
  private readonly userIdentityCache = new Map<
    string,
    { expiresAt: number; value: UserIdentity }
  >();

  private static readonly DEFAULT_QUERY_TTL_MS = 1200;
  private static readonly IDENTITY_QUERY_TTL_MS = 2500;
  private static readonly USER_IDENTITY_TTL_MS = 5000;

  constructor(client: CosmWasmClient | SigningCosmWasmClient, walletAddress?: string) {
    this.client = client;
    this.walletAddress = walletAddress;
  }

  /**
   * Resolve token contract address (defaults to configured token)
   */
  private resolveTokenContract(tokenContract?: string): string {
    return tokenContract || TREX_CONTRACTS.token;
  }

  private buildQueryKey(contractAddress: string, query: unknown): string {
    return `${contractAddress}:${JSON.stringify(query)}`;
  }

  private async querySmartCached<T>(
    contractAddress: string,
    query: unknown,
    ttlMs: number = TrexClient.DEFAULT_QUERY_TTL_MS
  ): Promise<T> {
    const now = Date.now();
    const key = this.buildQueryKey(contractAddress, query);

    const cached = this.queryCache.get(key);
    if (cached && cached.expiresAt > now) {
      return cached.value as T;
    }

    const inflight = this.inflightQueries.get(key);
    if (inflight) {
      return inflight as Promise<T>;
    }

    const request = (async () => {
      const result = await this.client.queryContractSmart(contractAddress, query);
      if (ttlMs > 0) {
        this.queryCache.set(key, {
          value: result,
          expiresAt: Date.now() + ttlMs,
        });
      }
      return result as T;
    })().finally(() => {
      this.inflightQueries.delete(key);
    });

    this.inflightQueries.set(key, request as Promise<unknown>);
    return request;
  }

  /**
   * Create a read-only client (queries only)
   */
  static async connectReadOnly(): Promise<TrexClient> {
    const config = getZigChainConfig();
    const client = await CosmWasmClient.connect(config.rpcEndpoint);
    return new TrexClient(client);
  }

  /**
   * Create a signing client (queries + transactions)
   */
  static async connectWithSigner(
    signer: any,
    walletAddress: string
  ): Promise<TrexClient> {
    const config = getZigChainConfig();
    const client = await SigningCosmWasmClient.connectWithSigner(
      config.rpcEndpoint,
      signer,
      {
        gasPrice: GasPrice.fromString(config.gasPrice),
      }
    );
    return new TrexClient(client, walletAddress);
  }

  // ========================================
  // TOKEN CONTRACT QUERIES
  // ========================================

  /**
   * Get token information (name, symbol, decimals, supply)
   */
  async getTokenInfo(tokenContract?: string): Promise<TokenInfo> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const query: TokenQueryMsg = { token_info: {} };
    return await this.querySmartCached<TokenInfo>(contractAddress, query);
  }

  /**
   * Get token balance for an address (RWASEC tokens, not native ZIG)
   */
  async getBalance(address: string, tokenContract?: string): Promise<string> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const query: TokenQueryMsg = { balance: { address } };
    // Contract returns balance as a raw string, not wrapped in an object
    const response: string = await this.querySmartCached<string>(
      contractAddress,
      query
    );
    return response;
  }

  /**
   * Get native ZIG balance for an address
   */
  async getNativeBalance(address: string): Promise<string> {
    const cached = this.nativeBalanceCache.get(address);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    try {
      const client = this.client as SigningCosmWasmClient;
      const balance = await client.getBalance(address, 'uzig');
      this.nativeBalanceCache.set(address, {
        value: balance.amount,
        expiresAt: Date.now() + TrexClient.DEFAULT_QUERY_TTL_MS,
      });
      return balance.amount;
    } catch (error) {
      console.error('Failed to fetch native balance:', error);
      return '0';
    }
  }

  /**
   * Get comprehensive token data
   */
  async getTokenData(tokenContract?: string): Promise<TrexToken> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const info = await this.getTokenInfo(contractAddress);
    return {
      address: contractAddress,
      name: info.name,
      symbol: info.symbol,
      decimals: info.decimals,
      totalSupply: info.total_supply,
      isPaused: false, // TODO: Add pause query
    };
  }

  /**
   * Check if an address is frozen
   */
  async isFrozen(address: string, tokenContract?: string): Promise<boolean> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg: TokenQueryMsg = { frozen: { address } };
    const response = await this.querySmartCached<boolean>(contractAddress, msg);
    return response;
  }

  // ========================================
  // TOKEN CONTRACT EXECUTIONS
  // ========================================

  /**
   * Transfer tokens to another address
   */
  async transfer(recipient: string, amount: string, memo?: string): Promise<string> {
    this.ensureSigner();
    const msg: TokenExecuteMsg = { transfer: { recipient, amount } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.token,
      msg,
      'auto',
      memo
    );
    return result.transactionHash;
  }

  /**
   * Mint new tokens (issuer only)
   */
  async mint(recipient: string, amount: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg: TokenExecuteMsg = { mint: { recipient, amount } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Burn tokens
   */
  async burn(amount: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg: TokenExecuteMsg = { burn: { amount } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Freeze an address (admin only)
   */
  async freezeAddress(address: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg: TokenExecuteMsg = { freeze: { address } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Unfreeze an address (admin only)
   */
  async unfreezeAddress(address: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg: TokenExecuteMsg = { unfreeze: { address } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Pause all token transfers (admin only)
   */
  async pauseToken(tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg: TokenExecuteMsg = { pause: {} };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Unpause token transfers (admin only)
   */
  async unpauseToken(tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg: TokenExecuteMsg = { unpause: {} };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Batch set KYC status for multiple addresses (agent/owner only)
   */
  async batchSetKyc(
    updates: Array<{ address: string; status: string }>,
    tokenContract?: string
  ): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg: TokenExecuteMsg = { batch_set_kyc: { updates } };
    console.log('Batch setting KYC status:', { count: updates.length });
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  // ========================================
  // COMPLIANCE EXECUTIONS
  // ========================================

  /**
   * Set transfer limit for a specific address (compliance contract)
   */
  async setAddressTransferLimit(address: string, limit?: string): Promise<string> {
    this.ensureSigner();
    const msg: ComplianceExecuteMsg = {
      set_per_address_limit: { address, limit },
    };
    console.log('Setting transfer limit:', { address, limit });
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.compliance,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Set allowed countries for compliance (compliance contract)
   */
  async setAllowedCountries(countries?: string[]): Promise<string> {
    this.ensureSigner();
    const msg: ComplianceExecuteMsg = {
      set_allowed_countries: { countries },
    };
    console.log('Setting allowed countries:', { countries });
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.compliance,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  // ========================================
  // IDENTITY REGISTRY QUERIES
  // ========================================

  /**
   * Check if a wallet is verified (has required claims)
   */
  async isVerified(wallet: string): Promise<IsVerifiedResponse> {
    const query: IRQueryMsg = { is_verified: { wallet } };
    return await this.querySmartCached<IsVerifiedResponse>(
      TREX_CONTRACTS.identityRegistry,
      query,
      TrexClient.IDENTITY_QUERY_TTL_MS
    );
  }

  /**
   * Get identity information for a wallet
   */
  async getIdentity(wallet: string): Promise<IdentityResponse> {
    const query: IRQueryMsg = { identity: { wallet } };
    return await this.querySmartCached<IdentityResponse>(
      TREX_CONTRACTS.identityRegistry,
      query,
      TrexClient.IDENTITY_QUERY_TTL_MS
    );
  }

  /**
   * Get comprehensive user identity data
   */
  async getUserIdentity(wallet: string): Promise<UserIdentity> {
    const now = Date.now();
    const cached = this.userIdentityCache.get(wallet);
    if (cached && cached.expiresAt > now) {
      return cached.value;
    }

    const existing = this.userIdentityInflight.get(wallet);
    if (existing) {
      return existing;
    }

    const request = (async () => {
    const [identity, verification] = await Promise.all([
      this.getIdentity(wallet),
      this.isVerified(wallet),
    ]);

    let claims = [];
    if (identity.identity_addr) {
      try {
        // Fetch ALL claims from topics 1-10 (not just required topics)
        // This allows users to see all claims added to their OnchainID
        const allTopics = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        const claimPromises = allTopics.map((topic) =>
          this.getClaimsByTopic(identity.identity_addr!, topic).catch(() => [])
        );
        const claimResults = await Promise.all(claimPromises);
        claims = claimResults.flat();
      } catch (error) {
        console.error('Failed to fetch claims:', error);
      }
    }

    const response: UserIdentity = {
      wallet,
      onchainIdAddress: identity.identity_addr,
      country: identity.country,
      isVerified: verification.verified,
      verificationReason: verification.reason,
      claims,
    };
    this.userIdentityCache.set(wallet, {
      value: response,
      expiresAt: Date.now() + TrexClient.USER_IDENTITY_TTL_MS,
    });
    return response;
    })().finally(() => {
      this.userIdentityInflight.delete(wallet);
    });

    this.userIdentityInflight.set(wallet, request);
    return request;
  }

  // ========================================
  // IDENTITY REGISTRY EXECUTIONS
  // ========================================

  /**
   * Register an identity in the registry
   */
  async registerIdentity(
    wallet: string,
    identityAddr: string,
    country?: string
  ): Promise<string> {
    this.ensureSigner();
    const msg: IRExecuteMsg = {
      register_identity: { wallet, identity_addr: identityAddr, country },
    };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.identityRegistry,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Unregister an identity
   */
  async unregisterIdentity(wallet: string): Promise<string> {
    this.ensureSigner();
    const msg: IRExecuteMsg = { unregister_identity: { wallet } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.identityRegistry,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  // ========================================
  // ONCHAINID OPERATIONS
  // ========================================

  /**
   * Instantiate a new OnChainID contract FOR an investor
   * This should be called by KYC Provider, NOT by the investor themselves
   * @param investorWallet - The wallet address of the investor who will own this OnchainID
   * @param label - Optional label for the contract
   * @returns The address of the created OnchainID contract
   */
  async createOnChainIdForInvestor(investorWallet: string, label?: string): Promise<string> {
    this.ensureSigner();
    // The owner of OnchainID is the investor, but KYC Provider instantiates it
    const msg: OIDInstantiateMsg = { 
      owner: investorWallet,
    };
    const result = await (this.client as SigningCosmWasmClient).instantiate(
      this.walletAddress!, // KYC Provider's wallet pays and instantiates
      TREX_CONTRACTS.onchainIdCodeId,
      msg,
      label || `OnChainID-${investorWallet.slice(0, 10)}`,
      'auto'
    );
    return result.contractAddress;
  }

  /**
   * @deprecated Use createOnChainIdForInvestor instead
   * Legacy method for backward compatibility
   */
  async createOnChainId(owner: string, label?: string): Promise<string> {
    return this.createOnChainIdForInvestor(owner, label);
  }

  /**
   * Add a claim to an OnChainID
   */
  async addClaim(
    identityAddr: string,
    topic: number,
    data?: string,
    expiresAt?: number
  ): Promise<string> {
    this.ensureSigner();
    
    // Build message dynamically - only include fields with actual values
    // The deployed contract might not accept explicit null values
    const addClaimFields: any = {
      topic,
      issuer: this.walletAddress!,
    };
    
    // Only add optional fields if they have non-null values
    if (data) {
      addClaimFields.data = data;
    }
    if (expiresAt) {
      addClaimFields.expires_at = expiresAt;
    }
    
    const msg = {
      add_claim: addClaimFields,
    };
    
    console.log('AddClaim message:', JSON.stringify(msg, null, 2));
    console.log('Identity address:', identityAddr);
    console.log('Sender address:', this.walletAddress);
    
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      identityAddr,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Revoke a claim from an OnChainID
   */
  async revokeClaim(
    identityAddr: string,
    topic: number,
    claimId: number
  ): Promise<string> {
    this.ensureSigner();
    
    const msg = {
      revoke_claim: {
        topic,
        claim_id: claimId,
      },
    };
    
    console.log('RevokeClaim message:', JSON.stringify(msg, null, 2));
    console.log('Identity address:', identityAddr);
    console.log('Sender address:', this.walletAddress);
    
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      identityAddr,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Get a specific claim from an OnChainID
   */
  async getClaim(identityAddr: string, topic: number, issuer: string): Promise<ClaimResponse> {
    const query: OIDQueryMsg = { get_claim: { topic, issuer } };
    return await this.querySmartCached<ClaimResponse>(
      identityAddr,
      query,
      TrexClient.IDENTITY_QUERY_TTL_MS
    );
  }

  /**
   * Get all claims for a topic from an OnChainID
   */
  async getClaimsByTopic(identityAddr: string, topic: number): Promise<any[]> {
    const query: OIDQueryMsg = { claims_by_topic: { topic } };
    // Contract returns Vec<ClaimResponse> directly, not wrapped in an object
    const claims = await this.querySmartCached<any[]>(
      identityAddr,
      query,
      TrexClient.IDENTITY_QUERY_TTL_MS
    );
    return Array.isArray(claims) ? claims : [];
  }

  // ========================================
  // COMPLIANCE QUERIES
  // ========================================

  /**
   * Check if a transfer would be compliant
   */
  async canTransfer(
    from: string,
    to: string,
    amount: string,
    tokenContract?: string
  ): Promise<CanTransferResponse> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const query: ComplianceQueryMsg = {
      can_transfer: { token: contractAddress, from, to, amount },
    };
    return await this.querySmartCached<CanTransferResponse>(
      TREX_CONTRACTS.compliance,
      query
    );
  }

  /**
   * Get comprehensive compliance data
   */
  async getComplianceData(): Promise<TrexCompliance> {
    const [requiredTopics, trustedIssuers] = await Promise.all([
      this.getRequiredTopics(),
      this.getTrustedIssuers(),
    ]);

    return {
      canTransfer: true,
      requiredTopics: requiredTopics.topics,
      trustedIssuers: trustedIssuers.issuers,
    };
  }

  // ========================================
  // TRUSTED ISSUERS REGISTRY
  // ========================================

  /**
   * Get all trusted issuers
   */
  async getTrustedIssuers(): Promise<AllIssuersResponse> {
    const query: TIRQueryMsg = { all_issuers: {} };
    return await this.querySmartCached<AllIssuersResponse>(
      TREX_CONTRACTS.trustedIssuers,
      query
    );
  }

  /**
   * Check if a wallet is a trusted issuer and for which topics
   */
  async getIssuerTopics(issuer: string): Promise<number[] | null> {
    try {
      const query: TIRQueryMsg = { issuer_topics: { issuer } };
      const result: { issuer: string; topics: number[] } = await this.querySmartCached(
        TREX_CONTRACTS.trustedIssuers,
        query
      );
      return result.topics.length > 0 ? result.topics : null;
    } catch (error) {
      return null; // Not a trusted issuer
    }
  }

  /**
   * Check if a wallet is a trusted issuer for a specific topic
   */
  async isIssuerForTopic(issuer: string, topic: number): Promise<boolean> {
    try {
      const query: TIRQueryMsg = { is_issuer_for_topic: { issuer, topic } };
      const result: { issuer: string; topic: number; allowed: boolean } = 
        await this.querySmartCached(TREX_CONTRACTS.trustedIssuers, query);
      return result.allowed;
    } catch (error) {
      return false;
    }
  }

  /**
   * Add a trusted issuer (admin only)
   */
  async addTrustedIssuer(issuer: string, topics: number[]): Promise<string> {
    this.ensureSigner();
    const msg: TIRExecuteMsg = { add_issuer: { issuer, topics } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.trustedIssuers,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Remove a trusted issuer (admin only)
   */
  async removeTrustedIssuer(issuer: string): Promise<string> {
    this.ensureSigner();
    const msg: TIRExecuteMsg = { remove_issuer: { issuer } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.trustedIssuers,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Update Trusted Issuers Registry owner (current owner only)
   */
  async updateTirOwner(owner: string): Promise<string> {
    this.ensureSigner();
    const msg: TIRExecuteMsg = { update_owner: { owner } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.trustedIssuers,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  // ========================================
  // CLAIM TOPICS REGISTRY
  // ========================================

  /**
   * Get required claim topics
   */
  async getRequiredTopics(): Promise<RequiredTopicsResponse> {
    const query: CTRQueryMsg = { required_topics: {} };
    return await this.querySmartCached<RequiredTopicsResponse>(
      TREX_CONTRACTS.claimTopics,
      query
    );
  }

  /**
   * Set required claim topics (admin only)
   */
  async setRequiredTopics(topics: number[]): Promise<string> {
    this.ensureSigner();
    const msg: CTRExecuteMsg = { set_required_topics: { topics } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.claimTopics,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Get identity registry configuration (owner, trusted issuers, claim topics)
   */
  async getIdentityRegistryConfig(): Promise<IRConfigResponse> {
    const query: IRQueryMsg = { config: {} };
    return await this.querySmartCached<IRConfigResponse>(
      TREX_CONTRACTS.identityRegistry,
      query
    );
  }

  /**
   * Get claim topics registry owner
   */
  async getClaimTopicsOwner(): Promise<string> {
    const query: CTRQueryMsg = { owner: {} };
    const response: { owner: string } = await this.querySmartCached(
      TREX_CONTRACTS.claimTopics,
      query
    );
    return response.owner;
  }

  /**
   * Get compliance contract configuration (owner, identity registry)
   */
  async getComplianceConfig(): Promise<ComplianceConfigResponse> {
    const query: ComplianceQueryMsg = { config: {} };
    return await this.querySmartCached<ComplianceConfigResponse>(
      TREX_CONTRACTS.compliance,
      query
    );
  }

  /**
   * Get Trusted Issuers Registry owner (raw state query)
   */
  async getTirOwner(): Promise<string | null> {
    const key = new TextEncoder().encode('owner');
    const data = await this.client.queryContractRaw(
      TREX_CONTRACTS.trustedIssuers,
      key
    );
    if (!data) return null;

    const decoded = new TextDecoder().decode(data);
    try {
      return JSON.parse(decoded);
    } catch {
      return decoded;
    }
  }

  // ========================================
  // ROLE MANAGEMENT
  // ========================================

  /**
   * Get all roles (owner, issuer, controller)
   */
  async getRoles(tokenContract?: string): Promise<{ owner: string; issuer: string; controller: string }> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const query = { roles: {} };
    return await this.querySmartCached<{ owner: string; issuer: string; controller: string }>(
      contractAddress,
      query
    );
  }

  /**
   * Check if an address is an agent
   */
  async isAgent(address: string, tokenContract?: string): Promise<boolean> {
    const { agents } = await this.getAgents(tokenContract);
    return agents.includes(address);
  }

  /**
   * Get all agents
   */
  async getAgents(tokenContract?: string): Promise<{ agents: string[] }> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const query = { agents: {} };
    return await this.querySmartCached<{ agents: string[] }>(
      contractAddress,
      query
    );
  }

  /**
   * Update owner (owner only)
   */
  async updateOwner(newOwner: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg = { update_owner: { owner: newOwner } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Update issuer (owner only)
   */
  async updateIssuer(newIssuer: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg = { update_issuer: { issuer: newIssuer } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Update controller (owner only)
   */
  async updateController(newController: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg = { update_controller: { controller: newController } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Add an agent (owner only)
   */
  async addAgent(agent: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg = { add_agent: { address: agent } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  /**
   * Remove an agent (owner only)
   */
  async removeAgent(agent: string, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    const msg = { remove_agent: { address: agent } };
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto'
    );
    return result.transactionHash;
  }

  // ========================================
  // RWA ASSET MANAGEMENT
  // ========================================

  /**
   * Query all assets from the token contract
   */
  async getAllAssets(
    startAfter?: number,
    limit?: number,
    tokenContract?: string
  ): Promise<AssetInfo[]> {
    // Note: Contract needs AllAssets query added
    // For now, we'll iterate through known asset IDs
    const assets: AssetInfo[] = [];
    const maxAssets = limit || 100;
    const start = startAfter || 1;
    
    for (let id = start; id <= start + maxAssets; id++) {
      try {
        const asset = await this.getAssetInfo(id, tokenContract);
        assets.push(asset);
      } catch (error) {
        // Asset ID doesn't exist, stop iteration
        break;
      }
    }
    
    return assets;
  }

  /**
   * Query single asset information
   */
  async getAssetInfo(assetId: number, tokenContract?: string): Promise<AssetInfo> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const query = { asset_info: { asset_id: assetId } };
    const response: AssetInfoResponse = await this.querySmartCached(
      contractAddress,
      query
    );
    
    return {
      id: response.asset_id,
      referenceId: response.reference_id,
      description: response.description,
      legalOwner: response.legal_owner,
      metadata: response.metadata ? JSON.parse(response.metadata) : null,
      totalTokenized: response.total_tokenized,
    };
  }

  /**
   * Create a new asset (owner only)
   */
  async createAsset(
    assetData: CreateAssetParams,
    tokenContract?: string
  ): Promise<CreateAssetResult> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    
    // Serialize metadata to JSON string
    const metadataString = JSON.stringify({
      name: assetData.name,
      type: assetData.type,
      location: assetData.location,
      underlyingValue: assetData.underlyingValue,
      currency: assetData.currency || 'USD',
      ...assetData.additionalMetadata,
    });
    
    const msg = {
      create_asset: {
        reference_id: assetData.referenceId,
        description: assetData.description,
        legal_owner: assetData.legalOwner,
        metadata: metadataString,
      },
    };
    
    console.log('Creating asset with message:', JSON.stringify(msg, null, 2));
    
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto',
      'Create new RWA asset'
    );
    
    // Extract asset_id from events
    const createEvent = result.events.find((e) => e.type === 'wasm');
    const assetIdAttr = createEvent?.attributes.find((a) => a.key === 'asset_id');
    const assetId = assetIdAttr ? parseInt(assetIdAttr.value) : 0;
    
    return {
      assetId,
      txHash: result.transactionHash,
    };
  }

  /**
   * Issue tokens for an asset (issuer only)
   * Creates an issuance request that needs controller approval
   */
  async issueAsset(
    assetId: number,
    recipient: string,
    amount: string,
    tokenContract?: string
  ): Promise<IssueAssetResult> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    
    const msg = {
      issue_asset: {
        asset_id: assetId,
        recipient,
        amount,
      },
    };
    
    console.log('Issuing asset with message:', JSON.stringify(msg, null, 2));
    
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto',
      `Issue tokens for asset ${assetId}`
    );
    
    // Extract request_id from events
    const issueEvent = result.events.find((e) => e.type === 'wasm');
    const requestIdAttr = issueEvent?.attributes.find((a) => a.key === 'request_id');
    const requestId = requestIdAttr ? parseInt(requestIdAttr.value) : 0;
    
    return {
      requestId,
      txHash: result.transactionHash,
    };
  }

  /**
   * Approve an issuance request (controller only)
   * This actually mints the tokens
   */
  async approveIssue(requestId: number, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    
    const msg = {
      approve_issue: {
        request_id: requestId,
      },
    };
    
    console.log('Approving issuance with message:', JSON.stringify(msg, null, 2));
    
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto',
      `Approve issuance request ${requestId}`
    );
    
    return result.transactionHash;
  }

  /**
   * Request redemption of asset tokens
   */
  async requestRedemption(
    assetId: number,
    amount: string,
    reason?: string,
    tokenContract?: string
  ): Promise<RequestRedemptionResult> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    
    const msg = {
      request_redemption: {
        asset_id: assetId,
        amount,
        reason,
      },
    };
    
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto',
      `Request redemption for asset ${assetId}`
    );
    
    // Extract request_id from events
    const redeemEvent = result.events.find((e) => e.type === 'wasm');
    const requestIdAttr = redeemEvent?.attributes.find((a) => a.key === 'request_id');
    const requestId = requestIdAttr ? parseInt(requestIdAttr.value) : 0;
    
    return {
      requestId,
      txHash: result.transactionHash,
    };
  }

  /**
   * Approve a redemption request (controller only)
   */
  async approveRedemption(requestId: number, tokenContract?: string): Promise<string> {
    this.ensureSigner();
    const contractAddress = this.resolveTokenContract(tokenContract);
    
    const msg = {
      approve_redemption: {
        request_id: requestId,
      },
    };
    
    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      contractAddress,
      msg,
      'auto',
      `Approve redemption request ${requestId}`
    );
    
    return result.transactionHash;
  }

  /**
   * Query redemption requests
   */
  async getRedemptionRequests(
    startAfter?: number,
    limit?: number,
    tokenContract?: string
  ): Promise<RedemptionRequest[]> {
    const contractAddress = this.resolveTokenContract(tokenContract);
    const query = {
      redemption_requests: {
        start_after: startAfter,
        limit: limit || 10,
      },
    };
    
    const response: RedemptionRequestResponse[] = await this.querySmartCached(
      contractAddress,
      query
    );
    
    return response.map((r) => ({
      id: r.id,
      assetId: r.asset_id,
      requester: r.requester,
      amount: r.amount,
      approved: r.approved,
      reason: r.reason,
    }));
  }

  // ========================================
  // UTILITIES
  // ========================================

  /**
   * Get the current wallet address
   */
  getWalletAddress(): string | undefined {
    return this.walletAddress;
  }

  /**
   * Check if client can sign transactions
   */
  canSign(): boolean {
    return this.walletAddress !== undefined && 'execute' in this.client;
  }

  /**
   * Ensure the client has signing capabilities
   */
  private ensureSigner(): void {
    if (!this.canSign()) {
      throw new Error('Signing client required. Please connect your wallet first.');
    }
  }

  // ========================================
  // FACTORY CONTRACT METHODS
  // ========================================

  /**
   * Get factory configuration
   */
  async getFactoryConfig(): Promise<FactoryConfig> {
    const query: FactoryQueryMsg = { config: {} };
    const response = await this.querySmartCached(TREX_CONTRACTS.factory, query);
    return (response as { data?: FactoryConfig }).data || (response as FactoryConfig);
  }

  /**
   * Update factory configuration (admin only)
   */
  async updateFactoryConfig(
    updates: Partial<Omit<FactoryConfig, 'admin'>>
  ): Promise<string> {
    this.ensureSigner();

    const msg: FactoryExecuteMsg = {
      update_config: updates,
    };

    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.factory,
      msg,
      'auto'
    );

    return result.transactionHash;
  }

  /**
   * Get token info by asset ID from factory
   */
  async getTokenByAssetId(assetId: number): Promise<TokenInfoFromFactory> {
    const query: FactoryQueryMsg = { token: { asset_id: assetId } };
    const response = await this.querySmartCached(TREX_CONTRACTS.factory, query);
    return (response as { data?: TokenInfoFromFactory }).data || (response as TokenInfoFromFactory);
  }

  /**
   * Get all tokens from factory
   */
  async getAllFactoryTokens(startAfter?: number, limit?: number): Promise<TokenInfoFromFactory[]> {
    const query: FactoryQueryMsg = { 
      all_tokens: { 
        start_after: startAfter,
        limit: limit || 30 
      } 
    };
    const response = await this.querySmartCached(TREX_CONTRACTS.factory, query);
    const tokens = (response as AllTokensResponse).tokens || (response as { data?: AllTokensResponse }).data?.tokens;
    return tokens || [];
  }

  /**
   * Get asset ID by token contract address
   */
  async getAssetIdByContract(contract: string): Promise<number> {
    const query: FactoryQueryMsg = { asset_id_by_contract: { contract } };
    const response = await this.querySmartCached(TREX_CONTRACTS.factory, query);
    return (response as { data?: number }).data ?? (response as number);
  }

  /**
   * Create a new asset token via factory
   */
  async createAssetToken(params: CreateAssetParams): Promise<{ assetId: number; tokenContract: string; txHash: string }> {
    this.ensureSigner();

    const tokenName = params.tokenName || params.name;
    const tokenSymbol = params.tokenSymbol || params.referenceId.toUpperCase();
    const decimals = typeof params.decimals === 'number' ? params.decimals : 6;

    // Serialize metadata to JSON string
    const metadataString = JSON.stringify({
      name: params.name,
      type: params.type,
      location: params.location,
      underlyingValue: params.underlyingValue,
      currency: params.currency || 'USD',
      ...params.additionalMetadata,
    });

    const msg: FactoryExecuteMsg = {
      create_token: {
        reference_id: params.referenceId,
        name: tokenName,
        symbol: tokenSymbol,
        decimals,
        description: params.description,
        legal_owner: params.legalOwner,
        metadata: metadataString,
        initial_supply: '0',
        initial_holder: this.walletAddress!,
        minting_cap: params.mintingCap || "1000000000",
        claim_details: params.claimDetails || {
          claim_topics: [1, 2],
          issuers: [this.walletAddress!],
          issuer_claims: [[1, 2]],
        },
      },
    };

    console.log('Creating asset token via factory:', JSON.stringify(msg, null, 2));

    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      TREX_CONTRACTS.factory,
      msg,
      'auto'
    );

    // Extract asset_id from events
    const createEvent = result.events.find((e) => e.type === 'wasm');
    const assetIdAttr = createEvent?.attributes.find((a) => a.key === 'asset_id');
    const contractAttr = createEvent?.attributes.find(
      (a) => a.key === 'token_deployed' || a.key === 'contract_address'
    );

    return {
      assetId: assetIdAttr ? parseInt(assetIdAttr.value) : 0,
      tokenContract: contractAttr?.value || '',
      txHash: result.transactionHash,
    };
  }

  /**
   * Get token info for a specific token contract
   */
  async getTokenInfoForContract(tokenContract: string): Promise<TokenInfo> {
    const query: TokenQueryMsg = { token_info: {} };
    return await this.querySmartCached<TokenInfo>(tokenContract, query);
  }

  /**
   * Get balance for a specific token contract
   */
  async getBalanceForToken(tokenContract: string, address: string): Promise<string> {
    const query: TokenQueryMsg = { balance: { address } };
    return await this.querySmartCached<string>(tokenContract, query);
  }

  /**
   * Transfer tokens from a specific token contract
   */
  async transferFromToken(tokenContract: string, recipient: string, amount: string): Promise<string> {
    this.ensureSigner();

    const msg: TokenExecuteMsg = {
      transfer: { recipient, amount },
    };

    const result = await (this.client as SigningCosmWasmClient).execute(
      this.walletAddress!,
      tokenContract,
      msg,
      'auto'
    );

    return result.transactionHash;
  }
}

// ========================================
// TYPE DEFINITIONS FOR ASSET MANAGEMENT
// ========================================

export interface AssetInfo {
  id: number;
  referenceId: string;
  description: string;
  legalOwner: string;
  metadata: AssetMetadata | null;
  totalTokenized: string;
}

export interface AssetMetadata {
  name: string;
  type: string;
  location: string;
  underlyingValue: number;
  currency: string;
  [key: string]: any;
}

interface AssetInfoResponse {
  asset_id: number;
  reference_id: string;
  description: string;
  legal_owner: string;
  metadata: string | null;
  total_tokenized: string;
}

export interface CreateAssetParams {
  referenceId: string;
  description: string;
  legalOwner: string;
  name: string;
  tokenName?: string;
  tokenSymbol?: string;
  decimals?: number;
  type: string;
  location: string;
  underlyingValue: number;
  currency?: string;
  additionalMetadata?: Record<string, any>;
  mintingCap?: string;
  claimDetails?: {
    claim_topics: number[];
    issuers: string[];
    issuer_claims: number[][];
  };
}

export interface CreateAssetResult {
  assetId: number;
  txHash: string;
}

export interface IssueAssetResult {
  requestId: number;
  txHash: string;
}

export interface RequestRedemptionResult {
  requestId: number;
  txHash: string;
}

export interface RedemptionRequest {
  id: number;
  assetId: number;
  requester: string;
  amount: string;
  approved: boolean;
  reason?: string;
}

interface RedemptionRequestResponse {
  id: number;
  asset_id: number;
  requester: string;
  amount: string;
  approved: boolean;
  reason?: string;
}
