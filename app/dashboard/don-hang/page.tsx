// app/dashboard/don-hang/page.tsx — v2.2
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DonHangClient from '@/components/DonHangClient'

export default async function DonHangPage({
  searchParams,
}: {
  searchParams: { trang_thai?: string; kenh?: string; q?: string }
}) {
  const session = await getSession()

  const [donHangResult, khachHangResult] = await Promise.all([
    getRecords(TABLES.DON_HANG, {
      limit: 200,
      sort: '-Id',   // ✅ Id lớn nhất = đơn mới nhất lên đầu
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  const donHang = donHangResult.list || []

  const khachHangMap: Record<string, any> = {}
  for (const kh of (khachHangResult.list || [])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }

  return (
    <DonHangClient
      donHang={donHang}
      khachHangMap={khachHangMap}
      user={session!}
      searchParams={searchParams}
    />
  )
}
