// app/dashboard/nhap-kho/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import NhapKhoClient from '@/components/NhapKhoClient'

export default async function NhapKhoPage() {
  const session = await getSession()
  const [nhapKho, ncc, sanPham, datHangNCC] = await Promise.all([
    getRecords(TABLES.NHAP_KHO, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã phiếu nhập,Ngày nhập,Mã đặt hàng,Mã NCC,Mã SP,Số lượng đặt,Giá nhập thực tế,Số lượng thực nhận,Số lượng lỗi,Số lượng chờ phụ kiện,Tổng tiền hàng,CP vận chuyển về kho,Tình trạng hàng,Ghi chú,Người nhập',
    }),
    getRecords(TABLES.NHA_CUNG_CAP, {
      limit: 200, fields: 'Id,Mã NCC,Tên NCC,Số điện thoại,Địa chỉ,Số TK ngân hàng',
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 500, fields: 'Id,Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán buôn,Tồn kho',
    }),
    getRecords(TABLES.DAT_HANG_NCC, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã đặt hàng,Mã NCC,Mã SP,Số lượng đặt,Giá nhập dự kiến,Trạng thái',
    }),
  ])
  return (
    <NhapKhoClient
      nhapKhoList={nhapKho.list||[]}
      nccList={ncc.list||[]}
      sanPhamList={sanPham.list||[]}
      datHangList={datHangNCC.list||[]}
      user={session!}
    />
  )
}
