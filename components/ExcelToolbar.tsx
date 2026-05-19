'use client'
// components/ExcelToolbar.tsx
import { useRef, useState } from 'react'
import { xuatExcel, docCSV, EXCEL_SCHEMAS, downloadBlob } from '@/lib/excel'

interface Props {
  loai: keyof typeof EXCEL_SCHEMAS
  danhSach: any[]
  layGiaTri: (row: any) => any[]
  onNhap: (rows: Record<string,string>[]) => Promise<void>
  tenFile: string
}

export default function ExcelToolbar({ loai, danhSach, layGiaTri, onNhap, tenFile }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading]         = useState(false)
  const [msg, setMsg]                 = useState('')
  const [msgType, setMsgType]         = useState<'ok'|'err'|'info'>('ok')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingRows, setPendingRows] = useState<Record<string,string>[]>([])

  const schema = EXCEL_SCHEMAS[loai]

  function handleXuat() {
    const rows = danhSach
      .filter(item => item && Object.values(item).some(v => v))
      .map(item => layGiaTri(item))
    xuatExcel(`${tenFile}-${new Date().toISOString().slice(0,10)}`, schema.headers, rows)
    showMsg(`✅ Đã xuất ${rows.length} dòng (.xls)`, 'ok')
  }

  function handleTaiMau() {
    xuatExcel(`mau-${tenFile}`, schema.headers, schema.mau as any[][])
    showMsg('📥 Đã tải file mẫu (.xls)', 'info')
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLoading(true)
    showMsg('⏳ Đang đọc file...', 'info')
    try {
      const { rows } = await docCSV(file)
      if (rows.length === 0) { showMsg('❌ File không có dữ liệu', 'err'); setLoading(false); return }
      setPendingRows(rows)
      setShowConfirm(true)
      setMsg('')
    } catch (err: any) {
      showMsg('❌ ' + err.message, 'err')
    } finally {
      setLoading(false)
    }
  }

  async function confirmNhap() {
    setShowConfirm(false)
    setLoading(true)
    showMsg(`⏳ Đang nhập ${pendingRows.length} dòng...`, 'info')
    try {
      await onNhap(pendingRows)
      showMsg(`✅ Nhập thành công ${pendingRows.length} dòng!`, 'ok')
    } catch (err: any) {
      showMsg('❌ Lỗi: ' + err.message, 'err')
    } finally {
      setLoading(false)
      setPendingRows([])
    }
  }

  function showMsg(text: string, type: 'ok'|'err'|'info') {
    setMsg(text); setMsgType(type)
    if (type !== 'info') setTimeout(() => setMsg(''), 5000)
  }

  const btn = (color: string, bg: string, border: string) => ({
    display:'inline-flex' as const, alignItems:'center' as const, gap:'5px',
    padding:'7px 13px', borderRadius:'7px', border:`1px solid ${border}`,
    background: bg, color, fontSize:'12px', fontWeight:600 as const,
    cursor:'pointer' as const, whiteSpace:'nowrap' as const,
    opacity: loading ? 0.7 : 1,
  })

  return (
    <div>
      <div style={{display:'flex',gap:'8px',flexWrap:'wrap',alignItems:'center'}}>
        <button onClick={handleXuat} disabled={loading} style={btn('#065F46','#D1FAE5','#6EE7B7')}>
          📤 Xuất Excel
        </button>
        <button onClick={()=>fileRef.current?.click()} disabled={loading} style={btn('#1E40AF','#DBEAFE','#93C5FD')}>
          📥 Nhập Excel
        </button>
        <button onClick={handleTaiMau} disabled={loading} style={btn('#92400E','#FEF3C7','#FCD34D')}>
          📋 Tải file mẫu
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xls,.xlsx" onChange={handleFileChange} style={{display:'none'}}/>
      </div>

      {msg && (
        <div style={{
          marginTop:'8px', padding:'7px 12px', borderRadius:'6px', fontSize:'12px',
          background: msgType==='ok'?'#D1FAE5':msgType==='err'?'#FEE2E2':'#EFF6FF',
          color: msgType==='ok'?'#065F46':msgType==='err'?'#991B1B':'#1E40AF',
        }}>{msg}</div>
      )}

      {showConfirm && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
          <div style={{background:'white',borderRadius:'12px',padding:'24px',maxWidth:'420px',width:'100%'}}>
            <h3 style={{fontSize:'15px',fontWeight:700,margin:'0 0 12px'}}>📥 Xác nhận nhập dữ liệu</h3>
            <p style={{fontSize:'13px',color:'#374151',margin:'0 0 6px'}}>
              Tìm thấy <strong style={{color:'var(--primary)'}}>{pendingRows.length} dòng</strong> trong file.
            </p>
            <p style={{fontSize:'12px',color:'#6B7280',margin:'0 0 14px'}}>
              Dữ liệu sẽ được <strong>thêm mới</strong> vào hệ thống.
            </p>
            <div style={{background:'#F8FAFC',borderRadius:'6px',padding:'8px 10px',marginBottom:'16px',fontSize:'11px',maxHeight:'100px',overflowY:'auto'}}>
              {pendingRows.slice(0,3).map((row,i)=>(
                <div key={i} style={{marginBottom:'3px',color:'#374151'}}>
                  {Object.entries(row).slice(0,3).map(([k,v])=>v?`${k}: ${v}`:null).filter(Boolean).join(' | ')}
                </div>
              ))}
              {pendingRows.length>3&&<div style={{color:'#6B7280'}}>...và {pendingRows.length-3} dòng nữa</div>}
            </div>
            <div style={{display:'flex',gap:'10px'}}>
              <button onClick={confirmNhap} style={{flex:1,padding:'10px',borderRadius:'8px',border:'none',background:'var(--primary)',color:'white',fontWeight:700,cursor:'pointer'}}>
                ✅ Xác nhận nhập
              </button>
              <button onClick={()=>{setShowConfirm(false);setPendingRows([])}} style={{padding:'10px 16px',borderRadius:'8px',border:'1px solid var(--border)',background:'white',cursor:'pointer'}}>
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
