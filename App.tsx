import { ComponentProps, ComponentRef, Dispatch, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Appearance,
  Animated,
  Dimensions,
  Easing,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  Share,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { BlurView } from 'expo-blur'
import { SymbolView, type SymbolWeight } from 'expo-symbols'
import type { SFSymbol } from 'sf-symbols-typescript'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Svg, { Circle } from 'react-native-svg'
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite'
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import ReanimatedAnimated, { useAnimatedStyle, interpolate, Extrapolation } from 'react-native-reanimated'
import { BottomSheetModal, BottomSheetModalProvider, BottomSheetView, type BottomSheetBackdropProps, type BottomSheetBackgroundProps } from '@gorhom/bottom-sheet'
import { File, Paths } from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import * as ImagePicker from 'expo-image-picker'
import { useFonts, Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold, Cairo_900Black } from '@expo-google-fonts/cairo'
import { copy, type Language } from './src/locales'
import { withCairoFont } from './src/font'
import { legalDocuments, type LegalDocumentKey } from './src/legal-content'
import { AuthFlow } from './src/AuthFlow'
import { getCurrentProfile, signOut, updateProfile, type WirdProfile } from './src/services/auth-service'
import {
  completeMobileKhatmaPart,
  completeMobileSession,
  createMobileKhatmaGroup,
  createBackupPayload,
  getQuranPage,
  initializeMobileBackend,
  loadAppState,
  joinMobileKhatma,
  loadMobileKhatmaDetail,
  loadMobileSnapshot,
  pauseMobileSession,
  postponeMobileSession,
  restoreBackupPayload,
  saveAppState,
  saveMobilePlan,
  startMobileSession,
  type BackendStatus,
  type MobileKhatmaDetail,
  type MobileKhatmaGroup,
  type MobileSession,
  type MobileSessionStatus,
  type MobileSnapshot,
  type MobileStatistics,
  type MobileTheme,
  type QuranVerse,
} from './src/services/mobile-backend'

type IconName = ComponentProps<typeof Ionicons>['name']
type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void
type TabId = 'home' | 'reader' | 'khatmas' | 'stats' | 'more'
type MoreRoute = 'main' | 'editProfile' | 'sessions' | 'settings' | 'plan' | 'backup' | 'about' | LegalDocumentKey
type SessionStatus = MobileSessionStatus
type SessionFilter = 'today' | 'upcoming' | 'history' | 'all'
type KhatmaFilter = 'active' | 'completed' | 'invites'
type KhatmaSheetMode = 'create' | 'join'

type WirdSession = {
  id: number
  order: number
  nameAr: string
  nameEn: string
  time: string
  duration: number
  page: number
  status: SessionStatus
  enabled: boolean
  scheduledDate?: string
  readingTimeId?: number | null
  postponedUntil?: string | null
  activeSeconds?: number
  startGlobalAyah?: number | null
  endGlobalAyah?: number | null
}

type Palette = {
  background: string
  surface: string
  elevated: string
  primary: string
  primaryDeep: string
  primaryMuted: string
  ink: string
  muted: string
  line: string
  gold: string
  danger: string
  success: string
  tab: string
  shadow: string
}

const light: Palette = {
  background: '#FFFFFF', surface: '#FFFFFF', elevated: '#F7F9F8', primary: '#175C43', primaryDeep: '#104B37',
  primaryMuted: '#E8F2EE', ink: '#171A18', muted: '#737B77', line: '#E8ECEA', gold: '#E4BF57', danger: '#B54747',
  success: '#267B5D', tab: 'rgba(255,255,255,0.78)', shadow: 'rgba(23,92,67,0.14)',
}

const dark: Palette = {
  background: '#111A16', surface: '#18231E', elevated: '#202E28', primary: '#79C4A3', primaryDeep: '#175C43',
  primaryMuted: '#273B32', ink: '#F4F7F5', muted: '#A9B5AF', line: '#31443B', gold: '#E7C968', danger: '#E0837F',
  success: '#79C4A3', tab: 'rgba(24,35,30,0.72)', shadow: 'rgba(0,0,0,0.28)',
}

const WEB_DATABASE_SESSION_ID = Platform.OS === 'web'
  ? `${Date.now()}-${Math.random().toString(36).slice(2)}`
  : ''
const QURAN_DATABASE_NAME = Platform.OS === 'web' ? `quran-${WEB_DATABASE_SESSION_ID}.db` : 'quran.db'

const initialSessions: WirdSession[] = [
  { id: 1, order: 1, nameAr: 'جلسة الورد 1', nameEn: 'Wird session 1', time: '11:35', duration: 5, page: 32, status: 'ended_early', enabled: true },
  { id: 2, order: 2, nameAr: 'جلسة الورد 2', nameEn: 'Wird session 2', time: '13:18', duration: 5, page: 32, status: 'ended_early', enabled: true },
  { id: 3, order: 3, nameAr: 'جلسة الورد 3', nameEn: 'Wird session 3', time: '15:30', duration: 10, page: 32, status: 'scheduled', enabled: true },
]

const initialPlanSessions: WirdSession[] = initialSessions.map((session) => ({ ...session, status: 'scheduled' }))

const weekly = [
  { ar: 'س', en: 'S', nameAr: 'السبت', nameEn: 'Sat', minutes: 1 },
  { ar: 'ح', en: 'S', nameAr: 'الأحد', nameEn: 'Sun', minutes: 2 },
  { ar: 'ن', en: 'M', nameAr: 'الإثنين', nameEn: 'Mon', minutes: 3 },
  { ar: 'ث', en: 'T', nameAr: 'الثلاثاء', nameEn: 'Tue', minutes: 4 },
  { ar: 'ر', en: 'W', nameAr: 'الأربعاء', nameEn: 'Wed', minutes: 3 },
  { ar: 'خ', en: 'T', nameAr: 'الخميس', nameEn: 'Thu', minutes: 4 },
  { ar: 'ج', en: 'F', nameAr: 'الجمعة', nameEn: 'Fri', minutes: 1 },
]

const ACTIVITY_WEEKS = 13
const ACTIVITY_DAYS = ACTIVITY_WEEKS * 7
const activityHistory: number[] = (() => {
  const minutesByDay: number[] = []
  let streak = 0
  for (let i = 0; i < ACTIVITY_DAYS; i += 1) {
    const active = Math.random() < (streak > 0 ? 0.82 : 0.55)
    minutesByDay.push(active ? Math.round(6 + Math.random() * 34) : 0)
    streak = active ? streak + 1 : 0
  }
  return minutesByDay
})()
const activityWeekdayOfRow: number[] = (() => {
  const todayDow = new Date().getDay()
  return Array.from({ length: 7 }, (_, row) => (todayDow - (6 - row) + 70) % 7)
})()
const activityMonthNames: Record<Language, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول', 'أغس', 'سبت', 'أكت', 'نوف', 'ديس'],
}
function activityLevel(minutes: number) {
  if (minutes <= 0) return 0
  if (minutes < 12) return 1
  if (minutes < 22) return 2
  if (minutes < 32) return 3
  return 4
}
function activityDateForIndex(index: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - (ACTIVITY_DAYS - 1 - index))
  return date
}
function activityRowLabel(row: number, language: Language) {
  const dow = activityWeekdayOfRow[row]
  if (dow !== 1 && dow !== 3 && dow !== 5) return ''
  const weeklyIndex = (dow + 1) % 7
  return language === 'ar' ? weekly[weeklyIndex].ar : weekly[weeklyIndex].en
}

const AVERAGE_MINUTES_PER_JUZ = 50
function formatDuration(minutes: number, t: typeof copy.ar | typeof copy.en) {
  if (minutes < 60) return `${minutes}${t.minuteShort}`
  return `${Math.round(minutes / 60)}${t.hourShort}`
}

const quranVerses = [
  { number: 203, text: 'وَٱذْكُرُوا۟ ٱللَّهَ فِىٓ أَيَّامٍ مَّعْدُودَٰتٍ' },
  { number: 204, text: 'وَمِنَ ٱلنَّاسِ مَن يُعْجِبُكَ قَوْلُهُۥ فِى ٱلْحَيَوٰةِ ٱلدُّنْيَا' },
  { number: 205, text: 'وَإِذَا تَوَلَّىٰ سَعَىٰ فِى ٱلْأَرْضِ لِيُفْسِدَ فِيهَا' },
]

const tabItems: Array<{ id: TabId; icon: IconName; activeIcon: IconName; symbol: SFSymbol; activeSymbol: SFSymbol }> = [
  { id: 'home', icon: 'home-outline', activeIcon: 'home', symbol: 'house', activeSymbol: 'house.fill' },
  { id: 'reader', icon: 'book-outline', activeIcon: 'book', symbol: 'book.closed', activeSymbol: 'book.closed.fill' },
  { id: 'khatmas', icon: 'people-outline', activeIcon: 'people', symbol: 'person.2', activeSymbol: 'person.2.fill' },
  { id: 'stats', icon: 'bar-chart-outline', activeIcon: 'bar-chart', symbol: 'chart.bar', activeSymbol: 'chart.bar.fill' },
  { id: 'more', icon: 'ellipsis-horizontal-circle-outline', activeIcon: 'ellipsis-horizontal-circle', symbol: 'ellipsis.circle', activeSymbol: 'ellipsis.circle.fill' },
]

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
const SCREEN_HEIGHT = Dimensions.get('window').height
const STORAGE_KEY = 'wird:mobile-state:v1'
const ONBOARDING_KEY = 'wird:onboarding-complete:v1'

const emptyStatistics: MobileStatistics = {
  completedSessions: 0,
  incompleteSessions: 0,
  totalMinutes: 0,
  readingDays: 0,
  ayahsRead: 0,
  approximatePages: 0,
  weeklyTrend: [],
}

function toWirdSession(session: MobileSession): WirdSession {
  return {
    ...session,
    nameAr: `جلسة الورد ${session.order}`,
    nameEn: session.name || `Wird session ${session.order}`,
  }
}

function localDateKey() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function timeGreeting(t: typeof copy.ar | typeof copy.en) {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return t.greetingMorning
  if (hour >= 12 && hour < 17) return t.greetingAfternoon
  if (hour >= 17 && hour < 21) return t.greetingEvening
  return t.greetingNight
}

export default function App() {
  const [fontsLoaded] = useFonts({ Cairo_400Regular, Cairo_500Medium, Cairo_600SemiBold, Cairo_700Bold, Cairo_800ExtraBold, Cairo_900Black })
  if (!fontsLoaded) return <BootSkeleton darkMode={false} />
  if (Platform.OS === 'web') {
    return <GestureHandlerRootView style={webPreviewStyles.stage}>
      <ScrollView style={webPreviewStyles.stageScroll} contentContainerStyle={webPreviewStyles.stageContent} showsVerticalScrollIndicator={false}>
        <View style={webPreviewStyles.phoneFrame}>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <AppRoot quranDatabase={null as unknown as SQLiteDatabase} />
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  }
  return <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <SQLiteProvider databaseName={QURAN_DATABASE_NAME} assetSource={{ assetId: require('./assets/databases/quran.db') }}>
        <BottomSheetModalProvider>
          <NativeSQLiteRoot />
        </BottomSheetModalProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
}

function NativeSQLiteRoot() {
  const quranDatabase = useSQLiteContext()
  return <AppRoot quranDatabase={quranDatabase} />
}

function AppRoot({ quranDatabase }: { quranDatabase: SQLiteDatabase }) {
  const systemColorScheme = useColorScheme()
  const [language, setLanguage] = useState<Language>('ar')
  const [themeMode, setThemeMode] = useState<MobileTheme>('system')
  const [profile, setProfile] = useState<WirdProfile | null>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [loading, setLoading] = useState(true)
  const darkMode = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark')

  useEffect(() => {
    if (Platform.OS === 'web' || typeof Appearance.setColorScheme !== 'function') return
    Appearance.setColorScheme(themeMode === 'system' ? 'unspecified' : themeMode)
    return () => Appearance.setColorScheme('unspecified')
  }, [themeMode])

  useEffect(() => {
    let cancelled = false
    void Promise.all([initializeMobileBackend(quranDatabase), getCurrentProfile(), AsyncStorage.getItem(ONBOARDING_KEY), AsyncStorage.getItem(STORAGE_KEY)]).then(([status, currentProfile, onboarding, savedState]) => {
      if (cancelled) return
      setBackendStatus(status)
      setProfile(currentProfile)
      setOnboardingComplete(Boolean(onboarding))
      if (savedState) {
        try {
          const saved = JSON.parse(savedState) as Partial<{ themeMode: MobileTheme; darkMode: boolean }>
          if (saved.themeMode && ['system', 'light', 'dark'].includes(saved.themeMode)) setThemeMode(saved.themeMode)
          else if (typeof saved.darkMode === 'boolean') setThemeMode(saved.darkMode ? 'dark' : 'light')
        } catch { /* Ignore an invalid legacy preference and use the system mode. */ }
      }
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [quranDatabase])

  if (loading || !backendStatus) return <BootSkeleton darkMode={darkMode} />
  if (!profile) return <AuthFlow initialMode={onboardingComplete ? 'signIn' : 'onboarding'} language={language} darkMode={darkMode} onLanguage={setLanguage} onAuthenticated={(nextProfile) => { setProfile(nextProfile); setOnboardingComplete(true); void AsyncStorage.setItem(ONBOARDING_KEY, '1') }} />
  return <MainApp language={language} initialProfile={profile} backendStatus={backendStatus} quranDatabase={quranDatabase} themeMode={themeMode} setThemeMode={setThemeMode} darkMode={darkMode} onSignOut={async () => { await signOut(); setProfile(null) }} />
}

const webPreviewStyles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#EEF6F2',
  },
  stageScroll: {
    flex: 1,
    width: '100%',
  },
  stageContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 28,
  },
  phoneFrame: {
    width: 393,
    maxWidth: '100%',
    height: 852,
    overflow: 'hidden',
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    shadowColor: '#0F2E22',
    shadowOpacity: 0.24,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    borderWidth: 1,
    borderColor: 'rgba(23, 92, 67, 0.12)',
  },
})

function BootSkeleton({ darkMode }: { darkMode: boolean }) {
  const base = darkMode ? dark : light
  return <SafeAreaView style={[bootstrapStyles.loading, { backgroundColor: base.background }]}>
    <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
    <View style={[bootstrapStyles.skeletonTop, { backgroundColor: base.elevated }]}>
      <View style={[bootstrapStyles.skeletonAvatar, { backgroundColor: base.primaryMuted }]} />
      <View style={bootstrapStyles.skeletonCopy}>
        <View style={[bootstrapStyles.skeletonLine, { width: '44%', backgroundColor: base.primaryMuted }]} />
        <View style={[bootstrapStyles.skeletonLine, { width: '72%', backgroundColor: base.primaryMuted }]} />
      </View>
    </View>
    <View style={[bootstrapStyles.skeletonHero, { backgroundColor: base.primaryDeep }]}>
      <View style={[bootstrapStyles.skeletonLine, { width: '38%', backgroundColor: 'rgba(255,255,255,0.2)' }]} />
      <View style={[bootstrapStyles.skeletonLine, { width: '76%', backgroundColor: 'rgba(255,255,255,0.26)' }]} />
      <View style={[bootstrapStyles.skeletonButton, { backgroundColor: 'rgba(255,255,255,0.92)' }]} />
    </View>
    <View style={bootstrapStyles.skeletonGrid}>
      {[0, 1, 2].map((item) => <View key={item} style={[bootstrapStyles.skeletonMetric, { backgroundColor: base.elevated }]} />)}
    </View>
  </SafeAreaView>
}

const bootstrapStyles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#FFFFFF' },
  skeletonTop: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 22 },
  skeletonAvatar: { width: 52, height: 52, borderRadius: 18 },
  skeletonCopy: { flex: 1, gap: 10 },
  skeletonLine: { height: 12, borderRadius: 6 },
  skeletonHero: { minHeight: 210, justifyContent: 'space-between', marginTop: 16, padding: 20, borderRadius: 28 },
  skeletonButton: { height: 54, borderRadius: 27 },
  skeletonGrid: { flexDirection: 'row', gap: 10, marginTop: 16 },
  skeletonMetric: { flex: 1, height: 96, borderRadius: 18 },
})

