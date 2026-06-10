const fs = require('fs')
const f = 'components/ChiPhiClient.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>👤 Người thu</label>
              <input className="input" placeholder="Tên người thu tiền..." value={formThu.nguoiThu} onChange={e=>updThu('nguoiThu',e.target.value)}/>
            </div>`

const new1 = `            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>👤 Người thu</label>
              <div style={{position:'relative'}}>
                <input className="input" placeholder="Tìm tên nhân viên..." value={formThu.nguoiThu}
                  onChange={e=>{updThu('nguoiThu',e.target.value);setShowNVSearch(true)}}
                  onFocus={()=>setShowNVSearch(true)}
                  onBlur={()=>setTimeout(()=>setShowNVSearch(false),200)}
                  style={{fontSize:'13px'}}/>
                {showNVSearch&&(
                  <div className="nv-db">
                    {(formThu.nguoiThu.trim()?nvList.filter((n:any)=>boDau(n['Họ và Tên']||'').includes(boDau(formThu.nguoiThu))):nvList).slice(0,10).map((nv:any)=>(
                      <div key={nv['Mã nhân viên']} className="nv-di"
                        onMouseDown={e=>{e.preventDefault();updThu('nguoiThu',nv['Họ và Tên']||'');setShowNVSearch(false)}}>
                        <span style={{fontWeight:600}}>{nv['Họ và Tên']}</span>
                        <span style={{marginLeft:'8px',fontSize:'11px',padding:'1px 6px',borderRadius:'10px',
                          background:'#DBEAFE',color:'#1E40AF',fontWeight:700}}>{nv['Mã nhân viên']}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>`

if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
