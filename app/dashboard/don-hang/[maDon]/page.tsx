// app/dashboard/don-hang/[maDon]/page.tsx
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ChiTietDonHangClient from '@/components/ChiTietDonHangClient'

export default async function ChiTietDonHangPage({
  params,
}: {
  params: { maDon: string }
}) {
  const session = await getSession()
  const { maDon } = params

  // Lấy đơn hàng
  const donHangResult = await getRecords(TABLES.DON_HANG, {
    where: `(Mã đơn hàng,eq,${maDon})`,
    limit: 1,
  })
  const donHang = donHangResult.list?.[0]
  if (!donHang) notFound()

  // Lấy chi tiết sản phẩm
  const chiTietResult = await getRecords(TABLES.CHI_TIET_DON, {
    where: `(Mã đơn hàng,eq,${maDon})`,
    limit: 50,
  })

  // Lấy khách hàng
  let khachHang = null
  if (donHang['Mã KH']) {
    const khResult = await getRecords(TABLES.KHACH_HANG, {
      where: `(Mã KH,eq,${donHang['Mã KH']})`,
      limit: 1,
    })
    khachHang = khResult.list?.[0] || null
  }

  // Lấy giao hàng liên quan
  const giaoHangResult = await getRecords(TABLES.GIAO_HANG, {
    where: `(Mã đơn hàng,eq,${maDon})`,
    limit: 10,
  })

  return (
    <ChiTietDonHangClient
      donHang={donHang}
      chiTiet={chiTietResult.list || []}
      khachHang={khachHang}
      giaoHang={giaoHangResult.list || []}
      user={session!}
    />
  )
}
