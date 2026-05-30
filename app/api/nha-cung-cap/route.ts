// app/api/nha-cung-cap/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

async function taoMaNCC(): Promise<string> {
  try {
    const r = await getRecords(TABLES.NHA_CUNG_CAP, { limit:500, sort:'-Id', fields:'Mã NCC' })
    let maxSo = 0
    for (const item of (r.list||[])) {
      const ma = item['Mã NCC'] as string||''
      const parts = ma.split('-')
      const so = parseInt(parts[parts.length-1]||'0')
      if (!isNaN(so) && so > maxSo) maxSo = so
    }
    return `NCC-${String(maxSo+1).padStart(3,'0')}`
  } catch { return `NCC-${Date.now().toString().slice(-4)}` }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const r = await getRecords(TABLES.NHA_CUNG_CAP, {
      limit:200, sort:'-Id',
      fields:'Id,Mã NCC,Tên NCC,Số điện thoại,Địa chỉ,Số TK ngân hàng,Ghi chú'
    })
    return NextResponse.json(r)
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const body = await req.json()
    if (!body['Tên NCC']?.trim()) return NextResponse.json({message:'Thiếu tên NCC'},{status:400})
    const maNCC = body['Mã NCC']?.trim() || await taoMaNCC()
    const r = await createRecord(TABLES.NHA_CUNG_CAP, {
      'Mã NCC': maNCC,
      'Tên NCC': body['Tên NCC'].trim(),
      'Số điện thoại': body['Số điện thoại']||'',
      'Địa chỉ': body['Địa chỉ']||'',
      'Số TK ngân hàng': body['Số TK ngân hàng']||'',
      'Ghi chú': body['Ghi chú']||'',
    })
    return NextResponse.json({ success:true, maNCC, data:r })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}
