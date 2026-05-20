// app/dashboard/giao-hang/page.tsx -- v3.1
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, chiTietGiao, donHang, chiTietDon, nhanVien, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Ngày giao' }),
    getRecords(TABLES.CHI_TIET_GIAO, { limit: 500 }),
    getRecords(TABLES.DON_HANG, {
      limit: 200, sort: '-Mã đơn hàng',
      fields: 'Mã đơn hàng,Mã KH,Tên khách hàng,Trạng thái,Tổng tiền đơn,Còn phải thu,Địa chỉ giao,Ngày hẹn giao',
    }),
    getRecords(TABLES.CHI_TIET_DON, {
      limit: 500,
      fields: 'Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP',
    }),
    // Load toàn bộ NV + đối tác — web tự dùng dữ liệu thực tế từ NocoDB
    // Mỗi khi NocoDB thêm/sửa NV thì web tự cập nhật vì không cache
    getRecords(TABLES.NHAN_VIEN, {
      limit: 200,
      fields: 'Mã NV,Họ tên,Vai trò,Số điện thoại,Tháng',
      sort: 'Mã NV',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500, fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  const khachHangMap: Record<string, any> = {}
  for (const kh of (khachHang.list || [])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }

  const donHangMap: Record<string, any> = {}
  for (const d of (donHang.list || [])) {
    if (d['Mã đơn hàng']) donHangMap[d['Mã đơn hàng']] = d
  }

  const chiTietDonMap: Record<string, any[]> = {}
  for (const ct of (chiTietDon.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (maDon) {
      if (!chiTietDonMap[maDon]) chiTietDonMap[maDon] = []
      chiTietDonMap[maDon].push(ct)
    }
  }

  // Tính đã giao bao nhiêu theo từng chi tiết đơn
  const daGiaoMap: Record<string, Record<string, number>> = {}
  for (const ct of (chiTietGiao.list || [])) {
    const maDon = ct['Mã đơn hàng']
    const maCT  = ct['Mã chi tiết đơn'] || ct['Tên SP (ghi nhanh)']
    if (maDon && maCT) {
      if (!daGiaoMap[maDon]) daGiaoMap[maDon] = {}
      daGiaoMap[maDon][maCT] = (daGiaoMap[maDon][maCT] || 0) + Number(ct['Số lượng giao đợt này'] || 0)
    }
  }

  // ── Xử lý danh sách nhân viên & đối tác từ NocoDB ──
  // Bảng 3 có thể có nhiều dòng cùng mã NV (mỗi tháng 1 dòng)
  // Chỉ lấy 1 dòng duy nhất cho mỗi Mã NV (dòng mới nhất = tháng lớn nhất)
  const nvMapTemp: Record<string, any> = {}
  for (const nv of (nhanVien.list || [])) {
    const ma = nv['Mã NV']
    if (!ma) continue
    if (!nvMapTemp[ma]) {
      nvMapTemp[ma] = nv
    } else {
      // Giữ dòng có tháng lớn hơn (mới hơn)
      const thangCu  = nvMapTemp[ma]['Tháng'] || ''
      const thangMoi = nv['Tháng'] || ''
      if (thangMoi > thangCu) nvMapTemp[ma] = nv
    }
  }
  const danhSachNV = Object.values(nvMapTemp)

  // Tách riêng NV cửa hàng và Đối tác ngoài dựa vào Mã NV
  // Mã bắt đầu bằng NV- = nhân viên cửa hàng
  // Mã bắt đầu bằng DT- = đối tác ngoài
  const danhSachNVCuaHang = danhSachNV.filter(nv =>
    (nv['Mã NV'] || '').startsWith('NV-')
  )
  const danhSachDoiTac = danhSachNV.filter(nv =>
    (nv['Mã NV'] || '').startsWith('DT-')
  )

  const donChuaGiao = (donHang.list || []).filter((d: any) =>
    d['Mã đơn hàng']?.trim() &&
    d['Trạng thái'] !== 'Hoàn thành' &&
    d['Trạng thái'] !== 'Huỷ'
  )

  return (
    <GiaoHangClient
      giaoHangList={giaoHang.list || []}
      chiTietDonMap={chiTietDonMap}
      daGiaoMap={daGiaoMap}
      donChuaGiao={donChuaGiao}
      donHangMap={donHangMap}
      danhSachNVCuaHang={danhSachNVCuaHang}
      danhSachDoiTac={danhSachDoiTac}
      khachHangMap={khachHangMap}
      user={session!}
    />
  )
}
