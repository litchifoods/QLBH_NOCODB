const fs = require('fs')
const path = require('path')

// ── PATCH page.tsx ──────────────────────────────
const pagePath = path.join(process.cwd(), 'app', 'dashboard', 'don-hang', '[maDon]', 'page.tsx')
let page = fs.readFileSync(pagePath, 'utf8')

const old1 = `  // Tính tổng đã thu từ KH
  const tongDaThu = Object.values(doiSoatMap)
    .reduce((s: number, ds: any) => s + Number(ds['Đã thu được'] || 0), 0)`
const new1 = `  // Tính tổng đã thu từ KH
  const tongDaThu = Object.values(doiSoatMap)
    .reduce((s: number, ds: any) => s + Number(ds['Đã thu được'] || 0), 0)

  // Set mã SP đã có trong chuyến đã đối soát
  const maGHDaSoat = new Set(
    ghList.filter((gh:any) => gh['Tình trạng đối soát'] === 'Đã đối soát').map((gh:any) => gh['Mã giao hàng'])
  )
  const spDaSoatSet = new Set(
    (chiTietGiaoResult.list||[])
      .filter((ct:any) => maGHDaSoat.has(ct['Mã giao hàng']))
      .map((ct:any) => ct['Tên SP (ghi nhanh)']||ct['Mã SP']||'')
      .filter(Boolean)
  )`
if (page.includes(old1)) { page = page.replace(old1, new1); console.log('OK page: spDaSoatSet') }
else console.log('FAIL page: spDaSoatSet')

const old2 = `      tongDaThu={tongDaThu}\n      user={session!}`
const new2 = `      tongDaThu={tongDaThu}\n      spDaSoatSet={spDaSoatSet}\n      user={session!}`
if (page.includes(old2)) { page = page.replace(old2, new2); console.log('OK page: prop') }
else console.log('FAIL page: prop')

fs.writeFileSync(pagePath, page, 'utf8')
console.log('page.tsx saved')

// ── PATCH ChiTietDonHangClient.tsx ────────────────────────────────
const clientPath = path.join(process.cwd(), 'components', 'ChiTietDonHangClient.tsx')
let c = fs.readFileSync(clientPath, 'utf8')

// 1. Props interface
const old3 = `  doiSoatMap?: Record<string, any>   // maGH → đối soát
  tongDaThu?: number                  // tổng tiền đã thu từ KH
  user: UserSession`
const new3 = `  doiSoatMap?: Record<string, any>   // maGH → đối soát
  tongDaThu?: number                  // tổng tiền đã thu từ KH
  spDaSoatSet?: Set<string>           // SP đã đối soát
  user: UserSession`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 1. interface') }
else console.log('FAIL 1.')

// 2. Destructuring
const old4 = `  donHang, chiTiet, khachHang, giaoHang, danhSachSP, trangThaiTinh, doiSoatMap, tongDaThu, user,`
const new4 = `  donHang, chiTiet, khachHang, giaoHang, danhSachSP, trangThaiTinh, doiSoatMap, tongDaThu, spDaSoatSet=new Set(), user,`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 2. destructuring') }
else console.log('FAIL 2.')

// 3. State hủy đơn + coTheSua
const old5 = `  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)

  // Chế độ sửa
  const [dangSua, setDangSua] = useState(false)`
const new5 = `  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)

  // Hủy đơn hàng
  const [showHuyDon,  setShowHuyDon]  = useState(false)
  const [cpTraHang,   setCpTraHang]   = useState(0)
  const [lyDoHuy,     setLyDoHuy]     = useState('')
  const [dangHuyDon,  setDangHuyDon]  = useState(false)

  // Chế độ sửa — chỉ khi Chờ giao / Đang giao / Đang giao 1 phần
  const coTheSua = ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThaiTinh||trangThai)
  const [dangSua, setDangSua] = useState(false)`
if (c.includes(old5)) { c = c.replace(old5, new5); console.log('OK 3. state') }
else console.log('FAIL 3.')

