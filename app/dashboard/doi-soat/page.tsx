// app/dashboard/doi-soat/page.tsx — v2.0
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DoiSoatClient from '@/components/DoiSoatClient'

export default async function DoiSoatPage({
  searchParams,
}: {
  searchParams: { maGH?: string }
}) {
  const session = await getSession()

  const [giaoHang, doiSoat, donHang, chiTietDon, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Id' }),
    getRecords(TABLES.DOI_SOAT,  { limit: 500 }),
    getRecords(TABLES.DON_HANG,  { limit: 500, sort: '-Id' }),
    getRecords(TABLES.CHI_TIET_DON, {
      limit: 500, sort: 'Id',
      fields: 'Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Ghi chú SP',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
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

  // Map chi tiết đơn — lọc null
  const chiTietDonMap: Record<string, any[]> = {}
  for (const ct of (chiTietDon.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (!maDon) continue
    if (!chiTietDonMap[maDon]) chiTietDonMap[maDon] = []
    chiTietDonMap[maDon].push(ct)
  }

  const doiSoatMap: Record<string, any> = {}
  for (const ds of (doiSoat.list || [])) {
    if (ds['Mã giao hàng']) doiSoatMap[ds['Mã giao hàng']] = ds
  }

  // Lọc dòng trống trong bảng giao hàng
  const giaoHangHopLe = (giaoHang.list || []).filter(
    (g: any) => g['Mã giao hàng']?.toString().trim() && g['Mã đơn hàng']?.toString().trim()
  )

  return (
    <DoiSoatClient
      giaoHangList={giaoHangHopLe}
      doiSoatMap={doiSoatMap}
      donHangMap={donHangMap}
      khachHangMap={khachHangMap}
      chiTietDonMap={chiTietDonMap}
      filterParam={searchParams.maGH}
      user={session!}
    />
  )
}
