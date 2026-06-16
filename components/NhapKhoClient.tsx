'use client'
// components/NhapKhoClient.tsx
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){if(!s)return'—';try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}catch{return s}}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const HUONG_XU_LY:Record<string,string[]> = {
  'Lỗi':             ['Trả lại NCC', 'Bán giảm giá'],
  'Thiếu phụ kiện':  ['Trả lại NCC', 'Bổ sung phụ kiện'],
  'Hỏng phụ kiện':   ['Trả lại NCC', 'Bổ sung phụ kiện'],
  'Sai màu':         ['Trả lại NCC', 'Nhập kho để bán'],
  'Sai kích thước':  ['Trả lại NCC', 'Nhập kho để bán'],
}

const TT_COLOR:Record<string,{bg:string,c:string}> = {
  'Đủ':        {bg:'#D1FAE5',c:'#065F46'},
  'Thiếu':     {bg:'#FEF3C7',c:'#92400E'},
  'Thừa':      {bg:'#DBEAFE',c:'#1E40AF'},
  'Có hàng lỗi': {bg:'#FEE2E2',c:'#991B1B'},
  'Đã xử lý':  {bg:'#E5E7EB',c:'#374151'},
}
function getTTColor(tt:string):{bg:string,c:string}{
  if(tt==='Đủ') return {bg:'#D1FAE5',c:'#065F46'}
  if(tt==='Thiếu'||tt.startsWith('Thiếu')) return {bg:'#FEF3C7',c:'#92400E'}
  if(tt==='Thừa'||tt.startsWith('Thừa')) return {bg:'#DBEAFE',c:'#1E40AF'}
  if(tt==='Có hàng lỗi') return {bg:'#FEE2E2',c:'#991B1B'}
  if(tt==='Đã xử lý') return {bg:'#E5E7EB',c:'#374151'}
  return {bg:'#F3F4F6',c:'#374151'}
}
const SO_DONG = 10

