import './globals.css'
import { ErrorBoundaryWrapper } from './error-boundary-wrapper'

export const metadata = {
  title: 'TRADESAVE+ | Trading Journal',
  description: 'Professional trading journal for serious traders',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundaryWrapper>
          {children}
        </ErrorBoundaryWrapper>
      </body>
    </html>
  )
}
