const fs = require('fs')
const f = 'components/ChiPhiClient.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `                {(formThu.nguoiThu.trim()?nvList.filter((n:any)=>boDau(n['Họ và Tên']||'').includes(boDau(formThu.nguoiThu))):nvList).slice(0,10).map((nv:any)=>(
                      <div key={nv['Mã nhân viên']} className="nv-di"
                        onMouseDown={e=>{e.preventDefault();updThu('nguoiThu',nv['Họ và Tên']||'');setShowNVSearch(false)}}>
                        <span style={{fontWeight:600}}>{nv['Họ và Tên']}</span>
                        <span style={{marginLeft:'8px',fontSize:'11px',padding:'1px 6px',borderRadius:'10px',
                          background:'#DBEAFE',color:'#1E40AF',fontWeight:700}}>{nv['Mã nhân viên']}</span>
                      </div>
                    ))}`
const new1 = `                {(formThu.nguoiThu.trim()
                      ?nvList.filter((n:any)=>n['Loại']==='Nhân viên'&&boDau(n['Họ và Tên']||'').includes(boDau(formThu.nguoiThu)))
                      :nvList.filter((n:any)=>n['Loại']==='Nhân viên')
                    ).slice(0,10).map((nv:any)=>(
                      <div key={nv['Mã nhân viên']} className="nv-di"
                        onMouseDown={e=>{e.preventDefault();updThu('nguoiThu',nv['Họ và Tên']||'');setShowNVSearch(false)}}>
                        <span style={{fontWeight:600}}>{nv['Họ và Tên']}</span>
                        <span style={{marginLeft:'8px',fontSize:'11px',padding:'1px 6px',borderRadius:'10px',
                          background:'#DBEAFE',color:'#1E40AF',fontWeight:700}}>{nv['Mã nhân viên']}</span>
                      </div>
                    ))}`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
