import mongoose from 'mongoose';
import { getTenantConnection } from './src/db/connectionManager';
import { getModels } from './src/db/tenantModels';

async function run() {
  await mongoose.connect('mongodb+srv://OneShop_db_user:OneShop%402526@cluster-oneshop.497kaq6.mongodb.net/oneshop_open_door?retryWrites=true&w=majority&appName=Cluster-OneShop');
  const conn = getTenantConnection('oneshop_open_door');
  const { User } = getModels(conn);
  const users = await User.find({ role: 'Manager' }, 'email name role').limit(5);
  console.log(users);
  process.exit(0);
}
run().catch(console.error);
