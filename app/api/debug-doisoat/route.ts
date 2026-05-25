// app/api/debug-doisoat/route.ts — XÓA SAU KHI DEBUG
import { NextResponse } from 'next/server'
import { getRecords, TABLES } from '@/lib/nocodb'

export async function GET() {
  const result = await getRecords(TABLES.DOI_SOAT, { limit: 2 })
  const row0 = result.list?.[0] || {}
  return NextResponse.json({
    keys: Object.keys(row0),
    row0,
    total: result.list?.length || 0,
  })
}
