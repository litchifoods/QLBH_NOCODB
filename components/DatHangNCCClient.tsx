'use client'
// components/DatHangNCCClient.tsx
import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){if(!s)return'—';const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const TRANG_THAI = ['Chờ xác nhận','Đã xác nhận','Đang giao','Đã nhận hàng','Huỷ']
const TT_COLOR: Record<string,{bg:string,c:string}> = {
  'Chờ xác nhận': {bg:'#FEF3C7',c:'#92400E'},
  'Đã xác nhận':  {bg:'#DBEAFE',c:'#1E40AF'},
  'Đang giao':    {bg:'#E0F2FE',c:'#0369A1'},
  'Đã nhận hàng': {bg:'#D1FAE5',c:'#065F46'},
  'Huỷ':          {bg:'#FEE2E2',c:'#991B1B'},
}
const SO_DONG = 10

interface SPItem { maSP:string; tenSP:string; donVi:string; soLuong:number; giaNhap:number; ngayVe:string; ghiChu:string }

export default function DatHangNCCClient({donDHList,nccList,sanPhamList,user}:{
  donDHList:any[]; nccList:any[]; sanPhamList:any[]; user:UserSession
}) {
  const router = useRouter()
  const [local, setLocal]       = useState(donDHList)
  const [search, setSearch]     = useState('')
  const [filterTT, setFilterTT] = useState('Tất cả')
  const [filterNCC,setFilterNCC]= useState('Tất cả')
  const [trang, setTrang]       = useState(1)
  const [msg, setMsg]           = useState('')
  const [msgOk, setMsgOk]       = useState(true)
  const [showModal, setShowModal]= useState(false)
  const [loading, setLoading]   = useState(false)
  const [xoaItem, setXoaItem]   = useState<any>(null)
  const [showPDF, setShowPDF]   = useState<any[]>([])

  // Form state
  const [maNCC,    setMaNCC]    = useState('')
  const [ngayDat,  setNgayDat]  = useState(new Date().toISOString().split('T')[0])
  const [ghiChuDon,setGhiChuDon]= useState('')
  const [items,    setItems]    = useState<SPItem[]>([{maSP:'',tenSP:'',donVi:'',soLuong:1,giaNhap:0,ngayVe:'',ghiChu:''}])
  const [searchSP, setSearchSP] = useState<Record<number,string>>({})
  const [showSP,   setShowSP]   = useState<Record<number,boolean>>({})

  function showMsg2(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  const nccMap = useMemo(()=>{
    const m:Record<string,any>={}
    nccList.forEach(n=>{ m[n['Mã NCC']||'']=n })
    return m
  },[nccList])

  const spMap = useMemo(()=>{
    const m:Record<string,any>={}
    sanPhamList.forEach(s=>{ m[s['Mã SP']||'']=s })
    return m
  },[sanPhamList])

  const filtered = useMemo(()=>{
    let r = local
    if (filterTT!=='Tất cả') r=r.filter(d=>d['Trạng thái']===filterTT)
    if (filterNCC!=='Tất cả') r=r.filter(d=>d['Mã NCC']===filterNCC)
    if (search.trim()) {
      const q=boDau(search)
      r=r.filter(d=>boDau(d['Mã đặt hàng']||'').includes(q)||boDau(d['Mã NCC']||'').includes(q)||boDau(nccMap[d['Mã NCC']]?.['Tên NCC']||'').includes(q)||boDau(d['Mã SP']||'').includes(q))
    }
    return r
  },[local,filterTT,filterNCC,search,nccMap])

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  const nccDanhSach = useMemo(()=>[...new Set(local.map(d=>d['Mã NCC']).filter(Boolean))]
    .map(ma=>({ma, ten:nccMap[ma]?.['Tên NCC']||ma})),[local,nccMap])

  function addItem(){setItems(prev=>[...prev,{maSP:'',tenSP:'',donVi:'',soLuong:1,giaNhap:0,ngayVe:'',ghiChu:''}])}
  function removeItem(i:number){setItems(prev=>prev.filter((_,idx)=>idx!==i))}
  function updItem(i:number,k:keyof SPItem,v:any){setItems(prev=>prev.map((it,idx)=>idx===i?{...it,[k]:v}:it))}
  function chonSP(i:number,sp:any){
    updItem(i,'maSP',sp['Mã SP']||'')
    updItem(i,'tenSP',sp['Tên sản phẩm']||'')
    updItem(i,'donVi',sp['Đơn vị tính']||'')
    updItem(i,'giaNhap',Number(sp['Giá bán buôn']||0))
    setSearchSP(prev=>({...prev,[i]:sp['Tên sản phẩm']||''}))
    setShowSP(prev=>({...prev,[i]:false}))
  }

  const tongTien = items.reduce((s,it)=>s+Number(it.soLuong||0)*Number(it.giaNhap||0),0)

  async function luuDon(){
    if (!maNCC){showMsg2('Chọn nhà cung cấp',false);return}
    const valid=items.filter(it=>it.maSP&&it.soLuong>0)
    if (!valid.length){showMsg2('Thêm ít nhất 1 sản phẩm',false);return}
    setLoading(true)
    try {
      const res = await fetch('/api/dat-hang-ncc',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({maNCC,ngayDat,ghiChu:ghiChuDon,items:valid})})
      const d = await res.json()
      if (!res.ok) throw new Error(d.message)
      showMsg2(`✅ Đã tạo ${d.maDH} — ${d.soSP} sản phẩm`)
      setShowModal(false); resetForm(); router.refresh()
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  function resetForm(){setMaNCC('');setNgayDat(new Date().toISOString().split('T')[0]);setGhiChuDon('');setItems([{maSP:'',tenSP:'',donVi:'',soLuong:1,giaNhap:0,ngayVe:'',ghiChu:''}]);setSearchSP({});setShowSP({})}

  async function doiTrangThai(item:any, tt:string){
    try {
      const res = await fetch('/api/dat-hang-ncc',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(item['Id']||item['id']),  'Trạng thái':tt})})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(item['Id']||item['id'])?{...d,'Trạng thái':tt}:d))
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  async function xacNhanXoa(){
    if (!xoaItem) return
    try {
      await fetch(`/api/dat-hang-ncc?id=${xoaItem['Id']||xoaItem['id']}`,{method:'DELETE'})
      setLocal(prev=>prev.filter(d=>(d['Id']||d['id'])!==(xoaItem['Id']||xoaItem['id'])))
      showMsg2('✅ Đã xóa'); setXoaItem(null)
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  // Xuất PDF đơn đặt hàng
  function xuatPDF(items: any[]){
    if (!items.length) return
    const ncc = nccMap[items[0]['Mã NCC']] || {}
    const maDH = items[0]['Mã đặt hàng']?.split('-').slice(0,3).join('-') || items[0]['Mã đặt hàng']
    const ngay = fDate(items[0]['Ngày đặt'])
    const rows = items.map(it=>{
      const sp = spMap[it['Mã SP']] || {}
      return `<tr>
        <td>${it['Mã SP']||'—'}</td>
        <td>${sp['Tên sản phẩm']||it['Mã SP']||'—'}</td>
        <td style="text-align:center">${it['Số lượng đặt']||0}</td>
        <td style="text-align:center">${sp['Đơn vị tính']||'—'}</td>
        <td style="text-align:right">${fVND(it['Giá nhập dự kiến'])}đ</td>
        <td style="text-align:right">${fVND(Number(it['Số lượng đặt']||0)*Number(it['Giá nhập dự kiến']||0))}đ</td>
        <td>${fDate(it['Ngày dự kiến về'])}</td>
        <td>${it['Ghi chú']||''}</td>
      </tr>`
    }).join('')
    const tongTienPDF = items.reduce((s,it)=>s+Number(it['Số lượng đặt']||0)*Number(it['Giá nhập dự kiến']||0),0)
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>Đơn đặt hàng ${maDH}</title>
    <style>
      body{font-family:Arial,sans-serif;padding:32px;color:#1F2937;font-size:13px;}
      h1{font-size:20px;color:#1e3a5f;margin-bottom:4px;}
      .info{display:flex;justify-content:space-between;margin:16px 0;}
      .box{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;padding:12px 16px;flex:1;margin-right:12px;}
      .box:last-child{margin-right:0;}
      table{width:100%;border-collapse:collapse;margin-top:16px;}
      th{background:#1e3a5f;color:white;padding:8px 10px;text-align:left;font-size:12px;}
      td{padding:7px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;}
      tr:nth-child(even) td{background:#F9FAFB;}
      .tong{text-align:right;margin-top:12px;font-size:15px;font-weight:bold;color:#1e3a5f;}
      .footer{margin-top:32px;display:flex;justify-content:space-between;}
      .sign{text-align:center;width:200px;}
      .sign p{font-weight:bold;margin-bottom:40px;}
      @media print{button{display:none!important;}}
    </style></head><body>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;">
      <div>
        <h1>🪑 Nội Thất Tính Tuyết</h1>
        <p style="color:#6B7280;margin:0">Phiếu đặt hàng nhà cung cấp</p>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:bold;color:#1e3a5f">${maDH}</div>
        <div style="color:#6B7280">Ngày đặt: ${ngay}</div>
      </div>
    </div>
    <div class="info">
      <div class="box">
        <div style="font-weight:bold;margin-bottom:6px;color:#1e3a5f">📦 Nhà cung cấp</div>
        <div><b>${ncc['Tên NCC']||items[0]['Mã NCC']||'—'}</b></div>
        <div>Mã NCC: ${items[0]['Mã NCC']||'—'}</div>
        ${ncc['Số điện thoại']?`<div>SĐT: ${ncc['Số điện thoại']}</div>`:''}
        ${ncc['Địa chỉ']?`<div>Địa chỉ: ${ncc['Địa chỉ']}</div>`:''}
        ${ncc['Số TK ngân hàng']?`<div>STK: ${ncc['Số TK ngân hàng']}</div>`:''}
      </div>
      <div class="box">
        <div style="font-weight:bold;margin-bottom:6px;color:#1e3a5f">🏪 Bên đặt hàng</div>
        <div><b>Nội Thất Tính Tuyết</b></div>
        <div>Người đặt: ${user.hoTen||user.username||'—'}</div>
        <div>Ngày đặt: ${ngay}</div>
        ${items[0]['Ghi chú']?`<div>Ghi chú: ${items[0]['Ghi chú']}</div>`:''}
      </div>
    </div>
    <table>
      <thead><tr>
        <th>Mã SP</th><th>Tên sản phẩm</th><th style="text-align:center">SL</th>
        <th style="text-align:center">ĐVT</th><th style="text-align:right">Đơn giá</th>
        <th style="text-align:right">Thành tiền</th><th>Ngày dự kiến về</th><th>Ghi chú</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="tong">Tổng cộng: ${fVND(tongTienPDF)}đ</div>
    <div class="footer">
      <div class="sign"><p>Đại diện nhà cung cấp</p><div style="border-top:1px solid #ccc;padding-top:6px;color:#6B7280;font-size:11px">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign"><p>Người đặt hàng</p><div style="border-top:1px solid #ccc;padding-top:6px;color:#6B7280;font-size:11px">(Ký, ghi rõ họ tên)</div></div>
    </div>
    <script>window.onload=()=>window.print()</script>
    </body></html>`
    const w = window.open('','_blank')
    if (w) { w.document.write(html); w.document.close() }
  }

  // Group items theo Mã đơn hàng gốc (bỏ suffix -1,-2,...)
  const grouped = useMemo(()=>{
    const g:Record<string,any[]>={}
    filtered.forEach(d=>{
      const ma = (d['Mã đặt hàng']||'').replace(/-\d+$/,'') || d['Mã đặt hàng']
      if(!g[ma]) g[ma]=[]
      g[ma].push(d)
    })
    return g
  },[filtered])

  const groupKeys = Object.keys(grouped).slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)
  const tongTrangG = Math.max(1,Math.ceil(Object.keys(grouped).length/SO_DONG))

  const chuaXN = local.filter(d=>d['Trạng thái']==='Chờ xác nhận').length

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .ncc-t th,.ncc-t td{padding:8px 10px;}
        .ncc-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:780px;max-height:93vh;overflow-y:auto;}
        .sp-row{display:flex;gap:8px;padding:10px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:8px;background:#FAFBFD;flex-wrap:wrap;}
        .db{position:absolute;top:calc(100%+3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:220px;overflow-y:auto;}
        .di{padding:9px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;}
      `}</style>

      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🛒 Đặt hàng NCC</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {Object.keys(grouped).length} đơn
            {chuaXN>0&&<span style={{marginLeft:'8px',color:'#D97706',fontWeight:600}}>⏳ {chuaXN} chờ xác nhận</span>}
          </p>
        </div>
        <button onClick={()=>setShowModal(true)} style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>+ Tạo đơn đặt hàng</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'10px',marginBottom:'14px'}}>
        {TRANG_THAI.map(tt=>{
          const n=local.filter(d=>d['Trạng thái']===tt).length
          const c=TT_COLOR[tt]
          return n>0?(
            <div key={tt} className="card" style={{padding:'12px 14px',cursor:'pointer',border:filterTT===tt?`2px solid ${c.c}`:'1px solid var(--border)'}} onClick={()=>setFilterTT(filterTT===tt?'Tất cả':tt)}>
              <div style={{fontSize:'18px',fontWeight:800,color:c.c}}>{n}</div>
              <div style={{fontSize:'11px',color:c.c,fontWeight:600}}>{tt}</div>
            </div>
          ):null
        })}
      </div>

      {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm mã đơn, NCC, SP..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'180px',maxWidth:'260px'}}/>
          <select className="input" value={filterNCC} onChange={e=>setFilterNCC(e.target.value)} style={{width:'180px'}}>
            <option value="Tất cả">Tất cả NCC</option>
            {nccDanhSach.map(n=><option key={n.ma} value={n.ma}>{n.ten}</option>)}
          </select>
          <select className="input" value={filterTT} onChange={e=>setFilterTT(e.target.value)} style={{width:'160px'}}>
            <option value="Tất cả">Tất cả trạng thái</option>
            {TRANG_THAI.map(tt=><option key={tt}>{tt}</option>)}
          </select>
        </div>
      </div>

      {/* Bảng đơn hàng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="ncc-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700}}>Mã đơn</th>
                <th style={{textAlign:'left',fontWeight:700}}>Ngày đặt</th>
                <th style={{textAlign:'left',fontWeight:700}}>Nhà cung cấp</th>
                <th style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                <th style={{textAlign:'right',fontWeight:700}}>Tổng tiền</th>
                <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                <th style={{textAlign:'center',fontWeight:700,width:'120px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {groupKeys.length===0?(
                <tr><td colSpan={7} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có đơn hàng nào</td></tr>
              ):groupKeys.map((maDH,i)=>{
                const grp = grouped[maDH]
                const first = grp[0]
                const ncc = nccMap[first['Mã NCC']] || {}
                const tongTienDon = grp.reduce((s,d)=>s+Number(d['Số lượng đặt']||0)*Number(d['Giá nhập dự kiến']||0),0)
                const tt = first['Trạng thái']||'Chờ xác nhận'
                const ttC = TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
                return (
                  <tr key={maDH} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:700,color:'#374151',whiteSpace:'nowrap'}}>{maDH}</td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDate(first['Ngày đặt'])}</td>
                    <td>
                      <div style={{fontWeight:600}}>{ncc['Tên NCC']||first['Mã NCC']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{first['Mã NCC']}</div>
                    </td>
                    <td>
                      {grp.map((d,j)=>{
                        const sp = spMap[d['Mã SP']]||{}
                        return <div key={j} style={{fontSize:'12px'}}>{sp['Tên sản phẩm']||d['Mã SP']||'—'} <span style={{color:'#6B7280'}}>×{d['Số lượng đặt']}</span></div>
                      })}
                    </td>
                    <td style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>{tongTienDon>0?fVND(tongTienDon)+'đ':'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <select value={tt} onChange={e=>grp.forEach(d=>doiTrangThai(d,e.target.value))}
                        style={{padding:'3px 8px',borderRadius:'12px',border:'none',background:ttC.bg,color:ttC.c,fontWeight:700,fontSize:'11px',cursor:'pointer'}}>
                        {TRANG_THAI.map(t=><option key={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                        <button onClick={()=>xuatPDF(grp)} title="Xuất PDF" style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600}}>📄 PDF</button>
                        <button onClick={()=>setXoaItem(first)} title="Xóa" style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>
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
            <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{Object.keys(grouped).length} đơn</span>
            <div style={{display:'flex',gap:'4px'}}>
              <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
              {Array.from({length:tongTrangG},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>)}
              <Btn disabled={trangHT===tongTrangG} onClick={()=>setTrang(t=>t+1)}>›</Btn>
            </div>
          </div>
        )}
      </div>

      {/* MODAL TẠO ĐƠN */}
      {showModal&&(
        <div className="ov" onClick={()=>{setShowModal(false);resetForm()}}>
          <div className="mk" onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>🛒 Tạo đơn đặt hàng NCC</h2>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>

            {/* Thông tin chung */}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px',marginBottom:'10px'}}>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Nhà cung cấp *</label>
                  <select className="input" value={maNCC} onChange={e=>setMaNCC(e.target.value)}>
                    <option value="">-- Chọn NCC --</option>
                    {nccList.map(n=><option key={n['Mã NCC']} value={n['Mã NCC']}>{n['Tên NCC']} ({n['Mã NCC']})</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ngày đặt</label>
                  <input className="input" type="date" value={ngayDat} onChange={e=>setNgayDat(e.target.value)}/>
                </div>
              </div>
              {maNCC&&nccMap[maNCC]&&(
                <div style={{fontSize:'12px',color:'#374151',background:'var(--primary-pale)',borderRadius:'6px',padding:'8px 12px'}}>
                  <span style={{fontWeight:600}}>{nccMap[maNCC]['Tên NCC']}</span>
                  {nccMap[maNCC]['Số điện thoại']&&<span style={{marginLeft:'12px',color:'#6B7280'}}>📞 {nccMap[maNCC]['Số điện thoại']}</span>}
                  {nccMap[maNCC]['Số TK ngân hàng']&&<span style={{marginLeft:'12px',color:'#6B7280'}}>🏦 {nccMap[maNCC]['Số TK ngân hàng']}</span>}
                </div>
              )}
            </div>

            {/* Danh sách SP */}
            <div style={{marginBottom:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <label style={{fontSize:'12px',fontWeight:700,color:'var(--primary)'}}>📦 SẢN PHẨM ĐẶT HÀNG</label>
                <button onClick={addItem} style={{padding:'4px 12px',borderRadius:'6px',border:'1px solid var(--primary)',background:'white',color:'var(--primary)',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>+ Thêm SP</button>
              </div>
              {items.map((it,i)=>(
                <div key={i} className="sp-row">
                  {/* Tìm SP */}
                  <div style={{flex:'2',minWidth:'180px',position:'relative'}}>
                    <label style={{fontSize:'10px',color:'#6B7280',display:'block',marginBottom:'2px'}}>Sản phẩm *</label>
                    <input className="input" placeholder="Tìm tên hoặc mã SP..." value={searchSP[i]??it.tenSP}
                      onChange={e=>{setSearchSP(prev=>({...prev,[i]:e.target.value}));updItem(i,'tenSP',e.target.value);updItem(i,'maSP','');setShowSP(prev=>({...prev,[i]:true}))}}
                      onFocus={()=>setShowSP(prev=>({...prev,[i]:true}))}
                      onBlur={()=>setTimeout(()=>setShowSP(prev=>({...prev,[i]:false})),200)}
                      style={{fontSize:'12px'}}/>
                    {showSP[i]&&(
                      <div className="db">
                        {sanPhamList.filter(sp=>{
                          const q=boDau(searchSP[i]||'')
                          return !q||boDau(sp['Tên sản phẩm']||'').includes(q)||boDau(sp['Mã SP']||'').includes(q)
                        }).slice(0,10).map((sp,j)=>(
                          <div key={j} className="di" onMouseDown={e=>{e.preventDefault();chonSP(i,sp)}}>
                            <span style={{fontWeight:600}}>{sp['Tên sản phẩm']}</span>
                            <span style={{fontSize:'11px',color:'#6B7280',marginLeft:'8px'}}>{sp['Mã SP']}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* SL */}
                  <div style={{width:'70px'}}>
                    <label style={{fontSize:'10px',color:'#6B7280',display:'block',marginBottom:'2px'}}>Số lượng</label>
                    <input className="input" type="number" min="1" value={it.soLuong||''} onChange={e=>updItem(i,'soLuong',Number(e.target.value))} style={{fontSize:'12px',textAlign:'center'}}/>
                  </div>
                  {/* Đơn vị */}
                  <div style={{width:'70px'}}>
                    <label style={{fontSize:'10px',color:'#6B7280',display:'block',marginBottom:'2px'}}>ĐVT</label>
                    <input className="input" value={it.donVi} onChange={e=>updItem(i,'donVi',e.target.value)} style={{fontSize:'12px'}}/>
                  </div>
                  {/* Giá nhập */}
                  <div style={{width:'120px'}}>
                    <label style={{fontSize:'10px',color:'#6B7280',display:'block',marginBottom:'2px'}}>Giá nhập (đ)</label>
                    <input className="input" type="text" inputMode="numeric"
                      value={it.giaNhap?it.giaNhap.toLocaleString('vi-VN'):''}
                      placeholder="0"
                      onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/,/g,''));if(!isNaN(v))updItem(i,'giaNhap',v)}}
                      style={{fontSize:'12px'}}/>
                  </div>
                  {/* Ngày dự kiến */}
                  <div style={{width:'120px'}}>
                    <label style={{fontSize:'10px',color:'#6B7280',display:'block',marginBottom:'2px'}}>Ngày về</label>
                    <input className="input" type="date" value={it.ngayVe} onChange={e=>updItem(i,'ngayVe',e.target.value)} style={{fontSize:'12px'}}/>
                  </div>
                  {/* Xóa */}
                  {items.length>1&&<button onClick={()=>removeItem(i)} style={{alignSelf:'flex-end',padding:'6px 8px',borderRadius:'5px',border:'none',background:'#FEE2E2',color:'#DC2626',cursor:'pointer',fontSize:'13px'}}>✕</button>}
                </div>
              ))}
              {tongTien>0&&<div style={{textAlign:'right',fontWeight:700,fontSize:'14px',color:'var(--primary)',marginTop:'8px'}}>Tổng dự kiến: {fVND(tongTien)}đ</div>}
            </div>

            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú đơn hàng</label>
              <input className="input" placeholder="Ghi chú thêm..." value={ghiChuDon} onChange={e=>setGhiChuDon(e.target.value)}/>
            </div>

            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={luuDon} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':'✅ Tạo đơn đặt hàng'}
              </button>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal xác nhận xóa */}
      {xoaItem&&(
        <div className="ov" onClick={()=>setXoaItem(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'340px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'15px',fontWeight:700,margin:'0 0 8px'}}>Xác nhận xóa đơn?</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 16px'}}>Xóa tất cả dòng của đơn <strong>{(xoaItem['Mã đặt hàng']||'').replace(/-\d+$/,'')}</strong>?</p>
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
