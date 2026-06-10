'use client'
// components/SanPhamClient.tsx

import { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import * as XLSX from 'xlsx'

function tinhTonKho(ton:number, canhBaoTon:number): {label:string,color:string,bg:string} {
  if (ton < 0)  return {label:'Cần nhập',  color:'#A16207', bg:'#FEF9C3'}
  if (ton === 0) return {label:'Hết hàng', color:'#DC2626', bg:'#FEE2E2'}
  if (ton <= canhBaoTon) return {label:'Sắp hết', color:'#D97706', bg:'#FEF3C7'}
  return {label:'Còn hàng', color:'#16A34A', bg:'#D1FAE5'}
}

function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}

// LOAI_SP và DON_VI đọc động từ NocoDB qua useMeta
const SO_DONG = 10

function MoneyInput({value,onChange,placeholder='0'}:{value:number;onChange:(v:number)=>void;placeholder?:string}){
  const [display,setDisplay]=useState(value>0?value.toLocaleString('vi-VN'):'')
  useEffect(()=>{setDisplay(value>0?value.toLocaleString('vi-VN'):'')},[value])
  return (
    <input className="input" inputMode="numeric" placeholder={placeholder}
      value={display}
      onChange={e=>{
        const raw=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'')
        const num=Number(raw)||0
        setDisplay(num>0?num.toLocaleString('vi-VN'):'')
        onChange(num)
      }}/>
  )
}

