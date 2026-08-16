import type { SQLiteDatabase } from 'expo-sqlite'
import * as SQLite from 'expo-sqlite'
import { Platform } from 'react-native'

export type QuranVerse = {
  globalNumber: number
  surahNumber: number
  number: number
  text: string
  surahName: string
  page: number
  juz: number
}

export type MobileSessionStatus =
  | 'scheduled'
  | 'in_progress'
  | 'paused'
  | 'completed'
  | 'ended_early'
  | 'skipped'

export type MobileSession = {
  id: number
  readingTimeId: number | null
  order: number
  name: string
  time: string
  scheduledDate: string
  duration: number
  page: number
  status: MobileSessionStatus
  enabled: boolean
  postponedUntil: string | null
  activeSeconds: number
  startGlobalAyah: number | null
  endGlobalAyah: number | null
}

export type MobilePlanSession = {
  id?: number
  order: number
  name: string
  time: string
  duration: number
  enabled: boolean
  repeatDays?: number[]
}

export type MobileTheme = 'system' | 'light' | 'dark'

export type MobileSettings = {
  theme: MobileTheme
  quranFontSize: number
  mushafZoom: number
  readerPageMode: 'auto' | 'single' | 'spread'
  readerFitMode: 'height' | 'width' | 'custom'
  showAyahNumbers: boolean
  lastOpenedPage: number
  notificationsEnabled: boolean
  preSessionWidgetEnabled: boolean
  spiritualAudioEnabled: boolean
  spiritualMessagesEnabled: boolean
  smartSuggestionsEnabled: boolean
  spiritualContentMode: 'all' | 'verse_dua' | 'hadith' | 'encouragement'
}

export type MobileStatistics = {
  completedSessions: number
  incompleteSessions: number
  totalMinutes: number
  readingDays: number
  ayahsRead: number
  approximatePages: number
  weeklyTrend: Array<{ date: string; minutes: number; pages: number; sessions: number }>
}

export type MobileKhatmaStatus = 'active' | 'completed'

export type MobileKhatmaGroup = {
  id: number
  nameAr: string
  nameEn: string
  descriptionAr: string
  descriptionEn: string
  inviteCode: string
  memberCount: number
  completedParts: number
  totalParts: number
  daysRemaining: number
  scheduleAr: string
  scheduleEn: string
  status: MobileKhatmaStatus
  createdAt: string
}

export type MobileKhatmaMember = {
  id: number
  displayName: string
  avatarInitial: string
  role: 'owner' | 'member'
  completedParts: number
}

export type MobileKhatmaDetail = MobileKhatmaGroup & {
  members: MobileKhatmaMember[]
  completedJuz: number[]
}

export type MobileSnapshot = {
  plan: {
    id: number
    startPage: number
    sessionsPerDay: number
    repeatDays: number[]
    times: MobilePlanSession[]
  }
  progress: {
    currentSurah: number
    currentAyah: number
    currentPage: number
    currentGlobalAyah: number
    percent: number
  }
  settings: MobileSettings
  sessions: MobileSession[]
  statistics: MobileStatistics
  khatmas: MobileKhatmaGroup[]
}

export type BackendStatus = {
  ready: boolean
  quranAyahs: number
  bundledSources: number
  source: 'desktop-quran.db'
}

// Static requires make Metro/EAS include the same read-only source set as desktop.
export const DESKTOP_SOURCE_ASSETS = {
  quran: require('../../assets/databases/quran.db'),
  mushafLayout: require('../../assets/databases/mushaf-layout.db'),
  tafsir: {
    qurtubi: require('../../assets/tafsir/ar-tafseer-al-qurtubi.db'),
    muyassar: require('../../assets/tafsir/ar-tafsir-muyassar.db'),
    tabari: require('../../assets/tafsir/ar-tafsir-al-tabari.db'),
    saadi: require('../../assets/tafsir/ar-tafseer-al-saddi.db'),
    ibnKathir: require('../../assets/tafsir/ar-tafsir-ibn-kathir.db'),
  },
} as const

const WEB_DATABASE_SESSION_ID = Platform.OS === 'web'
  ? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  : ''
const USER_DATABASE_NAME = Platform.OS === 'web' ? `wird-user-${WEB_DATABASE_SESSION_ID}.db` : 'wird-user.db'
const IS_WEB_SIMULATOR = Platform.OS === 'web'

const USER_SCHEMA = `
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS reading_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    start_type TEXT NOT NULL CHECK (start_type IN ('quran', 'page', 'ayah')),
    start_surah INTEGER, start_ayah INTEGER, start_page INTEGER,
    sessions_per_day INTEGER NOT NULL CHECK (sessions_per_day BETWEEN 1 AND 5),
    repeat_mode TEXT NOT NULL CHECK (repeat_mode IN ('daily', 'custom')),
    repeat_days TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS reading_times (
    id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL,
    session_order INTEGER NOT NULL, name TEXT, start_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL, repeat_days TEXT,
    is_enabled INTEGER NOT NULL DEFAULT 1, disabled_at_utc TEXT,
    FOREIGN KEY (plan_id) REFERENCES reading_plan(id) ON DELETE CASCADE,
    UNIQUE (plan_id, session_order)
  );
  CREATE TABLE IF NOT EXISTS reading_progress (
    plan_id INTEGER PRIMARY KEY, current_surah INTEGER NOT NULL,
    current_ayah INTEGER NOT NULL, current_page INTEGER NOT NULL,
    current_global_ayah INTEGER NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY (plan_id) REFERENCES reading_plan(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS reading_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT, plan_id INTEGER NOT NULL,
    reading_time_id INTEGER, scheduled_date TEXT NOT NULL, scheduled_time TEXT NOT NULL,
    session_order INTEGER, duration_minutes INTEGER NOT NULL, postponed_until TEXT,
    notification_shown_at TEXT, pre_session_widget_shown_at TEXT,
    pre_session_widget_dismissed_at TEXT, started_at TEXT, active_started_at TEXT,
    paused_at TEXT, active_seconds INTEGER NOT NULL DEFAULT 0, completed_at TEXT,
    start_surah INTEGER, start_ayah INTEGER, start_page INTEGER, start_global_ayah INTEGER,
    end_surah INTEGER, end_ayah INTEGER, end_page INTEGER, end_global_ayah INTEGER,
    status TEXT NOT NULL CHECK (status IN ('scheduled','in_progress','paused','completed','ended_early','skipped')),
    FOREIGN KEY (plan_id) REFERENCES reading_plan(id) ON DELETE CASCADE,
    UNIQUE (plan_id, scheduled_date, scheduled_time)
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1), theme TEXT NOT NULL DEFAULT 'system',
    quran_font_size INTEGER NOT NULL DEFAULT 28, mushaf_zoom INTEGER NOT NULL DEFAULT 100,
    reader_page_mode TEXT NOT NULL DEFAULT 'auto', reader_fit_mode TEXT NOT NULL DEFAULT 'height',
    show_ayah_numbers INTEGER NOT NULL DEFAULT 1, last_opened_page INTEGER NOT NULL DEFAULT 32,
    startup_enabled INTEGER NOT NULL DEFAULT 0, notifications_enabled INTEGER NOT NULL DEFAULT 1,
    pre_session_widget_enabled INTEGER NOT NULL DEFAULT 1, spiritual_audio_enabled INTEGER NOT NULL DEFAULT 1,
    spiritual_messages_enabled INTEGER NOT NULL DEFAULT 1, smart_suggestions_enabled INTEGER NOT NULL DEFAULT 1,
    selected_tafsir_id TEXT NOT NULL DEFAULT 'saadi', spiritual_content_mode TEXT NOT NULL DEFAULT 'all',
    close_behavior TEXT NOT NULL DEFAULT 'tray'
  );
  CREATE TABLE IF NOT EXISTS mobile_state (
    id INTEGER PRIMARY KEY CHECK (id = 1), state_json TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS khatma_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name_ar TEXT NOT NULL, name_en TEXT NOT NULL,
    description_ar TEXT NOT NULL DEFAULT '', description_en TEXT NOT NULL DEFAULT '',
    invite_code TEXT NOT NULL UNIQUE, days_remaining INTEGER NOT NULL DEFAULT 30,
    schedule_ar TEXT NOT NULL DEFAULT 'بعد كل صلاة', schedule_en TEXT NOT NULL DEFAULT 'After every prayer',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed')),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS khatma_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL,
    display_name TEXT NOT NULL, avatar_initial TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')), joined_at TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES khatma_groups(id) ON DELETE CASCADE,
    UNIQUE (group_id, display_name)
  );
  CREATE TABLE IF NOT EXISTS khatma_parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL,
    juz_number INTEGER NOT NULL CHECK (juz_number BETWEEN 1 AND 30), member_id INTEGER,
    completed_at TEXT NOT NULL,
    FOREIGN KEY (group_id) REFERENCES khatma_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES khatma_members(id) ON DELETE SET NULL,
    UNIQUE (group_id, juz_number)
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_plan_date
  ON reading_sessions(plan_id, scheduled_date, scheduled_time);
  CREATE INDEX IF NOT EXISTS idx_khatma_members_group ON khatma_members(group_id);
  CREATE INDEX IF NOT EXISTS idx_khatma_parts_group ON khatma_parts(group_id, juz_number);
  INSERT OR IGNORE INTO settings (id) VALUES (1);
  INSERT INTO reading_plan (id, start_type, start_surah, start_ayah, start_page, sessions_per_day, repeat_mode, repeat_days, active, created_at, updated_at)
  SELECT 1, 'page', 2, 203, 100, 3, 'daily', '[0,1,2,3,4,5,6]', 1, datetime('now'), datetime('now')
  WHERE NOT EXISTS (SELECT 1 FROM reading_plan WHERE id = 1);
  INSERT OR IGNORE INTO reading_progress (plan_id, current_surah, current_ayah, current_page, current_global_ayah, updated_at)
  VALUES (1, 2, 203, 32, 210, datetime('now'));
`

