import { Injectable } from '@nestjs/common';
import { v4 } from 'uuid';

import { Order } from '../models';
import { pool } from '../../pg-pool';

@Injectable()
export class OrderService {
  private orders: Record<string, Order> = {};

  findById(orderId: string): Order {
    return this.orders[orderId];
  }

  async create(data: any): Promise<Order> {
    const id = v4(v4());
    const order = {
      ...data,
      id,
      status: 'inProgress',
    };
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `insert into orders (id, user_id, cart_id, payment, delivery, comments, status, total) values ($1, $2, $3, $4, $5, $6, $7, $8);`,
        [
          order.id,
          order.userId,
          order.cartId,
          JSON.stringify(order.payment),
          JSON.stringify(order.address),
          order.comments,
          order.status,
          order.total,
        ],
      );
      await client.query(
        `update carts
       set "status" = 'ORDERED', "updated_at" = current_date
       where carts.user_id = $1 and carts.status = 'OPEN'`,
        [order.userId],
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return order;
  }

  update(orderId, data) {
    const order = this.findById(orderId);

    if (!order) {
      throw new Error('Order does not exist.');
    }

    this.orders[orderId] = {
      ...data,
      id: orderId,
    };
  }
}
