const fs = require('fs')
const path = require('path')

const f = path.join(process.cwd(), 'app', 'dashboard', 'don-hang', '[maDon]', 'page.tsx')
let c = fs.readFileSync(f, 'utf8')

const old1 = `function tinhTrangThai(chiTiet: any[], giaoHangList: any[], chiTietGiao: any[], donHang?: any): string {
  const spTong = chiTiet.length`
const new1 = `function tinhTrangThai(chiTiet: any[], giaoHangList: any[], chiTietGiao: any[], donHang?: any): string {
  // Ưu tiên field Trạng thái từ NocoDB nếu đã Huỷ
  if (donHang && donHang['Trạng thái'] === 'Huỷ') return 'Huỷ'
  const spTong = chiTiet.length`

if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK page.tsx tinhTrangThai') }
else console.log('FAIL page.tsx')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
