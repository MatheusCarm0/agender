import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async listStaff(@CurrentUser() user: RequestUser) {
    return this.staffService.listStaff(user.businessId);
  }

  @Post('invites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async createInvite(@CurrentUser() user: RequestUser, @Body() dto: CreateInviteDto) {
    return this.staffService.createInvite(user.businessId, user.userId, dto);
  }

  @Get('invites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async listInvites(@CurrentUser() user: RequestUser) {
    return this.staffService.listInvites(user.businessId);
  }

  @Delete('invites/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async revokeInvite(@CurrentUser() user: RequestUser, @Param('id') id: string) {
    await this.staffService.revokeInvite(user.businessId, id);
    return { message: 'Invite revoked' };
  }

  @Post('invites/:token/accept')
  async acceptInvite(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    return this.staffService.acceptInvite(token, dto);
  }

  @Patch(':userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async updateStaff(
    @CurrentUser() user: RequestUser,
    @Param('userId') userId: string,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.staffService.updateStaff(user.businessId, userId, dto);
  }

  @Patch(':userId/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async deactivate(@CurrentUser() user: RequestUser, @Param('userId') userId: string) {
    await this.staffService.deactivate(user.businessId, userId);
    return { message: 'User deactivated' };
  }

  @Patch(':userId/reactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('owner', 'admin')
  async reactivate(@CurrentUser() user: RequestUser, @Param('userId') userId: string) {
    await this.staffService.reactivate(user.businessId, userId);
    return { message: 'User reactivated' };
  }
}
