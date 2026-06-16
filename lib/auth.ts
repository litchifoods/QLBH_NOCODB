// lib/auth.ts - Xác thực và phân quyền

import { SignJWT, jwtVerify } from 'jose'
import { DEFAULT_QUYEN } from '@/lib/quyen-config'
import { cookies } from 'next/headers'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'qlbh_nttt_secret_2025'
)

export interface UserSession {
  maTaiKhoan: string
  tenDangNhap: string
  hoTen: string
  maNV: string
  vaiTro: 'Chủ cửa hàng' | 'Nhân viên'
  quyenHan: string
  telegramId: string
  quyen: Record<string, boolean>
}

// Tạo JWT token
export async function createToken(user: UserSession): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // Token hết hạn sau 7 ngày
    .sign(SECRET)
}

// Xác thực JWT token
export async function verifyToken(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as UserSession
  } catch {
    return null
  }
}

// Lấy session từ cookie
export async function getSession(): Promise<UserSession | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('qlbh_session')?.value
  if (!token) return null
  return verifyToken(token)
}

// Kiểm tra quyền
export function hasPermission(
  user: UserSession,
  permission: string
): boolean {
  if (user.vaiTro === 'Chủ cửa hàng') return true
  return user.quyen?.[permission] === true
}

// Mã hoá mật khẩu (dùng bcrypt-like với Web Crypto)
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + process.env.JWT_SECRET)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(hash).toString('hex')
}

// So sánh mật khẩu
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  const hashedInput = await hashPassword(password)
  return hashedInput === hash
}
