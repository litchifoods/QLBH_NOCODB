// app/dashboard/khach-hang/page.tsx
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import KhachHangClient from '@/components/KhachHangClient'

export default async function KhachHangPage() {
  const session = await getSession()

  const [khResult, donHuyResult] = await Promise.all([
    getRecords(TABLES.KHACH_HANG, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng,Ghi chú,Ngày tạo',
    }),
    // Load đơn hủy có tiền hoàn cọc
    getRecords(TABLES.DON_HANG, {
      limit: 500, sort: '-Id',
      fields: 'Mã KH,Trạng thái,Tiền hoàn cọc,Tình trạng hoàn cọc',
    }),
  ])

  const danhSach = (khResult.list || []).filter(
    (kh: any) => kh['Tên khách hàng']?.toString().trim()
  )

  // Build map maKH → thông tin hoàn cọc (lấy đơn hủy cần hoàn gần nhất)
  const donHuyCanHoan: Record<string, {tienHoan: number, tinhTrang: string}> = {}
  for (const don of (donHuyResult.list || [])) {
    const maKH      = don['Mã KH']
    const tienHoan  = Number(don['Tiền hoàn cọc'] || 0)
    const tinhTrang = don['Tình trạng hoàn cọc'] || ''
    if (!maKH || !tienHoan) continue
    // Ưu tiên đơn "Chờ hoàn" hơn "Đã hoàn"
    if (!donHuyCanHoan[maKH] || tinhTrang === 'Chờ hoàn') {
      donHuyCanHoan[maKH] = { tienHoan, tinhTrang }
    }
  }

  return (
    <KhachHangClient
      khachHang={danhSach}
      donHuyCanHoan={donHuyCanHoan}
      user={session!}
    />
  )
}
