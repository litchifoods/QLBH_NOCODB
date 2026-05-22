'use client'
// components/InHoaDonClient.tsx — v5.0
// Thiết kế lại: compact A4, số đơn vào thông tin đơn, ghi chú tùy chỉnh, điều chỉnh linh hoạt

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
  coChuTenCH:    '22',
  diaChiCH:      '',
  sdtCH:         '',
  gioiThieu:     'Chuyên cung cấp nội thất gia đình & văn phòng chất lượng cao',
  mangXH:        '',
  chanTrang:     'Cảm ơn quý khách đã tin tưởng và lựa chọn sản phẩm của chúng tôi!',
  ghiChuHoaDon:  'Hóa đơn đã bao gồm phí vận chuyển và lắp đặt. Hóa đơn chưa bao gồm thuế VAT.',
  logo:          '',
  logoSize:      '60',
  logoPart:      'left',
  mauChinh:      '#1B3A6B',
  // Điều chỉnh kích thước layout
  paddingTrang:  '24',   // padding nội dung hóa đơn (px)
  coChuBang:     '12',   // cỡ chữ bảng sản phẩm (px)
  coChuND:       '12',   // cỡ chữ nội dung chung (px)
  canChanTrang:  'center',
}
type Settings = typeof MAC_DINH

export default function InHoaDonClient({
  don, chiTiet, khInfo, user,
}: {
  don: any; chiTiet: any[]; khInfo: any; user: UserSession
}) {
  const router  = useRouter()
  const hdRef   = useRef<HTMLDivElement>(null)
  const [settings, setSettings]         = useState<Settings>(MAC_DINH)
  const [showSettings, setShowSettings] = useState(false)
  const [dangXuat, setDangXuat]         = useState(false)

  useEffect(() => {
    fetch('/api/cai-dat').then(r => r.json()).then(res => {
      if (res.ok && res.data) {
        const d = res.data
        setSettings(prev => ({
          ...prev,
          tenCH:        d['hoadon_tenCH']        ?? prev.tenCH,
          coChuTenCH:   d['hoadon_coChuTenCH']   ?? prev.coChuTenCH,
          diaChiCH:     d['hoadon_diaChiCH']     ?? prev.diaChiCH,
          sdtCH:        d['hoadon_sdtCH']        ?? prev.sdtCH,
          gioiThieu:    d['hoadon_gioiThieu']    ?? prev.gioiThieu,
          mangXH:       d['hoadon_mangXH']       ?? prev.mangXH,
          chanTrang:    d['hoadon_chanTrang']    ?? prev.chanTrang,
          ghiChuHoaDon: d['hoadon_ghiChuHoaDon'] ?? prev.ghiChuHoaDon,
          logo:         d['hoadon_logo']         ?? prev.logo,
          logoSize:     d['hoadon_logoSize']     ?? prev.logoSize,
          logoPart:     d['hoadon_logoPart']     ?? prev.logoPart,
          mauChinh:     d['hoadon_mauChinh']     ?? prev.mauChinh,
          paddingTrang: d['hoadon_paddingTrang']  ?? prev.paddingTrang,
          coChuBang:    d['hoadon_coChuBang']    ?? prev.coChuBang,
          coChuND:      d['hoadon_coChuND']      ?? prev.coChuND,
          canChanTrang: d['hoadon_canChanTrang'] ?? prev.canChanTrang,
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
          hoadon_tenCH:        s.tenCH,
          hoadon_coChuTenCH:   s.coChuTenCH,
          hoadon_diaChiCH:     s.diaChiCH,
          hoadon_sdtCH:        s.sdtCH,
          hoadon_gioiThieu:    s.gioiThieu,
          hoadon_mangXH:       s.mangXH,
          hoadon_chanTrang:    s.chanTrang,
          hoadon_ghiChuHoaDon: s.ghiChuHoaDon,
          hoadon_logo:         s.logo,
          hoadon_logoSize:     s.logoSize,
          hoadon_logoPart:     s.logoPart,
          hoadon_mauChinh:     s.mauChinh,
          hoadon_paddingTrang: s.paddingTrang,
          hoadon_coChuBang:    s.coChuBang,
          hoadon_coChuND:      s.coChuND,
          hoadon_canChanTrang: s.canChanTrang,
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
        margin: [6, 6, 6, 6],
        filename: `HoaDon_${maDon}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      }).from(hdRef.current).save()
    } catch {
      alert('Lỗi xuất PDF. Dùng nút "In" và chọn "Save as PDF".')
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
  const ghiChuDon  = don['Ghi chú'] || ''
  const dsSP       = chiTiet.filter(ct => ct['Tên SP (ghi nhanh)'] || ct['Mã SP'])

  const logoSz   = Number(settings.logoSize) || 60
  const coChuTen = Number(settings.coChuTenCH) || 22
  const mau      = settings.mauChinh || '#1B3A6B'
  const pad      = Number(settings.paddingTrang) || 24
  const fzBang   = Number(settings.coChuBang) || 12
  const fzND     = Number(settings.coChuND) || 12
  const dongMXH  = (settings.mangXH || '').split('\n').filter(Boolean)

  return (
    <>
      <style>{`
        @media print {
          .no-print, nav, aside, header,
          [class*="sidebar"],[class*="Sidebar"],[id*="sidebar"] { display:none !important; }
          body { background:white !important; margin:0 !important; }
          main,[class*="main"] { margin:0 !important; padding:0 !important; width:100% !important; }
          .hd-page { box-shadow:none !important; margin:0 !important; max-width:100% !important; padding:5mm 7mm !important; }
          @page { margin:0; size:A4; }
        }
        *{box-sizing:border-box;}
        body{background:#DDE2E8;margin:0;}
        .hd-page{background:white;max-width:794px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;}
        .sp-table{width:100%;border-collapse:collapse;}
        .sp-table th{text-align:left;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:.03em;}
        .sp-table td{font-family:Arial,Helvetica,sans-serif;border-bottom:1px solid #F0F0F0;}
        .sp-table tr:last-child td{border-bottom:none;}
        .sp-table tbody tr:nth-child(even) td{background:#F8FAFC;}
      `}</style>

      {/* THANH ĐIỀU KHIỂN */}
      <div className="no-print" style={{background:mau,padding:'8px 16px',display:'flex',gap:'8px',alignItems:'center',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,.2)'}}>
        <button onClick={()=>router.back()} style={{padding:'6px 14px',borderRadius:'5px',border:'none',background:'rgba(255,255,255,.15)',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:600}}>← Quay lại</button>
        <div style={{flex:1}}/>
        <button onClick={()=>setShowSettings(true)} style={{padding:'6px 12px',borderRadius:'5px',border:'1px solid rgba(255,255,255,.35)',background:'rgba(255,255,255,.1)',color:'white',cursor:'pointer',fontSize:'12px'}}>⚙️ Cài đặt</button>
        <button onClick={xuatPDF} disabled={dangXuat} style={{padding:'6px 14px',borderRadius:'5px',border:'none',background:dangXuat?'#6B7280':'#7C3AED',color:'white',fontWeight:700,cursor:'pointer',fontSize:'12px'}}>
          {dangXuat?'⏳ Đang xuất...':'📄 Xuất PDF'}
        </button>
        <button onClick={()=>window.print()} style={{padding:'6px 16px',borderRadius:'5px',border:'none',background:'#16A34A',color:'white',fontWeight:700,cursor:'pointer',fontSize:'12px'}}>🖨️ In</button>
      </div>
      <div className="no-print" style={{background:'#FFFBEB',borderBottom:'1px solid #FDE68A',padding:'5px 16px',textAlign:'center',fontSize:'11px',color:'#92400E'}}>
        💡 Khi in: bỏ tick <strong>"Headers and footers"</strong> để ẩn đường link URL
      </div>

      {/* NỘI DUNG HÓA ĐƠN */}
      <div style={{padding:'16px',background:'#DDE2E8'}}>
      <div className="hd-page" ref={hdRef} style={{padding:`${pad}px ${pad+8}px`}}>

        {/* ── HEADER ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'16px',alignItems:'flex-start',marginBottom:'10px'}}>
          {/* Trái: Logo + Tên + địa chỉ */}
          <div>
            <div style={{display:'flex',alignItems:settings.logoPart==='top'?'flex-start':'center',flexDirection:settings.logoPart==='top'?'column':'row',gap:'10px',marginBottom:'5px'}}>
              {settings.logo&&<img src={settings.logo} alt="Logo" style={{width:`${logoSz}px`,height:`${logoSz}px`,objectFit:'contain',flexShrink:0,borderRadius:'4px'}}/>}
              <div style={{fontSize:`${coChuTen}px`,fontWeight:900,color:mau,fontFamily:'Arial Black,Arial,sans-serif',lineHeight:1.15}}>
                {settings.tenCH}
              </div>
            </div>
            {settings.diaChiCH&&<div style={{fontSize:`${fzND}px`,color:'#444',marginTop:'2px'}}>📍 {settings.diaChiCH}</div>}
            {settings.sdtCH&&<div style={{fontSize:`${fzND}px`,color:'#444',marginTop:'1px'}}>📞 {settings.sdtCH}</div>}
          </div>
          {/* Phải: MXH + giới thiệu */}
          <div style={{textAlign:'right',minWidth:'160px'}}>
            {dongMXH.map((line,i)=>(
              <div key={i} style={{fontSize:`${fzND}px`,color:'#555',lineHeight:1.6}}>{line}</div>
            ))}
            {settings.gioiThieu&&(
              <div style={{fontSize:`${fzND-1}px`,color:'#888',marginTop:'3px',fontStyle:'italic',lineHeight:1.4,maxWidth:'200px',marginLeft:'auto'}}>{settings.gioiThieu}</div>
            )}
          </div>
        </div>

        {/* ── TIÊU ĐỀ — chỉ chữ HÓA ĐƠN BÁN HÀNG ── */}
        <div style={{background:`linear-gradient(135deg,${mau},${mau}CC)`,borderRadius:'8px',padding:'10px 20px',marginBottom:'10px',textAlign:'center'}}>
          <div style={{fontSize:'20px',fontWeight:900,color:'white',letterSpacing:'.08em',textTransform:'uppercase',fontFamily:'Arial Black,Arial,sans-serif'}}>
            HÓA ĐƠN BÁN HÀNG
          </div>
        </div>

        {/* ── 2 CARD: KH + THÔNG TIN ĐƠN ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'10px'}}>

          {/* Card KH */}
          <div style={{border:`1.5px solid ${mau}30`,borderRadius:'8px',padding:'10px 12px',background:`${mau}06`}}>
            <div style={{fontSize:'10px',fontWeight:800,color:mau,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'6px',borderBottom:`1px solid ${mau}20`,paddingBottom:'4px'}}>
              👤 Khách hàng
            </div>
            <div style={{fontWeight:800,fontSize:`${fzND+2}px`,color:'#111',marginBottom:'4px'}}>{tenKH}</div>
            {sdtKH!=='—'&&<div style={{fontSize:`${fzND}px`,color:'#444',marginTop:'2px'}}>📞 {sdtKH}</div>}
            {diaChiGiao!=='—'&&<div style={{fontSize:`${fzND}px`,color:'#444',marginTop:'2px',lineHeight:1.4}}>📍 {diaChiGiao}</div>}
          </div>

          {/* Card thông tin đơn — có số đơn + ngày mua + ngày giao */}
          <div style={{border:'1.5px solid #E2E8F0',borderRadius:'8px',padding:'10px 12px',background:'#F8FAFC'}}>
            <div style={{fontSize:'10px',fontWeight:800,color:mau,textTransform:'uppercase',letterSpacing:'.07em',marginBottom:'6px',borderBottom:'1px solid #E2E8F0',paddingBottom:'4px'}}>
              📋 Thông tin đơn hàng
            </div>
            {[
              ['Số đơn', maDon],
              ['Ngày mua', fDate(ngayDat)],
              ['Ngày giao', ngayGiao ? fDate(ngayGiao) : '—'],
              ['NV bán', nvBan],
              ['Kênh', don['Kênh bán']||'—'],
              ['Hình thức giao', don['Hình thức giao hàng']||'—'],
            ].map(([lb,val])=>(
              <div key={lb} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:`${fzND}px`,marginTop:'3px',gap:'8px'}}>
                <span style={{color:'#777',whiteSpace:'nowrap',flexShrink:0}}>{lb}:</span>
                <span style={{fontWeight:lb==='Số đơn'?800:600,color:lb==='Số đơn'?mau:'#222',textAlign:'right'}}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── BẢNG SẢN PHẨM ── */}
        <div style={{borderRadius:'8px',overflow:'hidden',border:'1px solid #E2E8F0',marginBottom:'8px'}}>
          <table className="sp-table">
            <thead>
              <tr style={{background:mau}}>
                <th style={{padding:`6px 10px`,fontSize:`${fzBang-1}px`,color:'white',width:'28px',textAlign:'center'}}>#</th>
                <th style={{padding:`6px 10px`,fontSize:`${fzBang-1}px`,color:'white'}}>Sản phẩm</th>
                <th style={{padding:`6px 10px`,fontSize:`${fzBang-1}px`,color:'white',textAlign:'center',width:'45px'}}>SL</th>
                <th style={{padding:`6px 10px`,fontSize:`${fzBang-1}px`,color:'white',textAlign:'right',width:'110px'}}>Đơn giá</th>
                <th style={{padding:`6px 10px`,fontSize:`${fzBang-1}px`,color:'white',textAlign:'right',width:'120px'}}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {dsSP.length===0?(
                <tr><td colSpan={5} style={{textAlign:'center',color:'#aaa',padding:'16px',fontSize:`${fzBang}px`}}>Không có sản phẩm</td></tr>
              ):dsSP.map((ct,i)=>(
                <tr key={i}>
                  <td style={{padding:`5px 10px`,textAlign:'center',color:'#aaa',fontSize:`${fzBang-1}px`,fontWeight:600}}>{i+1}</td>
                  <td style={{padding:`5px 10px`}}>
                    <div style={{fontWeight:700,color:'#1A1A1A',fontSize:`${fzBang}px`}}>{ct['Tên SP (ghi nhanh)']||ct['Mã SP']}</div>
                    {ct['Ghi chú SP']&&<div style={{fontSize:`${fzBang-2}px`,color:'#888',marginTop:'1px',fontStyle:'italic'}}>{ct['Ghi chú SP']}</div>}
                  </td>
                  <td style={{padding:`5px 10px`,textAlign:'center',fontWeight:600,color:'#333',fontSize:`${fzBang}px`}}>{ct['Số lượng']||1}</td>
                  <td style={{padding:`5px 10px`,textAlign:'right',color:'#555',fontSize:`${fzBang}px`}}>{fVND(ct['Đơn giá'])}đ</td>
                  <td style={{padding:`5px 10px`,textAlign:'right',fontWeight:800,color:mau,fontSize:`${fzBang}px`}}>{fVND(ct['Thành tiền'])}đ</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── TỔNG TIỀN + GHI CHÚ HÓA ĐƠN ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:'12px',alignItems:'flex-start',marginBottom:'12px'}}>

          {/* Ghi chú hóa đơn — bên trái */}
          <div>
            {settings.ghiChuHoaDon&&(
              <div style={{padding:'8px 12px',background:'#FFFBEB',borderRadius:'6px',border:'1px solid #FDE68A',fontSize:`${fzND-1}px`,color:'#92400E',lineHeight:1.5}}>
                ℹ️ {settings.ghiChuHoaDon}
              </div>
            )}
            {ghiChuDon&&(
              <div style={{padding:'8px 12px',background:'#F0F9FF',borderRadius:'6px',border:'1px solid #BAE6FD',fontSize:`${fzND-1}px`,color:'#0369A1',lineHeight:1.5,marginTop:'6px'}}>
                📝 Ghi chú: {ghiChuDon}
              </div>
            )}
          </div>

          {/* Tổng tiền — bên phải */}
          <div style={{minWidth:'240px',background:'#F8FAFC',borderRadius:'8px',padding:'10px 14px',border:'1px solid #E2E8F0'}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:`${fzND}px`,padding:'3px 0',borderBottom:'1px dashed #E2E8F0'}}>
              <span style={{color:'#777'}}>Tổng tiền hàng:</span>
              <span style={{fontWeight:700}}>{fVND(tongTien)}đ</span>
            </div>
            {datCoc>0&&(
              <div style={{display:'flex',justifyContent:'space-between',fontSize:`${fzND}px`,padding:'3px 0',borderBottom:'1px dashed #E2E8F0'}}>
                <span style={{color:'#777'}}>Đã cọc{htCoc?` (${htCoc})`:''}: </span>
                <span style={{fontWeight:700,color:'#16A34A'}}>- {fVND(datCoc)}đ</span>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'6px',paddingTop:'6px',borderTop:`2px solid ${mau}`}}>
              <span style={{fontSize:`${fzND+1}px`,fontWeight:800,color:mau}}>Còn phải thu:</span>
              <span style={{fontSize:`${fzND+5}px`,fontWeight:900,color:conLai>0?'#DC2626':'#16A34A'}}>{fVND(conLai)}đ</span>
            </div>
          </div>
        </div>

        {/* ── CHỮ KÝ ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'32px',marginBottom:'10px'}}>
          {[['Khách hàng',tenKH],['Người bán',nvBan]].map(([title,name])=>(
            <div key={title} style={{textAlign:'center'}}>
              <div style={{fontSize:'11px',fontWeight:700,color:mau,textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'1px'}}>{title}</div>
              <div style={{fontSize:'10px',color:'#bbb',fontStyle:'italic',marginBottom:'28px'}}>(Ký và ghi rõ họ tên)</div>
              <div style={{borderTop:'1px dashed #CCC',paddingTop:'4px',fontSize:`${fzND}px`,fontWeight:600,color:'#333'}}>{name}</div>
            </div>
          ))}
        </div>

        {/* ── CHÂN TRANG ── */}
        {settings.chanTrang&&(
          <div style={{textAlign:settings.canChanTrang as any,fontSize:`${fzND-1}px`,color:'#999',fontStyle:'italic',borderTop:'1px solid #F0F0F0',paddingTop:'8px'}}>
            {settings.chanTrang}
          </div>
        )}

      </div>
      </div>

      {showSettings&&<ModalCaiDat settings={settings} onSave={handleSave} onClose={()=>setShowSettings(false)}/>}
    </>
  )
}

function BtnCan({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}) {
  return (
    <button onClick={onClick} style={{flex:1,padding:'6px 4px',border:active?'2px solid #1B3A6B':'1px solid #D1D5DB',borderRadius:'6px',background:active?'#EFF6FF':'white',color:active?'#1B3A6B':'#374151',fontWeight:active?700:400,cursor:'pointer',fontSize:'12px'}}>
      {label}
    </button>
  )
}
function NhomCan({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  return (
    <div style={{display:'flex',gap:'5px'}}>
      <BtnCan label="◀ Trái"  active={value==='left'}   onClick={()=>onChange('left')}/>
      <BtnCan label="● Giữa"  active={value==='center'} onClick={()=>onChange('center')}/>
      <BtnCan label="▶ Phải"  active={value==='right'}  onClick={()=>onChange('right')}/>
    </div>
  )
}
function Slider({label,value,min,max,step,onChange}:{label:string;value:string;min:number;max:number;step:number;onChange:(v:string)=>void}) {
  return (
    <div>
      <label style={{fontSize:'11px',color:'#6B7280',display:'block',marginBottom:'3px'}}>{label}: <strong>{value}px</strong></label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(e.target.value)} style={{width:'100%'}}/>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#9CA3AF'}}><span>{min}px</span><span>{max}px</span></div>
    </div>
  )
}

function ModalCaiDat({settings,onSave,onClose}:{settings:Settings;onSave:(s:Settings)=>void;onClose:()=>void}) {
  const [s,setS]            = useState<Settings>({...settings})
  const [saving,setSaving]  = useState(false)
  const [tab,setTab]        = useState<'CH'|'LAYOUT'|'NOI_DUNG'>('CH')
  const fileRef             = useRef<HTMLInputElement>(null)
  const upd = (k:keyof Settings,v:string) => setS(p=>({...p,[k]:v}))

  function handleLogoUpload(e:React.ChangeEvent<HTMLInputElement>) {
    const file=e.target.files?.[0]; if(!file) return
    if(file.size>500*1024){alert('Ảnh quá lớn! Chọn ảnh dưới 500KB.');return}
    const reader=new FileReader()
    reader.onload=ev=>upd('logo',ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSave(){setSaving(true);await onSave(s);setSaving(false)}

  const logoSz  = Number(s.logoSize)||60
  const coChu   = Number(s.coChuTenCH)||22
  const mau     = s.mauChinh||'#1B3A6B'
  const TAB_BTN = (id:typeof tab,label:string) => (
    <button onClick={()=>setTab(id)} style={{flex:1,padding:'8px',border:'none',borderBottom:tab===id?`2px solid ${mau}`:'2px solid transparent',background:'none',cursor:'pointer',fontSize:'12px',fontWeight:tab===id?700:400,color:tab===id?mau:'#6B7280'}}>
      {label}
    </button>
  )

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'14px',width:'100%',maxWidth:'480px',maxHeight:'92vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>

        {/* Header modal */}
        <div style={{padding:'16px 20px 0',borderBottom:'1px solid #F0F0F0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <h2 style={{fontSize:'15px',fontWeight:700,margin:0}}>⚙️ Cài đặt hóa đơn</h2>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
          </div>
          {/* Tab */}
          <div style={{display:'flex',gap:0}}>
            {TAB_BTN('CH','🏪 Cửa hàng')}
            {TAB_BTN('LAYOUT','📐 Bố cục')}
            {TAB_BTN('NOI_DUNG','📝 Nội dung')}
          </div>
        </div>

        {/* Nội dung tab */}
        <div style={{overflowY:'auto',padding:'16px 20px',flex:1}}>

          {/* TAB: CỬA HÀNG */}
          {tab==='CH'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <p style={{fontSize:'11px',color:'#16A34A',margin:0,background:'#F0FDF4',padding:'6px 10px',borderRadius:'6px'}}>✅ Lưu trên máy chủ — dùng được mọi thiết bị</p>

              {/* Logo */}
              <div style={{border:'1px solid #E5E7EB',borderRadius:'8px',padding:'10px 12px'}}>
                <div style={{fontSize:'12px',fontWeight:700,marginBottom:'8px'}}>🖼️ Logo</div>
                <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
                  <div style={{width:`${Math.min(logoSz,60)}px`,height:`${Math.min(logoSz,60)}px`,border:'1px dashed #D1D5DB',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,background:'#F9FAFB'}}>
                    {s.logo?<img src={s.logo} alt="Logo" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{fontSize:'10px',color:'#9CA3AF',textAlign:'center'}}>Chưa có</span>}
                  </div>
                  <div style={{flex:1}}>
                    <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogoUpload}/>
                    <button onClick={()=>fileRef.current?.click()} style={{padding:'5px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',background:'white',cursor:'pointer',fontSize:'11px',display:'block',marginBottom:'4px',width:'100%'}}>📁 Chọn ảnh (≤500KB)</button>
                    {s.logo&&<button onClick={()=>upd('logo','')} style={{padding:'4px 10px',border:'1px solid #FCA5A5',borderRadius:'5px',background:'#FEF2F2',color:'#DC2626',cursor:'pointer',fontSize:'11px',width:'100%'}}>🗑️ Xoá logo</button>}
                  </div>
                </div>
                <div style={{marginBottom:'6px'}}>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Vị trí logo</label>
                  <div style={{display:'flex',gap:'5px'}}>
                    <BtnCan label="◀ Bên trái tên" active={s.logoPart==='left'} onClick={()=>upd('logoPart','left')}/>
                    <BtnCan label="▲ Trên tên"      active={s.logoPart==='top'}  onClick={()=>upd('logoPart','top')}/>
                  </div>
                </div>
                <Slider label="Kích thước logo" value={s.logoSize} min={30} max={120} step={4} onChange={v=>upd('logoSize',v)}/>
              </div>

              {/* Tên CH */}
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên cửa hàng *</label>
                <input style={{width:'100%',padding:'7px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box'}}
                  value={s.tenCH} onChange={e=>upd('tenCH',e.target.value)}/>
                <Slider label="Cỡ chữ tên CH" value={s.coChuTenCH} min={14} max={36} step={1} onChange={v=>upd('coChuTenCH',v)}/>
                <div style={{marginTop:'4px',padding:'5px 8px',background:'#F8FAFC',borderRadius:'5px',fontSize:`${coChu}px`,fontWeight:900,color:mau,fontFamily:'Arial Black,Arial,sans-serif'}}>
                  {s.tenCH||'Tên cửa hàng'}
                </div>
              </div>

              {([['Địa chỉ','diaChiCH','Số 123 Đường ABC...'],['Số điện thoại','sdtCH','0901 234 567'],['Giới thiệu ngắn','gioiThieu','Chuyên cung cấp...']] as [string,keyof Settings,string][]).map(([lb,k,ph])=>(
                <div key={String(k)}>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb}</label>
                  <input style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'12px',boxSizing:'border-box'}}
                    placeholder={ph} value={s[k] as string} onChange={e=>upd(k,e.target.value)}/>
                </div>
              ))}

              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Website / Fanpage / Zalo... <span style={{fontWeight:400,color:'#6B7280'}}>(mỗi dòng 1 mục)</span></label>
                <textarea style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'12px',resize:'vertical',boxSizing:'border-box'}}
                  rows={3} placeholder={'🌐 noithattinhtuyet.com\n📘 fb.com/noithattinh\n💬 Zalo: 0901 234 567'}
                  value={s.mangXH} onChange={e=>upd('mangXH',e.target.value)}/>
              </div>

              {/* Màu chủ đạo */}
              <div style={{border:'1px solid #E5E7EB',borderRadius:'8px',padding:'10px 12px'}}>
                <div style={{fontSize:'12px',fontWeight:700,marginBottom:'8px'}}>🎨 Màu chủ đạo</div>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <input type="color" value={s.mauChinh} onChange={e=>upd('mauChinh',e.target.value)}
                    style={{width:'40px',height:'32px',border:'1px solid #D1D5DB',borderRadius:'5px',cursor:'pointer',padding:'1px'}}/>
                  <div style={{display:'flex',gap:'5px',flexWrap:'wrap'}}>
                    {['#1B3A6B','#0F6B3B','#7C3AED','#DC2626','#0369A1','#92400E','#1E293B','#B45309'].map(c=>(
                      <button key={c} onClick={()=>upd('mauChinh',c)}
                        style={{width:'22px',height:'22px',background:c,borderRadius:'4px',border:s.mauChinh===c?'2px solid #000':'2px solid transparent',cursor:'pointer'}}/>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: BỐ CỤC */}
          {tab==='LAYOUT'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <p style={{fontSize:'11px',color:'#6B7280',margin:0,background:'#F8FAFC',padding:'6px 10px',borderRadius:'6px'}}>
                💡 Điều chỉnh kích thước để 7-8 sản phẩm vừa 1 trang A4. Giảm padding và cỡ chữ nếu cần.
              </p>
              <Slider label="Padding nội dung (lề trong)" value={s.paddingTrang} min={8} max={40} step={2} onChange={v=>upd('paddingTrang',v)}/>
              <Slider label="Cỡ chữ bảng sản phẩm"       value={s.coChuBang}   min={9}  max={15} step={1} onChange={v=>upd('coChuBang',v)}/>
              <Slider label="Cỡ chữ nội dung chung"       value={s.coChuND}     min={9}  max={14} step={1} onChange={v=>upd('coChuND',v)}/>

              <div style={{padding:'10px 12px',background:'#FFF7ED',borderRadius:'8px',border:'1px solid #FED7AA',fontSize:'11px',color:'#92400E',lineHeight:1.6}}>
                <strong>Gợi ý vừa 1 trang A4 cho 7-8 SP:</strong><br/>
                • Padding: 12-16px<br/>
                • Cỡ chữ bảng: 10-11px<br/>
                • Cỡ chữ nội dung: 10-11px<br/>
                • Cỡ chữ tên CH: 18-20px<br/>
                • Logo: 40-50px
              </div>
            </div>
          )}

          {/* TAB: NỘI DUNG */}
          {tab==='NOI_DUNG'&&(
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>
                  Ghi chú hóa đơn <span style={{fontWeight:400,color:'#6B7280'}}>(hiện dưới bảng tiền — VAT, vận chuyển...)</span>
                </label>
                <textarea style={{width:'100%',padding:'7px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'12px',resize:'vertical',boxSizing:'border-box'}}
                  rows={3}
                  placeholder="VD: Hóa đơn đã bao gồm phí vận chuyển và lắp đặt. Hóa đơn chưa bao gồm thuế VAT."
                  value={s.ghiChuHoaDon} onChange={e=>upd('ghiChuHoaDon',e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Chân trang</label>
                <input style={{width:'100%',padding:'7px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'12px',boxSizing:'border-box'}}
                  value={s.chanTrang} onChange={e=>upd('chanTrang',e.target.value)} placeholder="Cảm ơn quý khách..."/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'5px'}}>Căn chỉnh chân trang</label>
                <NhomCan value={s.canChanTrang} onChange={v=>upd('canChanTrang',v)}/>
              </div>
            </div>
          )}
        </div>

        {/* Footer modal */}
        <div style={{padding:'12px 20px',borderTop:'1px solid #F0F0F0',display:'flex',gap:'8px'}}>
          <button onClick={handleSave} disabled={saving} style={{flex:1,padding:'10px',borderRadius:'7px',border:'none',background:saving?'#9CA3AF':mau,color:'white',fontWeight:700,fontSize:'13px',cursor:saving?'not-allowed':'pointer'}}>
            {saving?'⏳ Đang lưu...':'✅ Lưu cài đặt'}
          </button>
          <button onClick={onClose} style={{padding:'10px 14px',borderRadius:'7px',border:'1px solid #D1D5DB',background:'white',cursor:'pointer',fontSize:'13px'}}>Huỷ</button>
        </div>
      </div>
    </div>
  )
}
