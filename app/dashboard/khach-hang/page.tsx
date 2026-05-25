// app/dashboard/khach-hang/page.tsx — v2.0
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import KhachHangClient from '@/components/KhachHangClient'

export default async function KhachHangPage() {
  const session = await getSession()

  const [khResult, donHangResult] = await Promise.all([
    getRecords(TABLES.KHACH_HANG, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng,Ghi chú,Ngày tạo',
    }),
    getRecords(TABLES.DON_HANG, {
      limit: 500, sort: '-Id',
      fields: 'Mã KH,Trạng thái,Còn phải thu,Tiền hoàn cọc,Tình trạng hoàn cọc',
    }),
  ])

  const danhSach = (khResult.list || []).filter(
    (kh: any) => kh['Tên khách hàng']?.toString().trim()
  )

  // Build map công nợ: maKH → tổng "Còn phải thu" từ các đơn chưa hoàn thành
  const congNoMap: Record<string, number> = {}
  // Build map hoàn cọc: maKH → đơn hủy cần hoàn gần nhất
  const donHuyCanHoan: Record<string, {tienHoan: number; tinhTrang: string}> = {}

  for (const don of (donHangResult.list || [])) {
    const maKH = don['Mã KH']
    if (!maKH) continue

    // Tính công nợ — đơn chưa hoàn thành và chưa hủy còn tiền phải thu
    const tt       = don['Trạng thái'] || ''
    const conLai   = Number(don['Còn phải thu'] || 0)
    if (tt !== 'Huỷ' && tt !== 'Hoàn thành' && conLai > 0) {
      congNoMap[maKH] = (congNoMap[maKH] || 0) + conLai
    }

    // Tính hoàn cọc — đơn hủy có tiền cần hoàn
    const tienHoan  = Number(don['Tiền hoàn cọc'] || 0)
    const tinhTrang = don['Tình trạng hoàn cọc'] || ''
    if (tienHoan > 0) {
      // Ưu tiên "Chờ hoàn" — hiện trước "Đã hoàn"
      if (!donHuyCanHoan[maKH] || tinhTrang === 'Chờ hoàn') {
        donHuyCanHoan[maKH] = { tienHoan, tinhTrang }
      }
    }
  }

  return (
    <KhachHangClient
      khachHang={danhSach}
      donHuyCanHoan={donHuyCanHoan}
      congNoMap={congNoMap}
      user={session!}
    />
  )
}
