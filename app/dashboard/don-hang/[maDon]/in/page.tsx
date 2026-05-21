// app/dashboard/don-hang/[maDon]/in/page.tsx
// Sửa lỗi 404: thêm retry 3 lần, mỗi lần cách 1 giây

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import InHoaDonClient from '@/components/InHoaDonClient'
import { notFound } from 'next/navigation'

// Hàm query có retry — thử lại nếu chưa tìm thấy đơn
async function layDonHang(maDon: string, soLanThu = 3, choMs = 1000) {
  for (let i = 0; i < soLanThu; i++) {
    const result = await getRecords(TABLES.DON_HANG, {
      where: `(Mã đơn hàng,eq,${maDon})`,
      limit: 1,
    })
    const don = result.list?.[0]
    if (don) return don

    // Chưa có → đợi rồi thử lại
    if (i < soLanThu - 1) {
      await new Promise(r => setTimeout(r, choMs))
    }
  }
  return null
}

export default async function InHoaDonPage({
  params,
}: {
  params: { maDon: string }
}) {
  const session = await getSession()
  const maDon   = decodeURIComponent(params.maDon)

  // Thử tìm đơn hàng — retry tối đa 3 lần x 1 giây
  const don = await layDonHang(maDon, 3, 1000)
  if (!don) notFound()

  // Lấy chi tiết đơn và danh sách KH song song
  const [chiTietResult, khachHangResult] = await Promise.all([
    getRecords(TABLES.CHI_TIET_DON, {
      where: `(Mã đơn hàng,eq,${maDon})`,
      limit: 50,
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  const khMap: Record<string, any> = {}
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
