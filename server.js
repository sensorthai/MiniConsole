const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer, WebSocket } = require('ws');
const os = require('os');
const { Bonjour } = require('bonjour-service');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '8080', 10);
const mdnsHostBase = (process.env.MDNS_NAME || 'miniconsole').replace(/\.local$/i, '').toLowerCase();
const mdnsHostname = `${mdnsHostBase}.local`;

globalThis.__miniConsoleMdns = {
  hostname: mdnsHostname,
  port,
  devices: []
};

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
    let bonjour = null;
    try {
      bonjour = new Bonjour();
      bonjour.publish({
        name: 'Mini Game Console 3D',
        type: 'http',
        port,
        host: mdnsHostname,
        txt: { path: '/', ws: '/ws', app: 'miniconsole' }
      });
      bonjour.publish({
        name: 'MiniConsole-WS',
        type: 'ws',
        port,
        host: mdnsHostname,
        txt: { path: '/ws', app: 'miniconsole' }
      });

      const browser = bonjour.find({ type: 'http' });
      const syncDevices = () => {
        const list = [];
        for (const svc of browser.services || []) {
          const svcHost = (svc.host || '').replace(/\.$/, '');
          const svcName = svc.name || '';
          if (!svcHost || svcHost.toLowerCase() === mdnsHostname) continue;
          if (/miniconsole/i.test(svcName) || /miniconsole/i.test(svcHost)) {
            const ipv4 = (svc.addresses || []).find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a)) || '';
            list.push({
              name: svcName,
              host: svcHost,
              ip: ipv4,
              wsUrl: `ws://${svcHost}:81`
            });
          }
        }
        globalThis.__miniConsoleMdns.devices = list;
      };
      browser.on('up', syncDevices);
      browser.on('down', syncDevices);

      const shutdownMdns = () => {
        if (bonjour) {
          bonjour.unpublishAll(() => {
            bonjour.destroy();
            process.exit(0);
          });
        } else {
          process.exit(0);
        }
      };
      process.once('SIGINT', shutdownMdns);
      process.once('SIGTERM', shutdownMdns);
    } catch (err) {
      console.warn('[mDNS] Failed to start mDNS advertisement:', err.message);
    }

    console.log('================================================================');
    console.log(` ⚡ Mini Game Console 3D — Next.JS Server Running on Port ${port}!`);
    console.log('================================================================');
    console.log(` 🌐 mDNS Web App    : http://${mdnsHostname}:${port}`);
    console.log(` 🔌 mDNS WebSocket  : ws://${mdnsHostname}:${port}/ws`);
    for (const ip of ips) {
      console.log(` 🌐 Next.JS Web App : http://${ip}:${port}`);
      console.log(` 🔌 ESP32 WebSocket : ws://${ip}:${port}/ws`);
    }
    console.log('================================================================');
  });
});
