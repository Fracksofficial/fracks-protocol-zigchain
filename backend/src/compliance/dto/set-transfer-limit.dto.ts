import { IsOptional, IsString } from "class-validator";

export class SetTransferLimitDto {
  @IsString()
  address!: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  txHash?: string;
}
