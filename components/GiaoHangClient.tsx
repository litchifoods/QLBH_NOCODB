'use client'
// components/GiaoHangClient.tsx -- v3.1
// Vai trò chuyến lấy từ NocoDB (không hardcode)
// Bỏ ô thưởng khỏi form tạo chuyến → chỉ nhập lúc đối soát
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
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()
}

interface Nguoi {
  id: string
  hinhThuc: 'NV cửa hàng' | 'Đối tác'
  maNV: string
  tenNV: string
  vaiTroNocoDB: string   // Vai trò từ NocoDB (Bán hàng / Kỹ thuật / Đối tác ngoài)
  vaiTroChuyen: string   // Vai trò trong chuyến này (Vận chuyển / Lắp đặt / Vận chuyển+Lắp)
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

// Vai trò trong chuyến giao — độc lập với vai trò nhân viên
const VAI_TRO_CHUYEN = ['Vận chuyển+Lắp', 'Vận chuyển', 'Lắp đặt']

const NGUOI_MAC_DINH: Nguoi = {
  id: '1', hinhThuc: 'NV cửa hàng', maNV: '', tenNV: '',
  vaiTroNocoDB: '', vaiTroChuyen: 'Vận chuyển+Lắp',
  ghiChu: '', showSearch: false, searchText: '',
}

export default function GiaoHangClient({
  giaoHangList, chiTietDonMap, daGiaoMap,
  donChuaGiao, donHangMap,
  danhSachNVCuaHang, danhSachDoiTac,
  khachHangMap, user,
}: {
  giaoHangList: any[]
  chiTietDonMap: Record<string, any[]>
  daGiaoMap: Record<string, Record<string, number>>
  donChuaGiao: any[]
  donHangMap: Record<string, any>
  danhSachNVCuaHang: any[]   // NV bắt đầu bằng NV-
  danhSachDoiTac: any[]      // NV bắt đầu bằng DT-
  khachHangMap: Record<string, any>
  user: UserSession
}) {
  const router = useRouter()
  const [filterTT, setFilterTT] = useState('Tất cả')
  const [showForm, setShowForm] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)

  // Form state
  const [searchDon,     setSearchDon]     = useState('')
  const [donChon,       setDonChon]       = useState<any>(null)
  const [showDon,       setShowDon]       = useState(false)
  const [ngayGiao,      setNgayGiao]      = useState(new Date().toISOString().slice(0,16))
  const [ghiChuChuyen,  setGhiChuChuyen]  = useState('')
  const [danhSachNguoi, setDanhSachNguoi] = useState<Nguoi[]>([{ ...NGUOI_MAC_DINH }])
  const [danhSachSP,    setDanhSachSP]    = useState<SPGiao[]>([])

