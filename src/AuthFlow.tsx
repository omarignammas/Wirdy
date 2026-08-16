import { type ComponentProps, useMemo, useState } from 'react'
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { signIn, signUp, type WirdProfile } from './services/auth-service'
import type { Language } from './locales'
import { withCairoFont } from './font'

type Mode = 'onboarding' | 'signIn' | 'signUp'

const lightColors = { background: '#FFF8F2', surface: '#FFFFFF', elevated: '#F8FAF9', primary: '#10523B', primaryStrong: '#083F2D', primaryMuted: '#E8F2EE', ink: '#171A18', body: '#2A302D', muted: '#69736E', line: '#E1E7E4', placeholder: '#8A938E', danger: '#B54747', gold: '#C99A2E' }
const darkColors = { background: '#111A16', surface: '#18231E', elevated: '#202E28', primary: '#82CEAC', primaryStrong: '#79C4A3', primaryMuted: '#273B32', ink: '#F4F7F5', body: '#E2E9E5', muted: '#A9B5AF', line: '#31443B', placeholder: '#8FA098', danger: '#E0837F', gold: '#E7C968' }

const words = {
  ar: {
    name: 'الاسم الكامل', email: 'البريد الإلكتروني', password: 'كلمة المرور', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب',
    welcome: 'وِردك، كل يوم خطوة أقرب.', intro: 'خطط لجلساتك، تابع تقدمك، وافتح المصحف والتفسير من نفس مصادر سطح المكتب حتى دون اتصال.',
    continue: 'ابدأ الآن', haveAccount: 'لديك حساب؟', newAccount: 'مستخدم جديد؟', private: 'حساب محلي آمن. تبقى بياناتك على جهازك.',
    invalid: 'تحقق من البريد وكلمة المرور.', form: 'أدخل اسمًا صحيحًا وبريدًا صالحًا وكلمة مرور من 8 أحرف.', exists: 'يوجد حساب محلي بهذا البريد.',
    authTitle: 'تسجيل الدخول أو إنشاء حساب', local: 'متابعة بحساب محلي', editLater: 'يمكنك تعديل الاسم والصورة لاحقًا',
    plan: 'خطة ورد مرنة', reader: 'مصحف وتفسير', stats: 'إحصائيات هادئة',
  },
  en: {
    name: 'Full name', email: 'Email', password: 'Password', signIn: 'Sign in', signUp: 'Create account',
    welcome: 'Your Wird, one step closer every day.', intro: 'Plan sessions, track progress, and open the Mushaf and Tafsir from the same desktop sources, even offline.',
    continue: 'Get Started', haveAccount: 'Already have an account?', newAccount: 'New to Wird?', private: 'Secure local account. Your data stays on this device.',
    invalid: 'Check your email and password.', form: 'Enter a valid name and email, with an 8-character password.', exists: 'A local account already uses this email.',
    authTitle: 'Sign up or log in', local: 'Continue with local account', editLater: 'You can edit your name and photo later',
    plan: 'Flexible plan', reader: 'Mushaf and Tafsir', stats: 'Calm insights',
  },
}

