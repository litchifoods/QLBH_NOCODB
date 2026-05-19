'use client'
// components/GiaoHangClient.tsx
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function formatVND(n: number | string) { return Number(n||0).toLocaleString('vi-VN')+'đ' }
function formatDateTime(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function boDau(str: string) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

interface KhMap { ten: string; sdt: string; diaChi: string }

export default function GiaoHangClient({
  giaoHang, donChuaGiao, donTatCa, nhanVien, khachHangMap, user,
}: {
  giaoHang: any[]
  donChuaGiao: any[]
  donTatCa: any[]
  nhanVien: any[]
  khachHangMap: Record<string, KhMap>
  user: UserSession
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok'|'err'>('ok')
  const [filterTT, setFilterTT] = useState('Tất cả')

  // Form state
  const [searchDon,   setSearchDon]   = useState('')
  const [donDaChon,   setDonDaChon]   = useState<any>(null)
  const [showDon,     setShowDon]     = useState(false)
  const [searchNguoi, setSearchNguoi] = useState('')
  const [showNguoi,   setShowNguoi]   = useState(false)
  const [ngayGiao,    setNgayGiao]    = useState(new Date().toISOString().slice(0,16))
  const [chiPhiVC,    setChiPhiVC]    = useState(0)
  const [chiPhiLap,   setChiPhiLap]   = useState(0)
  const [ghiChu,      setGhiChu]      = useState('')

  // Helpers
  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.ten || tenTuDon || maKH || '—'
  }
  function getDiaChiGiao(don: any) {
    return don['Địa chỉ giao'] || khachHangMap[don['Mã KH']]?.diaChi || '—'
  }

  // Lọc bỏ dòng rỗng
  const giaoHopLe = useMemo(() =>
    giaoHang.filter(g => g['Mã đơn hàng']?.toString().trim())
  , [giaoHang])

  const filtered = useMemo(() => {
    if (filterTT === 'Tất cả') return giaoHopLe
    const chuaDS = filterTT === 'Chưa đối soát'
    return giaoHopLe.filter(g =>
      chuaDS
        ? g['Tình trạng đối soát'] !== 'Đã đối soát'
        : g['Tình trạng đối soát'] === 'Đã đối soát'
    )
  }, [giaoHopLe, filterTT])

  const chuaDoiSoat = giaoHopLe.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát').length

  // Lọc đơn hàng
  const donLoc = useMemo(() => {
    if (!searchDon.trim()) return donChuaGiao.slice(0, 10)
    const q = boDau(searchDon)
    return donChuaGiao.filter(d =>
      boDau(d['Mã đơn hàng']||'').includes(q) ||
      boDau(d['Mã KH']||'').includes(q) ||
      boDau(khachHangMap[d['Mã KH']]?.ten||'').includes(q) ||
      boDau(d['Tên khách hàng']||'').includes(q)
    ).slice(0, 10)
  }, [searchDon, donChuaGiao, khachHangMap])

  // Lọc người giao
  const nguoiLoc = useMemo(() => {
    if (!searchNguoi.trim()) return nhanVien.slice(0, 10)
    const q = boDau(searchNguoi)
    return nhanVien.filter((nv:any) =>
      boDau(nv['Họ tên']||'').includes(q) || boDau(nv['Mã NV']||'').includes(q)
    ).slice(0, 10)
  }, [searchNguoi, nhanVien])

  function chonDon(don: any) {
    setDonDaChon(don); setSearchDon(don['Mã đơn hàng']); setShowDon(false)
  }
  function chonNguoi(nv: any) {
    setSearchNguoi(nv['Họ tên']); setShowNguoi(false)
  }
  function resetForm() {
    setSearchDon(''); setDonDaChon(null); setSearchNguoi('')
    setNgayGiao(new Date().toISOString().slice(0,16))
    setChiPhiVC(0); setChiPhiLap(0); setGhiChu('')
  }

  async function luuGiaoHang() {
    if (!donDaChon) { setMsg('Vui lòng chọn đơn hàng'); setMsgType('err'); return }
    if (!searchNguoi.trim()) { setMsg('Vui lòng nhập người giao'); setMsgType('err'); return }
    setLoading(true); setMsg('')
    try {
      const maGiao = `GH-${donDaChon['Mã đơn hàng']}-${Date.now().toString().slice(-4)}`
      const res = await fetch('/api/giao-hang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'Mã giao hàng':        maGiao,
          'Mã đơn hàng':         donDaChon['Mã đơn hàng'],
          'Người giao':          searchNguoi,
          'Ngày giao':           ngayGiao,
          'Chi phí vận chuyển':  chiPhiVC,
          'Chi phí lắp đặt':     chiPhiLap,
          'Ghi chú':             ghiChu,
          'Tình trạng đối soát': 'Chưa đối soát',
        }),
      })
      if (!res.ok) throw new Error('Lỗi tạo chuyến giao')
      setMsg(`✅ Đã tạo chuyến giao cho ${donDaChon['Mã đơn hàng']}`)
      setMsgType('ok'); resetForm(); setShowForm(false); router.refresh()
    } catch (err: any) {
      setMsg('❌ '+(err.message||'Lỗi')); setMsgType('err')
    } finally {
      setLoading(false); setTimeout(()=>setMsg(''),4000)
    }
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .gh-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-gh{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
        .btn-gh:hover{opacity:.9;}
        .gh-table th,.gh-table td{padding:8px 10px;}
        .gh-table tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .modal{background:white;border-radius:12px;padding:24px;width:100%;max-width:500px;max-height:90vh;overflow-y:auto;}
        .drop-item{padding:9px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .drop-item:hover{background:#F0F9FF;}
        .drop-item:last-child{border-bottom:none;}
        .drop-box{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:220px;overflow-y:auto;}
        @media(max-width:900px){.col-dia,.col-cp{display:none;}}
        @media(max-width:650px){.col-nguoi{display:none;}}
      `}</style>

      {/* Header */}
      <div className="gh-header">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🚚 Giao hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {giaoHopLe.length} chuyến
            {chuaDoiSoat>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {chuaDoiSoat} chuyến chưa đối soát</span>}
          </p>
        </div>
        <button className="btn-gh" onClick={()=>setShowForm(true)}>🚚 Tạo chuyến giao</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgType==='ok'?'#D1FAE5':'#FEE2E2',color:msgType==='ok'?'#065F46':'#991B1B'}}>{msg}</div>}

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
          <span style={{fontSize:'12px',color:'var(--text-secondary)',marginLeft:'auto'}}>{filtered.length} chuyến</span>
        </div>
      </div>

      {/* Bảng */}
      <div className="card">
        <div style={{overflowX:'auto'}}>
          <table className="gh-table" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày giao</th>
                <th style={{textAlign:'left',fontWeight:700}}>Tên khách hàng</th>
                <th className="col-dia" style={{textAlign:'left',fontWeight:700}}>Địa chỉ giao</th>
                <th className="col-nguoi" style={{textAlign:'left',fontWeight:700}}>Người giao</th>
                <th className="col-cp" style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>CP vận chuyển</th>
                <th className="col-cp" style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>CP lắp đặt</th>
                <th style={{textAlign:'center',fontWeight:700}}>Đối soát</th>
                <th style={{width:'48px'}}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length===0?(
                <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Chưa có chuyến giao nào</td></tr>
              ):filtered.map((g:any,i:number)=>{
                const maKH   = g['Mã KH']||''
                const tenKH  = getTenKH(maKH, g['Tên khách hàng'])
                const diaChi = g['Địa chỉ giao']||khachHangMap[maKH]?.diaChi||'—'
                const chuaDS = g['Tình trạng đối soát']!=='Đã đối soát'
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
                    <td className="col-dia" style={{fontSize:'12px',color:'var(--text-secondary)',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{diaChi}</td>
                    <td className="col-nguoi" style={{fontWeight:600}}>{g['Người giao']||'—'}</td>
                    <td className="col-cp" style={{textAlign:'right',color:'var(--text-secondary)'}}>{g['Chi phí vận chuyển']?formatVND(g['Chi phí vận chuyển']):'—'}</td>
                    <td className="col-cp" style={{textAlign:'right',color:'var(--text-secondary)'}}>{g['Chi phí lắp đặt']?formatVND(g['Chi phí lắp đặt']):'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:chuaDS?'#FEF3C7':'#D1FAE5',color:chuaDS?'#92400E':'#065F46',whiteSpace:'nowrap'}}>
                        {chuaDS?'⏳ Chưa':'✅ Đã đối soát'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/dashboard/doi-soat?maDon=${g['Mã đơn hàng']}`}
                        className="btn btn-ghost btn-sm" style={{padding:'4px 8px',fontSize:'14px'}}>💰</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal tạo chuyến giao */}
      {showForm&&(
        <div className="overlay" onClick={()=>{setShowForm(false);resetForm()}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>🚚 Tạo chuyến giao hàng</h2>
              <button onClick={()=>{setShowForm(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>

              {/* Chọn đơn — dropdown */}
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Đơn hàng *</label>
                <div style={{position:'relative'}}>
                  <input className="input" placeholder="Gõ mã đơn hoặc tên khách hàng..."
                    value={searchDon}
                    onChange={e=>{setSearchDon(e.target.value);setDonDaChon(null);setShowDon(true)}}
                    onFocus={()=>setShowDon(true)}
                    onBlur={()=>setTimeout(()=>setShowDon(false),200)}/>
                  {showDon&&(
                    <div className="drop-box">
                      {donLoc.length===0
                        ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>Không tìm thấy đơn nào cần giao</div>
                        :donLoc.map((don:any)=>{
                          const tenKH=getTenKH(don['Mã KH'],don['Tên khách hàng'])
                          const conLai=Number(don['Còn phải thu']||0)
                          return(
                            <div key={don['Mã đơn hàng']} className="drop-item" onClick={()=>chonDon(don)}>
                              <div style={{fontWeight:700,color:'var(--primary)'}}>{don['Mã đơn hàng']}</div>
                              <div style={{fontSize:'12px'}}>{tenKH}</div>
                              <div style={{fontSize:'11px',color:conLai>0?'#DC2626':'#6B7280'}}>
                                Còn thu: {formatVND(conLai)} · {don['Trạng thái']||'—'}
                              </div>
                            </div>
                          )
                        })
                      }
                    </div>
                  )}
                </div>
                {donDaChon&&(
                  <div style={{marginTop:'8px',background:'var(--primary-pale)',borderRadius:'6px',padding:'10px 12px',fontSize:'12px'}}>
                    <div style={{fontWeight:700,color:'var(--primary)',marginBottom:'3px'}}>✅ {donDaChon['Mã đơn hàng']}</div>
                    <div>👤 {getTenKH(donDaChon['Mã KH'],donDaChon['Tên khách hàng'])}</div>
                    <div>📍 {getDiaChiGiao(donDaChon)}</div>
                    <div style={{color:'#DC2626',fontWeight:600,marginTop:'2px'}}>Còn thu: {formatVND(Number(donDaChon['Còn phải thu']||0))}</div>
                  </div>
                )}
              </div>

              {/* Người giao — dropdown */}
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Người giao *</label>
                <div style={{position:'relative'}}>
                  <input className="input" placeholder="Gõ tên người giao hoặc chọn từ danh sách..."
                    value={searchNguoi}
                    onChange={e=>{setSearchNguoi(e.target.value);setShowNguoi(true)}}
                    onFocus={()=>setShowNguoi(true)}
                    onBlur={()=>setTimeout(()=>setShowNguoi(false),200)}/>
                  {showNguoi&&(
                    <div className="drop-box">
                      {searchNguoi&&!nhanVien.find((nv:any)=>nv['Họ tên']===searchNguoi)&&(
                        <div className="drop-item" onClick={()=>setShowNguoi(false)}
                          style={{background:'#FEF9C3',color:'#92400E',fontSize:'12px'}}>
                          ✏️ Dùng tên: <strong>"{searchNguoi}"</strong>
                        </div>
                      )}
                      {nguoiLoc.map((nv:any)=>(
                        <div key={nv['Mã NV']} className="drop-item" onClick={()=>chonNguoi(nv)}>
                          <div style={{fontWeight:600}}>{nv['Họ tên']}</div>
                          <div style={{fontSize:'11px',color:'#6B7280'}}>{nv['Mã NV']} · {nv['Vai trò']||'Nhân viên'}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ngày giờ */}
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Ngày giờ giao</label>
                <input className="input" type="datetime-local" value={ngayGiao} onChange={e=>setNgayGiao(e.target.value)}/>
              </div>

              {/* Chi phí */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>CP vận chuyển (đ)</label>
                  <input className="input" type="number" min="0" value={chiPhiVC||''} placeholder="0" onChange={e=>setChiPhiVC(Number(e.target.value))}/>
                </div>
                <div>
                  <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>CP lắp đặt (đ)</label>
                  <input className="input" type="number" min="0" value={chiPhiLap||''} placeholder="0" onChange={e=>setChiPhiLap(Number(e.target.value))}/>
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Ghi chú</label>
                <textarea className="input" rows={2} placeholder="Ghi chú thêm..." value={ghiChu}
                  onChange={e=>setGhiChu(e.target.value)} style={{resize:'vertical'}}/>
              </div>

              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuGiaoHang} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                  {loading?'⏳ Đang lưu...':'✅ Xác nhận giao hàng'}
                </button>
                <button onClick={()=>{setShowForm(false);resetForm()}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
