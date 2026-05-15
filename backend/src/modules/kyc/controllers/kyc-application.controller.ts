import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Patch,
} from "@nestjs/common";
import { KycApplicationService } from "../services/kyc-application.service";
import {
  CreateKycApplicationDto,
  ApproveKycApplicationDto,
  RejectKycApplicationDto,
  UpdateKycApplicationDto,
  KycApplicationStatus,
} from "../dto/kyc-application.dto";

@Controller("kyc/applications")
export class KycApplicationController {
  constructor(private readonly kycApplicationService: KycApplicationService) {}

  /**
   * Submit a new KYC application
   * POST /api/kyc/applications
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateKycApplicationDto) {
    return this.kycApplicationService.create(dto);
  }

  /**
   * Get all KYC applications
   * GET /api/kyc/applications?status=PENDING&limit=10&offset=0
   */
  @Get()
  async findAll(
    @Query("status") status?: KycApplicationStatus,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.kycApplicationService.findAll(
      status,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0
    );
  }

  /**
   * Get KYC application by ID
   * GET /api/kyc/applications/:id
   */
  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.kycApplicationService.findOne(id);
  }

  /**
   * Get KYC application by wallet address
   * GET /api/kyc/applications/wallet/:walletAddress
   */
  @Get("wallet/:walletAddress")
  async findByWallet(@Param("walletAddress") walletAddress: string) {
    return this.kycApplicationService.findByWallet(walletAddress);
  }

  /**
   * Approve a KYC application
   * POST /api/kyc/applications/:id/approve
   *
   * Body:
   * {
   *   "reviewedBy": "zig1...",
   *   "notes": "Verified documents",
   *   "onchainIdAddress": "zig1..." // Optional, if OnchainID was created
   * }
   */
  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param("id") id: string,
    @Body() dto: ApproveKycApplicationDto
  ) {
    return this.kycApplicationService.approve(id, dto);
  }

  /**
   * Reject a KYC application
   * POST /api/kyc/applications/:id/reject
   *
   * Body:
   * {
   *   "reviewedBy": "zig1...",
   *   "rejectionReason": "Invalid documents",
   *   "notes": "ID card expired"
   * }
   */
  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  async reject(@Param("id") id: string, @Body() dto: RejectKycApplicationDto) {
    return this.kycApplicationService.reject(id, dto);
  }

  /**
   * Update application (status, notes, risk score)
   * PATCH /api/kyc/applications/:id
   */
  @Patch(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateKycApplicationDto) {
    return this.kycApplicationService.update(id, dto);
  }

  /**
   * Mark OnchainID as created
   * POST /api/kyc/applications/:id/onchain-id
   *
   * Body:
   * {
   *   "onchainIdAddress": "zig1..."
   * }
   */
  @Post(":id/onchain-id")
  @HttpCode(HttpStatus.OK)
  async markOnchainIdCreated(
    @Param("id") id: string,
    @Body() body: { onchainIdAddress: string }
  ) {
    return this.kycApplicationService.markOnchainIdCreated(
      id,
      body.onchainIdAddress
    );
  }

  /**
   * Get statistics
   * GET /api/kyc/applications/stats/summary
   */
  @Get("stats/summary")
  async getStatistics() {
    return this.kycApplicationService.getStatistics();
  }

  /**
   * Get pending count
   * GET /api/kyc/applications/stats/pending-count
   */
  @Get("stats/pending-count")
  async getPendingCount() {
    const count = await this.kycApplicationService.getPendingCount();
    return { count };
  }
}
