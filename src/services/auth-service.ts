import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'

export type WirdProfile = {
  id: string
  name: string
  email: string
  createdAt: string
}

type StoredAccount = WirdProfile & {
  salt: string
  passwordHash: string
}

const ACCOUNT_KEY = 'wird.auth.account.v1'
const SESSION_KEY = 'wird.auth.session.v1'

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`)
}

function publicProfile(account: StoredAccount): WirdProfile {
  const { id, name, email, createdAt } = account
  return { id, name, email, createdAt }
}

export async function getCurrentProfile(): Promise<WirdProfile | null> {
  const [accountJson, sessionId] = await Promise.all([
    SecureStore.getItemAsync(ACCOUNT_KEY),
    SecureStore.getItemAsync(SESSION_KEY),
  ])
  if (!accountJson || !sessionId) return null
  const account = JSON.parse(accountJson) as StoredAccount
  return account.id === sessionId ? publicProfile(account) : null
}

export async function signUp(name: string, email: string, password: string): Promise<WirdProfile> {
  const normalizedEmail = email.trim().toLowerCase()
  if (name.trim().length < 2) throw new Error('name')
  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) throw new Error('email')
  if (password.length < 8) throw new Error('password')

  const existingJson = await SecureStore.getItemAsync(ACCOUNT_KEY)
  if (existingJson) {
    const existing = JSON.parse(existingJson) as StoredAccount
    if (existing.email === normalizedEmail) throw new Error('exists')
  }

  const salt = bytesToHex(await Crypto.getRandomBytesAsync(24))
  const account: StoredAccount = {
    id: Crypto.randomUUID(),
    name: name.trim(),
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
    salt,
    passwordHash: await hashPassword(password, salt),
  }
  await SecureStore.setItemAsync(ACCOUNT_KEY, JSON.stringify(account), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
  await SecureStore.setItemAsync(SESSION_KEY, account.id, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
  return publicProfile(account)
}

export async function signIn(email: string, password: string): Promise<WirdProfile> {
  const accountJson = await SecureStore.getItemAsync(ACCOUNT_KEY)
  if (!accountJson) throw new Error('invalid')
  const account = JSON.parse(accountJson) as StoredAccount
  const passwordHash = await hashPassword(password, account.salt)
  if (account.email !== email.trim().toLowerCase() || account.passwordHash !== passwordHash) {
    throw new Error('invalid')
  }
  await SecureStore.setItemAsync(SESSION_KEY, account.id, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
  return publicProfile(account)
}

export async function signOut() {
  await SecureStore.deleteItemAsync(SESSION_KEY)
}
