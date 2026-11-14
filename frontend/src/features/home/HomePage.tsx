import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api/apiClient'
import { State } from '../../components/SharedUI'
import Amenities from './Amenities'
import ContactSection from './ContactSection'
import HeroBanner from './HeroBanner'
import RoomCard from './RoomCard'
import RoomDetail from './RoomDetail'
import { NO_FILTERS, type Filters } from './roomFilterTypes'
import RoomFilters from './RoomFilters'

export default function HomePage({ onLogin }: { onLogin: () => void }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [selected, setSelected] = useState<number | null>(null)

  const [rooms, setRooms] = useState<any[]>([])
  const [allRooms, setAllRooms] = useState<any[]>([])
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    async function loadAll() {
      try {
        const res = await api.get('/rooms')
        setAllRooms(res.data)
        const typeRes = await api.get('/room-types')
        setRoomTypes(typeRes.data)
      } catch {
        // ถ้าโหลดไม่ได้ ส่วนค้นหาด้านล่างจะแสดง error ให้เอง
      }
    }
    loadAll()
  }, [])

  useEffect(() => {
    let ignore = false // ถ้าพิมพ์เร็วๆ ผลของ request เก่าจะไม่มาทับผลใหม่

    async function search() {
      const params = new URLSearchParams()
      if (filters.q) params.append('q', filters.q)
      if (filters.type_id) params.append('type_id', filters.type_id)
      if (filters.floor) params.append('floor', filters.floor)
      if (filters.status) params.append('status', filters.status)
      if (filters.max_price) params.append('max_price', filters.max_price)

      try {
        const res = await api.get('/rooms?' + params.toString())
        if (!ignore) {
          setRooms(res.data)
          setError('')
        }
      } catch (err) {
        if (!ignore) setError(errorMessage(err))
      }
      if (!ignore) setLoading(false)
    }

    search()
    return () => {
      ignore = true
    }
  }, [filters, reload])

  const floors: number[] = []
  for (const room of allRooms) {
    if (!floors.includes(room.floor)) floors.push(room.floor)
  }
  floors.sort((a, b) => a - b)

  const availableCount = allRooms.filter((room) => room.status === 'ว่าง').length

  function findType(id: number) {
    return roomTypes.find((t) => t.room_type_id === id)
  }

  return (
    <div className="space-y-12">
      <HeroBanner totalRooms={allRooms.length} availableCount={availableCount} onLogin={onLogin} />
      <Amenities />

      <section id="rooms" className="scroll-mt-24">
        <h3 className="text-xl font-bold">ห้องพักของเรา</h3>
        <p className="mb-4 text-sm text-slate-500">
          ค้นหาตามเลขห้อง แบบห้อง ชั้น สถานะ หรือค่าเช่า แล้วกดที่ห้องเพื่อดูรายละเอียด
        </p>

        <RoomFilters
          filters={filters}
          types={roomTypes}
          floors={floors}
          onChange={(key, value) => setFilters({ ...filters, [key]: value })}
          onReset={() => setFilters(NO_FILTERS)}
        />

        <p className="mb-3 text-sm text-slate-500" aria-live="polite">
          {!loading && !error && 'พบ ' + rooms.length + ' ห้อง'}
        </p>
        <State
          loading={loading}
          error={error || null}
          empty={rooms.length === 0}
          onRetry={() => setReload(reload + 1)}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rooms.map((room) => (
            <RoomCard
              key={room.room_id}
              room={room}
              type={findType(room.room_type_id)}
              onSelect={() => setSelected(room.room_id)}
            />
          ))}
        </div>
      </section>

      <ContactSection />

      {selected !== null && (
        <RoomDetail
          roomId={selected}
          onClose={() => setSelected(null)}
          onBook={() => {
            setSelected(null)
            onLogin()
          }}
        />
      )}
    </div>
  )
}
