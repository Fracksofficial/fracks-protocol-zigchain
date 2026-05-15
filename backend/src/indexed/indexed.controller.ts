import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { IndexedService } from "./indexed.service";
import { CreateTrackedWalletDto } from "./dto/create-tracked-wallet.dto";

@Controller("indexed")
export class IndexedController {
  constructor(private indexedService: IndexedService) {}

  @Get("state")
  getState() {
    return this.indexedService.getIndexerState();
  }

  @Get("assets")
  listAssets() {
    return this.indexedService.listAssets();
  }

  @Get("tokens")
  listTokens() {
    return this.indexedService.listTokens();
  }

  @Get("tokens/:contract")
  getToken(@Param("contract") contract: string) {
    return this.indexedService.getToken(contract);
  }

  @Get("tokens/:contract/assets")
  listTokenAssets(@Param("contract") contract: string) {
    return this.indexedService.listTokenAssets(contract);
  }

  @Get("tokens/:contract/balances")
  listTokenBalances(
    @Param("contract") contract: string,
    @Query("wallet") wallet?: string
  ) {
    return this.indexedService.listTokenBalances(contract, wallet);
  }

  @Get("tokens/:contract/issuance-requests")
  listIssuanceRequests(@Param("contract") contract: string) {
    return this.indexedService.listIssuanceRequests(contract);
  }

  @Get("tokens/:contract/redemption-requests")
  listRedemptionRequests(@Param("contract") contract: string) {
    return this.indexedService.listRedemptionRequests(contract);
  }

  @Get("wallets")
  listTrackedWallets() {
    return this.indexedService.listTrackedWallets();
  }

  @Post("wallets")
  addTrackedWallet(@Body() dto: CreateTrackedWalletDto) {
    return this.indexedService.addTrackedWallet(dto.walletAddress, dto.label);
  }
}
