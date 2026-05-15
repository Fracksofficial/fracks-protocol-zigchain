import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChainClient } from "./chain-client";
import { getIndexerConfig } from "./indexer.config";
import type {
  FactoryTokenInfo,
  TokenAssetInfo,
  TokenInfoResponse,
  RolesResponse,
  RedemptionRequestResponse,
} from "./types";

@Injectable()
export class IndexerService {
  private config = getIndexerConfig();
  private client = new ChainClient(this.config.restEndpoint);

  constructor(private prisma: PrismaService) {}

  async syncOnce() {
    console.log(`[Indexer] Sync start ${new Date().toISOString()}`);
    await this.updateState("RUNNING");
    try {
      const factoryTokens = await this.fetchAllFactoryTokens();
      await this.upsertAssets(factoryTokens);

      const tokenContracts = [
        ...new Set([
          ...this.config.tokenContracts,
          ...factoryTokens.map((token) => token.contract_address),
        ]),
      ];

      for (const contract of tokenContracts) {
        await this.syncToken(contract);
      }

      await this.updateState("IDLE", null);
      console.log(`[Indexer] Sync complete ${new Date().toISOString()}`);
    } catch (error: any) {
      const message =
        error instanceof Error
          ? `${error.message}\n${error.stack || ""}`.trim()
          : String(error);
      console.error("Indexer error:", message);
      await this.updateState("ERROR", message || "Indexer failed");
      console.log(`[Indexer] Sync failed ${new Date().toISOString()}`);
      throw error;
    }
  }

  private async fetchAllFactoryTokens(): Promise<FactoryTokenInfo[]> {
    const tokens: FactoryTokenInfo[] = [];
    let startAfter: number | undefined;
    const limit = 50;

    while (true) {
      const query = {
        all_tokens: { start_after: startAfter, limit },
      };

      const response = await this.client.querySmart<{
        tokens: FactoryTokenInfo[];
      }>(this.config.factoryContract, query);

      if (!response.tokens || response.tokens.length === 0) {
        break;
      }

      tokens.push(...response.tokens);
      startAfter = response.tokens[response.tokens.length - 1].asset_id;
      if (response.tokens.length < limit) {
        break;
      }
    }

    return tokens;
  }

  private async upsertAssets(tokens: FactoryTokenInfo[]) {
    for (const token of tokens) {
      const metadata = token.metadata
        ? this.safeParseJson(token.metadata)
        : null;
      await this.prisma.asset.upsert({
        where: { tokenContract: token.contract_address },
        update: {
          factoryAssetId: token.asset_id,
          referenceId: token.reference_id,
          name: token.name,
          symbol: token.symbol,
          description: token.description,
          issuerWallet: token.legal_owner,
          legalOwner: token.legal_owner,
          metadata,
          deployedAt: new Date(token.deployed_at * 1000),
        },
        create: {
          factoryAssetId: token.asset_id,
          tokenContract: token.contract_address,
          referenceId: token.reference_id,
          name: token.name,
          symbol: token.symbol,
          description: token.description,
          issuerWallet: token.legal_owner,
          legalOwner: token.legal_owner,
          metadata,
          deployedAt: new Date(token.deployed_at * 1000),
        },
      });
    }
  }

