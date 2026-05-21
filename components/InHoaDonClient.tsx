'use client'
// components/InHoaDonClient.tsx — v4.0
// Thiết kế lại hoàn toàn: layout chuyên nghiệp, đẹp, tiết kiệm giấy

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
  coChuTenCH:    '24',
  diaChiCH:      '',
  sdtCH:         '',
  gioiThieu:     'Chuyên cung cấp nội thất gia đình & văn phòng chất lượng cao',
  mangXH:        '',
  chanTrang:     'Cảm ơn quý khách đã tin tưởng và lựa chọn sản phẩm của chúng tôi!',
  logo:          '',
  logoSize:      '68',
  logoPart:      'left',
  canThongTinCH: 'left',
  canTieuDe:     'center',
  canChanTrang:  'center',
  mauChinh:      '#1B3A6B',  // màu chủ đạo
}
type Settings = typeof MAC_DINH

export default function InHoaDonClient({
  don, chiTiet, khInfo, user,
}: {
  don: any; chiTiet: any[]; khInfo: any; user: UserSession
}) {
  const router    = useRouter()
  const hdRef     = useRef<HTMLDivElement>(null)
  const [settings, setSettings]         = useState<Settings>(MAC_DINH)
  const [showSettings, setShowSettings] = useState(false)
  const [dangXuat, setDangXuat]         = useState(false)

  useEffect(() => {
    fetch('/api/cai-dat').then(r => r.json()).then(res => {
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
          mauChinh:      d['hoadon_mauChinh']      ?? prev.mauChinh,
        }))
      }
    }).catch(() => {
      try {
        const saved = localStorage.getItem('qlbh_in_hoadon_settings')
        if (saved) setSettings(prev => ({ ...prev, ...JSON.parse(saved) }))
      } catch {}
    })
  }, [])

  async function handleSave(s: Settings) {
    setSettings(s); setShowSettings(false)
    try {
      await fetch('/api/cai-dat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
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
          hoadon_mauChinh:      s.mauChinh,
        }),
      })
    } catch {
      try { localStorage.setItem('qlbh_in_hoadon_settings', JSON.stringify(s)) } catch {}
    }
  }

  async function xuatPDF() {
    if (!hdRef.current) return
    setDangXuat(true)
    try {
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script')
          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          s.onload = () => resolve(); s.onerror = () => reject(); document.head.appendChild(s)
        })
      }
      await (window as any).html2pdf().set({
        margin: [8, 8, 8, 8],
        filename: `HoaDon_${maDon}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(hdRef.current).save()
    } catch {
      alert('Lỗi xuất PDF. Vui lòng dùng nút "In" và chọn "Save as PDF".')
    } finally { setDangXuat(false) }
  }

  // Dữ liệu đơn
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
  const dsSP       = chiTiet.filter(ct => ct['Tên SP (ghi nhanh)'] || ct['Mã SP'])

  const logoSize  = Number(settings.logoSize) || 68
  const coChu     = Number(settings.coChuTenCH) || 24
  const mau       = settings.mauChinh || '#1B3A6B'
  const mauNhat   = mau + '15'  // 15 = ~8% opacity hex
  const dongMXH   = (settings.mangXH || '').split('\n').filter(Boolean)

  return (
    <>
      <style>{`
        @media print {
          .no-print, nav, aside, header,
          [class*="sidebar"],[class*="Sidebar"],[id*="sidebar"] {
            display: none !important;
          }
          body { background: white !important; margin: 0 !important; }
          main, [class*="main"] { margin: 0 !important; padding: 0 !important; width: 100% !important; }
          .hd-page { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; padding: 6mm 8mm !important; }
          @page { margin: 0; size: A4; }
        }
        * { box-sizing: border-box; }
        body { background: #E8ECF0; margin: 0; }
        .hd-page {
          background: white;
          max-width: 794px;
          margin: 0 auto;
          padding: 28px 36px 32px;
          box-shadow: 0 8px 40px rgba(0,0,0,.15);
          font-family: 'Segoe UI', Arial, sans-serif;
        }
        .sp-table { width: 100%; border-collapse: collapse; }
        .sp-table th {
          padding: 9px 12px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
        }
        .sp-table td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #F0F0F0; }
        .sp-table tr:last-child td { border-bottom: none; }
        .sp-table tr:hover td { background: #FAFBFD; }
      `}</style>

      {/* THANH ĐIỀU KHIỂN */}
      <div className="no-print" style={{
        background: mau, padding: '10px 20px',
        display: 'flex', gap: '8px', alignItems: 'center',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,.2)',
      }}>
        <button onClick={() => router.back()} style={{padding:'7px 16px',borderRadius:'6px',border:'none',background:'rgba(255,255,255,.15)',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:600}}>
          ← Quay lại
        </button>
        <div style={{flex:1}}/>
        <button onClick={() => setShowSettings(true)} style={{padding:'7px 14px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.4)',background:'rgba(255,255,255,.1)',color:'white',cursor:'pointer',fontSize:'13px'}}>
          ⚙️ Cài đặt
        </button>
        <button onClick={xuatPDF} disabled={dangXuat} style={{padding:'8px 18px',borderRadius:'6px',border:'none',background:dangXuat?'#6B7280':'#7C3AED',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
          {dangXuat ? '⏳ Đang xuất...' : '📄 Xuất PDF'}
        </button>
        <button onClick={() => window.print()} style={{padding:'8px 20px',borderRadius:'6px',border:'none',background:'#16A34A',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
          🖨️ In
        </button>
      </div>

      {/* Ghi chú */}
      <div className="no-print" style={{background:'#FFFBEB',borderBottom:'1px solid #FDE68A',padding:'6px 20px',textAlign:'center',fontSize:'11.5px',color:'#92400E'}}>
        💡 Khi in: bỏ tick <strong>"Headers and footers"</strong> để ẩn đường link URL ở cuối trang
      </div>

      {/* NỘI DUNG HÓA ĐƠN */}
      <div style={{padding:'20px 16px', background:'#E8ECF0'}}>
        <div className="hd-page" ref={hdRef}>

          {/* ═══════════════════════════════════════
              HEADER: 2 cột
              Trái: Logo + Tên + địa chỉ + SĐT
              Phải: Website/MXH + giới thiệu
              ═══════════════════════════════════════ */}
          <div style={{display:'grid', gridTemplateColumns:'1fr auto', gap:'24px', alignItems:'center', marginBottom:'0'}}>

            {/* CỘT TRÁI */}
            <div>
              <div style={{display:'flex', alignItems: settings.logoPart==='top' ? 'flex-start' : 'center', flexDirection: settings.logoPart==='top' ? 'column' : 'row', gap:'12px', marginBottom:'8px'}}>
                {settings.logo && (
                  <img src={settings.logo} alt="Logo" style={{width:`${logoSize}px`, height:`${logoSize}px`, objectFit:'contain', flexShrink:0, borderRadius:'6px'}}/>
                )}
                <div>
                  <div style={{fontSize:`${coChu}px`, fontWeight:900, color:mau, fontFamily:'Georgia,serif', lineHeight:1.1, letterSpacing:'-.01em'}}>
                    {settings.tenCH}
                  </div>
                  {settings.diaChiCH && (
                    <div style={{fontSize:'12px', color:'#555', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                      <span style={{color:mau}}>📍</span> {settings.diaChiCH}
                    </div>
                  )}
                  {settings.sdtCH && (
                    <div style={{fontSize:'12px', color:'#555', marginTop:'2px', display:'flex', alignItems:'center', gap:'4px'}}>
                      <span style={{color:mau}}>📞</span> {settings.sdtCH}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CỘT PHẢI: MXH + giới thiệu */}
            <div style={{textAlign:'right', minWidth:'180px'}}>
              {dongMXH.map((line, i) => (
                <div key={i} style={{fontSize:'11.5px', color:'#555', lineHeight:1.7}}>{line}</div>
              ))}
              {settings.gioiThieu && (
                <div style={{fontSize:'11px', color:'#888', marginTop:'4px', fontStyle:'italic', lineHeight:1.4, maxWidth:'200px', marginLeft:'auto'}}>
                  {settings.gioiThieu}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════
              TIÊU ĐỀ HÓA ĐƠN — dải màu nổi bật
              ═══════════════════════════════════════ */}
          <div style={{
            background: `linear-gradient(135deg, ${mau} 0%, ${mau}DD 100%)`,
            borderRadius: '10px',
            padding: '14px 24px',
            margin: '16px 0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div>
              <div style={{fontSize:'22px', fontWeight:900, color:'white', letterSpacing:'.08em', textTransform:'uppercase', fontFamily:'Georgia,serif'}}>
                HÓA ĐƠN BÁN HÀNG
              </div>
              <div style={{fontSize:'13px', color:'rgba(255,255,255,.8)', marginTop:'3px'}}>
                {settings.tenCH}
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{background:'white', color:mau, fontWeight:800, fontSize:'15px', padding:'4px 16px', borderRadius:'6px', marginBottom:'4px'}}>
                {maDon}
              </div>
              <div style={{fontSize:'12px', color:'rgba(255,255,255,.85)'}}>
                Ngày: {fDate(ngayDat)}
              </div>
              {ngayGiao && (
                <div style={{fontSize:'12px', color:'rgba(255,255,255,.85)'}}>
                  Giao: {fDate(ngayGiao)}
                </div>
              )}
            </div>
          </div>

          {/* ═══════════════════════════════════════
              THÔNG TIN KH + ĐƠN HÀNG — 2 card
              ═══════════════════════════════════════ */}
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'20px'}}>

            {/* Card KH */}
            <div style={{background:`linear-gradient(135deg, ${mau}0D, ${mau}05)`, border:`1px solid ${mau}25`, borderRadius:'10px', padding:'14px 16px'}}>
              <div style={{fontSize:'10px', fontWeight:800, color:mau, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px'}}>
                <span style={{width:'18px', height:'18px', background:mau, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'10px'}}>👤</span>
                Khách hàng
              </div>
              <div style={{fontWeight:800, fontSize:'15px', color:'#111', marginBottom:'4px'}}>{tenKH}</div>
              {sdtKH !== '—' && (
                <div style={{fontSize:'12.5px', color:'#444', display:'flex', alignItems:'center', gap:'5px', marginTop:'3px'}}>
                  <span style={{color:mau, fontSize:'13px'}}>📞</span> {sdtKH}
                </div>
              )}
              {diaChiGiao !== '—' && (
                <div style={{fontSize:'12.5px', color:'#444', display:'flex', alignItems:'flex-start', gap:'5px', marginTop:'3px'}}>
                  <span style={{color:mau, fontSize:'13px', flexShrink:0}}>📍</span>
                  <span>{diaChiGiao}</span>
                </div>
              )}
            </div>

            {/* Card đơn hàng */}
            <div style={{background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:'10px', padding:'14px 16px'}}>
              <div style={{fontSize:'10px', fontWeight:800, color:mau, textTransform:'uppercase', letterSpacing:'.08em', marginBottom:'8px', display:'flex', alignItems:'center', gap:'6px'}}>
                <span style={{width:'18px', height:'18px', background:mau, borderRadius:'50%', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'10px'}}>📋</span>
                Thông tin đơn
              </div>
              {[
                ['NV bán', nvBan],
                ['Kênh', don['Kênh bán'] || '—'],
                ['Giao hàng', don['Hình thức giao hàng'] || '—'],
              ].map(([lb, val]) => (
                <div key={lb} style={{display:'flex', justifyContent:'space-between', fontSize:'12.5px', marginTop:'4px'}}>
                  <span style={{color:'#888'}}>{lb}:</span>
                  <span style={{fontWeight:600, color:'#222', textAlign:'right', maxWidth:'60%'}}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════
              BẢNG SẢN PHẨM
              ═══════════════════════════════════════ */}
          <div style={{borderRadius:'10px', overflow:'hidden', border:'1px solid #E8ECF0', marginBottom:'16px'}}>
            <table className="sp-table">
              <thead>
                <tr style={{background: mau}}>
                  <th style={{color:'white', width:'32px', textAlign:'center'}}>#</th>
                  <th style={{color:'white', textAlign:'left'}}>Sản phẩm</th>
                  <th style={{color:'white', textAlign:'center', width:'52px'}}>SL</th>
                  <th style={{color:'white', textAlign:'right', width:'120px'}}>Đơn giá</th>
                  <th style={{color:'white', textAlign:'right', width:'130px'}}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {dsSP.length === 0 ? (
                  <tr><td colSpan={5} style={{textAlign:'center', color:'#aaa', padding:'24px', fontSize:'13px'}}>Không có sản phẩm</td></tr>
                ) : dsSP.map((ct, i) => (
                  <tr key={i} style={{background: i % 2 === 0 ? 'white' : '#FAFBFD'}}>
                    <td style={{textAlign:'center', color:'#aaa', fontSize:'12px', fontWeight:600}}>{i+1}</td>
                    <td>
                      <div style={{fontWeight:700, color:'#1A1A1A', fontSize:'13px'}}>{ct['Tên SP (ghi nhanh)'] || ct['Mã SP']}</div>
                      {ct['Ghi chú SP'] && <div style={{fontSize:'11px', color:'#888', marginTop:'2px', fontStyle:'italic'}}>{ct['Ghi chú SP']}</div>}
                    </td>
                    <td style={{textAlign:'center', fontWeight:600, color:'#333'}}>{ct['Số lượng'] || 1}</td>
                    <td style={{textAlign:'right', color:'#555', fontSize:'12.5px'}}>{fVND(ct['Đơn giá'])}đ</td>
                    <td style={{textAlign:'right', fontWeight:800, color:mau, fontSize:'13px'}}>{fVND(ct['Thành tiền'])}đ</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ═══════════════════════════════════════
              TỔNG TIỀN
              ═══════════════════════════════════════ */}
          <div style={{display:'flex', justifyContent:'flex-end', marginBottom:'16px'}}>
            <div style={{width:'280px', background:'#F8FAFC', borderRadius:'10px', padding:'14px 18px', border:'1px solid #E2E8F0'}}>
              <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'4px 0', borderBottom:'1px dashed #E2E8F0'}}>
                <span style={{color:'#888'}}>Tổng tiền hàng:</span>
                <span style={{fontWeight:700, color:'#333'}}>{fVND(tongTien)}đ</span>
              </div>
              {datCoc > 0 && (
                <div style={{display:'flex', justifyContent:'space-between', fontSize:'13px', padding:'4px 0', borderBottom:'1px dashed #E2E8F0'}}>
                  <span style={{color:'#888'}}>Đã cọc{htCoc ? ` (${htCoc})` : ''}:</span>
                  <span style={{fontWeight:700, color:'#16A34A'}}>- {fVND(datCoc)}đ</span>
                </div>
              )}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'8px', paddingTop:'8px', borderTop:`2px solid ${mau}`}}>
                <span style={{fontSize:'14px', fontWeight:800, color:mau}}>Còn phải thu:</span>
                <span style={{fontSize:'20px', fontWeight:900, color: conLai > 0 ? '#DC2626' : '#16A34A'}}>{fVND(conLai)}đ</span>
              </div>
            </div>
          </div>

          {/* Ghi chú đơn */}
          {ghiChu && (
            <div style={{marginBottom:'16px', padding:'10px 14px', background:'#FFFBEB', borderRadius:'8px', border:'1px solid #FDE68A', fontSize:'12.5px', color:'#92400E', display:'flex', gap:'8px'}}>
              <span style={{flexShrink:0}}>📝</span><span>{ghiChu}</span>
            </div>
          )}

          {/* ═══════════════════════════════════════
              CHÂN TRANG + CHỮ KÝ
              ═══════════════════════════════════════ */}
          <div style={{borderTop:`2px solid ${mau}20`, paddingTop:'16px', marginTop:'8px'}}>
            {/* Chữ ký */}
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px', marginBottom:'16px'}}>
              {[['Khách hàng', tenKH], ['Người bán', nvBan]].map(([title, name]) => (
                <div key={title} style={{textAlign:'center'}}>
                  <div style={{fontSize:'12px', fontWeight:700, color:mau, marginBottom:'2px', textTransform:'uppercase', letterSpacing:'.05em'}}>{title}</div>
                  <div style={{fontSize:'11px', color:'#aaa', fontStyle:'italic', marginBottom:'36px'}}>(Ký và ghi rõ họ tên)</div>
                  <div style={{borderTop:'1px dashed #CCC', paddingTop:'6px', fontSize:'12.5px', fontWeight:600, color:'#333'}}>{name}</div>
                </div>
              ))}
            </div>

            {/* Chân trang */}
            {settings.chanTrang && (
              <div style={{
                textAlign: settings.canChanTrang as any,
                fontSize: '12px', color: '#888', fontStyle: 'italic',
                padding: '10px 0 0',
                borderTop: '1px solid #F0F0F0',
              }}>
                {settings.chanTrang}
              </div>
            )}
          </div>

        </div>
      </div>

      {showSettings && <ModalCaiDat settings={settings} onSave={handleSave} onClose={() => setShowSettings(false)}/>}
    </>
  )
}

/* ══════════════════════════════════════
   CÁC COMPONENT PHỤ
══════════════════════════════════════ */
function BtnCan({ label, active, onClick }: { label:string; active:boolean; onClick:()=>void }) {
  return (
    <button onClick={onClick} style={{flex:1, padding:'7px 4px', border: active ? '2px solid #1B3A6B' : '1px solid #D1D5DB', borderRadius:'6px', background: active ? '#EFF6FF' : 'white', color: active ? '#1B3A6B' : '#374151', fontWeight: active ? 700 : 400, cursor:'pointer', fontSize:'12px'}}>
      {label}
    </button>
  )
}
function NhomCan({ value, onChange }: { value:string; onChange:(v:string)=>void }) {
  return (
    <div style={{display:'flex', gap:'6px'}}>
      <BtnCan label="◀ Trái"  active={value==='left'}   onClick={() => onChange('left')}/>
      <BtnCan label="● Giữa"  active={value==='center'} onClick={() => onChange('center')}/>
      <BtnCan label="▶ Phải"  active={value==='right'}  onClick={() => onChange('right')}/>
    </div>
  )
}

function ModalCaiDat({ settings, onSave, onClose }: { settings:Settings; onSave:(s:Settings)=>void; onClose:()=>void }) {
  const [s, setS]           = useState<Settings>({ ...settings })
  const [saving, setSaving] = useState(false)
  const fileRef             = useRef<HTMLInputElement>(null)
  const upd = (k: keyof Settings, v: string) => setS(p => ({ ...p, [k]: v }))

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 500 * 1024) { alert('Ảnh quá lớn! Chọn ảnh dưới 500KB.'); return }
    const reader = new FileReader()
    reader.onload = ev => upd('logo', ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave() { setSaving(true); await onSave(s); setSaving(false) }

  const logoSize = Number(s.logoSize) || 68
  const coChu   = Number(s.coChuTenCH) || 24
  const mau     = s.mauChinh || '#1B3A6B'

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'}} onClick={onClose}>
      <div style={{background:'white', borderRadius:'14px', padding:'24px', width:'100%', maxWidth:'500px', maxHeight:'93vh', overflowY:'auto'}} onClick={e => e.stopPropagation()}>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
          <h2 style={{fontSize:'16px', fontWeight:700, margin:0}}>⚙️ Cài đặt hóa đơn</h2>
          <button onClick={onClose} style={{background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#6B7280'}}>✕</button>
        </div>
        <p style={{fontSize:'12px', color:'#16A34A', margin:'0 0 16px', background:'#F0FDF4', padding:'8px 12px', borderRadius:'6px'}}>
          ✅ Lưu trên máy chủ — dùng được mọi thiết bị, không mất khi chuyển VPS.
        </p>

        <div style={{display:'flex', flexDirection:'column', gap:'14px'}}>

          {/* Logo */}
          <fieldset style={{border:'1px solid #E5E7EB', borderRadius:'8px', padding:'12px 14px', margin:0}}>
            <legend style={{fontSize:'12px', fontWeight:700, color:'#374151', padding:'0 6px'}}>🖼️ Logo</legend>
            <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'10px'}}>
              <div style={{width:`${Math.min(logoSize,68)}px`, height:`${Math.min(logoSize,68)}px`, border:'1px dashed #D1D5DB', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0, background:'#F9FAFB'}}>
                {s.logo ? <img src={s.logo} alt="Logo" style={{width:'100%', height:'100%', objectFit:'contain'}}/> : <span style={{fontSize:'10px', color:'#9CA3AF', textAlign:'center'}}>Chưa có</span>}
              </div>
              <div style={{flex:1}}>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogoUpload}/>
                <button onClick={() => fileRef.current?.click()} style={{padding:'6px 12px', border:'1px solid #D1D5DB', borderRadius:'6px', background:'white', cursor:'pointer', fontSize:'12px', display:'block', marginBottom:'5px', width:'100%'}}>
                  📁 Chọn ảnh logo (≤500KB)
                </button>
                {s.logo && <button onClick={() => upd('logo', '')} style={{padding:'4px 10px', border:'1px solid #FCA5A5', borderRadius:'6px', background:'#FEF2F2', color:'#DC2626', cursor:'pointer', fontSize:'11px', width:'100%'}}>🗑️ Xoá logo</button>}
              </div>
            </div>
            <div style={{marginBottom:'8px'}}>
              <label style={{fontSize:'11px', fontWeight:600, display:'block', marginBottom:'5px'}}>Vị trí logo</label>
              <div style={{display:'flex', gap:'6px'}}>
                <BtnCan label="◀ Bên trái tên" active={s.logoPart==='left'} onClick={() => upd('logoPart','left')}/>
                <BtnCan label="▲ Phía trên tên" active={s.logoPart==='top'}  onClick={() => upd('logoPart','top')}/>
              </div>
            </div>
            <label style={{fontSize:'11px', color:'#6B7280', display:'block', marginBottom:'3px'}}>Kích thước: <strong>{s.logoSize}px</strong></label>
            <input type="range" min="40" max="160" step="4" value={s.logoSize} onChange={e => upd('logoSize', e.target.value)} style={{width:'100%'}}/>
          </fieldset>

          {/* Thông tin cửa hàng */}
          <fieldset style={{border:'1px solid #E5E7EB', borderRadius:'8px', padding:'12px 14px', margin:0}}>
            <legend style={{fontSize:'12px', fontWeight:700, color:'#374151', padding:'0 6px'}}>🏪 Thông tin cửa hàng</legend>
            <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>

              {/* Tên CH + thanh kéo cỡ chữ */}
              <div>
                <label style={{fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px'}}>Tên cửa hàng *</label>
                <input style={{width:'100%', padding:'7px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box'}}
                  value={s.tenCH} onChange={e => upd('tenCH', e.target.value)} placeholder="Nội Thất Tính Tuyết"/>
                <div style={{marginTop:'6px'}}>
                  <label style={{fontSize:'11px', color:'#6B7280', display:'block', marginBottom:'3px'}}>Cỡ chữ: <strong>{s.coChuTenCH}px</strong></label>
                  <input type="range" min="14" max="40" step="1" value={s.coChuTenCH} onChange={e => upd('coChuTenCH', e.target.value)} style={{width:'100%'}}/>
                  {/* Preview */}
                  <div style={{marginTop:'5px', padding:'6px 10px', background:'#F8FAFC', borderRadius:'6px', fontSize:`${coChu}px`, fontWeight:900, color:mau, fontFamily:'Georgia,serif'}}>
                    {s.tenCH || 'Tên cửa hàng'}
                  </div>
                </div>
              </div>

              {([
                ['Địa chỉ', 'diaChiCH', 'Số 123 Đường ABC, Quận 1, TP.HCM'],
                ['Số điện thoại', 'sdtCH', '0901 234 567'],
                ['Giới thiệu (hiện góc phải hóa đơn)', 'gioiThieu', 'Chuyên cung cấp nội thất...'],
              ] as [string, keyof Settings, string][]).map(([lb, k, ph]) => (
                <div key={String(k)}>
                  <label style={{fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px'}}>{lb}</label>
                  <input style={{width:'100%', padding:'7px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box'}}
                    placeholder={ph} value={s[k] as string} onChange={e => upd(k, e.target.value)}/>
                </div>
              ))}

              <div>
                <label style={{fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px'}}>
                  Website / Fanpage / Zalo... <span style={{fontWeight:400, color:'#6B7280'}}>(mỗi dòng 1 mục — hiện góc phải)</span>
                </label>
                <textarea style={{width:'100%', padding:'7px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'12px', resize:'vertical', boxSizing:'border-box'}}
                  rows={4} placeholder={'🌐 noithattinhtuyet.com\n📘 fb.com/noithattinh\n💬 Zalo: 0901 234 567\n📺 youtube.com/@nttt'}
                  value={s.mangXH} onChange={e => upd('mangXH', e.target.value)}/>
              </div>
            </div>
          </fieldset>

          {/* Màu chủ đạo */}
          <fieldset style={{border:'1px solid #E5E7EB', borderRadius:'8px', padding:'12px 14px', margin:0}}>
            <legend style={{fontSize:'12px', fontWeight:700, color:'#374151', padding:'0 6px'}}>🎨 Màu chủ đạo</legend>
            <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
              <input type="color" value={s.mauChinh} onChange={e => upd('mauChinh', e.target.value)}
                style={{width:'48px', height:'36px', border:'1px solid #D1D5DB', borderRadius:'6px', cursor:'pointer', padding:'2px'}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:'12px', color:'#555'}}>Màu hiện tại: <strong>{s.mauChinh}</strong></div>
                <div style={{display:'flex', gap:'6px', marginTop:'6px', flexWrap:'wrap'}}>
                  {['#1B3A6B','#0F6B3B','#7C3AED','#DC2626','#0369A1','#92400E','#1E293B'].map(c => (
                    <button key={c} onClick={() => upd('mauChinh', c)}
                      style={{width:'24px', height:'24px', background:c, borderRadius:'4px', border: s.mauChinh===c ? '2px solid #000' : '2px solid transparent', cursor:'pointer'}}/>
                  ))}
                </div>
              </div>
            </div>
          </fieldset>

          {/* Chân trang */}
          <fieldset style={{border:'1px solid #E5E7EB', borderRadius:'8px', padding:'12px 14px', margin:0}}>
            <legend style={{fontSize:'12px', fontWeight:700, color:'#374151', padding:'0 6px'}}>📝 Chân trang</legend>
            <input style={{width:'100%', padding:'7px 10px', border:'1px solid #D1D5DB', borderRadius:'6px', fontSize:'13px', boxSizing:'border-box', marginBottom:'8px'}}
              value={s.chanTrang} onChange={e => upd('chanTrang', e.target.value)} placeholder="Cảm ơn quý khách..."/>
            <label style={{fontSize:'11px', fontWeight:600, display:'block', marginBottom:'5px'}}>Căn chỉnh</label>
            <NhomCan value={s.canChanTrang} onChange={v => upd('canChanTrang', v)}/>
          </fieldset>

          {/* Nút lưu */}
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={handleSave} disabled={saving} style={{flex:1, padding:'12px', borderRadius:'8px', border:'none', background: saving ? '#9CA3AF' : '#1B3A6B', color:'white', fontWeight:700, fontSize:'14px', cursor: saving ? 'not-allowed' : 'pointer'}}>
              {saving ? '⏳ Đang lưu...' : '✅ Lưu cài đặt'}
            </button>
            <button onClick={onClose} style={{padding:'12px 16px', borderRadius:'8px', border:'1px solid #D1D5DB', background:'white', cursor:'pointer', fontSize:'14px'}}>Huỷ</button>
          </div>
        </div>

        <p style={{fontSize:'11px', color:'#9CA3AF', marginTop:'10px', textAlign:'center'}}>Thay đổi áp dụng cho tất cả hóa đơn sau khi lưu</p>
      </div>
    </div>
  )
}
