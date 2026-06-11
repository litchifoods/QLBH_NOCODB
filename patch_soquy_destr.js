const fs = require('fs')
const f = 'components/ChiPhiClient.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `  soDuTienMat=0, soDuNganHang=0, ngayBatDau='', caiDatId=null, user`
const new1 = `  soDuTienMat=0, soDuNganHang=0, ngayBatDau='', caiDatId=null,
  nccMap={} as Record<string,string>, donHangMap={} as Record<string,string>, user`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
