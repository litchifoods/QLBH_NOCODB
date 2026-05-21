'use client'
// components/InHoaDonClient.tsx — v3.2
// Sửa: ẩn URL khi in, xuất PDF trực tiếp (html2pdf), header 2 cột tiết kiệm giấy, cỡ chữ tên CH điều chỉnh

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fVND(n: any) { return Number(n || 0).toLocaleString('vi-VN') }
function fDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const MAC_DINH = {
  tenCH:         'Nội Thất Tính Tuyết',
  coChuTenCH:    '22',   // cỡ chữ tên cửa hàng (px)
  diaChiCH:      '',
  sdtCH:         '',
  gioiThieu:     'Chuyên cung cấp các sản phẩm nội thất gia đình, nội thất văn phòng chất lượng cao',
  mangXH:        '',
  chanTrang:     'Cảm ơn quý khách đã tin tưởng và lựa chọn sản phẩm của chúng tôi!',
  logo:          '',
  logoSize:      '72',
  logoPart:      'left',   // 'left' | 'top'
  canThongTinCH: 'left',
  canTieuDe:     'center',
  canChanTrang:  'center',
}
type Settings = typeof MAC_DINH

export default function InHoaDonClient({
  don, chiTiet, khInfo, user,
}: {
  don: any; chiTiet: any[]; khInfo: any; user: UserSession
}) {
  const router     = useRouter()
  const hoaDonRef  = useRef<HTMLDivElement>(null)
  const [settings, setSettings]         = useState<Settings>(MAC_DINH)
  const [showSettings, setShowSettings] = useState(false)
  const [dangXuatPDF, setDangXuatPDF]   = useState(false)

  useEffect(() => {
    fetch('/api/cai-dat')
      .then(r => r.json())
      .then(res => {
        if (res.ok && res.data) {
          const d = res.data
          setSettings(prev => ({
            ...prev,
            tenCH:         d['hoadon_tenCH']         ?? prev.tenCH,
            coChuTenCH:    d['hoadon_coChuTenCH']    ?? prev.coChuTenCH,
            diaChiCH:      d['hoadon_diaChiCH']      ?? prev.diaChiCH,
            sdtCH:         d['hoadon_sdtCH']         ?? prev.sdtCH,
            gioiThieu:     d['hoadon_gioiThieu']     ?? prev.gioiThieu,
            mangXH:        d['hoadon_mangXH']        ?? prev.mangXH,
            chanTrang:     d['hoadon_chanTrang']     ?? prev.chanTrang,
            logo:          d['hoadon_logo']          ?? prev.logo,
            logoSize:      d['hoadon_logoSize']      ?? prev.logoSize,
            logoPart:      d['hoadon_logoPart']      ?? prev.logoPart,
            canThongTinCH: d['hoadon_canThongTinCH'] ?? prev.canThongTinCH,
            canTieuDe:     d['hoadon_canTieuDe']     ?? prev.canTieuDe,
            canChanTrang:  d['hoadon_canChanTrang']  ?? prev.canChanTrang,
          }))
        }
      })
      .catch(() => {
        try {
          const saved = localStorage.getItem('qlbh_in_hoadon_settings')
          if (saved) setSettings(prev => ({ ...prev, ...JSON.parse(saved) }))
        } catch {}
      })
  }, [])

  async function handleSaveSettings(s: Settings) {
    setSettings(s)
    setShowSettings(false)
    try {
      await fetch('/api/cai-dat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hoadon_tenCH:         s.tenCH,
          hoadon_coChuTenCH:    s.coChuTenCH,
          hoadon_diaChiCH:      s.diaChiCH,
          hoadon_sdtCH:         s.sdtCH,
          hoadon_gioiThieu:     s.gioiThieu,
          hoadon_mangXH:        s.mangXH,
          hoadon_chanTrang:     s.chanTrang,
          hoadon_logo:          s.logo,
          hoadon_logoSize:      s.logoSize,
          hoadon_logoPart:      s.logoPart,
          hoadon_canThongTinCH: s.canThongTinCH,
          hoadon_canTieuDe:     s.canTieuDe,
          hoadon_canChanTrang:  s.canChanTrang,
        }),
      })
    } catch {
      try { localStorage.setItem('qlbh_in_hoadon_settings', JSON.stringify(s)) } catch {}
    }
  }

  // ── XUẤT PDF trực tiếp bằng html2pdf.js (không hiện hộp thoại in) ──
  async function handleXuatPDF() {
    if (!hoaDonRef.current) return
    setDangXuatPDF(true)
    try {
      // Load html2pdf từ CDN nếu chưa có
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Không tải được thư viện PDF'))
          document.head.appendChild(script)
        })
      }

      const maDon = don['Mã đơn hàng'] || 'hoa-don'
      const opt = {
        margin:      [10, 10, 10, 10], // mm
        filename:    `HoaDon_${maDon}.pdf`,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }

      await (window as any).html2pdf().set(opt).from(hoaDonRef.current).save()
    } catch (err: any) {
      alert('Lỗi xuất PDF: ' + err.message + '\nVui lòng dùng nút "In hóa đơn" và chọn "Save as PDF".')
    } finally {
      setDangXuatPDF(false)
    }
  }

  const maDon      = don['Mã đơn hàng'] || ''
  const ngayDat    = don['Ngày bán'] || don['Ngày đặt'] || ''
  const ngayGiao   = don['Ngày hẹn giao'] || ''
  const tenKH      = khInfo?.['Tên khách hàng'] || don['Tên khách hàng'] || '—'
  const sdtKH      = khInfo?.['Số điện thoại'] || '—'
  const diaChiGiao = don['Địa chỉ giao'] || khInfo?.['Địa chỉ'] || '—'
  const tongTien   = Number(don['Tổng tiền đơn'] || 0)
  const datCoc     = Number(don['Đặt cọc'] || 0)
  const conLai     = Number(don['Còn phải thu'] || 0)
  const nvBan      = don['Nhân viên bán'] || '—'
  const htCoc      = don['Hình thức cọc'] || ''
  const ghiChu     = don['Ghi chú'] || ''
  const chiTietHopLe = chiTiet.filter(ct => ct['Tên SP (ghi nhanh)'] || ct['Mã SP'])
  const logoSize   = Number(settings.logoSize) || 72
  const coChu      = Number(settings.coChuTenCH) || 22

  // Tách mangXH thành 2 phần: địa chỉ/SĐT (trái) và website/mạng XH (phải)
  const dongMangXH = settings.mangXH ? settings.mangXH.split('\n').filter(Boolean) : []

  function toJustify(can: string) {
    if (can === 'center') return 'center'
    if (can === 'right')  return 'flex-end'
    return 'flex-start'
  }

  return (
    <>
      <style>{`
        @media print {
          /* Ẩn sidebar, header, thanh điều khiển, URL trình duyệt */
          .no-print,
          nav, aside, header,
          [class*="sidebar"],[class*="Sidebar"],
          [id*="sidebar"],[data-sidebar] { display:none !important; }

          /* Ẩn URL ở đầu/cuối trang khi in trên Chrome/Edge */
          @page {
            margin: 12mm;
            size: A4;
            /* Chrome hỗ trợ ẩn header/footer qua margin:0 ở đây */
          }

          body { background:white !important; margin:0 !important; }
          main,.main-content,[class*="main"] { margin:0 !important; padding:0 !important; width:100% !important; }
          .hd-wrapper { box-shadow:none !important; border:none !important; margin:0 !important; max-width:100% !important; padding:8mm 10mm !important; }
        }

        /* Gợi ý ẩn URL cho Chrome: người dùng cần bỏ tick "Headers and footers" trong hộp thoại in */

        body { background:#F3F4F6; }
        .hd-wrapper { background:white; max-width:780px; margin:0 auto; padding:28px 36px; box-shadow:0 4px 24px rgba(0,0,0,.10); }
        .hd-table { width:100%; border-collapse:collapse; font-size:13px; margin-top:8px; }
        .hd-table th { background:#1B3A6B; color:white; padding:8px 10px; text-align:left; font-weight:600; font-size:12px; }
        .hd-table td { padding:7px 10px; border-bottom:1px solid #E5E7EB; font-size:13px; }
        .hd-table tr:nth-child(even) td { background:#F9FAFB; }
        .hd-table tr:last-child td { border-bottom:none; }
      `}</style>

      {/* THANH ĐIỀU KHIỂN */}
      <div className="no-print" style={{background:'#1B3A6B',padding:'10px 16px',display:'flex',gap:'8px',alignItems:'center',position:'sticky',top:0,zIndex:100}}>
        <button onClick={() => router.back()} style={{padding:'7px 14px',borderRadius:'6px',border:'none',background:'rgba(255,255,255,.15)',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:600}}>← Quay lại</button>
        <div style={{flex:1}}/>
        <button onClick={() => setShowSettings(true)} style={{padding:'7px 14px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)',color:'white',cursor:'pointer',fontSize:'13px'}}>⚙️ Cài đặt</button>
        <button onClick={handleXuatPDF} disabled={dangXuatPDF} style={{padding:'8px 16px',borderRadius:'6px',border:'none',background: dangXuatPDF ? '#6B7280' :'#7C3AED',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
          {dangXuatPDF ? '⏳ Đang xuất...' : '📄 Xuất PDF'}
        </button>
        <button onClick={() => window.print()} style={{padding:'8px 18px',borderRadius:'6px',border:'none',background:'#22C55E',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>🖨️ In</button>
      </div>

      {/* Ghi chú nhỏ */}
      <div className="no-print" style={{background:'#FFF7ED',padding:'6px 16px',textAlign:'center',fontSize:'11px',color:'#92400E'}}>
        💡 Khi in: bỏ tick <strong>"Headers and footers"</strong> trong hộp thoại in của trình duyệt để ẩn đường link URL ở cuối trang
      </div>

      {/* NỘI DUNG HÓA ĐƠN */}
      <div style={{padding:'16px'}}>
        <div className="hd-wrapper" ref={hoaDonRef}>

          {/* ══════════════════════════════════════════
              HEADER 2 CỘT — tiết kiệm không gian
              Cột trái: Logo + Tên CH + địa chỉ + SĐT
              Cột phải: Website + fanpage + giới thiệu
              ══════════════════════════════════════════ */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'12px', alignItems:'start'}}>

            {/* CỘT TRÁI: Logo + Tên + địa chỉ + SĐT */}
            <div>
              {/* Logo + Tên CH cùng hàng hoặc logo phía trên */}
              {settings.logoPart === 'top' ? (
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:'6px',marginBottom:'6px'}}>
                  {settings.logo && <img src={settings.logo} alt="Logo" style={{width:`${logoSize}px`,height:`${logoSize}px`,objectFit:'contain'}}/>}
                  <div style={{fontSize:`${coChu}px`,fontWeight:900,color:'#1B3A6B',fontFamily:'serif',lineHeight:1.1}}>{settings.tenCH}</div>
                </div>
              ) : (
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                  {settings.logo && <img src={settings.logo} alt="Logo" style={{width:`${logoSize}px`,height:`${logoSize}px`,objectFit:'contain',flexShrink:0}}/>}
                  <div style={{fontSize:`${coChu}px`,fontWeight:900,color:'#1B3A6B',fontFamily:'serif',lineHeight:1.1}}>{settings.tenCH}</div>
                </div>
              )}
              {/* Địa chỉ */}
              {settings.diaChiCH && <div style={{fontSize:'12px',color:'#374151',marginTop:'3px'}}>📍 {settings.diaChiCH}</div>}
              {/* SĐT */}
              {settings.sdtCH && <div style={{fontSize:'12px',color:'#374151'}}>📞 {settings.sdtCH}</div>}
            </div>

            {/* CỘT PHẢI: Website/Fanpage + Giới thiệu */}
            <div style={{textAlign:'right'}}>
              {/* Mạng xã hội / website */}
              {dongMangXH.map((line, i) => (
                <div key={i} style={{fontSize:'12px',color:'#374151'}}>{line}</div>
              ))}
              {/* Giới thiệu — dòng cuối */}
              {settings.gioiThieu && (
                <div style={{fontSize:'11px',color:'#6B7280',marginTop:'4px',lineHeight:1.4,fontStyle:'italic'}}>
                  {settings.gioiThieu}
                </div>
              )}
            </div>
          </div>

          {/* TIÊU ĐỀ "HÓA ĐƠN BÁN HÀNG" */}
          <div style={{
            textAlign: settings.canTieuDe as any,
            padding:'10px 0 8px',
            borderTop:'2.5px solid #1B3A6B',
            borderBottom:'2.5px solid #1B3A6B',
            marginBottom:'14px',
          }}>
            <div style={{fontSize:'26px',fontWeight:900,color:'#1B3A6B',letterSpacing:'.06em',fontFamily:'serif',textTransform:'uppercase',lineHeight:1}}>
              HÓA ĐƠN BÁN HÀNG
            </div>
            <div style={{fontSize:'13px',marginTop:'5px',color:'#374151'}}>
              Số:&nbsp;
              <span style={{fontWeight:700,background:'#EFF6FF',padding:'2px 10px',borderRadius:'5px',color:'#1B3A6B'}}>{maDon}</span>
              &nbsp;&nbsp;
              <span style={{color:'#6B7280'}}>
                Ngày: {fDate(ngayDat)}{ngayGiao ? `  |  Giao: ${fDate(ngayGiao)}` : ''}
              </span>
            </div>
          </div>

          {/* THÔNG TIN KH + ĐƠN HÀNG */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'12px'}}>
            <div>
              <div style={{fontSize:'10px',fontWeight:700,color:'#6B7280',textTransform:'uppercase',marginBottom:'5px'}}>Khách hàng</div>
              <div style={{fontWeight:700,fontSize:'14px',color:'#1F2937'}}>{tenKH}</div>
              {sdtKH !== '—' && <div style={{fontSize:'12px',color:'#374151',marginTop:'2px'}}>📞 {sdtKH}</div>}
              {diaChiGiao !== '—' && <div style={{fontSize:'12px',color:'#374151',marginTop:'2px'}}>📍 {diaChiGiao}</div>}
            </div>
            <div>
              <div style={{fontSize:'10px',fontWeight:700,color:'#6B7280',textTransform:'uppercase',marginBottom:'5px'}}>Thông tin đơn hàng</div>
              <div style={{fontSize:'12px',color:'#374151'}}>NV bán: <strong>{nvBan}</strong></div>
              <div style={{fontSize:'12px',color:'#374151',marginTop:'2px'}}>Kênh: {don['Kênh bán'] || '—'}</div>
              <div style={{fontSize:'12px',color:'#374151',marginTop:'2px'}}>Giao: {don['Hình thức giao hàng'] || '—'}</div>
            </div>
          </div>

          {/* BẢNG SẢN PHẨM */}
          <table className="hd-table">
            <thead>
              <tr>
                <th style={{width:'28px'}}>#</th>
                <th>Sản phẩm</th>
                <th style={{textAlign:'center',width:'55px'}}>SL</th>
                <th style={{textAlign:'right',width:'115px'}}>Đơn giá</th>
                <th style={{textAlign:'right',width:'125px'}}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {chiTietHopLe.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',color:'#6B7280',padding:'16px'}}>Không có sản phẩm</td></tr>
              ) : chiTietHopLe.map((ct, i) => (
                <tr key={i}>
                  <td style={{color:'#6B7280',fontSize:'12px'}}>{i+1}</td>
                  <td>
                    <div style={{fontWeight:600}}>{ct['Tên SP (ghi nhanh)'] || ct['Mã SP']}</div>
                    {ct['Ghi chú SP'] && <div style={{fontSize:'11px',color:'#6B7280',marginTop:'1px'}}>{ct['Ghi chú SP']}</div>}
                  </td>
                  <td style={{textAlign:'center'}}>{ct['Số lượng'] || 1}</td>
                  <td style={{textAlign:'right'}}>{fVND(ct['Đơn giá'])}đ</td>
                  <td style={{textAlign:'right',fontWeight:600}}>{fVND(ct['Thành tiền'])}đ</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TỔNG TIỀN */}
          <div style={{marginTop:'12px',display:'flex',justifyContent:'flex-end'}}>
            <div style={{width:'270px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',padding:'5px 0',borderBottom:'1px solid #E5E7EB'}}>
                <span style={{color:'#6B7280'}}>Tổng tiền hàng:</span>
                <span style={{fontWeight:600}}>{fVND(tongTien)}đ</span>
              </div>
              {datCoc > 0 && (
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',padding:'5px 0',borderBottom:'1px solid #E5E7EB'}}>
                  <span style={{color:'#6B7280'}}>Đã đặt cọc{htCoc?` (${htCoc})`:''}:</span>
                  <span style={{fontWeight:600,color:'#16A34A'}}>- {fVND(datCoc)}đ</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'15px',fontWeight:800,padding:'8px 0',color:'#1B3A6B',borderTop:'2px solid #1B3A6B',marginTop:'3px'}}>
                <span>Còn phải thu:</span>
                <span style={{color:conLai>0?'#DC2626':'#16A34A'}}>{fVND(conLai)}đ</span>
              </div>
            </div>
          </div>

          {ghiChu && (
            <div style={{marginTop:'12px',padding:'8px 12px',background:'#FFF7ED',borderRadius:'6px',border:'1px solid #FED7AA',fontSize:'12px',color:'#92400E'}}>
              📝 {ghiChu}
            </div>
          )}

          {/* CHÂN TRANG */}
          {settings.chanTrang && (
            <div style={{marginTop:'20px',textAlign:settings.canChanTrang as any,fontSize:'12px',color:'#6B7280',fontStyle:'italic',borderTop:'1px solid #E5E7EB',paddingTop:'12px'}}>
              {settings.chanTrang}
            </div>
          )}

          {/* CHỮ KÝ */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'40px',marginTop:'28px',textAlign:'center',fontSize:'12px',color:'#6B7280'}}>
            <div>
              <div style={{fontWeight:700,marginBottom:'4px'}}>Khách hàng</div>
              <div style={{height:'44px',borderBottom:'1px dashed #D1D5DB',marginBottom:'4px'}}/>
              <div>{tenKH}</div>
            </div>
            <div>
              <div style={{fontWeight:700,marginBottom:'4px'}}>Người bán</div>
              <div style={{height:'44px',borderBottom:'1px dashed #D1D5DB',marginBottom:'4px'}}/>
              <div>{nvBan}</div>
            </div>
          </div>

        </div>
      </div>

      {showSettings && (
        <ModalCaiDat settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)}/>
      )}
    </>
  )
}

