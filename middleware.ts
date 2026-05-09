// middleware.ts - Bảo vệ các trang cần đăng nhập
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'qlbh_nttt_secret_2025'
)

// Các đường dẫn KHÔNG cần đăng nhập
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/debug',       // Trang kiểm tra kết nối - xoá sau khi debug xong
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Cho phép truy cập public paths
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Kiểm tra token
  const token = request.cookies.get('qlbh_session')?.value

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(token, SECRET)
    return NextResponse.next()
  } catch {
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('qlbh_session')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}
