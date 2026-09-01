import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverStub,
  writable: true,
})

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: () => undefined,
  writable: true,
})

if (!File.prototype.text) {
  Object.defineProperty(File.prototype, 'text', {
    value() {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.addEventListener('load', () => resolve(String(reader.result)))
        reader.addEventListener('error', () => reject(reader.error))
        reader.readAsText(this)
      })
    },
  })
}
