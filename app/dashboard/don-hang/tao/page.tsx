// app/dashboard/don-hang/tao/page.tsx — v2.3
// Sửa: tên cột NocoDB là "Họ và Tên" thay vì "Họ tên"
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import TaoDonHangForm from '@/components/TaoDonHangForm'

export default async function TaoDonHangPage({
  searchParams,
}: {
  searchParams: { maKH?: string; tenKH?: string; sdtKH?: string; diaChiKH?: string }
}) {
  const session = await getSession()

  const [khachHang, sanPham, donHang, nhanVien] = await Promise.all([
    getRecords(TABLES.KHACH_HANG, {
      limit: 300, sort: '-Id',
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng',
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 300, sort: 'Tên sản phẩm',
      fields: 'Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán lẻ,Tồn kho',
    }),
    getRecords(TABLES.DON_HANG, { limit: 1, sort: '-Id', fields: 'Mã đơn hàng' }),
    // Bỏ fields filter — lấy tất cả cột để tránh lỗi tên cột tiếng Việt
    getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: '-Tháng',
    }),
  ])

  const lastDon = donHang.list?.[0]
  let nextMaDon = `DH-${new Date().getFullYear()}-001`
  if (lastDon?.['Mã đơn hàng']) {
    const parts = lastDon['Mã đơn hàng'].split('-')
    const num   = parseInt(parts[parts.length - 1] || '0') + 1
    nextMaDon   = `DH-${new Date().getFullYear()}-${String(num).padStart(3,'0')}`
  }

  // ✅ Đúng tên cột NocoDB: "Mã Nhân Viên" và "Họ và Tên"
  const nvMap: Record<string,any> = {}
  for (const nv of (nhanVien.list || [])) {
    const ma  = nv['Mã Nhân Viên']
    const ten = (nv['Họ và Tên'] || '').trim()
    if (!ma || !ten) continue
    if (!nvMap[ma] || (nv['Tháng']||'') > (nvMap[ma]['Tháng']||'')) nvMap[ma] = nv
  }
  const danhSachNV = Object.values(nvMap)
    .map((nv:any) => ({
      'Mã NV':   nv['Mã Nhân Viên'],
      'Họ tên':  nv['Họ và Tên'] || '',
      'Vai trò': nv['Vai trò'] || '',
    }))
    .sort((a,b) => (a['Họ tên']||'').localeCompare(b['Họ tên']||'', 'vi'))

  let khDaChon: any = null
  if (searchParams.maKH) {
    khDaChon = (khachHang.list || []).find((kh:any) => kh['Mã KH'] === searchParams.maKH) || null
  }
  if (!khDaChon && searchParams.tenKH) {
    khDaChon = {
      'Mã KH':          '',
      'Tên khách hàng': decodeURIComponent(searchParams.tenKH),
      'Số điện thoại':  decodeURIComponent(searchParams.sdtKH   || ''),
      'Địa chỉ':        decodeURIComponent(searchParams.diaChiKH || ''),
    }
  }

  return (
    <TaoDonHangForm
      user={session!}
      danhSachKH={khachHang.list || []}
      danhSachSP={sanPham.list   || []}
      danhSachNV={danhSachNV}
      nextMaDon={nextMaDon}
      khDaChon={khDaChon}
    />
  )
}
