import { ComponentProps, Dispatch, ReactNode, SetStateAction, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Share,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Svg, { Circle } from 'react-native-svg'
import { SQLiteProvider, useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite'
import { File, Paths } from 'expo-file-system'
import * as DocumentPicker from 'expo-document-picker'
import { copy, type Language } from './src/locales'
import { AuthFlow } from './src/AuthFlow'
import { getCurrentProfile, signOut, type WirdProfile } from './src/services/auth-service'
import {
  completeMobileSession,
  createBackupPayload,
  getQuranPage,
  initializeMobileBackend,
  loadAppState,
  loadMobileSnapshot,
  pauseMobileSession,
  postponeMobileSession,
  restoreBackupPayload,
  saveAppState,
  saveMobilePlan,
  startMobileSession,
  type BackendStatus,
  type MobileSession,
  type MobileSessionStatus,
  type MobileSnapshot,
  type MobileStatistics,
  type QuranVerse,
} from './src/services/mobile-backend'

type IconName = ComponentProps<typeof Ionicons>['name']
type TabId = 'home' | 'reader' | 'sessions' | 'stats' | 'more'
type MoreRoute = 'main' | 'settings' | 'plan' | 'backup' | 'about'
type SessionStatus = MobileSessionStatus
type SessionFilter = 'today' | 'upcoming' | 'history' | 'all'

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
  success: '#267B5D', tab: 'rgba(255,255,255,0.97)', shadow: 'rgba(23,92,67,0.14)',
}

const dark: Palette = {
  background: '#111A16', surface: '#18231E', elevated: '#202E28', primary: '#79C4A3', primaryDeep: '#175C43',
  primaryMuted: '#273B32', ink: '#F4F7F5', muted: '#A9B5AF', line: '#31443B', gold: '#E7C968', danger: '#E0837F',
  success: '#79C4A3', tab: 'rgba(24,35,30,0.97)', shadow: 'rgba(0,0,0,0.28)',
}

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

const quranVerses = [
  { number: 203, text: 'وَٱذْكُرُوا۟ ٱللَّهَ فِىٓ أَيَّامٍ مَّعْدُودَٰتٍ' },
  { number: 204, text: 'وَمِنَ ٱلنَّاسِ مَن يُعْجِبُكَ قَوْلُهُۥ فِى ٱلْحَيَوٰةِ ٱلدُّنْيَا' },
  { number: 205, text: 'وَإِذَا تَوَلَّىٰ سَعَىٰ فِى ٱلْأَرْضِ لِيُفْسِدَ فِيهَا' },
]

const tabItems: Array<{ id: TabId; icon: IconName; activeIcon: IconName }> = [
  { id: 'home', icon: 'home-outline', activeIcon: 'home' },
  { id: 'reader', icon: 'book-outline', activeIcon: 'book' },
  { id: 'sessions', icon: 'calendar-outline', activeIcon: 'calendar' },
  { id: 'stats', icon: 'bar-chart-outline', activeIcon: 'bar-chart' },
  { id: 'more', icon: 'ellipsis-horizontal-circle-outline', activeIcon: 'ellipsis-horizontal-circle' },
]

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds))
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

export default function App() {
  return <SQLiteProvider databaseName="quran.db" assetSource={{ assetId: require('./assets/databases/quran.db') }}>
    <AppRoot />
  </SQLiteProvider>
}

function AppRoot() {
  const quranDatabase = useSQLiteContext()
  const [language, setLanguage] = useState<Language>('ar')
  const [profile, setProfile] = useState<WirdProfile | null>(null)
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null)
  const [onboardingComplete, setOnboardingComplete] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void Promise.all([initializeMobileBackend(quranDatabase), getCurrentProfile(), AsyncStorage.getItem(ONBOARDING_KEY)]).then(([status, currentProfile, onboarding]) => {
      if (cancelled) return
      setBackendStatus(status)
      setProfile(currentProfile)
      setOnboardingComplete(Boolean(onboarding))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [quranDatabase])

  if (loading || !backendStatus) return <SafeAreaView style={bootstrapStyles.loading}><StatusBar barStyle="dark-content" /><ActivityIndicator size="large" color="#175C43" /></SafeAreaView>
  if (!profile) return <AuthFlow initialMode={onboardingComplete ? 'signIn' : 'onboarding'} language={language} onLanguage={setLanguage} onAuthenticated={(nextProfile) => { setProfile(nextProfile); setOnboardingComplete(true); void AsyncStorage.setItem(ONBOARDING_KEY, '1') }} />
  return <MainApp language={language} initialProfile={profile} backendStatus={backendStatus} quranDatabase={quranDatabase} onSignOut={async () => { await signOut(); setProfile(null) }} />
}

const bootstrapStyles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' } })

function MainApp({ language: initialLanguage, initialProfile, backendStatus, quranDatabase, onSignOut }: { language: Language; initialProfile: WirdProfile; backendStatus: BackendStatus; quranDatabase: SQLiteDatabase; onSignOut: () => Promise<void> }) {
  const [language, setLanguage] = useState<Language>(initialLanguage)
  const [darkMode, setDarkMode] = useState(false)
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
  const [pageVerses, setPageVerses] = useState<QuranVerse[]>(quranVerses.map((verse, index) => ({ ...verse, globalNumber: 210 + index, surahNumber: 2, surahName: 'البقرة', page: 32, juz: 2 })))

  const t = copy[language]
  const isRTL = language === 'ar'
  const palette = darkMode ? dark : light
  const styles = useMemo(() => makeStyles(palette, isRTL), [palette, isRTL])
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
    const mappedWeek = weekly.map((day, index) => ({ ...day, minutes: snapshot.statistics.weeklyTrend[index]?.minutes ?? 0 }))
    setWeekData(mappedWeek)
    setSelectedWeekDay(mappedWeek.at(-1) ?? mappedWeek[0])
    setDarkMode(snapshot.settings.theme === 'dark')
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

  useEffect(() => {
    let cancelled = false
    void Promise.all([loadMobileSnapshot(), loadAppState<Record<string, unknown>>()]).then(async ([snapshot, databaseState]) => {
      const fallback = databaseState ? null : await AsyncStorage.getItem(STORAGE_KEY)
      const source = databaseState ?? (fallback ? JSON.parse(fallback) as Record<string, unknown> : null)
      if (cancelled) return
      applySnapshot(snapshot)
      if (!source) return
      const saved = source as Partial<{
        language: Language; bookmarks: number[];
      }>
      if (saved.language) setLanguage(saved.language)
      if (saved.bookmarks) setBookmarks(saved.bookmarks)
    }).catch(() => undefined).finally(() => { if (!cancelled) setHydrated(true) })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const state = { language, darkMode, readerPage, bookmarks, fontSize, mushafZoom, pageMode, fitMode, ayahNumbers, spiritualCards, smartSuggestions, notifications, spiritualAudio, preSessionAlert }
    void Promise.all([saveAppState(state), AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state))])
  }, [ayahNumbers, bookmarks, darkMode, fitMode, fontSize, hydrated, language, mushafZoom, notifications, pageMode, preSessionAlert, readerPage, smartSuggestions, spiritualAudio, spiritualCards])

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

  function changeTab(next: TabId) {
    setTab(next)
    if (next !== 'more') setMoreRoute('main')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
      <View style={styles.app}>
        <AppHeader
          language={language}
          title={tab === 'home' ? initialProfile.name : tab === 'reader' ? t.quran : tab === 'sessions' ? t.sessionsTitle : tab === 'stats' ? t.stats : t.moreTitle}
          kicker={tab === 'home' ? t.greeting : t.appName}
          notificationVisible={notificationVisible}
          styles={styles}
          palette={palette}
          onToggleLanguage={() => setLanguage((value) => value === 'ar' ? 'en' : 'ar')}
          onToggleNotifications={() => setNotificationVisible((value) => !value)}
        />

        {notificationVisible && <View style={styles.notificationToast}><Ionicons name="notifications" size={17} color={palette.primary} /><Text style={styles.notificationToastText}>{t.notificationMessage}</Text></View>}

        {tab === 'home' && <HomeScreen t={t} language={language} styles={styles} palette={palette} progress={progress} nextSession={nextSession} sessions={sessions} planSessions={planSessions} statistics={statistics} days={weekData} selectedDay={selectedWeekDay} onSelectDay={setSelectedWeekDay} onStart={startSession} onOpenReader={() => changeTab('reader')} />}
        {tab === 'reader' && <ReaderScreen t={t} language={language} styles={styles} palette={palette} page={readerPage} verses={pageVerses} fontSize={fontSize} activeSession={activeSession} elapsed={elapsed} selectedVerse={selectedVerse} bookmarks={bookmarks} ayahNumbers={ayahNumbers} onSelectVerse={setSelectedVerse} onPageChange={setReaderPage} onStart={() => nextSession && startSession(nextSession)} onPause={async () => { if (activeSession) applySnapshot(await pauseMobileSession(activeSession.id)); changeTab('home') }} onOpenSheet={setReaderSheet} onToggleBookmark={() => setBookmarks((current) => current.includes(selectedVerse) ? current.filter((item) => item !== selectedVerse) : [selectedVerse, ...current])} />}
        {tab === 'sessions' && <SessionsScreen t={t} language={language} styles={styles} palette={palette} sessions={sessions} filter={sessionFilter} onFilter={setSessionFilter} onStart={startSession} onPostpone={setPostponing} onManage={() => { setMoreRoute('plan'); setTab('more') }} />}
        {tab === 'stats' && <StatsScreen t={t} language={language} styles={styles} palette={palette} progress={progress} statistics={statistics} days={weekData} selectedDay={selectedWeekDay} onSelectDay={setSelectedWeekDay} />}
        {tab === 'more' && <MoreScreen route={moreRoute} setRoute={setMoreRoute} t={t} profile={initialProfile} backendStatus={backendStatus} onSignOut={onSignOut} language={language} setLanguage={setLanguage} styles={styles} palette={palette} darkMode={darkMode} setDarkMode={setDarkMode} sessions={sessions} setSessions={setSessions} planSessions={planSessions} setPlanSessions={setPlanSessions} editingSession={editingSession} setEditingSession={setEditingSession} currentPage={readerPage} planStartPage={planStartPage} onSavePlan={savePlan} fontSize={fontSize} setFontSize={setFontSize} mushafZoom={mushafZoom} setMushafZoom={setMushafZoom} pageMode={pageMode} setPageMode={setPageMode} fitMode={fitMode} setFitMode={setFitMode} ayahNumbers={ayahNumbers} setAyahNumbers={setAyahNumbers} spiritualCards={spiritualCards} setSpiritualCards={setSpiritualCards} smartSuggestions={smartSuggestions} setSmartSuggestions={setSmartSuggestions} notifications={notifications} setNotifications={setNotifications} spiritualAudio={spiritualAudio} setSpiritualAudio={setSpiritualAudio} preSessionAlert={preSessionAlert} setPreSessionAlert={setPreSessionAlert} backupMessage={backupMessage} onBackup={runBackup} />}

        <TabBar active={tab} t={t} styles={styles} palette={palette} onChange={changeTab} />

        {ritualCount !== null && <View style={styles.ritualOverlay}><View style={styles.ritualMark}><Text style={styles.ritualMarkText}>{t.appName.slice(0, 1)}</Text></View><Text style={styles.ritualText}>{language === 'ar' ? 'استعن بالله وابدأ' : 'Begin with trust in Allah'}</Text><Text style={styles.ritualCount}>{ritualCount}</Text></View>}

        <Sheet visible={Boolean(postponing)} title={t.postponeTitle} styles={styles} onClose={() => setPostponing(null)}>
          <SheetAction icon="time-outline" label={t.in30Minutes} styles={styles} palette={palette} onPress={() => { void postponeSession(30) }} />
          <SheetAction icon="hourglass-outline" label={t.inOneHour} styles={styles} palette={palette} onPress={() => { void postponeSession(60) }} />
          <SheetAction icon="moon-outline" label={t.tonight} styles={styles} palette={palette} onPress={() => { void postponeSession(180) }} />
        </Sheet>

        <ReaderSheets sheet={readerSheet} setSheet={setReaderSheet} t={t} styles={styles} palette={palette} page={readerPage} setPage={setReaderPage} jumpPage={jumpPage} setJumpPage={setJumpPage} selectedVerse={selectedVerse} bookmarks={bookmarks} setBookmarks={setBookmarks} onFinished={() => { setReaderSheet(null); changeTab('home') }} onFinishSession={finishSession} />
      </View>
    </SafeAreaView>
  )
}

