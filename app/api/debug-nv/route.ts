// app/api/debug-nv/route.ts — XÓA SAU KHI DEBUG XONG
import { NextResponse } from 'next/server'
import { getRecords, TABLES } from '@/lib/nocodb'

export async function GET() {
  const result = await getRecords(TABLES.NHAN_VIEN, { limit: 3 })
  const row0 = result.list?.[0] || {}
  return NextResponse.json({
    keys: Object.keys(row0),
    row0: row0,
    total: result.list?.length || 0,
  })
}
