const fs = require('fs')
const f = 'components/KiemKhoClient.tsx'
let c = fs.readFileSync(f, 'utf8')

const old1 = `                            {isOwner&&dot['Trạng thái']!=='Đã duyệt'&&(
                              <button onClick={()=>setXoaDot(dot)}
                                style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>
                            )}`
const new1 = `                            {isOwner&&(dot['Trạng thái']!=='Đã duyệt'
                              ?<button onClick={()=>setXoaDot(dot)}
                                style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>
                              :<span style={{display:'inline-block',width:'30px'}}></span>
                            )}`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK') }
else console.log('FAIL')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