export default function NhapKhoClient({nhapKhoList,nccList,sanPhamList,datHangList,danhMucList=[],chuongTrinhList=[],user}:{
  nhapKhoList:any[]; nccList:any[]; sanPhamList:any[]; datHangList:any[]; danhMucList:any[]; chuongTrinhList?:any[]; user:UserSession
}) {
  const router = useRouter()
  const isOwner = user.vaiTro === 'Chủ cửa hàng'

  // ── Helper tháng hiện tại ─────────────────────────────────
  function thangNay():{tu:string,den:string}{
    const d=new Date()
    const y=d.getFullYear(), m=d.getMonth()+1
    const tu=`${y}-${String(m).padStart(2,'0')}-01`
    const den=`${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`
    return {tu,den}
  }
  function thangTruoc():{tu:string,den:string}{
    const d=new Date()
    const y=d.getMonth()===0?d.getFullYear()-1:d.getFullYear()
    const m=d.getMonth()===0?12:d.getMonth()
    const tu=`${y}-${String(m).padStart(2,'0')}-01`
    const den=`${y}-${String(m).padStart(2,'0')}-${String(new Date(y,m,0).getDate()).padStart(2,'0')}`
    return {tu,den}
  }

  async function baoCaoVanDe(){
    if(!popupBaoCao) return
    if(bcSoLuong<=0){showMsg2('Nhập số lượng > 0',false);return}
    setBcLoading(true)
    try{
      const res=await fetch('/api/xu-ly-hang',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          maPhieuNhap:popupBaoCao['Mã phiếu nhập'],
          maNCC:popupBaoCao['Mã NCC'],
          maSP:popupBaoCao['Mã SP'],
          soLuong:bcSoLuong,
          loaiVanDe:bcLoai,
          huongXuLy:bcHuong,
          ghiChu:bcGhiChu,
          nguoiBaoCao:user.hoTen||user.tenDangNhap,
          ngayXuLy:new Date().toISOString().split('T')[0],
        })})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message)
      await fetch('/api/san-pham/cap-nhat-ton',{method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({maSP:popupBaoCao['Mã SP'], delta:-bcSoLuong})
      }).catch(()=>{})
      setSpLocal(prev=>prev.map(s=>s['Mã SP']===popupBaoCao['Mã SP']
        ?{...s,'Tồn kho':Math.max(0,Number(s['Tồn kho']||0)-bcSoLuong)}:s))
      await fetch('/api/nhap-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(popupBaoCao['Id']||popupBaoCao['id']),
          'Mã SP':popupBaoCao['Mã SP'],
          'Tình trạng hàng':'Có hàng lỗi',
          'Ghi chú':(popupBaoCao['Ghi chú']||'')+` | ${bcLoai} (${bcSoLuong} SP): ${bcHuong}`,
        })})
      setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(popupBaoCao['Id']||popupBaoCao['id'])
        ?{...d,'Tình trạng hàng':'Có hàng lỗi'}:d))
      showMsg2(`✅ Đã tạo phiếu xử lý ${d.maXL}`)
      setPopupBaoCao(null);setBcLoai('Lỗi');setBcHuong('Trả NCC');setBcSoLuong(0);setBcGhiChu('')
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setBcLoading(false)}
  }

  async function taoDonBu(item:any){
    const slDat = Number(item['Số lượng đặt']||0)
    const slNhan = Number(item['Số lượng thực nhận']||0)
    const slBu = slDat - slNhan
    if(slBu<=0){showMsg2('Không có hàng thiếu để tạo đơn bù',false);return}
    const sp = spMap[item['Mã SP']]||{}
    try{
      const res=await fetch('/api/dat-hang-ncc',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({maNCC:item['Mã NCC'],ngayDat:new Date().toISOString().split('T')[0],
          ghiChu:`Đơn bù từ phiếu nhập ${item['Mã phiếu nhập']}`,
          items:[{maSP:item['Mã SP'],soLuong:slBu,giaNhap:Number(item['Giá nhập thực tế']||0),ngayVe:'',ghiChu:'Hàng thiếu cần bù'}]
        })})
      const d=await res.json()
      if(!res.ok)throw new Error(d.message)
      showMsg2(`✅ Đã tạo đơn bù ${d.maDH} — ${slBu} ${sp['Đơn vị tính']||'cái'} còn thiếu`)
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi tạo đơn bù'),false)}
  }

  async function xuLyPhieu(item:any, coTraHang:boolean){
    const slCanTru = item['_slTraThua'] ? Number(item['_slTraThua']) : 0
    try{
      const res=await fetch('/api/nhap-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(item['Id']||item['id']),
          slThucNhanCu: undefined,
          'Mã SP': item['Mã SP'],
          'Tình trạng hàng':'Đã xử lý',
          'Ghi chú':(item['Ghi chú']||'')+(coTraHang?` | Đã trả ${slCanTru} SP cho NCC`:' | Đã xử lý'),
        })})
      if(!res.ok)throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(item['Id']||item['id'])
        ?{...d,'Tình trạng hàng':'Đã xử lý'}:d))
      if(coTraHang&&slCanTru>0){
        await fetch('/api/san-pham/cap-nhat-ton',{method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({maSP:item['Mã SP'], delta:-slCanTru})
        }).catch(()=>{})
      }
      showMsg2(`✅ Đã cập nhật: ${item['Mã phiếu nhập']}`)
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  const [popupXuLy,   setPopupXuLy]   = useState<any>(null)
  const [confirmXL,   setConfirmXL]   = useState<{item:any,coTraHang:boolean,label:string,moTa:string}|null>(null)
  const [popupBaoCao, setPopupBaoCao] = useState<any>(null)
  const [bcLoai,    setBcLoai]    = useState('Lỗi')
  const [bcHuong,   setBcHuong]   = useState('Trả NCC')
  const [bcSoLuong, setBcSoLuong] = useState(0)
  const [bcGhiChu,  setBcGhiChu]  = useState('')
  const [bcLoading, setBcLoading] = useState(false)

  const [local,    setLocal]    = useState(nhapKhoList)
  const [spLocal,  setSpLocal]  = useState(sanPhamList)
  const [nccLocal, setNccLocal] = useState(nccList)

  const [search,         setSearch]         = useState('')
  const [filterTT,       setFilterTT]       = useState('Tất cả')
  const [filterLoaiNhap, setFilterLoaiNhap] = useState('Tất cả')
  const [filterNCC,      setFilterNCC]      = useState('Tất cả')
  // ── BỘ LỌC NGÀY — mặc định tháng hiện tại ───────────────
  const [tuNgay,  setTuNgay]  = useState(()=>thangNay().tu)
  const [denNgay, setDenNgay] = useState(()=>thangNay().den)
  const [trang,     setTrang]     = useState(1)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState<any>(null)
  const [xoaItem,   setXoaItem]   = useState<any>(null)
  const [confirmTraCP, setConfirmTraCP] = useState<any>(null)
  const [ngayTraCP, setNgayTraCP] = useState(new Date().toISOString().split('T')[0])
  const [hinhThucTraCP, setHinhThucTraCP] = useState<'Tiền mặt'|'Chuyển khoản'>('Tiền mặt')
  const [loading,   setLoading]   = useState(false)
  const [msgModal,  setMsgModal]  = useState('')
  const [msgModalOk,setMsgModalOk]= useState(true)

  const [loaiNhap, setLoaiNhap] = useState<'truc-tiep'|'tu-don'>('truc-tiep')

  const [maNCC,     setMaNCC]     = useState('')
  const [maCTChon,  setMaCTChon]  = useState('')
  const [tenNCC,    setTenNCC]    = useState('')
  const [ngayNhap,  setNgayNhap]  = useState(new Date().toISOString().split('T')[0])
  const [ghiChu,    setGhiChu]    = useState('')

  const [maSP,       setMaSP]       = useState('')
  const [tenSP,      setTenSP]      = useState('')
  const [slThucNhan, setSlThucNhan] = useState<number>(1)
  const [giaNhapNCC, setGiaNhapNCC] = useState<number>(0)
  const [cpvcKho,    setCpvcKho]    = useState<number>(0)
  const [hinhThucCPVC, setHinhThucCPVC] = useState<'Tiền mặt'|'Chuyển khoản'>('Tiền mặt')
  const [trangThaiCPVC, setTrangThaiCPVC] = useState<'Đã trả'|'Chưa trả'>('Đã trả')
  const [tinhTrang,  setTinhTrang]  = useState('Đủ')
  const [slLoi,      setSlLoi]      = useState<number>(0)
  const [slChoiPK,   setSlChoiPK]   = useState<number>(0)
  const [dsSP, setDsSP] = useState<any[]>([])

  const [maDonChon, setMaDonChon] = useState('')
  const [spItems,   setSpItems]   = useState<any[]>([])

  const [qNCC,     setQNCC]     = useState('')
  const [qSP,      setQSP]      = useState('')
  const [showNCC,  setShowNCC]  = useState(false)
  const [showSP,   setShowSP]   = useState(false)

  const [showNewNCC,   setShowNewNCC]   = useState(false)
  const [newTenNCC,    setNewTenNCC]    = useState('')
  const [newMaNCC2,    setNewMaNCC2]    = useState('')
  const [newSdtNCC,    setNewSdtNCC]    = useState('')
  const [newDiaChiNCC, setNewDiaChiNCC] = useState('')
  const [newStkNCC,    setNewStkNCC]    = useState('')
  const [savingNCC,    setSavingNCC]    = useState(false)
  const [msgNCC,       setMsgNCC]       = useState('')
  const [msgNCCOk,     setMsgNCCOk]     = useState(true)

  const [showNewSP,  setShowNewSP]  = useState(false)
  const [newMaSP,    setNewMaSP]    = useState('')
  const [newTenSP,   setNewTenSP]   = useState('')
  const [newLoai,    setNewLoai]    = useState('Phổ thông')
  const [newDonVi,   setNewDonVi]   = useState('Cái')
  const [newGiaNCC,  setNewGiaNCC]  = useState(0)
  const [newCpvc,    setNewCpvc]    = useState(0)
  const [newGiaBuon, setNewGiaBuon] = useState(0)
  const [newGiaLe,   setNewGiaLe]   = useState(0)
  const [newTonKho,  setNewTonKho]  = useState(0)
  const [newNguong,  setNewNguong]  = useState(1)
  const [newThongSo, setNewThongSo] = useState('')
  const [newGhiChuSP,setNewGhiChuSP]= useState('')
  const [newDanhMucSP,setNewDanhMucSP]= useState('')
  const [savingSP,   setSavingSP]   = useState(false)
  // Danh mục
  const [danhMucLocal2, setDanhMucLocal2] = useState(danhMucList)
  const [showThemDM2,   setShowThemDM2]   = useState(false)
  const [newTenDM2,     setNewTenDM2]     = useState('')
  const [loadingDM2,    setLoadingDM2]    = useState(false)
  const [msgDM2,        setMsgDM2]        = useState('')
  const danhMucNames2 = danhMucLocal2.map((d:any)=>d['Tên danh mục']||'')

  async function themDM2(){
    if(!newTenDM2.trim()) return
    setLoadingDM2(true)
    try{
      const res=await fetch('/api/danh-muc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenDanhMuc:newTenDM2.trim()})})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message)
      setDanhMucLocal2((p:any[])=>[...p,{...d.data,'Tên danh mục':newTenDM2.trim()}])
      setNewDanhMucSP(newTenDM2.trim())
      setNewTenDM2('')
      setShowThemDM2(false)
      setMsgDM2('✅ Đã thêm: '+newTenDM2.trim())
      setTimeout(()=>setMsgDM2(''),3000)
    }catch(e:any){setMsgDM2('❌ '+(e.message||'Lỗi'))}
    finally{setLoadingDM2(false)}
  }

  const nccMap = useMemo(()=>{const m:Record<string,any>={};nccLocal.forEach(n=>{m[n['Mã NCC']||'']=n});return m},[nccLocal])
  const giaNhapGanNhat = useMemo(()=>{
    const m:Record<string,number>={}
    for(const item of [...local].reverse()){
      const maSP=item['Mã SP']||''
      const giaNCC=Number(item['Giá nhập thực tế']||0)
      if(maSP&&giaNCC>0) m[maSP]=giaNCC
    }
    return m
  },[local])
  const spMap = useMemo(()=>{const m:Record<string,any>={};spLocal.forEach(s=>{m[s['Mã SP']||'']=s});return m},[spLocal])

  function showMsg2(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}
  function showMsgM(t:string,ok=true){setMsgModal(t);setMsgModalOk(ok);setTimeout(()=>setMsgModal(''),5000)}

  const tongNhap = loaiNhap==='truc-tiep'
    ? slThucNhan*(giaNhapNCC+cpvcKho)
    : spItems.filter(it=>it.checked).reduce((s:number,it:any)=>s+it.sl*(it.giaNCC+it.cpvc),0)

  const donNCCGrouped = useMemo(()=>{
    const g:Record<string,any[]>={}
    datHangList.forEach((d:any)=>{
      const full=d['Mã đặt hàng']||''
      const parts=full.split('-')
      const ma=parts.length>=3?`DH-NCC-${parts[2]}`:full
      if(!g[ma])g[ma]=[]
      g[ma].push(d)
    })
    return g
  },[datHangList])

  function chonDon(maDon:string){
    const grp=donNCCGrouped[maDon]||[]
    if(!grp.length)return
    const grpXN=grp.filter((d:any)=>d['Trạng thái']==='Đã xác nhận')
      .sort((a:any,b:any)=>(a['Mã đặt hàng']||'').localeCompare(b['Mã đặt hàng']||''))
    if(!grpXN.length){showMsgM('Không có SP nào đã xác nhận trong đơn này',false);return}
    setMaDonChon(maDon)
    const nccMa=grpXN[0]['Mã NCC']||''
    setMaNCC(nccMa)
    setTenNCC(nccMap[nccMa]?.['Tên NCC']||nccMa)
    setSpItems(grpXN.map((d:any)=>({
      maSP:d['Mã SP']||'',
      tenSP:spMap[d['Mã SP']]?.['Tên sản phẩm']||d['Mã SP']||'',
      donVi:spMap[d['Mã SP']]?.['Đơn vị tính']||'',
      slDat:Number(d['Số lượng đặt']||0),
      sl:Number(d['Số lượng đặt']||0),
      giaNCC:Number(spMap[d['Mã SP']]?.['Giá nhập NCC']||d['Giá nhập dự kiến']||0),
      cpvc:Number(spMap[d['Mã SP']]?.['CPVC về kho']||0),
      hinhThucCPVC:'Tiền mặt',
      trangThaiCPVC:'Đã trả',
      tinhTrang:'Đủ',
      ghiChu:'',
      checked:true,
    })))
  }

  function updItem(i:number,k:string,v:any){
    setSpItems(p=>p.map((it,idx)=>{
      if(idx!==i) return it
      const updated={...it,[k]:v}
      if(k==='sl'){
        const sl=Number(v)
        const slDat=Number(it.slDat)||0
        if(sl===slDat) updated.tinhTrang='Đủ'
        else if(sl<slDat) updated.tinhTrang=`Thiếu ${slDat-sl}`
        else updated.tinhTrang=`Thừa ${sl-slDat}`
      }
      return updated
    }))
  }

  function addSPToList(){
    if(!maSP){showMsgM('Chọn sản phẩm trước',false);return}
    if(slThucNhan<=0){showMsgM('Nhập số lượng > 0',false);return}
    setDsSP(p=>[...p,{maSP,tenSP,slThucNhan,giaNhapNCC,cpvcKho,tinhTrang:'Đủ',slLoi,slChoiPK,ghiChu:'',_id:Date.now()}])
    setMaSP('');setTenSP('');setQSP('');setSlThucNhan(1);setGiaNhapNCC(0);setCpvcKho(0);setTinhTrang('Đủ')
    showMsgM('✅ Đã thêm SP vào danh sách',true)
  }
  function removeSPFromList(id:number){setDsSP(p=>p.filter((it:any)=>it._id!==id))}
  function updDsSP(id:number,k:string,v:any){setDsSP(p=>p.map((it:any)=>it._id===id?{...it,[k]:v}:it))}

  function resetForm(){
    setLoaiNhap('truc-tiep')
    setMaNCC('');setTenNCC('');setQNCC('')
    setNgayNhap(new Date().toISOString().split('T')[0])
    setGhiChu('')
    setMaSP('');setTenSP('');setQSP('');setDsSP([])
    setSlThucNhan(1);setGiaNhapNCC(0);setCpvcKho(0);setHinhThucCPVC('Tiền mặt');setTrangThaiCPVC('Đã trả');setTinhTrang('Đủ');setSlLoi(0);setSlChoiPK(0)
    setMaDonChon('');setSpItems([]);setMaCTChon('')
    setShowNCC(false);setShowSP(false)
    setMsgModal('')
    setEditItem(null)
  }

  async function luuPhieu(){
    if(!maNCC){showMsgM('Vui lòng chọn nhà cung cấp',false);return}
    setLoading(true)
    try{
      if(editItem){
        const res=await fetch('/api/nhap-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({
            id:Number(editItem['Id']||editItem['id']),
            slThucNhanCu:Number(editItem['Số lượng thực nhận']||0),
            'Mã NCC':maNCC,'Mã SP':maSP,
            'Ngày nhập':ngayNhap,'Số lượng đặt':0,
            'Giá nhập thực tế':giaNhapNCC+cpvcKho,
            'Số lượng thực nhận':slThucNhan,
            'CP vận chuyển về kho':cpvcKho,
            'Hình thức TT CP VC':cpvcKho>0?hinhThucCPVC:'',
            'Trạng thái CP VC':cpvcKho>0?trangThaiCPVC:'',
            'Tình trạng hàng':tinhTrang,'Ghi chú':ghiChu,
          })})
        if(!res.ok)throw new Error((await res.json()).message)
        setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(editItem['Id']||editItem['id'])
          ?{...d,'Mã NCC':maNCC,'Mã SP':maSP,'Ngày nhập':ngayNhap,
            'Số lượng thực nhận':slThucNhan,'Giá nhập thực tế':giaNhapNCC+cpvcKho,
            'Tổng tiền hàng':slThucNhan*(giaNhapNCC+cpvcKho),
            'CP vận chuyển về kho':cpvcKho,'Tình trạng hàng':tinhTrang,'Ghi chú':ghiChu}:d))
        showMsg2('✅ Đã cập nhật phiếu nhập')
      } else if(loaiNhap==='tu-don'){
        const valid=spItems.filter(it=>it.checked&&it.sl>0)
        if(!valid.length){showMsgM('Chọn ít nhất 1 sản phẩm để nhập',false);setLoading(false);return}
        let soTao=0
        for(const it of valid){
          const ttLuu = it.tinhTrang.startsWith('Thiếu') ? 'Thiếu'
            : it.tinhTrang.startsWith('Thừa') ? 'Thừa'
            : it.tinhTrang
          const res=await fetch('/api/nhap-kho',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({maNCC,maSP:it.maSP,maDatHang:maDonChon,maCT:maCTChon||'',ngayNhap,
              slDat:it.slDat,slThucNhan:it.sl,giaNhapTT:it.giaNCC,cpVC:it.cpvc,
              hinhThucCPVC:it.cpvc>0?(it.hinhThucCPVC||'Tiền mặt'):'',
              trangThaiCPVC:it.cpvc>0?(it.trangThaiCPVC||'Đã trả'):'',
              tinhTrang:ttLuu,
              ghiChu:(it.ghiChu||ghiChu)+(it.tinhTrang.startsWith('Thiếu')||it.tinhTrang.startsWith('Thừa')?` [${it.tinhTrang}]`:''),
              nguoiNhap:user.hoTen||user.tenDangNhap})})
          const d=await res.json()
          if(res.ok){
            soTao++
            const newRec={...((d.data)||{}),'Mã phiếu nhập':d.maPhieu||'','Mã NCC':maNCC,'Mã SP':it.maSP,'Ngày nhập':ngayNhap,'Số lượng đặt':it.slDat,'Số lượng thực nhận':it.sl,'Giá nhập thực tế':it.giaNCC,'Tổng tiền hàng':it.sl*it.giaNCC,'CP vận chuyển về kho':it.cpvc,'Tình trạng hàng':ttLuu,'Ghi chú':it.ghiChu||ghiChu,'Người nhập':user.hoTen||user.tenDangNhap}
            setLocal(prev=>[newRec,...prev])
          }
        }
        showMsg2(`✅ Đã tạo ${soTao} phiếu nhập từ đơn ${maDonChon}`)
        if(soTao>0&&maDonChon){
          for(const it of valid){
            const donItem=donNCCGrouped[maDonChon]?.find((d:any)=>d['Mã SP']===it.maSP)
            if(donItem){
              const id=donItem['Id']||donItem['id']
              const ttMoi = it.tinhTrang.startsWith('Thiếu') ? 'Nhập thiếu'
                : it.tinhTrang.startsWith('Thừa') ? 'Nhập thừa'
                : 'Đã nhập kho'
              if(id) await fetch('/api/dat-hang-ncc',{method:'PATCH',headers:{'Content-Type':'application/json'},
                body:JSON.stringify({id:Number(id),'Trạng thái':ttMoi})}).catch(()=>{})
              const maDonGoc = donItem['Mã đơn gốc']||''
              if(maDonGoc&&ttMoi==='Đã nhập kho'){
                const donGocItems = datHangList.filter((d:any)=>
                  (d['Mã đặt hàng']||'').startsWith(maDonGoc)&&d['Mã SP']===it.maSP)
                for(const dg of donGocItems){
                  const idGoc=dg['Id']||dg['id']
                  if(idGoc) await fetch('/api/dat-hang-ncc',{method:'PATCH',headers:{'Content-Type':'application/json'},
                    body:JSON.stringify({id:Number(idGoc),'Trạng thái':'Đã nhập kho'})}).catch(()=>{})
                }
              }
            }
          }
        }
        router.refresh()
      } else {
        const allSP = dsSP.length > 0 ? dsSP : (maSP&&slThucNhan>0 ? [{maSP,tenSP,slThucNhan,giaNhapNCC,cpvcKho,tinhTrang:'Đủ',slLoi:slLoi||0,slChoiPK:slChoiPK||0,ghiChu,_id:0}] : [])
        if(!maNCC){showMsgM('Vui lòng chọn nhà cung cấp',false);setLoading(false);return}
        if(!allSP.length){showMsgM('Thêm ít nhất 1 sản phẩm',false);setLoading(false);return}
        const results2 = await Promise.all(allSP.map(async sp=>{
          const res=await fetch('/api/nhap-kho',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({maNCC,maSP:sp.maSP,maDatHang:'',maCT:maCTChon||'',ngayNhap,slDat:0,
              slThucNhan:sp.slThucNhan,giaNhapTT:sp.giaNhapNCC,cpVC:sp.cpvcKho,
              hinhThucCPVC:sp.cpvcKho>0?hinhThucCPVC:'',
              trangThaiCPVC:sp.cpvcKho>0?trangThaiCPVC:'',
              slLoi:0,slChoiPK:0,tinhTrang:'Đủ',
              ghiChu:sp.ghiChu||ghiChu,nguoiNhap:user.hoTen||user.tenDangNhap})})
          const d=await res.json()
          if(res.ok){
            const newRec2={...((d.data)||{}),'Mã phiếu nhập':d.maPhieu||'','Mã NCC':maNCC,'Mã SP':sp.maSP,'Ngày nhập':ngayNhap,'Số lượng đặt':0,'Số lượng thực nhận':sp.slThucNhan,'Giá nhập thực tế':sp.giaNhapNCC,'Tổng tiền hàng':sp.slThucNhan*sp.giaNhapNCC,'CP vận chuyển về kho':sp.cpvcKho,'Tình trạng hàng':'Đủ','Ghi chú':sp.ghiChu||ghiChu,'Người nhập':user.hoTen||user.tenDangNhap}
            setLocal(prev=>[newRec2,...prev])
            return true
          }
          return false
        }))
        const soTao2 = results2.filter(Boolean).length
        showMsg2(`✅ Đã tạo ${soTao2} phiếu nhập`)
      }
      setShowModal(false);resetForm()
    }catch(e:any){showMsgM('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function xacNhanTraCP(){
    if(!confirmTraCP)return
    try{
      const res=await fetch('/api/nhap-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(confirmTraCP['Id']||confirmTraCP['id']),
          'Trạng thái CP VC':'Đã trả',
          'Hình thức TT CP VC':hinhThucTraCP,
          'Ngày trả CP VC':ngayTraCP,
        })})
      if(!res.ok)throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(confirmTraCP['Id']||confirmTraCP['id'])
        ?{...d,'Trạng thái CP VC':'Đã trả','Hình thức TT CP VC':hinhThucTraCP,'Ngày trả CP VC':ngayTraCP}:d))
      showMsg2('✅ Đã ghi nhận thanh toán CP VC')
      setConfirmTraCP(null)
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  async function xacNhanXoa(){
    if(!xoaItem)return
    try{
      const res=await fetch(`/api/nhap-kho?id=${xoaItem['Id']||xoaItem['id']}&maSP=${xoaItem['Mã SP']||''}&sl=${xoaItem['Số lượng thực nhận']||0}`,{method:'DELETE'})
      if(!res.ok)throw new Error((await res.json()).message)
      setLocal(prev=>prev.filter(d=>(d['Id']||d['id'])!==(xoaItem['Id']||xoaItem['id'])))
      setSpLocal(prev=>prev.map(s=>s['Mã SP']===xoaItem['Mã SP']
        ?{...s,'Tồn kho':Math.max(0,Number(s['Tồn kho']||0)-Number(xoaItem['Số lượng thực nhận']||0))}:s))
      showMsg2('✅ Đã xóa phiếu nhập');setXoaItem(null)
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  async function luuNCC(){
    if(!newTenNCC.trim()){showMsgM('Nhập tên NCC',false);return}
    if(newSdtNCC.trim()){
      const digits=newSdtNCC.replace(/\D/g,'')
      if(digits.length!==10){setMsgNCC('⚠️ SĐT phải đúng 10 số (đang có '+digits.length+' số)');setMsgNCCOk(false);return}
      if(!digits.startsWith('0')){setMsgNCC('⚠️ SĐT phải bắt đầu bằng số 0');setMsgNCCOk(false);return}
    }
    setSavingNCC(true)
    try{
      const res=await fetch('/api/nha-cung-cap',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({'Mã NCC':newMaNCC2.trim()||undefined,'Tên NCC':newTenNCC.trim(),
          'Số điện thoại':newSdtNCC,'Địa chỉ':newDiaChiNCC,'Số TK ngân hàng':newStkNCC})})
      const d=await res.json()
      if(!res.ok)throw new Error(d.message)
      const nccMoi={...d.data,'Mã NCC':d.maNCC,'Tên NCC':newTenNCC}
      setNccLocal(p=>[nccMoi,...p])
      setMaNCC(d.maNCC);setTenNCC(newTenNCC);setQNCC(newTenNCC)
      setShowNewNCC(false)
      setNewTenNCC('');setNewMaNCC2('');setNewSdtNCC('');setNewDiaChiNCC('');setNewStkNCC('')
    }catch(e:any){showMsgM('❌ '+(e.message||'Lỗi'),false)}
    finally{setSavingNCC(false)}
  }

  async function luuSPMoi(){
    if(!newTenSP.trim()){showMsgM('Nhập tên SP',false);return}
    setSavingSP(true)
    try{
      const res=await fetch('/api/san-pham',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({'Mã SP':newMaSP.trim()||undefined,'Tên sản phẩm':newTenSP.trim(),
          'Danh mục':newDanhMucSP||'','Loại SP':newLoai,'Đơn vị tính':newDonVi,'Giá nhập NCC':newGiaNCC,'CPVC về kho':newCpvc,
          'Giá bán buôn':newGiaBuon,'Giá bán lẻ':newGiaLe,'Tồn kho':newTonKho,
          'Ngưỡng cảnh báo':newNguong,'Thông số kỹ thuật':newThongSo,'Ghi chú':newGhiChuSP})})
      const d=await res.json()
      if(!res.ok)throw new Error(d.message)
      const sp={...d.data,'Mã SP':d.data?.['Mã SP']||newMaSP,'Tên sản phẩm':newTenSP,'Đơn vị tính':newDonVi,'Giá nhập NCC':newGiaNCC,'CPVC về kho':newCpvc}
      setSpLocal(p=>[sp,...p])
      setMaSP(d.data?.['Mã SP']||newMaSP);setTenSP(newTenSP);setQSP(newTenSP)
      setGiaNhapNCC(newGiaNCC);setCpvcKho(newCpvc)
      setShowNewSP(false)
      setNewMaSP('');setNewTenSP('');setNewLoai('Phổ thông');setNewDonVi('Cái')
      setNewGiaNCC(0);setNewCpvc(0);setNewGiaBuon(0);setNewGiaLe(0)
      setNewTonKho(0);setNewNguong(1);setNewThongSo('');setNewGhiChuSP('');setNewDanhMucSP('')
    }catch(e:any){showMsgM('❌ '+(e.message||'Lỗi'),false)}
    finally{setSavingSP(false)}
  }

  function xuatPDFGop(items:any[]){
    if(!items.length) return
    const ncc=nccMap[items[0]['Mã NCC']]||{}
    const ngay=items[0]['Ngày nhập']
    const maDH=items[0]['Mã đặt hàng']||'Nhập trực tiếp'
    const tongTien=items.reduce((s,it)=>s+Number(it['Tổng tiền hàng']||0)+Number(it['CP vận chuyển về kho']||0),0)
    const rows=items.map(it=>{
      const sp=spMap[it['Mã SP']]||{}
      const tt=TT_COLOR[it['Tình trạng hàng']]||{bg:'#F3F4F6',c:'#374151'}
      return `<tr>
        <td>${it['Mã SP']||'—'}</td>
        <td>${sp['Tên sản phẩm']||it['Mã SP']||'—'}</td>
        <td style="text-align:center">${sp['Đơn vị tính']||'—'}</td>
        <td style="text-align:center">${it['Số lượng đặt']||0}</td>
        <td style="text-align:center;font-weight:bold">${it['Số lượng thực nhận']||0}</td>
        <td style="text-align:right">${fVND(it['Giá nhập thực tế'])}đ</td>
        <td style="text-align:right;font-weight:bold">${fVND(it['Tổng tiền hàng'])}đ</td>
        <td style="text-align:center;padding:3px 8px;border-radius:10px;background:${tt.bg};color:${tt.c}">${it['Tình trạng hàng']||'—'}</td>
      </tr>`
    }).join('')
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu nhập kho gộp</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;font-size:13px;}h1{font-size:20px;color:#1e3a5f;}
    .info{display:flex;gap:16px;margin:16px 0;}.box{flex:1;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;padding:12px 16px;}
    table{width:100%;border-collapse:collapse;margin-top:16px;}th{background:#1e3a5f;color:white;padding:8px 10px;font-size:12px;text-align:left;}
    td{padding:8px 10px;border-bottom:1px solid #E5E7EB;font-size:12px;}tr:nth-child(even) td{background:#F9FAFB;}
    @media print{button{display:none!important;}}</style></head><body>
    <div style="display:flex;justify-content:space-between">
      <div><h1>🪑 Nội Thất Tính Tuyết</h1><p style="color:#6B7280;margin:0">PHIẾU NHẬP KHO</p></div>
      <div style="text-align:right">
        <div style="font-size:13px;color:#6B7280">Mã đặt hàng: <strong>${maDH}</strong></div>
        <div style="font-size:13px;color:#6B7280">Ngày nhập: <strong>${fDate(ngay)}</strong></div>
      </div>
    </div>
    <div class="info">
      <div class="box"><b>📦 Nhà cung cấp</b><br>${ncc['Tên NCC']||items[0]['Mã NCC']||'—'}<br>Mã: ${items[0]['Mã NCC']||'—'}${ncc['Số điện thoại']?'<br>SĐT: '+ncc['Số điện thoại']:''}</div>
      <div class="box"><b>🛒 Thông tin nhập</b><br>Số lượng SP: ${items.length}<br>Người nhập: ${items[0]['Người nhập']||'—'}</div>
    </div>
    <table><thead><tr><th>Mã SP</th><th>Tên sản phẩm</th><th>ĐVT</th><th>SL đặt</th><th>SL nhận</th><th>Giá nhập</th><th>Thành tiền</th><th>Tình trạng</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div style="text-align:right;margin-top:12px;font-size:15px;font-weight:bold;color:#1e3a5f">Tổng cộng: ${fVND(tongTien)}đ</div>
    <div style="margin-top:40px;display:flex;justify-content:space-between">
      <div style="text-align:center;width:180px"><p style="font-weight:bold;margin-bottom:50px">Người giao hàng</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
      <div style="text-align:center;width:180px"><p style="font-weight:bold;margin-bottom:50px">Người nhận hàng</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
      <div style="text-align:center;width:180px"><p style="font-weight:bold;margin-bottom:50px">Thủ kho</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
    </div>
    <script>window.onload=()=>window.print()</script></body></html>`
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close()}
  }

  // ── FILTER (có lọc ngày) ──────────────────────────────────
  const filtered = useMemo(()=>{
    let r=local
    // Lọc theo khoảng ngày trước
    if(tuNgay)  r=r.filter(d=>(d['Ngày nhập']||'').split('T')[0]>=tuNgay)
    if(denNgay) r=r.filter(d=>(d['Ngày nhập']||'').split('T')[0]<=denNgay)
    if(filterTT!=='Tất cả') r=r.filter(d=>d['Tình trạng hàng']===filterTT)
    if(filterLoaiNhap==='Từ đơn NCC') r=r.filter(d=>{const m=d['Mã đặt hàng'];return m!=null&&m!==undefined&&String(m).trim()!==''})
    if(filterLoaiNhap==='Nhập trực tiếp') r=r.filter(d=>{const m=d['Mã đặt hàng'];return m==null||m===undefined||String(m).trim()===''})
    if(filterNCC!=='Tất cả') r=r.filter(d=>d['Mã NCC']===filterNCC)
    if(search.trim()){
      const q=boDau(search)
      r=r.filter(d=>boDau(d['Mã phiếu nhập']||'').includes(q)||boDau(d['Mã NCC']||'').includes(q)||boDau(nccMap[d['Mã NCC']]?.['Tên NCC']||'').includes(q)||boDau(d['Mã SP']||'').includes(q)||boDau(spMap[d['Mã SP']]?.['Tên sản phẩm']||'').includes(q))
    }
    return r
  },[local,filterTT,filterNCC,search,nccMap,spMap,tuNgay,denNgay,filterLoaiNhap])

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG,trangHT*SO_DONG)
  const nccDS     = useMemo(()=>[...new Set(local.map(d=>d['Mã NCC']).filter(Boolean))].map(ma=>({ma,ten:nccMap[ma]?.['Tên NCC']||ma})),[local,nccMap])

  // Tổng giá trị theo khoảng ngày (không phụ thuộc filter TT/NCC/search)
  const tongGiaTri = useMemo(()=>{
    let r=local
    if(tuNgay)  r=r.filter(d=>(d['Ngày nhập']||'').split('T')[0]>=tuNgay)
    if(denNgay) r=r.filter(d=>(d['Ngày nhập']||'').split('T')[0]<=denNgay)
    return r.reduce((s,d)=>s+Number(d['Tổng tiền hàng']||0)+Number(d['CP vận chuyển về kho']||0),0)
  },[local,tuNgay,denNgay])

  const soThieu = local.filter(d=>d['Tình trạng hàng']==='Có hàng lỗi').length

  // Label khoảng ngày để hiển thị
  const labelNgay = useMemo(()=>{
    if(!tuNgay&&!denNgay) return 'Tất cả thời gian'
    const tn=thangNay()
    if(tuNgay===tn.tu&&denNgay===tn.den){
      const d=new Date();return`Tháng ${d.getMonth()+1}/${d.getFullYear()}`
    }
    if(tuNgay&&denNgay) return`${fDate(tuNgay)} — ${fDate(denNgay)}`
    if(tuNgay) return`Từ ${fDate(tuNgay)}`
    return`Đến ${fDate(denNgay)}`
  },[tuNgay,denNgay])

  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .nk-t th,.nk-t td{padding:8px 10px;vertical-align:middle;}
        .nk-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .mk{background:white;border-radius:12px;padding:28px;width:100%;max-width:1150px;max-height:95vh;overflow-y:auto;}
        .mk2{background:white;border-radius:12px;padding:24px;width:100%;max-width:560px;max-height:90vh;overflow-y:auto;}
        .db{position:absolute;top:calc(100% + 2px);left:0;right:0;z-index:300;background:white;border:1px solid #E5E7EB;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);max-height:220px;overflow-y:auto;}
        .di{padding:9px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#EFF6FF;}
        label.lbl{display:block;font-size:11px;font-weight:600;margin-bottom:3px;}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>📦 Nhập kho</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
            {filtered.length} phiếu · <strong>{labelNgay}</strong> · Tổng giá trị nhập: <strong>{fVND(tongGiaTri)}đ</strong>
            {soThieu>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {soThieu} cần xử lý</span>}
          </p>
        </div>
        <button onClick={()=>{resetForm();setShowModal(true)}} style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>+ Tạo phiếu nhập kho</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'12px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'10px',marginBottom:'14px'}}>
        {[
          {icon:'📋',label:'Tổng phiếu',val:filtered.length,c:'var(--primary)'},
          {icon:'✅',label:'Đủ hàng',val:filtered.filter(d=>d['Tình trạng hàng']==='Đủ').length,c:'#065F46'},
          {icon:'⚠️',label:'Cần xử lý',val:soThieu,c:'#DC2626'},
          {icon:'💰',label:`Tổng giá trị nhập (${labelNgay})`,val:fVND(tongGiaTri)+'đ',c:'#1e3a5f'},
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
        {/* Hàng 1: Bộ lọc ngày */}
        <div style={{display:'flex',gap:'8px',alignItems:'center',marginBottom:'10px',flexWrap:'wrap'}}>
          <span style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:600,whiteSpace:'nowrap'}}>📅 Từ ngày:</span>
          <input className="input" type="date" value={tuNgay} onChange={e=>{setTuNgay(e.target.value);setTrang(1)}} style={{width:'150px'}}/>
          <span style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:600,whiteSpace:'nowrap'}}>đến:</span>
          <input className="input" type="date" value={denNgay} onChange={e=>{setDenNgay(e.target.value);setTrang(1)}} style={{width:'150px'}}/>
          {[
            {label:'Tháng này',  fn:()=>{const t=thangNay();setTuNgay(t.tu);setDenNgay(t.den);setTrang(1)}},
            {label:'Tháng trước',fn:()=>{const t=thangTruoc();setTuNgay(t.tu);setDenNgay(t.den);setTrang(1)}},
            {label:'Tất cả',     fn:()=>{setTuNgay('');setDenNgay('');setTrang(1)}},
          ].map(({label,fn})=>(
            <button key={label} onClick={fn} style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid var(--border)',background:'white',color:'var(--text-secondary)',fontSize:'12px',cursor:'pointer',whiteSpace:'nowrap'}}>{label}</button>
          ))}
        </div>
        {/* Hàng 2: Tìm kiếm + NCC + filter tình trạng + loại nhập */}
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm phiếu, NCC, SP..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'180px',maxWidth:'260px'}}/>
          <select className="input" value={filterNCC} onChange={e=>setFilterNCC(e.target.value)} style={{width:'180px'}}>
            <option value="Tất cả">Tất cả NCC</option>
            {nccDS.map(n=><option key={n.ma} value={n.ma}>{n.ten}</option>)}
          </select>
          <div style={{display:'flex',gap:'12px',flexWrap:'wrap',alignItems:'center'}}>
            <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
              <span style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:600,whiteSpace:'nowrap'}}>Tình trạng:</span>
              {['Tất cả','Đủ','Thiếu','Thừa','Có hàng lỗi','Đã xử lý'].map(tt=>{
                const c=tt==='Tất cả'?{bg:'#1e3a5f',c:'white'}:TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
                return <button key={tt} onClick={()=>setFilterTT(tt)} style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid',borderColor:filterTT===tt?c.c:'var(--border)',background:filterTT===tt?c.bg:'white',color:filterTT===tt?c.c:'var(--text-secondary)',fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer'}}>{tt}</button>
              })}
            </div>
            <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
              <span style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:600,whiteSpace:'nowrap'}}>Loại nhập:</span>
              {[{k:'Tất cả',label:'Tất cả'},{k:'Từ đơn NCC',label:'🛒 Từ đơn NCC'},{k:'Nhập trực tiếp',label:'📝 Trực tiếp'}].map(({k,label})=>(
                <button key={k} onClick={()=>setFilterLoaiNhap(k)} style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid',borderColor:filterLoaiNhap===k?'#7C3AED':'var(--border)',background:filterLoaiNhap===k?'#F5F3FF':'white',color:filterLoaiNhap===k?'#7C3AED':'var(--text-secondary)',fontWeight:filterLoaiNhap===k?700:400,fontSize:'12px',cursor:'pointer'}}>{label}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bảng */}
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{overflowX:'auto'}}>
          <table className="nk-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
            <thead>
              <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Mã phiếu</th>
                <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày nhập</th>
                <th style={{textAlign:'left',fontWeight:700}}>Nhà cung cấp</th>
                <th style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                <th style={{textAlign:'center',fontWeight:700}}>SL nhận</th>
                <th style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>Giá nhập</th>
                <th style={{textAlign:'right',fontWeight:700}}>Thành tiền</th>
                <th style={{textAlign:'center',fontWeight:700}}>Tình trạng</th>
                <th style={{textAlign:'left',fontWeight:700}}>Người nhập</th>
                <th style={{textAlign:'center',fontWeight:700,width:'120px'}}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dsTrang.length===0?(
                <tr><td colSpan={10} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Không có phiếu nào</td></tr>
              ):dsTrang.map((item,i)=>{
                const ncc=nccMap[item['Mã NCC']]||{}
                const sp=spMap[item['Mã SP']]||{}
                const tt=item['Tình trạng hàng']||'Đủ'
                const ttC=getTTColor(tt)
                return (
                  <tr key={item['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:600,color:'var(--primary)',fontSize:'12px',whiteSpace:'nowrap',cursor:'pointer',textDecoration:'underline'}}
                      onClick={()=>{setEditItem(item);setMaNCC(item['Mã NCC']||'');setTenNCC(nccMap[item['Mã NCC']]?.['Tên NCC']||'');setQNCC(nccMap[item['Mã NCC']]?.['Tên NCC']||'');setMaSP(item['Mã SP']||'');setTenSP(spMap[item['Mã SP']]?.['Tên sản phẩm']||'');setQSP(spMap[item['Mã SP']]?.['Tên sản phẩm']||'');setNgayNhap(item['Ngày nhập']?.split('T')[0]||'');setSlThucNhan(Number(item['Số lượng thực nhận']||0));setGiaNhapNCC(Number(item['Giá nhập thực tế']||0));setCpvcKho(Number(item['CP vận chuyển về kho']||0));setTinhTrang(item['Tình trạng hàng']||'Đủ');setGhiChu(item['Ghi chú']||'');setShowModal(true)}}>
                      {item['Mã phiếu nhập']||'—'}
                      {item['Mã đặt hàng']
                        ? <div style={{fontSize:'10px',color:'#1E40AF',fontWeight:600}}>🛒 {item['Mã đặt hàng']}</div>
                        : <div style={{fontSize:'10px',color:'#7C3AED',fontWeight:600}}>📝 Nhập trực tiếp</div>}
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDate(item['Ngày nhập'])}</td>
                    <td>
                      <div style={{fontWeight:600}}>{ncc['Tên NCC']||item['Mã NCC']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{item['Mã NCC']}</div>
                    </td>
                    <td style={{maxWidth:'180px'}}>
                      <div style={{fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{sp['Tên sản phẩm']||item['Mã SP']||'—'}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>{item['Mã SP']} · {sp['Đơn vị tính']||''}</div>
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{fontWeight:700,fontSize:'14px'}}>{item['Số lượng thực nhận']||0}</span>
                      {Number(item['Số lượng đặt']||0)>0&&<div style={{fontSize:'10px',color:'#9CA3AF'}}>/{item['Số lượng đặt']} đặt</div>}
                    </td>
                    <td style={{textAlign:'right',fontSize:'12px',fontWeight:600}}>
                      {(Number(item['Giá nhập thực tế']||0)+Number(item['CP vận chuyển về kho']||0))>0
                        ?fVND(Number(item['Giá nhập thực tế']||0)+Number(item['CP vận chuyển về kho']||0))+'đ'
                        :'—'}
                    </td>
                    <td style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>
                      {fVND((Number(item['Tổng tiền hàng']||0)+Number(item['CP vận chuyển về kho']||0)))}đ
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:getTTColor(tt).bg,color:getTTColor(tt).c,whiteSpace:'nowrap'}}>
                        {tt}{(tt==='Thiếu'||tt==='Thừa')&&(()=>{const m=(item['Ghi chú']||'').match(/\[(Thiếu|Thừa) (\d+)\]/);return m?` ${m[2]}`:''})()}
                      </span>
                    </td>
                    <td style={{fontSize:'12px',color:'#6B7280'}}>{item['Người nhập']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:'4px',width:'120px'}}>
                        <button onClick={()=>xuatPDFGop(item['Mã đặt hàng']?local.filter(d=>d['Mã đặt hàng']===item['Mã đặt hàng']):[item])}
                          style={{padding:'5px',borderRadius:'5px',border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600,width:'100%'}}>📄 In phiếu</button>
                        {isOwner&&<button onClick={()=>{setEditItem(item);setMaNCC(item['Mã NCC']||'');setTenNCC(nccMap[item['Mã NCC']]?.['Tên NCC']||'');setQNCC(nccMap[item['Mã NCC']]?.['Tên NCC']||'');setMaSP(item['Mã SP']||'');setTenSP(spMap[item['Mã SP']]?.['Tên sản phẩm']||'');setQSP(spMap[item['Mã SP']]?.['Tên sản phẩm']||'');setNgayNhap(item['Ngày nhập']?.split('T')[0]||'');setSlThucNhan(Number(item['Số lượng thực nhận']||0));setGiaNhapNCC(Number(item['Giá nhập thực tế']||0));setCpvcKho(Number(item['CP vận chuyển về kho']||0));setTinhTrang(item['Tình trạng hàng']||'Đủ');setGhiChu(item['Ghi chú']||'');setShowModal(true)}}
                          style={{padding:'5px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600,width:'100%'}}>✏️ Điều chỉnh</button>}
                        {(tt==='Thiếu'||tt==='Thừa')&&<button onClick={()=>setPopupXuLy(item)}
                          style={{padding:'5px',borderRadius:'5px',border:'1px solid #D97706',background:'#FEF3C7',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600,width:'100%'}}>⚙️ Xử lý</button>}
                        {(tt==='Đủ'||tt==='Đã xử lý')&&<button onClick={()=>{setPopupBaoCao(item);setBcSoLuong(1)}}
                          style={{padding:'5px',borderRadius:'5px',border:'1px solid #DC2626',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600,width:'100%'}}>⚠️ Báo cáo vấn đề</button>}
                        {Number(item['CP vận chuyển về kho']||0)>0&&item['Trạng thái CP VC']==='Chưa trả'&&(
                          <button onClick={()=>{setConfirmTraCP(item);setNgayTraCP(new Date().toISOString().split('T')[0]);setHinhThucTraCP('Tiền mặt')}}
                            style={{padding:'5px',borderRadius:'5px',border:'1px solid #7C3AED',background:'#F5F3FF',color:'#7C3AED',fontSize:'11px',cursor:'pointer',fontWeight:600,width:'100%'}}>💸 Trả CP VC</button>
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

      {/* Modal xác nhận trả CP VC */}
      {confirmTraCP&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'420px'}}>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 16px'}}>💸 Xác nhận thanh toán CP vận chuyển</h2>
            <div style={{background:'#F5F3FF',borderRadius:'8px',padding:'12px',marginBottom:'16px'}}>
              <div style={{fontSize:'13px',color:'#6B7280'}}>Phiếu nhập: <strong>{confirmTraCP['Mã phiếu nhập']}</strong></div>
              <div style={{fontSize:'13px',color:'#6B7280'}}>Sản phẩm: <strong>{confirmTraCP['Mã SP']}</strong></div>
              <div style={{fontSize:'20px',fontWeight:800,color:'#7C3AED',marginTop:'6px'}}>{Number(confirmTraCP['CP vận chuyển về kho']||0).toLocaleString('vi-VN')}đ</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px',marginBottom:'16px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>📅 Ngày trả</label>
                <input className="input" type="date" value={ngayTraCP} onChange={e=>setNgayTraCP(e.target.value)}/>
              </div>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>💳 Hình thức</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {(['Tiền mặt','Chuyển khoản'] as const).map(ht=>(
                    <button key={ht} onClick={()=>setHinhThucTraCP(ht)}
                      style={{flex:1,padding:'8px',borderRadius:'7px',border:'2px solid',
                        borderColor:hinhThucTraCP===ht?'#7C3AED':'var(--border)',
                        background:hinhThucTraCP===ht?'#F5F3FF':'white',
                        color:hinhThucTraCP===ht?'#7C3AED':'var(--text-secondary)',
                        fontWeight:hinhThucTraCP===ht?700:400,fontSize:'13px',cursor:'pointer'}}>
                      {ht==='Tiền mặt'?'💵 Tiền mặt':'🏦 Chuyển khoản'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>setConfirmTraCP(null)} style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',fontSize:'13px',cursor:'pointer'}}>Hủy</button>
              <button onClick={xacNhanTraCP} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:'#7C3AED',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>✅ Xác nhận đã trả</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL TẠO/SỬA PHIẾU ══ */}
      {showModal&&(
        <div className="ov">
          <div className="mk">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>{editItem?'✏️ Sửa phiếu nhập kho':'📦 Tạo phiếu nhập kho'}</h2>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#6B7280'}}>✕</button>
            </div>
            {!editItem&&(
              <div style={{display:'flex',gap:'8px',marginBottom:'16px'}}>
                <button onClick={()=>setLoaiNhap('truc-tiep')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'2px solid',borderColor:loaiNhap==='truc-tiep'?'var(--primary)':'var(--border)',background:loaiNhap==='truc-tiep'?'var(--primary-pale)':'white',color:loaiNhap==='truc-tiep'?'var(--primary)':'var(--text-secondary)',fontWeight:loaiNhap==='truc-tiep'?700:400,cursor:'pointer',fontSize:'13px'}}>
                  📝 Nhập trực tiếp
                </button>
                <button onClick={()=>setLoaiNhap('tu-don')} style={{flex:1,padding:'10px',borderRadius:'8px',border:'2px solid',borderColor:loaiNhap==='tu-don'?'var(--primary)':'var(--border)',background:loaiNhap==='tu-don'?'var(--primary-pale)':'white',color:loaiNhap==='tu-don'?'var(--primary)':'var(--text-secondary)',fontWeight:loaiNhap==='tu-don'?700:400,cursor:'pointer',fontSize:'13px'}}>
                  🛒 Nhập từ đơn đặt hàng NCC
                </button>
              </div>
            )}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px'}}>
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                    <label className="lbl" style={{margin:0}}>Nhà cung cấp *</label>
                    {!editItem&&<button onClick={()=>setShowNewNCC(true)} style={{padding:'2px 8px',borderRadius:'5px',border:'1px solid #16A34A',background:'#F0FDF4',color:'#16A34A',fontSize:'10px',fontWeight:600,cursor:'pointer'}}>+ Thêm NCC mới</button>}
                  </div>
                  <NCCInput nccList={nccLocal} value={qNCC} maNCC={maNCC}
                    onSelect={(ma,ten)=>{setMaNCC(ma);setTenNCC(ten);setQNCC(ten)}}
                    onChange={v=>{setQNCC(v);setMaNCC('')}}/>
                  {maNCC&&<div style={{fontSize:'11px',color:'var(--primary)',fontWeight:600,marginTop:'2px'}}>✅ {nccMap[maNCC]?.['Tên NCC']||tenNCC}</div>}
                </div>
                <div>
                  <label className="lbl">Ngày nhập</label>
                  <input className="input" type="date" value={ngayNhap} onChange={e=>setNgayNhap(e.target.value)}/>
                </div>
              </div>
            </div>
            {!editItem&&maNCC&&(chuongTrinhList as any[]).filter((ct:any)=>ct['Mã NCC']===maNCC&&ct['Trạng thái']==='Đang tham gia').length>0&&(()=>{
              const ctNCC=(chuongTrinhList as any[]).filter((ct:any)=>ct['Mã NCC']===maNCC&&ct['Trạng thái']==='Đang tham gia')
              const ctDangChon=ctNCC.find((ct:any)=>ct['Mã CT']===maCTChon)
              const daTL=Number(ctDangChon?.['Đã tích lũy']||0)
              const mucTieu=Number(ctDangChon?.['Mục tiêu doanh số']||0)
              const phanTram=mucTieu>0?Math.min(100,Math.round(daTL/mucTieu*100)):0
              return (
                <div style={{background:'#F5F3FF',borderRadius:'8px',padding:'12px 14px',marginBottom:'14px',border:'1px solid #DDD6FE'}}>
                  <label className='lbl' style={{color:'#7C3AED'}}>🎁 Chương trình KM (tùy chọn)</label>
                  <select className='input' value={maCTChon} onChange={e=>setMaCTChon(e.target.value)}>
                    <option value=''>-- Không gán vào CT nào --</option>
                    {ctNCC.filter((ct:any)=>ct['Trạng thái']!=='Huỷ'&&ct['Trạng thái']!=='Đã đạt').map((ct:any)=>(
                      <option key={ct['Mã CT']} value={ct['Mã CT']}>{ct['Tên chương trình']} ({ct['Mã CT']})</option>
                    ))}
                  </select>
                  {ctDangChon&&(
                    <div style={{marginTop:'8px',fontSize:'12px'}}>
                      {mucTieu>0&&(
                        <div>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                            <span style={{color:'#6B7280'}}>Tích lũy: {(daTL/1000000).toFixed(1)}tr / {(mucTieu/1000000).toFixed(0)}tr</span>
                            <span style={{fontWeight:700,color:'#7C3AED'}}>{phanTram}%</span>
                          </div>
                          <div style={{height:'6px',background:'#E5E7EB',borderRadius:'3px',overflow:'hidden'}}>
                            <div style={{height:'100%',width:phanTram+'%',background:phanTram>=100?'#16A34A':'#8B5CF6',borderRadius:'3px'}}></div>
                          </div>
                        </div>
                      )}
                      {ctDangChon['Hạn giao hàng']&&<div style={{marginTop:'5px',color:'#D97706',fontWeight:600}}>🚚 Hạn giao hàng: {(ctDangChon['Hạn giao hàng']||'').split('T')[0].split('-').reverse().join('/')}</div>}
                    </div>
                  )}
                </div>
              )
            })()}
            {loaiNhap==='tu-don'&&!editItem&&(
              <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
                <label className="lbl">Chọn đơn đặt hàng NCC *</label>
                <select className="input" value={maDonChon} onChange={e=>{
                    const ma=e.target.value
                    if(!ma){setMaDonChon('');setSpItems([]);return}
                    const grp=donNCCGrouped[ma]||[]
                    const nccDon=grp[0]?.['Mã NCC']||''
                    if(maNCC&&nccDon&&nccDon!==maNCC){showMsgM(`⚠️ Đơn "${ma}" thuộc NCC khác — không khớp!`,false);e.target.value=maDonChon;return}
                    if(!maNCC&&nccDon){setMaNCC(nccDon);setTenNCC(nccMap[nccDon]?.['Tên NCC']||nccDon);setQNCC(nccMap[nccDon]?.['Tên NCC']||nccDon)}
                    chonDon(ma)
                  }} style={{marginBottom:'10px'}}>
                  <option value="">-- Chọn đơn --</option>
                  {Object.keys(donNCCGrouped).map(ma=>{
                    const grp=donNCCGrouped[ma]
                    const nccDon=grp[0]?.['Mã NCC']||''
                    const nccTen=nccMap[nccDon]?.['Tên NCC']||nccDon||'—'
                    if(maNCC&&nccDon!==maNCC) return null
                    const coTheNhap=grp.some((d:any)=>['Chờ xác nhận','Đã xác nhận'].includes(d['Trạng thái']||''))
                    if(!coTheNhap) return null
                    const slXN=grp.filter((d:any)=>d['Trạng thái']==='Đã xác nhận').length
                    return <option key={ma} value={ma}>{ma} — {nccTen} ({slXN}/{grp.length} SP đã xác nhận)</option>
                  })}
                </select>
                {spItems.length>0&&(
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'24px 2.5fr 60px 65px 110px 95px 105px 90px 90px 80px',gap:'6px',padding:'4px 6px',fontSize:'11px',color:'#6B7280',fontWeight:600}}>
                      <div></div>
                      <div>Sản phẩm</div>
                      <div style={{textAlign:'center'}}>SL đặt</div>
                      <div style={{textAlign:'center'}}>SL nhận</div>
                      <div>Giá nhập (đ)</div>
                      <div style={{textAlign:'right'}}>CP VC (đ)</div>
                      <div>Hình thức</div>
                      <div>TT thanh toán</div>
                      <div>Thành tiền</div>
                      <div>Tình trạng</div>
                    </div>
                    {spItems.map((it,i)=>(
                      <div key={i} style={{display:'grid',gridTemplateColumns:'24px 2.5fr 60px 65px 110px 95px 105px 90px 90px 80px',gap:'6px',padding:'6px',borderTop:'1px solid #E5E7EB',alignItems:'center'}}>
                        <input type="checkbox" checked={it.checked} onChange={e=>updItem(i,'checked',e.target.checked)} style={{width:'16px',height:'16px',accentColor:'var(--primary)'}}/>
                        <div>
                          <div style={{fontWeight:600,fontSize:'12px'}}>{it.tenSP}</div>
                          <div style={{fontSize:'10px',color:'#6B7280'}}>{it.maSP} · {it.donVi}</div>
                        </div>
                        <div style={{textAlign:'center',fontSize:'12px',color:'#6B7280'}}>{it.slDat}</div>
                        <input type="number" min="0" value={it.sl===0?'0':it.sl||''} disabled={!it.checked}
                          onChange={e=>updItem(i,'sl',e.target.value===''?0:Number(e.target.value))}
                          style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'12px',textAlign:'center',width:'100%',opacity:it.checked?1:0.5}}/>
                        <MoneyInput value={Number(it.giaNCC)||0} onChange={v=>updItem(i,'giaNCC',v)}
                          style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'12px',width:'100%',opacity:it.checked?1:0.5}}/>
                        <MoneyInput value={Number(it.cpvc)||0} onChange={v=>updItem(i,'cpvc',v)}
                          style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'12px',width:'100%',opacity:it.checked?1:0.5}}/>
                        <select disabled={!it.checked||!it.cpvc} value={it.hinhThucCPVC||'Tiền mặt'} onChange={e=>updItem(i,'hinhThucCPVC',e.target.value)}
                          style={{padding:'4px 4px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'11px',width:'100%',opacity:(it.checked&&it.cpvc>0)?1:0.3}}>
                          <option>Tiền mặt</option>
                          <option>Chuyển khoản</option>
                        </select>
                        <select disabled={!it.checked||!it.cpvc} value={it.trangThaiCPVC||'Đã trả'} onChange={e=>updItem(i,'trangThaiCPVC',e.target.value)}
                          style={{padding:'4px 4px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'11px',width:'100%',opacity:(it.checked&&it.cpvc>0)?1:0.3}}>
                          <option>Đã trả</option>
                          <option>Chưa trả</option>
                        </select>
                        <div style={{fontSize:'12px',fontWeight:600,color:'var(--primary)'}}>{fVND(it.sl*(it.giaNCC+it.cpvc))}đ</div>
                        <div style={{padding:'3px 4px',borderRadius:'5px',fontSize:'10px',fontWeight:700,background:getTTColor(it.tinhTrang).bg,color:getTTColor(it.tinhTrang).c,textAlign:'center',opacity:it.checked?1:0.5,border:'1px solid '+getTTColor(it.tinhTrang).c}}>{it.tinhTrang||'Đủ'}</div>
                      </div>
                    ))}
                    <div style={{marginTop:'8px',padding:'8px 12px',background:'#EFF6FF',borderRadius:'6px',display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                      <span style={{color:'#6B7280'}}>{spItems.filter(it=>it.checked).length}/{spItems.length} SP được chọn</span>
                      <span style={{fontWeight:700,color:'var(--primary)'}}>Tổng: {fVND(tongNhap)}đ</span>
                    </div>
                  </>
                )}
              </div>
            )}
            {(loaiNhap==='truc-tiep'||editItem)&&(
              <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
                {!editItem&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <label className="lbl" style={{margin:0,color:'var(--primary)',fontSize:'12px',textTransform:'uppercase'}}>📦 Sản phẩm nhập kho</label>
                  <button onClick={()=>setShowNewSP(true)} style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid #8B5CF6',background:'#F5F3FF',color:'#7C3AED',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>✨ Thêm SP mới</button>
                </div>}
                {dsSP.length>0&&(
                  <div style={{marginBottom:'10px',border:'1px solid #E5E7EB',borderRadius:'8px',overflow:'hidden'}}>
                    <div style={{background:'#F0F4FF',padding:'6px 10px',fontSize:'11px',fontWeight:600,color:'var(--primary)',display:'flex',justifyContent:'space-between'}}>
                      <span>DANH SÁCH SẢN PHẨM ({dsSP.length})</span>
                      <span>Tổng: {fVND(dsSP.reduce((s:number,it:any)=>s+it.slThucNhan*(it.giaNhapNCC+it.cpvcKho),0))}đ</span>
                    </div>
                    {dsSP.map((it:any,i:number)=>(
                      <div key={it._id} style={{display:'grid',gridTemplateColumns:'2fr 60px 120px 120px 100px 28px',gap:'6px',padding:'8px 10px',borderTop:i>0?'1px solid #F0F0F0':'none',alignItems:'center',background:i%2===0?'white':'#FAFBFD'}}>
                        <div><div style={{fontWeight:600,fontSize:'12px'}}>{it.tenSP}</div><div style={{fontSize:'10px',color:'#6B7280'}}>{it.maSP}</div></div>
                        <div style={{textAlign:'center',fontWeight:700}}>{it.slThucNhan}</div>
                        <div style={{fontSize:'12px',color:'#374151'}}>{fVND(it.giaNhapNCC)}đ</div>
                        <div style={{fontWeight:700,color:'var(--primary)',fontSize:'12px'}}>{fVND(it.slThucNhan*(it.giaNhapNCC+it.cpvcKho))}đ</div>
                        <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:600,background:TT_COLOR[it.tinhTrang]?.bg||'#F3F4F6',color:TT_COLOR[it.tinhTrang]?.c||'#374151'}}>{it.tinhTrang}</span>
                        <button onClick={()=>removeSPFromList(it._id)} style={{padding:'3px 6px',borderRadius:'4px',border:'none',background:'#FEE2E2',color:'#DC2626',cursor:'pointer',fontSize:'12px'}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'2fr 120px',gap:'10px',marginBottom:'8px'}}>
                  <div>
                    <label className="lbl">Sản phẩm *</label>
                    <SPInput spList={spLocal} value={qSP} maSP={maSP}
                      onSelect={(ma,ten,giaNCC,cpvc)=>{
                        setMaSP(ma);setTenSP(ten);setQSP(ten);setCpvcKho(cpvc)
                        const giaGoiY=giaNhapGanNhat[ma]||giaNCC
                        setGiaNhapNCC(giaGoiY)
                      }}
                      onChange={v=>{setQSP(v);setMaSP('')}}/>
                    <div style={{fontSize:'10px',color:'var(--primary)',fontWeight:600,marginTop:'2px',minHeight:'14px'}}>
                      {maSP?`✅ ${tenSP} · Tồn: ${spMap[maSP]?.['Tồn kho']||0}`:''}
                    </div>
                  </div>
                  <div>
                    <label className="lbl">Số lượng nhập</label>
                    <input className="input" type="number" min="0" value={slThucNhan||''} placeholder="0" onChange={e=>setSlThucNhan(Number(e.target.value)||0)}/>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'8px'}}>
                  <div>
                    <label className="lbl">📦 Giá nhập NCC (đ)</label>
                    <MoneyInput value={giaNhapNCC} onChange={setGiaNhapNCC}/>
                    {maSP&&giaNhapGanNhat[maSP]>0&&giaNhapGanNhat[maSP]!==giaNhapNCC&&(
                      <div style={{fontSize:'10px',color:'#6B7280',marginTop:'2px',cursor:'pointer'}} onClick={()=>setGiaNhapNCC(giaNhapGanNhat[maSP])}>
                        💡 Lần trước: {giaNhapGanNhat[maSP].toLocaleString('vi-VN')}đ (bấm để dùng)
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="lbl">🚚 CPVC về kho (đ)</label>
                    <MoneyInput value={cpvcKho} onChange={setCpvcKho}/>
                    {cpvcKho>0&&<div style={{display:'flex',gap:'6px',marginTop:'6px'}}>
                      <select className="input" value={hinhThucCPVC} onChange={e=>setHinhThucCPVC(e.target.value as any)}
                        style={{flex:1,fontSize:'12px'}}>
                        <option>Tiền mặt</option>
                        <option>Chuyển khoản</option>
                      </select>
                      <select className="input" value={trangThaiCPVC} onChange={e=>setTrangThaiCPVC(e.target.value as any)}
                        style={{flex:1,fontSize:'12px'}}>
                        <option>Đã trả</option>
                        <option>Chưa trả</option>
                      </select>
                    </div>}
                  </div>
                  <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-start'}}>
                    <label className="lbl" style={{visibility:'hidden'}}>_</label>
                    {!editItem
                      ? <button onClick={addSPToList} style={{padding:'9px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>+ Thêm SP vào danh sách</button>
                      : <div style={{padding:'8px 12px',background:'#EFF6FF',borderRadius:'6px',fontSize:'12px',fontWeight:700,color:'var(--primary)',textAlign:'center'}}>{fVND(slThucNhan*(giaNhapNCC+cpvcKho))}đ</div>}
                  </div>
                </div>
                {!editItem&&<button onClick={addSPToList} style={{marginTop:'8px',width:'100%',padding:'8px',borderRadius:'7px',border:'2px dashed var(--border)',background:'white',color:'var(--text-secondary)',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>+ Thêm sản phẩm vào danh sách</button>}
                {dsSP.length===0&&maSP&&slThucNhan>0&&(
                  <div style={{marginTop:'8px',padding:'8px 12px',background:'#EFF6FF',borderRadius:'6px',display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                    <span style={{color:'#6B7280'}}>{tenSP} × {slThucNhan}</span>
                    <span style={{fontWeight:700,color:'var(--primary)'}}>{fVND(slThucNhan*(giaNhapNCC+cpvcKho))}đ</span>
                  </div>
                )}
              </div>
            )}
            <div>
              {editItem&&(
                <div style={{marginBottom:'10px'}}>
                  <label className="lbl">Tình trạng hàng</label>
                  <select className="input" value={tinhTrang} onChange={e=>setTinhTrang(e.target.value)} style={{background:getTTColor(tinhTrang).bg,color:getTTColor(tinhTrang).c,fontWeight:600}}>
                    <option>Đủ</option><option>Thiếu</option><option>Thừa</option><option>Có hàng lỗi</option><option>Đã xử lý</option>
                  </select>
                </div>
              )}
              <label className="lbl">Ghi chú</label>
              <input className="input" placeholder="Ghi chú thêm..." value={ghiChu} onChange={e=>setGhiChu(e.target.value)}/>
            </div>
            {msgModal&&<div style={{padding:'8px 12px',borderRadius:'8px',marginTop:'12px',fontSize:'13px',background:msgModalOk?'#D1FAE5':'#FEE2E2',color:msgModalOk?'#065F46':'#991B1B'}}>{msgModal}</div>}
            <div style={{display:'flex',gap:'10px',marginTop:'16px'}}>
              <button onClick={luuPhieu} disabled={loading} style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                {loading?'⏳ Đang lưu...':editItem?'✅ Cập nhật phiếu':'✅ Tạo phiếu nhập kho'}
              </button>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{padding:'12px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL NCC MỚI ══ */}
      {showNewNCC&&(
        <div className="ov"><div className="mk2">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>+ Thêm nhà cung cấp mới</h2>
            <button onClick={()=>{setShowNewNCC(false);setMsgNCC('')}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
              <div><label className="lbl">Mã NCC (tự động)</label><input className="input" placeholder="NCC-xxx" value={newMaNCC2} onChange={e=>setNewMaNCC2(e.target.value)}/></div>
              <div><label className="lbl">Tên NCC *</label><input className="input" placeholder="Tên NCC..." value={newTenNCC} onChange={e=>setNewTenNCC(e.target.value)} autoFocus/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div>
                <label className="lbl">📞 Số điện thoại</label>
                <input className="input" placeholder="0xxxxxxxxx (10 số)" value={newSdtNCC}
                  onChange={e=>{
                    const v=e.target.value.replace(/[^0-9]/g,'')
                    setNewSdtNCC(v)
                  }}
                  maxLength={10}
                  style={{borderColor:newSdtNCC&&(!newSdtNCC.startsWith('0')||newSdtNCC.length<10)?'#DC2626':newSdtNCC.length===10&&newSdtNCC.startsWith('0')?'#16A34A':''}}/>
                {newSdtNCC&&!newSdtNCC.startsWith('0')&&<div style={{fontSize:'11px',color:'#DC2626',marginTop:'3px'}}>⚠️ SĐT phải bắt đầu bằng số 0</div>}
                {newSdtNCC&&newSdtNCC.startsWith('0')&&newSdtNCC.length<10&&<div style={{fontSize:'11px',color:'#DC2626',marginTop:'3px'}}>⚠️ Cần nhập đủ 10 số (còn thiếu {10-newSdtNCC.length} số)</div>}
                {newSdtNCC.length===10&&newSdtNCC.startsWith('0')&&<div style={{fontSize:'11px',color:'#16A34A',marginTop:'3px'}}>✅ Hợp lệ</div>}
              </div>
              <div><label className="lbl">🏦 Số TK ngân hàng</label><input className="input" placeholder="STK..." value={newStkNCC} onChange={e=>setNewStkNCC(e.target.value)}/></div>
            </div>
            <div><label className="lbl">📍 Địa chỉ</label><input className="input" placeholder="Địa chỉ..." value={newDiaChiNCC} onChange={e=>setNewDiaChiNCC(e.target.value)}/></div>
            {msgNCC&&<div style={{padding:'8px 12px',borderRadius:'6px',marginBottom:'8px',fontSize:'12px',background:msgNCCOk?'#D1FAE5':'#FEE2E2',color:msgNCCOk?'#065F46':'#991B1B'}}>{msgNCC}</div>}
            {msgNCC&&<div style={{padding:'8px 12px',borderRadius:'6px',marginBottom:'8px',fontSize:'12px',background:msgNCCOk?'#D1FAE5':'#FEE2E2',color:msgNCCOk?'#065F46':'#991B1B'}}>{msgNCC}</div>}
            <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
              <button onClick={luuNCC} disabled={savingNCC} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:savingNCC?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,cursor:savingNCC?'not-allowed':'pointer'}}>
                {savingNCC?'⏳':'✅ Thêm nhà cung cấp'}
              </button>
              <button onClick={()=>{setShowNewNCC(false);setMsgNCC('')}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div></div>
      )}

      {/* ══ MODAL SP MỚI ══ */}
      {showNewSP&&(
        <div className="ov"><div className="mk2" style={{maxWidth:'680px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>+ Thêm sản phẩm mới</h2>
            <button onClick={()=>setShowNewSP(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
              <div><label className="lbl">Mã SP (tự động nếu trống)</label><input className="input" placeholder="SP-001" value={newMaSP} onChange={e=>setNewMaSP(e.target.value)}/></div>
              <div><label className="lbl">Tên sản phẩm *</label><input className="input" placeholder="Tên sản phẩm..." value={newTenSP} onChange={e=>setNewTenSP(e.target.value)} autoFocus/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
              <div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                  <label className="lbl" style={{margin:0}}>📂 Danh mục</label>
                  <button type="button" onClick={()=>setShowThemDM2(true)} style={{padding:'1px 6px',borderRadius:'4px',border:'1px solid #7C3AED',background:'#F5F3FF',color:'#7C3AED',fontSize:'10px',cursor:'pointer'}}>+ Thêm</button>
                </div>
                {msgDM2&&<div style={{fontSize:'11px',marginBottom:'3px',color:msgDM2.startsWith('✅')?'#065F46':'#DC2626'}}>{msgDM2}</div>}
                {showThemDM2?(
                  <div style={{display:'flex',gap:'4px',marginBottom:'4px'}}>
                    <input className="input" placeholder="Tên danh mục..." value={newTenDM2} autoFocus
                      onChange={e=>setNewTenDM2(e.target.value)}
                      onKeyDown={e=>e.key==='Enter'&&themDM2()}
                      style={{flex:1,fontSize:'12px'}}/>
                    <button onClick={themDM2} disabled={loadingDM2} style={{padding:'4px 8px',borderRadius:'5px',border:'none',background:'#7C3AED',color:'white',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
                      {loadingDM2?'⏳':'✅'}
                    </button>
                    <button onClick={()=>{setShowThemDM2(false);setNewTenDM2('')}} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #E5E7EB',background:'white',fontSize:'11px',cursor:'pointer'}}>✕</button>
                  </div>
                ):null}
                <DanhMucInput2 danhMucNames={danhMucNames2} value={newDanhMucSP} onChange={setNewDanhMucSP}/>
              </div>
              <div><label className="lbl">Loại SP</label><select className="input" value={newLoai} onChange={e=>setNewLoai(e.target.value)}><option>Phổ thông</option><option>Theo yêu cầu</option></select></div>
              <div><label className="lbl">Đơn vị tính</label><select className="input" value={newDonVi} onChange={e=>setNewDonVi(e.target.value)}><option>Cái</option><option>Chiếc</option><option>Bộ</option></select></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px'}}>
              <div><label className="lbl">📦 Giá nhập NCC (đ)</label><input className="input" type="text" inputMode="numeric" placeholder="0" value={newGiaNCC?Number(newGiaNCC).toLocaleString('vi-VN'):''} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'');setNewGiaNCC(Number(v)||0)}}/></div>
              <div><label className="lbl">🚚 CPVC về kho (đ)</label><input className="input" type="text" inputMode="numeric" placeholder="0" value={newCpvc?Number(newCpvc).toLocaleString('vi-VN'):''} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'');setNewCpvc(Number(v)||0)}}/></div>
              <div><label className="lbl">💵 Giá bán buôn (đ)</label><input className="input" type="text" inputMode="numeric" placeholder="0" value={newGiaBuon?Number(newGiaBuon).toLocaleString('vi-VN'):''} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'');setNewGiaBuon(Number(v)||0)}}/></div>
              <div><label className="lbl">🏷️ Giá bán lẻ (đ)</label><input className="input" type="text" inputMode="numeric" placeholder="0" value={newGiaLe?Number(newGiaLe).toLocaleString('vi-VN'):''} onChange={e=>{const v=e.target.value.replace(/[^0-9]/g,'');setNewGiaLe(Number(v)||0)}}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div><label className="lbl">📦 Tồn kho</label><input className="input" type="number" min="0" placeholder="0" value={newTonKho||''} onChange={e=>setNewTonKho(Number(e.target.value)||0)}/></div>
              <div><label className="lbl">⚠️ Ngưỡng cảnh báo</label><input className="input" type="number" min="0" placeholder="1" value={newNguong||''} onChange={e=>setNewNguong(Number(e.target.value)||0)}/></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
              <div><label className="lbl">Thông số kỹ thuật</label><input className="input" placeholder="120x60x75cm..." value={newThongSo} onChange={e=>setNewThongSo(e.target.value)}/></div>
              <div><label className="lbl">Ghi chú</label><input className="input" placeholder="Ghi chú..." value={newGhiChuSP} onChange={e=>setNewGhiChuSP(e.target.value)}/></div>
            </div>
            <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
              <button onClick={luuSPMoi} disabled={savingSP} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:savingSP?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:savingSP?'not-allowed':'pointer'}}>
                {savingSP?'⏳ Đang lưu...':'✅ Lưu sản phẩm'}
              </button>
              <button onClick={()=>setShowNewSP(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div></div>
      )}

      {/* ══ MODAL XỬ LÝ ══ */}
      {popupXuLy&&(()=>{
        const slNhan=Number(popupXuLy['Số lượng thực nhận']||0)
        const slDat=Number(popupXuLy['Số lượng đặt']||0)
        const slLoi2=Number(popupXuLy['Số lượng lỗi']||0)
        const slPK=Number(popupXuLy['Số lượng chờ phụ kiện']||0)
        const coSLDat=slDat>0
        const slThua=coSLDat&&slNhan>slDat?slNhan-slDat:0
        const slThieu=coSLDat&&slNhan<slDat?slDat-slNhan:0
        const slTraNCC=slLoi2+slPK
        const spTen=spMap[popupXuLy['Mã SP']]?.['Tên sản phẩm']||popupXuLy['Mã SP']
        const donVi=spMap[popupXuLy['Mã SP']]?.['Đơn vị tính']||'cái'
        return (
          <div className="ov">
            <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'480px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>⚙️ Xử lý phiếu nhập kho</h2>
                <button onClick={()=>setPopupXuLy(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
              </div>
              <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'14px',fontSize:'13px'}}>
                <div style={{fontWeight:600,marginBottom:'4px'}}>{popupXuLy['Mã phiếu nhập']} — {spTen}</div>
                {popupXuLy['Mã đặt hàng']&&<div style={{fontSize:'11px',color:'#1E40AF',marginBottom:'8px'}}>🛒 Đơn NCC: <strong>{popupXuLy['Mã đặt hàng']}</strong></div>}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',fontSize:'12px'}}>
                  {slDat>0&&<div style={{padding:'6px 10px',background:'white',borderRadius:'6px',border:'1px solid #E5E7EB'}}><div style={{color:'#6B7280',fontSize:'11px'}}>SL đặt hàng</div><div style={{fontWeight:700,fontSize:'16px'}}>{slDat} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div></div>}
                  <div style={{padding:'6px 10px',background:'white',borderRadius:'6px',border:'1px solid #E5E7EB'}}><div style={{color:'#6B7280',fontSize:'11px'}}>SL thực nhận</div><div style={{fontWeight:700,fontSize:'16px'}}>{slNhan} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div></div>
                  {slThua>0&&<div style={{padding:'6px 10px',background:'#DBEAFE',borderRadius:'6px',border:'1px solid #93C5FD'}}><div style={{color:'#1E40AF',fontSize:'11px'}}>🔵 Số lượng thừa</div><div style={{fontWeight:700,fontSize:'16px',color:'#1E40AF'}}>{slThua} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div></div>}
                  {slThieu>0&&<div style={{padding:'6px 10px',background:'#FEF3C7',borderRadius:'6px',border:'1px solid #FCD34D'}}><div style={{color:'#92400E',fontSize:'11px'}}>⚠️ Số lượng thiếu</div><div style={{fontWeight:700,fontSize:'16px',color:'#92400E'}}>{slThieu} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div></div>}
                </div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                <button onClick={()=>setConfirmXL({item:popupXuLy,coTraHang:false,label:'✅ Xác nhận đã nhập '+slNhan+' '+donVi+' vào kho',moTa:slThieu>0?`Còn thiếu ${slThieu} ${donVi} — tồn kho không đổi`:slThua>0?`Giữ ${slThua} ${donVi} thừa trong kho`:'Đổi trạng thái → Đã xử lý'})}
                  style={{padding:'12px',borderRadius:'8px',border:'1px solid #16A34A',background:'#F0FDF4',color:'#065F46',fontWeight:700,cursor:'pointer',fontSize:'13px',textAlign:'left'}}>
                  ✅ Xác nhận đã nhập {slNhan} {donVi} vào kho
                  <div style={{fontSize:'11px',fontWeight:400,marginTop:'2px',color:'#6B7280'}}>{slThieu>0?`Còn thiếu ${slThieu} ${donVi}`:slThua>0?`Thừa ${slThua} ${donVi} — giữ lại`:'Tồn kho không thay đổi'}</div>
                </button>
                {slThua>0&&(
                  <button onClick={()=>setConfirmXL({item:{...popupXuLy,'_slTraThua':slThua},coTraHang:true,label:`🔄 Trả lại ${slThua} ${donVi} thừa cho NCC`,moTa:`Tồn kho sẽ trừ ${slThua} ${donVi} · Không thể hoàn tác`})}
                    style={{padding:'12px',borderRadius:'8px',border:'1px solid #1E40AF',background:'#EFF6FF',color:'#1E40AF',fontWeight:700,cursor:'pointer',fontSize:'13px',textAlign:'left'}}>
                    🔄 Trả lại {slThua} {donVi} thừa cho NCC
                  </button>
                )}
                <button onClick={()=>setPopupXuLy(null)} style={{padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'13px',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ══ MODAL BÁO CÁO VẤN ĐỀ ══ */}
      {popupBaoCao&&(
        <div className="ov">
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'480px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>⚠️ Báo cáo vấn đề hàng hóa</h2>
              <button onClick={()=>setPopupBaoCao(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'14px',fontSize:'13px'}}>
              <div style={{fontWeight:600}}>{popupBaoCao['Mã phiếu nhập']} — {spMap[popupBaoCao['Mã SP']]?.['Tên sản phẩm']||popupBaoCao['Mã SP']}</div>
              <div style={{color:'#6B7280',marginTop:'4px',fontSize:'12px'}}>SL thực nhận: <strong>{popupBaoCao['Số lượng thực nhận']}</strong> · NCC: {nccMap[popupBaoCao['Mã NCC']]?.['Tên NCC']||popupBaoCao['Mã NCC']}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label className="lbl">Loại vấn đề</label>
                  <select className="input" value={bcLoai} onChange={e=>{setBcLoai(e.target.value);setBcHuong(HUONG_XU_LY[e.target.value]?.[0]||'Trả lại NCC')}}>
                    <option>Lỗi</option><option>Thiếu phụ kiện</option><option>Hỏng phụ kiện</option><option>Sai màu</option><option>Sai kích thước</option>
                  </select>
                </div>
                <div>
                  <label className="lbl">Số lượng</label>
                  <input className="input" type="number" min="1" value={bcSoLuong||''} placeholder="0" onChange={e=>setBcSoLuong(Number(e.target.value)||0)}/>
                </div>
              </div>
              <div>
                <label className="lbl">Hướng xử lý dự kiến</label>
                <select className="input" value={bcHuong} onChange={e=>setBcHuong(e.target.value)}>
                  {(HUONG_XU_LY[bcLoai]||['Trả lại NCC']).map(h=><option key={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Ghi chú chi tiết</label>
                <input className="input" placeholder="Mô tả vấn đề cụ thể..." value={bcGhiChu} onChange={e=>setBcGhiChu(e.target.value)}/>
              </div>
              <div style={{padding:'8px 12px',background:'#FEF3C7',borderRadius:'6px',fontSize:'12px',color:'#92400E'}}>
                ⚠️ Sau khi xác nhận: tồn kho trừ {bcSoLuong} {spMap[popupBaoCao?.['Mã SP']]?.['Đơn vị tính']||'SP'} ngay lập tức và tạo phiếu xử lý riêng.
              </div>
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={baoCaoVanDe} disabled={bcLoading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:bcLoading?'#9CA3AF':'#D97706',color:'white',fontWeight:700,cursor:bcLoading?'not-allowed':'pointer',fontSize:'14px'}}>
                  {bcLoading?'⏳ Đang lưu...':'✅ Xác nhận báo cáo'}
                </button>
                <button onClick={()=>setPopupBaoCao(null)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL XÁC NHẬN XỬ LÝ ══ */}
      {confirmXL&&(
        <div className="ov">
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px',textAlign:'center'}}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>{confirmXL.coTraHang?'⚠️':'✅'}</div>
            <h2 style={{fontSize:'15px',fontWeight:700,margin:'0 0 8px'}}>{confirmXL.label}</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 16px',background:confirmXL.coTraHang?'#FEF2F2':'#F0FDF4',padding:'8px 12px',borderRadius:'6px'}}>{confirmXL.moTa}</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={async()=>{
                const {item,coTraHang}=confirmXL
                await xuLyPhieu(item,coTraHang)
                if(coTraHang&&item['_slTraThua']){
                  const maDH=item['Mã đặt hàng'],maSPXL=item['Mã SP']
                  if(maDH&&maSPXL){
                    const donItem=datHangList.find((d:any)=>d['Mã đặt hàng']?.startsWith(maDH.split('-').slice(0,3).join('-'))&&d['Mã SP']===maSPXL)
                    if(donItem){const idDon=Number(donItem['Id']||donItem['id']||0);if(idDon)await fetch('/api/dat-hang-ncc',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:idDon,'Trạng thái':'Đã nhập kho'})}).catch(()=>{})}
                  }
                }
                setConfirmXL(null);setPopupXuLy(null)
              }} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:confirmXL.coTraHang?'#DC2626':'#16A34A',color:'white',fontWeight:700,cursor:'pointer'}}>Xác nhận</button>
              <button onClick={()=>setConfirmXL(null)} style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL XÓA ══ */}
      {xoaItem&&(
        <div className="ov">
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'360px',textAlign:'center'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'15px',fontWeight:700,margin:'0 0 8px'}}>Xóa phiếu nhập?</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}><strong>{xoaItem['Mã phiếu nhập']}</strong></p>
            <p style={{fontSize:'12px',color:'#DC2626',margin:'0 0 16px',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>⚠️ Tồn kho SP sẽ bị trừ {xoaItem['Số lượng thực nhận']}</p>
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
    <input className="input" inputMode="numeric" placeholder="0" value={display}
      onChange={e=>{
        const raw=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'')
        const num=Number(raw)||0
        setDisplay(num>0?num.toLocaleString('vi-VN'):'')
        onChange(num)
      }}/>
  )
}

function NCCInput({nccList,value,maNCC,onSelect,onChange}:{nccList:any[];value:string;maNCC:string;onSelect:(ma:string,ten:string)=>void;onChange:(v:string)=>void}){
  const [show,setShow]=useState(false)
  const [q,setQ]=useState(value)
  useEffect(()=>{setQ(value)},[value])
  function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
  const filtered=nccList.filter(n=>{const qb=boDau(q);return !qb||boDau(n['Tên NCC']||'').includes(qb)||boDau(n['Mã NCC']||'').includes(qb)}).slice(0,10)
  return (
    <div style={{position:'relative'}}>
      <input className="input" placeholder="Tìm tên, mã NCC..." value={q}
        onChange={e=>{setQ(e.target.value);onChange(e.target.value);setShow(true)}}
        onFocus={()=>setShow(true)} onBlur={()=>setTimeout(()=>setShow(false),200)}/>
      {show&&filtered.length>0&&(
        <div style={{position:'absolute',top:'calc(100%+2px)',left:0,right:0,zIndex:300,background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,.15)',maxHeight:'220px',overflowY:'auto'}}>
          {filtered.map(n=>(
            <div key={n['Mã NCC']} style={{padding:'9px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px'}}
              onMouseDown={e=>{e.preventDefault();setQ(n['Tên NCC']||'');setShow(false);onSelect(n['Mã NCC'],n['Tên NCC']||'')}}>
              <span style={{fontWeight:600}}>{n['Tên NCC']}</span> <span style={{fontSize:'11px',color:'#6B7280'}}>{n['Mã NCC']}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SPInput({spList,value,maSP,onSelect,onChange}:{spList:any[];value:string;maSP:string;onSelect:(ma:string,ten:string,giaNCC:number,cpvc:number)=>void;onChange:(v:string)=>void}){
  const [show,setShow]=useState(false)
  const [q,setQ]=useState(value)
  useEffect(()=>{setQ(value)},[value])
  function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
  const filtered=spList.filter(s=>{const qb=boDau(q);return !qb||boDau(s['Tên sản phẩm']||'').includes(qb)||boDau(s['Mã SP']||'').includes(qb)}).slice(0,10)
  return (
    <div style={{position:'relative'}}>
      <input className="input" placeholder="Tìm tên hoặc mã SP..." value={q}
        onChange={e=>{setQ(e.target.value);onChange(e.target.value);setShow(true)}}
        onFocus={()=>setShow(true)} onBlur={()=>setTimeout(()=>setShow(false),200)}/>
      {show&&filtered.length>0&&(
        <div style={{position:'absolute',top:'calc(100%+2px)',left:0,right:0,zIndex:300,background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',boxShadow:'0 4px 20px rgba(0,0,0,.15)',maxHeight:'220px',overflowY:'auto'}}>
          {filtered.map(s=>(
            <div key={s['Mã SP']} style={{padding:'9px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px'}}
              onMouseDown={e=>{e.preventDefault();setQ(s['Tên sản phẩm']||'');setShow(false);onSelect(s['Mã SP'],s['Tên sản phẩm']||'',Number(s['Giá nhập NCC']||0),Number(s['CPVC về kho']||0))}}>
              <span style={{fontWeight:600}}>{s['Tên sản phẩm']}</span> <span style={{fontSize:'11px',color:'#6B7280'}}>{s['Mã SP']}</span>
              <div style={{fontSize:'11px',color:'#6B7280'}}>Tồn: {s['Tồn kho']||0} · {s['Đơn vị tính']||''}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Btn({children,active,disabled,onClick}:any){
  return <button onClick={onClick} disabled={disabled} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:active?'var(--primary)':'var(--border)',background:active?'var(--primary)':disabled?'#F9FAFB':'white',color:active?'white':disabled?'#CCC':'var(--text-secondary)',cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:active?700:400,minWidth:'32px'}}>{children}</button>
}

function DanhMucInput2({danhMucNames,value,onChange}:{danhMucNames:string[];value:string;onChange:(v:string)=>void}){
  const [show,setShow]=useState(false)
  const [q,setQ]=useState(value)
  useEffect(()=>{setQ(value)},[value])
  function boDau2(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
  const filtered=danhMucNames.filter(dm=>{const qb=boDau2(q);return !qb||boDau2(dm).includes(qb)}).slice(0,10)
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

