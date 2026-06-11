const fs = require('fs')
const f = 'components/KhachHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Xem thêm đoạn sau luuHoanCoc
const startIdx = c.indexOf('luuHoanCoc()')
const endIdx = c.indexOf('\n  }', startIdx + 500) + 4
const oldFunc = c.substring(startIdx, endIdx)
console.log('Old func:', oldFunc.substring(0, 200))

const old1 = `    const donHuy = (donHangTheoKH[popupHoanKH['Mã KH']]||[])
      .find((d:any) => d['Tiền hoàn cọc']>0 && d['Tình trạng hoàn cọc']!=='Đã hoàn')
    try {
      if (donHuy) {
        await fetch('/api/don-hang', {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: donHuy['Id']||donHuy['id'], 'Tình trạng hoàn cọc':'Đã hoàn', 'Hình thức hoàn cọc': hinhThucHoan }),`
const new1 = `    // Tìm đơn hủy có tiền hoàn cọc
    const donHuy = (donHangTheoKH[popupHoanKH['Mã KH']]||[])
      .find((d:any) => d['Tiền hoàn cọc']>0 && d['Tình trạng hoàn cọc']!=='Đã hoàn')
    // Tìm đơn có Còn phải thu âm (KH trả thừa)
    const donAm = (donHangTheoKH[popupHoanKH['Mã KH']]||[])
      .find((d:any) => Number(d['Còn phải thu']||0)<0 && d['Trạng thái']!=='Hủy' && d['Trạng thái']!=='Huỷ')
    try {
      if (donHuy) {
        await fetch('/api/don-hang', {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: donHuy['Id']||donHuy['id'], 'Tình trạng hoàn cọc':'Đã hoàn', 'Hình thức hoàn cọc': hinhThucHoan }),`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. thêm donAm') }
else console.log('FAIL 1.')

// Xem thêm đoạn sau để thêm xử lý donAm
const old2 = `      showMsg(`✅ Đã hoàn ${hoan?.tienHoan.toLocaleString('vi-VN')}đ cho ${popupHoanKH['Tên khách hàng']}`)`
const new2 = `      // Xử lý đơn có Còn phải thu âm
      if (!donHuy && donAm) {
        await fetch('/api/don-hang', {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: donAm['Id']||donAm['id'], 'Còn phải thu': 0, 'Tình trạng hoàn cọc': 'Đã hoàn', 'Hình thức hoàn cọc': hinhThucHoan }),
        })
      }
      showMsg(\`✅ Đã hoàn ${hoan?.tienHoan.toLocaleString('vi-VN')}đ cho ${popupHoanKH['Tên khách hàng']}\`)`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. xử lý donAm') }
else console.log('FAIL 2.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
