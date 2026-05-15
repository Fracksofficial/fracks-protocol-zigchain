import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
} from "class-validator";

export enum RequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export class CreateIssuanceRequestDto {
  @IsNumber()
  @IsNotEmpty()
  requestId!: number;

  @IsString()
  @IsNotEmpty()
  tokenAddress!: string;

  @IsNumber()
  @IsNotEmpty()
  assetId!: number;

  @IsString()
  @IsNotEmpty()
  recipient!: string;

  @IsString()
  @IsNotEmpty()
  amount!: string;

  @IsString()
  @IsNotEmpty()
  requester!: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  txHash?: string;
}

export class ApproveIssuanceRequestDto {
  @IsString()
  @IsNotEmpty()
  approvedBy!: string;

  @IsString()
  @IsNotEmpty()
  txHash!: string;
}

export class RejectIssuanceRequestDto {
  @IsString()
  @IsNotEmpty()
  rejectedBy!: string;

  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;
}

export class IssuanceRequestResponseDto {
  id!: number;
  requestId!: number;
  tokenAddress!: string;
  assetId!: number;
  recipient!: string;
  amount!: string;
  requester!: string;
  status!: RequestStatus;
  reason?: string;
  txHash?: string;
  createdAt!: Date;
  updatedAt!: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
}

export class CreateRedemptionRequestDto {
  @IsNumber()
  @IsNotEmpty()
  requestId!: number;

  @IsString()
  @IsNotEmpty()
  tokenAddress!: string;

  @IsNumber()
  @IsNotEmpty()
  assetId!: number;

  @IsString()
  @IsNotEmpty()
  requester!: string;

  @IsString()
  @IsNotEmpty()
  amount!: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  txHash?: string;
}

export class RedemptionRequestResponseDto {
  id!: number;
  requestId!: number;
  tokenAddress!: string;
  assetId!: number;
  requester!: string;
  amount!: string;
  status!: RequestStatus;
  reason?: string;
  txHash?: string;
  createdAt!: Date;
  updatedAt!: Date;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
}
