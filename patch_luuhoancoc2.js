const fs = require('fs')
const f = 'components/KhachHangClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// 1. Thêm donAm
const old1 = `    const donHuy = (donHangTheoKH[popupHoanKH['Mã KH']]||[])
      .find((d:any) => d['Tiền hoàn cọc']>0 && d['Tình trạng hoàn cọc']!=='Đã hoàn')
    try {`
const new1 = `    const donHuy = (donHangTheoKH[popupHoanKH['Mã KH']]||[])
      .find((d:any) => d['Tiền hoàn cọc']>0 && d['Tình trạng hoàn cọc']!=='Đã hoàn')
    const donAm = (donHangTheoKH[popupHoanKH['Mã KH']]||[])
      .find((d:any) => Number(d['Còn phải thu']||0)<0 && d['Trạng thái']!=='Hủy' && d['Trạng thái']!=='Huỷ')
    try {`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1') }
else console.log('FAIL 1')

// 2. Thêm xử lý donAm — tìm đoạn showMsg
const showMsgIdx = c.indexOf("showMsg(`✅ Đã hoàn")
if (showMsgIdx === -1) {
  console.log('showMsg not found, trying alternate...')
  // Tìm cách khác
  const alt = c.indexOf("showMsg('✅ Đã hoàn")
  console.log('alt at:', alt)
} else {
  const lineEnd = c.indexOf('\n', showMsgIdx)
  const showMsgLine = c.substring(showMsgIdx, lineEnd)
  console.log('showMsg line:', showMsgLine)
  
  const newCode = `      if (!donHuy && donAm) {
        await fetch('/api/don-hang', {
          method:'PATCH', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ id: donAm['Id']||donAm['id'], 'Còn phải thu': 0, 'Tình trạng hoàn cọc': 'Đã hoàn', 'Hình thức hoàn cọc': hinhThucHoan }),
        })
      }
      ` + showMsgLine
  c = c.substring(0, showMsgIdx) + newCode + c.substring(lineEnd)
  console.log('OK 2')
}

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
