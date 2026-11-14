import { useEffect, useState } from 'react'
import { api, errorMessage } from '../api/apiClient'
import { Button, Field, inputCls, Message, State } from '../components/SharedUI'
import { money } from '../lib/moneyAndDate'

const emptyForm = { type_name: '', base_price: '', description: '', image_urls: '', amenities: '' }

function splitText(text: string, separator: RegExp) {
  return text
    .split(separator)
    .map((item) => item.trim())
    .filter((item) => item !== '')
}

export default function RoomTypesPage() {
  const [roomTypes, setRoomTypes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reload, setReload] = useState(0)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<any>({})

  useEffect(() => {
    async function loadData() {
      try {
        const res = await api.get('/room-types')
        setRoomTypes(res.data)
        setLoadError('')
      } catch (err) {
        setLoadError(errorMessage(err))
      }
      setLoading(false)
    }
    loadData()
  }, [reload])

  function showSuccess(text: string) {
    setMessage(text)
    setIsError(false)
  }

  function showError(err: any) {
    setMessage(errorMessage(err))
    setIsError(true)
  }

  function openForm(item: any) {
    if (item) {
      setForm({
        type_name: item.type_name,
        base_price: String(item.base_price),
        description: item.description || '',
        image_urls: (item.image_urls || []).join('\n'),
        amenities: (item.amenities || []).join(', '),
      })
      setEditId(item.room_type_id)
    } else {
      setForm(emptyForm)
      setEditId(null)
    }
    setErrors({})
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const imageUrls = splitText(form.image_urls, /[\s,]+/)
    const amenities = splitText(form.amenities, /[,\n]+/)

    const newErrors: any = {}
    if (form.type_name.trim() === '') newErrors.type_name = 'กรอกชื่อประเภท'
    if (form.base_price === '' || Number(form.base_price) < 0)
      newErrors.base_price = 'กรอกราคา (ห้ามติดลบ)'
    if (imageUrls.length > 8) newErrors.image_urls = 'ใส่รูปได้ไม่เกิน 8 รูป'
    for (const url of imageUrls) {
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        newErrors.image_urls = 'URL รูปภาพต้องขึ้นต้นด้วย http:// หรือ https://'
      }
    }
    if (amenities.length > 20) newErrors.amenities = 'ใส่ได้ไม่เกิน 20 รายการ'
    setErrors(newErrors)
    if (Object.keys(newErrors).length > 0) return

    const data = {
      type_name: form.type_name.trim(),
      base_price: form.base_price,
      description: form.description,
      image_urls: imageUrls,
      amenities: amenities,
    }

    try {
      if (editId) {
        await api.patch('/room-types/' + editId, data)
      } else {
        await api.post('/room-types', data)
      }
      showSuccess('บันทึกแล้ว')
      setShowForm(false)
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  async function handleDelete(item: any) {
    if (!confirm('ลบประเภท ' + item.type_name + '?')) return
    try {
      await api.delete('/room-types/' + item.room_type_id)
      showSuccess('ลบแล้ว')
      setReload(reload + 1)
    } catch (err) {
      showError(err)
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">ประเภทห้อง</h2>
        <Button type="button" onClick={() => (showForm ? setShowForm(false) : openForm(null))}>
          {showForm ? 'ปิดฟอร์ม' : '+ เพิ่มข้อมูล'}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
        >
          <h3 className="font-semibold sm:col-span-2">
            {editId ? 'แก้ไขประเภทห้อง' : 'เพิ่มประเภทห้อง'}
          </h3>
          <Field label="ชื่อประเภท" error={errors.type_name}>
            <input
              className={inputCls}
              value={form.type_name}
              onChange={(e) => setForm({ ...form, type_name: e.target.value })}
            />
          </Field>
          <Field label="ราคาเริ่มต้น/เดือน" error={errors.base_price}>
            <input
              type="number"
              step="any"
              className={inputCls}
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: e.target.value })}
            />
          </Field>
          <Field label="รายละเอียด">
            <textarea
              className={inputCls}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="URL รูปภาพ (บรรทัดละ 1 รูป)" error={errors.image_urls}>
            <textarea
              className={inputCls}
              value={form.image_urls}
              onChange={(e) => setForm({ ...form, image_urls: e.target.value })}
            />
          </Field>
          <Field
            label="สิ่งอำนวยความสะดวก (คั่นด้วยจุลภาค เช่น แอร์, Wi-Fi)"
            error={errors.amenities}
          >
            <textarea
              className={inputCls}
              value={form.amenities}
              onChange={(e) => setForm({ ...form, amenities: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button>บันทึก</Button>
          </div>
        </form>
      )}

      <Message text={message} error={isError} />
      <State
        loading={loading}
        error={loadError || null}
        empty={roomTypes.length === 0}
        onRetry={() => setReload(reload + 1)}
      />

      {roomTypes.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">ประเภท</th>
                <th className="p-3">ราคาเริ่มต้น</th>
                <th className="p-3">รายละเอียด</th>
                <th className="p-3">รูป</th>
                <th className="p-3">สิ่งอำนวยความสะดวก</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {roomTypes.map((item) => (
                <tr key={item.room_type_id} className="border-t border-slate-100">
                  <td className="p-3">{item.room_type_id}</td>
                  <td className="p-3">{item.type_name}</td>
                  <td className="p-3">{money(item.base_price)}</td>
                  <td className="p-3">{item.description ? item.description.slice(0, 60) : '-'}</td>
                  <td className="p-3">{(item.image_urls || []).length} รูป</td>
                  <td className="p-3">{(item.amenities || []).join(', ') || '-'}</td>
                  <td className="space-x-3 whitespace-nowrap p-3 text-right">
                    <button
                      onClick={() => openForm(item)}
                      className="text-slate-600 hover:underline"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(item)}
                      className="text-red-700 hover:underline"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
