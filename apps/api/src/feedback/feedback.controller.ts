import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

// Só JwtAuthGuard (sem RolesGuard de propósito): qualquer membro logado pode
// reportar, inclusive com o plano expirado — é justamente quando mais
// precisamos ouvir o que quebrou.
@Controller('feedback')
@UseGuards(JwtAuthGuard)
export class FeedbackController {
  constructor(private readonly service: FeedbackService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateFeedbackDto) {
    return this.service.submit(req.user, dto);
  }
}