function AppHeader({ language, title, kicker, notificationVisible, styles, palette, onToggleLanguage, onToggleNotifications }: { language: Language; title: string; kicker: string; notificationVisible: boolean; styles: Styles; palette: Palette; onToggleLanguage: () => void; onToggleNotifications: () => void }) {
  return <View style={styles.header}>
    <View style={styles.avatar}><Text style={styles.avatarText}>{language === 'ar' ? 'ع' : 'A'}</Text></View>
    <View style={styles.headerCopy}><Text style={styles.headerKicker}>{kicker}</Text><Text style={styles.headerTitle} numberOfLines={1}>{title}</Text></View>
    <Pressable accessibilityLabel="Language" style={styles.headerButton} onPress={onToggleLanguage}><Ionicons name="language-outline" size={20} color={palette.primary} /></Pressable>
    <Pressable accessibilityLabel="Notifications" style={styles.headerButton} onPress={onToggleNotifications}><Ionicons name={notificationVisible ? 'notifications' : 'notifications-outline'} size={20} color={palette.primary} /><View style={styles.notificationDot} /></Pressable>
  </View>
}

function HomeScreen({ t, language, styles, palette, progress, nextSession, sessions, planSessions, statistics, days, selectedDay, onSelectDay, onStart, onOpenReader }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; progress: number; nextSession: WirdSession | null; sessions: WirdSession[]; planSessions: WirdSession[]; statistics: MobileStatistics; days: typeof weekly; selectedDay: typeof weekly[number]; onSelectDay: (day: typeof weekly[number]) => void; onStart: (session: WirdSession) => void; onOpenReader: () => void }) {
  const todayMinutes = days.at(-1)?.minutes ?? 0
  const dailyTarget = planSessions.filter((session) => session.enabled).reduce((sum, session) => sum + session.duration, 0) || 20
  const targetProgress = Math.round(Math.min(100, todayMinutes / dailyTarget * 100))
  const surahName = language === 'ar' ? 'سورة البقرة' : 'Surah Al-Baqarah'
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.nextStrip}><View><Text style={styles.smallMuted}>{nextSession?.status === 'in_progress' ? t.currentSession : t.nextSession}</Text><Text style={styles.nextStripTitle}>{nextSession ? sessionName(nextSession, language) : t.morningWird}</Text></View><View style={styles.timeChip}><Ionicons name="time-outline" size={14} color={palette.primary} /><Text style={styles.timeChipText}>{nextSession?.time ?? '15:30'}</Text></View></View>

    <View style={styles.heroCard}>
      <View style={styles.heroTop}><View><Text style={styles.heroKicker}>{t.journey}</Text><Text style={styles.heroTitle}>{t.homeTitle}</Text></View><View style={styles.partChip}><Text style={styles.partChipText}>2/30 {t.part}</Text></View></View>
      <View style={styles.heroProgress}><CircularProgress value={progress} size={112} strokeWidth={9} trackColor="rgba(255,255,255,0.18)" progressColor="#FFFFFF" textColor="#FFFFFF" label={t.complete} labelColor="rgba(255,255,255,0.68)" /><View style={styles.heroPosition}><Text style={styles.heroSurah}>{surahName}</Text><Text style={styles.heroMeta}>{t.page} 32 · {t.part} 2</Text><View style={styles.heroMetaRow}><Ionicons name="timer-outline" size={14} color="#FFFFFF" /><Text style={styles.heroMeta}>{nextSession?.duration ?? 10} {t.minutes}</Text></View></View></View>
      <View style={styles.heroActions}>{nextSession && <Pressable style={styles.heroPrimary} onPress={() => onStart(nextSession)}><Ionicons name="play" size={17} color={palette.primaryDeep} /><Text style={styles.heroPrimaryText}>{['paused', 'in_progress'].includes(nextSession.status) ? t.resume : t.startNow}</Text></Pressable>}<Pressable accessibilityLabel={t.openMushaf} style={styles.heroGhost} onPress={onOpenReader}><Ionicons name="book-outline" size={20} color="#FFFFFF" /></Pressable></View>
    </View>

    <SectionHeader title={t.weeklyRhythm} action={`${days.reduce((sum, day) => sum + day.minutes, 0)} ${t.minutes}`} styles={styles} />
    <View style={styles.chartPanel}><View style={styles.chartSelected}><Text style={styles.chartSelectedText}>{language === 'ar' ? selectedDay.nameAr : selectedDay.nameEn} · {selectedDay.minutes} {t.minutes}</Text></View><WeeklyChart days={days} language={language} selectedDay={selectedDay} onSelectDay={onSelectDay} styles={styles} palette={palette} /></View>

    <View style={styles.metricRow}><Metric icon="flame-outline" value={String(statistics.readingDays)} label={t.readingDays} styles={styles} palette={palette} /><Metric icon="map-outline" value={String(statistics.approximatePages)} label={t.pagesRead} styles={styles} palette={palette} /><Metric icon="checkmark-circle-outline" value={String(statistics.completedSessions)} label={t.completedSessions} styles={styles} palette={palette} /></View>

    <View style={styles.goalRow}><View style={styles.goalCopy}><Text style={styles.cardTitle}>{t.dailyGoal}</Text><Text style={styles.cardMeta}>{todayMinutes} / {dailyTarget} {t.minutes}</Text><Text style={styles.smallMuted}>{Math.max(0, dailyTarget - todayMinutes)} {t.remainingGoal}</Text></View><CircularProgress value={targetProgress} size={88} strokeWidth={8} trackColor={palette.primaryMuted} progressColor={palette.primary} textColor={palette.ink} label={t.complete} labelColor={palette.muted} /></View>

    <View style={styles.smartCard}><View style={styles.smartIcon}><Ionicons name="sparkles-outline" size={20} color={palette.primary} /></View><View style={styles.smartCopy}><Text style={styles.cardTitle}>{t.smartSummary}</Text><Text style={styles.cardMeta}>{t.smartText}</Text><View style={styles.inlineActions}><SmallButton label={t.apply} primary styles={styles} onPress={() => undefined} /><SmallButton label={t.snooze} styles={styles} onPress={() => undefined} /><Pressable><Text style={styles.dismissText}>{t.dismiss}</Text></Pressable></View></View></View>

    <View style={styles.spiritualCard}><Ionicons name="leaf-outline" size={21} color={palette.gold} /><View style={styles.spiritualCopy}><Text style={styles.spiritualTitle}>{t.spiritualTitle}</Text><Text style={styles.spiritualText}>{t.spiritualText}</Text></View></View>
  </ScrollView>
}

