// app/api/dat-hang-ncc/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaDH(): Promise<string> {
  try {
    const r = await getRecords(TABLES.DAT_HANG_NCC, { limit:100, sort:'-Id', fields:'Mã đặt hàng' })
    const list = r.list || []
    // Lấy tất cả mã gốc (bỏ suffix -1,-2,...), tìm số lớn nhất
    let maxSo = 0
    for (const item of list) {
      const ma = (item['Mã đặt hàng'] as string || '').replace(/-\d+$/, '')
      // Format: DH-NCC-XXX
      const parts = ma.split('-')
      const so = parseInt(parts[parts.length-1] || '0')
      if (!isNaN(so) && so > maxSo) maxSo = so
    }
    return `DH-NCC-${String(maxSo + 1).padStart(3,'0')}`
  } catch { 
    return `DH-NCC-${Date.now().toString().slice(-5)}` 
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
  const { searchParams } = new URL(req.url)
  const maNCC = searchParams.get('maNCC')
  const where = maNCC ? `(Mã NCC,eq,${maNCC})` : undefined
  const r = await getRecords(TABLES.DAT_HANG_NCC, { limit:500, sort:'-Id', where })
  return NextResponse.json(r)
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    // Hỗ trợ tạo nhiều SP cùng lúc (mảng items)
    const items = body.items as any[]
    if (!items?.length) return NextResponse.json({message:'Thiếu sản phẩm'},{status:400})
    const maDH = body.forceMaDH || await taoMaDH()
    const ngayDat = body.ngayDat || new Date().toISOString().split('T')[0]
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      await createRecord(TABLES.DAT_HANG_NCC, {
        'Mã đặt hàng': items.length > 1 ? `${maDH}-${i+1}` : maDH,
        'Ngày đặt': ngayDat,
        'Mã NCC': body.maNCC,
        'Mã SP': item.maSP,
        'Số lượng đặt': Number(item.soLuong||0),
        'Giá nhập dự kiến': Number(item.giaNhap||0),
        'Ngày dự kiến về': item.ngayVe||null,
        'Trạng thái': 'Chờ xác nhận',
        'Ghi chú': item.ghiChu||body.ghiChu||'',
      })
    }
    return NextResponse.json({ success:true, maDH, soSP:items.length })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { id, ...data } = await req.json()
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})
    const r = await updateRecord(TABLES.DAT_HANG_NCC, id, data)
    return NextResponse.json({ success:true, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})
    await deleteRecord(TABLES.DAT_HANG_NCC, Number(id))
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}
