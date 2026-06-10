const fs = require('fs')
const f = 'app/dashboard/don-hang/[maDon]/page.tsx'
let c = fs.readFileSync(f, 'utf8')

// Bỏ fields filter cho DON_HANG query — trả về tất cả fields
const old1 = `getRecords(TABLES.DON_HANG, { where:\`(Mã đơn hàng,eq,\${maDon})\`, limit:1,
      fields:'Id,Mã đơn hàng,Mã KH,Tên khách hàng,Ngày bán,Ngày đặt,Kênh bán,Hình thức giao hàng,Ngày hẹn giao,Địa chỉ giao,Tổng tiền đơn,Đặt cọc,Hình thức cọc,Còn phải thu,CP giao hàng,CP đổi trả,Trạng thái,Nhân viên bán,Mã NV,Ghi chú,Xuất hóa đơn,Tiền hoàn cọc,Tình trạng hoàn cọc,Giảm giá,Loại giảm giá,Giá trị giảm' }),`
const new1 = `getRecords(TABLES.DON_HANG, { where:\`(Mã đơn hàng,eq,\${maDon})\`, limit:1 }),`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK fix fields') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
