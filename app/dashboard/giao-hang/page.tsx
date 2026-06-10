// app/dashboard/giao-hang/page.tsx — v4.0
export const dynamic = 'force-dynamic'

import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import GiaoHangClient from '@/components/GiaoHangClient'

export default async function GiaoHangPage() {
  const session = await getSession()

  const [giaoHang, chiTietGiao, donHang, chiTietDon, nhanVien, khachHang, sanPham] = await Promise.all([
    getRecords(TABLES.GIAO_HANG, { limit: 500, sort: '-Id' }),
    getRecords(TABLES.CHI_TIET_GIAO, { limit: 1000 }),
    getRecords(TABLES.DON_HANG, { limit: 500, sort: '-Id' }),
    getRecords(TABLES.CHI_TIET_DON, {
      limit: 500, sort: 'Id',
      fields: 'Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Ghi chú SP,Trạng thái SP',
    }),
    getRecords(TABLES.NHAN_VIEN, { limit: 200, fields: 'Id,Mã nhân viên,Họ và Tên,Vai trò,Loại,Trạng thái' }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500,
      fields: 'Mã KH,Tên khách hàng,Số điện thoại,Địa chỉ',
    }),
    getRecords(TABLES.SAN_PHAM, { limit:500, fields:'Mã SP,Tồn kho' }),
  ])

  const tonKhoMap: Record<string,number> = {}
  for (const sp of (sanPham.list||[])) { if(sp['Mã SP']) tonKhoMap[sp['Mã SP']]=Number(sp['Tồn kho']||0) }
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
    const ma  = nv['Mã nhân viên']
    const ten = (nv['Họ và Tên'] || '').trim()
    if (!ma || !ten) continue
    if (!nvMapTemp[ma] || (nv['Tháng']||'') > (nvMapTemp[ma]['Tháng']||'')) {
      nvMapTemp[ma] = nv
    }
  }
  const danhSachNV = Object.values(nvMapTemp).map((nv:any) => ({
    ...nv,
    'Mã NV':  nv['Mã nhân viên'],
    'Họ tên': nv['Họ và Tên'] || '',
  }))
  // Giao hàng + Đối soát cần cả NV lẫn Đối tác
  const danhSachNVCuaHang = danhSachNV.filter((nv:any) => nv['Loại']==='Nhân viên')
  const danhSachDoiTac    = danhSachNV.filter((nv:any) => nv['Loại']==='Đối tác')

  // Tính trạng thái chi tiết cho từng đơn
  function tinhTrangThaiDon(maDon: string): string {
    const ctDon  = chiTietDonMap[maDon] || []
    const spTong = ctDon.length
    const spHuy  = ctDon.filter((ct:any) => ct['Trạng thái SP'] === 'Huỷ').length
    if (spTong > 0 && spHuy === spTong) return 'Huỷ'
    const slDon = ctDon
      .filter((ct:any) => ct['Trạng thái SP'] !== 'Huỷ')
      .reduce((s:number, ct:any) => s + Number(ct['Số lượng']||1), 0)
    const ctGiao   = (chiTietGiao.list||[]).filter((ct:any) => ct['Mã đơn hàng'] === maDon)
    const slGiao   = ctGiao.reduce((s:number, ct:any) => s + Number(ct['Số lượng giao đợt này']||0), 0)
    if (slGiao === 0) return 'Chờ giao'
    const ghDon    = (giaoHang.list||[]).filter((gh:any) => gh['Mã đơn hàng'] === maDon)
    const maGHSoat = new Set(ghDon.filter((gh:any) => gh['Tình trạng đối soát']==='Đã đối soát').map((gh:any)=>gh['Mã giao hàng']))
    const slSoat   = ctGiao.filter((ct:any) => maGHSoat.has(ct['Mã giao hàng'])).reduce((s:number,ct:any)=>s+Number(ct['Số lượng giao đợt này']||0),0)
    const canGiao  = Math.max(0, slDon - slGiao)
    if (canGiao === 0) {
      if (slSoat >= slDon) return 'Đã giao'
      if (slSoat > 0)      return 'Đã giao 1 phần'
      return 'Đang giao'
    }
    if (slSoat > 0) return 'Đã giao 1 phần'
    return 'Đang giao 1 phần'
  }

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

      // Đơn "Đang giao"
      if (d['Trạng thái'] === 'Đang giao') {
        const maDon     = d['Mã đơn hàng']
        const chiTiet   = chiTietDonMap[maDon] || []
        const tongSLDon = chiTiet
          .filter((ct:any) => ct['Trạng thái SP'] !== 'Huỷ')
          .reduce((s:number, ct:any) => s + Number(ct['Số lượng']||1), 0)

        // Dùng cùng logic với _tongDaGiao: tính từ chiTietGiao.list
        const ctGiaoCuaDon = (chiTietGiao.list||[]).filter((ct:any) => ct['Mã đơn hàng'] === maDon)
        const tongSLGiao   = ctGiaoCuaDon.reduce((s:number, ct:any) => s + Number(ct['Số lượng giao đợt này']||0), 0)

        // Còn SP chưa giao → hiện để tạo chuyến mới
        if (tongSLGiao < tongSLDon) return true

        // Giao hết → kiểm tra còn chuyến chưa đối soát không
        const ghCuaDon    = (giaoHang.list||[]).filter((gh:any) => gh['Mã đơn hàng'] === maDon)
        const conChuaSoat = ghCuaDon.some((gh:any) => gh['Tình trạng đối soát'] !== 'Đã đối soát')

        // Giao hết nhưng chưa đối soát → ẩn (chuyển sang Đối soát)
        // Giao hết và đối soát hết → ẩn (hoàn thành)
        return false
      }
      return true // "Chờ giao" luôn hiện
    })
    .map((d: any) => {
      const kh = khachHangMap[d['Mã KH']] || {}
      const maDon   = d['Mã đơn hàng']
      const chiTiet = chiTietDonMap[maDon] || []
      const daGiao  = daGiaoMap[maDon] || {}
      // Đánh dấu đã giao 1 phần để hiển thị khác ở dropdown
      const tongSP     = chiTiet.filter((ct:any)=>ct['Trạng thái SP']!=='Huỷ').reduce((s:number,ct:any)=>s+Number(ct['Số lượng']||1),0)
      const ctGiaoD    = (chiTietGiao.list||[]).filter((ct:any)=>ct['Mã đơn hàng']===maDon)
      const tongDaGiao = ctGiaoD.reduce((s:number,ct:any)=>s+Number(ct['Số lượng giao đợt này']||0),0)
      return {
        ...d,
        '_tenKH':       kh['Tên khách hàng'] || d['Tên khách hàng'] || '',
        '_sdtKH':       kh['Số điện thoại'] || '',
        '_diaChiKH':    d['Địa chỉ giao'] || kh['Địa chỉ'] || '',
        '_daGiao1Phan': tongDaGiao > 0 && Math.max(0, tongSP - tongDaGiao) > 0,
        '_tongSP':      tongSP,
        '_tongDaGiao':  tongDaGiao,
        '_conLai':      Math.max(0, tongSP - tongDaGiao),
        '_trangThaiTinh': tinhTrangThaiDon(maDon),
        '_choHangVe': chiTiet.filter((ct:any)=>ct['Trạng thái SP']!=='Huỷ').some((ct:any)=>Number(tonKhoMap[ct['Mã SP']]||0)<=0),
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

