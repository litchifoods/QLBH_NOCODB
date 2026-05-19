'use client'
// components/ExcelToolbar.tsx
// Component nút Xuất / Nhập / Tải mẫu — dùng chung cho mọi màn hình

import { useRef, useState } from 'react'
import { xuatCSV, docCSV, EXCEL_SCHEMAS, downloadBlob } from '@/lib/excel'

interface Props {
  loai: keyof typeof EXCEL_SCHEMAS        // 'DON_HANG' | 'KHACH_HANG' | ...
  danhSach: any[]                          // dữ liệu hiện tại để xuất
  layGiaTri: (row: any) => any[]          // hàm lấy giá trị từng dòng để xuất
  onNhap: (rows: Record<string,string>[]) => Promise<void>  // callback khi nhập xong
  tenFile: string                          // tên file khi xuất, vd: "don-hang"
}

export default function ExcelToolbar({ loai, danhSach, layGiaTri, onNhap, tenFile }: Props) {
  const fileRef  = useRef<HTMLInputElement>(null)
  const [loading, setLoading]       = useState(false)
  const [msg,     setMsg]           = useState('')
  const [msgType, setMsgType]       = useState<'ok'|'err'|'info'>('ok')
  const [showConfirm, setShowConfirm] = useState(false)
  const [pendingRows, setPendingRows] = useState<Record<string,string>[]>([])

  const schema = EXCEL_SCHEMAS[loai]

  // Xuất CSV
  function handleXuat() {
    const rows = danhSach
      .filter(item => item && Object.values(item).some(v => v))
      .map(item => layGiaTri(item))
    xuatCSV(`${tenFile}-${new Date().toISOString().slice(0,10)}`, schema.headers, rows)
    showMsg(`✅ Đã xuất ${rows.length} dòng`, 'ok')
  }

  // Tải mẫu
  function handleTaiMau() {
    xuatCSV(`mau-${tenFile}`, schema.headers, schema.mau as any[][])
    showMsg('📥 Đã tải file mẫu', 'info')
  }

  // Nhập file
  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input để có thể chọn lại cùng file
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
      showMsg(`✅ Đã nhập thành công ${pendingRows.length} dòng!`, 'ok')
    } catch (err: any) {
      showMsg('❌ Lỗi khi nhập: ' + err.message, 'err')
    } finally {
      setLoading(false)
      setPendingRows([])
    }
  }

  function showMsg(text: string, type: 'ok'|'err'|'info') {
    setMsg(text); setMsgType(type)
    if (type !== 'info') setTimeout(() => setMsg(''), 5000)
  }

  const btnStyle = (color: string, bg: string, border: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '7px 12px', borderRadius: '7px', border: `1px solid ${border}`,
    background: bg, color, fontSize: '12px', fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap' as const,
    opacity: loading ? 0.7 : 1,
  })

  return (
    <div>
      {/* Nút toolbar */}
      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', alignItems:'center' }}>
        <button onClick={handleXuat} disabled={loading} style={btnStyle('#065F46','#D1FAE5','#6EE7B7')}>
          📤 Xuất Excel
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={loading} style={btnStyle('#1E40AF','#DBEAFE','#93C5FD')}>
          📥 Nhập Excel
        </button>
        <button onClick={handleTaiMau} disabled={loading} style={btnStyle('#92400E','#FEF3C7','#FCD34D')}>
          📋 Tải file mẫu
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} style={{ display:'none' }} />
      </div>

      {/* Thông báo */}
      {msg && (
        <div style={{
          marginTop:'8px', padding:'8px 12px', borderRadius:'6px', fontSize:'12px',
          background: msgType==='ok' ? '#D1FAE5' : msgType==='err' ? '#FEE2E2' : '#EFF6FF',
          color: msgType==='ok' ? '#065F46' : msgType==='err' ? '#991B1B' : '#1E40AF',
        }}>{msg}</div>
      )}

      {/* Dialog xác nhận nhập */}
      {showConfirm && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:300,
          display:'flex', alignItems:'center', justifyContent:'center', padding:'16px',
        }}>
          <div style={{ background:'white', borderRadius:'12px', padding:'24px', maxWidth:'400px', width:'100%' }}>
            <h3 style={{ fontSize:'16px', fontWeight:700, margin:'0 0 12px' }}>📥 Xác nhận nhập dữ liệu</h3>
            <p style={{ fontSize:'13px', color:'#374151', margin:'0 0 8px' }}>
              Tìm thấy <strong style={{ color:'var(--primary)' }}>{pendingRows.length} dòng</strong> dữ liệu trong file.
            </p>
            <p style={{ fontSize:'12px', color:'#6B7280', margin:'0 0 16px' }}>
              Dữ liệu sẽ được <strong>thêm mới</strong> vào hệ thống (không ghi đè dữ liệu cũ). Bạn có muốn tiếp tục?
            </p>
            {/* Preview 3 dòng đầu */}
            <div style={{ background:'#F8FAFC', borderRadius:'6px', padding:'8px 10px', marginBottom:'16px', fontSize:'11px', maxHeight:'120px', overflowY:'auto' }}>
              {pendingRows.slice(0,3).map((row, i) => (
                <div key={i} style={{ marginBottom:'4px', color:'#374151' }}>
                  {Object.entries(row).slice(0,3).map(([k,v]) => v ? `${k}: ${v}` : null).filter(Boolean).join(' | ')}
                </div>
              ))}
              {pendingRows.length > 3 && <div style={{ color:'#6B7280' }}>...và {pendingRows.length - 3} dòng nữa</div>}
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={confirmNhap}
                style={{ flex:1, padding:'10px', borderRadius:'8px', border:'none', background:'var(--primary)', color:'white', fontWeight:700, cursor:'pointer' }}>
                ✅ Xác nhận nhập
              </button>
              <button onClick={() => { setShowConfirm(false); setPendingRows([]) }}
                style={{ padding:'10px 16px', borderRadius:'8px', border:'1px solid var(--border)', background:'white', cursor:'pointer' }}>
                Huỷ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
