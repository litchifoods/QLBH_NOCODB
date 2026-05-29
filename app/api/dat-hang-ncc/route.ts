// app/api/dat-hang-ncc/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaDH(): Promise<string> {
  try {
    const nam = new Date().getFullYear().toString().slice(-2)
    const r = await getRecords(TABLES.DAT_HANG_NCC, { limit:1, sort:'-Id', fields:'Mã đặt hàng' })
    const cuoi = r.list?.[0]?.['Mã đặt hàng'] as string||''
    // Lấy số cuối từ format DH-NCC-XXX
    const parts = cuoi.split('-')
    const so = parseInt(parts[parts.length-1]||'0')
    const soMoi = (isNaN(so)?0:so)+1
    return `DH-NCC-${String(soMoi).padStart(3,'0')}`
  } catch { 
    // Fallback dùng timestamp tránh trùng
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
    const maDH = await taoMaDH()
    const ngayDat = body.ngayDat || new Date().toISOString().split('T')[0]
    const results = []
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      const r = await createRecord(TABLES.DAT_HANG_NCC, {
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
      results.push(r)
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
