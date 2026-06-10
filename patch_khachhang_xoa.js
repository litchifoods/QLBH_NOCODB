const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'KhachHangClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm state xoaCheck sau state dangXoa
const old1 = `  const [xoaKH,      setXoaKH]      = useState<any>(null)
  const [dangXoa,    setDangXoa]    = useState(false)`
const new1 = `  const [xoaKH,      setXoaKH]      = useState<any>(null)
  const [dangXoa,    setDangXoa]    = useState(false)
  const [xoaCheck,   setXoaCheck]   = useState<any>(null)
  const [loadingXoaCheck, setLoadingXoaCheck] = useState(false)`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK 1. State xoaCheck') }
else console.log('FAIL 1. State')

// 2. Thay hàm xacNhanXoa + thêm hàm moXoa
const old2 = `  async function xacNhanXoa() {
    if (!xoaKH) return
    const rowId = xoaKH['_rowId']
    if (!rowId) { showMsg('❌ Không tìm thấy ID — vui lòng tải lại trang', false); setXoaKH(null); return }
    setDangXoa(true)
    try {
      const res = await fetch('/api/khach-hang?id='+rowId, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa')
      setLocalKH(prev => prev.filter(kh => kh['_key'] !== xoaKH['_key']))
      showMsg('✅ Đã xóa: ' + xoaKH['Tên khách hàng'], true)
      setXoaKH(null)
    } catch (err: any) {
      showMsg('❌ ' + (err.message || 'Lỗi xóa'), false)
    } finally { setDangXoa(false) }
  }`

const new2 = `  async function moXoa(kh: any) {
    setXoaKH(kh)
    setXoaCheck(null)
    setLoadingXoaCheck(true)
    try {
      const maKH = kh['Mã KH'] || ''
      const res = await fetch('/api/khach-hang?loai=kiem-tra-xoa&maKH='+encodeURIComponent(maKH))
      const d = await res.json()
      setXoaCheck(d)
    } catch { setXoaCheck({ coTheXoa: false, lyDo: ['Lỗi kiểm tra'] }) }
    finally { setLoadingXoaCheck(false) }
  }

  async function xacNhanXoa() {
    if (!xoaKH || !xoaCheck?.coTheXoa) return
    const rowId = xoaKH['_rowId']
    if (!rowId) { showMsg('❌ Không tìm thấy ID — vui lòng tải lại trang', false); setXoaKH(null); return }
    setDangXoa(true)
    try {
      const maKH = xoaKH['Mã KH'] || ''
      const res = await fetch('/api/khach-hang?id='+rowId+'&maKH='+encodeURIComponent(maKH), { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi xóa')
      setLocalKH(prev => prev.filter(kh => kh['_key'] !== xoaKH['_key']))
      showMsg('✅ Đã xóa: ' + xoaKH['Tên khách hàng'], true)
      setXoaKH(null); setXoaCheck(null)
    } catch (err: any) {
      showMsg('❌ ' + (err.message || 'Lỗi xóa'), false)
    } finally { setDangXoa(false) }
  }`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK 2. Hàm moXoa + xacNhanXoa') }
else console.log('FAIL 2. Hàm xóa')

// 3. Nút xóa trong bảng: chỉ chủ thấy + gọi moXoa thay setXoaKH
const old3 = `                        <button onClick={()=>setXoaKH(kh)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>🗑️</button>`
const new3 = `                        {user.vaiTro==='Chủ cửa hàng'&&<button onClick={()=>moXoa(kh)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>🗑️</button>}`
if (content.includes(old3)) { content = content.replace(old3, new3); console.log('OK 3. Nút xóa phân quyền') }
else console.log('FAIL 3. Nút xóa')

// 4. Thay modal xóa cũ bằng modal mới có kiểm tra
const old4 = `      {/* MODAL XÁC NHẬN XÓA */}
      {xoaKH&&(
        <div className="ov" onClick={()=>setXoaKH(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'360px'}} onClick={e=>e.stopPropagation()}>
            <div style={{textAlign:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 6px'}}>Xác nhận xóa</h2>
              <p style={{fontSize:'13px',color:'#6B7280',margin:0}}>Xóa <strong>{xoaKH['Tên khách hàng']}</strong>?</p>
              <p style={{fontSize:'12px',color:'#DC2626',margin:'8px 0 0',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>⚠️ Không thể hoàn tác!</p>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanXoa} disabled={dangXoa} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,fontSize:'14px',cursor:dangXoa?'not-allowed':'pointer'}}>
                {dangXoa?'⏳ Đang xóa...':'🗑️ Xóa'}
              </button>
              <button onClick={()=>setXoaKH(null)} style={{flex:1,padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}`

const new4 = `      {/* MODAL XÁC NHẬN XÓA */}
      {xoaKH&&(
        <div className="ov" onClick={()=>{setXoaKH(null);setXoaCheck(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>Xóa khách hàng</h2>
            <p style={{fontSize:'14px',fontWeight:700,color:'var(--primary)',margin:'0 0 4px'}}>{xoaKH['Tên khách hàng']}</p>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px'}}>{xoaKH['Mã KH']||''}{xoaKH['Số điện thoại']?' · '+xoaKH['Số điện thoại']:''}</p>
            {loadingXoaCheck&&<div style={{padding:'16px',color:'var(--text-secondary)',fontSize:'13px'}}>⏳ Đang kiểm tra dữ liệu...</div>}
            {!loadingXoaCheck&&xoaCheck&&(
              xoaCheck.coTheXoa?(
                <div>
                  <div style={{padding:'10px 14px',borderRadius:'8px',background:'#D1FAE5',border:'1px solid #6EE7B7',marginBottom:'14px',fontSize:'13px',color:'#065F46',fontWeight:600}}>
                    ✅ Khách hàng chưa có đơn hàng — có thể xóa an toàn
                  </div>
                  <p style={{fontSize:'12px',color:'#DC2626',background:'#FEF2F2',padding:'8px 12px',borderRadius:'6px',margin:'0 0 16px'}}>⚠️ Hành động này không thể hoàn tác!</p>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={xacNhanXoa} disabled={dangXoa}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                      {dangXoa?'⏳ Đang xóa...':'🗑️ Xác nhận xóa'}
                    </button>
                    <button onClick={()=>{setXoaKH(null);setXoaCheck(null)}}
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
                    💡 Lịch sử mua hàng và công nợ cần được giữ lại để tra cứu sau này.
                  </div>
                  <button onClick={()=>{setXoaKH(null);setXoaCheck(null)}}
                    style={{width:'100%',padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600,fontSize:'14px'}}>Đóng</button>
                </div>
              )
            )}
          </div>
        </div>
      )}`
if (content.includes(old4)) { content = content.replace(old4, new4); console.log('OK 4. Modal xóa mới') }
else console.log('FAIL 4. Modal')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Done! KhachHangClient.tsx saved.')
