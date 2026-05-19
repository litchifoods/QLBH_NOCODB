// app/dashboard/giao-hang/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, donHang, nhanVien] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, {
      limit: 200,
      sort: '-Ngày giao',
    }),
    getRecords(TABLES.DON_HANG, {
      limit: 200,
      sort: '-Mã đơn hàng',
      fields: 'Mã đơn hàng,Mã KH,Hình thức giao hàng,Trạng thái,Ngày hẹn giao,Tổng tiền đơn,Còn phải thu,Địa chỉ giao',
    }),
    getRecords(TABLES.NHAN_VIEN, {
      limit: 50,
      fields: 'Mã NV,Họ tên,Vai trò',
    }),
  ])

  // Lấy đơn hàng chưa giao xong (Chờ giao hoặc Đang giao)
  const donChuaGiao = (donHang.list || []).filter((d: any) =>
    d['Mã đơn hàng'] &&
    (d['Trạng thái'] === 'Chờ giao' || d['Trạng thái'] === 'Đang giao' || !d['Trạng thái'])
  )

  return (
    <GiaoHangClient
      giaoHang={giaoHang.list || []}
      donChuaGiao={donChuaGiao}
      nhanVien={nhanVien.list || []}
      user={session!}
    />
  )
}
