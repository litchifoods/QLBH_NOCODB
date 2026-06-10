'use client'
import { useState, useMemo } from 'react'
import { UserSession } from '@/lib/auth'

const LOAI_CHI_PHI = [
  'Mặt bằng','Dịch vụ mua ngoài','Văn phòng phẩm','Xăng xe',
  'Vật tư','Công cụ','Sửa chữa','Mua sắm tài sản',
  'Thuế','Bảo hiểm','Tiếp khách','Marketing','Khác'
]
const LOAI_THU = [
  'Thu đổi/trả hàng','Thu phí vận chuyển thêm','Thu phí lắp đặt thêm',
  'Thu phí tư vấn thiết kế','Thu bán phế liệu','Thu bồi thường',
  'Thu lãi tiền gửi','Thu khác'
]
const LOAI_THU_ICONS: Record<string,string> = {
  'Thu đổi/trả hàng':'🔄','Thu phí vận chuyển thêm':'🚚','Thu phí lắp đặt thêm':'🔧',
  'Thu phí tư vấn thiết kế':'✏️','Thu bán phế liệu':'♻️','Thu bồi thường':'⚖️',
  'Thu lãi tiền gửi':'🏦','Thu khác':'💰'
}
const LOAI_ICONS: Record<string,string> = {
  'Mặt bằng':'🏠','Dịch vụ mua ngoài':'⚡','Văn phòng phẩm':'📎',
  'Xăng xe':'⛽','Vật tư':'🔩','Công cụ':'🔧','Sửa chữa':'🛠️',
  'Mua sắm tài sản':'🖥️','Thuế':'📋','Bảo hiểm':'🛡️',
  'Tiếp khách':'🍽️','Marketing':'📣','Khác':'💼'
}

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){
  if(!s)return'—'
  try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}
  catch{return s}
}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const EMPTY_CHI = {
  ngayPhatSinh: new Date().toISOString().split('T')[0],
  loaiChiPhi: '', noiDung: '', soTien: '',
  hinhThuc: 'Tiền mặt', nguoiChi: '', trangThai: 'Đã thanh toán', ghiChu: ''
}
const EMPTY_THU = {
  ngayPhatSinh: new Date().toISOString().split('T')[0],
  loaiThu: '', noiDung: '', soTien: '',
  hinhThuc: 'Tiền mặt', nguoiThu: '', ghiChu: '', maDonHang: ''
}

