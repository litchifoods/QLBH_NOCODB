const fs = require('fs')
const f = 'components/ChiPhiClient.tsx'
let c = fs.readFileSync(f, 'utf8')

// 1. Thêm state phân trang sổ quỹ
const old1 = `  const [editSoDu, setEditSoDu] = useState(false)`
const new1 = `  const [editSoDu, setEditSoDu] = useState(false)
  const [sqTrang, setSqTrang] = useState(1)
  const SQ_SO_DONG = 10`
if (c.includes(old1)) { c = c.replace(old1, new1); console.log('OK 1. state') }
else console.log('FAIL 1.')

// 2. Reset trang khi đổi tab hoặc filter ngày
const old2 = `  const gdTMVoiSoDu = useMemo(()=>tinhSoDu(gdTienMat, soDuTienMat),[gdTienMat,soDuTienMat])
  const gdNHVoiSoDu = useMemo(()=>tinhSoDu(gdNganHang, soDuNganHang),[gdNganHang,soDuNganHang])`
const new2 = `  const gdTMVoiSoDu = useMemo(()=>{setSqTrang(1);return tinhSoDu(gdTienMat, soDuTienMat)},[gdTienMat,soDuTienMat])
  const gdNHVoiSoDu = useMemo(()=>{setSqTrang(1);return tinhSoDu(gdNganHang, soDuNganHang)},[gdNganHang,soDuNganHang])`
if (c.includes(old2)) { c = c.replace(old2, new2); console.log('OK 2. reset trang') }
else console.log('FAIL 2.')

// 3. Tính dữ liệu trang hiện tại
const old3 = `                  {(tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).length===0?(
                    <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>Chưa có giao dịch nào</td></tr>
                  ):(tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).map((g,i)=>(`
const new3 = `                  {(()=>{
                    const allData = tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu
                    const sqTongTrang = Math.max(1,Math.ceil(allData.length/SQ_SO_DONG))
                    const sqTrangHT = Math.min(sqTrang,sqTongTrang)
                    const sqDanhSach = allData.slice((sqTrangHT-1)*SQ_SO_DONG, sqTrangHT*SQ_SO_DONG)
                    return null
                  })()}
                  {(tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).slice((Math.min(sqTrang,Math.max(1,Math.ceil((tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).length/SQ_SO_DONG)))-1)*SQ_SO_DONG,(Math.min(sqTrang,Math.max(1,Math.ceil((tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).length/SQ_SO_DONG))))*SQ_SO_DONG).length===0?(
                    <tr><td colSpan={9} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>Chưa có giao dịch nào</td></tr>
                  ):(tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).slice((Math.min(sqTrang,Math.max(1,Math.ceil((tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).length/SQ_SO_DONG)))-1)*SQ_SO_DONG,(Math.min(sqTrang,Math.max(1,Math.ceil((tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu).length/SQ_SO_DONG))))*SQ_SO_DONG).map((g,i)=>(`
if (c.includes(old3)) { c = c.replace(old3, new3); console.log('OK 3. slice data') }
else console.log('FAIL 3.')

// 4. Thêm phân trang sau bảng (trước </div> đóng card)
const old4 = `        </div>
      )}

      {/* Modal thêm/sửa Chi */}`
const new4 = `        {/* Phân trang sổ quỹ */}
        {(()=>{
          const allData = tabSoQuy==='tienmat'?gdTMVoiSoDu:gdNHVoiSoDu
          const sqTongTrang = Math.max(1,Math.ceil(allData.length/SQ_SO_DONG))
          const sqTrangHT = Math.min(sqTrang,sqTongTrang)
          if (sqTongTrang<=1) return null
          return (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0',flexWrap:'wrap',gap:'8px',marginTop:'0'}}>
              <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>
                {(sqTrangHT-1)*SQ_SO_DONG+1}–{Math.min(sqTrangHT*SQ_SO_DONG,allData.length)} / {allData.length} giao dịch
              </span>
              <div style={{display:'flex',gap:'4px'}}>
                <button disabled={sqTrangHT===1} onClick={()=>setSqTrang(t=>t-1)}
                  style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:sqTrangHT===1?'#F9FAFB':'white',color:sqTrangHT===1?'#CCC':'var(--text-secondary)',cursor:sqTrangHT===1?'not-allowed':'pointer',fontSize:'13px'}}>‹</button>
                {Array.from({length:Math.min(sqTongTrang,7)},(_,i)=>{
                  const p = sqTongTrang<=7 ? i+1 : sqTrangHT<=4 ? i+1 : sqTrangHT>=sqTongTrang-3 ? sqTongTrang-6+i : sqTrangHT-3+i
                  return <button key={p} onClick={()=>setSqTrang(p)}
                    style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:p===sqTrangHT?'#7C3AED':'var(--border)',background:p===sqTrangHT?'#7C3AED':'white',color:p===sqTrangHT?'white':'var(--text-secondary)',cursor:'pointer',fontSize:'13px',fontWeight:p===sqTrangHT?700:400}}>{p}</button>
                })}
                <button disabled={sqTrangHT===sqTongTrang} onClick={()=>setSqTrang(t=>t+1)}
                  style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid var(--border)',background:sqTrangHT===sqTongTrang?'#F9FAFB':'white',color:sqTrangHT===sqTongTrang?'#CCC':'var(--text-secondary)',cursor:sqTrangHT===sqTongTrang?'not-allowed':'pointer',fontSize:'13px'}}>›</button>
              </div>
            </div>
          )
        })()}
        </div>
      )}

      {/* Modal thêm/sửa Chi */}`
if (c.includes(old4)) { c = c.replace(old4, new4); console.log('OK 4. phân trang') }
else console.log('FAIL 4.')

fs.writeFileSync(f, c, 'utf8')
console.log('Done!')
