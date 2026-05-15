import { IsString } from "class-validator";

export class UpdateIssuanceStatusDto {
  @IsString()
  status!: string;

  @IsString()
  txHash!: string;
}
