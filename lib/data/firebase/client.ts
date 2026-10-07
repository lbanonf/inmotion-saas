import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

let app: FirebaseApp | undefined
let firestore: Firestore | undefined
let auth: Auth | undefined

// Con NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true la app usa los emuladores locales
// (firebase emulators:start) en lugar del proyecto real.
const useEmulators = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'

function assertFirebaseConfig() {
  const missingKeys = [
    ['NEXT_PUBLIC_FIREBASE_API_KEY', firebaseConfig.apiKey],
    ['NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain],
    ['NEXT_PUBLIC_FIREBASE_PROJECT_ID', firebaseConfig.projectId],
    ['NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket],
    ['NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId],
    ['NEXT_PUBLIC_FIREBASE_APP_ID', firebaseConfig.appId],
  ]
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missingKeys.length > 0 && !useEmulators) {
    throw new Error(`Faltan variables de entorno de Firebase: ${missingKeys.join(', ')}`)
  }
}

export function getFirebaseApp() {
  if (app) return app

  assertFirebaseConfig()
  app = getApps().length > 0 ? getApp() : initializeApp(useEmulators ? { ...firebaseConfig, apiKey: firebaseConfig.apiKey || 'demo-key', projectId: firebaseConfig.projectId || 'demo-inmotion' } : firebaseConfig)
  return app
}

export function getDb() {
  if (firestore) return firestore

  firestore = getFirestore(getFirebaseApp())
  if (useEmulators) connectFirestoreEmulator(firestore, '127.0.0.1', 8080)
  return firestore
}

export function getFirebaseAuth() {
  if (auth) return auth

  auth = getAuth(getFirebaseApp())
  if (useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  return auth
}