export function AuthFlow({ initialMode = 'onboarding', language, darkMode, onLanguage, onAuthenticated }: { initialMode?: Mode; language: Language; darkMode: boolean; onLanguage: (language: Language) => void; onAuthenticated: (profile: WirdProfile) => void }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const t = words[language]
  const rtl = language === 'ar'
  const colors = darkMode ? darkColors : lightColors
  const styles = useMemo(() => makeStyles(colors, rtl), [colors, rtl])

  async function submit() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const profile = mode === 'signUp' ? await signUp(name, email, password) : await signIn(email, password)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      onAuthenticated(profile)
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : 'invalid'
      setError(code === 'exists' ? t.exists : ['name', 'email', 'password'].includes(code) ? t.form : t.invalid)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
    } finally {
      setBusy(false)
    }
  }

  return <SafeAreaView style={styles.safe}>
    <StatusBar barStyle={darkMode ? 'light-content' : 'dark-content'} />
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.topBar}>
        <Pressable accessibilityLabel="Language" style={({ pressed }) => [styles.roundButton, pressed && styles.pressed]} onPress={() => { void Haptics.selectionAsync(); onLanguage(language === 'ar' ? 'en' : 'ar') }}>
          <Ionicons name="language-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={mode === 'onboarding' ? styles.onboardingContent : styles.formContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mode === 'onboarding' ? <>
          <View style={styles.visualStage}>
            <MiniCard icon="calendar-outline" label={t.plan} styles={styles} colors={colors} position="top" />
            <MiniCard icon="book-outline" label={t.reader} styles={styles} colors={colors} position="left" />
            <MiniCard icon="bar-chart-outline" label={t.stats} styles={styles} colors={colors} position="right" />
            <Image source={require('../assets/wird-app-icon.png')} style={styles.logo} />
          </View>
          <View style={[styles.copy, rtl && styles.rtl]}>
            <Text style={styles.brand}>{language === 'ar' ? 'وِرد' : 'Wird'}</Text>
            <Text style={styles.title}>{t.welcome}</Text>
            <Text style={styles.subtitle}>{t.intro}</Text>
          </View>
          <View style={styles.bottomAction}>
            <Pressable style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('signUp') }}>
              <Text style={styles.primaryText}>{t.continue}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.link, pressed && styles.pressed]} onPress={() => { void Haptics.selectionAsync(); setMode('signIn') }}>
              <Text style={styles.linkMuted}>{t.haveAccount} </Text><Text style={styles.linkStrong}>{t.signIn}</Text>
            </Pressable>
          </View>
        </> : <>
          <Image source={require('../assets/wird-app-icon.png')} style={styles.formLogo} />
          <View style={[styles.copy, rtl && styles.rtl]}>
            <Text style={styles.title}>{t.authTitle}</Text>
            <Text style={styles.subtitle}>{t.private}</Text>
          </View>
          <View style={styles.authSwitch}>
            <AuthSwitchButton active={mode === 'signIn'} label={t.signIn} styles={styles} onPress={() => { setMode('signIn'); setError('') }} />
            <AuthSwitchButton active={mode === 'signUp'} label={t.signUp} styles={styles} onPress={() => { setMode('signUp'); setError('') }} />
          </View>
          <View style={styles.form}>
            {mode === 'signUp' && <Field icon="person-outline" label={t.name} value={name} onChangeText={setName} rtl={rtl} styles={styles} colors={colors} />}
            <Field icon="mail-outline" label={t.email} value={email} onChangeText={setEmail} rtl={rtl} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" styles={styles} colors={colors} />
            <Field icon="lock-closed-outline" label={t.password} value={password} onChangeText={setPassword} rtl={rtl} secureTextEntry textContentType={mode === 'signUp' ? 'newPassword' : 'password'} styles={styles} colors={colors} />
            {Boolean(error) && <View style={styles.errorBox}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={[styles.error, rtl && styles.textRight]}>{error}</Text></View>}
          </View>
          <View style={styles.bottomAction}>
            <Pressable disabled={busy} style={({ pressed }) => [styles.primary, pressed && !busy && styles.primaryPressed, busy && styles.disabled]} onPress={() => void submit()}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{mode === 'signIn' ? t.signIn : t.signUp}</Text>}
            </Pressable>
            <Text style={styles.footnote}>{t.editLater}</Text>
          </View>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
}

type AuthColors = typeof lightColors
type AuthStyles = ReturnType<typeof makeStyles>

function Field({ icon, label, rtl, styles, colors, ...props }: { icon: keyof typeof Ionicons.glyphMap; label: string; rtl: boolean; styles: AuthStyles; colors: AuthColors } & ComponentProps<typeof TextInput>) {
  return <View style={[styles.field, rtl && styles.rowReverse]}>
    <Ionicons name={icon} size={21} color={colors.muted} />
    <TextInput placeholder={label} placeholderTextColor={colors.placeholder} style={[styles.input, rtl && styles.textRight]} {...props} />
  </View>
}