const BACKUP_TABLES = {
  khatma_groups: ['id', 'name_ar', 'name_en', 'description_ar', 'description_en', 'invite_code', 'days_remaining', 'schedule_ar', 'schedule_en', 'status', 'created_at', 'updated_at'],
  khatma_members: ['id', 'group_id', 'display_name', 'avatar_initial', 'role', 'joined_at'],
  khatma_parts: ['id', 'group_id', 'juz_number', 'member_id', 'completed_at'],
  reading_plan: ['id', 'start_type', 'start_surah', 'start_ayah', 'start_page', 'sessions_per_day', 'repeat_mode', 'repeat_days', 'active', 'created_at', 'updated_at'],
  reading_times: ['id', 'plan_id', 'session_order', 'name', 'start_time', 'duration_minutes', 'repeat_days', 'is_enabled', 'disabled_at_utc'],
  reading_progress: ['plan_id', 'current_surah', 'current_ayah', 'current_page', 'current_global_ayah', 'updated_at'],
  reading_sessions: ['id', 'plan_id', 'reading_time_id', 'scheduled_date', 'scheduled_time', 'session_order', 'duration_minutes', 'postponed_until', 'notification_shown_at', 'pre_session_widget_shown_at', 'pre_session_widget_dismissed_at', 'started_at', 'active_started_at', 'paused_at', 'active_seconds', 'completed_at', 'start_surah', 'start_ayah', 'start_page', 'start_global_ayah', 'end_surah', 'end_ayah', 'end_page', 'end_global_ayah', 'status'],
  settings: ['id', 'theme', 'quran_font_size', 'mushaf_zoom', 'reader_page_mode', 'reader_fit_mode', 'show_ayah_numbers', 'last_opened_page', 'startup_enabled', 'notifications_enabled', 'pre_session_widget_enabled', 'spiritual_audio_enabled', 'spiritual_messages_enabled', 'smart_suggestions_enabled', 'selected_tafsir_id', 'spiritual_content_mode', 'close_behavior'],
  mobile_state: ['id', 'state_json', 'updated_at'],
} as const

let userDatabase: SQLiteDatabase | null = null

function db(): SQLiteDatabase {
  if (!userDatabase) throw new Error('Mobile backend has not been initialized')
  return userDatabase
}

function dateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function shiftedDate(days: number) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function displayTime(scheduledTime: string, postponedUntil: string | null) {
  if (!postponedUntil) return scheduledTime.slice(0, 5)
  const date = new Date(postponedUntil)
  if (!Number.isFinite(date.getTime())) return scheduledTime.slice(0, 5)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

type WebKhatmaRecord = MobileKhatmaGroup & {
  members: MobileKhatmaMember[]
  completedJuz: number[]
}

type WebSimulatorState = {
  plan: MobileSnapshot['plan']
  progress: MobileSnapshot['progress']
  settings: MobileSettings
  sessions: MobileSession[]
  khatmas: WebKhatmaRecord[]
  appState: unknown | null
}

let webSimulatorState: WebSimulatorState | null = null

const WEB_QURAN_PAGE_32: QuranVerse[] = [
  { globalNumber: 203, surahNumber: 2, number: 203, text: 'وَٱذْكُرُوا۟ ٱللَّهَ فِىٓ أَيَّامٍ مَّعْدُودَٰتٍ ۚ فَمَن تَعَجَّلَ فِى يَوْمَيْنِ فَلَآ إِثْمَ عَلَيْهِ وَمَن تَأَخَّرَ فَلَآ إِثْمَ عَلَيْهِ لِمَنِ ٱتَّقَىٰ', surahName: 'البقرة', page: 32, juz: 2 },
  { globalNumber: 204, surahNumber: 2, number: 204, text: 'وَمِنَ ٱلنَّاسِ مَن يُعْجِبُكَ قَوْلُهُۥ فِى ٱلْحَيَوٰةِ ٱلدُّنْيَا وَيُشْهِدُ ٱللَّهَ عَلَىٰ مَا فِى قَلْبِهِۦ وَهُوَ أَلَدُّ ٱلْخِصَامِ', surahName: 'البقرة', page: 32, juz: 2 },
  { globalNumber: 205, surahNumber: 2, number: 205, text: 'وَإِذَا تَوَلَّىٰ سَعَىٰ فِى ٱلْأَرْضِ لِيُفْسِدَ فِيهَا وَيُهْلِكَ ٱلْحَرْثَ وَٱلنَّسْلَ ۗ وَٱللَّهُ لَا يُحِبُّ ٱلْفَسَادَ', surahName: 'البقرة', page: 32, juz: 2 },
  { globalNumber: 206, surahNumber: 2, number: 206, text: 'وَإِذَا قِيلَ لَهُ ٱتَّقِ ٱللَّهَ أَخَذَتْهُ ٱلْعِزَّةُ بِٱلْإِثْمِ ۚ فَحَسْبُهُۥ جَهَنَّمُ وَلَبِئْسَ ٱلْمِهَادُ', surahName: 'البقرة', page: 32, juz: 2 },
  { globalNumber: 207, surahNumber: 2, number: 207, text: 'وَمِنَ ٱلنَّاسِ مَن يَشْرِى نَفْسَهُ ٱبْتِغَآءَ مَرْضَاتِ ٱللَّهِ ۗ وَٱللَّهُ رَءُوفٌۢ بِٱلْعِبَادِ', surahName: 'البقرة', page: 32, juz: 2 },
  { globalNumber: 208, surahNumber: 2, number: 208, text: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ ٱدْخُلُوا۟ فِى ٱلسِّلْمِ كَآفَّةً وَلَا تَتَّبِعُوا۟ خُطُوَٰتِ ٱلشَّيْطَٰنِ ۚ إِنَّهُۥ لَكُمْ عَدُوٌّ مُّبِينٌ', surahName: 'البقرة', page: 32, juz: 2 },
]

function createWebSessions(planTimes: MobilePlanSession[]): MobileSession[] {
  const today = dateKey()
  const now = new Date().toISOString()
  const history: MobileSession[] = [
    { id: 101, readingTimeId: 1, order: 1, name: 'Wird session 1', time: '08:00', scheduledDate: shiftedDate(-6), duration: 5, page: 25, status: 'completed', enabled: true, postponedUntil: null, activeSeconds: 240, startGlobalAyah: 180, endGlobalAyah: 192 },
    { id: 102, readingTimeId: 1, order: 1, name: 'Wird session 1', time: '08:30', scheduledDate: shiftedDate(-5), duration: 5, page: 26, status: 'ended_early', enabled: true, postponedUntil: null, activeSeconds: 180, startGlobalAyah: 193, endGlobalAyah: 201 },
    { id: 103, readingTimeId: 1, order: 1, name: 'Wird session 1', time: '09:00', scheduledDate: shiftedDate(-3), duration: 5, page: 29, status: 'completed', enabled: true, postponedUntil: null, activeSeconds: 300, startGlobalAyah: 202, endGlobalAyah: 209 },
  ]
  const todaySessions = planTimes.map((session, index) => ({
    id: index + 1,
    readingTimeId: session.id ?? index + 1,
    order: session.order,
    name: session.name || `Wird session ${session.order}`,
    time: session.time,
    scheduledDate: today,
    duration: session.duration,
    page: 32,
    status: index < 2 ? 'ended_early' as MobileSessionStatus : 'scheduled' as MobileSessionStatus,
    enabled: session.enabled,
    postponedUntil: null,
    activeSeconds: index === 0 ? 60 : 0,
    startGlobalAyah: 210,
    endGlobalAyah: index < 2 ? 210 : null,
  }))
  return [...todaySessions, ...history].map((session) => ({ ...session, postponedUntil: session.postponedUntil ?? null, scheduledDate: session.scheduledDate || now.slice(0, 10) }))
}

function createWebSimulatorState(): WebSimulatorState {
  const planTimes: MobilePlanSession[] = [
    { id: 1, order: 1, name: 'Wird session 1', time: '11:35', duration: 5, enabled: true, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: 2, order: 2, name: 'Wird session 2', time: '13:18', duration: 5, enabled: true, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
    { id: 3, order: 3, name: 'Wird session 3', time: '15:30', duration: 10, enabled: true, repeatDays: [0, 1, 2, 3, 4, 5, 6] },
  ]
  const now = new Date().toISOString()
  return {
    plan: { id: 1, startPage: 32, sessionsPerDay: 3, repeatDays: [0, 1, 2, 3, 4, 5, 6], times: planTimes },
    progress: { currentSurah: 2, currentAyah: 203, currentPage: 32, currentGlobalAyah: 210, percent: 3.4 },
    settings: {
      theme: 'system', quranFontSize: 28, mushafZoom: 100, readerPageMode: 'auto', readerFitMode: 'height',
      showAyahNumbers: true, lastOpenedPage: 32, notificationsEnabled: true, preSessionWidgetEnabled: true,
      spiritualAudioEnabled: true, spiritualMessagesEnabled: true, smartSuggestionsEnabled: true, spiritualContentMode: 'all',
    },
    sessions: createWebSessions(planTimes),
    khatmas: [
      webKhatmaRecord(1, 'أصدقاء الخير', 'Friends of Good', 'KHAIR20', 12, 20, 8, now),
      webKhatmaRecord(2, 'ختمة العائلة', 'Family Khatma', 'FAMILY14', 8, 14, 12, now),
      webKhatmaRecord(3, 'رفاق القرآن', 'Quran Companions', 'QURAN26', 16, 26, 5, now),
    ],
    appState: null,
  }
}

function webKhatmaRecord(id: number, nameAr: string, nameEn: string, inviteCodeValue: string, memberCount: number, completedParts: number, daysRemaining: number, createdAt: string): WebKhatmaRecord {
  const members = Array.from({ length: memberCount }, (_, index) => ({
    id: id * 100 + index + 1,
    displayName: index === 0 ? 'Abdulqader Saif' : `Member ${index + 1}`,
    avatarInitial: index === 0 ? 'A' : String(index + 1),
    role: index === 0 ? 'owner' as const : 'member' as const,
    completedParts: Math.floor(completedParts / memberCount) + (index < completedParts % memberCount ? 1 : 0),
  }))
  return {
    id, nameAr, nameEn,
    descriptionAr: 'رحلة جماعية هادئة مع كتاب الله',
    descriptionEn: 'A calm shared journey with the Quran',
    inviteCode: inviteCodeValue, memberCount, completedParts, totalParts: 30, daysRemaining,
    scheduleAr: 'بعد كل صلاة', scheduleEn: 'After every prayer',
    status: completedParts >= 30 ? 'completed' : 'active',
    createdAt, members, completedJuz: Array.from({ length: completedParts }, (_, index) => index + 1),
  }
}

function webState() {
  if (!webSimulatorState) webSimulatorState = createWebSimulatorState()
  return webSimulatorState
}

function webKhatmaSummary(group: WebKhatmaRecord): MobileKhatmaGroup {
  return {
    id: group.id, nameAr: group.nameAr, nameEn: group.nameEn,
    descriptionAr: group.descriptionAr, descriptionEn: group.descriptionEn, inviteCode: group.inviteCode,
    memberCount: group.members.length, completedParts: group.completedJuz.length, totalParts: 30,
    daysRemaining: group.daysRemaining, scheduleAr: group.scheduleAr, scheduleEn: group.scheduleEn,
    status: group.completedJuz.length >= 30 ? 'completed' : 'active', createdAt: group.createdAt,
  }
}

function webKhatmaDetail(group: WebKhatmaRecord): MobileKhatmaDetail {
  return {
    ...webKhatmaSummary(group),
    members: group.members.map((member) => ({ ...member })),
    completedJuz: [...group.completedJuz],
  }
}

function webStatistics(state = webState()): MobileStatistics {
  const finished = state.sessions.filter((session) => ['completed', 'ended_early'].includes(session.status))
  const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = shiftedDate(index - 6)
    const sessions = finished.filter((session) => session.scheduledDate === date)
    const minutes = Math.floor(sessions.reduce((sum, session) => sum + session.activeSeconds, 0) / 60)
    return { date, minutes, pages: Math.max(0, Math.round(minutes / 4)), sessions: sessions.length }
  })
  return {
    completedSessions: finished.filter((session) => session.status === 'completed').length,
    incompleteSessions: state.sessions.filter((session) => ['ended_early', 'skipped'].includes(session.status)).length,
    totalMinutes: Math.floor(finished.reduce((sum, session) => sum + session.activeSeconds, 0) / 60),
    readingDays: new Set(finished.filter((session) => session.activeSeconds > 0).map((session) => session.scheduledDate)).size,
    ayahsRead: finished.reduce((sum, session) => sum + Math.max(0, Number(session.endGlobalAyah ?? 0) - Number(session.startGlobalAyah ?? 0) + 1), 0),
    approximatePages: 42,
    weeklyTrend,
  }
}

function webSnapshot(): MobileSnapshot {
  const state = webState()
  return {
    plan: { ...state.plan, times: state.plan.times.map((session) => ({ ...session, repeatDays: [...(session.repeatDays ?? [])] })) },
    progress: { ...state.progress },
    settings: { ...state.settings },
    sessions: state.sessions.map((session) => ({ ...session })),
    statistics: webStatistics(state),
    khatmas: state.khatmas.map(webKhatmaSummary),
  }
}

async function transaction(work: () => Promise<void>) {
  const database = db()
  await database.execAsync('BEGIN IMMEDIATE')
  try {
    await work()
    await database.execAsync('COMMIT')
  } catch (error) {
    await database.execAsync('ROLLBACK')
    throw error
  }
}

async function seedDesktopSample() {
  const database = db()
  const count = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM reading_times WHERE plan_id = 1')
  if (Number(count?.count ?? 0) > 0) return

  const now = new Date().toISOString()
  await transaction(async () => {
    await database.runAsync(
      `UPDATE reading_plan SET start_type = 'page', start_surah = 2, start_ayah = 203,
       start_page = 100, sessions_per_day = 3, repeat_mode = 'daily',
       repeat_days = '[0,1,2,3,4,5,6]', active = 1, updated_at = ? WHERE id = 1`,
      now,
    )
    const progress = await database.getFirstAsync<{ current_global_ayah: number }>('SELECT current_global_ayah FROM reading_progress WHERE plan_id = 1')
    if (Number(progress?.current_global_ayah ?? 1) === 1) {
      await database.runAsync(
        `UPDATE reading_progress SET current_surah = 2, current_ayah = 203,
         current_page = 32, current_global_ayah = 210, updated_at = ? WHERE plan_id = 1`,
        now,
      )
    }
    await database.runAsync("UPDATE settings SET theme = 'system', last_opened_page = 32 WHERE id = 1")
    for (const item of [
      { order: 1, name: 'Wird session 1', time: '11:35', duration: 5 },
      { order: 2, name: 'Wird session 2', time: '13:18', duration: 5 },
      { order: 3, name: 'Wird session 3', time: '15:30', duration: 10 },
    ]) {
      await database.runAsync(
        `INSERT INTO reading_times (plan_id, session_order, name, start_time, duration_minutes, repeat_days, is_enabled)
         VALUES (1, ?, ?, ?, ?, '[0,1,2,3,4,5,6]', 1)`,
        item.order, item.name, item.time, item.duration,
      )
    }
  })

  const historical = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) AS count FROM reading_sessions WHERE status IN ('completed','ended_early')",
  )
  if (Number(historical?.count ?? 0) === 0) {
    const minutes = [1, 2, 3, 4, 3, 4]
    const pageCounts = [7, 7, 7, 7, 6, 6]
    for (let index = 0; index < 6; index += 1) {
      const startPage = Math.max(1, 32 - pageCounts.slice(index).reduce((sum, value) => sum + value, 0))
      await database.runAsync(
        `INSERT OR IGNORE INTO reading_sessions (
          plan_id, scheduled_date, scheduled_time, session_order, duration_minutes,
          started_at, active_seconds, completed_at, start_surah, start_ayah, start_page,
          start_global_ayah, end_surah, end_ayah, end_page, end_global_ayah, status
        ) VALUES (1, ?, ?, 1, 5, ?, ?, ?, 2, 1, ?, 8, 2, 202, ?, 209, ?)`,
        shiftedDate(index - 6), `0${8 + index}:00`, now, minutes[index] * 60, now,
        startPage, startPage + pageCounts[index] - 1, index < 2 ? 'completed' : 'ended_early',
      )
    }
  }

  await ensureTodaySessions()
  const first = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM reading_sessions WHERE scheduled_date = ? AND session_order = 1', dateKey(),
  )
  if (first) {
    await database.runAsync(
      `UPDATE reading_sessions SET status = 'ended_early', started_at = ?, completed_at = ?,
       active_seconds = 60, start_surah = 2, start_ayah = 203, start_page = 32,
       start_global_ayah = 210, end_surah = 2, end_ayah = 203, end_page = 32,
       end_global_ayah = 210 WHERE id = ?`,
      now, now, first.id,
    )
  }
  const second = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM reading_sessions WHERE scheduled_date = ? AND session_order = 2', dateKey(),
  )
  if (second) {
    await database.runAsync(
      `UPDATE reading_sessions SET status = 'ended_early', started_at = ?, completed_at = ?,
       active_seconds = 0, start_surah = 2, start_ayah = 203, start_page = 32,
       start_global_ayah = 210, end_surah = 2, end_ayah = 203, end_page = 32,
       end_global_ayah = 210 WHERE id = ?`,
      now, now, second.id,
    )
  }
}

