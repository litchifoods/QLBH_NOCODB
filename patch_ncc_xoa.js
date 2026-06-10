const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'NhaCungCapClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm state xóa NCC
const old1 = `  const [loading,   setLoading]   = useState(false)
  const [editNCC,   setEditNCC]   = useState<any>(null)
  const [tabChiTiet,setTabChiTiet]=useState<'nhap-kho'|'thanh-toan'>('nhap-kho')`
const new1 = `  const [loading,   setLoading]   = useState(false)
  const [editNCC,   setEditNCC]   = useState<any>(null)
  const [tabChiTiet,setTabChiTiet]=useState<'nhap-kho'|'thanh-toan'>('nhap-kho')
  const [xoaNCC,        setXoaNCC]        = useState<any>(null)
  const [xoaCheckNCC,   setXoaCheckNCC]   = useState<any>(null)
  const [loadingXoaNCC, setLoadingXoaNCC] = useState(false)
  const [dangXoaNCC,    setDangXoaNCC]    = useState(false)`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK 1. State') }
else console.log('FAIL 1. State')

// 2. Thêm hàm moXoaNCC + xacNhanXoaNCC trước hàm moChiTiet
const old2 = `  function moChiTiet(ncc:any){setNccChon(ncc);setView('detail');setTabChiTiet('nhap-kho')}`
const new2 = `  async function moXoaNCC(ncc: any) {
    setXoaNCC(ncc); setXoaCheckNCC(null); setLoadingXoaNCC(true)
    try {
      const res = await fetch('/api/nha-cung-cap?loai=kiem-tra-xoa&maNCC='+encodeURIComponent(ncc['Mã NCC']||''))
      const d = await res.json(); setXoaCheckNCC(d)
    } catch { setXoaCheckNCC({ coTheXoa: false, lyDo: ['Lỗi kiểm tra'] }) }
    finally { setLoadingXoaNCC(false) }
  }

  async function xacNhanXoaNCC() {
    if (!xoaNCC || !xoaCheckNCC?.coTheXoa) return
    setDangXoaNCC(true)
    try {
      const id = Number(xoaNCC['Id']||xoaNCC['id'])
      const maNCC = xoaNCC['Mã NCC']||''
      const res = await fetch('/api/nha-cung-cap?id='+id+'&maNCC='+encodeURIComponent(maNCC), {method:'DELETE'})
      const d = await res.json()
      if (!res.ok) throw new Error(d.message||'Lỗi')
      setLocalNCC((p:any[])=>p.filter(n=>(n['Id']||n['id'])!==id))
      showMsg2('✅ Đã xóa NCC: '+xoaNCC['Tên NCC'])
      setXoaNCC(null); setXoaCheckNCC(null)
      if (view==='detail' && nccChon?.['Mã NCC']===maNCC) { setView('list'); setNccChon(null) }
    } catch(e:any) { showMsg2('❌ '+(e.message||'Lỗi'),false) }
    finally { setDangXoaNCC(false) }
  }

  function moChiTiet(ncc:any){setNccChon(ncc);setView('detail');setTabChiTiet('nhap-kho')}`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK 2. Hàm xóa') }
else console.log('FAIL 2. Hàm xóa')

// 3. Thêm nút xóa vào bảng danh sách (sau nút ✏️ Sửa)
const old3 = `                          <button onClick={()=>moSuaNCC(ncc)} title="Sửa thông tin nhà cung cấp"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap',lineHeight:'1.4'}}>
                            ✏️ Sửa
                          </button>
                        </div>`
const new3 = `                          <button onClick={()=>moSuaNCC(ncc)} title="Sửa thông tin nhà cung cấp"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap',lineHeight:'1.4'}}>
                            ✏️ Sửa
                          </button>
                          {isOwner&&<button onClick={()=>moXoaNCC(ncc)} title="Xóa nhà cung cấp"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap',lineHeight:'1.4'}}>
                            🗑️
                          </button>}
                        </div>`
