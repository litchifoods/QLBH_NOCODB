// app/dashboard/san-pham/page.tsx
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import SanPhamClient from '@/components/SanPhamClient'

export default async function SanPhamPage() {
  const session = await getSession()

  const result = await getRecords(TABLES.SAN_PHAM, {
    limit: 500, sort: '-Id',
    fields: 'Id,Mã SP,Tên sản phẩm,Loại SP,Đơn vị tính,Giá nhập NCC,CPVC về kho,Giá bán buôn,Giá bán lẻ,Tồn kho,Ngưỡng cảnh báo,Thông số kỹ thuật,Ghi chú',
  })

  const danhSach = (result.list || []).filter((sp: any) => sp['Tên sản phẩm']?.toString().trim())

  return <SanPhamClient danhSach={danhSach} user={session!} />
}
