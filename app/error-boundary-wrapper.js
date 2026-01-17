'use client'

import { ErrorBoundary } from '@/components/ErrorBoundary'

export function ErrorBoundaryWrapper({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>
}
