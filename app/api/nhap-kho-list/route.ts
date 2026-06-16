// app/api/nhap-kho-list/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const data = await getRecords(TABLES.NHAP_KHO, {
      limit: 1000,
      sort: '-Id',
      fields: 'Id,Mã phiếu nhập,Ngày nhập,Ngày trả CP VC,CP vận chuyển về kho,Hình thức TT CP VC,Trạng thái CP VC',
    })
    return NextResponse.json({ list: data.list || [] })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
