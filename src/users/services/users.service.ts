import { Injectable } from '@nestjs/common';

import { User } from '../models';
import { pool } from '../../pg-pool';

@Injectable()
export class UsersService {
  async findOne(userId: string, password: string): Promise<User> {
    const res = await pool.query(
      'select * from users where name = $1 and password = $2',
      [userId, password],
    );
    return res.rows[0];
  }
}
