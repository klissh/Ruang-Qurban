'use client'

import { Tag, List, FileText, X } from 'lucide-react'

type CetakType = 'label' | 'marbot' | 'penyembelihan'

interface Props {
  onPilih: (type: CetakType) => void
  onClose: () => void
}

const OPTIONS = [
  {
    type: 'label' as CetakType,
    icon: <Tag size={24} />,
    label: 'Label PVC',
    desc: 'Label untuk kantong daging (85.6 × 53.98 mm)',
  },
  {
    type: 'marbot' as CetakType,
    icon: <List size={24} />,
    label: 'Daftar Nama',
    desc: 'Daftar nama pengurban untuk dibacakan',
  },
  {
    type: 'penyembelihan' as CetakType,
    icon: <FileText size={24} />,
    label: 'Kertas Penyembelihan',
    desc: 'Kertas nama per hewan untuk dokumentasi video',
  },
]

export default function CetakPickerModal({ onPilih, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-lg">Pilih Jenis Cetak</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-2">
          {OPTIONS.map(({ type, icon, label, desc }) => (
            <button
              key={type}
              onClick={() => onPilih(type)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-emerald-300 hover:bg-emerald-50 transition text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-50 group-hover:bg-emerald-100 flex items-center justify-center text-gray-500 group-hover:text-emerald-700 flex-shrink-0 transition">
                {icon}
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-sm">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