function ReaderScreen({ t, language, styles, palette, page, verses, fontSize, activeSession, elapsed, selectedVerse, bookmarks, ayahNumbers, onSelectVerse, onPageChange, onStart, onPause, onOpenSheet, onToggleBookmark }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; page: number; verses: QuranVerse[]; fontSize: number; activeSession: WirdSession | null; elapsed: number; selectedVerse: number; bookmarks: number[]; ayahNumbers: boolean; onSelectVerse: (verse: number) => void; onPageChange: (page: number) => void; onStart: () => void; onPause: () => void; onOpenSheet: (sheet: 'jump' | 'tafsir' | 'bookmarks' | 'complete') => void; onToggleBookmark: () => void }) {
  const clock = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const surahName = language === 'ar' ? `سورة ${verses[0]?.surahName ?? 'البقرة'}` : 'Surah Al-Baqarah'
  const juz = verses[0]?.juz ?? 2
  return <View style={styles.readerScreen}>
    {activeSession ? <View style={styles.focusBar}><View><Text style={styles.focusLabel}>{t.readingSession}</Text><Text style={styles.focusTitle}>{t.page} {page} · {clock}</Text></View><View style={styles.focusActions}><Pressable accessibilityLabel={t.pauseAndLeave} style={styles.focusIcon} onPress={onPause}><Ionicons name="pause" size={18} color="#FFFFFF" /></Pressable><Pressable style={styles.focusComplete} onPress={() => onOpenSheet('complete')}><Ionicons name="checkmark" size={17} color={palette.primary} /><Text style={styles.focusCompleteText}>{t.finishSession}</Text></Pressable></View></View> : <View style={styles.readerStatus}><View><Text style={styles.smallMuted}>{t.freeReading}</Text><Text style={styles.cardTitle}>{t.savedAt} {t.page} {page}</Text></View><Pressable style={styles.compactPrimary} onPress={onStart}><Ionicons name="play" size={16} color="#FFFFFF" /><Text style={styles.compactPrimaryText}>{t.start}</Text></Pressable></View>}

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
      {selectedVerse && <View style={styles.verseActions}><Pressable style={styles.verseAction} onPress={onToggleBookmark}><Ionicons name={bookmarks.includes(selectedVerse) ? 'bookmark' : 'bookmark-outline'} size={17} color={palette.primary} /><Text style={styles.verseActionText}>{bookmarks.includes(selectedVerse) ? t.removeBookmark : t.addBookmark}</Text></Pressable>{activeSession && <Pressable style={styles.verseActionPrimary} onPress={() => onOpenSheet('complete')}><Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" /><Text style={styles.verseActionPrimaryText}>{t.finishHere}</Text></Pressable>}</View>}
    </View>

    <View style={styles.pageNavigation}><Pressable accessibilityLabel={t.previousPage} style={styles.pageButton} onPress={() => onPageChange(Math.max(1, page - 1))}><Ionicons name="chevron-forward" size={22} color={palette.primary} /></Pressable><Pressable style={styles.pageCenter} onPress={() => onOpenSheet('jump')}><Text style={styles.pageCenterLabel}>{t.page}</Text><Text style={styles.pageCenterValue}>{page} / 604</Text></Pressable><Pressable accessibilityLabel={t.nextPage} style={styles.pageButton} onPress={() => onPageChange(Math.min(604, page + 1))}><Ionicons name="chevron-back" size={22} color={palette.primary} /></Pressable></View>
  </View>
}

function SessionsScreen({ t, language, styles, palette, sessions, filter, onFilter, onStart, onPostpone, onManage }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; sessions: WirdSession[]; filter: SessionFilter; onFilter: (filter: SessionFilter) => void; onStart: (session: WirdSession) => void; onPostpone: (session: WirdSession) => void; onManage: () => void }) {
  const today = localDateKey()
  const todaySessions = sessions.filter((session) => !session.scheduledDate || session.scheduledDate === today)
  const visible = sessions.filter((session) => filter === 'all' || filter === 'today' && (!session.scheduledDate || session.scheduledDate === today) || filter === 'upcoming' && ['scheduled', 'paused', 'in_progress'].includes(session.status) || filter === 'history' && ['completed', 'ended_early', 'skipped'].includes(session.status))
  const completed = todaySessions.filter((session) => session.status === 'completed').length
  const remaining = todaySessions.filter((session) => ['scheduled', 'paused', 'in_progress'].includes(session.status)).length
  const readingMinutes = Math.floor(todaySessions.reduce((sum, session) => sum + (session.activeSeconds ?? 0), 0) / 60)
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.pageIntro}><View style={styles.pageIntroIcon}><Ionicons name="calendar-outline" size={22} color={palette.primary} /></View><View style={styles.pageIntroCopy}><Text style={styles.pageIntroTitle}>{t.sessionsTitle}</Text><Text style={styles.pageIntroText}>{t.sessionsSubtitle}</Text></View><Pressable accessibilityLabel={t.managePlan} style={styles.headerButton} onPress={onManage}><Ionicons name="options-outline" size={20} color={palette.primary} /></Pressable></View>
    <View style={styles.summaryGrid}><SummaryItem label={t.todaySessions} value={String(todaySessions.length)} styles={styles} /><SummaryItem label={t.completed} value={String(completed)} styles={styles} /><SummaryItem label={t.remaining} value={String(remaining)} styles={styles} /><SummaryItem label={t.readingTime} value={`${readingMinutes} ${t.minutes}`} styles={styles} /></View>
    <Segmented value={filter} options={[['today', t.today], ['upcoming', t.upcoming], ['history', t.history], ['all', t.all]]} styles={styles} onChange={onFilter} />
    {visible.map((session) => <View style={styles.sessionCard} key={session.id}><View style={styles.sessionTime}><Text style={styles.sessionTimeValue}>{session.time}</Text><Text style={styles.sessionTimeLabel}>{t.today}</Text></View><View style={styles.sessionBody}><View style={styles.sessionTitleRow}><Text style={styles.sessionTitle}>{sessionName(session, language)}</Text><StatusPill status={session.status} t={t} styles={styles} /></View><Text style={styles.cardMeta}>{session.duration} {t.minutes} · {t.page} {session.page}</Text><View style={styles.inlineActions}>{['scheduled', 'paused', 'in_progress'].includes(session.status) && <SmallButton label={session.status === 'scheduled' ? t.start : t.resume} primary styles={styles} onPress={() => onStart(session)} />}{session.status === 'scheduled' && <SmallButton label={t.postpone} styles={styles} onPress={() => onPostpone(session)} />}</View></View></View>)}
  </ScrollView>
}

