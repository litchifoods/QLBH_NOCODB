const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'ChiTietDonHangClient.tsx')
let c = fs.readFileSync(filePath, 'utf8')

// 1. Thêm import useMemo nếu chưa có (đã có), thêm useEffect
const old1 = `import { useState, useMemo } from 'react'`
const new1 = `import { useState, useMemo, useEffect, useRef } from 'react'`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. import') }
else console.log('FAIL 1. import (có thể đã có)')

// 2. Thêm interface SuaDonForm sau interface SPItem
const old2 = `export default function ChiTietDonHangClient({`
const new2 = `interface SuaDonForm {
  htGiao: string
  ngayHenGiao: string
  datCoc: number
  cpGiaoHang: number
  ghiChu: string
  spList: SPItem[]
  searchSPMap: Record<string,string>
}

function MoneyInputSua({value,onChange,placeholder='0'}:{value:number;onChange:(v:number)=>void;placeholder?:string}){
  const [display,setDisplay]=useState(value>0?value.toLocaleString('vi-VN'):'')
  useEffect(()=>{setDisplay(value>0?value.toLocaleString('vi-VN'):'')},[value])
  return (
    <input inputMode="numeric" placeholder={placeholder}
      value={display}
      onChange={e=>{
        const raw=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'')
        const num=Number(raw)||0
        setDisplay(num>0?num.toLocaleString('vi-VN'):'')
        onChange(num)
      }}
      style={{width:'100%',padding:'7px 10px',border:'1px solid #E5E7EB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box' as any}}/>
  )
}

export default function ChiTietDonHangClient({`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. interface + MoneyInput') }
else console.log('FAIL 2.')

// 3. Thêm state modal sửa đơn sau state dangSua
const old3 = `  // Chế độ sửa — chỉ khi Chờ giao / Đang giao / Đang giao 1 phần
  const coTheSua = ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThaiTinh||trangThai)
  const [dangSua, setDangSua] = useState(false)`
