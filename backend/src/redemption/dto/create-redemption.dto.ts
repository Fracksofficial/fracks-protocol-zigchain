import { IsOptional, IsString, IsNumber } from "class-validator";

export class CreateRedemptionDto {
  @IsNumber()
  requestId!: number;

  @IsString()
  tokenContract!: string;

  @IsNumber()
  assetId!: number;

  @IsString()
  requester!: string;

  @IsString()
  amount!: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
