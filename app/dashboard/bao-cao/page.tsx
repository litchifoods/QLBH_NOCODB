// app/dashboard/bao-cao/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import BaoCaoClient from '@/components/BaoCaoClient'

export default async function BaoCaoPage() {
  const session = await getSession()
  const [donHang, doiSoat, chiTraNV, thanhToanNCC, chiPhi, baoCao, chiTietDon, nhapKho,
         tamUngNV, thuongKhacNV, caiDat] = await Promise.all([
    getRecords(TABLES.DON_HANG,       { limit: 1000, sort: '-Ngày bán', fields: 'Mã đơn hàng,Ngày bán,Trạng thái,Tổng tiền đơn,Còn phải thu,Kênh bán,Mã NV,Cọc tiền mặt,Cọc chuyển khoản' }),
    getRecords(TABLES.DOI_SOAT,       { limit: 1000, sort: '-Ngày đối soát', fields: 'Mã đơn hàng,Ngày đối soát,Ngày chi trả,Đã thu được,Hình thức thu,Thu tiền mặt,Thu chuyển khoản,Chi phí VC,Chi phí lắp đặt,Thưởng chuyến,Tình trạng đối soát,Đã chi trả,Hình thức thanh toán,Mã NV/Đối tác,Kết quả,Mã đơn hàng' }),
    getRecords(TABLES.CHI_TRA_NV,     { limit: 500,  sort: '-Ngày thanh toán', fields: 'Ngày thanh toán,Tổng chi trả,Hình thức TT,Tháng' }),
    getRecords(TABLES.THANH_TOAN_NCC, { limit: 500,  sort: '-Ngày trả tiền NCC', fields: 'Ngày trả tiền NCC,Số tiền trả,Hình thức' }),
    getRecords(TABLES.CHI_PHI,        { limit: 500,  sort: '-Ngày phát sinh', fields: 'Ngày phát sinh,Số tiền,Hình thức thanh toán,Loại chi phí,Trạng thái,Loại giao dịch,Loại thu' }),
    getRecords(TABLES.BAO_CAO,        { limit: 24,   sort: '-Tháng' }),
    getRecords(TABLES.CHI_TIET_DON,   { limit: 2000, fields: 'Mã đơn hàng,Mã SP,Số lượng,Đơn giá,Giá nhập,Thành tiền,Trạng thái SP' }),
    getRecords(TABLES.NHAP_KHO,        { limit: 2000, fields: 'Id,Mã phiếu nhập,Mã SP,Số lượng thực nhận,Giá nhập thực tế,Ngày nhập,CP vận chuyển về kho,Hình thức TT CP VC,Trạng thái CP VC,Ngày trả CP VC' }),
    getRecords(TABLES.TAM_UNG_NV,      { limit: 1000, fields: 'Ngày tạm ứng,Số tiền,Hình thức' }),
    getRecords(TABLES.THUONG_KHAC,     { limit: 1000, fields: 'Ngày thưởng,Số tiền,Hình thức' }),
    getRecords(TABLES.CAI_DAT,           { limit: 1, fields: 'Id,so_du_tien_mat,so_du_ngan_hang' }),
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
      tamUngNVList={tamUngNV.list||[]}
      thuongKhacNVList={thuongKhacNV.list||[]}
      soDuTienMat={Number(caiDat.list?.[0]?.['so_du_tien_mat']||0)}
      soDuNganHang={Number(caiDat.list?.[0]?.['so_du_ngan_hang']||0)}
      user={session!}
    />
  )
}
