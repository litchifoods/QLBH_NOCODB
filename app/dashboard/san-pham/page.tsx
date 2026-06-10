// app/dashboard/san-pham/page.tsx
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import SanPhamClient from '@/components/SanPhamClient'

export default async function SanPhamPage() {
  const session = await getSession()

  const [result, danhMucResult, nhapKhoResult, nccResult] = await Promise.all([
    getRecords(TABLES.SAN_PHAM, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã SP,Tên sản phẩm,Loại SP,Danh mục,Đơn vị tính,Giá nhập NCC,CPVC về kho,Giá bán buôn,Giá bán lẻ,Tồn kho,Ngưỡng cảnh báo,Thông số kỹ thuật,Ghi chú,Trạng thái',
    }),
    getRecords(TABLES.DANH_MUC, {
      limit: 200, sort: 'Thứ tự',
      fields: 'Id,Tên danh mục,Thứ tự',
    }),
    getRecords(TABLES.NHAP_KHO, {
      limit: 2000, sort: '-Ngày nhập',
      fields: 'Id,Mã phiếu nhập,Mã SP,Mã NCC,Ngày nhập,Số lượng thực nhận,Giá nhập thực tế,CP vận chuyển về kho,Tổng tiền hàng',
    }),
    getRecords(TABLES.NHA_CUNG_CAP, {
      limit: 200, sort: '-Id',
      fields: 'Id,Mã NCC,Tên NCC,Số điện thoại',
    }),
  ])

  const danhSach = (result.list || []).filter((sp: any) => sp['Tên sản phẩm']?.toString().trim())

  // Build nccMap: maNCC → tên NCC
  const nccMap: Record<string, string> = {}
  for (const ncc of (nccResult.list || [])) {
    nccMap[ncc['Mã NCC']||''] = ncc['Tên NCC']||''
  }

  return (
    <SanPhamClient
      danhSach={danhSach}
      danhMucList={danhMucResult.list || []}
      nhapKhoList={nhapKhoResult.list || []}
      nccMap={nccMap}
      user={session!}
    />
  )
}
