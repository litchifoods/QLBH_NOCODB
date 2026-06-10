const fs = require('fs')
const path = require('path')

const f = path.join(process.cwd(), 'components', 'ChiTietDonHangClient.tsx')
let c = fs.readFileSync(f, 'utf8')

// 1. Thêm state daHuy sau state trangThai
const old1 = `  const [trangThai, setTrangThai] = useState(trangThaiTinh || donHang['Trạng thái']||'Chờ giao')`
const new1 = `  const [trangThai, setTrangThai] = useState(trangThaiTinh || donHang['Trạng thái']||'Chờ giao')
  const [daHuy, setDaHuy] = useState(donHang['Trạng thái']==='Huỷ' || trangThaiTinh==='Huỷ')`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. state daHuy') }
else console.log('FAIL 1.')

// 2. Khi hủy thành công → setDaHuy(true)
const old2 = `      setTrangThai('Huỷ')
      setTienHoanCoc(tienHoan)
      setTinhTrangHoanCoc(tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn')
      setShowHuyDon(false)
      showMsg('✅ Đã hủy đơn hàng thành công')
      setTimeout(() => { router.push('/dashboard/don-hang') }, 1200)`
const new2 = `      setTrangThai('Huỷ')
      setDaHuy(true)
      setTienHoanCoc(tienHoan)
      setTinhTrangHoanCoc(tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn')
      setShowHuyDon(false)
      showMsg('✅ Đã hủy đơn hàng thành công')
      setTimeout(() => { router.push('/dashboard/don-hang') }, 1500)`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. setDaHuy') }
else console.log('FAIL 2.')

// 3. Badge dùng daHuy để override
const old3 = `            <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:700,background:tt.bg,color:tt.color}}>{trangThai||trangThaiTinh}</span>`
const new3 = `            <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:700,background:daHuy?'#FEE2E2':tt.bg,color:daHuy?'#991B1B':tt.color}}>{daHuy?'Huỷ':(trangThaiTinh||trangThai)}</span>`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. badge dùng daHuy') }
else console.log('FAIL 3.')

// 4. Nút Hủy ẩn khi daHuy
const old4 = `          {trangThai!=='Huỷ'&&(`
const new4 = `          {!daHuy&&trangThai!=='Huỷ'&&(`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 4. ẩn nút hủy') }
else console.log('FAIL 4.')

// 5. coTheSua dùng daHuy
const old5 = `  const coTheSua = ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThai||trangThaiTinh||'')`
const new5 = `  const coTheSua = !daHuy && ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThai||trangThaiTinh||'')`
if (c.includes(old5)) { c = c.replace(old5, new5); console.log('OK 5. coTheSua') }
else console.log('FAIL 5.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
