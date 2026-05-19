'use client'
// components/DoiSoatClient.tsx
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function formatVND(n: any) { return Number(n||0).toLocaleString('vi-VN')+'đ' }
function formatDateTime(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

interface KhMap { ten: string; sdt: string; diaChi: string }

export default function DoiSoatClient({
  giaoHang, donMap, khachHangMap, maDonFilter, user,
}: {
  giaoHang: any[]
  donMap: Record<string,any>
  khachHangMap: Record<string,KhMap>
  maDonFilter?: string
  user: UserSession
}) {
  const router = useRouter()
  const [filterTT,   setFilterTT]   = useState(maDonFilter ? 'Tất cả' : 'Chưa đối soát')
  const [showModal,  setShowModal]  = useState(false)
  const [chuyenChon, setChuyenChon] = useState<any>(null)
  const [tienThu,    setTienThu]    = useState(0)
  const [ghiChuDS,   setGhiChuDS]  = useState('')
  const [hoanThanhDon, setHoanThanhDon] = useState(false)
  const [loading,    setLoading]    = useState(false)
  const [msg,        setMsg]        = useState('')
  const [msgType,    setMsgType]    = useState<'ok'|'err'>('ok')

  // Lọc bỏ rỗng
  const giaoHopLe = useMemo(() =>
    giaoHang.filter(g => g['Mã đơn hàng']?.toString().trim())
  , [giaoHang])

  const filtered = useMemo(() => {
    let list = giaoHopLe
    if (maDonFilter) list = list.filter(g => g['Mã đơn hàng'] === maDonFilter)
    if (filterTT === 'Chưa đối soát') return list.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát')
    if (filterTT === 'Đã đối soát')   return list.filter(g => g['Tình trạng đối soát'] === 'Đã đối soát')
    return list
  }, [giaoHopLe, filterTT, maDonFilter])

  const tongChuaDS  = giaoHopLe.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát').length
  const tongChiPhi  = filtered.reduce((s,g) => s + Number(g['Chi phí vận chuyển']||0) + Number(g['Chi phí lắp đặt']||0), 0)
  const tongThuKH   = filtered.reduce((s,g) => s + Number(g['Tiền thu từ KH']||0), 0)

  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.ten || tenTuDon || maKH || '—'
  }

  function moDoiSoat(chuyen: any) {
    setChuyenChon(chuyen)
    // Gợi ý số tiền thu = còn phải thu của đơn
    const don = donMap[chuyen['Mã đơn hàng']]
    setTienThu(Number(don?.['Còn phải thu']||0))
    setGhiChuDS(chuyen['Ghi chú đối soát']||'')
    setHoanThanhDon(false)
    setShowModal(true)
  }

  async function luuDoiSoat() {
    if (!chuyenChon) return
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/doi-soat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maGiaoHang:    chuyenChon['Mã giao hàng'],
          tienThu,
          ghiChu:        ghiChuDS,
          hoanThanhDon,
        }),
      })
      if (!res.ok) throw new Error('Lỗi đối soát')
      setMsg(`✅ Đã đối soát chuyến ${chuyenChon['Mã đơn hàng']}`)
      setMsgType('ok'); setShowModal(false); router.refresh()
    } catch (err: any) {
      setMsg('❌ '+(err.message||'Lỗi')); setMsgType('err')
    } finally {
      setLoading(false); setTimeout(()=>setMsg(''),4000)
    }
  }

  const don = chuyenChon ? donMap[chuyenChon['Mã đơn hàng']] : null
  const maKHChon = don?.['Mã KH'] || ''
  const tenKHChon = getTenKH(maKHChon, don?.['Tên khách hàng'])
  const chiPhiChuyen = Number(chuyenChon?.['Chi phí vận chuyển']||0) + Number(chuyenChon?.['Chi phí lắp đặt']||0)

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .ds-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .ds-table th,.ds-table td{padding:8px 10px;}
        .ds-table tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal{background:white;border-radius:12px;padding:24px;width:100%;max-width:460px;max-height:90vh;overflow-y:auto;}
        @media(max-width:800px){.col-cp,.col-thu{display:none;}}
      `}</style>

      {/* Header */}
      <div className="ds-header">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>💰 Đối soát giao hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {giaoHopLe.length} chuyến
            {tongChuaDS>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {tongChuaDS} chưa đối soát</span>}
          </p>
        </div>
        {maDonFilter&&(
          <Link href="/dashboard/doi-soat" className="btn btn-ghost btn-sm">← Xem tất cả</Link>
        )}
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgType==='ok'?'#D1FAE5':'#FEE2E2',color:msgType==='ok'?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'12px',marginBottom:'16px'}}>
        {[
          {label:'Chuyến hiển thị', val:filtered.length, icon:'🚚', color:'var(--primary)'},
          {label:'Chưa đối soát',   val:tongChuaDS,      icon:'⏳', color:'#92400E'},
          {label:'Tổng chi phí',    val:formatVND(tongChiPhi), icon:'💸', color:'#DC2626'},
          {label:'Đã thu từ KH',    val:formatVND(tongThuKH),  icon:'💵', color:'#065F46'},
        ].map(({label,val,icon,color})=>(
          <div key={label} className="card" style={{padding:'14px 16px'}}>
            <div style={{fontSize:'20px',marginBottom:'4px'}}>{icon}</div>
            <div style={{fontSize:'18px',fontWeight:800,color}}>{val}</div>
            <div style={{fontSize:'12px',color:'var(--text-secondary)'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          {['Tất cả','Chưa đối soát','Đã đối soát'].map(tt=>(
            <button key={tt} onClick={()=>setFilterTT(tt)} style={{
              padding:'5px 14px',borderRadius:'20px',border:'1px solid',
              borderColor:filterTT===tt?'var(--primary)':'var(--border)',
              background:filterTT===tt?'var(--primary-pale)':'white',
              color:filterTT===tt?'var(--primary)':'var(--text-secondary)',
              fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer',
            }}>{tt}</button>
          ))}
        </div>
      </div>

      {/* Bảng */}
      <div className="card">
        <div style={{overflowX:'auto'}}>
          <table className="ds-table" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày giao</th>
                <th style={{textAlign:'left',fontWeight:700}}>Khách hàng</th>
                <th style={{textAlign:'left',fontWeight:700}}>Người giao</th>
                <th className="col-cp" style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Chi phí</th>
                <th className="col-thu" style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Đã thu KH</th>
                <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                <th style={{width:'80px'}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0?(
                <tr><td colSpan={8} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có chuyến nào</td></tr>
              ):filtered.map((g:any,i:number)=>{
                const don      = donMap[g['Mã đơn hàng']]
                const maKH     = don?.['Mã KH']||g['Mã KH']||''
                const tenKH    = getTenKH(maKH, don?.['Tên khách hàng'])
                const chuaDS   = g['Tình trạng đối soát']!=='Đã đối soát'
                const chiPhi   = Number(g['Chi phí vận chuyển']||0)+Number(g['Chi phí lắp đặt']||0)
                return(
                  <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td>
                      <Link href={`/dashboard/don-hang/${g['Mã đơn hàng']}`}
                        style={{color:'var(--primary)',fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>
                        {g['Mã đơn hàng']}
                      </Link>
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{formatDateTime(g['Ngày giao'])}</td>
                    <td>
                      <div style={{fontWeight:600}}>{tenKH}</div>
                      {maKH&&<div style={{fontSize:'11px',color:'var(--text-muted)'}}>{maKH}</div>}
                    </td>
                    <td style={{color:'var(--text-secondary)'}}>{g['Người giao']||'—'}</td>
                    <td className="col-cp" style={{textAlign:'right',whiteSpace:'nowrap'}}>
                      {chiPhi>0?<span style={{color:'#DC2626',fontWeight:600}}>{formatVND(chiPhi)}</span>:'—'}
                    </td>
                    <td className="col-thu" style={{textAlign:'right',whiteSpace:'nowrap'}}>
                      {g['Tiền thu từ KH']?<span style={{color:'var(--success)',fontWeight:600}}>{formatVND(g['Tiền thu từ KH'])}</span>:'—'}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                        background:chuaDS?'#FEF3C7':'#D1FAE5',color:chuaDS?'#92400E':'#065F46',whiteSpace:'nowrap'}}>
                        {chuaDS?'⏳ Chưa':'✅ Đã đối soát'}
                      </span>
                    </td>
                    <td>
                      {chuaDS?(
                        <button onClick={()=>moDoiSoat(g)}
                          style={{padding:'5px 10px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:600,fontSize:'12px',cursor:'pointer',whiteSpace:'nowrap'}}>
                          💰 Đối soát
                        </button>
                      ):(
                        <span style={{fontSize:'11px',color:'var(--text-muted)'}}>
                          {g['Ghi chú đối soát']||''}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal đối soát */}
      {showModal&&chuyenChon&&(
        <div className="overlay" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>💰 Đối soát chuyến giao</h2>
              <button onClick={()=>setShowModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>

            {/* Thông tin chuyến */}
            <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'12px 14px',marginBottom:'16px',fontSize:'13px'}}>
              <div style={{fontWeight:700,color:'var(--primary)',marginBottom:'6px'}}>📋 {chuyenChon['Mã đơn hàng']}</div>
              <div>👤 {tenKHChon}</div>
              <div style={{marginTop:'3px'}}>🚚 {chuyenChon['Người giao']||'—'} · {formatDateTime(chuyenChon['Ngày giao'])}</div>
              {chiPhiChuyen>0&&(
                <div style={{marginTop:'3px',color:'#DC2626'}}>💸 Chi phí: {formatVND(chiPhiChuyen)}</div>
              )}
              {don&&Number(don['Còn phải thu'])>0&&(
                <div style={{marginTop:'3px',color:'#DC2626',fontWeight:700}}>
                  📌 Còn phải thu từ KH: {formatVND(don['Còn phải thu'])}
                </div>
              )}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {/* Tiền thu từ KH */}
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>
                  💵 Tiền đã thu từ khách hàng (đ)
                </label>
                <input className="input" type="number" min="0" value={tienThu||''}
                  placeholder="0" onChange={e=>setTienThu(Number(e.target.value))}/>
                {don&&Number(don['Còn phải thu'])>0&&(
                  <button onClick={()=>setTienThu(Number(don['Còn phải thu']))}
                    style={{marginTop:'4px',padding:'3px 10px',borderRadius:'4px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'11px',color:'var(--primary)'}}>
                    Điền đúng số còn lại: {formatVND(don['Còn phải thu'])}
                  </button>
                )}
              </div>

              {/* Ghi chú đối soát */}
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Ghi chú đối soát</label>
                <textarea className="input" rows={2} placeholder="Ghi chú thêm về chuyến giao..."
                  value={ghiChuDS} onChange={e=>setGhiChuDS(e.target.value)} style={{resize:'vertical'}}/>
              </div>

              {/* Đánh dấu hoàn thành đơn */}
              <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',padding:'10px 12px',background:'#F0FDF4',borderRadius:'8px',border:'1px solid #BBF7D0'}}>
                <input type="checkbox" checked={hoanThanhDon} onChange={e=>setHoanThanhDon(e.target.checked)}
                  style={{width:'16px',height:'16px',accentColor:'#16A34A'}}/>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#15803D'}}>Đánh dấu đơn hàng "Hoàn thành"</div>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>Cập nhật trạng thái đơn hàng thành Hoàn thành</div>
                </div>
              </label>

              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuDoiSoat} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                  {loading?'⏳ Đang lưu...':'✅ Xác nhận đối soát'}
                </button>
                <button onClick={()=>setShowModal(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
