// app/dashboard/don-hang/tao/page.tsx -- v2.2
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
      limit: 300, sort: '-Ngày tạo',
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng',
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 300, sort: 'Tên sản phẩm',
      fields: 'Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán lẻ,Tồn kho',
    }),
    getRecords(TABLES.DON_HANG, { limit: 1, sort: '-Mã đơn hàng', fields: 'Mã đơn hàng' }),
    getRecords(TABLES.NHAN_VIEN, { limit: 200, sort: '-Tháng', fields: 'Mã NV,Họ tên,Vai trò,Tháng' }),
  ])

  // Tạo mã đơn mới
  const lastDon  = donHang.list?.[0]
  let nextMaDon  = `DH-${new Date().getFullYear()}-001`
  if (lastDon?.['Mã đơn hàng']) {
    const parts  = lastDon['Mã đơn hàng'].split('-')
    const num    = parseInt(parts[parts.length - 1] || '0') + 1
    nextMaDon    = `DH-${new Date().getFullYear()}-${String(num).padStart(3,'0')}`
  }

  // Lọc NV không trùng mã
  const nvMap: Record<string,any> = {}
  for (const nv of (nhanVien.list || [])) {
    const ma = nv['Mã NV']
    if (!ma || !nv['Họ tên']?.trim()) continue
    if (!nvMap[ma] || (nv['Tháng']||'') > (nvMap[ma]['Tháng']||'')) nvMap[ma] = nv
  }
  const danhSachNV = Object.values(nvMap).sort((a,b) =>
    (a['Họ tên']||'').localeCompare(b['Họ tên']||'','vi')
  )

  // Trường hợp 1: có maKH → tìm KH có sẵn
  let khDaChon: any = null
  if (searchParams.maKH) {
    khDaChon = (khachHang.list || []).find((kh: any) => kh['Mã KH'] === searchParams.maKH) || null
  }
  // Trường hợp 2: KH mới tạo chưa có mã → truyền thông tin trực tiếp qua params
  if (!khDaChon && searchParams.tenKH) {
    khDaChon = {
      'Mã KH':           '',
      'Tên khách hàng':  decodeURIComponent(searchParams.tenKH),
      'Số điện thoại':   decodeURIComponent(searchParams.sdtKH  || ''),
      'Địa chỉ':         decodeURIComponent(searchParams.diaChiKH || ''),
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
