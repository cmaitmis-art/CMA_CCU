const db = require('./db');
const bcrypt = require('bcryptjs');

async function migratePasswords() {
  try {
    await db.ready;
    console.log('Database connected. Fetching users...');
    
    const users = await db.models.User.findAll();
    let updatedCount = 0;

    for (const user of users) {
      // Check if password is not already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      if (!user.password.startsWith('$2a$') && !user.password.startsWith('$2b$') && !user.password.startsWith('$2y$')) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        user.password = hashedPassword;
        await user.save();
        updatedCount++;
        console.log(`Updated password for user: ${user.username}`);
      }
    }

    console.log(`Migration complete. Updated ${updatedCount} users.`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePasswords();
