import { useRef, useState } from 'react'
import { Upload, Film, FileText, CheckCircle } from 'lucide-react'

export default function DropZone({ accept, label, hint, onFile, uploaded, icon: Icon = Upload }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handle = (file) => {
    if (!file) return
    onFile(file)
  }

  return (
    <div
      className={`drop-zone rounded-2xl p-8 flex flex-col items-center gap-4 cursor-pointer transition-all ${dragging ? 'drag-over' : ''}`}
      onClick={() => inputRef.current.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); handle(e.dataTransfer.files[0]) }}
      style={{ minHeight: 180 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={e => handle(e.target.files[0])}
      />

      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: uploaded ? 'rgba(200,241,53,0.12)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {uploaded
          ? <CheckCircle size={26} style={{ color: 'var(--acid)' }} />
          : <Icon size={26} style={{ color: 'var(--text-muted)' }} />
        }
      </div>

      <div className="text-center">
        <p className="font-medium" style={{ color: uploaded ? 'var(--acid)' : 'var(--text-primary)' }}>
          {uploaded ? `✓ ${uploaded}` : label}
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>
      </div>
    </div>
  )
}
