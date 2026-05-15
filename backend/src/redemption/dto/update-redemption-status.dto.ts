import { IsString } from "class-validator";

export class UpdateRedemptionStatusDto {
  @IsString()
  status!: string;

  @IsString()
  txHash!: string;
}
