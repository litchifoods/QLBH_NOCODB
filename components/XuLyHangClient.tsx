'use client'
// components/XuLyHangClient.tsx
import { useState, useMemo } from 'react'
import { UserSession } from '@/lib/auth'

function fDate(s:string){if(!s)return'—';try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}catch{return s}}
function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const HUONG_XU_LY:Record<string,string[]> = {
  'Lỗi':             ['Trả lại NCC', 'Bán giảm giá'],
  'Thiếu phụ kiện':  ['Trả lại NCC', 'Bổ sung phụ kiện'],
  'Hỏng phụ kiện':   ['Trả lại NCC', 'Bổ sung phụ kiện'],
  'Sai màu':         ['Trả lại NCC', 'Nhập kho để bán'],
  'Sai kích thước':  ['Trả lại NCC', 'Nhập kho để bán'],
}
const CONG_KHO = ['Bán giảm giá','Bổ sung phụ kiện','Nhập kho để bán']
const TT_COLOR:Record<string,{bg:string,c:string}> = {
  'Chưa xử lý': {bg:'#FEE2E2',c:'#991B1B'},
  'Chờ xử lý':  {bg:'#FEF3C7',c:'#92400E'},
  'Đang xử lý': {bg:'#DBEAFE',c:'#1E40AF'},
  'Đã xử lý':   {bg:'#D1FAE5',c:'#065F46'},
}
const LOAI_COLOR:Record<string,{bg:string,c:string}> = {
  'Lỗi':            {bg:'#FEE2E2',c:'#991B1B'},
  'Thiếu phụ kiện': {bg:'#FEF3C7',c:'#92400E'},
  'Hỏng phụ kiện':  {bg:'#FEF3C7',c:'#B45309'},
  'Sai màu':        {bg:'#F3E8FF',c:'#6D28D9'},
  'Sai kích thước': {bg:'#EDE9FE',c:'#5B21B6'},
}
const SO_DONG = 15

