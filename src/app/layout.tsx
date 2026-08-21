import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bloomberg Dashboard — Terminal Finansowy',
  description: 'Dashboard finansowy inspirowany Bloomberg Terminal — akcje, krypto, wiadomości, kalendarz ekonomiczny.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#080808',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="bg-terminal-bg text-terminal-text font-mono antialiased">
        <div className="scanline" aria-hidden="true" />
        {children}
      </body>
    </html>
  )
}
