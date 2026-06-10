const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'BaoCaoClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm state filterKenh
const old1 = `  const [showChot, setShowChot] = useState(false)`
const new1 = `  const [showChot, setShowChot] = useState(false)
  const [filterKenh, setFilterKenh] = useState('Tất cả')`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK 1. State filterKenh') }
else console.log('FAIL 1. State')

// 2. Lọc donHangList theo kênh trong useMemo
const old2 = `    // Đơn hàng
    const donTrongKy = donHangList.filter(d=>inRange(d['Ngày bán']||'',tuNgay,denNgay))`
const new2 = `    // Đơn hàng — lọc theo kênh bán
    const donTrongKy = donHangList.filter(d=>{
      if(!inRange(d['Ngày bán']||'',tuNgay,denNgay)) return false
      if(filterKenh==='Trực tiếp') return d['Kênh bán']==='Trực tiếp'
      if(filterKenh==='Online') return d['Kênh bán']==='Online'
      return true
    })`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK 2. Filter kênh useMemo') }
else console.log('FAIL 2. Filter')

// 3. Thêm filterKenh vào deps
const old3 = `  },[donHangList,doiSoatList,chiTraNVList,thanhToanNCCList,chiPhiList,chiTietDonList,nhapKhoList,tuNgay,denNgay])`
const new3 = `  },[donHangList,doiSoatList,chiTraNVList,thanhToanNCCList,chiPhiList,chiTietDonList,nhapKhoList,tuNgay,denNgay,filterKenh])`
if (content.includes(old3)) { content = content.replace(old3, new3); console.log('OK 3. Deps') }
else console.log('FAIL 3. Deps')

// 4. Thêm UI bộ lọc kênh — dùng string concat thay template literal
const old4 = `      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Phần 1 — Doanh thu */}`

const new4 = `      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Bộ lọc kênh bán */}
      <div className="bc-card" style={{marginBottom:'16px',padding:'12px 16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          <span style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',whiteSpace:'nowrap'}}>🏪 Kênh bán:</span>
          {['Tất cả','Trực tiếp','Online'].map((k:any)=>{
            const isActive=filterKenh===k
            const bgMap:any={'Tất cả':'#EFF6FF','Trực tiếp':'#F0FDF4','Online':'#F5F3FF'}
            const cMap:any={'Tất cả':'#1E40AF','Trực tiếp':'#16A34A','Online':'#7C3AED'}
            const iconMap:any={'Tất cả':'📊','Trực tiếp':'🏪','Online':'🌐'}
            const donKenh=donHangList.filter((d:any)=>
              inRange(d['Ngày bán']||'',tuNgay,denNgay)&&
              d['Trạng thái']!=='Huỷ'&&
              (k==='Tất cả'||d['Kênh bán']===k)
            )
            const dtKenh=donKenh.reduce((s:number,d:any)=>s+Number(d['Tổng tiền đơn']||0),0)
            return (
              <button key={k} onClick={()=>setFilterKenh(k)}
                style={{padding:'8px 16px',borderRadius:'20px',
                  border:'2px solid '+(isActive?cMap[k]:'var(--border)'),
                  background:isActive?bgMap[k]:'white',
                  color:isActive?cMap[k]:'var(--text-secondary)',
                  fontWeight:isActive?700:400,cursor:'pointer',fontSize:'13px',
                  display:'flex',flexDirection:'column',alignItems:'center',gap:'2px',minWidth:'100px'}}>
                <span style={{fontWeight:700}}>{iconMap[k]} {k}</span>
                <span style={{fontSize:'11px',opacity:0.85}}>{donKenh.length} đơn · {fVND(Math.round(dtKenh/1000))}K</span>
              </button>
            )
          })}
          {filterKenh!=='Tất cả'&&(
            <div style={{marginLeft:'auto',padding:'6px 12px',borderRadius:'8px',background:'#FEF9C3',border:'1px solid #FCD34D',fontSize:'12px',color:'#92400E',fontWeight:600}}>
              ⚠️ Đang xem kênh: <strong>{filterKenh}</strong> — chi phí vẫn tính toàn bộ
            </div>
          )}
        </div>
      </div>

      {/* Phần 1 — Doanh thu */}`
if (content.includes(old4)) { content = content.replace(old4, new4); console.log('OK 4. UI bộ lọc') }
else console.log('FAIL 4. UI')

// 5. Cập nhật label card doanh thu
const old5 = `            <div style={{fontSize:'11px',color:'#6B7280',marginTop:'4px'}}>
              Trực tiếp: {fVND(stats.dtTrucTiep)}đ · Online: {fVND(stats.dtOnline)}đ
            </div>`
const new5 = `            <div style={{fontSize:'11px',color:'#6B7280',marginTop:'4px'}}>
              {filterKenh==='Tất cả'
                ?<>Trực tiếp: {fVND(stats.dtTrucTiep)}đ · Online: {fVND(stats.dtOnline)}đ</>
                :<>Kênh: <strong>{filterKenh}</strong> · {stats.soDon} đơn</>}
            </div>`
if (content.includes(old5)) { content = content.replace(old5, new5); console.log('OK 5. Card DT') }
else console.log('FAIL 5. Card DT')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Done! BaoCaoClient.tsx saved.')
