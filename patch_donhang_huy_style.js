const fs = require('fs')
const path = require('path')

// Patch DonHangClient — làm mờ row đơn Huỷ
const f = path.join(process.cwd(), 'components', 'DonHangClient.tsx')
let c = fs.readFileSync(f, 'utf8')

const old1 = `              ) : danhSachTrang.map((don: any, i: number) => {
                const tt     = trangThaiMap[don['Mã đơn hàng']] || don['Trạng thái'] || 'Mới'
                const c      = badgeColor(tt)
                const conLai = Number(don['Còn phải thu'] || 0)
                const tenKH  = getTenKH(don)
                const diaChi = getDiaChiGiao(don)
                const maKH   = don['Mã KH'] || ''
                return (
                  <tr key={don['Mã đơn hàng']||i} style={{ borderBottom:'1px solid #F0F0F0', background:i%2===0?'white':'#FAFBFD' }}>`
const new1 = `              ) : danhSachTrang.map((don: any, i: number) => {
                const tt     = trangThaiMap[don['Mã đơn hàng']] || don['Trạng thái'] || 'Mới'
                const c      = badgeColor(tt)
                const conLai = Number(don['Còn phải thu'] || 0)
                const tenKH  = getTenKH(don)
                const diaChi = getDiaChiGiao(don)
                const maKH   = don['Mã KH'] || ''
                const isHuy  = tt === 'Huỷ'
                return (
                  <tr key={don['Mã đơn hàng']||i} style={{ borderBottom:'1px solid #F0F0F0', background:isHuy?'#FFF5F5':i%2===0?'white':'#FAFBFD', opacity:isHuy?0.6:1 }}>`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK DonHangClient row Huỷ') }
else console.log('FAIL DonHangClient')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
