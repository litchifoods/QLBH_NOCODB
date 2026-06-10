const fs = require('fs')
const f = 'app/api/don-hang/route.ts'
let c = fs.readFileSync(f, 'utf8')

const old1 = `    const {id,...updateData} = body`
const new1 = `    const {id,...updateData} = body
    console.log('[PATCH don-hang id]', id, 'data:', JSON.stringify(updateData).substring(0,300))`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
