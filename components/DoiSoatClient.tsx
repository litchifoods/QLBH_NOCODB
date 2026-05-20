'use client'
// components/DoiSoatClient.tsx -- v3.0
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

// 5 kết quả có thể xảy ra sau 1 chuyến giao
const KET_QUA_LIST = [
  { value:'Thành công',               label:'✅ Thành công',               color:'#065F46', bg:'#D1FAE5' },
  { value:'Huỷ — khách trả CP',       label:'❌ Huỷ — khách trả CP',       color:'#92400E', bg:'#FEF3C7' },
  { value:'Huỷ — cửa hàng chịu CP',   label:'❌ Huỷ — cửa hàng chịu CP',   color:'#991B1B', bg:'#FEE2E2' },
  { value:'Đổi hàng — khách trả CP',  label:'🔄 Đổi hàng — khách trả CP',  color:'#1E40AF', bg:'#DBEAFE' },
  { value:'Đổi hàng — cửa hàng chịu', label:'🔄 Đổi hàng — CH chịu CP',    color:'#6D28D9', bg:'#EDE9FE' },
]

export default function DoiSoatClient({
  giaoHangList, doiSoatMap, donHangMap, khachHangMap, filterParam, user,
}: {
  giaoHangList: any[]
  doiSoatMap: Record<string, any>
  donHangMap: Record<string, any>
  khachHangMap: Record<string, any>
  filterParam?: string
  user: UserSession
}) {
  const router = useRouter()
  const [filterTT,    setFilterTT]    = useState(filterParam ? 'Tất cả' : 'Chưa đối soát')
  const [modalGH,     setModalGH]     = useState<any>(null)
  const [loading,     setLoading]     = useState(false)
  const [msg,         setMsg]         = useState('')
  const [msgOk,       setMsgOk]       = useState(true)

  // Form đối soát
  const [tienThuKH,    setTienThuKH]    = useState(0)
  const [hinhThucThu,  setHinhThucThu]  = useState('Tiền mặt')
  const [chiPhiVC,     setChiPhiVC]     = useState(0)
  const [chiPhiLap,    setChiPhiLap]    = useState(0)
  const [thuongChuyen, setThuongChuyen] = useState(0)
  const [ketQua,       setKetQua]       = useState('Thành công')
  const [ghiChu,       setGhiChu]       = useState('')
  const [hoanThanhDon, setHoanThanhDon] = useState(false)

  function getTenKH(maKH: string, tenTuDon?: string) {
    return khachHangMap[maKH]?.['Tên khách hàng'] || tenTuDon || maKH || '—'
  }

  const filtered = useMemo(() => {
    if (filterTT === 'Tất cả') return giaoHangList
    if (filterTT === 'Chưa đối soát') return giaoHangList.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát')
    return giaoHangList.filter(g => g['Tình trạng đối soát'] === 'Đã đối soát')
  }, [giaoHangList, filterTT])

  const chuaDS    = giaoHangList.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát').length
  const tongCP    = giaoHangList.reduce((s, g) => s + Number(g['Chi phí VC']||0) + Number(g['Chi phí lắp đặt']||0) + Number(g['Thưởng chuyến']||0), 0)
  const tongThuKH = Object.values(doiSoatMap).reduce((s: number, ds: any) => s + Number(ds['Đã thu được'] || 0), 0)

  function moModal(gh: any) {
    const don = donHangMap[gh['Mã đơn hàng']]
    setModalGH(gh)
    setTienThuKH(Number(don?.['Còn phải thu'] || 0))
    setHinhThucThu('Tiền mặt')
    // Điền sẵn chi phí đã nhập lúc tạo chuyến
    setChiPhiVC(Number(gh['Chi phí VC'] || 0))
    setChiPhiLap(Number(gh['Chi phí lắp đặt'] || 0))
    setThuongChuyen(Number(gh['Thưởng chuyến'] || 0))
    setKetQua('Thành công')
    setGhiChu('')
    setHoanThanhDon(false)
  }

  async function luuDoiSoat() {
    if (!modalGH) return
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/doi-soat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maGiaoHang:   modalGH['Mã giao hàng'],
          maChuyen:     modalGH['Mã chuyến'] || '',
          maDon:        modalGH['Mã đơn hàng'],
          maNVDoiTac:   modalGH['Mã NV/đối tác'] || '',
          tenNVDoiTac:  modalGH['Tên NV/đối tác'] || '',
          hinhThucGiao: modalGH['Hình thức giao'] || '',
          tienThuKH, hinhThucThu, chiPhiVC, chiPhiLap, thuongChuyen, ketQua, ghiChu, hoanThanhDon,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).message || 'Lỗi')
      setMsg('✅ Đã lưu đối soát'); setMsgOk(true)
      setModalGH(null); router.refresh()
    } catch (err: any) {
      setMsg('❌ ' + (err.message || 'Lỗi')); setMsgOk(false)
    } finally {
      setLoading(false); setTimeout(() => setMsg(''), 4000)
    }
  }

  const donModal     = modalGH ? donHangMap[modalGH['Mã đơn hàng']] : null
  const laDT         = modalGH?.['Hình thức giao'] === 'Đối tác'
  const tongPhaiTra  = (chiPhiVC || 0) + (chiPhiLap || 0) + (thuongChuyen || 0)
  const ketQuaInfo   = KET_QUA_LIST.find(k => k.value === ketQua)
  const laChuaThanhCong = ketQua !== 'Thành công'

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        .ds-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .ds-t th,.ds-t td{padding:8px 10px;}
        .ds-t tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .modal-ds{background:white;border-radius:12px;padding:24px;width:100%;max-width:500px;max-height:93vh;overflow-y:auto;}
        .kq-btn{padding:8px 12px;border-radius:8px;border:2px solid;cursor:pointer;font-size:12px;font-weight:600;text-align:center;transition:all .1s;}
        @media(max-width:900px){.col-cp{display:none;}}
        @media(max-width:650px){.col-nguoi,.col-vt{display:none;}}
      `}</style>

      {/* Header */}
      <div className="ds-hdr">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>💰 Đối soát giao hàng</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 0' }}>
            {giaoHangList.length} chuyến
            {chuaDS > 0 && <span style={{ marginLeft:'8px', color:'#DC2626', fontWeight:600 }}>⚠️ {chuaDS} chưa đối soát</span>}
          </p>
        </div>
        {filterParam && <Link href="/dashboard/doi-soat" className="btn btn-ghost btn-sm">← Xem tất cả</Link>}
      </div>

      {msg && <div style={{ padding:'10px 14px', borderRadius:'8px', marginBottom:'14px', fontSize:'13px', background:msgOk?'#D1FAE5':'#FEE2E2', color:msgOk?'#065F46':'#991B1B' }}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:'12px', marginBottom:'16px' }}>
        {[
          { icon:'🚚', label:'Tổng chuyến',  val:giaoHangList.length,           c:'var(--primary)' },
          { icon:'⏳', label:'Chưa đối soát', val:chuaDS,                        c:'#DC2626' },
          { icon:'✅', label:'Đã đối soát',  val:giaoHangList.length - chuaDS,  c:'#065F46' },
          { icon:'💸', label:'Tổng chi phí', val:fVND(tongCP),                  c:'#92400E' },
          { icon:'💵', label:'Đã thu từ KH', val:fVND(tongThuKH),               c:'#065F46' },
        ].map(({ icon, label, val, c }) => (
          <div key={label} className="card" style={{ padding:'12px 14px' }}>
            <div style={{ fontSize:'18px', marginBottom:'2px' }}>{icon}</div>
            <div style={{ fontSize:'15px', fontWeight:800, color:c }}>{val}</div>
            <div style={{ fontSize:'11px', color:'var(--text-secondary)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
          {['Tất cả','Chưa đối soát','Đã đối soát'].map(tt => (
            <button key={tt} onClick={() => setFilterTT(tt)} style={{
              padding:'5px 14px', borderRadius:'20px', border:'1px solid',
              borderColor: filterTT===tt?'var(--primary)':'var(--border)',
              background: filterTT===tt?'var(--primary-pale)':'white',
              color: filterTT===tt?'var(--primary)':'var(--text-secondary)',
              fontWeight: filterTT===tt?700:400, fontSize:'12px', cursor:'pointer',
            }}>{tt}</button>
          ))}
          <span style={{ marginLeft:'auto', fontSize:'12px', color:'var(--text-secondary)', alignSelf:'center' }}>{filtered.length} chuyến</span>
        </div>
      </div>

      {/* Bảng */}
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          <table className="ds-t" style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F0F4FF', borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã đơn</th>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày giao</th>
                <th style={{ textAlign:'left', fontWeight:700 }}>Khách hàng</th>
                <th className="col-nguoi" style={{ textAlign:'left', fontWeight:700 }}>Người giao</th>
                <th className="col-vt" style={{ textAlign:'left', fontWeight:700 }}>Vai trò</th>
                <th className="col-cp" style={{ textAlign:'right', fontWeight:700 }}>CP/Thưởng</th>
                <th style={{ textAlign:'center', fontWeight:700 }}>Trạng thái</th>
                <th style={{ width:'90px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>Không có chuyến nào</td></tr>
              ) : filtered.map((g: any, i: number) => {
                const maDon  = g['Mã đơn hàng'] || ''
                const don    = donHangMap[maDon]
                const maKH   = don?.['Mã KH'] || ''
                const tenKH  = getTenKH(maKH, don?.['Tên khách hàng'])
                const chuaDS = g['Tình trạng đối soát'] !== 'Đã đối soát'
                const ds     = doiSoatMap[g['Mã giao hàng']]
                const laDT   = g['Hình thức giao'] === 'Đối tác'
                const chiPhi = Number(g['Chi phí VC']||0) + Number(g['Chi phí lắp đặt']||0) + Number(g['Thưởng chuyến']||0)
                const kqDs   = ds ? KET_QUA_LIST.find(k => k.value === ds['Kết quả']) : null
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
                    <td className="col-nguoi">
                      <div style={{ fontWeight:600 }}>{g['Tên NV/đối tác'] || '—'}</div>
                      {laDT && <span style={{ fontSize:'10px', padding:'1px 6px', borderRadius:'10px', background:'#FEF3C7', color:'#92400E', fontWeight:700 }}>Đối tác</span>}
                    </td>
                    <td className="col-vt" style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{g['Vai trò chuyến'] || '—'}</td>
                    <td className="col-cp" style={{ textAlign:'right' }}>
                      {chiPhi > 0 ? <span style={{ fontWeight:600, color:laDT?'#DC2626':'#065F46' }}>{fVND(chiPhi)}</span> : '—'}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      {chuaDS ? (
                        <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700, background:'#FEF3C7', color:'#92400E', whiteSpace:'nowrap' }}>
                          ⏳ Chưa đối soát
                        </span>
                      ) : (
                        <span style={{ padding:'3px 9px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                          background:kqDs?.bg || '#D1FAE5', color:kqDs?.color || '#065F46', whiteSpace:'nowrap' }}>
                          {kqDs?.label || '✅ Đã đối soát'}
                        </span>
                      )}
                    </td>
                    <td>
                      {chuaDS ? (
                        <button onClick={() => moModal(g)}
                          style={{ padding:'5px 10px', borderRadius:'6px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap' }}>
                          💰 Đối soát
                        </button>
                      ) : (
                        <span style={{ fontSize:'11px', color:'var(--text-muted)', fontSize:'11px' }}>{ds?.['Ghi chú'] || ''}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL ĐỐI SOÁT ── */}
      {modalGH && (
        <div className="overlay" onClick={() => setModalGH(null)}>
          <div className="modal-ds" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:700, margin:0 }}>💰 Đối soát chuyến</h2>
              <button onClick={() => setModalGH(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#6B7280' }}>✕</button>
            </div>

            {/* Thông tin chuyến */}
            <div style={{ background:'var(--primary-pale)', borderRadius:'8px', padding:'12px 14px', marginBottom:'14px', fontSize:'13px' }}>
              <div style={{ fontWeight:700, color:'var(--primary)', marginBottom:'4px' }}>
                {modalGH['Tên NV/đối tác'] || '—'}
                <span style={{ marginLeft:'8px', fontSize:'11px', padding:'2px 8px', borderRadius:'10px',
                  background:laDT?'#FEF3C7':'#DBEAFE', color:laDT?'#92400E':'#1E40AF' }}>
                  {laDT ? 'Đối tác ngoài' : 'NV cửa hàng'}
                </span>
              </div>
              <div>📋 {modalGH['Mã đơn hàng']} · {modalGH['Vai trò chuyến'] || '—'} · {fDT(modalGH['Ngày giao'])}</div>
              {Number(donModal?.['Còn phải thu'] || 0) > 0 && (
                <div style={{ color:'#DC2626', fontWeight:600, marginTop:'3px' }}>
                  📌 KH còn nợ: {fVND(donModal?.['Còn phải thu'])}
                </div>
              )}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>

              {/* A. Kết quả chuyến — chọn trước */}
              <div>
                <label style={{ fontSize:'12px', fontWeight:700, display:'block', marginBottom:'8px', color:'#374151' }}>
                  📌 Kết quả chuyến giao
                </label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {KET_QUA_LIST.map(kq => (
                    <button key={kq.value}
                      onClick={() => {
                        setKetQua(kq.value)
                        // Tự đánh dấu hoàn thành nếu thành công
                        if (kq.value === 'Thành công') setHoanThanhDon(false)
                      }}
                      className="kq-btn"
                      style={{
                        borderColor: ketQua===kq.value ? kq.color : '#E5E7EB',
                        background:  ketQua===kq.value ? kq.bg    : 'white',
                        color:       ketQua===kq.value ? kq.color : '#6B7280',
                      }}>
                      {kq.label}
                    </button>
                  ))}
                </div>
                {laChuaThanhCong && (
                  <div style={{ marginTop:'8px', padding:'8px 10px', background:'#FFF7ED', borderRadius:'6px', fontSize:'12px', color:'#92400E' }}>
                    💡 <strong>{ketQua.includes('cửa hàng chịu') ? 'Cửa hàng chịu' : 'Khách trả'}</strong> chi phí vận chuyển/lắp đặt. Vui lòng điều chỉnh chi phí bên dưới.
                  </div>
                )}
              </div>

              {/* B. Tiền thu từ KH */}
              <div style={{ background:'#F0FDF4', borderRadius:'8px', padding:'12px 14px', border:'1px solid #BBF7D0' }}>
                <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'8px', color:'#15803D' }}>💵 Tiền thu từ khách hàng</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  <div>
                    <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Số tiền thu (đ)</label>
                    <input className="input" type="number" min="0" value={tienThuKH || ''} placeholder="0"
                      onChange={e => setTienThuKH(Number(e.target.value))} />
                    {Number(donModal?.['Còn phải thu'] || 0) > 0 && (
                      <button onClick={() => setTienThuKH(Number(donModal?.['Còn phải thu'] || 0))}
                        style={{ marginTop:'3px', padding:'2px 8px', border:'1px solid #BBF7D0', borderRadius:'4px', background:'white', cursor:'pointer', fontSize:'11px', color:'#15803D' }}>
                        Điền đủ: {fVND(donModal?.['Còn phải thu'])}
                      </button>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Hình thức thu</label>
                    <select className="input" value={hinhThucThu} onChange={e => setHinhThucThu(e.target.value)}>
                      <option>Tiền mặt</option>
                      <option>Chuyển khoản</option>
                      <option>Tiền mặt+chuyển khoản</option>
                      <option>KH nợ — chưa thu</option>
                      <option>KH CK thẳng cửa hàng</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* C. Chi phí / Thưởng */}
              <div style={{ background:laDT?'#FFF7ED':'#F0F9FF', borderRadius:'8px', padding:'12px 14px', border:`1px solid ${laDT?'#FED7AA':'#BAE6FD'}` }}>
                <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'8px', color:laDT?'#C2410C':'#0369A1' }}>
                  {laDT ? '💸 Chi phí trả đối tác (trả ngay)' : '🎁 Thưởng nhân viên (ghi nhận — trả cuối tháng)'}
                </div>
                <p style={{ fontSize:'11px', color:laDT?'#92400E':'#0369A1', margin:'0 0 10px', fontStyle:'italic' }}>
                  {laDT
                    ? 'Đối tác sẽ báo chi phí thực tế — điều chỉnh nếu khác lúc tạo chuyến'
                    : 'Thưởng sẽ được tổng hợp vào bảng chi trả cuối tháng'}
                </p>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                  <div>
                    <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>CP vận chuyển (đ)</label>
                    <input className="input" type="number" min="0" value={chiPhiVC || ''} placeholder="0"
                      onChange={e => setChiPhiVC(Number(e.target.value))} style={{ fontSize:'12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>CP lắp đặt (đ)</label>
                    <input className="input" type="number" min="0" value={chiPhiLap || ''} placeholder="0"
                      onChange={e => setChiPhiLap(Number(e.target.value))} style={{ fontSize:'12px' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Thưởng chuyến (đ)</label>
                    <input className="input" type="number" min="0" value={thuongChuyen || ''} placeholder="0"
                      onChange={e => setThuongChuyen(Number(e.target.value))} style={{ fontSize:'12px' }} />
                  </div>
                </div>
                {tongPhaiTra > 0 && (
                  <div style={{ marginTop:'6px', fontSize:'12px', fontWeight:700, color:laDT?'#DC2626':'#0369A1' }}>
                    Tổng {laDT ? 'phải trả' : 'thưởng'}: {fVND(tongPhaiTra)}
                  </div>
                )}
              </div>

              {/* D. Ghi chú */}
              <div>
                <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Ghi chú đối soát</label>
                <input className="input" placeholder="Ghi chú thêm..." value={ghiChu} onChange={e => setGhiChu(e.target.value)} />
              </div>

              {/* E. Hoàn thành đơn */}
              <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'10px 12px', background:'#F0FDF4', borderRadius:'8px', border:'1px solid #BBF7D0' }}>
                <input type="checkbox" checked={hoanThanhDon} onChange={e => setHoanThanhDon(e.target.checked)}
                  style={{ width:'16px', height:'16px', accentColor:'#16A34A' }} />
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#15803D' }}>Đánh dấu đơn hàng "Hoàn thành"</div>
                  <div style={{ fontSize:'11px', color:'#6B7280' }}>
                    Chỉ tick khi đã giao đủ toàn bộ sản phẩm trong đơn
                  </div>
                </div>
              </label>

              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={luuDoiSoat} disabled={loading}
                  style={{ flex:1, padding:'11px', borderRadius:'8px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
                  {loading ? '⏳ Đang lưu...' : '✅ Xác nhận đối soát'}
                </button>
                <button onClick={() => setModalGH(null)}
                  style={{ padding:'11px 16px', borderRadius:'8px', border:'1px solid var(--border)', background:'white', cursor:'pointer', fontSize:'14px' }}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