async function seedKhatmaSample() {
  const database = db()
  const count = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM khatma_groups')
  if (Number(count?.count ?? 0) > 0) return

  const now = new Date().toISOString()
  const samples = [
    { nameAr: 'أصدقاء الخير', nameEn: 'Friends of Good', code: 'KHAIR20', members: 12, parts: 20, days: 8 },
    { nameAr: 'ختمة العائلة', nameEn: 'Family Khatma', code: 'FAMILY14', members: 8, parts: 14, days: 12 },
    { nameAr: 'رفاق القرآن', nameEn: 'Quran Companions', code: 'QURAN26', members: 16, parts: 26, days: 5 },
  ]
  await transaction(async () => {
    for (const sample of samples) {
      const result = await database.runAsync(
        `INSERT INTO khatma_groups (
          name_ar, name_en, description_ar, description_en, invite_code, days_remaining,
          schedule_ar, schedule_en, status, created_at, updated_at
        ) VALUES (?, ?, 'رحلة جماعية هادئة مع كتاب الله', 'A calm shared journey with the Quran', ?, ?, 'بعد كل صلاة', 'After every prayer', 'active', ?, ?)`,
        sample.nameAr, sample.nameEn, sample.code, sample.days, now, now,
      )
      const groupId = Number(result.lastInsertRowId)
      const memberIds: number[] = []
      for (let index = 0; index < sample.members; index += 1) {
        const name = index === 0 ? 'Abdulqader Saif' : `Member ${index + 1}`
        const member = await database.runAsync(
          `INSERT INTO khatma_members (group_id, display_name, avatar_initial, role, joined_at)
           VALUES (?, ?, ?, ?, ?)`,
          groupId, name, index === 0 ? 'A' : String(index + 1), index === 0 ? 'owner' : 'member', now,
        )
        memberIds.push(Number(member.lastInsertRowId))
      }
      for (let juz = 1; juz <= sample.parts; juz += 1) {
        await database.runAsync(
          'INSERT INTO khatma_parts (group_id, juz_number, member_id, completed_at) VALUES (?, ?, ?, ?)',
          groupId, juz, memberIds[(juz - 1) % memberIds.length], now,
        )
      }
    }
  })
}

async function ensureTodaySessions() {
  const database = db()
  const today = dateKey()
  const rows = await database.getAllAsync<{
    id: number; session_order: number; start_time: string; duration_minutes: number
  }>(
    `SELECT id, session_order, start_time, duration_minutes FROM reading_times
     WHERE plan_id = 1 AND is_enabled = 1 ORDER BY session_order`,
  )
  for (const row of rows) {
    const existing = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM reading_sessions WHERE plan_id = 1 AND scheduled_date = ? AND session_order = ? LIMIT 1',
      today, row.session_order,
    )
    if (existing) continue
    await database.runAsync(
      `INSERT OR IGNORE INTO reading_sessions (
        plan_id, reading_time_id, scheduled_date, scheduled_time, session_order,
        duration_minutes, status
      ) VALUES (1, ?, ?, ?, ?, ?, 'scheduled')`,
      row.id, today, row.start_time, row.session_order, row.duration_minutes,
    )
  }

}

export async function initializeMobileBackend(quranDatabase: SQLiteDatabase): Promise<BackendStatus> {
  if (IS_WEB_SIMULATOR) {
    webState()
    return { ready: true, quranAyahs: 6236, bundledSources: 7, source: 'desktop-quran.db' }
  }
  userDatabase = await SQLite.openDatabaseAsync(USER_DATABASE_NAME)
  await userDatabase.execAsync(USER_SCHEMA)
  await seedDesktopSample()
  await seedKhatmaSample()
  await ensureTodaySessions()
  const row = await quranDatabase.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM ayahs')
  return { ready: Number(row?.count ?? 0) === 6236, quranAyahs: Number(row?.count ?? 0), bundledSources: 7, source: 'desktop-quran.db' }
}

export async function getQuranPage(quranDatabase: SQLiteDatabase, page: number): Promise<QuranVerse[]> {
  if (IS_WEB_SIMULATOR) {
    return WEB_QURAN_PAGE_32.map((verse) => ({ ...verse, page }))
  }
  const rows = await quranDatabase.getAllAsync<{
    global_number: number; surah_number: number; ayah_number: number; text_uthmani: string;
    name_ar: string; page_number: number; juz_number: number;
  }>(`SELECT a.global_number, a.surah_number, a.ayah_number, a.text_uthmani,
             s.name_ar, a.page_number, a.juz_number
      FROM ayahs a JOIN surahs s ON s.number = a.surah_number
      WHERE a.page_number = ? ORDER BY a.global_number`, page)
  return rows.map((row) => ({
    globalNumber: Number(row.global_number), surahNumber: Number(row.surah_number), number: Number(row.ayah_number),
    text: row.text_uthmani, surahName: row.name_ar, page: Number(row.page_number), juz: Number(row.juz_number),
  }))
}

