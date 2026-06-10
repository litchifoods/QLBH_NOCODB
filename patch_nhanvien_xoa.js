const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'NhanVienClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm state xóa NV sau state loading
const old1 = `  const [loading,      setLoading]      = useState(false)
  const [showModal,    setShowModal]    = useState(false)`
const new1 = `  const [loading,      setLoading]      = useState(false)
  const [showModal,    setShowModal]    = useState(false)
  const [xoaNV,        setXoaNV]        = useState<any>(null)   // NV đang chờ xóa
  const [xoaCheck,     setXoaCheck]     = useState<any>(null)   // kết quả kiểm tra
  const [loadingXoa,   setLoadingXoa]   = useState(false)`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK 1. State xóa NV') }
else console.log('FAIL 1. State')

// 2. Thêm hàm kiemTraXoa sau hàm resetForm
const old2 = `  function moSua(nv:any){`
const new2 = `  async function moXoa(nv:any){
    setXoaNV(nv)
    setXoaCheck(null)
    setLoadingXoa(true)
    try{
      const res=await fetch('/api/nhan-vien?loai=kiem-tra-xoa&maNV='+encodeURIComponent(nv['Mã nhân viên']))
      const d=await res.json()
      setXoaCheck(d)
    }catch(e){setXoaCheck({coTheXoa:false,lyDo:['Lỗi kiểm tra']})}
    finally{setLoadingXoa(false)}
  }

  async function xacNhanXoa(){
    if(!xoaNV||!xoaCheck?.coTheXoa) return
    setLoadingXoa(true)
    try{
      const res=await fetch('/api/nhan-vien?id='+Number(xoaNV['Id']||xoaNV['id'])+'&loai=nv&maNV='+encodeURIComponent(xoaNV['Mã nhân viên']),{method:'DELETE'})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message||'Lỗi')
      setLocalNV((p:any[])=>p.filter(n=>(n['Id']||n['id'])!==(xoaNV['Id']||xoaNV['id'])))
      showMsg2('✅ Đã xóa: '+xoaNV['Họ và Tên'])
      setXoaNV(null);setXoaCheck(null)
      if(view==='detail'&&nvChon&&(nvChon['Id']||nvChon['id'])===(xoaNV['Id']||xoaNV['id'])){
        setView('list');setNvChon(null)
      }
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoadingXoa(false)}
  }

  function moSua(nv:any){`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK 2. Hàm xóa NV') }
else console.log('FAIL 2. Hàm xóa')

// 3. Thêm nút xóa vào danh sách NV (sau nút ✏️)
const old3 = `                          <button onClick={()=>moSua(nv)} title="Sửa thông tin"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600}}>✏️</button>
                        </div>`
const new3 = `                          <button onClick={()=>moSua(nv)} title="Sửa thông tin"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600}}>✏️</button>
                          {isOwner&&<button onClick={()=>moXoa(nv)} title="Xóa"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>}
                        </div>`
if (content.includes(old3)) { content = content.replace(old3, new3); console.log('OK 3. Nút xóa danh sách') }
else console.log('FAIL 3. Nút xóa danh sách')

// 4. Thêm nút xóa vào trang chi tiết NV (sau nút ✏️ Sửa thông tin)
const old4 = `          <button onClick={()=>moSua(nvChon)}
            style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
            ✏️ Sửa thông tin
          </button>`
const new4 = `          <button onClick={()=>moSua(nvChon)}
            style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
            ✏️ Sửa thông tin
          </button>
          {isOwner&&<button onClick={()=>moXoa(nvChon)}
            style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
            🗑️ Xóa
          </button>}`
if (content.includes(old4)) { content = content.replace(old4, new4); console.log('OK 4. Nút xóa chi tiết') }
else console.log('FAIL 4. Nút xóa chi tiết')

// 5. Thêm modal xóa NV trước function Btn
const old5 = `\nfunction Btn({children,active,disabled,onClick}:any){`
const new5 = `
      {/* ══ MODAL XÓA NV ══ */}
      {xoaNV&&(
        <div className="ov" onClick={()=>{setXoaNV(null);setXoaCheck(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'420px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>{xoaNV['Loại']==='Đối tác'?'Xóa đối tác':'Xóa nhân viên'}</h2>
            <p style={{fontSize:'14px',fontWeight:700,color:'var(--primary)',margin:'0 0 4px'}}>{xoaNV['Họ và Tên']}</p>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px'}}>{xoaNV['Mã nhân viên']} · {xoaNV['Vai trò']||'—'}</p>
            {loadingXoa&&<div style={{padding:'16px',color:'var(--text-secondary)',fontSize:'13px'}}>⏳ Đang kiểm tra dữ liệu...</div>}
            {!loadingXoa&&xoaCheck&&(
              xoaCheck.coTheXoa?(
                <div>
                  <div style={{padding:'12px',borderRadius:'8px',background:'#D1FAE5',border:'1px solid #6EE7B7',marginBottom:'16px',fontSize:'13px',color:'#065F46',fontWeight:600}}>
                    ✅ Chưa có dữ liệu liên quan — có thể xóa an toàn
                  </div>
                  <p style={{fontSize:'12px',color:'#DC2626',background:'#FEF2F2',padding:'8px 12px',borderRadius:'6px',margin:'0 0 16px'}}>
                    ⚠️ Hành động này không thể hoàn tác!
                  </p>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={xacNhanXoa} disabled={loadingXoa}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loadingXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                      {loadingXoa?'⏳ Đang xóa...':'🗑️ Xác nhận xóa'}
                    </button>
                    <button onClick={()=>{setXoaNV(null);setXoaCheck(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{padding:'12px',borderRadius:'8px',background:'#FEF3C7',border:'1px solid #FCD34D',marginBottom:'16px',fontSize:'13px',color:'#92400E'}}>
                    <div style={{fontWeight:700,marginBottom:'6px'}}>❌ Không thể xóa vì:</div>
                    <ul style={{margin:0,paddingLeft:'16px',textAlign:'left'}}>
                      {xoaCheck.lyDo.map((l:string,i:number)=><li key={i}>{l}</li>)}
                    </ul>
                  </div>
                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',marginBottom:'16px',fontSize:'12px',color:'#1E40AF'}}>
                    💡 Thay vào đó, hãy đổi trạng thái sang <strong>Nghỉ việc</strong> để ẩn khỏi danh sách hoạt động.
                  </div>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={()=>{setXoaNV(null);setXoaCheck(null);moSua(xoaNV)}}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'#D97706',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
                      ✏️ Đổi sang Nghỉ việc
                    </button>
                    <button onClick={()=>{setXoaNV(null);setXoaCheck(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Đóng</button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}

\nfunction Btn({children,active,disabled,onClick}:any){`
if (content.includes(old5)) { content = content.replace(old5, new5); console.log('OK 5. Modal xóa NV') }
else console.log('FAIL 5. Modal')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Done! NhanVienClient.tsx saved.')
