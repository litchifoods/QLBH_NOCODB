'use client'
// components/InHoaDonClient.tsx
import { useState, useRef, useEffect } from 'react'

function formatVND(n: number | string) { return Number(n||0).toLocaleString('vi-VN')+'đ' }
function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function soTienBangChu(n: number): string {
  if (n===0) return 'Không đồng'
  const ch=['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín']
  function docNhom(x: number): string {
    const tr=Math.floor(x/100),ch_tr=x%100,ch10=Math.floor(ch_tr/10),dv=ch_tr%10
    let s=''
    if(tr>0) s+=ch[tr]+' trăm '
    if(ch10>1){s+=ch[ch10]+' mươi ';if(dv===1)s+='mốt ';else if(dv===5)s+='lăm ';else if(dv>0)s+=ch[dv]+' '}
    else if(ch10===1){s+='mười ';if(dv>0)s+=ch[dv]+' '}
    else if(dv>0&&tr>0)s+='lẻ '+ch[dv]+' '
    else if(dv>0)s+=ch[dv]+' '
    return s.trim()
  }
  const parts:number[]=[]
  let tmp=Math.floor(n)
  while(tmp>0){parts.unshift(tmp%1000);tmp=Math.floor(tmp/1000)}
  const dv=['','nghìn','triệu','tỷ']
  return parts.map((p,i)=>p>0?docNhom(p)+(dv[parts.length-1-i]?' '+dv[parts.length-1-i]:''):'').filter(Boolean).join(' ')+' đồng'
}

type Align = 'left'|'center'|'right'
const STORAGE_KEY = 'qlbh_in_hoadon_settings'

interface Settings {
  tenCH: string
  coChuCH: number
  alignCH: Align
  gioiThieu: string
  sdtCH: string
  diaChiCH: string
  logo: string|null
  coLogo: number
  alignLogo: Align
  chanTrang: string
}

const DEFAULT_SETTINGS: Settings = {
  tenCH: 'NỘI THẤT TÍNH TUYẾT',
  coChuCH: 20,
  alignCH: 'center',
  gioiThieu: '',
  sdtCH: '',
  diaChiCH: '',
  logo: null,
  coLogo: 64,
  alignLogo: 'center',
  chanTrang: 'Cảm ơn quý khách đã tin tưởng và mua hàng tại NỘI THẤT TÍNH TUYẾT! 🏠',
}

