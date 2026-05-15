export interface CosmosTransaction {
  hash: string;
  height: number;
  code: number;
  rawLog: string;
  gasWanted: number;
  gasUsed: number;
  timestamp: Date;
  memo?: string;
}

export interface ContractInfo {
  address: string;
  codeId: number;
  creator: string;
  label: string;
  admin?: string;
  ibcPortId?: string;
  created: {
    blockHeight: number;
    txHash: string;
  };
}

export interface ContractQuery {
  address: string;
  query: Record<string, any>;
}

export interface ContractExecute {
  address: string;
  msg: Record<string, any>;
  funds?: Array<{
    denom: string;
    amount: string;
  }>;
  memo?: string;
}

export interface ChainInfo {
  chainId: string;
  chainName: string;
  rpcEndpoint: string;
  restEndpoint: string;
  explorerUrl: string;
  gasPrice: string;
  prefix: string;
  coinDenom: string;
  coinDecimals: number;
}

export interface WalletInfo {
  address: string;
  name?: string;
  balance: Array<{
    denom: string;
    amount: string;
  }>;
  network: string;
  isConnected: boolean;
}

export interface SmartContractMsg {
  // RWA Registry Messages
  register_asset?: {
    asset_id: string;
    name: string;
    symbol: string;
    total_supply: string;
    decimals: number;
    metadata: Record<string, any>;
  };
  
  update_compliance?: {
    asset_id: string;
    compliance_status: string;
    requirements: Record<string, any>;
  };
  
  // Token Messages
  mint?: {
    recipient: string;
    amount: string;
  };
  
  burn?: {
    amount: string;
  };
  
  transfer?: {
    recipient: string;
    amount: string;
  };
  
  // KYC Messages
  verify_investor?: {
    investor_address: string;
    kyc_data: Record<string, any>;
  };
  
  // Query Messages
  get_asset_info?: {
    asset_id: string;
  };
  
  get_balance?: {
    address: string;
  };
  
  get_compliance_status?: {
    asset_id: string;
    investor_address: string;
  };
}