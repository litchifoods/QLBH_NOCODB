'use client'
// components/DoiSoatClient.tsx — v4.0
// Cấu trúc giống GiaoHangClient cũ: bảng chuyến đã tạo + modal đối soát

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function fVND(n: any) { return Number(n||0).toLocaleString('vi-VN')+'đ' }
function fDT(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const KET_QUA_LIST = [
  { value:'Thành công',               label:'✅ Thành công',         color:'#065F46', bg:'#D1FAE5' },
  { value:'Huỷ — khách trả CP',       label:'❌ Huỷ — khách trả CP', color:'#92400E', bg:'#FEF3C7' },
  { value:'Huỷ — cửa hàng chịu CP',   label:'❌ Huỷ — CH chịu CP',   color:'#991B1B', bg:'#FEE2E2' },
  { value:'Đổi hàng — khách trả CP',  label:'🔄 Đổi — khách trả',    color:'#1E40AF', bg:'#DBEAFE' },
  { value:'Đổi hàng — cửa hàng chịu', label:'🔄 Đổi — CH chịu',      color:'#6D28D9', bg:'#EDE9FE' },
]
const SO_DONG = 10

export default function DoiSoatClient({
  giaoHangList, doiSoatMap, donHangMap, khachHangMap,
  chiTietDonMap, filterParam, user,
}: {
  giaoHangList: any[]
  doiSoatMap: Record<string, any>
  donHangMap: Record<string, any>
  khachHangMap: Record<string, any>
  chiTietDonMap: Record<string, any[]>
  filterParam?: string
  user: UserSession
}) {
  const router = useRouter()
  const [filterTT,  setFilterTT] = useState('Chưa đối soát')
  const [trang,     setTrang]    = useState(1)
  const [modalGH,   setModalGH]  = useState<any>(null)
  const [loading,   setLoading]  = useState(false)
  const [msg,       setMsg]      = useState('')
  const [msgOk,     setMsgOk]    = useState(true)

  const [tienThuKH,    setTienThuKH]    = useState(0)
  const [hinhThucThu,  setHinhThucThu]  = useState('Tiền mặt')
  const [chiPhiVC,     setChiPhiVC]     = useState(0)
  const [chiPhiLap,    setChiPhiLap]    = useState(0)
  const [thuongChuyen, setThuongChuyen] = useState(0)
  const [ketQua,       setKetQua]       = useState('Thành công')
  const [ghiChu,       setGhiChu]       = useState('')
  const [hoanThanhDon, setHoanThanhDon] = useState(false)

  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }
  function getDiaChi(don: any) {
    if (!don) return '—'
    const maKH = don['Mã KH'] || ''
    return don['Địa chỉ giao'] || khachHangMap[maKH]?.['Địa chỉ'] || '—'
  }
  function getThongTinSP(maDon: string) {
    const ct = chiTietDonMap[maDon] || []
    const hl = ct.filter((c:any) => c['Tên SP (ghi nhanh)']||c['Mã SP'])
    if (!hl.length) return { tenSP:'—', tongSP:0, coNhieu:false }
    const tongSL = hl.reduce((s:number,c:any)=>s+Number(c['Số lượng']||1),0)
    return { tenSP:hl[0]['Tên SP (ghi nhanh)']||hl[0]['Mã SP']||'—', tongSP:tongSL, coNhieu:hl.length>1 }
  }

  const filtered = useMemo(() => {
    setTrang(1)
    if (filterTT==='Tất cả') return giaoHangList
    if (filterTT==='Chưa đối soát') return giaoHangList.filter(g=>g['Tình trạng đối soát']!=='Đã đối soát')
    return giaoHangList.filter(g=>g['Tình trạng đối soát']==='Đã đối soát')
  }, [giaoHangList, filterTT])

  const tongTrang     = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT       = Math.min(trang,tongTrang)
  const danhSachTrang = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  const chuaDS    = giaoHangList.filter(g=>g['Tình trạng đối soát']!=='Đã đối soát').length
  const tongThuKH = Object.values(doiSoatMap).reduce((s:number,ds:any)=>s+Number(ds['Đã thu được']||0),0)

  function moModal(gh: any) {
    const don = donHangMap[gh['Mã đơn hàng']]
    setModalGH(gh)
    setTienThuKH(Number(don?.['Còn phải thu']||0))
    setHinhThucThu('Tiền mặt')
    setChiPhiVC(Number(gh['Chi phí VC']||0))
    setChiPhiLap(Number(gh['Chi phí lắp đặt']||0))
    setThuongChuyen(Number(gh['Thưởng chuyến']||0))
    setKetQua('Thành công'); setGhiChu(''); setHoanThanhDon(false)
  }

  async function luuDoiSoat() {
    if (!modalGH) return
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/doi-soat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          maGiaoHang:   modalGH['Mã giao hàng'],
          maChuyen:     modalGH['Mã chuyến']||'',
          maDon:        modalGH['Mã đơn hàng'],
          maNVDoiTac:   modalGH['Mã NV/đối tác']||'',
          tenNVDoiTac:  modalGH['Tên NV/đối tác']||'',
          hinhThucGiao: modalGH['Hình thức giao']||'',
          tienThuKH, hinhThucThu, chiPhiVC, chiPhiLap, thuongChuyen, ketQua, ghiChu, hoanThanhDon,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message||'Lỗi')
      setMsg('✅ Đã lưu đối soát'); setMsgOk(true)
      setModalGH(null); router.refresh()
    } catch(err:any) {
      setMsg('❌ '+(err.message||'Lỗi')); setMsgOk(false)
    } finally {
      setLoading(false); setTimeout(()=>setMsg(''),4000)
    }
  }

  const donModal    = modalGH ? donHangMap[modalGH['Mã đơn hàng']] : null
  const laDT        = modalGH?.['Hình thức giao']==='Đối tác'
  const tongPhaiTra = (chiPhiVC||0)+(chiPhiLap||0)+(thuongChuyen||0)

  function PhanTrang() {
    if (tongTrang<=1) return null
    const pages=Array.from({length:tongTrang},(_,i)=>i+1)
    let ht:number[]
    if (tongTrang<=7) ht=pages
    else if (trangHT<=4) ht=[...pages.slice(0,5),-1,tongTrang]
    else if (trangHT>=tongTrang-3) ht=[1,-1,...pages.slice(tongTrang-5)]
    else ht=[1,-1,trangHT-1,trangHT,trangHT+1,-2,tongTrang]
    return (
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px'}}>
        <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{(trangHT-1)*SO_DONG+1}–{Math.min(trangHT*SO_DONG,filtered.length)} / {filtered.length} chuyến</span>
        <div style={{display:'flex',gap:'4px'}}>
          <BtnPage disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</BtnPage>
          {ht.map((p,i)=>p<0?<span key={`d${i}`} style={{padding:'4px 2px',color:'#9CA3AF',fontSize:'13px'}}>…</span>:<BtnPage key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</BtnPage>)}
          <BtnPage disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</BtnPage>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .ds-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .ds-t th,.ds-t td{padding:8px 10px;}
        .ds-t tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .modal-ds{background:white;border-radius:12px;padding:24px;width:100%;max-width:500px;max-height:93vh;overflow-y:auto;}
        .kq-btn{padding:8px 12px;border-radius:8px;border:2px solid;cursor:pointer;font-size:12px;font-weight:600;text-align:center;}
        .btn-doi-soat{position:relative;display:inline-block;}
        .btn-doi-soat:hover::after{content:'Đối soát';position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:#1F2937;color:white;font-size:11px;padding:3px 8px;border-radius:4px;white-space:nowrap;pointer-events:none;z-index:10;}
        .btn-doi-soat:hover::before{content:'';position:absolute;bottom:calc(100% + 1px);left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:#1F2937;pointer-events:none;}
        @media(max-width:1100px){.col-sp{display:none;}}
        @media(max-width:900px){.col-dia{display:none;}}
        @media(max-width:700px){.col-nguoi,.col-vt{display:none;}}
      `}</style>

      <div className="ds-hdr">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>💰 Đối soát giao hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {giaoHangList.length} chuyến
            {chuaDS>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {chuaDS} chưa đối soát</span>}
          </p>
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'10px',marginBottom:'14px'}}>
        {[
          {icon:'🚚',label:'Tổng chuyến',val:giaoHangList.length,c:'var(--primary)'},
          {icon:'⏳',label:'Chưa đối soát',val:chuaDS,c:'#DC2626'},
          {icon:'✅',label:'Đã đối soát',val:giaoHangList.length-chuaDS,c:'#065F46'},
          {icon:'💵',label:'Đã thu từ KH',val:fVND(tongThuKH),c:'#065F46'},
        ].map(({icon,label,val,c})=>(
          <div key={label} className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
            <div style={{fontSize:'15px',fontWeight:800,color:c}}>{val}</div>
            <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          {['Chưa đối soát','Tất cả','Đã đối soát'].map(tt=>(
            <button key={tt} onClick={()=>setFilterTT(tt)} style={{
              padding:'5px 14px',borderRadius:'20px',border:'1px solid',
              borderColor:filterTT===tt?'var(--primary)':'var(--border)',
              background:filterTT===tt?'var(--primary-pale)':'white',
              color:filterTT===tt?'var(--primary)':'var(--text-secondary)',
              fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer',
            }}>{tt}</button>
          ))}
          <span style={{marginLeft:'auto',fontSize:'12px',color:'var(--text-secondary)'}}>{filtered.length} chuyến</span>
        </div>
      </div>

      {/* Bảng chuyến */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="ds-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày giao</th>
                <th style={{textAlign:'left',fontWeight:700}}>Khách hàng</th>
                <th className="col-dia" style={{textAlign:'left',fontWeight:700}}>Địa chỉ</th>
                <th className="col-sp" style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                <th className="col-nguoi" style={{textAlign:'left',fontWeight:700}}>Người giao</th>
                <th className="col-vt" style={{textAlign:'left',fontWeight:700}}>Vai trò</th>
                <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                <th style={{textAlign:'center',fontWeight:700}}>Đối soát</th>
                <th style={{width:'52px'}}></th>
              </tr>
            </thead>
            <tbody>
              {danhSachTrang.length===0?(
                <tr><td colSpan={10} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có chuyến nào</td></tr>
              ):danhSachTrang.map((g:any,i:number)=>{
                const maDon  = g['Mã đơn hàng']||''
                const don    = donHangMap[maDon]
                const maKH   = don?.['Mã KH']||''
                const tenKH  = getTenKH(maKH,don?.['Tên khách hàng'])
                const sdt    = khachHangMap[maKH]?.['Số điện thoại']||''
                const diaChi = getDiaChi(don)
                const {tenSP,tongSP,coNhieu} = getThongTinSP(maDon)
                const chuaDsRow = g['Tình trạng đối soát']!=='Đã đối soát'
                const laDTRow   = g['Hình thức giao']==='Đối tác'
                const ds        = doiSoatMap[g['Mã giao hàng']]
                const kqDs      = ds ? KET_QUA_LIST.find(k=>k.value===ds['Kết quả']) : null
                return (
                  <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td>
                      <Link href={`/dashboard/don-hang/${maDon}`} style={{color:'var(--primary)',fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>{maDon}</Link>
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDT(g['Ngày giao'])}</td>
                    <td>
                      <div style={{fontWeight:600}}>{tenKH}</div>
                      {sdt&&<div style={{fontSize:'11px',color:'var(--text-muted)'}}>📞 {sdt}</div>}
                    </td>
                    <td className="col-dia" style={{fontSize:'12px',color:'var(--text-secondary)',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{diaChi}</td>
                    <td className="col-sp" style={{maxWidth:'150px'}}>
                      <div style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={tenSP}>{tenSP}</div>
                      {coNhieu&&<div style={{fontSize:'11px',color:'#6B7280'}}>tổng {tongSP} SP</div>}
                    </td>
                    <td className="col-nguoi">
                      <div style={{fontWeight:600}}>{g['Tên NV/đối tác']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{g['Mã NV/đối tác']||''}</div>
                      {laDTRow&&<span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'10px',background:'#FEF3C7',color:'#92400E',fontWeight:700}}>Đối tác</span>}
                    </td>
                    <td className="col-vt" style={{fontSize:'12px',color:'var(--text-secondary)'}}>{g['Vai trò chuyến']||'—'}</td>
                    {/* Cột TRẠNG THÁI: Đang giao / Giao nhưng hủy */}
                    <td style={{textAlign:'center'}}>
                      {don?.['Trạng thái']==='Huỷ' ? (
                        <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#FEE2E2',color:'#991B1B',whiteSpace:'nowrap'}}>🚫 Giao nhưng hủy</span>
                      ) : (
                        <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#DBEAFE',color:'#1E40AF',whiteSpace:'nowrap'}}>🚚 Đang giao</span>
                      )}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                        background:chuaDsRow?'#FEF3C7':'#D1FAE5',
                        color:chuaDsRow?'#92400E':kqDs?.color||'#065F46',whiteSpace:'nowrap'}}>
                        {chuaDsRow?'⏳ Chưa':kqDs?.label||'✅ Đã xong'}
                      </span>
                    </td>
                    <td style={{textAlign:'center'}}>
                      {chuaDsRow?(
                        <span className="btn-doi-soat">
                          <button onClick={()=>moModal(g)} title="Đối soát"
                            style={{padding:'5px 10px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
                            💰
                          </button>
                        </span>
                      ):(
                        <span style={{fontSize:'11px',color:'var(--text-muted)'}}>{ds?.['Ghi chú']||''}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <PhanTrang/>
      </div>

      {/* Modal đối soát */}
      {modalGH&&(
        <div className="overlay" onClick={()=>setModalGH(null)}>
          <div className="modal-ds" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>💰 Đối soát chuyến giao</h2>
              <button onClick={()=>setModalGH(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'13px'}}>
              <div style={{fontWeight:700,color:'var(--primary)',marginBottom:'3px'}}>
                {modalGH['Tên NV/đối tác']||'—'}
                <span style={{marginLeft:'8px',fontSize:'11px',padding:'2px 8px',borderRadius:'10px',background:laDT?'#FEF3C7':'#DBEAFE',color:laDT?'#92400E':'#1E40AF'}}>{laDT?'Đối tác':'NV cửa hàng'}</span>
              </div>
              <div style={{fontSize:'12px',color:'#555'}}>📋 {modalGH['Mã đơn hàng']} · {modalGH['Vai trò chuyến']||'—'} · {fDT(modalGH['Ngày giao'])}</div>
              {Number(donModal?.['Còn phải thu']||0)>0&&<div style={{color:'#DC2626',fontWeight:600,fontSize:'12px',marginTop:'3px'}}>📌 KH còn nợ: {fVND(donModal?.['Còn phải thu'])}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:700,display:'block',marginBottom:'8px'}}>📌 Kết quả chuyến giao</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                  {KET_QUA_LIST.map(kq=>(
                    <button key={kq.value} onClick={()=>setKetQua(kq.value)} className="kq-btn"
                      style={{borderColor:ketQua===kq.value?kq.color:'#E5E7EB',background:ketQua===kq.value?kq.bg:'white',color:ketQua===kq.value?kq.color:'#6B7280'}}>
                      {kq.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'12px 14px',border:'1px solid #BBF7D0'}}>
                <div style={{fontWeight:700,fontSize:'13px',marginBottom:'8px',color:'#15803D'}}>💵 Tiền thu từ khách hàng</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Số tiền thu (đ)</label>
                    <input className="input" type="number" min="0" value={tienThuKH||''} placeholder="0" onChange={e=>setTienThuKH(Number(e.target.value))}/>
                    {Number(donModal?.['Còn phải thu']||0)>0&&(
                      <button onClick={()=>setTienThuKH(Number(donModal?.['Còn phải thu']||0))} style={{marginTop:'3px',padding:'2px 8px',border:'1px solid #BBF7D0',borderRadius:'4px',background:'white',cursor:'pointer',fontSize:'11px',color:'#15803D'}}>
                        Điền đủ: {fVND(donModal?.['Còn phải thu'])}
                      </button>
                    )}
                  </div>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Hình thức thu</label>
                    <select className="input" value={hinhThucThu} onChange={e=>setHinhThucThu(e.target.value)}>
                      <option>Tiền mặt</option><option>Chuyển khoản</option>
                      <option>Tiền mặt+chuyển khoản</option><option>KH nợ — chưa thu</option>
                    </select>
                  </div>
                </div>
              </div>
              <div style={{background:laDT?'#FFF7ED':'#F0F9FF',borderRadius:'8px',padding:'12px 14px',border:`1px solid ${laDT?'#FED7AA':'#BAE6FD'}`}}>
                <div style={{fontWeight:700,fontSize:'13px',marginBottom:'6px',color:laDT?'#C2410C':'#0369A1'}}>{laDT?'💸 Chi phí trả đối tác':'🎁 Thưởng nhân viên'}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                  {[['CP vận chuyển',chiPhiVC,setChiPhiVC],['CP lắp đặt',chiPhiLap,setChiPhiLap],['Thưởng chuyến',thuongChuyen,setThuongChuyen]].map(([lb,val,setter]:any)=>(
                    <div key={lb}>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb} (đ)</label>
                      <input className="input" type="number" min="0" value={val||''} placeholder="0" onChange={e=>setter(Number(e.target.value))} style={{fontSize:'12px'}}/>
                    </div>
                  ))}
                </div>
                {tongPhaiTra>0&&<div style={{marginTop:'6px',fontSize:'12px',fontWeight:700,color:laDT?'#DC2626':'#0369A1'}}>Tổng: {fVND(tongPhaiTra)}</div>}
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                <input className="input" placeholder="Ghi chú thêm..." value={ghiChu} onChange={e=>setGhiChu(e.target.value)}/>
              </div>
              <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',padding:'10px 12px',background:'#F0FDF4',borderRadius:'8px',border:'1px solid #BBF7D0'}}>
                <input type="checkbox" checked={hoanThanhDon} onChange={e=>setHoanThanhDon(e.target.checked)} style={{width:'16px',height:'16px',accentColor:'#16A34A'}}/>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#15803D'}}>Đánh dấu đơn hàng "Hoàn thành"</div>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>Chỉ tick khi đã giao đủ toàn bộ SP</div>
                </div>
              </label>
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={luuDoiSoat} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                  {loading?'⏳ Đang lưu...':'✅ Xác nhận đối soát'}
                </button>
                <button onClick={()=>setModalGH(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BtnPage({children,active,disabled,onClick}:any) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding:'4px 10px',borderRadius:'5px',border:'1px solid',
      borderColor:active?'var(--primary)':'var(--border)',
      background:active?'var(--primary)':disabled?'#F9FAFB':'white',
      color:active?'white':disabled?'#CCC':'var(--text-secondary)',
      cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:active?700:400,minWidth:'32px',
    }}>{children}</button>
  )
}
