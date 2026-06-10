const fs = require('fs')
const f = 'components/KhachHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// 1. Thêm state hinhThucHoan
const old1 = `  const [dangHoan, setDangHoan] = useState(false)`
const new1 = `  const [dangHoan, setDangHoan] = useState(false)
  const [hinhThucHoan, setHinhThucHoan] = useState<'Tiền mặt'|'Chuyển khoản'>('Tiền mặt')`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. state') }
else console.log('FAIL 1.')

// 2. Thêm hinhThucHoan vào PATCH body
const old2 = `          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: donHuy['Id']||donHuy['id'], 'Tình trạng hoàn cọc':'Đã hoàn' }),`
const new2 = `          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: donHuy['Id']||donHuy['id'], 'Tình trạng hoàn cọc':'Đã hoàn', 'Hình thức hoàn cọc': hinhThucHoan }),`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. PATCH body') }
else console.log('FAIL 2.')

// 3. Reset hinhThucHoan khi đóng popup
const old3 = `      setPopupHoanKH(null)`
const new3 = `      setPopupHoanKH(null)
      setHinhThucHoan('Tiền mặt')`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. reset') }
else console.log('FAIL 3.')

// 4. Thêm UI chọn hình thức hoàn vào popup
const old4 = `              <p style={{fontSize:'12px',color:'#6B7280',margin:0}}>Sau khi xác nhận, trạng thái sẽ đổi thành "Đã hoàn"</p>`
const new4 = `              <div style={{marginTop:'12px',marginBottom:'4px'}}>
                <div style={{fontSize:'12px',fontWeight:600,marginBottom:'6px'}}>Hình thức hoàn tiền</div>
                <div style={{display:'flex',gap:'8px'}}>
                  {(['Tiền mặt','Chuyển khoản'] as const).map(ht=>(
                    <button key={ht} onClick={()=>setHinhThucHoan(ht)}
                      style={{flex:1,padding:'8px',borderRadius:'8px',border:'2px solid',
                        borderColor:hinhThucHoan===ht?'#16A34A':'#E5E7EB',
                        background:hinhThucHoan===ht?'#F0FDF4':'white',
                        color:hinhThucHoan===ht?'#16A34A':'#6B7280',
                        fontWeight:hinhThucHoan===ht?700:400,fontSize:'13px',cursor:'pointer'}}>
                      {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                    </button>
                  ))}
                </div>
              </div>
              <p style={{fontSize:'12px',color:'#6B7280',margin:0}}>Sau khi xác nhận, trạng thái sẽ đổi thành "Đã hoàn"</p>`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 4. UI') }
else console.log('FAIL 4.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
