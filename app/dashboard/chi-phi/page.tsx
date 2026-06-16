// app/dashboard/chi-phi/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import ChiPhiClient from '@/components/ChiPhiClient'

export default async function ChiPhiPage() {
  const session = await getSession()
  const [data, nvData, donHangData, doiSoatData, ttNccData, chiTraNvData, caiDatData,
         tamUngNVData, thuongKhacNVData, nhapKhoData] = await Promise.all([
    getRecords(TABLES.CHI_PHI, { limit: 500, sort: '-Ngày phát sinh,-Id', fields: 'Id,Mã chi phí,Ngày phát sinh,Nội dung,Loại chi phí,Số tiền,Hình thức thanh toán,Trạng thái,Loại giao dịch,Loại thu,Người chi,Mã đơn hàng' }),
    getRecords(TABLES.NHAN_VIEN, { limit: 200, fields: 'Mã nhân viên,Họ và Tên,Loại' }),
    getRecords(TABLES.DON_HANG, {
      limit: 1000, sort: '-Ngày bán',
      fields: 'Mã đơn hàng,Ngày bán,Mã KH,Đặt cọc,Hình thức cọc,Cọc tiền mặt,Cọc chuyển khoản,Tiền hoàn cọc,Hình thức hoàn cọc,Tình trạng hoàn cọc,Ngày hoàn cọc,Trạng thái',
    }),
    getRecords(TABLES.DOI_SOAT, {
      limit: 1000, sort: '-Id',
      fields: 'Mã giao hàng,Mã đơn hàng,Đã thu được,Hình thức thu,Thu tiền mặt,Thu chuyển khoản,Chi phí VC,Chi phí lắp đặt,Thưởng chuyến,Kết quả,Tình trạng đối soát,Ngày đối soát,Hình thức thanh toán,Đã chi trả,Ngày chi trả,Mã NV/Đối tác,Tên NV/đối tác giao hàng',
    }),
    getRecords(TABLES.THANH_TOAN_NCC, {
      limit: 500, sort: '-Ngày trả tiền NCC',
      fields: 'Mã thanh toán,Mã NCC,Ngày trả tiền NCC,Số tiền trả,Hình thức,Nội dung,Trạng thái,Người trả',
    }),
    getRecords(TABLES.CHI_TRA_NV, {
      limit: 500, sort: '-Id',
      fields: 'Mã NV/đối tác,Tên NV/đối tác,Tháng,Tổng chi trả,Hình thức TT,Ngày thanh toán,Trạng thái,Vai trò,Ghi chú',
    }),
    getRecords(TABLES.CAI_DAT, { limit: 1 }),
    getRecords(TABLES.TAM_UNG_NV, {
      limit: 1000, sort: '-Id',
      fields: 'Id,Mã NV/đối tác,Tên NV,Tháng,Ngày tạm ứng,Số tiền,Hình thức',
    }),
    getRecords(TABLES.THUONG_KHAC, {
      limit: 1000, sort: '-Id',
      fields: 'Id,Mã nhân viên,Tên NV,Tháng,Loại thưởng,Số tiền,Hình thức,Ngày thưởng',
    }),
    getRecords(TABLES.NHAP_KHO, {
      limit: 1000, sort: '-Id',
      fields: 'Id,Mã phiếu nhập,Ngày nhập,Ngày trả CP VC,CP vận chuyển về kho,Hình thức TT CP VC,Trạng thái CP VC',
    }),
  ])

  const caiDat = caiDatData.list?.[0] || {}

  // Map Mã NCC → Tên NCC
  const nccData = await getRecords(TABLES.NHA_CUNG_CAP, { limit: 200, fields: 'Mã NCC,Tên NCC' })
  const nccMap: Record<string,string> = {}
  for (const ncc of (nccData.list||[])) { nccMap[ncc['Mã NCC']] = ncc['Tên NCC'] }

  // Map Mã đơn hàng → Tên KH (từ donHangData)
  const donHangMap: Record<string,string> = {}
  const khData = await getRecords(TABLES.KHACH_HANG, { limit: 500, fields: 'Mã KH,Tên khách hàng' })
  const khMap: Record<string,string> = {}
  for (const kh of (khData.list||[])) { khMap[kh['Mã KH']] = kh['Tên khách hàng'] || kh['Mã KH'] || '' }
  for (const don of (donHangData.list||[])) { donHangMap[don['Mã đơn hàng']] = khMap[don['Mã KH']] || don['Mã KH'] || '' }

  return (
    <ChiPhiClient
      chiPhiList={data.list || []}
      nvList={nvData.list || []}
      donHangList={donHangData.list || []}
      doiSoatList={doiSoatData.list || []}
      ttNccList={ttNccData.list || []}
      chiTraNvList={chiTraNvData.list || []}
      tamUngNVList={tamUngNVData.list || []}
      nhapKhoList={nhapKhoData.list || []}
      thuongKhacNVList={thuongKhacNVData.list || []}
      soDuTienMat={Number(caiDat['so_du_tien_mat'] || 0)}
      soDuNganHang={Number(caiDat['so_du_ngan_hang'] || 0)}
      ngayBatDau={caiDat['ngay_bat_dau'] || ''}
      caiDatId={caiDat['Id'] || caiDat['id'] || null}
      nccMap={nccMap}
      donHangMap={donHangMap}
      user={session!}
    />
  )
}