function MainApp({ language: initialLanguage, initialProfile, backendStatus, quranDatabase, themeMode, setThemeMode, darkMode, onSignOut }: { language: Language; initialProfile: WirdProfile; backendStatus: BackendStatus; quranDatabase: SQLiteDatabase; themeMode: MobileTheme; setThemeMode: (theme: MobileTheme) => void; darkMode: boolean; onSignOut: () => Promise<void> }) {
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [profile, setProfile] = useState<WirdProfile>(initialProfile)
  const [tab, setTab] = useState<TabId>('home')
  const [moreRoute, setMoreRoute] = useState<MoreRoute>('main')
  const [sessions, setSessions] = useState(initialSessions)
  const [planSessions, setPlanSessions] = useState(initialPlanSessions)
  const [readerPage, setReaderPage] = useState(32)
  const [selectedVerse, setSelectedVerse] = useState(203)
  const [bookmarks, setBookmarks] = useState<number[]>([205])
  const [progress, setProgress] = useState(3.4)
  const [progressGlobalAyah, setProgressGlobalAyah] = useState(210)
  const [planStartPage, setPlanStartPage] = useState(100)
  const [statistics, setStatistics] = useState<MobileStatistics>(emptyStatistics)
  const [weekData, setWeekData] = useState(weekly)
  const [elapsed, setElapsed] = useState(0)
  const [ritualCount, setRitualCount] = useState<number | null>(null)
  const [notificationVisible, setNotificationVisible] = useState(false)
  const [postponing, setPostponing] = useState<WirdSession | null>(null)
  const [readerSheet, setReaderSheet] = useState<'jump' | 'tafsir' | 'bookmarks' | 'complete' | null>(null)
  const [jumpPage, setJumpPage] = useState('32')
  const [selectedWeekDay, setSelectedWeekDay] = useState(weekly[6])
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('today')
  const [khatmas, setKhatmas] = useState<MobileKhatmaGroup[]>([])
  const [selectedKhatma, setSelectedKhatma] = useState<MobileKhatmaDetail | null>(null)
  const [khatmaMessage, setKhatmaMessage] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<WirdSession | null>(null)
  const [backupMessage, setBackupMessage] = useState<string | null>(null)
  const [fontSize, setFontSize] = useState(28)
  const [mushafZoom, setMushafZoom] = useState(100)
  const [pageMode, setPageMode] = useState<'auto' | 'single' | 'spread'>('auto')
  const [fitMode, setFitMode] = useState<'height' | 'width' | 'custom'>('height')
  const [ayahNumbers, setAyahNumbers] = useState(true)
  const [spiritualCards, setSpiritualCards] = useState(true)
  const [smartSuggestions, setSmartSuggestions] = useState(true)
  const [notifications, setNotifications] = useState(true)
  const [spiritualAudio, setSpiritualAudio] = useState(true)
  const [preSessionAlert, setPreSessionAlert] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const scrollY = useRef(new Animated.Value(0)).current
  const [pageVerses, setPageVerses] = useState<QuranVerse[]>(quranVerses.map((verse, index) => ({ ...verse, globalNumber: 210 + index, surahNumber: 2, surahName: 'البقرة', page: 32, juz: 2 })))

  const t = copy[language]
  const isRTL = language === 'ar'
  const palette = darkMode ? dark : light
  const styles = useMemo(() => makeStyles(palette, isRTL), [palette, isRTL])
  const insets = useSafeAreaInsets()
  const activeSession = sessions.find((session) => session.status === 'in_progress') ?? null
  const nextSession = activeSession ?? sessions.find((session) => session.status === 'paused') ?? sessions.find((session) => session.status === 'scheduled') ?? null

  function applySnapshot(snapshot: MobileSnapshot) {
    setSessions(snapshot.sessions.map(toWirdSession))
    setPlanSessions(snapshot.plan.times.map((session) => ({
      id: session.id ?? session.order,
      readingTimeId: session.id ?? null,
      order: session.order,
      nameAr: `جلسة الورد ${session.order}`,
      nameEn: session.name,
      time: session.time,
      duration: session.duration,
      page: snapshot.progress.currentPage,
      status: 'scheduled',
      enabled: session.enabled,
    })))
    setProgress(snapshot.progress.percent)
    setProgressGlobalAyah(snapshot.progress.currentGlobalAyah)
    setPlanStartPage(snapshot.plan.startPage)
    setStatistics(snapshot.statistics)
    setKhatmas(snapshot.khatmas)
    const mappedWeek = weekly.map((day, index) => ({ ...day, minutes: snapshot.statistics.weeklyTrend[index]?.minutes ?? 0 }))
    setWeekData(mappedWeek)
    setSelectedWeekDay(mappedWeek.at(-1) ?? mappedWeek[0])
    setThemeMode(snapshot.settings.theme)
    setFontSize(snapshot.settings.quranFontSize)
    setMushafZoom(snapshot.settings.mushafZoom)
    setPageMode(snapshot.settings.readerPageMode)
    setFitMode(snapshot.settings.readerFitMode)
    setAyahNumbers(snapshot.settings.showAyahNumbers)
    setNotifications(snapshot.settings.notificationsEnabled)
    setPreSessionAlert(snapshot.settings.preSessionWidgetEnabled)
    setSpiritualAudio(snapshot.settings.spiritualAudioEnabled)
    setSpiritualCards(snapshot.settings.spiritualMessagesEnabled)
    setSmartSuggestions(snapshot.settings.smartSuggestionsEnabled)
    setReaderPage(snapshot.settings.lastOpenedPage || snapshot.progress.currentPage)
    setJumpPage(String(snapshot.progress.currentPage))
  }

  async function refreshSnapshot() {
    setRefreshing(true)
    try { applySnapshot(await loadMobileSnapshot()) } finally { setRefreshing(false) }
  }

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadMobileSnapshot(), loadAppState<Record<string, unknown>>()]).then(async ([snapshot, databaseState]) => {
      const fallback = databaseState ? null : await AsyncStorage.getItem(STORAGE_KEY)
      const source = databaseState ?? (fallback ? JSON.parse(fallback) as Record<string, unknown> : null)
      if (cancelled) return
      applySnapshot(snapshot)
      if (!source) return
      const saved = source as Partial<{
        language: Language; bookmarks: number[]; themeMode: MobileTheme; darkMode: boolean;
      }>
      if (saved.language) setLanguage(saved.language)
      if (saved.bookmarks) setBookmarks(saved.bookmarks)
      if (saved.themeMode && ['system', 'light', 'dark'].includes(saved.themeMode)) setThemeMode(saved.themeMode)
      else if (typeof saved.darkMode === 'boolean') setThemeMode(saved.darkMode ? 'dark' : 'light')
    }).catch(() => undefined).finally(() => { if (!cancelled) setHydrated(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const state = { language, themeMode, readerPage, bookmarks, fontSize, mushafZoom, pageMode, fitMode, ayahNumbers, spiritualCards, smartSuggestions, notifications, spiritualAudio, preSessionAlert }
    void Promise.all([saveAppState(state), AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))])
  }, [ayahNumbers, bookmarks, fitMode, fontSize, hydrated, language, mushafZoom, notifications, pageMode, preSessionAlert, readerPage, smartSuggestions, spiritualAudio, spiritualCards, themeMode])

  useEffect(() => {
    let cancelled = false
    void getQuranPage(quranDatabase, readerPage).then((verses) => { if (!cancelled && verses.length) { setPageVerses(verses); setSelectedVerse(verses[0].number) } })
    return () => { cancelled = true }
  }, [quranDatabase, readerPage])

  useEffect(() => {
    if (!activeSession) return
    const timer = setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [activeSession])

  async function startSession(session: WirdSession) {
    if (session.status === 'scheduled') {
      for (const count of [3, 2, 1]) {
        setRitualCount(count)
        await wait(430)
      }
    }
    setRitualCount(null)
    const snapshot = await startMobileSession(session.id)
    applySnapshot(snapshot)
    const started = snapshot.sessions.find((item) => item.id === session.id)
    setReaderPage(started?.page ?? snapshot.progress.currentPage)
    setElapsed(0)
    setTab('reader')
  }

  async function finishSession() {
    if (activeSession) {
      const globalNumber = pageVerses.find((verse) => verse.number === selectedVerse)?.globalNumber ?? progressGlobalAyah
      applySnapshot(await completeMobileSession(activeSession.id, globalNumber, quranDatabase))
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    }
    setReaderSheet(null)
    setTab('home')
  }

  async function postponeSession(minutes: number) {
    if (!postponing) return
    applySnapshot(await postponeMobileSession(postponing.id, minutes))
    setPostponing(null)
  }

  async function savePlan(nextSessions: WirdSession[]) {
    const planSessions = nextSessions.slice(0, 5).map((session, index) => ({
      id: session.readingTimeId ?? undefined,
      order: index + 1,
      name: session.nameEn,
      time: session.time,
      duration: session.duration,
      enabled: session.enabled,
      repeatDays: [0, 1, 2, 3, 4, 5, 6],
    }))
    applySnapshot(await saveMobilePlan(planSessions))
    setBackupMessage(language === 'ar' ? 'تم حفظ الخطة وإعادة جدولة المواعيد.' : 'Plan saved and sessions rescheduled.')
    setTimeout(() => setBackupMessage(null), 2200)
  }

  async function runBackup(action: 'create' | 'restore') {
    try {
      if (action === 'create') {
        const payload = await createBackupPayload()
        const filename = `wird-backup-${new Date().toISOString().slice(0, 10)}.json`
        const file = new File(Paths.document, filename)
        file.create({ overwrite: true })
        file.write(payload)
        await Share.share({ title: t.backupTitle, message: filename, url: file.uri })
      } else {
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true })
        if (result.canceled || !result.assets[0]) return
        const payload = await new File(result.assets[0].uri).text()
        applySnapshot(await restoreBackupPayload(payload))
      }
      setBackupMessage(t.backupSuccess)
    } catch {
      setBackupMessage(language === 'ar' ? 'تعذر تنفيذ العملية. لم تتغير بياناتك.' : 'The operation could not be completed. Your data was not changed.')
    }
    setTimeout(() => setBackupMessage(null), 2600)
  }

  function showKhatmaMessage(message: string) {
    setKhatmaMessage(message)
    setTimeout(() => setKhatmaMessage(null), 2400)
  }

  async function openKhatma(group: MobileKhatmaGroup) {
    setSelectedKhatma(await loadMobileKhatmaDetail(group.id))
  }

  async function createKhatma(input: { nameAr: string; nameEn: string; daysRemaining: number; ownerName: string }) {
    const detail = await createMobileKhatmaGroup(input)
    setSelectedKhatma(detail)
    setKhatmas((await loadMobileSnapshot()).khatmas)
    showKhatmaMessage(t.khatmaCreated)
  }

  async function joinKhatma(inviteCode: string, displayName: string) {
    try {
      const detail = await joinMobileKhatma(inviteCode, displayName)
      setSelectedKhatma(detail)
      setKhatmas((await loadMobileSnapshot()).khatmas)
      showKhatmaMessage(t.khatmaJoined)
    } catch {
      showKhatmaMessage(t.invalidInvite)
      throw new Error('Invalid invite')
    }
  }

  async function completeKhatmaPart(group: MobileKhatmaDetail) {
    const detail = await completeMobileKhatmaPart(group.id, profile.name)
    setSelectedKhatma(detail)
    setKhatmas((await loadMobileSnapshot()).khatmas)
    showKhatmaMessage(t.khatmaPartCompleted)
    if (detail.completedParts >= detail.totalParts) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    else void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  function changeTab(next: TabId) {
    void Haptics.selectionAsync()
    setTab(next)
    if (next !== 'more') setMoreRoute('main')
    scrollY.setValue(0)
  }

  const headerTitle = tab === 'home' ? profile.name : tab === 'reader' ? t.quran : tab === 'khatmas' ? t.myKhatmas : tab === 'stats' ? t.stats : t.moreTitle
  const showLargeTitle = tab !== 'reader' && !(tab === 'khatmas' && selectedKhatma) && !(tab === 'more' && moreRoute !== 'main')
  const handleScroll = Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.app}>
        <AppHeader
          language={language}
          title={headerTitle}
          kicker={t.appName}
          avatarUri={profile.avatarUri}
          notificationVisible={notificationVisible}
          styles={styles}
          palette={palette}
          scrollY={scrollY}
          showsInlineTitle={!showLargeTitle}
          onToggleLanguage={() => setLanguage((value) => value === 'ar' ? 'en' : 'ar')}
          onToggleNotifications={() => setNotificationVisible((value) => !value)}
        />

        {notificationVisible && <View style={styles.notificationToast}><Ionicons name="notifications" size={17} color={palette.primary} /><Text style={styles.notificationToastText}>{t.notificationMessage}</Text></View>}

        {tab === 'home' && <HomeScreen t={t} language={language} styles={styles} palette={palette} progress={progress} nextSession={nextSession} sessions={sessions} planSessions={planSessions} statistics={statistics} days={weekData} selectedDay={selectedWeekDay} onSelectDay={setSelectedWeekDay} onStart={startSession} onOpenReader={() => changeTab('reader')} refreshing={refreshing} onRefresh={refreshSnapshot} largeTitle={headerTitle} onScroll={handleScroll} />}
        {tab === 'reader' && <ReaderScreen t={t} language={language} styles={styles} palette={palette} page={readerPage} verses={pageVerses} fontSize={fontSize} activeSession={activeSession} elapsed={elapsed} selectedVerse={selectedVerse} bookmarks={bookmarks} ayahNumbers={ayahNumbers} onSelectVerse={setSelectedVerse} onPageChange={setReaderPage} onStart={() => nextSession && startSession(nextSession)} onPause={async () => { if (activeSession) applySnapshot(await pauseMobileSession(activeSession.id)); changeTab('home') }} onOpenSheet={setReaderSheet} onToggleBookmark={() => setBookmarks((current) => current.includes(selectedVerse) ? current.filter((item) => item !== selectedVerse) : [selectedVerse, ...current])} />}
        {tab === 'khatmas' && <KhatmasScreen t={t} language={language} styles={styles} palette={palette} profile={profile} groups={khatmas} selected={selectedKhatma} message={khatmaMessage} onSelect={openKhatma} onBack={() => setSelectedKhatma(null)} onCreate={createKhatma} onJoin={joinKhatma} onCompletePart={completeKhatmaPart} refreshing={refreshing} onRefresh={refreshSnapshot} onScroll={handleScroll} />}
        {tab === 'stats' && <StatsScreen t={t} language={language} styles={styles} palette={palette} progress={progress} statistics={statistics} days={weekData} selectedDay={selectedWeekDay} onSelectDay={setSelectedWeekDay} largeTitle={headerTitle} onScroll={handleScroll} />}
        {tab === 'more' && <MoreScreen route={moreRoute} setRoute={setMoreRoute} t={t} profile={profile} onProfileUpdate={setProfile} backendStatus={backendStatus} onSignOut={onSignOut} language={language} setLanguage={setLanguage} styles={styles} palette={palette} themeMode={themeMode} setThemeMode={setThemeMode} sessions={sessions} setSessions={setSessions} sessionFilter={sessionFilter} setSessionFilter={setSessionFilter} onStartSession={startSession} onPostponeSession={setPostponing} planSessions={planSessions} setPlanSessions={setPlanSessions} editingSession={editingSession} setEditingSession={setEditingSession} currentPage={readerPage} planStartPage={planStartPage} onSavePlan={savePlan} fontSize={fontSize} setFontSize={setFontSize} mushafZoom={mushafZoom} setMushafZoom={setMushafZoom} pageMode={pageMode} setPageMode={setPageMode} fitMode={fitMode} setFitMode={setFitMode} ayahNumbers={ayahNumbers} setAyahNumbers={setAyahNumbers} spiritualCards={spiritualCards} setSpiritualCards={setSpiritualCards} smartSuggestions={smartSuggestions} setSmartSuggestions={setSmartSuggestions} notifications={notifications} setNotifications={setNotifications} spiritualAudio={spiritualAudio} setSpiritualAudio={setSpiritualAudio} preSessionAlert={preSessionAlert} setPreSessionAlert={setPreSessionAlert} backupMessage={backupMessage} onBackup={runBackup} largeTitle={headerTitle} onScroll={handleScroll} days={weekData} statistics={statistics} khatmas={khatmas} />}

        <TabBar active={tab} t={t} styles={styles} palette={palette} bottomInset={insets.bottom} onChange={changeTab} />

        {ritualCount !== null && <View style={styles.ritualOverlay}><View style={styles.ritualMark}><Text style={styles.ritualMarkText}>{t.appName.slice(0, 1)}</Text></View><Text style={styles.ritualText}>{language === 'ar' ? 'استعن بالله وابدأ' : 'Begin with trust in Allah'}</Text><Text style={styles.ritualCount}>{ritualCount}</Text></View>}

        <Sheet visible={Boolean(postponing)} title={t.postponeTitle} styles={styles} palette={palette} onClose={() => setPostponing(null)}>
          <SheetAction icon="time-outline" label={t.in30Minutes} styles={styles} palette={palette} onPress={() => { void postponeSession(30) }} />
          <SheetAction icon="hourglass-outline" label={t.inOneHour} styles={styles} palette={palette} onPress={() => { void postponeSession(60) }} />
          <SheetAction icon="moon-outline" label={t.tonight} styles={styles} palette={palette} onPress={() => { void postponeSession(180) }} />
        </Sheet>

        <ReaderSheets sheet={readerSheet} setSheet={setReaderSheet} t={t} styles={styles} palette={palette} page={readerPage} setPage={setReaderPage} jumpPage={jumpPage} setJumpPage={setJumpPage} selectedVerse={selectedVerse} bookmarks={bookmarks} setBookmarks={setBookmarks} onFinished={() => { setReaderSheet(null); changeTab('home') }} onFinishSession={finishSession} />
      </View>
    </SafeAreaView>
  )
}

function AppHeader({ language, title, kicker, avatarUri, notificationVisible, styles, palette, scrollY, showsInlineTitle, onToggleLanguage, onToggleNotifications }: { language: Language; title: string; kicker: string; avatarUri?: string; notificationVisible: boolean; styles: Styles; palette: Palette; scrollY: Animated.Value; showsInlineTitle: boolean; onToggleLanguage: () => void; onToggleNotifications: () => void }) {
  const inlineOpacity = showsInlineTitle ? 1 : scrollY.interpolate({ inputRange: [8, 36], outputRange: [0, 1], extrapolate: 'clamp' })
  const hairlineOpacity = showsInlineTitle ? 0 : scrollY.interpolate({ inputRange: [0, 20], outputRange: [0, 1], extrapolate: 'clamp' })
  return <View style={styles.header}>
    <View style={styles.avatar}>{avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{language === 'ar' ? 'ع' : 'A'}</Text>}</View>
    <View style={styles.headerCopy}><Text style={styles.headerKicker}>{kicker}</Text><Animated.Text style={[styles.headerTitle, { opacity: inlineOpacity }]} numberOfLines={1}>{title}</Animated.Text></View>
    <Pressable accessibilityLabel="Language" hitSlop={hitSlop} style={({ pressed }) => [styles.headerButton, pressed && styles.pressablePressed]} onPress={onToggleLanguage}><NavIcon symbol="globe" ionicon="language-outline" size={20} color={palette.primary} /></Pressable>
    <Pressable accessibilityLabel="Notifications" hitSlop={hitSlop} style={({ pressed }) => [styles.headerButton, pressed && styles.pressablePressed]} onPress={onToggleNotifications}><NavIcon symbol={notificationVisible ? 'bell.fill' : 'bell'} ionicon={notificationVisible ? 'notifications' : 'notifications-outline'} size={20} color={palette.primary} /><View style={styles.notificationDot} /></Pressable>
    <Animated.View pointerEvents="none" style={[styles.headerHairline, { opacity: hairlineOpacity }]} />
  </View>
}

