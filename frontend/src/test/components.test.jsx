import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import ListingCard from '../components/livestock/ListingCard'
import Pagination from '../components/livestock/Pagination'
import StatusBadge from '../components/ui/StatusBadge'
import { mockLivestock } from './fixtures/livestock'

describe('ListingCard', () => {
  it('links to the listing and shows only available fields', () => {
    const withoutAge = mockLivestock.find((l) => l.id === 'lst-009')
    render(<ListingCard listing={withoutAge} />, { wrapper: MemoryRouter })
    expect(screen.getByRole('link', { name: 'Sahiwal bull' })).toHaveAttribute('href', '/marketplace/lst-009')
    expect(screen.getByText('KES 185,000')).toBeInTheDocument()
    expect(screen.getByText('Available')).toBeInTheDocument()
    expect(screen.queryByText('Age:')).toBeNull()
  })
})

describe('StatusBadge', () => {
  it('labels request statuses in plain language', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pending review')).toBeInTheDocument()
  })
})

describe('Pagination', () => {
  it('renders nothing for a single page', () => {
    const { container } = render(<Pagination page={1} totalPages={1} onChange={() => {}} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows an ellipsis window and reports page changes', async () => {
    const onChange = vi.fn()
    render(<Pagination page={5} totalPages={10} onChange={onChange} />)
    const labels = screen.getAllByRole('button', { name: /^Page/ }).map((b) => b.textContent)
    expect(labels).toEqual(['1', '4', '5', '6', '10'])
    expect(screen.getAllByText('…')).toHaveLength(2)
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onChange).toHaveBeenCalledWith(6)
  })
})
