// app/api/san-pham/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

// Tạo mã SP tiếp theo
async function taoMaSPMoi(): Promise<string> {
  const nam = new Date().getFullYear()
  try {
    const result = await getRecords(TABLES.SAN_PHAM, { limit:1, sort:'-Id', fields:'Mã SP' })
    const spCuoi = result.list?.[0]
    if (spCuoi?.['Mã SP']) {
      const ma = spCuoi['Mã SP'] as string
      const parts = ma.split('-')
      const so = parseInt(parts[parts.length-1]||'0')
      if (!isNaN(so)) return `SP-${String(so+1).padStart(3,'0')}`
    }
    return 'SP-001'
  } catch { return `SP-${Date.now().toString().slice(-4)}` }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message:'Chưa đăng nhập'},{status:401})
    const { searchParams } = new URL(request.url)
    const limit = Number(searchParams.get('limit')||500)
    const result = await getRecords(TABLES.SAN_PHAM, { limit, sort:'-Id' })
    return NextResponse.json(result)
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await request.json()
    const maSP = body['Mã SP']?.trim() || await taoMaSPMoi()
    const result = await createRecord(TABLES.SAN_PHAM, { ...body, 'Mã SP': maSP })
    if (!result) return NextResponse.json({message:'Lỗi tạo sản phẩm'},{status:500})
    return NextResponse.json({ success:true, data:result })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await request.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})
    const result = await updateRecord(TABLES.SAN_PHAM, id, data)
    return NextResponse.json({ success:true, data:result })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({message:'Thiếu id'},{status:400})
    await deleteRecord(TABLES.SAN_PHAM, Number(id))
    return NextResponse.json({ success:true })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}
