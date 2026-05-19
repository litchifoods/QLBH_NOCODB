// app/dashboard/doi-soat/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DoiSoatClient from '@/components/DoiSoatClient'

export default async function DoiSoatPage({
  searchParams
}: { searchParams: { maChuyen?: string; maDon?: string } }) {
  const session = await getSession()

  const [giaoHang, doiSoat, donHang, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Ngày giao' }),
    getRecords(TABLES.DOI_SOAT, { limit: 500, sort: '-Mã đối soát' }),
    getRecords(TABLES.DON_HANG, {
      limit: 200,
      fields: 'Mã đơn hàng,Mã KH,Tên khách hàng,Tổng tiền đơn,Còn phải thu,Trạng thái',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500, fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  const khachHangMap: Record<string,any> = {}
  for (const kh of (khachHang.list||[])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }
  const donHangMap: Record<string,any> = {}
  for (const d of (donHang.list||[])) {
    if (d['Mã đơn hàng']) donHangMap[d['Mã đơn hàng']] = d
  }

  // Map đối soát đã có theo mã giao hàng
  const doiSoatMap: Record<string,any> = {}
  for (const ds of (doiSoat.list||[])) {
    if (ds['Mã giao hàng']) doiSoatMap[ds['Mã giao hàng']] = ds
  }

  // Nhóm giao hàng theo mã chuyến
  const chuyenMap: Record<string, any[]> = {}
  for (const gh of (giaoHang.list||[])) {
    const maChuyen = gh['Mã chuyến'] || gh['Mã giao hàng']
    if (!chuyenMap[maChuyen]) chuyenMap[maChuyen] = []
    chuyenMap[maChuyen].push(gh)
  }

  return (
    <DoiSoatClient
      chuyenMap={chuyenMap}
      doiSoatMap={doiSoatMap}
      donHangMap={donHangMap}
      khachHangMap={khachHangMap}
      maChuyen={searchParams.maChuyen}
      user={session!}
    />
  )
}
