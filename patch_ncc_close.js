const fs = require('fs')
const f = 'components/NhaCungCapClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Thêm đóng component sau </>)}
const old1 = `      </>)}\nfunction Btn`
const new1 = `      </>)}\n  )\n}\nfunction Btn`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
