'use client'
// components/ChiTietDonHangClient.tsx — v2.0
// Thêm: chế độ xem/sửa, thêm/hủy SP, lịch sử sửa đơn

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function fVND(n: number|string) { return Number(n||0).toLocaleString('vi-VN')+'đ' }
function fDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function fDT(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function boDau(s: string) {
  return (s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

const TT_COLOR: Record<string,{bg:string;color:string}> = {
  'Chờ giao':         {bg:'#FEF3C7',color:'#92400E'},
  'Đang giao':        {bg:'#DBEAFE',color:'#1E40AF'},
  'Đang giao 1 phần': {bg:'#E0F2FE',color:'#0369A1'},
  'Đã giao':          {bg:'#D1FAE5',color:'#065F46'},
  'Đã giao 1 phần':   {bg:'#ECFDF5',color:'#059669'},
  'Hoàn thành':       {bg:'#059669',color:'white'},
  'Huỷ':              {bg:'#FEE2E2',color:'#991B1B'},
}

interface SPItem {
  id: string          // rowId NocoDB để PATCH/DELETE
  maCT: string
  maSP: string
  tenSP: string
  soLuong: number
  donGia: number
  thanhTien: number
  ghiChu: string
  da_huy: boolean     // true = đã bị hủy (hiển thị mờ/đỏ)
  la_moi: boolean     // true = mới thêm chưa lưu
  _da_sua: boolean    // true = đã sửa SL hoặc giá (highlight)
  _giaGoc: number     // giá gốc trước khi sửa (0 = chưa sửa)
  _slGoc: number      // SL gốc trước khi sửa (0 = chưa sửa)
}

interface SuaDonForm {
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
        const raw=e.target.value.replace(/./g,'').replace(/[^0-9]/g,'')
        const num=Number(raw)||0
        setDisplay(num>0?num.toLocaleString('vi-VN'):'')
        onChange(num)
      }}
      style={{width:'100%',padding:'7px 10px',border:'1px solid #E5E7EB',borderRadius:'6px',fontSize:'13px',boxSizing:'border-box' as any}}/>
  )
}

