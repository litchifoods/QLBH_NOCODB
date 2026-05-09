// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, TABLES } from '@/lib/nocodb'
import { createToken, hashPassword, UserSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { tenDangNhap, matKhau, nhoDangNhap } = await request.json()

    if (!tenDangNhap || !matKhau) {
      return NextResponse.json(
        { message: 'Vui lòng nhập đầy đủ thông tin' },
        { status: 400 }
      )
    }

    // Tìm tài khoản trong NocoDB
    const result = await getRecords(TABLES.TAI_KHOAN, {
      where: `(Tên đăng nhập,eq,${tenDangNhap})`,
      limit: 1,
    })

    const account = result.list?.[0]

    if (!account) {
      return NextResponse.json(
        { message: 'Tên đăng nhập không tồn tại' },
        { status: 401 }
      )
    }

    if (account['Trạng thái'] === 'Khoá') {
      return NextResponse.json(
        { message: 'Tài khoản đã bị khoá. Liên hệ chủ cửa hàng.' },
        { status: 403 }
      )
    }

    // Kiểm tra mật khẩu
    // Lần đầu tiên: nếu chưa có mật khẩu hash, dùng mật khẩu mặc định là tên đăng nhập
    const storedHash = account['Mật khẩu'] || await hashPassword(tenDangNhap)
    const inputHash  = await hashPassword(matKhau)

    // Nếu chưa set mật khẩu, cho đăng nhập với mật khẩu = tên đăng nhập
    const isValid = inputHash === storedHash ||
                    matKhau === tenDangNhap // Mật khẩu mặc định lần đầu

    if (!isValid) {
      return NextResponse.json(
        { message: 'Mật khẩu không đúng' },
        { status: 401 }
      )
    }

    // Tạo session
    const user: UserSession = {
      maTaiKhoan:  account['Mã tài khoản'],
      tenDangNhap: account['Tên đăng nhập'],
      hoTen:       account['Họ tên'],
      maNV:        account['Mã NV'] || '',
      vaiTro:      account['Vai trò'],
      quyenHan:    account['Quyền hạn'] || '',
      telegramId:  account['Telegram ID'] || '',
    }

    const token = await createToken(user)

    // Set cookie
    const maxAge = nhoDangNhap ? 7 * 24 * 60 * 60 : 24 * 60 * 60 // 7 ngày hoặc 1 ngày
    const response = NextResponse.json({ success: true, user })
    response.cookies.set('qlbh_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { message: 'Lỗi hệ thống. Vui lòng thử lại.' },
      { status: 500 }
    )
  }
}
