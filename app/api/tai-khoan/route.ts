// app/api/tai-khoan/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function hashPwd(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.JWT_SECRET || 'qlbh2025'))
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Buffer.from(hash).toString('hex')
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    if (session.vaiTro !== 'Chủ cửa hàng') return NextResponse.json({ message: 'Không có quyền' }, { status: 403 })
    const data = await getRecords(TABLES.TAI_KHOAN, { limit: 100, sort: 'Mã tài khoản' })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    if (session.vaiTro !== 'Chủ cửa hàng') return NextResponse.json({ message: 'Không có quyền' }, { status: 403 })

    const body = await req.json()
    const { id, quyen, trangThai, matKhauMoi } = body

    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    // Bảo vệ tài khoản Chủ cửa hàng
    const target = await getRecords(TABLES.TAI_KHOAN, { where: `(Id,eq,\)`, limit: 1 })
    const targetAcc = target.list?.[0]
    if (targetAcc?.['Vai trò'] === 'Chủ cửa hàng' && targetAcc?.['Mã tài khoản'] !== session.maTaiKhoan) {
      return NextResponse.json({ message: 'Không thể sửa tài khoản Chủ cửa hàng' }, { status: 403 })
    }
    if (targetAcc?.['Vai trò'] === 'Chủ cửa hàng' && trangThai === 'Khóa') {
      return NextResponse.json({ message: 'Không thể khóa tài khoản Chủ cửa hàng' }, { status: 403 })
    }
    const updateData: Record<string, any> = {}

    // Cập nhật quyền
    if (quyen !== undefined) updateData['Quyền'] = quyen

    // Cập nhật trạng thái khóa/mở
    if (trangThai !== undefined) updateData['Trạng thái'] = trangThai

    // Đổi mật khẩu
    if (matKhauMoi) {
      if (matKhauMoi.length < 6) return NextResponse.json({ message: 'Mật khẩu mới phải ít nhất 6 ký tự' }, { status: 400 })
      updateData['Mật khẩu'] = await hashPwd(matKhauMoi)
    }

    const result = await updateRecord(TABLES.TAI_KHOAN, Number(id), updateData)
    return NextResponse.json({ success: true, data: result })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    if (session.vaiTro !== 'Chủ cửa hàng') return NextResponse.json({ message: 'Không có quyền' }, { status: 403 })

    const body = await req.json()
    const { hoTen, tenDangNhap, matKhau, maNV, vaiTro } = body
    if (!hoTen||!tenDangNhap) return NextResponse.json({ message: 'Thiếu họ tên hoặc tên đăng nhập' }, { status: 400 })
    if (!matKhau||matKhau.length<6) return NextResponse.json({ message: 'Mật khẩu phải ít nhất 6 ký tự' }, { status: 400 })

    // Kiểm tra tên đăng nhập đã tồn tại
    const existing = await getRecords(TABLES.TAI_KHOAN, {
      where: `(Tên đăng nhập,eq,${tenDangNhap})`, limit: 1
    })
    if ((existing.list||[]).length > 0) return NextResponse.json({ message: 'Tên đăng nhập đã tồn tại' }, { status: 400 })

    // Tạo mã tài khoản mới
    const all = await getRecords(TABLES.TAI_KHOAN, { limit: 1, sort: '-Id', fields: 'Mã tài khoản' })
    const lastMa = all.list?.[0]?.['Mã tài khoản'] || 'ACC-000'
    const lastNum = parseInt(lastMa.split('-').pop() || '0')
    const maTK = 'ACC-' + String(lastNum + 1).padStart(3, '0')

    const matKhauHash = await hashPwd(matKhau)

    const { DEFAULT_QUYEN } = await import('@/lib/quyen-config')
    const result = await import('@/lib/nocodb').then(m => m.createRecord(TABLES.TAI_KHOAN, {
      'Mã tài khoản':   maTK,
      'Tên đăng nhập':  tenDangNhap,
      'Họ tên':         hoTen,
      'Mã NV':          maNV || '',
      'Vai trò':        vaiTro || 'Nhân viên',
      'Mật khẩu':       matKhauHash,
      'Trạng thái':     'Hoạt động',
      'Quyền':          JSON.stringify(DEFAULT_QUYEN),
    }))

    return NextResponse.json({ success: true, data: result, maTK })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
