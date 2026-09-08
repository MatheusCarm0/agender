import { IsString } from 'class-validator';

export class RequestMembershipDto {
  @IsString()
  planId!: string;
}
