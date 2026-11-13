#!/usr/bin/env node
/**
 * Mini Game Console 3D — Game App WebSocket & HTTP Server
 * - Serves the 3D WebGL Game App at http://<LAN-IP>:8080
 * - Provides WebSocket endpoint at ws://<LAN-IP>:8080/ws
 * - Accepts incoming WebSocket connections from:
 *     1. ESP32 PS3 4-Controller Bridge Firmware (Outbound WS Client mode)
 *     2. Browser Game Clients (Mini Game Console 3D)
 * - Relays 60Hz 4-player PS3 controller packets (ESP32 -> Browser)
 *   and Rumble/LED feedback packets (Browser -> ESP32).
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');

const PORT = parseInt(process.env.PORT || '8080', 10);
const ROOT_DIR = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.mjs':  'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon'
};

/** Connected RFC6455 WebSocket sockets */
const clients = new Set();

function encodeWsFrame(text) {
    const payload = Buffer.from(text, 'utf8');
    const len = payload.length;
    let header;
    if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81; // FIN + Text frame
        header[1] = len;
    } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81;
        header[1] = 126;
        header.writeUInt16BE(len, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x81;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, payload]);
}

function decodeWsFrames(buffer, onMessage, onClose, onPing) {
    let offset = 0;
    while (offset + 2 <= buffer.length) {
        const byte0 = buffer[offset];
        const byte1 = buffer[offset + 1];
        const opcode = byte0 & 0x0f;
        const masked = (byte1 & 0x80) !== 0;
        let payloadLen = byte1 & 0x7f;
        let headerLen = 2;

        if (payloadLen === 126) {
            if (offset + 4 > buffer.length) break;
            payloadLen = buffer.readUInt16BE(offset + 2);
            headerLen = 4;
        } else if (payloadLen === 127) {
            if (offset + 10 > buffer.length) break;
            payloadLen = Number(buffer.readBigUInt64BE(offset + 2));
            headerLen = 10;
        }

        const maskLen = masked ? 4 : 0;
        if (offset + headerLen + maskLen + payloadLen > buffer.length) break;

        const payloadOffset = offset + headerLen + maskLen;
        const payload = Buffer.alloc(payloadLen);
        if (masked) {
            const mask = buffer.subarray(offset + headerLen, offset + headerLen + 4);
            for (let i = 0; i < payloadLen; i++) {
                payload[i] = buffer[payloadOffset + i] ^ mask[i & 3];
            }
        } else {
            buffer.copy(payload, 0, payloadOffset, payloadOffset + payloadLen);
        }

        offset = payloadOffset + payloadLen;

        if (opcode === 0x08) {
            onClose();
            return buffer.subarray(offset);
        } else if (opcode === 0x09) {
            onPing(payload);
        } else if (opcode === 0x01 || opcode === 0x02) {
            onMessage(payload.toString('utf8'));
        }
    }
    return buffer.subarray(offset);
}

const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    if (urlPath === '/api/server-info') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
        res.end(JSON.stringify({ ok: true, clients: clients.size, port: PORT }));
        return;
    }

    const relPath = urlPath === '/' ? '/index.html' : urlPath;
    const filePath = path.normalize(path.join(ROOT_DIR, relPath));
    if (!filePath.startsWith(ROOT_DIR)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not Found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
            'Cache-Control': 'no-cache'
        });
        res.end(data);
    });
});

server.on('upgrade', (req, socket) => {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
        socket.destroy();
        return;
    }

    const acceptKey = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${acceptKey}\r\n\r\n`
    );

    socket.setNoDelay(true);
    const client = { socket, role: 'browser', rxBuf: Buffer.alloc(0) };
    clients.add(client);

    socket.on('data', (chunk) => {
        client.rxBuf = Buffer.concat([client.rxBuf, chunk]);
        client.rxBuf = decodeWsFrames(
            client.rxBuf,
            (text) => {
                if (text.includes('"esp32_ps3_bridge"')) {
                    client.role = 'esp32';
                    console.log(`[WS] ESP32 PS3 4-Controller Hub connected from ${socket.remoteAddress}`);
                }
                const frame = encodeWsFrame(text);
                for (const other of clients) {
                    if (other !== client && !other.socket.destroyed) {
                        other.socket.write(frame);
                    }
                }
            },
            () => {
                clients.delete(client);
                socket.end();
            },
            (pingPayload) => {
                const pong = Buffer.concat([Buffer.from([0x8a, pingPayload.length & 0x7f]), pingPayload]);
                if (!socket.destroyed) socket.write(pong);
            }
        );
    });

    socket.on('close', () => clients.delete(client));
    socket.on('error', () => clients.delete(client));
});

function getLocalIps() {
    const nets = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                ips.push(net.address);
            }
        }
    }
    return ips.length ? ips : ['127.0.0.1'];
}

server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIps();
    console.log('================================================================');
    console.log(' 🎮 Mini Game Console 3D — Game App WebSocket Server Running!');
    console.log('================================================================');
    for (const ip of ips) {
        console.log(` 🌐 Open Game in Browser : http://${ip}:${PORT}`);
        console.log(` 🔌 ESP32 Server Address : ws://${ip}:${PORT}/ws`);
    }
    console.log('================================================================');
});