  private async syncToken(tokenContract: string) {
    const tokenInfo = await this.client
      .querySmart<TokenInfoResponse>(tokenContract, { token_info: {} })
      .catch(() => null);

    if (tokenInfo) {
      await this.prisma.tokenState.upsert({
        where: { tokenContract },
        update: {
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.total_supply,
        },
        create: {
          tokenContract,
          name: tokenInfo.name,
          symbol: tokenInfo.symbol,
          decimals: tokenInfo.decimals,
          totalSupply: tokenInfo.total_supply,
        },
      });
    }

    const roles = await this.client
      .querySmart<RolesResponse>(tokenContract, { roles: {} })
      .catch(() => null);

    if (roles) {
      await this.prisma.asset.updateMany({
        where: { tokenContract },
        data: {
          issuerWallet: roles.issuer,
          legalOwner: roles.owner,
        },
      });
    }

    const assets = await this.scanTokenAssets(tokenContract);
    for (const asset of assets) {
      const metadata = asset.metadata
        ? this.safeParseJson(asset.metadata)
        : null;
      await this.prisma.tokenAsset.upsert({
        where: {
          tokenContract_assetId: {
            tokenContract,
            assetId: asset.asset_id,
          },
        },
        update: {
          referenceId: asset.reference_id,
          description: asset.description,
          legalOwner: asset.legal_owner,
          metadata,
          totalTokenized: asset.total_tokenized,
        },
        create: {
          tokenContract,
          assetId: asset.asset_id,
          referenceId: asset.reference_id,
          description: asset.description,
          legalOwner: asset.legal_owner,
          metadata,
          totalTokenized: asset.total_tokenized,
        },
      });
    }

    const redemptions = await this.client
      .querySmart<RedemptionRequestResponse[]>(tokenContract, {
        redemption_requests: { limit: 50 },
      })
      .catch(() => []);

    for (const redemption of redemptions) {
      const existing = await this.prisma.redemptionRequest.findFirst({
        where: {
          tokenContract,
          requestId: redemption.id,
        },
      });

      const status = redemption.approved ? "APPROVED" : "PENDING";
      if (existing) {
        await this.prisma.redemptionRequest.update({
          where: { id: existing.id },
          data: { status },
        });
      } else {
        await this.prisma.redemptionRequest.create({
          data: {
            requestId: redemption.id,
            tokenContract,
            assetId: redemption.asset_id,
            requester: redemption.requester,
            amount: redemption.amount,
            reason: redemption.reason || undefined,
            status,
          },
        });
      }
    }

    const discoveredWallets = await this.discoverWalletsFromTxs(tokenContract);
    if (discoveredWallets.length > 0) {
      await this.prisma.trackedWallet.createMany({
        data: discoveredWallets.map((walletAddress) => ({
          walletAddress,
          label: "tx-scan",
        })),
        skipDuplicates: true,
      });
    }

    const userWallets = await this.prisma.user.findMany({
      where: { walletAddress: { not: null } },
      select: { walletAddress: true },
    });
    const trackedWallets = await this.prisma.trackedWallet.findMany({
      select: { walletAddress: true },
    });

    const walletAddresses = Array.from(
      new Set(
        [
          ...userWallets,
          ...trackedWallets,
          ...discoveredWallets.map((walletAddress) => ({ walletAddress })),
        ]
          .map((entry) => entry.walletAddress)
          .filter((address): address is string => !!address)
      )
    );

    for (const walletAddress of walletAddresses) {
      let balance = "0";
      try {
        const response = await this.client.querySmart<{ balance?: string }>(
          tokenContract,
          {
            balance: { address: walletAddress },
          }
        );
        if (typeof response.balance === "string") {
          balance = response.balance;
        }
      } catch {
        balance = "0";
      }

      const normalizedBalance = typeof balance === "string" ? balance : "0";

      await this.prisma.tokenBalance.upsert({
        where: {
          tokenContract_walletAddress: {
            tokenContract,
            walletAddress,
          },
        },
        update: { balance: normalizedBalance },
        create: {
          tokenContract,
          walletAddress,
          balance: normalizedBalance,
        },
      });
    }
  }

  private async scanTokenAssets(tokenContract: string) {
    const assets: TokenAssetInfo[] = [];
    for (let id = 1; id <= this.config.maxAssetScan; id += 1) {
      try {
        const asset = await this.client.querySmart<TokenAssetInfo>(
          tokenContract,
          { asset_info: { asset_id: id } }
        );
        assets.push(asset);
      } catch {
        break;
      }
    }
    return assets;
  }

  private async updateState(status: string, error?: string | null) {
    const existing = await this.prisma.indexerState.findFirst();
    if (!existing) {
      await this.prisma.indexerState.create({
        data: { status, error: error ?? null, lastRunAt: new Date() },
      });
      return;
    }

    await this.prisma.indexerState.update({
      where: { id: existing.id },
      data: { status, error: error ?? null, lastRunAt: new Date() },
    });
  }

  private safeParseJson(raw: string) {
    try {
      return JSON.parse(raw);
    } catch {
      return { raw };
    }
  }

  private async discoverWalletsFromTxs(
    tokenContract: string
  ): Promise<string[]> {
    const addresses = new Set<string>();
    const walletKeys = new Set([
      "from",
      "to",
      "recipient",
      "owner",
      "spender",
      "address",
      "new",
      "lost",
    ]);

    let pageKey: string | null | undefined;
    const limit = this.config.txScanLimit;
    const maxPages = this.config.txScanPages;

    for (let page = 0; page < maxPages; page += 1) {
      const response = await this.client
        .queryTxsByContract(tokenContract, limit, pageKey)
        .catch(() => null);

      if (!response?.tx_responses?.length) {
        break;
      }

      for (const tx of response.tx_responses) {
        const logs = tx.logs || [];
        for (const log of logs) {
          const events = log.events || [];
          for (const event of events) {
            if (event.type !== "wasm") continue;

            const attrs = event.attributes || [];
            const contractMatch = attrs.some(
              (attr) =>
                attr.key === "_contract_address" && attr.value === tokenContract
            );
            if (!contractMatch) continue;

            for (const attr of attrs) {
              if (!walletKeys.has(attr.key)) continue;
              if (!attr.value.startsWith("zig1")) continue;
              addresses.add(attr.value);
            }
          }
        }
      }

      pageKey = response.pagination?.next_key ?? null;
      if (!pageKey) {
        break;
      }
    }

    return Array.from(addresses);
  }
}
