'use client'
// components/DoiSoatClient.tsx
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
  const [filterTT, setFilterTT] = useState(filterParam ? 'Tất cả' : 'Chưa đối soát')
  const [modalGH,  setModalGH]  = useState<any>(null)
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState('')
  const [msgOk,    setMsgOk]    = useState(true)

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

  const chuaDS     = giaoHangList.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát').length
  const tongCP     = giaoHangList.reduce((s, g) => s + Number(g['Chi phí VC']||0) + Number(g['Chi phí lắp đặt']||0) + Number(g['Thưởng chuyến']||0), 0)
  const tongThuKH  = Object.values(doiSoatMap).reduce((s: number, ds: any) => s + Number(ds['Đã thu được']||0), 0)

  function moModal(gh: any) {
    const don = donHangMap[gh['Mã đơn hàng']]
    setModalGH(gh)
    setTienThuKH(Number(don?.['Còn phải thu'] || 0))
    setHinhThucThu('Tiền mặt')
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

  const donModal   = modalGH ? donHangMap[modalGH['Mã đơn hàng']] : null
  const laDT       = modalGH?.['Hình thức giao'] === 'Đối tác'
  const tongPhaiTra = (chiPhiVC || 0) + (chiPhiLap || 0) + (thuongChuyen || 0)

  return (
    <div style={{ padding: '20px' }}>
      <style>{`
        .ds-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;gap:12px;flex-wrap:wrap;}
        .ds-table th,.ds-table td{padding:8px 10px;}
        .ds-table tbody tr:hover td{background:#F0F4FF!important;}
        .overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        .modal{background:white;border-radius:12px;padding:24px;width:100%;max-width:480px;max-height:92vh;overflow-y:auto;}
        @media(max-width:900px){.col-cp{display:none;}}
        @media(max-width:650px){.col-nguoi,.col-vt{display:none;}}
      `}</style>

      {/* Header */}
      <div className="ds-hdr">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>💰 Đối soát giao hàng</h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 0' }}>
            {giaoHangList.length} chuyến
            {chuaDS > 0 && <span style={{ marginLeft:'8px', color:'#DC2626', fontWeight:600 }}>⚠️ {chuaDS} chuyến chưa đối soát</span>}
          </p>
        </div>
        {filterParam && <Link href="/dashboard/doi-soat" className="btn btn-ghost btn-sm">← Xem tất cả</Link>}
      </div>

      {msg && <div style={{ padding:'10px 14px', borderRadius:'8px', marginBottom:'14px', fontSize:'13px', background:msgOk?'#D1FAE5':'#FEE2E2', color:msgOk?'#065F46':'#991B1B' }}>{msg}</div>}

      {/* Tổng quan */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:'12px', marginBottom:'16px' }}>
        {[
          { icon:'🚚', label:'Tổng chuyến',    val:giaoHangList.length, c:'var(--primary)' },
          { icon:'⏳', label:'Chưa đối soát',  val:chuaDS, c:'#DC2626' },
          { icon:'✅', label:'Đã đối soát',    val:giaoHangList.length-chuaDS, c:'#065F46' },
          { icon:'💸', label:'Tổng chi phí',   val:fVND(tongCP), c:'#92400E' },
          { icon:'💵', label:'Đã thu từ KH',   val:fVND(tongThuKH), c:'#065F46' },
        ].map(({ icon, label, val, c }) => (
          <div key={label} className="card" style={{ padding:'12px 14px' }}>
            <div style={{ fontSize:'18px', marginBottom:'2px' }}>{icon}</div>
            <div style={{ fontSize:'16px', fontWeight:800, color:c }}>{val}</div>
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
          <table className="ds-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F0F4FF', borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã đơn</th>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày giao</th>
                <th style={{ textAlign:'left', fontWeight:700 }}>Khách hàng</th>
                <th className="col-nguoi" style={{ textAlign:'left', fontWeight:700 }}>Người giao</th>
                <th className="col-vt" style={{ textAlign:'left', fontWeight:700 }}>Vai trò</th>
                <th className="col-cp" style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>CP / Thưởng</th>
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
                      {chiPhi > 0 ? (
                        <span style={{ fontWeight:600, color:laDT?'#DC2626':'#065F46' }}>
                          {fVND(chiPhi)}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{
                        padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                        background:chuaDS?'#FEF3C7':'#D1FAE5', color:chuaDS?'#92400E':'#065F46', whiteSpace:'nowrap',
                      }}>
                        {chuaDS ? '⏳ Chưa' : '✅ Đã đối soát'}
                      </span>
                      {ds?.['Kết quả'] && ds['Kết quả'] !== 'Thành công' && (
                        <div style={{ fontSize:'10px', color:'#DC2626', marginTop:'2px' }}>{ds['Kết quả']}</div>
                      )}
                    </td>
                    <td>
                      {chuaDS ? (
                        <button onClick={() => moModal(g)}
                          style={{ padding:'5px 10px', borderRadius:'6px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap' }}>
                          💰 Đối soát
                        </button>
                      ) : (
                        <span style={{ fontSize:'11px', color:'var(--text-muted)' }}>{ds?.['Ghi chú'] || ''}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal đối soát */}
      {modalGH && (
        <div className="overlay" onClick={() => setModalGH(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:700, margin:0 }}>💰 Đối soát chuyến</h2>
              <button onClick={() => setModalGH(null)} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#6B7280' }}>✕</button>
            </div>

            {/* Info */}
            <div style={{ background:'var(--primary-pale)', borderRadius:'8px', padding:'12px 14px', marginBottom:'16px', fontSize:'13px' }}>
              <div style={{ fontWeight:700, color:'var(--primary)', marginBottom:'4px' }}>
                {modalGH['Tên NV/đối tác'] || '—'}
                {laDT
                  ? <span style={{ marginLeft:'8px', fontSize:'11px', padding:'2px 8px', borderRadius:'10px', background:'#FEF3C7', color:'#92400E' }}>Đối tác ngoài</span>
                  : <span style={{ marginLeft:'8px', fontSize:'11px', padding:'2px 8px', borderRadius:'10px', background:'#DBEAFE', color:'#1E40AF' }}>NV cửa hàng</span>
                }
              </div>
              <div>📋 {modalGH['Mã đơn hàng']} · {modalGH['Vai trò chuyến'] || '—'} · {fDT(modalGH['Ngày giao'])}</div>
              {Number(donModal?.['Còn phải thu'] || 0) > 0 && (
                <div style={{ color:'#DC2626', fontWeight:600, marginTop:'3px' }}>
                  📌 KH còn nợ: {fVND(donModal?.['Còn phải thu'])}
                </div>
              )}
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {/* Tiền thu KH */}
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

              {/* Chi phí / thưởng */}
              <div style={{ background:laDT?'#FFF7ED':'#F0F9FF', borderRadius:'8px', padding:'12px 14px', border:`1px solid ${laDT?'#FED7AA':'#BAE6FD'}` }}>
                <div style={{ fontWeight:700, fontSize:'13px', marginBottom:'8px', color:laDT?'#C2410C':'#0369A1' }}>
                  {laDT ? '💸 Chi phí trả đối tác (trả ngay)' : '🎁 Thưởng nhân viên (cuối tháng)'}
                </div>
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

              {/* Kết quả */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Kết quả</label>
                  <select className="input" value={ketQua} onChange={e => setKetQua(e.target.value)}>
                    <option>Thành công</option>
                    <option>Hoàn trả</option>
                    <option>Đổi hàng</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize:'11px', fontWeight:600, display:'block', marginBottom:'3px' }}>Ghi chú</label>
                  <input className="input" placeholder="Ghi chú..." value={ghiChu} onChange={e => setGhiChu(e.target.value)} />
                </div>
              </div>

              {/* Hoàn thành đơn */}
              <label style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer', padding:'10px 12px', background:'#F0FDF4', borderRadius:'8px', border:'1px solid #BBF7D0' }}>
                <input type="checkbox" checked={hoanThanhDon} onChange={e => setHoanThanhDon(e.target.checked)}
                  style={{ width:'16px', height:'16px', accentColor:'#16A34A' }} />
                <div>
                  <div style={{ fontSize:'13px', fontWeight:600, color:'#15803D' }}>Đánh dấu đơn hàng "Hoàn thành"</div>
                  <div style={{ fontSize:'11px', color:'#6B7280' }}>Đã giao đủ tất cả sản phẩm, đơn hoàn tất</div>
                </div>
              </label>

              <div style={{ display:'flex', gap:'10px' }}>
                <button onClick={luuDoiSoat} disabled={loading} style={{ flex:1, padding:'11px', borderRadius:'8px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, fontSize:'14px', cursor:'pointer' }}>
                  {loading ? '⏳ Đang lưu...' : '✅ Xác nhận đối soát'}
                </button>
                <button onClick={() => setModalGH(null)} style={{ padding:'11px 16px', borderRadius:'8px', border:'1px solid var(--border)', background:'white', cursor:'pointer', fontSize:'14px' }}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
