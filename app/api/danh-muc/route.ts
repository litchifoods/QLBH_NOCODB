// app/api/danh-muc/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, deleteRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const r = await getRecords(TABLES.DANH_MUC, {
      limit: 200, sort: 'Thứ tự',
      fields: 'Id,Tên danh mục,Thứ tự'
    })
    return NextResponse.json(r)
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()
    if (!body.tenDanhMuc?.trim()) return NextResponse.json({ message: 'Thiếu tên danh mục' }, { status: 400 })
    // Lấy thứ tự tiếp theo
    const r = await getRecords(TABLES.DANH_MUC, { limit: 200, sort: '-Thứ tự', fields: 'Thứ tự' })
    const maxThuTu = r.list?.reduce((m: number, d: any) => Math.max(m, Number(d['Thứ tự'] || 0)), 0) || 0
    const rec = await createRecord(TABLES.DANH_MUC, {
      'Tên danh mục': body.tenDanhMuc.trim(),
      'Thứ tự': maxThuTu + 1,
    })
    return NextResponse.json({ success: true, data: rec })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const { id, ...data } = await req.json()
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })
    const r = await updateRecord(TABLES.DANH_MUC, Number(id), data)
    return NextResponse.json({ success: true, data: r })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ message: 'Thiếu id' }, { status: 400 })
    await deleteRecord(TABLES.DANH_MUC, Number(id))
    return NextResponse.json({ success: true })
  } catch (e: any) { return NextResponse.json({ message: e.message }, { status: 500 }) }
}
