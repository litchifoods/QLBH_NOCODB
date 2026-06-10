import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const limit = Number(searchParams.get('limit') || 500)
    const data = await getRecords(TABLES.CHI_PHI, { limit, sort: '-Ngày phát sinh' })
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()

    // Tự sinh mã chi phí
    const existing = await getRecords(TABLES.CHI_PHI, { limit: 1, sort: '-Id', fields: 'Mã chi phí' })
    const lastMa = existing.list?.[0]?.['Mã chi phí'] || 'CP-2026-000'
    const lastNum = parseInt(lastMa.split('-').pop() || '0')
    const newNum = String(lastNum + 1).padStart(3, '0')
    const year = new Date().getFullYear()
    const maCPMoi = `CP-${year}-${newNum}`

    const record = await createRecord(TABLES.CHI_PHI, {
      'Mã chi phí':            maCPMoi,
      'Ngày phát sinh':        body.ngayPhatSinh,
      'Loại chi phí':          body.loaiChiPhi,
      'Nội dung':              body.noiDung || '',
      'Số tiền':               Number(body.soTien || 0),
      'Hình thức thanh toán':  body.hinhThuc || 'Tiền mặt',
      'Người chi':             body.nguoiChi || '',
      'Trạng thái':            body.trangThai || 'Đã thanh toán',
      'Ghi chú':               body.ghiChu || '',
      'Loại giao dịch':        body.loaiGiaoDich || 'Chi',
      'Loại thu':              body.loaiThu || '',
      'Mã đơn hàng':           body.maDonHang || '',
    })
    revalidatePath('/dashboard/chi-phi')
    return NextResponse.json({ success: true, data: record })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()
    const { id, ...data } = body
    const record = await updateRecord(TABLES.CHI_PHI, Number(id), data)
    revalidatePath('/dashboard/chi-phi')
    return NextResponse.json({ success: true, data: record })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    if (session.vaiTro !== 'Chủ cửa hàng') return NextResponse.json({ message: 'Chỉ chủ cửa hàng mới được xóa chi phí' }, { status: 403 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })
    await deleteRecord(TABLES.CHI_PHI, Number(id))
    revalidatePath('/dashboard/chi-phi')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}


