const fs = require('fs')
const f = 'components/ChiTietDonHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `      setTimeout(() => { router.push('/dashboard/don-hang') }, 1500)`
const new1 = `      router.refresh()
      setTimeout(() => { router.push('/dashboard/don-hang') }, 1500)`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
