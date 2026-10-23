import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '../routes'

export function renderRoute(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  return { router, user, ...render(<RouterProvider router={router} />) }
}
