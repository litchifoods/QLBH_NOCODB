const fs = require('fs')
const f = 'components/ChiTietDonHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `    if (!lyDoHuy.trim() && (trangThaiTinh||trangThai) === 'Hoàn thành') {
      showMsg('Vui lòng nhập lý do hủy', false); return
    }`
const new1 = `    if (!lyDoHuy.trim()) {
      showMsg('Vui lòng nhập lý do hủy', false); return
    }`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

// Bỏ dấu * chỉ bắt buộc khi Hoàn thành trong label
const old2 = `              Lý do hủy {(trangThaiTinh||trangThai)==='Hoàn thành'&&<span style={{color:'#DC2626'}}> *</span>}`
const new2 = `              Lý do hủy <span style={{color:'#DC2626'}}> *</span>`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK label') }
else console.log('FAIL label')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
