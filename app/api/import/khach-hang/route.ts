// app/api/import/khach-hang/route.ts
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
      if (!row['Tên khách hàng']?.trim()) { fail++; continue }
      const result = await createRecord(TABLES.KHACH_HANG, {
        'Mã KH':                row['Mã KH']?.trim() || '',
        'Tên khách hàng':       row['Tên khách hàng']?.trim(),
        'Số điện thoại':        row['Số điện thoại']?.trim() || '',
        'Địa chỉ':              row['Địa chỉ']?.trim() || '',
        'Đối tượng khách hàng': row['Đối tượng khách hàng'] || 'Cá nhân',
        'Ghi chú':              row['Ghi chú']?.trim() || '',
        'Ngày tạo':             new Date().toISOString().split('T')[0],
      })
      result ? ok++ : fail++
    }

    return NextResponse.json({ success: true, ok, fail, total: rows.length })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
