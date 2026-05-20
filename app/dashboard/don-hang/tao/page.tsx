// app/dashboard/don-hang/tao/page.tsx -- v2.0
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import TaoDonHangForm from '@/components/TaoDonHangForm'

export default async function TaoDonHangPage() {
  const session = await getSession()

  const [khachHang, sanPham, donHang, nhanVien] = await Promise.all([
    getRecords(TABLES.KHACH_HANG, {
      limit: 300, sort: 'Tên khách hàng',
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng',
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 300, sort: 'Tên sản phẩm',
      fields: 'Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán lẻ,Giá bán buôn,Tồn kho,Loại SP',
    }),
    getRecords(TABLES.DON_HANG, {
      limit: 1, sort: '-Mã đơn hàng', fields: 'Mã đơn hàng',
    }),
    // Load toàn bộ NV từ NocoDB — bảng 3 có nhiều dòng cùng mã (mỗi tháng 1 dòng)
    // Chỉ giữ 1 dòng/người (dòng mới nhất)
    getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: '-Tháng',
      fields: 'Mã NV,Họ tên,Vai trò,Tháng',
    }),
  ])

  // Tạo mã đơn mới
  const lastDon = donHang.list?.[0]
  let nextMaDon = `DH-${new Date().getFullYear()}-001`
  if (lastDon?.['Mã đơn hàng']) {
    const parts = lastDon['Mã đơn hàng'].split('-')
    const num   = parseInt(parts[parts.length - 1] || '0') + 1
    nextMaDon   = `DH-${new Date().getFullYear()}-${String(num).padStart(3, '0')}`
  }

  // Loại bỏ dòng NV trùng mã — giữ dòng tháng lớn nhất (mới nhất)
  const nvMap: Record<string, any> = {}
  for (const nv of (nhanVien.list || [])) {
    const ma = nv['Mã NV']
    if (!ma || !nv['Họ tên']?.trim()) continue
    if (!nvMap[ma] || (nv['Tháng'] || '') > (nvMap[ma]['Tháng'] || '')) {
      nvMap[ma] = nv
    }
  }
  const danhSachNV = Object.values(nvMap).sort((a, b) =>
    (a['Họ tên'] || '').localeCompare(b['Họ tên'] || '', 'vi')
  )

  return (
    <TaoDonHangForm
      user={session!}
      danhSachKH={khachHang.list || []}
      danhSachSP={sanPham.list   || []}
      danhSachNV={danhSachNV}
      nextMaDon={nextMaDon}
    />
  )
}
