'use client'
// components/KiemKhoClient.tsx
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserSession } from '@/lib/auth'

function fDate(s:string){if(!s)return'—';try{const d=new Date(s);return`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`}catch{return s}}
function boDau(s:string){return(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase()}

const TT_COLOR:Record<string,{bg:string,c:string}> = {
  'Nháp':          {bg:'#F3F4F6',c:'#374151'},
  'Chờ duyệt':     {bg:'#FEF3C7',c:'#92400E'},
  'Đã duyệt':      {bg:'#D1FAE5',c:'#065F46'},
}
const NN_COLOR:Record<string,{bg:string,c:string}> = {
  'Không chênh lệch':   {bg:'#D1FAE5',c:'#065F46'},
  'Có nguyên nhân':     {bg:'#DBEAFE',c:'#1E40AF'},
  'Không rõ nguyên nhân':{bg:'#FEE2E2',c:'#991B1B'},
}
const LOAI_KIEM = ['Tháng','Quý','Năm','Bất thường']
const SO_DONG = 10

export default function KiemKhoClient({dotKiemList,sanPhamList,danhMucList=[],giaBinhQuanMap={},nvList=[],user}:{
  dotKiemList:any[]; sanPhamList:any[]; danhMucList:any[]
  giaBinhQuanMap:Record<string,number>; nvList:any[]; user:UserSession
}){
  const router = useRouter()
  const isOwner = user.vaiTro === 'Chủ cửa hàng'

  // ── STATE CHÍNH ──────────────────────────────────────────
  const [dotLocal, setDotLocal] = useState(dotKiemList)
  const [view,     setView]     = useState<'list'|'detail'|'create'>('list')
  const [dotChon,  setDotChon]  = useState<any>(null)
  const [ctList,   setCtList]   = useState<any[]>([])
  const [loadingCT,setLoadingCT]= useState(false)

  // ── STATE UI LIST ────────────────────────────────────────
  const [search,    setSearch]   = useState('')
  const [filterTT,  setFilterTT] = useState('Tất cả')
  const [trang,     setTrang]    = useState(1)
  const [msg,       setMsg]      = useState('')
  const [msgOk,     setMsgOk]    = useState(true)
  const [loading,   setLoading]  = useState(false)
  const [xoaDot,    setXoaDot]   = useState<any>(null)

  // ── STATE TẠO PHIẾU ──────────────────────────────────────
  const [loaiKiem,  setLoaiKiem] = useState('Tháng')
  const [ngayKiem,  setNgayKiem] = useState(new Date().toISOString().split('T')[0])
  const [nguoiKiem, setNguoiKiem]= useState(user.hoTen||user.tenDangNhap||'')
  const [showNVDrop, setShowNVDrop] = useState(false)
  const [searchNV,   setSearchNV]   = useState('')
  const [ghiChu,    setGhiChu]   = useState('')
  const [searchSP,      setSearchSP]      = useState('')
  const [filterDMKiem,  setFilterDMKiem]  = useState('Tất cả')
  const [searchDMKiem,  setSearchDMKiem]  = useState('')
  const [showDMDrop,    setShowDMDrop]    = useState(false)
  const [dsSPKiem,  setDsSPKiem] = useState<any[]>([]) // SP được chọn để kiểm
  const [chonTatCa, setChonTatCa]= useState(false)
  const danhMucNames = useMemo(()=>['Tất cả',...[...danhMucList].sort((a,b)=>(a['Tên danh mục']||'').localeCompare(b['Tên danh mục']||'','vi')).map((d:any)=>d['Tên danh mục']||''),'Chưa phân loại'],[danhMucList])

  // ── STATE CHI TIẾT ───────────────────────────────────────
  const [editingCT, setEditingCT]= useState<Record<number,any>>({}) // {rowId: {tonTT, hangHong, nguyenNhan, nguoiChiuTN, ghiChuCT}}
  const [savingCT,  setSavingCT] = useState<number|null>(null)
  const [filterChenh,setFilterChenh]=useState('Tất cả')

  function showMsg(t:string,ok=true){setMsg(t);setMsgOk(ok);setTimeout(()=>setMsg(''),5000)}

  function inPhieuTrong(){
    if(!dsSPKiem.length){showMsg('Chọn ít nhất 1 SP trước khi in',false);return}
    const rows=dsSPKiem.map((sp:any,i:number)=>[
      '<tr>',
      '<td style="text-align:center;width:40px;font-weight:600">'+(i+1)+'</td>',
      '<td style="padding:14px 12px"><div style="font-size:14px;font-weight:700;line-height:1.5">'+sp.tenSP+'</div><div style="font-size:11px;color:#6B7280;margin-top:2px">'+sp.maSP+(sp.donVi?' · '+sp.donVi:'')+'</div></td>',
      '<td style="text-align:center;width:130px;border:2px solid #1e3a5f">&nbsp;</td>',
      '</tr>'
    ].join('')).join('')
    const html=[
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Phiếu kiểm kho</title>',
      '<style>',
      'body{font-family:Arial,sans-serif;padding:28px;font-size:13px;color:#111;}',
      'h2{margin:0;font-size:20px;color:#1e3a5f;font-weight:800;}',
      '.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;border-bottom:2px solid #1e3a5f;padding-bottom:12px;}',
      '.meta{font-size:12px;line-height:1.8;color:#374151;}',
      '.meta strong{color:#111;}',
      '.note{margin:12px 0;padding:10px 14px;background:#FEF9C3;border-left:4px solid #F59E0B;font-size:12px;color:#92400E;}',
      'table{width:100%;border-collapse:collapse;margin-top:4px;}',
      'th{background:#1e3a5f;color:white;padding:10px 12px;font-size:13px;text-align:left;font-weight:700;}',
      'td{padding:0;border-bottom:1px solid #D1D5DB;vertical-align:middle;}',
      'tr:nth-child(even) td{background:#F9FAFB;}',
      '.sign-row{display:flex;justify-content:space-around;margin-top:40px;}',
      '.sign{text-align:center;}',
      '.sign-title{font-weight:700;font-size:13px;margin-bottom:56px;}',
      '.sign-line{border-top:1px solid #374151;padding-top:6px;font-size:11px;color:#6B7280;width:160px;margin:0 auto;}',
      '@media print{body{padding:16px;}}',
      '</style></head><body>',
      '<div class="header">',
      '<div>',
      '<h2>Nội Thất Tính Tuyết</h2>',
      '<div style="font-size:13px;color:#6B7280;margin-top:2px;font-weight:600;letter-spacing:1px">PHIẾU KIỂM KHO</div>',
      '</div>',
      '<div class="meta" style="text-align:right">',
      '<div>Loại kiểm: <strong>'+loaiKiem+'</strong></div>',
      '<div>Ngày kiểm: <strong>'+ngayKiem+'</strong></div>',
      '<div>Người kiểm: <strong>'+(nguoiKiem||'_______________')+'</strong></div>',
      '<div>Tổng SP: <strong>'+dsSPKiem.length+'</strong></div>',
      '</div></div>',
      '<div class="note">📋 Hướng dẫn: Đếm số lượng thực tế từng sản phẩm và ghi vào cột <strong>Số lượng thực tế</strong>.</div>',
      '<table>',
      '<thead><tr>',
      '<th style="width:44px;text-align:center">STT</th>',
      '<th>Tên sản phẩm</th>',
      '<th style="width:140px;text-align:center">Số lượng thực tế</th>',
      '</tr></thead>',
      '<tbody>'+rows+'</tbody>',
      '</table>',
      '<div class="sign-row">',
      '<div class="sign"><div class="sign-title">Người kiểm kho</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>',
      '<div class="sign"><div class="sign-title">Chủ cửa hàng</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>',
      '</div>',
      '<script>window.onload=function(){window.print()}<\/script>',
      '</body></html>'
    ].join('')
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close()}
  }

  function inBaoCaoKetQua(){
    if(!dotChon||!ctList.length) return
    const tongSP=ctList.length
    const khop=ctList.filter((ct:any)=>Number(ct['Chênh lệch']||0)===0).length
    const soSPChenh=ctList.filter((ct:any)=>Number(ct['Chênh lệch']||0)!==0).length
    const rows=ctList.map((ct:any,i:number)=>{
      const cl=Number(ct['Chênh lệch']||0)
      const bgRow=cl!==0?'background:#FFF7F7':''
      const mauCl=cl>0?'background:#DBEAFE;color:#1E40AF':cl<0?'background:#FEE2E2;color:#DC2626':'background:#D1FAE5;color:#16A34A'
      return [
        '<tr style="'+bgRow+'">',
        '<td style="text-align:center;width:40px;font-size:12px">'+(i+1)+'</td>',
        '<td style="padding:10px 12px"><div style="font-weight:700;font-size:13px">'+(ct['Tên SP']||'—')+'</div><div style="font-size:11px;color:#6B7280">'+(ct['Mã SP']||'')+'</div></td>',
        '<td style="text-align:center;font-weight:700;width:80px;font-size:13px">'+(ct['Tồn hệ thống']??'—')+'</td>',
        '<td style="text-align:center;font-weight:700;width:80px;font-size:13px">'+(ct['Tồn thực tế']??'—')+'</td>',
        '<td style="text-align:center;width:90px"><span style="display:inline-block;padding:3px 10px;border-radius:10px;font-weight:700;font-size:13px;'+mauCl+'">'+(cl>0?'+':'')+cl+'</span></td>',
        '</tr>'
      ].join('')
    }).join('')
    const ngayKiemHT=dotChon['Ngày kiểm']?new Date(dotChon['Ngày kiểm']).toLocaleDateString('vi-VN'):'—'
    const ttBg=dotChon['Trạng thái']==='Đã duyệt'?'background:#D1FAE5;color:#065F46':'background:#FEF3C7;color:#92400E'
    const html=[
      '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Báo cáo kiểm kho '+dotChon['Mã đợt kiểm']+'</title>',
      '<style>',
      'body{font-family:Arial,sans-serif;padding:28px;font-size:13px;color:#111;}',
      'h2{margin:0;font-size:20px;color:#1e3a5f;font-weight:800;}',
      '.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;border-bottom:2px solid #1e3a5f;padding-bottom:12px;}',
      '.info-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px;}',
      '.info-box{background:#F8FAFC;border:1px solid #E5E7EB;border-radius:6px;padding:10px 14px;}',
      '.info-label{font-size:11px;color:#6B7280;margin-bottom:3px;}',
      '.info-val{font-size:15px;font-weight:700;}',
      '.stat-row{display:flex;gap:14px;margin-bottom:16px;}',
      '.stat{text-align:center;padding:12px 16px;border-radius:8px;border:1px solid #E5E7EB;}',
      'table{width:100%;border-collapse:collapse;}',
      'th{background:#1e3a5f;color:white;padding:10px 12px;font-size:13px;text-align:left;font-weight:700;}',
      'td{padding:0;border-bottom:1px solid #E5E7EB;vertical-align:middle;}',
      'tr:nth-child(even) td{background:#F9FAFB;}',
      '.sign-row{display:flex;justify-content:space-around;margin-top:40px;}',
      '.sign-title{font-weight:700;font-size:13px;margin-bottom:56px;text-align:center;}',
      '.sign-line{border-top:1px solid #374151;padding-top:6px;font-size:11px;color:#6B7280;text-align:center;width:180px;margin:0 auto;}',
      '@media print{body{padding:16px;}}',
      '</style></head><body>',
      '<div class="header">',
      '<div><h2>Nội Thất Tính Tuyết</h2><p style="color:#6B7280;margin:4px 0 0;font-size:13px;font-weight:600;letter-spacing:1px">BÁO CÁO KIỂM KHO</p></div>',
      '<div style="text-align:right">',
      '<div style="font-size:18px;font-weight:800;color:#1e3a5f">'+dotChon['Mã đợt kiểm']+'</div>',
      '<span style="display:inline-block;padding:3px 12px;border-radius:10px;font-size:12px;font-weight:700;'+ttBg+'">'+dotChon['Trạng thái']+'</span>',
      '</div></div>',
      '<div class="info-grid">',
      '<div class="info-box"><div class="info-label">Loại kiểm</div><div class="info-val">'+(dotChon['Loại kiểm']||'—')+'</div></div>',
      '<div class="info-box"><div class="info-label">Ngày kiểm</div><div class="info-val">'+ngayKiemHT+'</div></div>',
      '<div class="info-box"><div class="info-label">Người kiểm</div><div class="info-val">'+(dotChon['Người kiểm']||'—')+'</div></div>',
      '</div>',
      '<div class="stat-row">',
      '<div class="stat" style="background:#EFF6FF;border-color:#BFDBFE"><div style="font-size:26px;font-weight:800;color:#1E40AF">'+tongSP+'</div><div style="font-size:12px;color:#6B7280">Tổng SP</div></div>',
      '<div class="stat" style="background:#D1FAE5;border-color:#6EE7B7"><div style="font-size:26px;font-weight:800;color:#065F46">'+khop+'</div><div style="font-size:12px;color:#6B7280">Khớp tồn kho</div></div>',
      '<div class="stat" style="background:#FEE2E2;border-color:#FCA5A5"><div style="font-size:26px;font-weight:800;color:#DC2626">'+soSPChenh+'</div><div style="font-size:12px;color:#6B7280">Chênh lệch</div></div>',
      '</div>',
      '<table>',
      '<thead><tr>',
      '<th style="width:44px;text-align:center">STT</th>',
      '<th>Tên sản phẩm</th>',
      '<th style="text-align:center;width:90px">Tồn hệ thống</th>',
      '<th style="text-align:center;width:90px">Thực tế</th>',
      '<th style="text-align:center;width:100px">Chênh lệch</th>',
      '</tr></thead>',
      '<tbody>'+rows+'</tbody>',
      '</table>',
      dotChon['Ghi chú']?'<div style="margin-top:12px;padding:10px 14px;background:#FEF3C7;border-radius:6px;font-size:12px">📝 Ghi chú: '+dotChon['Ghi chú']+'</div>':'',
      dotChon['Trạng thái']==='Đã duyệt'?'<div style="margin-top:10px;padding:10px 14px;background:#D1FAE5;border-radius:6px;font-size:13px;font-weight:700;color:#065F46">✅ Đã duyệt bởi '+(dotChon['Người duyệt']||'—')+'</div>':'',
      '<div class="sign-row">',
      '<div><div class="sign-title">Người kiểm kho</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>',
      '<div><div class="sign-title">Chủ cửa hàng</div><div class="sign-line">(Ký, ghi rõ họ tên)</div></div>',
      '</div>',
      '<script>window.onload=function(){window.print()}<\/script>',
      '</body></html>'
    ].join('')
    const w=window.open('','_blank');if(w){w.document.write(html);w.document.close()}
  }

  const spMap = useMemo(()=>{const m:Record<string,any>={};sanPhamList.forEach(s=>{m[s['Mã SP']||'']=s});return m},[sanPhamList])

  // SP hiển thị trong form tạo phiếu (có tìm kiếm + filter danh mục)
  const spFiltered = useMemo(()=>{
    let r=sanPhamList
    if(filterDMKiem!=='Tất cả'){
      if(filterDMKiem==='Chưa phân loại') r=r.filter(s=>!s['Danh mục']||s['Danh mục'].trim()==='')
      else r=r.filter(s=>s['Danh mục']===filterDMKiem)
    }
    if(!searchSP.trim()) return r
    const q=boDau(searchSP)
    return r.filter(s=>boDau(s['Tên sản phẩm']||'').includes(q)||boDau(s['Mã SP']||'').includes(q))
  },[sanPhamList,searchSP,filterDMKiem])

  // ── MỞ CHI TIẾT ĐỢT KIỂM ────────────────────────────────
  async function xemChiTiet(dot:any){
    setDotChon(dot)
    setLoadingCT(true)
    setView('detail')
    try{
      const res=await fetch(`/api/kiem-kho?loai=ct&maDot=${dot['Mã đợt kiểm']}`)
      const d=await res.json()
      setCtList(d.list||[])
      // Init editingCT từ dữ liệu hiện có
      const init:Record<number,any>={}
      for(const ct of (d.list||[])){
        const id=Number(ct['Id']||ct['id'])
        init[id]={
          tonTT:    ct['Tồn thực tế']??ct['Tồn hệ thống'],
          hangHong: ct['Hàng hỏng']||0,
          nguyenNhan:ct['Nguyên nhân']||'Không chênh lệch',
          nguoiChiuTN:ct['Người chịu trách nhiệm']||'',
          ghiChuCT:  ct['Ghi chú']||'',
        }
      }
      setEditingCT(init)
    }catch(e){showMsg('❌ Lỗi tải chi tiết',false)}
    finally{setLoadingCT(false)}
  }

  // ── TOGGLE CHỌN SP KHI TẠO PHIẾU ───────────────────────
  function toggleSP(sp:any){
    const ma=sp['Mã SP']
    setDsSPKiem(prev=>{
      const exist=prev.find(s=>s.maSP===ma)
      if(exist) return prev.filter(s=>s.maSP!==ma)
      return [...prev,{
        maSP:ma,
        tenSP:sp['Tên sản phẩm']||'',
        donVi:sp['Đơn vị tính']||'',
        tonHT:Number(sp['Tồn kho']||0),
        tonTT:'',
        hangHong:0,
        nguyenNhan:'Không chênh lệch',
        nguoiChiuTN:'',
        ghiChuCT:'',
      }]
    })
  }
  function toggleTatCa(){
    if(chonTatCa){setDsSPKiem([]);setChonTatCa(false)}
    else{
      setDsSPKiem(spFiltered.map(sp=>({
        maSP:sp['Mã SP'],tenSP:sp['Tên sản phẩm']||'',donVi:sp['Đơn vị tính']||'',
        tonHT:Number(sp['Tồn kho']||0),tonTT:'',hangHong:0,
        nguyenNhan:'Không chênh lệch',nguoiChiuTN:'',ghiChuCT:'',
      })))
      setChonTatCa(true)
    }
  }
  function updSPKiem(maSP:string,k:string,v:any){
    setDsSPKiem(prev=>prev.map(s=>{
      if(s.maSP!==maSP) return s
      const updated={...s,[k]:v}
      // Tự tính nguyên nhân khi đổi tonTT
      if(k==='tonTT'){
        const chenh=Number(v||s.tonHT)-s.tonHT
        if(chenh===0) updated.nguyenNhan='Không chênh lệch'
        else if(updated.nguyenNhan==='Không chênh lệch') updated.nguyenNhan='Không rõ nguyên nhân'
      }
      return updated
    }))
  }

  // ── LƯU PHIẾU KIỂM ──────────────────────────────────────
  async function luuPhieu(trangThai:'Nháp'|'Chờ duyệt'){
    if(!dsSPKiem.length){showMsg('Chọn ít nhất 1 sản phẩm',false);return}
    setLoading(true)
    try{
      // Tính danh mục từ SP đã chọn
      const dmSet=new Set<string>()
      let coChuaPhanLoai=false
      dsSPKiem.forEach((s:any)=>{
        const dm=spMap[s.maSP]?.['Danh mục']||''
        if(dm.trim()) dmSet.add(dm.trim())
        else coChuaPhanLoai=true
      })
      const dsDM=[...dmSet].sort()
      if(coChuaPhanLoai) dsDM.push('Chưa phân loại')
      const danhMucKiem=dsDM.join(', ')
      const res=await fetch('/api/kiem-kho',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({loaiKiem,ngayKiem,nguoiKiem,ghiChu,trangThai,danhMucKiem,
          dsSP:dsSPKiem.map(s=>({...s,tonTT:s.tonTT===''?s.tonHT:Number(s.tonTT)}))
        })})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message)
      showMsg(`✅ Đã tạo phiếu kiểm ${d.maDot} — ${d.soSP} sản phẩm`)
      // Refresh danh sách
      const r2=await fetch('/api/kiem-kho')
      const d2=await r2.json()
      setDotLocal(d2.list||[])
      setView('list')
      resetForm()
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  function resetForm(){
    setLoaiKiem('Tháng');setNgayKiem(new Date().toISOString().split('T')[0])
    setNguoiKiem(user.hoTen||user.tenDangNhap||'');setGhiChu('')
    setSearchSP('');setFilterDMKiem('Tất cả');setSearchDMKiem('');setDsSPKiem([]);setChonTatCa(false)
  }

  // ── LƯU 1 DÒNG CHI TIẾT ─────────────────────────────────
  async function luuDongCT(ct:any){
    const id=Number(ct['Id']||ct['id'])
    const edit=editingCT[id]||{}
    setSavingCT(id)
    try{
      const tonTT=edit.tonTT===''||edit.tonTT===undefined?Number(ct['Tồn hệ thống']||0):Number(edit.tonTT)
      const res=await fetch('/api/kiem-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          loai:'ct', id,
          'Tồn hệ thống':  Number(ct['Tồn hệ thống']||0),
          'Tồn thực tế':   tonTT,
          'Hàng hỏng':     Number(edit.hangHong||0),
          'Nguyên nhân':   edit.nguyenNhan||'Không chênh lệch',
          'Người chịu trách nhiệm': edit.nguoiChiuTN||'',
          'Ghi chú':       edit.ghiChuCT||'',
        })})
      const d=await res.json()
      if(!res.ok) throw new Error(d.message)
      // Cập nhật local
      setCtList(prev=>prev.map(c=>(c['Id']||c['id'])===ct['Id']||c['id']===ct['id']
        ?{...c,'Tồn thực tế':tonTT,'Hàng hỏng':Number(edit.hangHong||0),
          'Chênh lệch':tonTT-Number(ct['Tồn hệ thống']||0),
          'Tồn sau điều chỉnh':tonTT-Number(edit.hangHong||0),
          'Nguyên nhân':edit.nguyenNhan,'Người chịu trách nhiệm':edit.nguoiChiuTN,
          'Ghi chú':edit.ghiChuCT}:c))
      showMsg('✅ Đã lưu')
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setSavingCT(null)}
  }

  // ── GỬI DUYỆT ────────────────────────────────────────────
  async function guiDuyet(){
    if(!dotChon) return
    setLoading(true)
    try{
      const res=await fetch('/api/kiem-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(dotChon['Id']||dotChon['id']),'Trạng thái':'Chờ duyệt'})})
      if(!res.ok) throw new Error((await res.json()).message)
      setDotChon((p:any)=>({...p,'Trạng thái':'Chờ duyệt'}))
      setDotLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(dotChon['Id']||dotChon['id'])
        ?{...d,'Trạng thái':'Chờ duyệt'}:d))
      showMsg('✅ Đã gửi duyệt')
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  // ── DUYỆT & ĐIỀU CHỈNH TỒN KHO (CHỈ CHỦ) ───────────────
  async function duyetVaDieuChinh(){
    if(!dotChon||!isOwner) return
    setLoading(true)
    try{
      // 1. Cập nhật từng SP chênh lệch vào bảng Sản phẩm
      const spChenh=ctList.filter(ct=>Number(ct['Chênh lệch']||0)!==0&&!ct['Đã điều chỉnh'])
      for(const ct of spChenh){
        const tonMoi=Number(ct['Tồn sau điều chỉnh']??ct['Tồn thực tế']??0)
        // Cập nhật tồn kho SP
        await fetch('/api/san-pham/cap-nhat-ton',{method:'PATCH',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({maSP:ct['Mã SP'],tonMoi})
        }).catch(()=>{})
        // Đánh dấu đã điều chỉnh
        await fetch('/api/kiem-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
          body:JSON.stringify({loai:'ct',id:Number(ct['Id']||ct['id']),'Đã điều chỉnh':true})
        })
      }
      // 2. Đổi trạng thái đợt kiểm → Đã duyệt
      const res=await fetch('/api/kiem-kho',{method:'PATCH',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:Number(dotChon['Id']||dotChon['id']),'Trạng thái':'Đã duyệt'})})
      if(!res.ok) throw new Error((await res.json()).message)
      setDotChon((p:any)=>({...p,'Trạng thái':'Đã duyệt'}))
      setDotLocal(prev=>prev.map(d=>(d['Id']||d['id'])===(dotChon['Id']||dotChon['id'])
        ?{...d,'Trạng thái':'Đã duyệt'}:d))
      setCtList(prev=>prev.map(ct=>Number(ct['Chênh lệch']||0)!==0?{...ct,'Đã điều chỉnh':true}:ct))
      showMsg(`✅ Đã duyệt và điều chỉnh tồn kho ${spChenh.length} sản phẩm`)
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  // ── XÓA ĐỢT KIỂM ────────────────────────────────────────
  async function xacNhanXoa(){
    if(!xoaDot||!isOwner) return
    setLoading(true)
    try{
      const res=await fetch(`/api/kiem-kho?id=${xoaDot['Id']||xoaDot['id']}&maDot=${xoaDot['Mã đợt kiểm']}`,{method:'DELETE'})
      if(!res.ok) throw new Error((await res.json()).message)
      setDotLocal(prev=>prev.filter(d=>(d['Id']||d['id'])!==(xoaDot['Id']||xoaDot['id'])))
      showMsg('✅ Đã xóa đợt kiểm')
      setXoaDot(null)
    }catch(e:any){showMsg('❌ '+(e.message||'Lỗi'),false)}
    finally{setLoading(false)}
  }

  // ── FILTER DANH SÁCH ─────────────────────────────────────
  const filtered=useMemo(()=>{
    let r=dotLocal
    if(filterTT!=='Tất cả') r=r.filter(d=>d['Trạng thái']===filterTT)
    if(search.trim()){const q=boDau(search);r=r.filter(d=>boDau(d['Mã đợt kiểm']||'').includes(q)||boDau(d['Người kiểm']||'').includes(q)||boDau(d['Loại kiểm']||'').includes(q))}
    return r
  },[dotLocal,filterTT,search])

  const tongTrang=Math.max(1,Math.ceil(filtered.length/SO_DONG))
  const trangHT=Math.min(trang,tongTrang)
  const dsTrang=filtered.slice((trangHT-1)*SO_DONG,trangHT*SO_DONG)

  // ── FILTER CHI TIẾT ──────────────────────────────────────
  const ctFiltered=useMemo(()=>{
    if(filterChenh==='Tất cả') return ctList
    if(filterChenh==='Chênh lệch') return ctList.filter(ct=>Number(ct['Chênh lệch']||0)!==0)
    if(filterChenh==='Khớp') return ctList.filter(ct=>Number(ct['Chênh lệch']||0)===0)
    return ctList.filter(ct=>ct['Nguyên nhân']===filterChenh)
  },[ctList,filterChenh])

  // Thống kê chi tiết
  const tongChenh=ctList.filter(ct=>Number(ct['Chênh lệch']||0)!==0).length
  const tongHong=ctList.filter(ct=>Number(ct['Hàng hỏng']||0)>0).length
  const choXuLy=ctList.filter(ct=>Number(ct['Chênh lệch']||0)!==0&&!ct['Đã điều chỉnh']).length
  const tongGiaTriChenh=ctList.reduce((sum:number,ct:any)=>{
    const maSP=ct['Mã SP']||''
    const sp=spMap[maSP]
    // Ưu tiên giá bình quân từ lịch sử nhập kho, fallback giá nhập NCC+CPVC
    const gia=giaBinhQuanMap[maSP]||(Number(sp?.['Giá nhập NCC']||0)+Number(sp?.['CPVC về kho']||0))
    if(gia===0) return sum
    const chenh=Number(ct['Chênh lệch']||0)
    const hong=Number(ct['Hàng hỏng']||0)
    // Thất thoát = hàng mất (chenh âm) + hàng hỏng
    const slThatThoat=Math.abs(chenh<0?chenh:0)+hong
    return sum+slThatThoat*gia
  },0)

  // ── RENDER ───────────────────────────────────────────────
  return (
    <div style={{padding:'20px'}}>
      <style>{`
        .kk-t th,.kk-t td{padding:8px 10px;vertical-align:middle;}
        .kk-t tbody tr:hover td{background:#F0F4FF!important;}
        .ov{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:200;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;}
        label.lbl{display:block;font-size:11px;font-weight:600;margin-bottom:3px;}
        .inp{width:100%;padding:6px 10px;border:1px solid #E5E7EB;border-radius:6px;font-size:13px;outline:none;}
        .inp:focus{border-color:var(--primary);}
      `}</style>

      {msg&&<div style={{padding:'10px 14px',borderRadius:'8px',marginBottom:'12px',fontSize:'13px',background:msgOk?'#D1FAE5':'#FEE2E2',color:msgOk?'#065F46':'#991B1B',position:'sticky',top:'10px',zIndex:10}}>{msg}</div>}

      {/* ══════════════════════════════════════════════════ */}
      {/* VIEW: DANH SÁCH                                   */}
      {/* ══════════════════════════════════════════════════ */}
      {view==='list'&&(
        <>
          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
            <div>
              <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>📋 Kiểm kho</h1>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>
                {dotLocal.length} đợt kiểm
                {dotLocal.filter(d=>d['Trạng thái']==='Chờ duyệt').length>0&&
                  <span style={{marginLeft:'8px',padding:'2px 8px',borderRadius:'10px',background:'#FEF3C7',color:'#92400E',fontWeight:600,fontSize:'12px'}}>
                    ⏳ {dotLocal.filter(d=>d['Trạng thái']==='Chờ duyệt').length} chờ duyệt
                  </span>}
              </p>
            </div>
            <button onClick={()=>{resetForm();setView('create')}}
              style={{background:'var(--primary)',color:'white',border:'none',borderRadius:'8px',padding:'10px 18px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>
              + Tạo phiếu kiểm kho
            </button>
          </div>

          {/* Thống kê nhanh */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:'10px',marginBottom:'14px'}}>
            {[
              {icon:'📋',label:'Tổng đợt',val:dotLocal.length,c:'var(--primary)'},
              {icon:'⏳',label:'Chờ duyệt',val:dotLocal.filter(d=>d['Trạng thái']==='Chờ duyệt').length,c:'#92400E'},
              {icon:'✅',label:'Đã duyệt',val:dotLocal.filter(d=>d['Trạng thái']==='Đã duyệt').length,c:'#065F46'},
              {icon:'📝',label:'Nháp',val:dotLocal.filter(d=>d['Trạng thái']==='Nháp').length,c:'#374151'},
            ].map(({icon,label,val,c})=>(
              <div key={label} className="card" style={{padding:'12px 14px'}}>
                <div style={{fontSize:'18px',marginBottom:'2px'}}>{icon}</div>
                <div style={{fontSize:'18px',fontWeight:800,color:c}}>{val}</div>
                <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="card" style={{padding:'12px 14px',marginBottom:'14px'}}>
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
              <input className="input" placeholder="🔍 Tìm mã đợt, người kiểm..." value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:'200px',maxWidth:'280px'}}/>
              <div style={{display:'flex',gap:'4px',alignItems:'center'}}>
                <span style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:600}}>Trạng thái:</span>
                {['Tất cả','Nháp','Chờ duyệt','Đã duyệt'].map(tt=>{
                  const c=TT_COLOR[tt]||{bg:'#F3F4F6',c:'#374151'}
                  return <button key={tt} onClick={()=>setFilterTT(tt)}
                    style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid',borderColor:filterTT===tt?c.c:'var(--border)',background:filterTT===tt?c.bg:'white',color:filterTT===tt?c.c:'var(--text-secondary)',fontWeight:filterTT===tt?700:400,fontSize:'12px',cursor:'pointer'}}>{tt}</button>
                })}
              </div>
            </div>
          </div>

          {/* Bảng danh sách */}
          <div className="card" style={{overflow:'hidden'}}>
            <div style={{overflowX:'auto'}}>
              <table className="kk-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                <thead>
                  <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                    <th style={{textAlign:'left',fontWeight:700}}>Mã đợt</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Loại kiểm</th>
                    <th style={{textAlign:'left',fontWeight:700,whiteSpace:'nowrap'}}>Ngày kiểm</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Người kiểm</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Tổng SP</th>
                    <th style={{textAlign:'center',fontWeight:700}}>SP chênh</th>
                    <th style={{textAlign:'center',fontWeight:700}}>Trạng thái</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Danh mục</th>
                    <th style={{textAlign:'left',fontWeight:700}}>Người duyệt</th>
                    <th style={{textAlign:'center',fontWeight:700,width:'120px'}}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {dsTrang.length===0?(
                    <tr><td colSpan={10} style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>Chưa có đợt kiểm nào</td></tr>
                  ):dsTrang.map((dot,i)=>{
                    const ttC=TT_COLOR[dot['Trạng thái']]||{bg:'#F3F4F6',c:'#374151'}
                    const coChenh=Number(dot['Tổng SP chênh']||0)>0
                    return (
                      <tr key={dot['Id']||i} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                        <td style={{fontWeight:600,color:'var(--primary)',fontSize:'12px',cursor:'pointer',textDecoration:'underline'}}
                          onClick={()=>xemChiTiet(dot)}>{dot['Mã đợt kiểm']||'—'}</td>
                        <td style={{fontSize:'12px'}}>
                          <span style={{padding:'2px 8px',borderRadius:'10px',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',fontWeight:600}}>{dot['Loại kiểm']||'—'}</span>
                        </td>
                        <td style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>{fDate(dot['Ngày kiểm'])}</td>
                        <td style={{fontSize:'12px'}}>{dot['Người kiểm']||'—'}</td>
                        <td style={{textAlign:'center',fontWeight:700}}>{dot['Tổng SP kiểm']||0}</td>
                        <td style={{textAlign:'center'}}>
                          {coChenh
                            ?<span style={{fontWeight:700,color:'#DC2626',background:'#FEE2E2',padding:'2px 8px',borderRadius:'10px',fontSize:'12px'}}>⚠️ {dot['Tổng SP chênh']}</span>
                            :<span style={{color:'#16A34A',fontSize:'12px'}}>✅ Khớp</span>}
                        </td>
                        <td style={{textAlign:'center'}}>
                          <span style={{padding:'3px 9px',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:ttC.bg,color:ttC.c,whiteSpace:'nowrap'}}>{dot['Trạng thái']||'—'}</span>
                        </td>
                        <td style={{maxWidth:'160px'}}>
                          {(()=>{
                            const raw=(dot['Danh mục kiểm'] as string)||''
                            const dms=raw.split(',').map((d:string)=>d.trim()).filter(Boolean)
                            if(!dms.length) return <span style={{color:'#D1D5DB',fontSize:'12px'}}>—</span>
                            if(dms.length<=2) return (
                              <div style={{display:'flex',flexWrap:'wrap',gap:'3px'}}>
                                {dms.map((dm:string)=>(
                                  <span key={dm} style={{padding:'1px 7px',borderRadius:'8px',background:'#F5F3FF',color:'#7C3AED',fontSize:'11px',fontWeight:600,whiteSpace:'nowrap'}}>{dm}</span>
                                ))}
                              </div>
                            )
                            const tooltip=dms.join('\n')
                            return (
                              <span title={tooltip}
                                style={{padding:'2px 10px',borderRadius:'8px',background:'#F5F3FF',color:'#7C3AED',
                                  fontSize:'11px',fontWeight:600,cursor:'help',whiteSpace:'nowrap',
                                  borderBottom:'1px dashed #7C3AED'}}>
                                📂 Nhiều danh mục ({dms.length})
                              </span>
                            )
                          })()}
                        </td>
                        <td style={{fontSize:'12px',color:'#6B7280'}}>{dot['Người duyệt']||'—'}</td>
                        <td style={{textAlign:'center'}}>
                          <div style={{display:'flex',gap:'4px',justifyContent:'center'}}>
                            <button onClick={()=>xemChiTiet(dot)}
                              style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #93C5FD',background:'#EFF6FF',color:'#1E40AF',fontSize:'11px',cursor:'pointer',fontWeight:600}}>👁 Xem</button>
                            {isOwner&&(dot['Trạng thái']!=='Đã duyệt'
                              ?<button onClick={()=>setXoaDot(dot)}
                                style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #FCA5A5',background:'#FEF2F2',color:'#DC2626',fontSize:'11px',cursor:'pointer',fontWeight:600}}>🗑️</button>
                              :<span style={{display:'inline-block',width:'30px'}}></span>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {tongTrang>1&&(
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderTop:'1px solid #F0F0F0'}}>
                <span style={{fontSize:'12px',color:'var(--text-secondary)'}}>{filtered.length} đợt</span>
                <div style={{display:'flex',gap:'4px'}}>
                  <Btn disabled={trangHT===1} onClick={()=>setTrang(t=>t-1)}>‹</Btn>
                  {Array.from({length:tongTrang},(_,i)=>i+1).map(p=><Btn key={p} active={p===trangHT} onClick={()=>setTrang(p)}>{p}</Btn>)}
                  <Btn disabled={trangHT===tongTrang} onClick={()=>setTrang(t=>t+1)}>›</Btn>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* VIEW: TẠO PHIẾU KIỂM                              */}
      {/* ══════════════════════════════════════════════════ */}
      {view==='create'&&(
        <>
          <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
            <button onClick={()=>{setView('list');resetForm()}}
              style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'13px'}}>← Quay lại</button>
            <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>📋 Tạo phiếu kiểm kho</h1>
          </div>

          {/* Thông tin đợt kiểm */}
          <div className="card" style={{padding:'16px',marginBottom:'14px'}}>
            <div style={{fontWeight:700,fontSize:'13px',marginBottom:'12px',color:'var(--primary)'}}>THÔNG TIN ĐỢT KIỂM</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr',gap:'12px'}}>
              <div>
                <label className="lbl">Loại kiểm</label>
                <select className="input" value={loaiKiem} onChange={e=>setLoaiKiem(e.target.value)}>
                  {LOAI_KIEM.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="lbl">Ngày kiểm</label>
                <input className="input" type="date" value={ngayKiem} onChange={e=>setNgayKiem(e.target.value)}/>
              </div>
              <div style={{position:'relative'}}>
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
                        const q=(searchNV||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').toLowerCase()
                        const ten=(nv['Họ và Tên']||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').toLowerCase()
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
                      const q=(searchNV||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').toLowerCase()
                      const ten=(nv['Họ và Tên']||'').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').toLowerCase()
                      return ten.includes(q)
                    }).length===0&&(
                      <div style={{padding:'8px 12px',fontSize:'12px',color:'#9CA3AF',fontStyle:'italic'}}>Không tìm thấy — nhập tên tự do</div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="lbl">Ghi chú (nếu bất thường)</label>
                <input className="input" value={ghiChu} onChange={e=>setGhiChu(e.target.value)} placeholder="Lý do kiểm bất thường..."/>
              </div>
            </div>
          </div>

          {/* Chọn SP kiểm */}
          <div className="card" style={{padding:'16px',marginBottom:'14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <div style={{fontWeight:700,fontSize:'13px',color:'var(--primary)'}}>
                CHỌN SẢN PHẨM KIỂM
                <span style={{marginLeft:'8px',fontSize:'12px',fontWeight:400,color:'var(--text-secondary)'}}>
                  Đã chọn: <strong>{dsSPKiem.length}</strong>/{sanPhamList.length} SP
                </span>
              </div>
              <button onClick={toggleTatCa}
                style={{padding:'5px 12px',borderRadius:'6px',border:'1px solid var(--primary)',background:chonTatCa?'var(--primary)':'white',color:chonTatCa?'white':'var(--primary)',fontSize:'12px',fontWeight:600,cursor:'pointer'}}>
                {chonTatCa?'✕ Bỏ chọn tất cả':'✅ Chọn tất cả'}
              </button>
            </div>
            <input className="input" placeholder="🔍 Tìm sản phẩm..." value={searchSP} onChange={e=>setSearchSP(e.target.value)} style={{marginBottom:'8px'}}/>
            {/* Dropdown tìm kiếm danh mục */}
            {danhMucList.length>0&&(
              <div style={{marginBottom:'8px'}}>
                <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                  <span style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:600,whiteSpace:'nowrap'}}>📂 Danh mục:</span>
                  <div style={{position:'relative',flex:1,maxWidth:'280px'}}>
                    <input className="input" placeholder="🔍 Gõ tên danh mục..." value={searchDMKiem}
                      onChange={e=>{setSearchDMKiem(e.target.value);setShowDMDrop(true)}}
                      onFocus={()=>setShowDMDrop(true)}
                      onBlur={()=>setTimeout(()=>setShowDMDrop(false),200)}
                      style={{background:filterDMKiem!=='Tất cả'?'#F5F3FF':'',color:filterDMKiem!=='Tất cả'?'#7C3AED':''}}/>
                    {showDMDrop&&(
                      <div style={{position:'absolute',top:'calc(100% + 2px)',left:0,right:0,zIndex:400,background:'white',border:'1px solid #E5E7EB',borderRadius:'8px',boxShadow:'0 4px 16px rgba(0,0,0,.15)',maxHeight:'200px',overflowY:'auto'}}>
                        {[{dm:'Tất cả',count:sanPhamList.length},...danhMucNames
                          .filter((d:string)=>d!=='Tất cả')
                          .map((dm:string)=>({
                            dm,
                            count:dm==='Chưa phân loại'
                              ?sanPhamList.filter((s:any)=>!s['Danh mục']||s['Danh mục'].trim()==='').length
                              :sanPhamList.filter((s:any)=>s['Danh mục']===dm).length
                          }))
                          .filter((x:any)=>x.count>0&&(searchDMKiem?boDau(x.dm).includes(boDau(searchDMKiem)):true))
                        ].map(({dm,count}:any)=>(
                          <div key={dm}
                            onMouseDown={e=>{e.preventDefault();setFilterDMKiem(dm);setSearchDMKiem(dm==='Tất cả'?'':dm);setShowDMDrop(false)}}
                            style={{padding:'8px 12px',cursor:'pointer',borderBottom:'1px solid #F3F4F6',fontSize:'13px',
                              background:filterDMKiem===dm?'#F5F3FF':'white',
                              color:filterDMKiem===dm?'#7C3AED':'#374151',
                              fontWeight:filterDMKiem===dm?700:400}}>
                            {dm==='Tất cả'?'📋 Tất cả':'📂 '+dm}
                            <span style={{fontSize:'11px',color:'#9CA3AF',marginLeft:'6px'}}>({count} SP)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {filterDMKiem!=='Tất cả'&&(
                    <button onClick={()=>{setFilterDMKiem('Tất cả');setSearchDMKiem('')}}
                      style={{padding:'3px 8px',borderRadius:'6px',border:'1px solid #E5E7EB',background:'white',fontSize:'12px',cursor:'pointer',color:'#6B7280',whiteSpace:'nowrap'}}>✕ Bỏ lọc</button>
                  )}
                  <span style={{fontSize:'12px',color:'var(--text-secondary)',whiteSpace:'nowrap'}}>
                    {filterDMKiem==='Tất cả'?spFiltered.length+' SP':spFiltered.length+' SP trong "'+filterDMKiem+'"'}
                  </span>
                </div>
              </div>
            )}
            <div style={{maxHeight:'220px',overflowY:'auto',border:'1px solid #E5E7EB',borderRadius:'8px'}}>
              {spFiltered.map((sp,i)=>{
                const isChon=dsSPKiem.some(s=>s.maSP===sp['Mã SP'])
                const ton=Number(sp['Tồn kho']||0)
                return (
                  <div key={sp['Mã SP']} onClick={()=>toggleSP(sp)}
                    style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',cursor:'pointer',borderBottom:i<spFiltered.length-1?'1px solid #F3F4F6':'none',background:isChon?'#EFF6FF':'white'}}>
                    <input type="checkbox" checked={isChon} readOnly style={{width:'15px',height:'15px',accentColor:'var(--primary)',cursor:'pointer'}}/>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:'13px'}}>{sp['Tên sản phẩm']}</div>
                      <div style={{fontSize:'11px',color:'#6B7280'}}>
                        {sp['Mã SP']} · {sp['Đơn vị tính']||''}
                        {sp['Danh mục']&&<span style={{marginLeft:'6px',padding:'1px 6px',borderRadius:'8px',background:'#F5F3FF',color:'#7C3AED',fontWeight:600}}>{sp['Danh mục']}</span>}
                      </div>
                    </div>
                    <div style={{textAlign:'right',fontSize:'12px'}}>
                      <div style={{fontWeight:700,color:ton<0?'#DC2626':ton===0?'#DC2626':ton<=Number(sp['Ngưỡng cảnh báo']||0)?'#D97706':'#374151'}}>{ton}</div>
                      <div style={{fontSize:'10px',color:'#9CA3AF'}}>tồn HT</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bảng nhập số lượng thực tế */}
          {dsSPKiem.length>0&&(
            <div className="card" style={{padding:'16px',marginBottom:'14px'}}>
              <div style={{fontWeight:700,fontSize:'13px',color:'var(--primary)',marginBottom:'10px'}}>
                NHẬP SỐ LƯỢNG THỰC TẾ — {dsSPKiem.length} sản phẩm
              </div>
              <div style={{overflowX:'auto'}}>
                <table className="kk-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                  <thead>
                    <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                      <th style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Danh mục</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Tồn HT</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Thực tế *</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Chênh lệch</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Hàng hỏng</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Sau ĐC</th>
                      <th style={{textAlign:'center',fontWeight:700,minWidth:'160px'}}>Nguyên nhân</th>
                      <th style={{textAlign:'left',fontWeight:700}}>Người chịu TN</th>
                      <th style={{textAlign:'left',fontWeight:700}}>Ghi chú</th>
                      <th style={{textAlign:'center',fontWeight:700,width:'40px'}}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {dsSPKiem.map((sp,i)=>{
                      const tonTT=sp.tonTT===''?sp.tonHT:Number(sp.tonTT)
                      const chenh=tonTT-sp.tonHT
                      const sauDC=tonTT-Number(sp.hangHong||0)
                      const chenhMau=chenh>0?{c:'#1E40AF',bg:'#DBEAFE'}:chenh<0?{c:'#DC2626',bg:'#FEE2E2'}:{c:'#16A34A',bg:'#D1FAE5'}
                      return (
                        <tr key={sp.maSP} style={{borderBottom:'1px solid #F0F0F0',background:i%2===0?'white':'#FAFBFD'}}>
                          <td>
                            <div style={{fontWeight:600,fontSize:'12px'}}>{sp.tenSP}</div>
                            <div style={{fontSize:'10px',color:'#6B7280'}}>{sp.maSP} · {sp.donVi}</div>
                          </td>
                          <td style={{textAlign:'center'}}>
                            {spMap[sp.maSP]?.['Danh mục']
                              ?<span style={{padding:'2px 6px',borderRadius:'8px',background:'#F5F3FF',color:'#7C3AED',fontSize:'11px',fontWeight:600,whiteSpace:'nowrap'}}>{spMap[sp.maSP]['Danh mục']}</span>
                              :<span style={{fontSize:'11px',color:'#D1D5DB'}}>—</span>}
                          </td>
                          <td style={{textAlign:'center',fontWeight:700}}>{sp.tonHT}</td>
                          <td style={{textAlign:'center'}}>
                            <input type="number" value={sp.tonTT} placeholder={String(sp.tonHT)}
                              onChange={e=>updSPKiem(sp.maSP,'tonTT',e.target.value)}
                              style={{width:'70px',padding:'4px 6px',border:'1px solid #E5E7EB',borderRadius:'5px',textAlign:'center',fontSize:'13px',fontWeight:700}}/>
                          </td>
                          <td style={{textAlign:'center'}}>
                            <span style={{padding:'3px 10px',borderRadius:'10px',fontSize:'12px',fontWeight:700,background:chenhMau.bg,color:chenhMau.c}}>
                              {chenh>0?'+':''}{chenh}
                            </span>
                          </td>
                          <td style={{textAlign:'center'}}>
                            <input type="number" min="0" value={sp.hangHong||''} placeholder="0"
                              onChange={e=>updSPKiem(sp.maSP,'hangHong',Number(e.target.value)||0)}
                              style={{width:'60px',padding:'4px 6px',border:'1px solid #E5E7EB',borderRadius:'5px',textAlign:'center',fontSize:'13px'}}/>
                          </td>
                          <td style={{textAlign:'center',fontWeight:700,color:sauDC<0?'#DC2626':'#374151'}}>{sauDC}</td>
                          <td>
                            {chenh!==0&&(
                              <select value={sp.nguyenNhan}
                                onChange={e=>updSPKiem(sp.maSP,'nguyenNhan',e.target.value)}
                                style={{width:'100%',padding:'4px 6px',border:'1px solid #E5E7EB',borderRadius:'5px',fontSize:'12px',background:NN_COLOR[sp.nguyenNhan]?.bg||'white',color:NN_COLOR[sp.nguyenNhan]?.c||'#374151'}}>
                                <option value="Có nguyên nhân">Có nguyên nhân</option>
                                <option value="Không rõ nguyên nhân">Không rõ nguyên nhân</option>
                              </select>
                            )}
                            {chenh===0&&<span style={{fontSize:'11px',color:'#16A34A',fontWeight:600}}>✅ Khớp</span>}
                          </td>
                          <td>
                            {chenh!==0&&sp.nguyenNhan==='Có nguyên nhân'&&(
                              <input type="text" value={sp.nguoiChiuTN} placeholder="Tên NV..."
                                onChange={e=>updSPKiem(sp.maSP,'nguoiChiuTN',e.target.value)}
                                style={{width:'100px',padding:'4px 6px',border:'1px solid #E5E7EB',borderRadius:'5px',fontSize:'12px'}}/>
                            )}
                          </td>
                          <td>
                            <input type="text" value={sp.ghiChuCT} placeholder="Ghi chú..."
                              onChange={e=>updSPKiem(sp.maSP,'ghiChuCT',e.target.value)}
                              style={{width:'120px',padding:'4px 6px',border:'1px solid #E5E7EB',borderRadius:'5px',fontSize:'12px'}}/>
                          </td>
                          <td>
                            <button onClick={()=>setDsSPKiem(p=>p.filter(s=>s.maSP!==sp.maSP))}
                              style={{padding:'3px 6px',borderRadius:'4px',border:'none',background:'#FEE2E2',color:'#DC2626',cursor:'pointer',fontSize:'12px'}}>✕</button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Nút lưu */}
          <div style={{display:'flex',gap:'10px'}}>
            <button onClick={inPhieuTrong} disabled={!dsSPKiem.length}
              style={{padding:'12px 16px',borderRadius:'8px',border:'1px solid #0284C7',background:'#F0F9FF',color:'#0284C7',fontWeight:700,fontSize:'13px',cursor:!dsSPKiem.length?'not-allowed':'pointer',whiteSpace:'nowrap'}}>
              🖨️ In phiếu trống
            </button>
            <button onClick={()=>luuPhieu('Nháp')} disabled={loading||!dsSPKiem.length}
              style={{flex:1,padding:'12px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer',color:'var(--text-secondary)'}}>
              {loading?'⏳':'💾 Lưu nháp'}
            </button>
            <button onClick={()=>luuPhieu('Chờ duyệt')} disabled={loading||!dsSPKiem.length}
              style={{flex:2,padding:'12px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'var(--primary)',color:'white',fontWeight:700,fontSize:'14px',cursor:loading?'not-allowed':'pointer'}}>
              {loading?'⏳ Đang lưu...':'✅ Lưu & Gửi duyệt'}
            </button>
            <button onClick={()=>{setView('list');resetForm()}}
              style={{padding:'12px 18px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'14px'}}>Huỷ</button>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════ */}
      {/* VIEW: CHI TIẾT ĐỢT KIỂM                          */}
      {/* ══════════════════════════════════════════════════ */}
      {view==='detail'&&dotChon&&(
        <>
          {/* Header chi tiết */}
          <div style={{display:'flex',alignItems:'flex-start',gap:'12px',marginBottom:'14px',flexWrap:'wrap'}}>
            <button onClick={()=>{setView('list');setDotChon(null);setCtList([])}}
              style={{padding:'6px 12px',borderRadius:'6px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontSize:'13px',whiteSpace:'nowrap'}}>← Quay lại</button>
            <div style={{flex:1}}>
              <h1 style={{fontFamily:'Playfair Display,serif',fontSize:'20px',fontWeight:700,margin:0}}>
                📋 {dotChon['Mã đợt kiểm']}
                <span style={{marginLeft:'10px',padding:'3px 10px',borderRadius:'20px',fontSize:'13px',fontWeight:700,...(TT_COLOR[dotChon['Trạng thái']]||{background:'#F3F4F6',color:'#374151'}),background:TT_COLOR[dotChon['Trạng thái']]?.bg,color:TT_COLOR[dotChon['Trạng thái']]?.c}}>{dotChon['Trạng thái']}</span>
              </h1>
              <p style={{color:'var(--text-secondary)',fontSize:'13px',margin:'4px 0 0'}}>
                {dotChon['Loại kiểm']} · {fDate(dotChon['Ngày kiểm'])} · Người kiểm: {dotChon['Người kiểm']}
                {dotChon['Ghi chú']&&<span style={{marginLeft:'8px',fontStyle:'italic'}}>· {dotChon['Ghi chú']}</span>}
              </p>
            </div>
            {/* Nút hành động */}
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
              {dotChon['Trạng thái']==='Nháp'&&(
                <button onClick={guiDuyet} disabled={loading}
                  style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#D97706',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
                  📤 Gửi duyệt
                </button>
              )}
              {dotChon['Trạng thái']==='Chờ duyệt'&&isOwner&&(
                <button onClick={duyetVaDieuChinh} disabled={loading}
                  style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:'#16A34A',color:'white',fontWeight:700,cursor:'pointer',fontSize:'13px'}}>
                  {loading?'⏳':choXuLy>0?'✅ Duyệt & Điều chỉnh tồn kho':'✅ Duyệt (không có chênh lệch)'}
                </button>
              )}
              {dotChon['Trạng thái']==='Đã duyệt'&&(
                <div style={{padding:'8px 16px',borderRadius:'8px',background:'#D1FAE5',color:'#065F46',fontWeight:700,fontSize:'13px'}}>
                  ✅ Đã duyệt bởi {dotChon['Người duyệt']} · {fDate(dotChon['Ngày duyệt'])}
                </div>
              )}
              {ctList.length>0&&(
                <button onClick={inBaoCaoKetQua}
                  style={{padding:'8px 16px',borderRadius:'8px',border:'1px solid #0284C7',background:'#F0F9FF',color:'#0284C7',fontWeight:700,cursor:'pointer',fontSize:'13px',whiteSpace:'nowrap'}}>
                  📄 In báo cáo kết quả
                </button>
              )}
            </div>
          </div>

          {/* Thống kê nhanh */}
          {!loadingCT&&(
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))',gap:'10px',marginBottom:'14px'}}>
              {[
                {icon:'📦',label:'Tổng SP',val:ctList.length,c:'var(--primary)'},
                {icon:'✅',label:'Khớp',val:ctList.filter(ct=>Number(ct['Chênh lệch']||0)===0).length,c:'#065F46'},
                {icon:'⚠️',label:'Chênh lệch',val:tongChenh,c:'#DC2626'},
                {icon:'🔴',label:'Hàng hỏng',val:tongHong,c:'#DC2626'},
                {icon:'⏳',label:'Chờ điều chỉnh',val:choXuLy,c:'#92400E'},
              ].map(({icon,label,val,c})=>(
                <div key={label} className="card" style={{padding:'10px 12px'}}>
                  <div style={{fontSize:'16px',marginBottom:'2px'}}>{icon}</div>
                  <div style={{fontSize:'16px',fontWeight:800,color:c}}>{val}</div>
                  <div style={{fontSize:'11px',color:'var(--text-secondary)'}}>{label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Card giá trị chênh lệch */}
          {!loadingCT&&tongGiaTriChenh!==0&&(
            <div style={{display:'flex',alignItems:'center',gap:'12px',padding:'12px 16px',borderRadius:'10px',
              border:'2px solid',borderColor:tongGiaTriChenh<0?'#FCA5A5':'#6EE7B7',
              background:tongGiaTriChenh<0?'#FEF2F2':'#F0FDF4',marginBottom:'12px'}}>
              <div style={{fontSize:'24px'}}>{tongGiaTriChenh<0?'📉':'📈'}</div>
              <div>
                <div style={{fontSize:'11px',color:'#6B7280',fontWeight:600,marginBottom:'2px'}}>
                  {tongGiaTriChenh<0?'⚠️ THẤT THOÁT ƯỚC TÍNH':'✅ GIÁ TRỊ THỪA ƯỚC TÍNH'}
                </div>
                <div style={{fontSize:'22px',fontWeight:800,color:tongGiaTriChenh<0?'#DC2626':'#16A34A'}}>
                  {tongGiaTriChenh>0?'+':''}{tongGiaTriChenh.toLocaleString('vi-VN')}đ
                </div>
                <div style={{fontSize:'11px',color:'#6B7280',marginTop:'2px'}}>
                  {(()=>{
                    const soHong=ctList.filter((ct:any)=>Number(ct['Hàng hỏng']||0)>0).length
                    const soChenhAm=ctList.filter((ct:any)=>Number(ct['Chênh lệch']||0)<0).length
                    return [
                      'Tính theo giá bình quân (lịch sử nhập kho)',
                      soChenhAm>0 ? soChenhAm+' SP mất hàng' : '',
                      soHong>0    ? soHong+' SP hàng hỏng'   : '',
                    ].filter(Boolean).join(' · ')
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Filter chi tiết */}
          <div className="card" style={{padding:'10px 14px',marginBottom:'12px'}}>
            <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
              <span style={{fontSize:'11px',color:'var(--text-secondary)',fontWeight:600}}>Lọc:</span>
              {['Tất cả','Chênh lệch','Khớp'].map(f=>(
                <button key={f} onClick={()=>setFilterChenh(f)}
                  style={{padding:'4px 10px',borderRadius:'20px',border:'1px solid',borderColor:filterChenh===f?'var(--primary)':'var(--border)',background:filterChenh===f?'var(--primary-pale)':'white',color:filterChenh===f?'var(--primary)':'var(--text-secondary)',fontWeight:filterChenh===f?700:400,fontSize:'12px',cursor:'pointer'}}>{f}</button>
              ))}
            </div>
          </div>

          {/* Bảng chi tiết SP */}
          <div className="card" style={{overflow:'hidden'}}>
            {loadingCT?(
              <div style={{padding:'48px',textAlign:'center',color:'var(--text-muted)'}}>⏳ Đang tải...</div>
            ):(
              <div style={{overflowX:'auto'}}>
                <table className="kk-t" style={{width:'100%',borderCollapse:'collapse',fontSize:'13px'}}>
                  <thead>
                    <tr style={{background:'#F0F4FF',borderBottom:'2px solid var(--border)'}}>
                      <th style={{textAlign:'left',fontWeight:700}}>Sản phẩm</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Tồn HT</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Thực tế</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Chênh lệch</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Hàng hỏng</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Sau ĐC</th>
                      <th style={{textAlign:'center',fontWeight:700}}>Nguyên nhân</th>
                      <th style={{textAlign:'left',fontWeight:700}}>Ghi chú</th>
                      <th style={{textAlign:'center',fontWeight:700,width:'80px'}}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ctFiltered.length===0?(
                      <tr><td colSpan={9} style={{textAlign:'center',padding:'32px',color:'var(--text-muted)'}}>Không có dữ liệu</td></tr>
                    ):ctFiltered.map((ct,i)=>{
                      const id=Number(ct['Id']||ct['id'])
                      const edit=editingCT[id]||{}
                      const chenh=Number(ct['Chênh lệch']||0)
                      const chenhMau=chenh>0?{c:'#1E40AF',bg:'#DBEAFE'}:chenh<0?{c:'#DC2626',bg:'#FEE2E2'}:{c:'#16A34A',bg:'#D1FAE5'}
                      const nnC=NN_COLOR[ct['Nguyên nhân']]||{bg:'#F3F4F6',c:'#374151'}
                      const daDC=ct['Đã điều chỉnh']
                      const coTheEdit=dotChon['Trạng thái']!=='Đã duyệt'
                      return (
                        <tr key={id} style={{borderBottom:'1px solid #F0F0F0',background:daDC?'#F0FDF4':i%2===0?'white':'#FAFBFD'}}>
                          <td>
                            <div style={{fontWeight:600,fontSize:'12px'}}>{ct['Tên SP']||'—'}</div>
                            <div style={{fontSize:'10px',color:'#6B7280'}}>{ct['Mã SP']}</div>
                          </td>
                          <td style={{textAlign:'center',fontWeight:700,color:'#6B7280'}}>{ct['Tồn hệ thống']}</td>
                          <td style={{textAlign:'center'}}>
                            {coTheEdit?(
                              <input type="number"
                                value={edit.tonTT??ct['Tồn thực tế']??ct['Tồn hệ thống']}
                                onChange={e=>{
                                  const v=Number(e.target.value)
                                  const tonHT=Number(ct['Tồn hệ thống']||0)
                                  const chenh2=v-tonHT
                                  setEditingCT(p=>({...p,[id]:{...p[id],tonTT:v,
                                    nguyenNhan:chenh2===0?'Không chênh lệch':(p[id]?.nguyenNhan==='Không chênh lệch'?'Không rõ nguyên nhân':p[id]?.nguyenNhan||'Không rõ nguyên nhân')
                                  }}))
                                }}
                                style={{width:'65px',padding:'4px',border:'1px solid #E5E7EB',borderRadius:'5px',textAlign:'center',fontSize:'13px',fontWeight:700}}/>
                            ):(
                              <span style={{fontWeight:700}}>{ct['Tồn thực tế']}</span>
                            )}
                          </td>
                          <td style={{textAlign:'center'}}>
                            <span style={{padding:'3px 10px',borderRadius:'10px',fontSize:'12px',fontWeight:700,background:chenhMau.bg,color:chenhMau.c}}>
                              {chenh>0?'+':''}{chenh}
                            </span>
                            {daDC&&<div style={{fontSize:'10px',color:'#16A34A',marginTop:'2px'}}>✓ Đã ĐC</div>}
                          </td>
                          <td style={{textAlign:'center'}}>
                            {coTheEdit?(
                              <input type="number" min="0"
                                value={edit.hangHong??ct['Hàng hỏng']??0}
                                onChange={e=>setEditingCT(p=>({...p,[id]:{...p[id],hangHong:Number(e.target.value)||0}}))}
                                style={{width:'55px',padding:'4px',border:'1px solid #E5E7EB',borderRadius:'5px',textAlign:'center',fontSize:'13px'}}/>
                            ):(
                              <span>{ct['Hàng hỏng']||0}</span>
                            )}
                          </td>
                          <td style={{textAlign:'center',fontWeight:700,color:Number(ct['Tồn sau điều chỉnh']||0)<0?'#DC2626':'#374151'}}>
                            {ct['Tồn sau điều chỉnh']??ct['Tồn thực tế']}
                          </td>
                          <td style={{textAlign:'center'}}>
                            {chenh!==0&&coTheEdit?(
                              <select value={edit.nguyenNhan||ct['Nguyên nhân']||'Không rõ nguyên nhân'}
                                onChange={e=>setEditingCT(p=>({...p,[id]:{...p[id],nguyenNhan:e.target.value}}))}
                                style={{padding:'3px 6px',border:'1px solid #E5E7EB',borderRadius:'5px',fontSize:'11px',fontWeight:700,background:NN_COLOR[edit.nguyenNhan||ct['Nguyên nhân']]?.bg||'#F3F4F6',color:NN_COLOR[edit.nguyenNhan||ct['Nguyên nhân']]?.c||'#374151'}}>
                                <option value="Có nguyên nhân">Có nguyên nhân</option>
                                <option value="Không rõ nguyên nhân">Không rõ nguyên nhân</option>
                              </select>
                            ):(
                              <span style={{padding:'3px 8px',borderRadius:'10px',fontSize:'11px',fontWeight:700,background:nnC.bg,color:nnC.c,whiteSpace:'nowrap'}}>{ct['Nguyên nhân']||'—'}</span>
                            )}
                          </td>
                          <td style={{fontSize:'12px'}}>
                            {coTheEdit?(
                              <input type="text"
                                value={edit.ghiChuCT??ct['Ghi chú']??''}
                                onChange={e=>setEditingCT(p=>({...p,[id]:{...p[id],ghiChuCT:e.target.value}}))}
                                placeholder="Ghi chú..."
                                style={{width:'130px',padding:'4px 6px',border:'1px solid #E5E7EB',borderRadius:'5px',fontSize:'12px'}}/>
                            ):(
                              <span style={{color:'#6B7280'}}>{ct['Ghi chú']||'—'}</span>
                            )}
                          </td>
                          <td style={{textAlign:'center'}}>
                            {coTheEdit&&(
                              <button onClick={()=>luuDongCT(ct)} disabled={savingCT===id}
                                style={{padding:'5px 8px',borderRadius:'5px',border:'1px solid #BBF7D0',background:'#F0FDF4',color:'#16A34A',fontSize:'11px',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
                                {savingCT===id?'⏳':'💾 Lưu'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ MODAL XÁC NHẬN XÓA ══ */}
      {xoaDot&&(
        <div className="ov">
          <div style={{background:'white',borderRadius:'12px',padding:'24px',width:'100%',maxWidth:'380px',textAlign:'center'}}>
            <div style={{fontSize:'36px',marginBottom:'8px'}}>🗑️</div>
            <h2 style={{fontSize:'15px',fontWeight:700,margin:'0 0 8px'}}>Xóa đợt kiểm?</h2>
            <p style={{fontSize:'13px',color:'#6B7280',margin:'0 0 6px'}}><strong>{xoaDot['Mã đợt kiểm']}</strong> — {xoaDot['Tổng SP kiểm']} sản phẩm</p>
            <p style={{fontSize:'12px',color:'#DC2626',margin:'0 0 16px',background:'#FEF2F2',padding:'6px 10px',borderRadius:'6px'}}>⚠️ Xóa toàn bộ chi tiết SP — không thể hoàn tác!</p>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={xacNhanXoa} disabled={loading}
                style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:loading?'#9CA3AF':'#DC2626',color:'white',fontWeight:700,cursor:'pointer'}}>
                {loading?'⏳':'Xóa'}
              </button>
              <button onClick={()=>setXoaDot(null)}
                style={{flex:1,padding:'10px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer',fontWeight:600}}>Huỷ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Btn({children,active,disabled,onClick}:any){
  return <button onClick={onClick} disabled={disabled} style={{padding:'4px 10px',borderRadius:'5px',border:'1px solid',borderColor:active?'var(--primary)':'var(--border)',background:active?'var(--primary)':disabled?'#F9FAFB':'white',color:active?'white':disabled?'#CCC':'var(--text-secondary)',cursor:disabled?'not-allowed':'pointer',fontSize:'13px',fontWeight:active?700:400,minWidth:'32px'}}>{children}</button>
}
