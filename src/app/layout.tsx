import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bloomberg Dashboard — Terminal Finansowy',
  description: 'Dashboard finansowy inspirowany Bloomberg Terminal — akcje, krypto, wiadomości, kalendarz ekonomiczny.',
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
