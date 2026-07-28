import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// The game's logger writes verbose console.log traces on every combat/phase/ability event —
// useful during manual play, just noise in automated test output. Keep warn/error visible.
vi.spyOn(console, 'log').mockImplementation(() => {})
