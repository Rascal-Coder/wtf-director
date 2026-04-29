'use client'

import { ToastProvider } from "@/contexts/ToastContext"
import { QueryProvider } from "@/components/providers/QueryProvider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
    <ToastProvider>
      {children}
    </ToastProvider>
  </QueryProvider>
  )
}
