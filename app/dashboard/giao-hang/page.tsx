// app/dashboard/giao-hang/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, donHang, nhanVien, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 200, sort: '-Ngày giao' }),
    getRecords(TABLES.DON_HANG, {
      limit: 200,
      sort: '-Mã đơn hàng',
      fields: 'Mã đơn hàng,Mã KH,Tên khách hàng,Hình thức giao hàng,Trạng thái,Ngày hẹn giao,Tổng tiền đơn,Còn phải thu,Địa chỉ giao',
    }),
    getRecords(TABLES.NHAN_VIEN, {
      limit: 50,
      fields: 'Mã NV,Họ tên,Vai trò',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  // Map Mã KH → thông tin KH
  const khachHangMap: Record<string, { ten: string; sdt: string; diaChi: string }> = {}
  for (const kh of (khachHang.list || [])) {
    if (kh['Mã KH']) {
      khachHangMap[kh['Mã KH']] = {
        ten:     kh['Tên khách hàng'] || '',
        sdt:     kh['Số điện thoại'] || '',
        diaChi:  kh['Địa chỉ'] || '',
      }
    }
  }

  // Đơn hàng chưa giao xong
  const donChuaGiao = (donHang.list || []).filter((d: any) =>
    d['Mã đơn hàng']?.trim() &&
    d['Trạng thái'] !== 'Hoàn thành' &&
    d['Trạng thái'] !== 'Huỷ'
  )

  return (
    <GiaoHangClient
      giaoHang={giaoHang.list || []}
      donChuaGiao={donChuaGiao}
      donTatCa={donHang.list || []}
      nhanVien={nhanVien.list || []}
      khachHangMap={khachHangMap}
      user={session!}
    />
  )
}
