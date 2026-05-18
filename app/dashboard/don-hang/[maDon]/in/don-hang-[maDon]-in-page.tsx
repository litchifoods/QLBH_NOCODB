// app/dashboard/don-hang/[maDon]/in/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import InHoaDonClient from '@/components/InHoaDonClient'

export default async function InHoaDonPage({
  params,
}: {
  params: { maDon: string }
}) {
  await getSession()
  const { maDon } = params

  const donHangResult = await getRecords(TABLES.DON_HANG, {
    where: `(Mã đơn hàng,eq,${maDon})`,
    limit: 1,
  })
  const donHang = donHangResult.list?.[0]
  if (!donHang) notFound()

  const chiTietResult = await getRecords(TABLES.CHI_TIET_DON, {
    where: `(Mã đơn hàng,eq,${maDon})`,
    limit: 50,
  })

  let khachHang = null
  if (donHang['Mã KH']) {
    const khResult = await getRecords(TABLES.KHACH_HANG, {
      where: `(Mã KH,eq,${donHang['Mã KH']})`,
      limit: 1,
    })
    khachHang = khResult.list?.[0] || null
  }

  return (
    <InHoaDonClient
      donHang={donHang}
      chiTiet={chiTietResult.list || []}
      khachHang={khachHang}
    />
  )
}
