// app/dashboard/khach-hang/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import KhachHangClient from '@/components/KhachHangClient'

export default async function KhachHangPage() {
  const session = await getSession()

  const result = await getRecords(TABLES.KHACH_HANG, {
    limit: 300,
    sort: 'Tên khách hàng',
    fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng,Ghi chú',
  })

  return (
    <KhachHangClient
      khachHang={result.list || []}
      user={session!}
    />
  )
}
