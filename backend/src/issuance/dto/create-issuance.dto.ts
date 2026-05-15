import { IsString, IsNumber } from "class-validator";

export class CreateIssuanceDto {
  @IsNumber()
  requestId!: number;

  @IsString()
  tokenContract!: string;

  @IsNumber()
  assetId!: number;

  @IsString()
  recipient!: string;

  @IsString()
  requester!: string;

  @IsString()
  amount!: string;
}
