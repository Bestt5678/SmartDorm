import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api/apiClient'
import Modal from '../../components/Modal'
import { Badge, Button } from '../../components/SharedUI'
import { money } from '../../lib/moneyAndDate'
import RoomGallery from './RoomGallery'

export default function RoomDetail({
  roomId,
  onClose,
  onBook,
}: {
  roomId: number
  onClose: () => void
  onBook: () => void
}) {
  const [room, setRoom] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadRoom() {
      try {
        const res = await api.get('/rooms/' + roomId)
        setRoom(res.data)
      } catch (err) {
        setError(errorMessage(err))
      }
    }
    loadRoom()
  }, [roomId])

  if (!room) {
    return (
      <Modal label="รายละเอียดห้อง" onClose={onClose} className="max-w-2xl overflow-hidden">
        <div className="p-8 text-center text-slate-500">
          {error ? <p className="text-red-700">{error}</p> : 'กำลังโหลด…'}
          <button onClick={onClose} className="mt-4 block w-full text-sm underline">
            ปิด
          </button>
        </div>
      </Modal>
    )
  }

  const type = room.room_type
  const images = type.image_urls || []
  const amenities = type.amenities || []

  return (
    <Modal label="รายละเอียดห้อง" onClose={onClose} className="max-w-2xl overflow-hidden">
      <RoomGallery images={images} roomNumber={room.room_number} onClose={onClose} />

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">ห้อง {room.room_number}</h2>
            <p className="text-slate-600">
              ห้อง{type.type_name} · ชั้น {room.floor}
            </p>
          </div>
          <Badge value={room.status} />
        </div>

        {type.description && <p className="text-slate-700">{type.description}</p>}

        {amenities.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-500">สิ่งอำนวยความสะดวก</h3>
            <ul className="flex flex-wrap gap-2">
              {amenities.map((a: string) => (
                <li key={a} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
                  ✓ {a}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="text-2xl font-bold text-accent">
            {money(room.monthly_rate)}
            <span className="ml-1 text-sm font-normal text-slate-500">บาท/เดือน</span>
          </div>
          {room.status === 'ว่าง' ? (
            <Button onClick={onBook}>เข้าสู่ระบบเพื่อจองห้องนี้</Button>
          ) : (
            <span className="text-sm text-slate-500">ห้องนี้ยังไม่ว่างในขณะนี้</span>
          )}
        </div>
      </div>
    </Modal>
  )
}
