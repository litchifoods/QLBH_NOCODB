// app/dashboard/giao-hang/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, chiTietGiao, donHang, nhanVien, khachHang, sanPham] = await Promise.all([
    // Bảng 7 - mỗi dòng = 1 người trong 1 chuyến
    getRecords(TABLES.GIAO_HANG, {
      limit: 500,
      sort: '-Ngày giao',
    }),
    // Bảng 8 - sản phẩm từng chuyến
    getRecords(TABLES.CHI_TIET_GIAO, {
      limit: 500,
    }),
    // Đơn hàng chưa giao xong + chi tiết sản phẩm
    getRecords(TABLES.DON_HANG, {
      limit: 200,
      sort: '-Mã đơn hàng',
      fields: 'Mã đơn hàng,Mã KH,Tên khách hàng,Trạng thái,Ngày hẹn giao,Tổng tiền đơn,Còn phải thu,Địa chỉ giao',
    }),
    // Nhân viên + đối tác ngoài
    getRecords(TABLES.NHAN_VIEN, {
      limit: 100,
      fields: 'Mã NV,Họ tên,Vai trò,Số điện thoại',
    }),
    // Khách hàng để lấy tên + địa chỉ
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
    // Sản phẩm trong chi tiết đơn
    getRecords(TABLES.CHI_TIET_DON, {
      limit: 500,
      fields: 'Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền',
    }),
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
  for (const ct of (sanPham.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (!chiTietDonMap[maDon]) chiTietDonMap[maDon] = []
    chiTietDonMap[maDon].push(ct)
  }

  // Nhóm chi tiết giao theo mã chuyến
  const chiTietGiaoMap: Record<string, any[]> = {}
  for (const ct of (chiTietGiao.list || [])) {
    const maGH = ct['Mã giao hàng'] || ''
    if (!chiTietGiaoMap[maGH]) chiTietGiaoMap[maGH] = []
    chiTietGiaoMap[maGH].push(ct)
  }

  // Nhóm người giao theo mã chuyến (Mã chuyến là field mới)
  // Mỗi chuyến = nhiều GH-xxx cùng Mã chuyến
  const chuyenGiaoMap: Record<string, any[]> = {}
  for (const gh of (giaoHang.list || [])) {
    const maChuyen = gh['Mã chuyến'] || gh['Mã giao hàng'] // fallback
    if (!chuyenGiaoMap[maChuyen]) chuyenGiaoMap[maChuyen] = []
    chuyenGiaoMap[maChuyen].push(gh)
  }

  // Đơn chưa giao xong
  const donChuaGiao = (donHang.list || []).filter((d: any) =>
    d['Mã đơn hàng']?.trim() &&
    d['Trạng thái'] !== 'Hoàn thành' &&
    d['Trạng thái'] !== 'Huỷ'
  )

  return (
    <GiaoHangClient
      giaoHangList={giaoHang.list || []}
      chuyenGiaoMap={chuyenGiaoMap}
      chiTietGiaoMap={chiTietGiaoMap}
      chiTietDonMap={chiTietDonMap}
      donChuaGiao={donChuaGiao}
      donHangMap={donHangMap}
      nhanVien={nhanVien.list || []}
      khachHangMap={khachHangMap}
      user={session!}
    />
  )
}
