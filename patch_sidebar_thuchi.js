const fs = require('fs')
const f = 'components/Sidebar.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `{ href: '/dashboard/chi-phi', icon: '📉', label: 'Chi phí' }`
const new1 = `{ href: '/dashboard/chi-phi', icon: '💹', label: 'Thu Chi' }`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
