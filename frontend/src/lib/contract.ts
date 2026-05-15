import { SigningCosmWasmClient } from '@cosmjs/cosmwasm-stargate';
import { zigChainClient } from './cosmos-client';
import { CONTRACT_ADDRESSES } from './zigchain-config';
import { RWAAsset, ComplianceCheck, Investor } from '@/types/rwa';
import { ContractExecute, ContractQuery } from '@/types/cosmos';

export class RWAContractClient {
  private client: SigningCosmWasmClient | null = null;
  private address: string | null = null;

  async connect(walletAddress?: string) {
    try {
      const result = await zigChainClient.connect();
      this.client = result.client;
      this.address = walletAddress || result.address;
      return true;
    } catch (error) {
      console.error('Failed to connect to contracts:', error);
      throw error;
    }
  }

  // ===== RWA Registry Contract =====
  async registerAsset(assetData: {
    name: string;
    symbol: string;
    totalSupply: number;
    decimals: number;
    metadata: Record<string, any>;
  }): Promise<string> {
    const msg = {
      register_asset: {
        asset_id: `RWA-${Date.now()}`,
        name: assetData.name,
        symbol: assetData.symbol,
        total_supply: assetData.totalSupply.toString(),
        decimals: assetData.decimals,
        metadata: {
          ...assetData.metadata,
          created_at: Date.now(),
          issuer: this.address,
        },
      },
    };

    return this.executeContract(CONTRACT_ADDRESSES.rwaRegistry, msg);
  }

  async getAsset(assetId: string): Promise<RWAAsset> {
    const msg = {
      get_asset_info: { asset_id: assetId },
    };

    const response = await this.queryContract(CONTRACT_ADDRESSES.rwaRegistry, msg);
    
    return {
      id: response.asset_id,
      name: response.name,
      symbol: response.symbol,
      description: response.metadata?.description || '',
      assetType: response.metadata?.asset_type || 'real-estate',
      totalSupply: parseInt(response.total_supply),
      tokenizedAmount: parseInt(response.tokenized_amount || '0'),
      tokenPrice: parseFloat(response.token_price || '0'),
      tokenDenom: response.token_denom,
      underlyingValue: parseFloat(response.metadata?.underlying_value || '0'),
      currency: response.metadata?.currency || 'USD',
      location: response.metadata?.location || '',
      issuer: response.metadata?.issuer_name || '',
      issuerAddress: response.metadata?.issuer_address || '',
      complianceStatus: response.compliance_status || 'pending',
      kycRequired: response.metadata?.kyc_required || true,
      amlRequired: response.metadata?.aml_required || true,
      accreditedInvestorsOnly: response.metadata?.accredited_only || false,
      issuanceDate: new Date(response.metadata?.issuance_date || Date.now()),
      lastUpdated: new Date(response.last_updated || Date.now()),
      documents: response.metadata?.documents || [],
      contractAddress: CONTRACT_ADDRESSES.rwaRegistry,
      tokenContractAddress: response.token_contract,
      chainId: process.env.NEXT_PUBLIC_ZIGCHAIN_CHAIN_ID || 'zigchain-testnet-1',
    };
  }

  async listAssets(): Promise<RWAAsset[]> {
    const msg = { list_assets: { limit: 50, start_after: null } };
    const response = await this.queryContract(CONTRACT_ADDRESSES.rwaRegistry, msg);
    
    return Promise.all(
      response.assets.map(async (assetId: string) => {
        return this.getAsset(assetId);
      })
    );
  }

  // ===== Compliance Contract =====
  async updateComplianceStatus(assetId: string, status: string, requirements: Record<string, any>) {
    const msg = {
      update_compliance: {
        asset_id: assetId,
        compliance_status: status,
        requirements: requirements,
      },
    };

    return this.executeContract(CONTRACT_ADDRESSES.complianceModule, msg);
  }

