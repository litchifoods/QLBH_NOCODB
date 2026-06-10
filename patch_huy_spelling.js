const fs = require('fs')

// Sửa trong ChiTietDonHangClient.tsx
const f1 = 'components/ChiTietDonHangClient.tsx'
let c1 = fs.readFileSync(f1, 'utf8')

// Đếm số lần xuất hiện Huỷ trong PATCH body
let count = 0
// Sửa tất cả giá trị gửi lên API
c1 = c1.replace(/'Trạng thái': 'Huỷ'/g, (m) => { count++; return "'Trạng thái': 'Hủy'" })
c1 = c1.replace(/'Trang thai': 'Huy'/g, () => "'Trang thai': 'Hủy'")

// Sửa so sánh state local (giữ nguyên Huỷ cho display)
// Nhưng sửa khởi tạo daHuy để nhận cả 2 cách viết
c1 = c1.replace(
  "useState(donHang['Trạng thái']==='Huỷ' || trangThaiTinh==='Huỷ')",
  "useState(donHang['Trạng thái']==='Hủy'||donHang['Trạng thái']==='Huỷ'||trangThaiTinh==='Hủy'||trangThaiTinh==='Huỷ')"
)

// Sửa hàm tinhTrangThai trong page.tsx
fs.writeFileSync(f1, c1, 'utf8')
console.log('OK ChiTietDonHangClient, fixed', count, 'Trạng thái Huỷ')

// Sửa trong page.tsx
const f2 = 'app/dashboard/don-hang/[maDon]/page.tsx'
let c2 = fs.readFileSync(f2, 'utf8')
c2 = c2.replace(
  "if (donHang && donHang['Trạng thái'] === 'Huỷ') return 'Huỷ'",
  "if (donHang && (donHang['Trạng thái']==='Hủy'||donHang['Trạng thái']==='Huỷ')) return 'Huỷ'"
)
fs.writeFileSync(f2, c2, 'utf8')
console.log('OK page.tsx')

// Sửa trong DonHangClient.tsx
const f3 = 'components/DonHangClient.tsx'
let c3 = fs.readFileSync(f3, 'utf8')
c3 = c3.replace(
  "const isHuy  = tt === 'Huỷ'",
  "const isHuy  = tt === 'Huỷ' || tt === 'Hủy'"
)
fs.writeFileSync(f3, c3, 'utf8')
console.log('OK DonHangClient')

console.log('Done!')
