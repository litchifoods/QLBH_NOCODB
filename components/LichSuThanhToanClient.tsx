'use client'
// components/LichSuThanhToanClient.tsx
import { useState, useMemo } from 'react'
import { UserSession } from '@/lib/auth'
import * as XLSX from 'xlsx'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){if(!s)return'—';try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}catch{return s}}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const TT_COLOR:Record<string,{bg:string,c:string}> = {
  'Đã xác nhận': {bg:'#D1FAE5',c:'#065F46'},
  'Huỷ':         {bg:'#FEE2E2',c:'#991B1B'},
}
const SO_DONG = 10

export default function LichSuThanhToanClient({ttList,nccList,user}:{
  ttList:any[]; nccList:any[]; user:UserSession
}) {
  const isOwner = user.vaiTro === 'Chủ cửa hàng'

  function thangNay(){
    const d=new Date(),y=d.getFullYear(),m=d.getMonth()+1
    return {
      tu:`${y}-${String(m).padStart(2,'0')}-01`,
      den:`${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`
    }
  }

  const [local,      setLocal]      = useState(ttList)
  const [search,     setSearch]     = useState('')
  const [filterNCC,  setFilterNCC]  = useState('Tất cả')
  const [filterTT,   setFilterTT]   = useState('Tất cả')
  const [filterHT,   setFilterHT]   = useState('Tất cả')
  const [tuNgay,     setTuNgay]     = useState(()=>thangNay().tu)
  const [denNgay,    setDenNgay]    = useState(()=>thangNay().den)
  const [trang,      setTrang]      = useState(1)
  const [chiTietTT,  setChiTietTT]  = useState<any>(null)
  const [editMode,   setEditMode]   = useState(false)
  const [editSoTien, setEditSoTien] = useState(0)
  const [editGhiChu, setEditGhiChu] = useState('')
  const [editNgay,   setEditNgay]   = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [msg2,       setMsg2]       = useState('')
  function showMsg(t:string,ok=true){setMsg2(t);setTimeout(()=>setMsg2(''),4000)}

  const nccMap = useMemo(()=>{
    const m:Record<string,any>={}
    nccList.forEach(n=>{m[n['Mã NCC']||'']=n})
    return m
  },[nccList])

  const nccOptions = useMemo(()=>[
    ...new Set(local.map(t=>t['Mã NCC']).filter(Boolean))
  ].map(ma=>({ma,ten:nccMap[ma]?.['Tên NCC']||ma}))
  .sort((a,b)=>a.ten.localeCompare(b.ten,'vi'))
  ,[local,nccMap])

  const hinhThucList = useMemo(()=>[
    ...new Set(local.map(t=>t['Hình thức']).filter(Boolean))
  ],[local])

  const filtered = useMemo(()=>{
    let r=local
    if(tuNgay)  r=r.filter(t=>(t['Ngày trả tiền NCC']||'').split('T')[0]>=tuNgay)
    if(denNgay) r=r.filter(t=>(t['Ngày trả tiền NCC']||'').split('T')[0]<=denNgay)
    if(filterNCC!=='Tất cả') r=r.filter(t=>t['Mã NCC']===filterNCC)
    if(filterTT!=='Tất cả')  r=r.filter(t=>t['Trạng thái']===filterTT)
    if(filterHT!=='Tất cả')  r=r.filter(t=>t['Hình thức']===filterHT)
    if(search.trim()){
      const q=boDau(search)
      r=r.filter(t=>
        boDau(t['Mã thanh toán']||'').includes(q)||
        boDau(nccMap[t['Mã NCC']]?.['Tên NCC']||'').includes(q)||
        boDau(t['Mã phiếu nhập']||'').includes(q)||
        boDau(t['Người trả']||'').includes(q)||
        boDau(t['Nội dung']||'').includes(q)
      )
    }
    return r
  },[local,tuNgay,denNgay,filterNCC,filterTT,filterHT,search,nccMap])

  // Thống kê theo filtered (không tính Huỷ)
  const fHopLe   = filtered.filter(t=>t['Trạng thái']!=='Huỷ')
  const tongTien = fHopLe.reduce((s,t)=>s+Number(t['Số tiền trả']||0),0)
  const soGD     = fHopLe.length
  const tienMat  = fHopLe.filter(t=>t['Hình thức']==='Tiền mặt').reduce((s,t)=>s+Number(t['Số tiền trả']||0),0)
  const chuyenKhoan = fHopLe.filter(t=>t['Hình thức']==='Chuyển khoản').reduce((s,t)=>s+Number(t['Số tiền trả']||0),0)

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG,trangHT*SO_DONG)

  const labelNgay = useMemo(()=>{
    const tn=thangNay()
    if(tuNgay===tn.tu&&denNgay===tn.den){
      const d=new Date();return `Tháng ${d.getMonth()+1}/${d.getFullYear()}`
    }
    if(tuNgay&&denNgay) return `${fDate(tuNgay)} — ${fDate(denNgay)}`
    if(tuNgay) return `Từ ${fDate(tuNgay)}`
    if(denNgay) return `Đến ${fDate(denNgay)}`
    return 'Tất cả'
  },[tuNgay,denNgay])

  function xuatExcel(){
    const rows=filtered.map(t=>({
      'Mã TT':        t['Mã thanh toán']||'',
      'Ngày TT':      fDate(t['Ngày trả tiền NCC']),
      'Tên NCC':      nccMap[t['Mã NCC']]?.['Tên NCC']||t['Mã NCC']||'',
      'Mã NCC':       t['Mã NCC']||'',
      'Mã phiếu nhập':t['Mã phiếu nhập']||'',
      'Nội dung':     t['Nội dung']||'',
      'Số tiền trả':  Number(t['Số tiền trả']||0),
      'Hình thức':    t['Hình thức']||'',
      'Người trả':    t['Người trả']||'',
      'Trạng thái':   t['Trạng thái']||'',
      'Còn lại sau TT':Number(t['Số tiền còn lại sau TT']||0),
      'Ghi chú':      t['Ghi chú']||'',
    }))
    const ws=XLSX.utils.json_to_sheet(rows)
    const wb=XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb,ws,'Lịch sử TT NCC')
    XLSX.writeFile(wb,`lich-su-tt-ncc-${labelNgay.replace(/\//g,'-')}.xlsx`)
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .tt-t th,.tt-t td{padding:8px 10px;vertical-align:middle;}
        .tt-t tbody tr:hover td{background:#F0F4FF!important;}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>💳 Lịch sử thanh toán NCC</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>
            {filtered.length} giao dịch · <strong>{labelNgay}</strong>
          </p>
        </div>
        <button onClick={xuatExcel}
          style={{padding:'9px 16px',borderRadius:'8px',border:'1px solid #16A34A',background:'#F0FDF4',color:'#16A34A',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
          📥 Xuất Excel
        </button>
      </div>

      {/* Thống kê */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'14px'}}>
        {[
          {icon:'💰',label:`Tổng TT (${labelNgay})`,val:fVND(tongTien)+'đ',c:'#1e3a5f'},
          {icon:'📋',label:'Số giao dịch',val:soGD+' lần',c:'var(--primary)'},
          {icon:'💵',label:'Tiền mặt',val:fVND(tienMat)+'đ',c:'#D97706'},
          {icon:'🏦',label:'Chuyển khoản',val:fVND(chuyenKhoan)+'đ',c:'#1E40AF'},
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
        {/* Hàng 1: Lọc ngày */}
        <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'10px',flexWrap:'wrap'}}>
          <span style={{fontSize:'11px',fontWeight:600,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>📅 Từ:</span>
          <input className="input" type="date" value={tuNgay} onChange={e=>{setTuNgay(e.target.value);setTrang(1)}} style={{width:'150px'}}/>
          <span style={{fontSize:'11px',fontWeight:600,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>Đến:</span>
          <input className="input" type="date" value={denNgay} onChange={e=>{setDenNgay(e.target.value);setTrang(1)}} style={{width:'150px'}}/>
          {[
            {label:'Tháng này', fn:()=>{const t=thangNay();setTuNgay(t.tu);setDenNgay(t.den);setTrang(1)}},
            {label:'Tất cả',    fn:()=>{setTuNgay('');setDenNgay('');setTrang(1)}},
          ].map(({label,fn})=>(
            <button key={label} onClick={fn}
              style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid var(--border)',background:'white',color:'var(--text-secondary)',fontSize:'12px',cursor:'pointer'}}>
              {label}
            </button>
          ))}
        </div>
        {/* Hàng 2: Tìm kiếm + filter */}
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm mã TT, NCC, phiếu nhập, người trả..." value={search}
            onChange={e=>{setSearch(e.target.value);setTrang(1)}}
            style={{flex:1,minWidth:'220px',maxWidth:'320px'}}/>
          <select className="input" value={filterNCC} onChange={e=>{setFilterNCC(e.target.value);setTrang(1)}} style={{width:'180px'}}>
            <option value="Tất cả">Tất cả NCC</option>
            {nccOptions.map(n=><option key={n.ma} value={n.ma}>{n.ten}</option>)}
          </select>
          <select className="input" value={filterHT} onChange={e=>{setFilterHT(e.target.value);setTrang(1)}} style={{width:'150px'}}>
            <option value="Tất cả">Tất cả hình thức</option>
            {hinhThucList.map(h=><option key={h}>{h}</option>)}
          </select>
          <div style={{display:'flex',gap:'4px'}}>
            {['Tất cả','Đã xác nhận','Huỷ'].map(tt=>{
              const col=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
              const isAct=filterTT===tt
              return (
                <button key={tt} onClick={()=>{setFilterTT(tt);setTrang(1)}}
                  style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid',
                    borderColor:isAct?col.c:'var(--border)',
                    background:isAct?col.bg:'white',
                    color:isAct?col.c:'var(--text-secondary)',
                    fontWeight:isAct?700:400,fontSize:'12px',cursor:'pointer'}}>
                  {tt}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="tt-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã TT</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày TT</th>
                <th style={{textAlign:'left',fontWeight:700}}>Tên NCC</th>
                <th style={{textAlign:'left',fontWeight:700}}>Nội dung</th>
                <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Số tiền</th>
                <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Còn lại sau TT</th>
                <th style={{textAlign:'center',fontWeight:700}}>Hình thức</th>
                <th style={{textAlign:'left',fontWeight:700}}>Người trả</th>
                <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                <th style={{textAlign:'center',fontWeight:700,width:'80px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dsTrang.length===0?(
                <tr><td colSpan={10} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có giao dịch nào</td></tr>
              ):dsTrang.map((tt:any,i:number)=>{
                const isHuy=tt['Trạng thái']==='Huỷ'
                const ttC=TT_COLOR[tt['Trạng thái']]||{bg:'#F3F4F6',c:'#374151'}
                return (
                  <tr key={tt['Id']||i} style={{borderBottom:'1px solid #F0F0F0',
                    background:isHuy?'#FEF9F9':i%2===0?'white':'#FAFBFD',
                    opacity:isHuy?0.65:1}}>
                    <td style={{fontWeight:600,fontSize:'12px',color:'var(--primary)',
                      textDecoration:isHuy?'line-through':'none',whiteSpace:'nowrap',
                      cursor:'pointer',textDecorationLine:isHuy?'line-through':'underline'}}
                      onClick={()=>{setChiTietTT(tt);setEditMode(false);setEditSoTien(Number(tt['Số tiền trả']||0));setEditGhiChu(tt['Ghi chú']||'');setEditNgay(tt['Ngày trả tiền NCC']||'')}}>
                      {tt['Mã thanh toán']||'—'}
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>
                      {fDate(tt['Ngày trả tiền NCC'])}
                    </td>
                    <td>
                      <div style={{fontWeight:600,fontSize:'12px'}}>
                        {nccMap[tt['Mã NCC']]?.['Tên NCC']||tt['Mã NCC']||'—'}
                      </div>
                      <div style={{fontSize:'11px',color:'#9CA3AF'}}>{tt['Mã NCC']}</div>
                    </td>
                    <td style={{fontSize:'12px',color:'#374151',maxWidth:'180px',
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                      {tt['Nội dung']||'—'}
                    </td>
                    <td style={{textAlign:'right',fontWeight:800,fontSize:'13px',
                      color:isHuy?'#9CA3AF':'#16A34A',whiteSpace:'nowrap'}}>
                      {fVND(tt['Số tiền trả'])}đ
                    </td>
                    <td style={{textAlign:'right',fontSize:'12px',color:'#6B7280',whiteSpace:'nowrap'}}>
                      {tt['Số tiền còn lại sau TT']!=null
                        ?<span style={{color:Number(tt['Số tiền còn lại sau TT'])<0?'#D97706':'#374151'}}>
                          {fVND(Math.abs(Number(tt['Số tiền còn lại sau TT'])))}đ
                          {Number(tt['Số tiền còn lại sau TT'])<0&&
                            <span style={{fontSize:'10px',color:'#16A34A',marginLeft:'4px'}}>(NCC nợ)</span>}
                        </span>
                        :'—'}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'2px 8px',borderRadius:'8px',background:'#EFF6FF',
                        color:'#1E40AF',fontSize:'11px',fontWeight:600,whiteSpace:'nowrap'}}>
                        {tt['Hình thức']||'—'}
                      </span>
                    </td>
                    <td style={{fontSize:'12px',color:'#6B7280'}}>{tt['Người trả']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',
                        fontWeight:700,background:ttC.bg,color:ttC.c,whiteSpace:'nowrap'}}>
                        {tt['Trạng thái']||'—'}
                      </span>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <button onClick={()=>{setChiTietTT(tt);setEditMode(false);setEditSoTien(Number(tt['Số tiền trả']||0));setEditGhiChu(tt['Ghi chú']||'');setEditNgay(tt['Ngày trả tiền NCC']||'')}}
                        style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid #93C5FD',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600}}>
                        👁 Xem
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {filtered.length>0&&(
              <tfoot>
                <tr style={{background:'#F0F4FF',borderTop:'2px solid var(--border)'}}>
                  <td colSpan={5} style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:'13px'}}>
                    Tổng ({fHopLe.length} GD hợp lệ):
                  </td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,color:'#16A34A',fontSize:'14px',whiteSpace:'nowrap'}}>
                    {fVND(tongTien)}đ
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {tongTrang>1&&(
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0'}}>
            <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{filtered.length} giao dịch</span>
            <div style={{display:'flex',gap:'4px'}}>
              <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
              {Array.from({length:tongTrang},(_,i)=>i+1).map(p=>(
                <Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>
              ))}
              <Btn disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</Btn>
            </div>
          </div>
        )}
      </div>
      {/* Modal chi tiết TT */}
      {chiTietTT&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'480px',maxHeight:'90vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>📋 Chi tiết thanh toán</h2>
              <button onClick={()=>{setChiTietTT(null);setEditMode(false)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            {!editMode?(
              <div style={{display:'flex',flexDirection:'column',gap:'10px',fontSize:'13px'}}>
                {[
                  ['Mã thanh toán',chiTietTT['Mã thanh toán']],
                  ['Ngày thanh toán',fDate(chiTietTT['Ngày trả tiền NCC'])],
                  ['NCC',nccMap[chiTietTT['Mã NCC']]?.['Tên NCC']||chiTietTT['Mã NCC']||'—'],
                  ['Mã phiếu nhập',chiTietTT['Mã phiếu nhập']||'—'],
                  ['Nội dung',chiTietTT['Nội dung']||'—'],
                  ['Số tiền',fVND(chiTietTT['Số tiền trả'])+'đ'],
                  ['Còn lại sau TT',fVND(chiTietTT['Số tiền còn lại sau TT'])+'đ'],
                  ['Hình thức',chiTietTT['Hình thức']||'—'],
                  ['Người trả',chiTietTT['Người trả']||'—'],
                  ['Trạng thái',chiTietTT['Trạng thái']||'—'],
                  ['Ghi chú',chiTietTT['Ghi chú']||'—'],
                ].map(([lb,val]:any)=>(
                  <div key={lb} style={{display:'grid',gridTemplateColumns:'140px 1fr',gap:'8px',padding:'8px 12px',background:'#F8FAFC',borderRadius:'6px'}}>
                    <span style={{fontSize:'11px',color:'#6B7280',fontWeight:600}}>{lb}</span>
                    <span style={{fontWeight:600}}>{val}</span>
                  </div>
                ))}
                <div style={{display:'flex',gap:'10px',marginTop:'8px'}}>
                  {isOwner&&chiTietTT['Trạng thái']!=='Huỷ'&&(
                    <button onClick={()=>setEditMode(true)}
                      style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontWeight:600,cursor:'pointer'}}>
                      ✏️ Sửa
                    </button>
                  )}
                  <button onClick={()=>{setChiTietTT(null);setEditMode(false)}}
                    style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>
                    Đóng
                  </button>
                </div>
              </div>
            ):(
              <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ngày thanh toán</label>
                  <input className="input" type="date" value={editNgay} onChange={e=>setEditNgay(e.target.value)}/></div>
                <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Số tiền (đ)</label>
                  <input className="input" type="text" inputMode="numeric"
                    value={editSoTien?editSoTien.toLocaleString('en-US').replace(/,/g,'.'):''}  
                    onChange={e=>{const v=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'');setEditSoTien(Number(v)||0)}}/></div>
                <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                  <input className="input" placeholder="Ghi chú..." value={editGhiChu} onChange={e=>setEditGhiChu(e.target.value)}/></div>
                <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                  <button onClick={async()=>{
                    setSavingEdit(true)
                    try{
                      const res=await fetch('/api/nha-cung-cap',{method:'PATCH',headers:{'Content-Type':'application/json'},
                        body:JSON.stringify({loai:'thanh-toan',id:chiTietTT['Id']||chiTietTT['id'],
                          soTien:editSoTien,ghiChu:editGhiChu,ngay:editNgay})})
                      if(!res.ok) throw new Error((await res.json()).message)
                      showMsg('✅ Đã cập nhật')
                      setChiTietTT(null);setEditMode(false)
                    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
                    finally{setSavingEdit(false)}
                  }} disabled={savingEdit}
                    style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:savingEdit?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,cursor:'pointer'}}>
                    {savingEdit?'⏳':'✅ Lưu'}
                  </button>
                  <button onClick={()=>setEditMode(false)}
                    style={{padding:'10px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>
                    Huỷ
                  </button>
                </div>
              </div>
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