function MiniCard({ icon, label, styles, colors, position }: { icon: keyof typeof Ionicons.glyphMap; label: string; styles: AuthStyles; colors: AuthColors; position: 'top' | 'left' | 'right' }) {
  return <View style={[styles.miniCard, position === 'top' && styles.miniTop, position === 'left' && styles.miniLeft, position === 'right' && styles.miniRight]}>
    <Ionicons name={icon} size={17} color={colors.primary} />
    <Text style={styles.miniText}>{label}</Text>
  </View>
}

function AuthSwitchButton({ active, label, styles, onPress }: { active: boolean; label: string; styles: AuthStyles; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} style={({ pressed }) => [styles.switchButton, active && styles.switchButtonActive, pressed && styles.pressed]} onPress={() => { void Haptics.selectionAsync(); onPress() }}>
    <Text style={[styles.switchText, active && styles.switchTextActive]}>{label}</Text>
  </Pressable>
}

function makeStyles(colors: AuthColors, rtl: boolean) {
  const align = rtl ? 'right' as const : 'left' as const
  return withCairoFont(StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    topBar: { minHeight: 56, alignItems: rtl ? 'flex-start' : 'flex-end', justifyContent: 'center', paddingHorizontal: 20 },
    roundButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface },
    onboardingContent: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
    formContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 18, paddingBottom: 24 },
    visualStage: { minHeight: 292, alignItems: 'center', justifyContent: 'center' },
    logo: { width: 136, height: 136, borderRadius: 36, shadowColor: colors.primaryStrong, shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 14 } },
    formLogo: { width: 88, height: 88, alignSelf: 'center', borderRadius: 24, marginBottom: 28 },
    miniCard: { position: 'absolute', minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 12, borderRadius: 15, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, shadowColor: '#000000', shadowOpacity: 0.06, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
    miniTop: { top: 18, alignSelf: 'center' },
    miniLeft: { left: -8, top: 125 },
    miniRight: { right: -8, bottom: 34 },
    miniText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
    copy: { alignItems: 'flex-start' },
    rtl: { alignItems: 'flex-end' },
    brand: { color: colors.primary, fontSize: 19, fontWeight: '900' },
    title: { marginTop: 8, color: colors.ink, fontSize: 34, lineHeight: 43, fontWeight: '900', textAlign: align, writingDirection: rtl ? 'rtl' : 'ltr' },
    subtitle: { marginTop: 12, color: colors.muted, fontSize: 16, fontWeight: '500', lineHeight: 25, textAlign: align, writingDirection: rtl ? 'rtl' : 'ltr' },
    bottomAction: { marginTop: 32, gap: 10 },
    primary: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 29, backgroundColor: colors.primaryStrong },
    primaryPressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
    primaryText: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
    disabled: { opacity: 0.58 },
    link: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    linkMuted: { color: colors.muted, fontSize: 14, fontWeight: '600' },
    linkStrong: { color: colors.primary, fontSize: 14, fontWeight: '900' },
    authSwitch: { flexDirection: 'row', gap: 8, marginTop: 24, padding: 4, borderRadius: 18, backgroundColor: colors.elevated },
    switchButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 15 },
    switchButtonActive: { backgroundColor: colors.surface, shadowColor: '#000000', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
    switchText: { color: colors.muted, fontSize: 14, fontWeight: '800' },
    switchTextActive: { color: colors.primary },
    form: { gap: 12, marginTop: 22 },
    field: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, borderWidth: 1, borderColor: colors.line, borderRadius: 18, backgroundColor: colors.surface },
    rowReverse: { flexDirection: 'row-reverse' },
    input: { flex: 1, minHeight: 48, color: colors.ink, fontSize: 16, fontWeight: '600' },
    textRight: { textAlign: 'right', writingDirection: 'rtl' },
    errorBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 15, backgroundColor: `${colors.danger}14` },
    error: { flex: 1, color: colors.danger, fontSize: 12, fontWeight: '700', lineHeight: 18 },
    footnote: { color: colors.muted, fontSize: 12, fontWeight: '600', textAlign: 'center' },
    pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  }))
}
