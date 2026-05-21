// app/dashboard/khach-hang/page.tsx
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import KhachHangClient from '@/components/KhachHangClient'

export default async function KhachHangPage() {
  const session = await getSession()

  // Sort -Ngày tạo → KH mới nhất lên đầu
  const result = await getRecords(TABLES.KHACH_HANG, {
    limit: 500,
    sort: '-Ngày tạo',
    fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng,Ghi chú,Ngày tạo',
  })

  // Lọc dòng trống
  const danhSach = (result.list || []).filter(
    (kh: any) => kh['Tên khách hàng']?.toString().trim()
  )

  return (
    <KhachHangClient
      khachHang={danhSach}
      user={session!}
    />
  )
}
