const fs = require('fs')
const f = 'app/api/don-hang/route.ts'
let c = fs.readFileSync(f, 'utf8')

const old1 = `    const result = await createRecord(TABLES.DON_HANG, {...body,'Mã đơn hàng':maDon})`
const new1 = `    console.log('[CREATE don-hang] fields:', Object.keys({...body,'Mã đơn hàng':maDon}).join(', '))
    const result = await createRecord(TABLES.DON_HANG, {...body,'Mã đơn hàng':maDon})`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
