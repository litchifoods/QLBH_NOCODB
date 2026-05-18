'use client'
// components/InHoaDonClient.tsx

function formatVND(n: number | string) {
  return Number(n || 0).toLocaleString('vi-VN') + 'đ'
}
function formatDate(s: string) {
  if (!s) return '—'
  const d = new Date(s)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}
function soTienBangChu(n: number): string {
  if (n === 0) return 'Không đồng'
  const dvDon = ['', 'nghìn', 'triệu', 'tỷ']
  const ch = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
  function docNhom(n: number): string {
    const tr = Math.floor(n / 100)
    const ch_tr = n % 100
    const ch10 = Math.floor(ch_tr / 10)
    const dv = ch_tr % 10
    let s = ''
    if (tr > 0) s += ch[tr] + ' trăm '
    if (ch10 > 1) s += ch[ch10] + ' mươi '
    else if (ch10 === 1) s += 'mười '
    if (dv > 0) {
      if (ch10 > 1 && dv === 1) s += 'mốt '
      else if (ch10 > 1 && dv === 5) s += 'lăm '
      else s += ch[dv] + ' '
    }
    return s.trim()
  }
  const parts: number[] = []
  let temp = Math.floor(n)
  while (temp > 0) { parts.unshift(temp % 1000); temp = Math.floor(temp / 1000) }
  return parts.map((p, i) => {
    const dv = dvDon[parts.length - 1 - i]
    return p > 0 ? docNhom(p) + (dv ? ' ' + dv : '') : ''
  }).filter(Boolean).join(' ') + ' đồng'
}

