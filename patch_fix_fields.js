const fs = require('fs')
const f = 'app/dashboard/don-hang/[maDon]/page.tsx'
let c = fs.readFileSync(f, 'utf8')

// Bỏ Sửa giá, Sửa số lượng khỏi fields query
const old1 = `      fields:'Id,Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP,Trạng thái SP,Sửa giá,Sửa số lượng',`
const new1 = `      fields:'Id,Mã chi tiết,Mã đơn hàng,Mã SP,Tên SP (ghi nhanh),Số lượng,Đơn giá,Thành tiền,Ghi chú SP,Trạng thái SP',`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK fix fields') }
else console.log('FAIL')

// Xóa debug log
const old2 = `  console.log('[DEBUG chiTiet total]', chiTietResult.list?.length, chiTietResult.list?.[0])\n  `
const new2 = `  `
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK remove debug') }
else console.log('FAIL remove debug')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
