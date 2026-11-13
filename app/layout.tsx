import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mini Game Console 3D (Next.JS Server)',
  description: '1–4 Player Local Multiplayer 3D Mini Game Console with ESP32 PS3 WebSocket Bridge'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link rel="stylesheet" href="/game.css" />
        <script
          type="importmap"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              imports: {
                three: 'https://unpkg.com/three@0.164.1/build/three.module.js',
                'three/addons/': 'https://unpkg.com/three@0.164.1/examples/jsm/',
                'cannon-es': 'https://unpkg.com/cannon-es@0.20.0/dist/cannon-es.js'
              }
            })
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
