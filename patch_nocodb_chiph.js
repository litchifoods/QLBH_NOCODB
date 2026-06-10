const fs = require('fs')
const f = 'lib/nocodb.ts'
let c = fs.readFileSync(f, 'utf8')

const old1 = `CHI_PHI:        '14_Chi phí hoạt động',`
const new1 = `CHI_PHI:        '14_Thu chi hoạt động',`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
