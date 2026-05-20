// app/dashboard/giao-hang/page.tsx -- v3.0
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, chiTietGiao, donHang, chiTietDon, nhanVien, khachHang] = await Promise.all([
    // Bảng 7 - mỗi dòng = 1 người trong 1 chuyến
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Ngày giao' }),
    // Bảng 8 - sản phẩm đã/đang được giao
    getRecords(TABLES.CHI_TIET_GIAO, { limit: 500 }),
    // Bảng 5 - đơn hàng
    getRecords(TABLES.DON_HANG, {
      limit: 200, sort: '-Mã đơn hàng',
      fields: 'Mã đơn hàng,Mã KH,Tên khách hàng,Trạng thái,Tổng tiền đơn,Còn phải thu,Địa chỉ giao,Ngày hẹn giao',
    }),
    // Bảng 6 - chi tiết sản phẩm trong đơn
    getRecords(TABLES.CHI_TIET_DON, {
      limit: 500,
      fields: 'Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP',
    }),
    // Bảng 3 - nhân viên + đối tác
    getRecords(TABLES.NHAN_VIEN, { limit: 100, fields: 'Mã NV,Họ tên,Vai trò' }),
    // Bảng 1 - khách hàng
    getRecords(TABLES.KHACH_HANG, { limit: 500, fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ' }),
  ])

  // Map KH
  const khachHangMap: Record<string, any> = {}
  for (const kh of (khachHang.list || [])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }

  // Map đơn hàng
  const donHangMap: Record<string, any> = {}
  for (const d of (donHang.list || [])) {
    if (d['Mã đơn hàng']) donHangMap[d['Mã đơn hàng']] = d
  }

  // Nhóm chi tiết đơn theo mã đơn
  const chiTietDonMap: Record<string, any[]> = {}
  for (const ct of (chiTietDon.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (maDon) {
      if (!chiTietDonMap[maDon]) chiTietDonMap[maDon] = []
      chiTietDonMap[maDon].push(ct)
    }
  }

  // Nhóm chi tiết giao theo mã đơn — để tính đã giao bao nhiêu mỗi SP
  const daGiaoMap: Record<string, Record<string, number>> = {}
  // daGiaoMap[maDon][maChiTiet] = tổng số lượng đã giao
  for (const ct of (chiTietGiao.list || [])) {
    const maDon = ct['Mã đơn hàng']
    const maCT  = ct['Mã chi tiết đơn'] || ct['Tên SP (ghi nhanh)']
    if (maDon && maCT) {
      if (!daGiaoMap[maDon]) daGiaoMap[maDon] = {}
      daGiaoMap[maDon][maCT] = (daGiaoMap[maDon][maCT] || 0) + Number(ct['Số lượng giao đợt này'] || 0)
    }
  }

  // Nhóm giao hàng theo mã chuyến
  const chuyenMap: Record<string, any[]> = {}
  for (const gh of (giaoHang.list || [])) {
    const maChuyen = gh['Mã chuyến'] || gh['Mã giao hàng']
    if (!chuyenMap[maChuyen]) chuyenMap[maChuyen] = []
    chuyenMap[maChuyen].push(gh)
  }

  // Đơn chưa giao xong (chưa Hoàn thành, chưa Huỷ)
  const donChuaGiao = (donHang.list || []).filter((d: any) =>
    d['Mã đơn hàng']?.trim() &&
    d['Trạng thái'] !== 'Hoàn thành' &&
    d['Trạng thái'] !== 'Huỷ'
  )

  return (
    <GiaoHangClient
      giaoHangList={giaoHang.list || []}
      chuyenMap={chuyenMap}
      chiTietDonMap={chiTietDonMap}
      daGiaoMap={daGiaoMap}
      donChuaGiao={donChuaGiao}
      donHangMap={donHangMap}
      nhanVien={nhanVien.list || []}
      khachHangMap={khachHangMap}
      user={session!}
    />
  )
}