  // Helpers
  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }
  function getDiaChi(don: any) {
    if (!don) return '—'
    return don['Địa chỉ giao'] || khachHangMap[don['Mã KH']]?.['Địa chỉ'] || '—'
  }

  // Bảng chính
  const ghHopLe = useMemo(() =>
    giaoHangList.filter(g => g['Mã đơn hàng']?.toString().trim())
  , [giaoHangList])

  const filtered = useMemo(() => {
    if (filterTT === 'Tất cả') return ghHopLe
    if (filterTT === 'Chưa đối soát') return ghHopLe.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát')
    return ghHopLe.filter(g => g['Tình trạng đối soát'] === 'Đã đối soát')
  }, [ghHopLe, filterTT])

  const chuaDS = ghHopLe.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát').length

  // Dropdown đơn hàng
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

    // Load sản phẩm trong đơn, tính còn lại chưa giao
    const chiTiet = chiTietDonMap[don['Mã đơn hàng']] || []
    const daGiao  = daGiaoMap[don['Mã đơn hàng']] || {}

    const spList: SPGiao[] = chiTiet
      .filter((ct: any) => ct['Tên SP (ghi nhanh)'] || ct['Mã SP'])
      .map((ct: any) => {
        const key     = ct['Mã chi tiết'] || ct['Tên SP (ghi nhanh)'] || ct['Mã SP']
        const soLuong = Number(ct['Số lượng'] || 1)
        const daDuocGiao = daGiao[key] || 0
        const conLai  = Math.max(0, soLuong - daDuocGiao)
        return {
          maChiTiet:   ct['Mã chi tiết'] || '',
          tenSP:       ct['Tên SP (ghi nhanh)'] || ct['Mã SP'] || '—',
          soLuongDon:  soLuong,
          daGiao:      daDuocGiao,
          soLuongGiao: conLai,
          checked:     conLai > 0,
          ghiChu:      '',
        }
      })
    setDanhSachSP(spList)
  }

  // Lấy danh sách tìm kiếm theo hình thức (NV cửa hàng / Đối tác)
  function getDanhSachTimKiem(hinhThuc: string, searchText: string) {
    const list = hinhThuc === 'Đối tác' ? danhSachDoiTac : danhSachNVCuaHang
    if (!searchText.trim()) return list.slice(0, 8)
    const q = boDau(searchText)
    return list.filter((nv: any) =>
      boDau(nv['Họ tên'] || '').includes(q) ||
      boDau(nv['Mã NV'] || '').includes(q) ||
      boDau(nv['Vai trò'] || '').includes(q)
    ).slice(0, 8)
  }

  // Quản lý người giao
  function themNguoi() {
    setDanhSachNguoi(prev => [...prev, {
      id: Date.now().toString(), hinhThuc: 'NV cửa hàng', maNV: '', tenNV: '',
      vaiTroNocoDB: '', vaiTroChuyen: 'Vận chuyển',
      ghiChu: '', showSearch: false, searchText: '',
    }])
  }
  function xoaNguoi(id: string) {
    setDanhSachNguoi(prev => prev.filter(n => n.id !== id))
  }
  function updN(id: string, k: keyof Nguoi, v: any) {
    setDanhSachNguoi(prev => prev.map(n => n.id === id ? { ...n, [k]: v } : n))
  }

  // Khi chọn người từ dropdown — điền thông tin từ NocoDB
  function chonNguoi(nguoiId: string, nv: any) {
    const hinhThuc = (nv['Mã NV'] || '').startsWith('DT-') ? 'Đối tác' : 'NV cửa hàng'
    setDanhSachNguoi(prev => prev.map(n => n.id === nguoiId ? {
      ...n,
      maNV:         nv['Mã NV'] || '',
      tenNV:        nv['Họ tên'] || '',
      vaiTroNocoDB: nv['Vai trò'] || '',   // Lấy vai trò từ NocoDB
      hinhThuc,                             // Tự xác định từ mã
      searchText:   nv['Họ tên'] || '',
      showSearch:   false,
    } : n))
  }

  // Quản lý SP giao
  function updSP(idx: number, k: keyof SPGiao, v: any) {
    setDanhSachSP(prev => prev.map((sp, i) => i === idx ? { ...sp, [k]: v } : sp))
  }

  function resetForm() {
    setSearchDon(''); setDonChon(null); setGhiChuChuyen('')
    setNgayGiao(new Date().toISOString().slice(0, 16))
    setDanhSachNguoi([{ ...NGUOI_MAC_DINH }])
    setDanhSachSP([])
  }

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
            hinhThuc:     n.hinhThuc,
            maNV:         n.maNV,
            tenNV:        n.tenNV,
            vaiTroChuyen: n.vaiTroChuyen,
            // Không gửi thưởng/chi phí — sẽ nhập lúc đối soát
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

  const spDaChon = danhSachSP.filter(sp => sp.checked).length

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        .gh-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .btn-tao{background:var(--primary);color:white;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;white-space:nowrap;cursor:pointer;display:inline-flex;align-items:center;gap:6px;}
        .gh-t th,.gh-t td{padding:8px 10px;}
        .gh-t tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:flex-start;justify-content:center;padding:16px;overflow-y:auto;}
        .modal-gh{background:white;border-radius:12px;padding:24px;width:100%;max-width:680px;margin:auto;}
        .db{position:absolute;top:calc(100% + 3px);left:0;right:0;z-index:70;background:white;border:1px solid var(--border);border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.12);max-height:220px;overflow-y:auto;}
        .di{padding:9px 12px;cursor:pointer;border-bottom:1px solid #F3F4F6;font-size:13px;}
        .di:hover{background:#F0F9FF;} .di:last-child{border-bottom:none;}
        .nc{border:1px solid var(--border);border-radius:10px;padding:13px;background:#FAFBFD;margin-bottom:8px;}
        .sp-row{display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;border:1px solid #E5E7EB;margin-bottom:5px;background:white;font-size:13px;}
        .sec-title{font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:.05em;margin:0 0 10px;display:flex;align-items:center;gap:6px;}
        .tag-vt{display:inline-block;padding:1px 7px;border-radius:10px;font-size:10px;font-weight:700;}
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
              background:  filterTT===tt?'var(--primary-pale)':'white',
              color:       filterTT===tt?'var(--primary)':'var(--text-secondary)',
              fontWeight:  filterTT===tt?700:400, fontSize:'12px', cursor:'pointer',
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
                <th className="col-vt" style={{ textAlign:'left', fontWeight:700 }}>Vai trò chuyến</th>
                <th className="col-cp" style={{ textAlign:'right', fontWeight:700 }}>CP/Thưởng</th>
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
                    <td className="col-dia" style={{ fontSize:'12px', color:'var(--text-secondary)', maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {diaChi}
                    </td>
                    <td className="col-nguoi">
                      <div style={{ fontWeight:600 }}>{g['Tên NV/đối tác'] || '—'}</div>
                      <div style={{ fontSize:'11px', color:'#6B7280' }}>{g['Mã NV/đối tác'] || ''}</div>
                      {laDT && <span className="tag-vt" style={{ background:'#FEF3C7', color:'#92400E', marginTop:'2px' }}>Đối tác</span>}
                    </td>
                    <td className="col-vt" style={{ fontSize:'12px', color:'var(--text-secondary)' }}>
                      {g['Vai trò chuyến'] || '—'}
                    </td>
                    <td className="col-cp" style={{ textAlign:'right' }}>
                      {chiPhi > 0
                        ? <span style={{ fontWeight:600, color:laDT?'#DC2626':'#065F46' }}>{fVND(chiPhi)}</span>
                        : <span style={{ color:'var(--text-muted)' }}>—</span>}
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
          <div className="modal-gh" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'17px', fontWeight:700, margin:0 }}>🚚 Tạo chuyến giao hàng</h2>
              <button onClick={() => { setShowForm(false); resetForm() }}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'22px', color:'#6B7280' }}>✕</button>
            </div>

            {/* ① Chọn đơn + ngày */}
            <div style={{ marginBottom:'14px', padding:'14px', background:'#F8FAFC', borderRadius:'10px', border:'1px solid #E5E7EB' }}>
              <div className="sec-title">① Chọn đơn hàng & ngày giao</div>
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
                    <input className="input" placeholder="Ghi chú..." value={ghiChuChuyen}
                      onChange={e => setGhiChuChuyen(e.target.value)} style={{ fontSize:'12px' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ② Sản phẩm giao */}
            {danhSachSP.length > 0 && (
              <div style={{ marginBottom:'14px', padding:'14px', background:'#F8FAFC', borderRadius:'10px', border:'1px solid #E5E7EB' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                  <div className="sec-title" style={{ margin:0 }}>② Sản phẩm giao lần này</div>
                  <span style={{ fontSize:'12px', color:'var(--primary)', fontWeight:600 }}>{spDaChon}/{danhSachSP.length} SP</span>
                </div>
                {danhSachSP.map((sp, idx) => {
                  const hetHang = sp.soLuongDon <= sp.daGiao
                  return (
                    <div key={idx} className="sp-row" style={{ opacity:hetHang?0.5:1 }}>
                      <input type="checkbox" checked={sp.checked && !hetHang} disabled={hetHang}
                        onChange={e => updSP(idx, 'checked', e.target.checked)}
                        style={{ width:'16px', height:'16px', flexShrink:0, accentColor:'var(--primary)' }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:sp.checked?600:400, color:sp.checked?'#1F2937':'#6B7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {sp.tenSP}
                        </div>
                        <div style={{ fontSize:'11px', color:'#6B7280' }}>
                          ĐH: {sp.soLuongDon} · Đã giao: {sp.daGiao} · Còn: {sp.soLuongDon - sp.daGiao}
                          {hetHang && <span style={{ marginLeft:'6px', color:'#16A34A', fontWeight:600 }}>✅ Đủ rồi</span>}
                        </div>
                      </div>
                      {sp.checked && !hetHang && (
                        <div style={{ display:'flex', alignItems:'center', gap:'5px', flexShrink:0 }}>
                          <span style={{ fontSize:'11px', color:'#6B7280' }}>Giao:</span>
                          <input type="number" min="1" max={sp.soLuongDon - sp.daGiao}
                            value={sp.soLuongGiao}
                            onChange={e => updSP(idx, 'soLuongGiao', Math.min(Number(e.target.value), sp.soLuongDon - sp.daGiao))}
                            style={{ width:'52px', padding:'4px 6px', border:'1px solid var(--border)', borderRadius:'5px', fontSize:'12px', textAlign:'center' }} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ③ Người tham gia */}
            <div style={{ marginBottom:'14px', padding:'14px', background:'#F8FAFC', borderRadius:'10px', border:'1px solid #E5E7EB' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                <div className="sec-title" style={{ margin:0 }}>③ Người vận chuyển / lắp đặt</div>
                <button onClick={themNguoi}
                  style={{ padding:'5px 12px', borderRadius:'6px', border:'1px solid var(--primary)', color:'var(--primary)', background:'white', cursor:'pointer', fontSize:'12px', fontWeight:600 }}>
                  + Thêm người
                </button>
              </div>

              {danhSachNguoi.map((nguoi, idx) => {
                const dsTK = getDanhSachTimKiem(nguoi.hinhThuc, nguoi.searchText || nguoi.tenNV)
                return (
                  <div key={nguoi.id} className="nc">
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                      <span style={{ fontSize:'12px', fontWeight:700, color:'var(--text-secondary)' }}>
                        Người {idx + 1}
                        {nguoi.tenNV && <span style={{ marginLeft:'8px', fontWeight:400, color:'var(--primary)' }}>— {nguoi.tenNV}</span>}
                        {nguoi.vaiTroNocoDB && <span style={{ marginLeft:'6px', fontSize:'11px', color:'#6B7280' }}>({nguoi.vaiTroNocoDB})</span>}
                      </span>
                      {danhSachNguoi.length > 1 && (
                        <button onClick={() => xoaNguoi(nguoi.id)}
                          style={{ background:'none', border:'none', cursor:'pointer', color:'#DC2626', fontSize:'16px', lineHeight:1 }}>✕</button>
                      )}
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px' }}>
                      {/* Hình thức — NV cửa hàng hoặc Đối tác */}
                      <div>
                        <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Hình thức</label>
                        <select className="input" value={nguoi.hinhThuc}
                          onChange={e => {
                            updN(nguoi.id, 'hinhThuc', e.target.value)
                            // Reset người khi đổi hình thức
                            updN(nguoi.id, 'maNV', '')
                            updN(nguoi.id, 'tenNV', '')
                            updN(nguoi.id, 'vaiTroNocoDB', '')
                            updN(nguoi.id, 'searchText', '')
                          }}>
                          <option value="NV cửa hàng">NV cửa hàng</option>
                          <option value="Đối tác">Đối tác ngoài</option>
                        </select>
                      </div>
                      {/* Vai trò trong chuyến này */}
                      <div>
                        <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>
                          Vai trò chuyến này
                        </label>
                        <select className="input" value={nguoi.vaiTroChuyen}
                          onChange={e => updN(nguoi.id, 'vaiTroChuyen', e.target.value)}>
                          {VAI_TRO_CHUYEN.map(v => <option key={v}>{v}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Tên người — dropdown tìm kiếm từ NocoDB */}
                    <div style={{ marginBottom:'8px' }}>
                      <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>
                        Tên người *
                        <span style={{ fontWeight:400, color:'#6B7280', marginLeft:'6px' }}>
                          (danh sách từ NocoDB · {nguoi.hinhThuc === 'Đối tác' ? danhSachDoiTac.length : danhSachNVCuaHang.length} người)
                        </span>
                      </label>
                      <div style={{ position:'relative' }}>
                        <input className="input"
                          placeholder={`Gõ tên ${nguoi.hinhThuc === 'Đối tác' ? 'đối tác' : 'nhân viên'}...`}
                          value={nguoi.searchText || nguoi.tenNV}
                          onChange={e => {
                            updN(nguoi.id, 'searchText', e.target.value)
                            updN(nguoi.id, 'tenNV', e.target.value)
                            updN(nguoi.id, 'showSearch', true)
                          }}
                          onFocus={() => updN(nguoi.id, 'showSearch', true)}
                          onBlur={() => setTimeout(() => updN(nguoi.id, 'showSearch', false), 200)} />

                        {nguoi.showSearch && (
                          <div className="db">
                            {/* Cho phép gõ tên tự do nếu không có trong danh sách */}
                            {nguoi.tenNV && !dsTK.find((nv: any) => nv['Họ tên'] === nguoi.tenNV) && (
                              <div className="di" onClick={() => updN(nguoi.id, 'showSearch', false)}
                                style={{ background:'#FEF9C3', color:'#92400E', fontSize:'12px' }}>
                                ✏️ Nhập tên mới: <strong>"{nguoi.tenNV}"</strong>
                                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'1px' }}>
                                  (Nếu chưa có trong NocoDB, thêm vào bảng 3_Nhân viên sau)
                                </div>
                              </div>
                            )}
                            {dsTK.length === 0 ? (
                              <div style={{ padding:'12px', fontSize:'12px', color:'#6B7280', textAlign:'center' }}>
                                Không tìm thấy · Thêm vào bảng 3_Nhân viên trên NocoDB
                              </div>
                            ) : dsTK.map((nv: any) => (
                              <div key={nv['Mã NV']} className="di" onClick={() => chonNguoi(nguoi.id, nv)}>
                                <div style={{ fontWeight:600, display:'flex', alignItems:'center', gap:'8px' }}>
                                  {nv['Họ tên']}
                                  <span style={{ fontSize:'11px', padding:'1px 6px', borderRadius:'10px',
                                    background: nv['Mã NV']?.startsWith('DT-')?'#FEF3C7':'#DBEAFE',
                                    color: nv['Mã NV']?.startsWith('DT-')?'#92400E':'#1E40AF', fontWeight:700 }}>
                                    {nv['Mã NV']}
                                  </span>
                                </div>
                                <div style={{ fontSize:'11px', color:'#6B7280', marginTop:'1px' }}>
                                  Vai trò: {nv['Vai trò'] || '—'}
                                  {nv['Số điện thoại'] && ` · ☎ ${nv['Số điện thoại']}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Ghi chú riêng */}
                    <input className="input" placeholder="Ghi chú riêng cho người này..."
                      value={nguoi.ghiChu} onChange={e => updN(nguoi.id, 'ghiChu', e.target.value)}
                      style={{ fontSize:'12px' }} />

                    {/* Thông báo phân loại */}
                    {nguoi.tenNV && (
                      <div style={{ marginTop:'6px', fontSize:'11px',
                        color: nguoi.hinhThuc==='Đối tác'?'#92400E':'#0369A1',
                        background: nguoi.hinhThuc==='Đối tác'?'#FEF9C3':'#EFF6FF',
                        padding:'4px 8px', borderRadius:'5px' }}>
                        {nguoi.hinhThuc === 'Đối tác'
                          ? '💸 Đối tác ngoài — chi phí sẽ nhập lúc đối soát (sau khi giao xong)'
                          : '🎁 NV cửa hàng — thưởng sẽ nhập lúc đối soát (trả cuối tháng)'}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Lưu ý */}
            <div style={{ padding:'10px 14px', background:'#EFF6FF', borderRadius:'8px', border:'1px solid #BFDBFE', marginBottom:'14px', fontSize:'12px', color:'#1E40AF' }}>
              💡 <strong>Chi phí và thưởng chưa cần nhập bây giờ</strong> — sẽ nhập lúc đối soát sau khi hoàn thành giao hàng.
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={luuChuyen} disabled={loading}
                style={{ flex:1, padding:'12px', borderRadius:'8px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
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
