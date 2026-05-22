'use client'
// components/GiaoHangClient.tsx — v5.0
// Sửa: cột Tên SP có dữ liệu, dropdown tìm đơn hoạt động, tooltip đối soát, phân trang

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
function boDau(s: string) {
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

const KET_QUA_LIST = [
  { value:'Thành công',               label:'✅ Thành công',         color:'#065F46', bg:'#D1FAE5' },
  { value:'Huỷ — khách trả CP',       label:'❌ Huỷ — khách trả CP', color:'#92400E', bg:'#FEF3C7' },
  { value:'Huỷ — cửa hàng chịu CP',   label:'❌ Huỷ — CH chịu CP',   color:'#991B1B', bg:'#FEE2E2' },
  { value:'Đổi hàng — khách trả CP',  label:'🔄 Đổi — khách trả',    color:'#1E40AF', bg:'#DBEAFE' },
  { value:'Đổi hàng — cửa hàng chịu', label:'🔄 Đổi — CH chịu',      color:'#6D28D9', bg:'#EDE9FE' },
]

interface Nguoi {
  id:string; hinhThuc:'NV cửa hàng'|'Đối tác'
  maNV:string; tenNV:string; vaiTroNocoDB:string; vaiTroChuyen:string
  ghiChu:string; showSearch:boolean; searchText:string
}
interface SPGiao {
  maChiTiet:string; tenSP:string; soLuongDon:number
  daGiao:number; soLuongGiao:number; checked:boolean; ghiChu:string
}
const VAI_TRO_CHUYEN = ['Vận chuyển+Lắp','Vận chuyển','Lắp đặt']
const NGUOI_MAC_DINH: Nguoi = {
  id:'1', hinhThuc:'NV cửa hàng', maNV:'', tenNV:'',
  vaiTroNocoDB:'', vaiTroChuyen:'Vận chuyển+Lắp',
  ghiChu:'', showSearch:false, searchText:'',
}
const SO_DONG = 10

export default function GiaoHangClient({
  giaoHangList, chiTietDonMap, daGiaoMap,
  donChuaGiao, donHangMap,
  danhSachNVCuaHang, danhSachDoiTac,
  khachHangMap, user,
}: {
  giaoHangList:any[]; chiTietDonMap:Record<string,any[]>
  daGiaoMap:Record<string,Record<string,number>>
  donChuaGiao:any[]; donHangMap:Record<string,any>
  danhSachNVCuaHang:any[]; danhSachDoiTac:any[]
  khachHangMap:Record<string,any>; user:UserSession
}) {
  const router = useRouter()
  const [filterTT, setFilterTT] = useState('Tất cả')
  const [trang,    setTrang]    = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)

  // Modal đối soát
  const [modalDS,      setModalDS]      = useState<any>(null)
  const [loadingDS,    setLoadingDS]    = useState(false)
  const [tienThuKH,    setTienThuKH]    = useState(0)
  const [hinhThucThu,  setHinhThucThu]  = useState('Tiền mặt')
  const [chiPhiVC,     setChiPhiVC]     = useState(0)
  const [chiPhiLap,    setChiPhiLap]    = useState(0)
  const [thuongChuyen, setThuongChuyen] = useState(0)
  const [ketQua,       setKetQua]       = useState('Thành công')
  const [ghiChuDS,     setGhiChuDS]     = useState('')
  const [hoanThanhDon, setHoanThanhDon] = useState(false)

  // Form tạo chuyến
  const [searchDon,     setSearchDon]     = useState('')
  const [donChon,       setDonChon]       = useState<any>(null)
  const [showDon,       setShowDon]       = useState(false)
  const [ngayGiao,      setNgayGiao]      = useState(new Date().toISOString().slice(0,16))
  const [ghiChuChuyen,  setGhiChuChuyen]  = useState('')
  const [danhSachNguoi, setDanhSachNguoi] = useState<Nguoi[]>([{...NGUOI_MAC_DINH}])
  const [danhSachSP,    setDanhSachSP]    = useState<SPGiao[]>([])

  // ── Helpers ──
  function getTenKH(maKH:string, tenTuDon?:string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }
  function getDiaChi(don:any) {
    if (!don) return '—'
    const maKH = don['Mã KH']||''
    return don['Địa chỉ giao'] || don['_diaChiKH'] || khachHangMap[maKH]?.['Địa chỉ'] || '—'
  }

  // ✅ Lấy tên SP đầu tiên + tổng số lượng SP từ chiTietDonMap
  function getThongTinSP(maDon:string) {
    const ct = chiTietDonMap[maDon] || []
    const hl = ct.filter((c:any) => c['Tên SP (ghi nhanh)']||c['Mã SP'])
    if (hl.length===0) return { tenSP:'—', tongSP:0, coNhieu:false }
    const tenDau = hl[0]['Tên SP (ghi nhanh)'] || hl[0]['Mã SP'] || '—'
    const tongSL = hl.reduce((s:number,c:any)=>s+Number(c['Số lượng']||1),0)
    return { tenSP:tenDau, tongSP:tongSL, coNhieu:hl.length>1 }
  }

  const ghHopLe = useMemo(()=>
    giaoHangList.filter(g=>g['Mã đơn hàng']?.toString().trim())
  ,[giaoHangList])

  const filtered = useMemo(()=>{
    setTrang(1)
    if (filterTT==='Tất cả') return ghHopLe
    if (filterTT==='Chưa đối soát') return ghHopLe.filter(g=>g['Tình trạng đối soát']!=='Đã đối soát')
    return ghHopLe.filter(g=>g['Tình trạng đối soát']==='Đã đối soát')
  },[ghHopLe,filterTT])

  const tongTrang     = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT       = Math.min(trang,tongTrang)
  const danhSachTrang = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)
  const chuaDS        = ghHopLe.filter(g=>g['Tình trạng đối soát']!=='Đã đối soát').length

  // ✅ Dropdown tìm đơn — search theo mã đơn, tên KH, SĐT, địa chỉ
  const donLoc = useMemo(()=>{
    if (!searchDon.trim()) return donChuaGiao.slice(0,12)
    const q = boDau(searchDon)
    const qRaw = searchDon.toLowerCase()
    return donChuaGiao.filter((d:any)=>{
      const tenKH  = boDau(d['_tenKH']||d['Tên khách hàng']||'')
      const maDon  = boDau(d['Mã đơn hàng']||'')
      const sdt    = (d['_sdtKH']||'').replace(/\D/g,'')
      const diaChi = boDau(d['_diaChiKH']||'')
      return maDon.includes(q) || tenKH.includes(q) ||
             sdt.includes(qRaw.replace(/\D/g,'')) ||
             diaChi.includes(q)
    }).slice(0,12)
  },[searchDon,donChuaGiao])

  function chonDon(don:any) {
    setDonChon(don)
    setSearchDon(don['Mã đơn hàng'])
    setShowDon(false)
    const ct      = chiTietDonMap[don['Mã đơn hàng']] || []
    const daGiao  = daGiaoMap[don['Mã đơn hàng']] || {}
    setDanhSachSP(ct.filter((c:any)=>c['Tên SP (ghi nhanh)']||c['Mã SP']).map((c:any)=>{
      const key    = c['Mã chi tiết']||c['Tên SP (ghi nhanh)']||c['Mã SP']
      const sl     = Number(c['Số lượng']||1)
      const daDuocGiao = daGiao[key]||0
      const conLai = Math.max(0,sl-daDuocGiao)
      return { maChiTiet:c['Mã chi tiết']||'', tenSP:c['Tên SP (ghi nhanh)']||c['Mã SP']||'—', soLuongDon:sl, daGiao:daDuocGiao, soLuongGiao:conLai, checked:conLai>0, ghiChu:'' }
    }))
  }

  function getDSTK(hinhThuc:string, txt:string) {
    const list = hinhThuc==='Đối tác' ? danhSachDoiTac : danhSachNVCuaHang
    if (!txt.trim()) return list.slice(0,8)
    const q = boDau(txt)
    return list.filter((nv:any)=>boDau(nv['Họ tên']||'').includes(q)||boDau(nv['Mã NV']||'').includes(q)).slice(0,8)
  }

  function themNguoi() {
    setDanhSachNguoi(prev=>[...prev,{id:Date.now().toString(),hinhThuc:'NV cửa hàng',maNV:'',tenNV:'',vaiTroNocoDB:'',vaiTroChuyen:'Vận chuyển',ghiChu:'',showSearch:false,searchText:''}])
  }
  function xoaNguoi(id:string) { setDanhSachNguoi(prev=>prev.filter(n=>n.id!==id)) }
  function updN(id:string,k:keyof Nguoi,v:any) {
    setDanhSachNguoi(prev=>prev.map(n=>n.id===id?{...n,[k]:v}:n))
  }
  function chonNguoi(nid:string, nv:any) {
    setDanhSachNguoi(prev=>prev.map(n=>n.id===nid?{...n,maNV:nv['Mã NV']||'',tenNV:nv['Họ tên']||'',vaiTroNocoDB:nv['Vai trò']||'',hinhThuc:(nv['Mã NV']||'').startsWith('DT-')?'Đối tác':'NV cửa hàng',searchText:nv['Họ tên']||'',showSearch:false}:n))
  }
  function updSP(idx:number,k:keyof SPGiao,v:any) {
    setDanhSachSP(prev=>prev.map((sp,i)=>i===idx?{...sp,[k]:v}:sp))
  }
  function resetForm() {
    setSearchDon('');setDonChon(null);setGhiChuChuyen('')
    setNgayGiao(new Date().toISOString().slice(0,16))
    setDanhSachNguoi([{...NGUOI_MAC_DINH}]);setDanhSachSP([])
  }

  function moModalDS(gh:any) {
    const don = donHangMap[gh['Mã đơn hàng']]
    setModalDS(gh)
    setTienThuKH(Number(don?.['Còn phải thu']||0))
    setHinhThucThu('Tiền mặt')
    setChiPhiVC(Number(gh['Chi phí VC']||0))
    setChiPhiLap(Number(gh['Chi phí lắp đặt']||0))
    setThuongChuyen(Number(gh['Thưởng chuyến']||0))
    setKetQua('Thành công');setGhiChuDS('');setHoanThanhDon(false)
  }

  async function luuDoiSoat() {
    if (!modalDS) return
    setLoadingDS(true)
    try {
      const res = await fetch('/api/doi-soat',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          maGiaoHang:modalDS['Mã giao hàng'],maChuyen:modalDS['Mã chuyến']||'',
          maDon:modalDS['Mã đơn hàng'],maNVDoiTac:modalDS['Mã NV/đối tác']||'',
          tenNVDoiTac:modalDS['Tên NV/đối tác']||'',hinhThucGiao:modalDS['Hình thức giao']||'',
          tienThuKH,hinhThucThu,chiPhiVC,chiPhiLap,thuongChuyen,ketQua,ghiChu:ghiChuDS,hoanThanhDon,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message||'Lỗi')
      setMsg('✅ Đã lưu đối soát'); setMsgOk(true)
      setModalDS(null); router.refresh()
    } catch(err:any) {
      setMsg('❌ '+(err.message||'Lỗi')); setMsgOk(false)
    } finally {
      setLoadingDS(false); setTimeout(()=>setMsg(''),5000)
    }
  }

  async function luuChuyen() {
    if (!donChon) { setMsg('Vui lòng chọn đơn hàng');setMsgOk(false);return }
    const nguoiHL = danhSachNguoi.filter(n=>n.tenNV.trim())
    if (!nguoiHL.length) { setMsg('Vui lòng nhập ít nhất 1 người giao');setMsgOk(false);return }
    const spGiao = danhSachSP.filter(sp=>sp.checked&&sp.soLuongGiao>0)
    setLoading(true);setMsg('')
    try {
      const res = await fetch('/api/giao-hang',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          maDon:donChon['Mã đơn hàng'],ngayGiao,ghiChuChuyen,
          danhSachNguoi:nguoiHL.map(n=>({hinhThuc:n.hinhThuc,maNV:n.maNV,tenNV:n.tenNV,vaiTroChuyen:n.vaiTroChuyen})),
          danhSachSP:spGiao.map(sp=>({maChiTiet:sp.maChiTiet,tenSP:sp.tenSP,soLuongGiao:sp.soLuongGiao,ghiChu:sp.ghiChu})),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message||'Lỗi')
      setMsg(`✅ Đã tạo chuyến — ${data.soNguoi} người, ${data.soSP} SP`); setMsgOk(true)
      resetForm(); setShowForm(false); router.refresh()
    } catch(err:any) {
      setMsg('❌ '+(err.message||'Lỗi')); setMsgOk(false)
    } finally {
      setLoading(false); setTimeout(()=>setMsg(''),6000)
    }
  }

  const spDaChon  = danhSachSP.filter(sp=>sp.checked).length
  const donModal  = modalDS ? donHangMap[modalDS['Mã đơn hàng']] : null
  const laDT      = modalDS?.['Hình thức giao']==='Đối tác'
  const tongPhaiTra = (chiPhiVC||0)+(chiPhiLap||0)+(thuongChuyen||0)

  // Phân trang
  function PhanTrang() {
    if (tongTrang<=1) return null
    const pages = Array.from({length:tongTrang},(_,i)=>i+1)
    let hienThi:number[]
    if (tongTrang<=7) hienThi=pages
    else if (trangHT<=4) hienThi=[...pages.slice(0,5),-1,tongTrang]
    else if (trangHT>=tongTrang-3) hienThi=[1,-1,...pages.slice(tongTrang-5)]
    else hienThi=[1,-1,trangHT-1,trangHT,trangHT+1,-2,tongTrang]
    return (
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px'}}>
        <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>
          {(trangHT-1)*SO_DONG+1}–{Math.min(trangHT*SO_DONG,filtered.length)} / {filtered.length} chuyến
        </span>
        <div style={{display:'flex',gap:'4px'}}>
          <BtnPage disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</BtnPage>
          {hienThi.map((p,i)=>p<0
            ?<span key={`d${i}`} style={{padding:'4px 2px',color:'#9CA3AF',fontSize:'13px'}}>…</span>
            :<BtnPage key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</BtnPage>
          )}
          <BtnPage disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</BtnPage>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .gh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-tao{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;}
        .gh-t th,.gh-t td{padding:8px 10px;}
        .gh-t tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;}
        .modal-gh{background:white;border-radius:12px;padding:24px;width:100%;max-width:680px;margin:auto;}
        .modal-ds{background:white;border-radius:12px;padding:24px;width:100%;max-width:500px;max-height:93vh;overflow-y:auto;margin:auto;}
        .db{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:260px;overflow-y:auto;}
        .di{padding:9px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;}.di:last-child{border-bottom:none;}
        .nc{border:1px solid var(--border);border-radius:10px;padding:13px;background:#FAFBFD;margin-bottom:8px;}
        .sp-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;border:1px solid #E5E7EB;margin-bottom:5px;background:white;font-size:13px;}
        .sec-title{font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;}
        .kq-btn{padding:8px 12px;border-radius:8px;border:2px solid;cursor:pointer;font-size:12px;font-weight:600;text-align:center;}
        /* ✅ Tooltip đối soát */
        .btn-doi-soat{position:relative;display:inline-block;}
        .btn-doi-soat:hover::after{content:'Đối soát';position:absolute;bottom:calc(100% + 4px);left:50%;transform:translateX(-50%);background:#1F2937;color:white;font-size:11px;padding:3px 8px;border-radius:4px;white-space:nowrap;pointer-events:none;z-index:10;}
        .btn-doi-soat:hover::before{content:'';position:absolute;bottom:calc(100% + 1px);left:50%;transform:translateX(-50%);border:4px solid transparent;border-top-color:#1F2937;pointer-events:none;}
        @media(max-width:1100px){.col-sp{display:none;}}
        @media(max-width:900px){.col-dia{display:none;}}
        @media(max-width:700px){.col-nguoi,.col-vt{display:none;}}
      `}</style>

      {/* Header */}
      <div className="gh-hdr">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🚚 Giao hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {ghHopLe.length} chuyến
            {chuaDS>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {chuaDS} chưa đối soát</span>}
          </p>
        </div>
        <button className="btn-tao" onClick={()=>setShowForm(true)}>🚚 Tạo chuyến giao</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          {['Tất cả','Chưa đối soát','Đã đối soát'].map(tt=>(
            <button key={tt} onClick={()=>setFilterTT(tt)} style={{padding:'5px 14px',borderRadius:'20px',border:'1px solid',borderColor:filterTT===tt?'var(--primary)':'var(--border)',background:filterTT===tt?'var(--primary-pale)':'white',color:filterTT===tt?'var(--primary)':'var(--text-secondary)',fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer'}}>{tt}</button>
          ))}
          <span style={{marginLeft:'auto',fontSize:'12px',color:'var(--text-secondary)'}}>{filtered.length} chuyến</span>
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="gh-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày giao</th>
                <th style={{textAlign:'left',fontWeight:700}}>Khách hàng</th>
                <th className="col-dia" style={{textAlign:'left',fontWeight:700}}>Địa chỉ</th>
                <th className="col-sp" style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                <th className="col-nguoi" style={{textAlign:'left',fontWeight:700}}>Người giao</th>
                <th className="col-vt" style={{textAlign:'left',fontWeight:700}}>Vai trò</th>
                <th style={{textAlign:'center',fontWeight:700}}>Đối soát</th>
                <th style={{width:'52px'}}></th>
              </tr>
            </thead>
            <tbody>
              {danhSachTrang.length===0?(
                <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Chưa có chuyến giao nào</td></tr>
              ):danhSachTrang.map((g:any,i:number)=>{
                const maDon  = g['Mã đơn hàng']||''
                const don    = donHangMap[maDon]
                const maKH   = don?.['Mã KH']||g['Mã KH']||''
                const tenKH  = getTenKH(maKH,don?.['Tên khách hàng'])
                const diaChi = getDiaChi(don)
                const {tenSP,tongSP,coNhieu} = getThongTinSP(maDon)
                const chuaDsRow = g['Tình trạng đối soát']!=='Đã đối soát'
                const laDTRow   = g['Hình thức giao']==='Đối tác'
                return (
                  <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td>
                      <Link href={`/dashboard/don-hang/${maDon}`} style={{color:'var(--primary)',fontWeight:700,textDecoration:'none',whiteSpace:'nowrap'}}>{maDon}</Link>
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDT(g['Ngày giao'])}</td>
                    <td>
                      <div style={{fontWeight:600}}>{tenKH}</div>
                      {maKH&&<div style={{fontSize:'11px',color:'var(--text-muted)'}}>{maKH}</div>}
                    </td>
                    <td className="col-dia" style={{fontSize:'12px',color:'var(--text-secondary)',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{diaChi}</td>
                    {/* ✅ Cột Tên SP */}
                    <td className="col-sp" style={{maxWidth:'160px'}}>
                      <div style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={tenSP}>{tenSP}</div>
                      {coNhieu&&<div style={{fontSize:'11px',color:'#6B7280'}}>tổng {tongSP} SP</div>}
                    </td>
                    <td className="col-nguoi">
                      <div style={{fontWeight:600}}>{g['Tên NV/đối tác']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{g['Mã NV/đối tác']||''}</div>
                      {laDTRow&&<span style={{fontSize:'10px',padding:'1px 6px',borderRadius:'10px',background:'#FEF3C7',color:'#92400E',fontWeight:700}}>Đối tác</span>}
                    </td>
                    <td className="col-vt" style={{fontSize:'12px',color:'var(--text-secondary)'}}>{g['Vai trò chuyến']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:chuaDsRow?'#FEF3C7':'#D1FAE5',color:chuaDsRow?'#92400E':'#065F46',whiteSpace:'nowrap'}}>
                        {chuaDsRow?'⏳ Chưa':'✅ Đã xong'}
                      </span>
                    </td>
                    <td style={{textAlign:'center'}}>
                      {/* ✅ Tooltip "Đối soát" khi rê chuột */}
                      {chuaDsRow?(
                        <span className="btn-doi-soat">
                          <button onClick={()=>moModalDS(g)} title="Đối soát"
                            style={{padding:'5px 10px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
                            💰
                          </button>
                        </span>
                      ):(
                        <Link href={`/dashboard/doi-soat?maGH=${g['Mã giao hàng']}`}
                          className="btn btn-ghost btn-sm" style={{padding:'4px 8px',fontSize:'12px'}}>📋</Link>
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

      {/* ── MODAL ĐỐI SOÁT ── */}
      {modalDS&&(
        <div className="overlay" onClick={()=>setModalDS(null)}>
          <div className="modal-ds" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>💰 Đối soát chuyến giao</h2>
              <button onClick={()=>setModalDS(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'13px'}}>
              <div style={{fontWeight:700,color:'var(--primary)',marginBottom:'3px'}}>
                {modalDS['Tên NV/đối tác']||'—'}
                <span style={{marginLeft:'8px',fontSize:'11px',padding:'2px 8px',borderRadius:'10px',background:laDT?'#FEF3C7':'#DBEAFE',color:laDT?'#92400E':'#1E40AF'}}>{laDT?'Đối tác':'NV cửa hàng'}</span>
              </div>
              <div style={{fontSize:'12px',color:'#555'}}>📋 {modalDS['Mã đơn hàng']} · {modalDS['Vai trò chuyến']||'—'} · {fDT(modalDS['Ngày giao'])}</div>
              {Number(donModal?.['Còn phải thu']||0)>0&&<div style={{color:'#DC2626',fontWeight:600,fontSize:'12px',marginTop:'3px'}}>📌 KH còn nợ: {fVND(donModal?.['Còn phải thu'])}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {/* Kết quả */}
              <div>
                <label style={{fontSize:'12px',fontWeight:700,display:'block',marginBottom:'8px'}}>📌 Kết quả chuyến</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px'}}>
                  {KET_QUA_LIST.map(kq=>(
                    <button key={kq.value} onClick={()=>setKetQua(kq.value)} className="kq-btn"
                      style={{borderColor:ketQua===kq.value?kq.color:'#E5E7EB',background:ketQua===kq.value?kq.bg:'white',color:ketQua===kq.value?kq.color:'#6B7280'}}>
                      {kq.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Tiền thu */}
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
              {/* Chi phí */}
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
              {/* Ghi chú */}
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                <input className="input" placeholder="Ghi chú..." value={ghiChuDS} onChange={e=>setGhiChuDS(e.target.value)}/>
              </div>
              {/* Hoàn thành */}
              <label style={{display:'flex',alignItems:'center',gap:'10px',cursor:'pointer',padding:'10px 12px',background:'#F0FDF4',borderRadius:'8px',border:'1px solid #BBF7D0'}}>
                <input type="checkbox" checked={hoanThanhDon} onChange={e=>setHoanThanhDon(e.target.checked)} style={{width:'16px',height:'16px',accentColor:'#16A34A'}}/>
                <div>
                  <div style={{fontSize:'13px',fontWeight:600,color:'#15803D'}}>Đánh dấu đơn hàng "Hoàn thành"</div>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>Chỉ tick khi đã giao đủ toàn bộ SP</div>
                </div>
              </label>
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={luuDoiSoat} disabled={loadingDS} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loadingDS?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loadingDS?'not-allowed':'pointer'}}>
                  {loadingDS?'⏳ Đang lưu...':'✅ Xác nhận đối soát'}
                </button>
                <button onClick={()=>setModalDS(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL TẠO CHUYẾN ── */}
      {showForm&&(
        <div className="overlay" onClick={()=>{setShowForm(false);resetForm()}}>
          <div className="modal-gh" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>🚚 Tạo chuyến giao hàng</h2>
              <button onClick={()=>{setShowForm(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#6B7280'}}>✕</button>
            </div>

            {/* ① Chọn đơn */}
            <div style={{marginBottom:'14px',padding:'14px',background:'#F8FAFC',borderRadius:'10px',border:'1px solid #E5E7EB'}}>
              <div className="sec-title">① Chọn đơn hàng & ngày giao</div>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px'}}>
                <div>
                  <div style={{position:'relative'}}>
                    <input className="input" placeholder="Gõ mã đơn, tên KH, SĐT, địa chỉ..."
                      value={searchDon}
                      onChange={e=>{setSearchDon(e.target.value);setDonChon(null);setDanhSachSP([]);setShowDon(true)}}
                      onFocus={()=>setShowDon(true)}
                      onBlur={()=>setTimeout(()=>setShowDon(false),250)}/>
                    {/* ✅ Dropdown luôn hiện khi focus — kể cả khi chưa gõ */}
                    {showDon&&(
                      <div className="db">
                        {donLoc.length===0
                          ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>Không có đơn cần giao</div>
                          :donLoc.map((don:any)=>{
                            const tenKHDon = don['_tenKH']||getTenKH(don['Mã KH'],don['Tên khách hàng'])
                            const sdtDon   = don['_sdtKH']||''
                            const diaChiDon= don['_diaChiKH']||getDiaChi(don)
                            return (
                              <div key={don['Mã đơn hàng']} className="di" onClick={()=>chonDon(don)}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                  <span style={{fontWeight:700,color:'var(--primary)'}}>{don['Mã đơn hàng']}</span>
                                  <span style={{fontSize:'11px',background:'#FEF3C7',color:'#92400E',padding:'1px 6px',borderRadius:'10px',fontWeight:600}}>{don['Trạng thái']}</span>
                                </div>
                                <div style={{fontSize:'12px',fontWeight:600,marginTop:'2px'}}>{tenKHDon}{sdtDon&&<span style={{fontWeight:400,color:'#6B7280'}}> · {sdtDon}</span>}</div>
                                <div style={{fontSize:'11px',color:'#6B7280',marginTop:'1px'}}>📍 {diaChiDon}</div>
                                <div style={{fontSize:'11px',color:'#DC2626',fontWeight:600,marginTop:'1px'}}>Còn thu: {fVND(don['Còn phải thu'])}</div>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                  {donChon&&(
                    <div style={{marginTop:'6px',background:'var(--primary-pale)',borderRadius:'6px',padding:'8px 12px',fontSize:'12px'}}>
                      <div style={{fontWeight:700,color:'var(--primary)'}}>✅ {donChon['Mã đơn hàng']}</div>
                      <div>{donChon['_tenKH']||getTenKH(donChon['Mã KH'],donChon['Tên khách hàng'])} {donChon['_sdtKH']&&`· ${donChon['_sdtKH']}`}</div>
                      <div style={{color:'#6B7280',fontSize:'11px'}}>📍 {donChon['_diaChiKH']||getDiaChi(donChon)}</div>
                      <div style={{color:'#DC2626',fontWeight:600}}>Còn thu: {fVND(donChon['Còn phải thu'])}</div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ngày giờ giao</label>
                  <input className="input" type="datetime-local" value={ngayGiao} onChange={e=>setNgayGiao(e.target.value)}/>
                  <div style={{marginTop:'8px'}}>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú chuyến</label>
                    <input className="input" placeholder="Ghi chú..." value={ghiChuChuyen} onChange={e=>setGhiChuChuyen(e.target.value)} style={{fontSize:'12px'}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* ② SP giao */}
            {danhSachSP.length>0&&(
              <div style={{marginBottom:'14px',padding:'14px',background:'#F8FAFC',borderRadius:'10px',border:'1px solid #E5E7EB'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <div className="sec-title" style={{margin:0}}>② Sản phẩm giao lần này</div>
                  <span style={{fontSize:'12px',color:'var(--primary)',fontWeight:600}}>{spDaChon}/{danhSachSP.length} SP</span>
                </div>
                {danhSachSP.map((sp,idx)=>{
                  const het=sp.soLuongDon<=sp.daGiao
                  return (
                    <div key={idx} className="sp-row" style={{opacity:het?0.5:1}}>
                      <input type="checkbox" checked={sp.checked&&!het} disabled={het} onChange={e=>updSP(idx,'checked',e.target.checked)} style={{width:'16px',height:'16px',flexShrink:0,accentColor:'var(--primary)'}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:sp.checked?600:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sp.tenSP}</div>
                        <div style={{fontSize:'11px',color:'#6B7280'}}>ĐH:{sp.soLuongDon} · Đã:{sp.daGiao} · Còn:{sp.soLuongDon-sp.daGiao}{het&&<span style={{marginLeft:'6px',color:'#16A34A',fontWeight:600}}>✅ Đủ</span>}</div>
                      </div>
                      {sp.checked&&!het&&(
                        <div style={{display:'flex',alignItems:'center',gap:'5px',flexShrink:0}}>
                          <span style={{fontSize:'11px',color:'#6B7280'}}>Giao:</span>
                          <input type="number" min="1" max={sp.soLuongDon-sp.daGiao} value={sp.soLuongGiao}
                            onChange={e=>updSP(idx,'soLuongGiao',Math.min(Number(e.target.value),sp.soLuongDon-sp.daGiao))}
                            style={{width:'52px',padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'12px',textAlign:'center'}}/>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ③ Người giao */}
            <div style={{marginBottom:'14px',padding:'14px',background:'#F8FAFC',borderRadius:'10px',border:'1px solid #E5E7EB'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                <div className="sec-title" style={{margin:0}}>③ Người vận chuyển / lắp đặt</div>
                <button onClick={themNguoi} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid var(--primary)',color:'var(--primary)',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>+ Thêm người</button>
              </div>
              {danhSachNguoi.map((nguoi,idx)=>{
                const dsTK=getDSTK(nguoi.hinhThuc,nguoi.searchText||nguoi.tenNV)
                return (
                  <div key={nguoi.id} className="nc">
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:'10px'}}>
                      <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)'}}>
                        Người {idx+1}{nguoi.tenNV&&<span style={{marginLeft:'8px',fontWeight:400,color:'var(--primary)'}}>— {nguoi.tenNV}</span>}
                      </span>
                      {danhSachNguoi.length>1&&<button onClick={()=>xoaNguoi(nguoi.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',fontSize:'16px'}}>✕</button>}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px',marginBottom:'8px'}}>
                      <div>
                        <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Hình thức</label>
                        <select className="input" value={nguoi.hinhThuc} onChange={e=>{updN(nguoi.id,'hinhThuc',e.target.value);updN(nguoi.id,'maNV','');updN(nguoi.id,'tenNV','');updN(nguoi.id,'searchText','')}}>
                          <option value="NV cửa hàng">NV cửa hàng</option>
                          <option value="Đối tác">Đối tác ngoài</option>
                        </select>
                      </div>
                      <div>
                        <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Vai trò chuyến</label>
                        <select className="input" value={nguoi.vaiTroChuyen} onChange={e=>updN(nguoi.id,'vaiTroChuyen',e.target.value)}>
                          {VAI_TRO_CHUYEN.map(v=><option key={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{marginBottom:'8px'}}>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên người *</label>
                      <div style={{position:'relative'}}>
                        <input className="input" placeholder={`Gõ tên ${nguoi.hinhThuc==='Đối tác'?'đối tác':'nhân viên'}...`}
                          value={nguoi.searchText||nguoi.tenNV}
                          onChange={e=>{updN(nguoi.id,'searchText',e.target.value);updN(nguoi.id,'tenNV',e.target.value);updN(nguoi.id,'showSearch',true)}}
                          onFocus={()=>updN(nguoi.id,'showSearch',true)}
                          onBlur={()=>setTimeout(()=>updN(nguoi.id,'showSearch',false),200)}/>
                        {nguoi.showSearch&&(
                          <div className="db">
                            {nguoi.tenNV&&!dsTK.find((nv:any)=>nv['Họ tên']===nguoi.tenNV)&&(
                              <div className="di" onClick={()=>updN(nguoi.id,'showSearch',false)} style={{background:'#FEF9C3',color:'#92400E',fontSize:'12px'}}>✏️ Dùng tên: <strong>"{nguoi.tenNV}"</strong></div>
                            )}
                            {dsTK.length===0
                              ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>Không tìm thấy</div>
                              :dsTK.map((nv:any)=>(
                                <div key={nv['Mã NV']} className="di" onClick={()=>chonNguoi(nguoi.id,nv)}>
                                  <div style={{fontWeight:600}}>{nv['Họ tên']} <span style={{fontSize:'11px',padding:'1px 6px',borderRadius:'10px',background:nv['Mã NV']?.startsWith('DT-')?'#FEF3C7':'#DBEAFE',color:nv['Mã NV']?.startsWith('DT-')?'#92400E':'#1E40AF',fontWeight:700}}>{nv['Mã NV']}</span></div>
                                  <div style={{fontSize:'11px',color:'#6B7280'}}>Vai trò: {nv['Vai trò']||'—'}</div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <input className="input" placeholder="Ghi chú..." value={nguoi.ghiChu} onChange={e=>updN(nguoi.id,'ghiChu',e.target.value)} style={{fontSize:'12px'}}/>
                  </div>
                )
              })}
            </div>

            <div style={{padding:'10px 14px',background:'#EFF6FF',borderRadius:'8px',border:'1px solid #BFDBFE',marginBottom:'14px',fontSize:'12px',color:'#1E40AF'}}>
              💡 Chi phí và thưởng nhập lúc đối soát sau khi hoàn thành giao hàng.
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={luuChuyen} disabled={loading}
                style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                {loading?'⏳ Đang lưu...':`✅ Tạo chuyến${spDaChon>0?` (${spDaChon} SP)`:''}`}
              </button>
              <button onClick={()=>{setShowForm(false);resetForm()}} style={{padding:'12px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
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