function StatsScreen({ t, language, styles, palette, progress, statistics, days, selectedDay, onSelectDay }: { t: typeof copy.ar | typeof copy.en; language: Language; styles: Styles; palette: Palette; progress: number; statistics: MobileStatistics; days: typeof weekly; selectedDay: typeof weekly[number]; onSelectDay: (day: typeof weekly[number]) => void }) {
  const totalSessions = statistics.completedSessions + statistics.incompleteSessions
  const completionRate = totalSessions ? Math.round(statistics.completedSessions / totalSessions * 100) : 0
  const today = days.at(-1)?.minutes ?? 0
  const yesterday = days.at(-2)?.minutes ?? 0
  const comparison = yesterday ? Math.round((today - yesterday) / yesterday * 100) : today ? 100 : 0
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.statsHero}><View style={styles.statsHeroCopy}><Text style={styles.statsKicker}>{t.statsTitle}</Text><Text style={styles.statsTitle}>{t.statsSubtitle}</Text></View><CircularProgress value={progress} size={98} strokeWidth={8} trackColor="rgba(255,255,255,0.18)" progressColor="#FFFFFF" textColor="#FFFFFF" label={t.khatmaProgress} labelColor="rgba(255,255,255,0.66)" /></View>
    <View style={styles.statsMetrics}><Metric icon="checkmark-circle-outline" value={String(statistics.completedSessions)} label={t.completedSessions} styles={styles} palette={palette} /><Metric icon="time-outline" value={String(statistics.totalMinutes)} label={t.totalReadingTime} styles={styles} palette={palette} /><Metric icon="book-outline" value={String(statistics.approximatePages)} label={t.pagesRead} styles={styles} palette={palette} /><Metric icon="calendar-outline" value={String(statistics.readingDays)} label={t.readingDays} styles={styles} palette={palette} /></View>
    <SectionHeader title={t.weeklyActivity} action={`${comparison >= 0 ? '+' : ''}${comparison}% ${t.comparedYesterday}`} styles={styles} />
    <View style={styles.chartPanel}><View style={styles.chartSelected}><Text style={styles.chartSelectedText}>{language === 'ar' ? selectedDay.nameAr : selectedDay.nameEn} · {selectedDay.minutes} {t.minutes}</Text></View><WeeklyChart days={days} language={language} selectedDay={selectedDay} onSelectDay={onSelectDay} styles={styles} palette={palette} /><Text style={styles.weekTotal}>{t.weekTotal}: {days.reduce((sum, day) => sum + day.minutes, 0)} {t.minutes}</Text></View>
    <View style={styles.breakdownCard}><View><Text style={styles.cardTitle}>{t.sessionDetails}</Text><View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: palette.primary }]} /><Text style={styles.cardMeta}>{t.completed} {statistics.completedSessions}</Text></View><View style={styles.legendRow}><View style={[styles.legendDot, { backgroundColor: palette.line }]} /><Text style={styles.cardMeta}>{t.incomplete} {statistics.incompleteSessions}</Text></View></View><CircularProgress value={completionRate} size={92} strokeWidth={9} trackColor={palette.line} progressColor={palette.primary} textColor={palette.ink} label={t.complete} labelColor={palette.muted} /></View>
    <InfoRow icon="location-outline" title={t.lastPosition} detail={`${language === 'ar' ? 'سورة البقرة' : 'Surah Al-Baqarah'} · ${t.verse} 203 · ${t.page} 32`} styles={styles} palette={palette} />
    <InfoRow icon="bulb-outline" title={t.improvement} detail={t.improvementText} styles={styles} palette={palette} />
  </ScrollView>
}

function MoreScreen(props: { route: MoreRoute; setRoute: (route: MoreRoute) => void; t: typeof copy.ar | typeof copy.en; profile: WirdProfile; backendStatus: BackendStatus; onSignOut: () => Promise<void>; language: Language; setLanguage: (lang: Language) => void; styles: Styles; palette: Palette; darkMode: boolean; setDarkMode: (value: boolean) => void; sessions: WirdSession[]; setSessions: Dispatch<SetStateAction<WirdSession[]>>; planSessions: WirdSession[]; setPlanSessions: Dispatch<SetStateAction<WirdSession[]>>; editingSession: WirdSession | null; setEditingSession: (session: WirdSession | null) => void; currentPage: number; planStartPage: number; onSavePlan: (sessions: WirdSession[]) => Promise<void>; fontSize: number; setFontSize: (value: number) => void; mushafZoom: number; setMushafZoom: (value: number) => void; pageMode: 'auto' | 'single' | 'spread'; setPageMode: (value: 'auto' | 'single' | 'spread') => void; fitMode: 'height' | 'width' | 'custom'; setFitMode: (value: 'height' | 'width' | 'custom') => void; ayahNumbers: boolean; setAyahNumbers: (value: boolean) => void; spiritualCards: boolean; setSpiritualCards: (value: boolean) => void; smartSuggestions: boolean; setSmartSuggestions: (value: boolean) => void; notifications: boolean; setNotifications: (value: boolean) => void; spiritualAudio: boolean; setSpiritualAudio: (value: boolean) => void; preSessionAlert: boolean; setPreSessionAlert: (value: boolean) => void; backupMessage: string | null; onBackup: (action: 'create' | 'restore') => Promise<void> }) {
  const { route, setRoute, t, language, setLanguage, styles, palette } = props
  if (route === 'settings') return <SettingsScreen {...props} />
  if (route === 'plan') return <PlanScreen {...props} />
  if (route === 'backup') return <BackupScreen t={t} styles={styles} palette={palette} backupMessage={props.backupMessage} onBack={() => setRoute('main')} onBackup={props.onBackup} />
  if (route === 'about') return <AboutScreen t={t} styles={styles} palette={palette} onBack={() => setRoute('main')} />
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <View style={styles.profileCard}><View style={styles.profileLarge}><Text style={styles.profileLargeText}>{props.profile.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.profileCopy}><Text style={styles.pageIntroTitle}>{props.profile.name}</Text><Text style={styles.pageIntroText}>{props.backendStatus.ready ? `${props.backendStatus.quranAyahs} ${language === 'ar' ? `آية · ${props.backendStatus.bundledSources} مصادر سطح مكتب` : `ayahs · ${props.backendStatus.bundledSources} desktop sources`}` : (language === 'ar' ? 'المصدر المحلي غير جاهز' : 'Local source unavailable')}</Text></View></View>
    <Text style={styles.groupTitle}>{t.planAndReading}</Text>
    <MenuRow icon="calendar-outline" title={t.managePlan} styles={styles} palette={palette} onPress={() => setRoute('plan')} />
    <MenuRow icon="settings-outline" title={t.settings} styles={styles} palette={palette} onPress={() => setRoute('settings')} />
    <MenuRow icon="cloud-download-outline" title={t.backup} styles={styles} palette={palette} onPress={() => setRoute('backup')} />
    <MenuRow icon="information-circle-outline" title={t.about} styles={styles} palette={palette} onPress={() => setRoute('about')} />
    <Text style={styles.groupTitle}>{t.language}</Text>
    <Segmented value={language} options={[['ar', t.arabic], ['en', t.english]]} styles={styles} onChange={setLanguage} />
    <Pressable style={styles.dangerButton} onPress={() => void props.onSignOut()}><Ionicons name="log-out-outline" size={18} color={palette.danger} /><Text style={styles.dangerText}>{language === 'ar' ? 'تسجيل الخروج' : 'Sign out'}</Text></Pressable>
  </ScrollView>
}

function SettingsScreen(props: Parameters<typeof MoreScreen>[0]) {
  const { t, styles, palette, darkMode, setDarkMode, fontSize, setFontSize, mushafZoom, setMushafZoom, pageMode, setPageMode, fitMode, setFitMode, ayahNumbers, setAyahNumbers, spiritualCards, setSpiritualCards, smartSuggestions, setSmartSuggestions, notifications, setNotifications, spiritualAudio, setSpiritualAudio, preSessionAlert, setPreSessionAlert, setRoute, planStartPage, planSessions } = props
  const plannedCount = planSessions.filter((session) => session.enabled).length || 3
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
    <SubpageHeader title={t.settings} subtitle={t.settingsSubtitle} styles={styles} palette={palette} onBack={() => setRoute('main')} />
    <View style={styles.currentPlanCard}><View style={styles.pageIntroIcon}><Ionicons name="information-circle-outline" size={20} color={palette.primary} /></View><View style={styles.positionCopy}><Text style={styles.cardTitle}>{props.language === 'ar' ? 'خطة الورد الحالية' : 'Current Wird plan'}</Text><Text style={styles.cardMeta}>{props.language === 'ar' ? `نقطة البداية: الصفحة ${planStartPage} · ${plannedCount} جلسات يوميًا` : `Starting point: page ${planStartPage} · ${plannedCount} sessions daily`}</Text></View><Pressable style={styles.headerButton} onPress={() => setRoute('plan')}><Ionicons name="pencil-outline" size={18} color={palette.primary} /></Pressable></View>
    <Text style={styles.groupTitle}>{t.appearanceReading}</Text>
    <SettingSwitch icon={darkMode ? 'moon-outline' : 'sunny-outline'} title={darkMode ? t.darkMode : t.lightMode} value={darkMode} styles={styles} palette={palette} onChange={setDarkMode} />
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
      <Pressable style={styles.saveBar} onPress={() => { void onSavePlan(plannedSessions) }}><Ionicons name="save-outline" size={18} color="#FFFFFF" /><Text style={styles.saveBarText}>{t.savePlan}</Text></Pressable>
      {backupMessage && <View style={styles.successBanner}><Ionicons name="checkmark-circle" size={19} color={palette.success} /><Text style={styles.successText}>{backupMessage}</Text></View>}
    </ScrollView>
    <Sheet visible={Boolean(editingSession)} title={t.edit} styles={styles} onClose={() => setEditingSession(null)}>
      {editingSession && <View style={styles.formFields}><Text style={styles.fieldLabel}>{t.sessionName}</Text><TextInput style={styles.textInput} value={language === 'ar' ? editingSession.nameAr : editingSession.nameEn} onChangeText={(value) => setEditingSession(language === 'ar' ? { ...editingSession, nameAr: value } : { ...editingSession, nameEn: value })} /><Text style={styles.fieldLabel}>{t.sessionTime}</Text><TextInput style={styles.textInput} value={editingSession.time} keyboardType="numbers-and-punctuation" onChangeText={(value) => setEditingSession({ ...editingSession, time: value })} /><StepperSetting icon="timer-outline" title={t.duration} value={`${editingSession.duration} ${t.minutes}`} onMinus={() => setEditingSession({ ...editingSession, duration: Math.max(5, editingSession.duration - 5) })} onPlus={() => setEditingSession({ ...editingSession, duration: Math.min(120, editingSession.duration + 5) })} styles={styles} palette={palette} /><Pressable style={styles.modalPrimary} onPress={saveEdited}><Text style={styles.modalPrimaryText}>{t.save}</Text></Pressable></View>}
    </Sheet>
  </View>
}

