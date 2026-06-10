// app/dashboard/don-hang/tao/page.tsx — v2.3
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import TaoDonHangForm from '@/components/TaoDonHangForm'

export default async function TaoDonHangPage({
  searchParams,
}: {
  searchParams: { maKH?: string; tenKH?: string; sdtKH?: string; diaChiKH?: string }
}) {
  const session = await getSession()

  const [khachHang, sanPham, donHang] = await Promise.all([
    getRecords(TABLES.KHACH_HANG, {
      limit: 300, sort: '-Id',
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng',
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 300, sort: 'Tên sản phẩm',
      fields: 'Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán lẻ,Giá bán buôn,Giá nhập NCC,Tồn kho,Loại SP',
    }),
    getRecords(TABLES.DON_HANG, { limit: 1, sort: '-Id', fields: 'Mã đơn hàng' }),
  ])

  // Query NV riêng — không dùng fields filter, không sort (tránh lỗi tên cột tiếng Việt)
  let nhanVien: any = { list: [] }
  try {
    nhanVien = await getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: '-Id',
      fields: 'Id,Mã nhân viên,Họ và Tên,Vai trò,Loại,Trạng thái'
    })
  } catch (e) {
    console.error('[NV ERROR]', e)
  }

  const lastDon = donHang.list?.[0]
  let nextMaDon = `DH-${new Date().getFullYear()}-001`
  if (lastDon?.['Mã đơn hàng']) {
    const parts = lastDon['Mã đơn hàng'].split('-')
    const num   = parseInt(parts[parts.length - 1] || '0') + 1
    nextMaDon   = `DH-${new Date().getFullYear()}-${String(num).padStart(3,'0')}`
  }

  // ✅ Đúng tên cột NocoDB: "Mã Nhân Viên" và "Họ và Tên"
  const danhSachNV = (nhanVien.list || [])
    .filter((nv:any) => nv['Mã nhân viên'] && (nv['Họ và Tên']||'').trim() && nv['Loại']==='Nhân viên' && nv['Trạng thái']!=='Nghỉ việc')
    .map((nv:any) => ({
      'Mã nhân viên': nv['Mã nhân viên'],
      'Họ và Tên':    nv['Họ và Tên'] || '',
      'Vai trò':      nv['Vai trò'] || '',
      'Trạng thái':   nv['Trạng thái'] || '',
      'Loại':         nv['Loại'] || '',
    }))
    .sort((a:any,b:any) => (a['Họ và Tên']||'').localeCompare(b['Họ và Tên']||'', 'vi'))

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
