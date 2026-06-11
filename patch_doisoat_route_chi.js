const fs = require('fs')
const f = 'app/api/doi-soat/route.ts'
let c = fs.readFileSync(f, 'utf8')

const old1 = `      'Thưởng chuyến':            thuongChuyen || 0,
      'Kết quả':                  ketQua || 'Thành công',`
const new1 = `      'Thưởng chuyến':            thuongChuyen || 0,
      'Hình thức thanh toán':     body.hinhThucChi || 'Tiền mặt',
      'Kết quả':                  ketQua || 'Thành công',`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
