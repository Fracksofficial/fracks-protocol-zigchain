import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { KycApplication } from "@prisma/client";
import {
  CreateKycApplicationDto,
  ApproveKycApplicationDto,
  RejectKycApplicationDto,
  UpdateKycApplicationDto,
  KycApplicationStatus,
} from "../dto/kyc-application.dto";

@Injectable()
export class KycApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new KYC application
   * Called when investor submits KYC form
   */
  async create(dto: CreateKycApplicationDto): Promise<KycApplication> {
    // Check if application already exists
    const existing = await this.prisma.kycApplication.findUnique({
      where: { walletAddress: dto.walletAddress },
    });

    if (existing) {
      // If existing application is rejected, allow resubmission
      if (existing.status === KycApplicationStatus.REJECTED) {
        return this.prisma.kycApplication.update({
          where: { id: existing.id },
          data: {
            ...dto,
            status: KycApplicationStatus.PENDING,
            submittedAt: new Date(),
            reviewedAt: null,
            reviewedBy: null,
            rejectionReason: null,
          },
        });
      }

      throw new ConflictException(
        `KYC application already exists for wallet ${dto.walletAddress} with status ${existing.status}`
      );
    }

    return this.prisma.kycApplication.create({
      data: {
        ...dto,
        status: KycApplicationStatus.PENDING,
      },
    });
  }

  /**
   * Get all KYC applications with filtering
   */
  async findAll(
    status?: KycApplicationStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<KycApplication[]> {
    return this.prisma.kycApplication.findMany({
      where: status ? { status } : undefined,
      orderBy: { submittedAt: "desc" },
      skip: offset,
      take: limit,
    });
  }

  /**
   * Get a single KYC application by ID
   */
  async findOne(id: string): Promise<KycApplication> {
    const application = await this.prisma.kycApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`KYC application ${id} not found`);
    }

    return application;
  }

  /**
   * Get KYC application by wallet address
   */
  async findByWallet(walletAddress: string): Promise<KycApplication | null> {
    return this.prisma.kycApplication.findUnique({
      where: { walletAddress },
    });
  }

  /**
   * Approve a KYC application
   * Called by KYC provider after review
   */
  async approve(
    id: string,
    dto: ApproveKycApplicationDto
  ): Promise<KycApplication> {
    const application = await this.findOne(id);

    if (
      application.status !== KycApplicationStatus.PENDING &&
      application.status !== KycApplicationStatus.UNDER_REVIEW
    ) {
      throw new BadRequestException(
        `Cannot approve application with status ${application.status}`
      );
    }

    return this.prisma.kycApplication.update({
      where: { id },
      data: {
        status: KycApplicationStatus.APPROVED,
        reviewedAt: new Date(),
        reviewedBy: dto.reviewedBy,
        notes: dto.notes,
        onchainIdAddress: dto.onchainIdAddress,
        onchainIdCreated: !!dto.onchainIdAddress,
      },
    });
  }

  /**
   * Reject a KYC application
   */
  async reject(
    id: string,
    dto: RejectKycApplicationDto
  ): Promise<KycApplication> {
    const application = await this.findOne(id);

    if (application.status === KycApplicationStatus.APPROVED) {
      throw new BadRequestException("Cannot reject an approved application");
    }

    return this.prisma.kycApplication.update({
      where: { id },
      data: {
        status: KycApplicationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: dto.reviewedBy,
        rejectionReason: dto.rejectionReason,
        notes: dto.notes,
      },
    });
  }

  /**
   * Update application status or notes
   */
  async update(
    id: string,
    dto: UpdateKycApplicationDto
  ): Promise<KycApplication> {
    await this.findOne(id); // Verify exists

    return this.prisma.kycApplication.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Mark OnchainID as created for an application
   */
  async markOnchainIdCreated(
    id: string,
    onchainIdAddress: string
  ): Promise<KycApplication> {
    return this.prisma.kycApplication.update({
      where: { id },
      data: {
        onchainIdAddress,
        onchainIdCreated: true,
      },
    });
  }

  /**
   * Get pending applications count
   */
  async getPendingCount(): Promise<number> {
    return this.prisma.kycApplication.count({
      where: { status: KycApplicationStatus.PENDING },
    });
  }

  /**
   * Get statistics
   */
  async getStatistics() {
    const [total, pending, approved, rejected, underReview] = await Promise.all(
      [
        this.prisma.kycApplication.count(),
        this.prisma.kycApplication.count({
          where: { status: KycApplicationStatus.PENDING },
        }),
        this.prisma.kycApplication.count({
          where: { status: KycApplicationStatus.APPROVED },
        }),
        this.prisma.kycApplication.count({
          where: { status: KycApplicationStatus.REJECTED },
        }),
        this.prisma.kycApplication.count({
          where: { status: KycApplicationStatus.UNDER_REVIEW },
        }),
      ]
    );

    return {
      total,
      pending,
      approved,
      rejected,
      underReview,
    };
  }
}
