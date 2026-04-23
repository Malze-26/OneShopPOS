const bcrypt = require('bcrypt');

async function hashPassword() {
  const password = 'SuperAdmin@123';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  console.log('Hashed password:', hash);
}

hashPassword();