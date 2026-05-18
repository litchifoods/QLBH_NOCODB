// app/dashboard/don-hang/page.tsx
// Trang danh sách đơn hàng
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DonHangClient from '@/components/DonHangClient'

export default async function DonHangPage({
  searchParams
}: {
  searchParams: { trang_thai?: string; kenh?: string; q?: string }
}) {
  const session = await getSession()
  const result  = await getRecords(TABLES.DON_HANG, {
    limit: 100,
    sort: '-Ngày bán',
  })
  const donHang = result.list || []

  return (
    <DonHangClient
      donHang={donHang}
      user={session!}
      searchParams={searchParams}
    />
  )
}
