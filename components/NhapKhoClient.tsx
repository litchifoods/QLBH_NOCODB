'use client'
// components/NhapKhoClient.tsx
import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){if(!s)return'—';const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const TT_COLOR:Record<string,{bg:string,c:string}> = {
  'Đủ':     {bg:'#D1FAE5',c:'#065F46'},
  'Thiếu':  {bg:'#FEF3C7',c:'#92400E'},
  'Thừa':   {bg:'#DBEAFE',c:'#1E40AF'},
  'Lỗi':    {bg:'#FEE2E2',c:'#991B1B'},
  'Đã xử lý':{bg:'#F3F4F6',c:'#6B7280'},
}
const SO_DONG = 10

export default function NhapKhoClient({nhapKhoList,nccList,sanPhamList,datHangList,user}:{
  nhapKhoList:any[]; nccList:any[]; sanPhamList:any[]; datHangList:any[]; user:UserSession
}) {
  const router = useRouter()
  const [local,     setLocal]     = useState(nhapKhoList)
  const [spLocal,   setSpLocal]   = useState(sanPhamList)
  const [search,    setSearch]    = useState('')
  const [filterTT,  setFilterTT]  = useState('Tất cả')
  const [filterNCC, setFilterNCC] = useState('Tất cả')
  const [trang,     setTrang]     = useState(1)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState<any>(null)
  const [loading,   setLoading]   = useState(false)
  const [xoaItem,   setXoaItem]   = useState<any>(null)
  const [msgModal,  setMsgModal]  = useState('')
  const [msgModalOk,setMsgModalOk]= useState(true)
  // Tạo NCC mới
  const [showNewNCC,  setShowNewNCC]  = useState(false)
  const [newTenNCC,   setNewTenNCC]   = useState('')
  const [newMaNCC2,   setNewMaNCC2]   = useState('')
  const [newSdtNCC,   setNewSdtNCC]   = useState('')
  const [newDiaChiNCC,setNewDiaChiNCC]= useState('')
  const [newStkNCC,   setNewStkNCC]   = useState('')
  const [newGhiChuNCC,setNewGhiChuNCC]= useState('')
  const [savingNCC,   setSavingNCC]   = useState(false)
  const [nccLocal,    setNccLocal]    = useState(nccList)

  // Tạo SP mới
  const [showNewSP, setShowNewSP] = useState(false)
  const [newTenSP,  setNewTenSP]  = useState('')
  const [newMaSP,   setNewMaSP]   = useState('')
  const [newLoai,   setNewLoai]   = useState('Phổ thông')
  const [newDonVi,  setNewDonVi]  = useState('Cái')
  const [newGiaBuon,setNewGiaBuon]= useState(0)
  const [newGiaLe,  setNewGiaLe]  = useState(0)
  const [savingSP,  setSavingSP]  = useState(false)

  // Flow chọn đơn NCC
  const [chonTuDon,   setChonTuDon]   = useState(false) // true=nhập từ đơn, false=thủ công
  const [donChon,     setDonChon]     = useState<any[]>([]) // SP của đơn NCC được chọn
  const [searchDon,   setSearchDon]   = useState('')
  const [showDonDrop, setShowDonDrop] = useState(false)
  const [maDonChon,   setMaDonChon]   = useState('')
  // SP items khi nhập từ đơn
  const [spItems,     setSpItems]     = useState<any[]>([])

  // Form fields
  const [maNCC,       setMaNCC]       = useState('')
  const [searchNCC,   setSearchNCC]   = useState('')
  const [showNCC,     setShowNCC]     = useState(false)
  const [maSP,        setMaSP]        = useState('')
  const [searchSP,    setSearchSP]    = useState('')
  const [showSPDrop,  setShowSPDrop]  = useState(false)
  const [maDatHang,   setMaDatHang]   = useState('')
  const [ngayNhap,    setNgayNhap]    = useState(new Date().toISOString().split('T')[0])
  const [slDat,       setSlDat]       = useState(0)
  const [slThucNhan,  setSlThucNhan]  = useState(0)
  const [giaNhapTT,   setGiaNhapTT]   = useState(0)
  const [cpVC,        setCpVC]        = useState(0)
  const [tinhTrang,   setTinhTrang]   = useState('Đủ-đạt yêu cầu')
  const [ghiChu,      setGhiChu]      = useState('')

  // Group đơn NCC theo mã đơn gốc
  const donNCCGrouped = useMemo(()=>{
    const g:Record<string,any[]>={}
    datHangList.forEach(d=>{
      const full=d['Mã đặt hàng']||''
      const parts=full.split('-')
      const ma=parts.length>=3?`DH-NCC-${parts[2]}`:full
      if(!g[ma]) g[ma]=[]
      g[ma].push(d)
    })
    return g
  },[datHangList])

  function chonDonNCC(maDon:string){
    const grp=donNCCGrouped[maDon]||[]
    if(!grp.length) return
    setMaDonChon(maDon)
    setMaNCC(grp[0]['Mã NCC']||'')
    setSearchNCC(nccMap[grp[0]['Mã NCC']]?.['Tên NCC']||grp[0]['Mã NCC']||'')
    // Tạo spItems từ các SP trong đơn
    setSpItems(grp.map(d=>({
      maSP:d['Mã SP']||'',
      tenSP:spMap[d['Mã SP']]?.['Tên sản phẩm']||d['Mã SP']||'',
      donVi:spMap[d['Mã SP']]?.['Đơn vị tính']||'',
      slDat:Number(d['Số lượng đặt']||0),
      slThucNhan:Number(d['Số lượng đặt']||0), // mặc định = SL đặt
      giaNhapTT:Number(d['Giá nhập dự kiến']||0),
      tinhTrang:'Đủ',
      ghiChu:'',
      checked:true,
    })))
    setShowDonDrop(false)
    setSearchDon(maDon)
  }

  function updSpItem(i:number,k:string,v:any){
    setSpItems(p=>p.map((it,idx)=>idx===i?{...it,[k]:v}:it))
  }

  const isOwner = user.vaiTro === 'Chủ cửa hàng'

  async function luuNCC(){
    if (!newTenNCC.trim()){showMsgM('Nhập tên nhà cung cấp',false);return}
    setSavingNCC(true)
    try {
      const res=await fetch('/api/nha-cung-cap',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({'Mã NCC':newMaNCC2.trim()||undefined,'Tên NCC':newTenNCC.trim(),'Số điện thoại':newSdtNCC,'Địa chỉ':newDiaChiNCC,'Số TK ngân hàng':newStkNCC,'Ghi chú':newGhiChuNCC})})
      const d=await res.json()
      if (!res.ok) throw new Error(d.message)
      const nccMoi={...d.data,'Mã NCC':d.maNCC||newMaNCC2,'Tên NCC':newTenNCC}
      setNccLocal(p=>[nccMoi,...p])
      // Tự chọn NCC vừa tạo
      setMaNCC(d.maNCC||newMaNCC2)
      setSearchNCC(newTenNCC)
      showMsg2(`✅ Đã thêm NCC: ${newTenNCC}`)
      setShowNewNCC(false)
      setNewTenNCC('');setNewMaNCC2('');setNewSdtNCC('');setNewDiaChiNCC('');setNewStkNCC('');setNewGhiChuNCC('')
    } catch(e:any){showMsgM('❌ '+(e.message||'Lỗi'),false)}
    finally{setSavingNCC(false)}
  }

  async function luuSPMoi(){
    if (!newTenSP.trim()){showMsgM('Nhập tên SP',false);return}
    setSavingSP(true)
    try {
      const res=await fetch('/api/san-pham',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({'Mã SP':newMaSP.trim()||undefined,'Tên sản phẩm':newTenSP.trim(),'Loại SP':newLoai,'Đơn vị tính':newDonVi,'Giá bán buôn':newGiaBuon,'Giá bán lẻ':newGiaLe})})
      const d=await res.json()
      if (!res.ok) throw new Error(d.message)
      const newSP={...d.data,'Mã SP':d.data?.['Mã SP']||newMaSP,'Tên sản phẩm':newTenSP}
      setSpLocal(p=>[newSP,...p])
      // Tự chọn SP vừa tạo
      setMaSP(d.data?.['Mã SP']||newMaSP)
      setSearchSP(newTenSP)
      showMsg2(`✅ Đã thêm: ${newTenSP}`)
      setShowNewSP(false);setNewTenSP('');setNewMaSP('');setNewLoai('Phổ thông');setNewDonVi('Cái');setNewGiaBuon(0);setNewGiaLe(0)
    } catch(e:any){showMsgM('❌ '+(e.message||'Lỗi'),false)}
    finally{setSavingSP(false)}
  }

  function showMsg2(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}
  function showMsgM(t:string,ok=true){setMsgModal(t);setMsgModalOk(ok);setTimeout(()=>setMsgModal(''),5000)}

  const nccMap = useMemo(()=>{const m:Record<string,any>={};nccList.forEach(n=>{m[n['Mã NCC']||'']=n});return m},[nccList])
  const spMap  = useMemo(()=>{const m:Record<string,any>={};spLocal.forEach(s=>{m[s['Mã SP']||'']=s});return m},[spLocal])

  const tongNhap = slThucNhan * giaNhapTT

  const filtered = useMemo(()=>{
    let r = local
    if (filterTT!=='Tất cả') r=r.filter(d=>d['Tình trạng hàng']===filterTT)
    if (filterNCC!=='Tất cả') r=r.filter(d=>d['Mã NCC']===filterNCC)
    if (search.trim()) {
      const q=boDau(search)
      r=r.filter(d=>boDau(d['Mã phiếu nhập']||'').includes(q)||boDau(d['Mã NCC']||'').includes(q)||boDau(nccMap[d['Mã NCC']]?.['Tên NCC']||'').includes(q)||boDau(d['Mã SP']||'').includes(q)||boDau(spMap[d['Mã SP']]?.['Tên sản phẩm']||'').includes(q))
    }
    return r
  },[local,filterTT,filterNCC,search,nccMap,spMap])

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)
  const nccDS     = useMemo(()=>[...new Set(local.map(d=>d['Mã NCC']).filter(Boolean))].map(ma=>({ma,ten:nccMap[ma]?.['Tên NCC']||ma})),[local,nccMap])

  const tongGiaTri = local.reduce((s,d)=>s+Number(d['Tổng tiền hàng']||0),0)
  const soPhieu    = local.length
  const soThieu    = local.filter(d=>['Thiếu','Lỗi','Thừa'].includes(d['Tình trạng hàng']||'')).length

  function reset(){
    setChonTuDon(false);setDonChon([]);setSearchDon('');setMaDonChon('');setSpItems([])
    setMaNCC('');setSearchNCC('');setMaSP('');setSearchSP('');setMaDatHang('')
    setNgayNhap(new Date().toISOString().split('T')[0])
    setSlDat(0);setSlThucNhan(0);setGiaNhapTT(0);setCpVC(0)
    setTinhTrang('Đủ');setGhiChu('');setEditItem(null)
    setMsgModal('')
  }

  function moTao(){reset();setShowModal(true)}
  function moSua(item:any){
    setEditItem(item)
    setMaNCC(item['Mã NCC']||'');setSearchNCC(nccMap[item['Mã NCC']]?.['Tên NCC']||item['Mã NCC']||'')
    setMaSP(item['Mã SP']||'');setSearchSP(spMap[item['Mã SP']]?.['Tên sản phẩm']||item['Mã SP']||'')
    setMaDatHang(item['Mã đặt hàng']||'')
    setNgayNhap(item['Ngày nhập']?.split('T')[0]||new Date().toISOString().split('T')[0])
    setSlDat(Number(item['Số lượng đặt']||0))
    setSlThucNhan(Number(item['Số lượng thực nhận']||0))
    setGiaNhapTT(Number(item['Giá nhập thực tế']||0))
    setCpVC(Number(item['CP vận chuyển về kho']||0))
    setTinhTrang(item['Tình trạng hàng']||'Đủ-đạt yêu cầu')
    setGhiChu(item['Ghi chú']||'')
    setShowModal(true)
  }

  async function luuPhieu(){
    setLoading(true)
    try {
      if (editItem) {
        // Sửa phiếu đơn lẻ
        if (!maNCC){showMsgM('Chọn nhà cung cấp',false);setLoading(false);return}
        if (!maSP){showMsgM('Chọn sản phẩm',false);setLoading(false);return}
        const res=await fetch('/api/nhap-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            id:Number(editItem['Id']||editItem['id']),
            slThucNhanCu:Number(editItem['Số lượng thực nhận']||0),
            'Mã NCC':maNCC,'Mã SP':maSP,'Mã đặt hàng':maDatHang,
            'Ngày nhập':ngayNhap,'Số lượng đặt':slDat,
            'Giá nhập thực tế':giaNhapTT,'Số lượng thực nhận':slThucNhan,
            'CP vận chuyển về kho':cpVC,'Tình trạng hàng':tinhTrang,'Ghi chú':ghiChu,
          })})
        if (!res.ok) throw new Error((await res.json()).message)
        setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(editItem['Id']||editItem['id'])?
          {...d,'Mã NCC':maNCC,'Mã SP':maSP,'Ngày nhập':ngayNhap,'Số lượng thực nhận':slThucNhan,
           'Giá nhập thực tế':giaNhapTT,'Tổng tiền hàng':slThucNhan*giaNhapTT,
           'CP vận chuyển về kho':cpVC,'Tình trạng hàng':tinhTrang,'Ghi chú':ghiChu}:d))
        showMsg2('✅ Đã cập nhật phiếu nhập')
        setShowModal(false);reset()
      } else if (chonTuDon) {
        // Nhập từ đơn NCC — tạo nhiều phiếu
        const valid = spItems.filter(it=>it.checked && it.slThucNhan>0)
        if (!valid.length){showMsgM('Chọn ít nhất 1 SP để nhập',false);setLoading(false);return}
        let soPhieuTao = 0
        for (const it of valid) {
          const res=await fetch('/api/nhap-kho',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({
              maNCC, maSP:it.maSP, maDatHang:maDonChon,
              ngayNhap, slDat:it.slDat, slThucNhan:it.slThucNhan,
              giaNhapTT:it.giaNhapTT, cpVC:soPhieuTao===0?cpVC:0,
              tinhTrang:it.tinhTrang, ghiChu:it.ghiChu||ghiChu,
            })})
          const d=await res.json()
          if (res.ok) {
            soPhieuTao++
            setSpLocal(prev=>prev.map(s=>s['Mã SP']===it.maSP?{...s,'Tồn kho':Number(s['Tồn kho']||0)+it.slThucNhan}:s))
            if (d.data) setLocal(prev=>[{...d.data},...prev])
          }
        }
        showMsg2(`✅ Đã tạo ${soPhieuTao} phiếu nhập từ đơn ${maDonChon}`)
        setShowModal(false);reset()
      } else {
        // Nhập thủ công
        if (!maNCC){showMsgM('Chọn nhà cung cấp',false);setLoading(false);return}
        if (!maSP){showMsgM('Chọn sản phẩm',false);setLoading(false);return}
        if (slThucNhan<=0){showMsgM('Nhập số lượng thực nhận',false);setLoading(false);return}
        const res=await fetch('/api/nhap-kho',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({maNCC,maSP,maDatHang,ngayNhap,slDat,slThucNhan,giaNhapTT,cpVC,tinhTrang,ghiChu})})
        const d=await res.json()
        if (!res.ok) throw new Error(d.message)
        setSpLocal(prev=>prev.map(s=>s['Mã SP']===maSP?{...s,'Tồn kho':Number(s['Tồn kho']||0)+slThucNhan}:s))
        setLocal(prev=>[{...d.data},...prev])
        showMsg2(`✅ Đã tạo phiếu ${d.maPhieu}`)
        setShowModal(false);reset()
      }
    } catch(e:any){showMsgM('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function xacNhanXoa(){
    if (!xoaItem) return
    try {
      const res=await fetch(`/api/nhap-kho?id=${xoaItem['Id']||xoaItem['id']}&maSP=${xoaItem['Mã SP']||''}&sl=${xoaItem['Số lượng thực nhận']||0}`,{method:'DELETE'})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.filter(d=>(d['Id']||d['id'])!==(xoaItem['Id']||xoaItem['id'])))
      setSpLocal(prev=>prev.map(s=>s['Mã SP']===xoaItem['Mã SP']?{...s,'Tồn kho':Math.max(0,Number(s['Tồn kho']||0)-Number(xoaItem['Số lượng thực nhận']||0))}:s))
      showMsg2('✅ Đã xóa phiếu nhập');setXoaItem(null)
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  function xuatPDF(item:any){
    const ncc = nccMap[item['Mã NCC']]||{}
    const sp  = spMap[item['Mã SP']]||{}
    const ttC = TT_COLOR[item['Tình trạng hàng']]||{bg:'#F3F4F6',c:'#374151'}
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu nhập kho ${item['Mã phiếu nhập']}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;font-size:13px;}h1{font-size:20px;color:#1e3a5f;}
    .info{display:flex;gap:16px;margin:16px 0;}.box{flex:1;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;padding:12px 16px;}
    table{width:100%;border-collapse:collapse;margin-top:16px;}th{background:#1e3a5f;color:white;padding:8px 10px;font-size:12px;text-align:left;}
    td{padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:13px;}
    .badge{padding:3px 10px;border-radius:10px;font-weight:bold;font-size:12px;}
    .footer{margin-top:40px;display:flex;justify-content:space-between;}
    .sign{text-align:center;width:180px;}.sign p{font-weight:bold;margin-bottom:50px;}
    @media print{button{display:none!important;}}</style></head><body>
    <div style="display:flex;justify-content:space-between">
      <div><h1>🪑 Nội Thất Tính Tuyết</h1><p style="color:#6B7280;margin:0">PHIẾU NHẬP KHO</p></div>
      <div style="text-align:right"><div style="font-size:20px;font-weight:bold;color:#1e3a5f">${item['Mã phiếu nhập']}</div>
      <div style="color:#6B7280">Ngày nhập: ${fDate(item['Ngày nhập'])}</div>
      <div><span class="badge" style="background:${ttC.bg};color:${ttC.c}">${item['Tình trạng hàng']||'—'}</span></div></div>
    </div>
    <div class="info">
      <div class="box"><b>📦 Nhà cung cấp</b><br>${ncc['Tên NCC']||item['Mã NCC']||'—'}<br>Mã: ${item['Mã NCC']||'—'}${ncc['Số điện thoại']?'<br>SĐT: '+ncc['Số điện thoại']:''}</div>
      <div class="box"><b>🛒 Đơn đặt hàng</b><br>Mã đặt hàng: ${item['Mã đặt hàng']||'Nhập thủ công'}<br>Người nhập: ${user.hoTen||user.tenDangNhap||'—'}</div>
    </div>
    <table>
      <thead><tr><th>Mã SP</th><th>Tên sản phẩm</th><th>ĐVT</th><th style="text-align:center">SL đặt</th><th style="text-align:center">SL nhận</th><th style="text-align:right">Giá nhập</th><th style="text-align:right">Thành tiền</th></tr></thead>
      <tbody><tr>
        <td>${item['Mã SP']||'—'}</td>
        <td><b>${sp['Tên sản phẩm']||item['Mã SP']||'—'}</b></td>
        <td>${sp['Đơn vị tính']||'—'}</td>
        <td style="text-align:center">${item['Số lượng đặt']||0}</td>
        <td style="text-align:center"><b>${item['Số lượng thực nhận']||0}</b></td>
        <td style="text-align:right">${fVND(item['Giá nhập thực tế'])}đ</td>
        <td style="text-align:right"><b>${fVND(item['Tổng tiền hàng'])}đ</b></td>
      </tr></tbody>
    </table>
    <div style="margin-top:12px;padding:10px 14px;background:#F8FAFC;border-radius:6px;display:flex;justify-content:space-between;font-size:13px;">
      <span>CP vận chuyển về kho: <b>${fVND(item['CP vận chuyển về kho'])}đ</b></span>
      <span style="font-size:15px;font-weight:bold;color:#1e3a5f">Tổng chi: ${fVND(Number(item['Tổng tiền hàng']||0)+Number(item['CP vận chuyển về kho']||0))}đ</span>
    </div>
    ${item['Ghi chú']?`<div style="margin-top:8px;padding:8px 12px;background:#FFFBEB;border-radius:6px;font-size:12px;color:#92400E">Ghi chú: ${item['Ghi chú']}</div>`:''}
    <div class="footer">
      <div class="sign"><p>Người giao hàng</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign"><p>Người nhận hàng</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign"><p>Thủ kho</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
    </div>
    <script>window.onload=()=>window.print()</script></body></html>`
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close()}
  }

  const FInput = ({label,children}:{label:string,children:React.ReactNode}) => (
    <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>{label}</label>{children}</div>
  )

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .nk-t th,.nk-t td{padding:8px 10px;vertical-align:middle;}
        .nk-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .mk{background:white;border-radius:12px;padding:28px;width:100%;max-width:860px;max-height:95vh;overflow-y:auto;}
        .db{position:absolute;top:calc(100%+3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:200px;overflow-y:auto;}
        .di{padding:8px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>📦 Nhập kho</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {soPhieu} phiếu · Tổng giá trị: <strong>{fVND(tongGiaTri)}đ</strong>
            {soThieu>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {soThieu} phiếu cần xử lý</span>}
          </p>
        </div>
        <button onClick={moTao} style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>+ Tạo phiếu nhập kho</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'14px'}}>
        {[
          {icon:'📋',label:'Tổng phiếu',val:soPhieu,c:'var(--primary)'},
          {icon:'✅',label:'Đủ',val:local.filter(d=>d['Tình trạng hàng']==='Đủ').length,c:'#065F46'},
          {icon:'⚠️',label:'Thiếu/Lỗi',val:soThieu,c:'#DC2626'},
          {icon:'💰',label:'Tổng giá trị',val:fVND(tongGiaTri)+'đ',c:'#1e3a5f'},
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
          <input className="input" placeholder="🔍 Tìm phiếu, NCC, SP..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'180px',maxWidth:'260px'}}/>
          <select className="input" value={filterNCC} onChange={e=>setFilterNCC(e.target.value)} style={{width:'180px'}}>
            <option value="Tất cả">Tất cả NCC</option>
            {nccDS.map(n=><option key={n.ma} value={n.ma}>{n.ten}</option>)}
          </select>
          <div style={{display:'flex',gap:'6px'}}>
            {['Tất cả','Đủ','Thiếu','Thừa','Lỗi','Đã xử lý'].map(tt=>{
              const c=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
              return <button key={tt} onClick={()=>setFilterTT(tt)} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid',borderColor:filterTT===tt?c.c:'var(--border)',background:filterTT===tt?c.bg:'white',color:filterTT===tt?c.c:'var(--text-secondary)',fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer'}}>{tt}</button>
            })}
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="nk-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã phiếu</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày nhập</th>
                <th style={{textAlign:'left',fontWeight:700}}>Nhà cung cấp</th>
                <th style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                <th style={{textAlign:'center',fontWeight:700}}>SL nhận</th>
                <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Giá nhập</th>
                <th style={{textAlign:'right',fontWeight:700}}>Thành tiền</th>
                <th style={{textAlign:'center',fontWeight:700}}>Tình trạng</th>
                <th style={{textAlign:'left',fontWeight:700}}>Người nhập</th>
                <th style={{textAlign:'center',fontWeight:700,width:'120px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dsTrang.length===0?(
                <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có phiếu nhập nào</td></tr>
              ):dsTrang.map((item,i)=>{
                const ncc=nccMap[item['Mã NCC']]||{}
                const sp=spMap[item['Mã SP']]||{}
                const tt=item['Tình trạng hàng']||'Đủ-đạt yêu cầu'
                const ttC=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
                const tongChi=Number(item['Tổng tiền hàng']||0)+Number(item['CP vận chuyển về kho']||0)
                return (
                  <tr key={item['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:600,color:'#374151',whiteSpace:'nowrap',fontSize:'12px'}}>
                      {item['Mã phiếu nhập']||'—'}
                      {item['Mã đặt hàng']&&<div style={{fontSize:'10px',color:'#9CA3AF'}}>🛒 {item['Mã đặt hàng']}</div>}
                      {item['Người nhập']&&<div style={{fontSize:'10px',color:'#6B7280'}}>👤 {item['Người nhập']}</div>}
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDate(item['Ngày nhập'])}</td>
                    <td>
                      <div style={{fontWeight:600}}>{ncc['Tên NCC']||item['Mã NCC']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{item['Mã NCC']}</div>
                    </td>
                    <td style={{maxWidth:'180px'}}>
                      <div style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sp['Tên sản phẩm']||item['Mã SP']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{item['Mã SP']} · {sp['Đơn vị tính']||''}</div>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{fontWeight:700,fontSize:'14px'}}>{item['Số lượng thực nhận']||0}</span>
                      {Number(item['Số lượng đặt']||0)>0&&<div style={{fontSize:'10px',color:'#9CA3AF'}}>/{item['Số lượng đặt']} đặt</div>}
                    </td>
                    <td style={{textAlign:'right',fontSize:'12px'}}>{Number(item['Giá nhập thực tế']||0)>0?fVND(item['Giá nhập thực tế'])+'đ':'—'}</td>
                    <td style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>
                      {fVND(item['Tổng tiền hàng']||0)}đ
                      {Number(item['CP vận chuyển về kho']||0)>0&&<div style={{fontSize:'10px',color:'#6B7280'}}>+{fVND(item['CP vận chuyển về kho'])}đ VC</div>}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:ttC.bg,color:ttC.c,whiteSpace:'nowrap'}}>{tt}</span>
                    </td>
                    <td style={{fontSize:'12px',color:'#6B7280'}}>{item['Người nhập']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px',width:'110px'}}>
                        {isOwner&&<button onClick={()=>moSua(item)} style={{gridColumn:'1/-1',padding:'5px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600}}>✏️ Sửa</button>}
                        <button onClick={()=>xuatPDF(item)} style={{padding:'5px',borderRadius:'5px',border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600,gridColumn:isOwner?undefined:'1/-1'}}>📄 PDF</button>
                        {isOwner&&<button onClick={()=>setXoaItem(item)} style={{padding:'5px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {tongTrang>1&&(
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0'}}>
            <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{filtered.length} phiếu</span>
            <div style={{display:'flex',gap:'4px'}}>
              <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
              {Array.from({length:tongTrang},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>)}
              <Btn disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</Btn>
            </div>
          </div>
        )}
      </div>

      {/* MODAL TẠO/SỬA PHIẾU */}
      {showModal&&(
        <div className="ov" onClick={()=>{setShowModal(false);reset()}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>{editItem?'✏️ Sửa phiếu nhập kho':'📦 Tạo phiếu nhập kho'}</h2>
              <button onClick={()=>{setShowModal(false);reset()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#6B7280'}}>✕</button>
            </div>

            {/* Tab chọn loại nhập — chỉ hiện khi tạo mới */}
            {!editItem&&(
              <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
                <button onClick={()=>{setChonTuDon(false);setSpItems([]);setMaDonChon('');setSearchDon('')}}
                  style={{flex:1,padding:'10px',borderRadius:'8px',border:'2px solid',borderColor:!chonTuDon?'var(--primary)':'var(--border)',background:!chonTuDon?'var(--primary-pale)':'white',color:!chonTuDon?'var(--primary)':'var(--text-secondary)',fontWeight:!chonTuDon?700:400,cursor:'pointer',fontSize:'13px'}}>
                  📝 Nhập trực tiếp
                </button>
                <button onClick={()=>setChonTuDon(true)}
                  style={{flex:1,padding:'10px',borderRadius:'8px',border:'2px solid',borderColor:chonTuDon?'var(--primary)':'var(--border)',background:chonTuDon?'var(--primary-pale)':'white',color:chonTuDon?'var(--primary)':'var(--text-secondary)',fontWeight:chonTuDon?700:400,cursor:'pointer',fontSize:'13px'}}>
                  🛒 Nhập từ đơn đặt hàng NCC
                </button>
              </div>
            )}

            {/* Thông tin chung */}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
              {chonTuDon&&!editItem?(
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px'}}>
                  {/* Chọn đơn NCC */}
                  <div style={{position:'relative'}}>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Chọn đơn đặt hàng NCC *</label>
                    <input className="input" placeholder="Tìm mã đơn, NCC..." value={searchDon}
                      onChange={e=>{setSearchDon(e.target.value);setMaDonChon('');setSpItems([]);setShowDonDrop(true)}}
                      onFocus={()=>setShowDonDrop(true)} onBlur={()=>setTimeout(()=>setShowDonDrop(false),200)}/>
                    {maDonChon&&<div style={{fontSize:'11px',color:'var(--primary)',fontWeight:600,marginTop:'2px'}}>✅ {maDonChon} — {nccMap[maNCC]?.['Tên NCC']||maNCC}</div>}
                    {showDonDrop&&(
                      <div className="db">
                        {Object.keys(donNCCGrouped).filter(ma=>{
                          const q=boDau(searchDon)
                          const grp=donNCCGrouped[ma]
                          return !q||boDau(ma).includes(q)||boDau(nccMap[grp[0]['Mã NCC']]?.['Tên NCC']||'').includes(q)
                        }).map(ma=>{
                          const grp=donNCCGrouped[ma]
                          const nccTen=nccMap[grp[0]['Mã NCC']]?.['Tên NCC']||grp[0]['Mã NCC']||'—'
                          return (
                            <div key={ma} className="di" onMouseDown={e=>{e.preventDefault();chonDonNCC(ma)}}>
                              <div style={{fontWeight:600}}>{ma} <span style={{fontSize:'11px',color:'#6B7280'}}>— {nccTen}</span></div>
                              <div style={{fontSize:'11px',color:'#6B7280'}}>{grp.length} SP · {grp.map(d=>spMap[d['Mã SP']]?.['Tên sản phẩm']||d['Mã SP']).join(', ').slice(0,50)}</div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <FInput label="Ngày nhập">
                    <input className="input" type="date" value={ngayNhap} onChange={e=>setNgayNhap(e.target.value)}/>
                  </FInput>
                </div>
              ):(
                <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'12px'}}>
                  <div style={{position:'relative'}}>
                    <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Nhà cung cấp *</label>
                    <input className="input" placeholder="Tìm tên, mã NCC..." value={searchNCC}
                      onChange={e=>{setSearchNCC(e.target.value);setMaNCC('');setShowNCC(true)}}
                      onFocus={()=>setShowNCC(true)} onBlur={()=>setTimeout(()=>setShowNCC(false),200)}/>
                    {maNCC&&<div style={{fontSize:'11px',color:'var(--primary)',fontWeight:600,marginTop:'2px'}}>✅ {nccMap[maNCC]?.['Tên NCC']||maNCC}</div>}
                    {showNCC&&(
                      <div className="db">
                        {nccLocal.filter(n=>{const q=boDau(searchNCC);return !q||boDau(n['Tên NCC']||'').includes(q)||boDau(n['Mã NCC']||'').includes(q)}).map(n=>(
                          <div key={n['Mã NCC']} className="di" onMouseDown={e=>{e.preventDefault();setMaNCC(n['Mã NCC']);setSearchNCC(n['Tên NCC']);setShowNCC(false)}}>
                            <span style={{fontWeight:600}}>{n['Tên NCC']}</span> <span style={{fontSize:'11px',color:'#6B7280'}}>{n['Mã NCC']}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <FInput label="Ngày nhập">
                    <input className="input" type="date" value={ngayNhap} onChange={e=>setNgayNhap(e.target.value)}/>
                  </FInput>
                  <FInput label="Mã đặt hàng (nếu có)">
                    <input className="input" placeholder="DH-NCC-001..." value={maDatHang} onChange={e=>setMaDatHang(e.target.value)}/>
                  </FInput>
                </div>
              )}
            </div>

            {/* Danh sách SP từ đơn NCC */}
            {chonTuDon&&!editItem&&spItems.length>0&&(
              <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'var(--primary)',marginBottom:'10px',textTransform:'uppercase'}}>📦 Sản phẩm trong đơn — Xác nhận thực nhận</div>
                {/* Header */}
                <div style={{display:'grid',gridTemplateColumns:'24px 2fr 80px 80px 130px 120px 1fr',gap:'8px',padding:'4px 8px',fontSize:'11px',color:'#6B7280',fontWeight:600}}>
                  <div></div><div>Sản phẩm</div><div style={{textAlign:'center'}}>SL đặt</div><div style={{textAlign:'center'}}>SL nhận</div><div>Giá nhập TT (đ)</div><div>Tình trạng</div><div>Ghi chú</div>
                </div>
                {spItems.map((it,i)=>(
                  <div key={i} style={{display:'grid',gridTemplateColumns:'24px 2fr 80px 80px 130px 120px 1fr',gap:'8px',padding:'6px 8px',borderTop:'1px solid #E5E7EB',alignItems:'center'}}>
                    <input type="checkbox" checked={it.checked} onChange={e=>updSpItem(i,'checked',e.target.checked)} style={{width:'16px',height:'16px',accentColor:'var(--primary)'}}/>
                    <div>
                      <div style={{fontWeight:600,fontSize:'12px'}}>{it.tenSP}</div>
                      <div style={{fontSize:'10px',color:'#6B7280'}}>{it.maSP} · {it.donVi}</div>
                    </div>
                    <div style={{textAlign:'center',fontSize:'12px',color:'#6B7280'}}>{it.slDat}</div>
                    <input type="number" min="0" value={it.slThucNhan||''} disabled={!it.checked}
                      onChange={e=>updSpItem(i,'slThucNhan',Number(e.target.value))}
                      style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'12px',textAlign:'center',width:'100%',opacity:it.checked?1:0.5}}/>
                    <input type="number" min="0" value={it.giaNhapTT||''} disabled={!it.checked}
                      onChange={e=>updSpItem(i,'giaNhapTT',Number(e.target.value)||0)}
                      style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'12px',width:'100%',opacity:it.checked?1:0.5}}/>
                    <select value={it.tinhTrang} disabled={!it.checked} onChange={e=>updSpItem(i,'tinhTrang',e.target.value)}
                      style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'11px',width:'100%',
                        background:TT_COLOR[it.tinhTrang]?.bg||'white',color:TT_COLOR[it.tinhTrang]?.c||'#374151',fontWeight:600,opacity:it.checked?1:0.5}}>
                      <option>Đủ</option><option>Thiếu</option><option>Thừa</option><option>Lỗi</option><option>Đã xử lý</option>
                    </select>
                    <input type="text" value={it.ghiChu} disabled={!it.checked} placeholder="Ghi chú..."
                      onChange={e=>updSpItem(i,'ghiChu',e.target.value)}
                      style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'11px',width:'100%',opacity:it.checked?1:0.5}}/>
                  </div>
                ))}
                <div style={{marginTop:'8px',padding:'8px 12px',background:'#EFF6FF',borderRadius:'6px',fontSize:'12px',display:'flex',justifyContent:'space-between'}}>
                  <span style={{color:'#6B7280'}}>{spItems.filter(it=>it.checked).length}/{spItems.length} SP được chọn</span>
                  <span style={{fontWeight:700,color:'var(--primary)'}}>Tổng: {fVND(spItems.filter(it=>it.checked).reduce((s,it)=>s+it.slThucNhan*it.giaNhapTT,0))}đ</span>
                </div>
              </div>
            )}

            {/* SP và số lượng */}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
              <div style={{display:'grid',gridTemplateColumns:chonTuDon?'2fr 1fr 1fr 1fr':'2fr 1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                {/* SP */}
                <div style={{position:'relative'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                    <label style={{fontSize:'11px',fontWeight:600}}>Sản phẩm *</label>
                    <button onClick={()=>setShowNewSP(true)} style={{padding:'2px 8px',borderRadius:'5px',border:'1px solid #8B5CF6',background:'#F5F3FF',color:'#7C3AED',fontSize:'10px',fontWeight:600,cursor:'pointer'}}>✨ Thêm SP mới</button>
                  </div>
                  <input className="input" placeholder="Tìm tên hoặc mã SP..." value={searchSP}
                    onChange={e=>{setSearchSP(e.target.value);setMaSP('');setShowSPDrop(true)}}
                    onFocus={()=>setShowSPDrop(true)} onBlur={()=>setTimeout(()=>setShowSPDrop(false),200)}/>
                  {maSP&&<div style={{fontSize:'11px',color:'var(--primary)',fontWeight:600,marginTop:'2px'}}>✅ {spMap[maSP]?.['Tên sản phẩm']||maSP}</div>}
                  {showSPDrop&&(
                    <div className="db">
                      {spLocal.filter(s=>{const q=boDau(searchSP);return !q||boDau(s['Tên sản phẩm']||'').includes(q)||boDau(s['Mã SP']||'').includes(q)}).slice(0,10).map(s=>(
                        <div key={s['Mã SP']} className="di" onMouseDown={e=>{e.preventDefault();setMaSP(s['Mã SP']);setSearchSP(s['Tên sản phẩm']);setShowSPDrop(false);setSlDat(0)}}>
                          <span style={{fontWeight:600}}>{s['Tên sản phẩm']}</span> <span style={{fontSize:'11px',color:'#6B7280'}}>{s['Mã SP']} · Tồn: {s['Tồn kho']||0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {chonTuDon&&(
                  <FInput label="SL đặt">
                    <input className="input" type="number" min="0" value={slDat||''} placeholder="0" onChange={e=>setSlDat(Number(e.target.value))}/>
                  </FInput>
                )}
                <FInput label="Số lượng nhập *">
                  <input className="input" type="number" min="1" value={slThucNhan||''} placeholder="0" onChange={e=>setSlThucNhan(Number(e.target.value))}/>
                </FInput>
                <FInput label="Tình trạng">
                  <select className="input" value={tinhTrang} onChange={e=>setTinhTrang(e.target.value)}>
                    <option>Đủ</option><option>Thiếu</option><option>Thừa</option><option>Lỗi</option><option>Đã xử lý</option>
                  </select>
                </FInput>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px'}}>
                <FInput label="📦 Giá nhập NCC (đ)">
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={giaNhapTT?giaNhapTT.toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=e.target.value.replace(/\./g,'');const n=Number(v);if(!isNaN(n))setGiaNhapTT(n)}}/>
                </FInput>
                <FInput label="🚚 CPVC về kho (đ)">
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={cpVC?cpVC.toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=e.target.value.replace(/\./g,'');const n=Number(v);if(!isNaN(n))setCpVC(n)}}/>
                </FInput>
                <div style={{padding:'8px 12px',background:'#EFF6FF',borderRadius:'8px',border:'1px solid #BFDBFE',display:'flex',flexDirection:'column',justifyContent:'center'}}>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>Tổng tiền hàng</div>
                  <div style={{fontSize:'16px',fontWeight:800,color:'var(--primary)'}}>{fVND(tongNhap)}đ</div>
                  {cpVC>0&&<div style={{fontSize:'11px',color:'#6B7280'}}>+ {fVND(cpVC)}đ VC = <strong>{fVND(tongNhap+cpVC)}đ</strong></div>}
                </div>
              </div>
            </div>

            <FInput label="Ghi chú">
              <input className="input" placeholder="Ghi chú thêm..." value={ghiChu} onChange={e=>setGhiChu(e.target.value)}/>
            </FInput>

            {msgModal&&<div style={{padding:'8px 12px',borderRadius:'8px',marginTop:'12px',fontSize:'13px',background:msgModalOk?'#D1FAE5':'#FEE2E2',color:msgModalOk?'#065F46':'#991B1B'}}>{msgModal}</div>}

            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              <button onClick={luuPhieu} disabled={loading} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':editItem?'✅ Cập nhật phiếu':'✅ Tạo phiếu nhập kho'}
              </button>
              <button onClick={()=>{setShowModal(false);reset()}} style={{padding:'12px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo NCC mới */}
      {showNewNCC&&(
        <div className="ov" onClick={()=>setShowNewNCC(false)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'520px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>+ Thêm nhà cung cấp mới</h2>
              <button onClick={()=>setShowNewNCC(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Mã NCC (tự động)</label>
                  <input className="input" placeholder="NCC-xxx" value={newMaNCC2} onChange={e=>setNewMaNCC2(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên nhà cung cấp *</label>
                  <input className="input" placeholder="Tên NCC..." value={newTenNCC} onChange={e=>setNewTenNCC(e.target.value)} autoFocus/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📞 Số điện thoại</label>
                  <input className="input" placeholder="0xxx..." value={newSdtNCC} onChange={e=>setNewSdtNCC(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🏦 Số TK ngân hàng</label>
                  <input className="input" placeholder="STK..." value={newStkNCC} onChange={e=>setNewStkNCC(e.target.value)}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📍 Địa chỉ</label>
                <input className="input" placeholder="Địa chỉ NCC..." value={newDiaChiNCC} onChange={e=>setNewDiaChiNCC(e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                <input className="input" placeholder="Ghi chú..." value={newGhiChuNCC} onChange={e=>setNewGhiChuNCC(e.target.value)}/>
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuNCC} disabled={savingNCC} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:savingNCC?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,fontSize:'14px',cursor:savingNCC?'not-allowed':'pointer'}}>
                  {savingNCC?'⏳ Đang lưu...':'✅ Thêm nhà cung cấp'}
                </button>
                <button onClick={()=>setShowNewNCC(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo SP mới */}
      {showNewSP&&(
        <div className="ov" onClick={()=>setShowNewSP(false)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'560px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>✨ Thêm sản phẩm mới</h2>
              <button onClick={()=>setShowNewSP(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Mã SP (tự động)</label>
                  <input className="input" placeholder="SP-xxx" value={newMaSP} onChange={e=>setNewMaSP(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên sản phẩm *</label>
                  <input className="input" placeholder="Tên sản phẩm..." value={newTenSP} onChange={e=>setNewTenSP(e.target.value)} autoFocus/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Loại SP</label>
                  <select className="input" value={newLoai} onChange={e=>setNewLoai(e.target.value)}>
                    <option>Phổ thông</option><option>Theo yêu cầu</option>
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Đơn vị tính</label>
                  <select className="input" value={newDonVi} onChange={e=>setNewDonVi(e.target.value)}>
                    <option>Cái</option><option>Chiếc</option><option>Bộ</option>
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>💵 Giá bán buôn (đ)</label>
                  <input className="input" type="number" min="0" placeholder="0" value={newGiaBuon||''} onChange={e=>setNewGiaBuon(Number(e.target.value)||0)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🏷️ Giá bán lẻ (đ)</label>
                  <input className="input" type="number" min="0" placeholder="0" value={newGiaLe||''} onChange={e=>setNewGiaLe(Number(e.target.value)||0)}/>
                </div>
              </div>
              <div style={{padding:'8px 12px',background:'#F5F3FF',borderRadius:'6px',fontSize:'12px',color:'#7C3AED'}}>
                💡 SP mới sẽ tự động được chọn vào ô sản phẩm và thêm vào danh sách SP.
              </div>
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={luuSPMoi} disabled={savingSP} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:savingSP?'#9CA3AF':'#7C3AED',color:'white',fontWeight:700,fontSize:'14px',cursor:savingSP?'not-allowed':'pointer'}}>
                  {savingSP?'⏳ Đang lưu...':'✅ Thêm sản phẩm'}
                </button>
                <button onClick={()=>setShowNewSP(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal xóa */}
      {xoaItem&&(
        <div className="ov" onClick={()=>setXoaItem(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'360px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'15px',fontWeight:700,margin:'0 0 8px'}}>Xóa phiếu nhập?</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}><strong>{xoaItem['Mã phiếu nhập']}</strong></p>
            <p style={{fontSize:'12px',color:'#DC2626',margin:'0 0 16px',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>⚠️ Tồn kho SP sẽ bị trừ {xoaItem['Số lượng thực nhận']} {spMap[xoaItem['Mã SP']]?.['Đơn vị tính']||''}</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanXoa} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:'#DC2626',color:'white',fontWeight:700,cursor:'pointer'}}>Xóa</button>
              <button onClick={()=>setXoaItem(null)} style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({children,active,disabled,onClick}:any){
  return <button onClick={onClick} disabled={disabled} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:active?'var(--primary)':'var(--border)',background:active?'var(--primary)':disabled?'#F9FAFB':'white',color:active?'white':disabled?'#CCC':'var(--text-secondary)',cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:active?700:400,minWidth:'32px'}}>{children}</button>
}
