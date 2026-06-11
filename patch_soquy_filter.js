const fs = require('fs')
const f = 'components/ChiPhiClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// 1. Thêm state filter riêng cho sổ quỹ
const old1 = `  const [editSoDu, setEditSoDu] = useState(false)`
const new1 = `  const [editSoDu, setEditSoDu] = useState(false)
  const now2 = new Date()
  const [sqTuNgay, setSqTuNgay] = useState(now2.getFullYear()+'-'+String(now2.getMonth()+1).padStart(2,'0')+'-01')
  const [sqDenNgay, setSqDenNgay] = useState(now2.toISOString().split('T')[0])`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. state filter') }
else console.log('FAIL 1.')

// 2. Filter gdTienMat và gdNganHang theo ngày
const old2 = `  const gdTienMat = useMemo(()=>giaoDichSoQuy.filter(g=>g.hinhThuc==='Tiền mặt'),[giaoDichSoQuy])
  const gdNganHang = useMemo(()=>giaoDichSoQuy.filter(g=>g.hinhThuc==='Chuyển khoản'),[giaoDichSoQuy])`
const new2 = `  const gdTienMat = useMemo(()=>giaoDichSoQuy.filter(g=>g.hinhThuc==='Tiền mặt'&&(!g.ngay||g.ngay>=sqTuNgay)&&(!g.ngay||g.ngay<=sqDenNgay)),[giaoDichSoQuy,sqTuNgay,sqDenNgay])
  const gdNganHang = useMemo(()=>giaoDichSoQuy.filter(g=>g.hinhThuc==='Chuyển khoản'&&(!g.ngay||g.ngay>=sqTuNgay)&&(!g.ngay||g.ngay<=sqDenNgay)),[giaoDichSoQuy,sqTuNgay,sqDenNgay])`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. filter ngày') }
else console.log('FAIL 2.')

// 3. Thêm UI bộ lọc ngày vào tab Sổ quỹ (sau dòng số dư đầu kỳ card)
const old3 = `          {/* Tab TM / NH */}`
const new3 = `          {/* Bộ lọc ngày */}
          <div className="card" style={{padding:'10px 14px',marginBottom:'12px'}}>
            <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:'12px',fontWeight:600,color:'var(--text-secondary)'}}>📅 Từ:</span>
              <input type="date" value={sqTuNgay} onChange={e=>setSqTuNgay(e.target.value)}
                style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px'}}/>
              <span style={{fontSize:'12px',fontWeight:600,color:'var(--text-secondary)'}}>Đến:</span>
              <input type="date" value={sqDenNgay} onChange={e=>setSqDenNgay(e.target.value)}
                style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',fontSize:'12px'}}/>
              <button onClick={()=>{const n=new Date();setSqTuNgay(n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-01');setSqDenNgay(n.toISOString().split('T')[0])}}
                style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>
                📅 Tháng này
              </button>
            </div>
          </div>

          {/* Tab TM / NH */}`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. UI filter') }
else console.log('FAIL 3.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