async function getStatistics(): Promise<MobileStatistics> {
  const database = db()
  const summary = await database.getFirstAsync<Record<string, number>>(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completedSessions,
      COALESCE(SUM(CASE WHEN status IN ('ended_early','skipped') THEN 1 ELSE 0 END), 0) AS incompleteSessions,
      COALESCE(CAST(SUM(CASE WHEN status IN ('completed','ended_early') THEN active_seconds ELSE 0 END) / 60 AS INTEGER), 0) AS totalMinutes,
      COUNT(DISTINCT CASE WHEN status IN ('completed','ended_early') AND active_seconds > 0 THEN scheduled_date END) AS readingDays,
      COALESCE(SUM(CASE WHEN status IN ('completed','ended_early') AND end_global_ayah IS NOT NULL THEN end_global_ayah - start_global_ayah + 1 ELSE 0 END), 0) AS ayahsRead,
      COALESCE(SUM(CASE WHEN status IN ('completed','ended_early') AND end_page IS NOT NULL THEN end_page - start_page + 1 ELSE 0 END), 0) AS approximatePages
     FROM reading_sessions WHERE plan_id = 1`,
  )
  const rows = await database.getAllAsync<{ date: string; minutes: number; pages: number; sessions: number }>(
    `SELECT scheduled_date AS date,
      COALESCE(CAST(SUM(active_seconds) / 60 AS INTEGER), 0) AS minutes,
      COALESCE(SUM(CASE WHEN end_page IS NOT NULL THEN end_page - start_page + 1 ELSE 0 END), 0) AS pages,
      COUNT(*) AS sessions
     FROM reading_sessions
     WHERE plan_id = 1 AND status IN ('completed','ended_early')
       AND scheduled_date >= date('now', 'localtime', '-6 days')
     GROUP BY scheduled_date`,
  )
  const byDate = new Map(rows.map((row) => [row.date, row]))
  const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = shiftedDate(index - 6)
    const row = byDate.get(date)
    return { date, minutes: Number(row?.minutes ?? 0), pages: Number(row?.pages ?? 0), sessions: Number(row?.sessions ?? 0) }
  })
  return {
    completedSessions: Number(summary?.completedSessions ?? 0),
    incompleteSessions: Number(summary?.incompleteSessions ?? 0),
    totalMinutes: Number(summary?.totalMinutes ?? 0),
    readingDays: Number(summary?.readingDays ?? 0),
    ayahsRead: Number(summary?.ayahsRead ?? 0),
    approximatePages: Number(summary?.approximatePages ?? 0),
    weeklyTrend,
  }
}

function mapKhatmaGroup(row: Record<string, unknown>): MobileKhatmaGroup {
  return {
    id: Number(row.id),
    nameAr: String(row.name_ar),
    nameEn: String(row.name_en),
    descriptionAr: String(row.description_ar ?? ''),
    descriptionEn: String(row.description_en ?? ''),
    inviteCode: String(row.invite_code),
    memberCount: Number(row.member_count ?? 0),
    completedParts: Number(row.completed_parts ?? 0),
    totalParts: 30,
    daysRemaining: Number(row.days_remaining ?? 0),
    scheduleAr: String(row.schedule_ar),
    scheduleEn: String(row.schedule_en),
    status: row.status === 'completed' ? 'completed' : 'active',
    createdAt: String(row.created_at),
  }
}

export async function loadMobileKhatmaGroups(): Promise<MobileKhatmaGroup[]> {
  if (IS_WEB_SIMULATOR) return webState().khatmas.map(webKhatmaSummary)
  const rows = await db().getAllAsync<Record<string, unknown>>(
    `SELECT g.*,
      COUNT(DISTINCT m.id) AS member_count,
      COUNT(DISTINCT p.juz_number) AS completed_parts
     FROM khatma_groups g
     LEFT JOIN khatma_members m ON m.group_id = g.id
     LEFT JOIN khatma_parts p ON p.group_id = g.id
     GROUP BY g.id
     ORDER BY CASE g.status WHEN 'active' THEN 0 ELSE 1 END, g.updated_at DESC`,
  )
  return rows.map(mapKhatmaGroup)
}

export async function loadMobileKhatmaDetail(groupId: number): Promise<MobileKhatmaDetail> {
  if (IS_WEB_SIMULATOR) {
    const group = webState().khatmas.find((item) => item.id === groupId)
    if (!group) throw new Error('Khatma group was not found')
    return webKhatmaDetail(group)
  }
  const groups = await db().getAllAsync<Record<string, unknown>>(
    `SELECT g.*,
      COUNT(DISTINCT m.id) AS member_count,
      COUNT(DISTINCT p.juz_number) AS completed_parts
     FROM khatma_groups g
     LEFT JOIN khatma_members m ON m.group_id = g.id
     LEFT JOIN khatma_parts p ON p.group_id = g.id
     WHERE g.id = ? GROUP BY g.id`,
    groupId,
  )
  if (!groups[0]) throw new Error('Khatma group was not found')
  const members = await db().getAllAsync<Record<string, unknown>>(
    `SELECT m.*, COUNT(p.id) AS completed_parts
     FROM khatma_members m LEFT JOIN khatma_parts p ON p.member_id = m.id
     WHERE m.group_id = ? GROUP BY m.id
     ORDER BY CASE m.role WHEN 'owner' THEN 0 ELSE 1 END, m.joined_at`,
    groupId,
  )
  const parts = await db().getAllAsync<{ juz_number: number }>(
    'SELECT juz_number FROM khatma_parts WHERE group_id = ? ORDER BY juz_number',
    groupId,
  )
  return {
    ...mapKhatmaGroup(groups[0]),
    members: members.map((row) => ({
      id: Number(row.id), displayName: String(row.display_name), avatarInitial: String(row.avatar_initial),
      role: row.role === 'owner' ? 'owner' : 'member', completedParts: Number(row.completed_parts ?? 0),
    })),
    completedJuz: parts.map((part) => Number(part.juz_number)),
  }
}

function inviteCode(name: string) {
  const prefix = name.replace(/[^A-Za-z0-9]/g, '').slice(0, 4).toUpperCase() || 'WIRD'
  return `${prefix}${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

export async function createMobileKhatmaGroup(input: {
  nameAr: string; nameEn: string; daysRemaining: number; ownerName: string
}): Promise<MobileKhatmaDetail> {
  if (IS_WEB_SIMULATOR) {
    const state = webState()
    const now = new Date().toISOString()
    const nextId = Math.max(0, ...state.khatmas.map((group) => group.id)) + 1
    const group = webKhatmaRecord(
      nextId,
      input.nameAr.trim() || 'ختمة جديدة',
      input.nameEn.trim() || 'New Khatma',
      inviteCode(input.nameEn || input.nameAr),
      1,
      0,
      Math.min(365, Math.max(1, input.daysRemaining)),
      now,
    )
    group.members = [{
      id: nextId * 100 + 1,
      displayName: input.ownerName.trim() || 'Wird User',
      avatarInitial: (input.ownerName.trim().slice(0, 1) || 'W').toUpperCase(),
      role: 'owner',
      completedParts: 0,
    }]
    state.khatmas.unshift(group)
    return webKhatmaDetail(group)
  }
  const database = db()
  const now = new Date().toISOString()
  let groupId = 0
  await transaction(async () => {
    const result = await database.runAsync(
      `INSERT INTO khatma_groups (
        name_ar, name_en, description_ar, description_en, invite_code, days_remaining,
        schedule_ar, schedule_en, status, created_at, updated_at
      ) VALUES (?, ?, 'رحلة جماعية هادئة مع كتاب الله', 'A calm shared journey with the Quran', ?, ?, 'بعد كل صلاة', 'After every prayer', 'active', ?, ?)`,
      input.nameAr.trim(), input.nameEn.trim(), inviteCode(input.nameEn || input.nameAr),
      Math.min(365, Math.max(1, input.daysRemaining)), now, now,
    )
    groupId = Number(result.lastInsertRowId)
    await database.runAsync(
      `INSERT INTO khatma_members (group_id, display_name, avatar_initial, role, joined_at)
       VALUES (?, ?, ?, 'owner', ?)`,
      groupId, input.ownerName.trim(), input.ownerName.trim().slice(0, 1).toUpperCase() || 'W', now,
    )
  })
  return loadMobileKhatmaDetail(groupId)
}

export async function joinMobileKhatma(invite: string, displayName: string): Promise<MobileKhatmaDetail> {
  if (IS_WEB_SIMULATOR) {
    const state = webState()
    const group = state.khatmas.find((item) => item.inviteCode.toUpperCase() === invite.trim().toUpperCase())
    if (!group) throw new Error('Khatma invite was not found')
    const name = displayName.trim() || 'Wird User'
    if (!group.members.some((member) => member.displayName.toLowerCase() === name.toLowerCase())) {
      group.members.push({
        id: group.id * 100 + group.members.length + 1,
        displayName: name,
        avatarInitial: (name.slice(0, 1) || 'W').toUpperCase(),
        role: 'member',
        completedParts: 0,
      })
    }
    return webKhatmaDetail(group)
  }
  const database = db()
  const group = await database.getFirstAsync<{ id: number }>(
    'SELECT id FROM khatma_groups WHERE UPPER(invite_code) = UPPER(?) LIMIT 1', invite.trim(),
  )
  if (!group) throw new Error('Khatma invite was not found')
  const name = displayName.trim()
  await database.runAsync(
    `INSERT OR IGNORE INTO khatma_members (group_id, display_name, avatar_initial, role, joined_at)
     VALUES (?, ?, ?, 'member', ?)`,
    group.id, name, name.slice(0, 1).toUpperCase() || 'W', new Date().toISOString(),
  )
  return loadMobileKhatmaDetail(group.id)
}

export async function completeMobileKhatmaPart(groupId: number, displayName: string): Promise<MobileKhatmaDetail> {
  if (IS_WEB_SIMULATOR) {
    const state = webState()
    const group = state.khatmas.find((item) => item.id === groupId)
    if (!group) throw new Error('Khatma group was not found')
    const name = displayName.trim() || 'Wird User'
    let member = group.members.find((item) => item.displayName.toLowerCase() === name.toLowerCase())
    if (!member) {
      member = {
        id: group.id * 100 + group.members.length + 1,
        displayName: name,
        avatarInitial: (name.slice(0, 1) || 'W').toUpperCase(),
        role: 'member',
        completedParts: 0,
      }
      group.members.push(member)
    }
    const nextJuz = Array.from({ length: 30 }, (_, index) => index + 1).find((juz) => !group.completedJuz.includes(juz))
    if (nextJuz) {
      group.completedJuz.push(nextJuz)
      member.completedParts += 1
      group.completedParts = group.completedJuz.length
      group.memberCount = group.members.length
      group.status = group.completedJuz.length >= 30 ? 'completed' : 'active'
    }
    return webKhatmaDetail(group)
  }
  const database = db()
  const now = new Date().toISOString()
  await transaction(async () => {
    let member = await database.getFirstAsync<{ id: number }>(
      'SELECT id FROM khatma_members WHERE group_id = ? AND display_name = ? LIMIT 1', groupId, displayName.trim(),
    )
    if (!member) {
      const result = await database.runAsync(
        `INSERT INTO khatma_members (group_id, display_name, avatar_initial, role, joined_at)
         VALUES (?, ?, ?, 'member', ?)`,
        groupId, displayName.trim(), displayName.trim().slice(0, 1).toUpperCase() || 'W', now,
      )
      member = { id: Number(result.lastInsertRowId) }
    }
    const next = await database.getFirstAsync<{ juz: number }>(
      `SELECT value AS juz FROM (
        SELECT 1 AS value UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
        UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10
        UNION ALL SELECT 11 UNION ALL SELECT 12 UNION ALL SELECT 13 UNION ALL SELECT 14 UNION ALL SELECT 15
        UNION ALL SELECT 16 UNION ALL SELECT 17 UNION ALL SELECT 18 UNION ALL SELECT 19 UNION ALL SELECT 20
        UNION ALL SELECT 21 UNION ALL SELECT 22 UNION ALL SELECT 23 UNION ALL SELECT 24 UNION ALL SELECT 25
        UNION ALL SELECT 26 UNION ALL SELECT 27 UNION ALL SELECT 28 UNION ALL SELECT 29 UNION ALL SELECT 30
      ) WHERE value NOT IN (SELECT juz_number FROM khatma_parts WHERE group_id = ?) ORDER BY value LIMIT 1`,
      groupId,
    )
    if (!next) return
    await database.runAsync(
      'INSERT INTO khatma_parts (group_id, juz_number, member_id, completed_at) VALUES (?, ?, ?, ?)',
      groupId, next.juz, member.id, now,
    )
    const progress = await database.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM khatma_parts WHERE group_id = ?', groupId,
    )
    await database.runAsync(
      `UPDATE khatma_groups SET status = ?, updated_at = ? WHERE id = ?`,
      Number(progress?.count ?? 0) >= 30 ? 'completed' : 'active', now, groupId,
    )
  })
  return loadMobileKhatmaDetail(groupId)
}

export async function loadMobileSnapshot(): Promise<MobileSnapshot> {
  if (IS_WEB_SIMULATOR) return webSnapshot()
  await ensureTodaySessions()
  const database = db()
  const plan = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT p.*, r.current_surah, r.current_ayah, r.current_page, r.current_global_ayah
     FROM reading_plan p JOIN reading_progress r ON r.plan_id = p.id WHERE p.id = 1`,
  )
  if (!plan) throw new Error('Reading plan is unavailable')
  const timeRows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM reading_times WHERE plan_id = 1 ORDER BY session_order',
  )
  const sessionRows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT rs.*, rt.id AS live_reading_time_id, rt.name, rt.is_enabled
     FROM reading_sessions rs LEFT JOIN reading_times rt
       ON rt.plan_id = rs.plan_id AND rt.session_order = rs.session_order
     WHERE rs.plan_id = 1
     ORDER BY rs.scheduled_date DESC, rs.scheduled_time ASC LIMIT 200`,
  )
  const setting = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM settings WHERE id = 1')
  const currentPage = Number(plan.current_page)
  const currentGlobalAyah = Number(plan.current_global_ayah)
  const settings: MobileSettings = {
    theme: ['system', 'light', 'dark'].includes(String(setting?.theme)) ? setting?.theme as MobileTheme : 'system',
    quranFontSize: Number(setting?.quran_font_size ?? 28),
    mushafZoom: Number(setting?.mushaf_zoom ?? 100),
    readerPageMode: ['single', 'spread'].includes(String(setting?.reader_page_mode)) ? setting?.reader_page_mode as 'single' | 'spread' : 'auto',
    readerFitMode: ['width', 'custom'].includes(String(setting?.reader_fit_mode)) ? setting?.reader_fit_mode as 'width' | 'custom' : 'height',
    showAyahNumbers: Boolean(setting?.show_ayah_numbers),
    lastOpenedPage: Number(setting?.last_opened_page ?? currentPage),
    notificationsEnabled: Boolean(setting?.notifications_enabled),
    preSessionWidgetEnabled: Boolean(setting?.pre_session_widget_enabled),
    spiritualAudioEnabled: Boolean(setting?.spiritual_audio_enabled),
    spiritualMessagesEnabled: Boolean(setting?.spiritual_messages_enabled),
    smartSuggestionsEnabled: Boolean(setting?.smart_suggestions_enabled),
    spiritualContentMode: ['verse_dua', 'hadith', 'encouragement'].includes(String(setting?.spiritual_content_mode)) ? setting?.spiritual_content_mode as MobileSettings['spiritualContentMode'] : 'all',
  }
  return {
    plan: {
      id: Number(plan.id), startPage: Number(plan.start_page ?? 1), sessionsPerDay: Number(plan.sessions_per_day),
      repeatDays: JSON.parse(String(plan.repeat_days ?? '[]')) as number[],
      times: timeRows.map((row) => ({
        id: Number(row.id), order: Number(row.session_order), name: String(row.name ?? `Wird session ${row.session_order}`),
        time: String(row.start_time).slice(0, 5), duration: Number(row.duration_minutes), enabled: Boolean(row.is_enabled),
        repeatDays: JSON.parse(String(row.repeat_days ?? plan.repeat_days ?? '[]')) as number[],
      })),
    },
    progress: {
      currentSurah: Number(plan.current_surah), currentAyah: Number(plan.current_ayah), currentPage,
      currentGlobalAyah, percent: Math.round(currentGlobalAyah / 6236 * 1000) / 10,
    },
    settings,
    sessions: sessionRows.map((row) => ({
      id: Number(row.id), readingTimeId: row.live_reading_time_id === null || row.live_reading_time_id === undefined ? null : Number(row.live_reading_time_id),
      order: Number(row.session_order ?? 1), name: String(row.name ?? `Wird session ${row.session_order ?? 1}`),
      time: displayTime(String(row.scheduled_time), row.postponed_until ? String(row.postponed_until) : null),
      scheduledDate: String(row.scheduled_date), duration: Number(row.duration_minutes),
      page: Number(row.start_page ?? currentPage), status: String(row.status) as MobileSessionStatus,
      enabled: row.is_enabled === null || row.is_enabled === undefined ? true : Boolean(row.is_enabled),
      postponedUntil: row.postponed_until ? String(row.postponed_until) : null,
      activeSeconds: Number(row.active_seconds ?? 0),
      startGlobalAyah: row.start_global_ayah === null ? null : Number(row.start_global_ayah),
      endGlobalAyah: row.end_global_ayah === null ? null : Number(row.end_global_ayah),
    })),
    statistics: await getStatistics(),
    khatmas: await loadMobileKhatmaGroups(),
  }
}

async function currentActiveSeconds(session: Record<string, unknown>) {
  const stored = Math.max(0, Number(session.active_seconds ?? 0))
  if (session.status !== 'in_progress' || !session.active_started_at) return stored
  const started = new Date(String(session.active_started_at)).getTime()
  return stored + (Number.isFinite(started) ? Math.max(0, Math.floor((Date.now() - started) / 1000)) : 0)
}

export async function startMobileSession(sessionId: number) {
  if (IS_WEB_SIMULATOR) {
    const state = webState()
    const session = state.sessions.find((item) => item.id === sessionId)
    if (!session || !['scheduled', 'paused'].includes(session.status)) throw new Error('Session is not available')
    for (const item of state.sessions) {
      if (item.status === 'in_progress' && item.id !== sessionId) item.status = 'paused'
    }
    session.status = 'in_progress'
    session.startGlobalAyah = session.startGlobalAyah ?? state.progress.currentGlobalAyah
    session.endGlobalAyah = session.endGlobalAyah ?? state.progress.currentGlobalAyah
    return webSnapshot()
  }
  const database = db()
  const current = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM reading_sessions WHERE id = ?', sessionId)
  if (!current || !['scheduled', 'paused'].includes(String(current.status))) throw new Error('Session is not available')
  const active = await database.getFirstAsync<Record<string, unknown>>("SELECT * FROM reading_sessions WHERE status = 'in_progress' LIMIT 1")
  const progress = await database.getFirstAsync<Record<string, number>>('SELECT * FROM reading_progress WHERE plan_id = 1')
  const now = new Date().toISOString()
  await transaction(async () => {
    if (active && Number(active.id) !== sessionId) {
      await database.runAsync(
        "UPDATE reading_sessions SET status = 'paused', active_seconds = ?, active_started_at = NULL, paused_at = ? WHERE id = ?",
        await currentActiveSeconds(active), now, Number(active.id),
      )
    }
    await database.runAsync(
      `UPDATE reading_sessions SET status = 'in_progress', started_at = COALESCE(started_at, ?),
       active_started_at = ?, paused_at = NULL, start_surah = COALESCE(start_surah, ?),
       start_ayah = COALESCE(start_ayah, ?), start_page = COALESCE(start_page, ?),
       start_global_ayah = COALESCE(start_global_ayah, ?), end_surah = COALESCE(end_surah, ?),
       end_ayah = COALESCE(end_ayah, ?), end_page = COALESCE(end_page, ?),
       end_global_ayah = COALESCE(end_global_ayah, ?) WHERE id = ?`,
      now, now, progress?.current_surah ?? 2, progress?.current_ayah ?? 203,
      progress?.current_page ?? 32, progress?.current_global_ayah ?? 210,
      progress?.current_surah ?? 2, progress?.current_ayah ?? 203,
      progress?.current_page ?? 32, progress?.current_global_ayah ?? 210, sessionId,
    )
  })
  return loadMobileSnapshot()
}

export async function pauseMobileSession(sessionId: number) {
  if (IS_WEB_SIMULATOR) {
    const session = webState().sessions.find((item) => item.id === sessionId)
    if (session?.status === 'in_progress') {
      session.status = 'paused'
      session.activeSeconds = Math.max(session.activeSeconds, 60)
    }
    return webSnapshot()
  }
  const database = db()
  const session = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM reading_sessions WHERE id = ?', sessionId)
  if (!session || session.status !== 'in_progress') return loadMobileSnapshot()
  await database.runAsync(
    "UPDATE reading_sessions SET status = 'paused', active_seconds = ?, active_started_at = NULL, paused_at = ? WHERE id = ?",
    await currentActiveSeconds(session), new Date().toISOString(), sessionId,
  )
  return loadMobileSnapshot()
}

export async function postponeMobileSession(sessionId: number, minutes: number) {
  if (IS_WEB_SIMULATOR) {
    const session = webState().sessions.find((item) => item.id === sessionId)
    if (session?.status === 'scheduled') {
      session.postponedUntil = new Date(Date.now() + minutes * 60_000).toISOString()
      session.time = displayTime(session.time, session.postponedUntil)
    }
    return webSnapshot()
  }
  const database = db()
  const session = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM reading_sessions WHERE id = ?', sessionId)
  if (!session || session.status !== 'scheduled') return loadMobileSnapshot()
  const scheduled = new Date(`${session.scheduled_date}T${session.scheduled_time}:00`)
  const base = Math.max(Date.now(), Number.isFinite(scheduled.getTime()) ? scheduled.getTime() : Date.now())
  const postponedUntil = new Date(base + minutes * 60_000).toISOString()
  await database.runAsync(
    `UPDATE reading_sessions SET postponed_until = ?, notification_shown_at = NULL,
     pre_session_widget_shown_at = NULL, pre_session_widget_dismissed_at = NULL WHERE id = ?`,
    postponedUntil, sessionId,
  )
  return loadMobileSnapshot()
}

export async function completeMobileSession(sessionId: number, globalNumber: number, quranDatabase: SQLiteDatabase) {
  if (IS_WEB_SIMULATOR) {
    const state = webState()
    const session = state.sessions.find((item) => item.id === sessionId)
    if (!session || session.status !== 'in_progress') return webSnapshot()
    session.activeSeconds = Math.max(session.activeSeconds, session.duration * 60)
    session.status = 'completed'
    session.endGlobalAyah = globalNumber
    state.progress = {
      currentSurah: 2,
      currentAyah: Math.min(286, Math.max(1, globalNumber - 7)),
      currentPage: 32,
      currentGlobalAyah: Math.min(6236, globalNumber + 1),
      percent: Math.round(Math.min(6236, globalNumber + 1) / 6236 * 1000) / 10,
    }
    return webSnapshot()
  }
  const database = db()
  const session = await database.getFirstAsync<Record<string, unknown>>('SELECT * FROM reading_sessions WHERE id = ?', sessionId)
  if (!session || session.status !== 'in_progress') return loadMobileSnapshot()
  const ayah = await quranDatabase.getFirstAsync<Record<string, number>>(
    'SELECT global_number, surah_number, ayah_number, page_number FROM ayahs WHERE global_number = ?', globalNumber,
  )
  if (!ayah) throw new Error('Reading position is unavailable')
  const next = await quranDatabase.getFirstAsync<Record<string, number>>(
    'SELECT global_number, surah_number, ayah_number, page_number FROM ayahs WHERE global_number = ?', Math.min(6236, globalNumber + 1),
  )
  const now = new Date().toISOString()
  const seconds = await currentActiveSeconds(session)
  const status = seconds >= Number(session.duration_minutes) * 60 ? 'completed' : 'ended_early'
  await transaction(async () => {
    await database.runAsync(
      `UPDATE reading_sessions SET status = ?, active_seconds = ?, active_started_at = NULL,
       completed_at = ?, end_surah = ?, end_ayah = ?, end_page = ?, end_global_ayah = ? WHERE id = ?`,
      status, seconds, now, ayah.surah_number, ayah.ayah_number, ayah.page_number, ayah.global_number, sessionId,
    )
    const position = next ?? ayah
    await database.runAsync(
      `UPDATE reading_progress SET current_surah = ?, current_ayah = ?, current_page = ?,
       current_global_ayah = ?, updated_at = ? WHERE plan_id = 1`,
      position.surah_number, position.ayah_number, position.page_number, position.global_number, now,
    )
  })
  return loadMobileSnapshot()
}

export async function saveMobilePlan(sessions: MobilePlanSession[]) {
  if (IS_WEB_SIMULATOR) {
    if (sessions.length < 1 || sessions.length > 5) throw new Error('A plan requires between one and five sessions')
    if (!sessions.some((session) => session.enabled)) throw new Error('At least one session must be active')
    const state = webState()
    state.plan = {
      ...state.plan,
      sessionsPerDay: sessions.length,
      times: sessions.map((session, index) => ({
        ...session,
        id: session.id ?? index + 1,
        order: index + 1,
        name: session.name || `Wird session ${index + 1}`,
        duration: Math.min(120, Math.max(5, session.duration)),
        repeatDays: session.repeatDays ?? [0, 1, 2, 3, 4, 5, 6],
      })),
    }
    const history = state.sessions.filter((session) => session.scheduledDate !== dateKey())
    state.sessions = [...createWebSessions(state.plan.times).filter((session) => session.scheduledDate === dateKey()), ...history]
    return webSnapshot()
  }
  if (sessions.length < 1 || sessions.length > 5) throw new Error('A plan requires between one and five sessions')
  if (!sessions.some((session) => session.enabled)) throw new Error('At least one session must be active')
  const database = db()
  const now = new Date().toISOString()
  await transaction(async () => {
    await database.runAsync('UPDATE reading_plan SET sessions_per_day = ?, updated_at = ? WHERE id = 1', sessions.length, now)
    await database.runAsync('DELETE FROM reading_times WHERE plan_id = 1')
    for (const [index, session] of sessions.entries()) {
      await database.runAsync(
        `INSERT INTO reading_times (plan_id, session_order, name, start_time, duration_minutes, repeat_days, is_enabled, disabled_at_utc)
         VALUES (1, ?, ?, ?, ?, ?, ?, ?)`,
        index + 1, session.name || `Wird session ${index + 1}`, session.time, Math.min(120, Math.max(5, session.duration)),
        JSON.stringify(session.repeatDays ?? [0, 1, 2, 3, 4, 5, 6]), session.enabled ? 1 : 0, session.enabled ? null : now,
      )
    }
    await database.runAsync("DELETE FROM reading_sessions WHERE status = 'scheduled' AND scheduled_date >= ?", dateKey())
  })
  await ensureTodaySessions()
  return loadMobileSnapshot()
}

export async function loadAppState<T>(): Promise<T | null> {
  if (IS_WEB_SIMULATOR) return webState().appState as T | null
  const row = await db().getFirstAsync<{ state_json: string }>('SELECT state_json FROM mobile_state WHERE id = 1')
  return row ? JSON.parse(row.state_json) as T : null
}

export async function saveAppState(state: unknown) {
  if (IS_WEB_SIMULATOR) {
    const current = webState()
    current.appState = state
    const values = state as Partial<{
      themeMode: MobileTheme; darkMode: boolean; fontSize: number; mushafZoom: number; pageMode: string; fitMode: string;
      ayahNumbers: boolean; readerPage: number; notifications: boolean; preSessionAlert: boolean;
      spiritualAudio: boolean; spiritualCards: boolean; smartSuggestions: boolean;
    }>
    current.settings = {
      ...current.settings,
      theme: values.themeMode && ['system', 'light', 'dark'].includes(values.themeMode)
        ? values.themeMode
        : typeof values.darkMode === 'boolean' ? values.darkMode ? 'dark' : 'light' : current.settings.theme,
      quranFontSize: values.fontSize ?? current.settings.quranFontSize,
      mushafZoom: values.mushafZoom ?? current.settings.mushafZoom,
      readerPageMode: values.pageMode === 'single' || values.pageMode === 'spread' ? values.pageMode : current.settings.readerPageMode,
      readerFitMode: values.fitMode === 'width' || values.fitMode === 'custom' || values.fitMode === 'height' ? values.fitMode : current.settings.readerFitMode,
      showAyahNumbers: values.ayahNumbers ?? current.settings.showAyahNumbers,
      lastOpenedPage: values.readerPage ?? current.settings.lastOpenedPage,
      notificationsEnabled: values.notifications ?? current.settings.notificationsEnabled,
      preSessionWidgetEnabled: values.preSessionAlert ?? current.settings.preSessionWidgetEnabled,
      spiritualAudioEnabled: values.spiritualAudio ?? current.settings.spiritualAudioEnabled,
      spiritualMessagesEnabled: values.spiritualCards ?? current.settings.spiritualMessagesEnabled,
      smartSuggestionsEnabled: values.smartSuggestions ?? current.settings.smartSuggestionsEnabled,
    }
    return
  }
  const database = db()
  const json = JSON.stringify(state)
  const now = new Date().toISOString()
  const values = state as Partial<{
    themeMode: MobileTheme; darkMode: boolean; fontSize: number; mushafZoom: number; pageMode: string; fitMode: string;
    ayahNumbers: boolean; readerPage: number; notifications: boolean; preSessionAlert: boolean;
    spiritualAudio: boolean; spiritualCards: boolean; smartSuggestions: boolean;
  }>
  const theme = values.themeMode && ['system', 'light', 'dark'].includes(values.themeMode)
    ? values.themeMode
    : typeof values.darkMode === 'boolean' ? values.darkMode ? 'dark' : 'light' : 'system'
  await database.runAsync(
    `INSERT INTO mobile_state (id, state_json, updated_at) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET state_json = excluded.state_json, updated_at = excluded.updated_at`,
    json, now,
  )
  await database.runAsync(
    `UPDATE settings SET theme = ?, quran_font_size = ?, mushaf_zoom = ?, reader_page_mode = ?, reader_fit_mode = ?,
      show_ayah_numbers = ?, last_opened_page = ?, notifications_enabled = ?, pre_session_widget_enabled = ?,
      spiritual_audio_enabled = ?, spiritual_messages_enabled = ?, smart_suggestions_enabled = ? WHERE id = 1`,
    theme, values.fontSize ?? 28, values.mushafZoom ?? 100,
    values.pageMode ?? 'auto', values.fitMode ?? 'height', values.ayahNumbers === false ? 0 : 1,
    values.readerPage ?? 32, values.notifications === false ? 0 : 1, values.preSessionAlert === false ? 0 : 1,
    values.spiritualAudio === false ? 0 : 1, values.spiritualCards === false ? 0 : 1,
    values.smartSuggestions === false ? 0 : 1,
  )
}

export async function createBackupPayload() {
  if (IS_WEB_SIMULATOR) {
    return JSON.stringify({ kind: 'wird-mobile-backup', version: 1, exportedAt: new Date().toISOString(), data: { simulatorState: webState() } }, null, 2)
  }
  const database = db()
  const data: Record<string, Array<Record<string, unknown>>> = {}
  for (const table of Object.keys(BACKUP_TABLES) as Array<keyof typeof BACKUP_TABLES>) {
    data[table] = await database.getAllAsync<Record<string, unknown>>(`SELECT * FROM ${table}`)
  }
  return JSON.stringify({ kind: 'wird-mobile-backup', version: 1, exportedAt: new Date().toISOString(), data }, null, 2)
}

export async function restoreBackupPayload(payload: string) {
  const parsed = JSON.parse(payload) as { kind?: string; version?: number; data?: Record<string, unknown> }
  if (parsed.kind !== 'wird-mobile-backup' || parsed.version !== 1 || !parsed.data) throw new Error('Invalid Wird backup')
  if (IS_WEB_SIMULATOR) {
    if (parsed.data.simulatorState) webSimulatorState = parsed.data.simulatorState as WebSimulatorState
    return webSnapshot()
  }
  const database = db()
  await transaction(async () => {
    await database.execAsync('PRAGMA foreign_keys = OFF')
    for (const table of ['khatma_parts', 'khatma_members', 'khatma_groups', 'reading_sessions', 'reading_times', 'reading_progress', 'reading_plan', 'settings', 'mobile_state']) {
      await database.runAsync(`DELETE FROM ${table}`)
    }
    for (const table of Object.keys(BACKUP_TABLES) as Array<keyof typeof BACKUP_TABLES>) {
      const rows = parsed.data?.[table]
      if (!Array.isArray(rows)) continue
      const columns = BACKUP_TABLES[table]
      const placeholders = columns.map(() => '?').join(', ')
      for (const row of rows as Array<Record<string, unknown>>) {
        await database.runAsync(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`,
          ...columns.map((column) => row[column] as SQLite.SQLiteBindValue),
        )
      }
    }
    await database.execAsync('PRAGMA foreign_keys = ON')
  })
  await ensureTodaySessions()
  await seedKhatmaSample()
  return loadMobileSnapshot()
}
