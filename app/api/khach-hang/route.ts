// app/api/khach-hang/route.ts — v5.0
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaKHMoi(): Promise<string> {
  try {
    const result = await getRecords(TABLES.KHACH_HANG, {
      limit: 1, sort: '-Id', fields: 'Mã KH,Id',
    })
    const kh = result.list?.[0]
    if (kh?.['Mã KH']) {
      const parts = (kh['Mã KH'] as string).split('-')
      const so    = parseInt(parts[parts.length - 1] || '0')
      if (!isNaN(so)) return `KH-${String(so + 1).padStart(3, '0')}`
    }
    return 'KH-001'
  } catch {
    return `KH-${Date.now().toString().slice(-4)}`
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const loai   = searchParams.get('loai')
    const maKH   = searchParams.get('maKH')
    const q      = searchParams.get('q') || ''
    const limit  = Number(searchParams.get('limit')  || 500)
    const offset = Number(searchParams.get('offset') || 0)

    // ── Kiểm tra có thể xóa KH không ──
    if (loai === 'kiem-tra-xoa' && maKH) {
      const donHang = await getRecords(TABLES.DON_HANG, {
        where: `(Mã KH,eq,${maKH})`, limit: 1, fields: 'Id'
      })
      const coTheXoa = (donHang.list || []).length === 0
      const lyDo = coTheXoa ? [] : ['khách hàng đã có đơn hàng']
      return NextResponse.json({ coTheXoa, lyDo })
    }

    const where  = q ? `(Tên khách hàng,like,%${q}%)` : undefined
    const result = await getRecords(TABLES.KHACH_HANG, {
      where, limit, offset, sort: '-Id',
      fields: 'Id,Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng,Ghi chú,Ngày tạo',
    })
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body = await request.json()
    const maKH = await taoMaKHMoi()

    const result = await createRecord(TABLES.KHACH_HANG, {
      ...body,
      'Mã KH':    maKH,
      'Ngày tạo': body['Ngày tạo'] || new Date().toISOString().split('T')[0],
    })
    if (!result) return NextResponse.json({ message: 'Lỗi tạo khách hàng' }, { status: 500 })

    return NextResponse.json({
      success: true,
      data:    result,
      'Mã KH': result['Mã KH'] || maKH,
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const body          = await request.json()
    const { id, ...upd } = body
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    const result = await updateRecord(TABLES.KHACH_HANG, Number(id), upd)
    return NextResponse.json({ success: true, data: result })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    // Chỉ chủ cửa hàng mới được xóa
    if (session.vaiTro !== 'Chủ cửa hàng')
      return NextResponse.json({ message: 'Chỉ chủ cửa hàng mới được xóa khách hàng' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id   = searchParams.get('id')
    const maKH = searchParams.get('maKH')
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })

    // Kiểm tra lần cuối trước khi xóa
    if (maKH) {
      const donHang = await getRecords(TABLES.DON_HANG, {
        where: `(Mã KH,eq,${maKH})`, limit: 1, fields: 'Id'
      })
      if ((donHang.list || []).length > 0)
        return NextResponse.json({
          message: 'Không thể xóa — khách hàng đã có đơn hàng. Dữ liệu lịch sử cần được giữ lại.'
        }, { status: 400 })
    }

    const ok = await deleteRecord(TABLES.KHACH_HANG, Number(id))
    if (!ok) return NextResponse.json({ message: 'Lỗi xóa' }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
