import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { getTenantConnection } from './src/db/connectionManager';
import { getModels } from './src/db/tenantModels';

async function run() {
  await mongoose.connect('mongodb+srv://OneShop_db_user:OneShop%402526@cluster-oneshop.497kaq6.mongodb.net/oneshop_open_door?retryWrites=true&w=majority&appName=Cluster-OneShop');
  const conn = getTenantConnection('oneshop_open_door');
  const { User } = getModels(conn);
  
  const hashedPassword = await bcrypt.hash('123456', 10);
  await User.updateOne({ email: 'mng01@opendoor.lk' }, { password: hashedPassword });
  console.log('Password for mng01@opendoor.lk updated to 123456');
  process.exit(0);
}
run().catch(console.error);
