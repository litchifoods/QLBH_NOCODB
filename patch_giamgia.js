const fs = require('fs')
const f = 'components/TaoDonHangForm.tsx'
let c = fs.readFileSync(f, 'utf8')

// Sửa lưu Tổng tiền đơn = tongTien - soTienGiam
const old1 = `'Tổng tiền đơn':tongTien,`
const new1 = `'Tổng tiền đơn':tongTien-soTienGiam,`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. Tổng tiền đơn') }
else console.log('FAIL 1.')

// Sửa mode sửa đơn cũng dùng tongTien-soTienGiam
const old2 = `'Tổng tiền đơn': tongTien-soTienGiam,`
if (c.includes(old2)) console.log('OK 2. mode sửa đã đúng')
else {
  // Tìm trong mode sửa
  const old2b = `'Tổng tiền đơn': tongTien,`
  if (c.includes(old2b)) { c = c.replace(old2b, `'Tổng tiền đơn': tongTien-soTienGiam,`); console.log('OK 2. mode sửa') }
  else console.log('SKIP 2. không tìm thấy')
}

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