const new3 = `  // Chế độ sửa — chỉ khi Chờ giao / Đang giao / Đang giao 1 phần
  const coTheSua = ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThaiTinh||trangThai)
  const [dangSua, setDangSua] = useState(false)

  // Modal sửa đơn — giống form tạo đơn mới
  const [showModalSua, setShowModalSua] = useState(false)
  // State form sửa
  const [suaHtGiao,      setSuaHtGiao]      = useState(donHang['Hình thức giao hàng']||'Giao hàng cho khách')
  const [suaNgayHenGiao, setSuaNgayHenGiao] = useState(donHang['Ngày hẹn giao']?new Date(donHang['Ngày hẹn giao']).toISOString().slice(0,16):'')
  const [suaDatCoc,      setSuaDatCoc]      = useState(Number(donHang['Đặt cọc']||0))
  const [suaCpGiao,      setSuaCpGiao]      = useState(Number(donHang['CP giao hàng']||0))
  const [suaGhiChu,      setSuaGhiChu]      = useState(donHang['Ghi chú']||'')
  const [suaSpList,      setSuaSpList]      = useState<SPItem[]>([])
  const [suaSearchSP,    setSuaSearchSP]    = useState('')
  const [suaShowDropSP,  setSuaShowDropSP]  = useState(false)
  const [suaLoadingLuu,  setSuaLoadingLuu]  = useState(false)
  const [suaMsg,         setSuaMsg]         = useState('')

  function moModalSua() {
    // Load SP hiện tại vào form sửa (chỉ SP chưa hủy)
    setSuaSpList(spList.filter(sp=>!sp.da_huy).map(sp=>({...sp})))
    setSuaHtGiao(donHang['Hình thức giao hàng']||'Giao hàng cho khách')
    setSuaNgayHenGiao(donHang['Ngày hẹn giao']?new Date(donHang['Ngày hẹn giao']).toISOString().slice(0,16):'')
    setSuaDatCoc(Number(donHang['Đặt cọc']||0))
    setSuaCpGiao(Number(donHang['CP giao hàng']||0))
    setSuaGhiChu(donHang['Ghi chú']||'')
    setSuaMsg('')
    setShowModalSua(true)
  }

  const suaSpLoc = useMemo(()=>{
    if(!suaSearchSP.trim()) return danhSachSP.filter((sp:any)=>sp['Tồn kho']>0||sp['Loại SP']==='Theo yêu cầu').slice(0,8)
    const q=(suaSearchSP||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
    return danhSachSP.filter((sp:any)=>
      (sp['Tên sản phẩm']||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().includes(q)||
      (sp['Mã SP']||'').toLowerCase().includes(q)
    ).slice(0,8)
  },[suaSearchSP,danhSachSP])

  function suaThemSP(sp:any){
    const ten=(sp['Tên sản phẩm']||'').trim()
    const ma=sp['Mã SP']||''
    const trung=suaSpList.find(s=>s.maSP===ma||(ten&&s.tenSP===ten))
    if(trung){
      setSuaSpList(prev=>prev.map(s=>s.id===trung.id?{...s,soLuong:s.soLuong+1,thanhTien:(s.soLuong+1)*s.donGia}:s))
    } else {
      const dg=Number(sp['Giá bán lẻ']||0)
      setSuaSpList(prev=>[...prev,{id:'new-'+Date.now(),maCT:'',maSP:ma,tenSP:ten,soLuong:1,donGia:dg,thanhTien:dg,ghiChu:'',da_huy:false,la_moi:true,_da_sua:false,_giaGoc:0,_slGoc:0}])
    }
    setSuaSearchSP('');setSuaShowDropSP(false)
  }

  function suaUpdSP(id:string,field:string,val:any){
    setSuaSpList(prev=>prev.map(sp=>{
      if(sp.id!==id) return sp
      const u={...sp,[field]:val}
      if(field==='soLuong'||field==='donGia'){
        u.thanhTien=(field==='soLuong'?Number(val):sp.soLuong)*(field==='donGia'?Number(val):sp.donGia)
      }
      return u
    }))
  }

  function suaXoaSP(id:string){
    setSuaSpList(prev=>prev.filter(sp=>sp.id!==id))
  }

  const suaTongTien = suaSpList.reduce((s,sp)=>s+sp.thanhTien,0)
  const suaConLai   = suaTongTien + suaCpGiao - suaDatCoc

  async function luuModalSua(){
    if(suaSpList.length===0){setSuaMsg('Vui lòng thêm ít nhất 1 sản phẩm');return}
    setSuaLoadingLuu(true);setSuaMsg('')
    try{
      // SP mới thêm vào
      const spMoi = suaSpList.filter(sp=>sp.la_moi)
      // SP bị xóa khỏi list (so với spList gốc chưa hủy)
      const spGocChuaHuy = spList.filter(sp=>!sp.da_huy)
      const spBiXoa = spGocChuaHuy.filter(spG=>!suaSpList.find(s=>s.id===spG.id))
      // SP sửa SL/giá
      const spSuaInfo = suaSpList.filter(sp=>!sp.la_moi).filter(sp=>{
        const goc=spGocChuaHuy.find(g=>g.id===sp.id)
        return goc&&(goc.soLuong!==sp.soLuong||goc.donGia!==sp.donGia||goc.tenSP!==sp.tenSP)
      })

      // 1. Thêm SP mới
      for(const sp of spMoi){
        await fetch('/api/chi-tiet-don',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({'Mã đơn hàng':maDon,'Mã SP':sp.maSP,'Tên SP (ghi nhanh)':sp.tenSP,'Số lượng':sp.soLuong,'Đơn giá':sp.donGia,'Thành tiền':sp.thanhTien,'Ghi chú SP':sp.ghiChu})})
      }
      // 2. Đánh dấu SP bị xóa = Huỷ
      for(const sp of spBiXoa){
        if(!sp.id.startsWith('new-')){
          await fetch('/api/chi-tiet-don',{method:'PATCH',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({id:sp.id,'Trạng thái SP':'Huỷ'})})
        }
      }
      // 3. Cập nhật SP sửa
      for(const sp of spSuaInfo){
        await fetch('/api/chi-tiet-don',{method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id:sp.id,'Tên SP (ghi nhanh)':sp.tenSP,'Số lượng':sp.soLuong,'Đơn giá':sp.donGia,'Thành tiền':sp.thanhTien})})
      }
      // 4. Cập nhật đơn hàng
      await fetch('/api/don-hang',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          id:donHang['Id']||donHang['id'],
          'Tổng tiền đơn':suaTongTien,
          'Đặt cọc':suaDatCoc,
          'CP giao hàng':suaCpGiao,
          'Còn phải thu':Math.max(0,suaConLai),
          'Hình thức giao hàng':suaHtGiao,
          'Ngày hẹn giao':suaNgayHenGiao||null,
          'Ghi chú':suaGhiChu,
        })})
      setShowModalSua(false)
      router.refresh()
    }catch(e:any){setSuaMsg('Lỗi: '+(e.message||'Không xác định'))}
    finally{setSuaLoadingLuu(false)}
  }`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. state + hàm modal sửa') }
