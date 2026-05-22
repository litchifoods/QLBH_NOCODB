// app/dashboard/giao-hang/page.tsx — v3.5
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, chiTietGiao, donHang, chiTietDon, nhanVien, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Id' }),
    getRecords(TABLES.CHI_TIET_GIAO, { limit: 1000 }),
    // ✅ Bỏ fields filter — lấy toàn bộ để có đủ Mã KH, Địa chỉ giao
    getRecords(TABLES.DON_HANG, { limit: 500, sort: 'Id' }),
    // ✅ Sort Id tăng — dữ liệu thực (Id nhỏ) lên trước, null (Id lớn) ở sau
    getRecords(TABLES.CHI_TIET_DON, {
      limit: 500, sort: 'Id',
      fields: 'Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Ghi chú SP',
    }),
    getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: 'Mã NV',
      fields: 'Mã NV,Họ tên,Vai trò,Số điện thoại,Tháng',
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
  ])

  // Map KH
  const khachHangMap: Record<string, any> = {}
  for (const kh of (khachHang.list || [])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }

  // Map đơn hàng — toàn bộ fields
  const donHangMap: Record<string, any> = {}
  for (const d of (donHang.list || [])) {
    if (d['Mã đơn hàng']) donHangMap[d['Mã đơn hàng']] = d
  }

  // Map chi tiết đơn — lọc null
  const chiTietDonMap: Record<string, any[]> = {}
  for (const ct of (chiTietDon.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (!maDon) continue
    if (!chiTietDonMap[maDon]) chiTietDonMap[maDon] = []
    chiTietDonMap[maDon].push(ct)
  }

  // Map đã giao
  const daGiaoMap: Record<string, Record<string, number>> = {}
  for (const ct of (chiTietGiao.list || [])) {
    const maDon = ct['Mã đơn hàng']
    const maCT  = ct['Mã chi tiết đơn'] || ct['Tên SP (ghi nhanh)']
    if (maDon && maCT) {
      if (!daGiaoMap[maDon]) daGiaoMap[maDon] = {}
      daGiaoMap[maDon][maCT] = (daGiaoMap[maDon][maCT] || 0) + Number(ct['Số lượng giao đợt này'] || 0)
    }
  }

  // Xử lý NV
  const nvMapTemp: Record<string, any> = {}
  for (const nv of (nhanVien.list || [])) {
    const ma = nv['Mã NV']
    if (!ma) continue
    if (!nvMapTemp[ma] || (nv['Tháng']||'') > (nvMapTemp[ma]['Tháng']||'')) {
      nvMapTemp[ma] = nv
    }
  }
  const danhSachNV        = Object.values(nvMapTemp)
  const danhSachNVCuaHang = danhSachNV.filter(nv => (nv['Mã NV']||'').startsWith('NV-'))
  const danhSachDoiTac    = danhSachNV.filter(nv => (nv['Mã NV']||'').startsWith('DT-'))

  // donChuaGiao — gắn thêm info KH để search
  const donChuaGiao = (donHang.list || [])
    .filter((d: any) =>
      d['Mã đơn hàng']?.trim() &&
      d['Trạng thái'] !== 'Hoàn thành' &&
      d['Trạng thái'] !== 'Huỷ'
    )
    .map((d: any) => {
      const kh = khachHangMap[d['Mã KH']] || {}
      return {
        ...d,
        '_tenKH':    kh['Tên khách hàng'] || d['Tên khách hàng'] || '',
        '_sdtKH':    kh['Số điện thoại'] || '',
        '_diaChiKH': d['Địa chỉ giao'] || kh['Địa chỉ'] || '',
      }
    })

  return (
    <GiaoHangClient
      giaoHangList={giaoHang.list || []}
      chiTietDonMap={chiTietDonMap}
      daGiaoMap={daGiaoMap}
      donChuaGiao={donChuaGiao}
      donHangMap={donHangMap}
      danhSachNVCuaHang={danhSachNVCuaHang}
      danhSachDoiTac={danhSachDoiTac}
      khachHangMap={khachHangMap}
      user={session!}
    />
  )
}
