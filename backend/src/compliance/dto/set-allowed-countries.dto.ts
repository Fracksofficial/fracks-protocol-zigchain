import { IsArray, IsOptional, IsString } from "class-validator";

export class SetAllowedCountriesDto {
  @IsArray()
  @IsString({ each: true })
  allowedCountries!: string[];

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  txHash?: string;
}
