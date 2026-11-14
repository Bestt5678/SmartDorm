import { Badge } from '../../components/SharedUI'

export default function RoomCard({
  room,
  type,
  onSelect,
}: {
  room: any
  type: any
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent/40"
    >
      <div className="wood-grain flex items-end justify-between p-4 text-white">
        <div>
          <div className="text-3xl font-bold">{room.room_number}</div>
          <div className="text-xs text-white/75">ชั้น {room.floor}</div>
        </div>
        <Badge value={room.status} />
      </div>
      <div className="p-4">
        <div className="font-semibold">ห้อง{type?.type_name ?? '-'}</div>
        <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">
          {type?.description ?? ''}
        </p>
        <div className="mt-3 flex items-end justify-between">
          <div className="text-xl font-bold text-accent">
            {Number(room.monthly_rate).toLocaleString('th-TH')}
            <span className="ml-1 text-sm font-normal text-slate-500">บาท/เดือน</span>
          </div>
          <span className="text-sm font-medium text-accent">ดูรายละเอียด →</span>
        </div>
      </div>
    </button>
  )
}
