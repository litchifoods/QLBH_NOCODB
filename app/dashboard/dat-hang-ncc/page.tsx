// app/dashboard/dat-hang-ncc/page.tsx
export const dynamic = 'force-dynamic'
import { getRecords, TABLES } from '@/lib/nocodb'
import { getSession } from '@/lib/auth'
import DatHangNCCClient from '@/components/DatHangNCCClient'

export default async function DatHangNCCPage() {
  const session = await getSession()
  console.log('[NCC-PAGE] loading...')
  const [donDH, ncc, sanPham] = await Promise.all([
    getRecords(TABLES.DAT_HANG_NCC, {
      limit: 500, sort: '-Id',
      // fields sẽ load sau khi biết đúng tên cột
    }),
    getRecords(TABLES.NHA_CUNG_CAP, {
      limit: 200,
      fields: 'Id,Mã NCC,Tên NCC,Số điện thoại,Địa chỉ,Số TK ngân hàng,Ghi chú',
    }),
    getRecords(TABLES.SAN_PHAM, {
      limit: 500,
      fields: 'Id,Mã SP,Tên sản phẩm,Đơn vị tính,Giá bán buôn',
    }),
  ])
  console.log('[NCC-PAGE] ncc fields:', Object.keys(ncc.list?.[0]||{}))
  console.log('[NCC-PAGE] don fields:', Object.keys(donDH.list?.[0]||{}))
  console.log('[NCC-PAGE] ncc count:', ncc.list?.length, 'don count:', donDH.list?.length)
  return (
    <DatHangNCCClient
      donDHList={donDH.list||[]}
      nccList={ncc.list||[]}
      sanPhamList={sanPham.list||[]}
      user={session!}
    />
  )
}