export default function SanPhamClient({ danhSach, danhMucList=[], nhapKhoList=[], nccMap={}, user }:{
  danhSach:any[]; danhMucList:any[]
  nhapKhoList:any[]; nccMap:Record<string,string>; user:UserSession
}) {
  const router   = useRouter()
  const LOAI_SP = ['Phổ thông','Theo yêu cầu']
  const DON_VI  = ['Cái','Chiếc','Bộ']
  const seqRef   = useRef(0)
  const nextKey  = () => `sp${++seqRef.current}`
  const fileRef  = useRef<HTMLInputElement>(null)

  const [local,    setLocal]    = useState(() => danhSach.map(sp=>({...sp,_key:nextKey(),_rowId:Number(sp['Id']||sp['id']||0)})))
  const [search,   setSearch]   = useState('')
  const [filterLoai,setFilterLoai] = useState('Tất cả')
  const [filterTon, setFilterTon]  = useState('Tất cả')
  const [filterDanhMuc, setFilterDanhMuc] = useState('Tất cả')
  const [showNgungKD,  setShowNgungKD]  = useState(false) // hiện/ẩn SP ngừng KD
  // State quản lý danh mục
  const [danhMucLocal,  setDanhMucLocal]  = useState(danhMucList)
  const [showQLDM,      setShowQLDM]      = useState(false)
  const [newTenDM,      setNewTenDM]      = useState('')
  const [editDM,        setEditDM]        = useState<any>(null)
  const [loadingDM,     setLoadingDM]     = useState(false)
  const [msgDM,         setMsgDM]         = useState('')
  const [trangDM,       setTrangDM]       = useState(1)
  const [searchDM,      setSearchDM]      = useState('')
  const SO_DONG_DM = 10
  const [trang,    setTrang]    = useState(1)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)
  const [msgModal, setMsgModal] = useState('')
  const [msgModalOk,setMsgModalOk]=useState(true)
  const [showModal,setShowModal]= useState(false)
  const [editSP,   setEditSP]   = useState<any>(null)
  const [loading,  setLoading]  = useState(false)
  const [xoaSP,    setXoaSP]    = useState<any>(null)
  const [lichSuGiaSP, setLichSuGiaSP] = useState<any>(null) // SP đang xem lịch sử giá
  const [dangXoa,  setDangXoa]  = useState(false)
  const [xoaCheck, setXoaCheck] = useState<any>(null)
  const [loadingXoaCheck, setLoadingXoaCheck] = useState(false)

  // Form fields
  const [maSP,      setMaSP]      = useState('')
  const [tenSP,     setTenSP]     = useState('')
  const [loaiSP,    setLoaiSP]    = useState('Phổ thông')
  const [danhMucSP, setDanhMucSP] = useState('')
  const [donVi,     setDonVi]     = useState('Cái')
  const [giaNhapNCC,setGiaNhapNCC]= useState(0)
  const [cpvcKho,  setCpvcKho]  = useState(0)
  const [giaBuon,  setGiaBuon]  = useState(0)
  const [giaLe,    setGiaLe]    = useState(0)
  const [tonKho,   setTonKho]   = useState(0)
  const [canhBao,  setCanhBao]  = useState(1)
  const [thongSo,  setThongSo]  = useState('')
  const [ghiChu,   setGhiChu]   = useState('')

  function showMsg2(text:string,ok=true){setMsg(text);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}
  function showMsgDM(t:string){setMsgDM(t);setTimeout(()=>setMsgDM(''),4000)}
  const danhMucNames = danhMucLocal.map((d:any)=>d['Tên danh mục']||'')
  const thongKeDM = danhMucLocal.reduce((m:Record<string,number>,d:any)=>{
    const ten=d['Tên danh mục']||''; const count=local.filter((sp:any)=>sp['Danh mục']===ten).length; m[ten]=count; return m
  },{} as Record<string,number>)

  async function themDanhMuc(){
    if(!newTenDM.trim()){showMsgDM('Nhập tên danh mục');return}
    if(danhMucNames.includes(newTenDM.trim())){showMsgDM('Danh mục đã tồn tại');return}
    setLoadingDM(true)
    try{
      const res=await fetch('/api/danh-muc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenDanhMuc:newTenDM.trim()})})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message)
      setDanhMucLocal((p:any[])=>[...p,{...d.data,'Tên danh mục':newTenDM.trim()}])
      setNewTenDM('')
      showMsgDM('✅ Đã thêm')
    }catch(e:any){showMsgDM('❌ '+(e.message||'Lỗi'))}
    finally{setLoadingDM(false)}
  }

  async function suaDanhMuc(){
    if(!editDM||!editDM.ten.trim()) return
    setLoadingDM(true)
    try{
      const res=await fetch('/api/danh-muc',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editDM.id,'Tên danh mục':editDM.ten.trim()})})
      if(!res.ok) throw new Error((await res.json()).message)
      setDanhMucLocal((p:any[])=>p.map((d:any)=>(d['Id']||d['id'])===editDM.id?{...d,'Tên danh mục':editDM.ten.trim()}:d))
      setEditDM(null); showMsgDM('✅ Đã cập nhật')
    }catch(e:any){showMsgDM('❌ '+(e.message||'Lỗi'))}
    finally{setLoadingDM(false)}
  }

  async function xoaDanhMuc(id:number, ten:string){
    const soSP=local.filter((sp:any)=>sp['Danh mục']===ten).length
    if(soSP>0){showMsgDM(`❌ Có ${soSP} SP đang dùng — không thể xóa`);return}
    if(!confirm(`Xóa danh mục "${ten}"?`)) return
    setLoadingDM(true)
    try{
      const res=await fetch(`/api/danh-muc?id=${id}`,{method:'DELETE'})
      if(!res.ok) throw new Error((await res.json()).message)
      setDanhMucLocal((p:any[])=>p.filter((d:any)=>(d['Id']||d['id'])!==id))
      showMsgDM('✅ Đã xóa')
    }catch(e:any){showMsgDM('❌ '+(e.message||'Lỗi'))}
    finally{setLoadingDM(false)}
  }

  const filtered = useMemo(()=>local.filter(sp=>{
    // Ẩn SP ngừng KD theo toggle
    const isNgung = sp['Trạng thái']==='Ngừng kinh doanh'
    if (isNgung && !showNgungKD) return false
    if (!isNgung && showNgungKD) return false
    if (filterLoai!=='Tất cả' && sp['Loại SP']!==filterLoai) return false
    if (filterDanhMuc!=='Tất cả' && (sp['Danh mục']||'Chưa phân loại')!==filterDanhMuc) return false
    if (filterTon !== 'Tất cả') {
      const ton = Number(sp['Tồn kho']||0)
      // "Hết hàng" bắt cả tồn âm (đã đặt hàng chưa về) lẫn tồn = 0
      if (filterTon === 'Hết hàng') {
        if (ton > 0) return false
      } else {
        const tt = tinhTonKho(ton, Number(sp['Ngưỡng cảnh báo']||0))
        if (tt.label !== filterTon) return false
      }
    }
    if (!search.trim()) return true
    const q=boDau(search)
    return boDau(sp['Tên sản phẩm']||'').includes(q)||boDau(sp['Mã SP']||'').includes(q)||boDau(sp['Loại SP']||'').includes(q)
  }),[local,search,filterLoai,filterTon,showNgungKD])

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  function reset(){setMaSP('');setTenSP('');setLoaiSP('Phổ thông');setDanhMucSP('');setDonVi('Cái');setGiaNhapNCC(0);setCpvcKho(0);setGiaBuon(0);setGiaLe(0);setTonKho(0);setCanhBao(1);setThongSo('');setGhiChu('');setEditSP(null)}
  function moThem(){reset();setShowModal(true)}
  function moSua(sp:any){
    setEditSP(sp);setMaSP(sp['Mã SP']||'');setTenSP(sp['Tên sản phẩm']||'')
    setLoaiSP(sp['Loại SP']||'Phổ thông');setDanhMucSP(sp['Danh mục']||'');setDonVi(sp['Đơn vị tính']||'Cái')
    setGiaNhapNCC(Number(sp['Giá nhập NCC']||0));setCpvcKho(Number(sp['CPVC về kho']||0));setGiaBuon(Number(sp['Giá bán buôn']||0));setGiaLe(Number(sp['Giá bán lẻ']||0))
    setTonKho(Number(sp['Tồn kho']||0));setCanhBao(Number(sp['Ngưỡng cảnh báo']||1))
    setThongSo(sp['Thông số kỹ thuật']||'');setGhiChu(sp['Ghi chú']||'')
    setShowModal(true)
  }

  async function luuSP(){
    if (!tenSP.trim()){showMsg2('Vui lòng nhập tên sản phẩm',false);return}
    setLoading(true)
    try {
      const data: Record<string,any> = {
        'Tên sản phẩm':tenSP.trim(),
        'Loại SP':loaiSP,
        'Danh mục':danhMucSP||'',
        'Đơn vị tính':donVi,
        'Giá nhập NCC':Number(giaNhapNCC)||0,
        'CPVC về kho':Number(cpvcKho)||0,
        'Giá bán buôn':Number(giaBuon)||0,
        'Giá bán lẻ':Number(giaLe)||0,
        'Tồn kho':Number(tonKho)||0,
        'Ngưỡng cảnh báo':Number(canhBao)||0,
        'Thông số kỹ thuật':thongSo.trim(),
        'Ghi chú':ghiChu.trim(),
      }
      if (maSP.trim()) data['Mã SP'] = maSP.trim()
      if (editSP) {
        const res = await fetch('/api/san-pham',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:editSP._rowId,...data})})
        const d = await res.json()
        if (!res.ok) throw new Error(d.message)
        setLocal(prev=>prev.map(sp=>sp._key===editSP._key?{...sp,...data}:sp))
        showMsg2('✅ Đã cập nhật: '+tenSP.trim())
      } else {
        const res = await fetch('/api/san-pham',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        const d = await res.json()
        if (!res.ok) throw new Error(d.message)
        const rec = d.data||{}
        const spMoi = {...data,'Mã SP':rec['Mã SP']||maSP||'','Id':rec['Id']||rec['id']||0,_key:nextKey(),_rowId:Number(rec['Id']||rec['id']||0)}
        setLocal(prev=>[spMoi,...prev])
        setTrang(1)
        showMsg2(`✅ Đã thêm: ${tenSP.trim()}`)
      }
      reset();setShowModal(false)
    } catch(e:any){setMsgModal('❌ '+(e.message||'Lỗi'));setMsgModalOk(false);setTimeout(()=>setMsgModal(''),5000)}
    finally{setLoading(false)}
  }

  async function moXoa(sp: any) {
    setXoaSP(sp); setXoaCheck(null); setLoadingXoaCheck(true)
    try {
      const maSP = sp['Mã SP'] || ''
      const res = await fetch('/api/san-pham?loai=kiem-tra-xoa&maSP='+encodeURIComponent(maSP))
      const d = await res.json(); setXoaCheck(d)
    } catch { setXoaCheck({ coTheXoa: false, lyDo: ['Lỗi kiểm tra'] }) }
    finally { setLoadingXoaCheck(false) }
  }

  async function xacNhanXoa(){
    if (!xoaSP || !xoaCheck?.coTheXoa) return
    setDangXoa(true)
    try {
      const maSP = xoaSP['Mã SP'] || ''
      const res = await fetch('/api/san-pham?id='+xoaSP._rowId+'&maSP='+encodeURIComponent(maSP),{method:'DELETE'})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.filter(sp=>sp._key!==xoaSP._key))
      showMsg2('✅ Đã xóa: '+xoaSP['Tên sản phẩm'])
      setXoaSP(null); setXoaCheck(null)
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi xóa'),false)}
    finally{setDangXoa(false)}
  }

  async function ngungKinhDoanh(sp: any) {
    try {
      const res = await fetch('/api/san-pham', {method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({id: sp._rowId, 'Trạng thái': 'Ngừng kinh doanh'})})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(s=>s._key===sp._key?{...s,'Trạng thái':'Ngừng kinh doanh'}:s))
      setXoaSP(null); setXoaCheck(null)
      showMsg2('⛔ Đã chuyển "'+sp['Tên sản phẩm']+'" sang Ngừng kinh doanh')
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  async function khoiPhucKinhDoanh(sp: any) {
    try {
      const res = await fetch('/api/san-pham', {method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({id: sp._rowId, 'Trạng thái': 'Đang bán'})})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(s=>s._key===sp._key?{...s,'Trạng thái':'Đang bán'}:s))
      showMsg2('✅ Đã khôi phục: '+sp['Tên sản phẩm'])
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  // Xuất Excel
  function xuatExcel(){
    const rows = filtered.map(sp=>({
      'Mã SP':sp['Mã SP']||'','Tên sản phẩm':sp['Tên sản phẩm']||'',
      'Loại SP':sp['Loại SP']||'','Đơn vị tính':sp['Đơn vị tính']||'',
      'Giá nhập NCC':Number(sp['Giá nhập NCC']||0),'CPVC về kho':Number(sp['CPVC về kho']||0),'Giá bán buôn':Number(sp['Giá bán buôn']||0),'Giá bán lẻ':Number(sp['Giá bán lẻ']||0),
      'Tồn kho':Number(sp['Tồn kho']||0),'Ngưỡng cảnh báo':Number(sp['Ngưỡng cảnh báo']||0),
      'Thông số kỹ thuật':sp['Thông số kỹ thuật']||'','Ghi chú':sp['Ghi chú']||'',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Sản phẩm')
    XLSX.writeFile(wb,'san-pham.xlsx')
  }

  // Tải file mẫu
  function taiFileMau(){
    const mau = [{'Mã SP':'(để trống = tự tạo)','Tên sản phẩm':'Bàn giám đốc gỗ tự nhiên','Loại SP':'Phổ thông','Đơn vị tính':'Bộ','Giá bán buôn':7000000,'Giá bán lẻ':8500000,'Tồn kho':5,'Ngưỡng cảnh báo':3,'Thông số kỹ thuật':'120x60x75cm','Ghi chú':''}]
    const ws = XLSX.utils.json_to_sheet(mau)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Mẫu nhập SP')
    XLSX.writeFile(wb,'mau-san-pham.xlsx')
  }

  // Nhập Excel
  async function nhapExcel(e:React.ChangeEvent<HTMLInputElement>){
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const buf = await file.arrayBuffer()
      const wb  = XLSX.read(buf)
      const ws  = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws) as any[]
      let ok=0, err=0
      for (const row of rows) {
        const ten = (row['Tên sản phẩm']||'').toString().trim()
        if (!ten) continue
        try {
          const res = await fetch('/api/san-pham',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
            'Mã SP':(row['Mã SP']||'').toString().trim()||undefined,
            'Tên sản phẩm':ten,'Loại SP':row['Loại SP']||'Phổ thông',
            'Đơn vị tính':row['Đơn vị tính']||'Cái',
            'Giá bán buôn':Number(row['Giá bán buôn']||0),'Giá bán lẻ':Number(row['Giá bán lẻ']||0),
            'Tồn kho':Number(row['Tồn kho']||0),'Ngưỡng cảnh báo':Number(row['Ngưỡng cảnh báo']||5),
            'Thông số kỹ thuật':(row['Thông số kỹ thuật']||'').toString(),
            'Ghi chú':(row['Ghi chú']||'').toString(),
          })})
          if (res.ok) ok++; else err++
        } catch { err++ }
      }
      showMsg2(`✅ Nhập xong: ${ok} SP thành công${err>0?`, ${err} lỗi`:''}`)
      router.refresh()
    } catch(e:any){ showMsg2('❌ Lỗi đọc file: '+e.message,false) }
    if (fileRef.current) fileRef.current.value=''
  }

  const tonThap = local.filter(sp=>tinhTonKho(Number(sp['Tồn kho']||0),Number(sp['Ngưỡng cảnh báo']||0)).label!=='Còn hàng').length

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .col-buon{display:none!important;}
        .sp-t th,.sp-t td{padding:8px 10px;}
        .sp-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:780px;max-height:93vh;overflow-y:auto;}
        @media(max-width:900px){.col-ts,.col-gc{display:none;}}
        @media(max-width:700px){.col-buon{display:none;}}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🪑 Sản phẩm</h1>
          {/* Thống kê nhanh */}
          {(()=>{
            const hetHang = local.filter(sp=>Number(sp['Tồn kho']||0)===0).length
            const canNhap = local.filter(sp=>Number(sp['Tồn kho']||0)<0).length
            const sapHet  = local.filter(sp=>{const t=Number(sp['Tồn kho']||0);return t>0&&t<=Number(sp['Ngưỡng cảnh báo']||0)}).length
            return (
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',margin:'8px 0 4px'}}>
                <div style={{padding:'6px 14px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',cursor:'pointer'}}
                  onClick={()=>{setFilterLoai('Tất cả');setFilterTon('Tất cả');setSearch('');setTrang(1)}}>
                  <span style={{fontSize:'18px',fontWeight:800,color:'#1E40AF'}}>{local.length}</span>
                  <span style={{fontSize:'11px',color:'#6B7280',marginLeft:'5px'}}>Tổng SP</span>
                </div>
                <div style={{padding:'6px 14px',borderRadius:'8px',background:'#FEE2E2',border:'1px solid #FCA5A5',cursor:'pointer'}}
                  onClick={()=>{setFilterTon('Hết hàng');setTrang(1)}}>
                  <span style={{fontSize:'18px',fontWeight:800,color:'#DC2626'}}>{hetHang}</span>
                  <span style={{fontSize:'11px',color:'#6B7280',marginLeft:'5px'}}>Hết hàng</span>
                </div>
                <div style={{padding:'6px 14px',borderRadius:'8px',background:'#FEF9C3',border:'1px solid #FDE68A',cursor:'pointer'}}
                  onClick={()=>{setFilterTon('Cần nhập');setTrang(1)}}>
                  <span style={{fontSize:'18px',fontWeight:800,color:'#A16207'}}>{canNhap}</span>
                  <span style={{fontSize:'11px',color:'#6B7280',marginLeft:'5px'}}>Cần nhập</span>
                </div>
                <div style={{padding:'6px 14px',borderRadius:'8px',background:'#FEF3C7',border:'1px solid #FCD34D',cursor:'pointer'}}
                  onClick={()=>{setFilterTon('Sắp hết');setTrang(1)}}>
                  <span style={{fontSize:'18px',fontWeight:800,color:'#D97706'}}>{sapHet}</span>
                  <span style={{fontSize:'11px',color:'#6B7280',marginLeft:'5px'}}>⚠️ Sắp hết</span>
                </div>
              </div>
            )
          })()}
          {(()=>{const soNgung=local.filter(sp=>sp['Trạng thái']==='Ngừng kinh doanh').length;return soNgung>0&&(
            <button onClick={()=>setShowNgungKD(p=>!p)}
              style={{padding:'6px 14px',borderRadius:'8px',background:showNgungKD?'#FEE2E2':'#F3F4F6',border:'1px solid',borderColor:showNgungKD?'#FCA5A5':'#E5E7EB',cursor:'pointer',fontSize:'12px',fontWeight:600,color:showNgungKD?'#DC2626':'#6B7280'}}>
              {showNgungKD?'✅ Ẩn SP ngừng KD':'⛔ Xem SP ngừng KD ('+soNgung+')'}
            </button>
          )})()} 
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button onClick={xuatExcel} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #E5E7EB',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>📥 Xuất Excel</button>
            <button onClick={taiFileMau} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #E5E7EB',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>📋 Tải file mẫu</button>
            <label style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #E5E7EB',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>
              📤 Nhập Excel<input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={nhapExcel}/>
            </label>
            <button onClick={()=>setShowQLDM(true)} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #7C3AED',background:'#F5F3FF',color:'#7C3AED',cursor:'pointer',fontSize:'12px',fontWeight:600}}>
              ⚙️ Quản lý danh mục ({danhMucLocal.length})
            </button>
          </div>
        </div>
        <button onClick={moThem} style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>+ Thêm sản phẩm</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm tên, mã SP..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'180px',maxWidth:'280px'}}/>
          <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
            {/* Hàng 1: Lọc theo Loại sản phẩm */}
            <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:'11px',color:'var(--text-secondary)',minWidth:'60px'}}>Loại SP:</span>
              {['Tất cả','Phổ thông','Theo yêu cầu'].map(l=>(
                <button key={l} onClick={()=>setFilterLoai(l)} style={{padding:'4px 12px',borderRadius:'20px',border:'1px solid',borderColor:filterLoai===l?'var(--primary)':'var(--border)',background:filterLoai===l?'var(--primary-pale)':'white',color:filterLoai===l?'var(--primary)':'var(--text-secondary)',fontWeight:filterLoai===l?700:400,fontSize:'12px',cursor:'pointer'}}>{l}</button>
              ))}
            </div>
            {/* Hàng 2: Lọc theo tình trạng tồn kho */}
            <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:'11px',color:'var(--text-secondary)',minWidth:'60px'}}>Tồn kho:</span>
              {[
                {l:'Tất cả',  c:'var(--text-secondary)', bg:'#F3F4F6'},
                {l:'Cần nhập',c:'#A16207',               bg:'#FEF9C3'},
                {l:'Hết hàng',c:'#DC2626',               bg:'#FEE2E2'},
                {l:'Sắp hết', c:'#D97706',               bg:'#FEF3C7'},
                {l:'Còn hàng',c:'#16A34A',               bg:'#D1FAE5'},
              ].map(({l,c,bg})=>(
                <button key={`ton-${l}`} onClick={()=>setFilterTon(l)} style={{padding:'4px 12px',borderRadius:'20px',border:'1px solid',borderColor:filterTon===l?c:'var(--border)',background:filterTon===l?bg:'white',color:filterTon===l?c:'var(--text-secondary)',fontWeight:filterTon===l?700:400,fontSize:'12px',cursor:'pointer'}}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="sp-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã SP</th>
                <th style={{textAlign:'left',fontWeight:700}}>Tên sản phẩm</th>
                <th style={{textAlign:'center',fontWeight:700}}>Danh mục</th>
                <th style={{textAlign:'center',fontWeight:700}}>Loại</th>
                <th style={{textAlign:'center',fontWeight:700}}>ĐVT</th>
                <th className="col-buon" style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Giá bán buôn</th>
                <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Giá bán lẻ</th>
                <th style={{textAlign:'center',fontWeight:700}}>Tồn kho</th>
                <th className="col-ts" style={{textAlign:'left',fontWeight:700}}>Thông số</th>
                <th style={{textAlign:'center',fontWeight:700,width:'100px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dsTrang.length===0?(
                <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>{search||filterLoai!=='Tất cả'||filterTon?'Không tìm thấy':'Chưa có sản phẩm'}</td></tr>
              ):dsTrang.map((sp:any,i:number)=>{
                const ton     = Number(sp['Tồn kho']||0)
                const canhBaoTon = Number(sp['Ngưỡng cảnh báo']||0)
                const sapHet  = ton <= canhBaoTon
                return (
                  <tr key={sp._key} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:600,color:'var(--primary)',whiteSpace:'nowrap',fontSize:'12px',cursor:'pointer',textDecoration:'underline'}} onClick={()=>moSua(sp)}>{sp['Mã SP']||'—'}</td>
                    <td onClick={()=>!showNgungKD&&moSua(sp)} style={{cursor:showNgungKD?'default':'pointer'}}>
                      <div style={{fontWeight:600,color:sp['Trạng thái']==='Ngừng kinh doanh'?'#9CA3AF':'#374151',textDecoration:sp['Trạng thái']==='Ngừng kinh doanh'?'line-through':'none'}}>
                        {sp['Tên sản phẩm']}
                        {sp['Trạng thái']==='Ngừng kinh doanh'&&<span style={{marginLeft:'6px',fontSize:'10px',padding:'1px 6px',borderRadius:'8px',background:'#FEE2E2',color:'#DC2626',fontWeight:700,textDecoration:'none',display:'inline-block'}}>Ngừng KD</span>}
                      </div>
                      {sp['Ghi chú']&&<div style={{fontSize:'11px',color:'#9CA3AF',fontStyle:'italic'}}>{sp['Ghi chú']}</div>}
                    </td>
                    <td style={{textAlign:'center'}}>
                      {sp['Danh mục']
                        ?<span style={{padding:'2px 8px',borderRadius:'10px',background:'#F5F3FF',color:'#7C3AED',fontSize:'11px',fontWeight:600,whiteSpace:'nowrap'}}>{sp['Danh mục']}</span>
                        :<span style={{fontSize:'11px',color:'#D1D5DB'}}>—</span>}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{fontSize:'11px',color:sp['Loại SP']==='Theo yêu cầu'?'#A16207':'#6B7280',fontWeight:sp['Loại SP']==='Theo yêu cầu'?600:400,whiteSpace:'nowrap'}}>
                        {sp['Loại SP']==='Theo yêu cầu'?'Theo YC':'Phổ thông'}
                      </span>
                    </td>
                    <td style={{textAlign:'center',fontSize:'12px',color:'var(--text-secondary)'}}>{sp['Đơn vị tính']||'—'}</td>
                    <td className="col-buon" style={{textAlign:'right',fontSize:'12px',color:'#9CA3AF'}}>{Number(sp['Giá bán buôn']||0)>0?fVND(sp['Giá bán buôn'])+'đ':'—'}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#111827',whiteSpace:'nowrap'}}>{Number(sp['Giá bán lẻ']||0)>0?fVND(sp['Giá bán lẻ'])+'đ':'—'}</td>
                    <td style={{textAlign:'center'}}>
                      {(()=>{
                        const tt = tinhTonKho(ton, canhBaoTon)
                        return (
                          <div style={{textAlign:'center'}}>
                            <div style={{fontWeight:700,fontSize:'14px',color:tt.label==='Còn hàng'?'#111827':tt.color}}>{ton}</div>
                            {tt.label!=='Còn hàng'&&<div style={{fontSize:'10px',padding:'1px 7px',borderRadius:'4px',background:tt.bg,color:tt.color,fontWeight:600,marginTop:'2px',display:'inline-block',whiteSpace:'nowrap',border:`1px solid ${tt.color}22`}}>{tt.label}</div>}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="col-ts" style={{fontSize:'11px',color:'#6B7280',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sp['Thông số kỹ thuật']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                        <button onClick={()=>moSua(sp)} title="Sửa" style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>✏️ Sửa</button>
                        <button onClick={()=>setLichSuGiaSP(sp)} title="Lịch sử giá nhập" style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #BFDBFE',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600}}>📈</button>
                        {user.vaiTro==='Chủ cửa hàng'&&(
                          sp['Trạng thái']==='Ngừng kinh doanh'
                            ?<button onClick={()=>khoiPhucKinhDoanh(sp)} title="Khôi phục kinh doanh"
                              style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #6EE7B7',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600}}>▶ Khôi phục</button>
                            :<button onClick={()=>moXoa(sp)} title="Xóa hoặc ngừng KD"
                              style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {/* Phân trang */}
        {tongTrang>1&&(
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px'}}>
            <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{(trangHT-1)*SO_DONG+1}–{Math.min(trangHT*SO_DONG,filtered.length)} / {filtered.length} SP</span>
            <div style={{display:'flex',gap:'4px'}}>
              <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
              {Array.from({length:tongTrang},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>)}
              <Btn disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</Btn>
            </div>
          </div>
        )}
      </div>

      {/* MODAL THÊM/SỬA */}
      {showModal&&(
        <div className="ov" onClick={()=>{setShowModal(false);reset()}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>{editSP?'✏️ Sửa sản phẩm':'+ Thêm sản phẩm mới'}</h2>
              <button onClick={()=>{setShowModal(false);reset()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Mã SP (tự động nếu trống)</label>
                  <input className="input" placeholder="VD: SP-001" value={maSP} onChange={e=>setMaSP(e.target.value)}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Tên sản phẩm *</label>
                  <input className="input" placeholder="Tên sản phẩm..." value={tenSP} onChange={e=>setTenSP(e.target.value)} autoFocus/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                    <label style={{fontSize:'11px',fontWeight:600}}>📂 Danh mục</label>
                    <button type="button" onClick={()=>{setShowModal(false);setShowQLDM(true)}} style={{padding:'1px 6px',borderRadius:'4px',border:'1px solid #7C3AED',background:'#F5F3FF',color:'#7C3AED',fontSize:'10px',cursor:'pointer'}}>+ Thêm</button>
                  </div>
                  <DanhMucInputSP danhMucNames={danhMucNames} value={danhMucSP} onChange={setDanhMucSP}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Loại SP</label>
                  <select className="input" value={loaiSP} onChange={e=>setLoaiSP(e.target.value)}>
                    {LOAI_SP.map(l=><option key={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Đơn vị tính</label>
                  <select className="input" value={donVi} onChange={e=>setDonVi(e.target.value)}>
                    {DON_VI.map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📦 Giá nhập NCC (đ)</label>
                  <MoneyInput value={giaNhapNCC} onChange={setGiaNhapNCC}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🚚 CPVC về kho (đ)</label>
                  <MoneyInput value={cpvcKho} onChange={setCpvcKho}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>💵 Giá bán buôn (đ)</label>
                  <MoneyInput value={giaBuon} onChange={setGiaBuon}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🏷️ Giá bán lẻ (đ)</label>
                  <MoneyInput value={giaLe} onChange={setGiaLe}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📦 Tồn kho</label>
                  {editSP
                    ? <div style={{padding:'8px 12px',background:'#F3F4F6',borderRadius:'6px',fontSize:'13px',fontWeight:600,color:'#374151',border:'1px solid #E5E7EB'}}>
                        {tonKho} <span style={{fontSize:'11px',fontWeight:400,color:'#6B7280'}}>(không thể sửa trực tiếp)</span>
                      </div>
                    : <MoneyInput value={tonKho} onChange={setTonKho}/>
                  }
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>⚠️ Ngưỡng cảnh báo</label>
                  <input className="input" type="number" min="0" value={canhBao||''} placeholder="5" onChange={e=>setCanhBao(Number(e.target.value))}/>
                </div>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Thông số kỹ thuật</label>
                <input className="input" placeholder="VD: 120x60x75cm, màu nâu gỗ..." value={thongSo} onChange={e=>setThongSo(e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                <input className="input" placeholder="Ghi chú thêm..." value={ghiChu} onChange={e=>setGhiChu(e.target.value)}/>
              </div>
              {msgModal&&<div style={{padding:'8px 12px',borderRadius:'8px',marginBottom:'8px',fontSize:'13px',background:msgModalOk?'#D1FAE5':'#FEE2E2',color:msgModalOk?'#065F46':'#991B1B'}}>{msgModal}</div>}
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuSP} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                  {loading?'⏳ Đang lưu...':editSP?'✅ Cập nhật':'✅ Lưu sản phẩm'}
                </button>
                <button onClick={()=>{setShowModal(false);reset()}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL QUẢN LÝ DANH MỤC */}
      {showQLDM&&(()=>{
        const danhMucSorted=[...danhMucLocal].sort((a,b)=>(a['Tên danh mục']||'')
          .localeCompare(b['Tên danh mục']||'','vi'))
        const danhMucFiltered=searchDM.trim()?danhMucSorted.filter((d)=>boDau(d['Tên danh mục']||'')
          .includes(boDau(searchDM))):danhMucSorted
        const tongTrangDM=Math.max(1,Math.ceil(danhMucFiltered.length/SO_DONG_DM))
        const trangHTDM=Math.min(trangDM,tongTrangDM)
        const dsDM=danhMucFiltered.slice((trangHTDM-1)*SO_DONG_DM,trangHTDM*SO_DONG_DM)
        return (
        <div className="ov" onClick={()=>setShowQLDM(false)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'600px',maxHeight:'88vh',overflowY:'auto'}} onClick={(e:any)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>⚙️ Quản lý danh mục SP <span style={{fontSize:'13px',fontWeight:400,color:'#6B7280'}}>({danhMucLocal.length} danh mục)</span></h2>
              <button onClick={()=>{setShowQLDM(false);setSearchDM('');setTrangDM(1)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            {msgDM&&<div style={{padding:'8px 12px',borderRadius:'6px',marginBottom:'10px',fontSize:'13px',background:msgDM.startsWith('✅')?'#D1FAE5':'#FEE2E2',color:msgDM.startsWith('✅')?'#065F46':'#991B1B'}}>{msgDM}</div>}
            <input className="input" placeholder="🔍 Tìm danh mục..." value={searchDM}
              onChange={(e:any)=>{setSearchDM(e.target.value);setTrangDM(1)}}
              style={{marginBottom:'10px'}}/>
            <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
              <input className="input" placeholder="Tên danh mục mới... (Enter để thêm nhanh)" value={newTenDM}
                onChange={(e:any)=>setNewTenDM(e.target.value)}
                onKeyDown={(e:any)=>e.key==='Enter'&&themDanhMuc()}
                style={{flex:1}}/>
              <button onClick={themDanhMuc} disabled={loadingDM}
                style={{padding:'8px 20px',borderRadius:'6px',border:'none',background:loadingDM?'#9CA3AF':'#7C3AED',color:'white',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                {loadingDM?'⏳':'+ Thêm'}
              </button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'6px',minHeight:'300px'}}>
              {danhMucLocal.length===0
                ?<div style={{textAlign:'center',padding:'48px',color:'#9CA3AF',fontSize:'13px'}}>Chưa có danh mục nào — thêm danh mục đầu tiên bên trên</div>
                :dsDM.map((dm:any)=>{
                  const id=dm['Id']||dm['id']; const ten=dm['Tên danh mục']||''
                  const soSP=thongKeDM[ten]||0; const isEdit=editDM?.id===id
                  return (
                    <div key={id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'12px 14px',borderRadius:'8px',border:isEdit?'2px solid #7C3AED':'1px solid #E5E7EB',background:isEdit?'#F5F3FF':soSP>0?'white':'#FAFBFD'}}>
                      {isEdit?(
                        <>
                          <input className="input" value={editDM.ten} autoFocus
                            onChange={(e:any)=>setEditDM({...editDM,ten:e.target.value})}
                            onKeyDown={(e:any)=>e.key==='Enter'&&suaDanhMuc()}
                            style={{flex:1,fontSize:'13px'}}/>
                          <button onClick={suaDanhMuc} style={{padding:'6px 12px',borderRadius:'6px',border:'none',background:'#7C3AED',color:'white',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>✅ Lưu</button>
                          <button onClick={()=>setEditDM(null)} style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>✕</button>
                        </>
                      ):(
                        <>
                          <div style={{flex:1}}>
                            <span style={{fontWeight:600,fontSize:'14px'}}>{ten}</span>
                          </div>
                          <span style={{fontSize:'12px',padding:'2px 10px',borderRadius:'10px',background:soSP>0?'#F5F3FF':'#F3F4F6',color:soSP>0?'#7C3AED':'#9CA3AF',fontWeight:600,whiteSpace:'nowrap',minWidth:'52px',textAlign:'center'}}>
                            {soSP} SP
                          </span>
                          <button onClick={()=>setEditDM({id,ten})} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'12px',cursor:'pointer',fontWeight:600}}>✏️ Sửa</button>
                          <button onClick={()=>xoaDanhMuc(id,ten)} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'12px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>
                        </>
                      )}
                    </div>
                  )
                })}
            </div>
            {tongTrangDM>1&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'12px',padding:'10px 0',borderTop:'1px solid #F0F0F0'}}>
                <span style={{fontSize:'12px',color:'#6B7280'}}>{(trangHTDM-1)*SO_DONG_DM+1}–{Math.min(trangHTDM*SO_DONG_DM,danhMucFiltered.length)} / {danhMucFiltered.length} danh mục{searchDM?' (lọc)':''}</span>
                <div style={{display:'flex',gap:'4px'}}>
                  <button disabled={trangHTDM===1} onClick={()=>setTrangDM((t:number)=>t-1)}
                    style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangHTDM===1?'#F9FAFB':'white',color:trangHTDM===1?'#CCC':'var(--text-secondary)',cursor:trangHTDM===1?'not-allowed':'pointer',fontSize:'13px'}}>‹</button>
                  {Array.from({length:tongTrangDM},(_:any,i:number)=>i+1).map((p:number)=>(
                    <button key={p} onClick={()=>setTrangDM(p)}
                      style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:p===trangHTDM?'var(--primary)':'var(--border)',background:p===trangHTDM?'var(--primary)':'white',color:p===trangHTDM?'white':'var(--text-secondary)',cursor:'pointer',fontSize:'13px',fontWeight:p===trangHTDM?700:400,minWidth:'32px'}}>
                      {p}
                    </button>
                  ))}
                  <button disabled={trangHTDM===tongTrangDM} onClick={()=>setTrangDM((t:number)=>t+1)}
                    style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangHTDM===tongTrangDM?'#F9FAFB':'white',color:trangHTDM===tongTrangDM?'#CCC':'var(--text-secondary)',cursor:trangHTDM===tongTrangDM?'not-allowed':'pointer',fontSize:'13px'}}>›</button>
                </div>
              </div>
            )}
            <p style={{fontSize:'11px',color:'#9CA3AF',marginTop:'10px',textAlign:'center'}}>💡 Không thể xóa danh mục đang có SP. Cần đổi danh mục SP trước khi xóa.</p>
          </div>
        </div>
        )
      })()}

      {/* MODAL XÁC NHẬN XÓA */}
      {xoaSP&&(
        <div className="ov" onClick={()=>{setXoaSP(null);setXoaCheck(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>Xóa sản phẩm</h2>
            <p style={{fontSize:'14px',fontWeight:700,color:'var(--primary)',margin:'0 0 4px'}}>{xoaSP['Tên sản phẩm']}</p>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px'}}>{xoaSP['Mã SP']||''}{xoaSP['Loại SP']?' · '+xoaSP['Loại SP']:''}</p>
            {loadingXoaCheck&&<div style={{padding:'16px',color:'var(--text-secondary)',fontSize:'13px'}}>⏳ Đang kiểm tra dữ liệu...</div>}
            {!loadingXoaCheck&&xoaCheck&&(
              xoaCheck.coTheXoa?(
                <div>
                  <div style={{padding:'10px 14px',borderRadius:'8px',background:'#D1FAE5',border:'1px solid #6EE7B7',marginBottom:'14px',fontSize:'13px',color:'#065F46',fontWeight:600}}>
                    ✅ Sản phẩm chưa có trong đơn hàng — có thể xóa an toàn
                  </div>
                  <p style={{fontSize:'12px',color:'#DC2626',background:'#FEF2F2',padding:'8px 12px',borderRadius:'6px',margin:'0 0 16px'}}>⚠️ Hành động này không thể hoàn tác!</p>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={xacNhanXoa} disabled={dangXoa}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                      {dangXoa?'⏳ Đang xóa...':'🗑️ Xác nhận xóa'}
                    </button>
                    <button onClick={()=>{setXoaSP(null);setXoaCheck(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{padding:'12px 14px',borderRadius:'8px',background:'#FEF3C7',border:'1px solid #FCD34D',marginBottom:'14px',fontSize:'13px',color:'#92400E',textAlign:'left'}}>
                    <div style={{fontWeight:700,marginBottom:'6px'}}>❌ Không thể xóa vì:</div>
                    <ul style={{margin:0,paddingLeft:'16px'}}>
                      {xoaCheck.lyDo.map((l:string,i:number)=><li key={i}>{l}</li>)}
                    </ul>
                  </div>
                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',marginBottom:'14px',fontSize:'12px',color:'#1E40AF',textAlign:'left'}}>
                    💡 Thay vào đó, chuyển SP sang <strong>Ngừng kinh doanh</strong> để ẩn khỏi danh sách tạo đơn, vẫn giữ lịch sử.
                  </div>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={()=>ngungKinhDoanh(xoaSP)}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'#D97706',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
                      ⛔ Ngừng kinh doanh
                    </button>
                    <button onClick={()=>{setXoaSP(null);setXoaCheck(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Đóng</button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  )
}


function Btn({children,active,disabled,onClick}:any){
  return <button onClick={onClick} disabled={disabled} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:active?'var(--primary)':'var(--border)',background:active?'var(--primary)':disabled?'#F9FAFB':'white',color:active?'white':disabled?'#CCC':'var(--text-secondary)',cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:active?700:400,minWidth:'32px'}}>{children}</button>
}

function DanhMucInputSP({danhMucNames,value,onChange}:{danhMucNames:string[];value:string;onChange:(v:string)=>void}){
  const [show,setShow]=useState(false)
  const [q,setQ]=useState(value)
  useEffect(()=>{setQ(value)},[value])
  function boDauLocal(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
  const filtered=danhMucNames.filter(dm=>{const qb=boDauLocal(q);return !qb||boDauLocal(dm).includes(qb)}).slice(0,15)
  return (
    <div style={{position:'relative'}}>
      <input className="input" placeholder="🔍 Gõ để tìm hoặc chọn danh mục..." value={q}
        onChange={e=>{setQ(e.target.value);onChange(e.target.value);setShow(true)}}
        onFocus={()=>setShow(true)}
        onBlur={()=>setTimeout(()=>setShow(false),200)}
        style={{background:value?'#F5F3FF':'',color:value?'#7C3AED':''}}/>
      {value&&<div style={{fontSize:'11px',color:'#7C3AED',fontWeight:600,marginTop:'2px'}}>✅ {value}</div>}
      {show&&(
        <div style={{position:'absolute',top:'calc(100% + 2px)',left:0,right:0,zIndex:400,background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,.15)',maxHeight:'200px',overflowY:'auto'}}>
          <div style={{padding:'6px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px',color:'#9CA3AF',fontStyle:'italic'}}
            onMouseDown={e=>{e.preventDefault();setQ('');onChange('');setShow(false)}}>
            — Không chọn danh mục
          </div>
          {filtered.length===0
            ?<div style={{padding:'10px 12px',fontSize:'12px',color:'#9CA3AF'}}>Không tìm thấy — nhập tên mới để thêm</div>
            :filtered.map(dm=>(
              <div key={dm} style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px',fontWeight:500,background:dm===value?'#F5F3FF':'white',color:dm===value?'#7C3AED':'#374151'}}
                onMouseDown={e=>{e.preventDefault();setQ(dm);onChange(dm);setShow(false)}}>
                📂 {dm} {dm===value&&'✓'}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}


