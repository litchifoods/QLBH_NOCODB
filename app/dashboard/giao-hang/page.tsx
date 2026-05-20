// app/dashboard/giao-hang/page.tsx -- v2.1
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, donHang, nhanVien, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit:300, sort:'-Ngày giao' }),
    getRecords(TABLES.DON_HANG, {
      limit:200, sort:'-Mã đơn hàng',
      fields:'Mã đơn hàng,Mã KH,Tên khách hàng,Trạng thái,Ngày hẹn giao,Tổng tiền đơn,Còn phải thu,Địa chỉ giao',
    }),
    getRecords(TABLES.NHAN_VIEN, {
      limit:100, fields:'Mã NV,Họ tên,Vai trò,Số điện thoại',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit:500, fields:'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  const khachHangMap: Record<string,any> = {}
  for (const kh of (khachHang.list||[])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }

  const donHangMap: Record<string,any> = {}
  for (const d of (donHang.list||[])) {
    if (d['Mã đơn hàng']) donHangMap[d['Mã đơn hàng']] = d
  }

  const donChuaGiao = (donHang.list||[]).filter((d:any) =>
    d['Mã đơn hàng']?.trim() &&
    d['Trạng thái'] !== 'Hoàn thành' &&
    d['Trạng thái'] !== 'Huỷ'
  )

  return (
    <GiaoHangClient
      giaoHangList={giaoHang.list||[]}
      donChuaGiao={donChuaGiao}
      donHangMap={donHangMap}
      nhanVien={nhanVien.list||[]}
      khachHangMap={khachHangMap}
      user={session!}
    />
  )
}
