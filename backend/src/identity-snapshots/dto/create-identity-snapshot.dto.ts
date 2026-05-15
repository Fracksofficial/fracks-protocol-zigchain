import { IsArray, IsBoolean, IsOptional, IsString } from "class-validator";

export class CreateIdentitySnapshotDto {
  @IsString()
  wallet!: string;

  @IsArray()
  @IsString({ each: true })
  claimTopics!: string[];

  @IsBoolean()
  verified!: boolean;

  @IsOptional()
  @IsString()
  country?: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  txHash?: string;
}
