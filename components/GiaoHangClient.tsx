'use client'
// components/GiaoHangClient.tsx — v6.0
// Chỉ hiển thị bảng đơn hàng chờ giao — bỏ phần chuyến đã tạo

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function fVND(n: any) { return Number(n||0).toLocaleString('vi-VN')+'đ' }
function boDau(s: string) {
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

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
  donChuaGiao, donCanGiao, donHangMap,
  danhSachNVCuaHang, danhSachDoiTac,
  khachHangMap, user,
}: {
  giaoHangList:any[]; chiTietDonMap:Record<string,any[]>
  daGiaoMap:Record<string,Record<string,number>>
  donChuaGiao:any[]; donCanGiao:any[]; donHangMap:Record<string,any>
  danhSachNVCuaHang:any[]; danhSachDoiTac:any[]
  khachHangMap:Record<string,any>; user:UserSession
}) {
  const router = useRouter()
  const [trang,    setTrang]    = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editNgayDon,  setEditNgayDon]  = useState<string|null>(null)
  const [ghiChuNgay,   setGhiChuNgay]  = useState('')
  const [ngayGiaoMoi, setNgayGiaoMoi]  = useState('')
  const [loadingNgay, setLoadingNgay]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)

  // Form tạo chuyến
  const [searchDon,     setSearchDon]     = useState('')
  const [donChon,       setDonChon]       = useState<any>(null)
  const [showDon,       setShowDon]       = useState(false)
  const [ngayGiao,      setNgayGiao]      = useState(new Date().toISOString().slice(0,16))
  const [ghiChuChuyen,  setGhiChuChuyen]  = useState('')
  const [danhSachNguoi, setDanhSachNguoi] = useState<Nguoi[]>([{...NGUOI_MAC_DINH}])
  const [danhSachSP,    setDanhSachSP]    = useState<SPGiao[]>([])

  // Helpers
  function getTenKH(maKH:string, tenTuDon?:string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }
  function getDiaChi(don:any) {
    if (!don) return '—'
    const maKH = don['Mã KH']||''
    return don['Địa chỉ giao'] || don['_diaChiKH'] || khachHangMap[maKH]?.['Địa chỉ'] || '—'
  }
  function getThongTinSP(maDon:string) {
    const ct = chiTietDonMap[maDon] || []
    // Chỉ lấy SP chưa hủy
    const hl = ct.filter((c:any) => (c['Tên SP (ghi nhanh)']||c['Mã SP']) && c['Trạng thái SP'] !== 'Huỷ')
    if (hl.length===0) return { tenSP:'—', tongSP:0, coNhieu:false }
    const tenDau = hl[0]['Tên SP (ghi nhanh)'] || hl[0]['Mã SP'] || '—'
    const tongSL = hl.reduce((s:number,c:any)=>s+Number(c['Số lượng']||1),0)
    return { tenSP:tenDau, tongSP:tongSL, coNhieu:hl.length>1 }
  }

  // Hiện cả "Chờ giao" và "Đang giao" còn SP chưa giao hết (đã lọc từ page.tsx)
  const donHienThi    = donCanGiao
  const tongTrang     = Math.max(1,Math.ceil(donHienThi.length/SO_DONG))
  const trangHT       = Math.min(trang,tongTrang)
  const danhSachTrang = donHienThi.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  // Dropdown tìm đơn
  const donLoc = useMemo(()=>{
    // donCanGiao đã gồm cả "Chờ giao" và "Đang giao" còn SP
    const src = donCanGiao
    if (!searchDon.trim()) return src.slice(0,12)
    const q = boDau(searchDon)
    const qRaw = searchDon.toLowerCase()
    return src.filter((d:any)=>{
      const tenKH  = boDau(d['_tenKH']||d['Tên khách hàng']||'')
      const maDon  = boDau(d['Mã đơn hàng']||'')
      const sdt    = (d['_sdtKH']||'').replace(/\D/g,'')
      const diaChi = boDau(d['_diaChiKH']||'')
      return maDon.includes(q)||tenKH.includes(q)||sdt.includes(qRaw.replace(/\D/g,''))||diaChi.includes(q)
    }).slice(0,12)
  },[searchDon,donCanGiao])

  function chonDon(don:any) {
    setDonChon(don); setSearchDon(don['Mã đơn hàng']); setShowDon(false)
    const ct     = chiTietDonMap[don['Mã đơn hàng']] || []
    const daGiao = daGiaoMap[don['Mã đơn hàng']] || {}
    // Tính tổng đã giao cho đơn này (daGiaoMap key = 'Mã chi tiết đơn' từ bảng chi tiết giao)
    const tongDaGiao = Object.values(daGiao).reduce((s:number,v:any)=>s+Number(v||0),0)
    const tongSPDon  = (ct||[]).reduce((s:number,c:any)=>s+Number(c['Số lượng']||1),0)
    // Phân bổ số lượng đã giao theo tỉ lệ nếu không map được chính xác
    setDanhSachSP(ct.filter((c:any)=>(c['Tên SP (ghi nhanh)']||c['Mã SP']) && c['Trạng thái SP']!=='Huỷ').map((c:any)=>{
      const sl=Number(c['Số lượng']||1)
      const key1=c['Mã chi tiết']||''
      const key2=c['Tên SP (ghi nhanh)']||''
      const key3=c['Mã SP']||''
      const daDG=daGiao[key1]||daGiao[key2]||daGiao[key3]||0
      const con=Math.max(0,sl-daDG)
      return { maChiTiet:c['Mã chi tiết']||'', tenSP:c['Tên SP (ghi nhanh)']||c['Mã SP']||'—', soLuongDon:sl, daGiao:daDG, soLuongGiao:con, checked:con>0, ghiChu:'' }
    }))
  }

  function taoChuyen_TuDon(don:any) {
    setDonChon(don); setSearchDon(don['Mã đơn hàng'])
    const ct=chiTietDonMap[don['Mã đơn hàng']]||[]; const daGiao=daGiaoMap[don['Mã đơn hàng']]||{}
    setDanhSachSP(ct.filter((c:any)=>(c['Tên SP (ghi nhanh)']||c['Mã SP']) && c['Trạng thái SP']!=='Huỷ').map((c:any)=>{
      const key=c['Mã chi tiết']||c['Tên SP (ghi nhanh)']||c['Mã SP']
      const sl=Number(c['Số lượng']||1); const daDG=daGiao[key]||0; const con=Math.max(0,sl-daDG)
      return { maChiTiet:c['Mã chi tiết']||'', tenSP:c['Tên SP (ghi nhanh)']||c['Mã SP']||'—', soLuongDon:sl, daGiao:daDG, soLuongGiao:con, checked:con>0, ghiChu:'' }
    }))
    setShowForm(true)
  }

  async function luuNgayHenGiao(maDon: string) {
    setLoadingNgay(true)
    try {
      const don = donHangMap[maDon]
      const rowId = don?.['Id'] || don?.['id']
      if (!rowId) throw new Error('Không tìm thấy ID đơn')
      await fetch('/api/don-hang', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          id: rowId,
          'Ngày hẹn giao': ngayGiaoMoi || null,
          ...(ghiChuNgay.trim() ? {'Ghi chú': ghiChuNgay.trim()} : {}),
        }),
      })
      setEditNgayDon(null); setGhiChuNgay('')
      router.refresh()
    } catch(e:any) { alert('Lỗi: ' + e.message) }
    finally { setLoadingNgay(false) }
  }

  function getDSTK(hinhThuc:string, txt:string) {
    const list=hinhThuc==='Đối tác'?danhSachDoiTac:danhSachNVCuaHang
    if (!txt.trim()) return list.slice(0,10)
    const q=boDau(txt)
    return list.filter((nv:any)=>
      boDau(nv['Họ tên']||'').includes(q) ||
      boDau(nv['Mã NV']||'').includes(q)
    ).slice(0,10)
  }
  function themNguoi() { setDanhSachNguoi(prev=>[...prev,{id:Date.now().toString(),hinhThuc:'NV cửa hàng',maNV:'',tenNV:'',vaiTroNocoDB:'',vaiTroChuyen:'Vận chuyển',ghiChu:'',showSearch:false,searchText:''}]) }
  function xoaNguoi(id:string) { setDanhSachNguoi(prev=>prev.filter(n=>n.id!==id)) }
  function updN(id:string,k:keyof Nguoi,v:any) { setDanhSachNguoi(prev=>prev.map(n=>n.id===id?{...n,[k]:v}:n)) }
  function chonNguoi(nid:string,nv:any) { setDanhSachNguoi(prev=>prev.map(n=>n.id===nid?{...n,maNV:nv['Mã NV']||'',tenNV:nv['Họ tên']||'',vaiTroNocoDB:nv['Vai trò']||'',hinhThuc:(nv['Mã NV']||'').startsWith('DT-')?'Đối tác':'NV cửa hàng',searchText:nv['Họ tên']||'',showSearch:false}:n)) }
  function updSP(idx:number,k:keyof SPGiao,v:any) { setDanhSachSP(prev=>prev.map((sp,i)=>i===idx?{...sp,[k]:v}:sp)) }
  function resetForm() {
    setSearchDon('');setDonChon(null);setGhiChuChuyen('')
    setNgayGiao(new Date().toISOString().slice(0,16))
    setDanhSachNguoi([{...NGUOI_MAC_DINH}]);setDanhSachSP([])
  }

  async function luuChuyen() {
    if (!donChon) { setMsg('Vui lòng chọn đơn hàng');setMsgOk(false);return }
    const nguoiHL=danhSachNguoi.filter(n=>n.tenNV.trim())
    if (!nguoiHL.length) { setMsg('Vui lòng nhập ít nhất 1 người giao');setMsgOk(false);return }
    const spGiao=danhSachSP.filter(sp=>sp.checked&&sp.soLuongGiao>0)
    setLoading(true);setMsg('')
    try {
      const res=await fetch('/api/giao-hang',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          maDon:donChon['Mã đơn hàng'],ngayGiao,ghiChuChuyen,
          danhSachNguoi:nguoiHL.map(n=>({hinhThuc:n.hinhThuc,maNV:n.maNV,tenNV:n.tenNV,vaiTroChuyen:n.vaiTroChuyen})),
          danhSachSP:spGiao.map(sp=>({maChiTiet:sp.maChiTiet,tenSP:sp.tenSP,soLuongGiao:sp.soLuongGiao,ghiChu:sp.ghiChu})),
        }),
      })
      const data=await res.json()
      if (!res.ok) throw new Error(data.message||'Lỗi')
      setMsg(`✅ Đã tạo chuyến — ${data.soNguoi} người, ${data.soSP} SP`);setMsgOk(true)
      resetForm();setShowForm(false);router.refresh()
    } catch(err:any) { setMsg('❌ '+(err.message||'Lỗi'));setMsgOk(false) }
    finally { setLoading(false);setTimeout(()=>setMsg(''),6000) }
  }

  const spDaChon=danhSachSP.filter(sp=>sp.checked).length

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
        <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{(trangHT-1)*SO_DONG+1}–{Math.min(trangHT*SO_DONG,donHienThi.length)} / {donHienThi.length} đơn</span>
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
        .gh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-tao{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer;}
        .gh-t th,.gh-t td{padding:8px 10px;}
        .gh-t tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;}
        .modal-gh{background:white;border-radius:12px;padding:24px;width:100%;max-width:680px;margin:auto;}
        .db{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:260px;overflow-y:auto;}
        .di{padding:9px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;}.di:last-child{border-bottom:none;}
        .nc{border:1px solid var(--border);border-radius:10px;padding:13px;background:#FAFBFD;margin-bottom:8px;}
        .sp-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;border:1px solid #E5E7EB;margin-bottom:5px;background:white;font-size:13px;}
        .sec-title{font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;}
        .btn-tao-chuyen{position:relative;display:inline-block;}
        .btn-tao-chuyen:hover::after{content:'Tạo chuyến giao';position:absolute;bottom:calc(100% + 4px);right:0;background:#1F2937;color:white;font-size:11px;padding:3px 8px;border-radius:4px;white-space:nowrap;pointer-events:none;z-index:10;}
        @media(max-width:1100px){.col-sp{display:none;}}
        @media(max-width:900px){.col-dia{display:none;}}
        @media(max-width:700px){.col-tt{display:none;}}
      `}</style>

      <div className="gh-hdr">
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🚚 Giao hàng</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {donCanGiao.length} đơn chờ giao · hình thức "Giao hàng cho khách"
          </p>
        </div>
        <button className="btn-tao" onClick={()=>setShowForm(true)}>🚚 Tạo chuyến giao</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Bảng đơn chờ giao */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="gh-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày hẹn giao</th>
                <th style={{textAlign:'left',fontWeight:700}}>Khách hàng</th>
                <th className="col-dia" style={{textAlign:'left',fontWeight:700}}>Địa chỉ</th>
                <th className="col-sp" style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                <th className="col-tt" style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                <th style={{width:'60px'}}></th>
              </tr>
            </thead>
            <tbody>
              {danhSachTrang.length===0?(
                <tr><td colSpan={7} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có đơn nào chờ giao</td></tr>
              ):danhSachTrang.map((don:any,i:number)=>{
                const maKH   = don['Mã KH']||''
                const tenKH  = don['_tenKH']||getTenKH(maKH,don['Tên khách hàng'])
                const sdt    = don['_sdtKH']||khachHangMap[maKH]?.['Số điện thoại']||''
                const diaChi = don['_diaChiKH']||getDiaChi(don)
                const {tenSP,tongSP,coNhieu} = getThongTinSP(don['Mã đơn hàng'])
                const ngayHen = don['Ngày hẹn giao']
                const qua    = ngayHen && new Date(ngayHen) < new Date()
                const ttColor: Record<string,{bg:string,c:string}> = {
                  'Chờ giao':  {bg:'#FEF3C7',c:'#92400E'},
                  'Đang giao': {bg:'#DBEAFE',c:'#1E40AF'},
                }
                const ttC = ttColor[don['Trạng thái']]||{bg:'#F3F4F6',c:'#374151'}
                return (
                  <tr key={don['Mã đơn hàng']} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:700,color:'var(--primary)',whiteSpace:'nowrap'}}>
                      <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`} style={{color:'var(--primary)',textDecoration:'none'}}>{don['Mã đơn hàng']}</Link>
                    </td>
                    <td style={{whiteSpace:'nowrap'}}>
                      {editNgayDon===don['Mã đơn hàng'] ? (
                        <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                          <input type="date" value={ngayGiaoMoi}
                            onChange={e=>setNgayGiaoMoi(e.target.value)}
                            style={{padding:'2px 6px',border:'1px solid var(--primary)',borderRadius:'4px',fontSize:'11px',width:'110px'}}/>
                          <input type="text" value={ghiChuNgay} onChange={e=>setGhiChuNgay(e.target.value)}
                            placeholder="Ghi chú (vd: sáng 9-10h)..."
                            style={{padding:'2px 6px',border:'1px solid #E5E7EB',borderRadius:'4px',fontSize:'11px',width:'130px'}}/>
                          <button onClick={()=>luuNgayHenGiao(don['Mã đơn hàng'])} disabled={loadingNgay}
                            style={{padding:'2px 6px',borderRadius:'4px',border:'none',background:'var(--primary)',color:'white',fontSize:'11px',cursor:'pointer'}}>✓</button>
                          <button onClick={()=>setEditNgayDon(null)}
                            style={{padding:'2px 6px',borderRadius:'4px',border:'1px solid #E5E7EB',background:'white',fontSize:'11px',cursor:'pointer'}}>✕</button>
                        </div>
                      ) : (
                        <div style={{display:'flex',flexDirection:'column',gap:'2px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
                            {ngayHen?(
                              <span style={{color:qua?'#DC2626':'#374151',fontWeight:qua?700:400,fontSize:'12px',whiteSpace:'nowrap'}}>
                                {qua&&'⚠️ '}{new Date(ngayHen).toLocaleDateString('vi-VN')}
                              </span>
                            ):<span style={{color:'#F59E0B',fontWeight:700,fontSize:'12px'}}>⏳ Chưa hẹn</span>}
                            <button onClick={()=>{
                              setEditNgayDon(don['Mã đơn hàng'])
                              setNgayGiaoMoi(ngayHen?new Date(ngayHen).toISOString().split('T')[0]:'')
                              setGhiChuNgay(don['Ghi chú']||'')
                            }} title="Sửa ngày hẹn giao"
                              style={{background:'none',border:'none',cursor:'pointer',fontSize:'11px',color:'#9CA3AF',padding:'0 2px'}}>✏️</button>
                          </div>
                          {don['Ghi chú']&&(
                            <div style={{fontSize:'11px',color:'#6B7280',fontStyle:'italic',maxWidth:'130px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={don['Ghi chú']}>
                              {don['Ghi chú']}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{fontWeight:600}}>{tenKH}</div>
                      {sdt&&<div style={{fontSize:'11px',color:'var(--text-muted)'}}>📞 {sdt}</div>}
                    </td>
                    <td className="col-dia" style={{fontSize:'12px',color:'var(--text-secondary)',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={diaChi}>{diaChi}</td>
                    <td className="col-sp" style={{maxWidth:'160px'}}>
                      <div style={{fontSize:'12px',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={tenSP}>{tenSP}</div>
                      {coNhieu&&<div style={{fontSize:'11px',color:'#6B7280'}}>tổng {tongSP} SP</div>}
                      {don['_conLai']>0&&(
                        <div style={{fontSize:'11px',color:'#DC2626',fontWeight:600}}>⏳ Còn {don['_conLai']} SP chưa giao</div>
                      )}
                    </td>
                    <td className="col-tt" style={{textAlign:'center'}}>
                      {(()=>{
                        // Ưu tiên _trangThaiTinh, nếu không có dùng logic local
                        const ttBase = don['_trangThaiTinh'] || don['Trạng thái'] || 'Chờ giao'
                        // Nếu đã giao 1 phần → hiện "Đã giao 1 phần", nếu giao hết → hiện "Đang giao"
                        const ttHienThi = (don['_daGiao1Phan'] && don['_conLai'] > 0) ? 'Đã giao 1 phần' : ttBase
                        const ttColors: Record<string,{bg:string,c:string}> = {
                          'Chờ giao':         {bg:'#FEF3C7',c:'#92400E'},
                          'Đang giao 1 phần': {bg:'#E0F2FE',c:'#0369A1'},
                          'Đang giao':        {bg:'#DBEAFE',c:'#1E40AF'},
                          'Đã giao 1 phần':   {bg:'#ECFDF5',c:'#059669'},
                          'Đã giao':          {bg:'#D1FAE5',c:'#065F46'},
                          'Huỷ':              {bg:'#FEE2E2',c:'#991B1B'},
                        }
                        const c2 = ttColors[ttHienThi]||{bg:'#F3F4F6',c:'#374151'}
                        return <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:c2.bg,color:c2.c,whiteSpace:'nowrap'}}>{ttHienThi}</span>
                      })()}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span className="btn-tao-chuyen">
                        <button onClick={()=>taoChuyen_TuDon(don)}
                          style={{padding:'5px 10px',borderRadius:'6px',border:'none',background:'#0F6B3B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
                          🚚
                        </button>
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <PhanTrang/>
      </div>

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
                      onFocus={()=>setShowDon(true)} onBlur={()=>setTimeout(()=>setShowDon(false),250)}/>
                    {showDon&&(
                      <div className="db">
                        {donLoc.length===0
                          ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>Không có đơn cần giao</div>
                          :donLoc.map((don:any)=>{
                            const tenKHDon=don['_tenKH']||getTenKH(don['Mã KH'],don['Tên khách hàng'])
                            const sdtDon=don['_sdtKH']||''
                            const diaChiDon=don['_diaChiKH']||getDiaChi(don)
                            const daGiao1Phan=don['_daGiao1Phan']||false
                            return (
                              <div key={don['Mã đơn hàng']} className="di"
                                style={{opacity:daGiao1Phan?0.75:1,background:daGiao1Phan?'#F0F9FF':'white'}}
                                onMouseDown={e=>{e.preventDefault();chonDon(don)}}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                                  <span style={{fontWeight:700,color:'var(--primary)'}}>{don['Mã đơn hàng']}</span>
                                  <div style={{display:'flex',gap:'4px'}}>
                                    {daGiao1Phan&&<span style={{fontSize:'10px',background:'#DBEAFE',color:'#1E40AF',padding:'1px 6px',borderRadius:'10px',fontWeight:700}}>Đã giao {don['_tongDaGiao']}/{don['_tongSP']} SP</span>}
                                    <span style={{fontSize:'11px',background:daGiao1Phan?'#DBEAFE':'#FEF3C7',color:daGiao1Phan?'#1E40AF':'#92400E',padding:'1px 6px',borderRadius:'10px',fontWeight:600}}>{don['Trạng thái']}</span>
                                  </div>
                                </div>
                                <div style={{fontSize:'12px',fontWeight:600,marginTop:'2px'}}>{tenKHDon}{sdtDon&&<span style={{fontWeight:400,color:'#6B7280'}}> · {sdtDon}</span>}</div>
                                <div style={{fontSize:'11px',color:'#6B7280',marginTop:'1px'}}>📍 {diaChiDon}</div>
                                <div style={{fontSize:'11px',color:'#DC2626',fontWeight:600}}>Còn thu: {fVND(don['Còn phải thu'])}</div>
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
                      <div style={{color:'#DC2626',fontWeight:600}}>Còn thu: {fVND(donChon['Còn phải thu'])}</div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ngày giờ giao</label>
                  <input className="input" type="datetime-local" value={ngayGiao} onChange={e=>setNgayGiao(e.target.value)}/>

                </div>
              </div>
            </div>

            {/* ② SP giao */}
            {danhSachSP.length>0&&(
              <div style={{marginBottom:'14px',padding:'14px',background:'#F8FAFC',borderRadius:'10px',border:'1px solid #E5E7EB'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                  <div className="sec-title" style={{margin:0}}>② Sản phẩm giao lần này</div>
                  <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                    <button onMouseDown={e=>{e.preventDefault();
                      const tatCaDaChon = danhSachSP.filter(sp=>!sp.checked&&sp.soLuongDon>sp.daGiao).length===0
                      setDanhSachSP(prev=>prev.map(sp=>({...sp,checked:!tatCaDaChon&&sp.soLuongDon>sp.daGiao})))
                    }} style={{padding:'3px 10px',borderRadius:'5px',border:'1px solid var(--primary)',background:'white',color:'var(--primary)',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>
                      {danhSachSP.filter(sp=>!sp.checked&&sp.soLuongDon>sp.daGiao).length===0?'Bỏ chọn tất cả':'Chọn tất cả'}
                    </button>
                    <span style={{fontSize:'12px',color:'var(--primary)',fontWeight:600}}>{spDaChon}/{danhSachSP.length} SP</span>
                  </div>
                </div>
                {danhSachSP.map((sp,idx)=>{
                  const het=sp.soLuongDon<=sp.daGiao
                  return (
                    <div key={idx} className="sp-row" style={{
                      opacity: het?0.45:1,
                      background: het?'#F3F4F6':'white',
                      border: het?'1px solid #E5E7EB':'1px solid #E5E7EB',
                    }}>
                      <input type="checkbox" checked={sp.checked&&!het} disabled={het}
                        onChange={e=>updSP(idx,'checked',e.target.checked)}
                        style={{width:'16px',height:'16px',accentColor:'var(--primary)',cursor:het?'not-allowed':'pointer'}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontWeight:sp.checked&&!het?600:400,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:het?'#9CA3AF':'inherit'}}>
                          {sp.tenSP}
                          {het&&<span style={{marginLeft:'8px',fontSize:'10px',background:'#D1FAE5',color:'#065F46',padding:'1px 6px',borderRadius:'10px',fontWeight:700}}>✅ Đã giao đủ</span>}
                        </div>
                        <div style={{fontSize:'11px',color:'#6B7280'}}>
                          ĐH: {sp.soLuongDon} · Đã giao: {sp.daGiao}{!het&&<span style={{color:'#DC2626',fontWeight:600}}> · Còn: {sp.soLuongDon-sp.daGiao}</span>}
                        </div>
                      </div>
                      {sp.checked&&!het&&(
                        <div style={{display:'flex',alignItems:'center',gap:'5px'}}>
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
                      <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)'}}>Người {idx+1}{nguoi.tenNV&&<span style={{marginLeft:'8px',fontWeight:400,color:'var(--primary)'}}>— {nguoi.tenNV}</span>}</span>
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
                              <div className="di" onMouseDown={e=>{e.preventDefault();updN(nguoi.id,'showSearch',false)}} style={{background:'#FEF9C3',color:'#92400E',fontSize:'12px'}}>✏️ Dùng tên: <strong>"{nguoi.tenNV}"</strong></div>
                            )}
                            {dsTK.length===0
                              ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>
                                Không tìm thấy ({nguoi.hinhThuc==='Đối tác'?danhSachDoiTac.length:danhSachNVCuaHang.length} người)
                              </div>
                              :dsTK.map((nv:any,idx:number)=>(
                                <div key={`${nv['Mã NV']}-${idx}`} className="di" onMouseDown={e=>{e.preventDefault();chonNguoi(nguoi.id,nv)}}>
                                  <div style={{fontWeight:600}}>{nv['Họ tên']} <span style={{fontSize:'11px',padding:'1px 6px',borderRadius:'10px',background:nv['Mã NV']?.startsWith('DT-')?'#FEF3C7':'#DBEAFE',color:nv['Mã NV']?.startsWith('DT-')?'#92400E':'#1E40AF',fontWeight:700}}>{nv['Mã NV']}</span></div>
                                  <div style={{fontSize:'11px',color:'#6B7280'}}>Vai trò: {nv['Vai trò']||'—'}</div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>

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
