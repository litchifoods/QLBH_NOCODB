// app/dashboard/thanh-toan-ncc/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import LichSuThanhToanClient from '@/components/LichSuThanhToanClient'

export default async function LichSuThanhToanPage() {
  const session = await getSession()
  const [ttResult, nccResult] = await Promise.all([
    getRecords(TABLES.THANH_TOAN_NCC, {
      limit: 1000, sort: '-Id',
      fields: 'Id,Mã thanh toán,Ngày trả tiền NCC,Mã NCC,Mã phiếu nhập,Nội dung,Loại thanh toán,Số tiền trả,Hình thức,Người trả,Ghi chú,Số tiền còn lại sau TT,Trạng thái'
    }),
    getRecords(TABLES.NHA_CUNG_CAP, {
      limit: 200, fields: 'Id,Mã NCC,Tên NCC'
    }),
  ])
  return (
    <LichSuThanhToanClient
      ttList={ttResult.list||[]}
      nccList={nccResult.list||[]}
      user={session!}
    />
  )
}