function HomeScreen({ t, language, styles, palette, progress, nextSession, sessions, planSessions, statistics, days, selectedDay, onSelectDay, onStart, onOpenReader, refreshing, onRefresh, largeTitle, onScroll }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; progress: number; nextSession: WirdSession | null; sessions: WirdSession[]; planSessions: WirdSession[]; statistics: MobileStatistics; days: typeof weekly; selectedDay: typeof weekly[number]; onSelectDay: (day: typeof weekly[number]) => void; onStart: (session: WirdSession) => void; onOpenReader: () => void; refreshing: boolean; onRefresh: () => void; largeTitle: string; onScroll: ScrollHandler }) {
  const todayMinutes = days.at(-1)?.minutes ?? 0
  const dailyTarget = planSessions.filter((session) => session.enabled).reduce((sum, session) => sum + session.duration, 0) || 20
  const targetProgress = Math.round(Math.min(100, todayMinutes / dailyTarget * 100))
  const surahName = language === 'ar' ? 'سورة البقرة' : 'Surah Al-Baqarah'
  return <Animated.ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} />}>
    <Text style={styles.smallMuted}>{timeGreeting(t)}</Text>
    <Text style={styles.largeTitle}>{largeTitle}</Text>
    <View style={styles.nextStrip}><View><Text style={styles.smallMuted}>{nextSession?.status === 'in_progress' ? t.currentSession : t.nextSession}</Text><Text style={styles.nextStripTitle}>{nextSession ? sessionName(nextSession, language) : t.morningWird}</Text></View><View style={styles.timeChip}><Ionicons name="time-outline" size={14} color={palette.primary} /><Text style={styles.timeChipText}>{nextSession?.time ?? '15:30'}</Text></View></View>

    <View style={styles.heroCard}>
      <View style={styles.heroTop}><View><Text style={styles.heroKicker}>{t.journey}</Text><Text style={styles.heroTitle}>{t.homeTitle}</Text></View><View style={styles.partChip}><Text style={styles.partChipText}>2/30 {t.part}</Text></View></View>
      <View style={styles.heroProgress}><CircularProgress value={progress} size={112} strokeWidth={9} trackColor="rgba(255,255,255,0.18)" progressColor="#FFFFFF" textColor="#FFFFFF" label={t.complete} labelColor="rgba(255,255,255,0.68)" /><View style={styles.heroPosition}><Text style={styles.heroSurah}>{surahName}</Text><Text style={styles.heroMeta}>{t.page} 32 · {t.part} 2</Text><View style={styles.heroMetaRow}><Ionicons name="timer-outline" size={14} color="#FFFFFF" /><Text style={styles.heroMeta}>{nextSession?.duration ?? 10} {t.minutes}</Text></View></View></View>
      <View style={styles.heroActions}>{nextSession && <Pressable style={styles.heroPrimary} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onStart(nextSession) }}><NavIcon symbol="play.fill" ionicon="play" size={17} color={palette.primaryDeep} /><Text style={styles.heroPrimaryText}>{['paused', 'in_progress'].includes(nextSession.status) ? t.resume : t.startNow}</Text></Pressable>}<Pressable accessibilityLabel={t.openMushaf} style={styles.heroGhost} onPress={onOpenReader}><NavIcon symbol="book.closed" ionicon="book-outline" size={20} color="#FFFFFF" /></Pressable></View>
    </View>

    <SectionHeader title={t.weeklyRhythm} action={`${days.reduce((sum, day) => sum + day.minutes, 0)} ${t.minutes}`} styles={styles} />
    <View style={styles.chartPanel}><View style={styles.chartSelected}><Text style={styles.chartSelectedText}>{language === 'ar' ? selectedDay.nameAr : selectedDay.nameEn} · {selectedDay.minutes} {t.minutes}</Text></View><WeeklyChart days={days} language={language} selectedDay={selectedDay} onSelectDay={onSelectDay} styles={styles} palette={palette} /></View>

    <View style={styles.metricRow}><Metric icon="flame-outline" value={String(statistics.readingDays)} label={t.readingDays} styles={styles} palette={palette} /><Metric icon="map-outline" value={String(statistics.approximatePages)} label={t.pagesRead} styles={styles} palette={palette} /><Metric icon="checkmark-circle-outline" value={String(statistics.completedSessions)} label={t.completedSessions} styles={styles} palette={palette} /></View>

    <View style={styles.goalRow}><View style={styles.goalCopy}><Text style={styles.goalTitle}>{t.dailyGoal}</Text><Text style={styles.cardMeta}>{todayMinutes} / {dailyTarget} {t.minutes}</Text><Text style={styles.smallMuted}>{Math.max(0, dailyTarget - todayMinutes)} {t.remainingGoal}</Text></View><CircularProgress value={targetProgress} size={88} strokeWidth={8} trackColor={palette.primaryMuted} progressColor={palette.primary} textColor={palette.ink} label={t.complete} labelColor={palette.muted} /></View>

    <View style={styles.smartCard}><View style={styles.smartIcon}><Ionicons name="sparkles-outline" size={20} color={palette.primary} /></View><View style={styles.smartCopy}><Text style={styles.cardTitle}>{t.smartSummary}</Text><Text style={styles.cardMeta}>{t.smartText}</Text><View style={styles.inlineActions}><SmallButton label={t.apply} primary styles={styles} onPress={() => undefined} /><SmallButton label={t.snooze} styles={styles} onPress={() => undefined} /><Pressable><Text style={styles.dismissText}>{t.dismiss}</Text></Pressable></View></View></View>

    <View style={styles.spiritualCard}><Ionicons name="leaf-outline" size={21} color={palette.gold} /><View style={styles.spiritualCopy}><Text style={styles.spiritualTitle}>{t.spiritualTitle}</Text><Text style={styles.spiritualText}>{t.spiritualText}</Text></View></View>
  </Animated.ScrollView>
}

function ReaderScreen({ t, language, styles, palette, page, verses, fontSize, activeSession, elapsed, selectedVerse, bookmarks, ayahNumbers, onSelectVerse, onPageChange, onStart, onPause, onOpenSheet, onToggleBookmark }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; page: number; verses: QuranVerse[]; fontSize: number; activeSession: WirdSession | null; elapsed: number; selectedVerse: number; bookmarks: number[]; ayahNumbers: boolean; onSelectVerse: (verse: number) => void; onPageChange: (page: number) => void; onStart: () => void; onPause: () => void; onOpenSheet: (sheet: 'jump' | 'tafsir' | 'bookmarks' | 'complete') => void; onToggleBookmark: () => void }) {
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const surahName = language === 'ar' ? `سورة ${verses[0]?.surahName ?? 'البقرة'}` : 'Surah Al-Baqarah'
  const juz = verses[0]?.juz ?? 2
  return <View style={styles.readerScreen}>
    {activeSession ? <View style={styles.focusBar}><View><Text style={styles.focusLabel}>{t.readingSession}</Text><Text style={styles.focusTitle}>{t.page} {page} · {clock}</Text></View><View style={styles.focusActions}><Pressable accessibilityLabel={t.pauseAndLeave} style={styles.focusIcon} onPress={onPause}><Ionicons name="pause" size={18} color="#FFFFFF" /></Pressable><Pressable style={styles.focusComplete} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onOpenSheet('complete') }}><Ionicons name="checkmark" size={17} color={palette.primary} /><Text style={styles.focusCompleteText}>{t.finishSession}</Text></Pressable></View></View> : <View style={styles.readerStatus}><View><Text style={styles.smallMuted}>{t.freeReading}</Text><Text style={styles.cardTitle}>{t.savedAt} {t.page} {page}</Text></View><Pressable style={styles.compactPrimary} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onStart() }}><Ionicons name="play" size={16} color="#FFFFFF" /><Text style={styles.compactPrimaryText}>{t.start}</Text></Pressable></View>}

    <View style={styles.readerToolbar}><ToolbarButton icon="bookmarks-outline" label={t.bookmarks} count={bookmarks.length} styles={styles} palette={palette} onPress={() => onOpenSheet('bookmarks')} /><ToolbarButton icon="book-outline" label={t.tafsir} styles={styles} palette={palette} onPress={() => onOpenSheet('tafsir')} /><ToolbarButton icon="navigate-outline" label={t.quickJump} styles={styles} palette={palette} onPress={() => onOpenSheet('jump')} /></View>

    <View style={styles.mushafPage}>
      <View style={styles.mushafHeader}><Text style={styles.mushafMeta}>{t.part} {juz}</Text><Text style={styles.mushafTitle}>{surahName}</Text><Text style={styles.mushafMeta}>{t.page} {page}</Text></View>
      <ScrollView contentContainerStyle={styles.verses} showsVerticalScrollIndicator={false}>
        {verses.map((verse) => {
          const selected = verse.number === selectedVerse
          const marked = bookmarks.includes(verse.number)
          return <Pressable key={verse.number} style={[styles.verseRow, selected && styles.verseSelected]} onPress={() => onSelectVerse(verse.number)}><Text style={[styles.quranText, { fontSize: Math.max(22, fontSize) }]}>{verse.text}</Text>{ayahNumbers && <View style={styles.verseMeta}><Text style={styles.verseNumber}>{verse.number}</Text>{marked && <Ionicons name="bookmark" size={13} color={palette.gold} />}</View>}</Pressable>
        })}
      </ScrollView>
      {selectedVerse && <View style={styles.verseActions}><Pressable style={styles.verseAction} onPress={onToggleBookmark}><Ionicons name={bookmarks.includes(selectedVerse) ? 'bookmark' : 'bookmark-outline'} size={17} color={palette.primary} /><Text style={styles.verseActionText}>{bookmarks.includes(selectedVerse) ? t.removeBookmark : t.addBookmark}</Text></Pressable>{activeSession && <Pressable style={styles.verseActionPrimary} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onOpenSheet('complete') }}><Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" /><Text style={styles.verseActionPrimaryText}>{t.finishHere}</Text></Pressable>}</View>}
    </View>

    <View style={styles.pageNavigation}><Pressable accessibilityLabel={t.previousPage} style={styles.pageButton} onPress={() => onPageChange(Math.max(1, page - 1))}><Ionicons name="chevron-forward" size={22} color={palette.primary} /></Pressable><Pressable style={styles.pageCenter} onPress={() => onOpenSheet('jump')}><Text style={styles.pageCenterLabel}>{t.page}</Text><Text style={styles.pageCenterValue}>{page} / 604</Text></Pressable><Pressable accessibilityLabel={t.nextPage} style={styles.pageButton} onPress={() => onPageChange(Math.min(604, page + 1))}><Ionicons name="chevron-back" size={22} color={palette.primary} /></Pressable></View>
  </View>
}

function KhatmasScreen({ t, language, styles, palette, profile, groups, selected, message, onSelect, onBack, onCreate, onJoin, onCompletePart, refreshing, onRefresh, onScroll }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; profile: WirdProfile; groups: MobileKhatmaGroup[]; selected: MobileKhatmaDetail | null; message: string | null; onSelect: (group: MobileKhatmaGroup) => Promise<void>; onBack: () => void; onCreate: (input: { nameAr: string; nameEn: string; daysRemaining: number; ownerName: string }) => Promise<void>; onJoin: (inviteCode: string, displayName: string) => Promise<void>; onCompletePart: (group: MobileKhatmaDetail) => Promise<void>; refreshing: boolean; onRefresh: () => void; onScroll: ScrollHandler }) {
  const [filter, setFilter] = useState<KhatmaFilter>('active')
  const [search, setSearch] = useState('')
  const [sheetMode, setSheetMode] = useState<KhatmaSheetMode | null>(null)
  const filtered = groups.filter((group) => {
    const name = language === 'ar' ? group.nameAr : group.nameEn
    return name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) && (filter === 'invites' ? false : group.status === filter)
  })

  if (selected) {
    const percent = Math.round(selected.completedParts / selected.totalParts * 100)
    const name = language === 'ar' ? selected.nameAr : selected.nameEn
    const schedule = language === 'ar' ? selected.scheduleAr : selected.scheduleEn
    return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.khatmaDetailHeader}><Pressable accessibilityLabel={t.back} style={styles.headerButton} onPress={onBack}><Ionicons name={language === 'ar' ? 'chevron-forward' : 'chevron-back'} size={20} color={palette.primary} /></Pressable><View style={styles.pageIntroCopy}><Text style={styles.pageIntroTitle}>{name}</Text><Text style={styles.pageIntroText}>{t.groupKhatma} · {selected.memberCount} {t.members}</Text></View><Pressable accessibilityLabel={t.shareInvite} style={styles.headerButton} onPress={() => void Share.share({ title: name, message: `${name}\n${t.inviteCode}: ${selected.inviteCode}` })}><Ionicons name="share-outline" size={20} color={palette.primary} /></Pressable></View>
      <View style={styles.nextStrip}><View><Text style={styles.smallMuted}>{t.nextSession}</Text><Text style={styles.nextStripTitle}>{t.fajrWird}</Text></View><View style={styles.timeChip}><Ionicons name="time-outline" size={16} color={palette.primary} /><Text style={styles.timeChipText}>05:15</Text></View></View>
      <View style={styles.khatmaHero}>
        <View style={styles.heroTop}><View><Text style={styles.heroKicker}>{t.groupKhatma}</Text><Text style={styles.heroTitle}>{name}</Text></View><View style={styles.partChip}><Text style={styles.partChipText}>{selected.completedParts}/30 {t.part}</Text></View></View>
        <View style={styles.khatmaSchedule}><Ionicons name="calendar-outline" size={15} color="#FFFFFF" /><Text style={styles.khatmaScheduleText}>{schedule}</Text></View>
        <View style={styles.heroProgress}><CircularProgress value={percent} size={118} strokeWidth={10} trackColor="rgba(255,255,255,0.18)" progressColor="#FFFFFF" textColor="#FFFFFF" label={t.complete} labelColor="rgba(255,255,255,0.66)" /><View style={styles.heroPosition}><Text style={styles.heroSurah}>{t.surahAlFurqan}</Text><Text style={styles.heroMeta}>{t.page} 362 · {t.part} 19</Text></View></View>
        <View style={styles.heroActions}><Pressable disabled={selected.completedParts >= 30} style={[styles.heroPrimary, selected.completedParts >= 30 && { opacity: 0.72 }]} onPress={() => void onCompletePart(selected)}><Ionicons name="checkmark-circle-outline" size={19} color={palette.primaryDeep} /><Text style={styles.heroPrimaryText}>{selected.completedParts >= 30 ? t.completedKhatmas : t.completeNextJuz}</Text></Pressable><Pressable accessibilityLabel={t.openMushaf} style={styles.heroGhost}><Ionicons name="book-outline" size={21} color="#FFFFFF" /></Pressable></View>
        <Pressable style={styles.khatmaInvite} onPress={() => void Share.share({ title: name, message: `${name}\n${t.inviteCode}: ${selected.inviteCode}` })}><Ionicons name="person-add-outline" size={15} color="rgba(255,255,255,0.76)" /><Text style={styles.khatmaInviteText}>{t.inviteCode}: {selected.inviteCode}</Text></Pressable>
      </View>
      <SectionHeader title={t.todayGroupSessions} action={t.all} styles={styles} />
      <KhatmaSessionRow icon="sunny-outline" title={t.fajrWird} time="05:15" duration={`20 ${t.minutes}`} styles={styles} palette={palette} />
      <KhatmaSessionRow icon="partly-sunny-outline" title={t.dhuhrWird} time="13:20" duration={`15 ${t.minutes}`} styles={styles} palette={palette} />
      <SectionHeader title={t.groupProgress} action={`${selected.memberCount} ${t.members}`} styles={styles} />
      <View style={styles.memberStack}>{selected.members.slice(0, 6).map((member) => <View key={member.id} style={styles.memberRow}><View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{member.avatarInitial}</Text></View><View style={styles.memberCopy}><Text style={styles.cardTitle}>{member.displayName}</Text><Text style={styles.cardMeta}>{member.role === 'owner' ? (language === 'ar' ? 'منظّم المجموعة' : 'Group organizer') : `${member.completedParts} ${t.part}`}</Text></View>{member.role === 'owner' && <Ionicons name="key-outline" size={17} color={palette.gold} />}</View>)}</View>
      {message && <View style={styles.successBanner}><Ionicons name="checkmark-circle" size={19} color={palette.success} /><Text style={styles.successText}>{message}</Text></View>}
    </ScrollView>
  }

  return <>
    <Animated.ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.primary} colors={[palette.primary]} />}>
      <View style={styles.khatmaListHeader}><View style={styles.pageIntroCopy}><Text style={styles.khatmaListKicker}>{t.khatmasSubtitle}</Text><Text style={styles.khatmaListTitle}>{t.myKhatmas}</Text></View><Pressable accessibilityLabel={t.createKhatma} style={styles.khatmaAdd} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheetMode('create') }}><Ionicons name="add" size={28} color="#FFFFFF" /></Pressable></View>
      {groups.length > 0 && <View style={styles.circlesSection}>
        <Text style={styles.circlesTitle}>{t.circlesTitle}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.circlesScroll}>
          {groups.map((group) => <Pressable key={group.id} style={styles.circleCard} onPress={() => void onSelect(group)}>
            <Ionicons name="people-circle" size={72} color="#FFFFFF" style={styles.circleWatermark} />
            <Text style={styles.circleName} numberOfLines={1}>{language === 'ar' ? group.nameAr : group.nameEn}</Text>
            <Text style={styles.circleMeta}>{group.memberCount} {t.members}</Text>
            <Text style={styles.circleTime}>{t.totalTime}: {formatDuration(group.completedParts * AVERAGE_MINUTES_PER_JUZ, t)}</Text>
          </Pressable>)}
          <Pressable style={styles.circleAddCard} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheetMode('create') }}>
            <Ionicons name="add-circle-outline" size={26} color={palette.muted} />
            <Text style={styles.circleAddText}>{t.newCircle}</Text>
          </Pressable>
        </ScrollView>
      </View>}
      <View style={styles.searchField}><Ionicons name="search-outline" size={19} color={palette.muted} /><TextInput value={search} onChangeText={setSearch} placeholder={t.searchKhatmas} placeholderTextColor={palette.muted} style={styles.searchInput} /></View>
      <Segmented value={filter} options={[["active", `${t.activeKhatmas} (${groups.filter((group) => group.status === 'active').length})`], ["completed", t.completedKhatmas], ["invites", t.invitations]]} styles={styles} onChange={setFilter} />
      {filtered.map((group) => {
        const percent = Math.round(group.completedParts / group.totalParts * 100)
        return <Pressable key={group.id} style={styles.khatmaCard} onPress={() => void onSelect(group)}><View style={styles.khatmaCardTop}><View style={styles.daysChip}><Ionicons name="time-outline" size={14} color={palette.primary} /><Text style={styles.daysChipText}>{group.daysRemaining} {t.daysRemaining}</Text></View><View style={styles.khatmaCardCopy}><Text style={styles.khatmaCardTitle}>{language === 'ar' ? group.nameAr : group.nameEn}</Text><Text style={styles.cardMeta}>{group.memberCount} {t.members}</Text></View></View><View style={styles.khatmaProgressRow}><Text style={styles.khatmaParts}>{group.completedParts}/30 {t.part}</Text><View style={styles.khatmaTrack}><View style={[styles.khatmaFill, { width: `${percent}%` }]} /></View><Text style={styles.khatmaPercent}>{percent}%</Text></View></Pressable>
      })}
      {!filtered.length && <View style={styles.khatmaEmpty}><Ionicons name={filter === 'invites' ? 'mail-open-outline' : 'people-outline'} size={29} color={palette.primary} /><Text style={styles.emptyText}>{t.noKhatmas}</Text>{filter === 'invites' && <Pressable style={styles.modalPrimary} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setSheetMode('join') }}><Text style={styles.modalPrimaryText}>{t.joinKhatma}</Text></Pressable>}</View>}
      {message && <View style={styles.successBanner}><Ionicons name="checkmark-circle" size={19} color={palette.success} /><Text style={styles.successText}>{message}</Text></View>}
    </Animated.ScrollView>
    <KhatmaFormSheet mode={sheetMode} setMode={setSheetMode} t={t} profile={profile} styles={styles} palette={palette} onCreate={onCreate} onJoin={onJoin} />
  </>
}

