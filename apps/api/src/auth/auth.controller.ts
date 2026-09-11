import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterBusinessDto } from './dto/register-business.dto';
import { RegisterStartDto } from './dto/register-start.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { PasswordResetStartDto } from './dto/password-reset-start.dto';
import { PasswordResetConfirmDto } from './dto/password-reset-confirm.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

interface RequestUser {
  userId: string;
  businessId: string;
  role: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register/start')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async registerStart(@Body() dto: RegisterStartDto) {
    return this.authService.registerStart(dto.email);
  }

  @Post('register-business')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async registerBusiness(@Body() dto: RegisterBusinessDto) {
    return this.authService.registerBusiness(dto);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  async logout() {
    return { message: 'Logged out' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @CurrentUser() user: RequestUser,
    @Body() body: { name?: string; email?: string },
  ) {
    return this.authService.updateProfile(user.userId, body);
  }

  @Post('password-reset/start')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async passwordResetStart(@Body() dto: PasswordResetStartDto) {
    return this.authService.passwordResetStart(dto.email);
  }

  @Post('password-reset/confirm')
  async passwordResetConfirm(@Body() dto: PasswordResetConfirmDto) {
    return this.authService.passwordResetConfirm(dto.token, dto.password);
  }
}
