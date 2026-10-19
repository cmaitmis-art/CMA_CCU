const db = require('./db');

async function run() {
  await db.sequelize.authenticate();
  const renewal = await db.models.Renewal.findOne({ where: { ref_no: 'MR00003' }, raw: true });
  console.log('RENEWAL:', renewal);
  
  if (renewal) {
    const mc = await db.models.ManagementCorporation.findByPk(renewal.mc_id, { raw: true });
    console.log('MC:', mc);
    
    const history = await db.models.CustomerHistory.findAll({ where: { customer_no: mc.file_no }, raw: true });
    console.log('HISTORY:', history);
  }
  process.exit(0);
}
run();
