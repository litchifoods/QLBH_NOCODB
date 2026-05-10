// app/api/debug/route.ts
import { NextResponse } from 'next/server'

const NOCODB_URL   = process.env.NOCODB_URL   || ''
const TOKEN        = process.env.NOCODB_TOKEN || ''
const BASE_ID      = process.env.NOCODB_BASE_ID || ''

async function t(url: string, label: string) {
  try {
    const r = await fetch(url, {
      headers: { 'xc-auth': TOKEN, 'xc-token': TOKEN, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    })
    const text = await r.text()
    let json: any = null
    try { json = JSON.parse(text) } catch {}
    return {
      label, url, status: r.status, ok: r.ok,
      tables: json?.list?.length ?? null,
      tableNames: json?.list?.map((x: any) => x.title) ?? null,
      preview: (json ? JSON.stringify(json) : text).substring(0, 100),
    }
  } catch (e: any) {
    return { label, url, status: 0, ok: false, tables: null, tableNames: null, preview: e.message }
  }
}

export async function GET() {
  const base = NOCODB_URL

  // Thử tất cả endpoint có thể có
  const results = await Promise.all([
    // API v1 cũ
    t(`${base}/api/v1/db/meta/projects/${BASE_ID}/tables`,   'v1/projects'),
    t(`${base}/api/v1/db/meta/bases/${BASE_ID}/tables`,      'v1/bases'),
    // API v1 mới
    t(`${base}/api/v1/meta/bases/${BASE_ID}/tables`,         'v1/meta/bases'),
    t(`${base}/api/v1/tables?baseId=${BASE_ID}`,             'v1/tables?baseId'),
    // API v2
    t(`${base}/api/v2/meta/bases/${BASE_ID}/tables`,         'v2/meta/bases'),
    t(`${base}/api/v2/tables?baseId=${BASE_ID}`,             'v2/tables?baseId'),
    t(`${base}/api/v2/tables`,                               'v2/tables'),
    // Auth check
    t(`${base}/api/v1/auth/user/me`,                         'auth/user/me'),
    t(`${base}/api/v2/auth/user/me`,                         'v2/auth/user/me'),
    // Health
    t(`${base}/api/v1/health`,                               'health'),
    t(`${base}/healthz`,                                     'healthz'),
  ])

  const working = results.filter(r => r.ok && (r.tables ?? 0) > 0)
  const authOk  = results.find(r => r.label === 'auth/user/me' && r.ok)

  return NextResponse.json({
    config: {
      NOCODB_URL,
      BASE_ID,
      TOKEN: TOKEN.substring(0, 15) + '...',
    },
    ket_luan: {
      ket_noi: authOk ? '✅ Token OK' : '❌ Không kết nối được',
      endpoint_OK: working.length > 0
        ? `✅ ${working[0].label} — ${working[0].tables} bảng`
        : '❌ Không endpoint nào hoạt động',
      buoc_tiep: working.length > 0
        ? `Dùng: ${working[0].url}`
        : 'Xem chi tiết bên dưới để tìm lỗi',
    },
    chi_tiet: results,
  }, { status: 200 })
}
