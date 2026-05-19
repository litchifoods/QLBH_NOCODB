// app/dashboard/doi-soat/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DoiSoatClient from '@/components/DoiSoatClient'

export default async function DoiSoatPage({
  searchParams
}: { searchParams: { maDon?: string } }) {
  const session = await getSession()

  const [giaoHang, donHang, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 200, sort: '-Ngày giao' }),
    getRecords(TABLES.DON_HANG, {
      limit: 200, sort: '-Mã đơn hàng',
      fields: 'Mã đơn hàng,Mã KH,Tên khách hàng,Tổng tiền đơn,Còn phải thu,Trạng thái,Địa chỉ giao',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500, fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  const khachHangMap: Record<string,{ten:string;sdt:string;diaChi:string}> = {}
  for (const kh of (khachHang.list||[])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = { ten:kh['Tên khách hàng']||'', sdt:kh['Số điện thoại']||'', diaChi:kh['Địa chỉ']||'' }
  }

  const donMap: Record<string,any> = {}
  for (const d of (donHang.list||[])) {
    if (d['Mã đơn hàng']) donMap[d['Mã đơn hàng']] = d
  }

  return (
    <DoiSoatClient
      giaoHang={giaoHang.list||[]}
      donMap={donMap}
      khachHangMap={khachHangMap}
      maDonFilter={searchParams.maDon}
      user={session!}
    />
  )
}
