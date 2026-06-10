const fs = require('fs')
const f = 'components/NhaCungCapClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Vấn đề: 
// 1. Modal Xóa NCC nằm ngoài return block (sau `}` đóng component)
// 2. `</>)}` đóng view detail sai chỗ
// 3. Thừa `  )\n}` ở cuối

// Tìm và sửa: 
// - Xóa đoạn modal + </>)} + )\n} ở cuối
// - Chèn modal vào đúng chỗ trong view detail (trước </>)}  )

// Bước 1: Tìm đoạn modal xóa NCC
const modalXoaStart = c.indexOf('\n      {/* ══ MODAL XÓA NCC ══ */}')
const modalXoaEnd = c.indexOf('\n      </>)}\n  )\n}', modalXoaStart)
const modalXoaContent = c.substring(modalXoaStart, modalXoaEnd)

// Bước 2: Tìm vị trí đóng view detail đúng (trước modal thêm/sửa NCC)
// Cấu trúc đúng: view detail kết thúc bằng </>)} rồi đến modal thêm/sửa, modal TT, modal xóa, rồi </div> )\n}

// Tìm chỗ hiện tại view detail kết thúc (trước modal thêm/sửa)
const viewDetailClose = c.indexOf('\n      {/* ══ MODAL THÊM/SỬA NCC ══ */}')

// Tìm khoảng trắng ngay trước modal thêm/sửa để xem có </>)} không
const beforeModal = c.substring(viewDetailClose - 50, viewDetailClose)
console.log('Before modal:', JSON.stringify(beforeModal))

// Bước 3: Xóa modal xóa khỏi vị trí sai + thừa </>)} )\n}
const wrongPart = modalXoaContent + '\n      </>)}\n  )\n}'
const correctPart = modalXoaContent

// Cấu trúc đúng ở cuối:
// ... (view detail content)
// {/* modal thêm/sửa */}
// {/* modal TT */}
// {/* modal xóa */}    ← chèn vào đây
// </>)}                ← đóng view detail
// </div>
// )
// }

// Tìm vị trí </div>\n  )\n} ở cuối
const closeComponent = c.lastIndexOf('\n    </div>\n  )\n}')
console.log('Close component at:', closeComponent)

// Tìm </>)} trước </div>)\n}
const viewDetailCloseTag = c.lastIndexOf('\n      </>)}', closeComponent)
console.log('View detail close tag at:', viewDetailCloseTag)

// Kiểm tra xem modal xóa đã ở đúng chỗ chưa
const modalBeforeClose = c.substring(viewDetailCloseTag - 200, viewDetailCloseTag)
console.log('Before view close:', modalBeforeClose.substring(modalBeforeClose.length - 100))

// Xây dựng lại: 
// lấy nội dung từ đầu đến vị trí viewDetailCloseTag (không tính modal xóa sai)
// + modal xóa
// + </>)}
// + </div>\n  )\n}
// + helper functions

const beforeViewClose = c.substring(0, viewDetailCloseTag)
// Bỏ modal xóa nếu đã có trong beforeViewClose
const helperFunctions = c.substring(c.indexOf('\nfunction Btn('))

// Kiểm tra modal xóa đã trong beforeViewClose chưa
const hasModalXoa = beforeViewClose.includes('MODAL XÓA NCC')
console.log('Modal xóa in beforeViewClose:', hasModalXoa)

if (!hasModalXoa) {
  const newContent = beforeViewClose + '\n' + modalXoaContent.trim() + '\n      </>)}\n    </div>\n  )\n}\n' + helperFunctions
  fs.writeFileSync(f, newContent, 'utf8')
  console.log('OK - modal inserted and structure fixed')
} else {
  // Modal đã có, chỉ cần fix đóng
  const newContent = beforeViewClose + '\n      </>)}\n    </div>\n  )\n}\n' + helperFunctions
  fs.writeFileSync(f, newContent, 'utf8')
  console.log('OK - structure fixed, modal already present')
}
