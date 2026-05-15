import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from "@nestjs/common";
import { IssuanceRequestsService } from "../services/issuance-requests.service";
import {
  CreateIssuanceRequestDto,
  ApproveIssuanceRequestDto,
  RejectIssuanceRequestDto,
  IssuanceRequestResponseDto,
  RequestStatus,
} from "../dto/requests.dto";

@Controller("tokens/:tokenAddress/issuance-requests")
export class IssuanceRequestsController {
  constructor(
    private readonly issuanceRequestsService: IssuanceRequestsService
  ) {}

  /**
   * Create a new issuance request
   * POST /api/tokens/:tokenAddress/issuance-requests
   *
   * Called by indexer when detecting IssueAsset event
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param("tokenAddress") tokenAddress: string,
    @Body() dto: CreateIssuanceRequestDto
  ): Promise<IssuanceRequestResponseDto> {
    // Ensure tokenAddress matches
    if (dto.tokenAddress !== tokenAddress) {
      throw new Error("Token address mismatch");
    }

    return this.issuanceRequestsService.create(dto);
  }

  /**
   * Get all issuance requests for a token
   * GET /api/tokens/:tokenAddress/issuance-requests?status=pending&limit=10&offset=0
   *
   * Query params:
   * - status: pending | approved | rejected (optional)
   * - limit: number (default: 50)
   * - offset: number (default: 0)
   */
  @Get()
  async findAll(
    @Param("tokenAddress") tokenAddress: string,
    @Query("status") status?: RequestStatus,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("offset", new ParseIntPipe({ optional: true })) offset?: number
  ): Promise<IssuanceRequestResponseDto[]> {
    return this.issuanceRequestsService.findByToken(
      tokenAddress,
      status,
      limit,
      offset
    );
  }

  /**
   * Get a single issuance request
   * GET /api/tokens/:tokenAddress/issuance-requests/:id
   */
  @Get(":id")
  async findOne(
    @Param("tokenAddress") tokenAddress: string,
    @Param("id") id: string
  ): Promise<IssuanceRequestResponseDto> {
    const request = await this.issuanceRequestsService.findOne(id);

    // Verify token address matches
    if (request.tokenAddress !== tokenAddress) {
      throw new Error("Token address mismatch");
    }

    return request;
  }

  /**
   * Approve an issuance request
   * POST /api/tokens/:tokenAddress/issuance-requests/:id/approve
   *
   * Body:
   * {
   *   "approvedBy": "zig1...",
   *   "txHash": "0x..."
   * }
   *
   * Authorization: Token controller only
   */
  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  async approve(
    @Param("tokenAddress") tokenAddress: string,
    @Param("id") id: string,
    @Body() dto: ApproveIssuanceRequestDto
  ): Promise<IssuanceRequestResponseDto> {
    const request = await this.issuanceRequestsService.findOne(id);

    // Verify token address matches
    if (request.tokenAddress !== tokenAddress) {
      throw new Error("Token address mismatch");
    }

    // TODO: Add authorization check - verify approvedBy is token controller

    return this.issuanceRequestsService.approve(id, dto);
  }

  /**
   * Reject an issuance request
   * POST /api/tokens/:tokenAddress/issuance-requests/:id/reject
   *
   * Body:
   * {
   *   "rejectedBy": "zig1...",
   *   "rejectionReason": "Insufficient documentation"
   * }
   *
   * Authorization: Token controller only
   */
  @Post(":id/reject")
  @HttpCode(HttpStatus.OK)
  async reject(
    @Param("tokenAddress") tokenAddress: string,
    @Param("id") id: string,
    @Body() dto: RejectIssuanceRequestDto
  ): Promise<IssuanceRequestResponseDto> {
    const request = await this.issuanceRequestsService.findOne(id);

    // Verify token address matches
    if (request.tokenAddress !== tokenAddress) {
      throw new Error("Token address mismatch");
    }

    // TODO: Add authorization check - verify rejectedBy is token controller

    return this.issuanceRequestsService.reject(id, dto);
  }

  /**
   * Get pending requests count
   * GET /api/tokens/:tokenAddress/issuance-requests/pending/count
   */
  @Get("pending/count")
  async getPendingCount(
    @Param("tokenAddress") tokenAddress: string
  ): Promise<{ count: number }> {
    const count = await this.issuanceRequestsService.getPendingCount(
      tokenAddress
    );
    return { count };
  }
}

/**
 * Controller for user-specific requests
 * GET /api/users/:wallet/issuance-requests
 */
@Controller("users/:wallet/issuance-requests")
export class UserIssuanceRequestsController {
  constructor(
    private readonly issuanceRequestsService: IssuanceRequestsService
  ) {}

  /**
   * Get all issuance requests created by a user
   * GET /api/users/:wallet/issuance-requests?limit=10&offset=0
   */
  @Get()
  async findByUser(
    @Param("wallet") wallet: string,
    @Query("limit", new ParseIntPipe({ optional: true })) limit?: number,
    @Query("offset", new ParseIntPipe({ optional: true })) offset?: number
  ): Promise<IssuanceRequestResponseDto[]> {
    // TODO: Add authorization check - verify requester owns this wallet

    return this.issuanceRequestsService.findByRequester(wallet, limit, offset);
  }
}
