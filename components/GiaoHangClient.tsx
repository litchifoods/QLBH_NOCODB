'use client'
// components/GiaoHangClient.tsx -- v3.0
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function fVND(n: any) { return Number(n || 0).toLocaleString('vi-VN') + 'đ' }
function fDT(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function boDau(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

interface Nguoi {
  id: string
  hinhThuc: 'NV cửa hàng' | 'Đối tác'
  maNV: string
  tenNV: string
  vaiTro: string
  chiPhiVC: number
  chiPhiLap: number
  thuongChuyen: number
  ghiChu: string
  showSearch: boolean
  searchText: string
}

interface SPGiao {
  maChiTiet: string
  tenSP: string
  soLuongDon: number
  daGiao: number
  soLuongGiao: number
  checked: boolean
  ghiChu: string
}

const VAI_TRO_LIST = ['Vận chuyển+Lắp', 'Vận chuyển', 'Lắp đặt']
const NGUOI_MO_DAU: Nguoi = {
  id: '1', hinhThuc: 'NV cửa hàng', maNV: '', tenNV: '',
  vaiTro: 'Vận chuyển+Lắp', chiPhiVC: 0, chiPhiLap: 0, thuongChuyen: 0,
  ghiChu: '', showSearch: false, searchText: '',
}

export default function GiaoHangClient({
  giaoHangList, chuyenMap, chiTietDonMap, daGiaoMap,
  donChuaGiao, donHangMap, nhanVien, khachHangMap, user,
}: {
  giaoHangList: any[]
  chuyenMap: Record<string, any[]>
  chiTietDonMap: Record<string, any[]>
  daGiaoMap: Record<string, Record<string, number>>
  donChuaGiao: any[]
  donHangMap: Record<string, any>
  nhanVien: any[]
  khachHangMap: Record<string, any>
  user: UserSession
}) {
  const router = useRouter()
  const [filterTT, setFilterTT] = useState('Tất cả')
  const [showForm, setShowForm] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)

  // ── Form state ────────────────────────────────────────
  const [searchDon,      setSearchDon]      = useState('')
  const [donChon,        setDonChon]        = useState<any>(null)
  const [showDon,        setShowDon]        = useState(false)
  const [ngayGiao,       setNgayGiao]       = useState(new Date().toISOString().slice(0, 16))
  const [ghiChuChuyen,   setGhiChuChuyen]   = useState('')
  const [danhSachNguoi,  setDanhSachNguoi]  = useState<Nguoi[]>([{ ...NGUOI_MO_DAU }])
  const [danhSachSP,     setDanhSachSP]     = useState<SPGiao[]>([])

  // ── Helpers ───────────────────────────────────────────
  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }
  function getDiaChi(don: any) {
    if (!don) return '—'
    return don['Địa chỉ giao'] || khachHangMap[don['Mã KH']]?.['Địa chỉ'] || '—'
  }

  // ── Lọc bảng chính ────────────────────────────────────
  const ghHopLe = useMemo(() =>
    giaoHangList.filter(g => g['Mã đơn hàng']?.toString().trim())
  , [giaoHangList])

  const filtered = useMemo(() => {
    if (filterTT === 'Tất cả') return ghHopLe
    if (filterTT === 'Chưa đối soát') return ghHopLe.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát')
    return ghHopLe.filter(g => g['Tình trạng đối soát'] === 'Đã đối soát')
  }, [ghHopLe, filterTT])

  const chuaDS = ghHopLe.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát').length

  // ── Chọn đơn hàng ─────────────────────────────────────
  const donLoc = useMemo(() => {
    if (!searchDon.trim()) return donChuaGiao.slice(0, 10)
    const q = boDau(searchDon)
    return donChuaGiao.filter(d =>
      boDau(d['Mã đơn hàng'] || '').includes(q) ||
      boDau(getTenKH(d['Mã KH'], d['Tên khách hàng'])).includes(q)
    ).slice(0, 10)
  }, [searchDon, donChuaGiao])

  function chonDon(don: any) {
    setDonChon(don)
    setSearchDon(don['Mã đơn hàng'])
    setShowDon(false)

    // Load danh sách SP từ chi tiết đơn, tính còn lại chưa giao
    const chiTiet = chiTietDonMap[don['Mã đơn hàng']] || []
    const daGiao  = daGiaoMap[don['Mã đơn hàng']] || {}

    const spList: SPGiao[] = chiTiet
      .filter((ct: any) => ct['Tên SP (ghi nhanh)'] || ct['Mã SP'])
      .map((ct: any) => {
        const key      = ct['Mã chi tiết'] || ct['Tên SP (ghi nhanh)'] || ct['Mã SP']
        const soLuong  = Number(ct['Số lượng'] || 1)
        const daDuocGiao = daGiao[key] || 0
        const conLai   = Math.max(0, soLuong - daDuocGiao)
        return {
          maChiTiet:    ct['Mã chi tiết'] || '',
          tenSP:        ct['Tên SP (ghi nhanh)'] || ct['Mã SP'] || '—',
          soLuongDon:   soLuong,
          daGiao:       daDuocGiao,
          soLuongGiao:  conLai,
          checked:      conLai > 0,
          ghiChu:       '',
        }
      })
    setDanhSachSP(spList)
  }

  // ── Quản lý người giao ────────────────────────────────
  function themNguoi() {
    setDanhSachNguoi(prev => [...prev, {
      id: Date.now().toString(), hinhThuc: 'NV cửa hàng', maNV: '', tenNV: '',
      vaiTro: 'Vận chuyển', chiPhiVC: 0, chiPhiLap: 0, thuongChuyen: 0,
      ghiChu: '', showSearch: false, searchText: '',
    }])
  }
  function xoaNguoi(id: string) {
    setDanhSachNguoi(prev => prev.filter(n => n.id !== id))
  }
  function updN(id: string, k: keyof Nguoi, v: any) {
    setDanhSachNguoi(prev => prev.map(n => n.id === id ? { ...n, [k]: v } : n))
  }
  function chonNV(nguoiId: string, nv: any) {
    setDanhSachNguoi(prev => prev.map(n => n.id === nguoiId ? {
      ...n, maNV: nv['Mã NV'] || '', tenNV: nv['Họ tên'] || '',
      searchText: nv['Họ tên'] || '', showSearch: false,
    } : n))
  }
  function getNVLoc(text: string) {
    if (!text.trim()) return nhanVien.slice(0, 8)
    const q = boDau(text)
    return nhanVien.filter((nv: any) =>
      boDau(nv['Họ tên'] || '').includes(q) || boDau(nv['Mã NV'] || '').includes(q)
    ).slice(0, 8)
  }

  // ── Quản lý SP giao ───────────────────────────────────
  function updSP(idx: number, k: keyof SPGiao, v: any) {
    setDanhSachSP(prev => prev.map((sp, i) => i === idx ? { ...sp, [k]: v } : sp))
  }

  // ── Reset form ────────────────────────────────────────
  function resetForm() {
    setSearchDon(''); setDonChon(null); setGhiChuChuyen('')
    setNgayGiao(new Date().toISOString().slice(0, 16))
    setDanhSachNguoi([{ ...NGUOI_MO_DAU }])
    setDanhSachSP([])
  }

  // ── Lưu chuyến ────────────────────────────────────────
  async function luuChuyen() {
    if (!donChon) { setMsg('Vui lòng chọn đơn hàng'); setMsgOk(false); return }
    const nguoiHopLe = danhSachNguoi.filter(n => n.tenNV.trim())
    if (nguoiHopLe.length === 0) { setMsg('Vui lòng nhập ít nhất 1 người giao'); setMsgOk(false); return }
    const spGiao = danhSachSP.filter(sp => sp.checked && sp.soLuongGiao > 0)

    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/giao-hang', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maDon:        donChon['Mã đơn hàng'],
          ngayGiao,
          ghiChuChuyen,
          danhSachNguoi: nguoiHopLe.map(n => ({
            hinhThuc: n.hinhThuc, maNV: n.maNV, tenNV: n.tenNV,
            vaiTro: n.vaiTro, chiPhiVC: n.chiPhiVC, chiPhiLap: n.chiPhiLap,
            thuongChuyen: n.thuongChuyen, ghiChu: n.ghiChu,
          })),
          danhSachSP: spGiao.map(sp => ({
            maChiTiet:   sp.maChiTiet,
            tenSP:       sp.tenSP,
            soLuongGiao: sp.soLuongGiao,
            ghiChu:      sp.ghiChu,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || 'Lỗi')
      setMsg(`✅ Đã tạo chuyến ${data.maChuyen} — ${data.soNguoi} người, ${data.soSP} sản phẩm`)
      setMsgOk(true); resetForm(); setShowForm(false); router.refresh()
    } catch (err: any) {
      setMsg('❌ ' + (err.message || 'Lỗi')); setMsgOk(false)
    } finally {
      setLoading(false); setTimeout(() => setMsg(''), 6000)
    }
  }

  const tongChiPhi = danhSachNguoi.reduce((s, n) => s + n.chiPhiVC + n.chiPhiLap + n.thuongChuyen, 0)
  const spDaChon   = danhSachSP.filter(sp => sp.checked).length

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        .gh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-tao{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
        .btn-tao:hover{opacity:.9;}
        .gh-t th,.gh-t td{padding:8px 10px;}
        .gh-t tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;}
        .modal-v3{background:white;border-radius:12px;padding:24px;width:100%;max-width:700px;margin:auto;}
        .db{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:210px;overflow-y:auto;}
        .di{padding:8px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;} .di:last-child{border-bottom:none;}
        .nc{border:1px solid var(--border);border-radius:10px;padding:12px;background:#FAFBFD;margin-bottom:8px;}
        .sp-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;border:1px solid #E5E7EB;margin-bottom:5px;background:white;font-size:13px;}
        .section-title{font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.05em;margin:0 0 8px;}
        @media(max-width:900px){.col-dia,.col-cp{display:none;}}
        @media(max-width:650px){.col-nguoi,.col-vt{display:none;}}
      `}</style>

      {/* Header */}
      <div className="gh-hdr">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>🚚 Giao hàng</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 0' }}>
            {ghHopLe.length} chuyến
            {chuaDS > 0 && <span style={{ marginLeft:'8px', color:'#DC2626', fontWeight:600 }}>⚠️ {chuaDS} chưa đối soát</span>}
          </p>
        </div>
        <button className="btn-tao" onClick={() => setShowForm(true)}>🚚 Tạo chuyến giao</button>
      </div>

      {msg && <div style={{ padding:'10px 14px', borderRadius:'8px', marginBottom:'14px', fontSize:'13px', background:msgOk?'#D1FAE5':'#FEE2E2', color:msgOk?'#065F46':'#991B1B' }}>{msg}</div>}

      {/* Filter */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
          {['Tất cả','Chưa đối soát','Đã đối soát'].map(tt => (
            <button key={tt} onClick={() => setFilterTT(tt)} style={{
              padding:'5px 14px', borderRadius:'20px', border:'1px solid',
              borderColor: filterTT===tt?'var(--primary)':'var(--border)',
              background: filterTT===tt?'var(--primary-pale)':'white',
              color: filterTT===tt?'var(--primary)':'var(--text-secondary)',
              fontWeight: filterTT===tt?700:400, fontSize:'12px', cursor:'pointer',
            }}>{tt}</button>
          ))}
          <span style={{ marginLeft:'auto', fontSize:'12px', color:'var(--text-secondary)' }}>{filtered.length} chuyến</span>
        </div>
      </div>

      {/* Bảng */}
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          <table className="gh-t" style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F0F4FF', borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã đơn</th>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày giao</th>
                <th style={{ textAlign:'left', fontWeight:700 }}>Khách hàng</th>
                <th className="col-dia" style={{ textAlign:'left', fontWeight:700 }}>Địa chỉ</th>
                <th className="col-nguoi" style={{ textAlign:'left', fontWeight:700 }}>Người giao</th>
                <th className="col-vt" style={{ textAlign:'left', fontWeight:700 }}>Vai trò</th>
                <th className="col-cp" style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>CP/Thưởng</th>
                <th style={{ textAlign:'center', fontWeight:700 }}>Đối soát</th>
                <th style={{ width:'48px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>Chưa có chuyến giao nào</td></tr>
              ) : filtered.map((g: any, i: number) => {
                const maDon  = g['Mã đơn hàng'] || ''
                const don    = donHangMap[maDon]
                const maKH   = don?.['Mã KH'] || g['Mã KH'] || ''
                const tenKH  = getTenKH(maKH, don?.['Tên khách hàng'])
                const diaChi = don?.['Địa chỉ giao'] || khachHangMap[maKH]?.['Địa chỉ'] || '—'
                const chuaDS = g['Tình trạng đối soát'] !== 'Đã đối soát'
                const laDT   = g['Hình thức giao'] === 'Đối tác'
                const chiPhi = Number(g['Chi phí VC']||0) + Number(g['Chi phí lắp đặt']||0) + Number(g['Thưởng chuyến']||0)
                return (
                  <tr key={i} style={{ borderBottom:'1px solid #F0F0F0', background:i%2===0?'white':'#FAFBFD' }}>
                    <td>
                      <Link href={`/dashboard/don-hang/${maDon}`}
                        style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                        {maDon}
                      </Link>
                    </td>
                    <td style={{ fontSize:'12px', color:'var(--text-secondary)', whiteSpace:'nowrap' }}>{fDT(g['Ngày giao'])}</td>
                    <td>
                      <div style={{ fontWeight:600 }}>{tenKH}</div>
                      {maKH && <div style={{ fontSize:'11px', color:'var(--text-muted)' }}>{maKH}</div>}
                    </td>
                    <td className="col-dia" style={{ fontSize:'12px', color:'var(--text-secondary)', maxWidth:'150px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{diaChi}</td>
                    <td className="col-nguoi">
                      <div style={{ fontWeight:600 }}>{g['Tên NV/đối tác'] || '—'}</div>
                      {laDT && <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'10px', background:'#FEF3C7', color:'#92400E', fontWeight:700 }}>Đối tác</span>}
                    </td>
                    <td className="col-vt" style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{g['Vai trò chuyến'] || '—'}</td>
                    <td className="col-cp" style={{ textAlign:'right' }}>
                      {chiPhi > 0 ? <span style={{ fontWeight:600, color:laDT?'#DC2626':'#065F46' }}>{fVND(chiPhi)}</span> : '—'}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                        background:chuaDS?'#FEF3C7':'#D1FAE5', color:chuaDS?'#92400E':'#065F46', whiteSpace:'nowrap' }}>
                        {chuaDS ? '⏳ Chưa' : '✅ Đã xong'}
                      </span>
                    </td>
                    <td>
                      <Link href={`/dashboard/doi-soat?maGH=${g['Mã giao hàng']}`}
                        className="btn btn-ghost btn-sm" style={{ padding:'4px 8px', fontSize:'14px' }}>💰</Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL TẠO CHUYẾN ── */}
      {showForm && (
        <div className="overlay" onClick={() => { setShowForm(false); resetForm() }}>
          <div className="modal-v3" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'17px', fontWeight:700, margin:0 }}>🚚 Tạo chuyến giao hàng</h2>
              <button onClick={() => { setShowForm(false); resetForm() }}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'22px', color:'#6B7280' }}>✕</button>
            </div>

            {/* BƯỚC 1: Chọn đơn + ngày */}
            <div style={{ marginBottom:'16px', padding:'14px', background:'#F8FAFC', borderRadius:'10px', border:'1px solid #E5E7EB' }}>
              <div className="section-title">① Chọn đơn hàng</div>
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:'12px' }}>
                <div>
                  <div style={{ position:'relative' }}>
                    <input className="input" placeholder="Gõ mã đơn hoặc tên khách hàng..."
                      value={searchDon}
                      onChange={e => { setSearchDon(e.target.value); setDonChon(null); setDanhSachSP([]); setShowDon(true) }}
                      onFocus={() => setShowDon(true)}
                      onBlur={() => setTimeout(() => setShowDon(false), 200)} />
                    {showDon && (
                      <div className="db">
                        {donLoc.length === 0
                          ? <div style={{ padding:'12px', fontSize:'12px', color:'#6B7280', textAlign:'center' }}>Không có đơn cần giao</div>
                          : donLoc.map((don: any) => (
                            <div key={don['Mã đơn hàng']} className="di" onClick={() => chonDon(don)}>
                              <div style={{ fontWeight:700, color:'var(--primary)' }}>{don['Mã đơn hàng']}</div>
                              <div style={{ fontSize:'12px' }}>{getTenKH(don['Mã KH'], don['Tên khách hàng'])} · {getDiaChi(don)}</div>
                              <div style={{ fontSize:'11px', color:'#DC2626' }}>Còn thu: {fVND(don['Còn phải thu'])} · {don['Trạng thái']}</div>
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                  {donChon && (
                    <div style={{ marginTop:'6px', background:'var(--primary-pale)', borderRadius:'6px', padding:'8px 12px', fontSize:'12px' }}>
                      <div style={{ fontWeight:700, color:'var(--primary)' }}>✅ {donChon['Mã đơn hàng']}</div>
                      <div>{getTenKH(donChon['Mã KH'], donChon['Tên khách hàng'])} · {getDiaChi(donChon)}</div>
                      <div style={{ color:'#DC2626', fontWeight:600 }}>Còn thu: {fVND(donChon['Còn phải thu'])}</div>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Ngày giờ giao</label>
                  <input className="input" type="datetime-local" value={ngayGiao} onChange={e => setNgayGiao(e.target.value)} />
                  <div style={{ marginTop:'8px' }}>
                    <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Ghi chú chuyến</label>
                    <input className="input" placeholder="Ghi chú thêm..." value={ghiChuChuyen}
                      onChange={e => setGhiChuChuyen(e.target.value)} style={{ fontSize:'12px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* BƯỚC 2: Chọn sản phẩm giao */}
            {danhSachSP.length > 0 && (
              <div style={{ marginBottom:'16px', padding:'14px', background:'#F8FAFC', borderRadius:'10px', border:'1px solid #E5E7EB' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                  <div className="section-title" style={{ margin:0 }}>② Chọn sản phẩm giao lần này</div>
                  <span style={{ fontSize:'12px', color:'var(--primary)', fontWeight:600 }}>
                    {spDaChon}/{danhSachSP.length} SP được chọn
                  </span>
                </div>

                {danhSachSP.map((sp, idx) => {
                  const hetHang = sp.soLuongDon <= sp.daGiao
                  return (
                    <div key={idx} className="sp-row" style={{ opacity: hetHang ? 0.5 : 1 }}>
                      <input type="checkbox" checked={sp.checked && !hetHang}
                        disabled={hetHang}
                        onChange={e => updSP(idx, 'checked', e.target.checked)}
                        style={{ width:'16px', height:'16px', flexShrink:0, accentColor:'var(--primary)' }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight: sp.checked?600:400, color: sp.checked?'#1F2937':'#6B7280', fontSize:'13px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {sp.tenSP}
                        </div>
                        <div style={{ fontSize:'11px', color:'#6B7280' }}>
                          Đơn: {sp.soLuongDon} · Đã giao: {sp.daGiao} · Còn lại: {sp.soLuongDon - sp.daGiao}
                          {hetHang && <span style={{ marginLeft:'6px', color:'#16A34A', fontWeight:600 }}>✅ Đã giao đủ</span>}
                        </div>
                      </div>
                      {sp.checked && !hetHang && (
                        <div style={{ display:'flex', alignItems:'center', gap:'6px', flexShrink:0 }}>
                          <label style={{ fontSize:'11px', color:'#6B7280', whiteSpace:'nowrap' }}>Giao:</label>
                          <input type="number" min="1" max={sp.soLuongDon - sp.daGiao}
                            value={sp.soLuongGiao}
                            onChange={e => updSP(idx, 'soLuongGiao', Math.min(Number(e.target.value), sp.soLuongDon - sp.daGiao))}
                            style={{ width:'56px', padding:'4px 6px', border:'1px solid var(--border)', borderRadius:'5px', fontSize:'12px', textAlign:'center' }} />
                        </div>
                      )}
                    </div>
                  )
                })}

                {danhSachSP.every(sp => sp.daGiao >= sp.soLuongDon) && (
                  <div style={{ padding:'10px', textAlign:'center', fontSize:'13px', color:'#16A34A', fontWeight:600, background:'#F0FDF4', borderRadius:'8px' }}>
                    ✅ Tất cả sản phẩm đã được giao đủ!
                  </div>
                )}
              </div>
            )}

            {/* BƯỚC 3: Người tham gia */}
            <div style={{ marginBottom:'16px', padding:'14px', background:'#F8FAFC', borderRadius:'10px', border:'1px solid #E5E7EB' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <div className="section-title" style={{ margin:0 }}>③ Người vận chuyển / lắp đặt</div>
                <button onClick={themNguoi} style={{ padding:'5px 12px', borderRadius:'6px', border:'1px solid var(--primary)', color:'var(--primary)', background:'white', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                  + Thêm người
                </button>
              </div>

              {danhSachNguoi.map((nguoi, idx) => (
                <div key={nguoi.id} className="nc">
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'8px' }}>
                    <span style={{ fontSize:'12px', fontWeight:700, color:'var(--text-secondary)' }}>
                      Người {idx + 1}
                      {nguoi.tenNV && <span style={{ marginLeft:'8px', fontWeight:400, color:'var(--primary)' }}>— {nguoi.tenNV}</span>}
                    </span>
                    {danhSachNguoi.length > 1 && (
                      <button onClick={() => xoaNguoi(nguoi.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', fontSize:'16px', lineHeight:1 }}>✕</button>
                    )}
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px' }}>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Hình thức</label>
                      <select className="input" value={nguoi.hinhThuc} onChange={e => updN(nguoi.id, 'hinhThuc', e.target.value)}>
                        <option value="NV cửa hàng">NV cửa hàng</option>
                        <option value="Đối tác">Đối tác ngoài</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Vai trò</label>
                      <select className="input" value={nguoi.vaiTro} onChange={e => updN(nguoi.id, 'vaiTro', e.target.value)}>
                        {VAI_TRO_LIST.map(v => <option key={v}>{v}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Tên — dropdown */}
                  <div style={{ marginBottom:'8px' }}>
                    <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Tên người *</label>
                    <div style={{ position:'relative' }}>
                      <input className="input" placeholder="Gõ tên hoặc chọn từ danh sách..."
                        value={nguoi.searchText || nguoi.tenNV}
                        onChange={e => { updN(nguoi.id,'searchText',e.target.value); updN(nguoi.id,'tenNV',e.target.value); updN(nguoi.id,'showSearch',true) }}
                        onFocus={() => updN(nguoi.id, 'showSearch', true)}
                        onBlur={() => setTimeout(() => updN(nguoi.id, 'showSearch', false), 200)} />
                      {nguoi.showSearch && (
                        <div className="db">
                          {nguoi.tenNV && !nhanVien.find((nv: any) => nv['Họ tên'] === nguoi.tenNV) && (
                            <div className="di" onClick={() => updN(nguoi.id, 'showSearch', false)}
                              style={{ background:'#FEF9C3', color:'#92400E', fontSize:'12px' }}>
                              ✏️ Dùng tên: <strong>"{nguoi.tenNV}"</strong>
                            </div>
                          )}
                          {getNVLoc(nguoi.searchText || nguoi.tenNV).map((nv: any) => (
                            <div key={nv['Mã NV']} className="di" onClick={() => chonNV(nguoi.id, nv)}>
                              <div style={{ fontWeight:600 }}>{nv['Họ tên']}</div>
                              <div style={{ fontSize:'11px', color:'#6B7280' }}>{nv['Mã NV']} · {nv['Vai trò'] || '—'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Chi phí */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'7px' }}>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>
                        {nguoi.hinhThuc === 'Đối tác' ? 'CP vận chuyển' : 'Thưởng VC'} (đ)
                      </label>
                      <input className="input" type="number" min="0" value={nguoi.chiPhiVC || ''} placeholder="0"
                        onChange={e => updN(nguoi.id, 'chiPhiVC', Number(e.target.value))} style={{ fontSize:'12px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>
                        {nguoi.hinhThuc === 'Đối tác' ? 'CP lắp đặt' : 'Thưởng lắp'} (đ)
                      </label>
                      <input className="input" type="number" min="0" value={nguoi.chiPhiLap || ''} placeholder="0"
                        onChange={e => updN(nguoi.id, 'chiPhiLap', Number(e.target.value))} style={{ fontSize:'12px' }} />
                    </div>
                    <div>
                      <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Thưởng chuyến (đ)</label>
                      <input className="input" type="number" min="0" value={nguoi.thuongChuyen || ''} placeholder="0"
                        onChange={e => updN(nguoi.id, 'thuongChuyen', Number(e.target.value))} style={{ fontSize:'12px' }} />
                    </div>
                  </div>
                  {(nguoi.chiPhiVC + nguoi.chiPhiLap + nguoi.thuongChuyen) > 0 && (
                    <div style={{ marginTop:'6px', fontSize:'12px', fontWeight:600, color:nguoi.hinhThuc==='Đối tác'?'#DC2626':'#065F46' }}>
                      {nguoi.hinhThuc === 'Đối tác' ? '💸 Trả sau khi giao xong: ' : '🎁 Thưởng cuối tháng: '}
                      {fVND(nguoi.chiPhiVC + nguoi.chiPhiLap + nguoi.thuongChuyen)}
                    </div>
                  )}
                  <div style={{ marginTop:'7px' }}>
                    <input className="input" placeholder="Ghi chú riêng..." value={nguoi.ghiChu}
                      onChange={e => updN(nguoi.id, 'ghiChu', e.target.value)} style={{ fontSize:'12px' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Tổng chi phí */}
            {tongChiPhi > 0 && (
              <div style={{ padding:'10px 14px', background:'#FFF7ED', borderRadius:'8px', border:'1px solid #FED7AA', marginBottom:'14px', fontSize:'13px' }}>
                <div style={{ fontWeight:700, color:'#C2410C', marginBottom:'4px' }}>💰 Tổng chi phí chuyến: {fVND(tongChiPhi)}</div>
                {danhSachNguoi.filter(n => n.tenNV && (n.chiPhiVC + n.chiPhiLap + n.thuongChuyen) > 0).map((n, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'2px' }}>
                    <span>{n.tenNV} — {n.vaiTro}</span>
                    <span style={{ fontWeight:600, color:n.hinhThuc==='Đối tác'?'#DC2626':'#065F46' }}>
                      {fVND(n.chiPhiVC + n.chiPhiLap + n.thuongChuyen)}
                      <span style={{ color:'#9CA3AF', fontWeight:400, fontSize:'11px', marginLeft:'4px' }}>
                        {n.hinhThuc === 'Đối tác' ? '(trả ngay sau chuyến)' : '(cuối tháng)'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={luuChuyen} disabled={loading} style={{ flex:1, padding:'12px', borderRadius:'8px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
                {loading ? '⏳ Đang lưu...' : `✅ Tạo chuyến giao${spDaChon > 0 ? ` (${spDaChon} SP)` : ''}`}
              </button>
              <button onClick={() => { setShowForm(false); resetForm() }}
                style={{ padding:'12px 18px', borderRadius:'8px', border:'1px solid var(--border)', background:'white', cursor:'pointer', fontSize:'14px' }}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
