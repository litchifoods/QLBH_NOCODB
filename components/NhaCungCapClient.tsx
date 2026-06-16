'use client'
// components/NhaCungCapClient.tsx
import { useState, useMemo } from 'react'
import { UserSession } from '@/lib/auth'

function fVND(n:any){return Number(n||0).toLocaleString('vi-VN')}
function fDate(s:string){if(!s)return'—';try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}catch{return s}}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const SO_DONG = 10
const HINH_THUC = ['Tiền mặt','Chuyển khoản','Ví điện tử']
const LOAI_TT   = ['Thanh toán','NCC trả lại','Điều chỉnh']

export default function NhaCungCapClient({nccList,ttList,nhapKhoList,ctList=[],chiTietCTList=[],user}:{
  nccList:any[]; ttList:any[]; nhapKhoList:any[]; ctList?:any[]; chiTietCTList?:any[]; user:UserSession
}) {
  const isOwner = user.vaiTro === 'Chủ cửa hàng'
  const [localNCC,  setLocalNCC]  = useState(nccList)
  const [localTT,   setLocalTT]   = useState(ttList)
  const [view,      setView]      = useState<'list'|'detail'>('list')
  const [nccChon,   setNccChon]   = useState<any>(null)
  const [search,    setSearch]    = useState('')
  const [filterNo,  setFilterNo]  = useState('Tất cả')
  const [trang,     setTrang]     = useState(1)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTTModal,setShowTTModal]=useState(false)
  const [loading,   setLoading]   = useState(false)
  const [editNCC,   setEditNCC]   = useState<any>(null)
  const [tabChiTiet,setTabChiTiet]=useState<'nhap-kho'|'thanh-toan'|'chuong-trinh'>('nhap-kho')
  const [localCT,setLocalCT]=useState<any[]>(ctList)
  const [localCTChiTiet,setLocalCTChiTiet]=useState<any[]>(chiTietCTList)
  const [showCTModal,setShowCTModal]=useState(false)
  const [editCT,setEditCT]=useState<any>(null)
  const [showCTChiTietModal,setShowCTChiTietModal]=useState(false)
  const [ctDangXem,setCtDangXem]=useState<any>(null)
  const [ctMoRong,setCtMoRong]=useState<string|null>(null)
  const [ctTen,setCtTen]=useState('')
  const [ctSoThongBao,setCtSoThongBao]=useState('')
  const [ctLoai,setCtLoai]=useState('B - Gói cọc')
  const [ctNgayBD,setCtNgayBD]=useState('')
  const [ctNgayKT,setCtNgayKT]=useState('')
  const [ctHanGiaoHang,setCtHanGiaoHang]=useState('')
  const [ctCocYeuCau,setCtCocYeuCau]=useState(0)
  const [ctDaCoc,setCtDaCoc]=useState(0)
  const [ctMucTieu,setCtMucTieu]=useState(0)
  const [ctDaTichLuy,setCtDaTichLuy]=useState(0)
  const [ctLoaiThuong,setCtLoaiThuong]=useState('Du lịch trong nước')
  const [ctGiaTriThuong,setCtGiaTriThuong]=useState(0)
  const [ctTrangThai,setCtTrangThai]=useState('Đang tham gia')
  const [ctGhiChu,setCtGhiChu]=useState('')
  const [editCTCT,setEditCTCT]=useState<any>(null)
  const [ctctTenSP,setCtctTenSP]=useState('')
  const [ctctMaSP,setCtctMaSP]=useState('')
  const [ctctGiaNY,setCtctGiaNY]=useState(0)
  const [ctctCKCB,setCtctCKCB]=useState(0)
  const [ctctCKThem,setCtctCKThem]=useState(0)
  const [ctctGhiChu,setCtctGhiChu]=useState('')
  const [xoaNCC,        setXoaNCC]        = useState<any>(null)
  const [xoaCheckNCC,   setXoaCheckNCC]   = useState<any>(null)
  const [loadingXoaNCC, setLoadingXoaNCC] = useState(false)
  const [dangXoaNCC,    setDangXoaNCC]    = useState(false)

  // Filter lịch sử TT
  const [tuNgayTT,  setTuNgayTT]  = useState('')
  const [denNgayTT, setDenNgayTT] = useState('')
  const [trangTT,   setTrangTT]   = useState(1)

  // Form NCC
  const [tenNCC,    setTenNCC]    = useState('')
  const [maNCC,     setMaNCC]     = useState('')
  const [sdt,       setSdt]       = useState('')
  const [diaChi,    setDiaChi]    = useState('')
  const [stk,       setStk]       = useState('')
  const [ghiChuNCC, setGhiChuNCC] = useState('')
  const [nganHang,  setNganHang]  = useState('')
  const [sdtError,  setSdtError]  = useState('')

  // Form thanh toán
  const [ttSoTien,  setTtSoTien]  = useState(0)
  const [ttHinhThuc,setTtHinhThuc]=useState('Chuyển khoản')
  const [ttNguoiTra,setTtNguoiTra]=useState(user.hoTen||user.tenDangNhap||'')
  const [ttGhiChu,  setTtGhiChu]  = useState('')
  const [ttNgay,    setTtNgay]    = useState(new Date().toISOString().split('T')[0])
  const [ttMaPhieu, setTtMaPhieu] = useState('')
  const [ttNoiDung, setTtNoiDung] = useState('')
  const [ttCheDoTT, setTtCheDoTT] = useState<'phieu'|'tudon'>('tudon') // chế độ TT
  const [ttPhieuChon, setTtPhieuChon] = useState('') // mã phiếu khi chọn theo phiếu

  function showMsg2(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  // Tính tổng nhập kho theo NCC
  const nhapKhoMap = useMemo(()=>{
    const m:Record<string,number>={}
    nhapKhoList.forEach((nk:any)=>{
      const ma=nk['Mã NCC']||''
      m[ma]=(m[ma]||0)+Number(nk['Tổng tiền hàng']||0)+Number(nk['CP vận chuyển về kho']||0)
    })
    return m
  },[nhapKhoList])

  // Tính tổng đã TT theo NCC
  const ttMap = useMemo(()=>{
    const m:Record<string,number>={}
    localTT.filter((t:any)=>t['Trạng thái']!=='Huỷ').forEach((t:any)=>{
      const ma=t['Mã NCC']||''
      m[ma]=(m[ma]||0)+Number(t['Số tiền trả']||0)
    })
    return m
  },[localTT])

  // Danh sách NCC có công nợ tính toán
  const nccWithNo = useMemo(()=>localNCC.map((ncc:any)=>({
    ...ncc,
    _tongNhap: nhapKhoMap[ncc['Mã NCC']]||0,
    _tongDaTT: ttMap[ncc['Mã NCC']]||0,
    _conNo:    (nhapKhoMap[ncc['Mã NCC']]||0)-(ttMap[ncc['Mã NCC']]||0),
  })),[localNCC,nhapKhoMap,ttMap])

  // Thống kê tổng
  const tongConNo   = nccWithNo.reduce((s:number,n:any)=>s+n._conNo,0)
  const tongDaTT    = nccWithNo.reduce((s:number,n:any)=>s+n._tongDaTT,0)
  const soNccConNo  = nccWithNo.filter((n:any)=>n._conNo>0).length

  // Filter danh sách
  const filtered = useMemo(()=>{
    let r=nccWithNo
    if(filterNo==='Còn nợ') r=r.filter((n:any)=>n._conNo>0)
    if(filterNo==='Đã TT hết') r=r.filter((n:any)=>n._conNo===0&&n._tongNhap>0)
    if(search.trim()){const q=boDau(search);r=r.filter((n:any)=>boDau(n['Tên NCC']||'').includes(q)||boDau(n['Mã NCC']||'').includes(q)||boDau(n['Số điện thoại']||'').includes(q))}
    return r
  },[nccWithNo,filterNo,search])

  const tongTrang=Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT=Math.min(trang,tongTrang)
  const dsTrang=filtered.slice((trangHT-1)*SO_DONG,trangHT*SO_DONG)

  // Nhập kho của NCC đang xem
  const nhapKhoChon = useMemo(()=>nhapKhoList.filter((nk:any)=>nk['Mã NCC']===nccChon?.['Mã NCC']),[nhapKhoList,nccChon])

  // Lịch sử TT của NCC đang xem (có filter ngày)
  const ttChon = useMemo(()=>{
    let r=localTT.filter((t:any)=>t['Mã NCC']===nccChon?.['Mã NCC'])
    if(tuNgayTT) r=r.filter((t:any)=>(t['Ngày trả tiền NCC']||'').split('T')[0]>=tuNgayTT)
    if(denNgayTT) r=r.filter((t:any)=>(t['Ngày trả tiền NCC']||'').split('T')[0]<=denNgayTT)
    return r
  },[localTT,nccChon,tuNgayTT,denNgayTT])

  const tongTrangTT=Math.max(1,Math.ceil(ttChon.length/SO_DONG))
  const trangHTTT=Math.min(trangTT,tongTrangTT)
  const dsTrangTT=ttChon.slice((trangHTTT-1)*SO_DONG,trangHTTT*SO_DONG)

  async function moXoaNCC(ncc: any) {
    setXoaNCC(ncc); setXoaCheckNCC(null); setLoadingXoaNCC(true)
    try {
      const res = await fetch('/api/nha-cung-cap?loai=kiem-tra-xoa&maNCC='+encodeURIComponent(ncc['Mã NCC']||''))
      const d = await res.json(); setXoaCheckNCC(d)
    } catch { setXoaCheckNCC({ coTheXoa: false, lyDo: ['Lỗi kiểm tra'] }) }
    finally { setLoadingXoaNCC(false) }
  }

  async function xacNhanXoaNCC() {
    if (!xoaNCC || !xoaCheckNCC?.coTheXoa) return
    setDangXoaNCC(true)
    try {
      const id = Number(xoaNCC['Id']||xoaNCC['id'])
      const maNCC = xoaNCC['Mã NCC']||''
      const res = await fetch('/api/nha-cung-cap?id='+id+'&maNCC='+encodeURIComponent(maNCC), {method:'DELETE'})
      const d = await res.json()
      if (!res.ok) throw new Error(d.message||'Lỗi')
      setLocalNCC((p:any[])=>p.filter(n=>(n['Id']||n['id'])!==id))
      showMsg2('✅ Đã xóa NCC: '+xoaNCC['Tên NCC'])
      setXoaNCC(null); setXoaCheckNCC(null)
      if (view==='detail' && nccChon?.['Mã NCC']===maNCC) { setView('list'); setNccChon(null) }
    } catch(e:any) { showMsg2('❌ '+(e.message||'Lỗi'),false) }
    finally { setDangXoaNCC(false) }
  }

  function moChiTiet(ncc:any){setNccChon(ncc);setView('detail');setTabChiTiet('nhap-kho')}

  function resetFormNCC(){setTenNCC('');setMaNCC('');setSdt('');setDiaChi('');setStk('');setGhiChuNCC('');setNganHang('');setSdtError('');setEditNCC(null)}

  function moSuaNCC(ncc:any){
    setEditNCC(ncc);setMaNCC(ncc['Mã NCC']||'');setTenNCC(ncc['Tên NCC']||'')
    setSdt(ncc['Số điện thoại']||'');setDiaChi(ncc['Địa chỉ']||'')
    setStk(ncc['Số TK ngân hàng']||'');setNganHang(ncc['Ngân hàng']||'');setGhiChuNCC(ncc['Ghi chú']||'')
    setShowModal(true)
  }

  async function luuNCC(){
    if(!tenNCC.trim()){showMsg2('Nhập tên NCC',false);return}
    if(sdt.trim()&&(sdt.trim().length!==10||!sdt.trim().startsWith('0'))){
      showMsg2('Số điện thoại phải bắt đầu bằng 0 và đủ 10 số',false);return
    }
    setLoading(true)
    try{
      const data={'Tên NCC':tenNCC.trim(),'Số điện thoại':sdt,'Địa chỉ':diaChi,'Số TK ngân hàng':stk,'Ngân hàng':nganHang,'Ghi chú':ghiChuNCC}
      if(editNCC){
        const res=await fetch('/api/nha-cung-cap',{method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({id:Number(editNCC['Id']||editNCC['id']),...data})})
        if(!res.ok) throw new Error((await res.json()).message)
        setLocalNCC((p:any[])=>p.map(n=>(n['Id']||n['id'])===(editNCC['Id']||editNCC['id'])?{...n,...data}:n))
        if(nccChon&&(nccChon['Id']||nccChon['id'])===(editNCC['Id']||editNCC['id'])) setNccChon((p:any)=>({...p,...data}))
        showMsg2('✅ Đã cập nhật NCC')
      }else{
        const res=await fetch('/api/nha-cung-cap',{method:'POST',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({'Mã NCC':maNCC.trim()||undefined,...data})})
        const d=await res.json()
        if(!res.ok) throw new Error(d.message)
        setLocalNCC((p:any[])=>[{...d.data,'Mã NCC':d.maNCC,...data,'Công nợ NCC':0},...p])
        showMsg2('✅ Đã thêm NCC: '+tenNCC)
      }
      setShowModal(false);resetFormNCC()
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function luuThanhToan(){
    if(!ttSoTien||ttSoTien<=0){showMsg2('Nhập số tiền > 0',false);return}
    if(!nccChon) return
    setLoading(true)
    try{
      const conNo=nccWithNo.find((n:any)=>n['Mã NCC']===nccChon['Mã NCC'])?._conNo||0
      const res=await fetch('/api/nha-cung-cap',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          loai:'thanh-toan',
          maNCC:nccChon['Mã NCC'],
          cheDoTT:ttCheDoTT,
          maPhieuNhap:ttCheDoTT==='phieu'?ttPhieuChon:ttMaPhieu.trim(),
          soTien:ttSoTien,
          hinhThuc:ttHinhThuc,
          nguoiTra:ttNguoiTra,
          ghiChu:ttGhiChu,
          noiDung:ttNoiDung||('Thanh toán NCC '+nccChon['Tên NCC']),
          ngayTra:ttNgay,
          conNo,
        })})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message)
      // Cập nhật local
      const newTT={...d.data,'Mã thanh toán':d.maTT,'Mã NCC':nccChon['Mã NCC'],
        'Số tiền trả':ttSoTien,'Hình thức':ttHinhThuc,'Người trả':ttNguoiTra,
        'Ngày trả tiền NCC':ttNgay,'Ghi chú':ttGhiChu,'Trạng thái':'Đã xác nhận',
        'Số tiền còn lại sau TT':conNo-ttSoTien}
      setLocalTT((p:any[])=>[newTT,...p])
      setLocalNCC((p:any[])=>p.map(n=>n['Mã NCC']===nccChon['Mã NCC']
        ?{...n,'Công nợ NCC':Number(n['Công nợ NCC']||0)-ttSoTien}:n))
      setNccChon((p:any)=>({...p,'Công nợ NCC':Number(p['Công nợ NCC']||0)-ttSoTien}))
      showMsg2('✅ Đã ghi nhận thanh toán '+fVND(ttSoTien)+'đ')
      setShowTTModal(false)
      setTtSoTien(0);setTtGhiChu('');setTtMaPhieu('');setTtNoiDung('');setTtPhieuChon('');setTtCheDoTT('tudon')
      setTtNgay(new Date().toISOString().split('T')[0])
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function huyThanhToan(tt:any){
    if(!confirm('Huỷ thanh toán '+fVND(tt['Số tiền trả'])+'đ?')) return
    try{
      const res=await fetch('/api/nha-cung-cap',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(tt['Id']||tt['id']),loai:'thanh-toan'})})
      if(!res.ok) throw new Error((await res.json()).message)
      // Chỉ cần cập nhật localTT — _conNo tự tính lại từ ttMap
      setLocalTT((p:any[])=>p.map(t=>(t['Id']||t['id'])===(tt['Id']||tt['id'])?{...t,'Trạng thái':'Huỷ'}:t))
      showMsg2('✅ Đã huỷ thanh toán')
    }catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  const nccChonInfo = nccChon?nccWithNo.find((n:any)=>n['Mã NCC']===nccChon['Mã NCC'])||nccChon:null
  const ctChon=useMemo(()=>localCT.filter((ct:any)=>ct['Mã NCC']===nccChon?.['Mã NCC']),[localCT,nccChon])
  const soCtDangTG=ctChon.filter((ct:any)=>ct['Trạng thái']==='Đang tham gia').length

  function resetFormCT(){setCtTen('');setCtSoThongBao('');setCtLoai('B - Gói cọc');setCtNgayBD('');setCtNgayKT('');setCtHanGiaoHang('');setCtCocYeuCau(0);setCtMucTieu(0);setCtDaTichLuy(0);setCtLoaiThuong('Du lịch trong nước');setCtGiaTriThuong(0);setCtTrangThai('Đang tham gia');setCtGhiChu('');setEditCT(null)}

  function moSuaCT(ct:any){
    setEditCT(ct);setCtTen(ct['Tên chương trình']||'');setCtSoThongBao(ct['Số thông báo']||'')
    setCtLoai(ct['Loại CT']||'B - Gói cọc');setCtNgayBD((ct['Ngày bắt đầu']||'').split('T')[0])
    setCtNgayKT((ct['Ngày kết thúc']||'').split('T')[0]);setCtHanGiaoHang((ct['Hạn giao hàng']||'').split('T')[0])
    setCtCocYeuCau(Number(ct['Số tiền cọc yêu cầu']||0))
    setCtMucTieu(Number(ct['Mục tiêu doanh số']||0));setCtDaTichLuy(Number(ct['Đã tích lũy']||0))
    setCtLoaiThuong(ct['Loại thưởng']||'');setCtGiaTriThuong(Number(ct['Giá trị thưởng']||0))
    setCtTrangThai(ct['Trạng thái']||'Đang tham gia');setCtGhiChu(ct['Ghi chú']||'');setShowCTModal(true)
  }

  async function luuCT(){
    if(!ctTen.trim()){showMsg2('Nhập tên chương trình',false);return}
    setLoading(true)
    try{
      const data={maNCC:nccChon?.['Mã NCC']||'',tenNCC:nccChon?.['Tên NCC']||'',tenCT:ctTen,soThongBao:ctSoThongBao,loaiCT:ctLoai,ngayBD:ctNgayBD,ngayKT:ctNgayKT,hanGiaoHang:ctHanGiaoHang,cocYeuCau:ctCocYeuCau,daCoc:ctDaCoc,mucTieu:ctMucTieu,daTichLuy:ctDaTichLuy,loaiThuong:ctLoaiThuong,giaTriThuong:ctGiaTriThuong,trangThai:ctTrangThai,ghiChu:ctGhiChu}
      if(editCT){
        const res=await fetch('/api/chuong-trinh-ncc',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:Number(editCT['Id']||editCT['id']),...data})})
        if(!res.ok) throw new Error((await res.json()).message)
        setLocalCT(p=>p.map(ct=>(ct['Id']||ct['id'])===(editCT['Id']||editCT['id'])?{...ct,'Tên chương trình':ctTen,'Loại CT':ctLoai,'Trạng thái':ctTrangThai}:ct))
        showMsg2('✅ Đã cập nhật chương trình')
      }else{
        const res=await fetch('/api/chuong-trinh-ncc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})
        const d=await res.json()
        if(!res.ok) throw new Error(d.message)
        setLocalCT(p=>[{...d.data,'Mã CT':d.maCT,'Tên chương trình':ctTen,'Mã NCC':nccChon?.['Mã NCC'],'Loại CT':ctLoai,'Trạng thái':ctTrangThai},...p])
        showMsg2('✅ Đã tạo: '+ctTen)
      }
      setShowCTModal(false);resetFormCT()
    }catch(e:any){showMsg2(e.message||'Loi',false)}
    finally{setLoading(false)}
  }

  async function xoaCT(ct:any){
    if(!confirm('Xoa?')) return
    try{
      await fetch('/api/chuong-trinh-ncc?id='+Number(ct['Id']||ct['id']),{method:'DELETE'})
      setLocalCT(p=>p.filter(x=>(x['Id']||x['id'])!==(ct['Id']||ct['id'])))
      showMsg2('✅ Đã xóa chương trình')
    }catch(e:any){showMsg2(e.message||'Loi',false)}
  }

  async function luuCTChiTiet(){
    if(!ctctTenSP.trim()||!ctDangXem){showMsg2('Nhập tên SP',false);return}
    setLoading(true)
    try{
      const ckTong=ctctCKCB+ctctCKThem
      const giaSauCK=ctctGiaNY>0?Math.round(ctctGiaNY*(1-ckTong/100)):0
      const data={maCT:ctDangXem['Mã CT']||'',maNCC:ctDangXem['Mã NCC']||'',tenSP:ctctTenSP,maSP:ctctMaSP,giaNY:ctctGiaNY,ckCB:ctctCKCB,ckThem:ctctCKThem,ckTong,giaSauCK,ghiChu:ctctGhiChu}
      if(editCTCT){
        const res=await fetch('/api/chuong-trinh-ncc',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:Number(editCTCT['Id']||editCTCT['id']),loai:'chi-tiet',...data})})
        if(!res.ok) throw new Error((await res.json()).message)
        setLocalCTChiTiet(p=>p.map(x=>(x['Id']||x['id'])===(editCTCT['Id']||editCTCT['id'])?{...x,'Tên dòng SP':ctctTenSP,'Mã SP':ctctMaSP,'Gia niem yet':ctctGiaNY,'% CK cơ bản':ctctCKCB,'% CK thêm':ctctCKThem,'% CK tong':ckTong,'Gia sau CK':giaSauCK,'Ghi chú kích thước':ctctGhiChu}:x))
      }else{
        const res=await fetch('/api/chuong-trinh-ncc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({loai:'chi-tiet',...data})})
        const d=await res.json()
        if(!res.ok) throw new Error(d.message)
        setLocalCTChiTiet(p=>[{...d.data,'Ma CT':ctDangXem['Ma CT'],'Tên dòng SP':ctctTenSP,'Mã SP':ctctMaSP,'Gia niem yet':ctctGiaNY,'% CK cơ bản':ctctCKCB,'% CK thêm':ctctCKThem,'% CK tong':ckTong,'Gia sau CK':giaSauCK,'Ghi chú kích thước':ctctGhiChu},...p])
      }
      showMsg2('✅ Đã lưu SP trong CT')
      setCtctTenSP('');setCtctMaSP('');setCtctGiaNY(0);setCtctCKCB(0);setCtctCKThem(0);setCtctGhiChu('');setEditCTCT(null);setShowCTChiTietModal(false)
    }catch(e:any){showMsg2(e.message||'Loi',false)}
    finally{setLoading(false)}
  }

  return (
    <div style={{padding:'20px',position:'relative'}}>
      <style>{`
        .ncc-t th,.ncc-t td{padding:8px 10px;vertical-align:middle;}
        .ncc-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .mk{background:white;border-radius:12px;padding:24px;width:100%;max-width:520px;max-height:90vh;overflow-y:auto;}
        label.lbl{display:block;font-size:11px;font-weight:600;margin-bottom:3px;}
      `}</style>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'12px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B',position:'sticky',top:'10px',zIndex:10}}>{msg}</div>}

      {/* ══ VIEW: DANH SÁCH ══ */}
      {view==='list'&&(<>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
          <div>
            <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>🏭 Nhà cung cấp</h1>
            <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>
              {localNCC.length} NCC
              {soNccConNo>0&&<span style={{marginLeft:'8px',padding:'2px 8px',borderRadius:'10px',background:'#FEE2E2',color:'#DC2626',fontWeight:600,fontSize:'12px'}}>⚠️ {soNccConNo} Còn nợ NCC</span>}
            </p>
          </div>
          <button onClick={()=>{resetFormNCC();setShowModal(true)}}
            style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
            + Thêm NCC
          </button>
        </div>

        {/* Thống kê */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'14px'}}>
          {[
            {icon:'🏭',label:'Tổng số NCC',val:localNCC.length,c:'var(--primary)'},
            {icon:'💰',label:'Tổng công nợ',val:fVND(tongConNo)+'đ',c:'#DC2626'},
            {icon:'✅',label:'Tổng đã thanh toán',val:fVND(tongDaTT)+'đ',c:'#065F46'},
            {icon:'⚠️',label:'Còn nợ NCC',val:soNccConNo+' NCC',c:'#D97706'},
          ].map(({icon,label,val,c})=>(
            <div key={label} className="card" style={{padding:'12px 14px'}}>
              <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
              <div style={{fontSize:'16px',fontWeight:800,color:c}}>{val}</div>
              <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Filter */}
        <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
          <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
            <input className="input" placeholder="🔍 Tìm tên, mã, SĐT..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'200px',maxWidth:'280px'}}/>
            <div style={{display:'flex',gap:'4px'}}>
              {['Tất cả','Còn nợ','Đã TT hết'].map(f=>(
                <button key={f} onClick={()=>setFilterNo(f)}
                  style={{padding:'5px 12px',borderRadius:'20px',border:'1px solid',
                    borderColor:filterNo===f?'var(--primary)':'var(--border)',
                    background:filterNo===f?'var(--primary-pale)':'white',
                    color:filterNo===f?'var(--primary)':'var(--text-secondary)',
                    fontWeight:filterNo===f?700:400,fontSize:'12px',cursor:'pointer'}}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Bảng */}
        <div className="card" style={{overflowX:'auto'}}>
            <table className="ncc-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
              <thead>
                <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                  <th style={{textAlign:'left',fontWeight:700}}>Nhà cung cấp</th>
                  <th style={{textAlign:'left',fontWeight:700}}>Số TK ngân hàng</th>
                  <th style={{textAlign:'right',fontWeight:700}}>Tổng nhập kho</th>
                  <th style={{textAlign:'right',fontWeight:700}}>Công nợ</th>
                  <th style={{textAlign:'center',fontWeight:700,width:'140px'}}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {dsTrang.length===0?(
                  <tr><td colSpan={5} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Chưa có nhà cung cấp nào</td></tr>
                ):dsTrang.map((ncc:any,i:number)=>{
                  const conNo=ncc._conNo
                  const coNo=conNo>0
                  return (
                    <tr key={ncc['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td>
                        <div style={{fontWeight:700,color:'var(--primary)',cursor:'pointer',textDecoration:'underline'}}
                          onClick={()=>moChiTiet(ncc)}>{ncc['Tên NCC']||'—'}</div>
                        <div style={{fontSize:'11px',color:'#6B7280'}}>{ncc['Mã NCC']}{ncc['Số điện thoại']?' · 📞'+ncc['Số điện thoại']:''}</div>
                      </td>
                      <td style={{fontSize:'12px',color:'#374151'}}>{ncc['Số TK ngân hàng']||'—'}</td>
                      <td style={{textAlign:'right',fontSize:'12px',fontWeight:600}}>{ncc._tongNhap>0?fVND(ncc._tongNhap)+'đ':'—'}</td>
                      <td style={{textAlign:'right'}}>
                        {conNo>0
                          ?<span style={{fontWeight:800,fontSize:'13px',color:'#DC2626'}}>{fVND(conNo)}đ</span>
                          :conNo<0
                            ?<div>
                                <span style={{fontWeight:700,fontSize:'12px',color:'#D97706'}}>NCC nợ bạn</span>
                                <div style={{fontWeight:800,fontSize:'13px',color:'#D97706'}}>{fVND(Math.abs(conNo))}đ</div>
                              </div>
                            :<span style={{fontSize:'12px',color:'#16A34A',fontWeight:600}}>✅ Hết nợ</span>}
                      </td>
                      <td style={{textAlign:'center'}}>
                        <div style={{display:'flex',gap:'4px',justifyContent:'center',alignItems:'center'}}>
                          <button onClick={()=>moChiTiet(ncc)} title="Xem chi tiết nhà cung cấp"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #93C5FD',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap',lineHeight:'1.4'}}>
                            👁 Xem
                          </button>
                          <button
                            onClick={()=>{setNccChon(ncc);setShowTTModal(true);setTtSoTien(Math.max(0,conNo))}}
                            title={coNo?'Thanh toán công nợ: '+fVND(conNo)+'đ':'Đặt cọc / Thanh toán trước'}
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid',
                              borderColor:coNo?'#BBF7D0':'#BFDBFE',
                              background:coNo?'#F0FDF4':'#EFF6FF',
                              color:coNo?'#16A34A':'#1E40AF',
                              fontSize:'11px',cursor:'pointer',
                              fontWeight:600,whiteSpace:'nowrap',lineHeight:'1.4'}}>
                            💳 TT
                          </button>
                          <button onClick={()=>moSuaNCC(ncc)} title="Sửa thông tin nhà cung cấp"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap',lineHeight:'1.4'}}>
                            ✏️ Sửa
                          </button>
                          {isOwner&&<button onClick={()=>moXoaNCC(ncc)} title="Xóa nhà cung cấp"
                            style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap',lineHeight:'1.4'}}>
                            🗑️
                          </button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          {tongTrang>1&&(
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0'}}>
              <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{filtered.length} NCC</span>
              <div style={{display:'flex',gap:'4px'}}>
                <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
                {Array.from({length:tongTrang},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>)}
                <Btn disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</Btn>
              </div>
            </div>
          )}
        </div>
      </>)}

      {/* ══ VIEW: CHI TIẾT NCC ══ */}
      {view==='detail'&&nccChon&&(<>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'14px',flexWrap:'wrap'}}>
          <button onClick={()=>{setView('list');setNccChon(null)}}
            style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'13px'}}>← Quay lại</button>
          <div style={{flex:1}}>
            <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>{nccChon['Tên NCC']}</h1>
            <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'2px 0 0'}}>
              {nccChon['Mã NCC']}
              {nccChon['Số điện thoại']&&<span style={{marginLeft:'12px'}}>📞 {nccChon['Số điện thoại']}</span>}
              {nccChon['Số TK ngân hàng']&&<span style={{marginLeft:'12px'}}>🏦 {nccChon['Số TK ngân hàng']}</span>}
            </p>
          </div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={()=>moSuaNCC(nccChon)}
              style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
              ✏️ Sửa thông tin
            </button>
            {isOwner&&<button onClick={()=>moXoaNCC(nccChon)}
              style={{padding:'8px 14px',borderRadius:'8px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>
              🗑️ Xóa
            </button>}
            {(nccChonInfo?._conNo||0)>0&&(
              <button onClick={()=>{setShowTTModal(true);setTtSoTien(nccChonInfo?._conNo||0)}}
                style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#16A34A',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
                💳 Thanh toán
              </button>
            )}
          </div>
        </div>

        {/* Thống kê NCC */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'14px'}}>
          {[
            {icon:'📦',label:'Tổng nhập kho',val:fVND(nccChonInfo?._tongNhap||0)+'đ',c:'var(--primary)'},
            {icon:'✅',label:'Đã thanh toán',val:fVND(nccChonInfo?._tongDaTT||0)+'đ',c:'#065F46'},
            {icon:'⚠️',label:(nccChonInfo?._conNo||0)<0?'NCC nợ bạn':'Còn phải trả',val:fVND(Math.abs(nccChonInfo?._conNo||0))+'đ',c:(nccChonInfo?._conNo||0)>0?'#DC2626':'#065F46'},
            {icon:'📋',label:'Số phiếu nhập',val:nhapKhoChon.length+' phiếu',c:'#374151'},
          ].map(({icon,label,val,c})=>(
            <div key={label} className="card" style={{padding:'12px 14px'}}>
              <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
              <div style={{fontSize:'16px',fontWeight:800,color:c}}>{val}</div>
              <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
            </div>
          ))}
        </div>

        {/* Tab */}
        <div style={{display:'flex',gap:'4px',marginBottom:'14px',borderBottom:'2px solid var(--border)',paddingBottom:'0'}}>
          {([['nhap-kho','📦 Lịch sử nhập kho'],['thanh-toan','💳 Lịch sử thanh toán'],['chuong-trinh','🎁 CT KM'+(soCtDangTG>0?' ('+soCtDangTG+')':'')]] as const).map(([tab,label])=>(
            <button key={tab} onClick={()=>setTabChiTiet(tab)}
              style={{padding:'8px 16px',borderRadius:'8px 8px 0 0',border:'none',
                background:tabChiTiet===tab?'var(--primary)':'transparent',
                color:tabChiTiet===tab?'white':'var(--text-secondary)',
                fontWeight:tabChiTiet===tab?700:400,cursor:'pointer',fontSize:'13px'}}>
              {label}
            </button>
          ))}
        </div>

        {/* Tab: Lịch sử nhập kho */}
        {tabChiTiet==='nhap-kho'&&(
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table className="ncc-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã phiếu nhập</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Ngày nhập</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã SP</th>
                    <th style={{textAlign:'center',fontWeight:700}}>SL nhận</th>
                    <th style={{textAlign:'right',fontWeight:700}}>Giá nhập</th>
                    <th style={{textAlign:'right',fontWeight:700}}>Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {nhapKhoChon.length===0?(
                    <tr><td colSpan={6} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chưa có phiếu nhập nào</td></tr>
                  ):nhapKhoChon.map((nk:any,i:number)=>(
                    <tr key={nk['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                      <td style={{fontWeight:600,color:'var(--primary)',fontSize:'12px'}}>{nk['Mã phiếu nhập']||'—'}</td>
                      <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDate(nk['Ngày nhập'])}</td>
                      <td style={{fontSize:'12px'}}>{nk['Mã SP']||'—'}</td>
                      <td style={{textAlign:'center',fontWeight:700}}>{nk['Số lượng thực nhận']||0}</td>
                      <td style={{textAlign:'right',fontSize:'12px'}}>{fVND(Number(nk['Giá nhập thực tế']||0)+Number(nk['CP vận chuyển về kho']||0))}đ</td>
                      <td style={{textAlign:'right',fontWeight:700,color:'var(--primary)'}}>{fVND(Number(nk['Tổng tiền hàng']||0)+Number(nk['CP vận chuyển về kho']||0))}đ</td>
                    </tr>
                  ))}
                </tbody>
                {nhapKhoChon.length>0&&(
                  <tfoot>
                    <tr style={{background:'#F0F4FF',borderTop:'2px solid var(--border)'}}>
                      <td colSpan={5} style={{textAlign:'right',fontWeight:700,padding:'8px 10px',fontSize:'13px'}}>Tổng cộng:</td>
                      <td style={{textAlign:'right',fontWeight:800,color:'#DC2626',padding:'8px 10px',fontSize:'14px'}}>
                        {fVND(nhapKhoChon.reduce((s:number,nk:any)=>s+Number(nk['Tổng tiền hàng']||0)+Number(nk['CP vận chuyển về kho']||0),0))}đ
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        )}

        {/* Tab: Lịch sử thanh toán */}
        {tabChiTiet==='thanh-toan'&&(
          <div className="card" style={{overflow:'hidden'}}>
            {/* Filter ngày */}
            <div style={{padding:'12px 14px',borderBottom:'1px solid var(--border)',display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
              <span style={{fontSize:'11px',fontWeight:600,color:'var(--text-secondary)'}}>📅 Từ:</span>
              <input className="input" type="date" value={tuNgayTT} onChange={e=>{setTuNgayTT(e.target.value);setTrangTT(1)}} style={{width:'150px'}}/>
              <span style={{fontSize:'11px',fontWeight:600,color:'var(--text-secondary)'}}>Đến:</span>
              <input className="input" type="date" value={denNgayTT} onChange={e=>{setDenNgayTT(e.target.value);setTrangTT(1)}} style={{width:'150px'}}/>
              {(tuNgayTT||denNgayTT)&&(
                <button onClick={()=>{setTuNgayTT('');setDenNgayTT('');setTrangTT(1)}}
                  style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer',color:'#6B7280'}}>✕ Xoá lọc</button>
              )}
              <span style={{fontSize:'12px',color:'var(--text-secondary)',marginLeft:'auto'}}>
                Tổng TT (lọc): <strong style={{color:'#16A34A'}}>{fVND(ttChon.filter((t:any)=>t['Trạng thái']!=='Huỷ').reduce((s:number,t:any)=>s+Number(t['Số tiền trả']||0),0))}đ</strong>
              </span>
            </div>
            <div style={{overflowX:'auto'}}>
              <table className="ncc-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã TT</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Ngày TT</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã phiếu nhập</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Nội dung</th>
                    <th style={{textAlign:'right',fontWeight:700}}>Số tiền</th>
                    <th style={{textAlign:'right',fontWeight:700}}>Còn lại sau TT</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Hình thức</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Người trả</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                    <th style={{textAlign:'center',fontWeight:700,width:'80px'}}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {dsTrangTT.length===0?(
                    <tr><td colSpan={10} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Chưa có lịch sử thanh toán</td></tr>
                  ):dsTrangTT.map((tt:any,i:number)=>{
                    const isHuy=tt['Trạng thái']==='Huỷ'
                    return (
                      <tr key={tt['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:isHuy?'#FEF2F2':i%2===0?'white':'#FAFBFD',opacity:isHuy?0.6:1}}>
                        <td style={{fontWeight:600,fontSize:'12px',color:'var(--primary)',textDecoration:isHuy?'line-through':'none'}}>{tt['Mã thanh toán']||'—'}</td>
                        <td style={{fontSize:'12px',whiteSpace:'nowrap'}}>{fDate(tt['Ngày trả tiền NCC'])}</td>
                        <td style={{fontSize:'12px',color:'#6B7280'}}>{tt['Mã phiếu nhập']||'—'}</td>
                        <td style={{fontSize:'12px',maxWidth:'160px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{tt['Nội dung']||'—'}</td>
                        <td style={{textAlign:'right',fontWeight:700,color:isHuy?'#9CA3AF':'#16A34A',whiteSpace:'nowrap'}}>{fVND(tt['Số tiền trả'])}đ</td>
                        <td style={{textAlign:'right',fontSize:'12px',color:'#6B7280'}}>{tt['Số tiền còn lại sau TT']!=null?fVND(tt['Số tiền còn lại sau TT'])+'đ':'—'}</td>
                        <td style={{textAlign:'center'}}>
                          <span style={{padding:'2px 8px',borderRadius:'8px',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',fontWeight:600}}>{tt['Hình thức']||'—'}</span>
                        </td>
                        <td style={{fontSize:'12px',color:'#6B7280'}}>{tt['Người trả']||'—'}</td>
                        <td style={{textAlign:'center'}}>
                          <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,
                            background:isHuy?'#FEE2E2':tt['Trạng thái']==='Đã xác nhận'?'#D1FAE5':'#FEF3C7',
                            color:isHuy?'#DC2626':tt['Trạng thái']==='Đã xác nhận'?'#065F46':'#92400E'}}>
                            {tt['Trạng thái']||'—'}
                          </span>
                        </td>
                        <td style={{textAlign:'center'}}>
                          {!isHuy&&isOwner&&(
                            <button onClick={()=>huyThanhToan(tt)}
                              style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>
                              Huỷ
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {tongTrangTT>1&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0'}}>
                <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{ttChon.length} lần TT</span>
                <div style={{display:'flex',gap:'4px'}}>
                  <Btn disabled={trangHTTT===1} onClick={()=>setTrangTT(t=>t-1)}>‹</Btn>
                  {Array.from({length:tongTrangTT},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHTTT} onClick={()=>setTrangTT(p)}>{p}</Btn>)}
                  <Btn disabled={trangHTTT===tongTrangTT} onClick={()=>setTrangTT(t=>t+1)}>›</Btn>
                </div>
              </div>
            )}
          </div>
        )}
      

      {tabChiTiet==='chuong-trinh'&&view==='detail'&&(
        <div style={{marginTop:'14px'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
            <span style={{fontSize:'13px',fontWeight:600}}>{ctChon.length} chương trình</span>
            {isOwner&&<button onClick={()=>{resetFormCT();setShowCTModal(true)}} style={{padding:'7px 14px',borderRadius:'7px',border:'none',background:'var(--primary)',color:'white',fontWeight:600,cursor:'pointer',fontSize:'13px'}}>+ Thêm chương trình</button>}
          </div>
          {ctChon.length===0?(
            <div className="card" style={{padding:'32px',textAlign:'center',color:'var(--text-muted)'}}>Chưa có chương trình khuyến mại nào</div>
          ):ctChon.map((ct:any,cidx:number)=>{
            const spCT=localCTChiTiet.filter((x:any)=>x['Mã CT']===ct['Mã CT'])
            const mucTieu=Number(ct['Mục tiêu doanh số']||0)
            const ngayBD=(ct['Ngày bắt đầu']||'').split('T')[0]
            const ngayKT=(ct['Ngày kết thúc']||'').split('T')[0]
            const maCTFilter=ct['Mã CT']||''
            // Chỉ tính phiếu nhập kho được gắn Mã CT này
            const daTichLuy=maCTFilter?nhapKhoList.filter((nk:any)=>nk['Mã CT']===maCTFilter)
              .reduce((s:number,nk:any)=>s+Number(nk['Tổng tiền hàng']||0),0):0
            const phanTram=mucTieu>0?Math.min(100,Math.round(daTichLuy/mucTieu*100)):0
            const maCT=ct['Mã CT']||''
            const trangThaiLuuTru=ct['Trạng thái']||'Đang tham gia'
            const trangThaiHienThi=trangThaiLuuTru==='Huỷ'?'Huỷ':(mucTieu>0&&daTichLuy>=mucTieu)?'Đã đạt':trangThaiLuuTru
            return (
              <div key={ct['Id']||cidx} className="card" style={{marginBottom:'8px',overflow:'hidden'}}>
                {/* Header accordion */}
                <div onClick={()=>setCtMoRong(ctMoRong===maCT?null:maCT)}
                  style={{padding:'12px 16px',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',gap:'8px',
                    background:ctMoRong===maCT?'#F0F4FF':'white',userSelect:'none' as any}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap' as any}}>
                      <div style={{fontWeight:700,fontSize:'14px'}}>{ct['Tên chương trình']||'?'}</div>
                      <span style={{padding:'2px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,whiteSpace:'nowrap' as any,
                          background:trangThaiHienThi==='Đã đạt'?'#FEF3C7':trangThaiHienThi==='Huỷ'?'#FEE2E2':'#D1FAE5',
                          color:trangThaiHienThi==='Đã đạt'?'#92400E':trangThaiHienThi==='Huỷ'?'#DC2626':'#065F46'}}>
                        {trangThaiHienThi==='Đã đạt'?'🏆':trangThaiHienThi==='Huỷ'?'❌':'🟢'} {trangThaiHienThi}
                        {trangThaiHienThi==='Đã đạt'&&trangThaiLuuTru!=='Đã đạt'&&<span style={{fontSize:'10px',marginLeft:'4px',opacity:0.7}}>(tự động)</span>}
                      </span>
                    </div>
                    <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px',display:'flex',gap:'10px',flexWrap:'wrap' as any}}>
                      <span>{ct['Mã CT']}{ct['Số thông báo']?' · '+ct['Số thông báo']:''}</span>
                      {(ct['Ngày bắt đầu']||ct['Ngày kết thúc'])&&<span>📅 {ct['Ngày bắt đầu']?fDate(ct['Ngày bắt đầu']):''}{ct['Ngày kết thúc']?' → '+fDate(ct['Ngày kết thúc']):''}</span>}
                      {mucTieu>0&&<span style={{color:'#16A34A',fontWeight:600}}>🛒 {fVND(daTichLuy)}đ/{fVND(mucTieu)}đ ({phanTram}%)</span>}
                      {Number(ct['Giá trị thưởng']||0)>0&&<span style={{color:'#D97706',fontWeight:600}}>🎁 {fVND(ct['Giá trị thưởng']||0)}đ</span>}
                      <span style={{color:'#6B7280'}}>📦 {spCT.length} SP</span>
                    </div>
                  </div>
                  <div style={{display:'flex',gap:'6px',alignItems:'center'}}>
                    {isOwner&&<button onClick={(e:any)=>{e.stopPropagation();moSuaCT(ct)}} style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',cursor:'pointer',fontWeight:600}}>✏️ Sửa</button>}
                    {isOwner&&<button onClick={(e:any)=>{e.stopPropagation();xoaCT(ct)}} style={{padding:'4px 10px',borderRadius:'6px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>}
                    <span style={{fontSize:'18px',color:'#9CA3AF',display:'inline-block',transform:ctMoRong===maCT?'rotate(180deg)':'rotate(0deg)',transition:'transform 0.2s'}}>▾</span>
                  </div>
                </div>
                {ctMoRong===maCT&&(
                  <div style={{padding:'12px 16px',borderTop:'1px solid #F0F0F0'}}>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'8px',marginBottom:'12px'}}>
                      {mucTieu>0&&<div style={{background:'#F0FDF4',borderRadius:'8px',padding:'10px 12px',border:'1px solid #BBF7D0'}}>
                        <div style={{fontSize:'10px',color:'#16A34A',fontWeight:600,marginBottom:'3px'}}>🛒 Đã mua / Mục tiêu</div>
                        <div style={{fontWeight:700,color:'#16A34A'}}>{fVND(daTichLuy)}đ <span style={{fontWeight:400,fontSize:'11px',color:'#6B7280'}}>/ {fVND(mucTieu)}đ</span></div>
                        <div style={{height:'5px',background:'#E5E7EB',borderRadius:'3px',overflow:'hidden',marginTop:'6px'}}><div style={{height:'100%',width:phanTram+'%',background:phanTram>=100?'#16A34A':'#34D399',borderRadius:'3px'}}></div></div>
                        <div style={{fontSize:'11px',color:phanTram>=100?'#16A34A':'#6B7280',marginTop:'3px',fontWeight:phanTram>=100?700:400}}>{phanTram>=100?'✅ Đã đạt mục tiêu!':phanTram+'%'}</div>
                      </div>}
                      {(Number(ct['Giá trị thưởng']||0)>0||ct['Ghi chú'])&&<div style={{background:'#FFFBEB',borderRadius:'8px',padding:'10px 12px',border:'1px solid #FCD34D'}}>
                        <div style={{fontSize:'10px',color:'#D97706',fontWeight:600,marginBottom:'3px'}}>🎁 Thưởng</div>
                        {Number(ct['Giá trị thưởng']||0)>0&&<div style={{fontWeight:700,color:'#D97706'}}>{fVND(ct['Giá trị thưởng']||0)}đ</div>}
                        {ct['Ghi chú']&&<div style={{fontSize:'11px',color:'#92400E',marginTop:'2px'}}>{ct['Ghi chú']}</div>}
                      </div>}
                      {ct['Hạn giao hàng']&&<div style={{background:'#FEF2F2',borderRadius:'8px',padding:'10px 12px',border:'1px solid #FECACA'}}>
                        <div style={{fontSize:'10px',color:'#DC2626',fontWeight:600,marginBottom:'3px'}}>🚚 Hạn GH</div>
                        <div style={{fontWeight:700,color:'#DC2626',fontSize:'12px'}}>{fDate(ct['Hạn giao hàng'])}</div>
                      </div>}
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                      <span style={{fontSize:'12px',fontWeight:600,color:'#6B7280'}}>Sản phẩm trong chương trình ({spCT.length})</span>
                      <button onClick={()=>{setCtDangXem(ct);setCtctTenSP('');setCtctMaSP('');setCtctGiaNY(0);setCtctCKCB(0);setCtctCKThem(0);setCtctGhiChu('');setEditCTCT(null);setShowCTChiTietModal(true)}} style={{padding:'3px 8px',borderRadius:'5px',border:'1px solid var(--primary)',background:'white',color:'var(--primary)',fontSize:'11px',cursor:'pointer',fontWeight:600}}>+ Thêm SP</button>
                    </div>
                    {spCT.length===0
                      ?<div style={{fontSize:'12px',color:'#9CA3AF',fontStyle:'italic',padding:'8px 0'}}>Chưa có SP nào</div>
                      :<div style={{maxHeight:'400px',overflowY:'auto'}}>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px'}}>
                          <thead><tr style={{background:'#F8FAFC',borderBottom:'1px solid #E5E7EB'}}>
                            <th style={{padding:'6px 8px',textAlign:'left',color:'#6B7280',fontWeight:600}}>Tên SP</th>
                            <th style={{padding:'6px 8px',textAlign:'right',color:'#6B7280',fontWeight:600}}>Giá Niêm Yết</th>
                            <th style={{padding:'6px 8px',textAlign:'center',color:'#7C3AED',fontWeight:600}}>CK cơ bản</th>
                            <th style={{padding:'6px 8px',textAlign:'center',color:'#7C3AED',fontWeight:600}}>CK thêm</th>
                            <th style={{padding:'6px 8px',textAlign:'right',color:'#16A34A',fontWeight:600}}>Giá sau CK</th>
                            <th style={{width:'56px'}}></th>
                          </tr></thead>
                          <tbody>{spCT.map((sp:any,j:number)=>{
                            const ckTong=Number(sp['% CK tổng']||0)||(Number(sp['% CK cơ bản']||0)+Number(sp['% CK thêm']||0))
                            const giaSauCK=Number(sp['Giá sau CK']||0)||(Number(sp['Giá niêm yết']||0)*(1-ckTong/100))
                            return <tr key={sp['Id']||j} style={{borderBottom:'1px solid #F0F0F0',background:j%2===0?'white':'#FAFBFD'}}>
                              <td style={{padding:'6px 8px',fontWeight:600}}>{sp['Tên dòng SP']||'?'}</td>
                              <td style={{padding:'6px 8px',textAlign:'right',color:'#6B7280'}}>{Number(sp['Giá niêm yết']||0)>0?fVND(sp['Giá niêm yết'])+'đ':'—'}</td>
                              <td style={{padding:'6px 8px',textAlign:'center',color:'#7C3AED',fontWeight:600}}>{Number(sp['% CK cơ bản']||0)>0?Number(sp['% CK cơ bản']||0)+'%':'—'}</td>
                              <td style={{padding:'6px 8px',textAlign:'center',color:'#7C3AED',fontWeight:600}}>{Number(sp['% CK thêm']||0)>0?Number(sp['% CK thêm']||0)+'%':'—'}</td>
                              <td style={{padding:'6px 8px',textAlign:'right',fontWeight:700,color:'#16A34A'}}>{giaSauCK>0?fVND(Math.round(giaSauCK))+'đ':'—'}</td>
                              <td style={{padding:'6px 8px',textAlign:'center'}}><div style={{display:'flex',gap:'2px'}}>
                                <button onClick={()=>{setCtDangXem(ct);setEditCTCT(sp);setCtctTenSP(sp['Tên dòng SP']||'');setCtctMaSP(sp['Mã SP']||'');setCtctGiaNY(Number(sp['Gia niem yet']||sp['Giá niêm yết']||0));setCtctCKCB(Number(sp['% CK cơ bản']||0));setCtctCKThem(Number(sp['% CK thêm']||0));setCtctGhiChu(sp['Ghi chú kích thước']||'');setShowCTChiTietModal(true)}} style={{padding:'2px 4px',borderRadius:'4px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'10px',cursor:'pointer'}}>✏️</button>
                                <button onClick={async()=>{if(!confirm('Xoa?'))return;await fetch('/api/chuong-trinh-ncc?id='+Number(sp['Id']||sp['id'])+'&loai=chi-tiet',{method:'DELETE'});setLocalCTChiTiet(p=>p.filter(x=>(x['Id']||x['id'])!==(sp['Id']||sp['id'])))}} style={{padding:'2px 4px',borderRadius:'4px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'10px',cursor:'pointer'}}>🗑️</button>
                              </div></td>
                            </tr>
                          })}</tbody>
                        </table>
                      </div>
                    }
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showCTModal&&!showTTModal&&nccChon&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.55)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',overflowY:'auto'}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'620px',maxHeight:'92vh',overflowY:'auto',position:'relative',zIndex:301}} onClick={(e:any)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>{editCT?'✏️ Sửa':'🎁 Thêm'} chương trình KM — {nccChon['Tên NCC']}</h2>
              <button onClick={()=>{setShowCTModal(false);resetFormCT()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'10px'}}>
                <div><label className="lbl">Tên chương trình *</label><input className="input" value={ctTen} onChange={e=>setCtTen(e.target.value)} autoFocus/></div>
                <div><label className="lbl">Số thông báo</label><input className="input" value={ctSoThongBao} onChange={e=>setCtSoThongBao(e.target.value)}/></div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">📅 Ngày bắt đầu</label><input className="input" type="date" value={ctNgayBD} onChange={e=>setCtNgayBD(e.target.value)}/></div>
                <div><label className="lbl">📅 Ngày kết thúc</label><input className="input" type="date" value={ctNgayKT} onChange={e=>setCtNgayKT(e.target.value)}/></div>
                <div><label className="lbl">🚚 Hạn giao hàng</label><input className="input" type="date" value={ctHanGiaoHang} onChange={e=>setCtHanGiaoHang(e.target.value)}/></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',padding:'10px',background:'#F5F3FF',borderRadius:'8px'}}>
                
                <div style={{gridColumn:'1/-1'}}><label className="lbl">🎯 Mục tiêu doanh số (đ)</label><input className="input" type="text" value={ctMucTieu?ctMucTieu.toLocaleString('vi-VN'):''} onChange={e=>{const v=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'');setCtMucTieu(Number(v)||0)}}/></div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',padding:'10px',background:'#FFFBEB',borderRadius:'8px'}}>
                <div><label className="lbl">🎁 Giá trị thưởng (đ)</label><input className="input" type="text" value={ctGiaTriThuong?ctGiaTriThuong.toLocaleString('vi-VN'):''} onChange={e=>{const v=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'');setCtGiaTriThuong(Number(v)||0)}}/></div>
                <div><label className="lbl">📝 Ghi chú thưởng</label><input className="input" placeholder="VD: Du lịch Đà Nẵng 4N3Đ..." value={ctGhiChu} onChange={e=>setCtGhiChu(e.target.value)}/></div>
              </div>
              <div>
                <label className="lbl">📌 Trạng thái</label>
                <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                  {(['Đang tham gia','Đã đạt','Huỷ'] as const).map(tt=>(
                    <button key={tt} onClick={()=>setCtTrangThai(tt as any)}
                      style={{padding:'6px 12px',borderRadius:'20px',border:'2px solid',
                        borderColor:ctTrangThai===tt?'var(--primary)':'var(--border)',
                        background:ctTrangThai===tt?'var(--primary-pale)':'white',
                        color:ctTrangThai===tt?'var(--primary)':'var(--text-secondary)',
                        fontWeight:ctTrangThai===tt?700:400,fontSize:'12px',cursor:'pointer'}}>
                      {tt==='Đang tham gia'?'🟢':tt==='Đã đạt'?'🏆':'❌'} {tt}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuCT} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,cursor:'pointer'}}>{loading?'⏳ Đang lưu...':(editCT?'✅ Cập nhật':'✅ Tạo chương trình')}</button>
                <button onClick={()=>{setShowCTModal(false);resetFormCT()}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCTChiTietModal&&!showTTModal&&ctDangXem&&(
        <div className="ov" onClick={()=>setShowCTChiTietModal(false)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'520px'}} onClick={(e:any)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <h2 style={{fontSize:'15px',fontWeight:700,margin:0}}>{editCTCT?'✏️ Sửa SP':'+ Thêm SP'}</h2>
              <button onClick={()=>setShowCTChiTietModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px'}}>🗑️</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              <div>
                <label className="lbl">Tên dòng SP *</label>
                <input className="input" value={ctctTenSP} onChange={e=>setCtctTenSP(e.target.value)} autoFocus/>
              </div>
              <div>
                <div><label className="lbl">💰 Giá niêm yết (đ)</label><input className="input" type="text" value={ctctGiaNY?ctctGiaNY.toLocaleString('vi-VN'):''} onChange={e=>{const v=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'');setCtctGiaNY(Number(v)||0)}}/></div>
                
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label className="lbl">% CK cơ bản</label><input className="input" type="number" min="0" max="100" value={ctctCKCB||''} onChange={e=>setCtctCKCB(Number(e.target.value)||0)}/></div>
                <div><label className="lbl">% CK thêm</label><input className="input" type="number" min="0" max="100" value={ctctCKThem||''} onChange={e=>setCtctCKThem(Number(e.target.value)||0)}/></div>
              </div>
              {(ctctCKCB+ctctCKThem>0||ctctGiaNY>0)&&(
                <div style={{padding:'8px 12px',background:'#F0FDF4',borderRadius:'8px',fontSize:'13px'}}>
                  <div style={{display:'flex',justifyContent:'space-between'}}><span>% CK tổng:</span><span style={{fontWeight:700,color:'#7C3AED'}}>{ctctCKCB+ctctCKThem}%</span></div>
                  {ctctGiaNY>0&&<div style={{display:'flex',justifyContent:'space-between'}}><span>Giá sau CK:</span><span style={{fontWeight:700,color:'#16A34A',fontSize:'15px'}}>{fVND(Math.round(ctctGiaNY*(1-(ctctCKCB+ctctCKThem)/100)))}d</span></div>}
                </div>
              )}
              <div><label className="lbl">Ghi chú kích thước</label><input className="input" value={ctctGhiChu} onChange={e=>setCtctGhiChu(e.target.value)}/></div>
              <div style={{display:'flex',gap:'10px'}}>
                <button onClick={luuCTChiTiet} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,cursor:'pointer'}}>{loading?'⏳':'✅ Lưu SP'}</button>
                <button onClick={()=>setShowCTChiTietModal(false)} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer'}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL THÊM/SỬA NCC ══ */}
      {showModal&&(
        <div className="ov" onClick={()=>{setShowModal(false);resetFormNCC()}}>
          <div className="mk" style={{maxWidth:'620px'}} onClick={(e:any)=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>{editNCC?'✏️ Sửa nhà cung cấp':'+ Thêm nhà cung cấp mới'}</h2>
              <button onClick={()=>{setShowModal(false);resetFormNCC()}} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:'10px'}}>
                <div><label className="lbl">Mã NCC (tự động nếu trống)</label><input className="input" placeholder="NCC-001" value={maNCC} onChange={e=>setMaNCC(e.target.value)} disabled={!!editNCC}/></div>
                <div><label className="lbl">Tên NCC *</label><input className="input" placeholder="Tên nhà cung cấp..." value={tenNCC} onChange={e=>setTenNCC(e.target.value)} autoFocus/></div>
              </div>
              <div>
                <label className="lbl">📞 Số điện thoại</label>
                <input className="input" placeholder="0xxxxxxxxx (10 số)" value={sdt}
                  onChange={e=>{
                    const v=e.target.value.replace(/[^0-9]/g,'')
                    setSdt(v)
                    if(!v) setSdtError('')
                    else if(!v.startsWith('0')) setSdtError('Số điện thoại phải bắt đầu bằng số 0')
                    else if(v.length<10) setSdtError('Cần nhập đủ 10 số (còn thiếu '+(10-v.length)+' số)')
                    else setSdtError('')
                  }}
                  maxLength={10}
                  style={{borderColor:sdtError?'#DC2626':sdt.length===10&&sdt.startsWith('0')?'#16A34A':''}}/>
                {sdtError&&<div style={{fontSize:'11px',color:'#DC2626',marginTop:'3px'}}>⚠️ {sdtError}</div>}
                {sdt.length===10&&sdt.startsWith('0')&&!sdtError&&<div style={{fontSize:'11px',color:'#16A34A',marginTop:'3px'}}>✅ Hợp lệ</div>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div style={{position:'relative'}}>
                  <label className="lbl">🏦 Ngân hàng</label>
                  <NganHangInput value={nganHang} onChange={setNganHang}/>
                </div>
                <div>
                  <label className="lbl">🏦 Số tài khoản</label>
                  <input className="input" placeholder="Số tài khoản..." value={stk} onChange={e=>setStk(e.target.value)}/>
                </div>
              </div>
              <div><label className="lbl">📍 Địa chỉ</label><input className="input" placeholder="Địa chỉ NCC..." value={diaChi} onChange={e=>setDiaChi(e.target.value)}/></div>
              <div><label className="lbl">Ghi chú</label><input className="input" placeholder="Ghi chú..." value={ghiChuNCC} onChange={e=>setGhiChuNCC(e.target.value)}/></div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={luuNCC} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,cursor:loading?'not-allowed':'pointer',fontSize:'14px'}}>
                  {loading?'⏳ Đang lưu...':editNCC?'✅ Cập nhật':'✅ Thêm NCC'}
                </button>
                <button onClick={()=>{setShowModal(false);resetFormNCC()}} style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL THANH TOÁN ══ */}
      {showTTModal&&nccChon&&(()=>{
        // Danh sách phiếu còn nợ của NCC này — sắp xếp cũ nhất trước
        const phieuConNo = nhapKhoChon
          .filter((nk:any)=>Number(nk['Tổng tiền hàng']||0)+Number(nk['CP vận chuyển về kho']||0)>0)
          .map((nk:any)=>({...nk, _tongTien: Number(nk['Tổng tiền hàng']||0)+Number(nk['CP vận chuyển về kho']||0)}))
          .sort((a:any,b:any)=>((a['Ngày nhập']||'') < (b['Ngày nhập']||''))?-1:1)
        const conNo = nccChonInfo?._conNo||0
        // Tính phiếu được chọn khi theo phiếu cụ thể
        const phieuChonInfo = phieuConNo.find((p:any)=>p['Mã phiếu nhập']===ttPhieuChon)
        // Preview tự động trừ dồn
        const previewTuDon = (()=>{
          if(ttSoTien<=0||ttCheDoTT!=='tudon') return []
          let conLai = ttSoTien
          const result:any[] = []
          for(const p of phieuConNo){
            if(conLai<=0) break
            const tru = Math.min(conLai, p._tongTien)
            result.push({ma:p['Mã phiếu nhập'], tru, hetNo: tru>=p._tongTien})
            conLai -= tru
          }
          return result
        })()
        return (
        <div className="ov">
          <div style={{background:'white',borderRadius:'12px',padding:'28px',width:'100%',maxWidth:'860px',maxHeight:'95vh',overflowY:'auto'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px'}}>
              <h2 style={{fontSize:'17px',fontWeight:700,margin:0}}>💳 Thanh toán NCC</h2>
              <button onClick={()=>setShowTTModal(false)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>
            {/* Thông tin NCC */}
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'14px',border:'1px solid #E5E7EB',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
              <div>
                <div style={{fontWeight:700,fontSize:'15px'}}>{nccChon['Tên NCC']}</div>
                <div style={{fontSize:'12px',color:'#6B7280',marginTop:'2px'}}>{nccChon['Mã NCC']}{nccChon['Số TK ngân hàng']&&<span style={{marginLeft:'12px'}}>🏦 {nccChon['Ngân hàng']?nccChon['Ngân hàng']+' — ':''}{nccChon['Số TK ngân hàng']}</span>}</div>
              </div>
              <div style={{display:'flex',gap:'20px'}}>
                <div style={{textAlign:'center'}}><div style={{fontSize:'11px',color:'#6B7280'}}>Còn phải trả</div><div style={{fontSize:'20px',fontWeight:800,color:'#DC2626'}}>{fVND(conNo)}đ</div></div>
                <div style={{textAlign:'center'}}><div style={{fontSize:'11px',color:'#6B7280'}}>Đã thanh toán</div><div style={{fontSize:'20px',fontWeight:800,color:'#16A34A'}}>{fVND(nccChonInfo?._tongDaTT||0)}đ</div></div>
              </div>
            </div>
            {/* Cảnh báo đặt cọc / thanh toán thừa */}
            {conNo<=0&&(
              <div style={{padding:'10px 14px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',fontSize:'13px',color:'#1E40AF',fontWeight:600,marginBottom:'14px'}}>
                💡 {conNo<0?'NCC đang nợ lại bạn '+fVND(Math.abs(conNo))+'đ. ':''}Bạn đang thanh toán thừa hoặc đặt cọc hàng cho NCC — số tiền sẽ được ghi nhận vào lịch sử.
              </div>
            )}
            {/* Chế độ thanh toán */}
            <div style={{display:'flex',gap:'8px',marginBottom:'14px'}}>
              <button onClick={()=>{setTtCheDoTT('tudon');setTtPhieuChon('');setTtMaPhieu('')}}
                style={{flex:1,padding:'9px',borderRadius:'8px',border:'2px solid',
                  borderColor:ttCheDoTT==='tudon'?'#16A34A':'var(--border)',
                  background:ttCheDoTT==='tudon'?'#F0FDF4':'white',
                  color:ttCheDoTT==='tudon'?'#16A34A':'var(--text-secondary)',
                  fontWeight:ttCheDoTT==='tudon'?700:400,cursor:'pointer',fontSize:'13px'}}>
                🔄 Tự động trừ dồn
              </button>
              <button onClick={()=>setTtCheDoTT('phieu')}
                style={{flex:1,padding:'9px',borderRadius:'8px',border:'2px solid',
                  borderColor:ttCheDoTT==='phieu'?'var(--primary)':'var(--border)',
                  background:ttCheDoTT==='phieu'?'var(--primary-pale)':'white',
                  color:ttCheDoTT==='phieu'?'var(--primary)':'var(--text-secondary)',
                  fontWeight:ttCheDoTT==='phieu'?700:400,cursor:'pointer',fontSize:'13px'}}>
                🎯 Theo phiếu cụ thể
              </button>
            </div>
            {/* Chọn phiếu nếu theo phiếu cụ thể */}
            {ttCheDoTT==='phieu'&&(
              <div style={{marginBottom:'12px'}}>
                <label className="lbl">📋 Chọn phiếu nhập cần thanh toán</label>
                <select className="input" value={ttPhieuChon}
                  onChange={e=>{
                    setTtPhieuChon(e.target.value)
                    setTtMaPhieu(e.target.value)
                    const p=phieuConNo.find((p:any)=>p['Mã phiếu nhập']===e.target.value)
                    if(p) setTtSoTien(p._tongTien)
                  }}>
                  <option value="">-- Chọn phiếu --</option>
                  {phieuConNo.map((p:any)=>(
                    <option key={p['Mã phiếu nhập']} value={p['Mã phiếu nhập']}>
                      {p['Mã phiếu nhập']} — {fVND(p._tongTien)}đ — {p['Ngày nhập']?new Date(p['Ngày nhập']).toLocaleDateString('vi-VN'):''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',marginBottom:'12px'}}>
              <div style={{gridColumn:'1/2'}}>
                <label className="lbl">💰 Số tiền trả *</label>
                <input className="input" type="text" inputMode="numeric" placeholder="Nhập số tiền..."
                  value={ttSoTien?ttSoTien.toLocaleString('en-US').replace(/,/g,'.'):''}
                  onChange={e=>{
                    const v=e.target.value.replace(/\./g,'').replace(/[^0-9]/g,'')
                    setTtSoTien(Number(v)||0)
                  }}
                  style={{fontWeight:700,fontSize:'15px',color:'#16A34A'}}/>
              </div>
              <div>
                <label className="lbl">📅 Ngày trả</label>
                <input className="input" type="date" value={ttNgay} onChange={e=>setTtNgay(e.target.value)}/>
              </div>
              <div>
                <label className="lbl">Hình thức</label>
                <select className="input" value={ttHinhThuc} onChange={e=>setTtHinhThuc(e.target.value)}>
                  {HINH_THUC.map(h=><option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px',marginBottom:'12px'}}>
              <div>
                <label className="lbl">Người trả</label>
                <input className="input" value={ttNguoiTra} onChange={e=>setTtNguoiTra(e.target.value)}/>
              </div>
              <div>
                <label className="lbl">Nội dung</label>
                <input className="input" placeholder={'Thanh toán NCC '+nccChon['Tên NCC']+'...'} value={ttNoiDung} onChange={e=>setTtNoiDung(e.target.value)}/>
              </div>
            </div>
            <div style={{marginBottom:'12px'}}>
              <label className="lbl">Ghi chú</label>
              <input className="input" placeholder="Ghi chú thêm..." value={ttGhiChu} onChange={e=>setTtGhiChu(e.target.value)}/>
            </div>
            {/* Preview */}
            {ttSoTien>0&&(
              <div style={{padding:'10px 14px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',fontSize:'12px',marginBottom:'12px'}}>
                <div style={{fontWeight:700,color:'#1E40AF',marginBottom:'6px'}}>📊 Sau khi thanh toán {fVND(ttSoTien)}đ:</div>
                {ttCheDoTT==='tudon'&&previewTuDon.length>0&&(
                  <div style={{display:'flex',flexDirection:'column',gap:'3px',marginBottom:'6px'}}>
                    {previewTuDon.map((p:any)=>(
                      <div key={p.ma} style={{display:'flex',gap:'8px',alignItems:'center'}}>
                        <span style={{fontWeight:600,color:'var(--primary)'}}>{p.ma}</span>
                        <span style={{color:'#DC2626'}}>trừ {fVND(p.tru)}đ</span>
                        {p.hetNo&&<span style={{padding:'1px 6px',borderRadius:'8px',background:'#D1FAE5',color:'#065F46',fontSize:'11px',fontWeight:600}}>✅ Hết nợ</span>}
                      </div>
                    ))}
                  </div>
                )}
                {ttCheDoTT==='phieu'&&ttPhieuChon&&(
                  <div style={{marginBottom:'6px',color:'var(--primary)',fontWeight:600}}>
                    Phiếu {ttPhieuChon} — trừ {fVND(ttSoTien)}đ
                    {phieuChonInfo&&ttSoTien>=phieuChonInfo._tongTien&&<span style={{marginLeft:'8px',padding:'1px 6px',borderRadius:'8px',background:'#D1FAE5',color:'#065F46',fontSize:'11px',fontWeight:600}}>✅ Hết nợ phiếu này</span>}
                  </div>
                )}
                <div>
                  Công nợ còn lại: <strong style={{color:conNo-ttSoTien>0?'#DC2626':'#16A34A',fontSize:'13px'}}>
                    {fVND(Math.max(0,conNo-ttSoTien))}đ
                  </strong>
                  {ttSoTien>conNo&&conNo>0&&<span style={{color:'#059669',marginLeft:'8px'}}>✅ Trả thừa — NCC sẽ nợ lại {fVND(ttSoTien-conNo)}đ</span>}
                </div>
              </div>
            )}
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={luuThanhToan} disabled={loading||!ttSoTien}
                style={{flex:1,padding:'12px',borderRadius:'8px',border:'none',
                  background:loading||!ttSoTien?'#9CA3AF':'#16A34A',
                  color:'white',fontWeight:700,cursor:loading||!ttSoTien?'not-allowed':'pointer',fontSize:'14px'}}>
                {loading?'⏳ Đang lưu...':'✅ Xác nhận thanh toán'}
              </button>
              <button onClick={()=>setShowTTModal(false)} style={{padding:'12px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
        )
      })()}

      {/* ══ MODAL XÓA NCC ══ */}
      {xoaNCC&&(
        <div className="ov" onClick={()=>{setXoaNCC(null);setXoaCheckNCC(null)}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px',textAlign:'center'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>Xóa nhà cung cấp</h2>
            <p style={{fontSize:'14px',fontWeight:700,color:'var(--primary)',margin:'0 0 4px'}}>{xoaNCC['Tên NCC']}</p>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 16px'}}>{xoaNCC['Mã NCC']}{xoaNCC['Số điện thoại']?' · '+xoaNCC['Số điện thoại']:''}</p>
            {loadingXoaNCC&&<div style={{padding:'16px',color:'var(--text-secondary)',fontSize:'13px'}}>⏳ Đang kiểm tra dữ liệu...</div>}
            {!loadingXoaNCC&&xoaCheckNCC&&(
              xoaCheckNCC.coTheXoa?(
                <div>
                  <div style={{padding:'10px 14px',borderRadius:'8px',background:'#D1FAE5',border:'1px solid #6EE7B7',marginBottom:'14px',fontSize:'13px',color:'#065F46',fontWeight:600}}>
                    ✅ NCC chưa có giao dịch — có thể xóa an toàn
                  </div>
                  <p style={{fontSize:'12px',color:'#DC2626',background:'#FEF2F2',padding:'8px 12px',borderRadius:'6px',margin:'0 0 16px'}}>⚠️ Hành động này không thể hoàn tác!</p>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={xacNhanXoaNCC} disabled={dangXoaNCC}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangXoaNCC?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                      {dangXoaNCC?'⏳ Đang xóa...':'🗑️ Xác nhận xóa'}
                    </button>
                    <button onClick={()=>{setXoaNCC(null);setXoaCheckNCC(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
                  </div>
                </div>
              ):(
                <div>
                  <div style={{padding:'12px 14px',borderRadius:'8px',background:'#FEF3C7',border:'1px solid #FCD34D',marginBottom:'14px',fontSize:'13px',color:'#92400E',textAlign:'left'}}>
                    <div style={{fontWeight:700,marginBottom:'6px'}}>❌ Không thể xóa vì:</div>
                    <ul style={{margin:0,paddingLeft:'16px'}}>
                      {xoaCheckNCC.lyDo.map((l:string,i:number)=><li key={i}>{l}</li>)}
                    </ul>
                  </div>
                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',marginBottom:'14px',fontSize:'12px',color:'#1E40AF',textAlign:'left'}}>
                    💡 Lịch sử giao dịch với NCC cần giữ lại để tra cứu và đối soát sau này.
                  </div>
                  <button onClick={()=>{setXoaNCC(null);setXoaCheckNCC(null)}}
                    style={{width:'100%',padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600,fontSize:'14px'}}>Đóng</button>
                </div>
              )
            )}
          </div>
        </div>
      )}
      </>)}
    </div>
  )
}

function Btn({children,active,disabled,onClick}:any){
  return <button onClick={onClick} disabled={disabled} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:active?'var(--primary)':'var(--border)',background:active?'var(--primary)':disabled?'#F9FAFB':'white',color:active?'white':disabled?'#CCC':'var(--text-secondary)',cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:active?700:400,minWidth:'32px'}}>{children}</button>
}

const NGAN_HANG_LIST = [
  'Vietcombank','VietinBank','BIDV','Agribank','Techcombank',
  'MB Bank','ACB','VPBank','TPBank','Sacombank',
  'HDBank','OCB','SHB','SeABank','Eximbank','LienVietPostBank',
  'Nam A Bank','Bac A Bank','VIB','MSB','Khác'
]

function NganHangInput({value,onChange}:{value:string;onChange:(v:string)=>void}){
  const [show,setShow]=useState(false)
  function boDauNH(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}
  const filtered=NGAN_HANG_LIST.filter(nh=>{
    if(!value.trim()) return true
    return boDauNH(nh).includes(boDauNH(value))
  })
  return (
    <div style={{position:'relative'}}>
      <input className="input" placeholder="Gõ hoặc chọn ngân hàng..."
        value={value}
        onChange={e=>{onChange(e.target.value);setShow(true)}}
        onFocus={()=>setShow(true)}
        onBlur={()=>setTimeout(()=>setShow(false),200)}
        style={{background:value?'#EFF6FF':'',color:value?'#1E40AF':''}}/>
      {value&&NGAN_HANG_LIST.includes(value)&&
        <div style={{fontSize:'11px',color:'#1E40AF',marginTop:'3px',fontWeight:600}}>✅ {value}</div>}
      {show&&(
        <div style={{position:'absolute',top:'calc(100% + 2px)',left:0,right:0,zIndex:400,
          background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',
          boxShadow:'0 4px 16px rgba(0,0,0,.15)',maxHeight:'200px',overflowY:'auto'}}>
          {filtered.length===0
            ?<div style={{padding:'10px 12px',fontSize:'12px',color:'#9CA3AF'}}>Không tìm thấy — giữ nguyên tên vừa nhập</div>
            :filtered.map((nh:string)=>(
              <div key={nh}
                onMouseDown={e=>{e.preventDefault();onChange(nh);setShow(false)}}
                style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',
                  fontSize:'13px',fontWeight:500,
                  background:nh===value?'#EFF6FF':'white',
                  color:nh===value?'#1E40AF':'#374151'}}>
                🏦 {nh} {nh===value&&'✓'}
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
