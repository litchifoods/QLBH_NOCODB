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

  const [giaoHang, doiSoat, donHang, chiTietDon, khachHang, chiTietGiao] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Id' }),
    getRecords(TABLES.DOI_SOAT,  { limit: 1000, sort: '-Id' }),
    getRecords(TABLES.DON_HANG,  { limit: 500, sort: '-Id' }),
    getRecords(TABLES.CHI_TIET_DON, {
      limit: 500, sort: 'Id',
      fields: 'Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Ghi chú SP,Trạng thái SP',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
    getRecords(TABLES.CHI_TIET_GIAO, { limit: 1000 }),
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
    const maGH = ds['Mã giao hàng']
    // sort -Id nên bản đầu tiên = mới nhất, không ghi đè
    if (maGH && !doiSoatMap[maGH]) doiSoatMap[maGH] = ds
  }

  // Map SP giao theo Mã giao hàng (bảng 8)
  const chiTietGiaoMap: Record<string, any[]> = {}
  for (const ct of (chiTietGiao.list || [])) {
    const maGH = ct['Mã giao hàng']
    if (!maGH) continue
    if (!chiTietGiaoMap[maGH]) chiTietGiaoMap[maGH] = []
    chiTietGiaoMap[maGH].push(ct)
  }

  // Map chi tiết đơn — lọc SP đã hủy
  const chiTietDonMapClean: Record<string, any[]> = {}
  for (const ct of (chiTietDon.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (!maDon) continue
    if (!chiTietDonMapClean[maDon]) chiTietDonMapClean[maDon] = []
    if (ct['Trạng thái SP'] !== 'Huỷ') chiTietDonMapClean[maDon].push(ct)
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
      chiTietDonMap={chiTietDonMapClean}
      chiTietGiaoMap={chiTietGiaoMap}
      filterParam={searchParams.maGH}
      user={session!}
    />
  )
}