  async checkCompliance(assetId: string, investorAddress: string): Promise<ComplianceCheck> {
    const msg = {
      get_compliance_status: {
        asset_id: assetId,
        investor_address: investorAddress,
      },
    };

    const response = await this.queryContract(CONTRACT_ADDRESSES.complianceModule, msg);
    
    return {
      id: `check-${Date.now()}`,
      assetId: assetId,
      checkType: response.check_type || 'kyc',
      status: response.status || 'pending',
      checkedBy: response.checked_by || '',
      checkedAt: new Date(response.checked_at || Date.now()),
      details: response.details || {},
    };
  }

  // ===== KYC Contract =====
  async verifyInvestor(investorAddress: string, kycData: Record<string, any>) {
    const msg = {
      verify_investor: {
        investor_address: investorAddress,
        kyc_data: kycData,
      },
    };

    return this.executeContract(CONTRACT_ADDRESSES.kycModule, msg);
  }

  async getInvestorStatus(investorAddress: string): Promise<Investor> {
    const msg = {
      get_investor_info: { address: investorAddress },
    };

    const response = await this.queryContract(CONTRACT_ADDRESSES.kycModule, msg);
    
    return {
      address: investorAddress,
      name: response.name || '',
      email: response.email || '',
      kycStatus: response.kyc_status || 'pending',
      accreditationStatus: response.accreditation_status || 'pending',
      walletAddresses: response.wallet_addresses || [investorAddress],
      holdings: response.holdings || [],
    };
  }

  // ===== Token Contract =====
  async mintTokens(assetId: string, recipient: string, amount: number) {
    // First get token contract address from registry
    const asset = await this.getAsset(assetId);
    
    const msg = {
      mint: {
        recipient: recipient,
        amount: amount.toString(),
      },
    };

    return this.executeContract(asset.tokenContractAddress, msg, [
      { denom: 'uzig', amount: '1000' }, // Gas fees
    ]);
  }

  async transferTokens(assetId: string, recipient: string, amount: number) {
    const asset = await this.getAsset(assetId);
    
    const msg = {
      transfer: {
        recipient: recipient,
        amount: amount.toString(),
      },
    };

    return this.executeContract(asset.tokenContractAddress, msg);
  }

  async getTokenBalance(assetId: string, address: string): Promise<number> {
    const asset = await this.getAsset(assetId);
    
    const msg = {
      get_balance: { address: address },
    };

    const response = await this.queryContract(asset.tokenContractAddress, msg);
    return parseInt(response.balance || '0');
  }

  // ===== Helper Methods =====
  private async executeContract(
    contractAddress: string,
    msg: any,
    funds?: Array<{ denom: string; amount: string }>
  ): Promise<string> {
    if (!this.client || !this.address) {
      throw new Error('Client not connected');
    }

    try {
      const result = await this.client.execute(
        this.address,
        contractAddress,
        msg,
        'auto',
        undefined,
        funds
      );

      console.log('Transaction successful:', result.transactionHash);
      return result.transactionHash;
    } catch (error: any) {
      console.error('Transaction failed:', error);
      throw new Error(`Contract execution failed: ${error.message}`);
    }
  }

  private async queryContract(contractAddress: string, msg: any): Promise<any> {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    try {
      return await this.client.queryContractSmart(contractAddress, msg);
    } catch (error: any) {
      console.error('Query failed:', error);
      throw new Error(`Contract query failed: ${error.message}`);
    }
  }

  // ===== Utility Methods =====
  async simulateTransaction(contractAddress: string, msg: any) {
    if (!this.client || !this.address) {
      throw new Error('Client not connected');
    }

    return this.client.simulate(
      this.address,
      [{ contractAddress, msg } as any],
      'Simulating RWA transaction'
    );
  }

  async getTransactionStatus(txHash: string) {
    if (!this.client) {
      throw new Error('Client not connected');
    }

    return this.client.getTx(txHash);
  }
}

// Export singleton instance
export const rwaContractClient = new RWAContractClient();