function KhatmaFormSheet({ mode, setMode, t, profile, styles, palette, onCreate, onJoin }: { mode: KhatmaSheetMode | null; setMode: (mode: KhatmaSheetMode | null) => void; t: typeof copy.ar | typeof copy.en; profile: WirdProfile; styles: Styles; palette: Palette; onCreate: (input: { nameAr: string; nameEn: string; daysRemaining: number; ownerName: string }) => Promise<void>; onJoin: (inviteCode: string, displayName: string) => Promise<void> }) {
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [days, setDays] = useState('30')
  const [invite, setInvite] = useState('')
  const [owner, setOwner] = useState(profile.name)
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (!mode || busy || !owner.trim()) return
    if (mode === 'create' && (!nameAr.trim() || !nameEn.trim())) return
    if (mode === 'join' && !invite.trim()) return
    setBusy(true)
    try {
      if (mode === 'create') await onCreate({ nameAr, nameEn, daysRemaining: Number(days) || 30, ownerName: owner })
      else await onJoin(invite, owner)
      setMode(null); setNameAr(''); setNameEn(''); setInvite('')
    } catch { /* The localized error banner is owned by the parent screen. */ }
    finally { setBusy(false) }
  }
  return <Sheet visible={Boolean(mode)} title={mode === 'join' ? t.joinKhatma : t.createKhatma} subtitle={t.khatmasSubtitle} styles={styles} palette={palette} onClose={() => setMode(null)}><Segmented value={mode ?? 'create'} options={[["create", t.createKhatma], ["join", t.joinKhatma]]} styles={styles} onChange={setMode} /><View style={styles.formFields}>{mode !== 'join' && <><Text style={styles.fieldLabel}>{t.groupNameArabic}</Text><TextInput value={nameAr} onChangeText={setNameAr} placeholder="أصدقاء الخير" placeholderTextColor={palette.muted} style={styles.textInput} textAlign="right" /><Text style={styles.fieldLabel}>{t.groupNameEnglish}</Text><TextInput value={nameEn} onChangeText={setNameEn} placeholder="Friends of Good" placeholderTextColor={palette.muted} style={styles.textInput} /><Text style={styles.fieldLabel}>{t.daysToComplete}</Text><TextInput value={days} onChangeText={setDays} keyboardType="number-pad" placeholder="30" placeholderTextColor={palette.muted} style={styles.textInput} /></>}{mode === 'join' && <><Text style={styles.fieldLabel}>{t.inviteCode}</Text><TextInput value={invite} onChangeText={(value) => setInvite(value.toUpperCase())} autoCapitalize="characters" placeholder="KHAIR20" placeholderTextColor={palette.muted} style={styles.textInput} /></>}<Text style={styles.fieldLabel}>{t.ownerName}</Text><TextInput value={owner} onChangeText={setOwner} placeholder={profile.name} placeholderTextColor={palette.muted} style={styles.textInput} /><Pressable disabled={busy} style={[styles.modalPrimary, { marginTop: 13, opacity: busy ? 0.65 : 1 }]} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); void submit() }}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalPrimaryText}>{mode === 'join' ? t.joinKhatma : t.createKhatma}</Text>}</Pressable></View></Sheet>
}

function KhatmaSessionRow({ icon, title, time, duration, styles, palette }: { icon: IconName; title: string; time: string; duration: string; styles: Styles; palette: Palette }) {
  return <View style={styles.khatmaSessionRow}><View style={styles.khatmaSessionIcon}><Ionicons name={icon} size={20} color={palette.primary} /></View><View style={styles.khatmaSessionCopy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardMeta}>{time} · {duration}</Text></View><Ionicons name="chevron-forward" size={17} color={palette.muted} /></View>
}

function SessionsScreen({ t, language, styles, palette, sessions, filter, onFilter, onStart, onPostpone, onManage, onBack }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; sessions: WirdSession[]; filter: SessionFilter; onFilter: (filter: SessionFilter) => void; onStart: (session: WirdSession) => void; onPostpone: (session: WirdSession) => void; onManage: () => void; onBack?: () => void }) {
  const today = localDateKey()
  const todaySessions = sessions.filter((session) => !session.scheduledDate || session.scheduledDate === today)
  const visible = sessions.filter((session) => filter === 'all' || filter === 'today' && (!session.scheduledDate || session.scheduledDate === today) || filter === 'upcoming' && ['scheduled', 'paused', 'in_progress'].includes(session.status) || filter === 'history' && ['completed', 'ended_early', 'skipped'].includes(session.status))
  const completed = todaySessions.filter((session) => session.status === 'completed').length
  const remaining = todaySessions.filter((session) => ['scheduled', 'paused', 'in_progress'].includes(session.status)).length
  const readingMinutes = Math.floor(todaySessions.reduce((sum, session) => sum + (session.activeSeconds ?? 0), 0) / 60)
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.pageIntro}>{onBack ? <Pressable accessibilityLabel={t.back} style={styles.headerButton} onPress={onBack}><Ionicons name={language === 'ar' ? 'chevron-forward' : 'chevron-back'} size={20} color={palette.primary} /></Pressable> : <View style={styles.pageIntroIcon}><Ionicons name="calendar-outline" size={22} color={palette.primary} /></View>}<View style={styles.pageIntroCopy}><Text style={styles.pageIntroTitle}>{t.sessionsTitle}</Text><Text style={styles.pageIntroText}>{t.sessionsSubtitle}</Text></View><Pressable accessibilityLabel={t.managePlan} style={styles.headerButton} onPress={onManage}><Ionicons name="options-outline" size={20} color={palette.primary} /></Pressable></View>
    <View style={styles.summaryGrid}><SummaryItem label={t.todaySessions} value={String(todaySessions.length)} styles={styles} /><SummaryItem label={t.completed} value={String(completed)} styles={styles} /><SummaryItem label={t.remaining} value={String(remaining)} styles={styles} /><SummaryItem label={t.readingTime} value={`${readingMinutes} ${t.minutes}`} styles={styles} /></View>
    <Segmented value={filter} options={[['today', t.today], ['upcoming', t.upcoming], ['history', t.history], ['all', t.all]]} styles={styles} onChange={onFilter} />
    {visible.map((session) => <View style={styles.sessionCard} key={session.id}><View style={styles.sessionTime}><Text style={styles.sessionTimeValue}>{session.time}</Text><Text style={styles.sessionTimeLabel}>{t.today}</Text></View><View style={styles.sessionBody}><View style={styles.sessionTitleRow}><Text style={styles.sessionTitle}>{sessionName(session, language)}</Text><StatusPill status={session.status} t={t} styles={styles} /></View><Text style={styles.cardMeta}>{session.duration} {t.minutes} · {t.page} {session.page}</Text><View style={styles.inlineActions}>{['scheduled', 'paused', 'in_progress'].includes(session.status) && <SmallButton label={session.status === 'scheduled' ? t.start : t.resume} primary styles={styles} onPress={() => onStart(session)} />}{session.status === 'scheduled' && <SmallButton label={t.postpone} styles={styles} onPress={() => onPostpone(session)} />}</View></View></View>)}
  </ScrollView>
}

function StatsScreen({ t, language, styles, palette, progress, statistics, days, selectedDay, onSelectDay, largeTitle, onScroll }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; progress: number; statistics: MobileStatistics; days: typeof weekly; selectedDay: typeof weekly[number]; onSelectDay: (day: typeof weekly[number]) => void; largeTitle: string; onScroll: ScrollHandler }) {
  const totalSessions = statistics.completedSessions + statistics.incompleteSessions
  const completionRate = totalSessions ? Math.round(statistics.completedSessions / totalSessions * 100) : 0
  const today = days.at(-1)?.minutes ?? 0
  const yesterday = days.at(-2)?.minutes ?? 0
  const comparison = yesterday ? Math.round((today - yesterday) / yesterday * 100) : today ? 100 : 0
  return <Animated.ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll}>
    <Text style={styles.largeTitle}>{largeTitle}</Text>
    <View style={styles.statsHero}><View style={styles.statsHeroCopy}><Text style={styles.statsKicker}>{t.statsTitle}</Text><Text style={styles.statsTitle}>{t.statsSubtitle}</Text></View><CircularProgress value={progress} size={98} strokeWidth={8} trackColor="rgba(255,255,255,0.18)" progressColor="#FFFFFF" textColor="#FFFFFF" label={t.khatmaProgress} labelColor="rgba(255,255,255,0.66)" /></View>
    <View style={styles.statsMetrics}><Metric icon="checkmark-circle-outline" value={String(statistics.completedSessions)} label={t.completedSessions} styles={styles} palette={palette} /><Metric icon="time-outline" value={String(statistics.totalMinutes)} label={t.totalReadingTime} styles={styles} palette={palette} /><Metric icon="book-outline" value={String(statistics.approximatePages)} label={t.pagesRead} styles={styles} palette={palette} /><Metric icon="calendar-outline" value={String(statistics.readingDays)} label={t.readingDays} styles={styles} palette={palette} /></View>
    <SectionHeader title={t.weeklyActivity} action={`${comparison >= 0 ? '+' : ''}${comparison}% ${t.comparedYesterday}`} styles={styles} />
    <View style={styles.chartPanel}><View style={styles.chartSelected}><Text style={styles.chartSelectedText}>{language === 'ar' ? selectedDay.nameAr : selectedDay.nameEn} · {selectedDay.minutes} {t.minutes}</Text></View><WeeklyChart days={days} language={language} selectedDay={selectedDay} onSelectDay={onSelectDay} styles={styles} palette={palette} /><Text style={styles.weekTotal}>{t.weekTotal}: {days.reduce((sum, day) => sum + day.minutes, 0)} {t.minutes}</Text></View>
    <ActivityHeatmap t={t} language={language} styles={styles} palette={palette} />
    <View style={styles.breakdownCard}><View><Text style={styles.cardTitle}>{t.sessionDetails}</Text><View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: palette.primary }]} /><Text style={styles.cardMeta}>{t.completed} {statistics.completedSessions}</Text></View><View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: palette.line }]} /><Text style={styles.cardMeta}>{t.incomplete} {statistics.incompleteSessions}</Text></View></View><CircularProgress value={completionRate} size={92} strokeWidth={9} trackColor={palette.line} progressColor={palette.primary} textColor={palette.ink} label={t.complete} labelColor={palette.muted} /></View>
    <InfoRow icon="location-outline" title={t.lastPosition} detail={`${language === 'ar' ? 'سورة البقرة' : 'Surah Al-Baqarah'} · ${t.verse} 203 · ${t.page} 32`} styles={styles} palette={palette} />
    <InfoRow icon="bulb-outline" title={t.improvement} detail={t.improvementText} styles={styles} palette={palette} />
  </Animated.ScrollView>
}

function ActivityHeatmap({ t, language, styles, palette }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette }) {
  const days = activityHistory.map((minutes, index) => ({ minutes, index, date: activityDateForIndex(index) }))
  const columns = Array.from({ length: ACTIVITY_WEEKS }, (_, week) => days.slice(week * 7, week * 7 + 7))
  const totalMinutes = activityHistory.reduce((sum, minutes) => sum + minutes, 0)
  const weeklyAverage = Math.round(totalMinutes / ACTIVITY_WEEKS)
  const midpoint = Math.floor(ACTIVITY_DAYS / 2)
  const earlierTotal = activityHistory.slice(0, midpoint).reduce((sum, minutes) => sum + minutes, 0)
  const recentTotal = activityHistory.slice(midpoint).reduce((sum, minutes) => sum + minutes, 0)
  const change = earlierTotal ? Math.round((recentTotal - earlierTotal) / earlierTotal * 100) : recentTotal ? 100 : 0
  const monthNames = activityMonthNames[language]
  let lastMonth = -1
  const monthLabels = columns.map((week) => {
    const month = week[0].date.getMonth()
    const show = month !== lastMonth
    lastMonth = month
    return show ? monthNames[month] : ''
  })
  const cellColors = [palette.line, `${palette.primary}26`, `${palette.primary}59`, `${palette.primary}99`, palette.primary]
  const changeColor = change >= 0 ? palette.success : palette.danger
  return <View style={styles.activityCard}>
    <View style={styles.activityHeaderRow}>
      <Text style={styles.activityKicker}>{t.activityCheckIn}</Text>
      <Text style={styles.activityRangeLabel}>{t.last90Days}</Text>
    </View>
    <View style={styles.activityBody}>
      <View style={styles.activityStatCol}>
        <Text style={styles.activityValue}>{weeklyAverage}<Text style={styles.activityUnit}> {t.minutes}</Text></Text>
        <Text style={styles.activityValueLabel}>{t.weeklyAverage}</Text>
        <View style={styles.activityChangeRow}>
          <Ionicons name={change >= 0 ? 'caret-up' : 'caret-down'} size={11} color={changeColor} />
          <Text style={[styles.activityChangeText, { color: changeColor }]}>{change >= 0 ? '+' : ''}{change}%</Text>
        </View>
        <Text style={styles.activityChangeLabel}>{t.vsPreviousPeriod}</Text>
      </View>
      <View style={styles.activityGridWrap}>
        <View style={styles.activityMonthRow}>
          <View style={styles.activityMonthSpacer} />
          {monthLabels.map((label, index) => <Text key={index} style={styles.activityMonthLabel}>{label}</Text>)}
        </View>
        <View style={styles.activityGridBody}>
          <View style={styles.activityDayLabelCol}>
            {[0, 1, 2, 3, 4, 5, 6].map((row) => <Text key={row} style={styles.activityDayLabel}>{activityRowLabel(row, language)}</Text>)}
          </View>
          {columns.map((week, weekIndex) => <View key={weekIndex} style={styles.activityWeekCol}>
            {week.map((day) => <View key={day.index} style={[styles.activityCell, { backgroundColor: cellColors[activityLevel(day.minutes)] }]} />)}
          </View>)}
        </View>
      </View>
    </View>
  </View>
}

