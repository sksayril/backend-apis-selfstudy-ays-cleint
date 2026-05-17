/**
 * Promote or create an admin user from the command line.
 * Usage: node scripts/createAdmin.js <email> <password>
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/user.model');

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: node scripts/createAdmin.js <email> <password>');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.DATABASE_URL);

  const normalizedEmail = email.toLowerCase().trim();
  let user = await User.findOne({ email: normalizedEmail });

  if (user) {
    user.role = 'admin';
    user.password = password;
    await user.save();
    console.log(`Updated existing user to admin: ${normalizedEmail}`);
  } else {
    user = new User({ email: normalizedEmail, password, role: 'admin' });
    await user.save();
    console.log(`Created new admin: ${normalizedEmail}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
