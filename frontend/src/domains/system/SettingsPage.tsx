import React, { useState, useEffect, useRef } from 'react'
import { Settings, Save, RefreshCw } from 'lucide-react'
import axios from 'axios'
import DocUserTopBar from '@/components/shared/DocUserTopBar'
import { AgGridReact } from 'ag-grid-react'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'

interface SettingItem {
  id: number
  settingKey: string
  settingValue: string
}

const SettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<SettingItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' })

  const gridRef = useRef<AgGridReact>(null)

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/aman/admin/settings')
      // Ensure records are clean of nulls
      const data = (response.data || []).filter((item: any) => item !== null && item !== undefined)
      setSettings(data)
    } catch (err: any) {
      console.error('설정 로딩 실패:', err)
      showStatus('error', '설정 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const showStatus = (type: 'success' | 'error', text: string) => {
    setStatusMsg({ type, text })
    setTimeout(() => {
      setStatusMsg({ type: '', text: '' })
    }, 4000)
  }

  const handleSave = async () => {
    if (!gridRef.current) return

    setSaving(true)
    try {
      const rows: SettingItem[] = []
      gridRef.current.api.forEachNode((node: any) => {
        if (node.data) {
          rows.push(node.data)
        }
      })

      for (const item of rows) {
        await axios.patch(`/aman/admin/settings/${item.id}`, {
          settingValue: item.settingValue
        })
      }
      showStatus('success', '설정이 성공적으로 저장되었습니다.')
      fetchSettings()
    } catch (err: any) {
      console.error('설정 저장 실패:', err)
      showStatus('error', err.response?.data || '설정 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // AG Grid Columns Definition
  const columnDefs = [
    {
      field: 'id',
      headerName: 'ID',
      width: 70,
      cellClass: 'text-gray-400 font-mono text-[13px] text-center',
      sortable: true
    },
    {
      field: 'settingKey',
      headerName: '설정 키 (Key)',
      width: 280,
      cellClass: 'font-semibold text-slate-700 font-mono text-[14px]',
      sortable: true,
      filter: true
    },
    {
      field: 'settingValue',
      headerName: '설정 값 (Value) — 더블클릭하여 편집',
      flex: 1,
      minWidth: 350,
      editable: true,
      cellClass: 'font-medium text-indigo-700 text-[15px] bg-indigo-50/10 focus:bg-white',
      sortable: false
    }
  ]

  return (
    <div className="flex flex-col h-screen bg-slate-50 overflow-hidden font-sans">
      <DocUserTopBar sidebarOpen={false} setSidebarOpen={() => {}} />

      <main className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
        {/* Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between shrink-0 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-500" />
              시스템 환경 설정 (SettingsPage)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              그리드에서 원하는 설정 값(Value) 셀을 더블클릭하여 수정 후 저장 버튼을 클릭하세요. (Key는 수정 불가)
            </p>
          </div>

          <div className="flex items-end justify-between gap-2 mt-2 md:mt-0">
            {statusMsg.text && (
              <div className={`px-4 py-2 rounded-lg text-xs font-semibold border ${
                statusMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'
              }`}>
                {statusMsg.text}
              </div>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchSettings}
                disabled={loading}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving || loading}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm hover:shadow"
              >
                {saving ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>설정 저장</span>
              </button>
            </div>
          </div>
        </div>

        {/* AG Grid Container */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col p-5 overflow-hidden">
          <div className="ag-theme-alpine w-full flex-1 border border-slate-200 rounded-xl overflow-hidden shadow-inner font-sans">
            <AgGridReact
              ref={gridRef}
              rowData={settings}
              columnDefs={columnDefs}
              theme="legacy"
              animateRows={true}
              rowHeight={48}
              defaultColDef={{
                resizable: true
              }}
            />
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span>※ 설정 값(Value) 열의 셀을 마우스로 더블클릭하면 텍스트를 인라인으로 직접 수정할 수 있습니다.</span>
          </div>
        </div>
      </main>
    </div>
  )
}

export default SettingsPage