function MilestoneRow({ statistics, khatmas, language, styles, palette }: { statistics: MobileStatistics; khatmas: MobileKhatmaGroup[]; language: Language; styles: Styles; palette: Palette }) {
  const milestones: Array<{ key: string; icon: IconName; labelAr: string; labelEn: string; unlocked: boolean }> = [
    { key: 'first', icon: 'leaf-outline', labelAr: 'أول جلسة', labelEn: 'First session', unlocked: statistics.completedSessions >= 1 },
    { key: 'week', icon: 'flame-outline', labelAr: 'أسبوع قراءة', labelEn: 'Week of reading', unlocked: statistics.readingDays >= 7 },
    { key: 'thirty', icon: 'ribbon-outline', labelAr: '30 جلسة', labelEn: '30 sessions', unlocked: statistics.completedSessions >= 30 },
    { key: 'khatma', icon: 'trophy-outline', labelAr: 'أول ختمة', labelEn: 'First khatma', unlocked: khatmas.some((group) => group.status === 'completed') },
  ]
  return <View style={styles.milestoneRow}>{milestones.map((milestone) => <View key={milestone.key} style={styles.milestoneItem}>
    <View style={[styles.milestoneBadge, milestone.unlocked && styles.milestoneBadgeUnlocked]}><Ionicons name={milestone.icon} size={20} color={milestone.unlocked ? palette.gold : palette.muted} /></View>
    <Text style={styles.milestoneLabel} numberOfLines={2}>{language === 'ar' ? milestone.labelAr : milestone.labelEn}</Text>
  </View>)}</View>
}

function StreakCard({ days, language, styles, palette }: { days: typeof weekly; language: Language; styles: Styles; palette: Palette }) {
  const [open, setOpen] = useState(false)
  const [selectedDay, setSelectedDay] = useState(days.at(-1) ?? days[0])
  let streak = 0
  for (let i = days.length - 1; i >= 0 && days[i].minutes > 0; i -= 1) streak += 1
  const label = language === 'ar' ? `تتابع ${streak} ${streak === 1 ? 'يوم' : 'أيام'}` : `${streak}-day streak`
  const window = language === 'ar' ? 'آخر 7 أيام' : 'Last 7 days'
  return <>
    <Pressable style={styles.streakCard} onPress={() => { void Haptics.selectionAsync(); setOpen(true) }}>
      <View style={styles.streakHeader}>
        <View style={styles.streakHeaderLeft}><Ionicons name="flame" size={16} color={palette.gold} /><Text style={styles.streakLabel}>{label}</Text></View>
        <Text style={styles.streakWindow}>{window}</Text>
      </View>
      <View style={styles.streakPills}>{days.map((day, index) => <View key={day.nameEn} style={[styles.streakPill, day.minutes > 0 && styles.streakPillFilled, index === days.length - 1 && day.minutes > 0 && styles.streakPillToday]} />)}</View>
    </Pressable>
    <Sheet visible={open} title={label} subtitle={window} styles={styles} palette={palette} onClose={() => setOpen(false)}>
      <WeeklyChart days={days} language={language} selectedDay={selectedDay} onSelectDay={setSelectedDay} styles={styles} palette={palette} />
    </Sheet>
  </>
}

function MoreScreen(props: { route: MoreRoute; setRoute: (route: MoreRoute) => void; t: typeof copy.ar | typeof copy.en; profile: WirdProfile; onProfileUpdate: (profile: WirdProfile) => void; backendStatus: BackendStatus; onSignOut: () => Promise<void>; language: Language; setLanguage: (lang: Language) => void; styles: Styles; palette: Palette; themeMode: MobileTheme; setThemeMode: (value: MobileTheme) => void; sessions: WirdSession[]; setSessions: Dispatch<SetStateAction<WirdSession[]>>; sessionFilter: SessionFilter; setSessionFilter: (filter: SessionFilter) => void; onStartSession: (session: WirdSession) => void; onPostponeSession: (session: WirdSession) => void; planSessions: WirdSession[]; setPlanSessions: Dispatch<SetStateAction<WirdSession[]>>; editingSession: WirdSession | null; setEditingSession: (session: WirdSession | null) => void; currentPage: number; planStartPage: number; onSavePlan: (sessions: WirdSession[]) => Promise<void>; fontSize: number; setFontSize: (value: number) => void; mushafZoom: number; setMushafZoom: (value: number) => void; pageMode: 'auto' | 'single' | 'spread'; setPageMode: (value: 'auto' | 'single' | 'spread') => void; fitMode: 'height' | 'width' | 'custom'; setFitMode: (value: 'height' | 'width' | 'custom') => void; ayahNumbers: boolean; setAyahNumbers: (value: boolean) => void; spiritualCards: boolean; setSpiritualCards: (value: boolean) => void; smartSuggestions: boolean; setSmartSuggestions: (value: boolean) => void; notifications: boolean; setNotifications: (value: boolean) => void; spiritualAudio: boolean; setSpiritualAudio: (value: boolean) => void; preSessionAlert: boolean; setPreSessionAlert: (value: boolean) => void; backupMessage: string | null; onBackup: (action: 'create' | 'restore') => Promise<void>; largeTitle: string; onScroll: ScrollHandler; days: typeof weekly; statistics: MobileStatistics; khatmas: MobileKhatmaGroup[] }) {
  const { route, setRoute, t, language, setLanguage, styles, palette, largeTitle, onScroll, days, statistics, khatmas } = props
  if (route === 'editProfile') return <EditProfileScreen language={language} styles={styles} palette={palette} profile={props.profile} onProfileUpdate={props.onProfileUpdate} onBack={() => setRoute('main')} />
  if (route === 'sessions') return <SessionsScreen t={t} language={language} styles={styles} palette={palette} sessions={props.sessions} filter={props.sessionFilter} onFilter={props.setSessionFilter} onStart={props.onStartSession} onPostpone={props.onPostponeSession} onManage={() => setRoute('plan')} onBack={() => setRoute('main')} />
  if (route === 'settings') return <SettingsScreen {...props} />
  if (route === 'plan') return <PlanScreen {...props} />
  if (route === 'backup') return <BackupScreen t={t} styles={styles} palette={palette} backupMessage={props.backupMessage} onBack={() => setRoute('main')} onBackup={props.onBackup} />
  if (route === 'about') return <AboutScreen t={t} styles={styles} palette={palette} onBack={() => setRoute('main')} />
  if (route === 'privacy' || route === 'terms') return <LegalScreen kind={route} language={language} styles={styles} palette={palette} onBack={() => setRoute('main')} />
  return <Animated.ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} scrollEventThrottle={16} onScroll={onScroll}>
    <Text style={styles.largeTitle}>{largeTitle}</Text>
    <Pressable style={styles.profileCard} onPress={() => { void Haptics.selectionAsync(); setRoute('editProfile') }}><View style={styles.profileLarge}>{props.profile.avatarUri ? <Image source={{ uri: props.profile.avatarUri }} style={styles.profileLargeImage} /> : <Text style={styles.profileLargeText}>{props.profile.name.slice(0, 1).toUpperCase()}</Text>}</View><View style={styles.profileCopy}><Text style={styles.pageIntroTitle}>{language === 'ar' ? `انضم في ${new Date(props.profile.createdAt).toLocaleDateString('ar', { year: 'numeric', month: 'long' })}` : `Joined ${new Date(props.profile.createdAt).toLocaleDateString('en', { year: 'numeric', month: 'long' })}`}</Text></View><Ionicons name="chevron-back" size={18} color={palette.muted} /></Pressable>
    <StreakCard days={days} language={language} styles={styles} palette={palette} />
    <Text style={styles.groupTitle}>{language === 'ar' ? 'الإنجازات' : 'Milestones'}</Text>
    <MilestoneRow statistics={statistics} khatmas={khatmas} language={language} styles={styles} palette={palette} />
    <Text style={styles.groupTitle}>{t.planAndReading}</Text>
    <MenuRow icon="calendar-outline" title={t.sessionsTitle} styles={styles} palette={palette} onPress={() => setRoute('sessions')} />
    <MenuRow icon="calendar-outline" title={t.managePlan} styles={styles} palette={palette} onPress={() => setRoute('plan')} />
    <MenuRow icon="settings-outline" title={t.settings} styles={styles} palette={palette} onPress={() => setRoute('settings')} />
    <MenuRow icon="cloud-download-outline" title={t.backup} styles={styles} palette={palette} onPress={() => setRoute('backup')} />
    <MenuRow icon="information-circle-outline" title={t.about} styles={styles} palette={palette} onPress={() => setRoute('about')} />
    <Text style={styles.groupTitle}>{t.legal}</Text>
    <MenuRow icon="shield-checkmark-outline" title={t.privacyPolicy} styles={styles} palette={palette} onPress={() => setRoute('privacy')} />
    <MenuRow icon="document-text-outline" title={t.termsOfUse} styles={styles} palette={palette} onPress={() => setRoute('terms')} />
    <Text style={styles.groupTitle}>{t.language}</Text>
    <Segmented value={language} options={[['ar', t.arabic], ['en', t.english]]} styles={styles} onChange={setLanguage} />
    <Pressable style={styles.dangerButton} onPress={() => void props.onSignOut()}><Ionicons name="log-out-outline" size={18} color={palette.danger} /><Text style={styles.dangerText}>{language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</Text></Pressable>
  </Animated.ScrollView>
}

function SettingsScreen(props: Parameters<typeof MoreScreen>[0]) {
  const { t, styles, palette, themeMode, setThemeMode, fontSize, setFontSize, mushafZoom, setMushafZoom, pageMode, setPageMode, fitMode, setFitMode, ayahNumbers, setAyahNumbers, spiritualCards, setSpiritualCards, smartSuggestions, setSmartSuggestions, notifications, setNotifications, spiritualAudio, setSpiritualAudio, preSessionAlert, setPreSessionAlert, setRoute, planStartPage, planSessions } = props
  const plannedCount = planSessions.filter((session) => session.enabled).length || 3
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <SubpageHeader title={t.settings} subtitle={t.settingsSubtitle} styles={styles} palette={palette} onBack={() => setRoute('main')} />
    <View style={styles.currentPlanCard}><View style={styles.pageIntroIcon}><Ionicons name="information-circle-outline" size={20} color={palette.primary} /></View><View style={styles.positionCopy}><Text style={styles.cardTitle}>{props.language === 'ar' ? 'خطة الورد الحالية' : 'Current Wird plan'}</Text><Text style={styles.cardMeta}>{props.language === 'ar' ? `نقطة البداية: الصفحة ${planStartPage} · ${plannedCount} جلسات يوميًا` : `Starting point: page ${planStartPage} · ${plannedCount} sessions daily`}</Text></View><Pressable style={styles.headerButton} onPress={() => setRoute('plan')}><Ionicons name="pencil-outline" size={18} color={palette.primary} /></Pressable></View>
    <Text style={styles.groupTitle}>{t.appearanceReading}</Text>
    <View style={styles.themeSetting}><View style={styles.themeSettingHeader}><View style={styles.pageIntroIcon}><Ionicons name={themeMode === 'dark' ? 'moon-outline' : themeMode === 'light' ? 'sunny-outline' : 'phone-portrait-outline'} size={19} color={palette.primary} /></View><View style={styles.themeSettingCopy}><Text style={styles.settingTitle}>{t.appearanceMode}</Text><Text style={styles.cardMeta}>{themeMode === 'system' ? t.followSystem : themeMode === 'dark' ? t.darkMode : t.lightMode}</Text></View></View><Segmented value={themeMode} options={[['system', t.systemMode], ['light', t.lightMode], ['dark', t.darkMode]]} styles={styles} onChange={setThemeMode} /></View>
    <StepperSetting icon="text-outline" title={t.quranFont} value={`${fontSize}px`} onMinus={() => setFontSize(Math.max(18, fontSize - 2))} onPlus={() => setFontSize(Math.min(64, fontSize + 2))} styles={styles} palette={palette} />
    <StepperSetting icon="scan-outline" title={t.mushafZoom} value={`${mushafZoom}%`} onMinus={() => setMushafZoom(Math.max(80, mushafZoom - 10))} onPlus={() => setMushafZoom(Math.min(160, mushafZoom + 10))} styles={styles} palette={palette} />
    <SettingChoice title={t.pageMode} value={pageMode} options={[['auto', t.automatic], ['single', t.singlePage], ['spread', t.twoPages]]} styles={styles} onChange={setPageMode} />
    <SettingChoice title={t.fitMode} value={fitMode} options={[['height', t.fitHeight], ['width', t.fitWidth], ['custom', t.custom]]} styles={styles} onChange={setFitMode} />
    <SettingSwitch icon="eye-outline" title={t.ayahNumbers} value={ayahNumbers} styles={styles} palette={palette} onChange={setAyahNumbers} />
    <SettingSwitch icon="sparkles-outline" title={t.spiritualCards} value={spiritualCards} styles={styles} palette={palette} onChange={setSpiritualCards} />
    <SettingSwitch icon="bulb-outline" title={t.smartSuggestions} value={smartSuggestions} styles={styles} palette={palette} onChange={setSmartSuggestions} />
    <Text style={styles.groupTitle}>{t.remindersAudio}</Text>
    <SettingSwitch icon="notifications-outline" title={t.sessionAlerts} value={notifications} styles={styles} palette={palette} onChange={setNotifications} />
    <SettingSwitch icon="volume-medium-outline" title={t.spiritualAudio} value={spiritualAudio} styles={styles} palette={palette} onChange={setSpiritualAudio} />
    <SettingSwitch icon="alarm-outline" title={t.preSessionAlert} value={preSessionAlert} styles={styles} palette={palette} onChange={setPreSessionAlert} />
    <Pressable style={styles.dangerButton}><Ionicons name="trash-outline" size={18} color={palette.danger} /><Text style={styles.dangerText}>{t.resetData}</Text></Pressable>
  </ScrollView>
}

function PlanScreen(props: Parameters<typeof MoreScreen>[0]) {
  const { t, language, styles, palette, planSessions, setPlanSessions, editingSession, setEditingSession, setRoute, currentPage, onSavePlan, backupMessage } = props
  const plannedSessions = planSessions.slice(0, 5)
  function saveEdited() {
    if (!editingSession) return
    setPlanSessions((current) => current.some((item) => item.id === editingSession.id) ? current.map((item) => item.id === editingSession.id ? editingSession : item) : [...current, editingSession])
    setEditingSession(null)
  }
  return <View style={styles.flexScreen}>
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <SubpageHeader title={t.planTitle} subtitle={t.planSubtitle} styles={styles} palette={palette} onBack={() => setRoute('main')} />
      <View style={styles.positionCard}><View style={styles.pageIntroIcon}><Ionicons name="location-outline" size={20} color={palette.primary} /></View><View style={styles.positionCopy}><Text style={styles.smallMuted}>{t.currentPosition}</Text><Text style={styles.cardTitle}>{t.page} {currentPage}</Text></View><SmallButton label={t.change} styles={styles} onPress={() => undefined} /></View>
      <SectionHeader title={t.recurringSessions} action={`${plannedSessions.filter((session) => session.enabled).length} ${t.active}`} styles={styles} />
      {plannedSessions.map((session) => <View style={[styles.planCard, !session.enabled && styles.planCardDisabled]} key={session.id}><View style={styles.planTop}><View style={styles.planNumber}><Text style={styles.planNumberText}>{session.order}</Text></View><View style={styles.planCopy}><Text style={styles.cardTitle}>{sessionName(session, language)}</Text><Text style={styles.smallMuted}>{session.enabled ? t.active : t.disabled}</Text></View><Switch value={session.enabled} onValueChange={(value) => setPlanSessions((current) => current.map((item) => item.id === session.id ? { ...item, enabled: value } : item))} trackColor={{ false: palette.line, true: palette.primaryMuted }} thumbColor={session.enabled ? palette.primary : palette.muted} /></View><View style={styles.planDetails}><Text style={styles.planDetail}>{session.time}</Text><Text style={styles.planDetail}>{session.duration} {t.minutes}</Text><Text style={styles.planDetail}>{t.everyDay}</Text></View><View style={styles.inlineActions}><SmallButton label={t.edit} primary styles={styles} onPress={() => setEditingSession({ ...session })} /><SmallButton label={session.enabled ? t.disable : t.enable} styles={styles} onPress={() => setPlanSessions((current) => current.map((item) => item.id === session.id ? { ...item, enabled: !item.enabled } : item))} /><Pressable disabled={plannedSessions.length <= 1} onPress={() => setPlanSessions((current) => current.filter((item) => item.id !== session.id))}><Text style={styles.deleteText}>{t.delete}</Text></Pressable></View></View>)}
      {plannedSessions.length < 5 && <Pressable style={styles.addButton} onPress={() => setEditingSession({ id: Date.now(), readingTimeId: Date.now(), order: plannedSessions.length + 1, nameAr: `جلسة الورد ${plannedSessions.length + 1}`, nameEn: `Wird session ${plannedSessions.length + 1}`, time: '20:00', duration: 20, page: currentPage, status: 'scheduled', enabled: true })}><Ionicons name="add" size={20} color={palette.primary} /><Text style={styles.addButtonText}>{t.addSession}</Text></Pressable>}
      <Pressable style={styles.saveBar} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); void onSavePlan(plannedSessions) }}><Ionicons name="save-outline" size={18} color="#FFFFFF" /><Text style={styles.saveBarText}>{t.savePlan}</Text></Pressable>
      {backupMessage && <View style={styles.successBanner}><Ionicons name="checkmark-circle" size={19} color={palette.success} /><Text style={styles.successText}>{backupMessage}</Text></View>}
    </ScrollView>
    <Sheet visible={Boolean(editingSession)} title={t.edit} styles={styles} palette={palette} onClose={() => setEditingSession(null)}>
      {editingSession && <View style={styles.formFields}><Text style={styles.fieldLabel}>{t.sessionName}</Text><TextInput style={styles.textInput} value={language === 'ar' ? editingSession.nameAr : editingSession.nameEn} onChangeText={(value) => setEditingSession(language === 'ar' ? { ...editingSession, nameAr: value } : { ...editingSession, nameEn: value })} /><Text style={styles.fieldLabel}>{t.sessionTime}</Text><TextInput style={styles.textInput} value={editingSession.time} keyboardType="numbers-and-punctuation" onChangeText={(value) => setEditingSession({ ...editingSession, time: value })} /><StepperSetting icon="timer-outline" title={t.duration} value={`${editingSession.duration} ${t.minutes}`} onMinus={() => setEditingSession({ ...editingSession, duration: Math.max(5, editingSession.duration - 5) })} onPlus={() => setEditingSession({ ...editingSession, duration: Math.min(120, editingSession.duration + 5) })} styles={styles} palette={palette} /><Pressable style={styles.modalPrimary} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); saveEdited() }}><Text style={styles.modalPrimaryText}>{t.save}</Text></Pressable></View>}
    </Sheet>
  </View>
}