export default function ChiPhiClient({
  chiPhiList, nvList, user
}:{
  chiPhiList:any[]; nvList:any[]; user:UserSession
}) {
  const isOwner = user.vaiTro === 'Chủ cửa hàng'
  const now = new Date()
  const [tab, setTab] = useState<'chi'|'thu'>('chi')
  const [tuNgay, setTuNgay] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`)
  const [denNgay, setDenNgay] = useState(now.toISOString().split('T')[0])
  const [search, setSearch] = useState('')
  const [filterLoai, setFilterLoai] = useState('Tất cả')
  const [filterTT, setFilterTT] = useState('Tất cả')
  const [showForm, setShowForm] = useState(false)
  const [formChi, setFormChi] = useState({...EMPTY_CHI})
  const [formThu, setFormThu] = useState({...EMPTY_THU})
  const [editItem, setEditItem] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<any>(null)
  const [trang, setTrang] = useState(1)
  const SO_DONG = 15
  const [showNVSearch, setShowNVSearch] = useState(false)
  const [nvSearch, setNVSearch] = useState('')

  function showMsg(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),4000)}
  function updChi(k:string,v:string){setFormChi(f=>({...f,[k]:v}))}
  function updThu(k:string,v:string){setFormThu(f=>({...f,[k]:v}))}

  // Tách danh sách Chi và Thu
  const danhSachChi = useMemo(()=>chiPhiList.filter(c=>!c['Loại giao dịch']||c['Loại giao dịch']==='Chi'),[chiPhiList])
  const danhSachThu = useMemo(()=>chiPhiList.filter(c=>c['Loại giao dịch']==='Thu'),[chiPhiList])

  // Filter Chi
  const filteredChi = useMemo(()=>{
    return danhSachChi.filter(c=>{
      const ngay=(c['Ngày phát sinh']||'').split('T')[0]
      if(ngay<tuNgay||ngay>denNgay) return false
      if(filterLoai!=='Tất cả'&&c['Loại chi phí']!==filterLoai) return false
      if(filterTT!=='Tất cả'&&c['Trạng thái']!==filterTT) return false
      if(search.trim()){const q=boDau(search);return boDau(c['Nội dung']||'').includes(q)||boDau(c['Loại chi phí']||'').includes(q)||boDau(c['Người chi']||'').includes(q)}
      return true
    })
  },[danhSachChi,tuNgay,denNgay,filterLoai,filterTT,search])

  // Filter Thu
  const filteredThu = useMemo(()=>{
    return danhSachThu.filter(c=>{
      const ngay=(c['Ngày phát sinh']||'').split('T')[0]
      if(ngay<tuNgay||ngay>denNgay) return false
      if(search.trim()){const q=boDau(search);return boDau(c['Nội dung']||'').includes(q)||boDau(c['Loại thu']||'').includes(q)}
      return true
    })
  },[danhSachThu,tuNgay,denNgay,search])

  useMemo(()=>setTrang(1),[tuNgay,denNgay,filterLoai,filterTT,search,tab])

  const filtered = tab==='chi' ? filteredChi : filteredThu
  const tongTrang = Math.max(1, Math.ceil(filtered.length/SO_DONG))
  const trangHT = Math.min(trang, tongTrang)
  const danhSachTrang = filtered.slice((trangHT-1)*SO_DONG, trangHT*SO_DONG)

  const tongChi = filteredChi.reduce((s,c)=>s+Number(c['Số tiền']||0),0)
  const tongThu = filteredThu.reduce((s,c)=>s+Number(c['Số tiền']||0),0)
  const chuaTT = filteredChi.filter(c=>c['Trạng thái']==='Chưa thanh toán').reduce((s,c)=>s+Number(c['Số tiền']||0),0)

  const theoLoai = useMemo(()=>{
    const m:Record<string,number>={}
    filteredChi.forEach(c=>{const l=c['Loại chi phí']||'Khác';m[l]=(m[l]||0)+Number(c['Số tiền']||0)})
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[filteredChi])

  const theoLoaiThu = useMemo(()=>{
    const m:Record<string,number>={}
    filteredThu.forEach(c=>{const l=c['Loại thu']||'Thu khác';m[l]=(m[l]||0)+Number(c['Số tiền']||0)})
    return Object.entries(m).sort((a,b)=>b[1]-a[1])
  },[filteredThu])

  const nvLoc = useMemo(()=>{
    if(!nvSearch.trim()) return nvList.slice(0,10)
    const q=boDau(nvSearch)
    return nvList.filter(n=>boDau(n['Họ và Tên']||'').includes(q)||boDau(n['Mã nhân viên']||'').includes(q)).slice(0,10)
  },[nvList,nvSearch])

  async function luuChiPhi(){
    if(!formChi.loaiChiPhi){showMsg('Vui lòng chọn loại chi phí',false);return}
    if(!formChi.soTien||Number(String(formChi.soTien).replace(/[^0-9]/g,''))<=0){showMsg('Vui lòng nhập số tiền',false);return}
    setLoading(true)
    try {
      const soTienNum = Number(String(formChi.soTien).replace(/[^0-9]/g,''))
      if(editItem) {
        const body = {
          id: editItem['Id']||editItem['id'],
          'Ngày phát sinh': formChi.ngayPhatSinh,
          'Loại chi phí': formChi.loaiChiPhi,
          'Nội dung': formChi.noiDung,
          'Số tiền': soTienNum,
          'Hình thức thanh toán': formChi.hinhThuc,
          'Người chi': formChi.nguoiChi,
          'Trạng thái': formChi.trangThai,
          'Ghi chú': formChi.ghiChu,
          'Loại giao dịch': 'Chi',
        }
        const res = await fetch('/api/chi-phi',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        if(!res.ok) throw new Error((await res.json()).message)
      } else {
        const body = {
          ngayPhatSinh: formChi.ngayPhatSinh,
          loaiChiPhi: formChi.loaiChiPhi,
          noiDung: formChi.noiDung,
          soTien: soTienNum,
          hinhThuc: formChi.hinhThuc,
          nguoiChi: formChi.nguoiChi,
          trangThai: formChi.trangThai,
          ghiChu: formChi.ghiChu,
          loaiGiaoDich: 'Chi',
        }
        const res = await fetch('/api/chi-phi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        if(!res.ok) throw new Error((await res.json()).message)
      }
      showMsg(editItem?'✅ Đã cập nhật':'✅ Đã thêm chi phí')
      setShowForm(false);setEditItem(null);setFormChi({...EMPTY_CHI})
      window.location.reload()
    } catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function luuThu(){
    if(!formThu.loaiThu){showMsg('Vui lòng chọn loại thu',false);return}
    if(!formThu.soTien||Number(String(formThu.soTien).replace(/[^0-9]/g,''))<=0){showMsg('Vui lòng nhập số tiền',false);return}
    setLoading(true)
    try {
      const soTienNum = Number(String(formThu.soTien).replace(/[^0-9]/g,''))
      if(editItem) {
        const body = {
          id: editItem['Id']||editItem['id'],
          'Ngày phát sinh': formThu.ngayPhatSinh,
          'Loại thu': formThu.loaiThu,
          'Nội dung': formThu.noiDung,
          'Số tiền': soTienNum,
          'Hình thức thanh toán': formThu.hinhThuc,
          'Người chi': formThu.nguoiThu,
          'Ghi chú': formThu.ghiChu,
          'Loại giao dịch': 'Thu',
        }
        const res = await fetch('/api/chi-phi',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        if(!res.ok) throw new Error((await res.json()).message)
      } else {
        const body = {
          ngayPhatSinh: formThu.ngayPhatSinh,
          loaiThu: formThu.loaiThu,
          noiDung: formThu.noiDung,
          soTien: soTienNum,
          hinhThuc: formThu.hinhThuc,
          nguoiThu: formThu.nguoiThu,
          ghiChu: formThu.ghiChu,
          maDonHang: formThu.maDonHang,
          loaiGiaoDich: 'Thu',
        }
        const res = await fetch('/api/chi-phi',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
        if(!res.ok) throw new Error((await res.json()).message)
      }
      showMsg(editItem?'✅ Đã cập nhật':'✅ Đã thêm khoản thu')
      setShowForm(false);setEditItem(null);setFormThu({...EMPTY_THU})
      window.location.reload()
    } catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function xoaItem(item:any){
    setLoading(true)
    try {
      const id=item['Id']||item['id']
      const res=await fetch(`/api/chi-phi?id=${id}`,{method:'DELETE'})
      if(!res.ok) throw new Error((await res.json()).message)
      showMsg('✅ Đã xóa')
      setDeleteConfirm(null)
      window.location.reload()
    } catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  function moSuaChi(item:any){
    setEditItem(item)
    setFormChi({
      ngayPhatSinh:(item['Ngày phát sinh']||'').split('T')[0],
      loaiChiPhi: item['Loại chi phí']||'',
      noiDung:    item['Nội dung']||'',
      soTien:     String(item['Số tiền']||''),
      hinhThuc:   item['Hình thức thanh toán']||'Tiền mặt',
      nguoiChi:   item['Người chi']||'',
      trangThai:  item['Trạng thái']||'Đã thanh toán',
      ghiChu:     item['Ghi chú']||''
    })
    setNVSearch(item['Người chi']||'')
    setShowForm(true)
  }

  function moSuaThu(item:any){
    setEditItem(item)
    setFormThu({
      ngayPhatSinh:(item['Ngày phát sinh']||'').split('T')[0],
      loaiThu:    item['Loại thu']||'',
      noiDung:    item['Nội dung']||'',
      soTien:     String(item['Số tiền']||''),
      hinhThuc:   item['Hình thức thanh toán']||'Tiền mặt',
      nguoiThu:   item['Người chi']||'',
      ghiChu:     item['Ghi chú']||'',
      maDonHang:  item['Mã đơn hàng']||'',
    })
    setShowForm(true)
  }

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .cp-t th,.cp-t td{padding:8px 10px;vertical-align:middle;}
        .cp-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .nv-db{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:200px;overflow-y:auto;}
        .nv-di{padding:8px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .nv-di:hover{background:#F0F9FF;}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>💹 Thu Chi hoạt động</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>{tuNgay} → {denNgay}</p>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:'12px',color:'var(--text-secondary)',fontWeight:600}}>Từ:</span>
          <input type="date" value={tuNgay} onChange={e=>setTuNgay(e.target.value)} style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px'}}/>
          <span style={{fontSize:'12px',color:'var(--text-secondary)',fontWeight:600}}>Đến:</span>
          <input type="date" value={denNgay} onChange={e=>setDenNgay(e.target.value)} style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px'}}/>
          <button onClick={()=>{const n=new Date();setTuNgay(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`);setDenNgay(n.toISOString().split('T')[0])}}
            style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>
            📅 Tháng này
          </button>
          {isOwner&&<button onClick={()=>{setShowForm(true);setEditItem(null);setFormChi({...EMPTY_CHI});setFormThu({...EMPTY_THU});setNVSearch('')}}
            style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:tab==='chi'?'var(--primary)':'#16A34A',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
            + {tab==='chi'?'Thêm chi phí':'Thêm khoản thu'}
          </button>}
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Thống kê tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'16px'}}>
        {[
          {icon:'💸',label:'Tổng chi',val:fVND(tongChi)+'đ',c:'#DC2626'},
          {icon:'💰',label:'Tổng thu',val:fVND(tongThu)+'đ',c:'#16A34A'},
          {icon:'📊',label:'Chênh lệch',val:(tongThu-tongChi>=0?'+':'')+fVND(tongThu-tongChi)+'đ',c:tongThu-tongChi>=0?'#16A34A':'#DC2626'},
          {icon:'⏳',label:'Chi chưa TT',val:fVND(chuaTT)+'đ',c:'#D97706'},
        ].map(({icon,label,val,c})=>(
          <div key={label} className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
            <div style={{fontSize:'15px',fontWeight:800,color:c}}>{val}</div>
            <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tab Chi / Thu */}
      <div style={{display:'flex',gap:'4px',marginBottom:'16px',borderBottom:'2px solid var(--border)'}}>
        <button onClick={()=>{setTab('chi');setSearch('');setFilterLoai('Tất cả');setFilterTT('Tất cả')}}
          style={{padding:'9px 20px',borderRadius:'8px 8px 0 0',border:'none',
            background:tab==='chi'?'var(--primary)':'transparent',
            color:tab==='chi'?'white':'var(--text-secondary)',
            fontWeight:tab==='chi'?700:400,cursor:'pointer',fontSize:'13px'}}>
          💸 Chi phí ({filteredChi.length})
        </button>
        <button onClick={()=>{setTab('thu');setSearch('');setFilterLoai('Tất cả');setFilterTT('Tất cả')}}
          style={{padding:'9px 20px',borderRadius:'8px 8px 0 0',border:'none',
            background:tab==='thu'?'#16A34A':'transparent',
            color:tab==='thu'?'white':'var(--text-secondary)',
            fontWeight:tab==='thu'?700:400,cursor:'pointer',fontSize:'13px'}}>
          💰 Khoản thu ({filteredThu.length})
        </button>
      </div>

      {/* Phân bổ theo loại */}
      {tab==='chi'&&theoLoai.length>0&&(
        <div className="card" style={{padding:'14px',marginBottom:'16px'}}>
          <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'10px'}}>PHÂN BỔ CHI PHÍ THEO LOẠI</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
            {theoLoai.map(([loai,tien])=>(
              <div key={loai} style={{background:'#F0F4FF',borderRadius:'8px',padding:'6px 12px',fontSize:'12px'}}>
                <span style={{marginRight:'4px'}}>{LOAI_ICONS[loai]||'💼'}</span>
                <span style={{fontWeight:600}}>{loai}</span>
                <span style={{marginLeft:'8px',color:'#DC2626',fontWeight:700}}>{fVND(tien)}đ</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab==='thu'&&theoLoaiThu.length>0&&(
        <div className="card" style={{padding:'14px',marginBottom:'16px'}}>
          <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'10px'}}>PHÂN BỔ KHOẢN THU THEO LOẠI</div>
          <div style={{display:'flex',flexWrap:'wrap',gap:'8px'}}>
            {theoLoaiThu.map(([loai,tien])=>(
              <div key={loai} style={{background:'#F0FDF4',borderRadius:'8px',padding:'6px 12px',fontSize:'12px'}}>
                <span style={{marginRight:'4px'}}>{LOAI_THU_ICONS[loai]||'💰'}</span>
                <span style={{fontWeight:600}}>{loai}</span>
                <span style={{marginLeft:'8px',color:'#16A34A',fontWeight:700}}>{fVND(tien)}đ</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bộ lọc */}
      <div className="card" style={{padding:'10px 14px',marginBottom:'12px'}}>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder={tab==='chi'?"🔍 Tìm nội dung, loại, người chi...":"🔍 Tìm nội dung, loại thu..."} value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'200px',maxWidth:'300px'}}/>
          {tab==='chi'&&<>
            <select className="input" value={filterLoai} onChange={e=>setFilterLoai(e.target.value)} style={{width:'180px'}}>
              <option value="Tất cả">Tất cả loại</option>
              {LOAI_CHI_PHI.map(l=><option key={l}>{l}</option>)}
            </select>
            <select className="input" value={filterTT} onChange={e=>setFilterTT(e.target.value)} style={{width:'160px'}}>
              <option value="Tất cả">Tất cả trạng thái</option>
              <option>Đã thanh toán</option>
              <option>Chưa thanh toán</option>
            </select>
          </>}
        </div>
      </div>

      {/* Bảng Chi */}
      {tab==='chi'&&(
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table className="cp-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã CP</th>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày</th>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Loại</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Nội dung</th>
                  <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Số tiền</th>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Hình thức</th>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Người chi</th>
                  <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                  {isOwner&&<th style={{textAlign:'center',fontWeight:700,width:'80px'}}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {danhSachTrang.length===0?(
                  <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có chi phí nào</td></tr>
                ):danhSachTrang.map((c,i)=>{
                  const daTT=c['Trạng thái']==='Đã thanh toán'
                  return (
                    <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td style={{fontSize:'11px',color:'#6B7280',whiteSpace:'nowrap'}}>{c['Mã chi phí']||'—'}</td>
                      <td style={{fontSize:'12px',whiteSpace:'nowrap'}}>{fDate(c['Ngày phát sinh'])}</td>
                      <td style={{whiteSpace:'nowrap'}}><span style={{fontSize:'12px',fontWeight:600}}>{LOAI_ICONS[c['Loại chi phí']]||'💼'} {c['Loại chi phí']||'—'}</span></td>
                      <td style={{fontSize:'12px',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c['Nội dung']||'—'}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'#DC2626',whiteSpace:'nowrap'}}>{fVND(c['Số tiền'])}đ</td>
                      <td style={{fontSize:'12px',whiteSpace:'nowrap'}}>{c['Hình thức thanh toán']==='Tiền mặt'?'💵':'🏦'} {c['Hình thức thanh toán']||'—'}</td>
                      <td style={{fontSize:'12px',color:'#6B7280',whiteSpace:'nowrap'}}>{c['Người chi']||'—'}</td>
                      <td style={{textAlign:'center'}}>
                        <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:daTT?'#D1FAE5':'#FEF3C7',color:daTT?'#065F46':'#92400E',whiteSpace:'nowrap'}}>
                          {daTT?'✅ Đã TT':'⏳ Chưa TT'}
                        </span>
                      </td>
                      {isOwner&&<td style={{textAlign:'center'}}>
                        <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                          <button onClick={()=>moSuaChi(c)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #BFDBFE',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600}}>✏️</button>
                          <button onClick={()=>setDeleteConfirm(c)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FECACA',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>
                        </div>
                      </td>}
                    </tr>
                  )
                })}
              </tbody>
              {filteredChi.length>0&&(
                <tfoot>
                  <tr style={{background:'#F0F4FF',borderTop:'2px solid var(--border)'}}>
                    <td colSpan={4} style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:'13px'}}>Tổng chi:</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,color:'#DC2626',fontSize:'15px',whiteSpace:'nowrap'}}>{fVND(tongChi)}đ</td>
                    <td colSpan={isOwner?4:3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Bảng Thu */}
      {tab==='thu'&&(
        <div className="card" style={{overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table className="cp-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#F0FDF4',borderBottom:'2px solid #BBF7D0'}}>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày</th>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Loại thu</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Nội dung</th>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã đơn hàng</th>
                  <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Số tiền</th>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Hình thức</th>
                  <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Người thu</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Ghi chú</th>
                  {isOwner&&<th style={{textAlign:'center',fontWeight:700,width:'80px'}}>Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {danhSachTrang.length===0?(
                  <tr><td colSpan={9} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có khoản thu nào</td></tr>
                ):danhSachTrang.map((c,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#F0FDF4'}}>
                    <td style={{fontSize:'12px',whiteSpace:'nowrap'}}>{fDate(c['Ngày phát sinh'])}</td>
                    <td style={{whiteSpace:'nowrap'}}><span style={{fontSize:'12px',fontWeight:600}}>{LOAI_THU_ICONS[c['Loại thu']]||'💰'} {c['Loại thu']||'—'}</span></td>
                    <td style={{fontSize:'12px',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c['Nội dung']||'—'}</td>
                    <td style={{fontSize:'12px',color:'var(--primary)',fontWeight:600}}>{c['Mã đơn hàng']||'—'}</td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#16A34A',whiteSpace:'nowrap'}}>{fVND(c['Số tiền'])}đ</td>
                    <td style={{fontSize:'12px',whiteSpace:'nowrap'}}>{c['Hình thức thanh toán']==='Tiền mặt'?'💵':'🏦'} {c['Hình thức thanh toán']||'—'}</td>
                    <td style={{fontSize:'12px',color:'#6B7280',whiteSpace:'nowrap'}}>{c['Người chi']||'—'}</td>
                    <td style={{fontSize:'12px',color:'#6B7280',maxWidth:'150px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c['Ghi chú']||'—'}</td>
                    {isOwner&&<td style={{textAlign:'center'}}>
                      <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                        <button onClick={()=>moSuaThu(c)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #BFDBFE',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600}}>✏️</button>
                        <button onClick={()=>setDeleteConfirm(c)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FECACA',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>
                      </div>
                    </td>}
                  </tr>
                ))}
              </tbody>
              {filteredThu.length>0&&(
                <tfoot>
                  <tr style={{background:'#F0FDF4',borderTop:'2px solid #BBF7D0'}}>
                    <td colSpan={4} style={{padding:'8px 10px',textAlign:'right',fontWeight:700,fontSize:'13px'}}>Tổng thu:</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,color:'#16A34A',fontSize:'15px',whiteSpace:'nowrap'}}>{fVND(tongThu)}đ</td>
                    <td colSpan={isOwner?4:3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Phân trang */}
      {tongTrang>1&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px',marginTop:'8px'}}>
        <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{(trangHT-1)*SO_DONG+1}–{Math.min(trangHT*SO_DONG,filtered.length)} / {filtered.length} khoản</span>
        <div style={{display:'flex',gap:'4px'}}>
          <button disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangHT===1?'#F9FAFB':'white',color:trangHT===1?'#CCC':'var(--text-secondary)',cursor:trangHT===1?'not-allowed':'pointer',fontSize:'13px'}}>‹</button>
          {Array.from({length:tongTrang},(_,i)=>i+1).map(p=><button key={p} onClick={()=>setTrang(p)} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:p===trangHT?'var(--primary)':'var(--border)',background:p===trangHT?'var(--primary)':'white',color:p===trangHT?'white':'var(--text-secondary)',cursor:'pointer',fontSize:'13px',fontWeight:p===trangHT?700:400}}>{p}</button>)}
          <button disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:trangHT===tongTrang?'#F9FAFB':'white',color:trangHT===tongTrang?'#CCC':'var(--text-secondary)',cursor:trangHT===tongTrang?'not-allowed':'pointer',fontSize:'13px'}}>›</button>
        </div>
      </div>}

      {/* Modal thêm/sửa Chi */}
      {showForm&&tab==='chi'&&(
        <div className="ov" onClick={()=>{setShowForm(false);setEditItem(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'28px',width:'100%',maxWidth:'640px',maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>{editItem?'✏️ Sửa chi phí':'➕ Thêm chi phí mới'}</h2>
              <button onClick={()=>{setShowForm(false);setEditItem(null)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>📅 Ngày phát sinh *</label>
                <input className="input" type="date" value={formChi.ngayPhatSinh} onChange={e=>updChi('ngayPhatSinh',e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>💼 Loại chi phí *</label>
                <select className="input" value={formChi.loaiChiPhi} onChange={e=>updChi('loaiChiPhi',e.target.value)}>
                  <option value="">-- Chọn loại --</option>
                  {LOAI_CHI_PHI.map(l=><option key={l}>{LOAI_ICONS[l]} {l}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>📝 Nội dung</label>
              <input className="input" placeholder="Mô tả chi tiết khoản chi..." value={formChi.noiDung} onChange={e=>updChi('noiDung',e.target.value)} style={{fontSize:'14px',padding:'10px 12px'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>💰 Số tiền *</label>
                <input className="input" type="text" inputMode="numeric" placeholder="0"
                  value={formChi.soTien?Number(String(formChi.soTien).replace(/[^0-9]/g,'')).toLocaleString('vi-VN'):''}
                  onChange={e=>updChi('soTien',e.target.value.replace(/[^0-9]/g,''))}
                  style={{fontSize:'14px',padding:'10px 12px',fontWeight:700,color:'#DC2626'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>👤 Người chi</label>
                <div style={{position:'relative'}}>
                  <input className="input" placeholder="Tìm tên nhân viên..." value={nvSearch}
                    onChange={e=>{setNVSearch(e.target.value);updChi('nguoiChi',e.target.value);setShowNVSearch(true)}}
                    onFocus={()=>setShowNVSearch(true)} onBlur={()=>setTimeout(()=>setShowNVSearch(false),200)} style={{fontSize:'13px'}}/>
                  {showNVSearch&&(
                    <div className="nv-db">
                      {nvLoc.map((nv:any)=>(
                        <div key={nv['Mã nhân viên']} className="nv-di"
                          onMouseDown={e=>{e.preventDefault();const ten=nv['Họ và Tên']||'';updChi('nguoiChi',ten);setNVSearch(ten);setShowNVSearch(false)}}>
                          <span style={{fontWeight:600}}>{nv['Họ và Tên']}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>Hình thức</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {['Tiền mặt','Chuyển khoản'].map(ht=>(
                    <button key={ht} onClick={()=>updChi('hinhThuc',ht)}
                      style={{flex:1,padding:'9px',borderRadius:'8px',border:'2px solid',borderColor:formChi.hinhThuc===ht?'var(--primary)':'var(--border)',background:formChi.hinhThuc===ht?'var(--primary-pale)':'white',color:formChi.hinhThuc===ht?'var(--primary)':'var(--text-secondary)',fontWeight:formChi.hinhThuc===ht?700:400,fontSize:'13px',cursor:'pointer'}}>
                      {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>Trạng thái</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {['Đã thanh toán','Chưa thanh toán'].map(tt=>(
                    <button key={tt} onClick={()=>updChi('trangThai',tt)}
                      style={{flex:1,padding:'9px',borderRadius:'8px',border:'2px solid',borderColor:formChi.trangThai===tt?(tt==='Đã thanh toán'?'#16A34A':'#D97706'):'var(--border)',background:formChi.trangThai===tt?(tt==='Đã thanh toán'?'#F0FDF4':'#FFFBEB'):'white',color:formChi.trangThai===tt?(tt==='Đã thanh toán'?'#16A34A':'#D97706'):'var(--text-secondary)',fontWeight:formChi.trangThai===tt?700:400,fontSize:'12px',cursor:'pointer'}}>
                      {tt==='Đã thanh toán'?'✅ Đã TT':'⏳ Chưa TT'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>Ghi chú</label>
              <input className="input" placeholder="Ghi chú thêm..." value={formChi.ghiChu} onChange={e=>updChi('ghiChu',e.target.value)}/>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={luuChiPhi} disabled={loading}
                style={{flex:1,padding:'13px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'15px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':`✅ ${editItem?'Cập nhật':'Thêm chi phí'}`}
              </button>
              <button onClick={()=>{setShowForm(false);setEditItem(null)}} style={{padding:'13px 20px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal thêm/sửa Thu */}
      {showForm&&tab==='thu'&&(
        <div className="ov" onClick={()=>{setShowForm(false);setEditItem(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'28px',width:'100%',maxWidth:'560px',maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>{editItem?'✏️ Sửa khoản thu':'💰 Thêm khoản thu mới'}</h2>
              <button onClick={()=>{setShowForm(false);setEditItem(null)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>📅 Ngày phát sinh *</label>
                <input className="input" type="date" value={formThu.ngayPhatSinh} onChange={e=>updThu('ngayPhatSinh',e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>💰 Loại thu *</label>
                <select className="input" value={formThu.loaiThu} onChange={e=>updThu('loaiThu',e.target.value)}>
                  <option value="">-- Chọn loại --</option>
                  {LOAI_THU.map(l=><option key={l}>{LOAI_THU_ICONS[l]} {l}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>📝 Nội dung</label>
              <input className="input" placeholder="Mô tả khoản thu..." value={formThu.noiDung} onChange={e=>updThu('noiDung',e.target.value)} style={{fontSize:'14px',padding:'10px 12px'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'14px',marginBottom:'14px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>💰 Số tiền *</label>
                <input className="input" type="text" inputMode="numeric" placeholder="0"
                  value={formThu.soTien?Number(String(formThu.soTien).replace(/[^0-9]/g,'')).toLocaleString('vi-VN'):''}
                  onChange={e=>updThu('soTien',e.target.value.replace(/[^0-9]/g,''))}
                  style={{fontSize:'14px',padding:'10px 12px',fontWeight:700,color:'#16A34A'}}/>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>📋 Mã đơn hàng (nếu có)</label>
                <input className="input" placeholder="VD: DH-2026-001" value={formThu.maDonHang} onChange={e=>updThu('maDonHang',e.target.value)}/>
              </div>
            </div>
            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>Hình thức thu</label>
              <div style={{display:'flex',gap:'8px'}}>
                {['Tiền mặt','Chuyển khoản'].map(ht=>(
                  <button key={ht} onClick={()=>updThu('hinhThuc',ht)}
                    style={{flex:1,padding:'9px',borderRadius:'8px',border:'2px solid',borderColor:formThu.hinhThuc===ht?'#16A34A':'var(--border)',background:formThu.hinhThuc===ht?'#F0FDF4':'white',color:formThu.hinhThuc===ht?'#16A34A':'var(--text-secondary)',fontWeight:formThu.hinhThuc===ht?700:400,fontSize:'13px',cursor:'pointer'}}>
                    {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                  </button>
                ))}
              </div>
            </div>
            <div style={{marginBottom:'14px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>👤 Người thu</label>
              <div style={{position:'relative'}}>
                <input className="input" placeholder="Tìm tên nhân viên..." value={formThu.nguoiThu}
                  onChange={e=>{updThu('nguoiThu',e.target.value);setShowNVSearch(true)}}
                  onFocus={()=>setShowNVSearch(true)}
                  onBlur={()=>setTimeout(()=>setShowNVSearch(false),200)}
                  style={{fontSize:'13px'}}/>
                {showNVSearch&&(
                  <div className="nv-db">
                    {(formThu.nguoiThu.trim()
                      ?nvList.filter((n:any)=>n['Loại']==='Nhân viên'&&boDau(n['Họ và Tên']||'').includes(boDau(formThu.nguoiThu)))
                      :nvList.filter((n:any)=>n['Loại']==='Nhân viên')
                    ).slice(0,10).map((nv:any)=>(
                      <div key={nv['Mã nhân viên']} className="nv-di"
                        onMouseDown={e=>{e.preventDefault();updThu('nguoiThu',nv['Họ và Tên']||'');setShowNVSearch(false)}}>
                        <span style={{fontWeight:600}}>{nv['Họ và Tên']}</span>
                        <span style={{marginLeft:'8px',fontSize:'11px',padding:'1px 6px',borderRadius:'10px',
                          background:'#DBEAFE',color:'#1E40AF',fontWeight:700}}>{nv['Mã nhân viên']}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div style={{marginBottom:'20px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'5px'}}>Ghi chú</label>
              <input className="input" placeholder="Ghi chú thêm..." value={formThu.ghiChu} onChange={e=>updThu('ghiChu',e.target.value)}/>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={luuThu} disabled={loading}
                style={{flex:1,padding:'13px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,fontSize:'15px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':`✅ ${editItem?'Cập nhật':'Thêm khoản thu'}`}
              </button>
              <button onClick={()=>{setShowForm(false);setEditItem(null)}} style={{padding:'13px 20px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* Popup xác nhận xóa */}
      {deleteConfirm&&(
        <div className="ov" onClick={()=>setDeleteConfirm(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'380px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'40px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 8px'}}>Xác nhận xóa</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 4px'}}>{deleteConfirm['Loại chi phí']||deleteConfirm['Loại thu']||'—'} — {deleteConfirm['Nội dung']||'—'}</p>
            <p style={{fontSize:'14px',fontWeight:700,color:tab==='thu'?'#16A34A':'#DC2626',margin:'0 0 20px'}}>{fVND(deleteConfirm['Số tiền'])}đ</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>xoaItem(deleteConfirm)} disabled={loading}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'#DC2626',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>
                {loading?'⏳...':'🗑️ Xóa'}
              </button>
              <button onClick={()=>setDeleteConfirm(null)}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
