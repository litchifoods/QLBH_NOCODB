'use client'
// components/DoiSoatClient.tsx — v4.2
// Thêm checkbox "Đã nộp tiền thu hộ" cho cả NV lẫn ĐT
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function fVND(n: any) { return Number(n||0).toLocaleString('vi-VN') }
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
  chiTietDonMap, chiTietGiaoMap, filterParam, user,
}: {
  giaoHangList: any[]
  doiSoatMap: Record<string, any>
  donHangMap: Record<string, any>
  khachHangMap: Record<string, any>
  chiTietDonMap: Record<string, any[]>
  chiTietGiaoMap: Record<string, any[]>
  filterParam?: string
  user: UserSession
}) {
  const router = useRouter()
  const [filterTT,  setFilterTT] = useState('Tất cả')
  const [tuNgay, setTuNgay] = useState('')
  const [denNgay, setDenNgay] = useState('')
  useEffect(()=>{const n=new Date();const y=n.getFullYear();const m=String(n.getMonth()+1).padStart(2,'0');setTuNgay(y+'-'+m+'-01');setDenNgay(n.toISOString().split('T')[0])},[])
  const [trang,     setTrang]    = useState(1)
  const [modalGH,   setModalGH]  = useState<any>(null)
  const [loading,   setLoading]  = useState(false)
  const [confirmMode, setConfirmMode] = useState<'thu'|'doi-soat'|null>(null)
  const [msg,       setMsg]      = useState('')
  const [msgOk,     setMsgOk]    = useState(true)
  const [msgModal,  setMsgModal] = useState('')
  const [msgModalOk,setMsgModalOk]=useState(true)

  const [tienMat,        setTienMat]        = useState(0)
  const [chuyenKhoan,    setChuyenKhoan]    = useState(0)
  const [chiPhiVC,       setChiPhiVC]       = useState(0)
  const [chiPhiLap,      setChiPhiLap]      = useState(0)
  const [thuongChuyen,   setThuongChuyen]   = useState(0)
  const [ketQua,         setKetQua]         = useState('Thành công')
  const [ghiChu,         setGhiChu]         = useState('')
  const [ngayDoiSoat,    setNgayDoiSoat]    = useState(new Date().toISOString().split('T')[0])
  const [thanhToanNgay,  setThanhToanNgay]  = useState(false)
  const [hinhThucTTDT,   setHinhThucTTDT]   = useState('Tiền mặt')
  const [hinhThucChi,    setHinhThucChi]    = useState('Tiền mặt')
  const [hoanThanhDon,   setHoanThanhDon]   = useState(false)
  const [daNopTienThuHo, setDaNopTienThuHo] = useState(false) // ← MỚI
  const [chiTietGH,      setChiTietGH]      = useState<any>(null)
  const [hoanVeGH,       setHoanVeGH]       = useState<any>(null)
  const [loadingHoan,    setLoadingHoan]    = useState(false)

  const tienThuKH = (tienMat||0) + (chuyenKhoan||0)
  const hinhThucThu = (tienMat>0 && chuyenKhoan>0) ? 'Tiền mặt+chuyển khoản' : (tienMat>0) ? 'Tiền mặt' : (chuyenKhoan>0) ? 'Chuyển khoản' : 'KH nợ - chưa thu'

  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }
  function getDiaChi(don: any) {
    if (!don) return '—'
    const maKH = don['Mã KH'] || ''
    return don['Địa chỉ giao'] || khachHangMap[maKH]?.['Địa chỉ'] || '—'
  }
  function getThongTinSP(maDon: string, maGH?: string, ghList?: any[]) {
    const ct = chiTietDonMap[maDon] || []
    const hl = ct.filter((c:any) => (c['Tên SP (ghi nhanh)']||c['Mã SP']) && c['Trạng thái SP'] !== 'Huỷ')
    if (!hl.length) return { tenSP:'—', tongSPDon:0, slGiaoLanNay:0, daGiaoHet:false }
    const tongSPDon = hl.reduce((s:number,c:any)=>s+Number(c['Số lượng']||1),0)
    const spGiaoLanNay = maGH ? (chiTietGiaoMap[maGH]||[]) : []
    const slGiaoLanNay = spGiaoLanNay.reduce((s:number,c:any)=>s+Number(c['Số lượng giao đợt này']||0),0)
    const tenSP = hl[0]['Tên SP (ghi nhanh)']||hl[0]['Mã SP']||'—'
    const tatCaSpGiao = Object.values(chiTietGiaoMap).flat()
      .filter((c:any) => c['Mã đơn hàng'] === maDon)
      .reduce((s:number,c:any)=>s+Number(c['Số lượng giao đợt này']||0),0)
    const daSoatRoi = maGH ? (ghList||giaoHangList).some((g:any) =>
      g['Mã giao hàng'] === maGH && g['Tình trạng đối soát'] === 'Đã đối soát'
    ) : false
    const daGiaoHet = tongSPDon > 0 && (tatCaSpGiao >= tongSPDon || (daSoatRoi && slGiaoLanNay === 0))
    return { tenSP, tongSPDon, slGiaoLanNay, daGiaoHet }
  }

  const filtered = useMemo(() => {
    setTrang(1)
    let r = giaoHangList.filter(g=>{
      if(!tuNgay||!denNgay) return true
      const raw=(g['Ngày giao']||g['Ngày tạo']||'').split(' ')[0]
      if(!raw) return true
      const pts=raw.split('-')
      const ngay=pts.length===3&&pts[0].length===2?pts[2]+'-'+pts[1]+'-'+pts[0]:raw.split('T')[0]
      return ngay>=tuNgay && ngay<=denNgay
    })
    if (filterTT==='Chưa đối soát') return r.filter(g=>g['Tình trạng đối soát']!=='Đã đối soát')
    if (filterTT==='Đã đối soát') return r.filter(g=>g['Tình trạng đối soát']==='Đã đối soát')
    return r
  }, [giaoHangList, filterTT, tuNgay, denNgay])

  const tongTrang     = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT       = Math.min(trang,tongTrang)
  const danhSachTrang = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)
  const chuaDS    = filtered.filter(g=>g['Tình trạng đối soát']!=='Đã đối soát').length
  const tongThuKH = filtered.reduce((s,g)=>{const ds=doiSoatMap[g['Mã giao hàng']||''];return s+Number(ds?.['Đã thu được']||0)},0)
  const conNo     = filtered.reduce((s,g)=>{const don=donHangMap[g['Mã đơn hàng']||''];return s+Math.max(0,Number(don?.['Còn phải thu']||0))},0)
  const tongCPGiao= filtered.reduce((s,g)=>{const ds=doiSoatMap[g['Mã giao hàng']||''];return s+Number(ds?.['Chi phí VC']||0)+Number(ds?.['Chi phí lắp đặt']||0)+Number(ds?.['Thưởng chuyến']||0)},0)

  function moModal(gh: any) {
    setModalGH(gh)
    setTienMat(0); setChuyenKhoan(0)
    setChiPhiVC(Number(gh['Chi phí VC']||0))
    setChiPhiLap(Number(gh['Chi phí lắp đặt']||0))
    setThuongChuyen(Number(gh['Thưởng chuyến']||0))
    setKetQua('Thành công'); setGhiChu(''); setHoanThanhDon(false)
    setNgayDoiSoat(new Date().toISOString().split('T')[0])
    setThanhToanNgay(false)
    setHinhThucChi('Tiền mặt'); setHinhThucTTDT('Tiền mặt')
    setDaNopTienThuHo(false) // reset
  }

  async function luuDaThu() {
    if (!modalGH) return
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/doi-soat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          loai: 'da-thu',
          maGiaoHang: modalGH['Mã giao hàng'],
          maDon:       modalGH['Mã đơn hàng'],
          tienThuKH, hinhThucThu,
          ngayDoiSoat,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message||'Lỗi')
      setMsg('✅ Đã ghi nhận thu tiền'); setMsgOk(true)
      setModalGH(null); setConfirmMode(null); window.location.reload()
    } catch(err:any) {
      setMsgModal('❌ '+(err.message||'Lỗi')); setMsgModalOk(false)
    } finally {
      setLoading(false); setConfirmMode(null)
    }
  }

  async function luuDoiSoat() {
    if (!modalGH) return
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/doi-soat', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          maGiaoHang:    modalGH['Mã giao hàng'],
          maChuyen:      modalGH['Mã chuyến']||'',
          maDon:         modalGH['Mã đơn hàng'],
          maNVDoiTac:    modalGH['Mã NV/đối tác']||'',
          tenNVDoiTac:   modalGH['Tên NV/đối tác']||'',
          hinhThucGiao:  modalGH['Hình thức giao']||'',
          tienThuKH, hinhThucThu, chiPhiVC, chiPhiLap, thuongChuyen, ketQua, ghiChu,
          ngayDoiSoat, thanhToanNgay, hinhThucTTDT,
          // ── MỚI: nộp tiền thu hộ ──
          tinhTrangNopTien: tienThuKH > 0 ? (daNopTienThuHo ? 'Đã nộp' : 'Chưa nộp') : null,
          ngayNopTien:      tienThuKH > 0 && daNopTienThuHo ? ngayDoiSoat : null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message||'Lỗi')
      setMsg('✅ Đã lưu đối soát'); setMsgOk(true)
      setModalGH(null); router.refresh()
    } catch(err:any) {
      setMsgModal('❌ '+(err.message||'Lỗi')); setMsgModalOk(false); setTimeout(()=>setMsgModal(''),5000)
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
      <style suppressHydrationWarning>{`
        .ds-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .ds-t th,.ds-t td{padding:8px 10px;}
        .ds-t tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .modal-ds{background:white;border-radius:12px;padding:24px;width:100%;max-width:720px;max-height:95vh;overflow-y:auto;}
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

      {/* Bộ lọc ngày */}
      <div className="card" style={{padding:'10px 14px',marginBottom:'12px'}}>
        <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:'12px',fontWeight:600,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>📅 Từ ngày:</span>
          <input type="date" value={tuNgay} onChange={e=>setTuNgay(e.target.value)}
            style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px',cursor:'pointer'}}/>
          <span style={{fontSize:'12px',fontWeight:600,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>đến ngày:</span>
          <input type="date" value={denNgay} onChange={e=>setDenNgay(e.target.value)}
            style={{padding:'5px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px',cursor:'pointer'}}/>
          <button onClick={()=>{
            const n=new Date()
            setTuNgay(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`)
            setDenNgay(n.toISOString().split('T')[0])
          }} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer',color:'var(--text-secondary)'}}>
            📅 Tháng hiện tại
          </button>
        </div>
      </div>

      {/* Tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'10px',marginBottom:'14px'}}>
        {[
          {icon:'🚚',label:'Tổng chuyến',val:filtered.length,c:'var(--primary)'},
          {icon:'⏳',label:'Chưa đối soát',val:chuaDS,c:'#DC2626'},
          {icon:'✅',label:'Đã đối soát',val:filtered.length-chuaDS,c:'#065F46'},
          {icon:'💵',label:'Đã thu từ KH',val:fVND(tongThuKH)+'đ',c:'#065F46'},
          {icon:'⚠️',label:'KH còn nợ',val:fVND(conNo)+'đ',c:'#B45309'},
          {icon:'🚛',label:'CP giao hàng',val:fVND(tongCPGiao)+'đ',c:'#1E40AF'},
        ].map(({icon,label,val,c})=>(
          <div key={label} className="card" style={{padding:'10px 12px'}}>
            <div style={{fontSize:'16px',marginBottom:'2px'}}>{icon}</div>
            <div style={{fontSize:'14px',fontWeight:800,color:c,whiteSpace:'nowrap'}}>{val}</div>
            <div style={{fontSize:'10px',color:'var(--text-secondary)'}}>{label}</div>
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
                <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                <th style={{textAlign:'center',fontWeight:700}}>Đối soát</th>
                <th style={{width:'44px'}}></th>
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
                const chuaDsRow = g['Tình trạng đối soát']!=='Đã đối soát'
                const laDTRow   = g['Hình thức giao']==='Đối tác'
                const ds        = doiSoatMap[g['Mã giao hàng']]
                const kqDs      = ds ? KET_QUA_LIST.find(k=>k.value===ds['Kết quả']) : null
                return (
                  <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td>
                      <Link href={`/dashboard/don-hang/${maDon}`} style={{color:'var(--primary)',fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>{maDon}</Link>
                      {ds?.['Ngày đối soát']&&<div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>📅 {new Date(ds['Ngày đối soát']).toLocaleDateString('vi-VN')}</div>}
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDT(g['Ngày giao'])}</td>
                    <td>
                      <div style={{fontWeight:600}}>{tenKH}</div>
                      {sdt&&<div style={{fontSize:'11px',color:'var(--text-muted)'}}>📞 {sdt}</div>}
                    </td>
                    <td className="col-dia" style={{fontSize:'12px',color:'var(--text-secondary)',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{diaChi}</td>
                    <td className="col-sp" style={{maxWidth:'150px'}}>
                      {(()=>{
                        const {tenSP:tsp,tongSPDon,slGiaoLanNay,daGiaoHet} = getThongTinSP(maDon, g['Mã giao hàng'])
                        return <>
                          <div style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={tsp}>{tsp}</div>
                          {tongSPDon>0&&(
                            <div style={{fontSize:'11px',fontWeight:600,marginTop:'2px',color:daGiaoHet?'#065F46':'#0369A1'}}>
                              {daGiaoHet?`✅ Đã giao hết ${tongSPDon}/${tongSPDon} SP`:slGiaoLanNay>0?`Giao ${slGiaoLanNay} SP`:`tổng ${tongSPDon} SP`}
                            </div>
                          )}
                        </>
                      })()}
                    </td>
                    <td className="col-nguoi">
                      <div style={{fontWeight:600}}>{g['Tên NV/đối tác']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280',display:'flex',alignItems:'center',gap:'5px'}}>
                        <span>{g['Mã NV/đối tác']||''}</span>
                        {laDTRow&&<span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'10px',background:'#FEF3C7',color:'#92400E',fontWeight:700}}>Đối tác</span>}
                      </div>
                    </td>
                    <td style={{textAlign:'center'}}>
                      {(()=>{
                        if (don?.['Trạng thái']==='Huỷ') return <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#FEE2E2',color:'#991B1B',whiteSpace:'nowrap'}}>🚫 Giao nhưng hủy</span>
                        if (don?.['Trạng thái']==='Đã thu chưa đối soát') return <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#FEF9C3',color:'#854D0E',whiteSpace:'nowrap'}}>💵 Đã thu chưa đối soát</span>
                        const {tongSPDon, slGiaoLanNay, daGiaoHet} = getThongTinSP(maDon, g['Mã giao hàng'])
                        const giao1Phan = slGiaoLanNay > 0 && slGiaoLanNay < tongSPDon
                        if (!chuaDsRow) {
                          if (daGiaoHet) return <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#D1FAE5',color:'#065F46',whiteSpace:'nowrap'}}>✅ Đã giao</span>
                          return <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#ECFDF5',color:'#059669',whiteSpace:'nowrap'}}>✅ Đã giao 1 phần</span>
                        }
                        if (giao1Phan) return <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#E0F2FE',color:'#0369A1',whiteSpace:'nowrap'}}>🚚 Đang giao 1 phần</span>
                        return <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#DBEAFE',color:'#1E40AF',whiteSpace:'nowrap'}}>🚚 Đang giao</span>
                      })()}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                        background:chuaDsRow?'#FEF3C7':'#D1FAE5',
                        color:chuaDsRow?'#92400E':kqDs?.color||'#065F46',whiteSpace:'nowrap'}}>
                        {chuaDsRow?'⏳ Chưa':kqDs?.label||'✅ Đã xong'}
                      </span>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',gap:'4px',justifyContent:'center',alignItems:'center'}}>
                        {chuaDsRow ? (
                          <>
                            <span className="btn-doi-soat">
                              <button onClick={()=>moModal(g)} title="Đối soát"
                                style={{padding:'4px 8px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'12px',cursor:'pointer',lineHeight:'1'}}>
                                💰
                              </button>
                            </span>
                            <button onClick={()=>setHoanVeGH(g)} title="Hoàn về chờ giao"
                              style={{padding:'4px 8px',borderRadius:'6px',border:'1px solid #F59E0B',background:'#FFFBEB',color:'#92400E',fontWeight:600,fontSize:'12px',cursor:'pointer',lineHeight:'1'}}>
                              ↩
                            </button>
                          </>
                        ) : (
                          <button onClick={()=>setChiTietGH({gh:g,ds:doiSoatMap[g['Mã giao hàng']],don:donHangMap[g['Mã đơn hàng']]})} title="Chi tiết đối soát"
                            style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#065F46',fontSize:'12px',cursor:'pointer',lineHeight:'1',display:'flex',alignItems:'center',gap:'4px',fontWeight:600}}>
                            ✅ 👁
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <PhanTrang/>
      </div>

      {/* ══ MODAL ĐỐI SOÁT ══ */}
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
              {/* SP giao */}
              <div>
                <label style={{fontSize:'12px',fontWeight:700,display:'block',marginBottom:'8px'}}>🪑 Các sản phẩm giao lần này</label>
                {(()=>{
                  const spChuyen = chiTietGiaoMap[modalGH?.['Mã giao hàng']||''] || []
                  if (spChuyen.length===0) return <div style={{fontSize:'12px',color:'#9CA3AF',fontStyle:'italic',padding:'8px 12px',background:'#F9FAFB',borderRadius:'6px'}}>Chưa có thông tin sản phẩm</div>
                  return (
                    <div style={{background:'#F8FAFC',borderRadius:'8px',border:'1px solid #E5E7EB',overflow:'hidden'}}>
                      {spChuyen.map((sp:any,i:number)=>(
                        <div key={i} style={{padding:'8px 12px',borderBottom:i<spChuyen.length-1?'1px solid #F0F0F0':'none',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'13px'}}>
                          <div style={{fontWeight:600,flex:1}}>{sp['Tên SP (ghi nhanh)']||sp['Mã SP']||'—'}</div>
                          <div style={{fontSize:'12px',color:'#6B7280',marginLeft:'12px'}}>SL: <strong style={{color:'var(--primary)'}}>{sp['Số lượng giao đợt này']||sp['Số lượng']||1}</strong></div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Thu tiền KH */}
              <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'12px 14px',border:'1px solid #BBF7D0'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <span style={{fontWeight:700,fontSize:'13px',color:'#15803D'}}>💵 Tiền thu từ khách hàng</span>
                  {tienThuKH>0&&<span style={{fontSize:'12px',fontWeight:700,color:'#15803D'}}>Tổng: {fVND(tienThuKH)}</span>}
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>💵 Tiền mặt (đ)</label>
                    <input className="input" type="text" inputMode="numeric" value={tienMat?tienMat.toLocaleString('vi-VN'):''} placeholder="0"
                      onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setTienMat(v)}}/>
                    {tienMat>0&&<div style={{fontSize:'11px',color:'#15803D',marginTop:'2px'}}>{tienMat.toLocaleString('vi-VN')}đ</div>}
                  </div>
                  <div>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🏦 Chuyển khoản (đ)</label>
                    <input className="input" type="text" inputMode="numeric" value={chuyenKhoan?chuyenKhoan.toLocaleString('vi-VN'):''} placeholder="0"
                      onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setChuyenKhoan(v)}}/>
                    {chuyenKhoan>0&&<div style={{fontSize:'11px',color:'#0369A1',marginTop:'2px'}}>{chuyenKhoan.toLocaleString('vi-VN')}đ</div>}
                  </div>
                </div>
                {Number(donModal?.['Còn phải thu']||0)>0&&(
                  <button onClick={()=>{setTienMat(Number(donModal?.['Còn phải thu']||0));setChuyenKhoan(0)}}
                    style={{marginTop:'6px',padding:'3px 10px',border:'1px solid #BBF7D0',borderRadius:'4px',background:'white',cursor:'pointer',fontSize:'11px',color:'#15803D'}}>
                    Điền đủ tiền mặt: {fVND(donModal?.['Còn phải thu'])}
                  </button>
                )}
                {tienThuKH===0&&<div style={{marginTop:'4px',fontSize:'11px',color:'#9CA3AF',fontStyle:'italic'}}>Để trống = KH nợ chưa thu</div>}
                {(()=>{
                  const conNow = Number(donModal?.['Còn phải thu']||0) - tienThuKH
                  if (tienThuKH===0) return null
                  return (
                    <div style={{marginTop:'8px',padding:'8px 12px',borderRadius:'6px',background:conNow>0?'#FEF2F2':conNow<0?'#FFFBEB':'#F0FDF4',border:`1px solid ${conNow>0?'#FCA5A5':conNow<0?'#FCD34D':'#BBF7D0'}`}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                        <span style={{fontSize:'12px',fontWeight:600,color:conNow>0?'#DC2626':conNow<0?'#D97706':'#16A34A'}}>
                          {conNow>0?'⚠️ KH còn nợ:':conNow<0?'💰 KH trả thừa:':'✅ Thanh toán đủ'}
                        </span>
                        {conNow!==0&&<span style={{fontSize:'13px',fontWeight:800,color:conNow>0?'#DC2626':'#D97706'}}>{Math.abs(conNow).toLocaleString('vi-VN')}đ</span>}
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* CP NV/ĐT */}
              <div style={{background:laDT?'#FFF7ED':'#F0F9FF',borderRadius:'8px',padding:'12px 14px',border:`1px solid ${laDT?'#FED7AA':'#BAE6FD'}`}}>
                <div style={{fontWeight:700,fontSize:'13px',marginBottom:'6px',color:laDT?'#C2410C':'#0369A1'}}>{laDT?'💸 Chi phí trả đối tác':'🎁 CP giao hàng cho NV'}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                  {[['CP vận chuyển',chiPhiVC,setChiPhiVC],['CP lắp đặt',chiPhiLap,setChiPhiLap],['Thưởng chuyến',thuongChuyen,setThuongChuyen]].map(([lb,val,setter]:any)=>(
                    <div key={lb}>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb} (đ)</label>
                      <input className="input" type="text" inputMode="numeric" style={{fontSize:'12px'}}
                        value={val?Number(val).toLocaleString('vi-VN'):''} placeholder="0"
                        onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setter(v)}}/>
                    </div>
                  ))}
                </div>
                {tongPhaiTra>0&&<div style={{marginTop:'6px',fontSize:'12px',fontWeight:700,color:laDT?'#DC2626':'#0369A1'}}>Tổng: {fVND(tongPhaiTra)}</div>}
                {tongPhaiTra>0&&(
                  <div style={{marginTop:'8px'}}>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Hình thức chi trả</label>
                    <div style={{display:'flex',gap:'8px'}}>
                      {['Tiền mặt','Chuyển khoản'].map(ht=>(
                        <button key={ht} onClick={()=>setHinhThucChi(ht)}
                          style={{flex:1,padding:'6px',borderRadius:'6px',border:'2px solid',
                            borderColor:hinhThucChi===ht?(laDT?'#C2410C':'#0369A1'):'var(--border)',
                            background:hinhThucChi===ht?(laDT?'#FFF7ED':'#F0F9FF'):'white',
                            color:hinhThucChi===ht?(laDT?'#C2410C':'#0369A1'):'var(--text-secondary)',
                            fontWeight:hinhThucChi===ht?700:400,fontSize:'12px',cursor:'pointer'}}>
                          {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ngày đối soát + Ghi chú */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📅 Ngày đối soát</label>
                  <input className="input" type="date" value={ngayDoiSoat} onChange={e=>setNgayDoiSoat(e.target.value)}/>
                  <div style={{fontSize:'10px',color:'#9CA3AF',marginTop:'2px'}}>Mặc định: hôm nay, có thể sửa</div>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                  <input className="input" placeholder="Ghi chú thêm..." value={ghiChu} onChange={e=>setGhiChu(e.target.value)}/>
                </div>
              </div>

              {/* ── CHECKBOX KHU VỰC ── */}
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {/* Checkbox 1: Thanh toán ngay cho đối tác — CHỈ đối tác */}
                {laDT&&(
                  <div style={{background:'#F5F3FF',borderRadius:'8px',padding:'12px 14px',border:'1px solid #DDD6FE'}}>
                    <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',marginBottom:thanhToanNgay?'10px':'0'}}>
                      <input type='checkbox' checked={thanhToanNgay} onChange={e=>setThanhToanNgay(e.target.checked)} style={{width:'16px',height:'16px',cursor:'pointer',accentColor:'#7C3AED'}}/>
                      <span style={{fontSize:'13px',fontWeight:700,color:'#7C3AED'}}>💸 Thanh toán ngay cho đối tác ({fVND(tongPhaiTra)}đ)</span>
                    </label>
                    {thanhToanNgay&&(
                      <div style={{display:'flex',gap:'8px',marginTop:'8px'}}>
                        {['Tiền mặt','Chuyển khoản'].map(ht=>(
                          <button key={ht} onClick={()=>setHinhThucTTDT(ht)}
                            style={{flex:1,padding:'7px',borderRadius:'7px',border:'2px solid',
                              borderColor:hinhThucTTDT===ht?'#7C3AED':'var(--border)',
                              background:hinhThucTTDT===ht?'#F5F3FF':'white',
                              color:hinhThucTTDT===ht?'#7C3AED':'var(--text-secondary)',
                              fontWeight:hinhThucTTDT===ht?700:400,fontSize:'12px',cursor:'pointer'}}>
                            {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Checkbox 2: Đã nộp tiền thu hộ — CẢ NV lẫn ĐT, chỉ hiện khi có thu tiền */}
                {tienThuKH > 0 && (
                  <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'12px 14px',border:'1px solid #BBF7D0'}}>
                    <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer'}}>
                      <input type='checkbox' checked={daNopTienThuHo} onChange={e=>setDaNopTienThuHo(e.target.checked)} style={{width:'16px',height:'16px',cursor:'pointer',accentColor:'#16A34A'}}/>
                      <div>
                        <span style={{fontSize:'13px',fontWeight:700,color:'#15803D'}}>💵 Đã nộp tiền thu hộ cho cửa hàng ({fVND(tienThuKH)}đ)</span>
                        <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>
                          {daNopTienThuHo
                            ? '✅ Ghi nhận đã nộp — tình trạng: Đã nộp'
                            : 'Không tick = chưa nộp, xác nhận sau tại trang Nhân viên'}
                        </div>
                      </div>
                    </label>
                  </div>
                )}
              </div>

              <div style={{padding:'8px 12px',background:'#F0F9FF',borderRadius:'8px',border:'1px solid #BAE6FD',fontSize:'12px',color:'#0369A1'}}>
                💡 Trạng thái đơn hàng tự động cập nhật dựa trên SP đã giao và thanh toán
              </div>

              {msgModal&&<div style={{padding:'8px 12px',borderRadius:'8px',fontSize:'13px',background:msgModalOk?'#D1FAE5':'#FEE2E2',color:msgModalOk?'#065F46':'#991B1B'}}>{msgModal}</div>}
              <div style={{display:'flex',gap:'8px',flexDirection:'column'}}>
                <div style={{display:'flex',gap:'8px'}}>
                  <button onClick={()=>setConfirmMode('thu')} disabled={loading||tienThuKH===0}
                    style={{flex:1,padding:'11px',borderRadius:'8px',border:'2px solid #16A34A',
                      background:tienThuKH===0?'#F3F4F6':'#F0FDF4',
                      color:tienThuKH===0?'#9CA3AF':'#16A34A',
                      fontWeight:700,fontSize:'13px',cursor:tienThuKH===0?'not-allowed':'pointer'}}>
                    💵 Đã thu chưa đối soát
                  </button>
                  <button onClick={()=>setConfirmMode('doi-soat')} disabled={loading}
                    style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',
                      background:loading?'#9CA3AF':'var(--primary)',
                      color:'white',fontWeight:700,fontSize:'13px',cursor:loading?'not-allowed':'pointer'}}>
                    ✅ Đối soát
                  </button>
                </div>
                <button onClick={()=>setModalGH(null)} style={{padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',textAlign:'center'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP CHI TIẾT ĐỐI SOÁT — modal lớn chỉ đọc */}
      {chiTietGH&&(
        <div className="overlay" onClick={()=>setChiTietGH(null)}>
          <div className="modal-ds" onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>📋 Chi tiết đối soát</h2>
              <button onClick={()=>setChiTietGH(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>

            {/* Thông tin NV/ĐT */}
            <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'13px'}}>
              <div style={{fontWeight:700,color:'var(--primary)',marginBottom:'3px'}}>
                {chiTietGH.gh['Tên NV/đối tác']||'—'}
                <span style={{marginLeft:'8px',fontSize:'11px',padding:'2px 8px',borderRadius:'10px',
                  background:chiTietGH.gh['Hình thức giao']==='Đối tác'?'#FEF3C7':'#DBEAFE',
                  color:chiTietGH.gh['Hình thức giao']==='Đối tác'?'#92400E':'#1E40AF'}}>
                  {chiTietGH.gh['Hình thức giao']==='Đối tác'?'Đối tác':'NV cửa hàng'}
                </span>
              </div>
              <div style={{fontSize:'12px',color:'#555'}}>📋 {chiTietGH.gh['Mã đơn hàng']} · {chiTietGH.gh['Vai trò chuyến']||'—'} · {fDT(chiTietGH.gh['Ngày giao'])}</div>
              {chiTietGH.ds?.['Ngày đối soát']&&<div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>📅 Ngày đối soát: {new Date(chiTietGH.ds['Ngày đối soát']).toLocaleDateString('vi-VN')}</div>}
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {/* SP giao */}
              <div>
                <label style={{fontSize:'12px',fontWeight:700,display:'block',marginBottom:'8px'}}>🪑 Các sản phẩm giao lần này</label>
                {(()=>{
                  const spChuyen = chiTietGiaoMap[chiTietGH.gh['Mã giao hàng']||''] || []
                  if (spChuyen.length===0) return <div style={{fontSize:'12px',color:'#9CA3AF',fontStyle:'italic',padding:'8px 12px',background:'#F9FAFB',borderRadius:'6px'}}>Chưa có thông tin sản phẩm</div>
                  return (
                    <div style={{background:'#F8FAFC',borderRadius:'8px',border:'1px solid #E5E7EB',overflow:'hidden'}}>
                      {spChuyen.map((sp:any,i:number)=>(
                        <div key={i} style={{padding:'8px 12px',borderBottom:i<spChuyen.length-1?'1px solid #F0F0F0':'none',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'13px'}}>
                          <div style={{fontWeight:600,flex:1}}>{sp['Tên SP (ghi nhanh)']||sp['Mã SP']||'—'}</div>
                          <div style={{fontSize:'12px',color:'#6B7280',marginLeft:'12px'}}>SL: <strong style={{color:'var(--primary)'}}>{sp['Số lượng giao đợt này']||sp['Số lượng']||1}</strong></div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* Tiền thu từ KH — chỉ đọc */}
              {Number(chiTietGH.ds?.['Đã thu được']||0)>0&&(
                <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'12px 14px',border:'1px solid #BBF7D0'}}>
                  <div style={{fontWeight:700,fontSize:'13px',color:'#15803D',marginBottom:'8px'}}>💵 Tiền thu từ khách hàng</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'13px',color:'#374151'}}>Tổng đã thu:</span>
                    <span style={{fontWeight:800,fontSize:'16px',color:'#16A34A'}}>{fVND(chiTietGH.ds['Đã thu được'])}đ</span>
                  </div>
                  {chiTietGH.ds['Hình thức thu']&&(
                    <div style={{fontSize:'12px',color:'#6B7280',marginTop:'4px'}}>
                      Hình thức: <strong>{chiTietGH.ds['Hình thức thu']}</strong>
                    </div>
                  )}
                  {(()=>{
                    const conPhaiThu = Number(chiTietGH.don?.['Còn phải thu']||0)
                    if (conPhaiThu===0) return <div style={{fontSize:'12px',color:'#16A34A',marginTop:'6px',fontWeight:600}}>✅ Khách đã thanh toán đủ</div>
                    return <div style={{fontSize:'12px',color:'#DC2626',marginTop:'6px',fontWeight:600}}>⚠️ KH còn nợ: {fVND(conPhaiThu)}đ</div>
                  })()}
                </div>
              )}
              {Number(chiTietGH.ds?.['Đã thu được']||0)===0&&(
                <div style={{background:'#F9FAFB',borderRadius:'8px',padding:'10px 14px',border:'1px solid #E5E7EB',fontSize:'12px',color:'#9CA3AF',fontStyle:'italic'}}>
                  💵 Không có tiền thu từ khách — KH chưa thanh toán hoặc thanh toán thẳng cho cửa hàng
                </div>
              )}

              {/* CP NV/ĐT — chỉ đọc */}
              {(Number(chiTietGH.ds?.['Chi phí VC']||0)+Number(chiTietGH.ds?.['Chi phí lắp đặt']||0)+Number(chiTietGH.ds?.['Thưởng chuyến']||0))>0&&(
                <div style={{background:chiTietGH.gh['Hình thức giao']==='Đối tác'?'#FFF7ED':'#F0F9FF',borderRadius:'8px',padding:'12px 14px',
                  border:`1px solid ${chiTietGH.gh['Hình thức giao']==='Đối tác'?'#FED7AA':'#BAE6FD'}`}}>
                  <div style={{fontWeight:700,fontSize:'13px',marginBottom:'8px',
                    color:chiTietGH.gh['Hình thức giao']==='Đối tác'?'#C2410C':'#0369A1'}}>
                    {chiTietGH.gh['Hình thức giao']==='Đối tác'?'💸 Chi phí trả đối tác':'🎁 CP giao hàng cho NV'}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {[
                      ['🚚 CP vận chuyển', chiTietGH.ds?.['Chi phí VC']],
                      ['🔧 CP lắp đặt', chiTietGH.ds?.['Chi phí lắp đặt']],
                      ['⭐ Thưởng chuyến', chiTietGH.ds?.['Thưởng chuyến']],
                    ].map(([lb,val]:any)=>Number(val||0)>0&&(
                      <div key={lb} style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                        <span style={{color:'#6B7280'}}>{lb}</span>
                        <span style={{fontWeight:600}}>{fVND(Number(val||0))}đ</span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',fontWeight:800,borderTop:'1px solid #E5E7EB',paddingTop:'6px',marginTop:'2px'}}>
                      <span>Tổng:</span>
                      <span style={{color:'#DC2626'}}>{fVND(Number(chiTietGH.ds?.['Chi phí VC']||0)+Number(chiTietGH.ds?.['Chi phí lắp đặt']||0)+Number(chiTietGH.ds?.['Thưởng chuyến']||0))}đ</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Ngày đối soát + Ghi chú — chỉ đọc */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div style={{padding:'10px 12px',background:'#F8FAFC',borderRadius:'8px',border:'1px solid #E5E7EB'}}>
                  <div style={{fontSize:'11px',color:'#6B7280',marginBottom:'3px'}}>📅 Ngày đối soát</div>
                  <div style={{fontWeight:600,fontSize:'13px'}}>{chiTietGH.ds?.['Ngày đối soát']?new Date(chiTietGH.ds['Ngày đối soát']).toLocaleDateString('vi-VN'):'—'}</div>
                </div>
                <div style={{padding:'10px 12px',background:'#F8FAFC',borderRadius:'8px',border:'1px solid #E5E7EB'}}>
                  <div style={{fontSize:'11px',color:'#6B7280',marginBottom:'3px'}}>📝 Ghi chú</div>
                  <div style={{fontWeight:600,fontSize:'13px'}}>{chiTietGH.ds?.['Ghi chú']||'—'}</div>
                </div>
              </div>

              {/* Tình trạng nộp tiền thu hộ */}
              {Number(chiTietGH.ds?.['Đã thu được']||0)>0&&(
                <div style={{padding:'10px 14px',borderRadius:'8px',
                  background:chiTietGH.ds['Tình trạng nộp tiền']==='Đã nộp'?'#D1FAE5':'#FEF3C7',
                  border:`1px solid ${chiTietGH.ds['Tình trạng nộp tiền']==='Đã nộp'?'#6EE7B7':'#FCD34D'}`,
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'13px',fontWeight:700,color:chiTietGH.ds['Tình trạng nộp tiền']==='Đã nộp'?'#065F46':'#92400E'}}>
                    {chiTietGH.ds['Tình trạng nộp tiền']==='Đã nộp'?'✅ Đã nộp tiền thu hộ về cửa hàng':'⏳ Chưa nộp tiền thu hộ về cửa hàng'}
                  </span>
                  {chiTietGH.ds['Ngày nộp tiền']&&<span style={{fontSize:'12px',color:'#6B7280'}}>{new Date(chiTietGH.ds['Ngày nộp tiền']).toLocaleDateString('vi-VN')}</span>}
                </div>
              )}

              {/* Kết quả đối soát */}
              {(()=>{
                const kq = KET_QUA_LIST.find(k=>k.value===chiTietGH.ds?.['Kết quả'])
                return (
                  <div style={{padding:'10px 14px',borderRadius:'8px',textAlign:'center',
                    background:kq?.bg||'#D1FAE5',border:`1px solid ${kq?.color||'#065F46'}22`}}>
                    <span style={{fontSize:'14px',fontWeight:700,color:kq?.color||'#065F46'}}>
                      {kq?.label||chiTietGH.ds?.['Kết quả']||'—'}
                    </span>
                  </div>
                )
              })()}
            </div>

            <button onClick={()=>setChiTietGH(null)} style={{width:'100%',marginTop:'16px',padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>✕ Đóng</button>
          </div>
        </div>
      )}

      {/* POPUP HOÀN VỀ */}
      {hoanVeGH&&(
        <div className="overlay" onClick={()=>setHoanVeGH(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'380px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>↩</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 8px'}}>Hoàn về chờ giao</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}>Chuyến giao <strong>{hoanVeGH['Mã đơn hàng']}</strong></p>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 14px'}}>NV: <strong>{hoanVeGH['Tên NV/đối tác']||'—'}</strong></p>
            <div style={{background:'#FFFBEB',borderRadius:'8px',padding:'10px',marginBottom:'16px',fontSize:'12px',color:'#92400E',border:'1px solid #FCD34D'}}>
              ⚠️ Chuyến giao này sẽ bị xóa. Đơn hàng trở về trạng thái "Chờ giao" để tạo chuyến mới.
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={async()=>{
                setLoadingHoan(true)
                try {
                  await fetch(`/api/giao-hang?id=${hoanVeGH['Id']||hoanVeGH['id']}&maDon=${encodeURIComponent(hoanVeGH['Mã đơn hàng'])}&maGH=${encodeURIComponent(hoanVeGH['Mã giao hàng']||'')}`, {method:'DELETE'})
                  setHoanVeGH(null); router.refresh()
                } catch(e:any) { alert('Lỗi: '+e.message) }
                finally { setLoadingHoan(false) }
              }} disabled={loadingHoan}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loadingHoan?'#9CA3AF':'#F59E0B',color:'white',fontWeight:700,fontSize:'14px',cursor:loadingHoan?'not-allowed':'pointer'}}>
                {loadingHoan?'⏳ Đang xử lý...':'↩ Xác nhận hoàn về'}
              </button>
              <button onClick={()=>setHoanVeGH(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup xác nhận 2 nút */}
      {confirmMode&&modalGH&&(
        <div className="overlay" onClick={()=>setConfirmMode(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>{confirmMode==='thu'?'💵':'✅'}</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 8px'}}>
              {confirmMode==='thu'?'Xác nhận đã thu tiền':'Xác nhận đối soát'}
            </h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}>Đơn: <strong>{modalGH['Mã đơn hàng']}</strong></p>
            {confirmMode==='thu'&&<p style={{fontSize:'13px',color:'#16A34A',fontWeight:600,margin:'0 0 14px'}}>
              Số tiền thu: {Number(tienMat||0)+Number(chuyenKhoan||0)>0?((Number(tienMat||0)+Number(chuyenKhoan||0)).toLocaleString('vi-VN')+'đ'):'KH nợ chưa thu'}
            </p>}
            {confirmMode==='doi-soat'&&(
              <div style={{marginBottom:'14px'}}>
                <p style={{fontSize:'13px',color:'var(--primary)',fontWeight:600,margin:'0 0 6px'}}>
                  Tổng CP: {((chiPhiVC||0)+(chiPhiLap||0)+(thuongChuyen||0)).toLocaleString('vi-VN')}đ
                </p>
                {tienThuKH>0&&<p style={{fontSize:'12px',color:daNopTienThuHo?'#16A34A':'#D97706',margin:0}}>
                  {daNopTienThuHo?'✅ NV/ĐT đã nộp tiền thu hộ':'⏳ NV/ĐT chưa nộp tiền thu hộ'}
                </p>}
              </div>
            )}
            <div style={{background:confirmMode==='thu'?'#F0FDF4':'#EFF6FF',borderRadius:'8px',padding:'10px',marginBottom:'16px',fontSize:'12px',color:confirmMode==='thu'?'#16A34A':'#1E40AF'}}>
              {confirmMode==='thu'
                ?'Trạng thái đơn → Đã thu chưa đối soát. Cột Đối soát vẫn hiện Chưa.'
                :'Trạng thái đơn → Đang giao. Cột Đối soát → Đã đối soát.'}
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={confirmMode==='thu'?luuDaThu:luuDoiSoat} disabled={loading}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',
                  background:loading?'#9CA3AF':confirmMode==='thu'?'#16A34A':'var(--primary)',
                  color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':confirmMode==='thu'?'✅ Xác nhận thu':'✅ Xác nhận đối soát'}
              </button>
              <button onClick={()=>setConfirmMode(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
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
