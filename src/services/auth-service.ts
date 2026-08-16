import * as Crypto from 'expo-crypto'
import * as SecureStore from 'expo-secure-store'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

export type WirdProfile = {
  id: string
  name: string
  email: string
  createdAt: string
  avatarUri?: string
}

type StoredAccount = WirdProfile & {
  salt: string
  passwordHash: string
}

const ACCOUNT_KEY = 'wird.auth.account.v1'
const SESSION_KEY = 'wird.auth.session.v1'

async function getStoredItem(key: string) {
  return Platform.OS === 'web' ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key)
}

async function setStoredItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value)
    return
  }
  await SecureStore.setItemAsync(key, value, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  })
}

async function deleteStoredItem(key: string) {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key)
    return
  }
  await SecureStore.deleteItemAsync(key)
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hashPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`)
}

function publicProfile(account: StoredAccount): WirdProfile {
  const { id, name, email, createdAt, avatarUri } = account
  return { id, name, email, createdAt, avatarUri }
}

export async function getCurrentProfile(): Promise<WirdProfile | null> {
  const [accountJson, sessionId] = await Promise.all([
    getStoredItem(ACCOUNT_KEY),
    getStoredItem(SESSION_KEY),
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

  const existingJson = await getStoredItem(ACCOUNT_KEY)
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
  await setStoredItem(ACCOUNT_KEY, JSON.stringify(account))
  await setStoredItem(SESSION_KEY, account.id)
  return publicProfile(account)
}

export async function signIn(email: string, password: string): Promise<WirdProfile> {
  const accountJson = await getStoredItem(ACCOUNT_KEY)
  if (!accountJson) throw new Error('invalid')
  const account = JSON.parse(accountJson) as StoredAccount
  const passwordHash = await hashPassword(password, account.salt)
  if (account.email !== email.trim().toLowerCase() || account.passwordHash !== passwordHash) {
    throw new Error('invalid')
  }
  await setStoredItem(SESSION_KEY, account.id)
  return publicProfile(account)
}

export async function updateProfile(updates: { name?: string; avatarUri?: string | null }): Promise<WirdProfile> {
  const accountJson = await getStoredItem(ACCOUNT_KEY)
  if (!accountJson) throw new Error('missing')
  const account = JSON.parse(accountJson) as StoredAccount
  if (updates.name !== undefined) {
    if (updates.name.trim().length < 2) throw new Error('name')
    account.name = updates.name.trim()
  }
  if (updates.avatarUri !== undefined) account.avatarUri = updates.avatarUri ?? undefined
  await setStoredItem(ACCOUNT_KEY, JSON.stringify(account))
  return publicProfile(account)
}

export async function signOut() {
  await deleteStoredItem(SESSION_KEY)
}
