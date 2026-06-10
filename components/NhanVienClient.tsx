'use client'
// components/NhanVienClient.tsx — v2.0
// Thêm tab "💵 Thu hộ KH" — thống kê tiền thu hộ và xác nhận nộp
import { useState, useMemo } from 'react'
import { UserSession } from '@/lib/auth'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){if(!s)return'—';try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}catch{return s}}
function fDateShort(s:string){if(!s)return'—';try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`}catch{return s}}
function rutGonMa(ma:string){if(!ma||ma.length<=8)return ma;return ma.slice(0,2)+'...'+ma.slice(-4)}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
function thangHienTai(){const d=new Date();return `${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}

const VAI_TRO = ['Bán hàng','Kỹ thuật','Giao hàng','Quản lý','Kế toán','Khác']
const HINH_THUC = ['Chuyển khoản','Tiền mặt']
const SO_DONG = 10

export default function NhanVienClient({nvList,doiSoatList,donHangList,donHangMap={},giaoHangMap={},chiTietGiaoMap={},user}:{
  nvList:any[]; doiSoatList:any[]; donHangList:any[]
  donHangMap:Record<string,any>; giaoHangMap:Record<string,any>; chiTietGiaoMap:Record<string,any[]>
  user:UserSession
}) {
  const isOwner = user.vaiTro === 'Chủ cửa hàng'
  const [localNV,      setLocalNV]      = useState(nvList)
  const [localDS,      setLocalDS]      = useState(doiSoatList) // local state cho đối soát để cập nhật nộp tiền
  const [view,         setView]         = useState<'list'|'detail'>('list')
  const [nvChon,       setNvChon]       = useState<any>(null)
  const [tabDetail,    setTabDetail]    = useState<'thongtin'|'chamcong'|'tamung'|'chuyengiao'|'thuongkhac'|'thuhokh'>('thongtin')
  const [search,       setSearch]       = useState('')
  const [filterLoai,   setFilterLoai]   = useState('Tất cả')
  const [filterTT,     setFilterTT]     = useState('Đang làm')
  const [trang,        setTrang]        = useState(1)
  const [msg,          setMsg]          = useState('')
  const [msgOk,        setMsgOk]        = useState(true)
  const [loading,      setLoading]      = useState(false)
  const [showModal,    setShowModal]    = useState(false)
  const [xoaNV,        setXoaNV]        = useState<any>(null)   // NV đang chờ xóa
  const [xoaCheck,     setXoaCheck]     = useState<any>(null)   // kết quả kiểm tra
  const [loadingXoa,   setLoadingXoa]   = useState(false)
  const [editNV,       setEditNV]       = useState<any>(null)
  const [thangChon,    setThangChon]    = useState(thangHienTai())
  // Bộ lọc từ ngày - đến ngày cho chi tiết NV
  const [tuNgayXem,    setTuNgayXem]    = useState(()=>{const n=new Date();return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`})
  const [denNgayXem,   setDenNgayXem]   = useState(()=>new Date().toISOString().split('T')[0])

  // Data load lazy
  const [chamCongList, setChamCongList] = useState<any[]>([])
  const [tamUngList,   setTamUngList]   = useState<any[]>([])
  const [tkList,       setTkList]       = useState<any[]>([])
  const [loadingData,  setLoadingData]  = useState(false)

  // Form NV
  const [hoTen,         setHoTen]         = useState('')
  const [maNV,          setMaNV]          = useState('')
  const [sdt,           setSdt]           = useState('')
  const [loaiNV,        setLoaiNV]        = useState('Nhân viên')
  const [vaiTro,        setVaiTro]        = useState('Bán hàng')
  const [luong,         setLuong]         = useState(0)
  const [pcthuong,      setPcthuong]      = useState(0)
  const [stk,           setStk]           = useState('')
  const [nganhang,      setNganhang]      = useState('')
  const [hinhthuc,      setHinhthuc]      = useState('Chuyển khoản')
  const [ghiChuNV,      setGhiChuNV]      = useState('')
  const [hinhthucluong, setHinhthucluong] = useState('Theo ngày')
  const [ngayphep,      setNgayphep]      = useState(0)
  const [trangThaiNV,   setTrangThaiNV]   = useState('Đang làm')

  // Form chấm công
  const [showCCModal, setShowCCModal] = useState(false)
  const [ccThang,     setCcThang]     = useState(thangHienTai())
  const [ccChuẩn,     setCcChuẩn]     = useState(26)
  const [ccThucTe,    setCcThucTe]    = useState(26)
  const [ccGhiChu,    setCcGhiChu]    = useState('')
  const [editCC,      setEditCC]      = useState<any>(null)

  // Form tạm ứng
  const [showTUModal, setShowTUModal] = useState(false)
  const [tuThang,     setTuThang]     = useState(thangHienTai())
  const [tuNgay,      setTuNgay]      = useState(new Date().toISOString().split('T')[0])
  const [tuSoTien,    setTuSoTien]    = useState(0)
  const [tuGhiChu,    setTuGhiChu]    = useState('')

  // Form thưởng khác
  const [showTKModal, setShowTKModal] = useState(false)
  const [tkThang,     setTkThang]     = useState(thangHienTai())
  const [tkNgay,      setTkNgay]      = useState(new Date().toISOString().split('T')[0])
  const [tkSoTien,    setTkSoTien]    = useState(0)
  const [tkLoai,      setTkLoai]      = useState('Thưởng nóng')
  const [tkLyDo,      setTkLyDo]      = useState('')

  // Xác nhận nộp tiền thu hộ
  const [xacNhanNopItem, setXacNhanNopItem] = useState<any>(null)
  const [loadingNop,     setLoadingNop]     = useState(false)
  // Popup chi tiết đối soát (dùng trong tab chuyến giao)
  const [popupChiTiet,   setPopupChiTiet]   = useState<any>(null)
  // Phân trang tab chuyến giao + thu hộ
  const [trangCG,        setTrangCG]        = useState(1)
  const [trangTH2,       setTrangTH2]       = useState(1)
  const SO_DONG_TAB = 10

  function showMsg2(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  // Tính thưởng DS theo NV + tháng
  const thuongDSTheoNVThang = useMemo(()=>{
    const m:Record<string,Record<string,{soDon:number,tongDS:number}>> = {}
    donHangList.forEach((dh:any)=>{
      const ma = dh['Mã NV']||''
      if(!ma||dh['Trạng thái']!=='Hoàn thành') return
      const d = new Date(dh['Ngày bán']||'')
      if(isNaN(d.getTime())) return
      const thang = String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()
      if(!m[ma]) m[ma]={}
      if(!m[ma][thang]) m[ma][thang]={soDon:0,tongDS:0}
      m[ma][thang].soDon++
      m[ma][thang].tongDS += Number(dh['Tổng tiền đơn']||0)
    })
    return m
  },[donHangList])

  // Tính CP chuyến từ đối soát theo NV (tất cả)
  const doiSoatTheoNV = useMemo(()=>{
    const m:Record<string,{soChuyến:number,tongCP:number}> = {}
    localDS.forEach((ds:any)=>{
      const ma = ds['Mã NV/Đối tác']||''
      if(!ma) return
      if(!m[ma]) m[ma]={soChuyến:0,tongCP:0}
      if(ds['Kết quả']==='Thành công'||ds['Tình trạng đối soát']==='Đã đối soát'){
        m[ma].soChuyến++
        m[ma].tongCP += Number(ds['Chi phí VC']||0)+Number(ds['Chi phí lắp đặt']||0)+Number(ds['Thưởng chuyến']||0)
      }
    })
    return m
  },[localDS])

  // Filter danh sách
  const filtered = useMemo(()=>{
    let r = localNV
    if(filterLoai!=='Tất cả') r=r.filter((n:any)=>n['Loại']===filterLoai)
    if(filterTT!=='Tất cả') r=r.filter((n:any)=>n['Trạng thái']===filterTT)
    if(search.trim()){const q=boDau(search);r=r.filter((n:any)=>boDau(n['Họ và Tên']||'').includes(q)||boDau(n['Mã nhân viên']||'').includes(q)||boDau(n['Vai trò']||'').includes(q))}
    return r
  },[localNV,filterLoai,filterTT,search])

  const tongTrang=Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT=Math.min(trang,tongTrang)
  const dsTrang=filtered.slice((trangHT-1)*SO_DONG,trangHT*SO_DONG)

  const tongNV = localNV.filter((n:any)=>n['Loại']==='Nhân viên'&&n['Trạng thái']==='Đang làm').length
  const tongDT = localNV.filter((n:any)=>n['Loại']==='Đối tác'&&n['Trạng thái']==='Đang làm').length

  async function loadChiTietNV(nv:any){
    setLoadingData(true)
    try{
      const [cc,tu,tk] = await Promise.all([
        fetch(`/api/nhan-vien?loai=cham-cong&maNV=${nv['Mã nhân viên']}`).then(r=>r.json()),
        fetch(`/api/nhan-vien?loai=tam-ung&maNV=${nv['Mã nhân viên']}`).then(r=>r.json()),
        fetch(`/api/nhan-vien?loai=thuong-khac&maNV=${nv['Mã nhân viên']}`).then(r=>r.json()),
      ])
      setChamCongList(cc.list||[])
      setTamUngList(tu.list||[])
      setTkList(tk.list||[])
    }catch(e){showMsg2('❌ Lỗi tải dữ liệu',false)}
    finally{setLoadingData(false)}
  }

  function moChiTiet(nv:any){setNvChon(nv);setView('detail');setTabDetail('thongtin');loadChiTietNV(nv)}

  function resetForm(){
    setHoTen('');setMaNV('');setSdt('');setLoaiNV('Nhân viên');setVaiTro('Bán hàng')
    setLuong(0);setPcthuong(0);setStk('');setNganhang('');setHinhthuc('Chuyển khoản')
    setGhiChuNV('');setTrangThaiNV('Đang làm');setHinhthucluong('Theo ngày');setNgayphep(0);setEditNV(null)
  }

  async function moXoa(nv:any){
    setXoaNV(nv)
    setXoaCheck(null)
    setLoadingXoa(true)
    try{
      const res=await fetch('/api/nhan-vien?loai=kiem-tra-xoa&maNV='+encodeURIComponent(nv['Mã nhân viên']))
      const d=await res.json()
      setXoaCheck(d)
    }catch(e){setXoaCheck({coTheXoa:false,lyDo:['Lỗi kiểm tra']})}
    finally{setLoadingXoa(false)}
  }

  async function xacNhanXoa(){
    if(!xoaNV||!xoaCheck?.coTheXoa) return
    setLoadingXoa(true)
    try{
      const res=await fetch('/api/nhan-vien?id='+Number(xoaNV['Id']||xoaNV['id'])+'&loai=nv&maNV='+encodeURIComponent(xoaNV['Mã nhân viên']),{method:'DELETE'})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message||'Lỗi')
      setLocalNV((p:any[])=>p.filter(n=>(n['Id']||n['id'])!==(xoaNV['Id']||xoaNV['id'])))
      showMsg2('✅ Đã xóa: '+xoaNV['Họ và Tên'])
      setXoaNV(null);setXoaCheck(null)
      if(view==='detail'&&nvChon&&(nvChon['Id']||nvChon['id'])===(xoaNV['Id']||xoaNV['id'])){
        setView('list');setNvChon(null)
      }
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoadingXoa(false)}
  }

  function moSua(nv:any){
    setEditNV(nv);setHoTen(nv['Họ và Tên']||'');setMaNV(nv['Mã nhân viên']||'')
    setSdt(nv['Số điện thoại']||'');setLoaiNV(nv['Loại']||'Nhân viên');setVaiTro(nv['Vai trò']||'Bán hàng')
    setLuong(Number(nv['Lương cơ bản']||0));setPcthuong(Number(nv['% Thưởng DS']||0))
    setStk(nv['Số TK ngân hàng']||'');setNganhang(nv['Ngân hàng']||'')
    setHinhthuc(nv['Hình thức TT']||'Chuyển khoản');setGhiChuNV(nv['Ghi chú']||'')
    setTrangThaiNV(nv['Trạng thái']||'Đang làm')
    setHinhthucluong(nv['Hình thức lương']||'Theo ngày')
    setNgayphep(Number(nv['Ngày phép/tháng']||0))
    setShowModal(true)
  }

  async function luuNV(){
    if(!hoTen.trim()){showMsg2('Nhập họ tên',false);return}
    if(sdt.trim()&&(sdt.trim().length!==10||!sdt.trim().startsWith('0'))){
      showMsg2('Số điện thoại phải bắt đầu bằng số 0 và đủ 10 số',false);return
    }
    setLoading(true)
    try{
      const data={'Họ và Tên':hoTen.trim(),'Số điện thoại':sdt,'Loại':loaiNV,'Vai trò':vaiTro,
        'Lương cơ bản':luong,'% Thưởng DS':pcthuong,'Số TK ngân hàng':stk,
        'Ngân hàng':nganhang,'Hình thức TT':hinhthuc,'Ghi chú':ghiChuNV,
        'Trạng thái':trangThaiNV,'Hình thức lương':hinhthucluong,'Ngày phép/tháng':ngayphep}
      if(editNV){
        const res=await fetch('/api/nhan-vien',{method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id:Number(editNV['Id']||editNV['id']),...data})})
        if(!res.ok) throw new Error((await res.json()).message)
        setLocalNV((p:any[])=>p.map(n=>(n['Id']||n['id'])===(editNV['Id']||editNV['id'])?{...n,...data}:n))
        if(nvChon&&(nvChon['Id']||nvChon['id'])===(editNV['Id']||editNV['id'])) setNvChon((p:any)=>({...p,...data}))
        showMsg2('✅ Đã cập nhật')
      }else{
        const res=await fetch('/api/nhan-vien',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({'Mã nhân viên':maNV.trim()||undefined,...data})})
        const d=await res.json()
        if(!res.ok) throw new Error(d.message)
        setLocalNV((p:any[])=>[{...d.data,'Mã nhân viên':d.maNV,...data,'Trạng thái':'Đang làm','Id':d.data?.Id||Date.now()},...p])
        setTrang(1)
        showMsg2('✅ Đã thêm: '+hoTen)
      }
      setShowModal(false);resetForm()
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function luuChamCong(){
    if(!nvChon) return
    setLoading(true)
    try{
      const ngayNghi=ccChuẩn-ccThucTe
      if(editCC){
        const res=await fetch('/api/nhan-vien',{method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id:Number(editCC['Id']||editCC['id']),loai:'cham-cong',
            'Số ngày công thực tế':ccThucTe,'Số ngày nghỉ':ngayNghi,'Tổng ngày công chuẩn':ccChuẩn,'Ghi chú':ccGhiChu})})
        if(!res.ok) throw new Error((await res.json()).message)
        setChamCongList((p:any[])=>p.map(cc=>(cc['Id']||cc['id'])===(editCC['Id']||editCC['id'])
          ?{...cc,'Số ngày công thực tế':ccThucTe,'Số ngày nghỉ':ngayNghi,'Tổng ngày công chuẩn':ccChuẩn,'Ghi chú':ccGhiChu}:cc))
        showMsg2('✅ Đã cập nhật chấm công')
      }else{
        const res=await fetch('/api/nhan-vien',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({loai:'cham-cong',thang:ccThang,maNV:nvChon['Mã nhân viên'],
            tenNV:nvChon['Họ và Tên'],tongNgayChuẩn:ccChuẩn,ngayCongThucTe:ccThucTe,ngayNghi,ghiChu:ccGhiChu})})
        const d=await res.json()
        if(!res.ok) throw new Error(d.message)
        setChamCongList((p:any[])=>[{...d.data,'Mã chấm công':d.maChamCong,'Tháng':ccThang,
          'Mã nhân viên':nvChon['Mã nhân viên'],'Tổng ngày công chuẩn':ccChuẩn,
          'Số ngày công thực tế':ccThucTe,'Số ngày nghỉ':ngayNghi,'Ghi chú':ccGhiChu},...p])
        showMsg2('✅ Đã thêm chấm công tháng '+ccThang)
      }
      setShowCCModal(false);setEditCC(null);setCcGhiChu('')
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function xoaChamCong(cc:any){
    if(!confirm('Xóa chấm công tháng '+cc['Tháng']+'?')) return
    try{
      const res=await fetch(`/api/nhan-vien?id=${cc['Id']||cc['id']}&loai=cham-cong`,{method:'DELETE'})
      if(!res.ok) throw new Error((await res.json()).message)
      setChamCongList((p:any[])=>p.filter(c=>(c['Id']||c['id'])!==(cc['Id']||cc['id'])))
      showMsg2('✅ Đã xóa chấm công')
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  async function luuTamUng(){
    if(!nvChon||tuSoTien<=0){showMsg2('Nhập số tiền > 0',false);return}
    setLoading(true)
    try{
      const res=await fetch('/api/nhan-vien',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({loai:'tam-ung',thang:tuThang,maNV:nvChon['Mã nhân viên'],
          tenNV:nvChon['Họ và Tên'],ngayTamUng:tuNgay,soTien:tuSoTien,ghiChu:tuGhiChu})})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message)
      setTamUngList((p:any[])=>[{...d.data,'Mã tạm ứng':d.maTU,'Tháng':tuThang,
        'Mã NV/đối tác':nvChon['Mã nhân viên'],'Ngày tạm ứng':tuNgay,'Số tiền':tuSoTien,'Ghi chú':tuGhiChu},...p])
      showMsg2('✅ Đã ghi tạm ứng '+fVND(tuSoTien)+'đ')
      setShowTUModal(false);setTuSoTien(0);setTuGhiChu('')
      setTuNgay(new Date().toISOString().split('T')[0])
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function xoaTamUng(tu:any){
    if(!confirm('Xóa tạm ứng '+fVND(tu['Số tiền'])+'đ?')) return
    try{
      const res=await fetch(`/api/nhan-vien?id=${tu['Id']||tu['id']}&loai=tam-ung`,{method:'DELETE'})
      if(!res.ok) throw new Error((await res.json()).message)
      setTamUngList((p:any[])=>p.filter(t=>(t['Id']||t['id'])!==(tu['Id']||tu['id'])))
      showMsg2('✅ Đã xóa tạm ứng')
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  // ── Xác nhận nộp tiền thu hộ ──
  async function xacNhanNopTien(item:any){
    setLoadingNop(true)
    try{
      const ngayNop = new Date().toISOString().split('T')[0]
      const res = await fetch('/api/doi-soat', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          id: Number(item['Id']||item['id']),
          'Tình trạng nộp tiền': 'Đã nộp',
          'Ngày nộp tiền': ngayNop,
        }),
      })
      if(!res.ok) throw new Error((await res.json()).message||'Lỗi')
      // Cập nhật local state
      setLocalDS((p:any[])=>p.map(d=>(d['Id']||d['id'])===(item['Id']||item['id'])
        ?{...d,'Tình trạng nộp tiền':'Đã nộp','Ngày nộp tiền':ngayNop}:d))
      showMsg2(`✅ Đã xác nhận nộp ${fVND(item['Đã thu được'])}đ`)
      setXacNhanNopItem(null)
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoadingNop(false)}
  }

  // Tính thu nhập tháng
  const ccThangChon = useMemo(()=>chamCongList.find(cc=>cc['Tháng']===thangChon),[chamCongList,thangChon])
  const tuThangChon = useMemo(()=>tamUngList.filter(tu=>tu['Tháng']===thangChon),[tamUngList,thangChon])
  const tongTamUng  = useMemo(()=>tuThangChon.reduce((s:number,tu:any)=>s+Number(tu['Số tiền']||0),0),[tuThangChon])

  const doiSoatNVThang = useMemo(()=>{
    if(!nvChon) return {soChuyến:0,tongCP:0}
    return localDS.filter((ds:any)=>{
      if(ds['Mã NV/Đối tác']!==nvChon['Mã nhân viên']) return false
      if(!ds['Ngày đối soát']) return false
      const ngay = ds['Ngày đối soát'].split('T')[0]
      return ngay>=tuNgayXem && ngay<=denNgayXem
    }).reduce((acc:any,ds:any)=>{
      if(ds['Kết quả']==='Thành công'||ds['Tình trạng đối soát']==='Đã đối soát'){
        acc.soChuyến++
        acc.tongCP+=Number(ds['Chi phí VC']||0)+Number(ds['Chi phí lắp đặt']||0)+Number(ds['Thưởng chuyến']||0)
      }
      return acc
    },{soChuyến:0,tongCP:0})
  },[localDS,nvChon,tuNgayXem,denNgayXem])

  // Danh sách chuyến có thu hộ của NV đang xem
  const dsThuHo = useMemo(()=>{
    if(!nvChon) return []
    return localDS.filter((ds:any)=>
      ds['Mã NV/Đối tác']===nvChon['Mã nhân viên'] &&
      Number(ds['Đã thu được']||0) > 0
    ).sort((a:any,b:any)=>((b['Ngày đối soát']||'') > (a['Ngày đối soát']||''))?1:-1)
  },[localDS,nvChon])

  const tongChuaNop = useMemo(()=>dsThuHo.filter((d:any)=>d['Tình trạng nộp tiền']!=='Đã nộp').reduce((s:number,d:any)=>s+Number(d['Đã thu được']||0),0),[dsThuHo])
  const tongDaNop   = useMemo(()=>dsThuHo.filter((d:any)=>d['Tình trạng nộp tiền']==='Đã nộp').reduce((s:number,d:any)=>s+Number(d['Đã thu được']||0),0),[dsThuHo])

  const thuNhapThang = useMemo(()=>{
    if(!nvChon) return {luongTN:0,thuongDS:0,cpChuyen:0,tamUng:0,tongChiTra:0,tongTK:0,
      hinhThucLuong:'Theo ngày',ngayPhep:0,ngayNghi:0,ngayChuẩn:26,ngayThucTe:0,pctDS:0,soDonDS:0,tongDSthang:0}
    const luongCB=Number(nvChon['Lương cơ bản']||0)
    const hinhThucLuong=nvChon['Hình thức lương']||'Theo ngày'
    const ngayPhep=Number(nvChon['Ngày phép/tháng']||0)
    const ngayChuẩn=Number(ccThangChon?.['Tổng ngày công chuẩn']||26)
    const ngayThucTe=Number(ccThangChon?.['Số ngày công thực tế']||0)
    const ngayNghi=ngayChuẩn-ngayThucTe
    let luongTN=0
    if(hinhThucLuong==='Theo ngày'){
      luongTN=Math.round(luongCB*ngayThucTe)
    }else{
      const ngayVuotPhep=Math.max(0,ngayNghi-ngayPhep)
      const luong1Ngay=ngayChuẩn>0?luongCB/ngayChuẩn:0
      luongTN=Math.round(luongCB-ngayVuotPhep*luong1Ngay)
    }
    const cpChuyen=doiSoatNVThang.tongCP
    const dsThang=thuongDSTheoNVThang[nvChon['Mã nhân viên']]?.[thangChon]
    const pct=Number(nvChon['% Thưởng DS']||0)
    const thuongDS=Math.round((dsThang?.tongDS||0)*pct/100)
    const tongTK=tkList.filter((tk:any)=>tk['Tháng']===thangChon).reduce((s:number,tk:any)=>s+Number(tk['Số tiền']||0),0)
    const tongChiTra=luongTN+thuongDS+cpChuyen+tongTK-tongTamUng
    return {luongTN,thuongDS,cpChuyen,tamUng:tongTamUng,tongChiTra,
      tongTK,hinhThucLuong,ngayPhep,ngayNghi,ngayChuẩn,ngayThucTe,
      pctDS:pct,soDonDS:dsThang?.soDon||0,tongDSthang:dsThang?.tongDS||0}
  },[nvChon,ccThangChon,doiSoatNVThang,tongTamUng,tkList,thangChon,thuongDSTheoNVThang,tuNgayXem,denNgayXem])

  const labelLuong = nvChon?.['Hình thức lương']==='Theo ngày'?'Lương theo ngày':'Lương cơ bản/tháng'

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .nv-t th,.nv-t td{padding:8px 10px;vertical-align:middle;}
        .nv-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:560px;max-height:92vh;overflow-y:auto;}
        label.lbl{display:block;font-size:11px;font-weight:600;margin-bottom:3px;}
      `}</style>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'12px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B',position:'sticky',top:'10px',zIndex:10}}>{msg}</div>}

      {/* ══ DANH SÁCH ══ */}
      {view==='list'&&(<>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
          <div>
            <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>👤 Nhân viên & Đối tác</h1>
            <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>{tongNV} nhân viên · {tongDT} đối tác đang hoạt động</p>
          </div>
          <button onClick={()=>{resetForm();setShowModal(true)}}
            style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            + Thêm nhân viên
          </button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'14px'}}>
          {[
            {icon:'👔',label:'Nhân viên',val:tongNV+' người',c:'var(--primary)'},
            {icon:'🤝',label:'Đối tác',val:tongDT+' người',c:'#7C3AED'},
            {icon:'💰',label:'Tổng CP chuyến',val:fVND(Object.values(doiSoatTheoNV).reduce((s,v)=>s+v.tongCP,0))+'đ',c:'#16A34A'},
            {icon:'📦',label:'Tổng chuyến',val:Object.values(doiSoatTheoNV).reduce((s,v)=>s+v.soChuyến,0)+' chuyến',c:'#D97706'},
          ].map(({icon,label,val,c})=>(
            <div key={label} className="card" style={{padding:'12px 14px'}}>
              <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
              <div style={{fontSize:'15px',fontWeight:800,color:c}}>{val}</div>
              <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
            </div>
          ))}
        </div>

        <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
            <input className="input" placeholder="🔍 Tìm tên, mã, vai trò..." value={search}
              onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'200px',maxWidth:'280px'}}/>
            <div style={{display:'flex',gap:'4px'}}>
              {['Tất cả','Nhân viên','Đối tác'].map(l=>(
                <button key={l} onClick={()=>setFilterLoai(l)} style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid',
                  borderColor:filterLoai===l?'var(--primary)':'var(--border)',background:filterLoai===l?'var(--primary-pale)':'white',
                  color:filterLoai===l?'var(--primary)':'var(--text-secondary)',fontWeight:filterLoai===l?700:400,fontSize:'12px',cursor:'pointer'}}>{l}</button>
              ))}
            </div>
            <div style={{display:'flex',gap:'4px'}}>
              {['Tất cả','Đang làm','Nghỉ việc'].map(t=>(
                <button key={t} onClick={()=>setFilterTT(t)} style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid',
                  borderColor:filterTT===t?'#16A34A':'var(--border)',background:filterTT===t?'#D1FAE5':'white',
                  color:filterTT===t?'#065F46':'var(--text-secondary)',fontWeight:filterTT===t?700:400,fontSize:'12px',cursor:'pointer'}}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{overflow:'hidden'}}>
          <div style={{overflowX:'auto'}}>
            <table className="nv-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                  <th style={{textAlign:'left',fontWeight:700}}>Nhân viên / Đối tác</th>
                  <th style={{textAlign:'center',fontWeight:700}}>Loại</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Vai trò</th>
                  <th style={{textAlign:'right',fontWeight:700}}>Lương</th>
                  <th style={{textAlign:'right',fontWeight:700}}>% Thưởng DS</th>
                  <th style={{textAlign:'right',fontWeight:700}}>CP chuyến (tất cả)</th>
                  <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                  <th style={{textAlign:'center',fontWeight:700,width:'110px'}}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dsTrang.length===0?(
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Chưa có nhân viên nào</td></tr>
                ):dsTrang.map((nv:any,i:number)=>{
                  const laDT=nv['Loại']==='Đối tác'
                  const dsInfo=doiSoatTheoNV[nv['Mã nhân viên']]||{soChuyến:0,tongCP:0}
                  const htLuong=nv['Hình thức lương']||'Theo ngày'
                  // Tính tiền thu hộ chưa nộp
                  const chuaNopNV = localDS.filter((ds:any)=>ds['Mã NV/Đối tác']===nv['Mã nhân viên']&&Number(ds['Đã thu được']||0)>0&&ds['Tình trạng nộp tiền']!=='Đã nộp').reduce((s:number,ds:any)=>s+Number(ds['Đã thu được']||0),0)
                  return (
                    <tr key={nv['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td>
                        <div style={{fontWeight:700,color:'var(--primary)',cursor:'pointer',textDecoration:'underline'}} onClick={()=>moChiTiet(nv)}>{nv['Họ và Tên']||'—'}</div>
                        <div style={{fontSize:'11px',color:'#6B7280'}}>{nv['Mã nhân viên']} · {nv['Số điện thoại']||''}</div>
                        {chuaNopNV>0&&<div style={{fontSize:'10px',color:'#DC2626',fontWeight:600,marginTop:'2px'}}>⚠️ Giữ {fVND(chuaNopNV)}đ chưa nộp</div>}
                      </td>
                      <td style={{textAlign:'center'}}>
                        <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,background:laDT?'#F5F3FF':'#EFF6FF',color:laDT?'#7C3AED':'#1E40AF'}}>{nv['Loại']||'—'}</span>
                      </td>
                      <td style={{fontSize:'12px'}}>{nv['Vai trò']||'—'}</td>
                      <td style={{textAlign:'right',fontSize:'12px',fontWeight:600}}>
                        {laDT?<span style={{color:'#9CA3AF'}}>—</span>:(
                          <div>
                            <div>{fVND(nv['Lương cơ bản'])}đ</div>
                            <div style={{fontSize:'10px',color:'#9CA3AF'}}>{htLuong==='Theo ngày'?'/ngày':'/tháng'}</div>
                          </div>
                        )}
                      </td>
                      <td style={{textAlign:'right',fontSize:'12px'}}>
                        {laDT?<span style={{color:'#9CA3AF'}}>—</span>:(parseFloat(nv['% Thưởng DS']||0)>0?parseFloat(nv['% Thưởng DS']).toString()+'%':'—')}
                      </td>
                      <td style={{textAlign:'right',fontSize:'12px',fontWeight:600,color:'#16A34A'}}>
                        {dsInfo.tongCP>0?fVND(dsInfo.tongCP)+'đ':'—'}
                        {dsInfo.soChuyến>0&&<div style={{fontSize:'10px',color:'#9CA3AF'}}>{dsInfo.soChuyến} chuyến</div>}
                      </td>
                      <td style={{textAlign:'center'}}>
                        <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,background:nv['Trạng thái']==='Đang làm'?'#D1FAE5':'#F3F4F6',color:nv['Trạng thái']==='Đang làm'?'#065F46':'#374151'}}>{nv['Trạng thái']||'—'}</span>
                      </td>
                      <td style={{textAlign:'center'}}>
                        <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                          <button onClick={()=>moChiTiet(nv)} title="Xem chi tiết"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #93C5FD',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600}}>👁 Xem</button>
                          <button onClick={()=>moSua(nv)} title="Sửa thông tin"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600}}>✏️</button>
                          {isOwner&&<button onClick={()=>moXoa(nv)} title="Xóa"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>}
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
              <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{filtered.length} người</span>
              <div style={{display:'flex',gap:'4px'}}>
                <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
                {Array.from({length:tongTrang},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>)}
                <Btn disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</Btn>
              </div>
            </div>
          )}
        </div>
      </>)}

      {/* ══ CHI TIẾT ══ */}
      {view==='detail'&&nvChon&&(<>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px',flexWrap:'wrap'}}>
          <button onClick={()=>{setView('list');setNvChon(null)}}
            style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'13px'}}>← Quay lại</button>
          <div style={{flex:1}}>
            <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>
              {nvChon['Họ và Tên']}
              <span style={{marginLeft:'10px',padding:'2px 10px',borderRadius:'10px',fontSize:'13px',fontWeight:600,
                background:nvChon['Loại']==='Đối tác'?'#F5F3FF':'#EFF6FF',color:nvChon['Loại']==='Đối tác'?'#7C3AED':'#1E40AF'}}>
                {nvChon['Loại']||'Nhân viên'}
              </span>
            </h1>
            <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
              {nvChon['Mã nhân viên']} · {nvChon['Vai trò']}
              {nvChon['Số điện thoại']&&<span style={{marginLeft:'12px'}}>📞 {nvChon['Số điện thoại']}</span>}
            </p>
          </div>
          <button onClick={()=>moSua(nvChon)}
            style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
            ✏️ Sửa thông tin
          </button>
          {isOwner&&<button onClick={()=>moXoa(nvChon)}
            style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
            🗑️ Xóa
          </button>}
        </div>

        {/* Bộ lọc từ ngày đến ngày */}
        <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
          <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
            <span style={{fontSize:'12px',fontWeight:600,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>📅 Từ ngày:</span>
            <input className="input" type="date" value={tuNgayXem} onChange={e=>setTuNgayXem(e.target.value)} style={{width:'150px'}}/>
            <span style={{fontSize:'12px',fontWeight:600,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>đến:</span>
            <input className="input" type="date" value={denNgayXem} onChange={e=>setDenNgayXem(e.target.value)} style={{width:'150px'}}/>
            <button onClick={()=>{
              const n=new Date()
              setTuNgayXem(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-01`)
              setDenNgayXem(n.toISOString().split('T')[0])
            }} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer',whiteSpace:'nowrap'}}>
              Tháng này
            </button>
            <button onClick={()=>{
              const n=new Date()
              const y=n.getMonth()===0?n.getFullYear()-1:n.getFullYear()
              const m=n.getMonth()===0?12:n.getMonth()
              setTuNgayXem(`${y}-${String(m).padStart(2,'0')}-01`)
              setDenNgayXem(`${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`)
            }} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer',whiteSpace:'nowrap'}}>
              Tháng trước
            </button>
          </div>
        </div>

        {/* Thống kê thu nhập tháng */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'14px'}}>
          {nvChon['Loại']!=='Đối tác'&&(<>
            <div className="card" style={{padding:'12px 14px'}}>
              <div style={{fontSize:'11px',color:'var(--text-secondary)',marginBottom:'2px'}}>💼 {labelLuong}</div>
              <div style={{fontSize:'16px',fontWeight:800,color:'var(--primary)'}}>{fVND(thuNhapThang.luongTN)}đ</div>
              <div style={{fontSize:'11px',color:'#9CA3AF'}}>
                {ccThangChon
                  ?(thuNhapThang.hinhThucLuong==='Theo ngày'
                    ?`${thuNhapThang.ngayThucTe} ngày × ${fVND(nvChon['Lương cơ bản'])}đ`
                    :`${thuNhapThang.ngayThucTe}/${thuNhapThang.ngayChuẩn} ngày${thuNhapThang.ngayNghi>thuNhapThang.ngayPhep?' (vượt '+(thuNhapThang.ngayNghi-thuNhapThang.ngayPhep)+' ngày phép)':' (đủ phép)'}`)
                  :'Chưa chấm công'}
              </div>
            </div>
            <div className="card" style={{padding:'12px 14px'}}>
              <div style={{fontSize:'11px',color:'var(--text-secondary)',marginBottom:'2px'}}>🏆 Thưởng doanh số</div>
              <div style={{fontSize:'16px',fontWeight:800,color:'#7C3AED'}}>{fVND(thuNhapThang.thuongDS)}đ</div>
              <div style={{fontSize:'11px',color:'#9CA3AF'}}>{thuNhapThang.pctDS}% × {fVND(thuNhapThang.tongDSthang)}đ ({thuNhapThang.soDonDS} đơn)</div>
            </div>
          </>)}
          <div className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:'11px',color:'var(--text-secondary)',marginBottom:'2px'}}>🚚 CP chuyến giao</div>
            <div style={{fontSize:'16px',fontWeight:800,color:'#16A34A'}}>{fVND(thuNhapThang.cpChuyen)}đ</div>
            <div style={{fontSize:'11px',color:'#9CA3AF'}}>{doiSoatNVThang.soChuyến} chuyến trong khoảng lọc</div>
          </div>
          {nvChon['Loại']!=='Đối tác'&&(
            <div className="card" style={{padding:'12px 14px'}}>
              <div style={{fontSize:'11px',color:'var(--text-secondary)',marginBottom:'2px'}}>🎁 Thưởng khác</div>
              <div style={{fontSize:'16px',fontWeight:800,color:'#7C3AED'}}>{fVND(thuNhapThang.tongTK)}đ</div>
              <div style={{fontSize:'11px',color:'#9CA3AF'}}>Tháng {thangChon}</div>
            </div>
          )}
          <div className="card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:'11px',color:'var(--text-secondary)',marginBottom:'2px'}}>💸 Tạm ứng</div>
            <div style={{fontSize:'16px',fontWeight:800,color:'#D97706'}}>{fVND(tongTamUng)}đ</div>
            <div style={{fontSize:'11px',color:'#9CA3AF'}}>{tuThangChon.length} lần tháng {thangChon}</div>
          </div>
          {/* Card tổng thu hộ chưa nộp */}
          {tongChuaNop>0&&(
            <div className="card" style={{padding:'12px 14px',border:'2px solid #DC2626',background:'#FEF2F2'}}>
              <div style={{fontSize:'11px',color:'#DC2626',marginBottom:'2px',fontWeight:600}}>⚠️ Tiền thu hộ chưa nộp</div>
              <div style={{fontSize:'16px',fontWeight:800,color:'#DC2626'}}>{fVND(tongChuaNop)}đ</div>
              <div style={{fontSize:'11px',color:'#9CA3AF'}}>Tất cả thời gian</div>
            </div>
          )}
          <div className="card" style={{padding:'12px 14px',border:'2px solid #16A34A',background:'#F0FDF4'}}>
            <div style={{fontSize:'11px',color:'#065F46',marginBottom:'2px',fontWeight:600}}>💰 Tổng chi trả</div>
            <div style={{fontSize:'18px',fontWeight:800,color:'#16A34A'}}>{fVND(thuNhapThang.tongChiTra)}đ</div>
            <div style={{fontSize:'11px',color:'#9CA3AF'}}>
              {nvChon['Loại']==='Đối tác'?'CP chuyến - Tạm ứng':'Lương + Thưởng + Chuyến - Tạm ứng'}
            </div>
          </div>
        </div>

        {/* Tab */}
        <div style={{display:'flex',gap:'4px',marginBottom:'14px',borderBottom:'2px solid var(--border)',flexWrap:'wrap'}}>
          {([
            ['thongtin','📋 Thông tin'],
            ...(nvChon['Loại']!=='Đối tác'?[['chamcong','📅 Chấm công']]:[] as any),
            ['tamung','💸 Tạm ứng'],
            ['chuyengiao','🚚 Chuyến giao'],
            ...(nvChon['Loại']!=='Đối tác'?[['thuongkhac','🎁 Thưởng khác']]:[] as any),
            ['thuhokh', tongChuaNop>0?'💵 Thu hộ KH ⚠️':'💵 Thu hộ KH'],
          ] as const).map(([tab,label]:any)=>(
            <button key={tab} onClick={()=>setTabDetail(tab)}
              style={{padding:'8px 14px',borderRadius:'8px 8px 0 0',border:'none',
                background:tabDetail===tab?'var(--primary)':'transparent',
                color:tabDetail===tab?'white':tab==='thuhokh'&&tongChuaNop>0?'#DC2626':'var(--text-secondary)',
                fontWeight:tabDetail===tab?700:tab==='thuhokh'&&tongChuaNop>0?700:400,
                cursor:'pointer',fontSize:'13px'}}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Thông tin */}
        {tabDetail==='thongtin'&&(
          <div className="card" style={{padding:'16px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',fontSize:'13px'}}>
              {[
                ['Mã nhân viên',nvChon['Mã nhân viên']],
                ['Họ và Tên',nvChon['Họ và Tên']],
                ['Số điện thoại',nvChon['Số điện thoại']||'—'],
                ['Vai trò',nvChon['Vai trò']||'—'],
                ...(nvChon['Loại']!=='Đối tác'?[
                  ['Hình thức lương',nvChon['Hình thức lương']||'Theo ngày'],
                  [nvChon['Hình thức lương']==='Theo ngày'?'Lương theo ngày':'Lương cơ bản/tháng',fVND(nvChon['Lương cơ bản'])+'đ'],
                  ['Ngày phép/tháng',(Number(nvChon['Ngày phép/tháng']||0))+' ngày'],
                  ['% Thưởng DS',Number(nvChon['% Thưởng DS']||0)+'% · Tháng '+thangChon+': '+fVND(thuNhapThang.thuongDS)+'đ (DS: '+fVND(thuNhapThang.tongDSthang)+'đ)'],
                ]:[]),
                ['Ngân hàng',nvChon['Ngân hàng']||'—'],
                ['Số TK',nvChon['Số TK ngân hàng']||'—'],
                ['Hình thức TT',nvChon['Hình thức TT']||'—'],
                ['Trạng thái',nvChon['Trạng thái']||'—'],
              ].map(([label,val]:any)=>(
                <div key={label} style={{padding:'10px 12px',background:'#F8FAFC',borderRadius:'6px',border:'1px solid #E5E7EB'}}>
                  <div style={{fontSize:'11px',color:'#6B7280',marginBottom:'3px'}}>{label}</div>
                  <div style={{fontWeight:600}}>{val||'—'}</div>
                </div>
              ))}
            </div>
            {nvChon['Ghi chú']&&<div style={{marginTop:'10px',padding:'10px 12px',background:'#FEF9C3',borderRadius:'6px',fontSize:'12px'}}>📝 {nvChon['Ghi chú']}</div>}
          </div>
        )}

        {/* Tab: Chấm công */}
        {tabDetail==='chamcong'&&(
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:600,fontSize:'13px'}}>📅 Lịch sử chấm công</span>
              {nvChon['Loại']!=='Đối tác'&&(
                <button onClick={()=>{setEditCC(null);setCcThang(thangChon);setCcChuẩn(26);setCcThucTe(26);setCcGhiChu('');setShowCCModal(true)}}
                  style={{padding:'6px 14px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:600,cursor:'pointer',fontSize:'12px'}}>
                  + Thêm chấm công
                </button>
              )}
            </div>
            {loadingData?<div style={{padding:'32px',textAlign:'center',color:'var(--text-muted)'}}>⏳ Đang tải...</div>:(
              <table className="nv-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700}}>Tháng</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Ngày chuẩn</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Ngày thực tế</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Ngày nghỉ</th>
                    <th style={{textAlign:'right',fontWeight:700}}>{nvChon['Hình thức lương']==='Theo ngày'?'Lương theo ngày':'Lương thực nhận'}</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Ghi chú</th>
                    <th style={{textAlign:'center',fontWeight:700,width:'90px'}}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {chamCongList.length===0?(
                    <tr><td colSpan={7} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chưa có dữ liệu chấm công</td></tr>
                  ):chamCongList.map((cc:any,i:number)=>{
                    const luongCB=Number(nvChon['Lương cơ bản']||0)
                    const htL=nvChon['Hình thức lương']||'Theo ngày'
                    const ngayChuẩn=Number(cc['Tổng ngày công chuẩn']||26)
                    const ngayTT=Number(cc['Số ngày công thực tế']||0)
                    const ngayNghi=ngayChuẩn-ngayTT
                    const ngayPhep=Number(nvChon['Ngày phép/tháng']||0)
                    let luongTN=0
                    if(htL==='Theo ngày'){luongTN=Math.round(luongCB*ngayTT)}
                    else{const vuot=Math.max(0,ngayNghi-ngayPhep);luongTN=Math.round(luongCB-(vuot*(ngayChuẩn>0?luongCB/ngayChuẩn:0)))}
                    return (
                      <tr key={cc['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                        <td style={{fontWeight:600}}>{cc['Tháng']||'—'}</td>
                        <td style={{textAlign:'center'}}>{ngayChuẩn}</td>
                        <td style={{textAlign:'center',fontWeight:700,color:ngayTT<ngayChuẩn?'#D97706':'#374151'}}>{ngayTT}</td>
                        <td style={{textAlign:'center',color:'#DC2626'}}>{ngayNghi}</td>
                        <td style={{textAlign:'right',fontWeight:700,color:'var(--primary)'}}>{fVND(luongTN)}đ</td>
                        <td style={{fontSize:'12px',color:'#6B7280'}}>{cc['Ghi chú']||'—'}</td>
                        <td style={{textAlign:'center'}}>
                          <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                            <button onClick={()=>{setEditCC(cc);setCcThang(cc['Tháng']||thangChon);setCcChuẩn(ngayChuẩn);setCcThucTe(ngayTT);setCcGhiChu(cc['Ghi chú']||'');setShowCCModal(true)}}
                              style={{padding:'4px 6px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600}}>✏️</button>
                            {isOwner&&<button onClick={()=>xoaChamCong(cc)}
                              style={{padding:'4px 6px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab: Tạm ứng */}
        {tabDetail==='tamung'&&(
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:600,fontSize:'13px'}}>💸 Lịch sử tạm ứng · Tháng {thangChon}: <strong style={{color:'#D97706'}}>{fVND(tongTamUng)}đ</strong></span>
              <button onClick={()=>{setTuThang(thangChon);setTuSoTien(0);setTuGhiChu('');setTuNgay(new Date().toISOString().split('T')[0]);setShowTUModal(true)}}
                style={{padding:'6px 14px',borderRadius:'6px',border:'none',background:'#D97706',color:'white',fontWeight:600,cursor:'pointer',fontSize:'12px'}}>
                + Ghi tạm ứng
              </button>
            </div>
            {loadingData?<div style={{padding:'32px',textAlign:'center'}}>⏳</div>:(
              <table className="nv-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã tạm ứng</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Tháng</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Ngày tạm ứng</th>
                    <th style={{textAlign:'right',fontWeight:700}}>Số tiền</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Người duyệt</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Ghi chú</th>
                    <th style={{textAlign:'center',fontWeight:700,width:'70px'}}>Xóa</th>
                  </tr>
                </thead>
                <tbody>
                  {tamUngList.length===0?(
                    <tr><td colSpan={7} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chưa có tạm ứng</td></tr>
                  ):tamUngList.map((tu:any,i:number)=>(
                    <tr key={tu['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td style={{fontSize:'12px',color:'var(--primary)',fontWeight:600}}>{tu['Mã tạm ứng']||'—'}</td>
                      <td style={{fontSize:'12px'}}>{tu['Tháng']||'—'}</td>
                      <td style={{fontSize:'12px',color:'var(--text-secondary)'}}>{fDate(tu['Ngày tạm ứng'])}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'#D97706'}}>{fVND(tu['Số tiền'])}đ</td>
                      <td style={{fontSize:'12px',color:'#6B7280'}}>{tu['Người duyệt']||'—'}</td>
                      <td style={{fontSize:'12px',color:'#6B7280'}}>{tu['Ghi chú']||'—'}</td>
                      <td style={{textAlign:'center'}}>
                        {isOwner&&<button onClick={()=>xoaTamUng(tu)}
                          style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab: Chuyến giao */}
        {tabDetail==='chuyengiao'&&(()=>{
          const filteredDS=localDS.filter((ds:any)=>{
            if(ds['Mã NV/Đối tác']!==nvChon['Mã nhân viên']) return false
            if(!ds['Ngày đối soát']) return true
            const ngay=ds['Ngày đối soát'].split('T')[0]
            return ngay>=tuNgayXem && ngay<=denNgayXem
          })
          const tongTrangCG=Math.max(1,Math.ceil(filteredDS.length/SO_DONG_TAB))
          const trangHTCG=Math.min(trangCG,tongTrangCG)
          const dsTrangCG=filteredDS.slice((trangHTCG-1)*SO_DONG_TAB,trangHTCG*SO_DONG_TAB)
          return (
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)'}}>
              <span style={{fontWeight:600,fontSize:'13px'}}>🚚 Chuyến giao ({tuNgayXem&&fDate(tuNgayXem)} – {denNgayXem&&fDate(denNgayXem)}) · <strong style={{color:'#16A34A'}}>{doiSoatNVThang.soChuyến} chuyến · {fVND(doiSoatNVThang.tongCP)}đ</strong></span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="nv-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã đối soát</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Ngày ĐS</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã đơn</th>
                    <th style={{textAlign:'right',fontWeight:700}}>CP VC</th>
                    <th style={{textAlign:'right',fontWeight:700}}>CP lắp</th>
                    <th style={{textAlign:'right',fontWeight:700}}>Thưởng</th>
                    <th style={{textAlign:'right',fontWeight:700}}>Tổng</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Kết quả</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDS.length===0?(
                    <tr><td colSpan={8} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Không có chuyến nào tháng {thangChon}</td></tr>
                  ):dsTrangCG.map((ds:any,i:number)=>{
                    const gh=giaoHangMap[ds['Mã giao hàng']||'']
                    const don=donHangMap[ds['Mã đơn hàng']||'']
                    return (
                    <tr key={ds['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD',cursor:'pointer'}}
                      onClick={()=>setPopupChiTiet({gh:{...gh,'Mã đơn hàng':ds['Mã đơn hàng'],'Tên NV/đối tác':ds['Tên NV/đối tác giao hàng'],'Mã giao hàng':ds['Mã giao hàng']},ds,don})}>
                      <td style={{fontSize:'12px',fontWeight:600,color:'var(--primary)',whiteSpace:'nowrap'}}>
                        <span title={ds['Mã đối soát']||''}>{rutGonMa(ds['Mã đối soát']||ds['Mã giao hàng']||'—')}</span>
                      </td>
                      <td style={{fontSize:'12px',whiteSpace:'nowrap'}}>{fDateShort(ds['Ngày đối soát'])}</td>
                      <td style={{fontSize:'12px',color:'#374151'}}>{rutGonMa(ds['Mã đơn hàng']||'—')}</td>
                      <td style={{textAlign:'right',fontSize:'12px'}}>{Number(ds['Chi phí VC']||0)>0?fVND(ds['Chi phí VC'])+'đ':'—'}</td>
                      <td style={{textAlign:'right',fontSize:'12px'}}>{Number(ds['Chi phí lắp đặt']||0)>0?fVND(ds['Chi phí lắp đặt'])+'đ':'—'}</td>
                      <td style={{textAlign:'right',fontSize:'12px',color:'#7C3AED',fontWeight:600}}>{Number(ds['Thưởng chuyến']||0)>0?fVND(ds['Thưởng chuyến'])+'đ':'—'}</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'#16A34A'}}>{fVND(Number(ds['Chi phí VC']||0)+Number(ds['Chi phí lắp đặt']||0)+Number(ds['Thưởng chuyến']||0))}đ</td>
                      <td style={{textAlign:'center'}}>
                        <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,
                          background:ds['Kết quả']==='Thành công'?'#D1FAE5':'#FEE2E2',
                          color:ds['Kết quả']==='Thành công'?'#065F46':'#DC2626'}}>
                          {ds['Kết quả']||'—'}
                        </span>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
            {tongTrangCG>1&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',borderTop:'1px solid #F0F0F0'}}>
                <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{(trangHTCG-1)*SO_DONG_TAB+1}–{Math.min(trangHTCG*SO_DONG_TAB,filteredDS.length)} / {filteredDS.length}</span>
                <div style={{display:'flex',gap:'4px'}}>
                  <Btn disabled={trangHTCG===1} onClick={()=>setTrangCG(t=>t-1)}>‹</Btn>
                  {Array.from({length:tongTrangCG},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHTCG} onClick={()=>setTrangCG(p)}>{p}</Btn>)}
                  <Btn disabled={trangHTCG===tongTrangCG} onClick={()=>setTrangCG(t=>t+1)}>›</Btn>
                </div>
              </div>
            )}
          </div>
          )
        })()}

        {/* Tab: Thưởng khác */}
        {tabDetail==='thuongkhac'&&nvChon['Loại']!=='Đối tác'&&(
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:600,fontSize:'13px'}}>🎁 Thưởng khác · Tháng {thangChon}: <strong style={{color:'#7C3AED'}}>{fVND(thuNhapThang.tongTK)}đ</strong></span>
              <button onClick={()=>{setTkThang(thangChon);setTkSoTien(0);setTkLyDo('');setTkLoai('Thưởng nóng');setTkNgay(new Date().toISOString().split('T')[0]);setShowTKModal(true)}}
                style={{padding:'6px 14px',borderRadius:'6px',border:'none',background:'#7C3AED',color:'white',fontWeight:600,cursor:'pointer',fontSize:'12px'}}>
                + Thêm thưởng
              </button>
            </div>
            <table className="nv-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                  <th style={{textAlign:'left',fontWeight:700}}>Mã thưởng</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Tháng</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Ngày</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Loại</th>
                  <th style={{textAlign:'right',fontWeight:700}}>Số tiền</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Lý do</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Người duyệt</th>
                  <th style={{textAlign:'center',fontWeight:700,width:'70px'}}>Xóa</th>
                </tr>
              </thead>
              <tbody>
                {tkList.filter((tk:any)=>tk['Tháng']===thangChon).length===0?(
                  <tr><td colSpan={8} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chưa có thưởng nào tháng {thangChon}</td></tr>
                ):tkList.filter((tk:any)=>tk['Tháng']===thangChon).map((tk:any,i:number)=>(
                  <tr key={tk['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontSize:'12px',color:'var(--primary)',fontWeight:600}}>{tk['Mã thưởng']||'—'}</td>
                    <td style={{fontSize:'12px'}}>{tk['Tháng']||'—'}</td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDate(tk['Ngày thưởng'])}</td>
                    <td><span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,background:'#F5F3FF',color:'#7C3AED'}}>{tk['Loại thưởng']||'—'}</span></td>
                    <td style={{textAlign:'right',fontWeight:700,color:'#7C3AED'}}>{fVND(tk['Số tiền'])}đ</td>
                    <td style={{fontSize:'12px',color:'#6B7280',maxWidth:'200px'}}>{tk['Lý do']||'—'}</td>
                    <td style={{fontSize:'12px',color:'#6B7280'}}>{tk['Người duyệt']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      {isOwner&&<button onClick={async()=>{
                        if(!confirm('Xóa thưởng '+fVND(tk['Số tiền'])+'đ?')) return
                        await fetch(`/api/nhan-vien?id=${tk['Id']||tk['id']}&loai=thuong-khac`,{method:'DELETE'})
                        setTkList((p:any[])=>p.filter(t=>(t['Id']||t['id'])!==(tk['Id']||tk['id'])))
                        showMsg2('✅ Đã xóa thưởng')
                      }} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ══ Tab: Thu hộ KH ══ */}
        {tabDetail==='thuhokh'&&(()=>{
          const tongTH2x=Math.max(1,Math.ceil(dsThuHo.length/SO_DONG_TAB))
          const tHTH2x=Math.min(trangTH2,tongTH2x)
          const dsTrangTH2=dsThuHo.slice((tHTH2x-1)*SO_DONG_TAB,tHTH2x*SO_DONG_TAB)
          return (
          <div className="card" style={{overflow:'hidden'}}>
            {/* Tổng quan */}
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',gap:'20px',flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontWeight:600,fontSize:'13px'}}>💵 Tiền thu hộ từ khách hàng</span>
              <div style={{display:'flex',gap:'16px',marginLeft:'auto',flexWrap:'wrap'}}>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>Tổng thu hộ</div>
                  <div style={{fontWeight:800,color:'var(--primary)',fontSize:'14px'}}>{fVND(dsThuHo.reduce((s:number,d:any)=>s+Number(d['Đã thu được']||0),0))}đ</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>Đã nộp</div>
                  <div style={{fontWeight:800,color:'#16A34A',fontSize:'14px'}}>{fVND(tongDaNop)}đ</div>
                </div>
                <div style={{textAlign:'center'}}>
                  <div style={{fontSize:'11px',color:'#6B7280'}}>Chưa nộp</div>
                  <div style={{fontWeight:800,color:tongChuaNop>0?'#DC2626':'#9CA3AF',fontSize:'14px'}}>{fVND(tongChuaNop)}đ</div>
                </div>
              </div>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="nv-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã đối soát</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã đơn</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Ngày đối soát</th>
                    <th style={{textAlign:'right',fontWeight:700}}>Số tiền thu hộ</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Tình trạng nộp</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Ngày nộp</th>
                    <th style={{textAlign:'center',fontWeight:700,width:'110px'}}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {dsThuHo.length===0?(
                    <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>Không có chuyến nào có thu tiền từ khách</td></tr>
                  ):dsTrangTH2.map((ds:any,i:number)=>{
                    const daNop = ds['Tình trạng nộp tiền']==='Đã nộp'
                    const ghTH=giaoHangMap[ds['Mã giao hàng']||'']
                    const donTH=donHangMap[ds['Mã đơn hàng']||'']
                    return (
                      <tr key={ds['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:daNop?'white':i%2===0?'#FFFBF0':'#FEF9E7',cursor:'pointer'}}
                        onClick={()=>setPopupChiTiet({gh:{...ghTH,'Mã đơn hàng':ds['Mã đơn hàng'],'Tên NV/đối tác':ds['Tên NV/đối tác giao hàng'],'Mã giao hàng':ds['Mã giao hàng']},ds,don:donTH})}>
                        <td style={{fontWeight:600,color:'var(--primary)',fontSize:'12px',whiteSpace:'nowrap'}}>
                          <span title={ds['Mã đối soát']||''}>{rutGonMa(ds['Mã đối soát']||ds['Mã giao hàng']||'—')}</span>
                        </td>
                        <td style={{fontSize:'12px'}}>{rutGonMa(ds['Mã đơn hàng']||'—')}</td>
                        <td style={{fontSize:'12px',color:'#6B7280',whiteSpace:'nowrap'}}>{fDateShort(ds['Ngày đối soát'])}</td>
                        <td style={{textAlign:'right',fontWeight:700,color:'#16A34A',fontSize:'13px'}}>{fVND(ds['Đã thu được'])}đ</td>
                        <td style={{textAlign:'center'}}>
                          <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:700,
                            background:daNop?'#D1FAE5':'#FEF3C7',
                            color:daNop?'#065F46':'#92400E',whiteSpace:'nowrap'}}>
                            {daNop?'✅ Đã nộp':'⏳ Chưa nộp'}
                          </span>
                        </td>
                        <td style={{fontSize:'12px',color:'#6B7280'}}>{daNop?fDate(ds['Ngày nộp tiền']):'—'}</td>
                        <td style={{textAlign:'center'}}>
                          {!daNop&&isOwner&&(
                            <button onClick={()=>setXacNhanNopItem(ds)}
                              style={{padding:'5px 10px',borderRadius:'6px',border:'none',background:'#16A34A',color:'white',fontSize:'11px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                              ✅ Xác nhận nộp
                            </button>
                          )}
                          {daNop&&<span style={{fontSize:'11px',color:'#9CA3AF'}}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {dsThuHo.length>0&&(
                  <tfoot>
                    <tr style={{background:'#F0F4FF',borderTop:'2px solid var(--border)'}}>
                      <td colSpan={3} style={{padding:'8px 10px',fontWeight:700,fontSize:'13px'}}>Tổng ({dsThuHo.length} chuyến)</td>
                      <td style={{padding:'8px 10px',textAlign:'right',fontWeight:800,color:'#16A34A'}}>
                        {fVND(dsThuHo.reduce((s:number,d:any)=>s+Number(d['Đã thu được']||0),0))}đ
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
            {(()=>{
              const tongTrangTH=Math.max(1,Math.ceil(dsThuHo.length/SO_DONG_TAB))
              const trangHTTH=Math.min(trangTH2,tongTrangTH)
              return tongTrangTH>1?(
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',borderTop:'1px solid #F0F0F0'}}>
                  <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{(trangHTTH-1)*SO_DONG_TAB+1}–{Math.min(trangHTTH*SO_DONG_TAB,dsThuHo.length)} / {dsThuHo.length}</span>
                  <div style={{display:'flex',gap:'4px'}}>
                    <Btn disabled={trangHTTH===1} onClick={()=>setTrangTH2(t=>t-1)}>‹</Btn>
                    {Array.from({length:tongTrangTH},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHTTH} onClick={()=>setTrangTH2(p)}>{p}</Btn>)}
                    <Btn disabled={trangHTTH===tongTrangTH} onClick={()=>setTrangTH2(t=>t+1)}>›</Btn>
                  </div>
                </div>
              ):null
            })()}
          </div>
          )
        })()}
      </>)}

      {/* ══ MODAL THÊM/SỬA NV ══ */}
      {showModal&&(
        <div className="ov">
          <div className="mk" style={{maxWidth:'680px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>{editNV?'✏️ Sửa thông tin':'+ Thêm nhân viên / đối tác'}</h2>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'flex',gap:'8px',marginBottom:'4px'}}>
                {['Nhân viên','Đối tác'].map(l=>(
                  <button key={l} onClick={()=>setLoaiNV(l)}
                    style={{flex:1,padding:'9px',borderRadius:'8px',border:'2px solid',
                      borderColor:loaiNV===l?'var(--primary)':'var(--border)',
                      background:loaiNV===l?'var(--primary-pale)':'white',
                      color:loaiNV===l?'var(--primary)':'var(--text-secondary)',
                      fontWeight:loaiNV===l?700:400,cursor:'pointer',fontSize:'13px'}}>
                    {l==='Nhân viên'?'👔 Nhân viên':'🤝 Đối tác ngoài'}
                  </button>
                ))}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
                <div><label className="lbl">Mã {loaiNV==='Đối tác'?'DT':'NV'} (tự động)</label>
                  <input className="input" placeholder={loaiNV==='Đối tác'?'DT-001':'NV-001'} value={maNV} onChange={e=>setMaNV(e.target.value)} disabled={!!editNV}/></div>
                <div><label className="lbl">Họ và Tên *</label>
                  <input className="input" placeholder="Họ và tên..." value={hoTen} onChange={e=>setHoTen(e.target.value)} autoFocus/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">📞 Số điện thoại</label>
                  <input className="input" placeholder="0xxxxxxxxx (10 số)" value={sdt}
                    onChange={e=>setSdt(e.target.value.replace(/[^0-9]/g,''))} maxLength={10}
                    style={{borderColor:sdt&&(!sdt.startsWith('0')||sdt.length<10)?'#DC2626':sdt.length===10&&sdt.startsWith('0')?'#16A34A':''}}/>
                  {sdt&&!sdt.startsWith('0')&&<div style={{fontSize:'11px',color:'#DC2626',marginTop:'3px'}}>⚠️ Phải bắt đầu bằng số 0</div>}
                  {sdt&&sdt.startsWith('0')&&sdt.length<10&&<div style={{fontSize:'11px',color:'#D97706',marginTop:'3px'}}>⚠️ Còn thiếu {10-sdt.length} số</div>}
                  {sdt.length===10&&sdt.startsWith('0')&&<div style={{fontSize:'11px',color:'#16A34A',marginTop:'3px'}}>✅ Hợp lệ</div>}
                </div>
                <div><label className="lbl">Vai trò</label>
                  <select className="input" value={vaiTro} onChange={e=>setVaiTro(e.target.value)}>
                    {VAI_TRO.map(v=><option key={v}>{v}</option>)}
                  </select></div>
              </div>
              {loaiNV==='Nhân viên'&&(
                <div style={{display:'flex',flexDirection:'column',gap:'10px',padding:'12px',background:'#F8FAFC',borderRadius:'8px',border:'1px solid #E5E7EB'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--primary)',textTransform:'uppercase'}}>💼 Thông tin lương</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <div><label className="lbl">📋 Hình thức lương</label>
                      <select className="input" value={hinhthucluong} onChange={e=>setHinhthucluong(e.target.value)}>
                        <option>Theo ngày</option><option>Theo tháng</option>
                      </select></div>
                    <div><label className="lbl">📅 Ngày phép/tháng</label>
                      <input className="input" type="number" min="0" max="31" placeholder="0"
                        value={ngayphep||''} onChange={e=>setNgayphep(Number(e.target.value)||0)}
                        disabled={hinhthucluong==='Theo ngày'} style={{opacity:hinhthucluong==='Theo ngày'?0.4:1}}/></div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                    <div>
                      <label className="lbl">{hinhthucluong==='Theo ngày'?'💰 Lương theo ngày (đ/ngày)':'💰 Lương cơ bản (đ/tháng)'}</label>
                      <input className="input" type="text" inputMode="numeric" placeholder="0"
                        value={luong?luong.toLocaleString('en-US').replace(/,/g,'.'):''}
                        onChange={e=>{const v=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'');setLuong(Number(v)||0)}}/>
                    </div>
                    <div><label className="lbl">🏆 % Thưởng doanh số</label>
                      <input className="input" type="number" min="0" max="100" step="0.1" placeholder="0"
                        value={pcthuong===0?'':pcthuong} onChange={e=>setPcthuong(parseFloat(e.target.value)||0)}/></div>
                  </div>
                </div>
              )}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">🏦 Ngân hàng</label>
                  <input className="input" placeholder="Vietcombank, MB..." value={nganhang} onChange={e=>setNganhang(e.target.value)}/></div>
                <div><label className="lbl">🔢 Số tài khoản</label>
                  <input className="input" placeholder="Số TK..." value={stk} onChange={e=>setStk(e.target.value)}/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">Trạng thái</label>
                  <select className="input" value={trangThaiNV} onChange={e=>setTrangThaiNV(e.target.value)}
                    style={{background:trangThaiNV==='Nghỉ việc'?'#FEF2F2':'',color:trangThaiNV==='Nghỉ việc'?'#DC2626':''}}>
                    <option>Đang làm</option><option>Nghỉ việc</option>
                  </select></div>
                <div><label className="lbl">Ghi chú</label>
                  <input className="input" placeholder="Ghi chú..." value={ghiChuNV} onChange={e=>setGhiChuNV(e.target.value)}/></div>
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuNV} disabled={loading}
                  style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                  {loading?'⏳ Đang lưu...':editNV?'✅ Cập nhật':'✅ Thêm mới'}
                </button>
                <button onClick={()=>{setShowModal(false);resetForm()}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL XÁC NHẬN NỘP TIỀN THU HỘ ══ */}
      {xacNhanNopItem&&(
        <div className="ov" onClick={()=>setXacNhanNopItem(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'380px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>💵</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 8px'}}>Xác nhận đã nộp tiền</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}>
              Mã đối soát: <strong>{xacNhanNopItem['Mã đối soát']||xacNhanNopItem['Mã giao hàng']||'—'}</strong>
            </p>
            <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'12px',margin:'10px 0 16px',border:'1px solid #BBF7D0'}}>
              <div style={{fontSize:'22px',fontWeight:800,color:'#16A34A'}}>{fVND(xacNhanNopItem['Đã thu được'])}đ</div>
              <div style={{fontSize:'12px',color:'#065F46',marginTop:'4px'}}>{nvChon?.['Họ và Tên']} đã nộp về cửa hàng</div>
            </div>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px'}}>Ngày nộp: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>xacNhanNopTien(xacNhanNopItem)} disabled={loadingNop}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loadingNop?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                {loadingNop?'⏳ Đang lưu...':'✅ Xác nhận'}
              </button>
              <button onClick={()=>setXacNhanNopItem(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL THƯỞNG KHÁC ══ */}
      {showTKModal&&nvChon&&(
        <div className="ov">
          <div className="mk" style={{maxWidth:'460px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>🎁 Thêm thưởng — {nvChon['Họ và Tên']}</h2>
              <button onClick={()=>setShowTKModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">Tháng</label>
                  <input className="input" type="month" value={tkThang.split('/').reverse().join('-')}
                    onChange={e=>{const [y,m]=e.target.value.split('-');setTkThang(m+'/'+y)}}/></div>
                <div><label className="lbl">Ngày thưởng</label>
                  <input className="input" type="date" value={tkNgay} onChange={e=>setTkNgay(e.target.value)}/></div>
              </div>
              <div><label className="lbl">Loại thưởng</label>
                <select className="input" value={tkLoai} onChange={e=>setTkLoai(e.target.value)}>
                  {['Thưởng nóng','Thưởng tết','Thưởng khác'].map(l=><option key={l}>{l}</option>)}
                </select></div>
              <div><label className="lbl">💰 Số tiền *</label>
                <input className="input" type="text" inputMode="numeric" placeholder="0"
                  value={tkSoTien?tkSoTien.toLocaleString('en-US').replace(/,/g,'.'):''}
                  onChange={e=>{const v=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'');setTkSoTien(Number(v)||0)}}
                  style={{fontWeight:700,fontSize:'15px',color:'#7C3AED'}}/></div>
              <div><label className="lbl">Lý do</label>
                <textarea className="input" rows={3} placeholder="Lý do thưởng..." value={tkLyDo} onChange={e=>setTkLyDo(e.target.value)} style={{resize:'vertical'}}/></div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={async()=>{
                  if(!tkSoTien||tkSoTien<=0){showMsg2('Nhập số tiền > 0',false);return}
                  setLoading(true)
                  try{
                    const res=await fetch('/api/nhan-vien',{method:'POST',headers:{'Content-Type':'application/json'},
                      body:JSON.stringify({loai:'thuong-khac',thang:tkThang,maNV:nvChon['Mã nhân viên'],
                        tenNV:nvChon['Họ và Tên'],loaiThuong:tkLoai,soTien:tkSoTien,lyDo:tkLyDo,ngayThuong:tkNgay})})
                    const d=await res.json()
                    if(!res.ok) throw new Error(d.message)
                    setTkList((p:any[])=>[{...d.data,'Mã thưởng':d.maTK,'Tháng':tkThang,
                      'Mã nhân viên':nvChon['Mã nhân viên'],'Loại thưởng':tkLoai,
                      'Số tiền':tkSoTien,'Lý do':tkLyDo,'Ngày thưởng':tkNgay},...p])
                    showMsg2('✅ Đã thêm thưởng '+fVND(tkSoTien)+'đ')
                    setShowTKModal(false);setTkSoTien(0);setTkLyDo('')
                  }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
                  finally{setLoading(false)}
                }} disabled={loading||!tkSoTien}
                  style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'#7C3AED',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                  {loading?'⏳':'✅ Xác nhận thưởng'}
                </button>
                <button onClick={()=>setShowTKModal(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL CHẤM CÔNG ══ */}
      {showCCModal&&nvChon&&(
        <div className="ov">
          <div className="mk" style={{maxWidth:'460px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>📅 {editCC?'Sửa':'Thêm'} chấm công — {nvChon['Họ và Tên']}</h2>
              <button onClick={()=>{setShowCCModal(false);setEditCC(null)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div><label className="lbl">Tháng</label>
                <input className="input" type="month" value={ccThang.split('/').reverse().join('-')}
                  onChange={e=>{const [y,m]=e.target.value.split('-');setCcThang(m+'/'+y)}} disabled={!!editCC}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">Ngày công chuẩn</label>
                  <input className="input" type="number" min="1" max="31" value={ccChuẩn||''} onChange={e=>setCcChuẩn(Number(e.target.value)||26)}/></div>
                <div><label className="lbl">Ngày công thực tế</label>
                  <input className="input" type="number" min="0" max={ccChuẩn} value={ccThucTe||''} onChange={e=>setCcThucTe(Number(e.target.value)||0)}/></div>
              </div>
              {(()=>{
                const htL=nvChon['Hình thức lương']||'Theo ngày'
                const luongCB=Number(nvChon['Lương cơ bản']||0)
                const ngayPhep=Number(nvChon['Ngày phép/tháng']||0)
                const ngayNghi=ccChuẩn-ccThucTe
                let luongPreview=0
                if(htL==='Theo ngày'){luongPreview=Math.round(luongCB*ccThucTe)}
                else{const vuot=Math.max(0,ngayNghi-ngayPhep);luongPreview=Math.round(luongCB-(vuot*(ccChuẩn>0?luongCB/ccChuẩn:0)))}
                return (
                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',fontSize:'12px'}}>
                    <div style={{color:'#1E40AF',fontWeight:600,marginBottom:'4px'}}>
                      {htL==='Theo ngày'?`Theo ngày: ${fVND(luongCB)}đ × ${ccThucTe} ngày`:`Theo tháng: nghỉ ${ngayNghi} ngày / phép ${ngayPhep} ngày`}
                    </div>
                    <div style={{color:'#374151'}}>
                      {htL==='Theo tháng'&&ngayNghi>ngayPhep&&<span style={{color:'#DC2626'}}>Vượt phép {ngayNghi-ngayPhep} ngày · </span>}
                      Lương ≈ <strong style={{color:'var(--primary)',fontSize:'14px'}}>{fVND(luongPreview)}đ</strong>
                    </div>
                  </div>
                )
              })()}
              <div><label className="lbl">Ghi chú</label>
                <input className="input" placeholder="VD: Nghỉ phép 2 ngày..." value={ccGhiChu} onChange={e=>setCcGhiChu(e.target.value)}/></div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuChamCong} disabled={loading}
                  style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                  {loading?'⏳':'✅ Lưu chấm công'}
                </button>
                <button onClick={()=>{setShowCCModal(false);setEditCC(null)}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL TẠM ỨNG ══ */}
      {showTUModal&&nvChon&&(
        <div className="ov">
          <div className="mk" style={{maxWidth:'420px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>💸 Ghi tạm ứng — {nvChon['Họ và Tên']}</h2>
              <button onClick={()=>setShowTUModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">Tháng</label>
                  <input className="input" type="month" value={tuThang.split('/').reverse().join('-')}
                    onChange={e=>{const [y,m]=e.target.value.split('-');setTuThang(m+'/'+y)}}/></div>
                <div><label className="lbl">Ngày tạm ứng</label>
                  <input className="input" type="date" value={tuNgay} onChange={e=>setTuNgay(e.target.value)}/></div>
              </div>
              <div><label className="lbl">💰 Số tiền tạm ứng *</label>
                <input className="input" type="text" inputMode="numeric" placeholder="0"
                  value={tuSoTien?tuSoTien.toLocaleString('en-US').replace(/,/g,'.'):''}
                  onChange={e=>{const v=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'');setTuSoTien(Number(v)||0)}}
                  style={{fontWeight:700,fontSize:'15px',color:'#D97706'}}/></div>
              <div><label className="lbl">Ghi chú</label>
                <input className="input" placeholder="Lý do tạm ứng..." value={tuGhiChu} onChange={e=>setTuGhiChu(e.target.value)}/></div>
              <div style={{padding:'8px 12px',borderRadius:'6px',background:'#FEF9C3',fontSize:'12px',color:'#92400E'}}>
                💡 Tổng tạm ứng tháng {tuThang}: <strong>{fVND(tongTamUng)}đ</strong>
                {tuSoTien>0&&<span> → Sau: <strong>{fVND(tongTamUng+tuSoTien)}đ</strong></span>}
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuTamUng} disabled={loading||!tuSoTien}
                  style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'#D97706',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                  {loading?'⏳':'✅ Ghi tạm ứng'}
                </button>
                <button onClick={()=>setShowTUModal(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ POPUP CHI TIẾT ĐỐI SOÁT (từ tab chuyến giao / thu hộ) ══ */}
      {popupChiTiet&&(
        <div className="ov" onClick={()=>setPopupChiTiet(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'680px',maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>📋 Chi tiết đối soát</h2>
              <button onClick={()=>setPopupChiTiet(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            {/* Thông tin NV/ĐT */}
            <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'10px 14px',marginBottom:'14px',fontSize:'13px'}}>
              <div style={{fontWeight:700,color:'var(--primary)',marginBottom:'3px'}}>
                {popupChiTiet.gh?.['Tên NV/đối tác']||popupChiTiet.ds?.['Tên NV/đối tác giao hàng']||'—'}
                <span style={{marginLeft:'8px',fontSize:'11px',padding:'2px 8px',borderRadius:'10px',
                  background:popupChiTiet.gh?.['Hình thức giao']==='Đối tác'?'#FEF3C7':'#DBEAFE',
                  color:popupChiTiet.gh?.['Hình thức giao']==='Đối tác'?'#92400E':'#1E40AF'}}>
                  {popupChiTiet.gh?.['Hình thức giao']==='Đối tác'?'Đối tác':'NV cửa hàng'}
                </span>
              </div>
              <div style={{fontSize:'12px',color:'#555'}}>📋 {popupChiTiet.ds?.['Mã đơn hàng']||'—'} · {popupChiTiet.ds?.['Mã giao hàng']||'—'}</div>
              {popupChiTiet.ds?.['Ngày đối soát']&&<div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>📅 Ngày đối soát: {new Date(popupChiTiet.ds['Ngày đối soát']).toLocaleDateString('vi-VN')}</div>}
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              {/* SP giao */}
              <div>
                <label style={{fontSize:'12px',fontWeight:700,display:'block',marginBottom:'8px'}}>🪑 Các sản phẩm giao lần này</label>
                {(()=>{
                  const spChuyen = chiTietGiaoMap[popupChiTiet.gh?.['Mã giao hàng']||''] || []
                  if (spChuyen.length===0) return <div style={{fontSize:'12px',color:'#9CA3AF',fontStyle:'italic',padding:'8px 12px',background:'#F9FAFB',borderRadius:'6px'}}>Chưa có thông tin sản phẩm</div>
                  return (
                    <div style={{background:'#F8FAFC',borderRadius:'8px',border:'1px solid #E5E7EB',overflow:'hidden'}}>
                      {spChuyen.map((sp:any,i:number)=>(
                        <div key={i} style={{padding:'8px 12px',borderBottom:i<spChuyen.length-1?'1px solid #F0F0F0':'none',display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'13px'}}>
                          <div style={{fontWeight:600,flex:1}}>{sp['Tên SP (ghi nhanh)']||sp['Mã SP']||'—'}</div>
                          <div style={{fontSize:'12px',color:'#6B7280',marginLeft:'12px'}}>SL: <strong style={{color:'var(--primary)'}}>{sp['Số lượng giao đợt này']||sp['Số lượng']||1}</strong></div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
              {/* Tiền thu KH */}
              {Number(popupChiTiet.ds?.['Đã thu được']||0)>0&&(
                <div style={{background:'#F0FDF4',borderRadius:'8px',padding:'12px 14px',border:'1px solid #BBF7D0'}}>
                  <div style={{fontWeight:700,fontSize:'13px',color:'#15803D',marginBottom:'8px'}}>💵 Tiền thu từ khách hàng</div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <span style={{fontSize:'13px',color:'#374151'}}>Tổng đã thu:</span>
                    <span style={{fontWeight:800,fontSize:'16px',color:'#16A34A'}}>{fVND(popupChiTiet.ds['Đã thu được'])}đ</span>
                  </div>
                  {popupChiTiet.ds['Hình thức thu']&&<div style={{fontSize:'12px',color:'#6B7280',marginTop:'4px'}}>Hình thức: <strong>{popupChiTiet.ds['Hình thức thu']}</strong></div>}
                  {(()=>{const c=Number(popupChiTiet.don?.['Còn phải thu']||0);return c===0?<div style={{fontSize:'12px',color:'#16A34A',marginTop:'6px',fontWeight:600}}>✅ Khách đã thanh toán đủ</div>:<div style={{fontSize:'12px',color:'#DC2626',marginTop:'6px',fontWeight:600}}>⚠️ KH còn nợ: {fVND(c)}đ</div>})()}
                </div>
              )}
              {/* CP NV/ĐT */}
              {(Number(popupChiTiet.ds?.['Chi phí VC']||0)+Number(popupChiTiet.ds?.['Chi phí lắp đặt']||0)+Number(popupChiTiet.ds?.['Thưởng chuyến']||0))>0&&(
                <div style={{background:popupChiTiet.gh?.['Hình thức giao']==='Đối tác'?'#FFF7ED':'#F0F9FF',borderRadius:'8px',padding:'12px 14px',
                  border:`1px solid ${popupChiTiet.gh?.['Hình thức giao']==='Đối tác'?'#FED7AA':'#BAE6FD'}`}}>
                  <div style={{fontWeight:700,fontSize:'13px',marginBottom:'8px',color:popupChiTiet.gh?.['Hình thức giao']==='Đối tác'?'#C2410C':'#0369A1'}}>
                    {popupChiTiet.gh?.['Hình thức giao']==='Đối tác'?'💸 Chi phí trả đối tác':'🎁 CP giao hàng cho NV'}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                    {[['🚚 CP vận chuyển',popupChiTiet.ds?.['Chi phí VC']],['🔧 CP lắp đặt',popupChiTiet.ds?.['Chi phí lắp đặt']],['⭐ Thưởng chuyến',popupChiTiet.ds?.['Thưởng chuyến']]].map(([lb,val]:any)=>Number(val||0)>0&&(
                      <div key={lb} style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                        <span style={{color:'#6B7280'}}>{lb}</span><span style={{fontWeight:600}}>{fVND(Number(val||0))}đ</span>
                      </div>
                    ))}
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px',fontWeight:800,borderTop:'1px solid #E5E7EB',paddingTop:'6px'}}>
                      <span>Tổng:</span>
                      <span style={{color:'#DC2626'}}>{fVND(Number(popupChiTiet.ds?.['Chi phí VC']||0)+Number(popupChiTiet.ds?.['Chi phí lắp đặt']||0)+Number(popupChiTiet.ds?.['Thưởng chuyến']||0))}đ</span>
                    </div>
                  </div>
                </div>
              )}
              {/* Ngày ĐS + Ghi chú */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div style={{padding:'10px 12px',background:'#F8FAFC',borderRadius:'8px',border:'1px solid #E5E7EB'}}>
                  <div style={{fontSize:'11px',color:'#6B7280',marginBottom:'3px'}}>📅 Ngày đối soát</div>
                  <div style={{fontWeight:600,fontSize:'13px'}}>{popupChiTiet.ds?.['Ngày đối soát']?new Date(popupChiTiet.ds['Ngày đối soát']).toLocaleDateString('vi-VN'):'—'}</div>
                </div>
                <div style={{padding:'10px 12px',background:'#F8FAFC',borderRadius:'8px',border:'1px solid #E5E7EB'}}>
                  <div style={{fontSize:'11px',color:'#6B7280',marginBottom:'3px'}}>📝 Ghi chú</div>
                  <div style={{fontWeight:600,fontSize:'13px'}}>{popupChiTiet.ds?.['Ghi chú']||'—'}</div>
                </div>
              </div>
              {/* Tình trạng nộp tiền */}
              {Number(popupChiTiet.ds?.['Đã thu được']||0)>0&&(
                <div style={{padding:'10px 14px',borderRadius:'8px',
                  background:popupChiTiet.ds['Tình trạng nộp tiền']==='Đã nộp'?'#D1FAE5':'#FEF3C7',
                  border:`1px solid ${popupChiTiet.ds['Tình trạng nộp tiền']==='Đã nộp'?'#6EE7B7':'#FCD34D'}`,
                  display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'13px',fontWeight:700,color:popupChiTiet.ds['Tình trạng nộp tiền']==='Đã nộp'?'#065F46':'#92400E'}}>
                    {popupChiTiet.ds['Tình trạng nộp tiền']==='Đã nộp'?'✅ Đã nộp tiền thu hộ về cửa hàng':'⏳ Chưa nộp tiền thu hộ về cửa hàng'}
                  </span>
                  {popupChiTiet.ds['Ngày nộp tiền']&&<span style={{fontSize:'12px',color:'#6B7280'}}>{new Date(popupChiTiet.ds['Ngày nộp tiền']).toLocaleDateString('vi-VN')}</span>}
                </div>
              )}
              {/* Kết quả */}
              {(()=>{
                const KQ_LIST=[{value:'Thành công',label:'✅ Thành công',color:'#065F46',bg:'#D1FAE5'},{value:'Huỷ — khách trả CP',label:'❌ Huỷ — khách trả CP',color:'#92400E',bg:'#FEF3C7'},{value:'Huỷ — cửa hàng chịu CP',label:'❌ Huỷ — CH chịu CP',color:'#991B1B',bg:'#FEE2E2'},{value:'Đổi hàng — khách trả CP',label:'🔄 Đổi — khách trả',color:'#1E40AF',bg:'#DBEAFE'},{value:'Đổi hàng — cửa hàng chịu',label:'🔄 Đổi — CH chịu',color:'#6D28D9',bg:'#EDE9FE'}]
                const kq=KQ_LIST.find(k=>k.value===popupChiTiet.ds?.['Kết quả'])
                return <div style={{padding:'10px 14px',borderRadius:'8px',textAlign:'center',background:kq?.bg||'#D1FAE5',border:`1px solid ${kq?.color||'#065F46'}22`}}>
                  <span style={{fontSize:'14px',fontWeight:700,color:kq?.color||'#065F46'}}>{kq?.label||popupChiTiet.ds?.['Kết quả']||'—'}</span>
                </div>
              })()}
            </div>
            <button onClick={()=>setPopupChiTiet(null)} style={{width:'100%',marginTop:'16px',padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>✕ Đóng</button>
          </div>
        </div>
      )}


    </div>
  )
}


      {/* ══ MODAL XÓA NV ══ */}
      {xoaNV&&(
        <div className="ov" onClick={()=>{setXoaNV(null);setXoaCheck(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'420px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>{xoaNV['Loại']==='Đối tác'?'Xóa đối tác':'Xóa nhân viên'}</h2>
            <p style={{fontSize:'14px',fontWeight:700,color:'var(--primary)',margin:'0 0 4px'}}>{xoaNV['Họ và Tên']}</p>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px'}}>{xoaNV['Mã nhân viên']} · {xoaNV['Vai trò']||'—'}</p>
            {loadingXoa&&<div style={{padding:'16px',color:'var(--text-secondary)',fontSize:'13px'}}>⏳ Đang kiểm tra dữ liệu...</div>}
            {!loadingXoa&&xoaCheck&&(
              xoaCheck.coTheXoa?(
                <div>
                  <div style={{padding:'12px',borderRadius:'8px',background:'#D1FAE5',border:'1px solid #6EE7B7',marginBottom:'16px',fontSize:'13px',color:'#065F46',fontWeight:600}}>
                    ✅ Chưa có dữ liệu liên quan — có thể xóa an toàn
                  </div>
                  <p style={{fontSize:'12px',color:'#DC2626',background:'#FEF2F2',padding:'8px 12px',borderRadius:'6px',margin:'0 0 16px'}}>
                    ⚠️ Hành động này không thể hoàn tác!
                  </p>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={xacNhanXoa} disabled={loadingXoa}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loadingXoa?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                      {loadingXoa?'⏳ Đang xóa...':'🗑️ Xác nhận xóa'}
                    </button>
                    <button onClick={()=>{setXoaNV(null);setXoaCheck(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{padding:'12px',borderRadius:'8px',background:'#FEF3C7',border:'1px solid #FCD34D',marginBottom:'16px',fontSize:'13px',color:'#92400E'}}>
                    <div style={{fontWeight:700,marginBottom:'6px'}}>❌ Không thể xóa vì:</div>
                    <ul style={{margin:0,paddingLeft:'16px',textAlign:'left'}}>
                      {xoaCheck.lyDo.map((l:string,i:number)=><li key={i}>{l}</li>)}
                    </ul>
                  </div>
                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',marginBottom:'16px',fontSize:'12px',color:'#1E40AF'}}>
                    💡 Thay vào đó, hãy đổi trạng thái sang <strong>Nghỉ việc</strong> để ẩn khỏi danh sách hoạt động.
                  </div>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={()=>{setXoaNV(null);setXoaCheck(null);moSua(xoaNV)}}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'#D97706',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
                      ✏️ Đổi sang Nghỉ việc
                    </button>
                    <button onClick={()=>{setXoaNV(null);setXoaCheck(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Đóng</button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      )}


function Btn({children,active,disabled,onClick}:any){
  return <button onClick={onClick} disabled={disabled} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:active?'var(--primary)':'var(--border)',background:active?'var(--primary)':disabled?'#F9FAFB':'white',color:active?'white':disabled?'#CCC':'var(--text-secondary)',cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:active?700:400,minWidth:'32px'}}>{children}</button>
}
