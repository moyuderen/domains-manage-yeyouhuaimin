import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="bg-background text-foreground min-h-screen">{children}</div>
}
