// app/dashboard/bao-cao/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import BaoCaoClient from '@/components/BaoCaoClient'

export default async function BaoCaoPage() {
  const session = await getSession()
  const [donHang, doiSoat, chiTraNV, thanhToanNCC, chiPhi, baoCao, chiTietDon, nhapKho] = await Promise.all([
    getRecords(TABLES.DON_HANG,       { limit: 1000, sort: '-Ngày bán', fields: 'Mã đơn hàng,Ngày bán,Trạng thái,Tổng tiền đơn,Còn phải thu,Kênh bán,Mã NV' }),
    getRecords(TABLES.DOI_SOAT,       { limit: 1000, sort: '-Ngày đối soát', fields: 'Ngày đối soát,Ngày chi trả,Đã thu được,Hình thức thu,Chi phí VC,Chi phí lắp đặt,Thưởng chuyến,Tình trạng đối soát,Đã chi trả' }),
    getRecords(TABLES.CHI_TRA_NV,     { limit: 500,  sort: '-Ngày thanh toán', fields: 'Ngày thanh toán,Tổng chi trả,Hình thức TT,Tháng' }),
    getRecords(TABLES.THANH_TOAN_NCC, { limit: 500,  sort: '-Ngày trả tiền NCC', fields: 'Ngày trả tiền NCC,Số tiền trả,Hình thức' }),
    getRecords(TABLES.CHI_PHI,        { limit: 500,  sort: '-Ngày phát sinh', fields: 'Ngày phát sinh,Số tiền,Hình thức thanh toán,Loại chi phí,Trạng thái' }),
    getRecords(TABLES.BAO_CAO,        { limit: 24,   sort: '-Tháng' }),
    getRecords(TABLES.CHI_TIET_DON,   { limit: 2000, fields: 'Mã đơn hàng,Mã SP,Số lượng,Đơn giá,Giá nhập,Thành tiền,Trạng thái SP' }),
    getRecords(TABLES.NHAP_KHO,        { limit: 2000, fields: 'Mã SP,Số lượng thực nhận,Giá nhập thực tế,Ngày nhập' }),
  ])
  return (
    <BaoCaoClient
      donHangList={donHang.list||[]}
      doiSoatList={doiSoat.list||[]}
      chiTraNVList={chiTraNV.list||[]}
      thanhToanNCCList={thanhToanNCC.list||[]}
      chiPhiList={chiPhi.list||[]}
      baoCaoList={baoCao.list||[]}
      chiTietDonList={chiTietDon.list||[]}
      nhapKhoList={nhapKho.list||[]}
      user={session!}
    />
  )
}
