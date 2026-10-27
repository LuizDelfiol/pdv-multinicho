import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'pdv_device_id'

export function getDeviceId(): string {
  let id = localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = uuidv4()
    localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}
