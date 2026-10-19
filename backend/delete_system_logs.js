const db = require('./db');

db.ready.then(async () => {
  try {
    const { SystemLog } = db.models;
    if (!SystemLog) {
      console.log('SystemLog model not found in models.');
      process.exit(1);
    }
    
    // Delete all logs where user_name is 'System' (case-insensitive depends on DB, but let's just use string 'System')
    const deletedCount = await SystemLog.destroy({
      where: {
        user_name: 'System'
      }
    });
    
    console.log(`Deleted ${deletedCount} logs where user_name is 'System'.`);
  } catch (error) {
    console.error('Failed to delete system logs:', error);
  } finally {
    process.exit(0);
  }
});
