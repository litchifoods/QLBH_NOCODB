const fs = require('fs')
const f = 'components/KhachHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Fix chuỗi bị lỗi
const old1 = `const [hinhThucHoan, setHinhThucHoan] = useState(" Tien mat)`
const new1 = `const [hinhThucHoan, setHinhThucHoan] = useState<'Tiền mặt'|'Chuyển khoản'>('Tiền mặt')`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL - xem lại')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