// 4. Hàm hủy đơn — KHÔNG dùng template literal
const old6 = `  const spHienThi = spList // hiển thị tất cả kể cả đã hủy`
const new6 = `  async function xacNhanHuyDon() {
    if (!lyDoHuy.trim() && (trangThaiTinh||trangThai) === 'Hoàn thành') {
      showMsg('Vui lòng nhập lý do hủy', false); return
    }
    setDangHuyDon(true)
    try {
      const tongDaThuThucTe = tongDaThu || 0
      const tienHoan = Math.max(0, tongDaThuThucTe - cpTraHang)
      const nguoiHuy = user.hoTen||user.tenDangNhap||''
      const thoiGian = new Date().toLocaleString('vi-VN')
      const ghiChuHuy = '[Huy boi ' + nguoiHuy + ' luc ' + thoiGian + (lyDoHuy ? ': ' + lyDoHuy : '') + ']'
      await fetch('/api/don-hang', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          id: donHang['Id']||donHang['id'],
          'Trang thai': 'Huy',
          'Trang thai': 'Huỷ',
          'CP doi tra': cpTraHang,
          'CP đổi trả': cpTraHang,
          'Tien hoan coc': tienHoan,
          'Tiền hoàn cọc': tienHoan,
          'Tinh trang hoan coc': tienHoan > 0 ? 'Cho hoan' : 'Khong hoan',
          'Tình trạng hoàn cọc': tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn',
          'Con phai thu': 0,
          'Còn phải thu': 0,
          'Ghi chu': (donHang['Ghi chú']||'') + ' ' + ghiChuHuy,
          'Ghi chú': (donHang['Ghi chú']||'') + ' ' + ghiChuHuy,
        }),
      })
      setTrangThai('Huỷ')
      setTienHoanCoc(tienHoan)
      setTinhTrangHoanCoc(tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn')
      setShowHuyDon(false)
      showMsg('Đã hủy đơn hàng')
      router.refresh()
    } catch(e:any) { showMsg((e.message||'Lỗi hủy'), false) }
    finally { setDangHuyDon(false) }
  }

  const spHienThi = spList // hiển thị tất cả kể cả đã hủy`
if (c.includes(old6)) { c = c.replace(old6, new6); console.log('OK 4. hàm hủy') }
else console.log('FAIL 4.')

// 5. Nút sửa chỉ hiện khi coTheSua + nút hủy đơn
const old7 = `          {!dangSua && (
            <button onClick={()=>setDangSua(true)}
              style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#F59E0B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              ✏️ Sửa đơn hàng
            </button>
          )}`
const new7 = `          {!dangSua && coTheSua && (
            <button onClick={()=>setDangSua(true)}
              style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#F59E0B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              ✏️ Sửa đơn hàng
            </button>
          )}
          {(trangThaiTinh||trangThai)!=='Huỷ'&&(
            <button onClick={()=>{setShowHuyDon(true);setCpTraHang(0);setLyDoHuy('')}}
              style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              🚫 Hủy đơn
            </button>
          )}`
if (c.includes(old7)) { c = c.replace(old7, new7); console.log('OK 5. nút hủy đơn') }
else console.log('FAIL 5.')

// 6. Badge khóa SP đã đối soát
const old8 = `                        {/* Tên SP */}
                        {dangSua && !sp.da_huy ? (
                          <input value={sp.tenSP} onChange={e=>updSP(sp.id,'tenSP',e.target.value)}
                            style={{width:'100%',padding:'3px 6px',border:'1px solid #E5E7EB',borderRadius:'4px',fontSize:'13px',fontWeight:600,marginBottom:'4px'}}/>`
const new8 = `                        {/* Tên SP */}
                        {dangSua&&!sp.da_huy&&spDaSoatSet.has(sp.tenSP||sp.maSP)&&(
                          <div style={{fontSize:'10px',background:'#FEF3C7',color:'#92400E',padding:'2px 7px',borderRadius:'8px',marginBottom:'4px',display:'inline-block',fontWeight:700}}>
                            🔒 Đã đối soát — không thể sửa/hủy
                          </div>
                        )}
                        {dangSua && !sp.da_huy && !spDaSoatSet.has(sp.tenSP||sp.maSP) ? (
                          <input value={sp.tenSP} onChange={e=>updSP(sp.id,'tenSP',e.target.value)}
                            style={{width:'100%',padding:'3px 6px',border:'1px solid #E5E7EB',borderRadius:'4px',fontSize:'13px',fontWeight:600,marginBottom:'4px'}}/>`
