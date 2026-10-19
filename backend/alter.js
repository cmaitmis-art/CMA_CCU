const { sequelize } = require('./db.js');
sequelize.query('ALTER TABLE users ADD COLUMN phone TEXT, ADD COLUMN year TEXT').then(function() {
  console.log('Columns added');
  process.exit(0);
}).catch(function(e) {
  console.error('Error adding columns:', e.message);
  process.exit(1);
});
