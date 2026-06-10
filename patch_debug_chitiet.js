const fs = require('fs')
const f = 'app/dashboard/don-hang/[maDon]/page.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `  const chiTiet     = (chiTietResult.list||[]).filter((ct:any)=>ct['Tên SP (ghi nhanh)']||ct['Mã SP'])`
const new1 = `  console.log('[DEBUG chiTiet total]', chiTietResult.list?.length, chiTietResult.list?.[0])
  const chiTiet     = (chiTietResult.list||[]).filter((ct:any)=>ct['Tên SP (ghi nhanh)']||ct['Mã SP'])`

if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK patch debug') }
else console.log('FAIL - text not found')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
