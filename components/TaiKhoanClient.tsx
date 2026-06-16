'use client'
import { useState } from 'react'
import { UserSession } from '@/lib/auth'
import { DEFAULT_QUYEN, QUYEN_LABELS, QUYEN_GROUPS } from '@/lib/quyen-config'

export default function TaiKhoanClient({ taiKhoanList, nhanVienList=[], user }: {
  taiKhoanList: any[]; nhanVienList?: any[]; user: UserSession
}) {
  const [tabMain, setTabMain] = useState<'taikhoan'|'theme'>('taikhoan')
  const [chon, setChon] = useState<any>(null)
  const [quyen, setQuyen] = useState<Record<string,boolean>>({})
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgOk, setMsgOk] = useState(true)
  const [showDoi, setShowDoi] = useState(false)
  const [mkCu, setMkCu] = useState('')
  const [mkMoi, setMkMoi] = useState('')
  const [mkNhapLai, setMkNhapLai] = useState('')
  const [showTaoMoi, setShowTaoMoi] = useState(false)
  const [formTao, setFormTao] = useState({hoTen:'',tenDangNhap:'',matKhau:'',maNV:'',vaiTro:'Nhân viên'})
  const [confirmKhoa, setConfirmKhoa] = useState<any>(null)
  const [showDoiMKChu, setShowDoiMKChu] = useState(false)
  const [mkChuMoi, setMkChuMoi] = useState('')
  const [mkChuNhapLai, setMkChuNhapLai] = useState('')
  const [theme, setTheme] = useState({primary:'#1B3A6B',primaryLight:'#2E5BA8',primaryPale:'#EBF1FB',accent:'#C8860A',accentLight:'#F5A623',accentPale:'#FEF6E4',bg:'#F7F8FC'})
  const [savingTheme, setSavingTheme] = useState(false)

  function showMsg(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),4000)}

  function chonTK(tk:any) {
    setChon(tk)
    try { setQuyen(tk['Quyền']?JSON.parse(tk['Quyền']):{...DEFAULT_QUYEN}) } catch { setQuyen({...DEFAULT_QUYEN}) }
    setShowDoi(false);setMkCu('');setMkMoi('');setMkNhapLai('')
  }
  function toggleQuyen(key:string){ setQuyen(p=>({...p,[key]:!p[key]})) }
  function batTatNhom(keys:string[],bat:boolean){ setQuyen(p=>{const n={...p};keys.forEach(k=>n[k]=bat);return n}) }

  async function luuQuyen() {
    if(!chon)return
    setLoading(true)
    try{
      const res=await fetch('/api/tai-khoan',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:chon['Id']||chon['id'],quyen:JSON.stringify(quyen)})})
      if(!res.ok)throw new Error((await res.json()).message)
      setChon((p:any)=>({...p,'Quyền':JSON.stringify(quyen)}))
      showMsg('✅ Đã lưu phân quyền')
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function doiMatKhau() {
    if(!mkMoi||mkMoi.length<6){showMsg('Mật khẩu mới phải ít nhất 6 ký tự',false);return}
    if(mkMoi!==mkNhapLai){showMsg('Mật khẩu nhập lại không khớp',false);return}
    setLoading(true)
    try{
      const res=await fetch('/api/tai-khoan',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:chon['Id']||chon['id'],matKhauMoi:mkMoi,isOwner:true})})
      if(!res.ok)throw new Error((await res.json()).message)
      showMsg('✅ Đã đổi mật khẩu')
      setShowDoi(false);setMkCu('');setMkMoi('');setMkNhapLai('')
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function doiMKChu() {
    if(!mkChuMoi||mkChuMoi.length<6){showMsg('Mật khẩu mới phải ít nhất 6 ký tự',false);return}
    if(mkChuMoi!==mkChuNhapLai){showMsg('Mật khẩu nhập lại không khớp',false);return}
    setLoading(true)
    try{
      const meTK=taiKhoanList.find(tk=>tk['Vai trò']==='Chủ cửa hàng')
      if(!meTK)throw new Error('Không tìm thấy tài khoản')
      const res=await fetch('/api/tai-khoan',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:meTK['Id']||meTK['id'],matKhauMoi:mkChuMoi})})
      if(!res.ok)throw new Error((await res.json()).message)
      showMsg('✅ Đã đổi mật khẩu thành công')
      setShowDoiMKChu(false);setMkChuMoi('');setMkChuNhapLai('')
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function khoaTK(tk:any){ setConfirmKhoa(tk) }

  async function xacNhanKhoa() {
    if(!confirmKhoa)return
    setLoading(true)
    try{
      const ttMoi=confirmKhoa['Trạng thái']==='Khóa'?'Hoạt động':'Khóa'
      const res=await fetch('/api/tai-khoan',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:confirmKhoa['Id']||confirmKhoa['id'],trangThai:ttMoi})})
      if(!res.ok)throw new Error((await res.json()).message)
      showMsg(ttMoi==='Khóa'?'🔒 Đã khóa tài khoản':'✅ Đã mở khóa tài khoản')
      setConfirmKhoa(null);window.location.reload()
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function taoTaiKhoan() {
    if(!formTao.hoTen||!formTao.tenDangNhap){showMsg('Vui lòng nhập đầy đủ họ tên và tên đăng nhập',false);return}
    if(!formTao.matKhau||formTao.matKhau.length<6){showMsg('Mật khẩu phải ít nhất 6 ký tự',false);return}
    setLoading(true)
    try{
      const res=await fetch('/api/tai-khoan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(formTao)})
      if(!res.ok)throw new Error((await res.json()).message)
      showMsg('✅ Đã tạo tài khoản')
      setShowTaoMoi(false);setFormTao({hoTen:'',tenDangNhap:'',matKhau:'',maNV:'',vaiTro:'Nhân viên'})
      window.location.reload()
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  async function luuTheme() {
    setSavingTheme(true)
    try{
      const r=await fetch('/api/cai-dat')
      const d=await r.json()
      if(!d.id)throw new Error('Không tìm thấy cài đặt')
      const res=await fetch('/api/cai-dat',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:d.id,ui_theme:JSON.stringify(theme)})})
      if(!res.ok)throw new Error((await res.json()).message)
      showMsg('✅ Đã lưu theme')
      setTimeout(()=>window.location.reload(),1500)
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setSavingTheme(false)}
  }

  const nvList=taiKhoanList.filter(tk=>tk['Vai trò']!=='Chủ cửa hàng')
  const chuTK=taiKhoanList.find(tk=>tk['Vai trò']==='Chủ cửa hàng')
  const PRESETS=[
    {name:'🌊 Navy & Gold (Mặc định)',p:'#1B3A6B',pl:'#2E5BA8',pp:'#EBF1FB',a:'#C8860A',al:'#F5A623',ap:'#FEF6E4',bg:'#F7F8FC'},
    {name:'🌿 Xanh lá & Nâu',p:'#166534',pl:'#16A34A',pp:'#DCFCE7',a:'#92400E',al:'#D97706',ap:'#FEF3C7',bg:'#F7F9F7'},
    {name:'🍷 Đỏ sang trọng',p:'#7F1D1D',pl:'#B91C1C',pp:'#FEE2E2',a:'#78350F',al:'#D97706',ap:'#FEF3C7',bg:'#FDF7F7'},
    {name:'🌸 Tím hiện đại',p:'#4C1D95',pl:'#7C3AED',pp:'#F5F3FF',a:'#BE185D',al:'#EC4899',ap:'#FCE7F3',bg:'#F9F7FF'},
    {name:'🌊 Xanh dương tươi',p:'#1E3A5F',pl:'#1D4ED8',pp:'#DBEAFE',a:'#0369A1',al:'#0EA5E9',ap:'#E0F2FE',bg:'#F0F7FF'},
    {name:'⚫ Tối giản',p:'#111827',pl:'#374151',pp:'#F3F4F6',a:'#374151',al:'#6B7280',ap:'#F9FAFB',bg:'#F3F4F6'},
  ]
  const COLOR_KEYS=[
    {label:'Màu chính (Primary)',key:'primary'},
    {label:'Màu chính nhạt',key:'primaryLight'},
    {label:'Màu chính rất nhạt',key:'primaryPale'},
    {label:'Màu phụ (Accent)',key:'accent'},
    {label:'Màu phụ nhạt',key:'accentLight'},
    {label:'Màu phụ rất nhạt',key:'accentPale'},
    {label:'Màu nền',key:'bg'},
  ]

  return (
    <div style={{padding:'20px'}}>
      {/* Tabs */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px',flexWrap:'wrap',gap:'10px'}}>
        <div>
          <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:'0 0 4px'}}>⚙️ Quản lý hệ thống</h1>
          <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:0}}>Tài khoản, phân quyền và giao diện</p>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          <button onClick={()=>setTabMain('taikhoan')} style={{padding:'8px 16px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:600,fontSize:'13px',background:tabMain==='taikhoan'?'var(--primary)':'var(--bg-secondary)',color:tabMain==='taikhoan'?'white':'var(--text-secondary)'}}>👤 Tài khoản</button>
          <button onClick={()=>setTabMain('theme')} style={{padding:'8px 16px',borderRadius:'8px',border:'none',cursor:'pointer',fontWeight:600,fontSize:'13px',background:tabMain==='theme'?'var(--primary)':'var(--bg-secondary)',color:tabMain==='theme'?'white':'var(--text-secondary)'}}>🎨 Giao diện</button>
        </div>
      </div>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'14px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B'}}>{msg}</div>}

      {/* Modal xác nhận khóa */}
      {confirmKhoa&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'400px'}}>
            <div style={{textAlign:'center',marginBottom:'16px'}}>
              <div style={{fontSize:'40px',marginBottom:'8px'}}>{confirmKhoa['Trạng thái']==='Khóa'?'🔓':'🔒'}</div>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:'0 0 8px'}}>{confirmKhoa['Trạng thái']==='Khóa'?'Mở khóa tài khoản?':'Khóa tài khoản?'}</h2>
              <p style={{fontSize:'13px',color:'#6B7280',margin:0}}>Tài khoản: <strong>{confirmKhoa['Họ tên']||confirmKhoa['Tên đăng nhập']}</strong></p>
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={()=>setConfirmKhoa(null)} style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',fontSize:'13px',cursor:'pointer'}}>Hủy</button>
              <button onClick={xacNhanKhoa} disabled={loading} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:confirmKhoa['Trạng thái']==='Khóa'?'#16A34A':'#DC2626',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
                {loading?'⏳':confirmKhoa['Trạng thái']==='Khóa'?'✅ Mở khóa':'🔒 Khóa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal tạo tài khoản */}
      {showTaoMoi&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'480px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h2 style={{fontSize:'16px',fontWeight:700,margin:0}}>➕ Tạo tài khoản nhân viên</h2>
              <button onClick={()=>setShowTaoMoi(false)} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:'#6B7280'}}>×</button>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div>
                <label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Liên kết nhân viên</label>
                <select className="input" value={formTao.maNV} onChange={e=>{
                  const nv=nhanVienList.find((n:any)=>n['Mã nhân viên']===e.target.value)
                  setFormTao(p=>({...p,maNV:e.target.value,hoTen:nv?.['Họ và Tên']||p.hoTen,
                    tenDangNhap:p.tenDangNhap||(nv?.['Họ và Tên']||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'.')}))
                }}>
                  <option value="">-- Chọn nhân viên (không bắt buộc) --</option>
                  {nhanVienList.filter((n:any)=>n['Trạng thái']==='Đang làm').map((n:any)=>(
                    <option key={n['Mã nhân viên']} value={n['Mã nhân viên']}>{n['Mã nhân viên']} · {n['Họ và Tên']}</option>
                  ))}
                </select>
              </div>
              <div><label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Họ và tên *</label>
                <input className="input" placeholder="Nhập họ và tên..." value={formTao.hoTen} onChange={e=>setFormTao(p=>({...p,hoTen:e.target.value}))}/></div>
              <div><label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Tên đăng nhập *</label>
                <input className="input" placeholder="VD: binhnv..." value={formTao.tenDangNhap} onChange={e=>setFormTao(p=>({...p,tenDangNhap:e.target.value}))}/></div>
              <div><label style={{fontSize:'12px',fontWeight:600,display:'block',marginBottom:'4px'}}>Mật khẩu * (≥6 ký tự)</label>
                <input className="input" type="password" placeholder="Nhập mật khẩu..." value={formTao.matKhau} onChange={e=>setFormTao(p=>({...p,matKhau:e.target.value}))}/></div>
              <div style={{display:'flex',gap:'10px',marginTop:'4px'}}>
                <button onClick={taoTaiKhoan} disabled={loading} style={{flex:1,padding:'11px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer'}}>{loading?'⏳ Đang tạo...':'✅ Tạo tài khoản'}</button>
                <button onClick={()=>setShowTaoMoi(false)} style={{padding:'11px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',fontSize:'13px',cursor:'pointer'}}>Hủy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Giao diện */}
      {tabMain==='theme'&&(
        <div>
          <div style={{display:'flex',justifyContent:'flex-end',marginBottom:'12px',gap:'10px',alignItems:'center'}}>
            <span style={{fontSize:'12px',color:'var(--text-muted)'}}>Giao diện sẽ cập nhật sau khi trang reload</span>
            <button onClick={luuTheme} disabled={savingTheme}
              style={{padding:'9px 20px',borderRadius:'8px',border:'none',
                background:savingTheme?'#9CA3AF':'#16A34A',color:'white',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              {savingTheme?'⏳ Đang lưu...':'💾 Lưu & áp dụng'}
            </button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:'16px'}}>
          <div className="card" style={{padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:700,marginBottom:'12px'}}>🎨 Bộ màu có sẵn</div>
            <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
              {PRESETS.map(t=>(
                <button key={t.name} onClick={()=>setTheme({primary:t.p,primaryLight:t.pl,primaryPale:t.pp,accent:t.a,accentLight:t.al,accentPale:t.ap,bg:t.bg})}
                  style={{display:'flex',alignItems:'center',gap:'10px',padding:'10px 12px',borderRadius:'8px',
                    border:`2px solid ${theme.primary===t.p?t.p:'var(--border)'}`,
                    background:theme.primary===t.p?t.pp:'white',cursor:'pointer',textAlign:'left'}}>
                  <div style={{display:'flex',gap:'4px'}}>
                    <div style={{width:'16px',height:'16px',borderRadius:'50%',background:t.p}}/>
                    <div style={{width:'16px',height:'16px',borderRadius:'50%',background:t.a}}/>
                    <div style={{width:'16px',height:'16px',borderRadius:'50%',background:t.bg,border:'1px solid #E5E7EB'}}/>
                  </div>
                  <span style={{fontSize:'13px',fontWeight:600}}>{t.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="card" style={{padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:700,marginBottom:'12px'}}>🖌️ Tùy chỉnh màu</div>
            <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
              {COLOR_KEYS.map(({label,key})=>(
                <div key={key} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{label}</span>
                  <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                    <span style={{fontSize:'11px',fontFamily:'monospace',color:'var(--text-muted)'}}>{(theme as any)[key]}</span>
                    <input type="color" value={(theme as any)[key]} onChange={e=>setTheme(p=>({...p,[key]:e.target.value}))}
                      style={{width:'32px',height:'32px',borderRadius:'6px',border:'1px solid var(--border)',cursor:'pointer',padding:'2px'}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="card" style={{padding:'16px'}}>
            <div style={{fontSize:'13px',fontWeight:700,marginBottom:'12px'}}>👁️ Xem trước</div>
            <div style={{borderRadius:'8px',overflow:'hidden',border:'1px solid var(--border)',marginBottom:'12px'}}>
              <div style={{background:theme.primary,padding:'10px 14px',color:'white',fontWeight:700,fontSize:'13px'}}>Thanh điều hướng</div>
              <div style={{background:theme.bg,padding:'12px'}}>
                <button style={{background:theme.primary,color:'white',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:600,marginRight:'6px'}}>Nút chính</button>
                <button style={{background:theme.accent,color:'white',border:'none',borderRadius:'6px',padding:'6px 12px',fontSize:'12px',fontWeight:600}}>Nút phụ</button>
                <div style={{marginTop:'8px',padding:'8px',borderRadius:'6px',background:theme.primaryPale,color:theme.primary,fontSize:'12px'}}>Thông báo màu chính</div>
              </div>
            </div>
            <p style={{fontSize:'11px',color:'var(--text-muted)',textAlign:'center',marginTop:'8px'}}>Chọn màu xong bấm Lưu phía trên</p>
          </div>
          </div>
        </div>
      )}

      {/* Tab Tài khoản */}
      {tabMain==='taikhoan'&&(
        <div style={{display:'grid',gridTemplateColumns:'320px 1fr',gap:'16px',alignItems:'start'}}>
          {/* Danh sách */}
          <div className="card" style={{padding:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <div style={{fontSize:'12px',fontWeight:700,color:'var(--text-secondary)'}}>DANH SÁCH TÀI KHOẢN</div>
              <button onClick={()=>setShowTaoMoi(true)} style={{padding:'5px 12px',borderRadius:'6px',border:'none',background:'var(--primary)',color:'white',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>+ Thêm</button>
            </div>
            {chuTK&&(
              <div style={{padding:'10px 12px',borderRadius:'8px',marginBottom:'8px',background:'#EFF6FF',border:'1px solid #BFDBFE'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#1E40AF'}}>{chuTK['Họ tên']||chuTK['Tên đăng nhập']}</div>
                    <div style={{fontSize:'11px',color:'#3B82F6'}}>👑 Chủ cửa hàng · Toàn quyền</div>
                  </div>
                  <button onClick={()=>setShowDoiMKChu(!showDoiMKChu)} style={{padding:'4px 8px',borderRadius:'5px',border:'1px solid #BFDBFE',background:'white',color:'#1E40AF',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>🔑 Đổi MK</button>
                </div>
                {showDoiMKChu&&(
                  <div style={{marginTop:'10px',display:'flex',flexDirection:'column',gap:'6px'}}>
                    <input className="input" type="password" placeholder="Mật khẩu mới (≥6 ký tự)" value={mkChuMoi} onChange={e=>setMkChuMoi(e.target.value)}/>
                    <input className="input" type="password" placeholder="Nhập lại mật khẩu" value={mkChuNhapLai} onChange={e=>setMkChuNhapLai(e.target.value)}/>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button onClick={doiMKChu} disabled={loading} style={{flex:1,padding:'6px',borderRadius:'6px',border:'none',background:'#1E40AF',color:'white',fontWeight:700,fontSize:'12px',cursor:'pointer'}}>{loading?'⏳':'✅ Xác nhận'}</button>
                      <button onClick={()=>setShowDoiMKChu(false)} style={{padding:'6px 10px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',fontSize:'12px',cursor:'pointer'}}>Hủy</button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {nvList.length===0&&<div style={{textAlign:'center',padding:'20px',color:'var(--text-muted)',fontSize:'12px'}}>Chưa có tài khoản nhân viên</div>}
            {nvList.map(tk=>(
              <div key={tk['Mã tài khoản']} onClick={()=>chonTK(tk)} style={{padding:'10px 12px',borderRadius:'8px',marginBottom:'6px',cursor:'pointer',
                background:chon?.['Mã tài khoản']===tk['Mã tài khoản']?'#F0FDF4':'var(--bg-secondary)',
                border:`1px solid ${chon?.['Mã tài khoản']===tk['Mã tài khoản']?'#16A34A':'var(--border)'}`,transition:'all 0.15s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:600}}>{tk['Họ tên']||tk['Tên đăng nhập']}</div>
                    <div style={{fontSize:'11px',color:'var(--text-muted)'}}>{tk['Tên đăng nhập']} · {tk['Mã NV']||''}</div>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:'3px',alignItems:'flex-end'}}>
                    <span style={{fontSize:'10px',padding:'2px 6px',borderRadius:'8px',fontWeight:600,
                      background:tk['Trạng thái']==='Khóa'?'#FEE2E2':'#D1FAE5',color:tk['Trạng thái']==='Khóa'?'#DC2626':'#16A34A'}}>
                      {tk['Trạng thái']==='Khóa'?'🔒 Khóa':'✅ Hoạt động'}
                    </span>
                    {tk['Vai trò']!=='Chủ cửa hàng'&&(
                      <button onClick={e=>{e.stopPropagation();khoaTK(tk)}} style={{fontSize:'10px',padding:'2px 6px',borderRadius:'5px',border:'1px solid var(--border)',background:'white',cursor:'pointer',color:'var(--text-secondary)'}}>
                        {tk['Trạng thái']==='Khóa'?'Mở khóa':'Khóa'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Panel phân quyền */}
          {!chon&&(
            <div className="card" style={{padding:'40px',textAlign:'center',color:'var(--text-muted)'}}>
              <div style={{fontSize:'40px',marginBottom:'12px'}}>👈</div>
              <div style={{fontSize:'14px'}}>Chọn tài khoản nhân viên để phân quyền</div>
            </div>
          )}
          {chon&&(
            <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
              <div className="card" style={{padding:'14px 16px'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
                  <div>
                    <div style={{fontSize:'16px',fontWeight:700}}>{chon['Họ tên']||chon['Tên đăng nhập']}</div>
                    <div style={{fontSize:'12px',color:'var(--text-secondary)'}}>@{chon['Tên đăng nhập']} · {chon['Mã NV']||'—'}</div>
                  </div>
                  <div style={{display:'flex',gap:'8px'}}>
                    <button onClick={()=>setShowDoi(!showDoi)} style={{padding:'7px 14px',borderRadius:'7px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'12px',fontWeight:600}}>🔑 Đổi mật khẩu</button>
                    <button onClick={luuQuyen} disabled={loading} style={{padding:'7px 14px',borderRadius:'7px',border:'none',background:loading?'#9CA3AF':'#16A34A',color:'white',cursor:'pointer',fontSize:'13px',fontWeight:700}}>{loading?'⏳':'💾 Lưu phân quyền'}</button>
                  </div>
                </div>
              </div>
              {showDoi&&(
                <div className="card" style={{padding:'16px',background:'#FFF7ED',border:'1px solid #FED7AA'}}>
                  <div style={{fontSize:'13px',fontWeight:700,marginBottom:'12px',color:'#92400E'}}>🔑 Đổi mật khẩu cho {chon['Tên đăng nhập']}</div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'10px',alignItems:'end'}}>
                    <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Mật khẩu mới *</label>
                      <input className="input" type="password" placeholder="Ít nhất 6 ký tự" value={mkMoi} onChange={e=>setMkMoi(e.target.value)}/></div>
                    <div><label style={{fontSize:'11px',fontWeight:600,display:'block',marginBottom:'4px'}}>Nhập lại *</label>
                      <input className="input" type="password" placeholder="Nhập lại mật khẩu" value={mkNhapLai} onChange={e=>setMkNhapLai(e.target.value)}/></div>
                    <button onClick={doiMatKhau} disabled={loading} style={{padding:'8px 14px',borderRadius:'7px',border:'none',background:'#D97706',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px',whiteSpace:'nowrap'}}>✅ Xác nhận</button>
                  </div>
                </div>
              )}
              {QUYEN_GROUPS.map(group=>{
                const tatCaBat=group.keys.every(k=>quyen[k])
                const tatCaTat=group.keys.every(k=>!quyen[k])
                return (
                  <div key={group.label} className="card" style={{padding:'14px 16px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
                      <div style={{fontSize:'13px',fontWeight:700}}>{group.label}</div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>batTatNhom(group.keys,true)} style={{padding:'3px 10px',borderRadius:'5px',border:'1px solid #16A34A',background:tatCaBat?'#16A34A':'white',color:tatCaBat?'white':'#16A34A',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>Bật tất cả</button>
                        <button onClick={()=>batTatNhom(group.keys,false)} style={{padding:'3px 10px',borderRadius:'5px',border:'1px solid #DC2626',background:tatCaTat?'#DC2626':'white',color:tatCaTat?'white':'#DC2626',fontSize:'11px',fontWeight:600,cursor:'pointer'}}>Tắt tất cả</button>
                      </div>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'8px'}}>
                      {group.keys.map(key=>(
                        <label key={key} onClick={()=>toggleQuyen(key)} style={{display:'flex',alignItems:'center',gap:'10px',padding:'9px 12px',borderRadius:'8px',cursor:'pointer',userSelect:'none',
                          background:quyen[key]?'#F0FDF4':'var(--bg-secondary)',border:`1px solid ${quyen[key]?'#86EFAC':'var(--border)'}`,transition:'all 0.15s'}}>
                          <div style={{width:'20px',height:'20px',borderRadius:'5px',flexShrink:0,background:quyen[key]?'#16A34A':'white',
                            border:`2px solid ${quyen[key]?'#16A34A':'#D1D5DB'}`,display:'flex',alignItems:'center',justifyContent:'center',
                            color:'white',fontSize:'13px',fontWeight:700,transition:'all 0.15s'}}>
                            {quyen[key]?'✓':''}
                          </div>
                          <span style={{fontSize:'12px',fontWeight:quyen[key]?600:400,color:quyen[key]?'#15803D':'var(--text-secondary)'}}>{QUYEN_LABELS[key]||key}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