function BackupScreen({ t, styles, palette, backupMessage, onBack, onBackup }: { t: typeof copy.ar | typeof copy.en; styles: Styles; palette: Palette; backupMessage: string | null; onBack: () => void; onBackup: (action: 'create' | 'restore') => Promise<void> }) {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}><SubpageHeader title={t.backupTitle} subtitle={t.localPrivacyText} styles={styles} palette={palette} onBack={onBack} /><View style={styles.privacyBanner}><Ionicons name="shield-checkmark-outline" size={25} color={palette.primary} /><View style={styles.privacyCopy}><Text style={styles.cardTitle}>{t.localPrivacy}</Text><Text style={styles.cardMeta}>{t.localPrivacyText}</Text></View></View><BackupAction icon="download-outline" title={t.createBackup} description={t.backupIncludes} action={t.chooseSave} styles={styles} palette={palette} onPress={() => { void onBackup('create') }} /><BackupAction icon="cloud-upload-outline" title={t.restoreBackup} description={t.backupIncludes} action={t.chooseFile} styles={styles} palette={palette} onPress={() => { void onBackup('restore') }} />{backupMessage && <View style={styles.successBanner}><Ionicons name="checkmark-circle" size={19} color={palette.success} /><Text style={styles.successText}>{backupMessage}</Text></View>}</ScrollView>
}

function AboutScreen({ t, styles, palette, onBack }: { t: typeof copy.ar | typeof copy.en; styles: Styles; palette: Palette; onBack: () => void }) {
  return <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}><SubpageHeader title={t.aboutTitle} subtitle={t.version} styles={styles} palette={palette} onBack={onBack} /><View style={styles.aboutHero}><View style={styles.aboutMark}><Text style={styles.aboutMarkText}>{t.appName.slice(0, 1)}</Text></View><Text style={styles.aboutTitle}>{t.aboutTagline}</Text><Text style={styles.aboutText}>{t.aboutText}</Text></View><InfoRow icon="lock-closed-outline" title={t.privacy} detail={t.localPrivacyText} styles={styles} palette={palette} /><InfoRow icon="cloud-offline-outline" title={t.offline} detail={t.aboutText} styles={styles} palette={palette} /><InfoRow icon="heart-outline" title={t.consistency} detail={t.spiritualText} styles={styles} palette={palette} /></ScrollView>
}

function ReaderSheets({ sheet, setSheet, t, styles, palette, page, setPage, jumpPage, setJumpPage, selectedVerse, bookmarks, setBookmarks, onFinished, onFinishSession }: { sheet: 'jump' | 'tafsir' | 'bookmarks' | 'complete' | null; setSheet: (sheet: 'jump' | 'tafsir' | 'bookmarks' | 'complete' | null) => void; t: typeof copy.ar | typeof copy.en; styles: Styles; palette: Palette; page: number; setPage: (page: number) => void; jumpPage: string; setJumpPage: (value: string) => void; selectedVerse: number; bookmarks: number[]; setBookmarks: Dispatch<SetStateAction<number[]>>; onFinished: () => void; onFinishSession: () => void }) {
  return <>
    <Sheet visible={sheet === 'jump'} title={t.quickJump} styles={styles} onClose={() => setSheet(null)}><Text style={styles.fieldLabel}>{t.jumpPage}</Text><View style={styles.jumpRow}><TextInput value={jumpPage} onChangeText={setJumpPage} keyboardType="number-pad" style={styles.textInput} /><Pressable style={styles.modalPrimary} onPress={() => { setPage(Math.max(1, Math.min(604, Number(jumpPage) || page))); setSheet(null) }}><Text style={styles.modalPrimaryText}>{t.go}</Text></Pressable></View><SheetAction icon="return-down-back-outline" label={`${t.lastWirdPosition} · ${t.page} 32`} styles={styles} palette={palette} onPress={() => { setPage(32); setSheet(null) }} /></Sheet>
    <Sheet visible={sheet === 'tafsir'} title={t.tafsirTitle} subtitle={`${t.surahAlFurqan} · ${t.verse} ${selectedVerse}`} styles={styles} onClose={() => setSheet(null)}><View style={styles.tafsirBanner}><Ionicons name="book-outline" size={19} color={palette.primary} /><Text style={styles.tafsirBannerText}>{t.localOffline}</Text></View><Text style={styles.tafsirText}>{t.tafsirText}</Text><View style={styles.modalActions}><SmallButton label={t.previousVerse} styles={styles} onPress={() => undefined} /><SmallButton label={t.nextVerse} primary styles={styles} onPress={() => undefined} /></View></Sheet>
    <Sheet visible={sheet === 'bookmarks'} title={t.bookmarks} styles={styles} onClose={() => setSheet(null)}>{bookmarks.length === 0 ? <Text style={styles.emptyText}>{t.noBookmarks}</Text> : bookmarks.map((verse) => <View style={styles.bookmarkRow} key={verse}><Pressable style={styles.bookmarkCopy} onPress={() => setSheet(null)}><Text style={styles.cardTitle}>{t.surahAlFurqan}</Text><Text style={styles.cardMeta}>{t.verse} {verse} · {t.page} 362</Text></Pressable><Pressable accessibilityLabel={t.removeBookmark} style={styles.headerButton} onPress={() => setBookmarks((current) => current.filter((item) => item !== verse))}><Ionicons name="trash-outline" size={18} color={palette.danger} /></Pressable></View>)}</Sheet>
    <Sheet visible={sheet === 'complete'} title={t.finishSession} styles={styles} onClose={() => setSheet(null)}><View style={styles.completeIcon}><Ionicons name="checkmark" size={32} color="#FFFFFF" /></View><Text style={styles.completeTitle}>{t.selectEnd}</Text><Text style={styles.completeText}>{t.surahAlFurqan} · {t.verse} {selectedVerse}</Text><Pressable style={styles.modalPrimary} onPress={onFinishSession}><Text style={styles.modalPrimaryText}>{t.finishHere}</Text></Pressable><Pressable style={styles.modalGhost} onPress={onFinished}><Text style={styles.modalGhostText}>{t.cancel}</Text></Pressable></Sheet>
  </>
}

function TabBar({ active, t, styles, palette, onChange }: { active: TabId; t: typeof copy.ar | typeof copy.en; styles: Styles; palette: Palette; onChange: (tab: TabId) => void }) {
  const labels: Record<TabId, string> = { home: t.home, reader: t.reader, sessions: t.sessions, stats: t.stats, more: t.more }
  return <View style={styles.tabBar}>{tabItems.map((item) => { const selected = item.id === active; return <Pressable key={item.id} accessibilityRole="tab" accessibilityState={{ selected }} accessibilityLabel={labels[item.id]} style={[styles.tabItem, selected && styles.tabItemActive]} onPress={() => onChange(item.id)}><Ionicons name={selected ? item.activeIcon : item.icon} size={selected ? 30 : 27} color={selected ? palette.primary : palette.muted} />{selected && <Text style={styles.tabLabel}>{labels[item.id]}</Text>}</Pressable> })}</View>
}

function CircularProgress({ value, size, strokeWidth, trackColor, progressColor, textColor, label, labelColor }: { value: number; size: number; strokeWidth: number; trackColor: string; progressColor: string; textColor: string; label: string; labelColor: string }) {
  const normalized = Math.min(100, Math.max(0, value)); const radius = (size - strokeWidth) / 2; const circumference = 2 * Math.PI * radius
  return <View accessibilityLabel={`${label} ${normalized}%`} style={{ width: size, height: size }}><Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}><Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" /><Circle cx={size / 2} cy={size / 2} r={radius} stroke={progressColor} strokeWidth={strokeWidth} strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference - normalized / 100 * circumference} strokeLinecap="round" fill="none" /></Svg><View style={ringStyles.center}><Text style={[ringStyles.value, { color: textColor }]}>{normalized}%</Text><Text style={[ringStyles.label, { color: labelColor }]} numberOfLines={1}>{label}</Text></View></View>
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

function Sheet({ visible, title, subtitle, styles, onClose, children }: { visible: boolean; title: string; subtitle?: string; styles: Styles; onClose: () => void; children: ReactNode }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><Pressable style={styles.sheetBackdrop} onPress={onClose}><Pressable style={styles.sheet} onPress={() => undefined}><View style={styles.sheetHandle} /><View style={styles.sheetHeader}><View style={styles.sheetHeaderCopy}><Text style={styles.sheetTitle}>{title}</Text>{subtitle && <Text style={styles.sheetSubtitle}>{subtitle}</Text>}</View><Pressable accessibilityLabel="Close" style={styles.sheetClose} onPress={onClose}><Ionicons name="close" size={20} color={styles.sheetTitle.color as string} /></Pressable></View>{children}</Pressable></Pressable></Modal>
}

