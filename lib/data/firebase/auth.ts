import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import type { AuthProvider } from '../repository'
import { getFirebaseAuth } from './client'

export const firebaseAuthProvider: AuthProvider = {
  onAuthChange(listener) {
    return onAuthStateChanged(getFirebaseAuth(), (user) =>
      listener(user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null),
    )
  },

  async signIn(email, password) {
    const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password)
    return { uid: user.uid, email: user.email, displayName: user.displayName }
  },

  async sendPasswordReset(email) {
    await sendPasswordResetEmail(getFirebaseAuth(), email.trim())
  },

  async signOut() {
    await signOut(getFirebaseAuth())
  },
}
