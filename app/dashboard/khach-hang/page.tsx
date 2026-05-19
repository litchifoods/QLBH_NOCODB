// app/dashboard/khach-hang/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import KhachHangClient from '@/components/KhachHangClient'

export default async function KhachHangPage() {
  const session = await getSession()

  const result = await getRecords(TABLES.KHACH_HANG, {
    limit: 200,
    sort: 'Tên khách hàng',
    fields: 'Id,Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng,Ghi chú,Ngày tạo',
  })

  return (
    <KhachHangClient
      danhSachKH={result.list || []}
      tongSo={result.pageInfo?.totalRows || result.list?.length || 0}
      user={session!}
    />
  )
}
