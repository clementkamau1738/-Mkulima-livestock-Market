import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { onUnauthenticated } from '../services/api'
import * as authService from '../services/authService'
import { AuthContext } from './authContext'

// Holds the signed-in user as reported by the server. The session itself is
// an HttpOnly cookie the browser manages; nothing secret is stored here.
export default function AuthProvider({ children }) {
  const [state, setState] = useState({ status: 'loading', user: null })
  const userRef = useRef(null)

  const setUser = useCallback((user) => {
    userRef.current = user
    setState({ status: 'ready', user })
  }, [])

  // If the server is unreachable we behave as signed out; protected pages ask
  // the visitor to sign in, which contacts the server again.
  const refresh = useCallback(
    () => authService.getSession().then(setUser, () => setUser(null)),
    [setUser],
  )

  useEffect(() => {
    let active = true
    authService.getSession().then(
      (user) => active && setUser(user),
      () => active && setUser(null),
    )
    return () => {
      active = false
    }
  }, [setUser])

  // Any API call answered with "not signed in" while we think a user is
  // signed in means the session expired or was ended elsewhere.
  useEffect(
    () =>
      onUnauthenticated(() => {
        if (!userRef.current) return
        setUser(null)
        toast.warning('Your session has ended. Please sign in again.', { id: 'session-expired' })
      }),
    [setUser],
  )

  const signIn = useCallback(async (values) => setUser(await authService.login(values)), [setUser])
  const signUp = useCallback(async (values) => setUser(await authService.register(values)), [setUser])
  const signOut = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [setUser])

  const value = useMemo(() => ({ ...state, signIn, signUp, signOut, refresh }), [state, signIn, signUp, signOut, refresh])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
