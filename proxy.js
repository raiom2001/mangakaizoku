// MangaKaizoku — proxy.js
// Proxy local: repassa requests para api.mangadex.org sem bloqueio CORS
// Rode com: node proxy.js
const http  = require('http');
const https = require('https');
const url   = require('url');

const PORT   = 3001;
const TARGET = 'api.mangadex.org';

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const parsed  = url.parse(req.url);
  const apiPath = parsed.path.replace(/^\/api/, '');

  const options = {
    hostname: TARGET,
    path: apiPath,
    method: 'GET',
    headers: { 'Accept': 'application/json', 'User-Agent': 'MangaKaizoku/1.0' },
  };

  const proxy = https.request(options, apiRes => {
    res.writeHead(apiRes.statusCode, { 'Content-Type': 'application/json' });
    apiRes.pipe(res);
  });

  proxy.on('error', e => {
    console.error('Proxy error:', e.message);
    res.writeHead(502); res.end(JSON.stringify({ error: e.message }));
  });

  proxy.end();
  console.log('[proxy]', apiPath.split('?')[0]);
});

server.listen(PORT, () => {
  console.log('MangaKaizoku proxy -> http://localhost:' + PORT);
});
