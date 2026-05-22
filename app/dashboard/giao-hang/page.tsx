// app/dashboard/giao-hang/page.tsx — v4.0
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, chiTietGiao, donHang, chiTietDon, nhanVien, khachHang] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Id' }),
    getRecords(TABLES.CHI_TIET_GIAO, { limit: 1000 }),
    getRecords(TABLES.DON_HANG, { limit: 500, sort: '-Id' }),
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

  const khachHangMap: Record<string, any> = {}
  for (const kh of (khachHang.list || [])) {
    if (kh['Mã KH']) khachHangMap[kh['Mã KH']] = kh
  }

  const donHangMap: Record<string, any> = {}
  for (const d of (donHang.list || [])) {
    if (d['Mã đơn hàng']) donHangMap[d['Mã đơn hàng']] = d
  }

  const chiTietDonMap: Record<string, any[]> = {}
  for (const ct of (chiTietDon.list || [])) {
    const maDon = ct['Mã đơn hàng']
    if (!maDon) continue
    if (!chiTietDonMap[maDon]) chiTietDonMap[maDon] = []
    chiTietDonMap[maDon].push(ct)
  }

  const daGiaoMap: Record<string, Record<string, number>> = {}
  for (const ct of (chiTietGiao.list || [])) {
    const maDon = ct['Mã đơn hàng']
    const maCT  = ct['Mã chi tiết đơn'] || ct['Tên SP (ghi nhanh)']
    if (maDon && maCT) {
      if (!daGiaoMap[maDon]) daGiaoMap[maDon] = {}
      daGiaoMap[maDon][maCT] = (daGiaoMap[maDon][maCT] || 0) + Number(ct['Số lượng giao đợt này'] || 0)
    }
  }

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

  // donChuaGiao — cho dropdown tạo chuyến
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

  // ✅ donCanGiao — đơn hình thức "Giao hàng cho khách", chưa Hoàn thành/Huỷ
  // Sort: không có ngày hẹn giao lên đầu, sau đó sort tăng dần theo ngày hẹn
  const donCanGiao = (donHang.list || [])
    .filter((d: any) =>
      d['Mã đơn hàng']?.trim() &&
      d['Hình thức giao hàng'] === 'Giao hàng cho khách' &&
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
    .sort((a: any, b: any) => {
      const ngayA = a['Ngày hẹn giao']
      const ngayB = b['Ngày hẹn giao']
      // Không có ngày hẹn → lên đầu
      if (!ngayA && !ngayB) return 0
      if (!ngayA) return -1
      if (!ngayB) return 1
      return new Date(ngayA).getTime() - new Date(ngayB).getTime()
    })

  return (
    <GiaoHangClient
      giaoHangList={giaoHang.list || []}
      chiTietDonMap={chiTietDonMap}
      daGiaoMap={daGiaoMap}
      donChuaGiao={donChuaGiao}
      donCanGiao={donCanGiao}
      donHangMap={donHangMap}
      danhSachNVCuaHang={danhSachNVCuaHang}
      danhSachDoiTac={danhSachDoiTac}
      khachHangMap={khachHangMap}
      user={session!}
    />
  )
}
