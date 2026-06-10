const fs = require('fs')
const path = require('path')

// Patch page.tsx để fetch field Trạng thái
const pageFiles = [
  'app/dashboard/san-pham/page.tsx',
  'app\\dashboard\\san-pham\\page.tsx',
]
let pagePath = null
for (const p of pageFiles) {
  const full = path.join(process.cwd(), p)
  if (fs.existsSync(full)) { pagePath = full; break }
}
if (!pagePath) { console.log('FAIL: page.tsx not found'); process.exit(1) }

let content = fs.readFileSync(pagePath, 'utf8')
// Thêm Trạng thái vào fields
const old1 = `fields: 'Id,Mã SP,Tên sản phẩm,Đơn vị tính,Tồn kho,Ngưỡng cảnh báo,Danh mục,Giá nhập NCC,CPVC về kho'`
const new1 = `fields: 'Id,Mã SP,Tên sản phẩm,Đơn vị tính,Tồn kho,Ngưỡng cảnh báo,Danh mục,Giá nhập NCC,CPVC về kho,Trạng thái'`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK page.tsx kiem-kho fields') }

// Thử pattern khác cho trang sản phẩm chính
const old2 = `fields: 'Id,Mã SP,Tên sản phẩm,Loại SP,Đơn vị tính,Giá nhập NCC,CPVC về kho,Giá bán buôn,Giá bán lẻ,Tồn kho,Ngưỡng cảnh báo,Danh mục,Thông số kỹ thuật,Ghi chú'`
const new2 = `fields: 'Id,Mã SP,Tên sản phẩm,Loại SP,Đơn vị tính,Giá nhập NCC,CPVC về kho,Giá bán buôn,Giá bán lẻ,Tồn kho,Ngưỡng cảnh báo,Danh mục,Thông số kỹ thuật,Ghi chú,Trạng thái'`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK page.tsx san-pham fields') }

fs.writeFileSync(pagePath, content, 'utf8')
console.log('page.tsx saved:', pagePath)
