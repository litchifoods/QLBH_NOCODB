'use client'
// components/ChiTietDonHangClient.tsx — v2.0
// Thêm: chế độ xem/sửa, thêm/hủy SP, lịch sử sửa đơn

import { useState, useMemo } from 'react'
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
  'Chờ giao':   {bg:'#FEF3C7',color:'#92400E'},
  'Đang giao':  {bg:'#DBEAFE',color:'#1E40AF'},
  'Hoàn thành': {bg:'#D1FAE5',color:'#065F46'},
  'Huỷ':        {bg:'#FEE2E2',color:'#991B1B'},
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
}

export default function ChiTietDonHangClient({
  donHang, chiTiet, khachHang, giaoHang, danhSachSP, user,
}: {
  donHang: any
  chiTiet: any[]
  khachHang: any
  giaoHang: any[]
  danhSachSP: any[]   // danh sách SP từ bảng 2_Sản phẩm để thêm mới
  user: UserSession
}) {
  const router = useRouter()
  const maDon  = donHang['Mã đơn hàng']

  const [trangThai, setTrangThai] = useState(donHang['Trạng thái']||'Chờ giao')
  const [loading,   setLoading]   = useState(false)
  const [msg,       setMsg]       = useState('')
  const [msgOk,     setMsgOk]     = useState(true)

  // Chế độ sửa
  const [dangSua, setDangSua] = useState(false)

  // Sửa thông tin giao hàng
  const [htGiao,      setHtGiao]      = useState(donHang['Hình thức giao hàng']||'Giao hàng cho khách')
  const [ngayHenGiao, setNgayHenGiao] = useState(donHang['Ngày hẹn giao']
    ? new Date(donHang['Ngày hẹn giao']).toISOString().slice(0,16) : '')

  // Sửa thanh toán
  const [datCocEdit,  setDatCocEdit]  = useState(Number(donHang['Đặt cọc']||0))
  const [cpDoiTra,    setCpDoiTra]    = useState(0)

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
        _da_sua:    false,
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
      da_huy:false, la_moi:true, _da_sua:false,
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
        // Đánh dấu đã sửa để highlight + hiện trong thông báo
        if (!sp.la_moi) u._da_sua = true
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
              'Ghi chú SP': (sp.ghiChu?sp.ghiChu+' | ':'')+`[Huỷ: ${user.hoTen||user.tenDangNhap} ${new Date().toLocaleDateString('vi-VN')}]`,
            }),
          })
        }
      }

      // 1b. Cập nhật SP đã sửa SL/giá (không phải hủy, không phải mới)
      const spSuaGia = spList.filter(sp => sp._da_sua && !sp.da_huy && !sp.la_moi)
      for (const sp of spSuaGia) {
        if (sp.id && !sp.id.startsWith('new-')) {
          await fetch('/api/chi-tiet-don', {
            method:'PATCH',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({
              id: sp.id,
              'Số lượng':   sp.soLuong,
              'Đơn giá':    sp.donGia,
              'Thành tiền': sp.soLuong * sp.donGia,
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

      const cpDoiTraFinal = cpDoiTra || 0
      const conPhaiThuFinal = Math.max(0, ttMoi + cpDoiTraFinal - datCocEdit)

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

  const spHienThi = spList // hiển thị tất cả kể cả đã hủy
  const soSPHuy  = spList.filter(sp=>sp.da_huy && !sp.la_moi).length
  const soSPMoi  = spList.filter(sp=>sp.la_moi && !sp.da_huy).length
  const soSPSua  = spList.filter(sp=>sp._da_sua && !sp.da_huy && !sp.la_moi).length
  const coBatKyHuy = spList.some(sp=>sp.da_huy)

  return (
    <div style={{padding:'24px 32px',maxWidth:'1000px'}}>
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
            <span style={{padding:'4px 12px',borderRadius:'20px',fontSize:'12px',fontWeight:700,background:tt.bg,color:tt.color}}>{trangThai}</span>
            {soSPHuy>0 && <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',background:'#FEE2E2',color:'#991B1B',fontWeight:600}}>🚫 Đã hủy {soSPHuy} SP</span>}
            {soSPMoi>0 && <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',background:'#D1FAE5',color:'#065F46',fontWeight:600}}>➕ Thêm {soSPMoi} SP mới</span>}
            {soSPSua>0 && <span style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',background:'#DBEAFE',color:'#1E40AF',fontWeight:600}}>✏️ Sửa {soSPSua} SP</span>}
          </div>
          <p style={{color:'var(--text-secondary)',fontSize:'13px'}}>
            Ngày đặt: {fDate(donHang['Ngày bán']||donHang['Ngày đặt'])} &nbsp;·&nbsp;
            NV: {donHang['Nhân viên bán']||'—'} &nbsp;·&nbsp;
            Kênh: {donHang['Kênh bán']||'—'}
          </p>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          {!dangSua && (
            <button onClick={()=>setDangSua(true)}
              style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#F59E0B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              ✏️ Sửa đơn hàng
            </button>
          )}
          {dangSua && (
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

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>

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
                  {giaoHang.map((g:any,i:number)=>(
                    <div key={i} style={{background:'#F8FAFC',borderRadius:'6px',padding:'8px 10px',marginBottom:'6px',fontSize:'12px'}}>
                      <div style={{fontWeight:600}}>{g['Tên NV/đối tác']||'—'}</div>
                      <div style={{color:'var(--text-secondary)'}}>{fDT(g['Ngày giao'])} · {g['Tình trạng đối soát']||'Chưa đối soát'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Thanh toán */}
          <div className="card" style={{padding:'20px'}}>
            <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--primary)',marginBottom:'12px'}}>💰 Thanh toán</h3>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                <span style={{color:'var(--text-secondary)'}}>Tổng tiền hàng:</span>
                <span style={{fontWeight:700}}>{fVND(tongTienHienTai)}</span>
              </div>
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
              <div style={{display:'flex',justifyContent:'space-between',fontSize:'15px',fontWeight:800,borderTop:'1px solid var(--border)',paddingTop:'8px',marginTop:'4px'}}>
                <span>Còn phải thu:</span>
                <span style={{color:conLai>0?'#DC2626':'#16A34A'}}>{fVND(Math.max(0,conLai))}</span>
              </div>
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

          {/* Trạng thái đơn — chỉ xem, không cho sửa */}
          <div className="card" style={{padding:'16px 20px'}}>
            <h3 style={{fontSize:'13px',fontWeight:700,color:'var(--primary)',marginBottom:'10px'}}>📌 Trạng thái đơn hàng</h3>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
              {['Chờ giao','Đang giao','Hoàn thành','Huỷ'].map(t=>{
                const c=TT_COLOR[t]; const isA=trangThai===t
                return (
                  <div key={t} style={{padding:'10px',borderRadius:'8px',border:'2px solid',borderColor:isA?c.color:'#F0F0F0',background:isA?c.bg:'#FAFAFA',color:isA?c.color:'#C0C0C0',fontWeight:isA?700:400,fontSize:'13px',textAlign:'center'}}>
                    {isA && '● '}{t}
                  </div>
                )
              })}
            </div>
            <p style={{fontSize:'11px',color:'#9CA3AF',margin:'8px 0 0',fontStyle:'italic'}}>Trạng thái tự động cập nhật theo quá trình xử lý đơn</p>
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
                        {dangSua && !sp.da_huy ? (
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
                      {dangSua && !sp.da_huy && (
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