export default function InHoaDonClient({ donHang, chiTiet, khachHang }:
  { donHang: any, chiTiet: any[], khachHang: any }) {

  const maDon    = donHang['Mã đơn hàng']
  const tongTien = Number(donHang['Tổng tiền đơn']||0)
  const datCoc   = Number(donHang['Đặt cọc']||0)
  const conLai   = Number(donHang['Còn phải thu']||tongTien-datCoc)

  const [showEdit, setShowEdit] = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [tenNV,    setTenNV]    = useState(donHang['Nhân viên bán']||'')
  const [ghiChuIn, setGhiChuIn] = useState(donHang['Ghi chú']||'')
  const logoRef = useRef<HTMLInputElement>(null)

  // Load settings từ localStorage khi mở trang
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Settings>
        setSettings(prev => ({ ...prev, ...saved }))
      }
    } catch {}
  }, [])

  function setS<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings(prev => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  // Lưu settings vào localStorage
  function luuCaiDat() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
  }

  // Reset về mặc định
  function resetCaiDat() {
    if (!confirm('Xoá tất cả cài đặt về mặc định?')) return
    localStorage.removeItem(STORAGE_KEY)
    setSettings(DEFAULT_SETTINGS)
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => { setS('logo', ev.target?.result as string); setSaved(false) }
    reader.readAsDataURL(file)
  }

  const alignStyle = (a: Align): React.CSSProperties => ({
    display:'flex',
    justifyContent: a==='center'?'center':a==='right'?'flex-end':'flex-start',
  })

  const AlignBtns = ({ val, onChange }: {val: Align, onChange:(v:Align)=>void}) => (
    <div style={{display:'flex',gap:'3px'}}>
      {(['left','center','right'] as Align[]).map(a=>(
        <button key={a} onClick={()=>onChange(a)} title={a} style={{
          padding:'4px 9px',borderRadius:'4px',border:'1px solid var(--border)',
          background:val===a?'var(--primary)':'white',
          color:val===a?'white':'var(--text-secondary)',
          fontSize:'13px',cursor:'pointer',
        }}>{a==='left'?'⬅️':a==='center'?'↔️':'➡️'}</button>
      ))}
    </div>
  )

  const { tenCH, coChuCH, alignCH, gioiThieu, sdtCH, diaChiCH, logo, coLogo, alignLogo, chanTrang } = settings

  return (
    <div>
      <style>{`
        @media print {
          .no-print{display:none!important;}
          aside,nav,header{display:none!important;}
          main{margin-left:0!important;padding:0!important;}
          .print-wrap{margin:0!important;box-shadow:none!important;border-radius:0!important;max-width:100%!important;padding:20px 28px!important;}
          body{background:white!important;}
        }
        .edit-section{border:1px solid #E5E7EB;border-radius:10px;padding:14px 16px;background:white;}
        .edit-section h4{font-size:11px;font-weight:700;color:var(--primary);margin:0 0 12px;text-transform:uppercase;letter-spacing:.05em;display:flex;align-items:center;gap:6px;}
        .eg{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:10px;}
        .lbx{font-size:11px;font-weight:600;color:#374151;display:block;margin-bottom:3px;}
        .inx{font-size:12px;padding:6px 9px;border:1px solid #D1D5DB;border-radius:6px;width:100%;box-sizing:border-box;background:white;}
        .inx:focus{outline:none;border-color:var(--primary);}
        .slider-row{display:flex;align-items:center;gap:8px;}
        .slider-row input[type=range]{flex:1;accent-color:var(--primary);}
        .slider-val{font-size:11px;font-weight:700;color:var(--primary);min-width:34px;text-align:right;}
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{padding:'11px 20px',background:'white',borderBottom:'1px solid #E5E7EB',display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
        <button onClick={()=>window.print()} style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'9px 18px',fontWeight:700,fontSize:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'6px'}}>
          🖨️ In / Xuất PDF
        </button>
        <button onClick={()=>setShowEdit(p=>!p)} style={{background:showEdit?'#EEF2FF':'white',color:showEdit?'var(--primary)':'var(--text-secondary)',border:'1px solid #E5E7EB',borderRadius:'8px',padding:'9px 16px',fontSize:'14px',cursor:'pointer'}}>
          ✏️ {showEdit?'Ẩn cài đặt in':'Cài đặt in'}
        </button>
        <button onClick={()=>window.history.back()} style={{background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',padding:'9px 16px',fontSize:'14px',cursor:'pointer',color:'#6B7280'}}>
          ← Quay lại
        </button>
        <span style={{fontSize:'12px',color:'#9CA3AF'}}>Ctrl+P để lưu PDF</span>
      </div>

      {/* Panel cài đặt */}
      {showEdit && (
        <div className="no-print" style={{padding:'16px 20px',background:'#F8FAFC',borderBottom:'1px solid #E5E7EB',display:'flex',flexDirection:'column',gap:'14px',maxWidth:'860px'}}>

          {/* Nút lưu + reset */}
          <div style={{display:'flex',gap:'10px',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap'}}>
            <p style={{fontSize:'12px',color:'#6B7280',margin:0}}>
              💡 Cài đặt sẽ được lưu vào trình duyệt, tự động áp dụng cho lần sau.
            </p>
            <div style={{display:'flex',gap:'8px'}}>
              {saved && (
                <span style={{fontSize:'12px',color:'#065F46',fontWeight:600,padding:'6px 12px',background:'#D1FAE5',borderRadius:'6px'}}>
                  ✅ Đã lưu!
                </span>
              )}
              <button onClick={luuCaiDat} style={{padding:'8px 18px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
                💾 Lưu cài đặt
              </button>
              <button onClick={resetCaiDat} style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #E5E7EB',background:'white',color:'#6B7280',fontSize:'13px',cursor:'pointer'}}>
                🔄 Đặt lại
              </button>
            </div>
          </div>

          {/* Logo */}
          <div className="edit-section">
            <h4>🖼️ LOGO CỬA HÀNG</h4>
            <div style={{display:'flex',gap:'16px',alignItems:'flex-start',flexWrap:'wrap'}}>
              <div>
                <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{display:'none'}}/>
                <button onClick={()=>logoRef.current?.click()} style={{padding:'7px 14px',border:'1px dashed #9CA3AF',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'12px',color:'#6B7280'}}>
                  {logo?'🔄 Đổi logo':'📁 Chọn logo...'}
                </button>
                {logo&&<button onClick={()=>setS('logo',null)} style={{marginLeft:'8px',background:'none',border:'none',color:'#DC2626',cursor:'pointer',fontSize:'12px'}}>✕ Xoá</button>}
                {logo&&<img src={logo} alt="preview" style={{display:'block',height:`${coLogo}px`,marginTop:'8px',objectFit:'contain',borderRadius:'4px',border:'1px solid #E5E7EB'}}/>}
              </div>
              {logo&&(
                <div style={{flex:1,minWidth:'200px',display:'flex',flexDirection:'column',gap:'10px'}}>
                  <div>
                    <label className="lbx">Căn vị trí logo</label>
                    <AlignBtns val={alignLogo} onChange={v=>setS('alignLogo',v)}/>
                  </div>
                  <div>
                    <label className="lbx">Kích thước: {coLogo}px</label>
                    <div className="slider-row">
                      <input type="range" min="30" max="160" value={coLogo} onChange={e=>setS('coLogo',Number(e.target.value))}/>
                      <span className="slider-val">{coLogo}px</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Thông tin cửa hàng */}
          <div className="edit-section">
            <h4>🏠 THÔNG TIN CỬA HÀNG</h4>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div>
                <label className="lbx">Tên cửa hàng</label>
                <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
                  <input className="inx" value={tenCH} onChange={e=>setS('tenCH',e.target.value)} style={{flex:1,minWidth:'180px'}}/>
                  <AlignBtns val={alignCH} onChange={v=>setS('alignCH',v)}/>
                  <div className="slider-row" style={{minWidth:'150px'}}>
                    <span className="lbx" style={{margin:0,whiteSpace:'nowrap'}}>Cỡ chữ:</span>
                    <input type="range" min="14" max="36" value={coChuCH} onChange={e=>setS('coChuCH',Number(e.target.value))}/>
                    <span className="slider-val">{coChuCH}px</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="lbx">Dòng giới thiệu (slogan, chuyên ngành...)</label>
                <input className="inx" placeholder="Vd: Chuyên cung cấp nội thất cao cấp — Bảo hành 12 tháng"
                  value={gioiThieu} onChange={e=>setS('gioiThieu',e.target.value)}/>
              </div>
              <div className="eg">
                <div>
                  <label className="lbx">Số điện thoại</label>
                  <input className="inx" placeholder="0901 234 567" value={sdtCH} onChange={e=>setS('sdtCH',e.target.value)}/>
                </div>
                <div>
                  <label className="lbx">Địa chỉ cửa hàng</label>
                  <input className="inx" placeholder="Số nhà, đường, quận..." value={diaChiCH} onChange={e=>setS('diaChiCH',e.target.value)}/>
                </div>
              </div>
            </div>
          </div>

          {/* Nội dung hoá đơn */}
          <div className="edit-section">
            <h4>📝 NỘI DUNG HOÁ ĐƠN</h4>
            <div className="eg">
              <div>
                <label className="lbx">Nhân viên bán</label>
                <input className="inx" value={tenNV} onChange={e=>setTenNV(e.target.value)}/>
              </div>
              <div>
                <label className="lbx">Ghi chú trên hoá đơn</label>
                <input className="inx" placeholder="Ghi chú thêm..." value={ghiChuIn} onChange={e=>setGhiChuIn(e.target.value)}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label className="lbx">Chân trang hoá đơn</label>
                <input className="inx" value={chanTrang} onChange={e=>setS('chanTrang',e.target.value)}/>
              </div>
            </div>
          </div>

          {/* Nút lưu dưới cùng */}
          <div style={{display:'flex',justifyContent:'flex-end',gap:'8px'}}>
            {saved&&<span style={{fontSize:'12px',color:'#065F46',fontWeight:600,padding:'8px 14px',background:'#D1FAE5',borderRadius:'6px'}}>✅ Đã lưu!</span>}
            <button onClick={luuCaiDat} style={{padding:'9px 22px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
              💾 Lưu cài đặt
            </button>
          </div>
        </div>
      )}

      {/* ── HOÁ ĐƠN IN ── */}
      <div style={{padding:'20px',background:'#F3F4F6',minHeight:'calc(100vh - 56px)'}}>
        <div className="print-wrap" style={{maxWidth:'720px',margin:'0 auto',background:'white',padding:'36px 44px',borderRadius:'12px',boxShadow:'0 4px 24px rgba(0,0,0,0.1)'}}>

          {/* Logo */}
          {logo&&(
            <div style={{...alignStyle(alignLogo),marginBottom:'12px'}}>
              <img src={logo} alt="logo" style={{height:`${coLogo}px`,objectFit:'contain'}}/>
            </div>
          )}

          {/* Header cửa hàng */}
          <div style={{...alignStyle(alignCH),flexDirection:'column',alignItems:alignCH==='center'?'center':alignCH==='right'?'flex-end':'flex-start',marginBottom:'10px',paddingBottom:'14px',borderBottom:'2px solid #1B3A6B'}}>
            <div style={{fontSize:`${coChuCH}px`,fontFamily:'Playfair Display,serif',fontWeight:800,color:'#1B3A6B',letterSpacing:'0.02em',lineHeight:1.2}}>
              {tenCH}
            </div>
            {gioiThieu&&<div style={{fontSize:'13px',color:'#4B5563',marginTop:'3px',fontStyle:'italic'}}>{gioiThieu}</div>}
            <div style={{fontSize:'12px',color:'#6B7280',marginTop:'5px',display:'flex',gap:'14px',flexWrap:'wrap',justifyContent:alignCH==='center'?'center':alignCH==='right'?'flex-end':'flex-start'}}>
              {sdtCH&&<span>📞 {sdtCH}</span>}
              {diaChiCH&&<span>📍 {diaChiCH}</span>}
              {!sdtCH&&!diaChiCH&&<span style={{color:'#9CA3AF',fontStyle:'italic'}}>Điền SĐT và địa chỉ ở mục Cài đặt in</span>}
            </div>
          </div>

          {/* Tiêu đề */}
          <div style={{textAlign:'center',marginBottom:'18px'}}>
            <div style={{fontSize:'17px',fontWeight:800,textTransform:'uppercase',letterSpacing:'0.06em',color:'#0F172A'}}>Hoá đơn bán hàng</div>
            <div style={{fontSize:'13px',color:'#6B7280',marginTop:'4px'}}>
              Số: <strong>{maDon}</strong> &nbsp;|&nbsp; Ngày: <strong>{formatDate(donHang['Ngày bán']||donHang['Ngày đặt'])}</strong>
            </div>
          </div>

          {/* KH + Giao hàng */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'18px',fontSize:'13px'}}>
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px 14px'}}>
              <div style={{fontWeight:700,color:'#374151',marginBottom:'6px',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Khách hàng</div>
              <div style={{fontWeight:700,fontSize:'14px'}}>{khachHang?.['Tên khách hàng']||donHang['Tên khách hàng']||donHang['Mã KH']||'—'}</div>
              {khachHang?.['Số điện thoại']&&<div style={{color:'#6B7280',marginTop:'3px'}}>📞 {khachHang['Số điện thoại']}</div>}
              {khachHang?.['Địa chỉ']&&<div style={{color:'#6B7280',marginTop:'2px'}}>📍 {khachHang['Địa chỉ']}</div>}
            </div>
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px 14px'}}>
              <div style={{fontWeight:700,color:'#374151',marginBottom:'6px',fontSize:'11px',textTransform:'uppercase',letterSpacing:'0.05em'}}>Giao hàng</div>
              <div><strong>Hình thức:</strong> {donHang['Hình thức giao hàng']||'—'}</div>
              <div style={{marginTop:'2px'}}><strong>Ngày hẹn:</strong> {formatDate(donHang['Ngày hẹn giao'])}</div>
              <div style={{marginTop:'2px'}}><strong>Nhân viên bán:</strong> {tenNV||'—'}</div>
            </div>
          </div>

          {/* Bảng sản phẩm */}
          <table style={{width:'100%',borderCollapse:'collapse',marginBottom:'14px',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#1B3A6B',color:'white'}}>
                <th style={{padding:'8px 10px',textAlign:'center',width:'5%'}}>STT</th>
                <th style={{padding:'8px 10px',textAlign:'left'}}>Tên sản phẩm</th>
                <th style={{padding:'8px 10px',textAlign:'center',width:'8%'}}>SL</th>
                <th style={{padding:'8px 10px',textAlign:'right',width:'18%'}}>Đơn giá</th>
                <th style={{padding:'8px 10px',textAlign:'right',width:'18%'}}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {chiTiet.map((ct:any,i:number)=>(
                <tr key={i} style={{background:i%2===0?'#F8FAFC':'white',borderBottom:'1px solid #E5E7EB'}}>
                  <td style={{padding:'8px 10px',textAlign:'center',color:'#6B7280'}}>{i+1}</td>
                  <td style={{padding:'8px 10px'}}>
                    <div style={{fontWeight:600}}>{ct['Tên SP (ghi nhanh)']||ct['Mã SP']||'—'}</div>
                    {ct['Ghi chú SP']&&<div style={{fontSize:'11px',color:'#6B7280',fontStyle:'italic'}}>{ct['Ghi chú SP']}</div>}
                  </td>
                  <td style={{padding:'8px 10px',textAlign:'center'}}>{ct['Số lượng']}</td>
                  <td style={{padding:'8px 10px',textAlign:'right'}}>{formatVND(ct['Đơn giá'])}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700}}>{formatVND(ct['Thành tiền'])}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{borderTop:'2px solid #1B3A6B'}}>
                <td colSpan={4} style={{padding:'8px 10px',textAlign:'right',fontWeight:700}}>Tổng tiền:</td>
                <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,fontSize:'15px',color:'#1B3A6B'}}>{formatVND(tongTien)}</td>
              </tr>
              {datCoc>0&&(
                <tr>
                  <td colSpan={4} style={{padding:'5px 10px',textAlign:'right',color:'#065F46'}}>Đã đặt cọc ({donHang['Hình thức cọc']||'—'}):</td>
                  <td style={{padding:'5px 10px',textAlign:'right',color:'#065F46',fontWeight:700}}>- {formatVND(datCoc)}</td>
                </tr>
              )}
              <tr style={{background:'#FEF3C7'}}>
                <td colSpan={4} style={{padding:'8px 10px',textAlign:'right',fontWeight:800}}>Còn phải thu:</td>
                <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,fontSize:'16px',color:'#DC2626'}}>{formatVND(conLai)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Bằng chữ */}
          <div style={{fontSize:'12px',color:'#374151',marginBottom:'14px',fontStyle:'italic'}}>
            Số tiền còn lại bằng chữ: <strong style={{textTransform:'capitalize'}}>{soTienBangChu(conLai)}</strong>
          </div>

          {/* Ghi chú */}
          {ghiChuIn&&(
            <div style={{fontSize:'12px',color:'#6B7280',background:'#F8FAFC',padding:'8px 12px',borderRadius:'6px',marginBottom:'14px'}}>
              <strong>Ghi chú:</strong> {ghiChuIn}
            </div>
          )}

          {/* Ký tên */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'32px',marginTop:'24px',paddingTop:'14px',borderTop:'1px dashed #D1D5DB',fontSize:'13px',textAlign:'center'}}>
            <div>
              <div style={{fontWeight:700,marginBottom:'44px'}}>KHÁCH HÀNG</div>
              <div style={{borderBottom:'1px solid #374151',marginBottom:'4px'}}></div>
              <div style={{color:'#6B7280',fontSize:'11px'}}>(Ký và ghi rõ họ tên)</div>
            </div>
            <div>
              <div style={{fontWeight:700,marginBottom:'44px'}}>NHÂN VIÊN BÁN</div>
              <div style={{borderBottom:'1px solid #374151',marginBottom:'4px'}}></div>
              <div style={{color:'#6B7280',fontSize:'11px'}}>({tenNV||'Nhân viên'})</div>
            </div>
          </div>

          {/* Chân trang */}
          <div style={{marginTop:'20px',textAlign:'center',fontSize:'12px',color:'#9CA3AF',borderTop:'1px solid #E5E7EB',paddingTop:'12px'}}>
            {chanTrang}
          </div>
        </div>
      </div>
    </div>
  )
}
