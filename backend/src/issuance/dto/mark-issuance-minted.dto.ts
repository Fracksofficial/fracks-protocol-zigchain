import { IsString } from "class-validator";

export class MarkIssuanceMintedDto {
  @IsString()
  txHash!: string;
}
