// hooks/useMeta.ts
// Hook đọc Single Select options từ API meta
import { useState, useEffect } from 'react'

type MetaResult = Record<string, string[]>

const memCache: Record<string, {data: MetaResult, time: number}> = {}
const TTL = 5 * 60 * 1000

export function useMeta(keys: string[]) {
  const [data,    setData]    = useState<MetaResult>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const keyStr = keys.sort().join(',')
    const cached = memCache[keyStr]
    if (cached && Date.now() - cached.time < TTL) {
      setData(cached.data); setLoading(false); return
    }
    fetch(`/api/meta?keys=${keyStr}`)
      .then(r => r.json())
      .then(d => {
        memCache[keyStr] = { data: d, time: Date.now() }
        setData(d)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Helper: lấy options của 1 key, fallback về mảng mặc định
  function opts(key: string, fallback: string[] = []): string[] {
    return data[key]?.length ? data[key] : fallback
  }

  return { data, loading, opts }
}
