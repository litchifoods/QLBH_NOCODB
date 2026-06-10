const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'SanPhamClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm filter trạng thái + state showNgungKD
const old1 = `  const [filterDanhMuc, setFilterDanhMuc] = useState('Tất cả')`
const new1 = `  const [filterDanhMuc, setFilterDanhMuc] = useState('Tất cả')
  const [showNgungKD,  setShowNgungKD]  = useState(false) // hiện/ẩn SP ngừng KD`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK 1. State showNgungKD') }
else console.log('FAIL 1. State')

// 2. Thêm hàm ngungKinhDoanh sau hàm xacNhanXoa
const old2 = `  // Xuất Excel
  function xuatExcel(){`
const new2 = `  async function ngungKinhDoanh(sp: any) {
    try {
      const res = await fetch('/api/san-pham', {method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({id: sp._rowId, 'Trạng thái': 'Ngừng kinh doanh'})})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(s=>s._key===sp._key?{...s,'Trạng thái':'Ngừng kinh doanh'}:s))
      setXoaSP(null); setXoaCheck(null)
      showMsg2('⛔ Đã chuyển "'+sp['Tên sản phẩm']+'" sang Ngừng kinh doanh')
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  async function khoiPhucKinhDoanh(sp: any) {
    try {
      const res = await fetch('/api/san-pham', {method:'PATCH', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({id: sp._rowId, 'Trạng thái': 'Đang bán'})})
      if (!res.ok) throw new Error((await res.json()).message)
      setLocal(prev=>prev.map(s=>s._key===sp._key?{...s,'Trạng thái':'Đang bán'}:s))
      showMsg2('✅ Đã khôi phục: '+sp['Tên sản phẩm'])
    } catch(e:any){showMsg2('❌ '+(e.message||'Lỗi'),false)}
  }

  // Xuất Excel
  function xuatExcel(){`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK 2. Hàm ngừng KD') }
else console.log('FAIL 2. Hàm')

// 3. Lọc SP ngừng KD khỏi danh sách mặc định
const old3 = `  const filtered = useMemo(()=>local.filter(sp=>{
    if (filterLoai!=='Tất cả' && sp['Loại SP']!==filterLoai) return false`
const new3 = `  const filtered = useMemo(()=>local.filter(sp=>{
    // Ẩn SP ngừng KD theo toggle
    const isNgung = sp['Trạng thái']==='Ngừng kinh doanh'
    if (isNgung && !showNgungKD) return false
    if (!isNgung && showNgungKD) return false
    if (filterLoai!=='Tất cả' && sp['Loại SP']!==filterLoai) return false`
if (content.includes(old3)) { content = content.replace(old3, new3); console.log('OK 3. Filter ngừng KD') }
else console.log('FAIL 3. Filter')

// 4. Thêm filterKenh vào deps useMemo
const old4 = `  }),[local,search,filterLoai,filterTon])`
const new4 = `  }),[local,search,filterLoai,filterTon,showNgungKD])`
if (content.includes(old4)) { content = content.replace(old4, new4); console.log('OK 4. Deps useMemo') }
else console.log('FAIL 4. Deps')

// 5. Thêm thống kê SP ngừng KD + nút toggle vào header
const old5 = `          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button onClick={xuatExcel}`
const new5 = `          {(()=>{const soNgung=local.filter(sp=>sp['Trạng thái']==='Ngừng kinh doanh').length;return soNgung>0&&(
            <button onClick={()=>setShowNgungKD(p=>!p)}
              style={{padding:'6px 14px',borderRadius:'8px',background:showNgungKD?'#FEE2E2':'#F3F4F6',border:'1px solid',borderColor:showNgungKD?'#FCA5A5':'#E5E7EB',cursor:'pointer',fontSize:'12px',fontWeight:600,color:showNgungKD?'#DC2626':'#6B7280'}}>
              {showNgungKD?'✅ Ẩn SP ngừng KD':'⛔ Xem SP ngừng KD ('+soNgung+')'}
            </button>
          )})()} 
          <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
            <button onClick={xuatExcel}`
if (content.includes(old5)) { content = content.replace(old5, new5); console.log('OK 5. Nút toggle ngừng KD') }
else console.log('FAIL 5. Nút toggle')

