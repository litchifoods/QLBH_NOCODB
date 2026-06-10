const fs = require('fs')
const path = require('path')

const filePath = path.join(process.cwd(), 'components', 'SanPhamClient.tsx')
let content = fs.readFileSync(filePath, 'utf8')

// 1. Thêm props nhapKhoList + nccMap
const old1 = `export default function SanPhamClient({ danhSach, danhMucList=[], user }:{ danhSach:any[]; danhMucList:any[]; user:UserSession }) {`
const new1 = `export default function SanPhamClient({ danhSach, danhMucList=[], nhapKhoList=[], nccMap={}, user }:{
  danhSach:any[]; danhMucList:any[]
  nhapKhoList:any[]; nccMap:Record<string,string>; user:UserSession
}) {`
if (content.includes(old1)) { content = content.replace(old1, new1); console.log('OK 1. Props') }
else console.log('FAIL 1. Props')

// 2. Thêm state xem lịch sử giá
const old2 = `  const [xoaSP,    setXoaSP]    = useState<any>(null)`
const new2 = `  const [xoaSP,    setXoaSP]    = useState<any>(null)
  const [lichSuGiaSP, setLichSuGiaSP] = useState<any>(null) // SP đang xem lịch sử giá`
if (content.includes(old2)) { content = content.replace(old2, new2); console.log('OK 2. State lichSuGia') }
else console.log('FAIL 2. State')

// 3. Thêm nút "📈 Lịch sử giá" vào cột thao tác (sau nút Sửa)
const old3 = `                        <button onClick={()=>moSua(sp)} title="Sửa" style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>✏️ Sửa</button>`
const new3 = `                        <button onClick={()=>moSua(sp)} title="Sửa" style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid #FCD34D',background:'#FFFBEB',color:'#92400E',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>✏️ Sửa</button>
                        <button onClick={()=>setLichSuGiaSP(sp)} title="Lịch sử giá nhập" style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #BFDBFE',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600}}>📈</button>`
if (content.includes(old3)) { content = content.replace(old3, new3); console.log('OK 3. Nút lịch sử giá') }
else console.log('FAIL 3. Nút')

