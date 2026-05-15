import { ArrayNotEmpty, IsArray, IsOptional, IsString } from "class-validator";

export class UpdateRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roles!: string[];

  @IsOptional()
  @IsString()
  roleStatus?: string;
}
