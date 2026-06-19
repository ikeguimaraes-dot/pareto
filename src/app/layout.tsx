import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Pareto — Registro de Jornada',
  description: 'Registro contínuo e inteligência de gestão para equipes administrativas',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className={`${inter.className} bg-gray-50 text-gray-900 min-h-full`}>
        {children}
      </body>
    </html>
  )
}