export default function ChiTietDonHangClient({
  donHang, chiTiet, khachHang, giaoHang, danhSachSP, trangThaiTinh, doiSoatMap, tongDaThu, spDaSoatSet=new Set(), user,
}: {
  donHang: any
  chiTiet: any[]
  khachHang: any
  giaoHang: any[]
  danhSachSP: any[]
  trangThaiTinh?: string
  doiSoatMap?: Record<string, any>   // maGH → đối soát
  tongDaThu?: number                  // tổng tiền đã thu từ KH
  spDaSoatSet?: Set<string>           // SP đã đối soát
  user: UserSession
}) {
  const router = useRouter()
  const maDon  = donHang['Mã đơn hàng']

  // Dùng trangThaiTinh (tính từ data thực) nếu có, fallback về NocoDB
  const [trangThai, setTrangThai] = useState(trangThaiTinh || donHang['Trạng thái']||'Chờ giao')
  const [daHuy, setDaHuy] = useState(donHang['Trạng thái']==='Hủy'||donHang['Trạng thái']==='Huỷ'||trangThaiTinh==='Hủy'||trangThaiTinh==='Huỷ')
  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)

  // Hủy đơn hàng
  const [showHuyDon,  setShowHuyDon]  = useState(false)
  const [cpTraHang,   setCpTraHang]   = useState(0)
  const [lyDoHuy,     setLyDoHuy]     = useState('')
  const [dangHuyDon,  setDangHuyDon]  = useState(false)
  const [hinhThucHoanDon, setHinhThucHoanDon] = useState<'Tiền mặt'|'Chuyển khoản'>('Tiền mặt')

  // Chế độ sửa — chỉ khi Chờ giao / Đang giao / Đang giao 1 phần
  const coTheSua = !daHuy && ['Chờ giao','Đang giao','Đang giao 1 phần'].includes(trangThai||trangThaiTinh||'')
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
    const q=(suaSearchSP||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
    return danhSachSP.filter((sp:any)=>
      (sp['Tên sản phẩm']||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().includes(q)||
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
  }

  // Sửa thông tin giao hàng
  const [htGiao,      setHtGiao]      = useState(donHang['Hình thức giao hàng']||'Giao hàng cho khách')
  const [ngayHenGiao, setNgayHenGiao] = useState(donHang['Ngày hẹn giao']
    ? new Date(donHang['Ngày hẹn giao']).toISOString().slice(0,16) : '')

  // Sửa thanh toán
  const [datCocEdit,      setDatCocEdit]      = useState(Number(donHang['Đặt cọc']||0))
  const [cpDoiTra,        setCpDoiTra]        = useState(0)
  const [tienHoanCoc,     setTienHoanCoc]     = useState(Number(donHang['Tiền hoàn cọc']||0))
  const [tinhTrangHoanCoc,setTinhTrangHoanCoc]= useState(donHang['Tình trạng hoàn cọc']||'')
  const [hinhThucHoanCoc, setHinhThucHoanCoc] = useState<'Tiền mặt'|'Chuyển khoản'>('Tiền mặt')

  // Danh sách SP — kết hợp từ server + thêm mới local
  const [spList, setSpList] = useState<SPItem[]>(() =>
    chiTiet
      .filter(ct => ct['Tên SP (ghi nhanh)']||ct['Mã SP'])
      .map(ct => ({
        id:         String(ct['Id']||ct['id']||''),
        maCT:       ct['Mã chi tiết']||'',
        maSP:       ct['Mã SP']||'',
        tenSP:      ct['Tên SP (ghi nhanh)']||ct['Mã SP']||'',
        soLuong:    Number(ct['Số lượng']||1),
        donGia:     Number(ct['Đơn giá']||0),
        thanhTien:  Number(ct['Thành tiền']||0),
        ghiChu:     ct['Ghi chú SP']||'',
        // ✅ Đọc Trạng thái SP từ NocoDB để biết đã hủy chưa
        da_huy:     ct['Trạng thái SP'] === 'Huỷ',
        la_moi:     false,
        // Đọc lịch sử sửa từ NocoDB
        _da_sua:    !!(ct['Sửa giá'] || ct['Sửa số lượng']),
        _giaGoc:    Number(ct['Sửa giá'] || 0),
        _slGoc:     Number(ct['Sửa số lượng'] || 0),
      }))
  )

  // Chọn tất cả để hủy
  const [chonTatCa,  setChonTatCa]  = useState(false)
  const [spChonHuy,  setSpChonHuy]  = useState<Set<string>>(new Set())

  // Confirm hủy SP
  const [confirmHuy, setConfirmHuy] = useState<string|null>(null) // id SP cần xác nhận hủy
  const [confirmHuyTatCa, setConfirmHuyTatCa] = useState(false)

  // Thêm SP mới
  const [showTimSP,  setShowTimSP]  = useState(false)
  const [searchSP,   setSearchSP]   = useState('')

  const spLoc = useMemo(() => {
    if (!searchSP.trim()) return danhSachSP.slice(0,8)
    const q = boDau(searchSP)
    return danhSachSP.filter(sp =>
      boDau(sp['Tên sản phẩm']||'').includes(q) ||
      boDau(sp['Mã SP']||'').includes(q)
    ).slice(0,8)
  }, [searchSP, danhSachSP])

  // Tính tổng — chỉ SP chưa hủy
  const tongTienHienTai = spList
    .filter(sp => !sp.da_huy)
    .reduce((s,sp) => s+(sp.soLuong*sp.donGia), 0)

  const datCoc  = dangSua ? datCocEdit : Number(donHang['Đặt cọc']||0)
  const conLai  = tongTienHienTai + (dangSua ? cpDoiTra : Number(donHang['CP đổi trả']||0)) - datCoc
  const tt      = TT_COLOR[trangThai]||{bg:'#F3F4F6',color:'#374151'}

  function showMsg(text: string, ok=true) {
    setMsg(text); setMsgOk(ok)
    setTimeout(()=>setMsg(''),4000)
  }

  // ── Hủy 1 SP ──
  function batDauHuy(id: string) { setConfirmHuy(id) }
  function xacNhanHuy(id: string) {
    setSpList(prev => prev.map(sp => sp.id===id ? {...sp, da_huy:true} : sp))
    setConfirmHuy(null)
    setSpChonHuy(prev => { const s=new Set(prev); s.delete(id); return s })
  }

  // ── Hủy tất cả đã chọn ──
  function xacNhanHuyTatCa() {
    setSpList(prev => prev.map(sp => spChonHuy.has(sp.id) ? {...sp,da_huy:true} : sp))
    setSpChonHuy(new Set())
    setChonTatCa(false)
    setConfirmHuyTatCa(false)
  }

  // ── Thêm SP mới từ danh sách ──
  // Nếu trùng tên với SP chưa hủy → tăng số lượng thay vì thêm mới
  function themSP(sp: any) {
    const tenMoi = (sp['Tên sản phẩm']||'').trim()
    const maSPMoi = sp['Mã SP']||''
    const trung = spList.find(s =>
      !s.da_huy && (
        s.tenSP.trim() === tenMoi ||
        (maSPMoi && s.maSP === maSPMoi)
      )
    )
    if (trung) {
      // Tăng số lượng SP đã có
      setSpList(prev => prev.map(s => s.id===trung.id
        ? { ...s, soLuong: s.soLuong+1, thanhTien: (s.soLuong+1)*s.donGia }
        : s
      ))
    } else {
      const dg = Number(sp['Giá bán lẻ']||0)
      const moi: SPItem = {
        id:        `new-${Date.now()}`,
        maCT:      '',
        maSP:      maSPMoi,
        tenSP:     tenMoi,
        soLuong:   1,
        donGia:    dg,
        thanhTien: dg,
        ghiChu:    '',
        da_huy:    false,
        la_moi:    true,
        _da_sua:   false,
        _giaGoc:   0,
        _slGoc:    0,
      }
      setSpList(prev => [...prev, moi])
    }
    setSearchSP(''); setShowTimSP(false)
  }

  // ── Thêm SP thủ công (gõ tên) ──
  function themSPThuCong() {
    const moi: SPItem = {
      id:        `new-${Date.now()}`,
      maCT:      '', maSP:'', tenSP:searchSP.trim()||'Sản phẩm mới',
      soLuong:1, donGia:0, thanhTien:0, ghiChu:'',
      da_huy:false, la_moi:true, _da_sua:false, _giaGoc:0, _slGoc:0,
    }
    setSpList(prev=>[...prev,moi])
    setSearchSP(''); setShowTimSP(false)
  }

  function updSP(id: string, field: keyof SPItem, val: any) {
    setSpList(prev => prev.map(sp => {
      if (sp.id!==id) return sp
      const u = {...sp, [field]:val}
      if (field==='soLuong'||field==='donGia') {
        u.thanhTien = (field==='soLuong'?Number(val):sp.soLuong) * (field==='donGia'?Number(val):sp.donGia)
        if (!sp.la_moi) {
          u._da_sua = true
          // Lưu giá/SL gốc lần đầu tiên sửa (chưa có gốc thì lưu lại)
          if (field==='donGia'  && !sp._giaGoc) u._giaGoc = sp.donGia
          if (field==='soLuong' && !sp._slGoc)  u._slGoc  = sp.soLuong
        }
      }
      return u
    }))
  }

  // ── Chọn tất cả để hủy ──
  function toggleChonTatCa(val: boolean) {
    setChonTatCa(val)
    if (val) {
      setSpChonHuy(new Set(spList.filter(sp=>!sp.da_huy).map(sp=>sp.id)))
    } else {
      setSpChonHuy(new Set())
    }
  }

  // ── Lưu chỉnh sửa ──
  async function luuSua() {
    setLoading(true); setMsg('')
    try {
      const spHuy  = spList.filter(sp => sp.da_huy && !sp.la_moi)
      const spMoi  = spList.filter(sp => sp.la_moi && !sp.da_huy)
      const spSua  = spList.filter(sp => !sp.da_huy && !sp.la_moi)

      // 1. Đánh dấu SP hủy — lưu vào field 'Trạng thái SP' = 'Huỷ'
      for (const sp of spHuy) {
        if (sp.id && !sp.id.startsWith('new-')) {
          await fetch('/api/chi-tiet-don', {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              id: sp.id,
              'Trạng thái SP': 'Huỷ',
              'Mã SP': sp.maSP||'',
              'Số lượng': sp.soLuong||0,
              'Ghi chú SP': `[Huỷ bởi ${user.hoTen||user.tenDangNhap} ngày ${new Date().toLocaleDateString('vi-VN')}]`,
            }),
          })
        }
      }

      // 1b. Cập nhật SP đã sửa SL/giá — lưu luôn giá/SL gốc vào NocoDB
      const spSuaGia = spList.filter(sp => sp._da_sua && !sp.da_huy && !sp.la_moi)
      for (const sp of spSuaGia) {
        if (sp.id && !sp.id.startsWith('new-')) {
          await fetch('/api/chi-tiet-don', {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              id:            sp.id,
              'Số lượng':    sp.soLuong,
              'Đơn giá':     sp.donGia,
              'Thành tiền':  sp.soLuong * sp.donGia,
              // Lưu giá/SL gốc để hiện thông báo sau khi reload
              'Sửa giá':          sp._giaGoc || undefined,
              'Sửa số lượng':     sp._slGoc  || undefined,
            }),
          })
        }
      }

      // 2. Thêm SP mới
      for (const sp of spMoi) {
        await fetch('/api/chi-tiet-don', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            'Mã đơn hàng': maDon,
            'Mã SP':       sp.maSP,
            'Tên SP (ghi nhanh)': sp.tenSP,
            'Số lượng':    sp.soLuong,
            'Đơn giá':     sp.donGia,
            'Thành tiền':  sp.thanhTien,
            'Ghi chú SP':  sp.ghiChu,
          }),
        })
      }

      // 3. Cập nhật tổng tiền đơn — tính lại đúng
      // Lấy danh sách SP sau khi cập nhật hủy
      const spSauHuy  = spList.map(sp => spHuy.find(h=>h.id===sp.id) ? {...sp,da_huy:true} : sp)
      const spConLai  = spSauHuy.filter(sp => !sp.da_huy)
      const ttMoi     = spConLai.reduce((s,sp) => s + (sp.donGia * sp.soLuong), 0)
      const conPhaiThu = Math.max(0, ttMoi - datCoc)

      // Nếu tất cả SP bị hủy → đơn Huỷ
      const tatCaHuy = spSauHuy.length > 0 && spSauHuy.every(sp => sp.da_huy)
      const ttDon    = tatCaHuy ? 'Huỷ' : trangThai

      const cpDoiTraFinal   = cpDoiTra || 0
      // Khi hủy toàn bộ đơn: Còn phải thu = 0 (không còn gì để thu nữa)
      // Tiền cọc sẽ được tính vào "Tiền hoàn cọc" riêng
      const conPhaiThuFinal = tatCaHuy ? 0 : Math.max(0, ttMoi + cpDoiTraFinal - datCocEdit)

      const resDon = await fetch('/api/don-hang', {
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          id:                    donHang['Id']||donHang['id'],
          'Tổng tiền đơn':       ttMoi,
          'Đặt cọc':             datCocEdit,
          'Còn phải thu':        conPhaiThuFinal,
          'Trạng thái':          ttDon,
          'Hình thức giao hàng': htGiao,
          'Ngày hẹn giao':       ngayHenGiao || null,
          'CP đổi trả':          cpDoiTraFinal,
        }),
      })
      if (!resDon.ok) throw new Error('Lỗi cập nhật đơn hàng')

      if (tatCaHuy) setTrangThai('Huỷ')

      // Tính tiền hoàn cọc nếu tất cả SP bị hủy
      if (tatCaHuy) {
        const tienHoanCoc = Math.max(0, datCocEdit - cpDoiTraFinal)
        const tinhTrangHoan = tienHoanCoc > 0 ? 'Chờ hoàn' : 'Không hoàn'
        await fetch('/api/don-hang', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: donHang['Id']||donHang['id'],
            'Tiền hoàn cọc': tienHoanCoc,
            'Tình trạng hoàn cọc': tinhTrangHoan,
          }),
        })
        setTienHoanCoc(tienHoanCoc)
        setTinhTrangHoanCoc(tinhTrangHoan)
      }

      // Đánh dấu SP mới là không còn la_moi
      setSpList(prev => prev.map(sp => ({...sp, la_moi:false})))
      setDangSua(false)
      showMsg('✅ Đã lưu chỉnh sửa đơn hàng')
      router.refresh()
    } catch(err:any) {
      showMsg('❌ '+(err.message||'Lỗi lưu'), false)
    } finally {
      setLoading(false)
    }
  }

  async function capNhatTrangThai(newTT: string) {
    setLoading(true)
    try {
      const res = await fetch('/api/don-hang', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ id: donHang['Id']||donHang['id'], 'Trạng thái': newTT }),
      })
      if (!res.ok) throw new Error('Lỗi')
      setTrangThai(newTT)
      showMsg('✅ Đã cập nhật trạng thái')
    } catch { showMsg('❌ Lỗi cập nhật', false) }
    finally { setLoading(false) }
  }

  async function xacNhanHuyDon() {
    if (!lyDoHuy.trim()) {
      showMsg('Vui lòng nhập lý do hủy', false); return
    }
    setDangHuyDon(true)
    try {
      // Tổng đã thu = tiền thu qua đối soát + tiền cọc/trả trước
      const tongDaThuThucTe = (tongDaThu || 0) + Number(donHang['Đặt cọc'] || 0)
      const tienHoan = Math.max(0, tongDaThuThucTe - cpTraHang)
      const nguoiHuy = user.hoTen||user.tenDangNhap||''
      const thoiGian = new Date().toLocaleString('vi-VN')
      const ghiChuHuy = '[Huy boi ' + nguoiHuy + ' luc ' + thoiGian + (lyDoHuy ? ': ' + lyDoHuy : '') + ']'
      await fetch('/api/don-hang', {
        method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          id: donHang['Id']||donHang['id'],
          'Trạng thái': 'Hủy',
          'Còn phải thu': 0,
          'CP đổi trả': cpTraHang,
          'Tiền hoàn cọc': tienHoan,
          'Tình trạng hoàn cọc': tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn',
          'Hình thức hoàn cọc': hinhThucHoanDon,
          'Ghi chú': (donHang['Ghi chú']||'') + ' ' + ghiChuHuy,
        }),
      })
      setTrangThai('Huỷ')
      setDaHuy(true)
      setTienHoanCoc(tienHoan)
      setTinhTrangHoanCoc(tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn')
      if (cpTraHang > 0) {
        await fetch('/api/chi-phi', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            ngayPhatSinh: new Date().toISOString().split('T')[0],
            loaiGiaoDich: 'Thu', loaiThu: 'Thu bù CP đổi trả',
            noiDung: 'Thu CP đổi trả đơn ' + maDon,
            soTien: cpTraHang, hinhThuc: hinhThucHoanDon,
            trangThai: 'Đã thanh toán', maDonHang: maDon,
          }),
        })
      }
      setShowHuyDon(false)
      showMsg('✅ Đã hủy đơn hàng thành công')
      router.refresh()
      setTimeout(() => { router.push('/dashboard/don-hang') }, 1500)
    } catch(e:any) { showMsg((e.message||'Lỗi hủy'), false) }
    finally { setDangHuyDon(false) }
  }

  const spHienThi = spList // hiển thị tất cả kể cả đã hủy
  const soSPHuy  = spList.filter(sp=>sp.da_huy && !sp.la_moi).length
  const soSPMoi  = spList.filter(sp=>sp.la_moi && !sp.da_huy).length
  const soSPSuaGia = spList.filter(sp=>sp._giaGoc>0 && !sp.da_huy && !sp.la_moi).length
  const soSPSuaSL  = spList.filter(sp=>sp._slGoc>0  && !sp.da_huy && !sp.la_moi).length
  // Đang sửa (chưa lưu) — dùng _da_sua
  const soSPDangSuaGia = spList.filter(sp=>sp._da_sua && sp._giaGoc>0 && !sp.da_huy && !sp.la_moi).length
  const soSPDangSuaSL  = spList.filter(sp=>sp._da_sua && sp._slGoc>0  && !sp.da_huy && !sp.la_moi).length
  const soSPSua  = soSPSuaGia + soSPSuaSL
  const coBatKyHuy = spList.some(sp=>sp.da_huy)

  return (
    <div style={{padding:'20px 28px',maxWidth:'1300px'}}>
      <style>{`
        .sp-huy{opacity:0.45;background:#FFF1F1!important;border-color:#FCA5A5!important;}
        .sp-huy .sp-ten{color:#DC2626;text-decoration:line-through;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;}
        .confirm-box{background:white;border-radius:12px;padding:24px;width:100%;max-width:360px;text-align:center;}
        .db{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:220px;overflow-y:auto;}
        .di{padding:9px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;}.di:last-child{border-bottom:none;}
      `}</style>

      {/* Header */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'24px'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'4px'}}>
            <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'22px',fontWeight:700}}>📋 {maDon}</h1>
            <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:700,background:daHuy?'#FEE2E2':tt.bg,color:daHuy?'#991B1B':tt.color}}>{daHuy?'Huỷ':(trangThaiTinh||trangThai)}</span>
            {soSPHuy>0 && <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',background:'#FEE2E2',color:'#991B1B',fontWeight:600}}>🚫 Đã hủy {soSPHuy} SP</span>}
            {soSPMoi>0 && <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',background:'#D1FAE5',color:'#065F46',fontWeight:600}}>➕ Thêm {soSPMoi} SP mới</span>}
            {soSPSuaGia>0 && <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',background:'#DBEAFE',color:'#1E40AF',fontWeight:600}}>💲 Đã sửa giá {soSPSuaGia} SP</span>}
            {soSPSuaSL>0  && <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',background:'#EDE9FE',color:'#6D28D9',fontWeight:600}}>🔢 Đã sửa SL {soSPSuaSL} SP</span>}
          </div>
          <p style={{color:'var(--text-secondary)',fontSize:'13px'}}>
            Ngày đặt: {fDate(donHang['Ngày bán']||donHang['Ngày đặt'])} &nbsp;·&nbsp;
            NV: {donHang['Nhân viên bán']||'—'} &nbsp;·&nbsp;
            Kênh: {donHang['Kênh bán']||'—'}
          </p>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          {coTheSua && (
            <Link href={'/dashboard/don-hang/'+maDon+'/sua'}
              style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#F59E0B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'6px'}}>
              ✏️ Sửa đơn hàng
            </Link>
          )}
          {!daHuy&&trangThai!=='Huỷ'&&(
            <button onClick={()=>{setShowHuyDon(true);setCpTraHang(0);setLyDoHuy('')}}
              style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              🚫 Hủy đơn
            </button>
          )}

          <Link href={`/dashboard/don-hang/${maDon}/in`} className="btn btn-outline btn-sm">🖨️ In</Link>
          <button onClick={()=>router.back()} className="btn btn-ghost btn-sm">← Quay lại</button>
        </div>
      </div>

      {msg && <div style={{padding:'10px 16px',borderRadius:'8px',marginBottom:'16px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {dangSua && (
        <div style={{padding:'10px 14px',background:'#FEF3C7',borderRadius:'8px',marginBottom:'14px',fontSize:'12px',color:'#92400E',border:'1px solid #FCD34D'}}>
          ✏️ <strong>Đang ở chế độ sửa đơn.</strong> Bạn có thể thêm SP, hủy SP, chỉnh số lượng/giá. Nhấn "Lưu chỉnh sửa" khi xong.
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1.2fr',gap:'20px'}}>

        {/* Cột trái */}
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>

          {/* Khách hàng */}
          <div className="card" style={{padding:'20px'}}>
            <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--primary)',marginBottom:'12px'}}>👥 Khách hàng</h3>
            {khachHang ? (
              <div style={{display:'flex',flexDirection:'column',gap:'6px',fontSize:'13px'}}>
                <div style={{fontWeight:700,fontSize:'15px'}}>{khachHang['Tên khách hàng']}</div>
                <div style={{color:'var(--text-secondary)'}}>📞 {khachHang['Số điện thoại']||'—'}</div>
                <div style={{color:'var(--text-secondary)'}}>📍 {khachHang['Địa chỉ']||'—'}</div>
                <div style={{color:'var(--text-secondary)'}}>Loại: {khachHang['Đối tượng khách hàng']||'—'}</div>
              </div>
            ) : (
              <div style={{color:'var(--text-secondary)',fontSize:'13px'}}>Mã KH: {donHang['Mã KH']||'—'}</div>
            )}
          </div>

          {/* Giao hàng */}
          <div className="card" style={{padding:'20px'}}>
            <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--primary)',marginBottom:'12px'}}>🚚 Giao hàng</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'8px',fontSize:'13px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{color:'var(--text-secondary)',flexShrink:0}}>Hình thức:</span>
                {dangSua ? (
                  <select value={htGiao} onChange={e=>setHtGiao(e.target.value)} className="input" style={{width:'auto',fontSize:'12px',padding:'3px 8px'}}>
                    <option>Giao hàng cho khách</option>
                    <option>Khách mang hàng về</option>
                  </select>
                ) : <span style={{fontWeight:600}}>{donHang['Hình thức giao hàng']||'—'}</span>}
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{color:'var(--text-secondary)',flexShrink:0}}>Ngày hẹn giao:</span>
                {dangSua ? (
                  <input type="datetime-local" value={ngayHenGiao} onChange={e=>setNgayHenGiao(e.target.value)}
                    className="input" style={{width:'auto',fontSize:'12px',padding:'3px 8px'}}/>
                ) : <span style={{fontWeight:600}}>{fDT(donHang['Ngày hẹn giao'])}</span>}
              </div>
              {giaoHang.length>0 && (
                <div style={{marginTop:'8px',borderTop:'1px solid var(--border)',paddingTop:'8px'}}>
                  <div style={{fontWeight:700,marginBottom:'6px',fontSize:'12px',color:'var(--text-secondary)'}}>CÁC CHUYẾN GIAO</div>
                  {giaoHang.map((g:any,i:number)=>{
                    const ds = doiSoatMap?.[g['Mã giao hàng']]
                    const daSoat = g['Tình trạng đối soát'] === 'Đã đối soát'
                    return (
                      <div key={i} style={{background:daSoat?'#F0FDF4':'#EFF6FF',borderRadius:'6px',padding:'8px 10px',marginBottom:'6px',fontSize:'12px',border:`1px solid ${daSoat?'#BBF7D0':'#BFDBFE'}`}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontWeight:700}}>{g['Tên NV/đối tác']||'—'}</span>
                          <span style={{fontSize:'11px',padding:'1px 8px',borderRadius:'10px',fontWeight:600,
                            background:daSoat?'#D1FAE5':'#DBEAFE',
                            color:daSoat?'#065F46':'#1E40AF'}}>
                            {daSoat?'✅ Đã đối soát':'🚚 Đang giao'}
                          </span>
                        </div>
                        <div style={{color:'var(--text-secondary)',marginTop:'3px'}}>{fDT(g['Ngày giao'])}</div>
                        {ds && (
                          <div style={{marginTop:'5px',paddingTop:'5px',borderTop:'1px solid #E5E7EB',display:'flex',flexWrap:'wrap',gap:'8px',fontSize:'11px'}}>
                            {Number(ds['Đã thu được']||0)>0 && <span style={{color:'#16A34A',fontWeight:600}}>💵 Thu: {fVND(Number(ds['Đã thu được']))}</span>}
                            {Number(ds['Chi phí VC']||0)>0 && <span style={{color:'#6B7280'}}>🚚 VC: {fVND(Number(ds['Chi phí VC']))}</span>}
                            {Number(ds['Chi phí lắp đặt']||0)>0 && <span style={{color:'#6B7280'}}>🔧 Lắp: {fVND(Number(ds['Chi phí lắp đặt']))}</span>}
                            {Number(ds['Thưởng chuyến']||0)>0 && <span style={{color:'#F59E0B',fontWeight:600}}>⭐ Thưởng: {fVND(Number(ds['Thưởng chuyến']))}</span>}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Thanh toán */}
          <div className="card" style={{padding:'20px'}}>
            <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--primary)',marginBottom:'12px'}}>💰 Thanh toán</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                <span style={{color:'var(--text-secondary)'}}>Tổng tiền hàng (gốc):</span>
                <span style={{fontWeight:700}}>{fVND(tongTienHienTai)}</span>
              </div>
              {Number(donHang['Giảm giá']||0)>0&&(
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                  <span style={{color:'var(--text-secondary)'}}>
                    Giảm giá{donHang['Loại giảm giá']==='percent'&&donHang['Giá trị giảm']>0
                      ? ' ('+donHang['Giá trị giảm']+'%)'
                      : ''}:
                  </span>
                  <span style={{fontWeight:600,color:'#7C3AED'}}>- {fVND(Number(donHang['Giảm giá']||0))}</span>
                </div>
              )}
              {Number(donHang['CP giao hàng']||0)>0 && (
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                  <span style={{color:'var(--text-secondary)'}}>CP giao hàng:</span>
                  <span style={{fontWeight:600,color:'#92400E'}}>+ {fVND(Number(donHang['CP giao hàng']||0))}</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'13px'}}>
                <span style={{color:'var(--text-secondary)'}}>Đặt cọc ({donHang['Hình thức cọc']||'—'}):</span>
                {dangSua ? (
                  <input type="number" min="0" value={datCocEdit||''} placeholder="0"
                    onChange={e=>setDatCocEdit(Number(e.target.value))}
                    style={{width:'120px',padding:'3px 8px',border:'1px solid #E5E7EB',borderRadius:'4px',fontSize:'12px',textAlign:'right'}}/>
                ) : <span style={{color:'var(--success)',fontWeight:600}}>{fVND(datCoc)}</span>}
              </div>
              {dangSua && (
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:'13px'}}>
                  <span style={{color:'var(--text-secondary)'}}>CP đổi trả (thu thêm KH):</span>
                  <input type="number" min="0" value={cpDoiTra||''} placeholder="0"
                    onChange={e=>setCpDoiTra(Number(e.target.value))}
                    style={{width:'120px',padding:'3px 8px',border:'1px solid #FCD34D',borderRadius:'4px',fontSize:'12px',textAlign:'right',background:'#FFFBEB'}}/>
                </div>
              )}
              {!dangSua && Number(donHang['CP đổi trả']||0)>0 && (
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                  <span style={{color:'var(--text-secondary)'}}>CP đổi trả:</span>
                  <span style={{fontWeight:600,color:'#DC2626'}}>+ {fVND(Number(donHang['CP đổi trả']||0))}</span>
                </div>
              )}
              {/* Đã thu từ KH qua đối soát */}
              {!dangSua && (tongDaThu||0) > 0 && (
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                  <span style={{color:'var(--text-secondary)'}}>Đã thu (qua giao hàng):</span>
                  <span style={{fontWeight:700,color:'#16A34A'}}>- {fVND(tongDaThu||0)}</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'15px',fontWeight:800,borderTop:'1px solid var(--border)',paddingTop:'8px',marginTop:'4px'}}>
                <span>Còn phải thu:</span>
                <span style={{color:Number(donHang['Còn phải thu']||0)>0?'#DC2626':'#16A34A'}}>
                  {fVND(Number(donHang['Còn phải thu']||0))}
                </span>
              </div>

              {/* Hoàn cọc — hiện khi đơn hủy có tiền cọc */}
              {(trangThai==='Huỷ'||tinhTrangHoanCoc) && (tienHoanCoc>0||tinhTrangHoanCoc==='Không hoàn') && (
                <div style={{marginTop:'8px',padding:'10px 12px',borderRadius:'8px',border:'2px solid',borderColor:tinhTrangHoanCoc==='Đã hoàn'?'#16A34A':tinhTrangHoanCoc==='Chờ hoàn'?'#F59E0B':'#E5E7EB',background:tinhTrangHoanCoc==='Đã hoàn'?'#F0FDF4':tinhTrangHoanCoc==='Chờ hoàn'?'#FFFBEB':'#F9FAFB'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                    <span style={{fontSize:'13px',fontWeight:700,color:tinhTrangHoanCoc==='Đã hoàn'?'#16A34A':tinhTrangHoanCoc==='Chờ hoàn'?'#D97706':'#6B7280'}}>
                      {tinhTrangHoanCoc==='Đã hoàn'?'✅':'⚠️'} Hoàn cọc cho KH
                    </span>
                    <span style={{fontSize:'15px',fontWeight:800,color:tinhTrangHoanCoc==='Đã hoàn'?'#16A34A':'#D97706'}}>
                      {fVND(tienHoanCoc)}
                    </span>
                  </div>
                  <div style={{fontSize:'11px',color:'#6B7280',marginBottom:'8px'}}>
                    = Cọc {fVND(Number(donHang['Đặt cọc']||0))} − CP đổi trả {fVND(Number(donHang['CP đổi trả']||0))}
                  </div>
                  {/* Nút đánh dấu đã hoàn — chỉ chủ cửa hàng */}
                  {user.vaiTro==='Chủ cửa hàng' && tinhTrangHoanCoc!=='Đã hoàn' && tienHoanCoc>0 && (
                    <div>
                      <div style={{display:'flex',gap:'6px',marginBottom:'8px'}}>
                        {(['Tiền mặt','Chuyển khoản'] as const).map(ht=>(
                          <button key={ht} onClick={()=>setHinhThucHoanCoc(ht)}
                            style={{flex:1,padding:'6px',borderRadius:'6px',border:'2px solid',
                              borderColor:hinhThucHoanCoc===ht?'#16A34A':'#E5E7EB',
                              background:hinhThucHoanCoc===ht?'#F0FDF4':'white',
                              color:hinhThucHoanCoc===ht?'#16A34A':'#6B7280',
                              fontWeight:hinhThucHoanCoc===ht?700:400,fontSize:'12px',cursor:'pointer'}}>
                            {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                          </button>
                        ))}
                      </div>
                      <button onClick={async()=>{
                        setLoading(true)
                        await fetch('/api/don-hang',{method:'PATCH',headers:{'Content-Type':'application/json'},
                          body:JSON.stringify({id:donHang['Id']||donHang['id'],'Tình trạng hoàn cọc':'Đã hoàn','Hình thức hoàn cọc':hinhThucHoanCoc})})
                        setTinhTrangHoanCoc('Đã hoàn')
                        setLoading(false)
                        showMsg('✅ Đã đánh dấu hoàn cọc')
                        router.refresh()
                      }} disabled={loading}
                        style={{width:'100%',padding:'7px',borderRadius:'6px',border:'none',background:'#16A34A',color:'white',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                        ✅ Đánh dấu đã hoàn cọc cho khách
                      </button>
                    </div>
                  )}
                  {tinhTrangHoanCoc==='Đã hoàn' && (
                    <div style={{fontSize:'12px',color:'#16A34A',fontWeight:600,textAlign:'center'}}>✅ Đã hoàn cọc cho khách</div>
                  )}
                </div>
              )}
              {donHang['Xuất hóa đơn']==='Có' && (
                <div style={{background:'#FEF3C7',color:'#92400E',padding:'6px 10px',borderRadius:'6px',fontSize:'12px',fontWeight:600}}>🧾 Xuất hoá đơn VAT</div>
              )}
            </div>
          </div>

          {/* Ghi chú */}
          {donHang['Ghi chú'] && (
            <div className="card" style={{padding:'20px'}}>
              <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--primary)',marginBottom:'8px'}}>📝 Ghi chú</h3>
              <p style={{fontSize:'13px',color:'var(--text-secondary)',lineHeight:1.6}}>{donHang['Ghi chú']}</p>
            </div>
          )}

          {/* Trạng thái đơn — chỉ xem */}
          <div className="card" style={{padding:'16px 20px'}}>
            <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--primary)',marginBottom:'10px'}}>📌 Trạng thái đơn hàng</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
              {['Chờ giao','Đang giao 1 phần','Đang giao','Đã giao 1 phần','Đã giao','Hoàn thành','Huỷ'].map(t=>{
                const c = TT_COLOR[t]||{bg:'#F3F4F6',color:'#9CA3AF'}
                const ttHienTai = trangThaiTinh||trangThai
                const isA = ttHienTai===t
                return (
                  <div key={t} style={{
                    padding:'8px 12px',borderRadius:'8px',border:'2px solid',
                    borderColor:isA?c.color:'#F0F0F0',
                    background:isA?c.bg:'#FAFAFA',
                    color:isA?c.color:'#C0C0C0',
                    fontWeight:isA?700:400,fontSize:'13px',
                    display:'flex',alignItems:'center',gap:'8px',
                  }}>
                    <span style={{fontSize:'16px'}}>{isA?'●':'○'}</span>
                    {t}
                  </div>
                )
              })}
            </div>
            <p style={{fontSize:'11px',color:'#9CA3AF',margin:'8px 0 0',fontStyle:'italic'}}>Trạng thái tự động tính theo giao hàng & đối soát</p>
          </div>
        </div>

        {/* Cột phải — Sản phẩm */}
        <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
          <div className="card" style={{padding:'20px'}}>
            {/* Header SP */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--primary)',margin:0}}>
                🪑 Sản phẩm trong đơn ({spList.filter(sp=>!sp.da_huy).length}/{spList.length})
              </h3>
              {dangSua && spList.filter(sp=>!sp.da_huy).length>1 && (
                <label style={{display:'flex',alignItems:'center',gap:'6px',fontSize:'12px',cursor:'pointer',color:'#DC2626',fontWeight:600}}>
                  <input type="checkbox" checked={chonTatCa}
                    onChange={e=>toggleChonTatCa(e.target.checked)}
                    style={{width:'14px',height:'14px',accentColor:'#DC2626'}}/>
                  Chọn tất cả để hủy
                </label>
              )}
            </div>

            {/* Nút hủy tất cả đã chọn */}
            {dangSua && spChonHuy.size>0 && (
              <button onClick={()=>setConfirmHuyTatCa(true)}
                style={{width:'100%',marginBottom:'10px',padding:'7px',borderRadius:'7px',border:'2px solid #DC2626',background:'#FEF2F2',color:'#DC2626',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>
                🗑️ Hủy {spChonHuy.size} sản phẩm đã chọn
              </button>
            )}

            {/* Danh sách SP */}
            {spList.length===0 ? (
              <p style={{color:'var(--text-muted)',fontSize:'13px'}}>Chưa có sản phẩm</p>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
                {spHienThi.map((sp,i)=>(
                  <div key={sp.id} className={sp.da_huy?'sp-huy':''} style={{border:`1px solid ${sp.da_huy?'#FCA5A5':sp._da_sua&&!sp.la_moi?'#60A5FA':'var(--border)'}`,borderRadius:'8px',padding:'10px 12px',background:sp.da_huy?'#FFF1F1':sp._da_sua&&!sp.la_moi?'#EFF6FF':'#FAFBFD'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:'8px'}}>
                      <div style={{flex:1,minWidth:0}}>
                        {/* Tên SP */}
                        {dangSua&&!sp.da_huy&&spDaSoatSet.has(sp.tenSP||sp.maSP)&&(
                          <div style={{fontSize:'10px',background:'#FEF3C7',color:'#92400E',padding:'2px 7px',borderRadius:'8px',marginBottom:'4px',display:'inline-block',fontWeight:700}}>
                            🔒 Đã đối soát — không thể sửa/hủy
                          </div>
                        )}
                        {dangSua && !sp.da_huy && !spDaSoatSet.has(sp.tenSP||sp.maSP) ? (
                          <input value={sp.tenSP} onChange={e=>updSP(sp.id,'tenSP',e.target.value)}
                            style={{width:'100%',padding:'3px 6px',border:'1px solid #E5E7EB',borderRadius:'4px',fontSize:'13px',fontWeight:600,marginBottom:'4px'}}/>
                        ) : (
                          <div className="sp-ten" style={{fontWeight:700,fontSize:'13px',marginBottom:'4px',color:sp.da_huy?'#DC2626':'#1F2937'}}>
                            {sp.da_huy && '🚫 '}{sp.tenSP}
                            {sp.la_moi && <span style={{marginLeft:'6px',fontSize:'10px',background:'#D1FAE5',color:'#065F46',padding:'1px 6px',borderRadius:'10px',fontWeight:700}}>MỚI</span>}
                            {sp.da_huy && <span style={{marginLeft:'6px',fontSize:'10px',background:'#FEE2E2',color:'#991B1B',padding:'1px 6px',borderRadius:'10px',fontWeight:700}}>ĐÃ HUỶ</span>}
                          </div>
                        )}
                        {/* SL + Đơn giá */}
                        <div style={{display:'flex',gap:'10px',fontSize:'12px',color:'var(--text-secondary)',flexWrap:'wrap'}}>
                          {dangSua && !sp.da_huy ? (
                            <>
                              <label style={{display:'flex',alignItems:'center',gap:'4px'}}>
                                SL:
                                <input type="number" min="1" value={sp.soLuong} onChange={e=>updSP(sp.id,'soLuong',Number(e.target.value))}
                                  style={{width:'52px',padding:'2px 4px',border:'1px solid #E5E7EB',borderRadius:'4px',fontSize:'12px',textAlign:'center'}}/>
                              </label>
                              <label style={{display:'flex',alignItems:'center',gap:'4px'}}>
                                Giá:
                                <input type="number" min="0" value={sp.donGia} onChange={e=>updSP(sp.id,'donGia',Number(e.target.value))}
                                  style={{width:'90px',padding:'2px 4px',border:'1px solid #E5E7EB',borderRadius:'4px',fontSize:'12px',textAlign:'right'}}/>đ
                              </label>
                            </>
                          ) : (
                            <>
                              <span>SL: <strong style={{color:'#1F2937'}}>{sp.soLuong}</strong></span>
                              <span>Giá: <strong style={{color:'#1F2937'}}>{fVND(sp.donGia)}</strong></span>
                            </>
                          )}
                          <span>T.Tiền: <strong style={{color:'var(--success)'}}>{fVND(sp.soLuong*sp.donGia)}</strong></span>
                        </div>
                        {sp.ghiChu && <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'3px',fontStyle:'italic'}}>{sp.ghiChu}</div>}
                      </div>

                      {/* Nút hủy + checkbox */}
                      {dangSua && !sp.da_huy && !spDaSoatSet.has(sp.tenSP||sp.maSP) && (
                        <div style={{display:'flex',alignItems:'center',gap:'6px',flexShrink:0}}>
                          <input type="checkbox"
                            checked={spChonHuy.has(sp.id)}
                            onChange={e=>{
                              const s=new Set(spChonHuy)
                              e.target.checked ? s.add(sp.id) : s.delete(sp.id)
                              setSpChonHuy(s)
                            }}
                            style={{width:'14px',height:'14px',accentColor:'#DC2626'}}/>
                          <button onClick={()=>batDauHuy(sp.id)} title="Hủy sản phẩm này"
                            style={{padding:'3px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontWeight:600,fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap'}}>
                            🗑️ Hủy
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Nút thêm SP */}
                {dangSua && (
                  <div style={{marginTop:'4px',position:'relative'}}>
                    <button onClick={()=>setShowTimSP(v=>!v)}
                      style={{width:'100%',padding:'8px',borderRadius:'7px',border:'2px dashed var(--primary)',background:'white',color:'var(--primary)',fontWeight:600,fontSize:'13px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:'6px'}}>
                      ➕ Thêm sản phẩm
                    </button>
                    {showTimSP && (
                      <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,zIndex:60,background:'white',border:'1px solid var(--border)',borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,.12)'}}>
                        <div style={{padding:'8px'}}>
                          <input className="input" placeholder="Gõ tên sản phẩm..." value={searchSP}
                            onChange={e=>setSearchSP(e.target.value)} autoFocus style={{width:'100%',fontSize:'12px'}}/>
                        </div>
                        <div style={{maxHeight:'200px',overflowY:'auto'}}>
                          {searchSP.trim() && (
                            <div className="di" onClick={themSPThuCong}
                              style={{background:'#FEF9C3',color:'#92400E',fontSize:'12px'}}>
                              ✏️ Thêm: <strong>"{searchSP}"</strong> (nhập tay)
                            </div>
                          )}
                          {spLoc.length===0
                            ?<div style={{padding:'12px',fontSize:'12px',color:'#6B7280',textAlign:'center'}}>Không tìm thấy</div>
                            :spLoc.map((sp:any)=>(
                              <div key={sp['Mã SP']} className="di" onClick={()=>themSP(sp)}>
                                <div style={{fontWeight:600}}>{sp['Tên sản phẩm']}</div>
                                <div style={{fontSize:'11px',color:'#6B7280'}}>{sp['Mã SP']} · {fVND(sp['Giá bán lẻ'])} · Kho:{sp['Tồn kho']||0}</div>
                              </div>
                            ))
                          }
                        </div>
                        <div style={{padding:'6px',borderTop:'1px solid #F0F0F0'}}>
                          <button onClick={()=>setShowTimSP(false)} style={{width:'100%',padding:'5px',borderRadius:'5px',border:'none',background:'#F3F4F6',cursor:'pointer',fontSize:'12px'}}>Đóng</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Tổng */}
                <div style={{background:'var(--primary-pale)',borderRadius:'8px',padding:'12px',display:'flex',justifyContent:'space-between',fontWeight:800,fontSize:'15px',marginTop:'4px'}}>
                  <span style={{color:'var(--primary)'}}>Tổng cộng:</span>
                  <span>{fVND(tongTienHienTai)}</span>
                </div>

                {/* ✅ Nút Lưu/Thoát thứ 2 — ngay dưới Tổng cộng */}
                {dangSua && (
                  <div style={{display:'flex',flexDirection:'column',gap:'8px',marginTop:'4px'}}>
                    <button onClick={luuSua} disabled={loading}
                      style={{width:'100%',padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
                      {loading?'⏳ Đang lưu...':'💾 Lưu chỉnh sửa'}
                    </button>
                    <button onClick={()=>setDangSua(false)} disabled={loading}
                      style={{width:'100%',padding:'9px',borderRadius:'8px',border:'2px solid #E5E7EB',background:'white',fontWeight:600,fontSize:'13px',cursor:loading?'not-allowed':'pointer',color:'#6B7280'}}>
                      ✕ Thoát sửa (không lưu)
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
            <Link href={`/dashboard/don-hang/${maDon}/in`} className="btn btn-primary btn-lg" style={{textAlign:'center',justifyContent:'center'}}>🖨️ In hoá đơn</Link>
            <Link href="/dashboard/don-hang" className="btn btn-ghost" style={{textAlign:'center',justifyContent:'center'}}>← Về danh sách đơn hàng</Link>
          </div>
        </div>
      </div>

      {/* ── Confirm hủy 1 SP ── */}
      {confirmHuy && (
        <div className="overlay" onClick={()=>setConfirmHuy(null)}>
          <div className="confirm-box" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'10px'}}>🗑️</div>
            <h3 style={{fontWeight:700,fontSize:'16px',margin:'0 0 8px'}}>Xác nhận hủy sản phẩm</h3>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}>
              <strong>{spList.find(s=>s.id===confirmHuy)?.tenSP}</strong>
            </p>
            <p style={{fontSize:'12px',color:'#DC2626',margin:'0 0 16px',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>
              SP sẽ được đánh dấu hủy và trả về kho. Không thể hoàn tác sau khi lưu!
            </p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>xacNhanHuy(confirmHuy!)}
                style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:'#DC2626',color:'white',fontWeight:700,cursor:'pointer'}}>
                Xác nhận hủy
              </button>
              <button onClick={()=>setConfirmHuy(null)}
                style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>
                Không hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL SỬA ĐƠN HÀNG ── */}
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

      {/* ── Modal hủy đơn ── */}
      {showHuyDon&&(
        <div className="overlay" onClick={()=>setShowHuyDon(false)}>
          <div className="confirm-box" style={{maxWidth:'420px',textAlign:'left'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'32px',textAlign:'center',marginBottom:'8px'}}>🚫</div>
            <h3 style={{fontWeight:700,fontSize:'16px',textAlign:'center',margin:'0 0 4px'}}>Hủy đơn hàng</h3>
            <p style={{fontSize:'13px',color:'#6B7280',textAlign:'center',margin:'0 0 16px'}}>
              <strong style={{color:'var(--primary)'}}>{maDon}</strong>
            </p>
            <div style={{background:'#F8FAFC',borderRadius:'8px',padding:'12px',marginBottom:'12px',fontSize:'13px'}}>
              {Number(donHang['Đặt cọc']||0)>0&&(
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{color:'#6B7280'}}>Đặt cọc/Trả trước:</span>
                  <span style={{fontWeight:600,color:'#16A34A'}}>{Number(donHang['Đặt cọc']||0).toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              {(tongDaThu||0)>0&&(
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{color:'#6B7280'}}>Thu qua giao hàng:</span>
                  <span style={{fontWeight:600,color:'#16A34A'}}>{Number(tongDaThu||0).toLocaleString('vi-VN')}đ</span>
                </div>
              )}
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px',borderTop:'1px solid #E5E7EB',paddingTop:'6px'}}>
                <span style={{color:'#6B7280',fontWeight:600}}>Tổng đã thu từ KH:</span>
                <span style={{fontWeight:700,color:'#16A34A'}}>{(Number(tongDaThu||0)+Number(donHang['Đặt cọc']||0)).toLocaleString('vi-VN')}đ</span>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'6px'}}>
                <span style={{color:'#6B7280'}}>CP trả hàng (KH chịu):</span>
                <input inputMode="numeric" value={cpTraHang>0?cpTraHang.toLocaleString('vi-VN'):''} placeholder="0"
                  onChange={e=>{const v=Number(e.target.value.replace(/\./g,'').replace(/[^0-9]/g,''));setCpTraHang(v||0)}}
                  style={{width:'130px',padding:'4px 8px',border:'1px solid #FCD34D',borderRadius:'4px',fontSize:'13px',textAlign:'right'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',borderTop:'1px solid #E5E7EB',paddingTop:'6px',fontWeight:700}}>
                <span>Tiền hoàn trả KH:</span>
                <span style={{color:'#DC2626',fontSize:'15px'}}>{Math.max(0,(Number(tongDaThu||0)+Number(donHang['Đặt cọc']||0))-cpTraHang).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
            <div style={{background:'#EFF6FF',borderRadius:'6px',padding:'8px 12px',marginBottom:'12px',fontSize:'12px',color:'#1E40AF'}}>
              💡 CP giao hàng NV/đối tác giữ nguyên — công sức đã phát sinh.
            </div>
            {Math.max(0,(Number(tongDaThu||0)+Number(donHang['Đặt cọc']||0))-cpTraHang)>0&&(
              <div style={{marginBottom:'12px'}}>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'6px'}}>Hình thức hoàn tiền cho KH</label>
                <div style={{display:'flex',gap:'8px'}}>
                  {(['Tiền mặt','Chuyển khoản'] as const).map(ht=>(
                    <button key={ht} onClick={()=>setHinhThucHoanDon(ht)}
                      style={{flex:1,padding:'8px',borderRadius:'8px',border:'2px solid',
                        borderColor:hinhThucHoanDon===ht?'#16A34A':'#E5E7EB',
                        background:hinhThucHoanDon===ht?'#F0FDF4':'white',
                        color:hinhThucHoanDon===ht?'#16A34A':'#6B7280',
                        fontWeight:hinhThucHoanDon===ht?700:400,fontSize:'13px',cursor:'pointer'}}>
                      {ht==='Tiền mặt'?'💵':'🏦'} {ht}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={{marginBottom:'12px'}}>
              <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>
                Lý do hủy <span style={{color:'#DC2626'}}> *</span>
              </label>
              <input className="input" placeholder="VD: Khách đổi ý, hàng bị lỗi..." value={lyDoHuy}
                onChange={e=>setLyDoHuy(e.target.value)} style={{fontSize:'13px'}}/>
            </div>
            <div style={{background:'#FEF2F2',borderRadius:'6px',padding:'8px 12px',marginBottom:'14px',fontSize:'12px',color:'#DC2626',fontWeight:600}}>
              ⚠️ Đơn hàng vẫn lưu trên hệ thống — không bị xóa.
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanHuyDon} disabled={dangHuyDon}
                style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:dangHuyDon?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer',fontSize:'14px'}}>
                {dangHuyDon?'Đang hủy...':'🚫 Xác nhận hủy đơn'}
              </button>
              <button onClick={()=>setShowHuyDon(false)}
                style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>
                Không hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm hủy tất cả đã chọn ── */}
      {confirmHuyTatCa && (
        <div className="overlay" onClick={()=>setConfirmHuyTatCa(false)}>
          <div className="confirm-box" onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'36px',marginBottom:'10px'}}>🗑️</div>
            <h3 style={{fontWeight:700,fontSize:'16px',margin:'0 0 8px'}}>Hủy {spChonHuy.size} sản phẩm?</h3>
            <p style={{fontSize:'12px',color:'#DC2626',margin:'0 0 16px',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>
              Tất cả SP đã chọn sẽ được đánh dấu hủy!
            </p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanHuyTatCa}
                style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:'#DC2626',color:'white',fontWeight:700,cursor:'pointer'}}>
                Xác nhận hủy {spChonHuy.size} SP
              </button>
              <button onClick={()=>setConfirmHuyTatCa(false)}
                style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>
                Không hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

