export interface RWAAsset {
  id: string;
  name: string;
  symbol: string;
  description: string;
  assetType: 'real-estate' | 'commodity' | 'equity' | 'debt' | 'art' | 'intellectual-property';
  
  // Token details
  totalSupply: number;
  tokenizedAmount: number;
  tokenPrice: number;
  tokenDenom: string;
  
  // Asset details
  underlyingValue: number;
  currency: string;
  location: string;
  issuer: string;
  issuerAddress: string;
  
  // Compliance
  complianceStatus: 'compliant' | 'pending' | 'non-compliant' | 'under-review';
  kycRequired: boolean;
  amlRequired: boolean;
  accreditedInvestorsOnly: boolean;
  
  // Timestamps
  issuanceDate: Date;
  maturityDate?: Date;
  lastUpdated: Date;
  
  // Metadata
  documents: Array<{
    id: string;
    name: string;
    url: string;
    hash: string;
    uploadedAt: Date;
  }>;
  
  // Smart contract references
  contractAddress: string;
  tokenContractAddress: string;
  chainId: string;
  
  // Contract-specific fields (from blockchain)
  asset_id?: number;
  total_tokenized?: string;
  reference_id?: string;
  legal_owner?: string;
  metadata?: string;
}

export interface ComplianceCheck {
  id: string;
  assetId: string;
  checkType: 'kyc' | 'aml' | 'accreditation' | 'sanctions' | 'ownership';
  status: 'passed' | 'failed' | 'pending';
  checkedBy: string;
  checkedAt: Date;
  details: Record<string, any>;
}

export interface Investor {
  address: string;
  name: string;
  email: string;
  kycStatus: 'verified' | 'pending' | 'rejected';
  accreditationStatus: 'verified' | 'pending' | 'not-accredited';
  walletAddresses: string[];
  holdings: Array<{
    assetId: string;
    tokens: number;
    value: number;
    purchaseDate: Date;
  }>;
}

export interface IssuanceRequest {
  assetDetails: {
    name: string;
    symbol: string;
    description: string;
    assetType: string;
    underlyingValue: number;
    totalSupply: number;
    location: string;
    currency: string;
    legalOwner?: string;
  };
  complianceRequirements: {
    kycRequired: boolean;
    amlRequired: boolean;
    accreditedInvestorsOnly: boolean;
    jurisdiction: string[];
  };
  tokenDetails: {
    tokenName: string;
    tokenSymbol: string;
    decimals: number;
    initialPrice: number;
    owner?: string;
    issuer?: string;
    controller?: string;
  };
  documents: File[];
}

export interface Transaction {
  hash: string;
  type: 'mint' | 'burn' | 'transfer' | 'issuance' | 'compliance-update';
  from: string;
  to: string;
  amount: number;
  assetId: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: number;
  blockHeight?: number;
}