if (c.includes(old8)) { c = c.replace(old8, new8); console.log('OK 6. badge') }
else console.log('FAIL 6.')

// 7. Khóa nút hủy SP đã đối soát
const old9 = `                      {/* Nút hủy + checkbox */}
                      {dangSua && !sp.da_huy && (`
const new9 = `                      {/* Nút hủy + checkbox */}
                      {dangSua && !sp.da_huy && !spDaSoatSet.has(sp.tenSP||sp.maSP) && (`
if (c.includes(old9)) { c = c.replace(old9, new9); console.log('OK 7. khóa nút SP') }
else console.log('FAIL 7.')

// 8. Modal hủy đơn
const old10 = `      {/* ── Confirm hủy tất cả đã chọn ── */}`
const new10 = `      {/* ── Modal hủy đơn ── */}
      {showHuyDon&&(
        <div className="overlay" onClick={()=>setShowHuyDon(false)}>
          <div className="confirm-box" style={{maxWidth:'420px',textAlign:'left'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'32px',textAlign:'center',marginBottom:'8px'}}>🚫</div>
            <h3 style={{fontWeight:700,fontSize:'16px',textAlign:'center',margin:'0 0 4px'}}>Hủy đơn hàng</h3>
            <p style={{fontSize:'13px',color:'#6B7280',textAlign:'center',margin:'0 0 16px'}}>
              <strong style={{color:'var(--primary)'}}>{maDon}</strong>
            </p>
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'12px',fontSize:'13px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
                <span style={{color:'#6B7280'}}>Tổng đã thu từ KH:</span>
                <span style={{fontWeight:700,color:'#16A34A'}}>{Number(tongDaThu||0).toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                <span style={{color:'#6B7280'}}>CP trả hàng (KH chịu):</span>
                <input type="number" min="0" value={cpTraHang||''} placeholder="0"
                  onChange={e=>setCpTraHang(Number(e.target.value)||0)}
                  style={{width:'120px',padding:'4px 8px',border:'1px solid #FCD34D',borderRadius:'4px',fontSize:'13px',textAlign:'right'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #E5E7EB',paddingTop:'6px',fontWeight:700}}>
                <span>Tiền hoàn trả KH:</span>
                <span style={{color:'#DC2626',fontSize:'15px'}}>{Math.max(0,(tongDaThu||0)-cpTraHang).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            <div style={{background:'#EFF6FF',borderRadius:'6px',padding:'8px 12px',marginBottom:'12px',fontSize:'12px',color:'#1E40AF'}}>
              💡 CP giao hàng NV/đối tác giữ nguyên — công sức đã phát sinh.
            </div>
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>
                Lý do hủy {(trangThaiTinh||trangThai)==='Hoàn thành'&&<span style={{color:'#DC2626'}}> *</span>}
              </label>
              <input className="input" placeholder="VD: Khách đổi ý, hàng bị lỗi..." value={lyDoHuy}
                onChange={e=>setLyDoHuy(e.target.value)} style={{fontSize:'13px'}}/>
            </div>
            <div style={{background:'#FEF2F2',borderRadius:'6px',padding:'8px 12px',marginBottom:'14px',fontSize:'12px',color:'#DC2626',fontWeight:600}}>
              ⚠️ Đơn hàng vẫn lưu trên hệ thống — không bị xóa.
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanHuyDon} disabled={dangHuyDon}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangHuyDon?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                {dangHuyDon?'Đang hủy...':'🚫 Xác nhận hủy đơn'}
              </button>
              <button onClick={()=>setShowHuyDon(false)}
                style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>
                Không hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm hủy tất cả đã chọn ── */}`
if (c.includes(old10)) { c = c.replace(old10, new10); console.log('OK 8. modal hủy') }
else console.log('FAIL 8.')

fs.writeFileSync(clientPath, c, 'utf8')
console.log('Done! ChiTietDonHangClient.tsx saved.')