function SheetAction({ icon, label, styles, palette, onPress }: { icon: IconName; label: string; styles: Styles; palette: Palette; onPress: () => void }) { return <Pressable style={styles.sheetAction} onPress={onPress}><View style={styles.sheetActionIcon}><Ionicons name={icon} size={19} color={palette.primary} /></View><Text style={styles.sheetActionText}>{label}</Text><Ionicons name="chevron-back" size={18} color={palette.muted} /></Pressable> }
function ToolbarButton({ icon, label, count, styles, palette, onPress }: { icon: IconName; label: string; count?: number; styles: Styles; palette: Palette; onPress: () => void }) { return <Pressable style={styles.toolbarButton} onPress={onPress}><View style={styles.toolbarIconWrap}><Ionicons name={icon} size={18} color={palette.primary} />{Boolean(count) && <View style={styles.toolbarCount}><Text style={styles.toolbarCountText}>{count}</Text></View>}</View><Text style={styles.toolbarLabel}>{label}</Text></Pressable> }
function Metric({ icon, value, label, styles, palette }: { icon: IconName; value: string; label: string; styles: Styles; palette: Palette }) { return <View style={styles.metric}><View style={styles.metricIcon}><Ionicons name={icon} size={18} color={palette.primary} /></View><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel} numberOfLines={2}>{label}</Text></View> }
function SectionHeader({ title, action, styles }: { title: string; action?: string; styles: Styles }) { return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action && <Text style={styles.sectionAction}>{action}</Text>}</View> }
function SummaryItem({ label, value, styles }: { label: string; value: string; styles: Styles }) { return <View style={styles.summaryItem}><Text style={styles.summaryValue}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View> }
function SmallButton({ label, primary, styles, onPress }: { label: string; primary?: boolean; styles: Styles; onPress: () => void }) { return <Pressable style={[styles.smallButton, primary && styles.smallButtonPrimary]} onPress={onPress}><Text style={[styles.smallButtonText, primary && styles.smallButtonTextPrimary]}>{label}</Text></Pressable> }
function StatusPill({ status, t, styles }: { status: SessionStatus; t: typeof copy.ar | typeof copy.en; styles: Styles }) { const labels: Record<SessionStatus, string> = { scheduled: t.scheduled, in_progress: t.inProgress, paused: t.paused, completed: t.completed, ended_early: t.endedEarly, skipped: t.missed }; return <View style={[styles.statusPill, status === 'completed' && styles.statusDone, status === 'in_progress' && styles.statusActive]}><Text style={styles.statusText}>{labels[status]}</Text></View> }
function InfoRow({ icon, title, detail, styles, palette }: { icon: IconName; title: string; detail: string; styles: Styles; palette: Palette }) { return <View style={styles.infoRow}><View style={styles.pageIntroIcon}><Ionicons name={icon} size={20} color={palette.primary} /></View><View style={styles.infoCopy}><Text style={styles.cardTitle}>{title}</Text><Text style={styles.cardMeta}>{detail}</Text></View></View> }
function MenuRow({ icon, title, styles, palette, onPress }: { icon: IconName; title: string; styles: Styles; palette: Palette; onPress: () => void }) { return <Pressable style={styles.menuRow} onPress={onPress}><View style={styles.pageIntroIcon}><Ionicons name={icon} size={20} color={palette.primary} /></View><Text style={styles.menuTitle}>{title}</Text><Ionicons name="chevron-back" size={19} color={palette.muted} /></Pressable> }
function SubpageHeader({ title, subtitle, styles, palette, onBack }: { title: string; subtitle: string; styles: Styles; palette: Palette; onBack: () => void }) { return <View style={styles.subpageHeader}><Pressable accessibilityLabel="Back" style={styles.headerButton} onPress={onBack}><Ionicons name="chevron-forward" size={20} color={palette.primary} /></Pressable><View style={styles.subpageCopy}><Text style={styles.pageIntroTitle}>{title}</Text><Text style={styles.pageIntroText}>{subtitle}</Text></View></View> }
function SettingSwitch({ icon, title, value, styles, palette, onChange }: { icon: IconName; title: string; value: boolean; styles: Styles; palette: Palette; onChange: (value: boolean) => void }) { return <View style={styles.settingRow}><View style={styles.pageIntroIcon}><Ionicons name={icon} size={19} color={palette.primary} /></View><Text style={styles.settingTitle}>{title}</Text><Switch value={value} onValueChange={onChange} trackColor={{ false: palette.line, true: palette.primaryMuted }} thumbColor={value ? palette.primary : palette.muted} /></View> }
function StepperSetting({ icon, title, value, onMinus, onPlus, styles, palette }: { icon: IconName; title: string; value: string; onMinus: () => void; onPlus: () => void; styles: Styles; palette: Palette }) { return <View style={styles.settingRow}><View style={styles.pageIntroIcon}><Ionicons name={icon} size={19} color={palette.primary} /></View><Text style={styles.settingTitle}>{title}</Text><View style={styles.stepper}><Pressable style={styles.stepButton} onPress={onMinus}><Ionicons name="remove" size={17} color={palette.primary} /></Pressable><Text style={styles.stepValue}>{value}</Text><Pressable style={styles.stepButton} onPress={onPlus}><Ionicons name="add" size={17} color={palette.primary} /></Pressable></View></View> }
function SettingChoice<T extends string>({ title, value, options, styles, onChange }: { title: string; value: T; options: Array<[T, string]>; styles: Styles; onChange: (value: T) => void }) { return <View style={styles.settingChoice}><Text style={styles.settingChoiceTitle}>{title}</Text><Segmented value={value} options={options} styles={styles} onChange={onChange} /></View> }
function Segmented<T extends string>({ value, options, styles, onChange }: { value: T; options: Array<[T, string]>; styles: Styles; onChange: (value: T) => void }) { return <View style={styles.segmented}>{options.map(([id, label]) => <Pressable key={id} style={[styles.segment, value === id && styles.segmentActive]} onPress={() => onChange(id)}><Text style={[styles.segmentText, value === id && styles.segmentTextActive]} numberOfLines={1}>{label}</Text></Pressable>)}</View> }
function BackupAction({ icon, title, description, action, styles, palette, onPress }: { icon: IconName; title: string; description: string; action: string; styles: Styles; palette: Palette; onPress: () => void }) { return <View style={styles.backupCard}><View style={styles.backupIcon}><Ionicons name={icon} size={26} color={palette.primary} /></View><Text style={styles.backupTitle}>{title}</Text><Text style={styles.backupText}>{description}</Text><Pressable style={styles.modalPrimary} onPress={onPress}><Text style={styles.modalPrimaryText}>{action}</Text></Pressable></View> }
function sessionName(session: WirdSession, language: Language) { return language === 'ar' ? session.nameAr : session.nameEn }

type Styles = ReturnType<typeof makeStyles>

