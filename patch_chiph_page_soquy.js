const fs = require('fs')
const f = 'app/dashboard/chi-phi/page.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `// app/dashboard/chi-phi/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import ChiPhiClient from '@/components/ChiPhiClient'

export default async function ChiPhiPage() {
  const session = await getSession()
  const [data, nvData] = await Promise.all([
    getRecords(TABLES.CHI_PHI, { limit: 500, sort: '-Ngày phát sinh' }),
    getRecords(TABLES.NHAN_VIEN, { limit: 200, fields: 'Mã nhân viên,Họ và Tên,Loại' }),
  ])
  return <ChiPhiClient chiPhiList={data.list || []} nvList={nvData.list || []} user={session!} />
}`
const new1 = `// app/dashboard/chi-phi/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import ChiPhiClient from '@/components/ChiPhiClient'

export default async function ChiPhiPage() {
  const session = await getSession()
  const [data, nvData, donHangData, doiSoatData, ttNccData, chiTraNvData, caiDatData] = await Promise.all([
    getRecords(TABLES.CHI_PHI, { limit: 500, sort: '-Ngày phát sinh' }),
    getRecords(TABLES.NHAN_VIEN, { limit: 200, fields: 'Mã nhân viên,Họ và Tên,Loại' }),
    getRecords(TABLES.DON_HANG, {
      limit: 1000, sort: '-Ngày bán',
      fields: 'Mã đơn hàng,Ngày bán,Tên khách hàng,Đặt cọc,Hình thức cọc,Tiền hoàn cọc,Hình thức hoàn cọc,Tình trạng hoàn cọc,Trạng thái',
    }),
    getRecords(TABLES.DOI_SOAT, {
      limit: 1000, sort: '-Id',
      fields: 'Mã giao hàng,Mã đơn hàng,Đã thu được,Hình thức thu,Chi phí VC,Chi phí lắp đặt,Kết quả,Id',
    }),
    getRecords(TABLES.THANH_TOAN_NCC, {
      limit: 500, sort: '-Ngày trả tiền NCC',
      fields: 'Mã thanh toán,Mã NCC,Ngày trả tiền NCC,Số tiền trả,Hình thức,Nội dung,Trạng thái',
    }),
    getRecords(TABLES.CHI_TRA_NV, {
      limit: 500, sort: '-Id',
      fields: 'Mã nhân viên,Họ và Tên,Tháng,Tổng lương,Hình thức TT,Ngày thanh toán,Ghi chú',
    }),
    getRecords(TABLES.CAI_DAT, { limit: 1 }),
  ])

  const caiDat = caiDatData.list?.[0] || {}

  return (
    <ChiPhiClient
      chiPhiList={data.list || []}
      nvList={nvData.list || []}
      donHangList={donHangData.list || []}
      doiSoatList={doiSoatData.list || []}
      ttNccList={ttNccData.list || []}
      chiTraNvList={chiTraNvData.list || []}
      soDuTienMat={Number(caiDat['so_du_tien_mat'] || 0)}
      soDuNganHang={Number(caiDat['so_du_ngan_hang'] || 0)}
      ngayBatDau={caiDat['ngay_bat_dau'] || ''}
      caiDatId={caiDat['Id'] || caiDat['id'] || null}
      user={session!}
    />
  )
}`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
