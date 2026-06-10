const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'SanPhamClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm state xoaCheck sau dangXoa
const old1 = `  const [xoaSP,    setXoaSP]    = useState<any>(null)
  const [dangXoa,  setDangXoa]  = useState(false)`
const new1 = `  const [xoaSP,    setXoaSP]    = useState<any>(null)
  const [dangXoa,  setDangXoa]  = useState(false)
  const [xoaCheck, setXoaCheck] = useState<any>(null)
  const [loadingXoaCheck, setLoadingXoaCheck] = useState(false)`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK 1. State') }
else console.log('FAIL 1. State')

// 2. Thêm hàm moXoa + sửa xacNhanXoa
const old2 = `  async function xacNhanXoa(){
    if (!xoaSP) return
    setDangXoa(true)
    try {
      const res = await fetch('/api/san-pham?id='+xoaSP._rowId,{method:'DELETE'})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.filter(sp=>sp._key!==xoaSP._key))
      showMsg2('✅ Đã xóa: '+xoaSP['Tên sản phẩm'])
      setXoaSP(null)
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi xóa'),false)}
    finally{setDangXoa(false)}
  }`
const new2 = `  async function moXoa(sp: any) {
    setXoaSP(sp); setXoaCheck(null); setLoadingXoaCheck(true)
    try {
      const maSP = sp['Mã SP'] || ''
      const res = await fetch('/api/san-pham?loai=kiem-tra-xoa&maSP='+encodeURIComponent(maSP))
      const d = await res.json(); setXoaCheck(d)
    } catch { setXoaCheck({ coTheXoa: false, lyDo: ['Lỗi kiểm tra'] }) }
    finally { setLoadingXoaCheck(false) }
  }

  async function xacNhanXoa(){
    if (!xoaSP || !xoaCheck?.coTheXoa) return
    setDangXoa(true)
    try {
      const maSP = xoaSP['Mã SP'] || ''
      const res = await fetch('/api/san-pham?id='+xoaSP._rowId+'&maSP='+encodeURIComponent(maSP),{method:'DELETE'})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.filter(sp=>sp._key!==xoaSP._key))
      showMsg2('✅ Đã xóa: '+xoaSP['Tên sản phẩm'])
      setXoaSP(null); setXoaCheck(null)
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi xóa'),false)}
    finally{setDangXoa(false)}
  }`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK 2. Hàm xóa') }
else console.log('FAIL 2. Hàm xóa')

// 3. Nút xóa: chỉ chủ thấy + gọi moXoa
const old3 = `                        <button onClick={()=>setXoaSP(sp)} title="Xóa" style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>`
const new3 = `                        {user.vaiTro==='Chủ cửa hàng'&&<button onClick={()=>moXoa(sp)} title="Xóa" style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>}`
if (content.includes(old3)) { content = content.replace(old3, new3); console.log('OK 3. Nút xóa') }
else console.log('FAIL 3. Nút xóa')

// 4. Thay modal xóa cũ bằng modal mới có kiểm tra
const old4 = `      {/* MODAL XÁC NHẬN XÓA */}
      {xoaSP&&(
        <div className="ov" onClick={()=>setXoaSP(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'360px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 8px'}}>Xác nhận xóa</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}>Xóa <strong>{xoaSP['Tên sản phẩm']}</strong>?</p>
            <p style={{fontSize:'12px',color:'#DC2626',margin:'0 0 16px',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>⚠️ Không thể hoàn tác!</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanXoa} disabled={dangXoa} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,fontSize:'14px',cursor:dangXoa?'not-allowed':'pointer'}}>
                {dangXoa?'⏳':'🗑️ Xóa'}
              </button>
              <button onClick={()=>setXoaSP(null)} style={{flex:1,padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}`
const new4 = `      {/* MODAL XÁC NHẬN XÓA */}
      {xoaSP&&(
        <div className="ov" onClick={()=>{setXoaSP(null);setXoaCheck(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>Xóa sản phẩm</h2>
            <p style={{fontSize:'14px',fontWeight:700,color:'var(--primary)',margin:'0 0 4px'}}>{xoaSP['Tên sản phẩm']}</p>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px'}}>{xoaSP['Mã SP']||''}{xoaSP['Loại SP']?' · '+xoaSP['Loại SP']:''}</p>
            {loadingXoaCheck&&<div style={{padding:'16px',color:'var(--text-secondary)',fontSize:'13px'}}>⏳ Đang kiểm tra dữ liệu...</div>}
            {!loadingXoaCheck&&xoaCheck&&(
              xoaCheck.coTheXoa?(
                <div>
                  <div style={{padding:'10px 14px',borderRadius:'8px',background:'#D1FAE5',border:'1px solid #6EE7B7',marginBottom:'14px',fontSize:'13px',color:'#065F46',fontWeight:600}}>
                    ✅ Sản phẩm chưa có trong đơn hàng — có thể xóa an toàn
                  </div>
                  <p style={{fontSize:'12px',color:'#DC2626',background:'#FEF2F2',padding:'8px 12px',borderRadius:'6px',margin:'0 0 16px'}}>⚠️ Hành động này không thể hoàn tác!</p>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={xacNhanXoa} disabled={dangXoa}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                      {dangXoa?'⏳ Đang xóa...':'🗑️ Xác nhận xóa'}
                    </button>
                    <button onClick={()=>{setXoaSP(null);setXoaCheck(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{padding:'12px 14px',borderRadius:'8px',background:'#FEF3C7',border:'1px solid #FCD34D',marginBottom:'14px',fontSize:'13px',color:'#92400E',textAlign:'left'}}>
                    <div style={{fontWeight:700,marginBottom:'6px'}}>❌ Không thể xóa vì:</div>
                    <ul style={{margin:0,paddingLeft:'16px'}}>
                      {xoaCheck.lyDo.map((l:string,i:number)=><li key={i}>{l}</li>)}
                    </ul>
                  </div>
                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',marginBottom:'14px',fontSize:'12px',color:'#1E40AF',textAlign:'left'}}>
                    💡 SP loại "Theo yêu cầu" đã bán: tồn kho = 0 là đủ để ẩn khỏi danh sách có hàng.
                  </div>
                  <button onClick={()=>{setXoaSP(null);setXoaCheck(null)}}
                    style={{width:'100%',padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600,fontSize:'14px'}}>Đóng</button>
                </div>
              )
            )}
          </div>
        </div>
      )}`
if (content.includes(old4)) { content = content.replace(old4, new4); console.log('OK 4. Modal xóa') }
else console.log('FAIL 4. Modal')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Done! SanPhamClient.tsx saved.')
