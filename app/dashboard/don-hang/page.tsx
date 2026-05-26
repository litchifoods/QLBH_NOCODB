// app/dashboard/don-hang/page.tsx — v3.0
// Thêm tính trạng thái chi tiết: Chờ giao / Đang giao / Đang giao 1 phần / Đã giao / Đã giao 1 phần / Huỷ
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DonHangClient from '@/components/DonHangClient'

export default async function DonHangPage({
  searchParams,
}: {
  searchParams: { trang_thai?: string; kenh?: string; q?: string }
}) {
  const session = await getSession()

  const [donHangResult, khachHangResult, chiTietDonResult, giaoHangResult, chiTietGiaoResult, doiSoatResult] = await Promise.all([
    getRecords(TABLES.DON_HANG, { limit: 200, sort: '-Id' }),
    getRecords(TABLES.KHACH_HANG, { limit: 500, fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ' }),
    getRecords(TABLES.CHI_TIET_DON, { limit: 1000, fields: 'Mã chi tiết,Mã đơn hàng,Số lượng,Trạng thái SP' }),
    getRecords(TABLES.GIAO_HANG,    { limit: 500,  fields: 'Mã giao hàng,Mã đơn hàng,Tình trạng đối soát' }),
    getRecords(TABLES.CHI_TIET_GIAO,{ limit: 1000, fields: 'Mã giao hàng,Mã đơn hàng,Số lượng giao đợt này' }),
    getRecords(TABLES.DOI_SOAT,     { limit: 500,  fields: 'Mã giao hàng,Mã đơn hàng,Kết quả,Đã thu được' }),
  ])

  const donHang = donHangResult.list || []

  const khachHangMap: Record<string, any> = {}
  for (const kh of (khachHangResult.list || [])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }

  // ── Tính trạng thái chi tiết cho từng đơn ──

  // 1. Tổng SL theo đơn (chỉ SP chưa hủy)
  const slDonMap: Record<string, number> = {}       // maDon → tổng SL đơn (chưa hủy)
  const spHuyMap: Record<string, number> = {}       // maDon → số SP bị hủy
  const spTongMap: Record<string, number> = {}      // maDon → tổng số SP (kể cả hủy)
  for (const ct of (chiTietDonResult.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (!maDon) continue
    const sl = Number(ct['Số lượng'] || 1)
    spTongMap[maDon] = (spTongMap[maDon] || 0) + 1
    if (ct['Trạng thái SP'] === 'Huỷ') {
      spHuyMap[maDon] = (spHuyMap[maDon] || 0) + 1
    } else {
      slDonMap[maDon] = (slDonMap[maDon] || 0) + sl
    }
  }

  // 2. Tổng SL đã giao theo đơn
  const slGiaoMap: Record<string, number> = {}     // maDon → tổng SL đã giao
  for (const ct of (chiTietGiaoResult.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (!maDon) continue
    slGiaoMap[maDon] = (slGiaoMap[maDon] || 0) + Number(ct['Số lượng giao đợt này'] || 0)
  }

  // 3. Các chuyến đã đối soát thành công theo đơn
  const doiSoatMap: Record<string, string> = {}    // maGH → kết quả
  for (const ds of (doiSoatResult.list || [])) {
    if (ds['Mã giao hàng']) doiSoatMap[ds['Mã giao hàng']] = ds['Kết quả'] || ''
  }

  // SL đã đối soát xong theo đơn + tổng tiền đã thu qua đối soát
  const slDaSoatMap: Record<string, number> = {}   // maDon → SL đã đối soát
  const thuKHMap:    Record<string, number> = {}   // maDon → tổng tiền đã thu từ KH
  for (const gh of (giaoHangResult.list || [])) {
    const maDon  = gh['Mã đơn hàng']
    const maGH   = gh['Mã giao hàng']
    if (!maDon || !maGH) continue
    const daSoat = gh['Tình trạng đối soát'] === 'Đã đối soát'
    if (daSoat) {
      const slChuyen = (chiTietGiaoResult.list || [])
        .filter((ct: any) => ct['Mã giao hàng'] === maGH)
        .reduce((s: number, ct: any) => s + Number(ct['Số lượng giao đợt này'] || 0), 0)
      slDaSoatMap[maDon] = (slDaSoatMap[maDon] || 0) + slChuyen
    }
  }
  // Tổng tiền đã thu từ KH qua đối soát
  for (const ds of (doiSoatResult.list || [])) {
    const maDon   = ds['Mã đơn hàng']
    const thuDuoc = Number(ds['Đã thu được'] || 0)
    if (maDon && thuDuoc > 0) {
      thuKHMap[maDon] = (thuKHMap[maDon] || 0) + thuDuoc
    }
  }

  // 4. Tính trạng thái cho từng đơn
  const trangThaiMap: Record<string, string> = {}
  for (const don of donHang) {
    const maDon   = don['Mã đơn hàng']
    if (!maDon) continue

    const spTong  = spTongMap[maDon]  || 0
    const spHuy   = spHuyMap[maDon]   || 0
    const slDon   = slDonMap[maDon]   || 0   // SL sp chưa hủy
    const slGiao  = slGiaoMap[maDon]  || 0   // SL đã giao
    const slSoat  = slDaSoatMap[maDon]|| 0   // SL đã đối soát

    // Hủy: tất cả SP bị hủy
    if (spTong > 0 && spHuy === spTong) {
      trangThaiMap[maDon] = 'Huỷ'
      continue
    }

    // Chưa giao gì
    if (slGiao === 0) {
      trangThaiMap[maDon] = 'Chờ giao'
      continue
    }

    // Đã giao hết (SL cần giao = 0)
    const canGiao   = Math.max(0, slDon - slGiao)
    const conPhaiThu  = Number(don['Còn phải thu'] || 0)
    // Thanh toán đủ khi Còn phải thu = 0
    const daThanhToan = conPhaiThu <= 0

    if (canGiao === 0) {
      // Giao hết SP — kiểm tra đối soát và thanh toán
      // Dùng Tình trạng đối soát từ bảng 7 (đáng tin hơn slSoat)
      const ghCuaDon = (giaoHangResult.list || []).filter((g:any) => g['Mã đơn hàng'] === maDon)
      const tatCaDaSoat = ghCuaDon.length > 0 && ghCuaDon.every((g:any) => g['Tình trạng đối soát'] === 'Đã đối soát')

      if (tatCaDaSoat && daThanhToan) {
        trangThaiMap[maDon] = 'Hoàn thành'
      } else if (tatCaDaSoat) {
        trangThaiMap[maDon] = 'Đã giao'
      } else if (slSoat > 0) {
        trangThaiMap[maDon] = 'Đã giao 1 phần'
      } else {
        trangThaiMap[maDon] = 'Đang giao'
      }
      continue
    }

    // Còn SP chưa giao
    if (slGiao < slDon) {
      if (slSoat >= slGiao && slGiao > 0) {
        // Đã đối soát phần đã giao
        trangThaiMap[maDon] = 'Đã giao 1 phần'
      } else {
        trangThaiMap[maDon] = 'Đang giao 1 phần'
      }
      continue
    }

    // Fallback: dùng trạng thái từ NocoDB
    trangThaiMap[maDon] = don['Trạng thái'] || 'Chờ giao'
  }

  return (
    <DonHangClient
      donHang={donHang}
      khachHangMap={khachHangMap}
      trangThaiMap={trangThaiMap}
      user={session!}
      searchParams={searchParams}
    />
  )
}
