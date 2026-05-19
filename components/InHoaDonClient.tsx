'use client'
// components/InHoaDonClient.tsx
import { useState, useRef } from 'react'

function formatVND(n: number | string) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ'
}
function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function soTienBangChu(n: number): string {
  if (n === 0) return 'Không đồng'
  const ch = ['không','một','hai','ba','bốn','năm','sáu','bảy','tám','chín']
  function docNhom(x: number): string {
    const tr = Math.floor(x/100), ch_tr = x%100, ch10 = Math.floor(ch_tr/10), dv = ch_tr%10
    let s = ''
    if (tr > 0) s += ch[tr] + ' trăm '
    if (ch10 > 1) { s += ch[ch10] + ' mươi '; if (dv===1) s += 'mốt '; else if (dv===5) s += 'lăm '; else if (dv>0) s += ch[dv]+' ' }
    else if (ch10 === 1) { s += 'mười '; if (dv>0) s += ch[dv]+' ' }
    else if (dv > 0 && tr > 0) s += 'lẻ ' + ch[dv]+' '
    else if (dv > 0) s += ch[dv]+' '
    return s.trim()
  }
  const parts: number[] = []
  let tmp = Math.floor(n)
  while (tmp > 0) { parts.unshift(tmp%1000); tmp = Math.floor(tmp/1000) }
  const dv = ['','nghìn','triệu','tỷ']
  return parts.map((p,i) => p > 0 ? docNhom(p) + (dv[parts.length-1-i] ? ' '+dv[parts.length-1-i] : '') : '').filter(Boolean).join(' ') + ' đồng'
}

