// app/dashboard/nhan-vien/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import NhanVienClient from '@/components/NhanVienClient'

export default async function NhanVienPage() {
  const session = await getSession()
  const [nvResult, doiSoatResult, donHangResult, giaoHangResult, chiTietGiaoResult] = await Promise.all([
    getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: 'Mã nhân viên',
      fields: 'Id,Mã nhân viên,Họ và Tên,Số điện thoại,Địa chỉ,Loại,Vai trò,Lương cơ bản,% Thưởng DS,Hình thức lương,Ngày phép/tháng,Số TK ngân hàng,Ngân hàng,Hình thức TT,Trạng thái,Ghi chú'
    }),
    getRecords(TABLES.DOI_SOAT, {
      limit: 1000, sort: '-Id',
      fields: 'Id,Mã đối soát,Mã giao hàng,Mã đơn hàng,Mã NV/Đối tác,Tên NV/đối tác giao hàng,Đã thu được,Hình thức thu,Chi phí VC,Chi phí lắp đặt,Thưởng chuyến,Kết quả,Ngày đối soát,Tình trạng đối soát,Tình trạng nộp tiền,Ngày nộp tiền,Ghi chú'
    }),
    getRecords(TABLES.DON_HANG, {
      limit: 2000, sort: '-Id',
      fields: 'Id,Mã đơn hàng,Mã NV,Tổng tiền đơn,Trạng thái,Ngày bán,Còn phải thu'
    }),
    getRecords(TABLES.GIAO_HANG, {
      limit: 2000, sort: '-Id',
      fields: 'Id,Mã giao hàng,Mã đơn hàng,Hình thức giao,Mã NV/đối tác,Tên NV/đối tác,Vai trò chuyến,Ngày giao,Tình trạng đối soát'
    }),
    getRecords(TABLES.CHI_TIET_GIAO, {
      limit: 5000, sort: '-Id',
      fields: 'Id,Mã chuyến,Mã giao hàng,Mã đơn hàng,Tên SP (ghi nhanh),Mã SP,Số lượng giao đợt này,Số lượng'
    }),
  ])

  // Build chiTietGiaoMap: maGH → danh sách SP
  const chiTietGiaoMap: Record<string, any[]> = {}
  for (const ct of (chiTietGiaoResult.list || [])) {
    const maGH = ct['Mã giao hàng'] || ''
    if (!chiTietGiaoMap[maGH]) chiTietGiaoMap[maGH] = []
    chiTietGiaoMap[maGH].push(ct)
  }

  // Build donHangMap: maDon → don
  const donHangMap: Record<string, any> = {}
  for (const don of (donHangResult.list || [])) {
    const maDon = don['Mã đơn hàng'] || ''
    if (maDon) donHangMap[maDon] = don
  }

  // Build giaoHangMap: maGH → gh
  const giaoHangMap: Record<string, any> = {}
  for (const gh of (giaoHangResult.list || [])) {
    const maGH = gh['Mã giao hàng'] || ''
    if (maGH) giaoHangMap[maGH] = gh
  }

  return (
    <NhanVienClient
      nvList={nvResult.list||[]}
      doiSoatList={doiSoatResult.list||[]}
      donHangList={donHangResult.list||[]}
      donHangMap={donHangMap}
      giaoHangMap={giaoHangMap}
      chiTietGiaoMap={chiTietGiaoMap}
      user={session!}
    />
  )
}
