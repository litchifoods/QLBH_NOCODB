const fs = require('fs')
const f = 'components/ChiTietDonHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Sửa đoạn body JSON.stringify trong xacNhanHuyDon
const old1 = `          id: donHang['Id']||donHang['id'],
          'Trang thai': 'Hủy',
          'Trang thai': 'Huỷ',
          'CP doi tra': cpTraHang,
          'CP đổi trả': cpTraHang,
          'Tien hoan coc': tienHoan,
          'Tiền hoàn cọc': tienHoan,
          'Tinh trang hoan coc': tienHoan > 0 ? 'Cho hoan' : 'Khong hoan',
          'Tình trạng hoàn cọc': tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn',
          'Con phai thu': 0,
          'Còn phải thu': 0,
          'Ghi chu': (donHang['Ghi chú']||'') + ' ' + ghiChuHuy,
          'Ghi chú': (donHang['Ghi chú']||'') + ' ' + ghiChuHuy,`
const new1 = `          id: donHang['Id']||donHang['id'],
          'Trạng thái': 'Hủy',
          'CP đổi trả': cpTraHang,
          'Tiền hoàn cọc': tienHoan,
          'Tình trạng hoàn cọc': tienHoan > 0 ? 'Chờ hoàn' : 'Không hoàn',
          'Còn phải thu': 0,
          'Ghi chú': (donHang['Ghi chú']||'') + ' ' + ghiChuHuy,`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK fix body PATCH') }
else console.log('FAIL - xem lại đoạn code')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
