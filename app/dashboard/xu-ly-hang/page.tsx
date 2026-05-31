// app/dashboard/xu-ly-hang/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import XuLyHangClient from '@/components/XuLyHangClient'

export default async function XuLyHangPage() {
  const session = await getSession()
  const [xuLy, ncc, sanPham] = await Promise.all([
    getRecords(TABLES.XU_LY_HANG, {
      limit:500, sort:'-Id',
      fields:'Id,Mã xử lý,Ngày xử lý,Mã phiếu nhập,Mã NCC,Mã SP,Số lượng,Loại vấn đề,Hướng xử lý,Trạng thái,Ghi chú,Người báo cáo,Người xử lý,Ngày hoàn thành'
    }),
    getRecords(TABLES.NHA_CUNG_CAP, { limit:200, fields:'Id,Mã NCC,Tên NCC,Số điện thoại' }),
    getRecords(TABLES.SAN_PHAM, { limit:500, fields:'Id,Mã SP,Tên sản phẩm,Đơn vị tính' }),
  ])
  return <XuLyHangClient danhSach={xuLy.list||[]} nccList={ncc.list||[]} sanPhamList={sanPham.list||[]} user={session!}/>
}
