export type Filters = {
  q: string
  type_id: string
  floor: string
  status: string
  max_price: string
}
export const NO_FILTERS: Filters = { q: '', type_id: '', floor: '', status: '', max_price: '' }
