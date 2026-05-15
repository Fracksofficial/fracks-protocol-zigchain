import { Type } from "class-transformer";
import { IsOptional, IsString, IsInt, IsDateString } from "class-validator";

export class CreateAssetDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  factoryAssetId?: number;

  @IsString()
  tokenContract!: string;

  @IsString()
  name!: string;

  @IsString()
  symbol!: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  issuerWallet?: string;

  @IsOptional()
  @IsString()
  legalOwner?: string;

  @IsOptional()
  @IsDateString()
  deployedAt?: string;
}
