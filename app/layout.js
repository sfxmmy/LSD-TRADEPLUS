import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata = {
  title: 'LSDTRADE+ | Trading Journal',
  description: 'Professional trading journal for serious traders',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
