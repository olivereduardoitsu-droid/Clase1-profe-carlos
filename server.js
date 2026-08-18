const http = require('http');

const server = http.createServer((request, response) => {
  console.log(`${request.method} ${request.url}`);
    if (request.url === '/') {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    response.end('Support server. Available routes: /health, /api/info');
    return;
  }

  // /health   → ?
  // /api/info → ?
   if (request.url === '/api/info') {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.end(JSON.stringify({
      name: 'support-server',
      version: '1.0.0',
      routes: ['/', '/health', '/api/info']
    }));
    return;
  }

  response.statusCode = 404;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.end('Not found');

  response.end('Hello from the server');
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
