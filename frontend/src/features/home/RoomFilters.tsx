import { inputCls } from '../../components/SharedUI'
import type { Filters } from './roomFilterTypes'

const ROOM_STATUS = ['ว่าง', 'ไม่ว่าง', 'ปิดปรับปรุง']

const chip = (active: boolean) =>
  `rounded-full border px-4 py-1.5 text-sm font-medium ${
    active
      ? 'border-accent bg-accent text-white'
      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
  }`

export default function RoomFilters({
  filters,
  types,
  floors,
  onChange,
  onReset,
}: {
  filters: Filters
  types: any[]
  floors: number[]
  onChange: (key: keyof Filters, value: string) => void
  onReset: () => void
}) {
  const filtered = Object.values(filters).some((v) => v !== '')

  return (
    <>
      <div className="mb-3 flex flex-wrap gap-2">
        <button className={chip(filters.type_id === '')} onClick={() => onChange('type_id', '')}>
          ทุกแบบห้อง
        </button>
        {types.map((t) => (
          <button
            key={t.room_type_id}
            className={chip(filters.type_id === String(t.room_type_id))}
            onClick={() => onChange('type_id', String(t.room_type_id))}
          >
            ห้อง{t.type_name}
          </button>
        ))}
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]">
        <label className="text-sm">
          <span className="mb-1 block font-medium">ค้นหา</span>
          <input
            className={inputCls}
            placeholder="เลขห้อง หรือชื่อแบบห้อง"
            value={filters.q}
            onChange={(e) => onChange('q', e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">ชั้น</span>
          <select
            className={inputCls}
            value={filters.floor}
            onChange={(e) => onChange('floor', e.target.value)}
          >
            <option value="">ทุกชั้น</option>
            {floors.map((f) => (
              <option key={f} value={f}>
                ชั้น {f}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">สถานะ</span>
          <select
            className={inputCls}
            value={filters.status}
            onChange={(e) => onChange('status', e.target.value)}
          >
            <option value="">ทุกสถานะ</option>
            {ROOM_STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium">ค่าเช่าไม่เกิน (บาท)</span>
          <input
            className={inputCls}
            type="number"
            min={0}
            step={500}
            value={filters.max_price}
            onChange={(e) => onChange('max_price', e.target.value)}
          />
        </label>
        <div className="flex items-end">
          <button
            onClick={onReset}
            disabled={!filtered}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-40"
          >
            ล้างตัวกรอง
          </button>
        </div>
      </div>
    </>
  )
}
