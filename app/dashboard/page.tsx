// app/dashboard/page.tsx
import { getSession } from '@/lib/auth'
import { getRecords, TABLES } from '@/lib/nocodb'
import DashboardClient from '@/components/DashboardClient'

// Lấy dữ liệu cho dashboard
async function getDashboardData() {
  const today = new Date()
  const dd = String(today.getDate()).padStart(2, '0')
  const mm = String(today.getMonth() + 1).padStart(2, '0')
  const yyyy = today.getFullYear()
  const todayStr = `${yyyy}-${mm}-${dd}`
  const thangStr = `${yyyy}-${mm}`

  const [donHang, giaHang, sanPham, khachHang, chiTietDon] = await Promise.all([
    getRecords(TABLES.DON_HANG, { limit: 100, sort: '-Id' }),
    getRecords(TABLES.GIAO_HANG, { limit: 100, sort: '-Ngày giao' }),
    getRecords(TABLES.SAN_PHAM, { limit: 200 }),
    getRecords(TABLES.KHACH_HANG, { limit: 10, sort: '-Ngày tạo' }),
    getRecords(TABLES.CHI_TIET_DON, { limit: 500, fields: 'Mã đơn hàng,Mã SP,Số lượng' }),
  ])

  const tatCaDon = donHang.list || []
  const tatCaGiao = giaHang.list || []
  const tatCaSP = sanPham.list || []

  // Tính doanh thu hôm nay
  const donHomNay = tatCaDon.filter((d: any) => {
    const ngay = d['Ngày bán'] || ''
    return ngay.startsWith(todayStr)
  })
  const doanhThuHomNay = donHomNay
    .filter((d: any) => !['Huỷ','Hủy'].includes(d['Trạng thái']))
    .reduce((s: number, d: any) => s + (Number(d['Tổng tiền đơn']) || 0), 0)

  // Tính doanh thu tháng này
  const donThangNay = tatCaDon.filter((d: any) => {
    const ngay = d['Ngày bán'] || ''
    return ngay.startsWith(thangStr)
  })
  const doanhThuThang = donThangNay
    .filter((d: any) => !['Huỷ','Hủy'].includes(d['Trạng thái']))
    .reduce((s: number, d: any) => s + (Number(d['Tổng tiền đơn']) || 0), 0)
  const daThuthuThang = donThangNay
    .filter((d: any) => d['Trạng thái'] !== 'Huỷ' && d['Trạng thái'] !== 'Hủy')
    .reduce((s: number, d: any) =>
      s + (Number(d['Tổng tiền đơn']||0) - Number(d['Còn phải thu']||0)), 0)

  // Đơn theo trạng thái
  // Chờ giao + Đang giao: tất cả thời gian (đang xử lý)
  // Hoàn thành + Huỷ: chỉ tháng này
  const donMoi       = tatCaDon.filter((d: any) => d['Trạng thái'] === 'Mới' || !d['Trạng thái'])
  const donChoGiao   = tatCaDon.filter((d: any) => ['Chờ giao','Chờ hàng về'].includes(d['Trạng thái']))
  const donDangGiao  = tatCaDon.filter((d: any) => ['Đang giao','Đang giao 1 phần','Giao 1 phần'].includes(d['Trạng thái']))
  const donHoanThanh = donThangNay.filter((d: any) => ['Hoàn thành','Đã giao','Đã thu chưa đối soát'].includes(d['Trạng thái']))
  const donHuy       = donThangNay.filter((d: any) => ['Huỷ','Hủy'].includes(d['Trạng thái']))

  // Cảnh báo giao hàng sắp tới (trong 3 ngày tới)
  const ngayMai = new Date(today)
  ngayMai.setDate(ngayMai.getDate() + 3)
  const donSapGiao = tatCaDon.filter((d: any) => {
    if (d['Trạng thái'] === 'Hoàn thành' || d['Trạng thái'] === 'Huỷ') return false
    if (!d['Ngày hẹn giao']) return false
    const ngayGiao = new Date(d['Ngày hẹn giao'])
    return ngayGiao >= today && ngayGiao <= ngayMai
  }).sort((a: any, b: any) =>
    new Date(a['Ngày hẹn giao']).getTime() - new Date(b['Ngày hẹn giao']).getTime()
  )

  // Sản phẩm cảnh báo tồn kho
  const spHetHang  = tatCaSP.filter((sp: any) => Number(sp['Tồn kho']) === 0 && sp['Loại SP'] === 'Phổ thông')
  const spSapHet   = tatCaSP.filter((sp: any) => {
    const ton = Number(sp['Tồn kho'])
    const nguong = Number(sp['Ngưỡng cảnh báo']) || 3
    return ton > 0 && ton <= nguong
  })

  // Cảnh báo nhập gấp: đơn chưa xong có SP tồn kho <= 0
  const tatCaCT = chiTietDon.list || []
  const spMap: Record<string, number> = {}
  tatCaSP.forEach((sp: any) => { spMap[sp['Mã SP']] = Number(sp['Tồn kho'] ?? 0) })

  const donChuaXong = tatCaDon.filter((d: any) =>
    !['Hoàn thành','Đã giao','Huỷ','Hủy'].includes(d['Trạng thái'] || '')
  )
  const maDonChuaXong = new Set(donChuaXong.map((d: any) => d['Mã đơn hàng']))

  // Tìm đơn có SP tồn kho <= 0
  const donNhapGap: any[] = []
  const daDuyet = new Set<string>()
  tatCaCT.forEach((ct: any) => {
    const maDon = ct['Mã đơn hàng'] || ''
    const maSP  = ct['Mã SP'] || ''
    if (!maDonChuaXong.has(maDon)) return
    if (daDuyet.has(maDon)) return
    const ton = spMap[maSP] ?? 0
    if (ton <= 0 && maSP) {
      const don = donChuaXong.find((d: any) => d['Mã đơn hàng'] === maDon)
      if (don) { donNhapGap.push({ ...don, spThieu: maSP }); daDuyet.add(maDon) }
    }
  })

  // 10 đơn hàng gần nhất
  const donGanNhat = tatCaDon.slice(0, 10)

  // Chuyến giao chưa đối soát
  const giaoChuaDoiSoat = tatCaGiao.filter((g: any) =>
    g['Tình trạng đối soát'] === 'Chưa đối soát'
  )

  return {
    doanhThuHomNay,
    doanhThuThang,
    daThuthuThang,
    tongDon: donThangNay.length,
    donMoi: donMoi.length,
    donChoGiao: donChoGiao.length,
    donDangGiao: donDangGiao.length,
    donHoanThanh: donHoanThanh.length,
    donHuy: donHuy.length,
    donSapGiao,
    donGanNhat,
    donNhapGap,
    spHetHang: spHetHang.length,
    spSapHet: spSapHet.length,
    giaoChuaDoiSoat: giaoChuaDoiSoat.length,
    khachMoi: (khachHang.list || []).length,
    tongKhach: khachHang.pageInfo?.totalRows || 0,
  }
}

export default async function DashboardPage() {
  const session = await getSession()
  const data = await getDashboardData()

  return <DashboardClient user={session!} data={data} />
}
