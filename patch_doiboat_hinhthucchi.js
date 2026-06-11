const fs = require('fs')
const f = 'components/DoiSoatClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// 1. Thêm state hinhThucChi
const old1 = `  const [thanhToanNgay,  setThanhToanNgay]  = useState(false)
  const [hinhThucTTDT,   setHinhThucTTDT]   = useState('Tiền mặt')`
const new1 = `  const [thanhToanNgay,  setThanhToanNgay]  = useState(false)
  const [hinhThucTTDT,   setHinhThucTTDT]   = useState('Tiền mặt')
  const [hinhThucChi,    setHinhThucChi]    = useState('Tiền mặt')`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. state') }
else console.log('FAIL 1.')

// 2. Thêm UI chọn hình thức chi ngay dưới dòng Tổng
const old2 = `                {tongPhaiTra>0&&<div style={{marginTop:'6px',fontSize:'12px',fontWeight:700,color:laDT?'#DC2626':'#0369A1'}}>Tổng: {fVND(tongPhaiTra)}</div>}
              </div>`
const new2 = `                {tongPhaiTra>0&&<div style={{marginTop:'6px',fontSize:'12px',fontWeight:700,color:laDT?'#DC2626':'#0369A1'}}>Tổng: {fVND(tongPhaiTra)}</div>}
                {tongPhaiTra>0&&(
                  <div style={{marginTop:'8px'}}>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Hình thức chi trả</label>
                    <div style={{display:'flex',gap:'8px'}}>
                      {['Tiền mặt','Chuyển khoản'].map(ht=>(
                        <button key={ht} onClick={()=>setHinhThucChi(ht)}
                          style={{flex:1,padding:'6px',borderRadius:'6px',border:'2px solid',
                            borderColor:hinhThucChi===ht?(laDT?'#C2410C':'#0369A1'):'var(--border)',
                            background:hinhThucChi===ht?(laDT?'#FFF7ED':'#F0F9FF'):'white',
                            color:hinhThucChi===ht?(laDT?'#C2410C':'#0369A1'):'var(--text-secondary)',
                            fontWeight:hinhThucChi===ht?700:400,fontSize:'12px',cursor:'pointer'}}>
                          {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. UI') }
else console.log('FAIL 2.')

// 3. Gửi hinhThucChi lên API
const old3 = `'Hình thức thanh toán': hinhThucTTDT,`
if (c.includes(old3)) {
  // Thêm hinhThucChi vào body API
  c = c.replace(old3, old3 + `\n              'Hình thức chi': hinhThucChi,`)
  console.log('OK 3. API body')
} else {
  // Tìm chỗ khác
  const old3b = `chiPhiVC: chiPhiVC || 0,`
  if (c.includes(old3b)) {
    c = c.replace(old3b, old3b + `\n              hinhThucChi: hinhThucChi,`)
    console.log('OK 3b. API body alt')
  } else console.log('FAIL 3.')
}

// 4. Reset hinhThucChi khi đóng modal
const old4 = `setThanhToanNgay(false)`
// Tìm chỗ reset state trong modal
const resetIdx = c.lastIndexOf('setThanhToanNgay(false)')
if (resetIdx > -1) {
  c = c.substring(0, resetIdx + 'setThanhToanNgay(false)'.length) + 
      '\n    setHinhThucChi(\'Tiền mặt\')' + 
      c.substring(resetIdx + 'setThanhToanNgay(false)'.length)
  console.log('OK 4. reset')
} else console.log('FAIL 4.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
