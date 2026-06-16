// app/dashboard/nhat-ky/page.tsx
export const dynamic = 'force-dynamic'
import { getSession } from '@/lib/auth'
import { getRecords, TABLES } from '@/lib/nocodb'
import { redirect } from 'next/navigation'
import NhatKyClient from '@/components/NhatKyClient'

export default async function NhatKyPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.vaiTro !== 'Chủ cửa hàng') redirect('/dashboard')

  const data = await getRecords(TABLES.NHAT_KY, {
    limit: 200,
    sort: '-Thời gian',
  })

  return <NhatKyClient logs={data.list || []} user={session} />
}
