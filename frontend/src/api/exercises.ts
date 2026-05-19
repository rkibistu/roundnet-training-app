const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export interface Category {
  id: string
  name: string
}

export interface Exercise {
  id: string
  name: string
  categoryId: string
  createdBy: string
  createdAt: string
  category: Category
}

export async function getCategories(): Promise<Category[]> {
  const res = await fetch(`${BASE}/categories`)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function getExercises(categoryId?: string): Promise<Exercise[]> {
  const url = categoryId ? `${BASE}/exercises?category_id=${categoryId}` : `${BASE}/exercises`
  const res = await fetch(url)
  if (!res.ok) throw new Error(res.statusText)
  return res.json()
}

export async function createExercise(token: string, data: { name: string; categoryId: string }): Promise<Exercise> {
  const res = await fetch(`${BASE}/exercises`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
  return res.json()
}

export async function updateExercise(token: string, id: string, data: { name?: string; categoryId?: string }): Promise<Exercise> {
  const res = await fetch(`${BASE}/exercises/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
  return res.json()
}

export async function deleteExercise(token: string, id: string): Promise<void> {
  const res = await fetch(`${BASE}/exercises/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? res.statusText)
  }
}
