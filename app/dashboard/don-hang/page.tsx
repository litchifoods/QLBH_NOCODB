// app/dashboard/don-hang/page.tsx -- v2.1
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DonHangClient from '@/components/DonHangClient'

export default async function DonHangPage({
  searchParams,
}: {
  searchParams: { trang_thai?: string; kenh?: string; q?: string }
}) {
  const session = await getSession()

  // Load đơn hàng và khách hàng song song
  const [donHangResult, khachHangResult] = await Promise.all([
    getRecords(TABLES.DON_HANG, {
      limit: 200,
      sort: '-Ngày bán',
    }),
    // Load đầy đủ thông tin KH — bao gồm cả Địa chỉ để hiển thị trong cột địa chỉ
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  const donHang = donHangResult.list || []

  // Map Mã KH → object KH đầy đủ (tên + SĐT + địa chỉ)
  // Web dùng map này để:
  // 1. Hiển thị tên KH đúng thay vì mã KH
  // 2. Lấy địa chỉ của KH để hiển thị cột Địa chỉ
  const khachHangMap: Record<string, any> = {}
  for (const kh of (khachHangResult.list || [])) {
    if (kh['Mã KH']) {
      khachHangMap[kh['Mã KH']] = kh
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
