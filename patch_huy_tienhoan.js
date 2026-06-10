const fs = require('fs')
const f = 'components/ChiTietDonHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Sửa tính tổng đã thu = tongDaThu (đối soát) + Đặt cọc
const old1 = `    try {
      const tongDaThuThucTe = tongDaThu || 0
      const tienHoan = Math.max(0, tongDaThuThucTe - cpTraHang)`
const new1 = `    try {
      // Tổng đã thu = tiền thu qua đối soát + tiền cọc/trả trước
      const tongDaThuThucTe = (tongDaThu || 0) + Number(donHang['Đặt cọc'] || 0)
      const tienHoan = Math.max(0, tongDaThuThucTe - cpTraHang)`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. tính tổng đã thu') }
else console.log('FAIL 1.')

// Sửa hiển thị trong popup — thêm dòng đặt cọc
const old2 = `            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'12px',fontSize:'13px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                <span style={{color:'#6B7280'}}>Tổng đã thu từ KH:</span>
                <span style={{fontWeight:700,color:'#16A34A'}}>{Number(tongDaThu||0).toLocaleString('vi-VN')}đ</span>
              </div>`
const new2 = `            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'12px',fontSize:'13px'}}>
              {Number(donHang['Đặt cọc']||0)>0&&(
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{color:'#6B7280'}}>Đặt cọc/Trả trước:</span>
                  <span style={{fontWeight:600,color:'#16A34A'}}>{Number(donHang['Đặt cọc']||0).toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              {(tongDaThu||0)>0&&(
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{color:'#6B7280'}}>Thu qua giao hàng:</span>
                  <span style={{fontWeight:600,color:'#16A34A'}}>{Number(tongDaThu||0).toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',borderTop:'1px solid #E5E7EB',paddingTop:'6px'}}>
                <span style={{color:'#6B7280',fontWeight:600}}>Tổng đã thu từ KH:</span>
                <span style={{fontWeight:700,color:'#16A34A'}}>{(Number(tongDaThu||0)+Number(donHang['Đặt cọc']||0)).toLocaleString('vi-VN')}đ</span>
              </div>`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. hiển thị popup') }
else console.log('FAIL 2.')

// Sửa tính tiền hoàn trong preview
const old3 = `                <span style={{color:'#DC2626',fontSize:'15px'}}>{Math.max(0,(tongDaThu||0)-cpTraHang).toLocaleString('vi-VN')}đ</span>`
const new3 = `                <span style={{color:'#DC2626',fontSize:'15px'}}>{Math.max(0,(Number(tongDaThu||0)+Number(donHang['Đặt cọc']||0))-cpTraHang).toLocaleString('vi-VN')}đ</span>`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. preview tiền hoàn') }
else console.log('FAIL 3.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
