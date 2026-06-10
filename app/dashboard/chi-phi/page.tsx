// app/dashboard/chi-phi/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import ChiPhiClient from '@/components/ChiPhiClient'

export default async function ChiPhiPage() {
  const session = await getSession()
  const [data, nvData] = await Promise.all([
    getRecords(TABLES.CHI_PHI, { limit: 500, sort: '-Ngày phát sinh' }),
    getRecords(TABLES.NHAN_VIEN, { limit: 200, fields: 'Mã nhân viên,Họ và Tên,Loại' }),
  ])
  return <ChiPhiClient chiPhiList={data.list || []} nvList={nvData.list || []} user={session!} />
}
