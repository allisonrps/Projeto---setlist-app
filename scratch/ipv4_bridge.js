const net = require('net');

const LOCAL_PORT = 8081;
const TARGET_PORT = 8081;
const TARGET_HOST = '::1'; // Metro is listening on IPv6 localhost

const server = net.createServer((socket) => {
  const client = net.createConnection({ port: TARGET_PORT, host: TARGET_HOST });
  
  socket.pipe(client);
  client.pipe(socket);
  
  socket.on('error', () => {});
  client.on('error', () => {});
});

server.listen(LOCAL_PORT, '127.0.0.1', () => {
  console.log(`[Bridge] Tunneling 127.0.0.1:${LOCAL_PORT} -> [${TARGET_HOST}]:${TARGET_PORT}`);
});
