'use client'
// components/GiaoHangClient.tsx
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function formatVND(n: number | string) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ'
}
function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function formatDateTime(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}

const TINH_TRANG = ['Chưa đối soát', 'Đã đối soát']

export default function GiaoHangClient({
  giaoHang, donChuaGiao, nhanVien, user,
}: {
  giaoHang: any[]
  donChuaGiao: any[]
  nhanVien: any[]
  user: UserSession
}) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [msg, setMsg]           = useState('')
  const [msgType, setMsgType]   = useState<'ok'|'err'>('ok')
  const [filterTT, setFilterTT] = useState('Tất cả')

  // Form tạo chuyến giao
  const [form, setForm] = useState({
    maDon:      '',
    nguoiGiao:  '',
    ngayGiao:   new Date().toISOString().slice(0,16),
    chiPhiVC:   0,
    chiPhiLap:  0,
    ghiChu:     '',
  })

  // Lọc danh sách giao hàng (bỏ rỗng)
  const giaoHopLe = useMemo(() =>
    giaoHang.filter(g => g['Mã đơn hàng'] && g['Mã đơn hàng'].toString().trim() !== '')
  , [giaoHang])

  const filtered = useMemo(() => {
    if (filterTT === 'Tất cả') return giaoHopLe
    return giaoHopLe.filter(g => g['Tình trạng đối soát'] === filterTT)
  }, [giaoHopLe, filterTT])

  // Số chuyến chưa đối soát
  const chuaDoiSoat = giaoHopLe.filter(g => g['Tình trạng đối soát'] !== 'Đã đối soát').length

  function setF(key: string, val: any) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  // Lấy thông tin đơn khi chọn
  const donDaChon = donChuaGiao.find(d => d['Mã đơn hàng'] === form.maDon)

  async function luuGiaoHang() {
    if (!form.maDon) { setMsg('Vui lòng chọn đơn hàng'); setMsgType('err'); return }
    if (!form.nguoiGiao) { setMsg('Vui lòng nhập người giao'); setMsgType('err'); return }

    setLoading(true); setMsg('')
    try {
      // Tạo mã giao hàng
      const maGiao = `GH-${form.maDon}-${Date.now().toString().slice(-4)}`

      const res = await fetch('/api/giao-hang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'Mã giao hàng':         maGiao,
          'Mã đơn hàng':          form.maDon,
          'Người giao':           form.nguoiGiao,
          'Ngày giao':            form.ngayGiao,
          'Chi phí vận chuyển':   form.chiPhiVC,
          'Chi phí lắp đặt':      form.chiPhiLap,
          'Ghi chú':              form.ghiChu,
          'Tình trạng đối soát':  'Chưa đối soát',
        }),
      })
      if (!res.ok) throw new Error('Lỗi tạo chuyến giao')

      setMsg(`✅ Đã tạo chuyến giao cho đơn ${form.maDon}`)
      setMsgType('ok')
      setForm({ maDon:'', nguoiGiao:'', ngayGiao:new Date().toISOString().slice(0,16), chiPhiVC:0, chiPhiLap:0, ghiChu:'' })
      setShowForm(false)
      router.refresh()
    } catch (err: any) {
      setMsg('❌ Lỗi, thử lại'); setMsgType('err')
    } finally {
      setLoading(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  return (
    <div style={{ padding:'20px' }}>
      <style>{`
        .gh-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; }
        .btn-tao-gh {
          background:var(--primary); color:white; border:none; border-radius:8px;
          padding:10px 18px; font-size:14px; font-weight:600;
          white-space:nowrap; flex-shrink:0; cursor:pointer;
          display:inline-flex; align-items:center; gap:6px;
        }
        .btn-tao-gh:hover { opacity:0.9; }
        .gh-table th, .gh-table td { padding:9px 11px; }
        .gh-table tr:hover td { background:#F0F4FF !important; }
        .overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); z-index:200; display:flex; align-items:center; justify-content:center; padding:16px; }
        .modal { background:white; border-radius:12px; padding:24px; width:100%; max-width:460px; max-height:90vh; overflow-y:auto; }
        @media (max-width:700px) {
          .col-chiphi, .col-ghichu { display:none; }
          .gh-header { flex-wrap:wrap; }
        }
      `}</style>

      {/* Header */}
      <div className="gh-header">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>
            🚚 Giao hàng
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 0' }}>
            {giaoHopLe.length} chuyến
            {chuaDoiSoat > 0 && (
              <span style={{ marginLeft:'8px', color:'#DC2626', fontWeight:600 }}>
                ⚠️ {chuaDoiSoat} chuyến chưa đối soát
              </span>
            )}
          </p>
        </div>
        <button className="btn-tao-gh" onClick={() => setShowForm(true)}>
          🚚 Tạo chuyến giao
        </button>
      </div>

      {msg && (
        <div style={{
          padding:'10px 14px', borderRadius:'8px', marginBottom:'14px', fontSize:'13px',
          background: msgType==='ok' ? '#D1FAE5' : '#FEE2E2',
          color: msgType==='ok' ? '#065F46' : '#991B1B',
        }}>{msg}</div>
      )}

      {/* Filter */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
          {['Tất cả', ...TINH_TRANG].map(tt => (
            <button key={tt} onClick={() => setFilterTT(tt)} style={{
              padding:'5px 14px', borderRadius:'20px', border:'1px solid',
              borderColor: filterTT===tt ? 'var(--primary)' : 'var(--border)',
              background: filterTT===tt ? 'var(--primary-pale)' : 'white',
              color: filterTT===tt ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: filterTT===tt ? 700 : 400,
              fontSize:'12px', cursor:'pointer',
            }}>{tt}</button>
          ))}
          <span style={{ fontSize:'12px', color:'var(--text-secondary)', marginLeft:'auto' }}>
            Hiển thị: {filtered.length} chuyến
          </span>
        </div>
      </div>

      {/* Bảng */}
      <div className="card">
        <div style={{ overflowX:'auto' }}>
          <table className="gh-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F0F4FF', borderBottom:'2px solid var(--border)' }}>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã đơn</th>
                <th style={{ textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày giao</th>
                <th style={{ textAlign:'left', fontWeight:700 }}>Người giao</th>
                <th className="col-chiphi" style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>CP vận chuyển</th>
                <th className="col-chiphi" style={{ textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>CP lắp đặt</th>
                <th style={{ textAlign:'center', fontWeight:700 }}>Đối soát</th>
                <th className="col-ghichu" style={{ textAlign:'left', fontWeight:700 }}>Ghi chú</th>
                <th style={{ width:'60px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>
                    Chưa có chuyến giao nào
                  </td>
                </tr>
              ) : filtered.map((g: any, i: number) => {
                const chuaDS = g['Tình trạng đối soát'] !== 'Đã đối soát'
                return (
                  <tr key={i} style={{ borderBottom:'1px solid #F0F0F0', background: i%2===0 ? 'white' : '#FAFBFD' }}>
                    <td>
                      <Link href={`/dashboard/don-hang/${g['Mã đơn hàng']}`}
                        style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                        {g['Mã đơn hàng']}
                      </Link>
                    </td>
                    <td style={{ fontSize:'12px', whiteSpace:'nowrap', color:'var(--text-secondary)' }}>
                      {formatDateTime(g['Ngày giao'])}
                    </td>
                    <td style={{ fontWeight:600 }}>{g['Người giao'] || '—'}</td>
                    <td className="col-chiphi" style={{ textAlign:'right', color:'var(--text-secondary)' }}>
                      {g['Chi phí vận chuyển'] ? formatVND(g['Chi phí vận chuyển']) : '—'}
                    </td>
                    <td className="col-chiphi" style={{ textAlign:'right', color:'var(--text-secondary)' }}>
                      {g['Chi phí lắp đặt'] ? formatVND(g['Chi phí lắp đặt']) : '—'}
                    </td>
                    <td style={{ textAlign:'center' }}>
                      <span style={{
                        padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                        background: chuaDS ? '#FEF3C7' : '#D1FAE5',
                        color: chuaDS ? '#92400E' : '#065F46',
                        whiteSpace:'nowrap',
                      }}>
                        {chuaDS ? '⏳ Chưa đối soát' : '✅ Đã đối soát'}
                      </span>
                    </td>
                    <td className="col-ghichu" style={{ fontSize:'12px', color:'var(--text-secondary)' }}>
                      {g['Ghi chú'] || '—'}
                    </td>
                    <td>
                      <Link href={`/dashboard/doi-soat?maDon=${g['Mã đơn hàng']}`}
                        className="btn btn-ghost btn-sm" title="Đối soát" style={{ padding:'4px 6px', fontSize:'12px' }}>
                        💰
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal tạo chuyến giao */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'18px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:700, margin:0 }}>🚚 Tạo chuyến giao hàng</h2>
              <button onClick={() => setShowForm(false)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'var(--text-secondary)' }}>✕</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {/* Chọn đơn hàng */}
              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>Đơn hàng *</label>
                <select className="input" value={form.maDon} onChange={e => setF('maDon', e.target.value)}>
                  <option value="">-- Chọn đơn hàng --</option>
                  {donChuaGiao.map(d => (
                    <option key={d['Mã đơn hàng']} value={d['Mã đơn hàng']}>
                      {d['Mã đơn hàng']} — KH: {d['Mã KH']} — Còn thu: {Number(d['Còn phải thu']||0).toLocaleString('vi-VN')}đ
                    </option>
                  ))}
                </select>
                {donDaChon && (
                  <div style={{ marginTop:'6px', padding:'8px 10px', background:'var(--primary-pale)', borderRadius:'6px', fontSize:'12px' }}>
                    <div>📍 {donDaChon['Địa chỉ giao'] || 'Chưa có địa chỉ'}</div>
                    <div style={{ color:'#DC2626', fontWeight:600, marginTop:'2px' }}>
                      Còn phải thu: {Number(donDaChon['Còn phải thu']||0).toLocaleString('vi-VN')}đ
                    </div>
                  </div>
                )}
              </div>

              {/* Người giao */}
              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>Người giao *</label>
                <input className="input" list="nhan-vien-list"
                  placeholder="Tên người giao hoặc chọn từ danh sách..."
                  value={form.nguoiGiao} onChange={e => setF('nguoiGiao', e.target.value)} />
                <datalist id="nhan-vien-list">
                  {nhanVien.map(nv => (
                    <option key={nv['Mã NV']} value={nv['Họ tên']} />
                  ))}
                </datalist>
              </div>

              {/* Ngày giờ giao */}
              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>Ngày giờ giao</label>
                <input className="input" type="datetime-local" value={form.ngayGiao}
                  onChange={e => setF('ngayGiao', e.target.value)} />
              </div>

              {/* Chi phí */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>CP vận chuyển (đ)</label>
                  <input className="input" type="number" min="0" value={form.chiPhiVC || ''}
                    placeholder="0" onChange={e => setF('chiPhiVC', Number(e.target.value))} />
                </div>
                <div>
                  <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>CP lắp đặt (đ)</label>
                  <input className="input" type="number" min="0" value={form.chiPhiLap || ''}
                    placeholder="0" onChange={e => setF('chiPhiLap', Number(e.target.value))} />
                </div>
              </div>

              {/* Ghi chú */}
              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>Ghi chú</label>
                <textarea className="input" rows={2} placeholder="Ghi chú thêm..."
                  value={form.ghiChu} onChange={e => setF('ghiChu', e.target.value)}
                  style={{ resize:'vertical' }} />
              </div>

              <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                <button onClick={luuGiaoHang} disabled={loading} style={{
                  flex:1, padding:'11px', borderRadius:'8px', border:'none',
                  background:'var(--primary)', color:'white', fontWeight:700, fontSize:'14px', cursor:'pointer',
                }}>{loading ? '⏳ Đang lưu...' : '✅ Xác nhận giao hàng'}</button>
                <button onClick={() => setShowForm(false)} style={{
                  padding:'11px 16px', borderRadius:'8px', border:'1px solid var(--border)',
                  background:'white', cursor:'pointer', fontSize:'14px',
                }}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
