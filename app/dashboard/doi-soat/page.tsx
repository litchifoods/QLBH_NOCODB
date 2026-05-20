// app/dashboard/doi-soat/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DoiSoatClient from '@/components/DoiSoatClient'

export default async function DoiSoatPage({
  searchParams
}: { searchParams: { maGH?: string; maDon?: string } }) {
  const session = await getSession()

  const [giaoHang, doiSoatList, donHang, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Ngày giao' }),
    getRecords(TABLES.DOI_SOAT,  { limit: 500 }),
    getRecords(TABLES.DON_HANG, {
      limit: 200,
      fields: 'Mã đơn hàng,Mã KH,Tên khách hàng,Tổng tiền đơn,Còn phải thu,Trạng thái,Địa chỉ giao',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500, fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  const khachHangMap: Record<string, any> = {}
  for (const kh of (khachHang.list || [])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }

  const donHangMap: Record<string, any> = {}
  for (const d of (donHang.list || [])) {
    if (d['Mã đơn hàng']) donHangMap[d['Mã đơn hàng']] = d
  }

  // Map đối soát đã có
  const doiSoatMap: Record<string, any> = {}
  for (const ds of (doiSoatList.list || [])) {
    if (ds['Mã giao hàng']) doiSoatMap[ds['Mã giao hàng']] = ds
  }

  // Lọc theo params
  const giaoHangLoc = (giaoHang.list || []).filter((g: any) => {
    if (!g['Mã đơn hàng']?.trim()) return false
    if (searchParams.maGH) return g['Mã giao hàng'] === searchParams.maGH
    if (searchParams.maDon) return g['Mã đơn hàng'] === searchParams.maDon
    return true
  })

  return (
    <DoiSoatClient
      giaoHangList={giaoHangLoc}
      doiSoatMap={doiSoatMap}
      donHangMap={donHangMap}
      khachHangMap={khachHangMap}
      filterParam={searchParams.maGH || searchParams.maDon}
      user={session!}
    />
  )
}
