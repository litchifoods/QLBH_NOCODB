const fs = require('fs')
const f = 'components/NhaCungCapClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Xóa phần thừa: </div>\n  )\n} xuất hiện 2 lần trước function Btn
const old1 = '    </div>\n  )\n}\n    </div>\n  )\n}\n'
const new1 = '    </div>\n  )\n}\n'
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
