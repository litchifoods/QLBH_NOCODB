'use client'
// components/SanPhamClient.tsx

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'
import * as XLSX from 'xlsx'

function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}

const LOAI_SP = ['Phổ thông','Theo yêu cầu']
const DON_VI  = ['Bộ','Cái','Chiếc','Tấm','Cặp','Bàn','Ghế','Tủ','Kệ','Giường','Sofa']
const SO_DONG = 15

export default function SanPhamClient({ danhSach, user }:{ danhSach:any[]; user:UserSession }) {
  const router   = useRouter()
  const seqRef   = useRef(0)
  const nextKey  = () => `sp${++seqRef.current}`
  const fileRef  = useRef<HTMLInputElement>(null)

  const [local,    setLocal]    = useState(() => danhSach.map(sp=>({...sp,_key:nextKey(),_rowId:Number(sp['Id']||sp['id']||0)})))
  const [search,   setSearch]   = useState('')
  const [filterLoai,setFilterLoai] = useState('Tất cả')
  const [filterTon, setFilterTon]  = useState(false)
  const [trang,    setTrang]    = useState(1)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)
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
  const [giaBuon,  setGiaBuon]  = useState(0)
  const [giaLe,    setGiaLe]    = useState(0)
  const [tonKho,   setTonKho]   = useState(0)
  const [canhBao,  setCanhBao]  = useState(5)
  const [thongSo,  setThongSo]  = useState('')
  const [ghiChu,   setGhiChu]   = useState('')

  function showMsg2(text:string,ok=true){setMsg(text);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  const filtered = useMemo(()=>local.filter(sp=>{
    if (filterLoai!=='Tất cả' && sp['Loại SP']!==filterLoai) return false
    if (filterTon && Number(sp['Tồn kho']||0) > Number(sp['Cảnh báo tồn kho']||0)) return false
    if (!search.trim()) return true
    const q=boDau(search)
    return boDau(sp['Tên sản phẩm']||'').includes(q)||boDau(sp['Mã SP']||'').includes(q)||boDau(sp['Loại SP']||'').includes(q)
  }),[local,search,filterLoai,filterTon])

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  function reset(){setMaSP('');setTenSP('');setLoaiSP('Phổ thông');setDonVi('Bộ');setGiaBuon(0);setGiaLe(0);setTonKho(0);setCanhBao(5);setThongSo('');setGhiChu('');setEditSP(null)}
  function moThem(){reset();setShowModal(true)}
  function moSua(sp:any){
    setEditSP(sp);setMaSP(sp['Mã SP']||'');setTenSP(sp['Tên sản phẩm']||'')
    setLoaiSP(sp['Loại SP']||'Phổ thông');setDonVi(sp['Đơn vị tính']||'Bộ')
    setGiaBuon(Number(sp['Giá bán buôn']||0));setGiaLe(Number(sp['Giá bán lẻ']||0))
    setTonKho(Number(sp['Tồn kho']||0));setCanhBao(Number(sp['Cảnh báo tồn kho']||5))
    setThongSo(sp['Thông số kỹ thuật']||'');setGhiChu(sp['Ghi chú']||'')
    setShowModal(true)
  }

  async function luuSP(){
    if (!tenSP.trim()){showMsg2('Vui lòng nhập tên sản phẩm',false);return}
    setLoading(true)
    try {
      const data = {
        'Mã SP':maSP.trim()||undefined,
        'Tên sản phẩm':tenSP.trim(),
        'Loại SP':loaiSP,'Đơn vị tính':donVi,
        'Giá bán buôn':giaBuon,'Giá bán lẻ':giaLe,
        'Tồn kho':tonKho,'Cảnh báo tồn kho':canhBao,
        'Thông số kỹ thuật':thongSo.trim(),'Ghi chú':ghiChu.trim(),
      }
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
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
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
      'Giá bán buôn':Number(sp['Giá bán buôn']||0),'Giá bán lẻ':Number(sp['Giá bán lẻ']||0),
      'Tồn kho':Number(sp['Tồn kho']||0),'Cảnh báo tồn kho':Number(sp['Cảnh báo tồn kho']||0),
      'Thông số kỹ thuật':sp['Thông số kỹ thuật']||'','Ghi chú':sp['Ghi chú']||'',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Sản phẩm')
    XLSX.writeFile(wb,'san-pham.xlsx')
  }

  // Tải file mẫu
  function taiFileMau(){
    const mau = [{'Mã SP':'(để trống = tự tạo)','Tên sản phẩm':'Bàn giám đốc gỗ tự nhiên','Loại SP':'Phổ thông','Đơn vị tính':'Bộ','Giá bán buôn':7000000,'Giá bán lẻ':8500000,'Tồn kho':5,'Cảnh báo tồn kho':3,'Thông số kỹ thuật':'120x60x75cm','Ghi chú':''}]
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
            'Tồn kho':Number(row['Tồn kho']||0),'Cảnh báo tồn kho':Number(row['Cảnh báo tồn kho']||5),
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

  const tonThap = local.filter(sp=>Number(sp['Tồn kho']||0)<=Number(sp['Cảnh báo tồn kho']||0)).length

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .sp-t th,.sp-t td{padding:8px 10px;}
        .sp-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}
        @media(max-width:900px){.col-ts,.col-gc{display:none;}}
        @media(max-width:700px){.col-buon{display:none;}}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🪑 Sản phẩm</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 6px'}}>
            {filtered.length} sản phẩm
            {tonThap>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {tonThap} SP sắp hết hàng</span>}
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
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {['Tất cả',...LOAI_SP].map(l=>(
              <button key={l} onClick={()=>setFilterLoai(l)} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid',borderColor:filterLoai===l?'var(--primary)':'var(--border)',background:filterLoai===l?'var(--primary-pale)':'white',color:filterLoai===l?'var(--primary)':'var(--text-secondary)',fontWeight:filterLoai===l?700:400,fontSize:'12px',cursor:'pointer'}}>{l}</button>
            ))}
            <button onClick={()=>setFilterTon(v=>!v)} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid',borderColor:filterTon?'#DC2626':'var(--border)',background:filterTon?'#FEE2E2':'white',color:filterTon?'#DC2626':'var(--text-secondary)',fontWeight:filterTon?700:400,fontSize:'12px',cursor:'pointer'}}>⚠️ Sắp hết hàng</button>
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
                <th className="col-buon" style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Giá buôn</th>
                <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Giá lẻ</th>
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
                const canhBaoTon = Number(sp['Cảnh báo tồn kho']||0)
                const sapHet  = ton <= canhBaoTon
                return (
                  <tr key={sp._key} style={{borderBottom:'1px solid #F0F0F0',background:sapHet?'#FFF9F9':i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:700,color:'var(--primary)',whiteSpace:'nowrap'}}>{sp['Mã SP']||'—'}</td>
                    <td>
                      <div style={{fontWeight:600}}>{sp['Tên sản phẩm']}</div>
                      {sp['Ghi chú']&&<div style={{fontSize:'11px',color:'#9CA3AF',fontStyle:'italic'}}>{sp['Ghi chú']}</div>}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:600,background:sp['Loại SP']==='Theo yêu cầu'?'#EDE9FE':'#DBEAFE',color:sp['Loại SP']==='Theo yêu cầu'?'#6D28D9':'#1E40AF'}}>
                        {sp['Loại SP']||'—'}
                      </span>
                    </td>
                    <td style={{textAlign:'center',fontSize:'12px',color:'var(--text-secondary)'}}>{sp['Đơn vị tính']||'—'}</td>
                    <td className="col-buon" style={{textAlign:'right',fontSize:'12px',color:'#6B7280'}}>{Number(sp['Giá bán buôn']||0)>0?fVND(sp['Giá bán buôn'])+'đ':'—'}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'var(--primary)',whiteSpace:'nowrap'}}>{Number(sp['Giá bán lẻ']||0)>0?fVND(sp['Giá bán lẻ'])+'đ':'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <span style={{fontWeight:700,fontSize:'13px',color:sapHet?'#DC2626':'#16A34A'}}>{ton}</span>
                      {sapHet&&<div style={{fontSize:'10px',color:'#DC2626'}}>⚠️ Sắp hết</div>}
                    </td>
                    <td className="col-ts" style={{fontSize:'11px',color:'#6B7280',maxWidth:'140px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sp['Thông số kỹ thuật']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                        <button onClick={()=>moSua(sp)} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>✏️</button>
                        <button onClick={()=>setXoaSP(sp)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer'}}>🗑️</button>
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
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
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
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>💵 Giá bán buôn (đ)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={giaBuon?giaBuon.toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setGiaBuon(v)}}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>🏷️ Giá bán lẻ (đ)</label>
                  <input className="input" type="text" inputMode="numeric" placeholder="0"
                    value={giaLe?giaLe.toLocaleString('vi-VN'):''}
                    onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))setGiaLe(v)}}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>📦 Tồn kho</label>
                  <input className="input" type="number" min="0" value={tonKho||''} placeholder="0" onChange={e=>setTonKho(Number(e.target.value))}/>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>⚠️ Cảnh báo tồn kho</label>
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