// ── NÚT CĂN CHỈNH ──
function BtnCan({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{flex:1,padding:'7px 4px',border:active?'2px solid #1B3A6B':'1px solid #D1D5DB',borderRadius:'6px',background:active?'#EFF6FF':'white',color:active?'#1B3A6B':'#374151',fontWeight:active?700:400,cursor:'pointer',fontSize:'12px'}}>
      {label}
    </button>
  )
}
function NhomCan({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <div style={{display:'flex',gap:'6px'}}>
      <BtnCan label="◀ Trái"  active={value==='left'}   onClick={() => onChange('left')}/>
      <BtnCan label="● Giữa"  active={value==='center'} onClick={() => onChange('center')}/>
      <BtnCan label="▶ Phải"  active={value==='right'}  onClick={() => onChange('right')}/>
    </div>
  )
}

// ── MODAL CÀI ĐẶT ──
function ModalCaiDat({ settings, onSave, onClose }: { settings:Settings; onSave:(s:Settings)=>void; onClose:()=>void }) {
  const [s, setS]           = useState<Settings>({ ...settings })
  const [saving, setSaving] = useState(false)
  const fileRef             = useRef<HTMLInputElement>(null)
  const upd = (k: keyof Settings, v: string) => setS(p => ({ ...p, [k]: v }))

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 500 * 1024) { alert('Ảnh quá lớn! Chọn ảnh dưới 500KB.'); return }
    const reader = new FileReader()
    reader.onload = ev => upd('logo', ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() { setSaving(true); await onSave(s); setSaving(false) }

  const logoSize = Number(s.logoSize) || 72
  const coChu    = Number(s.coChuTenCH) || 22

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'500px',maxHeight:'93vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>⚙️ Cài đặt hóa đơn</h2>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
        </div>
        <p style={{fontSize:'12px',color:'#16A34A',margin:'0 0 16px',background:'#F0FDF4',padding:'8px 12px',borderRadius:'6px'}}>
          ✅ Cài đặt lưu trên <strong>máy chủ</strong> — dùng được mọi thiết bị.
        </p>

        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

          {/* LOGO */}
          <fieldset style={{border:'1px solid #E5E7EB',borderRadius:'8px',padding:'12px 14px',margin:0}}>
            <legend style={{fontSize:'12px',fontWeight:700,color:'#374151',padding:'0 6px'}}>🖼️ Logo</legend>
            <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'10px'}}>
              <div style={{width:`${Math.min(logoSize,72)}px`,height:`${Math.min(logoSize,72)}px`,border:'1px dashed #D1D5DB',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,background:'#F9FAFB'}}>
                {s.logo?<img src={s.logo} alt="Logo" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{fontSize:'10px',color:'#9CA3AF',textAlign:'center'}}>Chưa có</span>}
              </div>
              <div style={{flex:1}}>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogoUpload}/>
                <button onClick={()=>fileRef.current?.click()} style={{padding:'6px 12px',border:'1px solid #D1D5DB',borderRadius:'6px',background:'white',cursor:'pointer',fontSize:'12px',display:'block',marginBottom:'5px',width:'100%'}}>📁 Chọn ảnh logo (≤500KB)</button>
                {s.logo&&<button onClick={()=>upd('logo','')} style={{padding:'4px 10px',border:'1px solid #FCA5A5',borderRadius:'6px',background:'#FEF2F2',color:'#DC2626',cursor:'pointer',fontSize:'11px',width:'100%'}}>🗑️ Xoá logo</button>}
              </div>
            </div>
            <div style={{marginBottom:'8px'}}>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'5px'}}>Vị trí logo</label>
              <div style={{display:'flex',gap:'6px'}}>
                <BtnCan label="◀ Bên trái tên CH" active={s.logoPart==='left'} onClick={()=>upd('logoPart','left')}/>
                <BtnCan label="▲ Phía trên tên CH" active={s.logoPart==='top'}  onClick={()=>upd('logoPart','top')}/>
              </div>
            </div>
            <label style={{fontSize:'11px',color:'#6B7280',display:'block',marginBottom:'3px'}}>Kích thước logo: <strong>{s.logoSize}px</strong></label>
            <input type="range" min="40" max="200" step="5" value={s.logoSize} onChange={e=>upd('logoSize',e.target.value)} style={{width:'100%'}}/>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#9CA3AF'}}><span>40px</span><span>200px</span></div>
          </fieldset>

          {/* THÔNG TIN CỬA HÀNG */}
          <fieldset style={{border:'1px solid #E5E7EB',borderRadius:'8px',padding:'12px 14px',margin:0}}>
            <legend style={{fontSize:'12px',fontWeight:700,color:'#374151',padding:'0 6px'}}>🏪 Thông tin cửa hàng</legend>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>

              {/* Tên CH + cỡ chữ */}
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên cửa hàng *</label>
                <input style={{width:'100%',padding:'7px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box'}}
                  value={s.tenCH} onChange={e=>upd('tenCH',e.target.value)} placeholder="Nội Thất Tính Tuyết"/>
                <div style={{marginTop:'6px'}}>
                  <label style={{fontSize:'11px',color:'#6B7280',display:'block',marginBottom:'3px'}}>Cỡ chữ tên CH: <strong>{s.coChuTenCH}px</strong></label>
                  <input type="range" min="14" max="40" step="1" value={s.coChuTenCH} onChange={e=>upd('coChuTenCH',e.target.value)} style={{width:'100%'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#9CA3AF'}}><span>Nhỏ (14px)</span><span>Lớn (40px)</span></div>
                  {/* Preview tên CH */}
                  <div style={{marginTop:'6px',padding:'6px 10px',background:'#F9FAFB',borderRadius:'6px',fontSize:`${coChu}px`,fontWeight:900,color:'#1B3A6B',fontFamily:'serif'}}>
                    {s.tenCH || 'Tên cửa hàng'}
                  </div>
                </div>
              </div>

              {([
                ['Địa chỉ',         'diaChiCH', 'Số 123 Đường ABC, TP...'],
                ['Số điện thoại',   'sdtCH',    '0901 234 567'],
              ] as [string, keyof Settings, string][]).map(([lb, k, ph]) => (
                <div key={String(k)}>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb}</label>
                  <input style={{width:'100%',padding:'7px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box'}}
                    placeholder={ph} value={s[k] as string} onChange={e=>upd(k,e.target.value)}/>
                </div>
              ))}

              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>
                  Website / Fanpage / Zalo / YouTube...
                  <span style={{fontWeight:400,color:'#6B7280'}}> (mỗi dòng 1 mục — hiển thị cột phải hóa đơn)</span>
                </label>
                <textarea style={{width:'100%',padding:'7px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'12px',resize:'vertical',boxSizing:'border-box'}}
                  rows={4} placeholder={'🌐 noithattinhtuyet.com\n📘 fb.com/noithattinh\n📺 youtube.com/@nttt\n💬 Zalo: 0901 234 567'}
                  value={s.mangXH} onChange={e=>upd('mangXH',e.target.value)}/>
              </div>

              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>
                  Giới thiệu ngắn
                  <span style={{fontWeight:400,color:'#6B7280'}}> (dòng cuối cột phải hóa đơn)</span>
                </label>
                <input style={{width:'100%',padding:'7px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box'}}
                  placeholder="Chuyên cung cấp nội thất..." value={s.gioiThieu} onChange={e=>upd('gioiThieu',e.target.value)}/>
              </div>

              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'5px'}}>Căn chỉnh cột trái (logo + tên CH + địa chỉ)</label>
                <NhomCan value={s.canThongTinCH} onChange={v=>upd('canThongTinCH',v)}/>
              </div>
            </div>
          </fieldset>

          {/* TIÊU ĐỀ */}
          <fieldset style={{border:'1px solid #E5E7EB',borderRadius:'8px',padding:'12px 14px',margin:0}}>
            <legend style={{fontSize:'12px',fontWeight:700,color:'#374151',padding:'0 6px'}}>📄 Tiêu đề hóa đơn</legend>
            <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'5px'}}>Căn chỉnh</label>
            <NhomCan value={s.canTieuDe} onChange={v=>upd('canTieuDe',v)}/>
          </fieldset>

          {/* CHÂN TRANG */}
          <fieldset style={{border:'1px solid #E5E7EB',borderRadius:'8px',padding:'12px 14px',margin:0}}>
            <legend style={{fontSize:'12px',fontWeight:700,color:'#374151',padding:'0 6px'}}>📝 Chân trang</legend>
            <div style={{marginBottom:'8px'}}>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Nội dung</label>
              <input style={{width:'100%',padding:'7px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box'}}
                value={s.chanTrang} onChange={e=>upd('chanTrang',e.target.value)} placeholder="Cảm ơn quý khách..."/>
            </div>
            <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'5px'}}>Căn chỉnh</label>
            <NhomCan value={s.canChanTrang} onChange={v=>upd('canChanTrang',v)}/>
          </fieldset>

          <div style={{display:'flex',gap:'10px'}}>
            <button onClick={handleSave} disabled={saving} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:saving?'#9CA3AF':'#1B3A6B',color:'white',fontWeight:700,fontSize:'14px',cursor:saving?'not-allowed':'pointer'}}>
              {saving?'⏳ Đang lưu...':'✅ Lưu cài đặt'}
            </button>
            <button onClick={onClose} style={{padding:'12px 16px',borderRadius:'8px',border:'1px solid #D1D5DB',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
          </div>
        </div>

        <p style={{fontSize:'11px',color:'#9CA3AF',marginTop:'10px',textAlign:'center'}}>Thay đổi áp dụng cho tất cả hóa đơn sau khi lưu</p>
      </div>
    </div>
  )
}
