const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

function loadCfilesRouterWithMockDb(mockCfileModel) {
  const dbPath = path.resolve(__dirname, '../db.js');
  const backupPath = path.resolve(__dirname, '../utils/sqlbackup.js');
  const routePath = path.resolve(__dirname, '../routes/cfiles.js');

  delete require.cache[routePath];
  require.cache[dbPath] = {
    id: dbPath,
    filename: dbPath,
    loaded: true,
    exports: {
      models: { Cfile: mockCfileModel },
      sequelize: { fn: () => {}, col: () => {}, transaction: async () => ({}) },
    },
  };
  require.cache[backupPath] = {
    id: backupPath,
    filename: backupPath,
    loaded: true,
    exports: { backupAfter: async () => {} },
  };

  return require(routePath);
}

function getTransferHandler(router) {
  const layer = router.stack.find(
    (entry) => entry.route && entry.route.path === '/:id/transfer' && entry.route.methods.put
  );
  assert.ok(layer, 'PUT /:id/transfer route must exist');
  return layer.route.stack[0].handle;
}

function createResMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

test('PUT /:id/transfer supports optional remark and file attachment', async () => {
  const createdFiles = [];
  let updatedPayload = null;
  const mockRecord = {
    id: 582,
    status: 'New',
    assigned_department: null,
    history: JSON.stringify([{ name: 'admin', action: 'Added', time: '2026-11-11T08:00:00.000Z' }]),
    async update(fields) {
      updatedPayload = fields;
      Object.assign(this, fields);
      return this;
    },
  };

  const router = loadCfilesRouterWithMockDb({
    findByPk: async (id) => (String(id) === '582' ? mockRecord : null),
  });
  const handler = getTransferHandler(router);

  try {
    // 1. Transfer with remark and uploaded file
    const res1 = createResMock();
    await handler(
      {
        params: { id: '582' },
        body: {
          assigned_department: 'LEGAL',
          user_name: 'Admin (admin)',
          from_department: 'ADMIN',
          transfer_remark: '  Please check deed  ',
        },
        files: {
          document: {
            name: 'supporting-note.pdf',
            data: Buffer.from('%PDF-test'),
          },
        },
      },
      res1
    );

    assert.equal(res1.statusCode, 200);
    assert.equal(updatedPayload.status, 'Transferred');
    assert.equal(updatedPayload.assigned_department, 'LEGAL');

    const history1 = JSON.parse(updatedPayload.history);
    assert.equal(history1.length, 2);
    const transferEntry = history1[1];
    assert.equal(transferEntry.action, 'Transferred');
    assert.equal(transferEntry.from_department, 'ADMIN');
    assert.equal(transferEntry.to_department, 'LEGAL');
    assert.equal(transferEntry.remark, 'Please check deed');
    assert.equal(transferEntry.document_name, 'supporting-note.pdf');
    assert.match(transferEntry.document_path, /^uploads\/cfiles\/CFILE_TRANSFER_582_\d+\.pdf$/);

    const savedAbsPath = path.resolve(__dirname, '../', transferEntry.document_path);
    createdFiles.push(savedAbsPath);
    assert.equal(fs.existsSync(savedAbsPath), true);

    // 2. Return to CCU without remark or file
    const res2 = createResMock();
    await handler(
      {
        params: { id: '582' },
        body: {
          assigned_department: 'CCU',
          user_name: 'Legal Officer',
          from_department: 'LEGAL',
          transfer_remark: '   ',
        },
      },
      res2
    );

    assert.equal(res2.statusCode, 200);
    assert.equal(updatedPayload.status, 'Pending');
    assert.equal(updatedPayload.assigned_department, null);

    const history2 = JSON.parse(updatedPayload.history);
    assert.equal(history2.length, 3);
    assert.equal(history2[2].action, 'Returned to CCU');
    assert.equal('remark' in history2[2], false);
    assert.equal('document_path' in history2[2], false);
  } finally {
    for (const filePath of createdFiles) {
      try {
        await fs.promises.unlink(filePath);
      } catch (e) {}
    }
  }
});

test('PUT /:id/transfer returns 400 when assigned_department is missing', async () => {
  const router = loadCfilesRouterWithMockDb({
    findByPk: async () => null,
  });
  const handler = getTransferHandler(router);
  const res = createResMock();

  await handler({ params: { id: '582' }, body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error, 'Assigned department is required');
});