function EditProfileScreen({ language, styles, palette, profile, onProfileUpdate, onBack }: { language: Language; styles: Styles; palette: Palette; profile: WirdProfile; onProfileUpdate: (profile: WirdProfile) => void; onBack: () => void }) {
  const [name, setName] = useState(profile.name)
  const [avatarUri, setAvatarUri] = useState(profile.avatarUri)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 })
    if (result.canceled || !result.assets[0]) return
    void Haptics.selectionAsync()
    if (Platform.OS === 'web') {
      setAvatarUri(result.assets[0].uri)
      return
    }
    const destination = new File(Paths.document, `avatar-${Date.now()}.jpg`)
    new File(result.assets[0].uri).copy(destination)
    if (avatarUri) { try { new File(avatarUri).delete() } catch { /* best-effort cleanup of the previous local copy */ } }
    setAvatarUri(destination.uri)
  }

  async function save() {
    if (name.trim().length < 2) { setError(language === 'ar' ? 'الاسم قصير جدًا' : 'Name is too short'); return }
    setError('')
    setBusy(true)
    try {
      const updated = await updateProfile({ name, avatarUri })
      onProfileUpdate(updated)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onBack()
    } catch {
      setError(language === 'ar' ? 'تعذر حفظ التغييرات.' : 'Could not save changes.')
    } finally {
      setBusy(false)
    }
  }

  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <SubpageHeader title={language === 'ar' ? 'تعديل الملف الشخصي' : 'Edit profile'} subtitle={language === 'ar' ? 'حدّث صورتك واسمك' : 'Update your photo and name'} styles={styles} palette={palette} onBack={onBack} />
    <Pressable style={styles.editAvatarWrap} onPress={() => void pickAvatar()}>
      <View style={styles.editAvatar}>{avatarUri ? <Image source={{ uri: avatarUri }} style={styles.editAvatarImage} /> : <Text style={styles.editAvatarText}>{name.slice(0, 1).toUpperCase()}</Text>}</View>
      <View style={styles.editAvatarBadge}><Ionicons name="camera" size={14} color="#FFFFFF" /></View>
    </Pressable>
    <Pressable onPress={() => void pickAvatar()}><Text style={styles.editAvatarHint}>{language === 'ar' ? 'اضغط لتغيير الصورة' : 'Tap to change photo'}</Text></Pressable>
    <Text style={styles.fieldLabel}>{language === 'ar' ? 'الاسم' : 'Name'}</Text>
    <TextInput value={name} onChangeText={setName} placeholderTextColor={palette.muted} style={styles.textInput} textAlign={language === 'ar' ? 'right' : 'left'} />
    {Boolean(error) && <Text style={styles.editProfileError}>{error}</Text>}
    <Pressable disabled={busy} style={[styles.modalPrimary, { marginTop: spacing.lg, opacity: busy ? 0.65 : 1 }]} onPress={() => void save()}>{busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalPrimaryText}>{language === 'ar' ? 'حفظ' : 'Save'}</Text>}</Pressable>
  </ScrollView>
}

function BackupScreen({ t, styles, palette, backupMessage, onBack, onBackup }: { t: typeof copy.ar | typeof copy.en; styles: Styles; palette: Palette; backupMessage: string | null; onBack: () => void; onBackup: (action: 'create' | 'restore') => Promise<void> }) {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}><SubpageHeader title={t.backupTitle} subtitle={t.localPrivacyText} styles={styles} palette={palette} onBack={onBack} /><View style={styles.privacyBanner}><Ionicons name="shield-checkmark-outline" size={25} color={palette.primary} /><View style={styles.privacyCopy}><Text style={styles.cardTitle}>{t.localPrivacy}</Text><Text style={styles.cardMeta}>{t.localPrivacyText}</Text></View></View><BackupAction icon="download-outline" title={t.createBackup} description={t.backupIncludes} action={t.chooseSave} styles={styles} palette={palette} onPress={() => { void onBackup('create') }} /><BackupAction icon="cloud-upload-outline" title={t.restoreBackup} description={t.backupIncludes} action={t.chooseFile} styles={styles} palette={palette} onPress={() => { void onBackup('restore') }} />{backupMessage && <View style={styles.successBanner}><Ionicons name="checkmark-circle" size={19} color={palette.success} /><Text style={styles.successText}>{backupMessage}</Text></View>}</ScrollView>
}

function AboutScreen({ t, styles, palette, onBack }: { t: typeof copy.ar | typeof copy.en; styles: Styles; palette: Palette; onBack: () => void }) {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}><SubpageHeader title={t.aboutTitle} subtitle={t.version} styles={styles} palette={palette} onBack={onBack} /><View style={styles.aboutHero}><View style={styles.aboutMark}><Text style={styles.aboutMarkText}>{t.appName.slice(0, 1)}</Text></View><Text style={styles.aboutTitle}>{t.aboutTagline}</Text><Text style={styles.aboutText}>{t.aboutText}</Text></View><InfoRow icon="lock-closed-outline" title={t.privacy} detail={t.localPrivacyText} styles={styles} palette={palette} /><InfoRow icon="cloud-offline-outline" title={t.offline} detail={t.aboutText} styles={styles} palette={palette} /><InfoRow icon="heart-outline" title={t.consistency} detail={t.spiritualText} styles={styles} palette={palette} /></ScrollView>
}

function LegalScreen({ kind, language, styles, palette, onBack }: { kind: LegalDocumentKey; language: Language; styles: Styles; palette: Palette; onBack: () => void }) {
  const document = legalDocuments[language][kind]
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <SubpageHeader title={document.title} subtitle={document.effectiveDate} styles={styles} palette={palette} onBack={onBack} />
    <View style={styles.legalSummary}><View style={styles.legalSummaryIcon}><Ionicons name={kind === 'privacy' ? 'shield-checkmark-outline' : 'document-text-outline'} size={25} color={palette.primary} /></View><Text style={styles.legalSummaryText}>{document.summary}</Text></View>
    {document.sections.map((section) => <View style={styles.legalSection} key={section.title}><Text style={styles.legalSectionTitle}>{section.title}</Text><Text style={styles.legalSectionBody}>{section.body}</Text></View>)}
    <View style={styles.legalContact}><Ionicons name="logo-github" size={21} color={palette.primary} /><Text style={styles.legalContactText}>{document.contact}</Text></View>
  </ScrollView>
}

function ReaderSheets({ sheet, setSheet, t, styles, palette, page, setPage, jumpPage, setJumpPage, selectedVerse, bookmarks, setBookmarks, onFinished, onFinishSession }: { sheet: 'jump' | 'tafsir' | 'bookmarks' | 'complete' | null; setSheet: (sheet: 'jump' | 'tafsir' | 'bookmarks' | 'complete' | null) => void; t: typeof copy.ar | typeof copy.en; styles: Styles; palette: Palette; page: number; setPage: (page: number) => void; jumpPage: string; setJumpPage: (value: string) => void; selectedVerse: number; bookmarks: number[]; setBookmarks: Dispatch<SetStateAction<number[]>>; onFinished: () => void; onFinishSession: () => void }) {
  return <>
    <Sheet visible={sheet === 'jump'} title={t.quickJump} styles={styles} palette={palette} onClose={() => setSheet(null)}><Text style={styles.fieldLabel}>{t.jumpPage}</Text><View style={styles.jumpRow}><TextInput value={jumpPage} onChangeText={setJumpPage} keyboardType="number-pad" style={styles.textInput} /><Pressable style={styles.modalPrimary} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setPage(Math.max(1, Math.min(604, Number(jumpPage) || page))); setSheet(null) }}><Text style={styles.modalPrimaryText}>{t.go}</Text></Pressable></View><SheetAction icon="return-down-back-outline" label={`${t.lastWirdPosition} · ${t.page} 32`} styles={styles} palette={palette} onPress={() => { setPage(32); setSheet(null) }} /></Sheet>
    <Sheet visible={sheet === 'tafsir'} title={t.tafsirTitle} subtitle={`${t.surahAlFurqan} · ${t.verse} ${selectedVerse}`} styles={styles} palette={palette} onClose={() => setSheet(null)}><View style={styles.tafsirBanner}><Ionicons name="book-outline" size={19} color={palette.primary} /><Text style={styles.tafsirBannerText}>{t.localOffline}</Text></View><Text style={styles.tafsirText}>{t.tafsirText}</Text><View style={styles.modalActions}><SmallButton label={t.previousVerse} styles={styles} onPress={() => undefined} /><SmallButton label={t.nextVerse} primary styles={styles} onPress={() => undefined} /></View></Sheet>
    <Sheet visible={sheet === 'bookmarks'} title={t.bookmarks} styles={styles} palette={palette} onClose={() => setSheet(null)}>{bookmarks.length === 0 ? <Text style={styles.emptyText}>{t.noBookmarks}</Text> : bookmarks.map((verse) => <View style={styles.bookmarkRow} key={verse}><Pressable style={styles.bookmarkCopy} onPress={() => setSheet(null)}><Text style={styles.cardTitle}>{t.surahAlFurqan}</Text><Text style={styles.cardMeta}>{t.verse} {verse} · {t.page} 362</Text></Pressable><Pressable accessibilityLabel={t.removeBookmark} style={styles.headerButton} onPress={() => setBookmarks((current) => current.filter((item) => item !== verse))}><Ionicons name="trash-outline" size={18} color={palette.danger} /></Pressable></View>)}</Sheet>
    <Sheet visible={sheet === 'complete'} title={t.finishSession} styles={styles} palette={palette} onClose={() => setSheet(null)}><View style={styles.completeIcon}><Ionicons name="checkmark" size={32} color="#FFFFFF" /></View><Text style={styles.completeTitle}>{t.selectEnd}</Text><Text style={styles.completeText}>{t.surahAlFurqan} · {t.verse} {selectedVerse}</Text><Pressable style={styles.modalPrimary} onPress={onFinishSession}><Text style={styles.modalPrimaryText}>{t.finishHere}</Text></Pressable><Pressable style={styles.modalGhost} onPress={onFinished}><Text style={styles.modalGhostText}>{t.cancel}</Text></Pressable></Sheet>
  </>
}

function NavIcon({ symbol, ionicon, size, color, weight }: { symbol: SFSymbol; ionicon: IconName; size: number; color: string; weight?: SymbolWeight }) {
  if (Platform.OS === 'ios') return <SymbolView name={symbol} size={size} tintColor={color} weight={weight} type="hierarchical" />
  return <Ionicons name={ionicon} size={size} color={color} />
}

