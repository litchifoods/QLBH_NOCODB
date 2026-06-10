const fs = require('fs')
const path = require('path')

const f = path.join(process.cwd(), 'components', 'ChiTietDonHangClient.tsx')
let c = fs.readFileSync(f, 'utf8')

// Sau khi hủy thành công → redirect về trang chi tiết để reload fresh
const old1 = `      setTrangThai('Huỷ')
      setTienHoanCoc(tienHoan)
      setTinhTrangHoanCoc(tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn')
      setShowHuyDon(false)
      showMsg('Đã hủy đơn hàng')
      router.refresh()`
const new1 = `      setTrangThai('Huỷ')
      setTienHoanCoc(tienHoan)
      setTinhTrangHoanCoc(tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn')
      setShowHuyDon(false)
      showMsg('Đã hủy đơn hàng')
      // Hard reload để trangThaiTinh được tính lại từ server
      setTimeout(() => { window.location.reload() }, 800)`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK redirect sau hủy') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
