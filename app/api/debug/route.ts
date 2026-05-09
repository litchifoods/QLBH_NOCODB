// app/api/debug/route.ts
// XOÁ file này sau khi hệ thống hoạt động ổn định

import { NextResponse } from 'next/server'

const NOCODB_URL     = process.env.NOCODB_URL     || '(chưa đặt)'
const NOCODB_SUBPATH = process.env.NOCODB_SUBPATH || ''
const NOCODB_TOKEN   = process.env.NOCODB_TOKEN   || '(chưa đặt)'
const NOCODB_BASE_ID = process.env.NOCODB_BASE_ID || '(chưa đặt)'
const API_BASE       = `${NOCODB_URL}${NOCODB_SUBPATH}/api/v1`

export async function GET() {
  const results: Record<string, any> = {
    buoc0_cau_hinh: {
      NOCODB_URL,
      NOCODB_SUBPATH: NOCODB_SUBPATH || '(trống)',
      NOCODB_TOKEN:   NOCODB_TOKEN.substring(0, 15) + '...',
      NOCODB_BASE_ID,
      API_BASE,
    }
  }

  // Bước 1: Lấy danh sách tables — dùng /bases/ (NocoDB 2026.x)
  try {
    const url = `${API_BASE}/db/meta/bases/${NOCODB_BASE_ID}/tables`
    const res = await fetch(url, {
      headers: { 'xc-auth': NOCODB_TOKEN, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    })
    const text = await res.text()
    let data: any = null
    try { data = JSON.parse(text) } catch {}

    results.buoc1_lay_tables = {
      url,
      status: res.status,
      ok: res.ok,
      soTable: data?.list?.length ?? 0,
      tenCacTable: data?.list?.map((t: any) => t.title) ?? [],
      loi: res.ok ? null : text.substring(0, 200),
    }
  } catch (e: any) {
    results.buoc1_lay_tables = { loi: e.message }
  }

  // Bước 2: Tìm và đọc bảng Tài khoản
  const tableList = results.buoc1_lay_tables?.tenCacTable || []
  const tkTable   = results.buoc1_lay_tables?.tenCacTable?.find(
    (n: string) => n.includes('Tài khoản') || n.includes('Tai khoan') || n.includes('16')
  )

  if (!tkTable) {
    results.buoc2_doc_tai_khoan = {
      loi: 'Không tìm thấy bảng Tài khoản trong danh sách',
      tatCaBang: tableList,
      goi_y: 'Kiểm tra tên bảng trong NocoDB có đúng "16_Tài khoản" không',
    }
  } else {
    try {
      // Lấy table ID
      const urlTables = `${API_BASE}/db/meta/bases/${NOCODB_BASE_ID}/tables`
      const rTables   = await fetch(urlTables, { headers: { 'xc-auth': NOCODB_TOKEN } })
      const dataTables = await rTables.json()
      const found = dataTables?.list?.find((t: any) => t.title === tkTable)

      if (!found) {
        results.buoc2_doc_tai_khoan = { loi: 'Không lấy được ID bảng' }
      } else {
        const urlData = `${API_BASE}/db/data/noco/${NOCODB_BASE_ID}/${found.id}?limit=10`
        const rData   = await fetch(urlData, { headers: { 'xc-auth': NOCODB_TOKEN } })
        const data    = await rData.json()

        results.buoc2_doc_tai_khoan = {
          tableId:   found.id,
          tableName: found.title,
          soRecord:  data?.list?.length ?? 0,
          records:   data?.list?.map((t: any) => ({
            maTK:        t['Mã tài khoản'],
            tenDangNhap: t['Tên đăng nhập'],
            hoTen:       t['Họ tên'],
            vaiTro:      t['Vai trò'],
            trangThai:   t['Trạng thái'],
            coCotMatKhau: !!t['Mật khẩu'],
          })) ?? [],
        }
      }
    } catch (e: any) {
      results.buoc2_doc_tai_khoan = { loi: e.message }
    }
  }

  // Kết luận
  const b1ok = (results.buoc1_lay_tables?.soTable ?? 0) > 0
  const b2ok = (results.buoc2_doc_tai_khoan?.soRecord ?? 0) > 0

  results.ket_luan = {
    lay_tables:    b1ok ? '✅ OK' : '❌ LỖI',
    doc_tai_khoan: b2ok ? '✅ OK' : '❌ LỖI hoặc bảng trống',
    huong_dan:     !b1ok
      ? '→ Sửa NOCODB_BASE_ID trong .env.local. Lấy từ URL NocoDB sau /w96o40k/'
      : !b2ok
      ? '→ Bảng 16_Tài khoản chưa có dữ liệu hoặc tên bảng sai'
      : '→ Tất cả OK! Thử đăng nhập tại /login với admin/admin',
  }

  return NextResponse.json(results, { status: 200 })
}
