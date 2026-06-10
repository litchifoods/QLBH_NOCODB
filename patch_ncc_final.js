const fs = require('fs')
const f = 'components/NhaCungCapClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Tìm kết thúc modal TT
const endTTModal = c.indexOf('})()}')
if (endTTModal === -1) { console.log('FAIL'); process.exit(1) }

// Lấy phần trước (bao gồm cả })()})
const before = c.substring(0, endTTModal + '})()}'.length)

// Tìm modal xóa NCC
const modalXoaStart = c.indexOf('{/* ══ MODAL XÓA NCC ══ */}')
const helperStart = c.indexOf('\nfunction Btn(')
const modalXoaContent = c.substring(modalXoaStart, helperStart).trim()
const helpers = c.substring(helperStart)

// Xây dựng lại đúng
const newContent = before +
  '\n\n      ' + modalXoaContent +
  '\n    </div>\n  )\n}\n' +
  helpers

fs.writeFileSync(f, newContent, 'utf8')
console.log('Done!')