if (content.includes(old3)) { content = content.replace(old3, new3); console.log('OK 3. Nút xóa danh sách') }
else console.log('FAIL 3. Nút xóa')

// 4. Thêm nút xóa trong trang chi tiết NCC (sau nút ✏️ Sửa thông tin)
const old4 = `            <button onClick={()=>moSuaNCC(nccChon)}
              style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
              ✏️ Sửa thông tin
            </button>`
const new4 = `            <button onClick={()=>moSuaNCC(nccChon)}
              style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
              ✏️ Sửa thông tin
            </button>
            {isOwner&&<button onClick={()=>moXoaNCC(nccChon)}
              style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
              🗑️ Xóa
            </button>}`
if (content.includes(old4)) { content = content.replace(old4, new4); console.log('OK 4. Nút xóa chi tiết') }
else console.log('FAIL 4. Nút xóa chi tiết')

// 5. Thêm modal xóa NCC trước function Btn
const old5 = `\nfunction Btn({children,active,disabled,onClick}:any){`
const new5 = `
      {/* ══ MODAL XÓA NCC ══ */}
      {xoaNCC&&(
        <div className="ov" onClick={()=>{setXoaNCC(null);setXoaCheckNCC(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>Xóa nhà cung cấp</h2>
            <p style={{fontSize:'14px',fontWeight:700,color:'var(--primary)',margin:'0 0 4px'}}>{xoaNCC['Tên NCC']}</p>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px'}}>{xoaNCC['Mã NCC']}{xoaNCC['Số điện thoại']?' · '+xoaNCC['Số điện thoại']:''}</p>
            {loadingXoaNCC&&<div style={{padding:'16px',color:'var(--text-secondary)',fontSize:'13px'}}>⏳ Đang kiểm tra dữ liệu...</div>}
            {!loadingXoaNCC&&xoaCheckNCC&&(
              xoaCheckNCC.coTheXoa?(
                <div>
                  <div style={{padding:'10px 14px',borderRadius:'8px',background:'#D1FAE5',border:'1px solid #6EE7B7',marginBottom:'14px',fontSize:'13px',color:'#065F46',fontWeight:600}}>
                    ✅ NCC chưa có giao dịch — có thể xóa an toàn
                  </div>
                  <p style={{fontSize:'12px',color:'#DC2626',background:'#FEF2F2',padding:'8px 12px',borderRadius:'6px',margin:'0 0 16px'}}>⚠️ Hành động này không thể hoàn tác!</p>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={xacNhanXoaNCC} disabled={dangXoaNCC}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoaNCC?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                      {dangXoaNCC?'⏳ Đang xóa...':'🗑️ Xác nhận xóa'}
                    </button>
                    <button onClick={()=>{setXoaNCC(null);setXoaCheckNCC(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{padding:'12px 14px',borderRadius:'8px',background:'#FEF3C7',border:'1px solid #FCD34D',marginBottom:'14px',fontSize:'13px',color:'#92400E',textAlign:'left'}}>
                    <div style={{fontWeight:700,marginBottom:'6px'}}>❌ Không thể xóa vì:</div>
                    <ul style={{margin:0,paddingLeft:'16px'}}>
                      {xoaCheckNCC.lyDo.map((l:string,i:number)=><li key={i}>{l}</li>)}
                    </ul>
                  </div>
                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',marginBottom:'14px',fontSize:'12px',color:'#1E40AF',textAlign:'left'}}>
                    💡 Lịch sử giao dịch với NCC cần giữ lại để tra cứu và đối soát sau này.
                  </div>
                  <button onClick={()=>{setXoaNCC(null);setXoaCheckNCC(null)}}
                    style={{width:'100%',padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600,fontSize:'14px'}}>Đóng</button>
                </div>
              )
            )}
          </div>
        </div>
      )}

\nfunction Btn({children,active,disabled,onClick}:any){`
if (content.includes(old5)) { content = content.replace(old5, new5); console.log('OK 5. Modal xóa') }
else console.log('FAIL 5. Modal')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Done! NhaCungCapClient.tsx saved.')
