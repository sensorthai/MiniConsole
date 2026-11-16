import { NextResponse } from 'next/server';
import os from 'os';

export const dynamic = 'force-dynamic';

function getLocalIps(): string[] {
  const nets = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips.length ? ips : ['127.0.0.1'];
}

export async function GET() {
  const ips = getLocalIps();
  const port = process.env.PORT || 8080;
  const mdnsInfo = (globalThis as Record<string, unknown>).__miniConsoleMdns as
    | { hostname?: string; port?: number; devices?: unknown[] }
    | undefined;
  const mdnsHostname = mdnsInfo?.hostname || 'miniconsole.local';

  return NextResponse.json({
    ok: true,
    server: 'Next.JS (v14)',
    port,
    wsEndpoint: `/ws`,
    localIps: ips,
    mdnsHostname,
    mdnsUrl: `http://${mdnsHostname}:${port}`,
    mdnsWsUrl: `ws://${mdnsHostname}:${port}/ws`,
    discoveredDevices: mdnsInfo?.devices || []
  });
}
