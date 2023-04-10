import { Controller, Get, Req, UseGuards } from '@nestjs/common';

import { BasicAuthGuard } from '../auth';
import { OrderService } from '../order';
import { AppRequest, getUserIdFromRequest } from '../shared';

@Controller('order')
export class OrderController {
  constructor(private orderService: OrderService) {}

  @UseGuards(BasicAuthGuard)
  @Get()
  async findUserOrder(@Req() req: AppRequest) {
    const orders = await this.orderService.findByUserId(
      getUserIdFromRequest(req),
    );
    return orders;
  }
}
