// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Nội Thất Tính Tuyết – Quản Lý Bán Hàng',
  description: 'Phần mềm quản lý bán hàng nội thất',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  )
}
