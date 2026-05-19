// app/api/import/san-pham/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })

    const { rows } = await request.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ message: 'Không có dữ liệu' }, { status: 400 })
    }

    let ok = 0, fail = 0
    for (const row of rows) {
      if (!row['Tên sản phẩm']?.trim()) { fail++; continue }
      const result = await createRecord(TABLES.SAN_PHAM, {
        'Mã SP':            row['Mã SP']?.trim() || '',
        'Tên sản phẩm':     row['Tên sản phẩm']?.trim(),
        'Đơn vị tính':      row['Đơn vị tính'] || 'Cái',
        'Loại SP':          row['Loại SP'] || 'Phổ thông',
        'Giá nhập':         Number(row['Giá nhập']) || 0,
        'Giá bán lẻ':       Number(row['Giá bán lẻ']) || 0,
        'Giá bán buôn':     Number(row['Giá bán buôn']) || 0,
        'Tồn kho':          Number(row['Tồn kho']) || 0,
        'Ngưỡng cảnh báo':  Number(row['Ngưỡng cảnh báo']) || 3,
        'Mô tả':            row['Mô tả']?.trim() || '',
      })
      result ? ok++ : fail++
    }

    return NextResponse.json({ success: true, ok, fail, total: rows.length })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
