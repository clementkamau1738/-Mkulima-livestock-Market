import { createContext } from 'react'

// { status: 'loading' | 'ready', user, signIn, signUp, signOut, refresh }
export const AuthContext = createContext(null)
