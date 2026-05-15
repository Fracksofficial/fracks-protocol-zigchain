import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { IssuanceRequest } from "@prisma/client";
import {
  CreateIssuanceRequestDto,
  ApproveIssuanceRequestDto,
  RejectIssuanceRequestDto,
  IssuanceRequestResponseDto,
  RequestStatus,
} from "../dto/requests.dto";

@Injectable()
export class IssuanceRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new issuance request
   * Called by indexer when detecting IssueAsset event
   */
  async create(
    dto: CreateIssuanceRequestDto
  ): Promise<IssuanceRequestResponseDto> {
    // Check if request already exists
    const existing = await this.prisma.issuanceRequest.findUnique({
      where: {
        tokenContract_requestId: {
          tokenContract: dto.tokenAddress,
          requestId: dto.requestId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Issuance request ${dto.requestId} for token ${dto.tokenAddress} already exists`
      );
    }

    const request = await this.prisma.issuanceRequest.create({
      data: {
        requestId: dto.requestId,
        tokenContract: dto.tokenAddress,
        assetId: dto.assetId,
        recipient: dto.recipient,
        amount: dto.amount,
        requester: dto.requester,
        reason: dto.reason,
        txHash: dto.txHash,
        status: RequestStatus.PENDING,
      },
    });

    return this.toResponseDto(request);
  }

  /**
   * Get all issuance requests for a token
   * Supports filtering by status and pagination
   */
  async findByToken(
    tokenAddress: string,
    status?: RequestStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<IssuanceRequestResponseDto[]> {
    const requests = await this.prisma.issuanceRequest.findMany({
      where: {
        tokenContract: tokenAddress,
        ...(status && { status }),
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    });

    return requests.map((r: IssuanceRequest) => this.toResponseDto(r));
  }

  /**
   * Get a single issuance request by ID
   */
  async findOne(id: string): Promise<IssuanceRequestResponseDto> {
    const request = await this.prisma.issuanceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Issuance request ${id} not found`);
    }

    return this.toResponseDto(request);
  }

  /**
   * Approve an issuance request
   * Called after controller approves on-chain
   */
  async approve(
    id: string,
    dto: ApproveIssuanceRequestDto
  ): Promise<IssuanceRequestResponseDto> {
    const request = await this.prisma.issuanceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Issuance request ${id} not found`);
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot approve request with status ${request.status}`
      );
    }

    const updated = await this.prisma.issuanceRequest.update({
      where: { id },
      data: {
        status: RequestStatus.APPROVED,
        approvedBy: dto.approvedBy,
        approvedAt: new Date(),
        txHash: dto.txHash,
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Reject an issuance request
   */
  async reject(
    id: string,
    dto: RejectIssuanceRequestDto
  ): Promise<IssuanceRequestResponseDto> {
    const request = await this.prisma.issuanceRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Issuance request ${id} not found`);
    }

    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot reject request with status ${request.status}`
      );
    }

    const updated = await this.prisma.issuanceRequest.update({
      where: { id },
      data: {
        status: RequestStatus.REJECTED,
        rejectedBy: dto.rejectedBy,
        rejectedAt: new Date(),
        rejectionReason: dto.rejectionReason,
      },
    });

    return this.toResponseDto(updated);
  }

  /**
   * Get pending requests count for a token
   */
  async getPendingCount(tokenAddress: string): Promise<number> {
    return this.prisma.issuanceRequest.count({
      where: {
        tokenContract: tokenAddress,
        status: RequestStatus.PENDING,
      },
    });
  }

  /**
   * Get requests by requester
   */
  async findByRequester(
    requester: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<IssuanceRequestResponseDto[]> {
    const requests = await this.prisma.issuanceRequest.findMany({
      where: { requester },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    return requests.map((r: IssuanceRequest) => this.toResponseDto(r));
  }

  /**
   * Convert Prisma model to response DTO
   */
  private toResponseDto(request: any): IssuanceRequestResponseDto {
    return {
      id: parseInt(request.id) || 0, // Convert UUID to number for compatibility
      requestId: request.requestId,
      tokenAddress: request.tokenContract,
      assetId: request.assetId,
      recipient: request.recipient,
      amount: request.amount,
      requester: request.requester,
      status: request.status as RequestStatus,
      reason: request.reason,
      txHash: request.txHash,
      createdAt: request.createdAt,
      updatedAt: request.updatedAt,
      approvedAt: request.approvedAt,
      approvedBy: request.approvedBy,
      rejectedAt: request.rejectedAt,
      rejectedBy: request.rejectedBy,
      rejectionReason: request.rejectionReason,
    };
  }
}