// 4. Thêm modal lịch sử giá trước function Btn
const old4 = `\nfunction Btn({children,active,disabled,onClick}:any){`
const new4 = `
      {/* MODAL LỊCH SỬ GIÁ NHẬP */}
      {lichSuGiaSP&&(()=>{
        const maSP = lichSuGiaSP['Mã SP']||''
        const dsSP = nhapKhoList.filter((nk:any)=>nk['Mã SP']===maSP)
        // Tính giá bình quân
        const tongTien = dsSP.reduce((s:number,nk:any)=>s+Number(nk['Giá nhập thực tế']||0)*Number(nk['Số lượng thực nhận']||0),0)
        const tongSL   = dsSP.reduce((s:number,nk:any)=>s+Number(nk['Số lượng thực nhận']||0),0)
        const giaBQ    = tongSL>0?Math.round(tongTien/tongSL):0
        // Thống kê theo NCC
        const theoNCC:Record<string,{soLan:number,tongSL:number,giaMin:number,giaMax:number,giaCuoi:number,ngayCuoi:string}> = {}
        for (const nk of dsSP) {
          const ma = nk['Mã NCC']||'—'
          const gia = Number(nk['Giá nhập thực tế']||0)
          const sl  = Number(nk['Số lượng thực nhận']||0)
          const ngay = (nk['Ngày nhập']||'').split('T')[0]
          if (!theoNCC[ma]) theoNCC[ma]={soLan:0,tongSL:0,giaMin:gia,giaMax:gia,giaCuoi:gia,ngayCuoi:ngay}
          theoNCC[ma].soLan++
          theoNCC[ma].tongSL+=sl
          theoNCC[ma].giaMin=Math.min(theoNCC[ma].giaMin,gia)
          theoNCC[ma].giaMax=Math.max(theoNCC[ma].giaMax,gia)
          if(ngay>=theoNCC[ma].ngayCuoi){theoNCC[ma].giaCuoi=gia;theoNCC[ma].ngayCuoi=ngay}
        }
        return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px',overflowY:'auto'}}
          onClick={()=>setLichSuGiaSP(null)}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'780px',maxHeight:'92vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
            {/* Header */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px'}}>
              <div>
                <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 4px'}}>📈 Lịch sử giá nhập</h2>
                <div style={{fontWeight:700,color:'var(--primary)',fontSize:'15px'}}>{lichSuGiaSP['Tên sản phẩm']}</div>
                <div style={{fontSize:'12px',color:'#6B7280'}}>{maSP} · {lichSuGiaSP['Đơn vị tính']||''}</div>
              </div>
              <button onClick={()=>setLichSuGiaSP(null)} style={{background:'none',border:'none',cursor:'pointer',fontSize:'20px',color:'#6B7280'}}>✕</button>
            </div>

            {dsSP.length===0?(
              <div style={{textAlign:'center',padding:'48px',color:'#9CA3AF',fontSize:'13px'}}>Chưa có lịch sử nhập kho cho sản phẩm này</div>
            ):(
              <>
                {/* Thống kê tổng quan */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'10px',marginBottom:'16px'}}>
                  {[
                    {icon:'📦',label:'Tổng lần nhập',val:dsSP.length+' lần',c:'var(--primary)'},
                    {icon:'🔢',label:'Tổng SL nhập',val:tongSL+' '+lichSuGiaSP['Đơn vị tính'],c:'#1E40AF'},
                    {icon:'⚖️',label:'Giá bình quân',val:giaBQ.toLocaleString('vi-VN')+'đ',c:'#7C3AED'},
                    {icon:'🏪',label:'Số NCC',val:Object.keys(theoNCC).length+' NCC',c:'#D97706'},
                  ].map(({icon,label,val,c})=>(
                    <div key={label} style={{padding:'10px 12px',borderRadius:'8px',background:'#F8FAFC',border:'1px solid #E5E7EB'}}>
                      <div style={{fontSize:'16px',marginBottom:'2px'}}>{icon}</div>
                      <div style={{fontSize:'14px',fontWeight:800,color:c}}>{val}</div>
                      <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
                    </div>
                  ))}
                </div>

                {/* Thống kê theo NCC */}
                {Object.keys(theoNCC).length>0&&(
                  <div style={{marginBottom:'16px'}}>
                    <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'8px',letterSpacing:'0.05em'}}>SO SÁNH THEO NHÀ CUNG CẤP</div>
                    <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                      {Object.entries(theoNCC).sort((a,b)=>a[1].giaCuoi-b[1].giaCuoi).map(([maNCC,info])=>(
                        <div key={maNCC} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',borderRadius:'8px',background:'#F8FAFC',border:'1px solid #E5E7EB',flexWrap:'wrap'}}>
                          <div style={{flex:1,minWidth:'140px'}}>
                            <div style={{fontWeight:700,fontSize:'13px'}}>{nccMap[maNCC]||maNCC}</div>
                            <div style={{fontSize:'11px',color:'#6B7280'}}>{maNCC} · {info.soLan} lần · {info.tongSL} {lichSuGiaSP['Đơn vị tính']}</div>
                          </div>
                          <div style={{textAlign:'center',minWidth:'90px'}}>
                            <div style={{fontSize:'11px',color:'#6B7280'}}>Giá gần nhất</div>
                            <div style={{fontWeight:800,color:'#16A34A',fontSize:'14px'}}>{info.giaCuoi.toLocaleString('vi-VN')}đ</div>
                            <div style={{fontSize:'10px',color:'#9CA3AF'}}>{info.ngayCuoi}</div>
                          </div>
                          <div style={{textAlign:'center',minWidth:'90px'}}>
                            <div style={{fontSize:'11px',color:'#6B7280'}}>Thấp nhất</div>
                            <div style={{fontWeight:700,color:'#1E40AF',fontSize:'13px'}}>{info.giaMin.toLocaleString('vi-VN')}đ</div>
                          </div>
                          <div style={{textAlign:'center',minWidth:'90px'}}>
                            <div style={{fontSize:'11px',color:'#6B7280'}}>Cao nhất</div>
                            <div style={{fontWeight:700,color:'#DC2626',fontSize:'13px'}}>{info.giaMax.toLocaleString('vi-VN')}đ</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bảng chi tiết từng lần nhập */}
                <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)',marginBottom:'8px',letterSpacing:'0.05em'}}>LỊCH SỬ CHI TIẾT</div>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                    <thead>
                      <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                        <th style={{textAlign:'left',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Mã phiếu</th>
                        <th style={{textAlign:'left',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Ngày nhập</th>
                        <th style={{textAlign:'left',padding:'8px 10px',fontWeight:700}}>Nhà cung cấp</th>
                        <th style={{textAlign:'center',padding:'8px 10px',fontWeight:700}}>SL nhập</th>
                        <th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Giá nhập</th>
                        <th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>CP vận chuyển</th>
                        <th style={{textAlign:'right',padding:'8px 10px',fontWeight:700,whiteSpace:'nowrap'}}>Giá thực tế/SP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dsSP.map((nk:any,i:number)=>{
                        const gia   = Number(nk['Giá nhập thực tế']||0)
                        const sl    = Number(nk['Số lượng thực nhận']||0)
                        const cpVC  = Number(nk['CP vận chuyển về kho']||0)
                        const tongHD= Number(nk['Tổng tiền hàng']||0)
                        // CP VC phân bổ theo SP này = cpVC * (gia*sl / tongHD)
                        const cpPhanBo = tongHD>0?Math.round(cpVC*(gia*sl)/tongHD):0
                        const giaThucTe = sl>0?Math.round((gia*sl+cpPhanBo)/sl):gia
                        // So sánh với lần trước
                        const prev = dsSP[i+1]
                        const prevGia = prev?Number(prev['Giá nhập thực tế']||0):null
                        const delta = prevGia!==null?gia-prevGia:null
                        return (
                          <tr key={nk['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                            <td style={{padding:'8px 10px',fontWeight:600,color:'var(--primary)',fontSize:'12px'}}>{nk['Mã phiếu nhập']||'—'}</td>
                            <td style={{padding:'8px 10px',fontSize:'12px',color:'#6B7280',whiteSpace:'nowrap'}}>
                              {(nk['Ngày nhập']||'').split('T')[0]||'—'}
                            </td>
                            <td style={{padding:'8px 10px',fontSize:'12px'}}>
                              <div style={{fontWeight:600}}>{nccMap[nk['Mã NCC']||'']||nk['Mã NCC']||'—'}</div>
                              <div style={{fontSize:'11px',color:'#9CA3AF'}}>{nk['Mã NCC']||''}</div>
                            </td>
                            <td style={{padding:'8px 10px',textAlign:'center',fontWeight:700}}>{sl}</td>
                            <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700}}>
                              <div>{gia.toLocaleString('vi-VN')}đ</div>
                              {delta!==null&&<div style={{fontSize:'11px',color:delta>0?'#DC2626':delta<0?'#16A34A':'#9CA3AF',fontWeight:600}}>
                                {delta>0?'▲ +':delta<0?'▼ ':''}{delta!==0?Math.abs(delta).toLocaleString('vi-VN')+'đ':'Không đổi'}
                              </div>}
                            </td>
                            <td style={{padding:'8px 10px',textAlign:'right',fontSize:'12px',color:'#6B7280'}}>{cpVC>0?cpVC.toLocaleString('vi-VN')+'đ':'—'}</td>
                            <td style={{padding:'8px 10px',textAlign:'right',fontWeight:700,color:'#7C3AED'}}>{giaThucTe.toLocaleString('vi-VN')}đ</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <button onClick={()=>setLichSuGiaSP(null)} style={{width:'100%',marginTop:'16px',padding:'11px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px',fontWeight:600}}>✕ Đóng</button>
          </div>
        </div>
        )
      })()}

\nfunction Btn({children,active,disabled,onClick}:any){`
if (content.includes(old4)) { content = content.replace(old4, new4); console.log('OK 4. Modal lịch sử giá') }
else console.log('FAIL 4. Modal')

fs.writeFileSync(filePath, content, 'utf8')
console.log('Done! SanPhamClient.tsx saved.')
