import mongoose from 'mongoose';
import { config } from '@/config/config.js';
import { UserModel } from '@/modules/users/user.model.js';
import { hashValue } from '@/infrastructure/crypto/index.js';

async function createAdmin() {
  try {
    await mongoose.connect(config.infrastructure.mongodb.uri);
    const email = 'admin@etroy.example';
    const password = 'AdminPassword123!';
    const password_hash = hashValue(password);
    
    const existing = await UserModel.findOne({ email });
    if (existing) {
      console.log('Admin already exists.');
    } else {
      await UserModel.create({
        email,
        password_hash,
        sub: 'admin-123',
        email_verified: true,
        status: 'active',
      });
      console.log('Admin created: admin@etroy.example / AdminPassword123!');
    }
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createAdmin();
