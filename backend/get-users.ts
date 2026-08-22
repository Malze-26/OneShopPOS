import 'dotenv/config';
import mongoose from 'mongoose';
import { getTenantConnection } from './src/db/connectionManager';
import { getModels } from './src/db/tenantModels';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI as string);
  const conn = getTenantConnection('oneshop_open_door');
  const { User } = getModels(conn);
  const users = await User.find({ role: 'Manager' }, 'email name role').limit(5);
  console.log(users);
  process.exit(0);
}
run().catch(console.error);
