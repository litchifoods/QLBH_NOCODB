'use client'
// components/InHoaDonClient.tsx — v7.0 Corporate Design

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
  showBorder:     'true',
  canThongTinCH:  'left',
  canTieuDe:      'center',
  logoPart:       'left',
}
type Settings = typeof MAC_DINH

export default function InHoaDonClient({
  don, chiTiet, khInfo, user, caiDatId:initCaiDatId=0, initSettings={},
}: { don:any; chiTiet:any[]; khInfo:any; user:UserSession; caiDatId?:number; initSettings?:any }) {
  const router  = useRouter()
  const hdRef   = useRef<HTMLDivElement>(null)
  const [ST, setST]                     = useState<Settings>({...MAC_DINH,...initSettings})
  const [showSettings, setShowSettings] = useState(false)
  const [caiDatId, setCaiDatId] = useState<number|null>(initCaiDatId||null)
  const [khoGiay, setKhoGiay] = useState<'a4'|'a3'>('a4')
  const [xuatPDF, setXuatPDF]           = useState(false)

  // Settings đã load từ server-side (initSettings prop)

  async function handleSave(s: Settings) {
    setST(s); setShowSettings(false)
    try {
      if (!caiDatId) { console.warn('Chưa có caiDatId'); return }
      await fetch('/api/cai-dat', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          id: caiDatId,
          theme: JSON.stringify({
            tenCH:        s.tenCH,
            coChuTenCH:   s.coChuTenCH,
            diaChiCH:     s.diaChiCH,
            sdtCH:        s.sdtCH,
            gioiThieu:    s.gioiThieu,
            mangXH:       s.mangXH,
            chanTrang:    s.chanTrang,
            ghiChuHoaDon: s.ghiChuHoaDon,
            logo:         s.logo,
            logoSize:     s.logoSize,
            mauChinh:     s.mauChinh,
            paddingTrang: s.paddingTrang,
            coChuBang:    s.coChuBang,
            coChuND:      s.coChuND,
            canChanTrang: s.canChanTrang,
            showBorder:   s.showBorder,
            canThongTinCH:s.canThongTinCH,
            canTieuDe:    s.canTieuDe,
            logoPart:     s.logoPart,
          }),
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
        margin:[8,8,8,8], filename:`HoaDon_${maDon}.pdf`,
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
  const cpGiaoHang = Number(don['CP giao hàng']||0)
  const cpDoiTra   = Number(don['CP đổi trả']||0)
  const nvBan      = don['Nhân viên bán']||'—'
  const htCoc      = don['Hình thức cọc']||''
  const ghiChuDon  = don['Ghi chú']||''
  const dsSP       = chiTiet.filter(ct=>(ct['Tên SP (ghi nhanh)']||ct['Mã SP']) && ct['Trạng thái SP']!=='Huỷ')

  // Style vars
  const mau    = ST.mauChinh||'#1B3A6B'
  const pad    = Number(ST.paddingTrang)||20
  const fzB    = Number(ST.coChuBang)||12
  const fzN    = Number(ST.coChuND)||11
  const cTen   = Number(ST.coChuTenCH)||20
  const logoSz = Number(ST.logoSize)||56
  const mxhArr = (ST.mangXH||'').split('\n').filter(Boolean)

  return (<>
    <style>{`
      @media print {
        .no-print,nav,aside,header,[class*="sidebar"],[class*="Sidebar"],[id*="sidebar"]{display:none!important;}
        body{background:white!important;margin:0!important;}
        main,[class*="main"]{margin:0!important;padding:0!important;width:100%!important;}
        .hd-root{box-shadow:none!important;margin:0!important;max-width:100%!important;padding:8mm 10mm!important;}
        @page{margin:0;size:A4;}
      }
      *{box-sizing:border-box;}
      body{background:#E5E7EB;}
      .hd-root{background:white;max-width:${khoGiay==='a3'?'1123px':'794px'};margin:0 auto;font-family:'Arial',Helvetica,sans-serif;}
      .sp-tb{width:100%;border-collapse:collapse;}
    `}</style>
    <style>{`@page{margin:0;size:${khoGiay==='a3'?'A3':'A4'};}`}</style>

    {/* THANH ĐIỀU KHIỂN */}
    <div className="no-print" style={{
      background:'#1E293B',padding:'10px 20px',
      display:'flex',gap:'8px',alignItems:'center',
      position:'sticky',top:0,zIndex:100,
      boxShadow:'0 2px 12px rgba(0,0,0,.3)'
    }}>
      <button onClick={()=>router.back()} style={{
        padding:'7px 14px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.2)',
        background:'transparent',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:'13px'
      }}>← Quay lại</button>
      <div style={{flex:1}}/>
      <button onClick={()=>setShowSettings(true)} style={{
        padding:'7px 12px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.2)',
        background:'transparent',color:'rgba(255,255,255,.8)',cursor:'pointer',fontSize:'12px'
      }}>⚙️ Cài đặt</button>
      <button onClick={handleXuatPDF} disabled={xuatPDF} style={{
        padding:'7px 14px',borderRadius:'6px',border:'none',
        background:xuatPDF?'#6B7280':'#7C3AED',
        color:'white',fontWeight:600,cursor:'pointer',fontSize:'12px'
      }}>{xuatPDF?'⏳ Đang xuất...':'📄 Xuất PDF'}</button>
      <button onClick={()=>window.print()} style={{
        padding:'7px 16px',borderRadius:'6px',border:'none',
        background:'#16A34A',color:'white',fontWeight:700,cursor:'pointer',fontSize:'12px'
      }}>🖨️ In</button>
    </div>
    <div className="no-print" style={{
      background:'#FEF9C3',borderBottom:'1px solid #FDE68A',
      padding:'5px 20px',textAlign:'center',fontSize:'11px',color:'#92400E'
    }}>
      💡 Khi in: bỏ tick <strong>"Headers and footers"</strong> để ẩn URL
    </div>

    {/* HÓA ĐƠN */}
    <div style={{padding:'24px 16px',background:'#E5E7EB',minHeight:'100vh'}}>
    <div className="hd-root" ref={hdRef} style={{
      padding:`${pad}px`,
      boxShadow:'0 4px 24px rgba(0,0,0,.12)'
    }}>

      {/* ══ HEADER ══ */}
      <div style={{
        display:'flex',alignItems:'flex-start',
        justifyContent:'space-between',gap:'16px',
        paddingBottom:'16px',
        borderBottom:`2.5px solid ${mau}`,
        marginBottom:'16px'
      }}>
        {/* Trái: Logo + Tên + Địa chỉ */}
        <div style={{display:'flex',alignItems:'flex-start',gap:'12px',flex:1}}>
          {ST.logo&&(
            <img src={ST.logo} alt="Logo"
              style={{width:`${logoSz}px`,height:`${logoSz}px`,objectFit:'contain',flexShrink:0}}/>
          )}
          <div>
            <div style={{
              fontSize:`${cTen}px`,fontWeight:900,color:mau,
              fontFamily:'Arial Black,Arial,sans-serif',
              letterSpacing:'-0.3px',lineHeight:1.1,marginBottom:'6px'
            }}>{ST.tenCH}</div>
            {ST.diaChiCH&&(
              <div style={{fontSize:`${fzN}px`,color:'#555',marginBottom:'2px',display:'flex',alignItems:'flex-start',gap:'4px'}}>
                <span style={{color:mau,fontSize:'10px',marginTop:'1px'}}>📍</span>{ST.diaChiCH}
              </div>
            )}
            {ST.sdtCH&&(
              <div style={{fontSize:`${fzN}px`,color:'#555',display:'flex',alignItems:'center',gap:'4px'}}>
                <span style={{color:mau,fontSize:'10px'}}>📞</span>{ST.sdtCH}
              </div>
            )}
            {ST.gioiThieu&&(
              <div style={{fontSize:`${fzN-1}px`,color:'#888',marginTop:'5px',fontStyle:'italic',lineHeight:1.4}}>
                {ST.gioiThieu}
              </div>
            )}
          </div>
        </div>

        {/* Phải: MXH */}
        {mxhArr.length>0&&(
          <div style={{textAlign:'right',flexShrink:0}}>
            {mxhArr.map((line,i)=>(
              <div key={i} style={{fontSize:`${fzN}px`,color:'#555',lineHeight:1.8}}>{line}</div>
            ))}
          </div>
        )}
      </div>

      {/* ══ TIÊU ĐỀ ══ */}
      <div style={{textAlign:'center',marginBottom:'16px'}}>
        <div style={{
          fontSize:'17px',fontWeight:900,color:mau,
          letterSpacing:'.18em',textTransform:'uppercase',
          fontFamily:'Arial Black,Arial,sans-serif',
        }}>Hóa đơn bán hàng</div>
        <div style={{
          fontSize:`${fzN}px`,color:'#888',marginTop:'4px',
          letterSpacing:'.04em'
        }}>
          Số: <strong style={{color:mau}}>{maDon}</strong>
          {ngayDat&&<span style={{marginLeft:'14px'}}>Ngày: <strong style={{color:'#374151'}}>{fDate(ngayDat)}</strong></span>}
        </div>
      </div>

      {/* ══ THÔNG TIN KH + ĐƠN ══ */}
      <div style={{
        display:'grid',gridTemplateColumns:'55% 45%',
        gap:'0',marginBottom:'16px',
        border:'1px solid #E2E8F0',borderRadius:'6px',overflow:'hidden'
      }}>
        {/* KH */}
        <div style={{borderRight:'1px solid #E2E8F0'}}>
          <div style={{
            padding:'5px 12px',
            borderBottom:'1px solid #E2E8F0',
            background:'#F8FAFC'
          }}>
            <span style={{fontSize:'9px',fontWeight:700,color:'#94A3B8',letterSpacing:'.1em',textTransform:'uppercase'}}>
              Khách hàng
            </span>
          </div>
          <div style={{padding:'10px 12px'}}>
            <div style={{fontSize:`${fzN+3}px`,fontWeight:800,color:'#111',marginBottom:'6px',lineHeight:1.2}}>{tenKH}</div>
            {sdtKH!=='—'&&(
              <div style={{fontSize:`${fzN}px`,color:'#555',marginBottom:'3px',display:'flex',gap:'5px',alignItems:'center'}}>
                <span style={{color:mau}}>📞</span>{sdtKH}
              </div>
            )}
            {diaChiGiao!=='—'&&(
              <div style={{fontSize:`${fzN}px`,color:'#555',display:'flex',gap:'5px',alignItems:'flex-start',lineHeight:1.4}}>
                <span style={{color:mau,flexShrink:0,marginTop:'1px'}}>📍</span>{diaChiGiao}
              </div>
            )}
          </div>
        </div>

        {/* Đơn hàng */}
        <div>
          <div style={{
            padding:'5px 12px',
            borderBottom:'1px solid #E2E8F0',
            background:'#F8FAFC'
          }}>
            <span style={{fontSize:'9px',fontWeight:700,color:'#94A3B8',letterSpacing:'.1em',textTransform:'uppercase'}}>
              Chi tiết đơn hàng
            </span>
          </div>
          <div style={{padding:'10px 12px',display:'flex',flexDirection:'column',gap:'5px'}}>
            {[
              ['Ngày giao', ngayGiao?fDate(ngayGiao):'—'],
              ['Nhân viên bán', nvBan],
            ].map(([lb,val])=>(
              <div key={lb} style={{display:'flex',justifyContent:'space-between',fontSize:`${fzN}px`,gap:'8px'}}>
                <span style={{color:'#94A3B8',whiteSpace:'nowrap'}}>{lb}</span>
                <span style={{fontWeight:600,color:'#374151',textAlign:'right'}}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ BẢNG SẢN PHẨM ══ */}
      <div style={{
        border:'1px solid #E2E8F0',borderRadius:'6px',
        overflow:'hidden',marginBottom:'0'
      }}>
        <table className="sp-tb">
          <thead>
            <tr style={{borderBottom:`2px solid ${mau}`}}>
              {[
                {h:'#',      w:'32px',  a:'center'},
                {h:'Sản phẩm',w:'',    a:'left'  },
                {h:'SL',     w:'44px',  a:'center'},
                {h:'Đơn giá',w:'110px', a:'right' },
                {h:'Thành tiền',w:'120px',a:'right'},
              ].map(({h,w,a})=>(
                <th key={h} style={{
                  padding:`7px ${h==='#'?'8px':'12px'}`,
                  fontSize:'9px',fontWeight:700,
                  color:'#94A3B8',letterSpacing:'.1em',
                  textTransform:'uppercase',textAlign:a as any,
                  width:w,background:'#F8FAFC'
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dsSP.length===0?(
              <tr><td colSpan={5} style={{textAlign:'center',color:'#CBD5E1',padding:'20px',fontSize:`${fzB}px`}}>Không có sản phẩm</td></tr>
            ):dsSP.map((ct,i)=>(
              <tr key={i} style={{borderBottom:'1px solid #F1F5F9'}}>
                <td style={{
                  padding:`6px 8px`,textAlign:'center',
                  fontSize:`${fzB-1}px`,color:'#CBD5E1',fontWeight:700
                }}>{i+1}</td>
                <td style={{padding:`6px 12px`}}>
                  <div style={{fontWeight:700,color:'#111',fontSize:`${fzB}px`,lineHeight:1.35}}>
                    {ct['Tên SP (ghi nhanh)']||ct['Mã SP']}
                  </div>
                  {ct['Ghi chú SP']&&(
                    <div style={{fontSize:`${fzB-2}px`,color:'#94A3B8',fontStyle:'italic',marginTop:'2px'}}>
                      {ct['Ghi chú SP']}
                    </div>
                  )}
                </td>
                <td style={{padding:`6px 12px`,textAlign:'center',fontWeight:600,color:'#374151',fontSize:`${fzB}px`}}>
                  {ct['Số lượng']||1}
                </td>
                <td style={{padding:`6px 12px`,textAlign:'right',color:'#64748B',fontSize:`${fzB}px`}}>
                  {fVND(ct['Đơn giá'])}đ
                </td>
                <td style={{padding:`6px 12px`,textAlign:'right',fontWeight:800,color:mau,fontSize:`${fzB}px`}}>
                  {fVND(ct['Thành tiền'])}đ
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ══ TỔNG TIỀN — full width bên dưới bảng ══ */}
        <div style={{borderTop:`2px solid ${mau}`,background:'#F8FAFC'}}>
          {[
            {lb:'Tổng tiền hàng', val:fVND(tongTien)+'đ', bold:false, color:'#374151'},
            ...(cpGiaoHang>0?[{lb:'CP giao hàng / lắp đặt', val:'+ '+fVND(cpGiaoHang)+'đ', bold:false, color:'#92400E'}]:[]),
            ...(cpDoiTra>0?[{lb:'CP đổi / trả hàng', val:'+ '+fVND(cpDoiTra)+'đ', bold:false, color:'#DC2626'}]:[]),
            ...(datCoc>0?[{lb:`Đã cọc${htCoc?' ('+htCoc+')':''}`, val:'− '+fVND(datCoc)+'đ', bold:false, color:'#16A34A'}]:[]),
          ].map(({lb,val,bold,color},i,arr)=>(
            <div key={lb} style={{
              display:'flex',justifyContent:'space-between',alignItems:'center',
              padding:`6px ${pad}px`,
              borderBottom:i<arr.length-1?'1px solid #E2E8F0':'none',
              fontSize:`${fzN}px`,
            }}>
              <span style={{color:'#64748B'}}>{lb}</span>
              <span style={{fontWeight:bold?800:600,color}}>{val}</span>
            </div>
          ))}
          {/* Dòng tổng cuối — nổi bật */}
          <div style={{
            display:'flex',justifyContent:'space-between',alignItems:'center',
            padding:`10px ${pad}px`,
            background:mau,
          }}>
            <span style={{fontSize:`${fzN+1}px`,fontWeight:700,color:'rgba(255,255,255,.85)',letterSpacing:'.04em',textTransform:'uppercase'}}>
              Còn phải thu
            </span>
            <span style={{fontSize:`${fzN+8}px`,fontWeight:900,color:'white',letterSpacing:'-0.5px'}}>
              {fVND(conLai)}đ
            </span>
          </div>
        </div>
      </div>

      {/* ══ GHI CHÚ ══ */}
      {(ST.ghiChuHoaDon||ghiChuDon)&&(
        <div style={{marginTop:'12px',display:'flex',flexDirection:'column',gap:'6px'}}>
          {ST.ghiChuHoaDon&&(
            <div style={{
              padding:'8px 12px',borderLeft:`3px solid ${mau}`,
              background:'#F8FAFC',borderRadius:'0 4px 4px 0',
              fontSize:`${fzN}px`,color:'#475569',lineHeight:1.6
            }}>
              {ST.ghiChuHoaDon}
            </div>
          )}
          {ghiChuDon&&(
            <div style={{
              padding:'8px 12px',borderLeft:'3px solid #CBD5E1',
              background:'#F8FAFC',borderRadius:'0 4px 4px 0',
              fontSize:`${fzN}px`,color:'#475569',lineHeight:1.6
            }}>
              <strong style={{color:'#374151'}}>Ghi chú:</strong> {ghiChuDon}
            </div>
          )}
        </div>
      )}

      {/* ══ CHỮ KÝ ══ */}
      <div style={{
        display:'grid',gridTemplateColumns:'1fr 1fr',
        gap:'24px',marginTop:'24px',paddingTop:'16px',
        borderTop:'1px solid #E2E8F0'
      }}>
        {[['Khách hàng',tenKH],['Người bán',nvBan]].map(([title,name])=>(
          <div key={title} style={{textAlign:'center'}}>
            <div style={{
              fontSize:'9px',fontWeight:700,color:'#94A3B8',
              letterSpacing:'.12em',textTransform:'uppercase',marginBottom:'3px'
            }}>{title}</div>
            <div style={{fontSize:'10px',color:'#CBD5E1',fontStyle:'italic',marginBottom:'32px'}}>
              (Ký và ghi rõ họ tên)
            </div>
            <div style={{
              borderTop:'1px solid #CBD5E1',paddingTop:'6px',
              fontSize:`${fzN}px`,fontWeight:600,color:'#475569'
            }}>{name}</div>
          </div>
        ))}
      </div>

      {/* ══ CHÂN TRANG ══ */}
      {ST.chanTrang&&(
        <div style={{
          textAlign:ST.canChanTrang as any,
          fontSize:`${fzN-1}px`,color:'#94A3B8',
          fontStyle:'italic',borderTop:'1px solid #F1F5F9',
          paddingTop:'10px',marginTop:'12px',
          letterSpacing:'.02em'
        }}>
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
  const [s,setS]           = useState<Settings>({...settings})
  const [saving,setSaving] = useState(false)
  const [tab,setTab]       = useState<'CH'|'LAYOUT'|'ND'>('CH')
  const fileRef            = useRef<HTMLInputElement>(null)
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
      <div style={{background:'white',borderRadius:'12px',width:'100%',maxWidth:'680px',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}} onClick={e=>e.stopPropagation()}>

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

        <div style={{overflowY:'auto',padding:'14px 16px',flex:1,display:'flex',flexDirection:'column',gap:'12px'}}>

          {tab==='CH'&&<>
            <p style={{fontSize:'11px',color:'#16A34A',background:'#F0FDF4',padding:'6px 10px',borderRadius:'5px',margin:0}}>✅ Lưu trên máy chủ — dùng mọi thiết bị</p>
            <div style={{border:'1px solid #E5E7EB',borderRadius:'7px',padding:'10px'}}>
              <div style={{fontSize:'11px',fontWeight:700,marginBottom:'8px',color:'#374151'}}>🖼️ Logo</div>
              <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'8px'}}>
                <div style={{width:'52px',height:'52px',border:'1px dashed #D1D5DB',borderRadius:'6px',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,background:'#F9FAFB'}}>
                  {s.logo?<img src={s.logo} alt="" style={{width:'100%',height:'100%',objectFit:'contain'}}/>:<span style={{fontSize:'9px',color:'#9CA3AF',textAlign:'center'}}>Chưa có</span>}
                </div>
                <div style={{flex:1}}>
                  <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleLogo}/>
                  <button onClick={()=>fileRef.current?.click()} style={{padding:'5px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',background:'white',cursor:'pointer',fontSize:'11px',display:'block',width:'100%',marginBottom:'4px'}}>📁 Chọn ảnh (≤500KB)</button>
                  {s.logo&&<button onClick={()=>upd('logo','')} style={{padding:'4px 10px',border:'1px solid #FCA5A5',borderRadius:'5px',background:'#FEF2F2',color:'#DC2626',cursor:'pointer',fontSize:'11px',width:'100%'}}>🗑️ Xoá logo</button>}
                </div>
              </div>
              <Slider label="Kích thước logo" val={s.logoSize} min={30} max={120} step={4} onChange={v=>upd('logoSize',v)}/>
            </div>

            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên cửa hàng *</label>
              <input style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'13px',boxSizing:'border-box',fontWeight:700}} value={s.tenCH} onChange={e=>upd('tenCH',e.target.value)}/>
              <div style={{marginTop:'6px'}}><Slider label="Cỡ chữ tên CH" val={s.coChuTenCH} min={14} max={32} step={1} onChange={v=>upd('coChuTenCH',v)}/></div>
            </div>

            {[['Địa chỉ','diaChiCH','Số 123 Đường ABC...'],['Số điện thoại','sdtCH','0901 234 567'],['Giới thiệu (dưới tên CH)','gioiThieu','Chuyên cung cấp nội thất...']]
              .map(([lb,k,ph])=>(
              <div key={k as string}>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb}</label>
                <input style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'12px',boxSizing:'border-box'}} placeholder={ph as string} value={s[k as keyof Settings] as string} onChange={e=>upd(k as keyof Settings,e.target.value)}/>
              </div>
            ))}

            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>
                Website / Fanpage / Zalo...
                <span style={{fontWeight:400,color:'#9CA3AF',marginLeft:'4px'}}>(mỗi dòng 1 mục)</span>
              </label>
              <textarea style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'11px',resize:'vertical',boxSizing:'border-box',lineHeight:1.7}} rows={3}
                placeholder={'🌐 noithattinhtuyet.com\n📘 fb.com/noithattinh\n💬 Zalo: 0901 234 567'}
                value={s.mangXH} onChange={e=>upd('mangXH',e.target.value)}/>
            </div>

            <div style={{border:'1px solid #E5E7EB',borderRadius:'7px',padding:'10px'}}>
              <div style={{fontSize:'11px',fontWeight:700,marginBottom:'8px',color:'#374151'}}>🎨 Màu chủ đạo</div>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <input type="color" value={s.mauChinh} onChange={e=>upd('mauChinh',e.target.value)}
                  style={{width:'36px',height:'30px',border:'1px solid #D1D5DB',borderRadius:'4px',cursor:'pointer',padding:'1px'}}/>
                <div style={{display:'flex',gap:'4px',flexWrap:'wrap'}}>
                  {['#1B3A6B','#0F6B3B','#7C3AED','#DC2626','#0369A1','#92400E','#1E293B','#B45309','#0E7490'].map(c=>(
                    <button key={c} onClick={()=>upd('mauChinh',c)}
                      style={{width:'22px',height:'22px',background:c,borderRadius:'4px',border:s.mauChinh===c?'2px solid #000':'1px solid transparent',cursor:'pointer'}}/>
                  ))}
                </div>
              </div>
            </div>
          </>}

          {tab==='LAYOUT'&&<>
            <div style={{padding:'8px 10px',background:'#F0F9FF',borderRadius:'6px',border:'1px solid #BAE6FD',fontSize:'11px',color:'#0369A1',lineHeight:1.7}}>
              <strong>Gợi ý vừa 1 trang A4:</strong><br/>
              Padding: 14–18px · Bảng: 10–11px · Nội dung: 10px
            </div>
            <Slider label="Padding (lề trong hóa đơn)" val={s.paddingTrang} min={8} max={36} step={2} onChange={v=>upd('paddingTrang',v)}/>
            <Slider label="Cỡ chữ bảng sản phẩm"      val={s.coChuBang}   min={9}  max={14} step={1} onChange={v=>upd('coChuBang',v)}/>
            <Slider label="Cỡ chữ nội dung chung"      val={s.coChuND}     min={9}  max={14} step={1} onChange={v=>upd('coChuND',v)}/>
          </>}

          {tab==='ND'&&<>
            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>
                Ghi chú hóa đơn
                <span style={{fontWeight:400,color:'#9CA3AF',marginLeft:'4px'}}>(VAT, vận chuyển...)</span>
              </label>
              <textarea style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'11px',resize:'vertical',boxSizing:'border-box'}} rows={3}
                placeholder="VD: Hóa đơn đã bao gồm phí vận chuyển và lắp đặt."
                value={s.ghiChuHoaDon} onChange={e=>upd('ghiChuHoaDon',e.target.value)}/>
            </div>
            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Chân trang</label>
              <input style={{width:'100%',padding:'6px 10px',border:'1px solid #D1D5DB',borderRadius:'5px',fontSize:'12px',boxSizing:'border-box'}}
                value={s.chanTrang} onChange={e=>upd('chanTrang',e.target.value)}
                placeholder="Cảm ơn quý khách..."/>
            </div>
            <div>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'5px'}}>Căn chỉnh chân trang</label>
              <NhomCan value={s.canChanTrang} onChange={v=>upd('canChanTrang',v)}/>
            </div>
          </>}
        </div>

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
