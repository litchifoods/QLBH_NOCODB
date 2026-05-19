// app/dashboard/don-hang/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DonHangClient from '@/components/DonHangClient'

export default async function DonHangPage({
  searchParams
}: {
  searchParams: { trang_thai?: string; kenh?: string; q?: string }
}) {
  const session = await getSession()

  // Lấy đơn hàng và khách hàng song song
  const [donHangResult, khachHangResult] = await Promise.all([
    getRecords(TABLES.DON_HANG, {
      limit: 200,
      sort: '-Ngày bán',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng',
    }),
  ])

  const donHang = donHangResult.list || []

  // Tạo map Mã KH → Tên khách hàng để tra cứu nhanh
  const khachHangMap: Record<string, string> = {}
  for (const kh of (khachHangResult.list || [])) {
    if (kh['Mã KH'] && kh['Tên khách hàng']) {
      khachHangMap[kh['Mã KH']] = kh['Tên khách hàng']
    }
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