export default function XuLyHangClient({danhSach,nccList,sanPhamList,user}:{
  danhSach:any[]; nccList:any[]; sanPhamList:any[]; user:UserSession
}) {
  const [local,     setLocal]    = useState(danhSach)
  const [search,    setSearch]   = useState('')
  const [filterTT,  setFilterTT] = useState('Chưa xử lý')
  const [filterLoai,setFilterLoai]=useState('Tất cả')
  const [trang,     setTrang]    = useState(1)
  const [msg,       setMsg]      = useState('')
  const [msgOk,     setMsgOk]    = useState(true)
  const [popupXL,   setPopupXL]  = useState<any>(null)
  const [xlHuong,   setXlHuong]  = useState('')
  const [xlNguoi,   setXlNguoi]  = useState(user.hoTen||user.tenDangNhap||'')
  const [xlGhiChu,  setXlGhiChu] = useState('')
  const [loading,   setLoading]  = useState(false)

  function showMsg2(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}
  const nccMap = useMemo(()=>{const m:Record<string,any>={};nccList.forEach(n=>{m[n['Mã NCC']||'']=n});return m},[nccList])
  const spMap  = useMemo(()=>{const m:Record<string,any>={};sanPhamList.forEach(s=>{m[s['Mã SP']||'']=s});return m},[sanPhamList])

  async function capNhatXL(id:number, trangThai:string, extra:any={}){
    try{
      const res=await fetch('/api/xu-ly-hang',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id,['Trạng thái']:trangThai,...extra})})
      if(!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===id?{...d,['Trạng thái']:trangThai,...extra}:d))
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  async function xuLyHoanTat(){
    if(!popupXL) return
    setLoading(true)
    const huong = xlHuong||popupXL['Hướng xử lý']
    const sl = Number(popupXL['Số lượng']||0)
    const maSP = popupXL['Mã SP']
    try{
      await capNhatXL(Number(popupXL['Id']||popupXL['id']),'Đã xử lý',{
        ['Hướng xử lý']:huong,
        ['Người xử lý']:xlNguoi,
        ['Ghi chú']:(popupXL['Ghi chú']||'')+(xlGhiChu?` | ${xlGhiChu}`:''),
        ['Ngày hoàn thành']:new Date().toISOString().split('T')[0],
        ['Mã phiếu nhập']:popupXL['Mã phiếu nhập']||'', // ← thêm để API cập nhật tình trạng nhập kho
      })
      if(CONG_KHO.includes(huong)&&maSP&&sl>0){
        await fetch('/api/san-pham/cap-nhat-ton',{method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({maSP,delta:sl})
        }).catch(()=>{})
      }
      showMsg2(`${huong==='Trả lại NCC'?'🔄 Trả lại NCC':'⚠️ Chờ nhập kho'}: ${huong}${CONG_KHO.includes(huong)?' — đã cộng lại tồn kho':''}`)
      setPopupXL(null);setXlGhiChu('')
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  const filtered = useMemo(()=>{
    let r=local
    if(filterTT==='Chưa xử lý') r=r.filter(d=>d['Trạng thái']!=='Đã xử lý')
    else if(filterTT!=='Tất cả') r=r.filter(d=>d['Trạng thái']===filterTT)
    if(filterLoai!=='Tất cả') r=r.filter(d=>d['Loại vấn đề']===filterLoai)
    if(search.trim()){
      const q=boDau(search)
      r=r.filter(d=>boDau(d['Mã xử lý']||'').includes(q)||boDau(d['Mã phiếu nhập']||'').includes(q)||boDau(nccMap[d['Mã NCC']]?.['Tên NCC']||'').includes(q)||boDau(spMap[d['Mã SP']]?.['Tên sản phẩm']||'').includes(q))
    }
    return r
  },[local,filterTT,filterLoai,search,nccMap,spMap])

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG,trangHT*SO_DONG)

  const choXuLy = local.filter(d=>d['Trạng thái']==='Chờ xử lý').length
  const dangXL  = local.filter(d=>d['Trạng thái']==='Đang xử lý').length

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .xl-t th,.xl-t td{padding:8px 10px;vertical-align:middle;}
        .xl-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        label.lbl{display:block;font-size:11px;font-weight:600;margin-bottom:3px;}
      `}</style>

      {/* Header */}
      <div style={{marginBottom:'14px'}}>
        <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🔧 Xử lý hàng lỗi</h1>
        <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>
          Quản lý hàng phát hiện lỗi sau khi nhập kho
          {choXuLy>0&&<span style={{marginLeft:'8px',padding:'2px 8px',borderRadius:'10px',background:'#FEF3C7',color:'#92400E',fontWeight:600,fontSize:'12px'}}>⏳ {choXuLy} chờ xử lý</span>}
          {dangXL>0&&<span style={{marginLeft:'6px',padding:'2px 8px',borderRadius:'10px',background:'#DBEAFE',color:'#1E40AF',fontWeight:600,fontSize:'12px'}}>🔄 {dangXL} đang xử lý</span>}
        </p>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'12px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Tổng quan thống kê */}
      <div style={{display:'flex',flexWrap:'wrap',gap:'8px',marginBottom:'14px'}}>
        {Object.entries(LOAI_COLOR).map(([loai,col])=>{
          const total=local.filter((d:any)=>d['Loại vấn đề']===loai&&d['Trạng thái']!=='Đã xử lý').length
          if(!total) return null
          const isAct=filterLoai===loai
          const borderStyle=isAct?('2px solid '+(col as any).c):'1px solid var(--border)'
          const bgStyle=isAct?(col as any).bg:'white'
          return (
            <div key={loai} className="card"
              onClick={()=>setFilterLoai(isAct?'Tất cả':loai)}
              style={{padding:'10px 14px',cursor:'pointer',minWidth:'130px',border:borderStyle,background:bgStyle}}>
              <div style={{fontSize:'22px',fontWeight:800,color:(col as any).c}}>{total}</div>
              <div style={{fontSize:'12px',fontWeight:700,color:(col as any).c,marginBottom:'2px'}}>{loai}</div>
              <div style={{fontSize:'11px',color:'#6B7280'}}>còn {total} SP chưa xử lý</div>
            </div>
          )
        })}
        {(()=>{
          const banGiam=local.filter((d:any)=>d['Hướng xử lý']==='Bán giảm giá'&&d['Trạng thái']!=='Đã xử lý').length
          const traNCC=local.filter((d:any)=>d['Hướng xử lý']==='Trả lại NCC'&&d['Trạng thái']!=='Đã xử lý').length
          return (
            <>
              {banGiam>0&&(
                <div className="card" style={{padding:'10px 14px',minWidth:'130px',border:'1px solid #FCD34D',background:'#FEF9C3'}}>
                  <div style={{fontSize:'22px',fontWeight:800,color:'#92400E'}}>{banGiam}</div>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#92400E',marginBottom:'2px'}}>🏷️ Bán giảm giá</div>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>còn {banGiam} SP cần bán giảm</div>
                </div>
              )}
              {traNCC>0&&(
                <div className="card" style={{padding:'10px 14px',minWidth:'130px',border:'1px solid #93C5FD',background:'#EFF6FF'}}>
                  <div style={{fontSize:'22px',fontWeight:800,color:'#1E40AF'}}>{traNCC}</div>
                  <div style={{fontSize:'12px',fontWeight:700,color:'#1E40AF',marginBottom:'2px'}}>🔄 Trả lại NCC</div>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>còn {traNCC} SP cần trả NCC</div>
                </div>
              )}
            </>
          )
        })()}
      </div>
            {/* Filter */}
      <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm mã xử lý, NCC, SP..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'200px',maxWidth:'280px'}}/>
          <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
            <span style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:600}}>Trạng thái:</span>
            {['Tất cả','Chưa xử lý','Chờ xử lý','Đang xử lý','Đã xử lý'].map(tt=>{
              const c=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
              const isAct=filterTT===tt
              return <button key={tt} onClick={()=>setFilterTT(tt)} style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid',borderColor:isAct?c.c:'var(--border)',background:isAct?c.bg:'white',color:isAct?c.c:'var(--text-secondary)',fontWeight:isAct?700:400,fontSize:'12px',cursor:'pointer'}}>{tt}</button>
            })}
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="xl-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã xử lý</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày báo cáo</th>
                <th style={{textAlign:'left',fontWeight:700}}>NCC · Sản phẩm</th>
                <th style={{textAlign:'center',fontWeight:700}}>SL</th>
                <th style={{textAlign:'center',fontWeight:700}}>Loại vấn đề</th>
                <th style={{textAlign:'center',fontWeight:700}}>Hướng xử lý</th>
                <th style={{textAlign:'left',fontWeight:700}}>Người báo cáo</th>
                <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                <th style={{textAlign:'center',fontWeight:700,width:'130px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dsTrang.length===0?(
                <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>
                  {filterTT==='Chờ xử lý'?'🎉 Không có hàng lỗi nào cần xử lý':'Không có dữ liệu'}
                </td></tr>
              ):dsTrang.map((item,i)=>{
                const ncc=nccMap[item['Mã NCC']]||{}
                const sp=spMap[item['Mã SP']]||{}
                const loaiC=LOAI_COLOR[item['Loại vấn đề']]||{bg:'#F3F4F6',c:'#374151'}
                const ttC=TT_COLOR[item['Trạng thái']]||{bg:'#F3F4F6',c:'#374151'}
                return (
                  <tr key={item['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{whiteSpace:'nowrap'}}>
                      <div style={{fontWeight:600,fontSize:'12px',color:'var(--primary)'}}>{item['Mã xử lý']||'—'}</div>
                      <div style={{fontSize:'10px',color:'#9CA3AF'}}>📋 {item['Mã phiếu nhập']||'—'}</div>
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDate(item['Ngày xử lý'])}</td>
                    <td>
                      <div style={{fontWeight:600,fontSize:'12px'}}>{ncc['Tên NCC']||item['Mã NCC']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{sp['Tên sản phẩm']||item['Mã SP']||'—'}</div>
                    </td>
                    <td style={{textAlign:'center',fontWeight:700}}>{item['Số lượng']||0}
                      <div style={{fontSize:'10px',fontWeight:400,color:'#6B7280'}}>{sp['Đơn vị tính']||''}</div>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:loaiC.bg,color:loaiC.c,whiteSpace:'nowrap'}}>{item['Loại vấn đề']||'—'}</span>
                    </td>
                    <td style={{textAlign:'center',fontSize:'12px',color:'#374151'}}>{item['Hướng xử lý']||'—'}</td>
                    <td style={{fontSize:'12px',color:'#6B7280'}}>
                      <div>{item['Người báo cáo']||'—'}</div>
                      {item['Ghi chú']&&<div style={{fontSize:'10px',color:'#9CA3AF',maxWidth:'120px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item['Ghi chú']}</div>}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:ttC.bg,color:ttC.c,whiteSpace:'nowrap'}}>{item['Trạng thái']||'—'}</span>
                      {item['Người xử lý']&&<div style={{fontSize:'10px',color:'#9CA3AF',marginTop:'2px'}}>👤 {item['Người xử lý']}</div>}
                      {item['Ngày hoàn thành']&&<div style={{fontSize:'10px',color:'#9CA3AF'}}>{fDate(item['Ngày hoàn thành'])}</div>}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:'4px'}}>
                        {item['Trạng thái']==='Chờ xử lý'&&(
                          <button onClick={()=>capNhatXL(Number(item['Id']||item['id']),'Đang xử lý',{['Người xử lý']:user.hoTen||user.tenDangNhap})}
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #93C5FD',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600}} title='Bấm vào để xác định đã liên hệ với NCC về lỗi sản phẩm'>
                            📞 Báo cáo NCC
                          </button>
                        )}
                        {(item['Trạng thái']==='Chờ xử lý'||item['Trạng thái']==='Đang xử lý')&&(
                          <button onClick={()=>{setPopupXL(item);setXlHuong(item['Hướng xử lý']||'Trả lại NCC');setXlGhiChu('')}}
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}} title={item['Hướng xử lý']==='Trả lại NCC'?'Bấm vào để xác nhận đã trả lại sản phẩm cho NCC':'Bấm vào để xác định đã nhập kho'}>
                            {item['Hướng xử lý']==='Trả lại NCC'?'🔄 Trả lại NCC':'⚠️ Chờ nhập kho'}
                          </button>
                        )}
                        {item['Trạng thái']==='Đã xử lý'&&(
                          <span style={{fontSize:'11px',color:'#6B7280'}}>✓ Xong</span>
                        )}
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

      {/* ══ MODAL HOÀN TẤT XỬ LÝ ══ */}
      {popupXL&&(
        <div className="ov">
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'500px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>✅ Hoàn tất xử lý hàng lỗi</h2>
              <button onClick={()=>setPopupXL(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            {/* Thông tin */}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div>
                  <div style={{fontWeight:600,fontSize:'13px'}}>{spMap[popupXL['Mã SP']]?.['Tên sản phẩm']||popupXL['Mã SP']}</div>
                  <div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>NCC: {nccMap[popupXL['Mã NCC']]?.['Tên NCC']||popupXL['Mã NCC']}</div>
                  <div style={{fontSize:'12px',color:'#6B7280'}}>Phiếu nhập: {popupXL['Mã phiếu nhập']}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'12px',fontWeight:700,background:LOAI_COLOR[popupXL['Loại vấn đề']]?.bg||'#F3F4F6',color:LOAI_COLOR[popupXL['Loại vấn đề']]?.c||'#374151'}}>
                    {popupXL['Loại vấn đề']}
                  </span>
                  <div style={{fontSize:'13px',fontWeight:700,marginTop:'4px'}}>{popupXL['Số lượng']} {spMap[popupXL['Mã SP']]?.['Đơn vị tính']||''}</div>
                </div>
              </div>
              {popupXL['Ghi chú']&&<div style={{marginTop:'8px',fontSize:'12px',color:'#6B7280',fontStyle:'italic'}}>📝 {popupXL['Ghi chú']}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div>
                <label className="lbl">Hướng xử lý thực tế</label>
                <select className="input" value={xlHuong} onChange={e=>setXlHuong(e.target.value)}>
                  {(HUONG_XU_LY[popupXL['Loại vấn đề']]||['Trả lại NCC']).map(h=><option key={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Người xử lý</label>
                <input className="input" value={xlNguoi} onChange={e=>setXlNguoi(e.target.value)}/>
              </div>
              <div>
                <label className="lbl">Ghi chú kết quả</label>
                <input className="input" placeholder="Kết quả xử lý..." value={xlGhiChu} onChange={e=>setXlGhiChu(e.target.value)}/>
              </div>
              <div style={{padding:'8px 12px',borderRadius:'6px',fontSize:'12px',
                background:CONG_KHO.includes(xlHuong)?'#D1FAE5':'#FEF3C7',
                color:CONG_KHO.includes(xlHuong)?'#065F46':'#92400E'}}>
                {CONG_KHO.includes(xlHuong)
                  ?`✅ Sẽ cộng lại ${popupXL['Số lượng']} ${spMap[popupXL['Mã SP']]?.['Đơn vị tính']||''} vào tồn kho`
                  :`ℹ️ Tồn kho không thay đổi (hàng đã được trừ khi báo cáo)`}
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={xuLyHoanTat} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,cursor:loading?'not-allowed':'pointer',fontSize:'14px'}}>
                  {loading?'⏳ Đang lưu...':'✅ Xác nhận hoàn tất'}
                </button>
                <button onClick={()=>setPopupXL(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
              </div>
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
