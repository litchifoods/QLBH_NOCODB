'use client'
// components/NhapKhoClient.tsx - Viết lại hoàn toàn
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){if(!s)return'—';try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}catch{return s}}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const TT_COLOR:Record<string,{bg:string,c:string}> = {
  'Đủ':          {bg:'#D1FAE5',c:'#065F46'},
  'Có vấn đề':   {bg:'#FEF3C7',c:'#92400E'},
  'Đã xử lý':    {bg:'#F3F4F6',c:'#6B7280'},
}
const SO_DONG = 10

export default function NhapKhoClient({nhapKhoList,nccList,sanPhamList,datHangList,user}:{
  nhapKhoList:any[]; nccList:any[]; sanPhamList:any[]; datHangList:any[]; user:UserSession
}) {
  const router = useRouter()
  const isOwner = user.vaiTro === 'Chủ cửa hàng'

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
      // Đổi trạng thái phiếu nhập → Có vấn đề
      await fetch('/api/nhap-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(popupBaoCao['Id']||popupBaoCao['id']),
          slThucNhanCu:0,'Mã SP':popupBaoCao['Mã SP'],
          'Tình trạng hàng':'Có vấn đề',
          'Ghi chú':(popupBaoCao['Ghi chú']||'')+` | ${bcLoai}: ${bcSoLuong} SP`,
          'Số lượng thực nhận':Number(popupBaoCao['Số lượng thực nhận']||0),
        })})
      setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(popupBaoCao['Id']||popupBaoCao['id'])
        ?{...d,'Tình trạng hàng':'Có vấn đề'}:d))
      showMsg2(`✅ Đã tạo phiếu xử lý ${d.maXL}`)
      setPopupBaoCao(null);setBcLoai('Lỗi');setBcHuong('Trả NCC');setBcSoLuong(0);setBcGhiChu('')
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setBcLoading(false)}
  }

  // Tạo đơn bù cho phiếu Thiếu
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

  // Xử lý phiếu Lỗi/Thừa - đổi trạng thái + trừ tồn kho nếu trả hàng
  async function xuLyPhieu(item:any, coTraHang:boolean){
    // Nếu có _slTraThua thì trừ theo số thừa, không thì trừ lỗi+PK
    const slCanTru = item['_slTraThua']
      ? Number(item['_slTraThua'])
      : Number(item['Số lượng lỗi']||0)+Number(item['Số lượng chờ phụ kiện']||0)
    try{
      const res=await fetch('/api/nhap-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(item['Id']||item['id']),
          slThucNhanCu: coTraHang ? slCanTru : 0,
          'Mã SP': item['Mã SP'],
          'Tình trạng hàng':'Đã xử lý',
          'Ghi chú':(item['Ghi chú']||'')+(coTraHang?` | Đã trả ${slCanTru} SP lỗi/thiếu PK cho NCC`:' | Đã xử lý'),
          'Số lượng thực nhận': Number(item['Số lượng thực nhận']||0),
        })})
      if(!res.ok)throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(item['Id']||item['id'])
        ?{...d,'Tình trạng hàng':'Đã xử lý'}:d))
      if(coTraHang){
        setSpLocal(prev=>prev.map(s=>s['Mã SP']===item['Mã SP']
          ?{...s,'Tồn kho':Math.max(0,Number(s['Tồn kho']||0)-Number(item['Số lượng thực nhận']||0))}:s))
      }
      showMsg2(`✅ Đã cập nhật: ${item['Mã phiếu nhập']}`)
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  // State popup xử lý
  const [popupXuLy,   setPopupXuLy]   = useState<any>(null)
  const [popupBaoCao, setPopupBaoCao] = useState<any>(null)
  // Form báo cáo vấn đề
  const [bcLoai,    setBcLoai]    = useState('Lỗi')
  const [bcHuong,   setBcHuong]   = useState('Trả NCC')
  const [bcSoLuong, setBcSoLuong] = useState(0)
  const [bcGhiChu,  setBcGhiChu]  = useState('')
  const [bcLoading, setBcLoading] = useState(false)

  // ── DATA STATE ──────────────────────────────────────────
  const [local,    setLocal]    = useState(nhapKhoList)
  const [spLocal,  setSpLocal]  = useState(sanPhamList)
  const [nccLocal, setNccLocal] = useState(nccList)

  // ── UI STATE ─────────────────────────────────────────────
  const [search,    setSearch]    = useState('')
  const [filterTT,  setFilterTT]  = useState('Tất cả')
  const [filterNCC, setFilterNCC] = useState('Tất cả')
  const [trang,     setTrang]     = useState(1)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)

  // ── MODAL STATE ──────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [editItem,  setEditItem]  = useState<any>(null)
  const [xoaItem,   setXoaItem]   = useState<any>(null)
  const [loading,   setLoading]   = useState(false)
  const [msgModal,  setMsgModal]  = useState('')
  const [msgModalOk,setMsgModalOk]= useState(true)

  // ── FORM: loại nhập ──────────────────────────────────────
  const [loaiNhap, setLoaiNhap] = useState<'truc-tiep'|'tu-don'>('truc-tiep')

  // ── FORM: thông tin chung ────────────────────────────────
  const [maNCC,     setMaNCC]     = useState('')
  const [tenNCC,    setTenNCC]    = useState('')  // chỉ dùng để hiển thị
  const [ngayNhap,  setNgayNhap]  = useState(new Date().toISOString().split('T')[0])
  const [ghiChu,    setGhiChu]    = useState('')

  // ── FORM: nhập trực tiếp ─────────────────────────────────
  const [maSP,       setMaSP]       = useState('')
  const [tenSP,      setTenSP]      = useState('')
  const [slThucNhan, setSlThucNhan] = useState<number>(0)
  const [giaNhapNCC, setGiaNhapNCC] = useState<number>(0)
  const [cpvcKho,    setCpvcKho]    = useState<number>(0)
  const [tinhTrang,  setTinhTrang]  = useState('Đủ')
  const [slLoi,      setSlLoi]      = useState<number>(0)
  const [slChoiPK,   setSlChoiPK]   = useState<number>(0)
  // Danh sách SP nhập trực tiếp (nhiều SP)
  const [dsSP, setDsSP] = useState<any[]>([])

  // ── FORM: nhập từ đơn NCC ────────────────────────────────
  const [maDonChon, setMaDonChon] = useState('')
  const [spItems,   setSpItems]   = useState<any[]>([])

  // ── FORM: tìm kiếm dropdown ──────────────────────────────
  const [qNCC,     setQNCC]     = useState('')
  const [qSP,      setQSP]      = useState('')
  const [showNCC,  setShowNCC]  = useState(false)
  const [showSP,   setShowSP]   = useState(false)

  // ── MODAL: NCC mới ───────────────────────────────────────
  const [showNewNCC,   setShowNewNCC]   = useState(false)
  const [newTenNCC,    setNewTenNCC]    = useState('')
  const [newMaNCC2,    setNewMaNCC2]    = useState('')
  const [newSdtNCC,    setNewSdtNCC]    = useState('')
  const [newDiaChiNCC, setNewDiaChiNCC] = useState('')
  const [newStkNCC,    setNewStkNCC]    = useState('')
  const [savingNCC,    setSavingNCC]    = useState(false)

  // ── MODAL: SP mới ─────────────────────────────────────────
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
  const [savingSP,   setSavingSP]   = useState(false)

  // ── MAPS ─────────────────────────────────────────────────
  const nccMap = useMemo(()=>{const m:Record<string,any>={};nccLocal.forEach(n=>{m[n['Mã NCC']||'']=n});return m},[nccLocal])
  const spMap  = useMemo(()=>{const m:Record<string,any>={};spLocal.forEach(s=>{m[s['Mã SP']||'']=s});return m},[spLocal])

  // ── HELPERS ───────────────────────────────────────────────
  function showMsg2(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}
  function showMsgM(t:string,ok=true){setMsgModal(t);setMsgModalOk(ok);setTimeout(()=>setMsgModal(''),5000)}

  const tongNhap = loaiNhap==='truc-tiep'
    ? slThucNhan*(giaNhapNCC+cpvcKho)
    : spItems.filter(it=>it.checked).reduce((s:number,it:any)=>s+it.sl*(it.giaNCC+it.cpvc),0)

  // ── GROUP ĐƠN NCC ─────────────────────────────────────────
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
    setMaDonChon(maDon)
    const nccMa=grp[0]['Mã NCC']||''
    setMaNCC(nccMa)
    setTenNCC(nccMap[nccMa]?.['Tên NCC']||nccMa)
    setSpItems(grp.map((d:any)=>({
      maSP:d['Mã SP']||'',
      tenSP:spMap[d['Mã SP']]?.['Tên sản phẩm']||d['Mã SP']||'',
      donVi:spMap[d['Mã SP']]?.['Đơn vị tính']||'',
      slDat:Number(d['Số lượng đặt']||0),
      sl:Number(d['Số lượng đặt']||0),
      giaNCC:Number(spMap[d['Mã SP']]?.['Giá nhập NCC']||d['Giá nhập dự kiến']||0),
      cpvc:Number(spMap[d['Mã SP']]?.['CPVC về kho']||0),
      tinhTrang:'Đủ',
      ghiChu:'',
      checked:true,
    })))
  }

  function tinhTinhTrang(sl:number, slDat:number, loi:number, choiPK:number):string{
    if(loi>0||choiPK>0) return 'Lỗi'
    if(sl<slDat) return 'Thiếu'
    if(sl>slDat) return 'Thừa'
    return 'Đủ'
  }

  function addSPToList(){
    if(!maSP){showMsgM('Chọn sản phẩm trước',false);return}
    if(slThucNhan<=0){showMsgM('Nhập số lượng > 0',false);return}
    setDsSP(p=>[...p,{maSP,tenSP,slThucNhan,giaNhapNCC,cpvcKho,tinhTrang:'Đủ',slLoi,slChoiPK,ghiChu:'',_id:Date.now()}])
    // Reset ô SP để nhập tiếp
    setMaSP('');setTenSP('');setQSP('');setSlThucNhan(0);setGiaNhapNCC(0);setCpvcKho(0);setTinhTrang('Đủ')
    showMsgM('✅ Đã thêm SP vào danh sách',true)
  }
  function removeSPFromList(id:number){setDsSP(p=>p.filter((it:any)=>it._id!==id))}
  function updDsSP(id:number,k:string,v:any){setDsSP(p=>p.map((it:any)=>it._id===id?{...it,[k]:v}:it))}

  function updItem(i:number,k:string,v:any){
    setSpItems(p=>p.map((it,idx)=>{
      if(idx!==i) return it
      const updated={...it,[k]:v}
      // Tự động tình trạng khi đổi SL nhận
      if(k==='sl'){
        const sl=Number(v)  // KHÔNG dùng ||0 để phân biệt 0 với rỗng
        const slDat=Number(it.slDat)||0
        if(sl===slDat) updated.tinhTrang='Đủ'
        else if(sl<slDat) updated.tinhTrang='Thiếu'
        else updated.tinhTrang='Thừa'
      }
      return updated
    }))
  }

  function resetForm(){
    setLoaiNhap('truc-tiep')
    setMaNCC('');setTenNCC('');setQNCC('')
    setNgayNhap(new Date().toISOString().split('T')[0])
    setGhiChu('')
    setMaSP('');setTenSP('');setQSP('');setDsSP([])
    setSlThucNhan(0);setGiaNhapNCC(0);setCpvcKho(0);setTinhTrang('Đủ');setSlLoi(0);setSlChoiPK(0)
    setMaDonChon('');setSpItems([])
    setShowNCC(false);setShowSP(false)
    setMsgModal('')
    setEditItem(null)
  }

  // ── LƯU PHIẾU ────────────────────────────────────────────
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
          const res=await fetch('/api/nhap-kho',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({maNCC,maSP:it.maSP,maDatHang:maDonChon,ngayNhap,
              slDat:it.slDat,slThucNhan:it.sl,giaNhapTT:it.giaNCC,cpVC:it.cpvc,
              tinhTrang:it.tinhTrang,ghiChu:it.ghiChu||ghiChu,
              nguoiNhap:user.hoTen||user.tenDangNhap})})
          const d=await res.json()
          if(res.ok){
            soTao++
            setSpLocal(prev=>prev.map(s=>s['Mã SP']===it.maSP?{...s,'Tồn kho':Number(s['Tồn kho']||0)+it.sl}:s))
            if(d.data)setLocal(prev=>[d.data,...prev])
          }
        }
        showMsg2(`✅ Đã tạo ${soTao} phiếu nhập từ đơn ${maDonChon}`)
        // Xóa các dòng đơn NCC đã nhập kho
        if(soTao>0&&maDonChon){
          const grp=donNCCGrouped[maDonChon]||[]
          for(const d of grp){
            const spNhap=spItems.find(it=>it.maSP===d['Mã SP']&&it.checked)
            if(spNhap){
              await fetch(`/api/dat-hang-ncc?id=${d['Id']||d['id']}`,{method:'DELETE'}).catch(()=>{})
            }
          }
        }
      } else {
        // Nhập trực tiếp - tạo từ danh sách dsSP
        const allSP = dsSP.length > 0 ? dsSP : (maSP&&slThucNhan>0 ? [{maSP,tenSP,slThucNhan,giaNhapNCC,cpvcKho,tinhTrang:'Đủ',slLoi:slLoi||0,slChoiPK:slChoiPK||0,ghiChu,_id:0}] : [])
        if(!maNCC){showMsgM('Vui lòng chọn nhà cung cấp',false);setLoading(false);return}
        if(!allSP.length){showMsgM('Thêm ít nhất 1 sản phẩm',false);setLoading(false);return}
        let soTao=0
        for(const sp of allSP){
          const res=await fetch('/api/nhap-kho',{method:'POST',headers:{'Content-Type':'application/json'},
            body:JSON.stringify({maNCC,maSP:sp.maSP,maDatHang:'',ngayNhap,slDat:0,
              slThucNhan:sp.slThucNhan,giaNhapTT:sp.giaNhapNCC,cpVC:sp.cpvcKho,
              slLoi:0,slChoiPK:0,tinhTrang:'Đủ',
              ghiChu:sp.ghiChu||ghiChu,nguoiNhap:user.hoTen||user.tenDangNhap})})
          const d=await res.json()
          if(res.ok){
            soTao++
            setSpLocal(prev=>prev.map(s=>s['Mã SP']===sp.maSP?{...s,'Tồn kho':Number(s['Tồn kho']||0)+sp.slThucNhan}:s))
            if(d.data)setLocal(prev=>[d.data,...prev])
          }
        }
        showMsg2(`✅ Đã tạo ${soTao} phiếu nhập`)
      }
      setShowModal(false);resetForm()
    }catch(e:any){showMsgM('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  // ── XÓA PHIẾU ────────────────────────────────────────────
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

  // ── LƯU NCC MỚI ──────────────────────────────────────────
  async function luuNCC(){
    if(!newTenNCC.trim()){showMsgM('Nhập tên NCC',false);return}
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

  // ── LƯU SP MỚI ───────────────────────────────────────────
  async function luuSPMoi(){
    if(!newTenSP.trim()){showMsgM('Nhập tên SP',false);return}
    setSavingSP(true)
    try{
      const res=await fetch('/api/san-pham',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({'Mã SP':newMaSP.trim()||undefined,'Tên sản phẩm':newTenSP.trim(),
          'Loại SP':newLoai,'Đơn vị tính':newDonVi,'Giá nhập NCC':newGiaNCC,'CPVC về kho':newCpvc,
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
      setNewTonKho(0);setNewNguong(1);setNewThongSo('');setNewGhiChuSP('')
    }catch(e:any){showMsgM('❌ '+(e.message||'Lỗi'),false)}
    finally{setSavingSP(false)}
  }

  // ── XUẤT PDF ─────────────────────────────────────────────
  function xuatPDF(item:any){
    const ncc=nccMap[item['Mã NCC']]||{}
    const sp=spMap[item['Mã SP']]||{}
    const ttC=TT_COLOR[item['Tình trạng hàng']]||{bg:'#F3F4F6',c:'#374151'}
    const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu nhập kho ${item['Mã phiếu nhập']}</title>
    <style>body{font-family:Arial,sans-serif;padding:32px;font-size:13px;}h1{font-size:20px;color:#1e3a5f;}
    .info{display:flex;gap:16px;margin:16px 0;}.box{flex:1;background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;padding:12px 16px;}
    table{width:100%;border-collapse:collapse;margin-top:16px;}th{background:#1e3a5f;color:white;padding:8px 10px;font-size:12px;text-align:left;}
    td{padding:8px 10px;border-bottom:1px solid #E5E7EB;}
    .footer{margin-top:40px;display:flex;justify-content:space-between;}
    .sign{text-align:center;width:180px;}.sign p{font-weight:bold;margin-bottom:50px;}
    @media print{button{display:none!important;}}</style></head><body>
    <div style="display:flex;justify-content:space-between">
      <div><h1>🪑 Nội Thất Tính Tuyết</h1><p style="color:#6B7280;margin:0">PHIẾU NHẬP KHO</p></div>
      <div style="text-align:right"><div style="font-size:20px;font-weight:bold;color:#1e3a5f">${item['Mã phiếu nhập']}</div>
      <div>Ngày nhập: ${fDate(item['Ngày nhập'])}</div>
      <span style="padding:3px 10px;border-radius:10px;background:${ttC.bg};color:${ttC.c};font-weight:bold">${item['Tình trạng hàng']||'—'}</span></div>
    </div>
    <div class="info">
      <div class="box"><b>📦 Nhà cung cấp</b><br>${ncc['Tên NCC']||item['Mã NCC']||'—'}<br>Mã: ${item['Mã NCC']||'—'}${ncc['Số điện thoại']?'<br>SĐT: '+ncc['Số điện thoại']:''}</div>
      <div class="box"><b>🛒 Thông tin nhập</b><br>Đơn đặt hàng: ${item['Mã đặt hàng']||'Nhập trực tiếp'}<br>Người nhập: ${item['Người nhập']||user.hoTen||'—'}</div>
    </div>
    <table><thead><tr><th>Mã SP</th><th>Tên sản phẩm</th><th>ĐVT</th><th>SL đặt</th><th>SL nhận</th><th>Giá nhập</th><th>Thành tiền</th></tr></thead>
    <tbody><tr>
      <td>${item['Mã SP']||'—'}</td><td>${sp['Tên sản phẩm']||item['Mã SP']||'—'}</td>
      <td>${sp['Đơn vị tính']||'—'}</td><td>${item['Số lượng đặt']||0}</td>
      <td><b>${item['Số lượng thực nhận']||0}</b></td>
      <td>${fVND(item['Giá nhập thực tế'])}đ</td>
      <td><b>${fVND(item['Tổng tiền hàng'])}đ</b></td>
    </tr></tbody></table>
    <div style="text-align:right;margin-top:12px;font-size:15px;font-weight:bold;color:#1e3a5f">
      Tổng: ${fVND(Number(item['Tổng tiền hàng']||0)+Number(item['CP vận chuyển về kho']||0))}đ
      ${Number(item['CP vận chuyển về kho']||0)>0?` (bao gồm ${fVND(item['CP vận chuyển về kho'])}đ VC)`:''}
    </div>
    ${item['Ghi chú']?`<div style="margin-top:8px;padding:8px;background:#FFFBEB;border-radius:6px">Ghi chú: ${item['Ghi chú']}</div>`:''}
    <div class="footer">
      <div class="sign"><p>Người giao hàng</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign"><p>Người nhận hàng</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
      <div class="sign"><p>Thủ kho</p><div style="border-top:1px solid #ccc;padding-top:6px;font-size:11px;color:#6B7280">(Ký, ghi rõ họ tên)</div></div>
    </div>
    <script>window.onload=()=>window.print()</script></body></html>`
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close()}
  }

  // ── FILTER ───────────────────────────────────────────────
  const filtered = useMemo(()=>{
    let r=local
    if(filterTT!=='Tất cả')r=r.filter(d=>d['Tình trạng hàng']===filterTT)
    if(filterNCC!=='Tất cả')r=r.filter(d=>d['Mã NCC']===filterNCC)
    if(search.trim()){
      const q=boDau(search)
      r=r.filter(d=>boDau(d['Mã phiếu nhập']||'').includes(q)||boDau(d['Mã NCC']||'').includes(q)||boDau(nccMap[d['Mã NCC']]?.['Tên NCC']||'').includes(q)||boDau(d['Mã SP']||'').includes(q)||boDau(spMap[d['Mã SP']]?.['Tên sản phẩm']||'').includes(q))
    }
    return r
  },[local,filterTT,filterNCC,search,nccMap,spMap])

  const tongTrang = Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT   = Math.min(trang,tongTrang)
  const dsTrang   = filtered.slice((trangHT-1)*SO_DONG,trangHT*SO_DONG)
  const nccDS     = useMemo(()=>[...new Set(local.map(d=>d['Mã NCC']).filter(Boolean))].map(ma=>({ma,ten:nccMap[ma]?.['Tên NCC']||ma})),[local,nccMap])
  const tongGiaTri= local.reduce((s,d)=>s+Number(d['Tổng tiền hàng']||0),0)
  const soThieu   = local.filter(d=>d['Tình trạng hàng']==='Có vấn đề').length

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .nk-t th,.nk-t td{padding:8px 10px;vertical-align:middle;}
        .nk-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .mk{background:white;border-radius:12px;padding:28px;width:100%;max-width:860px;max-height:95vh;overflow-y:auto;}
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
            {local.length} phiếu · Tổng: <strong>{fVND(tongGiaTri)}đ</strong>
            {soThieu>0&&<span style={{marginLeft:'8px',color:'#DC2626',fontWeight:600}}>⚠️ {soThieu} cần xử lý</span>}
          </p>
        </div>
        <button onClick={()=>{resetForm();setShowModal(true)}} style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>+ Tạo phiếu nhập kho</button>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'12px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'10px',marginBottom:'14px'}}>
        {[
          {icon:'📋',label:'Tổng phiếu',val:local.length,c:'var(--primary)'},
          {icon:'✅',label:'Đủ hàng',val:local.filter(d=>d['Tình trạng hàng']==='Đủ').length,c:'#065F46'},
          {icon:'⚠️',label:'Cần xử lý',val:soThieu,c:'#DC2626'},
          {icon:'💰',label:'Tổng giá trị',val:fVND(tongGiaTri)+'đ',c:'#1e3a5f'},
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
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
          <input className="input" placeholder="🔍 Tìm phiếu, NCC, SP..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'180px',maxWidth:'260px'}}/>
          <select className="input" value={filterNCC} onChange={e=>setFilterNCC(e.target.value)} style={{width:'180px'}}>
            <option value="Tất cả">Tất cả NCC</option>
            {nccDS.map(n=><option key={n.ma} value={n.ma}>{n.ten}</option>)}
          </select>
          <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
            {['Tất cả','Đủ','Có vấn đề','Đã xử lý'].map(tt=>{
              const c=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
              return <button key={tt} onClick={()=>setFilterTT(tt)} style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid',borderColor:filterTT===tt?c.c:'var(--border)',background:filterTT===tt?c.bg:'white',color:filterTT===tt?c.c:'var(--text-secondary)',fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer'}}>{tt}</button>
            })}
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
                const ttC=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
                return (
                  <tr key={item['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                    <td style={{fontWeight:600,color:'#374151',fontSize:'12px',whiteSpace:'nowrap'}}>
                      {item['Mã phiếu nhập']||'—'}
                      {item['Mã đặt hàng']&&<div style={{fontSize:'10px',color:'#9CA3AF'}}>🛒 {item['Mã đặt hàng']}</div>}
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
                    <td style={{textAlign:'right',fontSize:'12px'}}>{Number(item['Giá nhập thực tế']||0)>0?fVND(item['Giá nhập thực tế'])+'đ':'—'}</td>
                    <td style={{textAlign:'right',fontWeight:700,whiteSpace:'nowrap'}}>
                      {fVND(item['Tổng tiền hàng']||0)}đ
                      {Number(item['CP vận chuyển về kho']||0)>0&&<div style={{fontSize:'10px',color:'#6B7280'}}>+{fVND(item['CP vận chuyển về kho'])}đ VC</div>}
                    </td>
                    <td style={{textAlign:'center'}}>
                      <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:ttC.bg,color:ttC.c,whiteSpace:'nowrap'}}>{tt}</span>
                    </td>
                    <td style={{fontSize:'12px',color:'#6B7280'}}>{item['Người nhập']||'—'}</td>
                    <td style={{textAlign:'center'}}>
                      <div style={{display:'flex',flexDirection:'column',gap:'4px',width:'110px'}}>
                        {isOwner&&<button onClick={()=>{setEditItem(item);setMaNCC(item['Mã NCC']||'');setTenNCC(nccMap[item['Mã NCC']]?.['Tên NCC']||'');setQNCC(nccMap[item['Mã NCC']]?.['Tên NCC']||'');setMaSP(item['Mã SP']||'');setTenSP(spMap[item['Mã SP']]?.['Tên sản phẩm']||'');setQSP(spMap[item['Mã SP']]?.['Tên sản phẩm']||'');setNgayNhap(item['Ngày nhập']?.split('T')[0]||'');setSlThucNhan(Number(item['Số lượng thực nhận']||0));setGiaNhapNCC(Number(item['Giá nhập thực tế']||0));setCpvcKho(Number(item['CP vận chuyển về kho']||0));setTinhTrang(item['Tình trạng hàng']||'Đủ');setGhiChu(item['Ghi chú']||'');setShowModal(true)}} style={{padding:'5px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600,textAlign:'center'}}>✏️ Sửa</button>}
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'4px'}}>
                          <button onClick={()=>xuatPDF(item)} style={{padding:'5px',borderRadius:'5px',border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600}}>📄 PDF</button>
                          {isOwner&&<button onClick={()=>setXoaItem(item)} style={{padding:'5px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>}
                        </div>
                        {(tt==='Thiếu'||(tt==='Lỗi'&&Number(item['Số lượng đặt']||0)>Number(item['Số lượng thực nhận']||0)))&&<button onClick={()=>taoDonBu(item)} style={{padding:'5px',borderRadius:'5px',border:'1px solid #6D28D9',background:'#EDE9FE',color:'#6D28D9',fontSize:'11px',cursor:'pointer',fontWeight:600,textAlign:'center'}}>📋 Tạo đơn bù</button>}
                        {tt==='Có vấn đề'&&<button onClick={()=>setPopupXuLy(item)} style={{padding:'5px',borderRadius:'5px',border:'1px solid #D97706',background:'#FEF3C7',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600,textAlign:'center'}}>⚙️ Xử lý</button>}
                        {tt!=='Đã xử lý'&&tt!=='Có vấn đề'&&<button onClick={()=>{setPopupBaoCao(item);setBcSoLuong(1)}} style={{padding:'5px',borderRadius:'5px',border:'1px solid #DC2626',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600,textAlign:'center'}}>⚠️ Báo vấn đề</button>}
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

      {/* ══ MODAL TẠO/SỬA PHIẾU ══ */}
      {showModal&&(
        <div className="ov">
          <div className="mk">
            {/* Tiêu đề */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>{editItem?'✏️ Sửa phiếu nhập kho':'📦 Tạo phiếu nhập kho'}</h2>
              <button onClick={()=>{setShowModal(false);resetForm()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'22px',color:'#6B7280'}}>✕</button>
            </div>

            {/* Tab loại nhập - chỉ khi tạo mới */}
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

            {/* Thông tin chung */}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'12px'}}>
                {/* NCC */}
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

            {/* Nhập từ đơn NCC */}
            {loaiNhap==='tu-don'&&!editItem&&(
              <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
                <label className="lbl">Chọn đơn đặt hàng NCC *</label>
                <select className="input" value={maDonChon} onChange={e=>{
                    const ma=e.target.value
                    if(!ma){setMaDonChon('');setSpItems([]);return}
                    const grp=donNCCGrouped[ma]||[]
                    const nccDon=grp[0]?.['Mã NCC']||''
                    // Nếu đã chọn NCC mà đơn thuộc NCC khác → cảnh báo, không cho chọn
                    if(maNCC&&nccDon&&nccDon!==maNCC){
                      showMsgM(`⚠️ Đơn "${ma}" thuộc "${nccMap[nccDon]?.['Tên NCC']||nccDon}" — không khớp NCC đã chọn!`,false)
                      e.target.value=maDonChon // reset về giá trị cũ
                      return
                    }
                    // Nếu chưa chọn NCC → tự điền
                    if(!maNCC&&nccDon){
                      setMaNCC(nccDon)
                      setTenNCC(nccMap[nccDon]?.['Tên NCC']||nccDon)
                      setQNCC(nccMap[nccDon]?.['Tên NCC']||nccDon)
                    }
                    chonDon(ma)
                  }} style={{marginBottom:'10px'}}>
                  <option value="">-- Chọn đơn --</option>
                  {Object.keys(donNCCGrouped).map(ma=>{
                    const grp=donNCCGrouped[ma]
                    const nccDon=grp[0]?.['Mã NCC']||''
                    const nccTen=nccMap[nccDon]?.['Tên NCC']||nccDon||'—'
                    const khopNCC=!maNCC||nccDon===maNCC
                    return <option key={ma} value={ma} disabled={!khopNCC} style={{color:khopNCC?'inherit':'#9CA3AF'}}>
                      {ma} — {nccTen} ({grp.length} SP){!khopNCC?' ⚠️ Khác NCC':''}
                    </option>
                  })}
                </select>
                {spItems.length>0&&(
                  <>
                    <div style={{display:'grid',gridTemplateColumns:'24px 2fr 70px 70px 110px 100px 110px 1fr',gap:'6px',padding:'4px 6px',fontSize:'11px',color:'#6B7280',fontWeight:600}}>
                      <div></div><div>Sản phẩm</div><div style={{textAlign:'center'}}>SL đặt</div><div style={{textAlign:'center'}}>SL nhận</div><div>Giá nhập (đ)</div><div>Tình trạng</div><div>Thành tiền</div><div>Ghi chú</div>
                    </div>
                    {spItems.map((it,i)=>(
                      <div key={i} style={{display:'grid',gridTemplateColumns:'24px 2fr 70px 70px 110px 100px 110px 1fr',gap:'6px',padding:'6px',borderTop:'1px solid #E5E7EB',alignItems:'center'}}>
                        <input type="checkbox" checked={it.checked} onChange={e=>updItem(i,'checked',e.target.checked)} style={{width:'16px',height:'16px',accentColor:'var(--primary)'}}/>
                        <div>
                          <div style={{fontWeight:600,fontSize:'12px'}}>{it.tenSP}</div>
                          <div style={{fontSize:'10px',color:'#6B7280'}}>{it.maSP} · {it.donVi}</div>
                        </div>
                        <div style={{textAlign:'center',fontSize:'12px',color:'#6B7280'}}>{it.slDat}</div>
                        <input type="number" min="0" value={it.sl===0?'0':it.sl||''} disabled={!it.checked}
                          onChange={e=>updItem(i,'sl',e.target.value===''?0:Number(e.target.value))}
                          style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'12px',textAlign:'center',width:'100%',opacity:it.checked?1:0.5}}/>
                        <input type="number" min="0" value={it.giaNCC||''} disabled={!it.checked}
                          onChange={e=>updItem(i,'giaNCC',Number(e.target.value)||0)}
                          style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'12px',width:'100%',opacity:it.checked?1:0.5}}/>
                        <select value={it.tinhTrang} disabled={!it.checked} onChange={e=>updItem(i,'tinhTrang',e.target.value)}
                          style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'11px',width:'100%',background:TT_COLOR[it.tinhTrang]?.bg||'white',color:TT_COLOR[it.tinhTrang]?.c||'#374151',fontWeight:600,opacity:it.checked?1:0.5}}>
                          <option>Đủ</option><option>Có vấn đề</option><option>Đã xử lý</option>
                        </select>
                        <div style={{fontSize:'12px',fontWeight:600,color:'var(--primary)'}}>{fVND(it.sl*(it.giaNCC+it.cpvc))}đ</div>
                        <input type="text" value={it.ghiChu} disabled={!it.checked} placeholder="Ghi chú..."
                          onChange={e=>updItem(i,'ghiChu',e.target.value)}
                          style={{padding:'4px 6px',border:'1px solid var(--border)',borderRadius:'5px',fontSize:'11px',width:'100%',opacity:it.checked?1:0.5}}/>
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

            {/* Nhập trực tiếp hoặc sửa */}
            {(loaiNhap==='truc-tiep'||editItem)&&(
              <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'14px',marginBottom:'14px',border:'1px solid #E5E7EB'}}>
                {/* Header */}
                {!editItem&&<div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                  <label className="lbl" style={{margin:0,color:'var(--primary)',fontSize:'12px',textTransform:'uppercase'}}>📦 Sản phẩm nhập kho</label>
                  <div style={{display:'flex',gap:'6px'}}>
                    <button onClick={()=>setShowNewSP(true)} style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid #8B5CF6',background:'#F5F3FF',color:'#7C3AED',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>✨ Thêm SP mới</button>
                  </div>
                </div>}
                {/* Form nhập SP - hàng 1: SP + SL */}
                <div style={{display:'grid',gridTemplateColumns:'2fr 120px',gap:'10px',marginBottom:'8px'}}>
                  <div>
                    <label className="lbl">Sản phẩm *</label>
                    <SPInput spList={spLocal} value={qSP} maSP={maSP}
                      onSelect={(ma,ten,giaNCC,cpvc)=>{setMaSP(ma);setTenSP(ten);setQSP(ten);setGiaNhapNCC(giaNCC);setCpvcKho(cpvc)}}
                      onChange={v=>{setQSP(v);setMaSP('')}}/>
                    <div style={{fontSize:'10px',color:'var(--primary)',fontWeight:600,marginTop:'2px',minHeight:'14px'}}>
                      {maSP?`✅ ${tenSP} · Tồn: ${spMap[maSP]?.['Tồn kho']||0}`:''}
                    </div>
                  </div>
                  <div>
                    <label className="lbl">Số lượng nhập</label>
                    <input className="input" type="number" min="0" value={slThucNhan||''} placeholder="0" onChange={e=>setSlThucNhan(Number(e.target.value)||0)}/>
                    <div style={{fontSize:'10px',color:'#6B7280',marginTop:'2px',minHeight:'14px'}}>&nbsp;</div>
                  </div>

                </div>
                {/* Form nhập SP - hàng 2: giá + lỗi + PK + nút */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 80px 80px 1fr',gap:'10px',marginBottom:'8px'}}>
                  <div>
                    <label className="lbl">📦 Giá nhập NCC (đ)</label>
                    <input className="input" type="number" min="0" value={giaNhapNCC||''} placeholder="0" onChange={e=>setGiaNhapNCC(Number(e.target.value)||0)}/>
                    <div style={{fontSize:'10px',color:'#6B7280',marginTop:'2px',minHeight:'14px'}}>{giaNhapNCC>0?fVND(giaNhapNCC)+'đ':''}</div>
                  </div>
                  <div>
                    <label className="lbl">🚚 CPVC về kho (đ)</label>
                    <input className="input" type="number" min="0" value={cpvcKho||''} placeholder="0" onChange={e=>setCpvcKho(Number(e.target.value)||0)}/>
                    <div style={{fontSize:'10px',color:'#6B7280',marginTop:'2px',minHeight:'14px'}}>{cpvcKho>0?fVND(cpvcKho)+'đ':''}</div>
                  </div>
                  <div>
                    <label className="lbl">🔴 Lỗi</label>
                    <input className="input" type="number" min="0" value={slLoi||''} placeholder="0" onChange={e=>setSlLoi(Number(e.target.value)||0)}/>
                    <div style={{fontSize:'10px',color:'#6B7280',marginTop:'2px',minHeight:'14px'}}>&nbsp;</div>
                  </div>
                  <div>
                    <label className="lbl">🟡 Thiếu PK</label>
                    <input className="input" type="number" min="0" value={slChoiPK||''} placeholder="0" onChange={e=>setSlChoiPK(Number(e.target.value)||0)}/>
                    <div style={{fontSize:'10px',color:'#6B7280',marginTop:'2px',minHeight:'14px'}}>&nbsp;</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-start'}}>
                    <label className="lbl" style={{visibility:'hidden'}}>_</label>
                    {!editItem
                      ? <button onClick={addSPToList} style={{padding:'9px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>+ Thêm SP vào danh sách</button>
                      : <div style={{padding:'8px 12px',background:'#EFF6FF',borderRadius:'6px',fontSize:'12px',fontWeight:700,color:'var(--primary)',textAlign:'center'}}>{fVND(slThucNhan*(giaNhapNCC+cpvcKho))}đ</div>
                    }
                    <div style={{fontSize:'10px',color:'#6B7280',marginTop:'2px',minHeight:'14px'}}>
                      {!editItem&&maSP&&slThucNhan>0?`${slThucNhan} × ${fVND(giaNhapNCC+cpvcKho)}đ = ${fVND(slThucNhan*(giaNhapNCC+cpvcKho))}đ`:''}
                    </div>
                  </div>
                </div>

                {/* Danh sách SP đã thêm */}
                {dsSP.length>0&&(
                  <div style={{marginTop:'10px',border:'1px solid #E5E7EB',borderRadius:'8px',overflow:'hidden'}}>
                    <div style={{background:'#F0F4FF',padding:'6px 10px',fontSize:'11px',fontWeight:600,color:'var(--primary)',display:'flex',justifyContent:'space-between'}}>
                      <span>DANH SÁCH SẢN PHẨM ({dsSP.length})</span>
                      <span>Tổng: {fVND(dsSP.reduce((s:number,it:any)=>s+it.slThucNhan*(it.giaNhapNCC+it.cpvcKho),0))}đ</span>
                    </div>
                    {dsSP.map((it:any,i:number)=>(
                      <div key={it._id} style={{display:'grid',gridTemplateColumns:'2fr 60px 120px 120px 100px 28px',gap:'6px',padding:'8px 10px',borderTop:i>0?'1px solid #F0F0F0':'none',alignItems:'center',background:i%2===0?'white':'#FAFBFD'}}>
                        <div>
                          <div style={{fontWeight:600,fontSize:'12px'}}>{it.tenSP}</div>
                          <div style={{fontSize:'10px',color:'#6B7280'}}>{it.maSP}</div>
                        </div>
                        <div style={{textAlign:'center',fontWeight:700}}>{it.slThucNhan}</div>
                        <div style={{fontSize:'12px',color:'#374151'}}>{fVND(it.giaNhapNCC)}đ</div>
                        <div style={{fontWeight:700,color:'var(--primary)',fontSize:'12px'}}>{fVND(it.slThucNhan*(it.giaNhapNCC+it.cpvcKho))}đ</div>
                        <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:600,background:TT_COLOR[it.tinhTrang]?.bg||'#F3F4F6',color:TT_COLOR[it.tinhTrang]?.c||'#374151'}}>{it.tinhTrang}</span>
                        <button onClick={()=>removeSPFromList(it._id)} style={{padding:'3px 6px',borderRadius:'4px',border:'none',background:'#FEE2E2',color:'#DC2626',cursor:'pointer',fontSize:'12px'}}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Nút Thêm sản phẩm ở dưới */}
                {!editItem&&<button onClick={addSPToList} style={{marginTop:'8px',width:'100%',padding:'8px',borderRadius:'7px',border:'2px dashed var(--border)',background:'white',color:'var(--text-secondary)',fontSize:'13px',fontWeight:600,cursor:'pointer'}}>+ Thêm sản phẩm vào danh sách</button>}

                {/* Tổng khi chỉ có 1 SP (chưa thêm vào list) */}
                {dsSP.length===0&&maSP&&slThucNhan>0&&(
                  <div style={{marginTop:'8px',padding:'8px 12px',background:'#EFF6FF',borderRadius:'6px',display:'flex',justifyContent:'space-between',fontSize:'12px'}}>
                    <span style={{color:'#6B7280'}}>{tenSP} × {slThucNhan}</span>
                    <span style={{fontWeight:700,color:'var(--primary)'}}>{fVND(slThucNhan*(giaNhapNCC+cpvcKho))}đ</span>
                  </div>
                )}
              </div>
            )}

            <div>
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
        <div className="ov">
          <div className="mk2">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>+ Thêm nhà cung cấp mới</h2>
              <button onClick={()=>setShowNewNCC(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
                <div><label className="lbl">Mã NCC (tự động)</label><input className="input" placeholder="NCC-xxx" value={newMaNCC2} onChange={e=>setNewMaNCC2(e.target.value)}/></div>
                <div><label className="lbl">Tên NCC *</label><input className="input" placeholder="Tên NCC..." value={newTenNCC} onChange={e=>setNewTenNCC(e.target.value)} autoFocus/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">📞 Số điện thoại</label><input className="input" placeholder="0xxx..." value={newSdtNCC} onChange={e=>setNewSdtNCC(e.target.value)}/></div>
                <div><label className="lbl">🏦 Số TK ngân hàng</label><input className="input" placeholder="STK..." value={newStkNCC} onChange={e=>setNewStkNCC(e.target.value)}/></div>
              </div>
              <div><label className="lbl">📍 Địa chỉ</label><input className="input" placeholder="Địa chỉ..." value={newDiaChiNCC} onChange={e=>setNewDiaChiNCC(e.target.value)}/></div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuNCC} disabled={savingNCC} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:savingNCC?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,cursor:savingNCC?'not-allowed':'pointer'}}>
                  {savingNCC?'⏳':'✅ Thêm nhà cung cấp'}
                </button>
                <button onClick={()=>setShowNewNCC(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL SP MỚI ══ */}
      {showNewSP&&(
        <div className="ov">
          <div className="mk2" style={{maxWidth:'680px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>+ Thêm sản phẩm mới</h2>
              <button onClick={()=>setShowNewSP(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
                <div><label className="lbl">Mã SP (tự động nếu trống)</label><input className="input" placeholder="SP-001" value={newMaSP} onChange={e=>setNewMaSP(e.target.value)}/></div>
                <div><label className="lbl">Tên sản phẩm *</label><input className="input" placeholder="Tên sản phẩm..." value={newTenSP} onChange={e=>setNewTenSP(e.target.value)} autoFocus/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">Loại SP</label><select className="input" value={newLoai} onChange={e=>setNewLoai(e.target.value)}><option>Phổ thông</option><option>Theo yêu cầu</option></select></div>
                <div><label className="lbl">Đơn vị tính</label><select className="input" value={newDonVi} onChange={e=>setNewDonVi(e.target.value)}><option>Cái</option><option>Chiếc</option><option>Bộ</option></select></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">📦 Giá nhập NCC (đ)</label><input className="input" type="number" min="0" placeholder="0" value={newGiaNCC||''} onChange={e=>setNewGiaNCC(Number(e.target.value)||0)}/></div>
                <div><label className="lbl">🚚 CPVC về kho (đ)</label><input className="input" type="number" min="0" placeholder="0" value={newCpvc||''} onChange={e=>setNewCpvc(Number(e.target.value)||0)}/></div>
                <div><label className="lbl">💵 Giá bán buôn (đ)</label><input className="input" type="number" min="0" placeholder="0" value={newGiaBuon||''} onChange={e=>setNewGiaBuon(Number(e.target.value)||0)}/></div>
                <div><label className="lbl">🏷️ Giá bán lẻ (đ)</label><input className="input" type="number" min="0" placeholder="0" value={newGiaLe||''} onChange={e=>setNewGiaLe(Number(e.target.value)||0)}/></div>
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
          </div>
        </div>
      )}

      {/* ══ MODAL XỬ LÝ ══ */}
      {popupXuLy&&(()=>{
        const slNhan  = Number(popupXuLy['Số lượng thực nhận']||0)
        const slDat   = Number(popupXuLy['Số lượng đặt']||0)
        const slLoi2  = Number(popupXuLy['Số lượng lỗi']||0)
        const slPK    = Number(popupXuLy['Số lượng chờ phụ kiện']||0)
        // Chỉ tính thừa/thiếu khi có SL đặt (nhập từ đơn NCC)
        const coSLDat = slDat > 0
        const slThua  = coSLDat && slNhan > slDat ? slNhan - slDat : 0
        const slThieu = coSLDat && slNhan < slDat ? slDat - slNhan : 0
        const slTraNCC= slLoi2 + slPK
        const spTen   = spMap[popupXuLy['Mã SP']]?.['Tên sản phẩm']||popupXuLy['Mã SP']
        const donVi   = spMap[popupXuLy['Mã SP']]?.['Đơn vị tính']||'cái'
        return (
          <div className="ov">
            <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'480px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
                <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>⚙️ Xử lý phiếu nhập kho</h2>
                <button onClick={()=>setPopupXuLy(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
              </div>

              {/* Thông tin phiếu */}
              <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'14px',fontSize:'13px'}}>
                <div style={{fontWeight:600,marginBottom:'8px'}}>{popupXuLy['Mã phiếu nhập']} — {spTen}</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'6px',fontSize:'12px'}}>
                  {slDat>0&&<div style={{padding:'6px 10px',background:'white',borderRadius:'6px',border:'1px solid #E5E7EB'}}>
                    <div style={{color:'#6B7280',fontSize:'11px'}}>SL đặt hàng</div>
                    <div style={{fontWeight:700,fontSize:'16px'}}>{slDat} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div>
                  </div>}
                  <div style={{padding:'6px 10px',background:'white',borderRadius:'6px',border:'1px solid #E5E7EB'}}>
                    <div style={{color:'#6B7280',fontSize:'11px'}}>SL thực nhận</div>
                    <div style={{fontWeight:700,fontSize:'16px'}}>{slNhan} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div>
                  </div>
                  {slLoi2>0&&<div style={{padding:'6px 10px',background:'#FEF2F2',borderRadius:'6px',border:'1px solid #FCA5A5'}}>
                    <div style={{color:'#DC2626',fontSize:'11px'}}>🔴 Số lượng lỗi</div>
                    <div style={{fontWeight:700,fontSize:'16px',color:'#DC2626'}}>{slLoi2} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div>
                  </div>}
                  {slPK>0&&<div style={{padding:'6px 10px',background:'#FEF3C7',borderRadius:'6px',border:'1px solid #FCD34D'}}>
                    <div style={{color:'#D97706',fontSize:'11px'}}>🟡 Chờ phụ kiện</div>
                    <div style={{fontWeight:700,fontSize:'16px',color:'#D97706'}}>{slPK} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div>
                  </div>}
                  {slThua>0&&<div style={{padding:'6px 10px',background:'#DBEAFE',borderRadius:'6px',border:'1px solid #93C5FD'}}>
                    <div style={{color:'#1E40AF',fontSize:'11px'}}>🔵 Số lượng thừa</div>
                    <div style={{fontWeight:700,fontSize:'16px',color:'#1E40AF'}}>{slThua} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div>
                  </div>}
                  {slThieu>0&&<div style={{padding:'6px 10px',background:'#FEF3C7',borderRadius:'6px',border:'1px solid #FCD34D'}}>
                    <div style={{color:'#92400E',fontSize:'11px'}}>⚠️ Số lượng thiếu</div>
                    <div style={{fontWeight:700,fontSize:'16px',color:'#92400E'}}>{slThieu} <span style={{fontSize:'11px',fontWeight:400}}>{donVi}</span></div>
                  </div>}
                </div>
              </div>

              {/* Các lựa chọn xử lý */}
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {/* Giữ hàng - áp dụng mọi trường hợp */}
                <button onClick={()=>{xuLyPhieu(popupXuLy,false);setPopupXuLy(null)}}
                  style={{padding:'12px',borderRadius:'8px',border:'1px solid #16A34A',background:'#F0FDF4',color:'#065F46',fontWeight:700,cursor:'pointer',fontSize:'13px',textAlign:'left'}}>
                  ✅ Giữ nguyên — Đã xử lý xong
                  <div style={{fontSize:'11px',fontWeight:400,marginTop:'2px',color:'#6B7280'}}>
                    {slPK>0?`NCC đã bổ sung phụ kiện, nhập thêm ${slPK} ${donVi} vào kho`:
                     slThua>0?`Đồng ý giữ ${slThua} ${donVi} thừa trong kho`:
                     'Đổi trạng thái → Đã xử lý, tồn kho không thay đổi'}
                  </div>
                </button>

                {/* Trả hàng lỗi/chờ PK */}
                {slTraNCC>0&&(
                  <button onClick={()=>{xuLyPhieu(popupXuLy,true);setPopupXuLy(null)}}
                    style={{padding:'12px',borderRadius:'8px',border:'1px solid #DC2626',background:'#FEF2F2',color:'#DC2626',fontWeight:700,cursor:'pointer',fontSize:'13px',textAlign:'left'}}>
                    🔄 Trả lại {slTraNCC} {donVi} cho NCC
                    <div style={{fontSize:'11px',fontWeight:400,marginTop:'2px',color:'#6B7280'}}>
                      {slLoi2>0&&slPK>0?`${slLoi2} ${donVi} lỗi + ${slPK} ${donVi} chờ phụ kiện`:
                       slLoi2>0?`${slLoi2} ${donVi} bị lỗi`:
                       `${slPK} ${donVi} chờ phụ kiện`}
                      {' · Trừ '}{slTraNCC}{' '}{donVi}{' khỏi tồn kho'}
                    </div>
                  </button>
                )}

                {/* Trả hàng thừa */}
                {slThua>0&&(
                  <button onClick={()=>{xuLyPhieu({...popupXuLy,'_slTraThua':slThua},true);setPopupXuLy(null)}}
                    style={{padding:'12px',borderRadius:'8px',border:'1px solid #1E40AF',background:'#EFF6FF',color:'#1E40AF',fontWeight:700,cursor:'pointer',fontSize:'13px',textAlign:'left'}}>
                    🔄 Trả lại {slThua} {donVi} thừa cho NCC
                    <div style={{fontSize:'11px',fontWeight:400,marginTop:'2px',color:'#6B7280'}}>
                      NCC giao dư {slThua} {donVi} · Trả lại và trừ {slThua} {donVi} khỏi tồn kho
                    </div>
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
            {/* Thông tin phiếu */}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'14px',fontSize:'13px'}}>
              <div style={{fontWeight:600}}>{popupBaoCao['Mã phiếu nhập']} — {spMap[popupBaoCao['Mã SP']]?.['Tên sản phẩm']||popupBaoCao['Mã SP']}</div>
              <div style={{color:'#6B7280',marginTop:'4px',fontSize:'12px'}}>
                SL thực nhận: <strong>{popupBaoCao['Số lượng thực nhận']}</strong> {spMap[popupBaoCao['Mã SP']]?.['Đơn vị tính']||''}
                · NCC: {nccMap[popupBaoCao['Mã NCC']]?.['Tên NCC']||popupBaoCao['Mã NCC']}
              </div>
            </div>
            {/* Form báo cáo */}
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div>
                  <label className="lbl">Loại vấn đề</label>
                  <select className="input" value={bcLoai} onChange={e=>setBcLoai(e.target.value)}>
                    <option>Lỗi</option>
                    <option>Thiếu phụ kiện</option>
                    <option>Thừa hàng</option>
                    <option>Thiếu hàng</option>
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
                  <option>Trả NCC</option>
                  <option>Giữ trong kho</option>
                  <option>Nhận bổ sung</option>
                  <option>Đặt bù</option>
                </select>
              </div>
              <div>
                <label className="lbl">Ghi chú chi tiết</label>
                <input className="input" placeholder="Mô tả vấn đề cụ thể..." value={bcGhiChu} onChange={e=>setBcGhiChu(e.target.value)}/>
              </div>
              <div style={{padding:'8px 12px',background:'#FEF3C7',borderRadius:'6px',fontSize:'12px',color:'#92400E'}}>
                ⚠️ Sau khi báo cáo, phiếu nhập sẽ chuyển sang trạng thái "Có vấn đề" và tạo phiếu xử lý riêng.
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

// ── SUB-COMPONENTS (tránh re-render parent) ──────────────────
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
              {n['Số điện thoại']&&<div style={{fontSize:'11px',color:'#6B7280'}}>📞 {n['Số điện thoại']}</div>}
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
