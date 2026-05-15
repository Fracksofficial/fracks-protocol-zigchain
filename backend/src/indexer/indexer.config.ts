export const INDEXER_DEFAULTS = {
  restEndpoint: "https://rest.zigchain-testnet-1.zigchain.org",
  factoryContract:
    "zig14f2w4p9gdgkdh66qg55cs6mlf0ya9grl7uytnc4aw8wz8keh6g9q6sxd7k",
  tokenList: [
    "zig1stejrmcpjw8y707cdeqa9t4yta0asrzy4ahu8v4fe9uv843rywss56sw6h",
    "zig1534ffnjjgdtthasgwgxtlhtjgvajrwr826tul5wqff4gkppd2lmqj248qj",
  ],
  maxAssetScan: 25,
  txScanLimit: 100,
  txScanPages: 1,
};

export function getIndexerConfig() {
  const restEndpoint =
    process.env.INDEXER_REST_ENDPOINT || INDEXER_DEFAULTS.restEndpoint;
  const factoryContract =
    process.env.INDEXER_FACTORY || INDEXER_DEFAULTS.factoryContract;
  const tokenListRaw =
    process.env.INDEXER_TOKENS || INDEXER_DEFAULTS.tokenList.join(",");

  const tokenContracts = tokenListRaw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const maxAssetScan = parseInt(
    process.env.INDEXER_MAX_ASSETS || `${INDEXER_DEFAULTS.maxAssetScan}`,
    10
  );

  const txScanLimit = parseInt(
    process.env.INDEXER_TX_SCAN_LIMIT || `${INDEXER_DEFAULTS.txScanLimit}`,
    10
  );

  const txScanPages = parseInt(
    process.env.INDEXER_TX_SCAN_PAGES || `${INDEXER_DEFAULTS.txScanPages}`,
    10
  );

  return {
    restEndpoint,
    factoryContract,
    tokenContracts,
    maxAssetScan,
    txScanLimit,
    txScanPages,
  };
}
