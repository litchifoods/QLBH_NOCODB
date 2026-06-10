const fs = require('fs')
const f = 'components/ChiTietDonHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// 1. Thêm state hinhThucHoanDon
const old1 = `  const [dangHuyDon,  setDangHuyDon]  = useState(false)`
const new1 = `  const [dangHuyDon,  setDangHuyDon]  = useState(false)
  const [hinhThucHoanDon, setHinhThucHoanDon] = useState<'Tiền mặt'|'Chuyển khoản'>('Tiền mặt')`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. state') }
else console.log('FAIL 1.')

// 2. Thêm hinhThucHoanDon vào PATCH khi hủy đơn
const old2 = `          'Tình trạng hoàn cọc': tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn',
          'Còn phải thu': 0,`
const new2 = `          'Tình trạng hoàn cọc': tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn',
          'Hình thức hoàn cọc': hinhThucHoanDon,
          'Còn phải thu': 0,`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. PATCH hủy') }
else console.log('FAIL 2.')

// 3. Thêm UI chọn hình thức trong popup hủy đơn (khi tienHoan > 0)
const old3 = `            <div style={{background:'#EFF6FF',borderRadius:'6px',padding:'8px 12px',marginBottom:'12px',fontSize:'12px',color:'#1E40AF'}}>
              💡 CP giao hàng NV/đối tác giữ nguyên — công sức đã phát sinh.
            </div>`
const new3 = `            <div style={{background:'#EFF6FF',borderRadius:'6px',padding:'8px 12px',marginBottom:'12px',fontSize:'12px',color:'#1E40AF'}}>
              💡 CP giao hàng NV/đối tác giữ nguyên — công sức đã phát sinh.
            </div>
            {Math.max(0,(Number(tongDaThu||0)+Number(donHang['Đặt cọc']||0))-cpTraHang)>0&&(
              <div style={{marginBottom:'12px'}}>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'6px'}}>Hình thức hoàn tiền cho KH</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {(['Tiền mặt','Chuyển khoản'] as const).map(ht=>(
                    <button key={ht} onClick={()=>setHinhThucHoanDon(ht)}
                      style={{flex:1,padding:'8px',borderRadius:'8px',border:'2px solid',
                        borderColor:hinhThucHoanDon===ht?'#16A34A':'#E5E7EB',
                        background:hinhThucHoanDon===ht?'#F0FDF4':'white',
                        color:hinhThucHoanDon===ht?'#16A34A':'#6B7280',
                        fontWeight:hinhThucHoanDon===ht?700:400,fontSize:'13px',cursor:'pointer'}}>
                      {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                    </button>
                  ))}
                </div>
              </div>
            )}`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. UI popup hủy') }
else console.log('FAIL 3.')

// 4. Thêm hình thức vào nút "Đánh dấu đã hoàn cọc" + state
const old4 = `  const [tinhTrangHoanCoc,setTinhTrangHoanCoc]= useState(donHang['Tình trạng hoàn cọc']||'')`
const new4 = `  const [tinhTrangHoanCoc,setTinhTrangHoanCoc]= useState(donHang['Tình trạng hoàn cọc']||'')
  const [hinhThucHoanCoc, setHinhThucHoanCoc] = useState<'Tiền mặt'|'Chuyển khoản'>('Tiền mặt')`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 4. state coc') }
else console.log('FAIL 4.')

// 5. Thêm UI chọn hình thức trước nút "Đánh dấu đã hoàn cọc"
const old5 = `                  {user.vaiTro==='Chủ cửa hàng' && tinhTrangHoanCoc!=='Đã hoàn' && tienHoanCoc>0 && (
                    <button onClick={async()=>{
                      setLoading(true)
                      await fetch('/api/don-hang',{method:'PATCH',headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({id:donHang['Id']||donHang['id'],'Tình trạng hoàn cọc':'Đã hoàn'})})
                      setTinhTrangHoanCoc('Đã hoàn')
                      setLoading(false)
                      showMsg('✅ Đã đánh dấu hoàn cọc')
                      router.refresh()
                    }} disabled={loading}`
const new5 = `                  {user.vaiTro==='Chủ cửa hàng' && tinhTrangHoanCoc!=='Đã hoàn' && tienHoanCoc>0 && (
                    <div>
                      <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
                        {(['Tiền mặt','Chuyển khoản'] as const).map(ht=>(
                          <button key={ht} onClick={()=>setHinhThucHoanCoc(ht)}
                            style={{flex:1,padding:'6px',borderRadius:'6px',border:'2px solid',
                              borderColor:hinhThucHoanCoc===ht?'#16A34A':'#E5E7EB',
                              background:hinhThucHoanCoc===ht?'#F0FDF4':'white',
                              color:hinhThucHoanCoc===ht?'#16A34A':'#6B7280',
                              fontWeight:hinhThucHoanCoc===ht?700:400,fontSize:'12px',cursor:'pointer'}}>
                            {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                          </button>
                        ))}
                      </div>
                    <button onClick={async()=>{
                      setLoading(true)
                      await fetch('/api/don-hang',{method:'PATCH',headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({id:donHang['Id']||donHang['id'],'Tình trạng hoàn cọc':'Đã hoàn','Hình thức hoàn cọc':hinhThucHoanCoc})})
                      setTinhTrangHoanCoc('Đã hoàn')
                      setLoading(false)
                      showMsg('✅ Đã đánh dấu hoàn cọc')
                      router.refresh()
                    }} disabled={loading}`
if (c.includes(old5)) { c = c.replace(old5, new5); console.log('OK 5. UI nút hoàn cọc') }
else console.log('FAIL 5.')

// 6. Đóng thẻ div thêm vào
const old6 = `                    }} disabled={loading}
                      style={{width:'100%',padding:'7px',borderRadius:'6px',border:'none',background:'#16A34A',color:'white',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                      ✅ Đánh dấu đã hoàn cọc cho khách
                    </button>
                  )}`
const new6 = `                    }} disabled={loading}
                      style={{width:'100%',padding:'7px',borderRadius:'6px',border:'none',background:'#16A34A',color:'white',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                      ✅ Đánh dấu đã hoàn cọc cho khách
                    </button>
                    </div>
                  )}`
if (c.includes(old6)) { c = c.replace(old6, new6); console.log('OK 6. đóng div') }
else console.log('FAIL 6.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
