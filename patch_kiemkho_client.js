const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'KiemKhoClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm prop giaBinhQuanMap
const old1 = `export default function KiemKhoClient({dotKiemList,sanPhamList,danhMucList=[],user}:{
  dotKiemList:any[]; sanPhamList:any[]; danhMucList:any[]; user:UserSession
}){`
const new1 = `export default function KiemKhoClient({dotKiemList,sanPhamList,danhMucList=[],giaBinhQuanMap={},user}:{
  dotKiemList:any[]; sanPhamList:any[]; danhMucList:any[]
  giaBinhQuanMap:Record<string,number>; user:UserSession
}){`
if (content.includes(old1)) {
  content = content.replace(old1, new1)
  console.log('✅ 1. Props: OK')
} else {
  console.log('❌ 1. Props: NOT FOUND')
}

// 2. Thay công thức tính tongGiaTriChenh
const old2 = `  const tongGiaTriChenh=ctList.reduce((sum:number,ct:any)=>{
    const sp=spMap[ct['Mã SP']||'']
    const gia=Number(sp?.['Giá nhập NCC']||0)+Number(sp?.['CPVC về kho']||0)
    if(gia===0) return sum
    const chenh=Number(ct['Chênh lệch']||0)
    const hong=Number(ct['Hàng hỏng']||0)
    // Chênh lệch âm = mất hàng, hàng hỏng luôn là thất thoát
    const thatthoat=(chenh<0?chenh:0)-hong
    return sum+thatthoat*gia
  },0)`
const new2 = `  const tongGiaTriChenh=ctList.reduce((sum:number,ct:any)=>{
    const maSP=ct['Mã SP']||''
    const sp=spMap[maSP]
    // Ưu tiên giá bình quân từ lịch sử nhập kho, fallback giá nhập NCC+CPVC
    const gia=giaBinhQuanMap[maSP]||(Number(sp?.['Giá nhập NCC']||0)+Number(sp?.['CPVC về kho']||0))
    if(gia===0) return sum
    const chenh=Number(ct['Chênh lệch']||0)
    const hong=Number(ct['Hàng hỏng']||0)
    // Thất thoát = hàng mất (chenh âm) + hàng hỏng
    const slThatThoat=Math.abs(chenh<0?chenh:0)+hong
    return sum+slThatThoat*gia
  },0)`
if (content.includes(old2)) {
  content = content.replace(old2, new2)
  console.log('✅ 2. Công thức giá bình quân: OK')
} else {
  console.log('❌ 2. Công thức: NOT FOUND')
}

// 3. Cập nhật label note
const old3 = `                      'Tính theo giá nhập NCC + CPVC',`
const new3 = `                      'Tính theo giá bình quân (lịch sử nhập kho)',`
if (content.includes(old3)) {
  content = content.replace(old3, new3)
  console.log('✅ 3. Label note: OK')
} else {
  console.log('❌ 3. Label note: NOT FOUND')
}

fs.writeFileSync(filePath, content, 'utf8')
console.log('✅ File saved!')