function TabBar({ active, t, styles, palette, bottomInset, onChange }: { active: TabId; t: typeof copy.ar | typeof copy.en; styles: Styles; palette: Palette; bottomInset: number; onChange: (tab: TabId) => void }) {
  const labels: Record<TabId, string> = { home: t.home, reader: t.reader, khatmas: t.khatmas, stats: t.stats, more: t.more }
  return <View style={[styles.tabBarShadow, { bottom: Math.max(11, bottomInset + spacing.xs) }]}>
    <View style={styles.tabBar}>
      <BlurView intensity={80} tint={palette === dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={styles.tabTint} />
      {tabItems.map((item) => { const selected = item.id === active; return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={labels[item.id]} hitSlop={hitSlop} style={({ pressed }) => [styles.tabItem, pressed && styles.pressablePressed]} onPress={() => onChange(item.id)}><View style={[styles.tabPillBase, selected && styles.tabPillActive]}><NavIcon symbol={selected ? item.activeSymbol : item.symbol} ionicon={selected ? item.activeIcon : item.icon} size={selected ? 26 : 27} color={selected ? palette.primary : palette.muted} weight={selected ? 'semibold' : 'regular'} />{selected && <Text style={styles.tabLabel}>{labels[item.id]}</Text>}</View></Pressable> })}
    </View>
  </View>
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function CircularProgress({ value, size, strokeWidth, trackColor, progressColor, textColor, label, labelColor }: { value: number; size: number; strokeWidth: number; trackColor: string; progressColor: string; textColor: string; label: string; labelColor: string }) {
  const normalized = Math.min(100, Math.max(0, value)); const radius = (size - strokeWidth) / 2; const circumference = 2 * Math.PI * radius
  const animatedValue = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(animatedValue, { toValue: normalized, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [animatedValue, normalized])
  const offset = animatedValue.interpolate({ inputRange: [0, 100], outputRange: [circumference, 0] })
  const webOffset = circumference * (1 - normalized / 100)
  return <View accessibilityLabel={`${label} ${normalized}%`} style={{ width: size, height: size }}><Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}><Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" /><AnimatedCircle cx={size / 2} cy={size / 2} r={radius} stroke={progressColor} strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={Platform.OS === 'web' ? webOffset : offset} strokeLinecap="round" fill="none" /></Svg><View style={ringStyles.center}><Text style={[ringStyles.value, { color: textColor }]}>{normalized}%</Text><Text style={[ringStyles.label, { color: labelColor }]} numberOfLines={1}>{label}</Text></View></View>
}

const ringStyles = StyleSheet.create({ center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' }, value: { fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }, label: { fontSize: 10, fontWeight: '500', marginTop: 1, maxWidth: 70, textAlign: 'center' } })

function WeeklyChart({ days, language, selectedDay, onSelectDay, styles, palette }: { days: typeof weekly; language: Language; selectedDay: typeof weekly[number]; onSelectDay: (day: typeof weekly[number]) => void; styles: Styles; palette: Palette }) {
  const max = Math.max(1, ...days.map((day) => day.minutes))
  return <View style={styles.weekChart}>{days.map((day, index) => <Pressable key={day.nameEn} accessibilityLabel={`${language === 'ar' ? day.nameAr : day.nameEn}: ${day.minutes}`} style={styles.weekBarItem} onPress={() => onSelectDay(day)}><View style={styles.weekTrack}><AnimatedWeekFill height={Math.max(9, day.minutes / max * 152)} selected={selectedDay.nameEn === day.nameEn} index={index} styles={styles} palette={palette} /></View><Text style={[styles.weekLabel, selectedDay.nameEn === day.nameEn && styles.weekLabelActive]}>{language === 'ar' ? day.ar : day.en}</Text></Pressable>)}</View>
}

function AnimatedWeekFill({ height, selected, index, styles, palette }: { height: number; selected: boolean; index: number; styles: Styles; palette: Palette }) {
  const animatedHeight = useRef(new Animated.Value(0)).current
  const emphasis = useRef(new Animated.Value(selected ? 1 : 0)).current
  useEffect(() => {
    animatedHeight.setValue(0)
    Animated.timing(animatedHeight, { toValue: height, duration: 620, delay: index * 55, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start()
  }, [animatedHeight, height, index])
  useEffect(() => {
    Animated.timing(emphasis, { toValue: selected ? 1 : 0, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: false }).start()
  }, [emphasis, selected])
  const backgroundColor = emphasis.interpolate({ inputRange: [0, 1], outputRange: ['#8AAE9F', palette.primary] })
  return <Animated.View style={[styles.weekFill, { height: animatedHeight, backgroundColor }]} />
}

function SheetBackdrop({ animatedIndex, style, palette, onPress }: BottomSheetBackdropProps & { palette: Palette; onPress: () => void }) {
  const containerStyle = useAnimatedStyle(() => ({ opacity: interpolate(animatedIndex.value, [-1, 0], [0, 1], Extrapolation.CLAMP) }))
  return <ReanimatedAnimated.View style={[style, containerStyle]}>
    <Pressable style={StyleSheet.absoluteFill} onPress={onPress}>
      <BlurView intensity={24} tint={palette === dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />
    </Pressable>
  </ReanimatedAnimated.View>
}

function SheetBackground({ style, palette }: BottomSheetBackgroundProps & { palette: Palette }) {
  return <View style={[style, { overflow: 'hidden', borderTopLeftRadius: radius.xxl, borderTopRightRadius: radius.xxl }]}>
    <BlurView intensity={60} tint={palette === dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
    <View style={[StyleSheet.absoluteFill, { backgroundColor: `${palette.surface}CC` }]} />
  </View>
}

function Sheet({ visible, title, subtitle, styles, palette, onClose, children }: { visible: boolean; title: string; subtitle?: string; styles: Styles; palette: Palette; onClose: () => void; children: ReactNode }) {
  const sheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null)
  useEffect(() => {
    if (visible) sheetRef.current?.present()
    else sheetRef.current?.dismiss()
  }, [visible])
  return <BottomSheetModal
    ref={sheetRef}
    onDismiss={onClose}
    enablePanDownToClose
    enableDynamicSizing
    maxDynamicContentSize={SCREEN_HEIGHT * 0.82}
    backdropComponent={(props) => <SheetBackdrop {...props} palette={palette} onPress={onClose} />}
    backgroundComponent={(props) => <SheetBackground {...props} palette={palette} />}
    handleIndicatorStyle={{ width: 38, height: 5, borderRadius: 3, backgroundColor: palette.line }}
    handleStyle={{ paddingTop: spacing.sm, paddingBottom: 0 }}
  >
    <BottomSheetView style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
      <View style={styles.sheetHeader}><View style={styles.sheetHeaderCopy}><Text style={styles.sheetTitle}>{title}</Text>{subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}</View><Pressable accessibilityLabel="Close" style={styles.sheetClose} onPress={onClose}><Ionicons name="close" size={20} color={styles.sheetTitle.color as string} /></Pressable></View>
      {children}
    </BottomSheetView>
  </BottomSheetModal>
}

function SheetAction({ icon, label, styles, palette, onPress }: { icon: IconName; label: string; styles: Styles; palette: Palette; onPress: () => void }) {
  return <Pressable hitSlop={hitSlop} style={({ pressed }) => [styles.sheetAction, pressed && styles.pressablePressed]} onPress={() => { void Haptics.selectionAsync(); onPress() }}><View style={styles.sheetActionIcon}><Ionicons name={icon} size={20} color={palette.primary} /></View><Text style={styles.sheetActionText}>{label}</Text><Ionicons name="chevron-back" size={18} color={palette.muted} /></Pressable>
}
function ToolbarButton({ icon, label, count, styles, palette, onPress }: { icon: IconName; label: string; count?: number; styles: Styles; palette: Palette; onPress: () => void }) {
  return <Pressable hitSlop={hitSlop} style={({ pressed }) => [styles.toolbarButton, pressed && styles.pressablePressed]} onPress={() => { void Haptics.selectionAsync(); onPress() }}><View style={styles.toolbarIconWrap}><Ionicons name={icon} size={20} color={palette.primary} />{Boolean(count) && <View style={styles.toolbarCount}><Text style={styles.toolbarCountText}>{count}</Text></View>}</View><Text style={styles.toolbarLabel}>{label}</Text></Pressable>
}
function Metric({ icon, value, label, styles, palette }: { icon: IconName; value: string; label: string; styles: Styles; palette: Palette }) { return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons name={icon} size={18} color={palette.primary} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel} numberOfLines={2}>{label}</Text></View> }
function SectionHeader({ title, action, styles }: { title: string; action?: string; styles: Styles }) { return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && <Text style={styles.sectionAction}>{action}</Text>}</View> }
function SummaryItem({ label, value, styles }: { label: string; value: string; styles: Styles }) { return <View style={styles.summaryItem}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View> }
function SmallButton({ label, primary, styles, onPress }: { label: string; primary?: boolean; styles: Styles; onPress: () => void }) {
  return <Pressable hitSlop={hitSlop} style={({ pressed }) => [styles.smallButton, primary && styles.smallButtonPrimary, pressed && styles.pressablePressed]} onPress={() => { void (primary ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.selectionAsync()); onPress() }}><Text style={[styles.smallButtonText, primary && styles.smallButtonTextPrimary]}>{label}</Text></Pressable>
}
function StatusPill({ status, t, styles }: { status: SessionStatus; t: typeof copy.ar | typeof copy.en; styles: Styles }) { const labels: Record<SessionStatus, string> = { scheduled: t.scheduled, in_progress: t.inProgress, paused: t.paused, completed: t.completed, ended_early: t.endedEarly, skipped: t.missed }; return <View style={[styles.statusPill, status === 'completed' && styles.statusDone, status === 'in_progress' && styles.statusActive]}><Text style={styles.statusText}>{labels[status]}</Text></View> }
function InfoRow({ icon, title, detail, styles, palette }: { icon: IconName; title: string; detail: string; styles: Styles; palette: Palette }) { return <View style={styles.infoRow}><View style={styles.pageIntroIcon}><Ionicons name={icon} size={20} color={palette.primary} /></View><View style={styles.rowInset}><View style={styles.infoCopy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardMeta}>{detail}</Text></View></View></View> }
function MenuRow({ icon, title, styles, palette, onPress }: { icon: IconName; title: string; styles: Styles; palette: Palette; onPress: () => void }) {
  return <Pressable hitSlop={hitSlop} style={({ pressed }) => [styles.menuRow, pressed && styles.pressablePressed]} onPress={() => { void Haptics.selectionAsync(); onPress() }}><View style={styles.pageIntroIcon}><Ionicons name={icon} size={20} color={palette.primary} /></View><View style={styles.rowInset}><Text style={styles.menuTitle}>{title}</Text><Ionicons name="chevron-back" size={19} color={palette.muted} /></View></Pressable>
}
function SubpageHeader({ title, subtitle, styles, palette, onBack }: { title: string; subtitle: string; styles: Styles; palette: Palette; onBack: () => void }) {
  return <View style={styles.subpageHeader}><Pressable accessibilityLabel="Back" hitSlop={hitSlop} style={({ pressed }) => [styles.headerButton, pressed && styles.pressablePressed]} onPress={() => { void Haptics.selectionAsync(); onBack() }}><Ionicons name="chevron-forward" size={20} color={palette.primary} /></Pressable><View style={styles.subpageCopy}><Text style={styles.pageIntroTitle}>{title}</Text><Text style={styles.pageIntroText}>{subtitle}</Text></View></View>
}
function SettingSwitch({ icon, title, value, styles, palette, onChange }: { icon: IconName; title: string; value: boolean; styles: Styles; palette: Palette; onChange: (value: boolean) => void }) { return <View style={styles.settingRow}><View style={styles.pageIntroIcon}><Ionicons name={icon} size={19} color={palette.primary} /></View><View style={styles.rowInset}><Text style={styles.settingTitle}>{title}</Text><Switch value={value} onValueChange={(next) => { void Haptics.selectionAsync(); onChange(next) }} trackColor={{ false: palette.line, true: palette.primaryMuted }} thumbColor={value ? palette.primary : palette.muted} /></View></View> }
function StepperSetting({ icon, title, value, onMinus, onPlus, styles, palette }: { icon: IconName; title: string; value: string; onMinus: () => void; onPlus: () => void; styles: Styles; palette: Palette }) {
  return <View style={styles.settingRow}><View style={styles.pageIntroIcon}><Ionicons name={icon} size={19} color={palette.primary} /></View><View style={styles.rowInset}><Text style={styles.settingTitle}>{title}</Text><View style={styles.stepper}><Pressable hitSlop={hitSlop} style={({ pressed }) => [styles.stepButton, pressed && styles.pressablePressed]} onPress={() => { void Haptics.selectionAsync(); onMinus() }}><Ionicons name="remove" size={18} color={palette.primary} /></Pressable><Text style={styles.stepValue}>{value}</Text><Pressable hitSlop={hitSlop} style={({ pressed }) => [styles.stepButton, pressed && styles.pressablePressed]} onPress={() => { void Haptics.selectionAsync(); onPlus() }}><Ionicons name="add" size={18} color={palette.primary} /></Pressable></View></View></View>
}
function SettingChoice<T extends string>({ title, value, options, styles, onChange }: { title: string; value: T; options: Array<[T, string]>; styles: Styles; onChange: (value: T) => void }) { return <View style={styles.settingChoice}><Text style={styles.settingChoiceTitle}>{title}</Text><Segmented value={value} options={options} styles={styles} onChange={onChange} /></View> }
function Segmented<T extends string>({ value, options, styles, onChange }: { value: T; options: Array<[T, string]>; styles: Styles; onChange: (value: T) => void }) {
  return <View style={styles.segmented}>{options.map(([id, label]) => <Pressable key={id} hitSlop={hitSlop} style={({ pressed }) => [styles.segment, value === id && styles.segmentActive, pressed && value !== id && styles.pressablePressed]} onPress={() => { if (id !== value) void Haptics.selectionAsync(); onChange(id) }}><Text style={[styles.segmentText, value === id && styles.segmentTextActive]} numberOfLines={1}>{label}</Text></Pressable>)}</View>
}
function BackupAction({ icon, title, description, action, styles, palette, onPress }: { icon: IconName; title: string; description: string; action: string; styles: Styles; palette: Palette; onPress: () => void }) {
  return <View style={styles.backupCard}><View style={styles.backupIcon}><Ionicons name={icon} size={26} color={palette.primary} /></View><Text style={styles.backupTitle}>{title}</Text><Text style={styles.backupText}>{description}</Text><Pressable hitSlop={hitSlop} style={({ pressed }) => [styles.modalPrimary, pressed && styles.pressablePressed]} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress() }}><Text style={styles.modalPrimaryText}>{action}</Text></Pressable></View>
}
function sessionName(session: WirdSession, language: Language) { return language === 'ar' ? session.nameAr : session.nameEn }

type Styles = ReturnType<typeof makeStyles>

const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 }
const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }
const hitSlop = { top: 8, right: 8, bottom: 8, left: 8 }

function makeStyles(p: Palette, rtl: boolean) {
  const row = rtl ? 'row-reverse' as const : 'row' as const
  const align = rtl ? 'right' as const : 'left' as const
  const writing = rtl ? 'rtl' as const : 'ltr' as const
  return withCairoFont(StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: p.background }, app: { flex: 1, backgroundColor: p.background }, flexScreen: { flex: 1 }, screen: { flex: 1 }, scrollContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: 136 },
    header: { position: 'relative', flexDirection: row, alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: Platform.OS === 'android' ? 15 : spacing.sm, paddingBottom: spacing.md }, headerHairline: { position: 'absolute', left: 0, right: 0, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: p.line }, largeTitle: { color: p.ink, fontSize: 34, lineHeight: 40, fontWeight: '800', marginBottom: spacing.md, textAlign: align, writingDirection: writing },
    avatar: { width: 43, height: 43, borderRadius: 21.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryDeep, borderWidth: 1.5, borderColor: p.primaryMuted }, avatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' }, avatarImage: { width: '100%', height: '100%' },
    headerCopy: { flex: 1, minWidth: 0 }, headerKicker: { color: p.muted, fontSize: 11, fontWeight: '600', textAlign: align, writingDirection: writing }, headerTitle: { color: p.ink, fontSize: 22, fontWeight: '800', lineHeight: 30, textAlign: align, writingDirection: writing },
    headerButton: { position: 'relative', width: 46, height: 46, borderRadius: 15, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }, pressablePressed: { opacity: 0.72, transform: [{ scale: 0.97 }] }, pressableDisabled: { opacity: 0.48 }, notificationDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: p.surface, backgroundColor: p.gold },
    notificationToast: { position: 'absolute', zIndex: 20, top: 106, insetInlineEnd: spacing.lg, maxWidth: 240, minHeight: 48, flexDirection: row, alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }, notificationToastText: { flex: 1, color: p.ink, fontSize: 12, textAlign: align, writingDirection: writing },
    nextStrip: { minHeight: 74, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.lg, backgroundColor: p.primaryMuted }, smallMuted: { color: p.muted, fontSize: 11, fontWeight: '500', textAlign: align, writingDirection: writing }, nextStripTitle: { marginTop: 2, color: p.primary, fontSize: 17, fontWeight: '800', textAlign: align }, timeChip: { minHeight: 44, flexDirection: row, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: p.surface }, timeChipText: { color: p.primary, fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'] },
    heroCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.xxl, backgroundColor: p.primaryDeep, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }, heroTop: { flexDirection: row, alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }, heroKicker: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '600', textAlign: align }, heroTitle: { maxWidth: 230, marginTop: 2, color: '#FFFFFF', fontSize: 24, fontWeight: '800', lineHeight: 32, textAlign: align, writingDirection: writing }, partChip: { paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.11)' }, partChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' },
    heroProgress: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, paddingHorizontal: spacing.xs }, heroPosition: { flex: 1, marginStart: spacing.lg }, heroSurah: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', lineHeight: 30, textAlign: align }, heroMeta: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '500', textAlign: align }, heroMetaRow: { flexDirection: row, alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm }, heroActions: { flexDirection: row, gap: spacing.sm, marginTop: spacing.lg }, heroPrimary: { flex: 1, minHeight: 47, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, backgroundColor: '#FFFFFF' }, heroPrimaryText: { color: p.primaryDeep, fontSize: 13, fontWeight: '700' }, heroGhost: { width: 47, minHeight: 47, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
    sectionHeader: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm }, sectionTitle: { flex: 1, color: p.ink, fontSize: 18, fontWeight: '700', lineHeight: 25, textAlign: align }, sectionAction: { color: p.primary, fontSize: 11, fontWeight: '600' },
    chartPanel: { minHeight: 236, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, chartSelected: { alignSelf: rtl ? 'flex-end' : 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: p.primaryMuted }, chartSelectedText: { color: p.primary, fontSize: 10, fontWeight: '600' }, weekChart: { height: 188, flexDirection: row, alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.sm, marginTop: spacing.sm }, weekBarItem: { flex: 1, alignItems: 'center', gap: spacing.sm }, weekTrack: { width: 20, height: 152, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 10, backgroundColor: p.primaryMuted }, weekFill: { width: '100%', borderRadius: 10, backgroundColor: '#8AAE9F' }, weekLabel: { color: p.muted, fontSize: 10 }, weekLabelActive: { color: p.primary, fontWeight: '600' }, weekTotal: { color: p.muted, fontSize: 10, textAlign: 'center' },
    activityCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, activityHeaderRow: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }, activityKicker: { color: p.muted, fontSize: 10, fontWeight: '700', textAlign: align, textTransform: 'uppercase' }, activityRangeLabel: { color: p.muted, fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    activityBody: { flexDirection: row, alignItems: 'flex-start', gap: spacing.md }, activityStatCol: { width: 116, gap: 3 }, activityValue: { color: p.ink, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: align }, activityUnit: { color: p.muted, fontSize: 12, fontWeight: '600' }, activityValueLabel: { color: p.muted, fontSize: 9, fontWeight: '700', textAlign: align, textTransform: 'uppercase', marginBottom: spacing.sm }, activityChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 }, activityChangeText: { fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] }, activityChangeLabel: { color: p.muted, fontSize: 9, fontWeight: '600', textAlign: align, textTransform: 'uppercase' },
    activityGridWrap: { flex: 1, alignItems: 'flex-start' }, activityMonthRow: { flexDirection: row, gap: 3, marginBottom: 5 }, activityMonthSpacer: { width: 14 }, activityMonthLabel: { width: 9, color: p.muted, fontSize: 9, fontWeight: '600' }, activityGridBody: { flexDirection: row, gap: 3 }, activityDayLabelCol: { width: 14, gap: 3 }, activityDayLabel: { height: 9, color: p.muted, fontSize: 8, fontWeight: '600', lineHeight: 9 }, activityWeekCol: { gap: 3 }, activityCell: { width: 9, height: 9, borderRadius: 2.5 },
    metricRow: { flexDirection: row, gap: spacing.sm, marginTop: spacing.md }, metric: { flex: 1, minHeight: 112, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, metricIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryMuted }, metricValue: { marginTop: spacing.sm, color: p.ink, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'], textAlign: align }, metricLabel: { marginTop: 2, color: p.muted, fontSize: 10, fontWeight: '600', lineHeight: 14, textAlign: align },
    goalRow: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: p.elevated }, goalCopy: { flex: 1 }, goalTitle: { color: p.ink, fontSize: 20, fontWeight: '800', lineHeight: 26, textAlign: align, writingDirection: writing }, cardTitle: { color: p.ink, fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: align, writingDirection: writing }, cardMeta: { marginTop: 3, color: p.muted, fontSize: 11, fontWeight: '500', lineHeight: 18, textAlign: align, writingDirection: writing },
    smartCard: { flexDirection: row, alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, smartIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryMuted }, smartCopy: { flex: 1 }, inlineActions: { flexDirection: row, alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }, smallButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: p.primaryMuted }, smallButtonPrimary: { backgroundColor: p.primary }, smallButtonText: { color: p.primary, fontSize: 12, fontWeight: '700' }, smallButtonTextPrimary: { color: '#FFFFFF' }, dismissText: { color: p.muted, fontSize: 11, fontWeight: '700' }, deleteText: { minHeight: 44, color: p.danger, fontSize: 12, fontWeight: '700', textAlignVertical: 'center' },
    spiritualCard: { flexDirection: row, alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: p.primaryMuted }, spiritualCopy: { flex: 1 }, spiritualTitle: { color: p.primary, fontSize: 12, fontWeight: '700', textAlign: align }, spiritualText: { marginTop: 3, color: p.ink, fontSize: 12, lineHeight: 20, textAlign: align, writingDirection: writing },
    readerScreen: { flex: 1, paddingHorizontal: spacing.md, paddingBottom: 116 }, readerStatus: { minHeight: 68, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: radius.lg, backgroundColor: p.primaryMuted }, compactPrimary: { minHeight: 46, flexDirection: row, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: p.primary }, compactPrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    focusBar: { minHeight: 70, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: p.primaryDeep }, focusLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, textAlign: align }, focusTitle: { marginTop: 2, color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: align }, focusActions: { flexDirection: row, alignItems: 'center', gap: spacing.sm }, focusIcon: { width: 46, height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }, focusComplete: { minHeight: 46, flexDirection: row, alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: '#FFFFFF' }, focusCompleteText: { color: p.primary, fontSize: 11, fontWeight: '700' },
    readerToolbar: { flexDirection: row, gap: spacing.sm, marginVertical: spacing.sm }, toolbarButton: { flex: 1, minHeight: 50, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, toolbarIconWrap: { position: 'relative' }, toolbarLabel: { color: p.ink, fontSize: 10, fontWeight: '700' }, toolbarCount: { position: 'absolute', top: -7, right: -8, minWidth: 14, height: 14, paddingHorizontal: 3, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: p.gold }, toolbarCountText: { color: '#FFFFFF', fontSize: 8, fontWeight: '600' },
    mushafPage: { flex: 1, overflow: 'hidden', borderRadius: radius.xl, borderWidth: 1, borderColor: p.line, backgroundColor: dark === p ? p.elevated : '#FFFDF8' }, mushafHeader: { minHeight: 45, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: p.line }, mushafMeta: { color: p.muted, fontSize: 9 }, mushafTitle: { color: p.primary, fontSize: 14, fontWeight: '700' }, verses: { padding: spacing.md }, verseRow: { position: 'relative', padding: spacing.sm, borderRadius: radius.sm }, verseSelected: { backgroundColor: p.primaryMuted }, quranText: { color: p.ink, lineHeight: 47, textAlign: 'right', writingDirection: 'rtl', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : undefined }, verseMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 3 }, verseNumber: { minWidth: 25, color: p.gold, fontSize: 10, fontWeight: '600' },
    verseActions: { flexDirection: row, gap: spacing.sm, padding: spacing.sm, borderTopWidth: 1, borderTopColor: p.line, backgroundColor: p.surface }, verseAction: { flex: 1, minHeight: 46, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: p.primaryMuted }, verseActionText: { color: p.primary, fontSize: 11, fontWeight: '700' }, verseActionPrimary: { flex: 1, minHeight: 46, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, borderRadius: radius.md, backgroundColor: p.primary }, verseActionPrimaryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    pageNavigation: { minHeight: 55, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingTop: spacing.sm }, pageButton: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, pageCenter: { minWidth: 104, minHeight: 45, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.primaryMuted }, pageCenterLabel: { color: p.muted, fontSize: 8 }, pageCenterValue: { color: p.primary, fontSize: 12, fontWeight: '700' },
    pageIntro: { flexDirection: row, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }, pageIntroIcon: { width: 44, height: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.primaryMuted }, pageIntroCopy: { flex: 1 }, pageIntroTitle: { color: p.ink, fontSize: 20, fontWeight: '800', lineHeight: 28, textAlign: align }, pageIntroText: { marginTop: 2, color: p.muted, fontSize: 11, fontWeight: '500', lineHeight: 17, textAlign: align, writingDirection: writing },
    summaryGrid: { flexDirection: row, flexWrap: 'wrap', overflow: 'hidden', marginBottom: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, summaryItem: { width: '50%', minHeight: 65, justifyContent: 'center', paddingHorizontal: spacing.md, borderBottomWidth: 1, borderRightWidth: 1, borderColor: p.line }, summaryValue: { color: p.ink, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: align }, summaryLabel: { color: p.muted, fontSize: 10, fontWeight: '500', textAlign: align },
    segmented: { flexDirection: row, gap: 3, padding: 4, borderRadius: radius.md, backgroundColor: p.elevated }, segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xs, borderRadius: radius.sm }, segmentActive: { backgroundColor: p.surface, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 7 }, segmentText: { color: p.muted, fontSize: 11, fontWeight: '700' }, segmentTextActive: { color: p.primary },
    sessionCard: { flexDirection: row, alignItems: 'stretch', gap: spacing.sm, marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, sessionTime: { width: 62, minHeight: 69, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.primaryMuted }, sessionTimeValue: { color: p.primary, fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] }, sessionTimeLabel: { marginTop: 2, color: p.muted, fontSize: 9, fontWeight: '500' }, sessionBody: { flex: 1 }, sessionTitleRow: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs }, sessionTitle: { flex: 1, color: p.ink, fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: align }, statusPill: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: p.elevated }, statusActive: { backgroundColor: p.primaryMuted }, statusDone: { backgroundColor: p.primaryMuted }, statusText: { color: p.primary, fontSize: 9, fontWeight: '600' },
    khatmaListHeader: { minHeight: 72, flexDirection: row, alignItems: 'center', gap: spacing.md, marginBottom: spacing.md }, khatmaListKicker: { color: p.muted, fontSize: 11, fontWeight: '600', textAlign: align }, khatmaListTitle: { marginTop: 2, color: p.ink, fontSize: 27, lineHeight: 36, fontWeight: '800', textAlign: align }, khatmaAdd: { width: 52, height: 52, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 26, backgroundColor: p.primaryDeep, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 13, shadowOffset: { width: 0, height: 7 } },
    circlesSection: { marginBottom: spacing.lg }, circlesTitle: { color: p.ink, fontSize: 15, fontWeight: '700', marginBottom: spacing.sm, textAlign: align }, circlesScroll: { flexDirection: row, gap: spacing.md, paddingBottom: 2 }, circleCard: { width: 148, height: 128, borderRadius: radius.lg, overflow: 'hidden', padding: spacing.md, justifyContent: 'flex-end', backgroundColor: p.primaryDeep }, circleWatermark: { position: 'absolute', top: -10, insetInlineEnd: -10, opacity: 0.14 }, circleName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', textAlign: align }, circleMeta: { marginTop: 2, color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '600', textAlign: align }, circleTime: { marginTop: 6, color: '#FFFFFF', fontSize: 11, fontWeight: '700', textAlign: align }, circleAddCard: { width: 148, height: 128, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: p.line, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, backgroundColor: p.elevated }, circleAddText: { color: p.muted, fontSize: 11, fontWeight: '700', textAlign: 'center' },
    searchField: { minHeight: 53, flexDirection: row, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md, paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.elevated }, searchInput: { flex: 1, color: p.ink, fontSize: 12, textAlign: align, writingDirection: writing },
    khatmaCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, khatmaCardTop: { flexDirection: row, alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm }, khatmaCardCopy: { flex: 1 }, khatmaCardTitle: { color: p.ink, fontSize: 17, lineHeight: 25, fontWeight: '700', textAlign: align, writingDirection: writing }, daysChip: { flexDirection: row, alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: p.primaryMuted }, daysChipText: { color: p.primary, fontSize: 9, fontWeight: '600', fontVariant: ['tabular-nums'] }, khatmaProgressRow: { flexDirection: row, alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg }, khatmaParts: { color: p.primary, fontSize: 10, fontWeight: '700', fontVariant: ['tabular-nums'] }, khatmaPercent: { color: p.muted, fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] }, khatmaTrack: { flex: 1, height: 7, overflow: 'hidden', borderRadius: 4, backgroundColor: p.primaryMuted }, khatmaFill: { height: '100%', borderRadius: 4, backgroundColor: p.primary }, khatmaEmpty: { alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 190, marginTop: spacing.md, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: p.line, backgroundColor: p.elevated },
    khatmaDetailHeader: { flexDirection: row, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }, khatmaHero: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.xxl, backgroundColor: p.primaryDeep, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }, khatmaSchedule: { alignSelf: rtl ? 'flex-end' : 'flex-start', flexDirection: row, alignItems: 'center', gap: spacing.xs, marginTop: spacing.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, borderRadius: radius.sm, backgroundColor: 'rgba(255,255,255,0.12)' }, khatmaScheduleText: { color: '#FFFFFF', fontSize: 10, fontWeight: '600' }, khatmaInvite: { minHeight: 44, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm }, khatmaInviteText: { color: 'rgba(255,255,255,0.76)', fontSize: 10, fontWeight: '600', fontVariant: ['tabular-nums'] },
    khatmaSessionRow: { minHeight: 72, flexDirection: row, alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: p.line }, khatmaSessionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.primaryMuted }, khatmaSessionCopy: { flex: 1 }, memberStack: { overflow: 'hidden', paddingHorizontal: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, memberRow: { minHeight: 65, flexDirection: row, alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: p.line }, memberAvatar: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: p.primaryMuted }, memberAvatarText: { color: p.primary, fontSize: 14, fontWeight: '800' }, memberCopy: { flex: 1 },
    statsHero: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: p.primaryDeep }, statsHeroCopy: { flex: 1 }, statsKicker: { color: '#FFFFFF', fontSize: 19, fontWeight: '800', textAlign: align }, statsTitle: { marginTop: 5, color: 'rgba(255,255,255,0.67)', fontSize: 11, lineHeight: 18, textAlign: align, writingDirection: writing }, statsMetrics: { flexDirection: row, flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }, breakdownCard: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, legendRow: { flexDirection: row, alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm }, legendDot: { width: 8, height: 8, borderRadius: 4 },
    infoRow: { flexDirection: row, alignItems: 'center', gap: spacing.sm, minHeight: 69 }, infoCopy: { flex: 1 },
    streakCard: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, streakHeader: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between' }, streakHeaderLeft: { flexDirection: row, alignItems: 'center', gap: spacing.xs }, streakLabel: { color: p.ink, fontSize: 13, fontWeight: '700' }, streakWindow: { color: p.muted, fontSize: 11, fontWeight: '500' }, streakPills: { flexDirection: row, gap: spacing.xs, marginTop: spacing.md }, streakPill: { flex: 1, height: 26, borderRadius: radius.sm, backgroundColor: p.elevated }, streakPillFilled: { backgroundColor: p.primary }, streakPillToday: { backgroundColor: p.gold },
    milestoneRow: { flexDirection: row, justifyContent: 'space-between', gap: spacing.sm }, milestoneItem: { flex: 1, alignItems: 'center', gap: spacing.xs }, milestoneBadge: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: p.elevated }, milestoneBadgeUnlocked: { backgroundColor: p.primaryMuted }, milestoneLabel: { color: p.muted, fontSize: 9, fontWeight: '600', textAlign: 'center', lineHeight: 13 },
    profileCard: { flexDirection: row, alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: p.primaryMuted }, profileLarge: { width: 55, height: 55, borderRadius: 27.5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryDeep }, profileLargeText: { color: '#FFFFFF', fontSize: 22, fontWeight: '700' }, profileLargeImage: { width: '100%', height: '100%' }, profileCopy: { flex: 1 }, groupTitle: { marginTop: spacing.xl, marginBottom: spacing.sm, color: p.muted, fontSize: 11, fontWeight: '700', textAlign: align, textTransform: 'uppercase' }, menuRow: { minHeight: 63, flexDirection: row, alignItems: 'center', gap: spacing.sm }, rowInset: { flex: 1, alignSelf: 'stretch', flexDirection: row, alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: p.line }, menuTitle: { flex: 1, color: p.ink, fontSize: 15, fontWeight: '600', textAlign: align }, currentPlanCard: { minHeight: 88, flexDirection: row, alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface },
    subpageHeader: { flexDirection: row, alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }, subpageCopy: { flex: 1 }, settingRow: { minHeight: 70, flexDirection: row, alignItems: 'center', gap: spacing.sm }, settingTitle: { flex: 1, color: p.ink, fontSize: 14, fontWeight: '700', textAlign: align }, stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm }, stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.primaryMuted }, stepValue: { minWidth: 46, color: p.ink, fontSize: 12, fontWeight: '800', textAlign: 'center' }, settingChoice: { paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: p.line }, settingChoiceTitle: { marginBottom: spacing.sm, color: p.ink, fontSize: 13, fontWeight: '700', textAlign: align }, dangerButton: { minHeight: 50, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.lg, borderRadius: radius.md, backgroundColor: `${p.danger}12` }, dangerText: { color: p.danger, fontSize: 12, fontWeight: '700' },
    themeSetting: { gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: p.line }, themeSettingHeader: { flexDirection: row, alignItems: 'center', gap: spacing.sm }, themeSettingCopy: { flex: 1 },
    positionCard: { flexDirection: row, alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: p.primaryMuted }, positionCopy: { flex: 1 }, planCard: { marginBottom: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, planCardDisabled: { opacity: 0.62 }, planTop: { flexDirection: row, alignItems: 'center', gap: spacing.sm }, planNumber: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.primary }, planNumberText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, planCopy: { flex: 1 }, planDetails: { flexDirection: row, flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm }, planDetail: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: radius.sm, backgroundColor: p.elevated, color: p.muted, fontSize: 9 }, addButton: { minHeight: 50, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: p.primary, backgroundColor: p.primaryMuted }, addButtonText: { color: p.primary, fontSize: 12, fontWeight: '700' }, saveBar: { minHeight: 52, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, borderRadius: radius.md, backgroundColor: p.primary }, saveBarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
    privacyBanner: { flexDirection: row, alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: p.primaryMuted }, privacyCopy: { flex: 1 }, backupCard: { marginTop: spacing.md, padding: spacing.lg, borderRadius: radius.xl, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, backupIcon: { width: 47, height: 47, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.primaryMuted }, backupTitle: { marginTop: spacing.md, color: p.ink, fontSize: 17, fontWeight: '700', textAlign: align }, backupText: { marginTop: 5, color: p.muted, fontSize: 11, lineHeight: 18, textAlign: align, writingDirection: writing }, successBanner: { minHeight: 48, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.md, borderRadius: radius.md, backgroundColor: p.primaryMuted }, successText: { color: p.success, fontSize: 11, fontWeight: '600' },
    editAvatarWrap: { alignSelf: 'center', marginTop: spacing.md, width: 96, height: 96 }, editAvatar: { width: 96, height: 96, borderRadius: 48, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryDeep }, editAvatarImage: { width: '100%', height: '100%' }, editAvatarText: { color: '#FFFFFF', fontSize: 34, fontWeight: '700' }, editAvatarBadge: { position: 'absolute', bottom: 0, insetInlineEnd: 0, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primary, borderWidth: 2, borderColor: p.background }, editAvatarHint: { marginTop: spacing.sm, marginBottom: spacing.lg, color: p.primary, fontSize: 12, fontWeight: '600', textAlign: 'center' }, editProfileError: { marginTop: spacing.sm, color: p.danger, fontSize: 11, textAlign: align },
    aboutHero: { alignItems: 'center', padding: spacing.lg, borderRadius: radius.xl, backgroundColor: p.primaryDeep }, aboutMark: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xl, backgroundColor: '#FFFFFF' }, aboutMarkText: { color: p.primaryDeep, fontSize: 28, fontWeight: '800' }, aboutTitle: { marginTop: spacing.md, color: '#FFFFFF', fontSize: 20, fontWeight: '800', textAlign: 'center' }, aboutText: { marginTop: spacing.sm, color: 'rgba(255,255,255,0.67)', fontSize: 11, lineHeight: 18, textAlign: 'center' },
    legalSummary: { flexDirection: row, alignItems: 'flex-start', gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, backgroundColor: p.primaryMuted }, legalSummaryIcon: { width: 42, height: 42, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.surface }, legalSummaryText: { flex: 1, color: p.ink, fontSize: 12, fontWeight: '600', lineHeight: 20, textAlign: align, writingDirection: writing }, legalSection: { paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: p.line }, legalSectionTitle: { color: p.ink, fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: align, writingDirection: writing }, legalSectionBody: { marginTop: spacing.sm, color: p.muted, fontSize: 11, fontWeight: '500', lineHeight: 20, textAlign: align, writingDirection: writing }, legalContact: { flexDirection: row, alignItems: 'flex-start', gap: spacing.sm, marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, legalContactText: { flex: 1, color: p.muted, fontSize: 10, lineHeight: 18, textAlign: align, writingDirection: writing },
    tabBarShadow: { position: 'absolute', left: spacing.sm, right: spacing.sm, bottom: 11, minHeight: 82, borderRadius: radius.xl, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 26, shadowOffset: { width: 0, height: 11 } }, tabBar: { flex: 1, flexDirection: row, alignItems: 'center', gap: 3, padding: spacing.sm, borderRadius: radius.xl, borderWidth: 1, borderColor: p.line, overflow: 'hidden' }, tabTint: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: p.tab }, tabItem: { flex: 1, minHeight: 64, alignItems: 'center', justifyContent: 'center' }, tabPillBase: { flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 48, paddingHorizontal: spacing.sm, borderRadius: radius.xl }, tabPillActive: { paddingHorizontal: spacing.md, backgroundColor: p.primaryMuted }, tabLabel: { color: p.primary, fontSize: 13, fontWeight: '800' },
    ritualOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,27,20,0.90)' }, ritualMark: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center', borderRadius: radius.xxl, backgroundColor: '#FFFFFF' }, ritualMarkText: { color: p.primaryDeep, fontSize: 33, fontWeight: '800' }, ritualText: { marginTop: spacing.lg, color: '#FFFFFF', fontSize: 17, fontWeight: '700' }, ritualCount: { marginTop: spacing.sm, color: p.gold, fontSize: 45, fontWeight: '800' },
    sheetHeader: { flexDirection: row, alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md }, sheetHeaderCopy: { flex: 1 }, sheetTitle: { color: p.ink, fontSize: 18, fontWeight: '800', textAlign: align }, sheetSubtitle: { marginTop: 2, color: p.muted, fontSize: 10, textAlign: align }, sheetClose: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.elevated }, sheetAction: { minHeight: 64, flexDirection: row, alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: p.line }, sheetActionIcon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: p.primaryMuted }, sheetActionText: { flex: 1, color: p.ink, fontSize: 14, fontWeight: '700', textAlign: align },
    fieldLabel: { marginTop: spacing.sm, marginBottom: 5, color: p.muted, fontSize: 10, fontWeight: '700', textAlign: align }, textInput: { minHeight: 48, flex: 1, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: p.line, color: p.ink, backgroundColor: p.elevated, textAlign: align }, formFields: { gap: spacing.xs }, jumpRow: { flexDirection: row, gap: spacing.sm }, modalPrimary: { minHeight: 50, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radius.md, backgroundColor: p.primary }, modalPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' }, modalGhost: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm }, modalGhostText: { color: p.muted, fontSize: 12, fontWeight: '700' }, modalActions: { flexDirection: row, gap: spacing.sm, marginTop: spacing.md }, tafsirBanner: { flexDirection: row, alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: radius.md, backgroundColor: p.primaryMuted }, tafsirBannerText: { color: p.primary, fontSize: 10, fontWeight: '600' }, tafsirText: { marginTop: spacing.md, color: p.ink, fontSize: 14, lineHeight: 27, textAlign: align, writingDirection: writing }, emptyText: { paddingVertical: 25, color: p.muted, fontSize: 12, textAlign: 'center' }, bookmarkRow: { minHeight: 65, flexDirection: row, alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: p.line }, bookmarkCopy: { flex: 1 }, completeIcon: { alignSelf: 'center', width: 61, height: 61, alignItems: 'center', justifyContent: 'center', borderRadius: 30.5, backgroundColor: p.primary }, completeTitle: { marginTop: spacing.md, color: p.ink, fontSize: 17, fontWeight: '700', textAlign: 'center' }, completeText: { marginVertical: spacing.sm, color: p.muted, fontSize: 11, textAlign: 'center' },
  }))
}
