'use client'
// components/ChiTraNVClient.tsx v4
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){
  if(!s)return'—'
  try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}
  catch{return s}
}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

export default function ChiTraNVClient({
  nvList, doiSoatList, giaoHangList, donHangList, khachHangList,
  chamCongList, tamUngList, thuongKhacList, chiTraList, user
}:{
  nvList:any[]; doiSoatList:any[]; giaoHangList:any[]; donHangList:any[];
  khachHangList:any[]; chamCongList:any[]; tamUngList:any[];
  thuongKhacList:any[]; chiTraList:any[]; user:UserSession
}) {
  const router = useRouter()
  const isOwner = user.vaiTro === 'Chủ cửa hàng'
  const now = new Date()
  const [tab, setTab] = useState<'dt'|'nv'>('dt')
  const [thangChon] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`)
  const [expandNV, setExpandNV] = useState<string|null>(null)
  const [modalNV, setModalNV] = useState<any>(null)
  const [modalChuyen, setModalChuyen] = useState<any>(null)
  const [ngayChi, setNgayChi] = useState(now.toISOString().split('T')[0])
  const [editCpVC, setEditCpVC] = useState(0)
  const [editCpLap, setEditCpLap] = useState(0)
  const [editThuong, setEditThuong] = useState(0)
  const [hinhThucTT, setHinhThucTT] = useState('Tiền mặt')
  const [ghiChu, setGhiChu] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [filterDT, setFilterDT] = useState('Tất cả')
  const [filterNV, setFilterNV] = useState('Tất cả')
  const [searchDT, setSearchDT] = useState('')
  const [searchNV, setSearchNV] = useState('')
  const [tuNgay, setTuNgay] = useState(()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`})
  const [denNgay, setDenNgay] = useState(()=>new Date().toISOString().split('T')[0])
  const [popupDS, setPopupDS] = useState<any>(null)

  function showMsg(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  const ghMap = useMemo(()=>{const m:Record<string,string>={};giaoHangList.forEach(g=>{if(g['Mã giao hàng'])m[g['Mã giao hàng']]=g['Mã đơn hàng']||''});return m},[giaoHangList])
  const donMap = useMemo(()=>{const m:Record<string,any>={};donHangList.forEach(d=>{if(d['Mã đơn hàng'])m[d['Mã đơn hàng']]=d});return m},[donHangList])
  const khMap = useMemo(()=>{const m:Record<string,any>={};khachHangList.forEach(k=>{if(k['Mã KH'])m[k['Mã KH']]=k});return m},[khachHangList])

  const nvActive = useMemo(()=>nvList.filter(n=>n['Trạng thái']!=='Nghỉ việc'),[nvList])
  const nvCuaHang = useMemo(()=>nvActive.filter(n=>n['Loại']==='Nhân viên'),[nvActive])
  const doiTac = useMemo(()=>nvActive.filter(n=>n['Loại']==='Đối tác'),[nvActive])

  const bangLuongNV = useMemo(()=>{
    return nvCuaHang.map(nv=>{
      const maNV=nv['Mã nhân viên']||''
      const lcb=Number(nv['Lương cơ bản']||0)
      const pctDS=Number(nv['% Thưởng DS']||0)
      const hinhThucLuong=nv['Hình thức lương']||'Theo tháng'
      const ngayPhep=Number(nv['Ngày phép/tháng']||0)
      const cc=chamCongList.find(c=>c['Mã NV']===maNV&&(c['Tháng']||'').startsWith(thangChon))
      const ngayChuaN=Number(cc?.['Tổng ngày công chuẩn']||26)
      const ngayThucTe=Number(cc?.['Số ngày công thực tế']||0)
      let luongTN=0
      if(hinhThucLuong==='Theo ngày') luongTN=lcb*ngayThucTe
      else{const vp=Math.max(0,(ngayChuaN-ngayThucTe)-ngayPhep);luongTN=Math.max(0,lcb-vp*(lcb/ngayChuaN))}
      const donThang=donHangList.filter(d=>d['Mã NV']===maNV&&(d['Ngày bán']||'').startsWith(thangChon)&&d['Trạng thái']!=='Huỷ')
      const soDon=donThang.length
      const tongDS=donThang.reduce((s,d)=>s+Number(d['Tổng tiền đơn']||0),0)
      const thuongDS=Math.round(tongDS*pctDS/100)
      const doiSoatThang=doiSoatList.filter(ds=>{
        if(ds['Mã NV/Đối tác']!==maNV||ds['Tình trạng đối soát']!=='Đã đối soát') return false
        const ngay=(ds['Ngày đối soát']||'').split('T')[0]
        return ngay>=tuNgay&&ngay<=denNgay
      })
      const soChuyen=doiSoatThang.length
      const tongCPChuyen=doiSoatThang.reduce((s,ds)=>s+Number(ds['Chi phí VC']||0)+Number(ds['Chi phí lắp đặt']||0)+Number(ds['Thưởng chuyến']||0),0)
      const tkThang=thuongKhacList.filter(t=>t['Mã nhân viên']===maNV&&(t['Tháng']||'').startsWith(thangChon))
      const tongThuongKhac=tkThang.reduce((s,t)=>s+Number(t['Số tiền']||0),0)
      const tuThang=tamUngList.filter(t=>t['Mã NV/đối tác']===maNV&&(t['Tháng']||'').startsWith(thangChon))
      const tongTamUng=tuThang.reduce((s,t)=>s+Number(t['Số tiền']||0),0)
      const tongChiTra=luongTN+thuongDS+tongCPChuyen+tongThuongKhac-tongTamUng
      const daChiTra=chiTraList.find(ct=>ct['Mã NV/đối tác']===maNV&&(ct['Tháng']||'').startsWith(thangChon)&&(ct['Trạng thái']==='Đã trả'||ct['Trạng thái']==='Đã duyệt'))
      return {nv,maNV,lcb,hinhThucLuong,ngayPhep,ngayChuaN,ngayThucTe,luongTN,soDon,tongDS,pctDS,thuongDS,soChuyen,tongCPChuyen,doiSoatThang,tongThuongKhac,tongTamUng,tongChiTra,daChiTra}
    })
  },[nvCuaHang,thangChon,tuNgay,denNgay,chamCongList,donHangList,doiSoatList,thuongKhacList,tamUngList,chiTraList])

  const chuyenDoiTac = useMemo(()=>{
    return doiSoatList.filter(ds=>{
      const maNV=ds['Mã NV/Đối tác']||''
      if(!doiTac.some(d=>d['Mã nhân viên']===maNV)) return false
      if(ds['Tình trạng đối soát']!=='Đã đối soát') return false
      if(filterDT!=='Tất cả'&&maNV!==filterDT) return false
      const ngay=(ds['Ngày đối soát']||'').split('T')[0]
      return ngay>=tuNgay&&ngay<=denNgay
    }).map(ds=>{
      const maNV=ds['Mã NV/Đối tác']||''
      const dtInfo=doiTac.find(d=>d['Mã nhân viên']===maNV)
      const maGH=ds['Mã giao hàng']||''
      const maDon=ghMap[maGH]||'—'
      const don=donMap[maDon]
      const kh=khMap[don?.['Mã KH']||'']
      const tenKH=kh?.['Tên khách hàng']||'—'
      const diaChi=kh?.['Địa chỉ']||'—'
      const cpVC=Number(ds['Chi phí VC']||0)
      const cpLap=Number(ds['Chi phí lắp đặt']||0)
      const thuong=Number(ds['Thưởng chuyến']||0)
      const tong=cpVC+cpLap+thuong
      return {ds,maNV,dtInfo,maGH,maDon,tenKH,diaChi,cpVC,cpLap,thuong,tong}
    })
  },[doiSoatList,doiTac,thangChon,tuNgay,denNgay,filterDT,ghMap,donMap,khMap])

  const chuyenDTFiltered = useMemo(()=>{
    if(!searchDT.trim()) return chuyenDoiTac
    const q=boDau(searchDT)
    return chuyenDoiTac.filter(c=>boDau(c.dtInfo?.['Họ và Tên']||'').includes(q)||boDau(c.maNV).includes(q)||boDau(c.tenKH).includes(q)||boDau(c.maDon).includes(q))
  },[chuyenDoiTac,searchDT])

  const nvHienThi = useMemo(()=>{
    let r=isOwner?bangLuongNV:bangLuongNV.filter(b=>b.maNV===(user as any).maNV)
    if(filterNV!=='Tất cả') r=r.filter(b=>b.maNV===filterNV)
    if(searchNV.trim()){const q=boDau(searchNV);r=r.filter(b=>boDau(b.nv['Họ và Tên']||'').includes(q)||boDau(b.maNV).includes(q))}
    return r
  },[bangLuongNV,filterNV,searchNV,isOwner,user])

  const tongNVChuaTT=bangLuongNV.filter(b=>!b.daChiTra&&b.tongChiTra>0).length
  const tongDTChuaTT=chuyenDoiTac.filter(c=>!c.ds['Đã chi trả']).length
  const tongChiNV=bangLuongNV.reduce((s,b)=>s+b.tongChiTra,0)
  const tongChiDT=chuyenDoiTac.reduce((s,c)=>s+c.tong,0)

  async function xacNhanTTNV(b:any){
    setLoading(true)
    try {
      const res=await fetch('/api/chi-tra-nv',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({thang:thangChon,maNV:b.maNV,tenNV:b.nv['Họ và Tên']||'',vaiTro:b.nv['Vai trò']||'Nhân viên',luongCoBan:b.lcb,soNgayCong:b.ngayThucTe,luongThucNhan:b.luongTN,soDonBan:b.soDon,tongDoanhSo:b.tongDS,pctThuongDS:b.pctDS,thuongDoanhSo:b.thuongDS,soChuyenGiao:b.soChuyen,tongCPChuyen:b.tongCPChuyen,thuongKhac:b.tongThuongKhac,tamUng:b.tongTamUng,tongChiTra:b.tongChiTra,hinhThucTT,ghiChu,ngayChi})})
      if(!res.ok) throw new Error((await res.json()).message)
      showMsg(`✅ Đã chi trả cho ${b.nv['Họ và Tên']}`)
      setModalNV(null);setGhiChu('');router.refresh()
    } catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function chiChuyenDT(c:any){
    setLoading(true)
    try {
      const res=await fetch('/api/chi-tra-nv',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:modalChuyen.ds['Id']||modalChuyen.ds['id'],table:'doi-soat','Đã chi trả':true,hinhThucTT,ghiChu,cpVC:editCpVC,cpLap:editCpLap,thuong:editThuong,ngayChi})})
      if(!res.ok) throw new Error((await res.json()).message)
      showMsg(`✅ Đã chi ${fVND(c.tong)}đ cho ${c.dtInfo?.['Họ và Tên']||c.maNV}`)
      setModalChuyen(null);setGhiChu('');router.refresh()
    } catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  // Render modal hình thức thanh toán + ngày (dùng chung)
  function renderNgayHinhThuc(color='var(--primary)'){
    return (
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
        <div>
          <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>📅 Ngày chi trả</label>
          <input className="input" type="date" value={ngayChi} onChange={e=>setNgayChi(e.target.value)}/>
          <div style={{fontSize:'10px',color:'#9CA3AF',marginTop:'2px'}}>Mặc định: hôm nay</div>
        </div>
        <div>
          <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Hình thức thanh toán</label>
          <div style={{display:'flex',gap:'6px'}}>
            {['Tiền mặt','Chuyển khoản'].map(ht=>(
              <button key={ht} onClick={()=>setHinhThucTT(ht)}
                style={{flex:1,padding:'7px 4px',borderRadius:'7px',border:'2px solid',
                  borderColor:hinhThucTT===ht?color:'var(--border)',
                  background:hinhThucTT===ht?'#F5F3FF':'white',
                  color:hinhThucTT===ht?color:'var(--text-secondary)',
                  fontWeight:hinhThucTT===ht?700:400,fontSize:'12px',cursor:'pointer'}}>
                {ht==='Tiền mặt'?'💵':'🏦'} {ht}
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .ct-t th,.ct-t td{padding:8px 10px;vertical-align:middle;}
        .ct-t tbody tr:hover td{background:#F0F4FF!important;}
        .sub-t th,.sub-t td{padding:6px 10px;font-size:12px;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>💸 Chi trả nhân viên</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>{tuNgay} → {denNgay}</p>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:'12px',color:'var(--text-secondary)',fontWeight:600}}>Từ:</span>
          <input type="date" value={tuNgay} onChange={e=>setTuNgay(e.target.value)} style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px'}}/>
          <span style={{fontSize:'12px',color:'var(--text-secondary)',fontWeight:600}}>Đến:</span>
          <input type="date" value={denNgay} onChange={e=>setDenNgay(e.target.value)} style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px'}}/>
          <button onClick={()=>{const n=new Date();setTuNgay(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`);setDenNgay(n.toISOString().split('T')[0])}}
            style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer',color:'var(--text-secondary)'}}>
            📅 Tháng này
          </button>
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Thống kê */}
      {isOwner&&<div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'16px'}}>
        {[
          {icon:'🤝',label:'Tổng chi đối tác',val:fVND(tongChiDT)+'đ',c:'#7C3AED'},
          {icon:'⏳',label:'Chưa thanh toán cho đối tác',val:tongDTChuaTT+' chuyến',c:'#DC2626'},
          {icon:'👥',label:'Tổng chi NV tháng',val:fVND(tongChiNV)+'đ',c:'#1e3a5f'},
          {icon:'⏳',label:'Chưa thanh toán cho nhân viên',val:tongNVChuaTT+' người',c:'#DC2626'},
        ].map(({icon,label,val,c})=>(
          <div key={label} className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
            <div style={{fontSize:'15px',fontWeight:800,color:c}}>{val}</div>
            <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
          </div>
        ))}
      </div>}

      {/* Tabs */}
      <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
        {[{id:'dt',label:'🤝 Đối tác',count:chuyenDoiTac.length},{id:'nv',label:'👥 Nhân viên',count:nvHienThi.length}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id as any)}
            style={{padding:'8px 20px',borderRadius:'8px',border:'2px solid',
              borderColor:tab===t.id?'var(--primary)':'var(--border)',
              background:tab===t.id?'var(--primary-pale)':'white',
              color:tab===t.id?'var(--primary)':'var(--text-secondary)',
              fontWeight:tab===t.id?700:400,fontSize:'13px',cursor:'pointer'}}>
            {t.label} <span style={{marginLeft:'4px',padding:'1px 6px',borderRadius:'10px',background:tab===t.id?'var(--primary)':'#E5E7EB',color:tab===t.id?'white':'#6B7280',fontSize:'11px'}}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* TAB ĐỐI TÁC */}
      {tab==='dt'&&(
        <div>
          <div className="card" style={{padding:'10px 14px',marginBottom:'12px'}}>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
              <input className="input" placeholder="🔍 Tìm tên ĐT, KH, mã đơn..." value={searchDT} onChange={e=>setSearchDT(e.target.value)} style={{flex:1,minWidth:'180px',maxWidth:'260px'}}/>
              <span style={{fontSize:'12px',fontWeight:600,color:'var(--text-secondary)'}}>Lọc:</span>
              {['Tất cả',...doiTac.map(d=>d['Mã nhân viên'])].map(ma=>{
                const dt=doiTac.find(d=>d['Mã nhân viên']===ma)
                const label=ma==='Tất cả'?'Tất cả':(dt?.['Họ và Tên']||ma)
                return (
                  <button key={ma} onClick={()=>setFilterDT(ma)}
                    style={{padding:'4px 12px',borderRadius:'20px',border:'1px solid',fontSize:'12px',cursor:'pointer',
                      borderColor:filterDT===ma?'#7C3AED':'var(--border)',
                      background:filterDT===ma?'#F5F3FF':'white',
                      color:filterDT===ma?'#7C3AED':'var(--text-secondary)',
                      fontWeight:filterDT===ma?700:400}}>{label}</button>
                )
              })}
            </div>
          </div>
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table className="ct-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700}}>Đối tác</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đối soát</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Tên KH</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Địa chỉ</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày đối soát</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>CP giao hàng</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày chi trả</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                    {isOwner&&<th style={{textAlign:'center',fontWeight:700,width:'80px'}}>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {chuyenDTFiltered.length===0?(
                    <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có chuyến nào</td></tr>
                  ):chuyenDTFiltered.map((c,i)=>{
                    const daChiTra=!!c.ds['Đã chi trả']
                    return (
                      <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                        <td>
                          <div style={{fontWeight:700,fontSize:'13px'}}>{c.dtInfo?.['Họ và Tên']||c.maNV}</div>
                          <div style={{fontSize:'11px',color:'#6B7280'}}>{c.maNV}</div>
                        </td>
                        <td>
                          <button onClick={()=>setPopupDS(c)} title={c.ds['Mã đối soát']||''}
                            style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:'6px',padding:'4px 8px',cursor:'pointer',color:'var(--primary)',fontWeight:700,fontSize:'11px',whiteSpace:'nowrap'}}>
                            {(c.ds['Mã đối soát']||'').slice(0,2)}...{(c.ds['Mã đối soát']||'').slice(-4)}
                          </button>
                        </td>
                        <td style={{fontSize:'12px',fontWeight:600,maxWidth:'130px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.tenKH}</td>
                        <td style={{fontSize:'11px',color:'#6B7280',maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.diaChi}</td>
                        <td style={{fontSize:'12px',color:'#6B7280',whiteSpace:'nowrap'}}>{fDate(c.ds['Ngày đối soát'])}</td>
                        <td style={{textAlign:'right',fontWeight:800,fontSize:'13px',color:'#7C3AED',whiteSpace:'nowrap'}}>{fVND(c.tong)}đ</td>
                        <td style={{fontSize:'12px',color:'#16A34A',whiteSpace:'nowrap',fontWeight:600}}>
                          {daChiTra&&c.ds['Ngày chi trả']?fDate(c.ds['Ngày chi trả']):<span style={{color:'#D1D5DB'}}>—</span>}
                        </td>
                        <td style={{textAlign:'center'}}>
                          {daChiTra
                            ?<span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#D1FAE5',color:'#065F46',whiteSpace:'nowrap'}}>✅ Đã chi</span>
                            :<span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#FEF3C7',color:'#92400E',whiteSpace:'nowrap'}}>⏳ Chưa chi</span>}
                        </td>
                        {isOwner&&<td style={{textAlign:'center'}}>
                          {!daChiTra&&(
                            <button onClick={()=>{setModalChuyen(c);setHinhThucTT('Tiền mặt');setGhiChu('');setEditCpVC(c.cpVC);setEditCpLap(c.cpLap);setEditThuong(c.thuong);setNgayChi(new Date().toISOString().split('T')[0])}}
                              style={{padding:'5px 10px',borderRadius:'6px',border:'none',background:'#7C3AED',color:'white',fontSize:'11px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                              💸 Chi
                            </button>
                          )}
                        </td>}
                      </tr>
                    )
                  })}
                </tbody>
                {isOwner&&chuyenDoiTac.length>0&&(
                  <tfoot>
                    <tr style={{background:'#F0F4FF',borderTop:'2px solid var(--border)'}}>
                      <td colSpan={5} style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:'13px'}}>Tổng chi đối tác:</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,color:'#7C3AED',fontSize:'15px',whiteSpace:'nowrap'}}>{fVND(tongChiDT)}đ</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB NHÂN VIÊN */}
      {tab==='nv'&&(
        <div>
          <div className="card" style={{padding:'10px 14px',marginBottom:'12px'}}>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
              <input className="input" placeholder="🔍 Tìm tên, mã NV..." value={searchNV} onChange={e=>setSearchNV(e.target.value)} style={{flex:1,minWidth:'180px',maxWidth:'260px'}}/>
              <select className="input" value={filterNV} onChange={e=>setFilterNV(e.target.value)} style={{width:'200px'}}>
                <option value="Tất cả">Tất cả nhân viên</option>
                {nvCuaHang.map(n=>(<option key={n['Mã nhân viên']} value={n['Mã nhân viên']}>{n['Họ và Tên']}</option>))}
              </select>
            </div>
          </div>
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table className="ct-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700,width:'24px'}}></th>
                    <th style={{textAlign:'left',fontWeight:700}}>Họ tên</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Lương TN</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Thưởng DS</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>CP chuyến</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Thưởng khác</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Tạm ứng</th>
                    <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Thực nhận</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                    {isOwner&&<th style={{textAlign:'center',fontWeight:700,width:'90px'}}>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {nvHienThi.length===0?(
                    <tr><td colSpan={10} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có dữ liệu</td></tr>
                  ):nvHienThi.map((b,i)=>{
                    const daTTRoi=!!b.daChiTra
                    const isExpand=expandNV===b.maNV
                    return (
                      <>
                        <tr key={b.maNV} style={{borderBottom:isExpand?'none':'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                          <td>
                            <button onClick={()=>setExpandNV(isExpand?null:b.maNV)}
                              style={{background:'none',border:'none',cursor:'pointer',fontSize:'13px',color:'var(--primary)',padding:'2px 4px'}}>
                              {isExpand?'▲':'▼'}
                            </button>
                          </td>
                          <td>
                            <div style={{fontWeight:700}}>{b.nv['Họ và Tên']||'—'}</div>
                            <div style={{fontSize:'11px',color:'#6B7280'}}>{b.maNV} · {b.soChuyen} chuyến · {b.soDon} đơn</div>
                          </td>
                          <td style={{textAlign:'right',fontSize:'12px',fontWeight:600}}>{fVND(b.luongTN)}đ</td>
                          <td style={{textAlign:'right',fontSize:'12px'}}>{b.thuongDS>0?<span style={{fontWeight:600,color:'#065F46'}}>{fVND(b.thuongDS)}đ</span>:<span style={{color:'#D1D5DB'}}>—</span>}</td>
                          <td style={{textAlign:'right',fontSize:'12px'}}>{b.tongCPChuyen>0?<span style={{fontWeight:600,color:'#1E40AF'}}>{fVND(b.tongCPChuyen)}đ</span>:<span style={{color:'#D1D5DB'}}>—</span>}</td>
                          <td style={{textAlign:'right',fontSize:'12px'}}>{b.tongThuongKhac>0?<span style={{fontWeight:600,color:'#D97706'}}>{fVND(b.tongThuongKhac)}đ</span>:<span style={{color:'#D1D5DB'}}>—</span>}</td>
                          <td style={{textAlign:'right',fontSize:'12px'}}>{b.tongTamUng>0?<span style={{fontWeight:600,color:'#DC2626'}}>-{fVND(b.tongTamUng)}đ</span>:<span style={{color:'#D1D5DB'}}>—</span>}</td>
                          <td style={{textAlign:'right',fontWeight:800,fontSize:'14px',color:'#1e3a5f',whiteSpace:'nowrap'}}>{fVND(b.tongChiTra)}đ</td>
                          <td style={{textAlign:'center'}}>
                            {daTTRoi
                              ?<div>
                                <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#D1FAE5',color:'#065F46',whiteSpace:'nowrap'}}>✅ Đã TT</span>
                                <div style={{fontSize:'10px',color:'#9CA3AF',marginTop:'2px'}}>{fDate(b.daChiTra['Ngày thanh toán'])}</div>
                              </div>
                              :b.tongChiTra>0
                                ?<span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#FEF3C7',color:'#92400E',whiteSpace:'nowrap'}}>⏳ Chưa TT</span>
                                :<span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:'#F3F4F6',color:'#9CA3AF'}}>— Không có</span>}
                          </td>
                          {isOwner&&<td style={{textAlign:'center'}}>
                            {!daTTRoi&&b.tongChiTra>0&&(
                              <button onClick={()=>{setModalNV(b);setHinhThucTT('Tiền mặt');setGhiChu('');setNgayChi(new Date().toISOString().split('T')[0])}}
                                style={{padding:'5px 10px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontSize:'11px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                                💸 Chi trả
                              </button>
                            )}
                            {daTTRoi&&<div style={{fontSize:'11px',color:'#6B7280'}}>{b.daChiTra['Hình thức TT']||'—'}</div>}
                          </td>}
                        </tr>
                        {isExpand&&(
                          <tr key={b.maNV+'_exp'} style={{background:'#F8FAFF'}}>
                            <td colSpan={isOwner?10:9} style={{padding:'0 0 10px 32px'}}>
                              {b.doiSoatThang.length===0
                                ?<div style={{fontSize:'12px',color:'#9CA3AF',padding:'12px 0',fontStyle:'italic'}}>Không có chuyến giao nào</div>
                                :<table className="sub-t" style={{width:'100%',borderCollapse:'collapse',marginTop:'6px'}}>
                                  <thead>
                                    <tr style={{background:'#EEF2FF',borderBottom:'1px solid #C7D2FE'}}>
                                      <th style={{textAlign:'left',fontWeight:700,color:'#4338CA'}}>Mã GH</th>
                                      <th style={{textAlign:'left',fontWeight:700,color:'#4338CA'}}>Mã đơn</th>
                                      <th style={{textAlign:'left',fontWeight:700,color:'#4338CA'}}>Tên KH</th>
                                      <th style={{textAlign:'left',fontWeight:700,color:'#4338CA'}}>Ngày đối soát</th>
                                      <th style={{textAlign:'right',fontWeight:700,color:'#4338CA'}}>CP VC</th>
                                      <th style={{textAlign:'right',fontWeight:700,color:'#4338CA'}}>CP lắp</th>
                                      <th style={{textAlign:'right',fontWeight:700,color:'#4338CA'}}>Thưởng</th>
                                      <th style={{textAlign:'right',fontWeight:700,color:'#4338CA'}}>Tổng</th>
                                      <th style={{textAlign:'left',fontWeight:700,color:'#4338CA'}}>Kết quả</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {b.doiSoatThang.map((ds:any,j:number)=>{
                                      const maGH=ds['Mã giao hàng']||''
                                      const maDon=ghMap[maGH]||'—'
                                      const kh=khMap[donMap[maDon]?.['Mã KH']||'']
                                      const tenKH=kh?.['Tên khách hàng']||'—'
                                      const cpVC=Number(ds['Chi phí VC']||0)
                                      const cpLap=Number(ds['Chi phí lắp đặt']||0)
                                      const thuong=Number(ds['Thưởng chuyến']||0)
                                      const tong=cpVC+cpLap+thuong
                                      return (
                                        <tr key={j} style={{borderBottom:'1px solid #E0E7FF',background:j%2===0?'white':'#F5F7FF'}}>
                                          <td><button onClick={()=>setPopupDS({ds,maNV:ds['Mã NV/Đối tác']||'',dtInfo:b.nv,maGH,maDon,tenKH,diaChi:kh?.['Địa chỉ']||'—',cpVC,cpLap,thuong,tong})} title={maGH} style={{background:'#EEF2FF',border:'1px solid #C7D2FE',borderRadius:'6px',padding:'3px 7px',cursor:'pointer',color:'#4338CA',fontWeight:700,fontSize:'11px',whiteSpace:'nowrap'}}>{maGH?maGH.slice(0,2)+'...'+maGH.slice(-4):'—'}</button></td>
                                          <td>{maDon!=='—'?<Link href={`/dashboard/don-hang/${maDon}`} style={{color:'var(--primary)',fontWeight:700,textDecoration:'underline',fontSize:'12px'}}>{maDon}</Link>:<span style={{color:'#D1D5DB'}}>—</span>}</td>
                                          <td style={{fontSize:'12px'}}>{tenKH}</td>
                                          <td style={{color:'#6B7280',fontSize:'12px'}}>{fDate(ds['Ngày đối soát'])}</td>
                                          <td style={{textAlign:'right',fontSize:'12px'}}>{cpVC>0?fVND(cpVC)+'đ':'—'}</td>
                                          <td style={{textAlign:'right',fontSize:'12px'}}>{cpLap>0?fVND(cpLap)+'đ':'—'}</td>
                                          <td style={{textAlign:'right',fontSize:'12px'}}>{thuong>0?fVND(thuong)+'đ':'—'}</td>
                                          <td style={{textAlign:'right',fontWeight:700,color:'#1E40AF',fontSize:'12px'}}>{fVND(tong)}đ</td>
                                          <td style={{fontSize:'11px',color:ds['Kết quả']==='Thành công'?'#065F46':'#DC2626'}}>{ds['Kết quả']||'—'}</td>
                                        </tr>
                                      )
                                    })}
                                    <tr style={{background:'#EEF2FF',borderTop:'2px solid #C7D2FE'}}>
                                      <td colSpan={7} style={{textAlign:'right',fontWeight:700,color:'#4338CA',padding:'6px 10px'}}>Tổng CP chuyến:</td>
                                      <td style={{textAlign:'right',fontWeight:800,color:'#4338CA',padding:'6px 10px'}}>{fVND(b.tongCPChuyen)}đ</td>
                                      <td></td>
                                    </tr>
                                  </tbody>
                                </table>}
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
                {isOwner&&nvHienThi.length>0&&(
                  <tfoot>
                    <tr style={{background:'#F0F4FF',borderTop:'2px solid var(--border)'}}>
                      <td colSpan={7} style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:'13px'}}>Tổng chi NV:</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,color:'#1e3a5f',fontSize:'15px',whiteSpace:'nowrap'}}>{fVND(tongChiNV)}đ</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi trả NV */}
      {modalNV&&(
        <div className="ov" onClick={()=>setModalNV(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'560px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>💸 Xác nhận chi trả</h2>
              <button onClick={()=>setModalNV(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'12px 14px',marginBottom:'16px'}}>
              <div style={{fontWeight:700,fontSize:'15px'}}>{modalNV.nv['Họ và Tên']}</div>
              <div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>{modalNV.maNV} · Tháng {thangChon}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px',marginBottom:'16px',fontSize:'13px'}}>
              {[
                ['Lương thực nhận ('+modalNV.ngayThucTe+' ngày)',modalNV.luongTN,'#374151'],
                modalNV.thuongDS>0&&['Thưởng doanh số ('+modalNV.pctDS+'%)',modalNV.thuongDS,'#065F46'],
                modalNV.tongCPChuyen>0&&['CP chuyến giao ('+modalNV.soChuyen+' chuyến)',modalNV.tongCPChuyen,'#1E40AF'],
                modalNV.tongThuongKhac>0&&['Thưởng khác',modalNV.tongThuongKhac,'#D97706'],
                modalNV.tongTamUng>0&&['Trừ tạm ứng',-modalNV.tongTamUng,'#DC2626'],
              ].filter(Boolean).map(([lb,val,c]:any)=>(
                <div key={lb} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #F0F0F0'}}>
                  <span style={{color:'#6B7280'}}>{lb}</span>
                  <span style={{fontWeight:600,color:c}}>{val<0?'-':''}{fVND(Math.abs(val))}đ</span>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:'2px solid var(--border)',marginTop:'4px'}}>
                <span style={{fontWeight:700,fontSize:'14px'}}>Thực nhận</span>
                <span style={{fontWeight:800,fontSize:'16px',color:'#1e3a5f'}}>{fVND(modalNV.tongChiTra)}đ</span>
              </div>
            </div>
            {renderNgayHinhThuc('var(--primary)')}
            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Ghi chú</label>
              <input className="input" placeholder="Ghi chú..." value={ghiChu} onChange={e=>setGhiChu(e.target.value)}/>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>xacNhanTTNV(modalNV)} disabled={loading}
                style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':'✅ Xác nhận chi trả'}
              </button>
              <button onClick={()=>setModalNV(null)}
                style={{padding:'12px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chi chuyến đối tác */}
      {modalChuyen&&(
        <div className="ov" onClick={()=>setModalChuyen(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'600px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>💸 Chi tiền chuyến giao</h2>
              <button onClick={()=>setModalChuyen(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{background:'#F5F3FF',borderRadius:'8px',padding:'12px 14px',marginBottom:'16px',border:'1px solid #DDD6FE'}}>
              <div style={{fontWeight:700,fontSize:'15px',color:'#7C3AED'}}>{modalChuyen.dtInfo?.['Họ và Tên']||modalChuyen.maNV}</div>
              <div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>{modalChuyen.maDon} · {modalChuyen.tenKH}</div>
              <div style={{fontSize:'12px',color:'#6B7280'}}>{fDate(modalChuyen.ds['Ngày đối soát'])} · {modalChuyen.diaChi}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px',marginBottom:'16px',fontSize:'13px'}}>
              {[['🚚 CP vận chuyển',editCpVC,setEditCpVC],['🔧 CP lắp đặt',editCpLap,setEditCpLap],['⭐ Thưởng chuyến',editThuong,setEditThuong]].map(([lb,val,setter]:any)=>(
                <div key={lb}>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>{lb} (đ)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={val?Number(val).toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'');setter(Number(v)||0)}}/>
                </div>
              ))}
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:'2px solid var(--border)',marginTop:'4px'}}>
                <span style={{fontWeight:700,fontSize:'14px'}}>Tổng chi</span>
                <span style={{fontWeight:800,fontSize:'16px',color:'#7C3AED'}}>{fVND((editCpVC||0)+(editCpLap||0)+(editThuong||0))}đ</span>
              </div>
            </div>
            {renderNgayHinhThuc('#7C3AED')}
            <div style={{marginBottom:'16px'}}>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Ghi chú</label>
              <input className="input" placeholder="Ghi chú..." value={ghiChu} onChange={e=>setGhiChu(e.target.value)}/>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>chiChuyenDT(modalChuyen)} disabled={loading}
                style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'#7C3AED',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':'✅ Xác nhận chi'}
              </button>
              <button onClick={()=>setModalChuyen(null)}
                style={{padding:'12px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup chi tiết đối soát */}
      {popupDS&&(
        <div className="ov" onClick={()=>setPopupDS(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'440px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>📋 Chi tiết đối soát</h2>
              <button onClick={()=>setPopupDS(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{background:'#F5F3FF',borderRadius:'8px',padding:'12px 14px',marginBottom:'14px',border:'1px solid #DDD6FE'}}>
              <div style={{fontWeight:700,fontSize:'15px',color:'#7C3AED'}}>{popupDS.dtInfo?.['Họ và Tên']||popupDS.maNV}</div>
              <div style={{fontSize:'11px',color:'#6B7280',marginTop:'3px',wordBreak:'break-all'}}>{popupDS.ds['Mã đối soát']}</div>
              <div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>📅 {fDate(popupDS.ds['Ngày đối soát'])}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'0',fontSize:'13px',marginBottom:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F0F0F0'}}>
                <span style={{color:'#6B7280'}}>Mã đơn hàng</span>
                {popupDS.maDon!=='—'?<Link href={'/dashboard/don-hang/'+popupDS.maDon} style={{color:'var(--primary)',fontWeight:700,textDecoration:'underline'}} onClick={()=>setPopupDS(null)}>{popupDS.maDon}</Link>:<span>—</span>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F0F0F0'}}>
                <span style={{color:'#6B7280'}}>Khách hàng</span><span style={{fontWeight:600}}>{popupDS.tenKH}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F0F0F0'}}>
                <span style={{color:'#6B7280',flexShrink:0}}>Địa chỉ</span>
                <span style={{maxWidth:'220px',textAlign:'right',marginLeft:'12px'}}>{popupDS.diaChi}</span>
              </div>
              {popupDS.cpVC>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F0F0F0'}}><span style={{color:'#6B7280'}}>🚚 CP vận chuyển</span><span style={{fontWeight:600}}>{fVND(popupDS.cpVC)}đ</span></div>}
              {popupDS.cpLap>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F0F0F0'}}><span style={{color:'#6B7280'}}>🔧 CP lắp đặt</span><span style={{fontWeight:600}}>{fVND(popupDS.cpLap)}đ</span></div>}
              {popupDS.thuong>0&&<div style={{display:'flex',justifyContent:'space-between',padding:'7px 0',borderBottom:'1px solid #F0F0F0'}}><span style={{color:'#6B7280'}}>⭐ Thưởng chuyến</span><span style={{fontWeight:600,color:'#D97706'}}>{fVND(popupDS.thuong)}đ</span></div>}
              <div style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderTop:'2px solid var(--border)',marginTop:'4px'}}>
                <span style={{fontWeight:700,fontSize:'14px'}}>Tổng chi</span>
                <span style={{fontWeight:800,fontSize:'16px',color:'#7C3AED'}}>{fVND(popupDS.tong)}đ</span>
              </div>
            </div>
            <button onClick={()=>setPopupDS(null)} style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}
