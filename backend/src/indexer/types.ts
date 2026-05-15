export interface FactoryTokenInfo {
  asset_id: number;
  contract_address: string;
  name: string;
  symbol: string;
  reference_id: string;
  description: string;
  legal_owner: string;
  metadata?: string;
  deployed_at: number;
}

export interface TokenInfoResponse {
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
}

export interface RolesResponse {
  owner: string;
  issuer: string;
  controller: string;
}

export interface TokenAssetInfo {
  asset_id: number;
  reference_id: string;
  description: string;
  legal_owner: string;
  metadata?: string | null;
  total_tokenized: string;
}

export interface RedemptionRequestResponse {
  id: number;
  asset_id: number;
  requester: string;
  amount: string;
  approved: boolean;
  reason?: string | null;
}
