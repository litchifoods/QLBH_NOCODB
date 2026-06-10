const fs = require('fs')
const f = 'app/api/chi-phi/route.ts'
let c = fs.readFileSync(f, 'utf8')

// Thêm Loại giao dịch và Loại thu vào POST
const old1 = `      'Ghi chú':               body.ghiChu || '',
    })`
const new1 = `      'Ghi chú':               body.ghiChu || '',
      'Loại giao dịch':        body.loaiGiaoDich || 'Chi',
      'Loại thu':              body.loaiThu || '',
      'Mã đơn hàng':           body.maDonHang || '',
    })`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK POST') }
else console.log('FAIL POST')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
