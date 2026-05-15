import { IsOptional, IsString } from "class-validator";

export class CreateTrackedWalletDto {
  @IsString()
  walletAddress!: string;

  @IsOptional()
  @IsString()
  label?: string;
}
