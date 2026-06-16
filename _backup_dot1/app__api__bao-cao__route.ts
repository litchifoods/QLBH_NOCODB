import { NextRequest, NextResponse } from 'next/server'
import { createRecord, getRecords, updateRecord, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ message: 'Chưa đăng nhập' }, { status: 401 })
    const body = await req.json()
    const { thang, nam, quy, tongDT, dtTrucTiep, dtOnline, daThu, khConNo,
            tongDon, donHoanThanh, donHuy, tongChi, luongNV, cpGiao,
            ttNCC, cpVH, loiNhuan, ghiChu } = body

    // Kiểm tra đã có báo cáo tháng này chưa
    const existing = await getRecords(TABLES.BAO_CAO, {
      where: `(Tháng,eq,${thang})`, limit: 1
    })

    const data = {
      'Tháng':           thang,
      'Năm':             Number(nam),
      'Qúy':             Number(quy),
      'Tổng doanh thu':  tongDT,
      'DT trực tiếp':    dtTrucTiep,
      'DT online':       dtOnline,
      'Đã thu được':     daThu,
      'Khách còn nợ':    khConNo,
      'Tổng đơn hàng':   tongDon,
      'Đơn hoàn thành':  donHoanThanh,
      'Đơn hủy':         donHuy,
      'Tổng chi phí':    tongChi,
      'Lương thưởng NV': luongNV,
      'CP chuyến giao':  cpGiao,
      'Đã trả NCC tháng này': ttNCC,
      'Thuê mặt bằng':   cpVH,
      'Lợi nhuận gộp':   loiNhuan,
      'Ghi chú/nhận xét': ghiChu||'',
    }

    if (existing.list?.length>0) {
      const rowId = existing.list[0]['Id']||existing.list[0]['id']
      await updateRecord(TABLES.BAO_CAO, Number(rowId), data)
    } else {
      await createRecord(TABLES.BAO_CAO, data)
    }
    revalidatePath('/dashboard/bao-cao')
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ message: e.message }, { status: 500 })
  }
}
