'use client'
// components/TaoDonHangForm.tsx — v2.4
// Sửa lỗi 404: đọc maDon từ json.maDon (API đã query lại sau khi tạo)

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fVND(n: number) { return n.toLocaleString('vi-VN') + 'đ' }
function boDau(s: string) {
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

interface KH { 'Mã KH':string; 'Tên khách hàng':string; 'Số điện thoại':string; 'Địa chỉ':string; 'Đối tượng khách hàng'?:string }
interface NV { 'Mã NV':string; 'Họ tên':string; 'Vai trò':string }
interface SP { 'Mã SP':string; 'Tên sản phẩm':string; 'Đơn vị tính':string; 'Giá bán lẻ':number; 'Tồn kho':number }
interface Dong { id:string; maSP:string; tenSP:string; soLuong:number; donGia:number; thanhTien:number; ghiChu:string }

export default function TaoDonHangForm({
  user, danhSachKH, danhSachSP, danhSachNV, nextMaDon, khDaChon,
}: {
  user: UserSession
  danhSachKH: KH[]
  danhSachSP: SP[]
  danhSachNV: NV[]
  nextMaDon: string
  khDaChon?: KH | null
}) {
  const router = useRouter()
  const { opts } = useMeta(['kenh-ban','hinh-thuc-giao'])
  const today  = new Date().toISOString().split('T')[0]
  const dangLuu = useRef(false) // Ngăn double submit

  const [ngayDat,     setNgayDat]     = useState(today)
  const [kenhBan,     setKenhBan]     = useState('Trực tiếp')
  const [htGiao,      setHtGiao]      = useState('Giao hàng cho khách')
  const [ngayHenGiao, setNgayHenGiao] = useState('')
  const [ghiChu,      setGhiChu]      = useState('')

  const [searchNV, setSearchNV] = useState('')
  const [maNV,     setMaNV]     = useState('')
  const [showNV,   setShowNV]   = useState(false)
  const nvLoc = useMemo(() => {
    if (!searchNV.trim()) return danhSachNV.slice(0,10)
    const q = boDau(searchNV)
    return danhSachNV.filter(nv => boDau(nv['Họ tên']||'').includes(q)||boDau(nv['Mã NV']||'').includes(q)).slice(0,10)
  }, [searchNV, danhSachNV])

  const [searchKH,   setSearchKH]   = useState('')
  const [maKH,       setMaKH]       = useState('')
  const [tenKH,      setTenKH]      = useState('')
  const [sdtKH,      setSdtKH]      = useState('')
  const [diaChiKH,   setDiaChiKH]   = useState('')
  const [showKH,     setShowKH]     = useState(false)
  const [showFormKH, setShowFormKH] = useState(false)
  const [loadingKH,  setLoadingKH]  = useState(false)
  const [localKH,    setLocalKH]    = useState<KH[]>(danhSachKH)
  const [newTen,     setNewTen]     = useState('')
  const [newSdt,     setNewSdt]     = useState('')
  const [newSdtErr,  setNewSdtErr]  = useState('')
  const [goiYDiaChi, setGoiYDiaChi] = useState<string[]>([])
  const [showGoiY,   setShowGoiY]   = useState(false)

  const danhSachDiaChi = useMemo(() => {
    const set = new Set<string>()
    danhSachKH.forEach((kh:any) => { if (kh['Địa chỉ']?.trim()) set.add(kh['Địa chỉ'].trim()) })
    return Array.from(set).sort()
  }, [danhSachKH])
  const [newDiaChi,  setNewDiaChi]  = useState('')
  const [newLoai,    setNewLoai]    = useState('Cá nhân')
  const [errKH,      setErrKH]      = useState('')
  const [sdtErrKH,   setSdtErrKH]   = useState('')

  useEffect(() => {
    if (khDaChon) {
      setMaKH(khDaChon['Mã KH'])
      setTenKH(khDaChon['Tên khách hàng'])
      setSdtKH(khDaChon['Số điện thoại']||'')
      setDiaChiKH(khDaChon['Địa chỉ']||'')
      setSearchKH(khDaChon['Tên khách hàng'])
    }
  }, [khDaChon])

  const khLoc = useMemo(() => {
    if (!searchKH) return localKH.slice(0,8)
    const q = boDau(searchKH)
    return localKH.filter(kh =>
      boDau(kh['Tên khách hàng']||'').includes(q)||
      (kh['Số điện thoại']||'').includes(searchKH)||
      boDau(kh['Mã KH']||'').includes(q)
    ).slice(0,8)
  }, [searchKH, localKH])

  function chonKH(kh: KH) {
    setMaKH(kh['Mã KH']); setTenKH(kh['Tên khách hàng'])
    setSdtKH(kh['Số điện thoại']||''); setDiaChiKH(kh['Địa chỉ']||'')
    setSearchKH(kh['Tên khách hàng']); setShowKH(false)
  }

  // Validate SĐT Việt Nam
  function checkSdt(sdt: string): string {
    if (!sdt.trim()) return ''
    const d = sdt.replace(/\D/g,'')
    if (d.length !== 10) return `SĐT phải đúng 10 số (đang có ${d.length} số)`
    if (!d.startsWith('0')) return 'SĐT phải bắt đầu bằng số 0'
    return ''
  }

  function validateSdtMoi(sdt: string): string {
    if (!sdt.trim()) return ''
    const digits = sdt.replace(/\D/g, '')
    if (digits.length !== 10) return `SĐT phải đúng 10 số (đang có ${digits.length} số)`
    if (!digits.startsWith('0')) return 'SĐT Việt Nam phải bắt đầu bằng số 0'
    return ''
  }

  async function luuKHMoi() {
    if (!newTen.trim()) { setErrKH('Vui lòng nhập tên KH'); return }
    const sdtErrMsg = checkSdt(newSdt)
    if (sdtErrMsg) { setErrKH(sdtErrMsg); return }
    setLoadingKH(true); setErrKH('')
    try {
      const res = await fetch('/api/khach-hang', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({'Tên khách hàng':newTen.trim(),'Số điện thoại':newSdt.trim(),'Địa chỉ':newDiaChi.trim(),'Đối tượng khách hàng':newLoai}),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message||'Lỗi')
      const khMoi: KH = {
        'Mã KH': data['Mã KH'] || data.data?.['Mã KH'] || '',
        'Tên khách hàng': newTen.trim(), 'Số điện thoại': newSdt.trim(),
        'Địa chỉ': newDiaChi.trim(), 'Đối tượng khách hàng': newLoai,
      }
      setLocalKH(prev=>[khMoi,...prev]); chonKH(khMoi)
      setNewTen(''); setNewSdt(''); setNewDiaChi(''); setNewLoai('Cá nhân')
      setShowFormKH(false)
    } catch(err:any) { setErrKH(err.message||'Lỗi') }
    finally { setLoadingKH(false) }
  }

  const [dongSP,   setDongSP]   = useState<Dong[]>([{id:'1',maSP:'',tenSP:'',soLuong:1,donGia:0,thanhTien:0,ghiChu:''}])
  const [searchSP, setSearchSP] = useState<Record<string,string>>({})
  const [showSP,   setShowSP]   = useState<Record<string,boolean>>({})
  const [cpGiaoHang, setCpGiaoHang] = useState(0)
  const [tienMat,  setTienMat]  = useState(0)
  const [ckCoc,    setCkCoc]    = useState(0)
  const tongTien   = dongSP.reduce((s,d)=>s+d.thanhTien,0)
  const datCocTong = tienMat+ckCoc
  const conPhaiThu = tongTien + cpGiaoHang - datCocTong

  function spLoc(id:string) {
    const q=searchSP[id]||''
    if (!q) return danhSachSP.filter(sp=>Number(sp['Tồn kho'])>0).slice(0,8)
    const qn=boDau(q)
    return danhSachSP.filter(sp=>boDau(sp['Tên sản phẩm']||'').includes(qn)||boDau(sp['Mã SP']||'').includes(qn)).slice(0,8)
  }
  function chonSP(id:string,sp:SP) {
    const dg=sp['Giá bán lẻ']||0
    const tenMoi=sp['Tên sản phẩm']||''
    const maMoi=sp['Mã SP']||''
    // Kiểm tra đã có dòng SP này chưa (trừ dòng hiện tại)
    const trung = dongSP.find(d=>d.id!==id&&(
      (maMoi&&d.maSP===maMoi)||(tenMoi&&d.tenSP===tenMoi)
    ))
    if (trung) {
      // Tăng SL dòng đã có, xóa dòng hiện tại
      setDongSP(prev=>prev
        .map(d=>d.id===trung.id?{...d,soLuong:d.soLuong+1,thanhTien:(d.soLuong+1)*d.donGia}:d)
        .filter(d=>d.id!==id)
      )
    } else {
      setDongSP(prev=>prev.map(d=>d.id!==id?d:{...d,maSP:maMoi,tenSP:tenMoi,donGia:dg,thanhTien:d.soLuong*dg}))
    }
    setSearchSP(prev=>({...prev,[id]:tenMoi}))
    setShowSP(prev=>({...prev,[id]:false}))
  }
  function updDong(id:string,field:'soLuong'|'donGia'|'ghiChu'|'tenSP',val:any) {
    setDongSP(prev=>prev.map(d=>{
      if(d.id!==id) return d
      const u={...d,[field]:val}
      if(field==='soLuong'||field==='donGia') u.thanhTien=(field==='soLuong'?Number(val):d.soLuong)*(field==='donGia'?Number(val):d.donGia)
      return u
    }))
  }
  function themDong(){const id=Date.now().toString();setDongSP(prev=>[...prev,{id,maSP:'',tenSP:'',soLuong:1,donGia:0,thanhTien:0,ghiChu:''}])}
  function xoaDong(id:string){setDongSP(prev=>prev.filter(d=>d.id!==id))}

  const [loadingLuu, setLoadingLuu] = useState(false)
  const [loadingIn,  setLoadingIn]  = useState(false)
  const [error, setError] = useState('')

  function validate(): boolean {
    if (!maKH && !searchKH.trim()) { setError('Vui lòng chọn hoặc thêm khách hàng'); return false }
    if (dongSP.every(d=>!d.maSP&&!d.tenSP)) { setError('Vui lòng thêm ít nhất 1 sản phẩm'); return false }
    if (!searchNV.trim()) { setError('Vui lòng chọn nhân viên bán'); return false }
    return true
  }

  async function taoDon(): Promise<string|null> {
    setError('')
    let htCoc=''
    if(tienMat>0&&ckCoc>0) htCoc=`TM ${tienMat.toLocaleString()}đ + CK ${ckCoc.toLocaleString()}đ`
    else if(tienMat>0) htCoc='Tiền mặt'
    else if(ckCoc>0)   htCoc='Chuyển khoản'

    try {
      const res = await fetch('/api/don-hang',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          'Ngày bán':ngayDat,'Ngày đặt':ngayDat,'Mã KH':maKH,
          'Tên khách hàng':tenKH||searchKH,'Kênh bán':kenhBan,
          'Hình thức giao hàng':htGiao,'Ngày hẹn giao':ngayHenGiao||null,
          'Địa chỉ giao':diaChiKH,'Tổng tiền đơn':tongTien,
          'Đặt cọc':datCocTong,'Hình thức cọc':htCoc,
          'Còn phải thu':conPhaiThu,'Trạng thái':'Chờ giao',
          'Mã NV':maNV||'','Nhân viên bán':searchNV,
          'Ghi chú':ghiChu,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(()=>({}))
        throw new Error(errData.message || `Lỗi HTTP ${res.status}`)
      }

      const json = await res.json()

      // ✅ API v3 trả về json.maDon đã được query lại từ server
      const maDonMoi = json.maDon || json.data?.['Mã đơn hàng'] || ''

      if (!maDonMoi) {
        throw new Error('Không lấy được mã đơn hàng. Vui lòng thử lại.')
      }

      // Tạo chi tiết SP
      for (const d of dongSP.filter(x=>(x.maSP||x.tenSP?.trim()))) {
        await fetch('/api/chi-tiet-don',{
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            'Mã đơn hàng':maDonMoi,'Mã SP':d.maSP,
            'Tên SP (ghi nhanh)':d.tenSP,'Số lượng':d.soLuong,
            'Đơn giá':d.donGia,'Thành tiền':d.thanhTien,'Ghi chú SP':d.ghiChu,
          }),
        })
      }
      return maDonMoi

    } catch(err:any) {
      setError(err.message||'Có lỗi xảy ra khi tạo đơn')
      return null
    }
  }

  async function luuDon() {
    if (!validate()) return
    if (dangLuu.current) return // Ngăn double submit
    dangLuu.current = true
    setLoadingLuu(true)
    const ma = await taoDon()
    setLoadingLuu(false)
    dangLuu.current = false
    if (ma) { router.push('/dashboard/don-hang'); router.refresh() }
  }

  async function luuVaIn() {
    if (!validate()) return
    if (dangLuu.current) return // Ngăn double submit
    dangLuu.current = true
    setLoadingIn(true)
    const ma = await taoDon()
    setLoadingIn(false)
    dangLuu.current = false
    if (ma) router.push(`/dashboard/don-hang/${encodeURIComponent(ma)}/in`)
  }

  const LBL = ({children}:{children:React.ReactNode}) => (
    <label style={{fontSize:'11px',fontWeight:600,color:'#374151',display:'block',marginBottom:'3px'}}>{children}</label>
  )

  return (
    <div style={{padding:'20px 28px',maxWidth:'1400px'}}>
      <style>{`
        .db{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:60;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:220px;overflow-y:auto;}
        .di{padding:9px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;}.di:last-child{border-bottom:none;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:460px;}
      `}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'18px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'21px',fontWeight:700,margin:0}}>➕ Tạo đơn hàng mới</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'12px',margin:'2px 0 0'}}>Mã đơn sẽ được hệ thống tự tạo</p>
        </div>
        <button onClick={()=>router.back()} className="btn btn-ghost btn-sm">← Quay lại</button>
      </div>

      {error&&<div style={{background:'#FEE2E2',color:'#DC2626',padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px'}}>⚠️ {error}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'16px'}}>
        {/* Cột trái */}
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          <div className="card" style={{padding:'14px'}}>
            <h3 style={{fontSize:'11px',fontWeight:700,marginBottom:'12px',color:'var(--primary)',textTransform:'uppercase',letterSpacing:'.05em'}}>📋 Thông tin đơn hàng</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div><LBL>Ngày đặt *</LBL><input className="input" type="date" value={ngayDat} onChange={e=>setNgayDat(e.target.value)}/></div>
              <div><LBL>Kênh bán *</LBL>
                <select className="input" value={kenhBan} onChange={e=>setKenhBan(e.target.value)}>
                  {['Trực tiếp','Zalo','Facebook','Điện thoại','Online'].map(k=><option key={k}>{k}</option>)}
                </select>
              </div>
              <div><LBL>Hình thức giao *</LBL>
                <select className="input" value={htGiao} onChange={e=>setHtGiao(e.target.value)}>
                  {opts('hinh-thuc-giao',['Giao hàng cho khách','Bán tại cửa hàng']).map((h:string)=><option key={h}>{h}</option>)}
                </select>
              </div>
              {htGiao==='Giao hàng cho khách'&&<div><LBL>Ngày hẹn giao</LBL><input className="input" type="datetime-local" value={ngayHenGiao} onChange={e=>setNgayHenGiao(e.target.value)}/></div>}
              <div style={{gridColumn:'1/-1'}}>
                <LBL>👤 Nhân viên bán *</LBL>
                <div style={{position:'relative'}}>
                  <input className="input" placeholder="Gõ tên hoặc chọn nhân viên..." value={searchNV}
                    onChange={e=>{setSearchNV(e.target.value);setMaNV('');setShowNV(true)}}
                    onFocus={()=>setShowNV(true)} onBlur={()=>setTimeout(()=>setShowNV(false),200)} style={{paddingRight:'32px'}}/>
                  <span style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',color:'#9CA3AF',fontSize:'14px',pointerEvents:'none'}}>🔍</span>
                  {showNV&&<div className="db">
                    {searchNV&&!danhSachNV.find(n=>n['Họ tên']===searchNV)&&
                      <div className="di" onMouseDown={e=>{e.preventDefault();setShowNV(false)}} style={{background:'#FEF9C3',color:'#92400E',fontSize:'12px'}}>✏️ Dùng tên: <strong>"{searchNV}"</strong></div>}
                    {nvLoc.length===0
                      ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>Không tìm thấy</div>
                      :nvLoc.map(nv=><div key={nv['Mã NV']} className="di" onMouseDown={e=>{e.preventDefault();setSearchNV(nv['Họ tên']);setMaNV(nv['Mã NV']);setShowNV(false)}}>
                        <div style={{fontWeight:600}}>{nv['Họ tên']}</div>
                        <div style={{fontSize:'11px',color:'#6B7280'}}>{nv['Mã NV']} · {nv['Vai trò']||'—'}</div>
                      </div>)}
                  </div>}
                </div>
                {maNV&&<div style={{marginTop:'3px',fontSize:'11px',color:'var(--success)',fontWeight:600}}>✅ {searchNV} ({maNV})</div>}
              </div>
            </div>
          </div>

          <div className="card" style={{padding:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <h3 style={{fontSize:'11px',fontWeight:700,color:'var(--primary)',textTransform:'uppercase',letterSpacing:'.05em',margin:0}}>👥 Khách hàng</h3>
              <button onClick={()=>{setShowFormKH(true);setErrKH('')}} style={{padding:'4px 12px',borderRadius:'6px',border:'1px dashed var(--primary)',color:'var(--primary)',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>+ Thêm KH mới</button>
            </div>
            {maKH?(
              <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:700,color:'var(--primary)',fontSize:'14px',marginBottom:'4px'}}>✅ {tenKH} <span style={{fontSize:'12px',fontWeight:400,color:'#6B7280'}}>({maKH})</span></div>
                  {sdtKH&&<div style={{fontSize:'12px',color:'var(--text-secondary)'}}>📞 {sdtKH}</div>}
                  {diaChiKH&&<div style={{fontSize:'12px',color:'var(--text-secondary)',marginTop:'2px'}}>📍 {diaChiKH}</div>}
                </div>
                <button onClick={()=>{setMaKH('');setTenKH('');setSdtKH('');setDiaChiKH('');setSearchKH('')}} style={{background:'none',border:'none',cursor:'pointer',color:'#6B7280',fontSize:'18px',lineHeight:1}}>✕</button>
              </div>
            ):(
              <div style={{position:'relative'}}>
                <input className="input" placeholder="Tìm theo tên, SĐT hoặc mã KH..." value={searchKH}
                  onChange={e=>{setSearchKH(e.target.value);setShowKH(true)}}
                  onFocus={()=>setShowKH(true)} onBlur={()=>setTimeout(()=>setShowKH(false),200)}/>
                {showKH&&<div className="db">
                  {khLoc.length===0
                    ?<div style={{padding:'12px',textAlign:'center',fontSize:'12px',color:'#6B7280'}}>
                      Không tìm thấy
                      <button onMouseDown={e=>{e.preventDefault();setShowFormKH(true);setNewTen(searchKH)}} style={{display:'block',margin:'6px auto 0',padding:'4px 12px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',cursor:'pointer',fontSize:'12px'}}>+ Thêm "{searchKH}"</button>
                    </div>
                    :khLoc.map(kh=><div key={kh['Mã KH']} className="di" onMouseDown={e=>{e.preventDefault();chonKH(kh)}}>
                      <div style={{fontWeight:600}}>{kh['Tên khách hàng']}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{kh['Mã KH']} · {kh['Số điện thoại']}{kh['Địa chỉ']?` · ${kh['Địa chỉ']}`:''}</div>
                    </div>)}
                </div>}
              </div>
            )}
          </div>

          <div className="card" style={{padding:'14px'}}>
            <h3 style={{fontSize:'11px',fontWeight:700,marginBottom:'12px',color:'var(--primary)',textTransform:'uppercase',letterSpacing:'.05em'}}>💰 Đặt cọc</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div><LBL>💵 Tiền mặt (VNĐ)</LBL><input className="input" type="text" inputMode="numeric" value={tienMat?tienMat.toLocaleString('vi-VN'):''} placeholder="0" onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setTienMat(v)}}/></div>
              <div><LBL>🏦 Chuyển khoản (VNĐ)</LBL><input className="input" type="text" inputMode="numeric" value={ckCoc?ckCoc.toLocaleString('vi-VN'):''} placeholder="0" onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setCkCoc(v)}}/></div>
            </div>
            {datCocTong>0&&<div style={{marginTop:'6px',fontSize:'12px',color:'var(--success)',fontWeight:600}}>Tổng cọc: {fVND(datCocTong)}</div>}

          </div>

          <div className="card" style={{padding:'14px'}}>
            <h3 style={{fontSize:'11px',fontWeight:700,marginBottom:'10px',color:'var(--primary)',textTransform:'uppercase',letterSpacing:'.05em'}}>🚚 Chi phí giao hàng</h3>
            <div>
              <LBL>CP giao hàng / lắp đặt (VNĐ)</LBL>
              <input className="input" type="number" min="0" value={cpGiaoHang||''} placeholder="0 — để trống nếu không có"
                onChange={e=>setCpGiaoHang(Number(e.target.value))}/>
              {cpGiaoHang>0&&<div style={{marginTop:'4px',fontSize:'11px',color:'#6B7280',fontStyle:'italic'}}>
                💡 CP giao hàng sẽ được cộng vào "Còn phải thu"
              </div>}
            </div>
          </div>

          <div className="card" style={{padding:'14px'}}>
            <LBL>📝 Ghi chú</LBL>
            <textarea className="input" rows={2} value={ghiChu} placeholder="Ghi chú thêm..." onChange={e=>setGhiChu(e.target.value)} style={{resize:'vertical'}}/>
          </div>
        </div>

        {/* Cột phải */}
        <div style={{display:'flex',flexDirection:'column',gap:'14px'}}>
          <div className="card" style={{padding:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <h3 style={{fontSize:'11px',fontWeight:700,color:'var(--primary)',textTransform:'uppercase',letterSpacing:'.05em',margin:0}}>🪑 Sản phẩm trong đơn</h3>
              <button onClick={themDong} className="btn btn-outline btn-sm" style={{fontSize:'12px'}}>+ Thêm SP</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'3fr 60px 100px 80px 20px',gap:'6px',padding:'4px 6px',fontSize:'11px',fontWeight:700,color:'var(--text-secondary)'}}>
              <span>Sản phẩm</span><span style={{textAlign:'center'}}>SL</span><span style={{textAlign:'right'}}>Đơn giá</span><span style={{textAlign:'right'}}>T.Tiền</span><span></span>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              {dongSP.map((dong,idx)=>(
                <div key={dong.id} style={{border:'1px solid var(--border)',borderRadius:'8px',padding:'8px 10px',background:'#FAFBFD'}}>
                  <div style={{display:'grid',gridTemplateColumns:'3fr 60px 100px 80px 20px',gap:'6px',alignItems:'center'}}>
                    <div style={{position:'relative'}}>
                      <input className="input" placeholder={`SP #${idx+1} — gõ tên...`}
                        value={searchSP[dong.id]!==undefined?searchSP[dong.id]:dong.tenSP}
                        style={{fontSize:'12px',padding:'5px 8px'}}
                        onChange={e=>{setSearchSP(p=>({...p,[dong.id]:e.target.value}));setShowSP(p=>({...p,[dong.id]:true}));updDong(dong.id,'tenSP',e.target.value)}}
                        onFocus={()=>setShowSP(p=>({...p,[dong.id]:true}))}
                        onBlur={()=>setTimeout(()=>setShowSP(p=>({...p,[dong.id]:false})),200)}/>
                      {showSP[dong.id]&&<div className="db">
                        {spLoc(dong.id).map(sp=><div key={sp['Mã SP']} className="di" style={{fontSize:'12px'}} onMouseDown={e=>{e.preventDefault();chonSP(dong.id,sp)}}>
                          <div style={{fontWeight:600}}>{sp['Tên sản phẩm']}</div>
                          <div style={{fontSize:'11px',color:'#6B7280'}}>{sp['Mã SP']} · {Number(sp['Giá bán lẻ']).toLocaleString('vi-VN')}đ
                            {Number(sp['Tồn kho'])===0?<span style={{color:'#DC2626',marginLeft:'6px'}}>⚠️ Hết</span>:<span style={{color:'#16A34A',marginLeft:'6px'}}>Kho:{sp['Tồn kho']}</span>}
                          </div>
                        </div>)}
                      </div>}
                    </div>
                    <input className="input" type="number" min="1" value={dong.soLuong} style={{fontSize:'12px',padding:'5px 4px',textAlign:'center'}} onChange={e=>updDong(dong.id,'soLuong',e.target.value)}/>
                    <input className="input" type="number" min="0" value={dong.donGia||''} placeholder="0" style={{fontSize:'12px',padding:'5px 4px',textAlign:'right'}} onChange={e=>updDong(dong.id,'donGia',e.target.value)}/>
                    <div style={{fontSize:'12px',fontWeight:700,color:'var(--success)',textAlign:'right'}}>{dong.thanhTien>0?dong.thanhTien.toLocaleString('vi-VN'):'0'}đ</div>
                    {dongSP.length>1?<button onClick={()=>xoaDong(dong.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',fontSize:'14px',padding:0}}>✕</button>:<span></span>}
                  </div>
                  <input className="input" placeholder="Ghi chú: màu, size..." value={dong.ghiChu} onChange={e=>updDong(dong.id,'ghiChu',e.target.value)} style={{marginTop:'6px',fontSize:'11px',padding:'4px 8px',color:'#6B7280'}}/>
                </div>
              ))}
            </div>
            {/* Nút + Thêm SP — ngay dưới danh sách, dễ bấm */}
            <button onClick={themDong}
              style={{width:'100%',marginTop:'8px',padding:'8px',borderRadius:'7px',border:'2px dashed var(--primary)',background:'white',color:'var(--primary)',fontWeight:600,fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
              ➕ Thêm sản phẩm
            </button>

            <div style={{marginTop:'12px',padding:'12px',borderRadius:'8px',background:'var(--primary-pale)',border:'1px solid rgba(27,58,107,.15)'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'4px'}}>
                <span style={{color:'var(--text-secondary)'}}>Tổng tiền hàng:</span><span style={{fontWeight:700}}>{fVND(tongTien)}</span>
              </div>
              {cpGiaoHang>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'4px'}}>
                <span style={{color:'var(--text-secondary)'}}>CP giao hàng:</span><span style={{fontWeight:600,color:'#92400E'}}>+ {fVND(cpGiaoHang)}</span>
              </div>}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',marginBottom:'4px'}}>
                <span style={{color:'var(--text-secondary)'}}>Đã đặt cọc:</span><span style={{color:'var(--success)',fontWeight:600}}>- {fVND(datCocTong)}</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'15px',fontWeight:800,borderTop:'1px solid rgba(27,58,107,.2)',paddingTop:'8px',marginTop:'4px'}}>
                <span style={{color:'var(--primary)'}}>Còn phải thu:</span>
                <span style={{color:conPhaiThu>0?'#DC2626':'#16A34A'}}>{fVND(conPhaiThu)}</span>
              </div>
            </div>
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            <button onClick={luuDon} disabled={loadingLuu||loadingIn}
              style={{width:'100%',padding:'13px',borderRadius:'8px',border:'none',background:loadingLuu?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'15px',cursor:loadingLuu||loadingIn?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              {loadingLuu?'⏳ Đang lưu...':'✅ Lưu đơn hàng'}
            </button>
            <button onClick={luuVaIn} disabled={loadingLuu||loadingIn}
              style={{width:'100%',padding:'13px',borderRadius:'8px',border:'none',background:loadingIn?'#6B7280':'#0F6B3B',color:'white',fontWeight:700,fontSize:'15px',cursor:loadingLuu||loadingIn?'not-allowed':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'8px'}}>
              {loadingIn?'⏳ Đang lưu & chờ mã đơn...':'🖨️ Lưu & In hóa đơn'}
            </button>
            <button onClick={()=>router.back()} disabled={loadingLuu||loadingIn} className="btn btn-ghost" style={{width:'100%',justifyContent:'center',color:'#6B7280'}}>Huỷ bỏ</button>
          </div>
        </div>
      </div>

      {showFormKH&&(
        <div className="ov" onClick={()=>{setShowFormKH(false);setSdtErrKH('')}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>👤 Thêm khách hàng mới</h2>
              <button onClick={()=>setShowFormKH(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <p style={{fontSize:'12px',color:'#1E40AF',margin:'0 0 14px',background:'#EFF6FF',padding:'8px 12px',borderRadius:'6px'}}>💡 Mã KH sẽ được NocoDB tự động tạo.</p>
            {errKH&&<div style={{background:'#FEE2E2',color:'#DC2626',padding:'8px 12px',borderRadius:'6px',marginBottom:'12px',fontSize:'12px'}}>⚠️ {errKH}</div>}
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên khách hàng *</label>
                <input className="input" placeholder="Nguyễn Văn A / Công ty..." value={newTen} onChange={e=>setNewTen(e.target.value)} autoFocus/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Số điện thoại</label>
                  <input className="input" placeholder="0901234567 (10 số)" value={newSdt}
                    onChange={e=>{setNewSdt(e.target.value);setSdtErrKH(e.target.value.trim()?checkSdt(e.target.value):''  )}}
                    style={{borderColor:sdtErrKH?'#EF4444':''}}/>
                  {sdtErrKH&&<div style={{fontSize:'11px',color:'#DC2626',marginTop:'3px'}}>⚠️ {sdtErrKH}</div>}</div>
                <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Đối tượng</label>
                  <select className="input" value={newLoai} onChange={e=>setNewLoai(e.target.value)}>
                    <option>Cá nhân</option><option>Cơ quan</option><option>Công ty</option>
                  </select></div>
              </div>
              <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Địa chỉ</label>
                <input className="input" placeholder="Số nhà, đường, phường..." value={newDiaChi}
                  onChange={e=>{
                    setNewDiaChi(e.target.value)
                    if (e.target.value.trim().length >= 1) {
                      const q = e.target.value.trim().toLowerCase()
                      const goi = danhSachDiaChi.filter((d:string) => d.toLowerCase().includes(q)).slice(0,6)
                      setGoiYDiaChi(goi); setShowGoiY(goi.length > 0)
                    } else { setShowGoiY(false) }
                  }}
                  onBlur={()=>setTimeout(()=>setShowGoiY(false),200)}/>
                {showGoiY&&(
                  <div style={{position:'absolute',top:'calc(100% + 2px)',left:0,right:0,zIndex:100,background:'white',border:'1px solid var(--border)',borderRadius:'6px',boxShadow:'0 4px 12px rgba(0,0,0,.1)',maxHeight:'160px',overflowY:'auto'}}>
                    {goiYDiaChi.map((d,i)=>(
                      <div key={i} onMouseDown={e=>{e.preventDefault();setNewDiaChi(d);setShowGoiY(false)}}
                        style={{padding:'7px 12px',cursor:'pointer',fontSize:'12px',borderBottom:'1px solid #F3F4F6'}}
                        onMouseEnter={e=>(e.currentTarget.style.background='#F0F9FF')}
                        onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                        📍 {d}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuKHMoi} disabled={loadingKH||!!sdtErrKH} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:(loadingKH||!!sdtErrKH)?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:(loadingKH||!!sdtErrKH)?'not-allowed':'pointer'}}>
                  {loadingKH?'⏳ Đang lưu...':'✅ Lưu khách hàng'}
                </button>
                <button onClick={()=>setShowFormKH(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

