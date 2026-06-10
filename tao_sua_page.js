const fs = require('fs')
const path = require('path')

const dir = path.join(process.cwd(), 'app', 'dashboard', 'don-hang', '[maDon]', 'sua')
if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true})

const content = `// app/dashboard/don-hang/[maDon]/sua/page.tsx
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import { notFound, redirect } from 'next/navigation'
import TaoDonHangForm from '@/components/TaoDonHangForm'

export default async function SuaDonHangPage({ params }: { params: { maDon: string } }) {
  const session = await getSession()
  const { maDon } = params

  const [donHangResult, chiTietResult, khachHangAll, sanPhamAll, nhanVienAll] = await Promise.all([
    getRecords(TABLES.DON_HANG, { where:'(Mã đơn hàng,eq,'+maDon+')', limit:1 }),
    getRecords(TABLES.CHI_TIET_DON, {
      where:'(Mã đơn hàng,eq,'+maDon+')', limit:50,
      fields:'Id,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP,Trạng thái SP,Giá nhập',
    }),
    getRecords(TABLES.KHACH_HANG, { limit:300, sort:'-Id', fields:'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ,Đối tượng khách hàng' }),
    getRecords(TABLES.SAN_PHAM, { limit:300, sort:'Tên sản phẩm', fields:'Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán lẻ,Giá bán buôn,Giá nhập NCC,Tồn kho,Loại SP' }),
    getRecords(TABLES.NHAN_VIEN, { limit:200, sort:'-Id', fields:'Id,Mã nhân viên,Họ và Tên,Vai trò,Loại,Trạng thái' }),
  ])

  const donHang = donHangResult.list?.[0]
  if (!donHang) notFound()

  const tt = donHang['Trạng thái']||''
  if (['Huỷ','Đã giao','Hoàn thành'].includes(tt)) {
    redirect('/dashboard/don-hang/'+maDon)
  }

  let khDaChon: any = null
  if (donHang['Mã KH']) {
    khDaChon = (khachHangAll.list||[]).find((kh:any) => kh['Mã KH'] === donHang['Mã KH']) || null
  }
  if (!khDaChon && donHang['Tên khách hàng']) {
    khDaChon = {
      'Mã KH': donHang['Mã KH']||'',
      'Tên khách hàng': donHang['Tên khách hàng'],
      'Số điện thoại': '',
      'Địa chỉ': donHang['Địa chỉ giao']||'',
    }
  }

  const chiTietHienTai = (chiTietResult.list||[])
    .filter((ct:any) => ct['Trạng thái SP'] !== 'Huỷ' && (ct['Tên SP (ghi nhanh)']||ct['Mã SP']))
    .map((ct:any) => ({
      id: String(ct['Id']||ct['id']||''),
      maSP: ct['Mã SP']||'',
      tenSP: ct['Tên SP (ghi nhanh)']||ct['Mã SP']||'',
      soLuong: Number(ct['Số lượng']||1),
      donGia: Number(ct['Đơn giá']||0),
      giaNhap: Number(ct['Giá nhập']||0),
      thanhTien: Number(ct['Thành tiền']||0),
      ghiChu: ct['Ghi chú SP']||'',
    }))

  const danhSachNV = (nhanVienAll.list||[])
    .filter((nv:any) => nv['Mã nhân viên'] && (nv['Họ và Tên']||'').trim() && nv['Loại']==='Nhân viên' && nv['Trạng thái']!=='Nghỉ việc')
    .map((nv:any) => ({ 'Mã nhân viên':nv['Mã nhân viên'],'Họ và Tên':nv['Họ và Tên']||'','Vai trò':nv['Vai trò']||'','Trạng thái':nv['Trạng thái']||'','Loại':nv['Loại']||'' }))
    .sort((a:any,b:any) => (a['Họ và Tên']||'').localeCompare(b['Họ và Tên']||'','vi'))

  return (
    <TaoDonHangForm
      user={session!}
      danhSachKH={khachHangAll.list||[]}
      danhSachSP={sanPhamAll.list||[]}
      danhSachNV={danhSachNV}
      nextMaDon={maDon}
      khDaChon={khDaChon}
      donHangSua={{
        maDon,
        rowId: String(donHang['Id']||donHang['id']||''),
        ngayDat: (donHang['Ngày bán']||donHang['Ngày đặt']||'').split('T')[0],
        kenhBan: donHang['Kênh bán']||'Trực tiếp',
        htGiao: donHang['Hình thức giao hàng']||'Giao hàng cho khách',
        ngayHenGiao: donHang['Ngày hẹn giao'] ? new Date(donHang['Ngày hẹn giao']).toISOString().slice(0,16) : '',
        nvBan: donHang['Nhân viên bán']||'',
        maNV: donHang['Mã NV']||'',
        ghiChu: donHang['Ghi chú']||'',
        tienMat: Number(donHang['Đặt cọc']||0),
        ckCoc: 0,
        cpGiaoHang: Number(donHang['CP giao hàng']||0),
        htCoc: donHang['Hình thức cọc']||'',
        chiTiet: chiTietHienTai,
      }}
    />
  )
}
`

fs.writeFileSync(path.join(dir, 'page.tsx'), content, 'utf8')
console.log('Done! sua/page.tsx created at:', path.join(dir, 'page.tsx'))
