const fs = require('fs')
const f = 'app/dashboard/khach-hang/page.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `    // Hoàn cọc
    const tienHoan  = Number(don['Tiền hoàn cọc'] || 0)
    const tinhTrang = don['Tình trạng hoàn cọc'] || ''
    if (tienHoan > 0) {
      if (!donHuyCanHoan[maKH] || tinhTrang === 'Chờ hoàn') {
        donHuyCanHoan[maKH] = { tienHoan, tinhTrang }
      }`
const new1 = `    // Hoàn cọc (đơn hủy)
    const tienHoan  = Number(don['Tiền hoàn cọc'] || 0)
    const tinhTrang = don['Tình trạng hoàn cọc'] || ''
    if (tienHoan > 0) {
      if (!donHuyCanHoan[maKH] || tinhTrang === 'Chờ hoàn') {
        donHuyCanHoan[maKH] = { tienHoan, tinhTrang }
      }
    }
    // Hoàn tiền do còn phải thu âm (KH trả thừa / giảm giá sau khi thanh toán)
    const conLaiDon = Number(don['Còn phải thu'] || 0)
    const ttDon = don['Trạng thái'] || ''
    if (conLaiDon < 0 && ttDon !== 'Hủy' && ttDon !== 'Huỷ') {
      const tienHoanAm = Math.abs(conLaiDon)
      if (!donHuyCanHoan[maKH] || tienHoanAm > (donHuyCanHoan[maKH]?.tienHoan || 0)) {
        donHuyCanHoan[maKH] = { tienHoan: tienHoanAm, tinhTrang: 'Chờ hoàn' }
      }
      if (!donHangTheoKH[maKH]) donHangTheoKH[maKH] = []
      if (!donHangTheoKH[maKH].find((d:any) => d['Mã đơn hàng'] === don['Mã đơn hàng'])) {
        donHangTheoKH[maKH].push(don)
      }
    }
    if (tienHoan > 0) {`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
