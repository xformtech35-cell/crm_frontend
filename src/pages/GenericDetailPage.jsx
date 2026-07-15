import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { formatDate, getInitials } from '../utils/format'

function display(value) {
  if (value === undefined || value === null || value === '') return '-'
  if (/date/i.test(String(value)) && !Number.isNaN(new Date(value).getTime())) return formatDate(value)
  return String(value)
}

export default function GenericDetailPage({ title, backTo, icon, getById, idLabel, primaryKey, secondaryKey, fields }) {
  const { id } = useParams()
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setLoading(true)
    getById(id)
      .then((data) => {
        if (!alive) return
        setItem(data)
        setFailed(false)
      })
      .catch(() => {
        if (!alive) return
        setFailed(true)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  return (
    <div >
      <section >
        <div >
            <Link to={backTo} className="btn-secondary">
              <Icon name="mdi:arrow-left" className="h-4 w-4" /> Back
            </Link>
      
          <div>
            {/* <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Icon name={icon} className="h-6 w-6" />
            </div> */}
            {/* <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{idLabel} #{id}</p>
              <h1 className="text-xl font-semibold text-gray-900">{loading ? title : display(item?.[primaryKey])}</h1>
              <p className="mt-1 text-sm text-gray-500">{loading ? 'Loading record details...' : display(item?.[secondaryKey])}</p>
            </div> */}
          </div>
            </div>
             </section>
            
      
     

      {loading ? (
        <section className="workspace-panel p-5">
          <div className="h-8 skeleton" />
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {[1, 2, 3, 4, 5, 6].map((n) => <div key={n} className="h-16 skeleton" />)}
          </div>
        </section>
      ) : failed ? (
        <section className="workspace-panel p-10 text-center">
          <p className="text-base font-semibold text-gray-900">Unable to load{title.toLowerCase()}</p>
          <p className="mt-1 text-sm text-gray-500">The backend did not return this record.</p>
        </section>
      ) : (
        <section className="grid grid-cols-1 gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <div className="workspace-panel p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 text-lg font-bold text-blue-700">
                {getInitials(display(item?.[primaryKey]))}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{display(item?.[primaryKey])}</p>
                <p className="text-sm text-gray-500">{display(item?.[secondaryKey])}</p>
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Record Context</p>
              <p className="mt-2 text-sm text-gray-600">This detail view uses the same backend record as the module workspace, so list and detail data stay aligned.</p>
            </div>
          </div>

          <div className="workspace-panel overflow-hidden">
            <div className="border-b border-gray-100 px-5 py-4">
              <h2 className="text-base font-semibold text-gray-900">Details</h2>
            </div>
            <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
              {fields.map((field) => (
                <div key={field.key} className="border-b border-gray-100 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{field.label}</p>
                  <p className="mt-1 break-words text-sm font-medium text-gray-900">{display(item?.[field.key])}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
