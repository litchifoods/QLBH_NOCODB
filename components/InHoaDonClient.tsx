'use client'
// components/InHoaDonClient.tsx — v6.0
// Thiết kế mới hoàn toàn: header ngang compact, thông tin đơn gọn, ghi chú dưới bảng

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fVND(n: any) { return Number(n||0).toLocaleString('vi-VN') }
function fDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

const MAC_DINH = {
  tenCH:        'Nội Thất Tính Tuyết',
  coChuTenCH:   '20',
  diaChiCH:     '',
  sdtCH:        '',
  gioiThieu:    '',
  mangXH:       '',
  chanTrang:    'Cảm ơn quý khách đã tin tưởng và lựa chọn!',
  ghiChuHoaDon: 'Hóa đơn đã bao gồm phí vận chuyển và lắp đặt. Chưa bao gồm thuế VAT.',
  logo:         '',
  logoSize:     '56',
  mauChinh:     '#1B3A6B',
  paddingTrang: '20',
  coChuBang:    '12',
  coChuND:      '11',
  canChanTrang: 'center',
}
type Settings = typeof MAC_DINH

export default function InHoaDonClient({
  don, chiTiet, khInfo, user,
}: { don:any; chiTiet:any[]; khInfo:any; user:UserSession }) {
  const router  = useRouter()
  const hdRef   = useRef<HTMLDivElement>(null)
  const [ST, setST]                   = useState<Settings>(MAC_DINH)
  const [showSettings, setShowSettings] = useState(false)
  const [xuatPDF, setXuatPDF]           = useState(false)

  useEffect(() => {
    fetch('/api/cai-dat').then(r=>r.json()).then(res => {
      if (res.ok && res.data) {
        const d = res.data
        setST(p => ({
          ...p,
          tenCH:        d['hoadon_tenCH']        ?? p.tenCH,
          coChuTenCH:   d['hoadon_coChuTenCH']   ?? p.coChuTenCH,
          diaChiCH:     d['hoadon_diaChiCH']     ?? p.diaChiCH,
          sdtCH:        d['hoadon_sdtCH']        ?? p.sdtCH,
          gioiThieu:    d['hoadon_gioiThieu']    ?? p.gioiThieu,
          mangXH:       d['hoadon_mangXH']       ?? p.mangXH,
          chanTrang:    d['hoadon_chanTrang']    ?? p.chanTrang,
          ghiChuHoaDon: d['hoadon_ghiChuHoaDon'] ?? p.ghiChuHoaDon,
          logo:         d['hoadon_logo']         ?? p.logo,
          logoSize:     d['hoadon_logoSize']     ?? p.logoSize,
          mauChinh:     d['hoadon_mauChinh']     ?? p.mauChinh,
          paddingTrang: d['hoadon_paddingTrang']  ?? p.paddingTrang,
          coChuBang:    d['hoadon_coChuBang']    ?? p.coChuBang,
          coChuND:      d['hoadon_coChuND']      ?? p.coChuND,
          canChanTrang: d['hoadon_canChanTrang'] ?? p.canChanTrang,
        }))
      }
    }).catch(() => {
      try {
        const s = localStorage.getItem('qlbh_in_hoadon_settings')
        if (s) setST(p => ({...p,...JSON.parse(s)}))
      } catch {}
    })
  }, [])

  async function handleSave(s: Settings) {
    setST(s); setShowSettings(false)
    try {
      await fetch('/api/cai-dat', {
        method:'POST', headers:{'Content-Type':'application/json'},
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

  async function handleXuatPDF() {
    if (!hdRef.current) return
    setXuatPDF(true)
    try {
      if (!(window as any).html2pdf) {
        await new Promise<void>((ok,err) => {
          const sc = document.createElement('script')
          sc.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js'
          sc.onload=()=>ok(); sc.onerror=()=>err(); document.head.appendChild(sc)
        })
      }
      await (window as any).html2pdf().set({
        margin:[5,5,5,5], filename:`HoaDon_${maDon}.pdf`,
        image:{type:'jpeg',quality:0.98},
        html2canvas:{scale:2,useCORS:true,logging:false},
        jsPDF:{unit:'mm',format:'a4',orientation:'portrait'},
      }).from(hdRef.current).save()
    } catch { alert('Lỗi xuất PDF. Dùng nút "In" → "Save as PDF".') }
    finally { setXuatPDF(false) }
  }

  // Dữ liệu
  const maDon      = don['Mã đơn hàng']||''
  const ngayDat    = don['Ngày bán']||don['Ngày đặt']||''
  const ngayGiao   = don['Ngày hẹn giao']||''
  const tenKH      = khInfo?.['Tên khách hàng']||don['Tên khách hàng']||'—'
  const sdtKH      = khInfo?.['Số điện thoại']||'—'
  const diaChiGiao = don['Địa chỉ giao']||khInfo?.['Địa chỉ']||'—'
  const tongTien   = Number(don['Tổng tiền đơn']||0)
  const datCoc     = Number(don['Đặt cọc']||0)
  const conLai     = Number(don['Còn phải thu']||0)
  const nvBan      = don['Nhân viên bán']||'—'
  const htCoc      = don['Hình thức cọc']||''
  const ghiChuDon  = don['Ghi chú']||''
  const dsSP       = chiTiet.filter(ct=>ct['Tên SP (ghi nhanh)']||ct['Mã SP'])

  const logoSz = Number(ST.logoSize)||56
  const cTen   = Number(ST.coChuTenCH)||20
  const mau    = ST.mauChinh||'#1B3A6B'
  const pad    = Number(ST.paddingTrang)||20
  const fzB    = Number(ST.coChuBang)||12
  const fzN    = Number(ST.coChuND)||11
  const mxhArr = (ST.mangXH||'').split('\n').filter(Boolean)

  // Màu nhạt từ màu chủ
  const mauBg  = mau+'12'
  const mauBd  = mau+'30'

  return (<>
    <style>{`
      @media print {
        .no-print,nav,aside,header,[class*="sidebar"],[class*="Sidebar"],[id*="sidebar"]{display:none!important;}
        body{background:white!important;margin:0!important;}
        main,[class*="main"]{margin:0!important;padding:0!important;width:100%!important;}
        .hd-root{box-shadow:none!important;margin:0!important;max-width:100%!important;padding:5mm 6mm!important;}
        @page{margin:0;size:A4;}
      }
      *{box-sizing:border-box;margin:0;padding:0;}
      body{background:#D4D8DD;}
      .hd-root{background:white;max-width:794px;margin:0 auto;font-family:Arial,Helvetica,sans-serif;}
      .sp-tb{width:100%;border-collapse:collapse;}
      .sp-tb th,.sp-tb td{font-family:Arial,Helvetica,sans-serif;}
      .sp-tb tbody tr:nth-child(even) td{background:#F7F9FC;}
    `}</style>

    {/* THANH ĐIỀU KHIỂN */}
    <div className="no-print" style={{background:mau,padding:'8px 16px',display:'flex',gap:'8px',alignItems:'center',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,.25)'}}>
      <button onClick={()=>router.back()} style={{padding:'6px 14px',borderRadius:'5px',border:'none',background:'rgba(255,255,255,.15)',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:600}}>← Quay lại</button>
      <div style={{flex:1}}/>
      <button onClick={()=>setShowSettings(true)} style={{padding:'6px 12px',borderRadius:'5px',border:'1px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)',color:'white',cursor:'pointer',fontSize:'12px'}}>⚙️ Cài đặt</button>
      <button onClick={handleXuatPDF} disabled={xuatPDF} style={{padding:'6px 14px',borderRadius:'5px',border:'none',background:xuatPDF?'#6B7280':'#7C3AED',color:'white',fontWeight:700,cursor:'pointer',fontSize:'12px'}}>
        {xuatPDF?'⏳ Đang xuất...':'📄 Xuất PDF'}
      </button>
      <button onClick={()=>window.print()} style={{padding:'6px 16px',borderRadius:'5px',border:'none',background:'#16A34A',color:'white',fontWeight:700,cursor:'pointer',fontSize:'12px'}}>🖨️ In</button>
    </div>
    <div className="no-print" style={{background:'#FFFBEB',borderBottom:'1px solid #FDE68A',padding:'4px 16px',textAlign:'center',fontSize:'11px',color:'#92400E'}}>
      💡 Khi in: bỏ tick <strong>"Headers and footers"</strong> để ẩn URL
    </div>

    {/* HÓA ĐƠN */}
    <div style={{padding:'14px',background:'#D4D8DD'}}>
    <div className="hd-root" ref={hdRef} style={{padding:`${pad}px`}}>

      {/* ════ HEADER: 3 cột ════
          [Logo | Tên+địa chỉ] .... [MXH+giới thiệu]
      */}
      <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'12px',paddingBottom:'10px',borderBottom:`2px solid ${mau}`}}>

        {/* Logo */}
        {ST.logo && (
          <img src={ST.logo} alt="Logo"
            style={{width:`${logoSz}px`,height:`${logoSz}px`,objectFit:'contain',flexShrink:0,borderRadius:'4px'}}/>
        )}

        {/* Tên + địa chỉ + SĐT — cột trái */}
        <div style={{flex:1}}>
          <div style={{fontSize:`${cTen}px`,fontWeight:900,color:mau,fontFamily:'Arial Black,Arial,sans-serif',lineHeight:1.15,marginBottom:'4px'}}>
            {ST.tenCH}
          </div>
          {ST.diaChiCH && (
            <div style={{fontSize:`${fzN}px`,color:'#555',display:'flex',alignItems:'flex-start',gap:'4px',marginBottom:'2px'}}>
              <span style={{color:mau,flexShrink:0}}>📍</span><span>{ST.diaChiCH}</span>
            </div>
          )}
          {ST.sdtCH && (
            <div style={{fontSize:`${fzN}px`,color:'#555',display:'flex',alignItems:'center',gap:'4px'}}>
              <span style={{color:mau}}>📞</span><span>{ST.sdtCH}</span>
            </div>
          )}
        </div>

        {/* Đường kẻ dọc phân cách */}
        {(mxhArr.length>0||ST.gioiThieu) && (
          <div style={{width:'1px',background:`${mau}30`,alignSelf:'stretch',flexShrink:0}}/>
        )}

        {/* MXH + giới thiệu — cột phải, căn phải */}
        {(mxhArr.length>0||ST.gioiThieu) && (
          <div style={{textAlign:'right',flexShrink:0,maxWidth:'200px'}}>
            {mxhArr.map((line,i)=>(
              <div key={i} style={{fontSize:`${fzN}px`,color:'#444',lineHeight:1.65}}>{line}</div>
            ))}
            {ST.gioiThieu && (
              <div style={{fontSize:`${fzN-1}px`,color:'#888',marginTop:'4px',fontStyle:'italic',lineHeight:1.4}}>
                {ST.gioiThieu}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ════ TIÊU ĐỀ — full width ════ */}
      <div style={{
        background:mau,borderRadius:'6px',
        padding:'8px 0',textAlign:'center',
        marginBottom:'10px',
      }}>
        <div style={{fontSize:'18px',fontWeight:900,color:'white',letterSpacing:'.1em',textTransform:'uppercase',fontFamily:'Arial Black,Arial,sans-serif'}}>
          HÓA ĐƠN BÁN HÀNG
        </div>
      </div>

      {/* ════ THÔNG TIN: KH + ĐƠN — 2 cột ════ */}
      <div style={{display:'grid',gridTemplateColumns:'55% 45%',gap:'8px',marginBottom:'10px'}}>

        {/* Card KH */}
        <div style={{border:`1px solid ${mauBd}`,borderRadius:'6px',overflow:'hidden'}}>
          <div style={{background:mau,padding:'5px 10px',fontSize:'10px',fontWeight:700,color:'white',letterSpacing:'.06em',textTransform:'uppercase'}}>
            👤 Khách hàng
          </div>
          <div style={{padding:'8px 10px',background:mauBg}}>
            <div style={{fontSize:`${fzN+3}px`,fontWeight:800,color:'#111',marginBottom:'5px',lineHeight:1.2}}>{tenKH}</div>
            {sdtKH!=='—'&&<div style={{fontSize:`${fzN}px`,color:'#444',marginBottom:'2px'}}>📞 {sdtKH}</div>}
            {diaChiGiao!=='—'&&<div style={{fontSize:`${fzN}px`,color:'#444',lineHeight:1.4}}>📍 {diaChiGiao}</div>}
          </div>
        </div>

        {/* Card đơn — bỏ Kênh và Hình thức giao */}
        <div style={{border:'1px solid #E2E8F0',borderRadius:'6px',overflow:'hidden'}}>
          <div style={{background:mau,padding:'5px 10px',fontSize:'10px',fontWeight:700,color:'white',letterSpacing:'.06em',textTransform:'uppercase'}}>
            📋 Thông tin đơn hàng
          </div>
          <div style={{padding:'8px 10px',background:'#F8FAFC'}}>
            {[
              ['Số đơn',   maDon,           true ],
              ['Ngày mua', fDate(ngayDat),  false],
              ['Ngày giao',ngayGiao?fDate(ngayGiao):'—', false],
              ['NV bán',   nvBan,           false],
            ].map(([lb,val,bold])=>(
              <div key={lb as string} style={{display:'flex',justifyContent:'space-between',alignItems:'baseline',fontSize:`${fzN}px`,marginBottom:'3px',gap:'6px'}}>
                <span style={{color:'#888',whiteSpace:'nowrap',flexShrink:0}}>{lb}:</span>
                <span style={{fontWeight:bold?800:600,color:bold?mau:'#222',textAlign:'right'}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ════ BẢNG SẢN PHẨM ════ */}
      <div style={{border:'1px solid #E2E8F0',borderRadius:'6px',overflow:'hidden',marginBottom:'8px'}}>
        <table className="sp-tb">
          <thead>
            <tr style={{background:mau}}>
              {[['#','28px','center'],['Sản phẩm','','left'],['SL','44px','center'],['Đơn giá','105px','right'],['Thành tiền','115px','right']].map(([h,w,a])=>(
                <th key={h as string} style={{padding:`6px ${h==='#'?'6px':'10px'}`,fontSize:`${fzB-1}px`,fontWeight:700,color:'white',textAlign:a as any,width:w as string,letterSpacing:'.03em',textTransform:'uppercase'}}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dsSP.length===0?(
              <tr><td colSpan={5} style={{textAlign:'center',color:'#aaa',padding:'14px',fontSize:`${fzB}px`}}>Không có sản phẩm</td></tr>
            ):dsSP.map((ct,i)=>(
              <tr key={i}>
                <td style={{padding:`5px 6px`,textAlign:'center',color:'#bbb',fontSize:`${fzB-1}px`,fontWeight:700,borderBottom:'1px solid #F0F0F0'}}>{i+1}</td>
                <td style={{padding:`5px 10px`,borderBottom:'1px solid #F0F0F0'}}>
                  <div style={{fontWeight:700,color:'#111',fontSize:`${fzB}px`,lineHeight:1.3}}>{ct['Tên SP (ghi nhanh)']||ct['Mã SP']}</div>
                  {ct['Ghi chú SP']&&<div style={{fontSize:`${fzB-2}px`,color:'#888',fontStyle:'italic',marginTop:'1px'}}>{ct['Ghi chú SP']}</div>}
                </td>
                <td style={{padding:`5px 10px`,textAlign:'center',fontWeight:600,color:'#333',fontSize:`${fzB}px`,borderBottom:'1px solid #F0F0F0'}}>{ct['Số lượng']||1}</td>
                <td style={{padding:`5px 10px`,textAlign:'right',color:'#666',fontSize:`${fzB}px`,borderBottom:'1px solid #F0F0F0'}}>{fVND(ct['Đơn giá'])}đ</td>
                <td style={{padding:`5px 10px`,textAlign:'right',fontWeight:800,color:mau,fontSize:`${fzB}px`,borderBottom:'1px solid #F0F0F0'}}>{fVND(ct['Thành tiền'])}đ</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ════ TỔNG TIỀN — full width, gọn ════ */}
      <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'8px'}}>
        <div style={{minWidth:'220px',borderRadius:'6px',overflow:'hidden',border:`1px solid ${mauBd}`}}>
          <div style={{padding:'5px 12px',display:'flex',justifyContent:'space-between',fontSize:`${fzN}px`,borderBottom:`1px solid ${mauBd}`,background:'#F8FAFC'}}>
            <span style={{color:'#777'}}>Tổng tiền hàng:</span>
            <span style={{fontWeight:700}}>{fVND(tongTien)}đ</span>
          </div>
          {datCoc>0&&(
            <div style={{padding:'5px 12px',display:'flex',justifyContent:'space-between',fontSize:`${fzN}px`,borderBottom:`1px solid ${mauBd}`,background:'#F8FAFC'}}>
              <span style={{color:'#777'}}>Đã cọc{htCoc?` (${htCoc})`:''}: </span>
              <span style={{fontWeight:700,color:'#16A34A'}}>- {fVND(datCoc)}đ</span>
            </div>
          )}
          <div style={{padding:'7px 12px',display:'flex',justifyContent:'space-between',alignItems:'center',background:mau}}>
            <span style={{fontSize:`${fzN+1}px`,fontWeight:700,color:'white'}}>Còn phải thu:</span>
            <span style={{fontSize:`${fzN+6}px`,fontWeight:900,color:'white'}}>{fVND(conLai)}đ</span>
          </div>
        </div>
      </div>

      {/* ════ GHI CHÚ — dưới tổng tiền, full width ════ */}
      {(ST.ghiChuHoaDon||ghiChuDon)&&(
        <div style={{marginBottom:'10px',display:'flex',flexDirection:'column',gap:'5px'}}>
          {ST.ghiChuHoaDon&&(
            <div style={{padding:'6px 10px',background:'#FFFBEB',borderRadius:'5px',border:'1px solid #FDE68A',fontSize:`${fzN}px`,color:'#78350F',lineHeight:1.5}}>
              ℹ️ {ST.ghiChuHoaDon}
            </div>
          )}
          {ghiChuDon&&(
            <div style={{padding:'6px 10px',background:'#EFF6FF',borderRadius:'5px',border:'1px solid #BFDBFE',fontSize:`${fzN}px`,color:'#1E40AF',lineHeight:1.5}}>
              📝 Ghi chú: {ghiChuDon}
            </div>
          )}
        </div>
      )}

      {/* ════ CHỮ KÝ ════ */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px',marginBottom:'8px',paddingTop:'4px'}}>
        {[['Khách hàng',tenKH],['Người bán',nvBan]].map(([title,name])=>(
          <div key={title as string} style={{textAlign:'center'}}>
            <div style={{fontSize:'10px',fontWeight:700,color:mau,textTransform:'uppercase',letterSpacing:'.06em'}}>{title}</div>
            <div style={{fontSize:'10px',color:'#CCC',fontStyle:'italic',margin:'2px 0 24px'}}>(Ký và ghi rõ họ tên)</div>
            <div style={{borderTop:'1px dashed #CCC',paddingTop:'4px',fontSize:`${fzN}px`,fontWeight:600,color:'#444'}}>{name}</div>
          </div>
        ))}
      </div>

      {/* ════ CHÂN TRANG ════ */}
      {ST.chanTrang&&(
        <div style={{textAlign:ST.canChanTrang as any,fontSize:`${fzN-1}px`,color:'#AAA',fontStyle:'italic',borderTop:'1px solid #EBEBEB',paddingTop:'6px'}}>
          {ST.chanTrang}
        </div>
      )}

    </div>
    </div>

    {showSettings&&<ModalCaiDat settings={ST} onSave={handleSave} onClose={()=>setShowSettings(false)}/>}
  </>)
}

/* ── HELPERS ── */
function Slider({label,val,min,max,step,onChange}:{label:string;val:string;min:number;max:number;step:number;onChange:(v:string)=>void}) {
  return (
    <div>
      <label style={{fontSize:'11px',color:'#6B7280',display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
        <span>{label}</span><strong>{val}px</strong>
      </label>
      <input type="range" min={min} max={max} step={step} value={val} onChange={e=>onChange(e.target.value)} style={{width:'100%',accentColor:'#1B3A6B'}}/>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:'#CCC'}}><span>{min}</span><span>{max}</span></div>
    </div>
  )
}
function BtnCan({label,active,onClick}:{label:string;active:boolean;onClick:()=>void}) {
  return <button onClick={onClick} style={{flex:1,padding:'6px',border:active?'2px solid #1B3A6B':'1px solid #E5E7EB',borderRadius:'5px',background:active?'#EFF6FF':'white',color:active?'#1B3A6B':'#6B7280',fontWeight:active?700:400,cursor:'pointer',fontSize:'11px'}}>{label}</button>
}
function NhomCan({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  return <div style={{display:'flex',gap:'4px'}}><BtnCan label="◀ Trái" active={value==='left'} onClick={()=>onChange('left')}/><BtnCan label="● Giữa" active={value==='center'} onClick={()=>onChange('center')}/><BtnCan label="▶ Phải" active={value==='right'} onClick={()=>onChange('right')}/></div>
}

/* ── MODAL CÀI ĐẶT ── */
function ModalCaiDat({settings,onSave,onClose}:{settings:Settings;onSave:(s:Settings)=>void;onClose:()=>void}) {
  const [s,setS]            = useState<Settings>({...settings})
  const [saving,setSaving]  = useState(false)
  const [tab,setTab]        = useState<'CH'|'LAYOUT'|'ND'>('CH')
  const fileRef             = useRef<HTMLInputElement>(null)
  const upd = (k:keyof Settings,v:string) => setS(p=>({...p,[k]:v}))
  const mau = s.mauChinh||'#1B3A6B'

  function handleLogo(e:React.ChangeEvent<HTMLInputElement>) {
    const f=e.target.files?.[0]; if(!f) return
    if(f.size>500*1024){alert('Ảnh quá lớn, chọn ảnh dưới 500KB');return}
    const r=new FileReader(); r.onload=ev=>upd('logo',ev.target?.result as string); r.readAsDataURL(f)
  }
  async function save(){setSaving(true);await onSave(s);setSaving(false)}

  const TABS:[typeof tab,string][] = [['CH','🏪 Cửa hàng'],['LAYOUT','📐 Bố cục'],['ND','📝 Nội dung']]

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:'12px',width:'100%',maxWidth:'460px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{padding:'14px 16px 0',borderBottom:'1px solid #F0F0F0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
            <h2 style={{fontSize:'14px',fontWeight:700,margin:0}}>⚙️ Cài đặt hóa đơn</h2>
            <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'18px',color:'#9CA3AF'}}>✕</button>
          </div>
          <div style={{display:'flex'}}>
            {TABS.map(([id,lb])=>(
              <button key={id} onClick={()=>setTab(id)} style={{flex:1,padding:'7px',border:'none',borderBottom:tab===id?`2px solid ${mau}`:'2px solid transparent',background:'none',cursor:'pointer',fontSize:'11px',fontWeight:tab===id?700:400,color:tab===id?mau:'#9CA3AF'}}>
                {lb}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{overflowY:'auto',padding:'14px 16px',flex:1,display:'flex',flexDirection:'column',gap:'12px'}}>

          {/* TAB CỬA HÀNG */}
          {tab==='CH'&&<>
            <p style={{fontSize:'11px',color:'#16A34A',background:'#F0FDF4',padding:'6px 10px',borderRadius:'5px',margin:0}}>✅ Lưu trên máy chủ — dùng mọi thiết bị</p>

            {/* Logo */}
            <div style={{border:'1px solid #E5E7EB',borderRadius:'7px',padding:'10px'}}>
              <div style={{fontSize:'11px',fontWeight:700,marginBottom:'8px',color:'#374151'}}>🖼️ Logo cửa hàng</div>
              <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'8px'}}>
                <div style={{width:'52px',height:'52px',border:'1px dashed #D1D5DB',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,background:'#F9FAFB'}}>
                  {s.logo?<img src={s.logo} alt="" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{fontSize:'9px',color:'#9CA3AF',textAlign:'center'}}>Chưa có</span>}
                </div>
                <div style={{flex:1}}>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogo}/>
                  <button onClick={()=>fileRef.current?.click()} style={{padding:'5px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',background:'white',cursor:'pointer',fontSize:'11px',display:'block',width:'100%',marginBottom:'4px'}}>📁 Chọn ảnh (≤500KB)</button>
                  {s.logo&&<button onClick={()=>upd('logo','')} style={{padding:'4px 10px',border:'1px solid #FCA5A5',borderRadius:'5px',background:'#FEF2F2',color:'#DC2626',cursor:'pointer',fontSize:'11px',width:'100%'}}>🗑️ Xoá</button>}
                </div>
              </div>
              <Slider label="Kích thước logo" val={s.logoSize} min={30} max={120} step={4} onChange={v=>upd('logoSize',v)}/>
            </div>

            {/* Tên CH */}
            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên cửa hàng *</label>
              <input style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'13px',boxSizing:'border-box',fontWeight:700}} value={s.tenCH} onChange={e=>upd('tenCH',e.target.value)}/>
              <div style={{marginTop:'6px'}}><Slider label="Cỡ chữ tên CH" val={s.coChuTenCH} min={14} max={32} step={1} onChange={v=>upd('coChuTenCH',v)}/></div>
              <div style={{marginTop:'4px',padding:'4px 8px',background:'#F8FAFC',borderRadius:'4px',fontSize:`${Number(s.coChuTenCH)||20}px`,fontWeight:900,color:mau,fontFamily:'Arial Black,Arial,sans-serif',lineHeight:1.2}}>{s.tenCH||'Tên cửa hàng'}</div>
            </div>

            {[['Địa chỉ','diaChiCH','Số 123 Đường ABC...'],['Số điện thoại','sdtCH','0901 234 567'],['Giới thiệu (cột phải header)','gioiThieu','Chuyên cung cấp...']] .map(([lb,k,ph])=>(
              <div key={k as string}>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb}</label>
                <input style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'12px',boxSizing:'border-box'}} placeholder={ph as string} value={s[k as keyof Settings] as string} onChange={e=>upd(k as keyof Settings,e.target.value)}/>
              </div>
            ))}

            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Website / Fanpage / Zalo... <span style={{fontWeight:400,color:'#9CA3AF'}}>(mỗi dòng 1 mục — cột phải header)</span></label>
              <textarea style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'11px',resize:'vertical',boxSizing:'border-box',lineHeight:1.6}} rows={3} placeholder={'🌐 noithattinhtuyet.com\n📘 fb.com/noithattinh\n💬 Zalo: 0901 234 567'} value={s.mangXH} onChange={e=>upd('mangXH',e.target.value)}/>
            </div>

            {/* Màu */}
            <div style={{border:'1px solid #E5E7EB',borderRadius:'7px',padding:'10px'}}>
              <div style={{fontSize:'11px',fontWeight:700,marginBottom:'8px',color:'#374151'}}>🎨 Màu chủ đạo</div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <input type="color" value={s.mauChinh} onChange={e=>upd('mauChinh',e.target.value)} style={{width:'36px',height:'30px',border:'1px solid #D1D5DB',borderRadius:'4px',cursor:'pointer',padding:'1px'}}/>
                <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                  {['#1B3A6B','#0F6B3B','#7C3AED','#DC2626','#0369A1','#92400E','#1E293B','#B45309','#0E7490'].map(c=>(
                    <button key={c} onClick={()=>upd('mauChinh',c)} style={{width:'20px',height:'20px',background:c,borderRadius:'3px',border:s.mauChinh===c?'2px solid #000':'1px solid transparent',cursor:'pointer'}}/>
                  ))}
                </div>
              </div>
            </div>
          </>}

          {/* TAB BỐ CỤC */}
          {tab==='LAYOUT'&&<>
            <div style={{padding:'8px 10px',background:'#FFF7ED',borderRadius:'6px',border:'1px solid #FED7AA',fontSize:'11px',color:'#92400E',lineHeight:1.6}}>
              <strong>Gợi ý để 6-8 SP vừa 1 trang A4:</strong><br/>
              Padding: 12–16px · Bảng: 10–11px · Nội dung: 10px · Logo: 40–50px · Tên CH: 16–18px
            </div>
            <Slider label="Padding (lề trong hóa đơn)" val={s.paddingTrang} min={8} max={36} step={2} onChange={v=>upd('paddingTrang',v)}/>
            <Slider label="Cỡ chữ bảng sản phẩm"      val={s.coChuBang}   min={9}  max={14} step={1} onChange={v=>upd('coChuBang',v)}/>
            <Slider label="Cỡ chữ nội dung chung"      val={s.coChuND}     min={9}  max={14} step={1} onChange={v=>upd('coChuND',v)}/>
          </>}

          {/* TAB NỘI DUNG */}
          {tab==='ND'&&<>
            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú hóa đơn <span style={{fontWeight:400,color:'#9CA3AF'}}>(VAT, vận chuyển — hiện dưới bảng)</span></label>
              <textarea style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'11px',resize:'vertical',boxSizing:'border-box'}} rows={3} placeholder="VD: Hóa đơn đã bao gồm phí vận chuyển và lắp đặt." value={s.ghiChuHoaDon} onChange={e=>upd('ghiChuHoaDon',e.target.value)}/>
            </div>
            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Chân trang</label>
              <input style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'12px',boxSizing:'border-box'}} value={s.chanTrang} onChange={e=>upd('chanTrang',e.target.value)} placeholder="Cảm ơn quý khách..."/>
            </div>
            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'5px'}}>Căn chỉnh chân trang</label>
              <NhomCan value={s.canChanTrang} onChange={v=>upd('canChanTrang',v)}/>
            </div>
          </>}
        </div>

        {/* Footer */}
        <div style={{padding:'10px 16px',borderTop:'1px solid #F0F0F0',display:'flex',gap:'8px'}}>
          <button onClick={save} disabled={saving} style={{flex:1,padding:'10px',borderRadius:'6px',border:'none',background:saving?'#9CA3AF':mau,color:'white',fontWeight:700,fontSize:'13px',cursor:saving?'not-allowed':'pointer'}}>
            {saving?'⏳ Đang lưu...':'✅ Lưu cài đặt'}
          </button>
          <button onClick={onClose} style={{padding:'10px 14px',borderRadius:'6px',border:'1px solid #E5E7EB',background:'white',cursor:'pointer',fontSize:'13px'}}>Huỷ</button>
        </div>
      </div>
    </div>
  )
}
