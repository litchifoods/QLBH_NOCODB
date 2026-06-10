const fs = require('fs')

// ── PATCH 1: TaoDonHangForm — lưu 3 field giảm giá ──
const f1 = 'components/TaoDonHangForm.tsx'
let c1 = fs.readFileSync(f1, 'utf8')

const old1 = `'Tổng tiền đơn':tongTien-soTienGiam,`
const new1 = `'Tổng tiền đơn':tongTien-soTienGiam,
          'Giảm giá': soTienGiam||0,
          'Loại giảm giá': giamGia>0 ? loaiGiam : '',
          'Giá trị giảm': giamGia||0,`
if (c1.includes(old1)) { c1 = c1.replace(old1, new1); console.log('OK 1. lưu giảm giá') }
else console.log('FAIL 1.')

fs.writeFileSync(f1, c1, 'utf8')

// ── PATCH 2: page.tsx — fetch thêm field giảm giá ──
const f2 = 'app/dashboard/don-hang/[maDon]/page.tsx'
let c2 = fs.readFileSync(f2, 'utf8')

const old2 = `getRecords(TABLES.DON_HANG, { where:\`(Mã đơn hàng,eq,\${maDon})\`, limit:1 }),`
const new2 = `getRecords(TABLES.DON_HANG, { where:\`(Mã đơn hàng,eq,\${maDon})\`, limit:1,
      fields:'Id,Mã đơn hàng,Mã KH,Tên khách hàng,Ngày bán,Ngày đặt,Kênh bán,Hình thức giao hàng,Ngày hẹn giao,Địa chỉ giao,Tổng tiền đơn,Đặt cọc,Hình thức cọc,Còn phải thu,CP giao hàng,CP đổi trả,Trạng thái,Nhân viên bán,Mã NV,Ghi chú,Xuất hóa đơn,Tiền hoàn cọc,Tình trạng hoàn cọc,Giảm giá,Loại giảm giá,Giá trị giảm' }),`
if (c2.includes(old2)) { c2 = c2.replace(old2, new2); console.log('OK 2. fetch fields') }
else console.log('FAIL 2.')

fs.writeFileSync(f2, c2, 'utf8')

// ── PATCH 3: ChiTietDonHangClient — hiển thị giảm giá ──
const f3 = 'components/ChiTietDonHangClient.tsx'
let c3 = fs.readFileSync(f3, 'utf8')

// Thêm dòng giảm giá vào card Thanh toán
const old3 = `              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                <span style={{color:'var(--text-secondary)'}}>Tổng tiền hàng:</span>
                <span style={{fontWeight:700}}>{fVND(tongTienHienTai)}</span>
              </div>`
const new3 = `              <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                <span style={{color:'var(--text-secondary)'}}>Tổng tiền hàng (gốc):</span>
                <span style={{fontWeight:700}}>{fVND(tongTienHienTai)}</span>
              </div>
              {Number(donHang['Giảm giá']||0)>0&&(
                <div style={{display:'flex',justifyContent:'space-between',fontSize:'13px'}}>
                  <span style={{color:'var(--text-secondary)'}}>
                    Giảm giá{donHang['Loại giảm giá']==='percent'&&donHang['Giá trị giảm']>0
                      ? ' ('+donHang['Giá trị giảm']+'%)'
                      : ''}:
                  </span>
                  <span style={{fontWeight:600,color:'#7C3AED'}}>- {fVND(Number(donHang['Giảm giá']||0))}</span>
                </div>
              )}`
if (c3.includes(old3)) { c3 = c3.replace(old3, new3); console.log('OK 3. hiển thị giảm giá') }
else console.log('FAIL 3.')

fs.writeFileSync(f3, c3, 'utf8')
console.log('Done!')
