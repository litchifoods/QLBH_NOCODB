'use client'
// components/KhachHangClient.tsx
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

function boDau(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase()
}

const DOI_TUONG = ['Cá nhân', 'Cơ quan', 'Công ty', 'Đại lý']

export default function KhachHangClient({
  danhSachKH, tongSo, user,
}: {
  danhSachKH: any[]
  tongSo: number
  user: UserSession
}) {
  const router = useRouter()
  const [search, setSearch]       = useState('')
  const [doiTuong, setDoiTuong]   = useState('Tất cả')
  const [showForm, setShowForm]   = useState(false)
  const [loading, setLoading]     = useState(false)
  const [msg, setMsg]             = useState('')
  const [msgType, setMsgType]     = useState<'ok'|'err'>('ok')

  // Form thêm KH mới
  const [form, setForm] = useState({
    tenKH: '', sdt: '', diaChi: '', doiTuongKH: 'Cá nhân', ghiChu: '',
  })

  // Tự tạo mã KH mới
  const nextMaKH = useMemo(() => {
    const soLon = danhSachKH.reduce((max, kh) => {
      const ma = kh['Mã KH'] || ''
      const so = parseInt(ma.replace(/\D/g, '')) || 0
      return Math.max(max, so)
    }, 0)
    return `KH-${String(soLon + 1).padStart(3, '0')}`
  }, [danhSachKH])

  // Lọc danh sách
  const filtered = useMemo(() => {
    return danhSachKH.filter(kh => {
      if (doiTuong !== 'Tất cả' && kh['Đối tượng khách hàng'] !== doiTuong) return false
      if (search) {
        const q = boDau(search)
        return (
          boDau(kh['Tên khách hàng'] || '').includes(q) ||
          (kh['Số điện thoại'] || '').includes(search) ||
          boDau(kh['Mã KH'] || '').includes(q) ||
          boDau(kh['Địa chỉ'] || '').includes(q)
        )
      }
      return true
    })
  }, [danhSachKH, search, doiTuong])

  function setF(key: string, val: string) {
    setForm(prev => ({ ...prev, [key]: val }))
  }

  async function luuKH() {
    if (!form.tenKH.trim()) { setMsg('Vui lòng nhập tên khách hàng'); setMsgType('err'); return }
    setLoading(true); setMsg('')
    try {
      const res = await fetch('/api/khach-hang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          'Mã KH':                nextMaKH,
          'Tên khách hàng':       form.tenKH.trim(),
          'Số điện thoại':        form.sdt.trim(),
          'Địa chỉ':              form.diaChi.trim(),
          'Đối tượng khách hàng': form.doiTuongKH,
          'Ghi chú':              form.ghiChu.trim(),
          'Ngày tạo':             new Date().toISOString().split('T')[0],
        }),
      })
      if (!res.ok) throw new Error('Lỗi lưu')
      setMsg(`✅ Đã thêm khách hàng ${form.tenKH} (${nextMaKH})`)
      setMsgType('ok')
      setForm({ tenKH:'', sdt:'', diaChi:'', doiTuongKH:'Cá nhân', ghiChu:'' })
      setShowForm(false)
      router.refresh()
    } catch {
      setMsg('❌ Lỗi, thử lại'); setMsgType('err')
    } finally {
      setLoading(false)
      setTimeout(() => setMsg(''), 4000)
    }
  }

  return (
    <div style={{ padding:'20px' }}>
      <style>{`
        .kh-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; }
        .btn-them-kh {
          background:var(--primary); color:white; border:none; border-radius:8px;
          padding:10px 16px; font-size:14px; font-weight:600;
          white-space:nowrap; flex-shrink:0; cursor:pointer;
          display:inline-flex; align-items:center; gap:6px;
        }
        .btn-them-kh:hover { opacity:0.9; }
        .kh-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:12px; }
        .kh-card {
          border:1px solid var(--border); border-radius:10px; padding:14px;
          background:white; transition:box-shadow 0.15s;
        }
        .kh-card:hover { box-shadow:0 4px 12px rgba(0,0,0,0.08); }
        .overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.4); z-index:200;
          display:flex; align-items:center; justify-content:center; padding:16px;
        }
        .modal {
          background:white; border-radius:12px; padding:24px;
          width:100%; max-width:460px; max-height:90vh; overflow-y:auto;
        }
        @media (max-width:600px) {
          .kh-grid { grid-template-columns:1fr; }
          .kh-header { flex-wrap:wrap; }
        }
      `}</style>

      {/* Header */}
      <div className="kh-header">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>
            👥 Khách hàng
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 0' }}>
            {filtered.length}/{tongSo} khách hàng
          </p>
        </div>
        <button className="btn-them-kh" onClick={() => setShowForm(true)}>
          ➕ Thêm khách hàng
        </button>
      </div>

      {/* Thông báo */}
      {msg && (
        <div style={{
          padding:'10px 14px', borderRadius:'8px', marginBottom:'14px', fontSize:'13px',
          background: msgType==='ok' ? '#D1FAE5' : '#FEE2E2',
          color: msgType==='ok' ? '#065F46' : '#991B1B',
        }}>{msg}</div>
      )}

      {/* Filter */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <input className="input" placeholder="🔍 Tìm tên, SĐT, địa chỉ..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex:'1', minWidth:'180px', maxWidth:'300px' }} />
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {['Tất cả', ...DOI_TUONG].map(dt => (
              <button key={dt} onClick={() => setDoiTuong(dt)}
                style={{
                  padding:'5px 12px', borderRadius:'20px', border:'1px solid',
                  borderColor: doiTuong===dt ? 'var(--primary)' : 'var(--border)',
                  background: doiTuong===dt ? 'var(--primary)' : 'white',
                  color: doiTuong===dt ? 'white' : 'var(--text-secondary)',
                  fontWeight: doiTuong===dt ? 700 : 400,
                  fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap',
                }}>{dt}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Danh sách dạng card */}
      {filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
          Không tìm thấy khách hàng nào
        </div>
      ) : (
        <div className="kh-grid">
          {filtered.map((kh: any, i: number) => (
            <div key={i} className="kh-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                <div>
                  <div style={{ fontWeight:700, fontSize:'14px' }}>{kh['Tên khách hàng']}</div>
                  <div style={{ fontSize:'11px', color:'var(--text-secondary)', marginTop:'2px' }}>{kh['Mã KH']}</div>
                </div>
                {kh['Đối tượng khách hàng'] && (
                  <span style={{
                    fontSize:'11px', padding:'2px 8px', borderRadius:'20px',
                    background:'var(--primary-pale)', color:'var(--primary)', fontWeight:600,
                    whiteSpace:'nowrap',
                  }}>{kh['Đối tượng khách hàng']}</span>
                )}
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:'4px', fontSize:'12px' }}>
                {kh['Số điện thoại'] && (
                  <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                    <span>📞</span>
                    <a href={`tel:${kh['Số điện thoại']}`}
                      style={{ color:'var(--primary)', textDecoration:'none', fontWeight:600 }}>
                      {kh['Số điện thoại']}
                    </a>
                  </div>
                )}
                {kh['Địa chỉ'] && (
                  <div style={{ display:'flex', alignItems:'flex-start', gap:'6px', color:'var(--text-secondary)' }}>
                    <span>📍</span><span>{kh['Địa chỉ']}</span>
                  </div>
                )}
                {kh['Ghi chú'] && (
                  <div style={{ color:'var(--text-muted)', fontStyle:'italic', fontSize:'11px' }}>
                    {kh['Ghi chú']}
                  </div>
                )}
              </div>
              <div style={{ marginTop:'10px', display:'flex', gap:'6px' }}>
                <Link href={`/dashboard/don-hang/tao?maKH=${kh['Mã KH']}`}
                  style={{
                    flex:1, textAlign:'center', padding:'6px', borderRadius:'6px',
                    background:'var(--primary)', color:'white', textDecoration:'none',
                    fontSize:'12px', fontWeight:600,
                  }}>
                  ➕ Tạo đơn
                </Link>
                <Link href={`/dashboard/don-hang?q=${kh['Mã KH']}`}
                  style={{
                    flex:1, textAlign:'center', padding:'6px', borderRadius:'6px',
                    border:'1px solid var(--border)', color:'var(--text-secondary)',
                    textDecoration:'none', fontSize:'12px',
                  }}>
                  📋 Xem đơn
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal thêm KH mới */}
      {showForm && (
        <div className="overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px' }}>
              <h2 style={{ fontSize:'16px', fontWeight:700, margin:0 }}>➕ Thêm khách hàng mới</h2>
              <button onClick={() => setShowForm(false)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'var(--text-secondary)' }}>✕</button>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>
                  Mã KH (tự động) <span style={{ color:'var(--primary)', fontWeight:700 }}>{nextMaKH}</span>
                </label>
              </div>

              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>
                  Tên khách hàng *
                </label>
                <input className="input" placeholder="Nhập tên khách hàng..."
                  value={form.tenKH} onChange={e => setF('tenKH', e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>Số điện thoại</label>
                <input className="input" placeholder="0912 345 678" type="tel"
                  value={form.sdt} onChange={e => setF('sdt', e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>Địa chỉ</label>
                <input className="input" placeholder="Số nhà, đường, phường, quận..."
                  value={form.diaChi} onChange={e => setF('diaChi', e.target.value)} />
              </div>

              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>Đối tượng</label>
                <select className="input" value={form.doiTuongKH} onChange={e => setF('doiTuongKH', e.target.value)}>
                  {DOI_TUONG.map(dt => <option key={dt}>{dt}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize:'12px', fontWeight:600, display:'block', marginBottom:'4px' }}>Ghi chú</label>
                <textarea className="input" rows={2} placeholder="Ghi chú thêm..."
                  value={form.ghiChu} onChange={e => setF('ghiChu', e.target.value)}
                  style={{ resize:'vertical' }} />
              </div>

              <div style={{ display:'flex', gap:'10px', marginTop:'4px' }}>
                <button onClick={luuKH} disabled={loading}
                  style={{
                    flex:1, padding:'11px', borderRadius:'8px', border:'none',
                    background:'var(--primary)', color:'white', fontWeight:700,
                    fontSize:'14px', cursor:'pointer',
                  }}>
                  {loading ? '⏳ Đang lưu...' : '✅ Lưu khách hàng'}
                </button>
                <button onClick={() => setShowForm(false)}
                  style={{
                    padding:'11px 16px', borderRadius:'8px',
                    border:'1px solid var(--border)', background:'white',
                    cursor:'pointer', fontSize:'14px',
                  }}>Huỷ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
