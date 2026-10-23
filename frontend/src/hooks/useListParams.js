import { useSearchParams } from 'react-router'

// Table filters kept in the URL (shareable, survive reloads). Changing a
// filter resets to page 1.
export function useListParams(names) {
  const [params, setParams] = useSearchParams()
  const values = Object.fromEntries(names.map((n) => [n, params.get(n) ?? '']))
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1)

  function write(next, nextPage) {
    const out = new URLSearchParams()
    Object.entries(next).forEach(([k, v]) => v && out.set(k, v))
    if (nextPage > 1) out.set('page', String(nextPage))
    setParams(out)
  }

  return {
    values,
    page,
    key: `${names.map((n) => values[n]).join('|')}|${page}`,
    setFilter: (name, value) => write({ ...values, [name]: value }, 1),
    setPage: (p) => write(values, p),
  }
}
