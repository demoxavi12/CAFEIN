import { useState } from 'react'
import { getAdminPin, useLiveMenu } from './adminStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function DigitalMenuAdminModal({ isOpen, onClose }: Props) {
  const {
    items,
    updatePrice,
    toggleSoldOut,
    updateBadge,
    updateDescription,
    resetToDefault,
    exportConfig,
    importConfig,
  } = useLiveMenu()

  const [pinInput, setPinInput] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [editingDescId, setEditingDescId] = useState<string | null>(null)
  const [descDraft, setDescDraft] = useState('')

  if (!isOpen) return null

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault()
    const validPin = getAdminPin()
    if (pinInput === validPin || pinInput === '1234') {
      setIsAuthenticated(true)
      setErrorMsg('')
    } else {
      setErrorMsg('Incorrect PIN. (Default demo PIN is 1234)')
    }
  }

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory
    const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.section.toLowerCase().includes(query.toLowerCase())
    return matchesCat && matchesQuery
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-bronze/40 bg-espresso-2 p-5 sm:p-6 shadow-2xl flex flex-col text-ivory">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-bronze/20 text-bronze font-bold text-sm">
              ⚙
            </span>
            <div>
              <h3 className="font-display text-lg text-ivory">
                Café In Manager Portal
              </h3>
              <p className="text-[11px] text-bronze/80 font-mono">
                Live In-Café Menu Editor & Price Controller
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-ivory/10 text-ivory/70 hover:bg-ivory/20 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* PIN Authentication Gate */}
        {!isAuthenticated ? (
          <form onSubmit={handleUnlock} className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-ivory/5 border border-ivory/15 text-2xl">
              🔒
            </div>
            <h4 className="font-display text-xl text-ivory">Enter Admin Passcode</h4>
            <p className="mt-1 text-xs text-ivory/60 max-w-sm">
              Please enter the café management PIN to modify menu prices, mark items sold out, or edit descriptions.
            </p>

            <div className="mt-6 flex flex-col gap-3 w-full max-w-xs">
              <input
                type="password"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter PIN (Default: 1234)"
                className="rounded-xl border border-ivory/20 bg-black/40 px-4 py-2.5 text-center text-lg tracking-widest text-ivory placeholder:text-ivory/40 focus:border-bronze focus:outline-none"
                autoFocus
              />
              {errorMsg && (
                <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
              )}

              <button
                type="submit"
                className="btn btn-primary min-h-11 w-full text-xs uppercase tracking-wider"
              >
                Unlock Management Mode
              </button>

              <button
                type="button"
                onClick={() => {
                  setPinInput('1234')
                  setIsAuthenticated(true)
                }}
                className="text-[11px] text-bronze/80 underline mt-1"
              >
                Quick Demo Unlock (PIN: 1234)
              </button>
            </div>
          </form>
        ) : (
          /* Authenticated Manager Dashboard */
          <div className="flex flex-col flex-1 overflow-hidden pt-3">
            {/* Search and Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pb-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search dish name (e.g. Penne, Brownie)..."
                className="rounded-xl border border-ivory/15 bg-black/30 px-3 py-2 text-xs text-ivory placeholder:text-ivory/50 focus:border-bronze focus:outline-none"
              />

              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl border border-ivory/15 bg-espresso px-3 py-2 text-xs text-ivory focus:border-bronze focus:outline-none"
              >
                <option value="all">All Categories ({items.length})</option>
                <option value="beverages">Coffee & Beverages</option>
                <option value="quick-bites">Quick Bites</option>
                <option value="meals">Meals & Sandwiches</option>
                <option value="desserts">Desserts</option>
              </select>
            </div>

            {/* Editable Items List */}
            <div className="flex-1 overflow-y-auto no-scrollbar pr-1 flex flex-col gap-2.5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-ivory/10 bg-ivory/5 p-3 text-xs flex flex-col gap-2 transition-colors hover:border-ivory/20"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-ivory text-sm">
                          {item.name}
                        </span>
                        <span className="text-[10px] text-ivory/40 font-mono">
                          • {item.section}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[11px] text-ivory/60 line-clamp-1">
                        {item.description || 'No description'}
                      </p>
                    </div>

                    {/* Price Input */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-bronze font-bold">₹</span>
                      <input
                        type="number"
                        defaultValue={item.price}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value)
                          if (!isNaN(val) && val >= 0) {
                            updatePrice(item.id, val)
                          }
                        }}
                        className="w-16 rounded-lg border border-bronze/40 bg-black/40 px-2 py-1 text-center font-mono font-bold text-bronze focus:border-bronze focus:outline-none"
                        title="Edit price and tap outside to save"
                      />
                    </div>
                  </div>

                  {/* Badges, Stock & Description Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-ivory/5">
                    {/* Stock Switch */}
                    <button
                      type="button"
                      onClick={() => toggleSoldOut(item.id)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase transition-all ${
                        item.isSoldOut
                          ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {item.isSoldOut ? '✕ Sold Out' : '✓ In Stock'}
                    </button>

                    {/* Badge Selector */}
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="text-ivory/40">Badge:</span>
                      {['None', 'Bestseller', 'Chef Special'].map((b) => {
                        const val = b === 'None' ? '' : b
                        const isCurrent = (item.badge || '') === val
                        return (
                          <button
                            key={b}
                            type="button"
                            onClick={() => updateBadge(item.id, val)}
                            className={`rounded px-1.5 py-0.5 ${
                              isCurrent
                                ? 'bg-bronze text-espresso font-bold'
                                : 'bg-ivory/10 text-ivory/60 hover:text-ivory'
                            }`}
                          >
                            {b}
                          </button>
                        )
                      })}
                    </div>

                    {/* Edit Description Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingDescId(item.id)
                        setDescDraft(item.description || '')
                      }}
                      className="text-[10px] text-bronze underline ml-auto"
                    >
                      Edit Text
                    </button>
                  </div>

                  {/* Inline Description Editor */}
                  {editingDescId === item.id && (
                    <div className="mt-2 flex flex-col gap-1.5 rounded-xl bg-black/40 p-2.5 border border-ivory/10">
                      <textarea
                        value={descDraft}
                        onChange={(e) => setDescDraft(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-ivory/20 bg-espresso p-2 text-xs text-ivory focus:border-bronze focus:outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingDescId(null)}
                          className="px-2 py-0.5 text-[10px] text-ivory/60"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            updateDescription(item.id, descDraft)
                            setEditingDescId(null)
                          }}
                          className="rounded bg-bronze px-2.5 py-0.5 text-[10px] font-bold text-espresso"
                        >
                          Save Description
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Actions: Reset, Backup JSON */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ivory/10 pt-3 text-[11px]">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset all prices, availability, and descriptions back to the café printed menu?')) {
                    resetToDefault()
                  }
                }}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                Reset All To Printed Defaults
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const json = exportConfig()
                    navigator.clipboard.writeText(json)
                    alert('Configuration JSON copied to clipboard! You can save this backup.')
                  }}
                  className="rounded-lg border border-ivory/20 bg-ivory/10 px-3 py-1 text-ivory hover:bg-ivory/20 transition-colors"
                >
                  Export JSON Backup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const pasted = prompt('Paste your backup JSON configuration here:')
                    if (pasted && importConfig(pasted)) {
                      alert('Menu configuration updated successfully!')
                    }
                  }}
                  className="rounded-lg border border-ivory/20 bg-ivory/10 px-3 py-1 text-ivory hover:bg-ivory/20 transition-colors"
                >
                  Import JSON
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
