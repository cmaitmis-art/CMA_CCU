const http = require('http');

const start = Date.now();
http.get('http://localhost:3001/api/dashboard/stats', (res) => {
  res.on('data', () => {});
  res.on('end', () => {
    console.log(`Time taken: ${Date.now() - start}ms`);
  });
}).on('error', (err) => {
  console.error(err);
});
