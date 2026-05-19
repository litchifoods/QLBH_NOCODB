'use client'
// components/DonHangClient.tsx
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { UserSession } from '@/lib/auth'

function formatVND(n: number) {
  return n?.toLocaleString('vi-VN') || '0'
}
function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function badgeColor(tt: string) {
  const map: Record<string,{bg:string,color:string}> = {
    'Chờ giao':   { bg:'#FEF3C7', color:'#92400E' },
    'Đang giao':  { bg:'#DBEAFE', color:'#1E40AF' },
    'Hoàn thành': { bg:'#D1FAE5', color:'#065F46' },
    'Huỷ':        { bg:'#FEE2E2', color:'#991B1B' },
  }
  return map[tt] || { bg:'#F3F4F6', color:'#374151' }
}

const TRANG_THAI = ['Tất cả','Chờ giao','Đang giao','Hoàn thành','Huỷ']
const KENH = ['Tất cả','Trực tiếp','Zalo','Facebook','Điện thoại','Online']

export default function DonHangClient({
  donHang, user, searchParams
}: {
  donHang: any[], user: UserSession, searchParams: any
}) {
  const [trangThai, setTrangThai] = useState(searchParams.trang_thai || 'Tất cả')
  const [kenh, setKenh]           = useState(searchParams.kenh || 'Tất cả')
  const [search, setSearch]       = useState(searchParams.q || '')

  const filtered = useMemo(() => {
    return donHang.filter(d => {
      if (trangThai !== 'Tất cả' && d['Trạng thái'] !== trangThai) return false
      if (kenh !== 'Tất cả' && d['Kênh bán'] !== kenh) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (d['Mã đơn hàng'] || '').toLowerCase().includes(q) ||
          (d['Mã KH'] || '').toLowerCase().includes(q) ||
          (d['Nhân viên bán'] || '').toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [donHang, trangThai, kenh, search])

  const tongTien = filtered.reduce((s: number, d: any) => s + (Number(d['Tổng tiền đơn']) || 0), 0)

  return (
    <div style={{ padding: '20px 20px' }}>
      <style>{`
        .don-hang-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          gap: 12px;
        }
        .btn-tao-don {
          background: var(--primary);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn-tao-don:hover { opacity: 0.9; }

        /* Ẩn cột ít quan trọng trên mobile */
        @media (max-width: 768px) {
          .col-kenh, .col-htgiao, .col-nvban, .col-xuathd { display: none; }
          .don-hang-header { flex-wrap: wrap; }
          .filter-bar { flex-direction: column; }
          .filter-tt { overflow-x: auto; }
        }
        @media (max-width: 500px) {
          .col-ngaygiao, .col-datcoc { display: none; }
        }
      `}</style>

      {/* Header */}
      <div className="don-hang-header">
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'20px', fontWeight:700, margin:0 }}>
            📋 Đơn hàng
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'13px', margin:'2px 0 0' }}>
            {filtered.length} đơn • Tổng: {formatVND(tongTien)}đ
          </p>
        </div>
        <Link href="/dashboard/don-hang/tao" className="btn-tao-don">
          ➕ Tạo đơn mới
        </Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding:'12px 14px', marginBottom:'14px' }}>
        <div className="filter-bar" style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'center' }}>
          <input
            className="input" placeholder="🔍 Tìm mã đơn, mã KH..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex:'1', minWidth:'160px', maxWidth:'280px' }}
          />
          <div className="filter-tt" style={{ display:'flex', gap:'5px', flexWrap:'wrap' }}>
            {TRANG_THAI.map(tt => {
              const c = tt !== 'Tất cả' ? badgeColor(tt) : null
              const isActive = trangThai === tt
              return (
                <button key={tt} onClick={() => setTrangThai(tt)}
                  style={{
                    padding:'5px 12px', borderRadius:'20px', border:'1px solid',
                    borderColor: isActive ? (c?.color || 'var(--primary)') : 'var(--border)',
                    background: isActive ? (c?.bg || 'var(--primary)') : 'white',
                    color: isActive ? (c?.color || 'white') : 'var(--text-secondary)',
                    fontWeight: isActive ? 700 : 400,
                    fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap',
                  }}>
                  {tt}
                </button>
              )
            })}
          </div>
          <select className="input" value={kenh} onChange={e => setKenh(e.target.value)}
            style={{ width:'auto', minWidth:'120px' }}>
            {KENH.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {/* Table - desktop */}
      <div className="card" style={{ display:'block' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead>
              <tr style={{ background:'#F8FAFC', borderBottom:'2px solid var(--border)' }}>
                <th style={{ padding:'10px 12px', textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Mã đơn</th>
                <th style={{ padding:'10px 8px', textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày</th>
                <th style={{ padding:'10px 8px', textAlign:'left', fontWeight:700 }}>KH</th>
                <th className="col-kenh" style={{ padding:'10px 8px', textAlign:'left', fontWeight:700 }}>Kênh</th>
                <th className="col-ngaygiao" style={{ padding:'10px 8px', textAlign:'left', fontWeight:700, whiteSpace:'nowrap' }}>Ngày giao</th>
                <th className="col-htgiao" style={{ padding:'10px 8px', textAlign:'left', fontWeight:700 }}>HT giao</th>
                <th style={{ padding:'10px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>Tổng tiền</th>
                <th className="col-datcoc" style={{ padding:'10px 8px', textAlign:'right', fontWeight:700 }}>Cọc</th>
                <th style={{ padding:'10px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap' }}>Còn lại</th>
                <th style={{ padding:'10px 8px', textAlign:'center', fontWeight:700 }}>Trạng thái</th>
                <th className="col-nvban" style={{ padding:'10px 8px', textAlign:'left', fontWeight:700 }}>NV</th>
                <th style={{ padding:'10px 8px', width:'70px' }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
                    Không tìm thấy đơn hàng nào
                  </td>
                </tr>
              ) : filtered.map((don: any, i: number) => {
                const tt = don['Trạng thái'] || 'Mới'
                const c = badgeColor(tt)
                const conLai = Number(don['Còn phải thu'] || 0)
                return (
                  <tr key={i} style={{ borderBottom:'1px solid var(--border)', background: i%2===0 ? 'white' : '#FAFBFD' }}>
                    <td style={{ padding:'10px 12px' }}>
                      <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                        style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none', whiteSpace:'nowrap' }}>
                        {don['Mã đơn hàng']}
                      </Link>
                    </td>
                    <td style={{ padding:'10px 8px', color:'var(--text-secondary)', fontSize:'12px', whiteSpace:'nowrap' }}>
                      {formatDate(don['Ngày đặt'] || don['Ngày bán'])}
                    </td>
                    <td style={{ padding:'10px 8px', fontWeight:600 }}>{don['Mã KH'] || '—'}</td>
                    <td className="col-kenh" style={{ padding:'10px 8px', fontSize:'12px', color:'var(--text-secondary)' }}>
                      {don['Kênh bán'] || '—'}
                    </td>
                    <td className="col-ngaygiao" style={{ padding:'10px 8px', fontSize:'12px', whiteSpace:'nowrap' }}>
                      {formatDate(don['Ngày hẹn giao'])}
                    </td>
                    <td className="col-htgiao" style={{ padding:'10px 8px' }}>
                      {don['Hình thức giao hàng'] && (
                        <span style={{ fontSize:'11px', background:'var(--primary-pale)', color:'var(--primary)', padding:'2px 6px', borderRadius:'4px', fontWeight:600, whiteSpace:'nowrap' }}>
                          {don['Hình thức giao hàng'] === 'Giao hàng cho khách' ? '🚚' : '🏃'} {don['Hình thức giao hàng']}
                        </span>
                      )}
                    </td>
                    <td style={{ padding:'10px 8px', fontWeight:700, textAlign:'right', whiteSpace:'nowrap' }}>
                      {formatVND(Number(don['Tổng tiền đơn']))}đ
                    </td>
                    <td className="col-datcoc" style={{ padding:'10px 8px', color:'var(--success)', fontWeight:600, textAlign:'right', whiteSpace:'nowrap' }}>
                      {formatVND(Number(don['Đặt cọc']))}đ
                    </td>
                    <td style={{ padding:'10px 8px', textAlign:'right', fontWeight:700, whiteSpace:'nowrap',
                      color: conLai > 0 ? '#DC2626' : '#16A34A' }}>
                      {formatVND(conLai)}đ
                    </td>
                    <td style={{ padding:'10px 8px', textAlign:'center' }}>
                      <span style={{
                        padding:'3px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:700,
                        background: c.bg, color: c.color, whiteSpace:'nowrap',
                      }}>{tt}</span>
                    </td>
                    <td className="col-nvban" style={{ padding:'10px 8px', fontSize:'12px', color:'var(--text-secondary)' }}>
                      {don['Nhân viên bán'] || '—'}
                    </td>
                    <td style={{ padding:'10px 8px' }}>
                      <div style={{ display:'flex', gap:'2px' }}>
                        <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                          className="btn btn-ghost btn-sm" title="Xem chi tiết" style={{ padding:'4px 6px' }}>👁️</Link>
                        <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}/in`}
                          className="btn btn-ghost btn-sm" title="In hoá đơn" style={{ padding:'4px 6px' }}>🖨️</Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
