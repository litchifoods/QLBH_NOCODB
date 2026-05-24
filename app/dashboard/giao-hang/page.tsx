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
    getRecords(TABLES.NHAN_VIEN, { limit: 200 }),
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
  // ✅ Đúng tên cột: "Mã Nhân Viên" và "Họ và Tên"
  for (const nv of (nhanVien.list || [])) {
    const ma  = nv['Mã Nhân Viên']
    const ten = (nv['Họ và Tên'] || '').trim()
    if (!ma || !ten) continue
    if (!nvMapTemp[ma] || (nv['Tháng']||'') > (nvMapTemp[ma]['Tháng']||'')) {
      nvMapTemp[ma] = nv
    }
  }
  const danhSachNV = Object.values(nvMapTemp).map((nv:any) => ({
    ...nv,
    'Mã NV':  nv['Mã Nhân Viên'],
    'Họ tên': nv['Họ và Tên'] || '',
  }))
  const danhSachNVCuaHang = danhSachNV.filter((nv:any) => (nv['Mã NV']||'').startsWith('NV-'))
  const danhSachDoiTac    = danhSachNV.filter((nv:any) => (nv['Mã NV']||'').startsWith('DT-'))

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

  // ✅ donCanGiao — đơn "Giao hàng cho khách", chưa Hoàn thành/Huỷ
  // Bao gồm cả "Đang giao" nếu còn SP chưa giao hết
  const donCanGiao = (donHang.list || [])
    .filter((d: any) => {
      if (!d['Mã đơn hàng']?.trim()) return false
      if (d['Hình thức giao hàng'] !== 'Giao hàng cho khách') return false
      if (d['Trạng thái'] === 'Hoàn thành' || d['Trạng thái'] === 'Huỷ') return false

      // Nếu "Đang giao" — kiểm tra xem còn SP chưa giao không
      if (d['Trạng thái'] === 'Đang giao') {
        const maDon    = d['Mã đơn hàng']
        const chiTiet  = chiTietDonMap[maDon] || []
        const daGiao   = daGiaoMap[maDon] || {}
        // Tính tổng SL đơn vs SL đã giao
        const tongSLDon  = chiTiet.reduce((s:number, ct:any) => s + Number(ct['Số lượng']||1), 0)
        const tongSLGiao = Object.values(daGiao).reduce((s:number, v:any) => s + Number(v||0), 0)
        return tongSLGiao < tongSLDon // Còn SP chưa giao hết
      }
      return true // "Chờ giao" luôn hiện
    })
    .map((d: any) => {
      const kh = khachHangMap[d['Mã KH']] || {}
      const maDon   = d['Mã đơn hàng']
      const chiTiet = chiTietDonMap[maDon] || []
      const daGiao  = daGiaoMap[maDon] || {}
      // Đánh dấu đã giao 1 phần để hiển thị khác ở dropdown
      const tongSP  = chiTiet.reduce((s:number,ct:any)=>s+Number(ct['Số lượng']||1),0)
      const tongDaGiao = Object.values(daGiao).reduce((s:number,v:any)=>s+Number(v||0),0)
      return {
        ...d,
        '_tenKH':      kh['Tên khách hàng'] || d['Tên khách hàng'] || '',
        '_sdtKH':      kh['Số điện thoại'] || '',
        '_diaChiKH':   d['Địa chỉ giao'] || kh['Địa chỉ'] || '',
        '_daGiao1Phan': d['Trạng thái'] === 'Đang giao' && tongDaGiao > 0,
        '_tongSP':     tongSP,
        '_tongDaGiao': tongDaGiao,
      }
    })
    .sort((a: any, b: any) => {
      // "Chờ giao" lên trước "Đang giao"
      if (a['Trạng thái'] !== b['Trạng thái']) {
        if (a['Trạng thái'] === 'Chờ giao') return -1
        if (b['Trạng thái'] === 'Chờ giao') return 1
      }
      const ngayA = a['Ngày hẹn giao']
      const ngayB = b['Ngày hẹn giao']
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
