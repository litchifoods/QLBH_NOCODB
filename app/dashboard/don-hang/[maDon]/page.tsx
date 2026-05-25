// app/dashboard/don-hang/[maDon]/page.tsx — v3.0
// Thêm tính trạng thái chi tiết
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import { notFound } from 'next/navigation'
import ChiTietDonHangClient from '@/components/ChiTietDonHangClient'

function tinhTrangThai(chiTiet: any[], giaoHangList: any[], chiTietGiao: any[]): string {
  const spTong = chiTiet.length
  const spHuy  = chiTiet.filter(ct => ct['Trạng thái SP'] === 'Huỷ').length
  if (spTong > 0 && spHuy === spTong) return 'Huỷ'

  const slDon = chiTiet
    .filter(ct => ct['Trạng thái SP'] !== 'Huỷ')
    .reduce((s, ct) => s + Number(ct['Số lượng'] || 1), 0)

  const slGiao = chiTietGiao.reduce((s, ct) => s + Number(ct['Số lượng giao đợt này'] || 0), 0)

  if (slGiao === 0) return 'Chờ giao'

  const maGHDaSoat = new Set(
    giaoHangList.filter(gh => gh['Tình trạng đối soát'] === 'Đã đối soát').map(gh => gh['Mã giao hàng'])
  )
  const slDaSoat = chiTietGiao
    .filter(ct => maGHDaSoat.has(ct['Mã giao hàng']))
    .reduce((s, ct) => s + Number(ct['Số lượng giao đợt này'] || 0), 0)

  const canGiao = Math.max(0, slDon - slGiao)
  if (canGiao === 0) {
    if (slDaSoat >= slDon) return 'Đã giao'
    if (slDaSoat > 0)      return 'Đã giao 1 phần'
    return 'Đang giao'
  } else {
    if (slDaSoat > 0) return 'Đã giao 1 phần'
    return 'Đang giao 1 phần'
  }
}

export default async function ChiTietDonHangPage({ params }: { params: { maDon: string } }) {
  const session = await getSession()
  const { maDon } = params

  const [donHangResult, chiTietResult, giaoHangResult, danhSachSPResult, chiTietGiaoResult] = await Promise.all([
    getRecords(TABLES.DON_HANG, { where:`(Mã đơn hàng,eq,${maDon})`, limit:1 }),
    getRecords(TABLES.CHI_TIET_DON, {
      where:`(Mã đơn hàng,eq,${maDon})`, limit:50,
      fields:'Id,Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP,Trạng thái SP,Sửa giá,Sửa số lượng',
    }),
    getRecords(TABLES.GIAO_HANG, {
      where:`(Mã đơn hàng,eq,${maDon})`, limit:10,
      fields:'Mã giao hàng,Mã đơn hàng,Tên NV/đối tác,Ngày giao,Tình trạng đối soát',
    }),
    getRecords(TABLES.SAN_PHAM, { limit:200, fields:'Mã SP,Tên sản phẩm,Giá bán lẻ,Tồn kho,Đơn vị tính' }),
    getRecords(TABLES.CHI_TIET_GIAO, {
      where:`(Mã đơn hàng,eq,${maDon})`, limit:100,
      fields:'Mã giao hàng,Mã đơn hàng,Tên SP (ghi nhanh),Số lượng giao đợt này',
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

  const chiTiet     = (chiTietResult.list||[]).filter((ct:any)=>ct['Tên SP (ghi nhanh)']||ct['Mã SP'])
  const giaoHang    = giaoHangResult.list||[]
  const chiTietGiao = chiTietGiaoResult.list||[]

  // Tính trạng thái chi tiết
  const trangThaiTinh = tinhTrangThai(chiTiet, giaoHang, chiTietGiao)

  return (
    <ChiTietDonHangClient
      donHang={donHang}
      chiTiet={chiTiet}
      khachHang={khachHang}
      giaoHang={giaoHang}
      danhSachSP={danhSachSPResult.list||[]}
      trangThaiTinh={trangThaiTinh}
      user={session!}
    />
  )
}
