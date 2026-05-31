// app/api/san-pham/cap-nhat-ton/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

// PATCH /api/san-pham/cap-nhat-ton — cộng/trừ tồn kho theo delta
export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({message:'Chưa đăng nhập'},{status:401})
    const { maSP, delta } = await req.json()
    if (!maSP) return NextResponse.json({message:'Thiếu mã SP'},{status:400})
    const r = await getRecords(TABLES.SAN_PHAM, {
      where:`(Mã SP,eq,${maSP})`, limit:1, fields:'Id,Tồn kho'
    })
    const sp = r.list?.[0]
    if (!sp) return NextResponse.json({message:'Không tìm thấy SP'},{status:404})
    const tonMoi = Math.max(0, Number(sp['Tồn kho']||0) + Number(delta||0))
    await updateRecord(TABLES.SAN_PHAM, Number(sp['Id']||sp['id']), {'Tồn kho': tonMoi})
    return NextResponse.json({ success:true, tonKho:tonMoi })
  } catch(e:any) { return NextResponse.json({message:e.message},{status:500}) }
}
