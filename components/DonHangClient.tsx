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
function badge(tt: string) {
  const map: Record<string,string> = {
    'Chờ giao':'badge-warning','Đang giao':'badge-info',
    'Hoàn thành':'badge-success','Huỷ':'badge-danger',
  }
  return map[tt] || 'badge-neutral'
}

const TRANG_THAI = ['Tất cả','Chờ giao','Đang giao','Hoàn thành','Huỷ']
const KENH = ['Tất cả','Trực tiếp','Zalo','Facebook','Điện thoại']

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
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontFamily:'Playfair Display,serif', fontSize:'24px', fontWeight:700 }}>
            📋 Đơn hàng
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:'14px', marginTop:'2px' }}>
            {filtered.length} đơn • Tổng: {formatVND(tongTien)}đ
          </p>
        </div>
        <Link href="/dashboard/don-hang/tao" className="btn btn-primary">
          ➕ Tạo đơn mới
        </Link>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding:'16px', marginBottom:'20px' }}>
        <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', alignItems:'center' }}>
          {/* Search */}
          <input
            className="input" placeholder="🔍 Tìm mã đơn, mã KH, nhân viên..."
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex:'1', minWidth:'200px', maxWidth:'320px' }}
          />
          {/* Trạng thái */}
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
            {TRANG_THAI.map(tt => (
              <button key={tt}
                onClick={() => setTrangThai(tt)}
                className={`btn btn-sm ${trangThai === tt ? 'btn-primary' : 'btn-ghost'}`}
              >{tt}</button>
            ))}
          </div>
          {/* Kênh */}
          <select
            className="input" value={kenh} onChange={e => setKenh(e.target.value)}
            style={{ width:'auto', minWidth:'140px' }}
          >
            {KENH.map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Ngày đặt</th>
                <th>Mã KH</th>
                <th>Kênh</th>
                <th>Ngày giao</th>
                <th>HT giao</th>
                <th>Tổng tiền</th>
                <th>Đặt cọc</th>
                <th>Còn lại</th>
                <th>Trạng thái</th>
                <th>NV bán</th>
                <th>Xuất HĐ</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} style={{ textAlign:'center', padding:'40px', color:'var(--text-muted)' }}>
                  Không tìm thấy đơn hàng nào
                </td></tr>
              ) : filtered.map((don: any, i: number) => (
                <tr key={i}>
                  <td>
                    <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                      style={{ color:'var(--primary)', fontWeight:700, textDecoration:'none' }}>
                      {don['Mã đơn hàng']}
                    </Link>
                  </td>
                  <td style={{ color:'var(--text-secondary)', fontSize:'13px' }}>{formatDate(don['Ngày đặt'])}</td>
                  <td style={{ fontWeight:600 }}>{don['Mã KH'] || '—'}</td>
                  <td><span style={{ fontSize:'12px', color:'var(--text-secondary)' }}>{don['Kênh bán'] || '—'}</span></td>
                  <td style={{ fontSize:'13px' }}>{formatDate(don['Ngày hẹn giao'])}</td>
                  <td>
                    {don['Hình thức giao hàng'] && (
                      <span style={{ fontSize:'11px', background:'var(--primary-pale)', color:'var(--primary)', padding:'2px 7px', borderRadius:'4px', fontWeight:600 }}>
                        {don['Hình thức giao hàng'] === 'Cửa hàng giao' ? '🚚' : '🏃'} {don['Hình thức giao hàng']}
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight:700 }}>{formatVND(Number(don['Tổng tiền đơn']))}đ</td>
                  <td style={{ color:'var(--success)', fontWeight:600 }}>{formatVND(Number(don['Đặt cọc']))}đ</td>
                  <td style={{ color: Number(don['Còn phải thu']) > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight:600 }}>
                    {formatVND(Number(don['Còn phải thu']))}đ
                  </td>
                  <td><span className={`badge ${badge(don['Trạng thái'])}`}>{don['Trạng thái'] || 'Mới'}</span></td>
                  <td style={{ fontSize:'13px', color:'var(--text-secondary)' }}>{don['Nhân viên bán'] || '—'}</td>
                  <td>
                    {don['Xuất hoá đơn'] === 'Có' && (
                      <span className="badge badge-warning">🧾 VAT</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display:'flex', gap:'4px' }}>
                      <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}`}
                        className="btn btn-ghost btn-sm" title="Xem chi tiết">👁️</Link>
                      <Link href={`/dashboard/don-hang/${don['Mã đơn hàng']}/in`}
                        className="btn btn-ghost btn-sm" title="In hoá đơn">🖨️</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