function makeStyles(p: Palette, rtl: boolean) {
  const row = rtl ? 'row-reverse' as const : 'row' as const
  const align = rtl ? 'right' as const : 'left' as const
  const writing = rtl ? 'rtl' as const : 'ltr' as const
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: p.background }, app: { flex: 1, backgroundColor: p.background }, flexScreen: { flex: 1 }, screen: { flex: 1 }, scrollContent: { paddingHorizontal: 17, paddingTop: 5, paddingBottom: 136 },
    header: { flexDirection: row, alignItems: 'center', gap: 9, paddingHorizontal: 17, paddingTop: Platform.OS === 'android' ? 15 : 9, paddingBottom: 13 },
    avatar: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryDeep, borderWidth: 3, borderColor: p.primaryMuted }, avatarText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
    headerCopy: { flex: 1, minWidth: 0 }, headerKicker: { color: p.muted, fontSize: 11, fontWeight: '600', textAlign: align, writingDirection: writing }, headerTitle: { color: p.ink, fontSize: 22, fontWeight: '800', lineHeight: 30, textAlign: align, writingDirection: writing },
    headerButton: { position: 'relative', width: 41, height: 41, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' }, notificationDot: { position: 'absolute', top: 7, right: 8, width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: p.surface, backgroundColor: p.gold },
    notificationToast: { position: 'absolute', zIndex: 20, top: 71, left: 17, right: 17, minHeight: 48, flexDirection: row, alignItems: 'center', gap: 9, paddingHorizontal: 13, borderRadius: 15, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 18 }, notificationToastText: { flex: 1, color: p.ink, fontSize: 12, textAlign: align, writingDirection: writing },
    nextStrip: { minHeight: 69, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: 18, backgroundColor: p.primaryMuted }, smallMuted: { color: p.muted, fontSize: 11, fontWeight: '500', textAlign: align, writingDirection: writing }, nextStripTitle: { marginTop: 2, color: p.primary, fontSize: 17, fontWeight: '800', textAlign: align }, timeChip: { flexDirection: row, alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 11, backgroundColor: p.surface }, timeChipText: { color: p.primary, fontSize: 12, fontWeight: '800', fontVariant: ['tabular-nums'] },
    heroCard: { marginTop: 13, padding: 16, borderRadius: 24, backgroundColor: p.primaryDeep, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 24, shadowOffset: { width: 0, height: 12 } }, heroTop: { flexDirection: row, alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }, heroKicker: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '600', textAlign: align }, heroTitle: { maxWidth: 230, marginTop: 2, color: '#FFFFFF', fontSize: 24, fontWeight: '800', lineHeight: 32, textAlign: align, writingDirection: writing }, partChip: { paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.11)' }, partChipText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
    heroProgress: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: 18, paddingHorizontal: 5 }, heroPosition: { flex: 1, marginStart: 18 }, heroSurah: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', lineHeight: 30, textAlign: align }, heroMeta: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '500', textAlign: align }, heroMetaRow: { flexDirection: row, alignItems: 'center', gap: 5, marginTop: 6 }, heroActions: { flexDirection: row, gap: 8, marginTop: 15 }, heroPrimary: { flex: 1, minHeight: 47, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, backgroundColor: '#FFFFFF' }, heroPrimaryText: { color: p.primaryDeep, fontSize: 13, fontWeight: '800' }, heroGhost: { width: 47, minHeight: 47, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)' },
    sectionHeader: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: 19, marginBottom: 9 }, sectionTitle: { flex: 1, color: p.ink, fontSize: 18, fontWeight: '800', lineHeight: 25, textAlign: align }, sectionAction: { color: p.primary, fontSize: 11, fontWeight: '700' },
    chartPanel: { minHeight: 236, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, chartSelected: { alignSelf: rtl ? 'flex-end' : 'flex-start', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: p.primaryMuted }, chartSelectedText: { color: p.primary, fontSize: 10, fontWeight: '800' }, weekChart: { height: 188, flexDirection: row, alignItems: 'flex-end', justifyContent: 'space-between', gap: 6, marginTop: 8 }, weekBarItem: { flex: 1, alignItems: 'center', gap: 8 }, weekTrack: { width: 20, height: 152, overflow: 'hidden', justifyContent: 'flex-end', borderRadius: 10, backgroundColor: p.primaryMuted }, weekFill: { width: '100%', borderRadius: 10, backgroundColor: '#8AAE9F' }, weekLabel: { color: p.muted, fontSize: 10 }, weekLabelActive: { color: p.primary, fontWeight: '900' }, weekTotal: { color: p.muted, fontSize: 10, textAlign: 'center' },
    metricRow: { flexDirection: row, gap: 8, marginTop: 12 }, metric: { flex: 1, minHeight: 108, padding: 11, borderRadius: 17, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, metricIcon: { width: 31, height: 31, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryMuted }, metricValue: { marginTop: 10, color: p.ink, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: align }, metricLabel: { marginTop: 2, color: p.muted, fontSize: 10, fontWeight: '500', lineHeight: 14, textAlign: align },
    goalRow: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: 15, borderRadius: 18, backgroundColor: p.elevated }, goalCopy: { flex: 1 }, cardTitle: { color: p.ink, fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: align, writingDirection: writing }, cardMeta: { marginTop: 3, color: p.muted, fontSize: 11, fontWeight: '500', lineHeight: 18, textAlign: align, writingDirection: writing },
    smartCard: { flexDirection: row, alignItems: 'flex-start', gap: 10, marginTop: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, smartIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryMuted }, smartCopy: { flex: 1 }, inlineActions: { flexDirection: row, alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 10 }, smallButton: { minHeight: 34, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 11, backgroundColor: p.primaryMuted }, smallButtonPrimary: { backgroundColor: p.primary }, smallButtonText: { color: p.primary, fontSize: 11, fontWeight: '800' }, smallButtonTextPrimary: { color: '#FFFFFF' }, dismissText: { color: p.muted, fontSize: 10 }, deleteText: { color: p.danger, fontSize: 11, fontWeight: '800' },
    spiritualCard: { flexDirection: row, alignItems: 'flex-start', gap: 10, marginTop: 12, padding: 14, borderRadius: 18, backgroundColor: p.primaryMuted }, spiritualCopy: { flex: 1 }, spiritualTitle: { color: p.primary, fontSize: 12, fontWeight: '900', textAlign: align }, spiritualText: { marginTop: 3, color: p.ink, fontSize: 12, lineHeight: 20, textAlign: align, writingDirection: writing },
    readerScreen: { flex: 1, paddingHorizontal: 14, paddingBottom: 116 }, readerStatus: { minHeight: 62, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 17, backgroundColor: p.primaryMuted }, compactPrimary: { minHeight: 37, flexDirection: row, alignItems: 'center', gap: 5, paddingHorizontal: 12, borderRadius: 12, backgroundColor: p.primary }, compactPrimaryText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
    focusBar: { minHeight: 64, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 11, borderRadius: 17, backgroundColor: p.primaryDeep }, focusLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 10, textAlign: align }, focusTitle: { marginTop: 2, color: '#FFFFFF', fontSize: 14, fontWeight: '900', textAlign: align }, focusActions: { flexDirection: row, alignItems: 'center', gap: 7 }, focusIcon: { width: 37, height: 37, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }, focusComplete: { minHeight: 37, flexDirection: row, alignItems: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#FFFFFF' }, focusCompleteText: { color: p.primary, fontSize: 10, fontWeight: '900' },
    readerToolbar: { flexDirection: row, gap: 7, marginVertical: 9 }, toolbarButton: { flex: 1, minHeight: 43, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 13, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, toolbarIconWrap: { position: 'relative' }, toolbarLabel: { color: p.ink, fontSize: 9, fontWeight: '800' }, toolbarCount: { position: 'absolute', top: -7, right: -8, minWidth: 14, height: 14, paddingHorizontal: 3, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: p.gold }, toolbarCountText: { color: '#FFFFFF', fontSize: 8, fontWeight: '900' },
    mushafPage: { flex: 1, overflow: 'hidden', borderRadius: 22, borderWidth: 1, borderColor: p.line, backgroundColor: dark === p ? p.elevated : '#FFFDF8' }, mushafHeader: { minHeight: 45, flexDirection: row, alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13, borderBottomWidth: 1, borderBottomColor: p.line }, mushafMeta: { color: p.muted, fontSize: 9 }, mushafTitle: { color: p.primary, fontSize: 14, fontWeight: '900' }, verses: { padding: 13 }, verseRow: { position: 'relative', padding: 8, borderRadius: 12 }, verseSelected: { backgroundColor: p.primaryMuted }, quranText: { color: p.ink, lineHeight: 47, textAlign: 'right', writingDirection: 'rtl', fontFamily: Platform.OS === 'ios' ? 'Geeza Pro' : undefined }, verseMeta: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, marginTop: 3 }, verseNumber: { minWidth: 25, color: p.gold, fontSize: 10, fontWeight: '900' },
    verseActions: { flexDirection: row, gap: 7, padding: 8, borderTopWidth: 1, borderTopColor: p.line, backgroundColor: p.surface }, verseAction: { flex: 1, minHeight: 38, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, backgroundColor: p.primaryMuted }, verseActionText: { color: p.primary, fontSize: 10, fontWeight: '800' }, verseActionPrimary: { flex: 1, minHeight: 38, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 12, backgroundColor: p.primary }, verseActionPrimaryText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
    pageNavigation: { minHeight: 55, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 9, paddingTop: 8 }, pageButton: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, pageCenter: { minWidth: 104, minHeight: 45, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: p.primaryMuted }, pageCenterLabel: { color: p.muted, fontSize: 8 }, pageCenterValue: { color: p.primary, fontSize: 12, fontWeight: '900' },
    pageIntro: { flexDirection: row, alignItems: 'center', gap: 10, marginBottom: 12 }, pageIntroIcon: { width: 40, height: 40, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: p.primaryMuted }, pageIntroCopy: { flex: 1 }, pageIntroTitle: { color: p.ink, fontSize: 20, fontWeight: '800', lineHeight: 28, textAlign: align }, pageIntroText: { marginTop: 2, color: p.muted, fontSize: 11, fontWeight: '500', lineHeight: 17, textAlign: align, writingDirection: writing },
    summaryGrid: { flexDirection: row, flexWrap: 'wrap', overflow: 'hidden', marginBottom: 12, borderRadius: 17, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, summaryItem: { width: '50%', minHeight: 65, justifyContent: 'center', paddingHorizontal: 13, borderBottomWidth: 1, borderRightWidth: 1, borderColor: p.line }, summaryValue: { color: p.ink, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'], textAlign: align }, summaryLabel: { color: p.muted, fontSize: 10, fontWeight: '500', textAlign: align },
    segmented: { flexDirection: row, gap: 3, padding: 3, borderRadius: 13, backgroundColor: p.elevated }, segment: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderRadius: 10 }, segmentActive: { backgroundColor: p.surface, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 7 }, segmentText: { color: p.muted, fontSize: 10, fontWeight: '800' }, segmentTextActive: { color: p.primary },
    sessionCard: { flexDirection: row, alignItems: 'stretch', gap: 11, marginTop: 10, padding: 12, borderRadius: 17, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, sessionTime: { width: 62, minHeight: 69, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: p.primaryMuted }, sessionTimeValue: { color: p.primary, fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'] }, sessionTimeLabel: { marginTop: 2, color: p.muted, fontSize: 9, fontWeight: '500' }, sessionBody: { flex: 1 }, sessionTitleRow: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 6 }, sessionTitle: { flex: 1, color: p.ink, fontSize: 15, fontWeight: '700', lineHeight: 22, textAlign: align }, statusPill: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 9, backgroundColor: p.elevated }, statusActive: { backgroundColor: p.primaryMuted }, statusDone: { backgroundColor: p.primaryMuted }, statusText: { color: p.primary, fontSize: 9, fontWeight: '700' },
    statsHero: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderRadius: 22, backgroundColor: p.primaryDeep }, statsHeroCopy: { flex: 1 }, statsKicker: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', textAlign: align }, statsTitle: { marginTop: 5, color: 'rgba(255,255,255,0.67)', fontSize: 11, lineHeight: 18, textAlign: align, writingDirection: writing }, statsMetrics: { flexDirection: row, flexWrap: 'wrap', gap: 8, marginTop: 11 }, breakdownCard: { flexDirection: row, alignItems: 'center', justifyContent: 'space-between', marginTop: 12, padding: 15, borderRadius: 18, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, legendRow: { flexDirection: row, alignItems: 'center', gap: 6, marginTop: 6 }, legendDot: { width: 8, height: 8, borderRadius: 4 },
    infoRow: { flexDirection: row, alignItems: 'center', gap: 10, minHeight: 69, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: p.line }, infoCopy: { flex: 1 },
    profileCard: { flexDirection: row, alignItems: 'center', gap: 12, padding: 15, borderRadius: 18, backgroundColor: p.primaryMuted }, profileLarge: { width: 55, height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: p.primaryDeep }, profileLargeText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' }, profileCopy: { flex: 1 }, groupTitle: { marginTop: 20, marginBottom: 8, color: p.muted, fontSize: 11, fontWeight: '700', textAlign: align, textTransform: 'uppercase' }, menuRow: { minHeight: 63, flexDirection: row, alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: p.line }, menuTitle: { flex: 1, color: p.ink, fontSize: 15, fontWeight: '700', textAlign: align }, currentPlanCard: { minHeight: 88, flexDirection: row, alignItems: 'center', gap: 10, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface },
    subpageHeader: { flexDirection: row, alignItems: 'center', gap: 10, marginBottom: 13 }, subpageCopy: { flex: 1 }, settingRow: { minHeight: 65, flexDirection: row, alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: p.line }, settingTitle: { flex: 1, color: p.ink, fontSize: 13, fontWeight: '800', textAlign: align }, stepper: { flexDirection: 'row', alignItems: 'center', gap: 7 }, stepButton: { width: 31, height: 31, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: p.primaryMuted }, stepValue: { minWidth: 42, color: p.ink, fontSize: 11, fontWeight: '900', textAlign: 'center' }, settingChoice: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: p.line }, settingChoiceTitle: { marginBottom: 8, color: p.ink, fontSize: 12, fontWeight: '800', textAlign: align }, dangerButton: { minHeight: 48, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 18, borderRadius: 14, backgroundColor: `${p.danger}12` }, dangerText: { color: p.danger, fontSize: 12, fontWeight: '900' },
    positionCard: { flexDirection: row, alignItems: 'center', gap: 10, padding: 13, borderRadius: 17, backgroundColor: p.primaryMuted }, positionCopy: { flex: 1 }, planCard: { marginBottom: 10, padding: 13, borderRadius: 18, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, planCardDisabled: { opacity: 0.62 }, planTop: { flexDirection: row, alignItems: 'center', gap: 9 }, planNumber: { width: 37, height: 37, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: p.primary }, planNumberText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' }, planCopy: { flex: 1 }, planDetails: { flexDirection: row, flexWrap: 'wrap', gap: 6, marginTop: 10 }, planDetail: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, backgroundColor: p.elevated, color: p.muted, fontSize: 9 }, addButton: { minHeight: 48, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: p.primary, backgroundColor: p.primaryMuted }, addButtonText: { color: p.primary, fontSize: 12, fontWeight: '900' }, saveBar: { minHeight: 50, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderRadius: 14, backgroundColor: p.primary }, saveBarText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
    privacyBanner: { flexDirection: row, alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 17, backgroundColor: p.primaryMuted }, privacyCopy: { flex: 1 }, backupCard: { marginTop: 12, padding: 16, borderRadius: 19, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface }, backupIcon: { width: 47, height: 47, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: p.primaryMuted }, backupTitle: { marginTop: 12, color: p.ink, fontSize: 17, fontWeight: '900', textAlign: align }, backupText: { marginTop: 5, color: p.muted, fontSize: 11, lineHeight: 18, textAlign: align, writingDirection: writing }, successBanner: { minHeight: 48, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 12, borderRadius: 14, backgroundColor: p.primaryMuted }, successText: { color: p.success, fontSize: 11, fontWeight: '900' },
    aboutHero: { alignItems: 'center', padding: 18, borderRadius: 20, backgroundColor: p.primaryDeep }, aboutMark: { width: 60, height: 60, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#FFFFFF' }, aboutMarkText: { color: p.primaryDeep, fontSize: 28, fontWeight: '900' }, aboutTitle: { marginTop: 13, color: '#FFFFFF', fontSize: 20, fontWeight: '900', textAlign: 'center' }, aboutText: { marginTop: 7, color: 'rgba(255,255,255,0.67)', fontSize: 11, lineHeight: 18, textAlign: 'center' },
    tabBar: { position: 'absolute', left: 10, right: 10, bottom: 11, minHeight: 76, flexDirection: row, alignItems: 'center', gap: 3, padding: 8, borderRadius: 24, borderWidth: 1, borderColor: p.line, backgroundColor: p.tab, shadowColor: p.shadow, shadowOpacity: 1, shadowRadius: 26, shadowOffset: { width: 0, height: 11 } }, tabItem: { flex: 0.72, minHeight: 58, flexDirection: row, alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 18 }, tabItemActive: { flex: 1.72, backgroundColor: p.primaryMuted }, tabLabel: { color: p.primary, fontSize: 12, fontWeight: '700' },
    ritualOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,27,20,0.90)' }, ritualMark: { width: 74, height: 74, alignItems: 'center', justifyContent: 'center', borderRadius: 25, backgroundColor: '#FFFFFF' }, ritualMarkText: { color: p.primaryDeep, fontSize: 33, fontWeight: '900' }, ritualText: { marginTop: 17, color: '#FFFFFF', fontSize: 17, fontWeight: '800' }, ritualCount: { marginTop: 10, color: p.gold, fontSize: 45, fontWeight: '900' },
    sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.36)' }, sheet: { maxHeight: '82%', paddingHorizontal: 17, paddingTop: 8, paddingBottom: 28, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: p.surface }, sheetHandle: { alignSelf: 'center', width: 38, height: 5, borderRadius: 3, backgroundColor: p.line }, sheetHeader: { flexDirection: row, alignItems: 'center', gap: 10, paddingVertical: 14 }, sheetHeaderCopy: { flex: 1 }, sheetTitle: { color: p.ink, fontSize: 18, fontWeight: '900', textAlign: align }, sheetSubtitle: { marginTop: 2, color: p.muted, fontSize: 10, textAlign: align }, sheetClose: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: p.elevated }, sheetAction: { minHeight: 61, flexDirection: row, alignItems: 'center', gap: 10, borderBottomWidth: 1, borderBottomColor: p.line }, sheetActionIcon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: p.primaryMuted }, sheetActionText: { flex: 1, color: p.ink, fontSize: 13, fontWeight: '800', textAlign: align },
    fieldLabel: { marginTop: 8, marginBottom: 5, color: p.muted, fontSize: 10, textAlign: align }, textInput: { minHeight: 44, flex: 1, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: p.line, color: p.ink, backgroundColor: p.elevated, textAlign: align }, formFields: { gap: 4 }, jumpRow: { flexDirection: row, gap: 8 }, modalPrimary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderRadius: 13, backgroundColor: p.primary }, modalPrimaryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' }, modalGhost: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 7 }, modalGhostText: { color: p.muted, fontSize: 11, fontWeight: '800' }, modalActions: { flexDirection: row, gap: 8, marginTop: 14 }, tafsirBanner: { flexDirection: row, alignItems: 'center', gap: 7, padding: 10, borderRadius: 12, backgroundColor: p.primaryMuted }, tafsirBannerText: { color: p.primary, fontSize: 10, fontWeight: '800' }, tafsirText: { marginTop: 12, color: p.ink, fontSize: 14, lineHeight: 27, textAlign: align, writingDirection: writing }, emptyText: { paddingVertical: 25, color: p.muted, fontSize: 12, textAlign: 'center' }, bookmarkRow: { minHeight: 65, flexDirection: row, alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: p.line }, bookmarkCopy: { flex: 1 }, completeIcon: { alignSelf: 'center', width: 61, height: 61, alignItems: 'center', justifyContent: 'center', borderRadius: 31, backgroundColor: p.primary }, completeTitle: { marginTop: 12, color: p.ink, fontSize: 17, fontWeight: '900', textAlign: 'center' }, completeText: { marginVertical: 9, color: p.muted, fontSize: 11, textAlign: 'center' },
  })
}
