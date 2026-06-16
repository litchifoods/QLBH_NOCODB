// app/api/cai-dat/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const data = await getRecords(TABLES.CAI_DAT, { limit: 1 })
    const record = data.list?.[0] || null
    if (!record) return NextResponse.json({ ok: false, data: null })
    return NextResponse.json({ ok: true, data: record, id: record['Id']||record['id'] })
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    if (session.vaiTro !== 'Chủ cửa hàng') return NextResponse.json({ message: 'Chỉ chủ cửa hàng' }, { status: 403 })
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })
    const result = await updateRecord(TABLES.CAI_DAT, Number(id), data)
    return NextResponse.json({ success: true, data: result })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}