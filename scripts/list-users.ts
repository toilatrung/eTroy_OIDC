import mongoose from 'mongoose';

import { config } from '@/config/config.js';
import { UserModel } from '@/modules/users/user.model.js';

async function listUsers() {
  try {
    await mongoose.connect(config.infrastructure.mongodb.uri);
    const users = await UserModel.find({});
    console.log('Users in DB:', users.map(u => ({ email: u.email, sub: u.sub })));
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await mongoose.disconnect();
  }
}

listUsers();