else console.log('FAIL 3.')

// 4. Đổi nút Sửa để mở modal thay vì setDangSua
const old4 = `          {!dangSua && coTheSua && (
            <button onClick={()=>setDangSua(true)}
              style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#F59E0B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              ✏️ Sửa đơn hàng
            </button>
          )}`
const new4 = `          {coTheSua && !showModalSua && (
            <button onClick={moModalSua}
              style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#F59E0B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              ✏️ Sửa đơn hàng
            </button>
          )}`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 4. nút mở modal') }
else console.log('FAIL 4.')

// 5. Ẩn nút Lưu/Thoát cũ trong header (không cần nữa)
const old5 = `          {dangSua && (
            <>
              <button onClick={luuSua} disabled={loading}
                style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
                {loading?'⏳ Đang lưu...':'💾 Lưu chỉnh sửa'}
              </button>
              <button onClick={()=>setDangSua(false)} disabled={loading}
                style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',fontWeight:600,fontSize:'13px',cursor:'pointer'}}>
                ✕ Thoát sửa
              </button>
            </>
          )}`
const new5 = ``
if (c.includes(old5)) { c = c.replace(old5, new5); console.log('OK 5. ẩn nút cũ') }
else console.log('FAIL 5.')

// 6. Thêm modal sửa đơn trước modal hủy đơn
const old6 = `      {/* ── Modal hủy đơn ── */}`
const new6 = `      {/* ── MODAL SỬA ĐƠN HÀNG ── */}
      {showModalSua&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.6)',zIndex:300,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:'16px',overflowY:'auto'}}
          onClick={()=>setShowModalSua(false)}>
          <div style={{background:'white',borderRadius:'12px',width:'100%',maxWidth:'1100px',marginTop:'8px',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>

            {/* Header modal */}
            <div style={{background:'var(--primary)',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{color:'white',fontWeight:700,fontSize:'16px'}}>✏️ Sửa đơn hàng — {maDon}</div>
                <div style={{color:'rgba(255,255,255,.7)',fontSize:'12px',marginTop:'2px'}}>Chỉnh sửa thông tin, thêm/bớt sản phẩm</div>
              </div>
              <button onClick={()=>setShowModalSua(false)} style={{background:'rgba(255,255,255,.15)',border:'none',color:'white',borderRadius:'6px',padding:'6px 12px',cursor:'pointer',fontSize:'13px',fontWeight:600}}>✕ Đóng</button>
            </div>

            {suaMsg&&<div style={{padding:'10px 20px',background:'#FEE2E2',color:'#991B1B',fontSize:'13px',borderBottom:'1px solid #FCA5A5'}}>{suaMsg}</div>}

            <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:'0'}}>

              {/* Cột trái — thông tin đơn */}
              <div style={{padding:'20px',borderRight:'1px solid #F0F0F0',display:'flex',flexDirection:'column',gap:'14px'}}>

                {/* Thông tin KH — chỉ xem */}
                <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px 14px'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'#94A3B8',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:'8px'}}>Khách hàng</div>
                  <div style={{fontWeight:700,fontSize:'14px',color:'var(--primary)'}}>{khachHang?.['Tên khách hàng']||donHang['Tên khách hàng']||'—'}</div>
                  {khachHang?.['Số điện thoại']&&<div style={{fontSize:'12px',color:'#6B7280',marginTop:'3px'}}>📞 {khachHang['Số điện thoại']}</div>}
                  {(donHang['Địa chỉ giao']||khachHang?.['Địa chỉ'])&&<div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>📍 {donHang['Địa chỉ giao']||khachHang?.['Địa chỉ']}</div>}
                </div>

                {/* Giao hàng */}
                <div>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--primary)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'.05em'}}>🚚 Giao hàng</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Hình thức giao</label>
                      <select value={suaHtGiao} onChange={e=>setSuaHtGiao(e.target.value)}
                        style={{width:'100%',padding:'7px 10px',border:'1px solid #E5E7EB',borderRadius:'6px',fontSize:'13px'}}>
                        <option>Giao hàng cho khách</option>
                        <option>Khách mang hàng về</option>
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ngày hẹn giao</label>
                      <input type="datetime-local" value={suaNgayHenGiao} onChange={e=>setSuaNgayHenGiao(e.target.value)}
                        style={{width:'100%',padding:'7px 10px',border:'1px solid #E5E7EB',borderRadius:'6px',fontSize:'13px'}}/>
                    </div>
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Ghi chú</label>
                      <textarea value={suaGhiChu} onChange={e=>setSuaGhiChu(e.target.value)} rows={2}
                        style={{width:'100%',padding:'7px 10px',border:'1px solid #E5E7EB',borderRadius:'6px',fontSize:'13px',resize:'vertical' as any}}/>
                    </div>
                  </div>
                </div>

                {/* Thanh toán */}
                <div>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--primary)',marginBottom:'8px',textTransform:'uppercase',letterSpacing:'.05em'}}>💰 Thanh toán</div>
                  <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>Đặt cọc (đ)</label>
                      <MoneyInputSua value={suaDatCoc} onChange={setSuaDatCoc}/>
                    </div>
                    <div>
                      <label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'3px'}}>CP giao hàng (đ)</label>
                      <MoneyInputSua value={suaCpGiao} onChange={setSuaCpGiao}/>
                    </div>
                    <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'10px 12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
                        <span style={{color:'#6B7280'}}>Tổng tiền hàng:</span>
                        <span style={{fontWeight:700}}>{suaTongTien.toLocaleString('vi-VN')}đ</span>
                      </div>
                      {suaCpGiao>0&&<div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
                        <span style={{color:'#6B7280'}}>CP giao hàng:</span>
                        <span style={{fontWeight:600,color:'#92400E'}}>+ {suaCpGiao.toLocaleString('vi-VN')}đ</span>
                      </div>}
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'4px'}}>
                        <span style={{color:'#6B7280'}}>Đặt cọc:</span>
                        <span style={{fontWeight:600,color:'#16A34A'}}>- {suaDatCoc.toLocaleString('vi-VN')}đ</span>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'14px',fontWeight:800,borderTop:'1px solid rgba(27,58,107,.15)',paddingTop:'6px',marginTop:'4px'}}>
                        <span style={{color:'var(--primary)'}}>Còn phải thu:</span>
                        <span style={{color:suaConLai>0?'#DC2626':'#16A34A'}}>{Math.max(0,suaConLai).toLocaleString('vi-VN')}đ</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cột phải — sản phẩm */}
              <div style={{padding:'20px',display:'flex',flexDirection:'column',gap:'14px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--primary)',textTransform:'uppercase',letterSpacing:'.05em'}}>🪑 Sản phẩm trong đơn ({suaSpList.length})</div>
                </div>

                {/* Header cột SP */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 52px 120px 110px 28px',gap:'6px',padding:'4px 0',fontSize:'11px',fontWeight:700,color:'#94A3B8',borderBottom:'1px solid #F0F0F0'}}>
                  <span>Sản phẩm</span>
                  <span style={{textAlign:'center'}}>SL</span>
                  <span style={{textAlign:'right'}}>Đơn giá</span>
                  <span style={{textAlign:'right'}}>Thành tiền</span>
                  <span></span>
                </div>

                {/* Danh sách SP */}
                <div style={{display:'flex',flexDirection:'column',gap:'6px',maxHeight:'380px',overflowY:'auto'}}>
                  {suaSpList.map((sp,idx)=>(
                    <div key={sp.id} style={{display:'grid',gridTemplateColumns:'1fr 52px 120px 110px 28px',gap:'6px',alignItems:'center',padding:'6px 0',borderBottom:'1px solid #F9FAFB'}}>
                      <div>
                        <input value={sp.tenSP} onChange={e=>suaUpdSP(sp.id,'tenSP',e.target.value)}
                          style={{width:'100%',padding:'5px 8px',border:'1px solid #E5E7EB',borderRadius:'5px',fontSize:'12px',fontWeight:600}}
                          placeholder="Tên sản phẩm..."/>
                        {sp.la_moi&&<span style={{fontSize:'10px',background:'#D1FAE5',color:'#065F46',padding:'1px 5px',borderRadius:'8px',marginTop:'2px',display:'inline-block'}}>Mới</span>}
                        {spDaSoatSet&&spDaSoatSet.has(sp.tenSP||sp.maSP)&&<span style={{fontSize:'10px',background:'#FEF3C7',color:'#92400E',padding:'1px 5px',borderRadius:'8px',marginTop:'2px',display:'inline-block'}}>🔒 Đã ĐS</span>}
                      </div>
                      <input type="number" min="1" value={sp.soLuong}
                        onChange={e=>suaUpdSP(sp.id,'soLuong',Number(e.target.value))}
                        disabled={!!(spDaSoatSet&&spDaSoatSet.has(sp.tenSP||sp.maSP))}
                        style={{padding:'5px 4px',border:'1px solid #E5E7EB',borderRadius:'5px',fontSize:'12px',textAlign:'center',width:'100%'}}/>
                      <MoneyInputSua value={Number(sp.donGia)||0} onChange={v=>suaUpdSP(sp.id,'donGia',v)}/>
                      <div style={{textAlign:'right',fontWeight:700,fontSize:'12px',color:'#16A34A'}}>{sp.thanhTien.toLocaleString('vi-VN')}đ</div>
                      {!(spDaSoatSet&&spDaSoatSet.has(sp.tenSP||sp.maSP))
                        ?<button onClick={()=>suaXoaSP(sp.id)} style={{background:'none',border:'none',cursor:'pointer',color:'#DC2626',fontSize:'16px',padding:0}}>✕</button>
                        :<span></span>}
                    </div>
                  ))}
                </div>

                {/* Tìm + thêm SP */}
                <div style={{position:'relative'}}>
                  <input placeholder="🔍 Tìm sản phẩm để thêm vào đơn..." value={suaSearchSP}
                    onChange={e=>{setSuaSearchSP(e.target.value);setSuaShowDropSP(true)}}
                    onFocus={()=>setSuaShowDropSP(true)}
                    onBlur={()=>setTimeout(()=>setSuaShowDropSP(false),200)}
                    style={{width:'100%',padding:'9px 12px',border:'2px dashed var(--primary)',borderRadius:'8px',fontSize:'13px',background:'white',outline:'none'}}/>
                  {suaShowDropSP&&(
                    <div style={{position:'absolute',top:'calc(100% + 3px)',left:0,right:0,zIndex:60,background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,.12)',maxHeight:'200px',overflowY:'auto'}}>
                      {suaSpLoc.length===0
                        ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>Không tìm thấy</div>
                        :suaSpLoc.map((sp:any)=>(
                          <div key={sp['Mã SP']} onMouseDown={e=>{e.preventDefault();suaThemSP(sp)}}
                            style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px'}}
                            onMouseEnter={e=>(e.currentTarget.style.background='#F0F9FF')}
                            onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                            <div style={{fontWeight:600}}>{sp['Tên sản phẩm']}</div>
                            <div style={{fontSize:'11px',color:'#6B7280'}}>{sp['Mã SP']} · {Number(sp['Giá bán lẻ']||0).toLocaleString('vi-VN')}đ · Kho: {sp['Tồn kho']||0}</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Nút lưu */}
                <div style={{display:'flex',gap:'10px',marginTop:'auto',paddingTop:'8px',borderTop:'1px solid #F0F0F0'}}>
                  <button onClick={luuModalSua} disabled={suaLoadingLuu}
                    style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:suaLoadingLuu?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:suaLoadingLuu?'not-allowed':'pointer'}}>
                    {suaLoadingLuu?'⏳ Đang lưu...':'💾 Lưu chỉnh sửa'}
                  </button>
                  <button onClick={()=>setShowModalSua(false)} style={{padding:'12px 16px',borderRadius:'8px',border:'1px solid #E5E7EB',background:'white',cursor:'pointer',fontWeight:600,fontSize:'13px'}}>Huỷ</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal hủy đơn ── */}`
if (c.includes(old6)) { c = c.replace(old6, new6); console.log('OK 6. modal sửa đơn') }
else console.log('FAIL 6.')

fs.writeFileSync(filePath, c, 'utf8')
console.log('Done! ChiTietDonHangClient.tsx saved.')
