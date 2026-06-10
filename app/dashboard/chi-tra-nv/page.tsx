import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getRecords, TABLES } from '@/lib/nocodb'
import ChiTraNVClient from '@/components/ChiTraNVClient'

export const dynamic = 'force-dynamic'

export default async function ChiTraNVPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const [nvResult, doiSoatResult, giaoHangResult, donHangResult,
         khachHangResult, chamCongResult, tamUngResult,
         thuongKhacResult, chiTraResult] = await Promise.all([
    getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: '-Id',
      fields: 'Id,Mã nhân viên,Họ và Tên,Loại,Vai trò,Lương cơ bản,% Thưởng DS,Hình thức lương,Ngày phép/tháng,Trạng thái'
    }),
    getRecords(TABLES.DOI_SOAT, {
      limit: 2000, sort: '-Id',
      fields: 'Id,Mã đối soát,Mã giao hàng,Mã NV/Đối tác,Chi phí VC,Chi phí lắp đặt,Thưởng chuyến,Kết quả,Ngày đối soát,Tình trạng đối soát,Đã chi trả'
    }),
    getRecords(TABLES.GIAO_HANG, {
      limit: 2000, sort: '-Id',
      fields: 'Id,Mã giao hàng,Mã đơn hàng,Mã NV/đối tác,Ngày giao'
    }),
    getRecords(TABLES.DON_HANG, {
      limit: 2000, sort: '-Id',
      fields: 'Id,Mã đơn hàng,Mã KH,Mã NV,Tổng tiền đơn,Trạng thái,Ngày bán'
    }),
    getRecords(TABLES.KHACH_HANG, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã KH,Tên khách hàng,Địa chỉ,Số điện thoại'
    }),
    getRecords(TABLES.CHAM_CONG, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã NV,Tháng,Tổng ngày công chuẩn,Số ngày công thực tế'
    }),
    getRecords(TABLES.TAM_UNG_NV, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã NV/đối tác,Tháng,Số tiền,Ngày tạm ứng'
    }),
    getRecords(TABLES.THUONG_KHAC, {
      limit: 500, sort: '-Id',
      fields: 'Id,Mã nhân viên,Tháng,Số tiền,Loại thưởng'
    }),
    getRecords(TABLES.CHI_TRA_NV, {
      limit: 500, sort: '-Id',
      fields: 'Id,Tháng,Mã NV/đối tác,Tên NV/đối tác,Trạng thái,Hình thức TT,Ngày thanh toán,Tổng chi trả,Ghi chú'
    }),
  ])

  return (
    <ChiTraNVClient
      nvList={nvResult.list||[]}
      doiSoatList={doiSoatResult.list||[]}
      giaoHangList={giaoHangResult.list||[]}
      donHangList={donHangResult.list||[]}
      khachHangList={khachHangResult.list||[]}
      chamCongList={chamCongResult.list||[]}
      tamUngList={tamUngResult.list||[]}
      thuongKhacList={thuongKhacResult.list||[]}
      chiTraList={chiTraResult.list||[]}
      user={session}
    />
  )
}
