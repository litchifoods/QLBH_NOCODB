const fs = require('fs')
const f = 'components/ChiTietDonHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `                  {user.vaiTro==='Chủ cửa hàng' && tinhTrangHoanCoc!=='Đã hoàn' && tienHoanCoc>0 && (
                    <button onClick={async()=>{
                      setLoading(true)
                      await fetch('/api/don-hang',{method:'PATCH',headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({id:donHang['Id']||donHang['id'],'Tình trạng hoàn cọc':'Đã hoàn'})})
                      setTinhTrangHoanCoc('Đã hoàn')
                      setLoading(false)
                      showMsg('✅ Đã đánh dấu hoàn cọc')
                    }} disabled={loading}
                      style={{width:'100%',padding:'7px',borderRadius:'6px',border:'none',background:'#16A34A',color:'white',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                      ✅ Đánh dấu đã hoàn cọc cho khách
                    </button>
                    </div>
                  )}`
const new1 = `                  {user.vaiTro==='Chủ cửa hàng' && tinhTrangHoanCoc!=='Đã hoàn' && tienHoanCoc>0 && (
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
                      }} disabled={loading}
                        style={{width:'100%',padding:'7px',borderRadius:'6px',border:'none',background:'#16A34A',color:'white',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                        ✅ Đánh dấu đã hoàn cọc cho khách
                      </button>
                    </div>
                  )}`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
