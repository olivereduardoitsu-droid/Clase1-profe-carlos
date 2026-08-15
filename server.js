const http = require('http');

const server = http.createServer((request, response) => {
      console.log(`${request.method} ${request.url}`);

        response.statusCode = 200;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.end('Hello from the server');
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});
