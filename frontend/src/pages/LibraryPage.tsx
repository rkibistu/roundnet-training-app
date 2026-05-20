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
  const [showAddForm, setShowAddForm] = useState(false)
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)

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
    setShowAddForm(false)
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
    <main className="p-4 flex flex-col gap-5 max-w-lg mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-darkest dark:text-brand-lightest">Exercise Library</h1>
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="min-h-[44px] px-4 rounded-lg bg-brand-mid text-white font-semibold text-sm hover:bg-brand-dark transition-colors"
        >
          + Add exercise
        </button>
      </div>

      {/* Add exercise form */}
      {showAddForm && (
        <section
          aria-label="Add exercise"
          className="rounded-2xl bg-white dark:bg-brand-dark shadow p-5 flex flex-col gap-4"
        >
          <h2 className="text-base font-semibold text-brand-darkest dark:text-brand-lightest">New Exercise</h2>
          <form onSubmit={handleAdd} aria-label="Add exercise" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="exercise-name" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
                Name
              </label>
              <input
                id="exercise-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="exercise-category" className="text-sm font-medium text-brand-darkest dark:text-brand-lightest">
                Category
              </label>
              <select
                id="exercise-category"
                value={newCategoryId}
                onChange={(e) => setNewCategoryId(e.target.value)}
                className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 min-h-[44px] rounded-lg bg-brand-mid text-white font-semibold hover:bg-brand-dark transition-colors"
              >
                Add exercise
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="min-h-[44px] px-4 rounded-lg border border-brand-light text-brand-darkest dark:text-brand-lightest hover:border-brand-mid transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
        {[{ id: '', name: 'All' }, ...categories].map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            aria-pressed={selectedCategory === cat.id}
            className={[
              'h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              selectedCategory === cat.id
                ? 'bg-brand-mid text-white'
                : 'bg-white dark:bg-brand-dark text-brand-darkest dark:text-brand-lightest border border-brand-light hover:border-brand-mid',
            ].join(' ')}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Exercise list */}
      {exercises.length === 0 ? (
        <p className="text-sm text-brand-dark dark:text-brand-light text-center py-8">
          No exercises yet{selectedCategory ? ' in this category' : ''}.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {exercises.map((ex) => (
            <li key={ex.id} className="rounded-2xl bg-white dark:bg-brand-dark shadow px-5 py-4">
              {editingId === ex.id ? (
                <form onSubmit={(e) => handleEdit(e, ex.id)} aria-label="Edit exercise" className="flex flex-col gap-3">
                  <input
                    aria-label="Exercise name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
                  />
                  <select
                    value={editCategoryId}
                    onChange={(e) => setEditCategoryId(e.target.value)}
                    className="min-h-[44px] rounded-lg border border-brand-light px-3 py-2 text-brand-darkest dark:text-brand-lightest bg-white dark:bg-brand-darkest outline-none focus:ring-2 focus:ring-brand-mid"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 min-h-[44px] rounded-lg bg-brand-mid text-white font-semibold hover:bg-brand-dark transition-colors"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="min-h-[44px] px-4 rounded-lg border border-brand-light text-brand-darkest dark:text-brand-lightest hover:border-brand-mid transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-brand-darkest dark:text-brand-lightest">{ex.name}</span>
                    <span className="text-xs text-brand-dark dark:text-brand-light">{ex.category.name}</span>
                  </div>
                  {ex.createdBy === player?.id && (
                    <div className="flex gap-2 shrink-0 items-center">
                      {confirmingDeleteId === ex.id ? (
                        <>
                          <span className="text-xs text-brand-dark dark:text-brand-light">Sure?</span>
                          <button
                            type="button"
                            onClick={() => { setConfirmingDeleteId(null); handleDelete(ex.id) }}
                            className="min-h-[44px] px-3 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(null)}
                            className="min-h-[44px] px-3 text-sm font-medium text-brand-dark dark:text-brand-light hover:text-brand-darkest transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => { setEditingId(ex.id); setEditName(ex.name); setEditCategoryId(ex.categoryId) }}
                            className="min-h-[44px] px-3 text-sm font-medium text-brand-mid hover:text-brand-dark transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDeleteId(ex.id)}
                            className="min-h-[44px] px-3 text-sm font-medium text-red-500 hover:text-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
