const fs = require('fs')
const f = 'app/dashboard/don-hang/page.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `    const maDon   = don['Mã đơn hàng']
    if (!maDon) continue`
const new1 = `    const maDon   = don['Mã đơn hàng']
    if (!maDon) continue
    // Ưu tiên Trạng thái Hủy từ NocoDB
    if (don['Trạng thái']==='Hủy' || don['Trạng thái']==='Huỷ') {
      trangThaiMap[maDon] = 'Hủy'; continue
    }`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
