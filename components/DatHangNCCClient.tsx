'use client'
// components/DatHangNCCClient.tsx v2
import { useRouter } from 'next/navigation'
import { useState, useMemo, useRef, useEffect } from 'react'
import { UserSession } from '@/lib/auth'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){if(!s)return'—';const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const TRANG_THAI = ['Chờ xác nhận','Đã xác nhận','Đã nhập kho','Nhập thiếu','Nhập thừa']
const TT_COLOR: Record<string,{bg:string,c:string}> = {
  'Chờ xác nhận': {bg:'#FEF3C7',c:'#B45309'},
  'Đã xác nhận':  {bg:'#D1FAE5',c:'#065F46'},
  'Đã nhập kho':  {bg:'#DBEAFE',c:'#1E40AF'},
  'Nhập thiếu':   {bg:'#FEE2E2',c:'#991B1B'},
  'Nhập thừa':    {bg:'#DBEAFE',c:'#1E40AF'},
}
const SO_DONG = 10

interface SPItem { _id:number; maSP:string; tenSP:string; donVi:string; soLuong:number; giaNhap:number; ngayVe:string; ghiChu:string }

export default function DatHangNCCClient({donDHList,nccList,sanPhamList,danhMucList=[],user}:{
  donDHList:any[]; nccList:any[]; sanPhamList:any[]; danhMucList:any[]; user:UserSession
}) {
  const router = useRouter()
  const _idRef = useRef(0)
  const nextId = () => ++_idRef.current
  const [local, setLocal]        = useState(donDHList)
  const [spLocal, setSpLocal]    = useState(sanPhamList)
  const [search, setSearch]      = useState('')
  const [filterTT, setFilterTT]  = useState('Tất cả')
  const [filterNCC,setFilterNCC] = useState('Tất cả')
  const [trang, setTrang]        = useState(1)
  const [msg, setMsg]            = useState('')
  const [msgOk, setMsgOk]        = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editDon, setEditDon]     = useState<any[]|null>(null) // null=tao moi, array=sua
  const [loading, setLoading]    = useState(false)
  const [xoaItem, setXoaItem]    = useState<any>(null)
  // Form tao/sua don
  const [maNCC,     setMaNCC]    = useState('')
  const [ngayDat,   setNgayDat]  = useState(new Date().toISOString().split('T')[0])
  const [ghiChuDon, setGhiChuDon]= useState('')
  const [items, setItems]        = useState<SPItem[]>([{_id:1,maSP:'',tenSP:'',donVi:'Cái',soLuong:1,giaNhap:0,ngayVe:'',ghiChu:''}])
  const [searchNCC,  setSearchNCC] = useState('')
  const [showNCC,    setShowNCC]   = useState(false)
  const [searchSP,  setSearchSP] = useState<Record<number,string>>({})
  const [showSP,    setShowSP]   = useState<Record<number,boolean>>({})
  // Modal tao SP moi
  const [showNewSP, setShowNewSP]= useState(false)
  const [newTenSP,  setNewTenSP] = useState('')
  const [newMaSP,   setNewMaSP]  = useState('')
  const [newLoai,   setNewLoai]  = useState('Theo yêu cầu')
  const [newDonVi,  setNewDonVi] = useState('Cái')
  const [newGiaNhapNCC, setNewGiaNhapNCC] = useState(0)
  const [newCpvcKho,    setNewCpvcKho]   = useState(0)
  const [newGia,    setNewGia]   = useState(0)
  const [newGhiChu, setNewGhiChu]= useState('')
  const [newDanhMuc, setNewDanhMuc]= useState('')
  const [savingSP,  setSavingSP] = useState(false)
  // Danh mục
  const [danhMucLocal3, setDanhMucLocal3] = useState(danhMucList)
  const [showThemDM3,   setShowThemDM3]   = useState(false)
  const [newTenDM3,     setNewTenDM3]     = useState('')
  const [loadingDM3,    setLoadingDM3]    = useState(false)
  const [msgDM3,        setMsgDM3]        = useState('')
  const danhMucNames3 = danhMucLocal3.map((d:any)=>d['Tên danh mục']||'')

  async function themDM3(){
    if(!newTenDM3.trim()) return
    setLoadingDM3(true)
    try{
      const res=await fetch('/api/danh-muc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenDanhMuc:newTenDM3.trim()})})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message)
      setDanhMucLocal3((p:any[])=>[...p,{...d.data,'Tên danh mục':newTenDM3.trim()}])
      setNewDanhMuc(newTenDM3.trim())
      setNewTenDM3('')
      setShowThemDM3(false)
      setMsgDM3('✅ Đã thêm: '+newTenDM3.trim())
      setTimeout(()=>setMsgDM3(''),3000)
    }catch(e:any){setMsgDM3('❌ '+(e.message||'Lỗi'))}
    finally{setLoadingDM3(false)}
  }
  const [newTonKho, setNewTonKho] = useState(0)
  const [newNguong, setNewNguong] = useState(5)
  const [newGiaLe,  setNewGiaLe]  = useState(0)
  const [newThongSo,setNewThongSo]= useState('')
  const [trungSP,   setTrungSP]  = useState<{idx:number, idxCu:number, tenSP:string}|null>(null)
  const [showBoSung, setShowBoSung] = useState(false)

  function showMsg2(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  // Danh sách đơn Nhập thiếu để bổ sung
  const donNhapThieu = useMemo(()=>{
    const g:Record<string,{maDH:string,maNCC:string,maSP:string,tenSP:string,slDat:number,slNhap:number,slThieu:number}[]>={}
    donDHList.filter(d=>d['Trạng thái']==='Nhập thiếu').forEach(d=>{
      const maDH = (d['Mã đặt hàng']||'').split('-').slice(0,3).join('-')
      if(!g[maDH]) g[maDH]=[]
      // Tính số lượng đã nhập (từ nhapKhoList nếu có) - tạm dùng 0
      g[maDH].push({
        maDH, maNCC:d['Mã NCC']||'',
        maSP:d['Mã SP']||'',
        tenSP:'', // sẽ lấy từ spMap
        slDat:Number(d['Số lượng đặt']||0),
        slNhap:0, slThieu:Number(d['Số lượng đặt']||0)
      })
    })
    return g
  },[donDHList])

  const nccMap = useMemo(()=>{
    const m:Record<string,any>={}
    nccList.forEach(n=>{m[n['Mã NCC']||'']=n})
    return m
  },[nccList])

  const spMap = useMemo(()=>{
    const m:Record<string,any>={}
    spLocal.forEach(s=>{m[s['Mã SP']||'']=s})
    return m
  },[spLocal])

  // Group theo mã đơn gốc
  const grouped = useMemo(()=>{
    let r = local
    if (filterTT==='Chưa nhập kho') r=r.filter(d=>d['Trạng thái']!=='Đã nhập kho')
    else if (filterTT!=='Tất cả') r=r.filter(d=>d['Trạng thái']===filterTT)
    if (filterNCC!=='Tất cả') r=r.filter(d=>d['Mã NCC']===filterNCC)
    if (search.trim()) {
      const q=boDau(search)
      r=r.filter(d=>boDau(d['Mã đặt hàng']||'').includes(q)||boDau(nccMap[d['Mã NCC']]?.['Tên NCC']||'').includes(q)||boDau(d['Mã SP']||'').includes(q))
    }
    const g:Record<string,any[]>={}
    r.forEach(d=>{
      const full = d['Mã đặt hàng']||''
      // Group key: DH-NCC-XXX — lấy phần số thứ 3 làm key
      const parts = full.split('-')
      // Format: DH-NCC-001 (3 parts) hoặc DH-NCC-001-1 (4 parts)
      // Key nhóm luôn là DH-NCC-{số} (parts 0,1,2)
      const ma = parts.length >= 3 ? `DH-NCC-${parts[2]}` : full
      if(!g[ma]) g[ma]=[]
      g[ma].push(d)
    })
    return g
  },[local,filterTT,filterNCC,search,nccMap])

  const groupKeys  = Object.keys(grouped).sort((a,b)=>b.localeCompare(a))
  const tongTrangG = Math.max(1,Math.ceil(groupKeys.length/SO_DONG))
  const trangHT    = Math.min(trang,tongTrangG)
  const keysTrang  = groupKeys.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)
  const nccDanhSach= useMemo(()=>[...new Set(local.map(d=>d['Mã NCC']).filter(Boolean))].map(ma=>({ma,ten:nccMap[ma]?.['Tên NCC']||ma})),[local,nccMap])
  const chuaXN     = local.filter(d=>d['Trạng thái']==='Chờ xác nhận').length

  function addItem(){setItems(p=>[...p,{_id:nextId(),maSP:'',tenSP:'',donVi:'Cái',soLuong:1,giaNhap:0,ngayVe:'',ghiChu:''}])}
  function removeItem(id:number){setItems(p=>p.filter(it=>it._id!==id))}
  function updItem(id:number,k:keyof SPItem,v:any){setItems(p=>p.map(it=>it._id===id?{...it,[k]:v}:it))}
  function chonSP(id:number,sp:any){
    const giaNCC = Number(sp['Giá nhập NCC']||0)
    const cpvc   = Number(sp['CPVC về kho']||0)
    // Dùng functional update để tránh stale closure - kiểm tra trùng trong callback
    setItems(prev=>{
      const existing = prev.find(it=>it._id!==id && it.maSP===sp['Mã SP'])
      if(existing){
        // Set trùng SP sau khi setItems để tránh conflict
        setTimeout(()=>setTrungSP({idx:id, idxCu:existing._id, tenSP:sp['Tên sản phẩm']||''}),0)
        return prev
      }
      return prev.map(it=>it._id===id?{...it,
        maSP:sp['Mã SP']||'',
        tenSP:sp['Tên sản phẩm']||'',
        donVi:sp['Đơn vị tính']||'',
        giaNhap:giaNCC+cpvc,
      }:it)
    })
    setSearchSP(p=>({...p,[id]:sp['Tên sản phẩm']||''}))
    setShowSP(p=>({...p,[id]:false}))
  }
  function xacNhanGopSP(){
    if (!trungSP) return
    // Tăng số lượng SP cũ
    setItems(p=>p.map(it=>it._id===trungSP.idxCu?{...it,soLuong:it.soLuong+1}:it))
    // Xóa dòng SP mới (trùng)
    setItems(p=>p.filter(it=>it._id!==trungSP.idx))
    setTrungSP(null)
  }
  const tongTien = items.reduce((s,it)=>s+Number(it.soLuong||0)*Number(it.giaNhap||0),0)

  function moBoSung(maDH:string){
    const ds = donNhapThieu[maDH]||[]
    if(!ds.length) return
    const nccMa = ds[0].maNCC
    setMaNCC(nccMa)
    setSearchNCC(nccMap[nccMa]?.['Tên NCC']||nccMa)
    setNgayDat(new Date().toISOString().split('T')[0])
    setGhiChuDon(`Nhập bổ sung cho ${maDH}`)
    setItems(ds.map((d,i)=>({
      _id:i+1,
      maSP:d.maSP,
      tenSP:spMap[d.maSP]?.['Tên sản phẩm']||d.maSP,
      donVi:spMap[d.maSP]?.['Đơn vị tính']||'',
      soLuong:d.slDat, // số lượng đặt ban đầu (sẽ tính thiếu sau)
      giaNhap:Number(spMap[d.maSP]?.['Giá nhập NCC']||0)+Number(spMap[d.maSP]?.['CPVC về kho']||0),
      ngayVe:'', ghiChu:`Bổ sung thiếu cho ${maDH}`
    })))
    setSearchSP(Object.fromEntries(ds.map((d,i)=>[i+1,spMap[d.maSP]?.['Tên sản phẩm']||d.maSP])))
    setShowBoSung(false)
    setEditDon(null)
    setShowModal(true)
  }

  function moTaoMoi(){setEditDon(null);resetForm();setShowModal(true)}
  const [isViewOnly, setIsViewOnly] = useState(false)

  function moSua(grp:any[]){
    setEditDon(grp)
    const first=grp[0]
    // Chế độ xem - không cho sửa
    const allDone = grp.every(d=>['Đã nhập kho','Nhập thừa','Nhập thiếu'].includes(d['Trạng thái']||''))
    setIsViewOnly(allDone)
    setMaNCC(first['Mã NCC']||'')
    setNgayDat(first['Ngày đặt']?.split('T')[0]||new Date().toISOString().split('T')[0])
    setGhiChuDon(first['Ghi chú']||'')
    // Load tất cả SP vào form - chỉ cho sửa SP chưa nhập kho
    const spCoTheSua = grp.filter(d=>d['Trạng thái']!=='Đã nhập kho')
    const spLoad = spCoTheSua.length > 0 ? spCoTheSua : grp // nếu tất cả đã nhập kho thì load hết để xem
    setItems(spLoad.map((d,i)=>({
      _id:i+1,
      maSP:d['Mã SP']||'', tenSP:spMap[d['Mã SP']]?.['Tên sản phẩm']||d['Mã SP']||'',
      donVi:spMap[d['Mã SP']]?.['Đơn vị tính']||'',
      soLuong:Number(d['Số lượng đặt']||1), giaNhap:Number(d['Giá nhập dự kiến']||0),
      ngayVe:d['Ngày dự kiến về']?.split('T')[0]||'', ghiChu:d['Ghi chú']||''
    })))
    setSearchSP(Object.fromEntries(spLoad.map((d,i)=>[i,spMap[d['Mã SP']]?.['Tên sản phẩm']||d['Mã SP']||''])))
    setShowModal(true)
  }
  function resetForm(){
    setIsViewOnly(false)
    setMaNCC('');setSearchNCC('');_idRef.current=1
    setNgayDat(new Date().toISOString().split('T')[0])
    setGhiChuDon('')
    setItems([{_id:1,maSP:'',tenSP:'',donVi:'Cái',soLuong:1,giaNhap:0,ngayVe:'',ghiChu:''}])
    setSearchSP({});setShowSP({})
  }

  async function luuDon(){
    if (!maNCC){showMsg2('Chọn nhà cung cấp',false);return}
    const valid=items.filter(it=>it.maSP&&it.soLuong>0)
    if (!valid.length){showMsg2('Thêm ít nhất 1 sản phẩm',false);return}
    setLoading(true)
    try {
      if (editDon) {
        const full3 = editDon[0]['Mã đặt hàng']||''
        const parts3 = full3.split('-')
        const maDH = parts3.length>=3 ? parts3.slice(0,3).join('-') : full3
        // Chỉ xóa SP chưa nhập kho, giữ lại SP đã nhập kho
        const spGiuLai = editDon.filter(d=>d['Trạng thái']==='Đã nhập kho')
        const spXoa = editDon.filter(d=>d['Trạng thái']!=='Đã nhập kho')
        for (const d of spXoa) {
          await fetch(`/api/dat-hang-ncc?id=${d['Id']||d['id']}`,{method:'DELETE'})
        }
        // Tạo lại SP chưa nhập kho
        let idx = spGiuLai.length
        for (let i=0;i<valid.length;i++) {
          const it=valid[i]
          // Bỏ qua SP đã nhập kho (không tạo lại)
          if(spGiuLai.find(d=>d['Mã SP']===it.maSP)) continue
          idx++
          const forceMaDH = (spGiuLai.length+valid.length)>1 ? `${maDH}-${idx}` : maDH
          await fetch('/api/dat-hang-ncc',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({maNCC,ngayDat,ghiChu:ghiChuDon,forceMaDH,items:[it]})})
        }
        showMsg2(`✅ Đã cập nhật đơn ${maDH}`)
      } else {
        const maDonGoc = ghiChuDon.match(/cho (DH-NCC-\d+)/)?.[1]||''
        const res=await fetch('/api/dat-hang-ncc',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({maNCC,ngayDat,ghiChu:ghiChuDon,maDonGoc,items:valid})})
        const d=await res.json()
        if (!res.ok) throw new Error(d.message)
        showMsg2(`✅ Đã tạo ${d.maDH} — ${d.soSP} SP`)
        // Reload data ngay
        window.location.reload()
        return
      }
      setShowModal(false);resetForm();window.location.reload()
    } catch(e:any){setMsg('❌ '+(e.message||'Lỗi'));setMsgOk(false);setTimeout(()=>setMsg(''),5000)}
    finally{setLoading(false)}
  }

  async function doiTrangThai(grp:any[],tt:string){
    try {
      for (const d of grp) {
        await fetch('/api/dat-hang-ncc',{method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id:Number(d['Id']||d['id']),'Trạng thái':tt})})
      }
      const ids=new Set(grp.map(d=>d['Id']||d['id']))
      setLocal(prev=>prev.map(d=>ids.has(d['Id']||d['id'])?{...d,'Trạng thái':tt}:d))
      router.refresh()
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  async function xacNhanXoa(){
    if (!xoaItem) return
    const full2 = xoaItem['Mã đặt hàng']||''
    const parts2 = full2.split('-')
    const key2 = parts2.length>=3 ? parts2.slice(0,3).join('-') : full2
    const grp=grouped[key2]||[xoaItem]
    for (const d of grp) await fetch(`/api/dat-hang-ncc?id=${d['Id']||d['id']}`,{method:'DELETE'})
    const ids=new Set(grp.map(d=>d['Id']||d['id']))
    setLocal(prev=>prev.filter(d=>!ids.has(d['Id']||d['id'])))
    showMsg2('✅ Đã xóa');setXoaItem(null)
  }

  async function luuSPMoi(){
    if (!newTenSP.trim()){showMsg2('Nhập tên SP',false);return}
    setSavingSP(true)
    try {
      const res=await fetch('/api/san-pham',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({'Mã SP':newMaSP.trim()||undefined,'Tên sản phẩm':newTenSP.trim(),'Danh mục':newDanhMuc||'','Loại SP':newLoai,'Đơn vị tính':newDonVi,'Giá nhập NCC':newGiaNhapNCC,'CPVC về kho':newCpvcKho,'Giá bán buôn':newGia,'Giá bán lẻ':newGiaLe,'Tồn kho':newTonKho,'Ngưỡng cảnh báo':newNguong,'Thông số kỹ thuật':newThongSo,'Ghi chú':newGhiChu})})
      const d=await res.json()
      if (!res.ok) throw new Error(d.message)
      const newSP={...d.data,'Mã SP':d.data?.['Mã SP']||newMaSP,'Giá nhập NCC':newGiaNhapNCC,'CPVC về kho':newCpvcKho}
      setSpLocal(p=>[newSP,...p])
      showMsg2(`✅ Đã thêm SP: ${newTenSP}`)
      setShowNewSP(false);setNewTenSP('');setNewMaSP('');setNewLoai('Theo yêu cầu');setNewDonVi('Cái');setNewGia(0);setNewGiaLe(0);setNewGhiChu('');setNewThongSo('');setNewTonKho(0);setNewNguong(5);setNewDanhMuc('')
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setSavingSP(false)}
  }

  function xuatPDF(grp:any[]){
    const ncc=nccMap[grp[0]['Mã NCC']]||{}
    const maDHF=grp[0]['Mã đặt hàng']||''
    const maDHP=maDHF.split('-')
    const maDH=maDHP.length>=3?maDHP.slice(0,3).join('-'):maDHF
    const rows=grp.map(it=>{
      const sp=spMap[it['Mã SP']]||{}
      const tt=Number(it['Số lượng đặt']||0)*Number(it['Giá nhập dự kiến']||0)
      return `<tr><td>${it['Mã SP']||'—'}</td><td>${sp['Tên sản phẩm']||it['Mã SP']||'—'}</td><td style="text-align:center">${it['Số lượng đặt']||0}</td><td style="text-align:center">${sp['Đơn vị tính']||'—'}</td><td style="text-align:right">${fVND(it['Giá nhập dự kiến'])}đ</td><td style="text-align:right">${fVND(tt)}đ</td><td>${fDate(it['Ngày dự kiến về'])}</td><td>${it['Ghi chú']||''}</td></tr>`
    }).join('')
    const tong=grp.reduce((s,it)=>s+Number(it['Số lượng đặt']||0)*Number(it['Giá nhập dự kiến']||0),0)
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Đơn đặt hàng ${maDH}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;font-size:13px;}h1{font-size:20px;color:#1e3a5f;}
    .info{display:flex;gap:16px;margin:16px 0;}.box{flex:1;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;padding:12px 16px;}
    table{width:100%;border-collapse:collapse;margin-top:16px;}th{background:#1e3a5f;color:white;padding:8px 10px;font-size:12px;}
    td{padding:7px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;}tr:nth-child(even) td{background:#F9FAFB;}
    .tong{text-align:right;margin-top:12px;font-size:15px;font-weight:bold;color:#1e3a5f;}
    .footer{margin-top:40px;display:flex;justify-content:space-between;}
    .sign{text-align:center;width:200px;}.sign p{font-weight:bold;margin-bottom:50px;}
    @media print{button{display:none!important;}}</style></head><body>
    <div style="display:flex;justify-content:space-between">
      <div><h1>🪑 Nội Thất Tính Tuyết</h1><p style="color:#6B7280;margin:0">Phiếu đặt hàng nhà cung cấp</p></div>
      <div style="text-align:right"><div style="font-size:20px;font-weight:bold;color:#1e3a5f">${maDH}</div><div style="color:#6B7280">Ngày đặt: ${fDate(grp[0]['Ngày đặt'])}</div></div>
    </div>
    <div class="info">
      <div class="box"><b>📦 Nhà cung cấp</b><br>${ncc['Tên NCC']||grp[0]['Mã NCC']||'—'}<br>Mã: ${grp[0]['Mã NCC']||'—'}${ncc['Số điện thoại']?'<br>SĐT: '+ncc['Số điện thoại']:''} ${ncc['Số TK ngân hàng']?'<br>STK: '+ncc['Số TK ngân hàng']:''}</div>
      <div class="box"><b>🏪 Bên đặt hàng</b><br>Nội Thất Tính Tuyết<br>Người đặt: ${user.hoTen||user.tenDangNhap||'—'}${grp[0]['Ghi chú']?'<br>Ghi chú: '+grp[0]['Ghi chú']:''}</div>
    </div>
    <table><thead><tr><th>Mã SP</th><th>Tên sản phẩm</th><th>SL</th><th>ĐVT</th><th>Đơn giá</th><th>Thành tiền</th><th>Ngày hàng về</th><th>Ghi chú</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="tong">Tổng cộng: ${fVND(tong)}đ</div>
    <div class="footer"><div class="sign"><p>Đại diện NCC</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
    <div class="sign"><p>Người đặt hàng</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div></div>
    <script>window.onload=()=>window.print()</script></body></html>`
    const w=window.open('','_blank')
    if(w){w.document.write(html);w.document.close()}
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .ncc-t th,.ncc-t td{padding:7px 10px;vertical-align:top;}
        .ncc-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .mk{background:white;border-radius:12px;padding:28px;width:100%;max-width:1200px;max-height:95vh;overflow-y:auto;}
        .mk2{background:white;border-radius:12px;padding:24px;width:100%;max-width:460px;}
        .sp-row{display:grid;grid-template-columns:2fr 60px 80px 110px 110px 100px 1fr 32px;gap:8px;padding:10px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:6px;background:#FAFBFD;align-items:start;}
        .db{position:absolute;top:calc(100%+3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:200px;overflow-y:auto;}
        .di{padding:8px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🛒 Đặt hàng NCC</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {groupKeys.length} đơn
            {chuaXN>0&&<span style={{marginLeft:'8px',color:'#D97706',fontWeight:600}}>⏳ {chuaXN} chờ xác nhận</span>}
          </p>
        </div>
        <div style={{display:'flex',gap:'8px'}}>
          {Object.keys(donNhapThieu).length>0&&<button onClick={()=>setShowBoSung(true)}
            style={{background:'#FEF3C7',color:'#92400E',border:'1px solid #FCD34D',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            📋 Bổ sung đơn thiếu ({Object.keys(donNhapThieu).length})
          </button>}
          <button onClick={moTaoMoi} style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>+ Tạo đơn đặt hàng</button>
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm mã đơn, NCC, SP..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'180px',maxWidth:'260px'}}/>
          <select className="input" value={filterNCC} onChange={e=>setFilterNCC(e.target.value)} style={{width:'180px'}}>
            <option value="Tất cả">Tất cả NCC</option>
            {nccDanhSach.map(n=><option key={n.ma} value={n.ma}>{n.ten}</option>)}
          </select>
          <div style={{display:'flex',gap:'6px'}}>
            {['Tất cả','Chưa nhập kho',...TRANG_THAI].map(tt=>{
              const c=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
              return <button key={tt} onClick={()=>setFilterTT(tt)} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid',borderColor:filterTT===tt?c.c:'var(--border)',background:filterTT===tt?c.bg:'white',color:filterTT===tt?c.c:'var(--text-secondary)',fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer'}}>{tt}</button>
            })}
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="ncc-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn</th>
                <th style={{textAlign:'left',fontWeight:700}}>Tên NCC</th>
                <th style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                <th style={{textAlign:'center',fontWeight:700}}>SL đặt</th>
                <th style={{textAlign:'center',fontWeight:700,whiteSpace:'nowrap'}}>Ngày hàng về</th>
                <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                <th style={{textAlign:'center',fontWeight:700,width:'130px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {keysTrang.length===0?(
                <tr><td colSpan={7} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có đơn hàng nào</td></tr>
              ):keysTrang.map((maDH,i)=>{
                const grp=grouped[maDH]
                const first=grp[0]
                const ncc=nccMap[first['Mã NCC']]||{}
                const tt=first['Trạng thái']||'Chờ xác nhận'
                const ttC=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
                return (
                  <tr key={maDH} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:700,color:'#374151',whiteSpace:'nowrap',verticalAlign:'top'}}>
                      <button onClick={()=>moSua(grp)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--primary)',fontWeight:700,fontSize:'13px',padding:0,textDecoration:'underline'}}>{maDH}</button>
                      <div style={{fontSize:'11px',color:'#9CA3AF'}}>{fDate(first['Ngày đặt'])}</div>
                    </td>
                    <td style={{verticalAlign:'top'}}>
                      <div style={{fontWeight:600}}>{ncc['Tên NCC']||first['Mã NCC']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{first['Mã NCC']}</div>
                    </td>
                    <td style={{verticalAlign:'top'}}>
                      {grp.map((d,j)=>{
                        const sp=spMap[d['Mã SP']]||{}
                        return <div key={j} style={{fontSize:'13px',fontWeight:500,padding:'3px 0',borderBottom:j<grp.length-1?'1px dashed #F0F0F0':'none'}}>{sp['Tên sản phẩm']||d['Mã SP']||'—'}</div>
                      })}
                    </td>
                    <td style={{textAlign:'center',verticalAlign:'top'}}>
                      {grp.map((d,j)=><div key={j} style={{fontSize:'12px',padding:'2px 0',borderBottom:j<grp.length-1?'1px dashed #F0F0F0':'none',fontWeight:600}}>{d['Số lượng đặt']||0}</div>)}
                    </td>
                    <td style={{textAlign:'center',verticalAlign:'top'}}>
                      {grp.map((d,j)=><div key={j} style={{fontSize:'12px',padding:'2px 0',borderBottom:j<grp.length-1?'1px dashed #F0F0F0':'none'}}>{fDate(d['Ngày dự kiến về'])}</div>)}
                    </td>
                    <td style={{verticalAlign:'top'}}>
                      {grp.map((d,j)=>{
                        const dtt=d['Trạng thái']||'Chờ xác nhận'
                        const dc=TT_COLOR[dtt]||{bg:'#F3F4F6',c:'#374151'}
                        return <div key={j} style={{padding:'2px 0',borderBottom:j<grp.length-1?'1px dashed #F0F0F0':'none'}}>
                          <select value={dtt} onChange={e=>doiTrangThai([d],e.target.value)}
                            style={{padding:'4px 8px',borderRadius:'10px',border:'none',background:dc.bg,color:dc.c,fontWeight:700,fontSize:'12px',cursor:'pointer',width:'100%'}}>
                            {TRANG_THAI.map(t=><option key={t}>{t}</option>)}
                          </select>
                        </div>
                      })}
                      {grp.length>1&&grp.some(d=>!['Đã xác nhận','Đã nhập kho','Nhập thừa'].includes(d['Trạng thái']||''))&&(
                        <button onClick={()=>doiTrangThai(grp.filter(d=>!['Đã nhập kho','Nhập thừa'].includes(d['Trạng thái']||'')),'Đã xác nhận')}
                          style={{marginTop:'4px',width:'100%',padding:'3px 6px',borderRadius:'6px',border:'1px solid #065F46',background:'#D1FAE5',color:'#065F46',fontSize:'10px',fontWeight:700,cursor:'pointer'}}>
                          ✅ Xác nhận tất cả
                        </button>
                      )}
                    </td>
                    <td style={{textAlign:'center',verticalAlign:'middle'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px',width:'100px'}}>
                        {!grp.every(d=>['Đã nhập kho','Nhập thừa','Nhập thiếu'].includes(d['Trạng thái']||''))&&<button onClick={()=>moSua(grp)} style={{gridColumn:'1/-1',padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600,textAlign:'center'}}>✏️ Sửa</button>}
                        <button onClick={()=>xuatPDF(grp)} style={{padding:'5px 4px',borderRadius:'5px',border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600,textAlign:'center'}}>📄 PDF</button>
                        <button onClick={()=>setXoaItem(first)} style={{padding:'5px 4px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600,textAlign:'center'}}>🗑️ Xóa</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {tongTrangG>1&&(
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0'}}>
            <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{groupKeys.length} đơn</span>
            <div style={{display:'flex',gap:'4px'}}>
              <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
              {Array.from({length:tongTrangG},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>)}
              <Btn disabled={trangHT===tongTrangG} onClick={()=>setTrang(t=>t+1)}>›</Btn>
            </div>
          </div>
        )}
      </div>

      {/* MODAL TẠO/SỬA ĐƠN */}
      {showModal&&(
        <div className="ov" onClick={()=>{setShowModal(false);resetForm()}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div>
                <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>
                  {isViewOnly?'👁️ Xem chi tiết đơn':editDon?'✏️ Chỉnh sửa đơn':'🛒 Tạo đơn đặt hàng NCC'}
                </h2>
                {editDon&&<div style={{fontSize:'12px',color:'var(--primary)',fontWeight:600,marginTop:'2px'}}>
                  {(()=>{const f=editDon[0]['Mã đặt hàng']||'';const p=f.split('-');return p.length>=3?p.slice(0,3).join('-'):f})()}
                </div>}
              </div>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#6B7280'}}>✕</button>
            </div>

            {/* Thông tin chung */}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:'12px'}}>
                <div style={{position:'relative'}}>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Nhà cung cấp *</label>
                  <input className="input" placeholder="Tìm tên, mã, địa chỉ NCC..."
                    value={searchNCC}
                    onChange={e=>{setSearchNCC(e.target.value);setMaNCC('');setShowNCC(true)}}
                    onFocus={()=>setShowNCC(true)}
                    onBlur={()=>setTimeout(()=>setShowNCC(false),200)}/>
                  {maNCC&&nccMap[maNCC]&&<div style={{fontSize:'11px',color:'var(--primary)',fontWeight:600,marginTop:'3px'}}>✅ {nccMap[maNCC]['Tên NCC']} — {maNCC}</div>}
                  {showNCC&&(
                    <div className="db">
                      {nccList.filter(n=>{
                        const q=boDau(searchNCC)
                        return !q||boDau(n['Tên NCC']||'').includes(q)||boDau(n['Mã NCC']||'').includes(q)||boDau(n['Địa chỉ']||'').includes(q)||boDau(n['Số điện thoại']||'').includes(q)
                      }).map(n=>(
                        <div key={n['Mã NCC']} className="di" onMouseDown={e=>{e.preventDefault();setMaNCC(n['Mã NCC']);setSearchNCC(n['Tên NCC']);setShowNCC(false)}}>
                          <div style={{fontWeight:600}}>{n['Tên NCC']} <span style={{fontSize:'11px',color:'#6B7280'}}>{n['Mã NCC']}</span></div>
                          {n['Số điện thoại']&&<div style={{fontSize:'11px',color:'#6B7280'}}>📞 {n['Số điện thoại']} {n['Địa chỉ']&&'· 📍 '+n['Địa chỉ']}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ngày đặt</label>
                  <input className="input" type="date" value={ngayDat} onChange={e=>setNgayDat(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú đơn</label>
                  <input className="input" placeholder="Ghi chú..." value={ghiChuDon} onChange={e=>setGhiChuDon(e.target.value)}/>
                </div>
              </div>
              {maNCC&&nccMap[maNCC]&&(
                <div style={{marginTop:'8px',fontSize:'12px',color:'#374151',background:'var(--primary-pale)',borderRadius:'6px',padding:'8px 12px'}}>
                  <span style={{fontWeight:600}}>{nccMap[maNCC]['Tên NCC']}</span>
                  {nccMap[maNCC]['Số điện thoại']&&<span style={{marginLeft:'12px',color:'#6B7280'}}>📞 {nccMap[maNCC]['Số điện thoại']}</span>}
                  {nccMap[maNCC]['Số TK ngân hàng']&&<span style={{marginLeft:'12px',color:'#6B7280'}}>🏦 {nccMap[maNCC]['Số TK ngân hàng']}</span>}
                </div>
              )}
            </div>

            {/* SP header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
              <label style={{fontSize:'12px',fontWeight:700,color:'var(--primary)'}}>📦 SẢN PHẨM ĐẶT HÀNG</label>
              {!isViewOnly&&<div style={{display:'flex',gap:'8px'}}>
                <button onClick={()=>setShowNewSP(true)} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #8B5CF6',background:'#F5F3FF',color:'#7C3AED',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>✨ Tạo SP mới</button>
                <button onClick={addItem} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid var(--primary)',background:'white',color:'var(--primary)',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>+ Thêm SP</button>
              </div>}
            </div>
            {/* Header cột */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 90px 80px 110px 130px 100px 1fr 32px',gap:'8px',padding:'4px 10px',fontSize:'11px',color:'#6B7280',fontWeight:600}}>
              <div>Sản phẩm</div><div style={{textAlign:'center'}}>SL</div><div>ĐVT</div><div>Giá nhập (đ)</div><div>Thành tiền</div><div>Ngày hàng về</div><div>Ghi chú</div><div></div>
            </div>
            {items.map((it)=>(
              <div key={it._id} className="sp-row">
                {/* SP */}
                <SPItemInput key={`${it._id}-${it.maSP}`} spList={spLocal} initVal={it.tenSP} onSelect={sp=>chonSP(it._id,sp)}/>
                {/* SL */}
                <input className="input" type="number" min="1" value={it.soLuong||''} onChange={e=>updItem(it._id,'soLuong',Number(e.target.value))} style={{fontSize:'12px',textAlign:'center'}}/>
                {/* ĐVT */}
                <input className="input" value={it.donVi} onChange={e=>updItem(it._id,'donVi',e.target.value)} style={{fontSize:'12px'}} placeholder="ĐVT"/>
                {/* Giá nhập */}
                <div>
                  <input className="input" type="text" inputMode="numeric"
                    value={it.giaNhap?it.giaNhap.toLocaleString('vi-VN'):''}  placeholder="Nhập giá..."
                    onChange={e=>{const v=e.target.value.replace(/\./g,'');const n=Number(v);if(!isNaN(n))updItem(it._id,'giaNhap',n)}}
                    style={{fontSize:'12px'}}/>
                  {it.maSP&&spMap[it.maSP]&&(Number(spMap[it.maSP]['Giá nhập NCC']||0)+Number(spMap[it.maSP]['CPVC về kho']||0))>0&&it.giaNhap===0&&(
                    <div style={{fontSize:'10px',color:'#6B7280',marginTop:'1px',cursor:'pointer'}}
                      onClick={()=>updItem(it._id,'giaNhap',Number(spMap[it.maSP]['Giá nhập NCC']||0)+Number(spMap[it.maSP]['CPVC về kho']||0))}>
                      💡 {(Number(spMap[it.maSP]['Giá nhập NCC']||0)+Number(spMap[it.maSP]['CPVC về kho']||0)).toLocaleString('vi-VN')}đ
                    </div>
                  )}
                </div>
                {/* Thành tiền */}
                <div style={{padding:'8px 4px',fontSize:'12px',fontWeight:600,color:'var(--primary)',alignSelf:'center'}}>
                  {(Number(it.soLuong||0)*Number(it.giaNhap||0)).toLocaleString('vi-VN')}đ
                </div>
                {/* Ngày hàng về */}
                <input className="input" type="date" value={it.ngayVe} onChange={e=>updItem(it._id,'ngayVe',e.target.value)} style={{fontSize:'12px'}}/>
                {/* Ghi chú */}
                <input className="input" placeholder="Ghi chú..." value={it.ghiChu} onChange={e=>updItem(it._id,'ghiChu',e.target.value)} style={{fontSize:'12px'}}/>
                {/* Xóa */}
                {items.length>1&&!isViewOnly&&<button onClick={()=>removeItem(it._id)} style={{padding:'6px',borderRadius:'5px',border:'none',background:'#FEE2E2',color:'#DC2626',cursor:'pointer',fontSize:'14px',alignSelf:'center'}}>✕</button>}
              </div>
            ))}
            {tongTien>0&&<div style={{textAlign:'right',fontWeight:700,fontSize:'14px',color:'var(--primary)',marginTop:'8px',paddingRight:'8px'}}>Tổng dự kiến: {fVND(tongTien)}đ</div>}
            {!isViewOnly&&<button onClick={addItem} style={{marginTop:'8px',width:'100%',padding:'8px',borderRadius:'7px',border:'2px dashed var(--border)',background:'white',color:'var(--text-secondary)',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>+ Thêm sản phẩm</button>}

            {msg&&<div style={{padding:'8px 12px',borderRadius:'8px',marginBottom:'8px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}
            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              {!isViewOnly&&<button onClick={luuDon} disabled={loading} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':editDon?'✅ Cập nhật đơn':'✅ Tạo đơn đặt hàng'}
              </button>}
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{padding:'12px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:isViewOnly?'var(--primary)':'white',color:isViewOnly?'white':'inherit',cursor:'pointer',fontSize:'14px',fontWeight:isViewOnly?700:400,flex:isViewOnly?1:undefined}}>
                {isViewOnly?'✕ Đóng':'Huỷ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO SP MỚI — giống y SanPhamClient */}
      {showNewSP&&(
        <div className="ov" onClick={()=>setShowNewSP(false)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'680px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>+ Thêm sản phẩm mới</h2>
              <button onClick={()=>setShowNewSP(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {/* Hàng 1: Mã SP + Tên SP */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Mã SP (tự động nếu trống)</label>
                  <input className="input" placeholder="VD: SP-001" value={newMaSP} onChange={e=>setNewMaSP(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên sản phẩm *</label>
                  <input className="input" placeholder="Tên sản phẩm..." value={newTenSP} onChange={e=>setNewTenSP(e.target.value)} autoFocus/>
                </div>
              </div>
              {/* Hàng 2: Danh mục + Loại SP + ĐVT */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                    <label style={{fontSize:'11px',fontWeight:600}}>📂 Danh mục</label>
                    <button type="button" onClick={()=>setShowThemDM3(true)} style={{padding:'1px 6px',borderRadius:'4px',border:'1px solid #7C3AED',background:'#F5F3FF',color:'#7C3AED',fontSize:'10px',cursor:'pointer'}}>+ Thêm</button>
                  </div>
                  {msgDM3&&<div style={{fontSize:'11px',marginBottom:'3px',color:msgDM3.startsWith('✅')?'#065F46':'#DC2626'}}>{msgDM3}</div>}
                  {showThemDM3&&(
                    <div style={{display:'flex',gap:'4px',marginBottom:'4px'}}>
                      <input className="input" placeholder="Tên danh mục..." value={newTenDM3} autoFocus
                        onChange={e=>setNewTenDM3(e.target.value)}
                        onKeyDown={e=>e.key==='Enter'&&themDM3()}
                        style={{flex:1,fontSize:'12px'}}/>
                      <button onClick={themDM3} disabled={loadingDM3} style={{padding:'4px 8px',borderRadius:'5px',border:'none',background:'#7C3AED',color:'white',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
                        {loadingDM3?'⏳':'✅'}
                      </button>
                      <button onClick={()=>{setShowThemDM3(false);setNewTenDM3('')}} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #E5E7EB',background:'white',fontSize:'11px',cursor:'pointer'}}>✕</button>
                    </div>
                  )}
                  <DanhMucInput3 danhMucNames={danhMucNames3} value={newDanhMuc} onChange={setNewDanhMuc}/>
                </div>
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
              {/* Hàng 3: Giá nhập NCC + CPVC về kho + Giá bán buôn + Giá bán lẻ */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📦 Giá nhập NCC (đ)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={newGiaNhapNCC?newGiaNhapNCC.toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=e.target.value.replace(/\./g,'');const n=Number(v);if(!isNaN(n))setNewGiaNhapNCC(n)}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🚚 CPVC về kho (đ)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={newCpvcKho?newCpvcKho.toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=e.target.value.replace(/\./g,'');const n=Number(v);if(!isNaN(n))setNewCpvcKho(n)}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>💵 Giá bán buôn (đ)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={newGia?newGia.toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=e.target.value.replace(/\./g,'');const n=Number(v);if(!isNaN(n))setNewGia(n)}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🏷️ Giá bán lẻ (đ)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={newGiaLe?newGiaLe.toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=e.target.value.replace(/\./g,'');const n=Number(v);if(!isNaN(n))setNewGiaLe(n)}}/>
                </div>
              </div>
              {/* Hàng 4: Tồn kho + Ngưỡng cảnh báo */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📦 Tồn kho</label>
                  <input className="input" type="number" min="0" placeholder="0" value={newTonKho||''} onChange={e=>setNewTonKho(Number(e.target.value))}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>⚠️ Ngưỡng cảnh báo</label>
                  <input className="input" type="number" min="0" placeholder="1" value={newNguong||''} onChange={e=>setNewNguong(Number(e.target.value))}/>
                </div>
              </div>
              {/* Hàng 5: Thông số + Ghi chú */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Thông số kỹ thuật</label>
                  <input className="input" placeholder="VD: 120x60x75cm, màu nâu gỗ..." value={newThongSo} onChange={e=>setNewThongSo(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                  <input className="input" placeholder="Ghi chú thêm..." value={newGhiChu} onChange={e=>setNewGhiChu(e.target.value)}/>
                </div>
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuSPMoi} disabled={savingSP} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:savingSP?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:savingSP?'not-allowed':'pointer'}}>
                  {savingSP?'⏳ Đang lưu...':'✅ Lưu sản phẩm'}
                </button>
                <button onClick={()=>setShowNewSP(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal cảnh báo SP trùng */}
      {trungSP&&(
        <div className="ov" onClick={()=>setTrungSP(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'380px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>⚠️</div>
            <h2 style={{fontSize:'15px',fontWeight:700,margin:'0 0 8px'}}>Sản phẩm đã có trong đơn</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 16px'}}>
              <strong>{trungSP.tenSP}</strong> đã có trong danh sách.<br/>Bạn có muốn tăng số lượng lên không?
            </p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanGopSP} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,cursor:'pointer'}}>✅ Tăng số lượng</button>
              <button onClick={()=>setTrungSP(null)} style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Giữ riêng</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal chọn đơn thiếu để bổ sung */}
      {showBoSung&&(
        <div className="ov" onClick={()=>setShowBoSung(false)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'560px'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>📋 Chọn đơn cần bổ sung</h2>
              <button onClick={()=>setShowBoSung(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <p style={{fontSize:'13px',color:'#6B7280',marginBottom:'14px'}}>Các đơn đang ở trạng thái "Nhập thiếu" — chọn để tạo đơn bổ sung:</p>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {Object.entries(donNhapThieu).map(([maDH,ds])=>{
                const ncc=nccMap[ds[0].maNCC]||{}
                return (
                  <div key={maDH} onClick={()=>moBoSung(maDH)}
                    style={{padding:'12px',borderRadius:'8px',border:'1px solid #FCD34D',background:'#FFFBEB',cursor:'pointer'}}>
                    <div style={{fontWeight:700,color:'#92400E'}}>{maDH}</div>
                    <div style={{fontSize:'12px',color:'#6B7280',marginTop:'4px'}}>
                      NCC: {ncc['Tên NCC']||ds[0].maNCC} · {ds.length} SP thiếu
                    </div>
                    <div style={{fontSize:'12px',marginTop:'4px'}}>
                      {ds.map(d=>(
                        <span key={d.maSP} style={{marginRight:'8px'}}>
                          {spMap[d.maSP]?.['Tên sản phẩm']||d.maSP}: <strong>{d.slDat}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal xóa */}
      {xoaItem&&(
        <div className="ov" onClick={()=>setXoaItem(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'340px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'15px',fontWeight:700,margin:'0 0 8px'}}>Xác nhận xóa đơn?</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 16px'}}>Xóa toàn bộ đơn <strong>{(()=>{const f=xoaItem['Mã đặt hàng']||'';const p=f.split('-');return p.length>=3?p.slice(0,3).join('-'):f})()} </strong>?</p>
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

function MoneyInput({value,onChange,style={}}:{value:number;onChange:(v:number)=>void;style?:any}){
  const [display,setDisplay]=useState(value>0?value.toLocaleString('vi-VN'):'')
  useEffect(()=>{setDisplay(value>0?value.toLocaleString('vi-VN'):'')},[value])
  return (
    <input className="input" inputMode="numeric" placeholder="0" style={style}
      value={display}
      onChange={e=>{
        const raw=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'')
        const num=Number(raw)||0
        setDisplay(num>0?num.toLocaleString('vi-VN'):'')
        onChange(num)
      }}/>
  )
}

function Btn({children,active,disabled,onClick}:any){
  return <button onClick={onClick} disabled={disabled} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:active?'var(--primary)':'var(--border)',background:active?'var(--primary)':disabled?'#F9FAFB':'white',color:active?'white':disabled?'#CCC':'var(--text-secondary)',cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:active?700:400,minWidth:'32px'}}>{children}</button>
}

function SPItemInput({spList,initVal,onSelect}:{spList:any[];initVal:string;onSelect:(sp:any)=>void}){
  const [q,setQ]=useState(initVal)
  const [show,setShow]=useState(false)
  function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
  const filtered=spList.filter(s=>{const qb=boDau(q).slice(0,20);return !qb||boDau(s['Tên sản phẩm']||'').includes(qb)||boDau(s['Mã SP']||'').includes(qb)}).slice(0,10)
  return (
    <div style={{position:'relative'}}>
      <input className="input" placeholder="Tìm tên hoặc mã SP..." value={q}
        onChange={e=>{setQ(e.target.value);setShow(true)}}
        onFocus={()=>setShow(true)}
        onBlur={()=>setTimeout(()=>setShow(false),200)}
        style={{fontSize:'12px'}}/>
      {show&&filtered.length>0&&(
        <div style={{position:'absolute',top:'calc(100% + 2px)',left:0,right:0,zIndex:300,background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,.15)',maxHeight:'200px',overflowY:'auto'}}>
          {filtered.map((sp,j)=>(
            <div key={j} style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px'}}
              onMouseDown={e=>{e.preventDefault();setQ(sp['Tên sản phẩm']||'');setShow(false);onSelect(sp)}}>
              <span style={{fontWeight:600}}>{sp['Tên sản phẩm']}</span>
              <span style={{fontSize:'11px',color:'#6B7280',marginLeft:'8px'}}>{sp['Mã SP']}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DanhMucInput3({danhMucNames,value,onChange}:{danhMucNames:string[];value:string;onChange:(v:string)=>void}){
  const [show,setShow]=useState(false)
  const [q,setQ]=useState(value)
  useEffect(()=>{setQ(value)},[value])
  function boDau3(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
  const filtered=danhMucNames.filter(dm=>{const qb=boDau3(q);return !qb||boDau3(dm).includes(qb)}).slice(0,10)
  return (
    <div style={{position:'relative'}}>
      <input className="input" placeholder="Gõ hoặc chọn danh mục..." value={q}
        onChange={e=>{setQ(e.target.value);onChange(e.target.value);setShow(true)}}
        onFocus={()=>setShow(true)} onBlur={()=>setTimeout(()=>setShow(false),200)}
        style={{background:value?'#F5F3FF':'',color:value?'#7C3AED':''}}/>
      {show&&filtered.length>0&&(
        <div style={{position:'absolute',top:'calc(100%+2px)',left:0,right:0,zIndex:400,background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,.15)',maxHeight:'180px',overflowY:'auto'}}>
          {filtered.map(dm=>(
            <div key={dm} style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px',fontWeight:500}}
              onMouseDown={e=>{e.preventDefault();setQ(dm);onChange(dm);setShow(false)}}>
              📂 {dm}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

