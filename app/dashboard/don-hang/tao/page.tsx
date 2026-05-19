// app/dashboard/don-hang/tao/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import TaoDonHangForm from '@/components/TaoDonHangForm'

export default async function TaoDonHangPage() {
  const session = await getSession()

  const [khachHang, sanPham, donHang, nhanVien] = await Promise.all([
    getRecords(TABLES.KHACH_HANG, {
      limit: 200,
      sort: 'Tên khách hàng',
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng',
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 300,
      sort: 'Tên sản phẩm',
      fields: 'Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán lẻ,Giá bán buôn,Tồn kho,Loại SP',
    }),
    getRecords(TABLES.DON_HANG, {
      limit: 1,
      sort: '-Mã đơn hàng',
      fields: 'Mã đơn hàng',
    }),
    getRecords(TABLES.NHAN_VIEN, {
      limit: 50,
      fields: 'Mã NV,Họ tên,Vai trò',
    }),
  ])

  // Tạo mã đơn hàng mới
  const lastDon = donHang.list?.[0]
  let nextMaDon = 'DH-2026-001'
  if (lastDon?.['Mã đơn hàng']) {
    const parts = lastDon['Mã đơn hàng'].split('-')
    const num   = parseInt(parts[parts.length - 1] || '0') + 1
    const year  = new Date().getFullYear()
    nextMaDon   = `DH-${year}-${String(num).padStart(3, '0')}`
  }

  // Lọc nhân viên hợp lệ (có họ tên)
  const danhSachNV = (nhanVien.list || []).filter((nv: any) =>
    nv['Họ tên']?.toString().trim()
  )

  return (
    <TaoDonHangForm
      user={session!}
      danhSachKH={khachHang.list || []}
      danhSachSP={sanPham.list || []}
      danhSachNV={danhSachNV}
      nextMaDon={nextMaDon}
    />
  )
}
