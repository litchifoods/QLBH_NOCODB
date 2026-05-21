// app/dashboard/don-hang/[maDon]/in/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import InHoaDonClient from '@/components/InHoaDonClient'
import { notFound } from 'next/navigation'

export default async function InHoaDonPage({
  params,
}: {
  params: { maDon: string }
}) {
  const session  = await getSession()
  const maDon    = decodeURIComponent(params.maDon)

  const [donResult, chiTietResult, khachHangResult] = await Promise.all([
    getRecords(TABLES.DON_HANG, {
      where: `(Mã đơn hàng,eq,${maDon})`, limit: 1,
    }),
    getRecords(TABLES.CHI_TIET_DON, {
      where: `(Mã đơn hàng,eq,${maDon})`, limit: 50,
    }),
    getRecords(TABLES.KHACH_HANG, { limit: 500, fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ' }),
  ])

  const don = donResult.list?.[0]
  if (!don) notFound()

  const khMap: Record<string,any> = {}
  for (const kh of (khachHangResult.list || [])) {
    if (kh['Mã KH']) khMap[kh['Mã KH']] = kh
  }

  const maKH   = don['Mã KH'] || ''
  const khInfo = khMap[maKH] || {}

  return (
    <InHoaDonClient
      don={don}
      chiTiet={chiTietResult.list || []}
      khInfo={khInfo}
      user={session!}
    />
  )
}
