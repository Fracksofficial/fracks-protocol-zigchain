import {
  IsString,
  IsEmail,
  IsOptional,
  IsNotEmpty,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateKycApplicationDto {
  @IsString()
  @IsNotEmpty()
  walletAddress!: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsNotEmpty()
  nationality!: string;

  @IsString()
  @IsNotEmpty()
  country!: string;

  @IsString()
  @IsNotEmpty()
  addressLine1!: string;

  @IsString()
  @IsOptional()
  addressLine2?: string;

  @IsString()
  @IsNotEmpty()
  city!: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsNotEmpty()
  postalCode!: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  // Document URLs (uploaded separately)
  @IsString()
  @IsOptional()
  idDocumentUrl?: string;

  @IsString()
  @IsOptional()
  proofOfAddressUrl?: string;

  @IsString()
  @IsOptional()
  selfieUrl?: string;
}

export class ApproveKycApplicationDto {
  @IsString()
  @IsNotEmpty()
  reviewedBy!: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  onchainIdAddress?: string; // If OnchainID was created
}

export class RejectKycApplicationDto {
  @IsString()
  @IsNotEmpty()
  reviewedBy!: string;

  @IsString()
  @IsNotEmpty()
  rejectionReason!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateKycApplicationDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsOptional()
  riskScore?: number;
}

export enum KycApplicationStatus {
  PENDING = "PENDING",
  UNDER_REVIEW = "UNDER_REVIEW",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export enum DocumentType {
  ID_CARD = "ID_CARD",
  PASSPORT = "PASSPORT",
  DRIVERS_LICENSE = "DRIVERS_LICENSE",
  PROOF_OF_ADDRESS = "PROOF_OF_ADDRESS",
  SELFIE = "SELFIE",
}
