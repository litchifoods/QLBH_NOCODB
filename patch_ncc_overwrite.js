const fs = require('fs')

// Đọc file hiện tại
const f = 'components/NhaCungCapClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Tìm vị trí kết thúc đúng của component:
// Sau modal TT (kết thúc bằng })()}) và trước modal xóa
// Cấu trúc cần:
// })()}         ← kết thúc IIFE modal TT
// </div>        ← đóng wrapper div chính
// )             ← đóng return
// }             ← đóng component
// {/* modal xóa */}  ← SAIIIIII

// Tìm kết thúc modal TT
const endTTModal = c.indexOf('\n        )}\n      })()}')
if (endTTModal === -1) { console.log('FAIL: không tìm thấy end TT modal'); process.exit(1) }
console.log('End TT modal at:', endTTModal)

// Lấy phần sau endTTModal
const afterTT = c.substring(endTTModal + '\n        )}\n      })()}'.length)
console.log('After TT (first 100):', afterTT.substring(0, 100))

// Tìm modal xóa
const modalXoaIdx = c.indexOf('{/* ══ MODAL XÓA NCC ══ */}')
const modalXoaContent = c.substring(c.indexOf('{/* ══ MODAL XÓA NCC ══ */}'), c.indexOf('\nfunction Btn(')).trim()

// Tìm helper functions
const helperStart = c.indexOf('\nfunction Btn(')
const helpers = c.substring(helperStart)

// Xây dựng lại đúng cấu trúc:
const beforeEnd = c.substring(0, endTTModal + '\n        )}\n      })()}'.length)

const newContent = beforeEnd + 
  '\n\n      ' + modalXoaContent + 
  '\n    </div>\n  )\n}\n' + 
  helpers

fs.writeFileSync(f, newContent, 'utf8')
console.log('Done! File restructured.')
