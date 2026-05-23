// app/dashboard/don-hang/[maDon]/page.tsx — v2.0
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ChiTietDonHangClient from '@/components/ChiTietDonHangClient'

export default async function ChiTietDonHangPage({ params }: { params: { maDon: string } }) {
  const session = await getSession()
  const { maDon } = params

  const [donHangResult, chiTietResult, giaoHangResult, danhSachSPResult] = await Promise.all([
    getRecords(TABLES.DON_HANG, { where:`(Mã đơn hàng,eq,${maDon})`, limit:1 }),
    getRecords(TABLES.CHI_TIET_DON, { where:`(Mã đơn hàng,eq,${maDon})`, limit:50, fields:'Id,Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP,Trạng thái SP,Sửa giá,Sửa số lượng' }),
    getRecords(TABLES.GIAO_HANG, { where:`(Mã đơn hàng,eq,${maDon})`, limit:10 }),
    getRecords(TABLES.SAN_PHAM, {
      limit:200,
      fields:'Mã SP,Tên sản phẩm,Giá bán lẻ,Tồn kho,Đơn vị tính',
    }),
  ])

  const donHang = donHangResult.list?.[0]
  if (!donHang) notFound()

  let khachHang = null
  if (donHang['Mã KH']) {
    const khResult = await getRecords(TABLES.KHACH_HANG, {
      where:`(Mã KH,eq,${donHang['Mã KH']})`, limit:1,
    })
    khachHang = khResult.list?.[0] || null
  }

  // Lọc chi tiết bỏ dòng null
  const chiTiet = (chiTietResult.list||[]).filter((ct:any)=>ct['Tên SP (ghi nhanh)']||ct['Mã SP'])

  return (
    <ChiTietDonHangClient
      donHang={donHang}
      chiTiet={chiTiet}
      khachHang={khachHang}
      giaoHang={giaoHangResult.list||[]}
      danhSachSP={danhSachSPResult.list||[]}
      user={session!}
    />
  )
}
