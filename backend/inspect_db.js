const path = require('path');
const db = require(path.resolve('db.js'));
const { Op } = require('sequelize');

db.ready.then(async () => {
  const { ManagementCorporation, McomRecord, Cfile, Complaint } = db.models;
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);

  console.log('1. Counting ManagementCorporation Active...');
  try {
    const mc = await ManagementCorporation.count({ where: { status: 'Active' } });
    console.log('mc:', mc);
  } catch(e) { console.error('MC Active failed:', e.message); }

  console.log('2. Counting McomRecord...');
  try {
    const mcom = await McomRecord.count();
    console.log('mcom:', mcom);
  } catch(e) { console.error('McomRecord failed:', e.message); }

  console.log('3. Counting Cfile...');
  try {
    const cfiles = await Cfile.count();
    console.log('cfiles:', cfiles);
  } catch(e) { console.error('Cfile failed:', e.message); }

  console.log('4. Counting Cfile pending overdue...');
  try {
    const pendingCfiles = await Cfile.count({ where: { status: 'Pending', date: { [Op.lte]: fifteenDaysAgo } } });
    console.log('pendingCfiles:', pendingCfiles);
  } catch(e) { console.error('Pending Cfiles failed:', e.message); }

  console.log('5. Counting Complaint pending...');
  try {
    const pendingComplaints = await Complaint.count({ where: { status: { [Op.in]: ['New', 'Open', 'Pending'] } } });
    console.log('pendingComplaints:', pendingComplaints);
  } catch(e) { console.error('Pending Complaints failed:', e.message); }

  console.log('6. Counting ManagementCorporation pending...');
  try {
    const pendingMc = await ManagementCorporation.count({ where: { status: 'Pending' } });
    console.log('pendingMc:', pendingMc);
  } catch(e) { console.error('Pending MC failed:', e.message); }

  console.log('7. Counting McomRecord pending...');
  try {
    const pendingMcom = await McomRecord.count({ where: { status: 'Pending' } });
    console.log('pendingMcom:', pendingMcom);
  } catch(e) { console.error('Pending Mcom failed:', e.message); }

  console.log('8. Counting Complaint overdue...');
  try {
    const pendingComplaintsOverdue = await Complaint.count({
      where: {
        status: { [Op.ne]: 'Closed' },
        received_ccu: { [Op.lt]: fifteenDaysAgo.toISOString().split('T')[0] }
      }
    });
    console.log('pendingComplaintsOverdue:', pendingComplaintsOverdue);
  } catch(e) { console.error('Pending Complaints Overdue failed:', e.message); }

  process.exit(0);
}).catch(err => {
  console.error('Ready failed:', err);
  process.exit(1);
});
