// app/api/import/don-hang/route.ts
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
      if (!row['Mã đơn hàng']?.trim()) { fail++; continue }
      const result = await createRecord(TABLES.DON_HANG, {
        'Mã đơn hàng':         row['Mã đơn hàng']?.trim(),
        'Ngày bán':            row['Ngày bán'] || row['Ngày đặt'] || '',
        'Ngày đặt':            row['Ngày bán'] || row['Ngày đặt'] || '',
        'Mã KH':               row['Mã KH']?.trim() || '',
        'Tên khách hàng':      row['Tên khách hàng']?.trim() || '',
        'Kênh bán':            row['Kênh bán'] || 'Trực tiếp',
        'Hình thức giao hàng': row['Hình thức giao hàng'] || 'Giao hàng cho khách',
        'Ngày hẹn giao':       row['Ngày hẹn giao'] || null,
        'Địa chỉ giao':        row['Địa chỉ giao']?.trim() || '',
        'Tổng tiền đơn':       Number(row['Tổng tiền đơn']) || 0,
        'Đặt cọc':             Number(row['Đặt cọc']) || 0,
        'Hình thức cọc':       row['Hình thức cọc'] || '',
        'Còn phải thu':        Number(row['Còn phải thu']) || 0,
        'Trạng thái':          row['Trạng thái'] || 'Chờ giao',
        'Nhân viên bán':       row['Nhân viên bán']?.trim() || '',
        'Xuất hóa đơn':        row['Xuất hóa đơn'] || 'Không',
        'Ghi chú':             row['Ghi chú']?.trim() || '',
      })
      result ? ok++ : fail++
    }

    return NextResponse.json({ success: true, ok, fail, total: rows.length })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
