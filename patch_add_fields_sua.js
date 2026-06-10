const fs = require('fs')
const f = 'app/dashboard/don-hang/[maDon]/page.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `      fields:'Id,Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP,Trạng thái SP',`
const new1 = `      fields:'Id,Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP,Trạng thái SP,Sửa giá,Sửa số lượng',`

if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
