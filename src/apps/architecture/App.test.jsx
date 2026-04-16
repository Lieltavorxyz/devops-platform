import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Mock Excalidraw to avoid ESM issues in tests
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: () => null,
}))

import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(container).toBeTruthy()
  })
})
