const fs = require('fs')
const f = 'components/NhapKhoClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// Dòng 319
const old1 = `setMaSP('');setTenSP('');setQSP('');setSlThucNhan(0);setGiaNhapNCC(0);setCpvcKho(0);setTinhTrang('Đủ')`
const new1 = `setMaSP('');setTenSP('');setQSP('');setSlThucNhan(1);setGiaNhapNCC(0);setCpvcKho(0);setTinhTrang('Đủ')`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1') }
else console.log('FAIL 1')

// Dòng 331
const old2 = `setSlThucNhan(0);setGiaNhapNCC(0);setCpvcKho(0);setTinhTrang('Đủ');setSlLoi(0);setSlChoiPK(0)`
const new2 = `setSlThucNhan(1);setGiaNhapNCC(0);setCpvcKho(0);setTinhTrang('Đủ');setSlLoi(0);setSlChoiPK(0)`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2') }
else console.log('FAIL 2')

fs.writeFileSync(f, c, 'utf8')
console.log('Done')
