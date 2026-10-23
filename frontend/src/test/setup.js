import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import api from '../services/api'
import { fakeApi } from './fakeApi'

configure({ asyncUtilTimeout: 3000 })

// Every test talks to the in-memory fake API, never the network.
beforeEach(() => {
  fakeApi.reset()
  api.defaults.adapter = fakeApi.adapter
})

afterEach(() => {
  cleanup()
})

// jsdom does not implement these browser APIs used by the UI.
window.scrollTo = () => {}
Element.prototype.scrollIntoView = () => {}
