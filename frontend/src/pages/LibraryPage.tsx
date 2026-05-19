import { useState, useEffect } from 'react'
import { useAuthContext } from '../context/AuthContext'
import { getCategories, getExercises, createExercise, updateExercise, deleteExercise, Category, Exercise } from '../api/exercises'

export default function LibraryPage() {
  const { player } = useAuthContext()
  const [categories, setCategories] = useState<Category[]>([])
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [newName, setNewName] = useState('')
  const [newCategoryId, setNewCategoryId] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editCategoryId, setEditCategoryId] = useState('')

  useEffect(() => {
    getCategories().then((cats) => {
      setCategories(cats)
      if (cats.length > 0) setNewCategoryId(cats[0].id)
    })
  }, [])

  useEffect(() => {
    getExercises(selectedCategory || undefined).then(setExercises)
  }, [selectedCategory])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const token = localStorage.getItem('jwt') ?? ''
    const exercise = await createExercise(token, { name: newName, categoryId: newCategoryId })
    setExercises((prev) => [exercise, ...prev])
    setNewName('')
  }

  async function handleEdit(e: React.FormEvent, id: string) {
    e.preventDefault()
    const token = localStorage.getItem('jwt') ?? ''
    const updated = await updateExercise(token, id, { name: editName, categoryId: editCategoryId })
    setExercises((prev) => prev.map((ex) => (ex.id === id ? updated : ex)))
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    const token = localStorage.getItem('jwt') ?? ''
    await deleteExercise(token, id)
    setExercises((prev) => prev.filter((ex) => ex.id !== id))
  }

  return (
    <main>
      <h1>Exercise Library</h1>

      <div>
        <label htmlFor="category-filter">Filter by category</label>
        <select
          id="category-filter"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>

      <ul>
        {exercises.map((ex) => (
          <li key={ex.id}>
            {editingId === ex.id ? (
              <form onSubmit={(e) => handleEdit(e, ex.id)} aria-label="Edit exercise">
                <input
                  aria-label="Exercise name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
                <select value={editCategoryId} onChange={(e) => setEditCategoryId(e.target.value)}>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <span>{ex.name}</span>
                <span> — {ex.category.name}</span>
                {ex.createdBy === player?.id && (
                  <>
                    <button
                      type="button"
                      onClick={() => { setEditingId(ex.id); setEditName(ex.name); setEditCategoryId(ex.categoryId) }}
                    >
                      Edit
                    </button>
                    <button type="button" onClick={() => handleDelete(ex.id)}>Delete</button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} aria-label="Add exercise">
        <label htmlFor="exercise-name">Name</label>
        <input
          id="exercise-name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          required
        />
        <label htmlFor="exercise-category">Category</label>
        <select
          id="exercise-category"
          value={newCategoryId}
          onChange={(e) => setNewCategoryId(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
        <button type="submit">Add exercise</button>
      </form>
    </main>
  )
}
