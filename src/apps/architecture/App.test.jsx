import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

// Mock Excalidraw to avoid ESM issues in tests
vi.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: () => null,
}))

// Import App after mocking
import App from './App'

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container).toBeTruthy()
  })
})
