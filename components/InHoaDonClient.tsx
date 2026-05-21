'use client'
// components/InHoaDonClient.tsx
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fVND(n: any) { return Number(n||0).toLocaleString('vi-VN') }
function fDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

// Cài đặt mặc định cho hóa đơn
const MAC_DINH = {
  tenCH:     'Nội Thất Tính Tuyết',
  diaChiCH:  '',
  sdtCH:     '',
  mangXH:    '',
  gioiThieu: 'Chuyên cung cấp nội thất chất lượng cao',
  chanTrang:  'Cảm ơn quý khách đã tin tưởng và lựa chọn sản phẩm của chúng tôi!',
}
const KEY_LS = 'qlbh_in_hoadon_settings'

export default function InHoaDonClient({
  don, chiTiet, khInfo, user,
}: {
  don: any
  chiTiet: any[]
  khInfo: any
  user: UserSession
}) {
  const router = useRouter()
  const [settings, setSettings] = useState(MAC_DINH)
  const [showSettings, setShowSettings] = useState(false)

  // Load cài đặt từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY_LS)
      if (saved) setSettings({ ...MAC_DINH, ...JSON.parse(saved) })
    } catch {}
  }, [])

  function saveSettings(s: typeof MAC_DINH) {
    setSettings(s)
    try { localStorage.setItem(KEY_LS, JSON.stringify(s)) } catch {}
    setShowSettings(false)
  }

  function handlePrint() {
    window.print()
  }

  const maDon      = don['Mã đơn hàng'] || ''
  const ngayDat    = don['Ngày bán'] || don['Ngày đặt'] || ''
  const ngayGiao   = don['Ngày hẹn giao'] || ''
  const tenKH      = khInfo['Tên khách hàng'] || don['Tên khách hàng'] || '—'
  const sdtKH      = khInfo['Số điện thoại'] || '—'
  const diaChiGiao = don['Địa chỉ giao'] || khInfo['Địa chỉ'] || '—'
  const tongTien   = Number(don['Tổng tiền đơn'] || 0)
  const datCoc     = Number(don['Đặt cọc'] || 0)
  const conLai     = Number(don['Còn phải thu'] || 0)
  const nvBan      = don['Nhân viên bán'] || '—'
  const htCoc      = don['Hình thức cọc'] || ''
  const ghiChu     = don['Ghi chú'] || ''

  const chiTietHopLe = chiTiet.filter(ct => ct['Tên SP (ghi nhanh)'] || ct['Mã SP'])

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .hd-wrapper { box-shadow: none !important; border: none !important; margin: 0 !important; max-width: 100% !important; }
          @page { margin: 12mm; size: A4; }
        }
        body { background: #F3F4F6; }
        .hd-wrapper { background: white; max-width: 760px; margin: 0 auto; padding: 32px 40px; box-shadow: 0 4px 24px rgba(0,0,0,.10); min-height: 100vh; }
        .hd-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
        .hd-table th { background: #1B3A6B; color: white; padding: 9px 10px; text-align: left; font-weight: 600; }
        .hd-table td { padding: 8px 10px; border-bottom: 1px solid #E5E7EB; }
        .hd-table tr:nth-child(even) td { background: #F9FAFB; }
        .hd-table tr:last-child td { border-bottom: none; }
        .divider { border: none; border-top: 1px solid #E5E7EB; margin: 16px 0; }
      `}</style>

      {/* Thanh điều khiển — ẩn khi in */}
      <div className="no-print" style={{background:'#1B3A6B',padding:'10px 16px',display:'flex',gap:'10px',alignItems:'center',position:'sticky',top:0,zIndex:100}}>
        <button onClick={()=>router.back()} style={{padding:'7px 14px',borderRadius:'6px',border:'none',background:'rgba(255,255,255,.15)',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:600}}>← Quay lại</button>
        <div style={{flex:1}}/>
        <button onClick={()=>setShowSettings(true)} style={{padding:'7px 14px',borderRadius:'6px',border:'1px solid rgba(255,255,255,.3)',background:'rgba(255,255,255,.1)',color:'white',cursor:'pointer',fontSize:'13px'}}>⚙️ Cài đặt hóa đơn</button>
        <button onClick={handlePrint} style={{padding:'8px 20px',borderRadius:'6px',border:'none',background:'#22C55E',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px',display:'flex',alignItems:'center',gap:'6px'}}>🖨️ In hóa đơn</button>
      </div>

      {/* Nội dung hóa đơn */}
      <div style={{padding:'20px'}}>
        <div className="hd-wrapper">
          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'}}>
            <div>
              <div style={{fontSize:'22px',fontWeight:800,color:'#1B3A6B',fontFamily:'Playfair Display,serif'}}>{settings.tenCH}</div>
              {settings.gioiThieu && <div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>{settings.gioiThieu}</div>}
              {settings.diaChiCH && <div style={{fontSize:'12px',color:'#374151',marginTop:'4px'}}>📍 {settings.diaChiCH}</div>}
              {settings.sdtCH    && <div style={{fontSize:'12px',color:'#374151'}}>📞 {settings.sdtCH}</div>}
              {settings.mangXH && settings.mangXH.split('\n').map((line, i) => (
                <div key={i} style={{fontSize:'12px',color:'#374151'}}>{line}</div>
              ))}
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:'20px',fontWeight:800,color:'#1B3A6B',letterSpacing:'.05em'}}>HÓA ĐƠN BÁN HÀNG</div>
              <div style={{fontSize:'14px',fontWeight:700,color:'#374151',marginTop:'4px'}}>{maDon}</div>
              <div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>Ngày: {fDate(ngayDat)}</div>
              {ngayGiao && <div style={{fontSize:'12px',color:'#6B7280'}}>Giao: {fDate(ngayGiao)}</div>}
            </div>
          </div>

          <hr className="divider"/>

          {/* Thông tin KH */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px',marginBottom:'16px'}}>
            <div>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6B7280',textTransform:'uppercase',marginBottom:'6px'}}>Khách hàng</div>
              <div style={{fontWeight:700,fontSize:'15px',color:'#1F2937'}}>{tenKH}</div>
              {sdtKH !== '—' && <div style={{fontSize:'13px',color:'#374151',marginTop:'3px'}}>📞 {sdtKH}</div>}
              {diaChiGiao !== '—' && <div style={{fontSize:'13px',color:'#374151',marginTop:'3px'}}>📍 {diaChiGiao}</div>}
            </div>
            <div>
              <div style={{fontSize:'11px',fontWeight:700,color:'#6B7280',textTransform:'uppercase',marginBottom:'6px'}}>Thông tin đơn hàng</div>
              <div style={{fontSize:'13px',color:'#374151'}}>NV bán: <strong>{nvBan}</strong></div>
              <div style={{fontSize:'13px',color:'#374151',marginTop:'2px'}}>Kênh: {don['Kênh bán'] || '—'}</div>
              <div style={{fontSize:'13px',color:'#374151',marginTop:'2px'}}>Giao: {don['Hình thức giao hàng'] || '—'}</div>
            </div>
          </div>

          {/* Bảng sản phẩm */}
          <table className="hd-table">
            <thead>
              <tr>
                <th style={{width:'30px'}}>#</th>
                <th>Sản phẩm</th>
                <th style={{textAlign:'center',width:'60px'}}>SL</th>
                <th style={{textAlign:'right',width:'120px'}}>Đơn giá</th>
                <th style={{textAlign:'right',width:'130px'}}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {chiTietHopLe.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign:'center',color:'#6B7280',padding:'20px'}}>Không có sản phẩm</td></tr>
              ) : chiTietHopLe.map((ct, i) => (
                <tr key={i}>
                  <td style={{color:'#6B7280'}}>{i+1}</td>
                  <td>
                    <div style={{fontWeight:600}}>{ct['Tên SP (ghi nhanh)'] || ct['Mã SP']}</div>
                    {ct['Ghi chú SP'] && <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>{ct['Ghi chú SP']}</div>}
                  </td>
                  <td style={{textAlign:'center'}}>{ct['Số lượng'] || 1}</td>
                  <td style={{textAlign:'right'}}>{fVND(ct['Đơn giá'])}đ</td>
                  <td style={{textAlign:'right',fontWeight:600}}>{fVND(ct['Thành tiền'])}đ</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tổng tiền */}
          <div style={{marginTop:'16px',display:'flex',justifyContent:'flex-end'}}>
            <div style={{width:'260px'}}>
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
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'15px',fontWeight:800,padding:'8px 0',color:'#1B3A6B',borderTop:'2px solid #1B3A6B',marginTop:'4px'}}>
                <span>Còn phải thu:</span>
                <span style={{color:conLai>0?'#DC2626':'#16A34A'}}>{fVND(conLai)}đ</span>
              </div>
            </div>
          </div>

          {/* Ghi chú */}
          {ghiChu && (
            <div style={{marginTop:'16px',padding:'10px 14px',background:'#FFF7ED',borderRadius:'6px',border:'1px solid #FED7AA',fontSize:'12px',color:'#92400E'}}>
              📝 {ghiChu}
            </div>
          )}

          {/* Chân trang */}
          {settings.chanTrang && (
            <div style={{marginTop:'32px',textAlign:'center',fontSize:'12px',color:'#6B7280',fontStyle:'italic',borderTop:'1px solid #E5E7EB',paddingTop:'16px'}}>
              {settings.chanTrang}
            </div>
          )}

          {/* Chữ ký */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'40px',marginTop:'40px',textAlign:'center',fontSize:'12px',color:'#6B7280'}}>
            <div>
              <div style={{fontWeight:700,marginBottom:'4px'}}>Khách hàng</div>
              <div style={{height:'48px',borderBottom:'1px dashed #D1D5DB',marginBottom:'4px'}}></div>
              <div>{tenKH}</div>
            </div>
            <div>
              <div style={{fontWeight:700,marginBottom:'4px'}}>Người bán</div>
              <div style={{height:'48px',borderBottom:'1px dashed #D1D5DB',marginBottom:'4px'}}></div>
              <div>{nvBan}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal cài đặt */}
      {showSettings && (
        <ModalCaiDat settings={settings} onSave={saveSettings} onClose={()=>setShowSettings(false)} />
      )}
    </>
  )
}

function ModalCaiDat({ settings, onSave, onClose }: {
  settings: typeof MAC_DINH
  onSave: (s: typeof MAC_DINH) => void
  onClose: () => void
}) {
  const [s, setS] = useState({ ...settings })
  const upd = (k: string, v: string) => setS(p => ({ ...p, [k]: v }))

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}
      onClick={onClose}>
      <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'440px',maxHeight:'90vh',overflowY:'auto'}}
        onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
          <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>⚙️ Cài đặt hóa đơn</h2>
          <button onClick={onClose} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
        </div>
        <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>
          💡 Cài đặt lưu trên trình duyệt này — áp dụng cho tất cả hóa đơn.
        </p>
        <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
          {[
            ['Tên cửa hàng', 'tenCH', 'Nội Thất Tính Tuyết'],
            ['Địa chỉ cửa hàng', 'diaChiCH', '123 Đường ABC, Quận 1...'],
            ['Số điện thoại', 'sdtCH', '0901 234 567'],
            ['Giới thiệu ngắn', 'gioiThieu', 'Chuyên cung cấp nội thất...'],
          ].map(([lb, k, ph]) => (
            <div key={k}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb}</label>
              <input style={{width:'100%',padding:'8px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box'}}
                placeholder={ph} value={(s as any)[k]} onChange={e=>upd(k, e.target.value)}/>
            </div>
          ))}
          <div>
            <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'3px'}}>Mạng xã hội / website (mỗi dòng 1 mục)</label>
            <textarea style={{width:'100%',padding:'8px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'13px',resize:'vertical',boxSizing:'border-box'}}
              rows={3} placeholder={'Facebook: fb.com/cua-hang\nZalo: 0901 234 567'} value={s.mangXH} onChange={e=>upd('mangXH',e.target.value)}/>
          </div>
          <div>
            <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'3px'}}>Chân trang hóa đơn</label>
            <input style={{width:'100%',padding:'8px 10px',border:'1px solid #D1D5DB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box'}}
              placeholder="Cảm ơn quý khách..." value={s.chanTrang} onChange={e=>upd('chanTrang',e.target.value)}/>
          </div>
          <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
            <button onClick={()=>onSave(s)}
              style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'#1B3A6B',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
              ✅ Lưu cài đặt
            </button>
            <button onClick={onClose}
              style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid #D1D5DB',background:'white',cursor:'pointer',fontSize:'14px'}}>
              Huỷ
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
