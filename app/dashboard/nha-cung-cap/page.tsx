// app/dashboard/nha-cung-cap/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import NhaCungCapClient from '@/components/NhaCungCapClient'

export default async function NhaCungCapPage() {
  const session = await getSession()
  const [nccResult, ttResult, nhapKhoResult] = await Promise.all([
    getRecords(TABLES.NHA_CUNG_CAP, {
      limit: 200, sort: '-Id',
      fields: 'Id,Mã NCC,Tên NCC,Số điện thoại,Địa chỉ,Số TK ngân hàng,Công nợ NCC,Ghi chú'
    }),
    getRecords(TABLES.THANH_TOAN_NCC, {
      limit: 1000, sort: '-Id',
      fields: 'Id,Mã thanh toán,Ngày trả tiền NCC,Mã NCC,Mã phiếu nhập,Nội dung,Số tiền trả,Hình thức,Người trả,Ghi chú,Số tiền còn lại sau TT,Trạng thái'
    }),
    getRecords(TABLES.NHAP_KHO, {
      limit: 1000, sort: '-Id',
      fields: 'Id,Mã phiếu nhập,Ngày nhập,Mã NCC,Mã SP,Số lượng thực nhận,Giá nhập thực tế,CP vận chuyển về kho,Tổng tiền hàng'
    }),
  ])
  return (
    <NhaCungCapClient
      nccList={nccResult.list||[]}
      ttList={ttResult.list||[]}
      nhapKhoList={nhapKhoResult.list||[]}
      user={session!}
    />
  )
}
