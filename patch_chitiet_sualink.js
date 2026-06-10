const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'ChiTietDonHangClient.tsx')
let c = fs.readFileSync(filePath, 'utf8')

// Đổi nút Sửa từ moModalSua → navigate sang /sua
const old1 = `          {coTheSua && !showModalSua && (
            <button onClick={moModalSua}
              style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#F59E0B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              ✏️ Sửa đơn hàng
            </button>
          )}`
const new1 = `          {coTheSua && (
            <Link href={'/dashboard/don-hang/'+maDon+'/sua'}
              style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#F59E0B',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer',textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'6px'}}>
              ✏️ Sửa đơn hàng
            </Link>
          )}`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. nút sửa → link') }
else console.log('FAIL 1.')

fs.writeFileSync(filePath, c, 'utf8')
console.log('Done!')