export default function InHoaDonClient({
  donHang, chiTiet, khachHang,
}: {
  donHang: any
  chiTiet: any[]
  khachHang: any
}) {
  const maDon    = donHang['Mã đơn hàng']
  const tongTien = Number(donHang['Tổng tiền đơn'] || 0)
  const datCoc   = Number(donHang['Đặt cọc'] || 0)
  const conLai   = Number(donHang['Còn phải thu'] || tongTien - datCoc)

  // ── State chỉnh sửa thông tin in ──────────────────────
  const [tenCH,       setTenCH]       = useState('NỘI THẤT TÍNH TUYẾT')
  const [diaChiCH,    setDiaChiCH]    = useState('')
  const [sdtCH,       setSdtCH]       = useState('')
  const [logo,        setLogo]        = useState<string | null>(null)
  const [showEdit,    setShowEdit]    = useState(false)
  const [ghiChuIn,    setGhiChuIn]    = useState(donHang['Ghi chú'] || '')
  const [tenNV,       setTenNV]       = useState(donHang['Nhân viên bán'] || '')
  const logoRef = useRef<HTMLInputElement>(null)

  // Upload logo
  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  // Xuất PDF bằng print
  function xuatPDF() {
    window.print()
  }

  return (
    <div>
      <style>{`
        @media print {
          .no-print { display:none !important; }
          aside, nav, header { display:none !important; }
          main { margin-left:0 !important; padding:0 !important; }
          .print-wrap { margin:0 !important; box-shadow:none !important; border-radius:0 !important; max-width:100% !important; padding:24px 28px !important; }
          body { background:white !important; }
        }
        .edit-panel { background:#F8FAFC; border:1px solid var(--border); border-radius:10px; padding:16px; margin-bottom:16px; }
        .label-sm { font-size:12px; font-weight:600; color:#374151; display:block; margin-bottom:3px; }
        .input-sm { font-size:13px; padding:6px 10px; border:1px solid var(--border); border-radius:6px; width:100%; background:white; }
      `}</style>

      {/* Toolbar */}
      <div className="no-print" style={{
        padding:'12px 20px', background:'white', borderBottom:'1px solid var(--border)',
        display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap',
      }}>
        <button onClick={xuatPDF}
          style={{ background:'var(--primary)', color:'white', border:'none', borderRadius:'8px', padding:'9px 18px', fontWeight:700, fontSize:'14px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
          🖨️ In / Xuất PDF
        </button>
        <button onClick={() => setShowEdit(!showEdit)}
          style={{ background: showEdit ? '#EEF2FF' : 'white', color: showEdit ? 'var(--primary)' : 'var(--text-secondary)', border:'1px solid var(--border)', borderRadius:'8px', padding:'9px 16px', fontSize:'14px', cursor:'pointer' }}>
          ✏️ {showEdit ? 'Ẩn chỉnh sửa' : 'Chỉnh sửa thông tin in'}
        </button>
        <button onClick={() => window.history.back()}
          style={{ background:'white', border:'1px solid var(--border)', borderRadius:'8px', padding:'9px 16px', fontSize:'14px', cursor:'pointer', color:'var(--text-secondary)' }}>
          ← Quay lại
        </button>
        <span style={{ fontSize:'12px', color:'var(--text-muted)', marginLeft:'4px' }}>
          Ctrl+P để in hoặc lưu PDF
        </span>
      </div>

      {/* Panel chỉnh sửa */}
      {showEdit && (
        <div className="no-print" style={{ padding:'16px 20px', background:'#F8FAFC', borderBottom:'1px solid var(--border)' }}>
          <div style={{ maxWidth:'720px', display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px' }}>
            <div>
              <label className="label-sm">Tên cửa hàng</label>
              <input className="input-sm" value={tenCH} onChange={e => setTenCH(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Số điện thoại CH</label>
              <input className="input-sm" placeholder="0901 234 567" value={sdtCH} onChange={e => setSdtCH(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Địa chỉ CH</label>
              <input className="input-sm" placeholder="Số nhà, đường, quận..." value={diaChiCH} onChange={e => setDiaChiCH(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Nhân viên bán</label>
              <input className="input-sm" value={tenNV} onChange={e => setTenNV(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Ghi chú in</label>
              <input className="input-sm" placeholder="Ghi chú thêm trên hoá đơn..." value={ghiChuIn} onChange={e => setGhiChuIn(e.target.value)} />
            </div>
            <div>
              <label className="label-sm">Logo cửa hàng</label>
              <input ref={logoRef} type="file" accept="image/*" onChange={handleLogo} style={{ display:'none' }} />
              <button onClick={() => logoRef.current?.click()}
                style={{ width:'100%', padding:'6px 10px', border:'1px dashed var(--border)', borderRadius:'6px', background:'white', cursor:'pointer', fontSize:'12px', color:'var(--text-secondary)' }}>
                {logo ? '✅ Đã chọn logo — click để đổi' : '📁 Chọn ảnh logo...'}
              </button>
              {logo && (
                <div style={{ marginTop:'6px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <img src={logo} alt="logo" style={{ height:'36px', objectFit:'contain', borderRadius:'4px' }} />
                  <button onClick={() => setLogo(null)} style={{ background:'none', border:'none', color:'#DC2626', cursor:'pointer', fontSize:'12px' }}>✕ Xoá</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hoá đơn */}
      <div style={{ padding:'20px', background:'#F3F4F6', minHeight:'calc(100vh - 120px)' }}>
        <div className="print-wrap" style={{
          maxWidth:'720px', margin:'0 auto', background:'white',
          padding:'36px 44px', borderRadius:'12px',
          boxShadow:'0 4px 24px rgba(0,0,0,0.1)',
        }}>

          {/* Header hoá đơn */}
          <div style={{ display:'flex', alignItems:'center', gap:'20px', marginBottom:'20px', paddingBottom:'16px', borderBottom:'2px solid #1B3A6B' }}>
            {logo && (
              <img src={logo} alt="logo" style={{ height:'60px', objectFit:'contain', flexShrink:0 }} />
            )}
            <div style={{ flex:1, textAlign: logo ? 'left' : 'center' }}>
              <div style={{ fontSize:'20px', fontFamily:'Playfair Display,serif', fontWeight:800, color:'#1B3A6B', letterSpacing:'0.02em' }}>
                {tenCH}
              </div>
              <div style={{ fontSize:'12px', color:'#6B7280', marginTop:'3px', display:'flex', gap:'12px', flexWrap:'wrap', justifyContent: logo ? 'flex-start' : 'center' }}>
                {sdtCH && <span>📞 {sdtCH}</span>}
                {diaChiCH && <span>📍 {diaChiCH}</span>}
                {!sdtCH && !diaChiCH && <span style={{ fontStyle:'italic' }}>Điền thông tin cửa hàng ở ô chỉnh sửa bên trên</span>}
              </div>
            </div>
          </div>

          <div style={{ textAlign:'center', marginBottom:'20px' }}>
            <div style={{ fontSize:'17px', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', color:'#0F172A' }}>
              Hoá đơn bán hàng
            </div>
            <div style={{ fontSize:'13px', color:'#6B7280', marginTop:'4px' }}>
              Số: <strong>{maDon}</strong> &nbsp;|&nbsp; Ngày: <strong>{formatDate(donHang['Ngày bán'] || donHang['Ngày đặt'])}</strong>
            </div>
          </div>

          {/* Thông tin KH + Giao hàng */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'20px', fontSize:'13px' }}>
            <div style={{ background:'#F8FAFC', borderRadius:'8px', padding:'12px 14px' }}>
              <div style={{ fontWeight:700, color:'#374151', marginBottom:'6px', fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Khách hàng</div>
              <div style={{ fontWeight:700, fontSize:'14px' }}>{khachHang?.['Tên khách hàng'] || donHang['Mã KH'] || '—'}</div>
              {khachHang?.['Số điện thoại'] && <div style={{ color:'#6B7280', marginTop:'3px' }}>📞 {khachHang['Số điện thoại']}</div>}
              {khachHang?.['Địa chỉ'] && <div style={{ color:'#6B7280', marginTop:'2px' }}>📍 {khachHang['Địa chỉ']}</div>}
            </div>
            <div style={{ background:'#F8FAFC', borderRadius:'8px', padding:'12px 14px' }}>
              <div style={{ fontWeight:700, color:'#374151', marginBottom:'6px', fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Giao hàng</div>
              <div style={{ color:'#374151' }}><strong>Hình thức:</strong> {donHang['Hình thức giao hàng'] || '—'}</div>
              <div style={{ color:'#374151', marginTop:'2px' }}><strong>Ngày hẹn:</strong> {formatDate(donHang['Ngày hẹn giao'])}</div>
              <div style={{ color:'#374151', marginTop:'2px' }}><strong>Nhân viên bán:</strong> {tenNV || '—'}</div>
            </div>
          </div>

          {/* Bảng sản phẩm */}
          <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'16px', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#1B3A6B', color:'white' }}>
                <th style={{ padding:'9px 10px', textAlign:'center', width:'5%' }}>STT</th>
                <th style={{ padding:'9px 10px', textAlign:'left' }}>Tên sản phẩm</th>
                <th style={{ padding:'9px 10px', textAlign:'center', width:'8%' }}>SL</th>
                <th style={{ padding:'9px 10px', textAlign:'right', width:'18%' }}>Đơn giá</th>
                <th style={{ padding:'9px 10px', textAlign:'right', width:'18%' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {chiTiet.map((ct: any, i: number) => (
                <tr key={i} style={{ background: i%2===0 ? '#F8FAFC' : 'white', borderBottom:'1px solid #E5E7EB' }}>
                  <td style={{ padding:'9px 10px', textAlign:'center', color:'#6B7280' }}>{i+1}</td>
                  <td style={{ padding:'9px 10px' }}>
                    <div style={{ fontWeight:600 }}>{ct['Tên SP (ghi nhanh)'] || ct['Mã SP'] || '—'}</div>
                    {ct['Ghi chú SP'] && <div style={{ fontSize:'11px', color:'#6B7280', fontStyle:'italic' }}>{ct['Ghi chú SP']}</div>}
                  </td>
                  <td style={{ padding:'9px 10px', textAlign:'center' }}>{ct['Số lượng']}</td>
                  <td style={{ padding:'9px 10px', textAlign:'right' }}>{formatVND(ct['Đơn giá'])}</td>
                  <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:700 }}>{formatVND(ct['Thành tiền'])}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop:'2px solid #1B3A6B' }}>
                <td colSpan={4} style={{ padding:'9px 10px', textAlign:'right', fontWeight:700 }}>Tổng tiền:</td>
                <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:800, fontSize:'15px', color:'#1B3A6B' }}>{formatVND(tongTien)}</td>
              </tr>
              {datCoc > 0 && (
                <tr>
                  <td colSpan={4} style={{ padding:'5px 10px', textAlign:'right', color:'#065F46' }}>
                    Đã đặt cọc ({donHang['Hình thức cọc'] || '—'}):
                  </td>
                  <td style={{ padding:'5px 10px', textAlign:'right', color:'#065F46', fontWeight:700 }}>- {formatVND(datCoc)}</td>
                </tr>
              )}
              <tr style={{ background:'#FEF3C7' }}>
                <td colSpan={4} style={{ padding:'9px 10px', textAlign:'right', fontWeight:800 }}>Còn phải thu:</td>
                <td style={{ padding:'9px 10px', textAlign:'right', fontWeight:800, fontSize:'16px', color:'#DC2626' }}>{formatVND(conLai)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Số tiền bằng chữ */}
          <div style={{ fontSize:'12px', color:'#374151', marginBottom:'16px', fontStyle:'italic' }}>
            Số tiền còn lại bằng chữ: <strong style={{ textTransform:'capitalize' }}>{soTienBangChu(conLai)}</strong>
          </div>

          {/* Ghi chú */}
          {ghiChuIn && (
            <div style={{ fontSize:'12px', color:'#6B7280', background:'#F8FAFC', padding:'8px 12px', borderRadius:'6px', marginBottom:'16px' }}>
              <strong>Ghi chú:</strong> {ghiChuIn}
            </div>
          )}

          {/* Ký tên */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px', marginTop:'28px', paddingTop:'16px', borderTop:'1px dashed #D1D5DB', fontSize:'13px', textAlign:'center' }}>
            <div>
              <div style={{ fontWeight:700, marginBottom:'44px' }}>KHÁCH HÀNG</div>
              <div style={{ borderBottom:'1px solid #374151', marginBottom:'4px' }}></div>
              <div style={{ color:'#6B7280', fontSize:'11px' }}>(Ký và ghi rõ họ tên)</div>
            </div>
            <div>
              <div style={{ fontWeight:700, marginBottom:'44px' }}>NHÂN VIÊN BÁN</div>
              <div style={{ borderBottom:'1px solid #374151', marginBottom:'4px' }}></div>
              <div style={{ color:'#6B7280', fontSize:'11px' }}>({tenNV || 'Nhân viên'})</div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ marginTop:'20px', textAlign:'center', fontSize:'11px', color:'#9CA3AF', borderTop:'1px solid #E5E7EB', paddingTop:'12px' }}>
            Cảm ơn quý khách đã tin tưởng và mua hàng tại {tenCH}! 🏠
          </div>
        </div>
      </div>
    </div>
  )
}