export default function InHoaDonClient({
  donHang, chiTiet, khachHang,
}: {
  donHang: any
  chiTiet: any[]
  khachHang: any
}) {
  const maDon    = donHang['Mã đơn hàng']
  const tongTien = Number(donHang['Tổng tiền đơn'] || 0)
  const datCoc   = Number(donHang['Đặt cọc'] || 0)
  const conLai   = Number(donHang['Còn phải thu'] || tongTien - datCoc)

  return (
    <div>
      {/* Toolbar - không in */}
      <div className="no-print" style={{
        padding:'16px 32px', background:'white', borderBottom:'1px solid var(--border)',
        display:'flex', gap:'12px', alignItems:'center',
      }}>
        <button onClick={() => window.print()}
          className="btn btn-primary">🖨️ In hoá đơn</button>
        <button onClick={() => window.history.back()}
          className="btn btn-ghost">← Quay lại</button>
        <span style={{ fontSize:'13px', color:'var(--text-secondary)' }}>
          Nhấn Ctrl+P hoặc nút In để in / lưu PDF
        </span>
      </div>

      {/* Hoá đơn */}
      <div className="print-area" style={{
        maxWidth:'720px', margin:'24px auto', background:'white',
        padding:'40px 48px', borderRadius:'12px',
        boxShadow:'var(--shadow-md)',
      }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'28px', borderBottom:'2px solid #1B3A6B', paddingBottom:'20px' }}>
          <div style={{
            fontSize:'22px', fontFamily:'Playfair Display,serif',
            fontWeight:700, color:'#1B3A6B', marginBottom:'4px',
          }}>NỘI THẤT TÍNH TUYẾT</div>
          <div style={{ fontSize:'12px', color:'#6B7280' }}>
            📞 Liên hệ: — &nbsp;|&nbsp; 📍 Địa chỉ: Việt Nam
          </div>
          <div style={{
            marginTop:'16px', fontSize:'18px', fontWeight:800,
            textTransform:'uppercase', letterSpacing:'0.05em', color:'#0F172A',
          }}>
            HOÁ ĐƠN BÁN HÀNG
          </div>
          <div style={{ fontSize:'13px', color:'#6B7280', marginTop:'4px' }}>
            Số: <strong>{maDon}</strong> &nbsp;|&nbsp;
            Ngày: <strong>{formatDate(donHang['Ngày bán'] || donHang['Ngày đặt'])}</strong>
          </div>
        </div>

        {/* Thông tin KH */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px',
          marginBottom:'24px', fontSize:'13px',
        }}>
          <div>
            <div style={{ fontWeight:700, marginBottom:'6px', color:'#374151' }}>THÔNG TIN KHÁCH HÀNG</div>
            <div><strong>Tên:</strong> {khachHang?.['Tên khách hàng'] || donHang['Mã KH'] || '—'}</div>
            <div><strong>SĐT:</strong> {khachHang?.['Số điện thoại'] || '—'}</div>
            <div><strong>Địa chỉ:</strong> {khachHang?.['Địa chỉ'] || '—'}</div>
          </div>
          <div>
            <div style={{ fontWeight:700, marginBottom:'6px', color:'#374151' }}>THÔNG TIN GIAO HÀNG</div>
            <div><strong>Hình thức:</strong> {donHang['Hình thức giao hàng'] || '—'}</div>
            <div><strong>Ngày hẹn giao:</strong> {formatDate(donHang['Ngày hẹn giao'])}</div>
            <div><strong>Nhân viên:</strong> {donHang['Nhân viên bán'] || '—'}</div>
          </div>
        </div>

        {/* Bảng sản phẩm */}
        <table style={{
          width:'100%', borderCollapse:'collapse', marginBottom:'20px',
          fontSize:'13px',
        }}>
          <thead>
            <tr style={{ background:'#1B3A6B', color:'white' }}>
              <th style={{ padding:'10px 12px', textAlign:'left', width:'5%' }}>STT</th>
              <th style={{ padding:'10px 12px', textAlign:'left' }}>Tên sản phẩm</th>
              <th style={{ padding:'10px 12px', textAlign:'center', width:'10%' }}>SL</th>
              <th style={{ padding:'10px 12px', textAlign:'right', width:'20%' }}>Đơn giá</th>
              <th style={{ padding:'10px 12px', textAlign:'right', width:'20%' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {chiTiet.map((ct: any, i: number) => (
              <tr key={i} style={{ background: i % 2 === 0 ? '#F8FAFC' : 'white' }}>
                <td style={{ padding:'10px 12px', textAlign:'center' }}>{i + 1}</td>
                <td style={{ padding:'10px 12px' }}>
                  <div style={{ fontWeight:600 }}>{ct['Tên SP (ghi nhanh)'] || ct['Mã SP'] || '—'}</div>
                  {ct['Ghi chú SP'] && (
                    <div style={{ fontSize:'11px', color:'#6B7280', fontStyle:'italic' }}>{ct['Ghi chú SP']}</div>
                  )}
                </td>
                <td style={{ padding:'10px 12px', textAlign:'center' }}>{ct['Số lượng']}</td>
                <td style={{ padding:'10px 12px', textAlign:'right' }}>{formatVND(ct['Đơn giá'])}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700 }}>{formatVND(ct['Thành tiền'])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop:'2px solid #1B3A6B' }}>
              <td colSpan={4} style={{ padding:'10px 12px', textAlign:'right', fontWeight:700 }}>Tổng tiền:</td>
              <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:800, fontSize:'15px', color:'#1B3A6B' }}>
                {formatVND(tongTien)}
              </td>
            </tr>
            {datCoc > 0 && (
              <tr>
                <td colSpan={4} style={{ padding:'6px 12px', textAlign:'right', color:'#065F46' }}>
                  Đã đặt cọc ({donHang['Hình thức cọc'] || '—'}):
                </td>
                <td style={{ padding:'6px 12px', textAlign:'right', color:'#065F46', fontWeight:700 }}>
                  - {formatVND(datCoc)}
                </td>
              </tr>
            )}
            <tr style={{ background:'#FEF3C7' }}>
              <td colSpan={4} style={{ padding:'10px 12px', textAlign:'right', fontWeight:800 }}>
                Còn phải thu:
              </td>
              <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:800, fontSize:'16px', color:'#DC2626' }}>
                {formatVND(conLai)}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Số tiền bằng chữ */}
        <div style={{
          fontSize:'12px', color:'#374151', marginBottom:'24px',
          fontStyle:'italic',
        }}>
          Số tiền còn lại bằng chữ: <strong style={{ textTransform:'capitalize' }}>
            {soTienBangChu(conLai)}
          </strong>
        </div>

        {/* Ghi chú */}
        {donHang['Ghi chú'] && (
          <div style={{
            fontSize:'12px', color:'#6B7280', marginBottom:'24px',
            background:'#F8FAFC', padding:'10px 14px', borderRadius:'6px',
          }}>
            <strong>Ghi chú:</strong> {donHang['Ghi chú']}
          </div>
        )}

        {/* Ký tên */}
        <div style={{
          display:'grid', gridTemplateColumns:'1fr 1fr', gap:'32px',
          marginTop:'32px', paddingTop:'20px', borderTop:'1px dashed #D1D5DB',
          fontSize:'13px', textAlign:'center',
        }}>
          <div>
            <div style={{ fontWeight:700, marginBottom:'48px' }}>KHÁCH HÀNG</div>
            <div style={{ borderBottom:'1px solid #374151', marginBottom:'4px' }}></div>
            <div style={{ color:'#6B7280', fontSize:'11px' }}>(Ký và ghi rõ họ tên)</div>
          </div>
          <div>
            <div style={{ fontWeight:700, marginBottom:'48px' }}>NGƯỜI BÁN</div>
            <div style={{ borderBottom:'1px solid #374151', marginBottom:'4px' }}></div>
            <div style={{ color:'#6B7280', fontSize:'11px' }}>({donHang['Nhân viên bán'] || 'Nhân viên'})</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          marginTop:'24px', textAlign:'center', fontSize:'11px', color:'#9CA3AF',
          borderTop:'1px solid #E5E7EB', paddingTop:'16px',
        }}>
          Cảm ơn quý khách đã mua hàng tại Nội Thất Tính Tuyết! 🏠
        </div>
      </div>

      {/* CSS cho in */}
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          aside, nav { display: none !important; }
          main { margin-left: 0 !important; }
          .print-area {
            margin: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
          }
          body { background: white !important; }
        }
      `}</style>
    </div>
  )
}
