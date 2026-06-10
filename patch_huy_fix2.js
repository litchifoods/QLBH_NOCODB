const fs = require('fs')
const path = require('path')

const f = path.join(process.cwd(), 'components', 'ChiTietDonHangClient.tsx')
let c = fs.readFileSync(f, 'utf8')

// 1. Sửa badge header — ưu tiên trangThai (local state) thay vì trangThaiTinh
const old1 = `            <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:700,background:tt.bg,color:tt.color}}>{trangThaiTinh||trangThai}</span>`
const new1 = `            <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:700,background:tt.bg,color:tt.color}}>{trangThai||trangThaiTinh}</span>`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. badge header') }
else console.log('FAIL 1.')

// 2. Sau khi hủy → redirect về danh sách (không reload trang chi tiết)
const old2 = `      showMsg('Đã hủy đơn hàng')
      // Hard reload để trangThaiTinh được tính lại từ server
      setTimeout(() => { window.location.reload() }, 800)`
const new2 = `      showMsg('✅ Đã hủy đơn hàng thành công')
      setTimeout(() => { router.push('/dashboard/don-hang') }, 1200)`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. redirect về danh sách') }
else console.log('FAIL 2.')

// 3. Sửa điều kiện hiện nút Hủy — dùng trangThai thay vì trangThaiTinh
const old3 = `          {(trangThaiTinh||trangThai)!=='Huỷ'&&(`
const new3 = `          {trangThai!=='Huỷ'&&(`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. ẩn nút hủy') }
else console.log('FAIL 3.')

// 4. Sửa điều kiện coTheSua — dùng trangThai
const old4 = `  const coTheSua = ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThaiTinh||trangThai)`
const new4 = `  const coTheSua = ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThai||trangThaiTinh||'')`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 4. coTheSua') }
else console.log('FAIL 4.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
