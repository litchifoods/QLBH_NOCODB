// app/dashboard/khach-hang/page.tsx — v3.0
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
      // Lấy đủ fields để thu nợ và hoàn cọc
    }),
  ])

  const danhSach = (khResult.list || []).filter(
    (kh: any) => kh['Tên khách hàng']?.toString().trim()
  )

  const congNoMap:     Record<string, number>                              = {}
  const donHuyCanHoan: Record<string, {tienHoan:number; tinhTrang:string}> = {}
  const donHangTheoKH: Record<string, any[]>                               = {}

  for (const don of (donHangResult.list || [])) {
    const maKH = don['Mã KH']
    if (!maKH) continue

    // Gom đơn theo KH (chỉ đơn còn nợ)
    const conLai = Number(don['Còn phải thu'] || 0)
    const tt     = don['Trạng thái'] || ''
    if (tt !== 'Huỷ' && tt !== 'Hoàn thành' && conLai > 0) {
      if (!donHangTheoKH[maKH]) donHangTheoKH[maKH] = []
      donHangTheoKH[maKH].push(don)
      congNoMap[maKH] = (congNoMap[maKH] || 0) + conLai
    }

    // Hoàn cọc
    const tienHoan  = Number(don['Tiền hoàn cọc'] || 0)
    const tinhTrang = don['Tình trạng hoàn cọc'] || ''
    if (tienHoan > 0) {
      if (!donHuyCanHoan[maKH] || tinhTrang === 'Chờ hoàn') {
        donHuyCanHoan[maKH] = { tienHoan, tinhTrang }
      }
      // Thêm đơn hủy vào donHangTheoKH để popup hoàn cọc dùng
      if (!donHangTheoKH[maKH]) donHangTheoKH[maKH] = []
      if (!donHangTheoKH[maKH].find((d:any) => d['Mã đơn hàng'] === don['Mã đơn hàng'])) {
        donHangTheoKH[maKH].push(don)
      }
    }
  }

  return (
    <KhachHangClient
      khachHang={danhSach}
      donHuyCanHoan={donHuyCanHoan}
      congNoMap={congNoMap}
      donHangTheoKH={donHangTheoKH}
      user={session!}
    />
  )
}
