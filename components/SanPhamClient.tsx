'use client'
// components/SanPhamClient.tsx

import { useState, useMemo, useRef } from 'react'
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

export default function SanPhamClient({ danhSach, user }:{ danhSach:any[]; user:UserSession }) {
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
  const [trang,    setTrang]    = useState(1)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)
  const [msgModal, setMsgModal] = useState('')
  const [msgModalOk,setMsgModalOk]=useState(true)
  const [showModal,setShowModal]= useState(false)
  const [editSP,   setEditSP]   = useState<any>(null)
  const [loading,  setLoading]  = useState(false)
  const [xoaSP,    setXoaSP]    = useState<any>(null)
  const [dangXoa,  setDangXoa]  = useState(false)

  // Form fields
  const [maSP,     setMaSP]     = useState('')
  const [tenSP,    setTenSP]    = useState('')
  const [loaiSP,   setLoaiSP]   = useState('Phổ thông')
  const [donVi,    setDonVi]    = useState('Bộ')
  const [giaNhapNCC,setGiaNhapNCC]= useState(0)
  const [cpvcKho,  setCpvcKho]  = useState(0)
  const [giaBuon,  setGiaBuon]  = useState(0)
  const [giaLe,    setGiaLe]    = useState(0)
  const [tonKho,   setTonKho]   = useState(0)
  const [canhBao,  setCanhBao]  = useState(1)
  const [thongSo,  setThongSo]  = useState('')
  const [ghiChu,   setGhiChu]   = useState('')

  function showMsg2(text:string,ok=true){setMsg(text);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  const filtered = useMemo(()=>local.filter(sp=>{
    if (filterLoai!=='Tất cả' && sp['Loại SP']!==filterLoai) return false
    if (filterTon !== 'Tất cả') {
      const tt = tinhTonKho(Number(sp['Tồn kho']||0), Number(sp['Ngưỡng cảnh báo']||0))
      if (tt.label !== filterTon) return false
    }
    if (!search.trim()) return true
    const q=boDau(search)
    return boDau(sp['Tên sản phẩm']||'').includes(q)||boDau(sp['Mã SP']||'').includes(q)||boDau(sp['Loại SP']||'').includes(q)
  }),[local,search,filterLoai,filterTon])

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  function reset(){setMaSP('');setTenSP('');setLoaiSP('Phổ thông');setDonVi('Bộ');setGiaNhapNCC(0);setCpvcKho(0);setGiaBuon(0);setGiaLe(0);setTonKho(0);setCanhBao(1);setThongSo('');setGhiChu('');setEditSP(null)}
  function moThem(){reset();setShowModal(true)}
  function moSua(sp:any){
    setEditSP(sp);setMaSP(sp['Mã SP']||'');setTenSP(sp['Tên sản phẩm']||'')
    setLoaiSP(sp['Loại SP']||'Phổ thông');setDonVi(sp['Đơn vị tính']||'Bộ')
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

  async function xacNhanXoa(){
    if (!xoaSP) return
    setDangXoa(true)
    try {
      const res = await fetch(`/api/san-pham?id=${xoaSP._rowId}`,{method:'DELETE'})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.filter(sp=>sp._key!==xoaSP._key))
      showMsg2('✅ Đã xóa: '+xoaSP['Tên sản phẩm'])
      setXoaSP(null)
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi xóa'),false)}
    finally{setDangXoa(false)}
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
            'Đơn vị tính':row['Đơn vị tính']||'Bộ',
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
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 6px'}}>
            {(()=>{
              const canNhap = local.filter(sp=>Number(sp['Tồn kho']||0)<0).length
              const hetHang = local.filter(sp=>Number(sp['Tồn kho']||0)===0).length
              const sapHet  = local.filter(sp=>{const t=Number(sp['Tồn kho']||0);return t>0&&t<=Number(sp['Ngưỡng cảnh báo']||0)}).length
              return <span>
                Tổng {local.length} sản phẩm
                {canNhap>0&&<span style={{marginLeft:'8px',padding:'1px 8px',borderRadius:'10px',background:'#FEF9C3',color:'#A16207',fontWeight:600,fontSize:'12px'}}>{canNhap} SP cần nhập</span>}
                {hetHang>0&&<span style={{marginLeft:'6px',padding:'1px 8px',borderRadius:'10px',background:'#FEE2E2',color:'#DC2626',fontWeight:600,fontSize:'12px'}}>{hetHang} SP hết hàng</span>}
                {sapHet>0&&<span style={{marginLeft:'6px',padding:'1px 8px',borderRadius:'10px',background:'#FEF3C7',color:'#D97706',fontWeight:600,fontSize:'12px'}}>⚠️ {sapHet} SP sắp hết</span>}
              </span>
            })()}
          </p>
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button onClick={xuatExcel} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #E5E7EB',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>📥 Xuất Excel</button>
            <button onClick={taiFileMau} style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #E5E7EB',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>📋 Tải file mẫu</button>
            <label style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid #E5E7EB',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>
              📤 Nhập Excel<input ref={fileRef} type="file" accept=".xlsx,.xls" style={{display:'none'}} onChange={nhapExcel}/>
            </label>
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
                    <td style={{fontWeight:600,color:'#374151',whiteSpace:'nowrap',fontSize:'12px'}}>{sp['Mã SP']||'—'}</td>
                    <td>
                      <div style={{fontWeight:600}}>{sp['Tên sản phẩm']}</div>
                      {sp['Ghi chú']&&<div style={{fontSize:'11px',color:'#9CA3AF',fontStyle:'italic'}}>{sp['Ghi chú']}</div>}
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
                        <button onClick={()=>setXoaSP(sp)} title="Xóa" style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>
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
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px'}}>
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
                  <input className="input" type="number" min="0" placeholder="0" value={giaNhapNCC||''} onChange={e=>{setGiaNhapNCC(Number(e.target.value)||0)}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🚚 CPVC về kho (đ)</label>
                  <input className="input" type="number" min="0" placeholder="0" value={cpvcKho||''} onChange={e=>{setCpvcKho(Number(e.target.value)||0)}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>💵 Giá bán buôn (đ)</label>
                  <input className="input" type="number" min="0" placeholder="0" value={giaBuon||''} onChange={e=>{setGiaBuon(Number(e.target.value)||0)}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🏷️ Giá bán lẻ (đ)</label>
                  <input className="input" type="number" min="0" placeholder="0" value={giaLe||''} onChange={e=>{setGiaLe(Number(e.target.value)||0)}}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📦 Tồn kho</label>
                  <input className="input" type="number" min="0" value={tonKho||''} placeholder="0" onChange={e=>setTonKho(Number(e.target.value))}/>
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

      {/* MODAL XÁC NHẬN XÓA */}
      {xoaSP&&(
        <div className="ov" onClick={()=>setXoaSP(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'360px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 8px'}}>Xác nhận xóa</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}>Xóa <strong>{xoaSP['Tên sản phẩm']}</strong>?</p>
            <p style={{fontSize:'12px',color:'#DC2626',margin:'0 0 16px',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>⚠️ Không thể hoàn tác!</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanXoa} disabled={dangXoa} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,fontSize:'14px',cursor:dangXoa?'not-allowed':'pointer'}}>
                {dangXoa?'⏳':'🗑️ Xóa'}
              </button>
              <button onClick={()=>setXoaSP(null)} style={{flex:1,padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
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
