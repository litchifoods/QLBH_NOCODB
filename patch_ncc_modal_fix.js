const fs = require('fs')
const f = 'components/NhaCungCapClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Tìm vị trí modal (sau closing brace của component)
const closeReturn = c.lastIndexOf('</>)}', 34365)
const modalMarker = c.indexOf('{/* ', closeReturn + 5)

// Lấy nội dung modal (từ sau closing brace đến trước function Btn)
const funcBtnPos = c.indexOf('function Btn')
const modalContent = c.substring(closeReturn + 5, funcBtnPos).trim()

// Xây dựng lại: chèn modal vào trước </>)}
const before = c.substring(0, closeReturn)
const after = c.substring(funcBtnPos)

const newContent = before + '\n      ' + modalContent + '\n      </>)}\n' + after

fs.writeFileSync(f, newContent, 'utf8')
console.log('Done! Modal moved inside return block.')