// 6. Hiển thị badge "Ngừng KD" trong bảng + nút khôi phục
const old6 = `                    <td onClick={()=>moSua(sp)} style={{cursor:'pointer'}}>
                      <div style={{fontWeight:600,color:'#374151'}}>{sp['Tên sản phẩm']}</div>
                      {sp['Ghi chú']&&<div style={{fontSize:'11px',color:'#9CA3AF',fontStyle:'italic'}}>{sp['Ghi chú']}</div>}
                    </td>`
const new6 = `                    <td onClick={()=>!showNgungKD&&moSua(sp)} style={{cursor:showNgungKD?'default':'pointer'}}>
                      <div style={{fontWeight:600,color:sp['Trạng thái']==='Ngừng kinh doanh'?'#9CA3AF':'#374151',textDecoration:sp['Trạng thái']==='Ngừng kinh doanh'?'line-through':'none'}}>
                        {sp['Tên sản phẩm']}
                        {sp['Trạng thái']==='Ngừng kinh doanh'&&<span style={{marginLeft:'6px',fontSize:'10px',padding:'1px 6px',borderRadius:'8px',background:'#FEE2E2',color:'#DC2626',fontWeight:700,textDecoration:'none',display:'inline-block'}}>Ngừng KD</span>}
                      </div>
                      {sp['Ghi chú']&&<div style={{fontSize:'11px',color:'#9CA3AF',fontStyle:'italic'}}>{sp['Ghi chú']}</div>}
                    </td>`
if (content.includes(old6)) { content = content.replace(old6, new6); console.log('OK 6. Badge ngừng KD') }
else console.log('FAIL 6. Badge')

// 7. Thay nút xóa: nếu SP đang bán → xóa/ngừng KD, nếu ngừng KD → khôi phục
const old7 = `                        {user.vaiTro==='Chủ cửa hàng'&&<button onClick={()=>moXoa(sp)} title="Xóa" style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>}`
const new7 = `                        {user.vaiTro==='Chủ cửa hàng'&&(
                          sp['Trạng thái']==='Ngừng kinh doanh'
                            ?<button onClick={()=>khoiPhucKinhDoanh(sp)} title="Khôi phục kinh doanh"
                              style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #6EE7B7',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600}}>▶ Khôi phục</button>
                            :<button onClick={()=>moXoa(sp)} title="Xóa hoặc ngừng KD"
                              style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️ Xóa</button>
                        )}`
if (content.includes(old7)) { content = content.replace(old7, new7); console.log('OK 7. Nút xóa/khôi phục') }
else console.log('FAIL 7. Nút')

// 8. Thêm nút "Ngừng kinh doanh" vào modal khi SP không thể xóa
const old8 = `                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',marginBottom:'14px',fontSize:'12px',color:'#1E40AF',textAlign:'left'}}>
                    💡 SP loại "Theo yêu cầu" đã bán: tồn kho = 0 là đủ để ẩn khỏi danh sách có hàng.
                  </div>
                  <button onClick={()=>{setXoaSP(null);setXoaCheck(null)}}
                    style={{width:'100%',padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600,fontSize:'14px'}}>Đóng</button>`
const new8 = `                  <div style={{padding:'10px 12px',borderRadius:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE',marginBottom:'14px',fontSize:'12px',color:'#1E40AF',textAlign:'left'}}>
                    💡 Thay vào đó, chuyển SP sang <strong>Ngừng kinh doanh</strong> để ẩn khỏi danh sách tạo đơn, vẫn giữ lịch sử.
                  </div>
                  <div style={{display:'flex',gap:'10px'}}>
                    <button onClick={()=>ngungKinhDoanh(xoaSP)}
                      style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:'#D97706',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
                      ⛔ Ngừng kinh doanh
                    </button>
                    <button onClick={()=>{setXoaSP(null);setXoaCheck(null)}}
                      style={{padding:'11px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Đóng</button>
                  </div>`
if (content.includes(old8)) { content = content.replace(old8, new8); console.log('OK 8. Nút ngừng KD trong modal') }
else console.log('FAIL 8. Modal nút')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Done! SanPhamClient.tsx saved.')
