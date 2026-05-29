// app/dashboard/dat-hang-ncc/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DatHangNCCClient from '@/components/DatHangNCCClient'

export default async function DatHangNCCPage() {
  const session = await getSession()
  const [donDH, ncc, sanPham] = await Promise.all([
    getRecords(TABLES.DAT_HANG_NCC, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã đặt hàng,Ngày đặt,Mã NCC,Mã SP,Số lượng đặt,Giá nhập dự kiến,Ngày dự kiến về,Trạng thái,Ghi chú',
    }),
    getRecords(TABLES.NHA_CUNG_CAP, {
      limit: 200,
      fields: 'Id,Mã NCC,Tên NCC,Số điện thoại,Địa chỉ,Số TK ngân hàng,Ghi chú',
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 500,
      fields: 'Id,Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán buôn',
    }),
  ])
  return (
    <DatHangNCCClient
      donDHList={donDH.list||[]}
      nccList={ncc.list||[]}
      sanPhamList={sanPham.list||[]}
      user={session!}
    />
  )
}
