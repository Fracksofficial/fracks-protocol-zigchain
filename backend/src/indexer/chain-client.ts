type SmartQueryResponse<T> = T | { data?: T };
type TxSearchResponse = {
  txs?: Array<{
    body?: {
      messages?: Array<{
        "@type"?: string;
        contract?: string;
        msg?: string;
        sender?: string;
      }>;
    };
  }>;
  tx_responses?: Array<{
    height?: string;
    txhash?: string;
    logs?: Array<{
      events?: Array<{
        type: string;
        attributes: Array<{ key: string; value: string }>;
      }>;
    }>;
  }>;
  pagination?: {
    next_key?: string | null;
  };
};

export class ChainClient {
  private baseUrl: string;

  constructor(restEndpoint: string) {
    this.baseUrl = restEndpoint.replace(/\/+$/, "");
  }

  async querySmart<T>(contract: string, query: Record<string, unknown>): Promise<T> {
    const encoded = Buffer.from(JSON.stringify(query)).toString("base64");
    const url = `${this.baseUrl}/cosmwasm/wasm/v1/contract/${contract}/smart/${encoded}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (error: any) {
      throw new Error(`Smart query fetch failed: ${url} (${error?.message || error})`);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Smart query failed ${response.status}: ${text}`);
    }
    const json = (await response.json()) as SmartQueryResponse<T>;
    return (json as { data?: T }).data ?? (json as T);
  }

  async queryTxsByContract(
    contract: string,
    limit: number,
    pageKey?: string | null
  ): Promise<TxSearchResponse> {
    const params = new URLSearchParams();
    params.append("events", `wasm._contract_address='${contract}'`);
    params.append("pagination.limit", `${limit}`);
    if (pageKey) {
      params.append("pagination.key", pageKey);
    }
    const url = `${this.baseUrl}/cosmos/tx/v1beta1/txs?${params.toString()}`;
    let response: Response;
    try {
      response = await fetch(url);
    } catch (error: any) {
      throw new Error(`Tx search fetch failed: ${url} (${error?.message || error})`);
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Tx search failed ${response.status}: ${text}`);
    }
    return (await response.json()) as TxSearchResponse;
  }
}
