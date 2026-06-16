// app/dashboard/tai-khoan/page.tsx
export const dynamic = 'force-dynamic'
import { getSession } from '@/lib/auth'
import { getRecords, TABLES } from '@/lib/nocodb'
import { redirect } from 'next/navigation'
import TaiKhoanClient from '@/components/TaiKhoanClient'

export default async function TaiKhoanPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.vaiTro !== 'Chủ cửa hàng') redirect('/dashboard')

  const [data, nvData] = await Promise.all([
    getRecords(TABLES.TAI_KHOAN, { limit: 100, sort: 'Mã tài khoản' }),
    getRecords(TABLES.NHAN_VIEN, { limit: 200, fields: 'Mã nhân viên,Họ và Tên,Loại,Trạng thái' }),
  ])

  return <TaiKhoanClient
    taiKhoanList={data.list || []}
    nhanVienList={nvData.list || []}
    user={session} />
}
