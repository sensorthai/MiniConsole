const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '8080', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function getLocalIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips.length ? ips : ['127.0.0.1'];
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  // Attach WebSocket Server to the same HTTP port (supporting /ws and custom paths)
  const wss = new WebSocketServer({ noServer: true });
  const clients = new Set();

  server.on('upgrade', (req, socket, head) => {
    const { pathname } = parse(req.url || '/');
    // Accept WebSocket upgrades on /ws, / or any ESP32/browser endpoint
    if (pathname === '/ws' || pathname === '/' || pathname === '/api/ws') {
      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    const client = { ws, role: 'browser', ip: req.socket.remoteAddress };
    clients.add(client);

    ws.on('message', (data, isBinary) => {
      const msgStr = isBinary ? data : data.toString('utf8');

      if (typeof msgStr === 'string' && msgStr.includes('"esp32_ps3_bridge"')) {
        client.role = 'esp32';
        console.log(`[Next.JS WS] ESP32 PS3 4-Controller Hub registered from ${client.ip}`);
      }

      // Broadcast to all other connected clients (ESP32 <-> Browser game instances)
      for (const other of clients) {
        if (other !== client && other.ws.readyState === WebSocket.OPEN) {
          other.ws.send(data, { binary: isBinary });
        }
      }
    });

    ws.on('close', () => {
      clients.delete(client);
    });

    ws.on('error', (err) => {
      console.warn(`[Next.JS WS] Client error from ${client.ip}:`, err.message);
      clients.delete(client);
    });
  });

  server.listen(port, hostname, () => {
    const ips = getLocalIps();
    console.log('================================================================');
    console.log(` ⚡ Mini Game Console 3D — Next.JS Server Running on Port ${port}!`);
    console.log('================================================================');
    for (const ip of ips) {
      console.log(` 🌐 Next.JS Web App : http://${ip}:${port}`);
      console.log(` 🔌 ESP32 WebSocket : ws://${ip}:${port}/ws`);
    }
    console.log('================================================================');
  });
});
