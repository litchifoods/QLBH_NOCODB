const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'DonHangClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm state xóa đơn
const old1 = `  const router = useRouter()
  const [trangThai, setTrangThai] = useState(searchParams.trang_thai || 'Tất cả')`
const new1 = `  const router = useRouter()
  const [trangThai, setTrangThai] = useState(searchParams.trang_thai || 'Tất cả')
  const [xoaDon,        setXoaDon]        = useState<any>(null)
  const [dangXoaDon,    setDangXoaDon]    = useState(false)
  const [msgXoa,        setMsgXoa]        = useState('')`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK 1. State') }
else console.log('FAIL 1. State')

// 2. Thêm hàm xóa đơn sau handleNhap
const old2 = `  function PhanTrang() {`
const new2 = `  async function xacNhanXoaDon() {
    if (!xoaDon) return
    setDangXoaDon(true); setMsgXoa('')
    try {
      const id = Number(xoaDon['Id']||xoaDon['id'])
      const maDon = xoaDon['Mã đơn hàng']||''
      const res = await fetch('/api/don-hang?id='+id+'&maDon='+encodeURIComponent(maDon), {method:'DELETE'})
      const d = await res.json()
      if (!res.ok) throw new Error(d.message||'Lỗi')
      setXoaDon(null)
      router.refresh()
    } catch(e:any) { setMsgXoa('❌ '+(e.message||'Lỗi')) }
    finally { setDangXoaDon(false) }
  }

  function PhanTrang() {`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK 2. Hàm xóa') }
else console.log('FAIL 2. Hàm xóa')

// 3. Thêm nút xóa vào cột thao tác (chỉ đơn Nháp/Huỷ, chỉ chủ)
const old3 = `                        <span style={{position:'relative',display:'inline-block'}} className="tt-wrap">
                          <Link href={'/dashboard/don-hang/'+don['Mã đơn hàng']+'/in'}
                            className="btn btn-ghost btn-sm" style={{ padding:'4px 8px' }} title="In hóa đơn">🖨️</Link>
                          <span className="tt-label">In hóa đơn</span>
                        </span>
                      </div>`
const new3 = `                        <span style={{position:'relative',display:'inline-block'}} className="tt-wrap">
                          <Link href={'/dashboard/don-hang/'+don['Mã đơn hàng']+'/in'}
                            className="btn btn-ghost btn-sm" style={{ padding:'4px 8px' }} title="In hóa đơn">🖨️</Link>
                          <span className="tt-label">In hóa đơn</span>
                        </span>
                        {user.vaiTro==='Chủ cửa hàng'&&['Nháp','Huỷ',''].includes(tt)&&(
                          <button onClick={()=>setXoaDon(don)} title="Xóa đơn"
                            style={{padding:'4px 7px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',cursor:'pointer',fontSize:'12px'}}>🗑️</button>
                        )}
                      </div>`
if (content.includes(old3)) { content = content.replace(old3, new3); console.log('OK 3. Nút xóa') }
else console.log('FAIL 3. Nút xóa')

// 4. Thêm modal xóa đơn trước closing tag </div>
const old4 = `    </div>
  )
}`
const new4 = `      {/* MODAL XÓA ĐƠN HÀNG */}
      {xoaDon&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
          onClick={()=>{setXoaDon(null);setMsgXoa('')}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>Xóa đơn hàng</h2>
            <p style={{fontSize:'15px',fontWeight:700,color:'var(--primary)',margin:'0 0 4px'}}>{xoaDon['Mã đơn hàng']}</p>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 4px'}}>{getTenKH(xoaDon)}</p>
            <p style={{fontSize:'13px',fontWeight:600,color:'#374151',margin:'0 0 14px'}}>
              {formatVND(Number(xoaDon['Tổng tiền đơn']||0))}đ · {xoaDon['Trạng thái']||'Nháp'}
            </p>
            <div style={{padding:'10px 12px',borderRadius:'8px',background:'#FEF3C7',border:'1px solid #FCD34D',marginBottom:'14px',fontSize:'12px',color:'#92400E',textAlign:'left'}}>
              ⚠️ Xóa đơn sẽ xóa luôn toàn bộ chi tiết sản phẩm trong đơn. Không thể hoàn tác!
            </div>
            {msgXoa&&<div style={{padding:'8px 12px',borderRadius:'8px',background:'#FEE2E2',color:'#991B1B',fontSize:'13px',marginBottom:'12px'}}>{msgXoa}</div>}
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanXoaDon} disabled={dangXoaDon}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoaDon?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                {dangXoaDon?'⏳ Đang xóa...':'🗑️ Xác nhận xóa'}
              </button>
              <button onClick={()=>{setXoaDon(null);setMsgXoa('')}}
                style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}`
if (content.includes(old4)) { content = content.replace(old4, new4); console.log('OK 4. Modal xóa') }
else console.log('FAIL 4. Modal')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Done! DonHangClient.tsx saved.')
