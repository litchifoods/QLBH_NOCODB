const fs = require('fs')
const path = require('path')

// ── PATCH 1: page.tsx ──────────────────────────────
const pagePath = path.join(process.cwd(), 'app', 'dashboard', 'kiem-kho', 'page.tsx')
let page = fs.readFileSync(pagePath, 'utf8')

// Thêm fetch NV vào Promise.all
const old1 = `  const [dotKiemList, sanPhamList, danhMucList, nhapKhoList] = await Promise.all([`
const new1 = `  const [dotKiemList, sanPhamList, danhMucList, nhapKhoList, nvList] = await Promise.all([`
page = page.replace(old1, new1)

// Thêm query NV vào cuối Promise.all
const old2 = `    getRecords(TABLES.NHAP_KHO, {
      limit: 2000, sort: '-Id',
      fields: 'Id,Mã SP,Số lượng thực nhận,Giá nhập thực tế,Chi phí vận chuyển,Tổng tiền hóa đơn'
    }),
  ])`
const new2 = `    getRecords(TABLES.NHAP_KHO, {
      limit: 2000, sort: '-Id',
      fields: 'Id,Mã SP,Số lượng thực nhận,Giá nhập thực tế,Chi phí vận chuyển,Tổng tiền hóa đơn'
    }),
    getRecords(TABLES.NHAN_VIEN, {
      limit: 200, sort: 'Mã nhân viên',
      fields: 'Id,Mã nhân viên,Họ và Tên,Loại,Trạng thái'
    }),
  ])`
page = page.replace(old2, new2)

// Truyền nvList xuống component
const old3 = `    <KiemKhoClient
      dotKiemList={dotKiemList.list || []}
      sanPhamList={sanPhamList.list || []}
      danhMucList={danhMucList.list || []}
      giaBinhQuanMap={giaBinhQuanMap}
      user={session!}
    />`
const new3 = `    <KiemKhoClient
      dotKiemList={dotKiemList.list || []}
      sanPhamList={sanPhamList.list || []}
      danhMucList={danhMucList.list || []}
      giaBinhQuanMap={giaBinhQuanMap}
      nvList={(nvList.list || []).filter((nv:any) => nv['Loại']==='Nhân viên' && nv['Trạng thái']==='Đang làm')}
      user={session!}
    />`
page = page.replace(old3, new3)

if (page.includes('nvList')) {
  fs.writeFileSync(pagePath, page, 'utf8')
  console.log('OK page.tsx')
} else {
  console.log('FAIL page.tsx')
}

// ── PATCH 2: KiemKhoClient.tsx ─────────────────────
const clientPath = path.join(process.cwd(), 'components', 'KiemKhoClient.tsx')
let client = fs.readFileSync(clientPath, 'utf8')

// Thêm prop nvList
const old4 = `export default function KiemKhoClient({dotKiemList,sanPhamList,danhMucList=[],giaBinhQuanMap={},user}:{
  dotKiemList:any[]; sanPhamList:any[]; danhMucList:any[]
  giaBinhQuanMap:Record<string,number>; user:UserSession
}){`
const new4 = `export default function KiemKhoClient({dotKiemList,sanPhamList,danhMucList=[],giaBinhQuanMap={},nvList=[],user}:{
  dotKiemList:any[]; sanPhamList:any[]; danhMucList:any[]
  giaBinhQuanMap:Record<string,number>; nvList:any[]; user:UserSession
}){`
if (client.includes(old4)) { client = client.replace(old4, new4); console.log('OK props KiemKhoClient') }
else console.log('FAIL props')

// Thêm state dropdown NV
const old5 = `  const [nguoiKiem, setNguoiKiem]= useState(user.hoTen||user.tenDangNhap||'')`
const new5 = `  const [nguoiKiem, setNguoiKiem]= useState(user.hoTen||user.tenDangNhap||'')
  const [showNVDrop, setShowNVDrop] = useState(false)
  const [searchNV,   setSearchNV]   = useState('')`
if (client.includes(old5)) { client = client.replace(old5, new5); console.log('OK state NV dropdown') }
else console.log('FAIL state NV')

// Thay input Người kiểm thành input có dropdown gợi ý
const old6 = `              <div>
                <label className="lbl">Người kiểm</label>
                <input className="input" value={nguoiKiem} onChange={e=>setNguoiKiem(e.target.value)} placeholder="Tên người kiểm..."/>
              </div>`
const new6 = `              <div style={{position:'relative'}}>
                <label className="lbl">Người kiểm</label>
                <input className="input" value={nguoiKiem}
                  onChange={e=>{setNguoiKiem(e.target.value);setSearchNV(e.target.value);setShowNVDrop(true)}}
                  onFocus={()=>setShowNVDrop(true)}
                  onBlur={()=>setTimeout(()=>setShowNVDrop(false),200)}
                  placeholder="Tìm nhân viên..."/>
                {showNVDrop&&(
                  <div style={{position:'absolute',top:'calc(100% + 2px)',left:0,right:0,zIndex:400,background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,.15)',maxHeight:'180px',overflowY:'auto'}}>
                    {nvList
                      .filter((nv:any)=>{
                        if(!searchNV.trim()) return true
                        const q=(searchNV||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()
                        const ten=(nv['Họ và Tên']||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()
                        return ten.includes(q)
                      })
                      .map((nv:any)=>(
                        <div key={nv['Mã nhân viên']}
                          onMouseDown={e=>{e.preventDefault();setNguoiKiem(nv['Họ và Tên']||'');setSearchNV('');setShowNVDrop(false)}}
                          style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px',display:'flex',alignItems:'center',gap:'8px'}}
                          onMouseEnter={e=>(e.currentTarget.style.background='#EFF6FF')}
                          onMouseLeave={e=>(e.currentTarget.style.background='white')}>
                          <span style={{fontWeight:600}}>{nv['Họ và Tên']}</span>
                          <span style={{fontSize:'11px',padding:'1px 6px',borderRadius:'8px',background:'#DBEAFE',color:'#1E40AF',fontWeight:600}}>{nv['Mã nhân viên']}</span>
                        </div>
                      ))
                    }
                    {nvList.filter((nv:any)=>{
                      if(!searchNV.trim()) return true
                      const q=(searchNV||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()
                      const ten=(nv['Họ và Tên']||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase()
                      return ten.includes(q)
                    }).length===0&&(
                      <div style={{padding:'8px 12px',fontSize:'12px',color:'#9CA3AF',fontStyle:'italic'}}>Không tìm thấy — nhập tên tự do</div>
                    )}
                  </div>
                )}
              </div>`
if (client.includes(old6)) { client = client.replace(old6, new6); console.log('OK input NV dropdown') }
else console.log('FAIL input NV')

fs.writeFileSync(clientPath, client, 'utf8')
console.log('Done! Both files saved.')
