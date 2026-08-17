import { type ComponentProps, useMemo, useState } from 'react'
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { signIn, signUp, type WirdProfile } from './services/auth-service'
import type { Language } from './locales'
import { fontFamily, withAppFont } from './font'

type Mode = 'onboarding' | 'authChoice' | 'signIn' | 'signUp'

const lightColors = {
  background: '#FFF6EF', card: '#FFFFFF', cardSoft: '#F7EDE4', ink: '#0E4B36', body: '#315346', muted: '#756E66',
  line: '#DDD0C3', primary: '#0E4B36', primaryPressed: '#0A3D2C', pill: '#EAF4F0', danger: '#B54747',
  black: '#050505', blue: '#247BEF', shadow: 'rgba(38, 66, 53, 0.16)',
}
const darkColors = {
  background: '#111A16', card: '#1B2721', cardSoft: '#24342C', ink: '#ECF7F1', body: '#D8E6DF', muted: '#A9B5AF',
  line: '#31443B', primary: '#8FD3B1', primaryPressed: '#6CB990', pill: '#243A31', danger: '#E0837F',
  black: '#050505', blue: '#2D82F3', shadow: 'rgba(0, 0, 0, 0.32)',
}

const words = {
  ar: {
    name: 'الاسم الكامل', email: 'البريد الإلكتروني', password: 'كلمة المرور', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب',
    brand: 'وِرد', welcome: 'وِردك، كل يوم خطوة أقرب.', intro: 'جلسات هادئة، تذكير لطيف، مصحف وتفسير، وتتبع واضح حتى يبقى وردك قريبًا من يومك.',
    continue: 'ابدأ الآن', haveAccount: 'لديك حساب؟', newAccount: 'مستخدم جديد؟', private: 'حساب محلي آمن. تبقى بياناتك على جهازك.',
    invalid: 'تحقق من البريد وكلمة المرور.', form: 'أدخل اسمًا صحيحًا وبريدًا صالحًا وكلمة مرور من 8 أحرف.', exists: 'يوجد حساب محلي بهذا البريد.',
    authTitle: 'سجّل الدخول أو أنشئ حسابًا', local: 'تابع بحسابك المحلي', createLocal: 'أنشئ حسابًا جديدًا', useEmail: 'استخدم البريد الإلكتروني',
    editLater: 'يمكنك تعديل الاسم والصورة لاحقًا', plan: 'خطة ورد مرنة', reader: 'مصحف وتفسير', stats: 'إحصائيات هادئة', reminder: 'تذكير قبل الجلسة',
    back: 'رجوع',
  },
  en: {
    name: 'Full name', email: 'Email', password: 'Password', signIn: 'Sign in', signUp: 'Create account',
    brand: 'Wird', welcome: 'Your Wird, one step closer every day.', intro: 'A calm way to plan sessions, receive gentle reminders, read Quran and Tafsir, and keep your progress close.',
    continue: 'Get Started', haveAccount: 'Already have an account?', newAccount: 'New to Wird?', private: 'Secure local account. Your data stays on this device.',
    invalid: 'Check your email and password.', form: 'Enter a valid name and email, with an 8-character password.', exists: 'A local account already uses this email.',
    authTitle: 'Sign up or log in', local: 'Continue with local account', createLocal: 'Create a new account', useEmail: 'Use email address',
    editLater: 'You can edit your name and photo later', plan: 'Plan your Wird', reader: 'Mushaf and Tafsir', stats: 'Reading insights', reminder: 'Gentle reminders',
    back: 'Back',
  },
}

export function AuthFlow({ initialMode = 'onboarding', language, darkMode, onLanguage, onAuthenticated }: { initialMode?: Exclude<Mode, 'authChoice'>; language: Language; darkMode: boolean; onLanguage: (language: Language) => void; onAuthenticated: (profile: WirdProfile) => void }) {
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
      <View style={[styles.utilityBar, rtl && styles.rowReverse]}>
        {mode !== 'onboarding' ? <Pressable accessibilityLabel={t.back} hitSlop={hitSlop} style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]} onPress={() => { void Haptics.selectionAsync(); setMode(mode === 'authChoice' ? 'onboarding' : 'authChoice'); setError('') }}>
          <Ionicons name={rtl ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.primary} />
        </Pressable> : <View style={styles.utilityButtonGhost} />}
        <Pressable accessibilityLabel="Language" hitSlop={hitSlop} style={({ pressed }) => [styles.utilityButton, pressed && styles.pressed]} onPress={() => { void Haptics.selectionAsync(); onLanguage(language === 'ar' ? 'en' : 'ar') }}>
          <Text style={styles.langText}>{language === 'ar' ? 'EN' : 'ع'}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={mode === 'onboarding' ? styles.onboardingContent : styles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {mode === 'onboarding' && <>
          <View style={styles.visualStage}>
            <View style={styles.logoPlate}><Image source={require('../assets/wird-app-icon.png')} style={styles.logo} /></View>
          </View>
          <View style={[styles.heroCopy, rtl && styles.rtlCopy]}>
            <Text style={styles.brand}>{t.brand}</Text>
            <Text style={styles.headline}>{t.welcome}</Text>
            <Text style={styles.subtitle}>{t.intro}</Text>
          </View>
          <View style={styles.bottomAction}>
            <Pressable style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]} onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMode('authChoice') }}>
              <Text style={styles.primaryText}>{t.continue}</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.inlineLink, pressed && styles.pressed]} onPress={() => { void Haptics.selectionAsync(); setMode('signIn') }}>
              <Text style={styles.linkMuted}>{t.haveAccount} </Text><Text style={styles.linkStrong}>{t.signIn}</Text>
            </Pressable>
          </View>
        </>}

        {mode === 'authChoice' && <>
          <View style={styles.authSpacer} />
          <Text style={styles.authHeadline}>{t.authTitle}</Text>
          <View style={styles.authButtons}>
            <ChoiceButton icon="mail-outline" label={t.local} variant="outline" styles={styles} colors={colors} onPress={() => setMode('signIn')} />
            <ChoiceButton icon="person-add-outline" label={t.createLocal} variant="dark" styles={styles} colors={colors} onPress={() => setMode('signUp')} />
            <View style={styles.orRow}><View style={styles.orLine} /><Text style={styles.orText}>or</Text><View style={styles.orLine} /></View>
            <ChoiceButton icon="at-outline" label={t.useEmail} variant="soft" styles={styles} colors={colors} onPress={() => setMode('signIn')} />
          </View>
          <Text style={styles.authNote}>{t.private}</Text>
        </>}

        {(mode === 'signIn' || mode === 'signUp') && <>
          <View style={styles.formTop}>
            <Text style={styles.authHeadline}>{mode === 'signIn' ? t.signIn : t.signUp}</Text>
            <Text style={styles.subtitle}>{t.private}</Text>
          </View>
          <View style={styles.form}>
            {mode === 'signUp' && <Field icon="person-outline" label={t.name} value={name} onChangeText={setName} rtl={rtl} styles={styles} colors={colors} />}
            <Field icon="mail-outline" label={t.email} value={email} onChangeText={setEmail} rtl={rtl} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" styles={styles} colors={colors} />
            <Field icon="lock-closed-outline" label={t.password} value={password} onChangeText={setPassword} rtl={rtl} secureTextEntry textContentType={mode === 'signUp' ? 'newPassword' : 'password'} styles={styles} colors={colors} />
            {Boolean(error) && <View style={[styles.errorBox, rtl && styles.rowReverse]}><Ionicons name="alert-circle-outline" size={18} color={colors.danger} /><Text style={[styles.error, rtl && styles.textRight]}>{error}</Text></View>}
          </View>
          <View style={styles.bottomAction}>
            <Pressable disabled={busy} style={({ pressed }) => [styles.primary, pressed && !busy && styles.primaryPressed, busy && styles.disabled]} onPress={() => void submit()}>
              {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{mode === 'signIn' ? t.signIn : t.signUp}</Text>}
            </Pressable>
            <Pressable style={({ pressed }) => [styles.inlineLink, pressed && styles.pressed]} onPress={() => { void Haptics.selectionAsync(); setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError('') }}>
              <Text style={styles.linkMuted}>{mode === 'signIn' ? t.newAccount : t.haveAccount} </Text><Text style={styles.linkStrong}>{mode === 'signIn' ? t.signUp : t.signIn}</Text>
            </Pressable>
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
    <TextInput placeholder={label} placeholderTextColor={colors.muted} style={[styles.input, rtl && styles.textRight]} {...props} />
  </View>
}

function ChoiceButton({ icon, label, variant, styles, colors, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; variant: 'outline' | 'dark' | 'soft'; styles: AuthStyles; colors: AuthColors; onPress: () => void }) {
  return <Pressable style={({ pressed }) => [styles.choiceButton, variant === 'dark' && styles.choiceButtonDark, variant === 'soft' && styles.choiceButtonSoft, pressed && styles.pressed]} onPress={() => { void Haptics.selectionAsync(); onPress() }}>
    <Ionicons name={icon} size={24} color={variant === 'dark' ? '#FFFFFF' : colors.primary} />
    <Text style={[styles.choiceText, variant === 'dark' && styles.choiceTextDark]}>{label}</Text>
  </Pressable>
}

const hitSlop = { top: 8, right: 8, bottom: 8, left: 8 }

function makeStyles(colors: AuthColors, rtl: boolean) {
  const role = rtl ? 'arabic' : 'editorial'
  const align = rtl ? 'right' as const : 'left' as const
  const writing = rtl ? 'rtl' as const : 'ltr' as const
  const base = withAppFont(StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    utilityBar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
    utilityButton: { minWidth: 50, height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: 23, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
    utilityButtonGhost: { width: 50, height: 50 },
    langText: { color: colors.primary, fontSize: 17, fontWeight: '700' },
    onboardingContent: { flexGrow: 1, justifyContent: 'space-between', paddingHorizontal: 28, paddingTop: 14, paddingBottom: 26 },
    authContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingTop: 12, paddingBottom: 28 },
    visualStage: { minHeight: 284, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center' },
    logoPlate: { zIndex: 3, width: 158, height: 158, alignItems: 'center', justifyContent: 'center', borderRadius: 48, backgroundColor: colors.primary, shadowColor: colors.shadow, shadowOpacity: 1, shadowRadius: 28, shadowOffset: { width: 0, height: 16 } },
    logo: { width: 132, height: 132, borderRadius: 38 },
    heroCopy: { alignItems: 'flex-start' },
    rtlCopy: { alignItems: 'flex-end' },
    brand: { color: colors.primary, fontSize: rtl ? 30 : 27, fontWeight: '700', textAlign: align, writingDirection: writing },
    headline: { marginTop: 6, color: colors.ink, fontSize: rtl ? 41 : 42, lineHeight: rtl ? 48 : 46, fontWeight: '700', textAlign: align, writingDirection: writing },
    subtitle: { marginTop: 14, color: colors.body, fontSize: rtl ? 24 : 22, fontWeight: '500', lineHeight: rtl ? 31 : 29, textAlign: align, writingDirection: writing },
    bottomAction: { marginTop: 34, gap: 12 },
    primary: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 34, backgroundColor: colors.primary },
    primaryPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.985 }] },
    primaryText: { color: '#FFFFFF', fontSize: 22, fontWeight: '600' },
    inlineLink: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    linkMuted: { color: colors.muted, fontSize: 17, fontWeight: '500' },
    linkStrong: { color: colors.primary, fontSize: 17, fontWeight: '700' },
    authSpacer: { height: 110 },
    authHeadline: { color: colors.ink, fontSize: rtl ? 44 : 48, lineHeight: rtl ? 52 : 54, fontWeight: '700', textAlign: 'center', writingDirection: writing },
    authButtons: { gap: 18, marginTop: 38 },
    choiceButton: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, borderRadius: 34, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.card },
    choiceButtonDark: { borderColor: colors.black, backgroundColor: colors.black },
    choiceButtonSoft: { backgroundColor: 'transparent' },
    choiceText: { color: colors.muted, fontSize: 24, fontWeight: '500' },
    choiceTextDark: { color: '#FFFFFF' },
    orRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 4 },
    orLine: { flex: 1, height: 1, backgroundColor: colors.line },
    orText: { color: colors.muted, fontSize: 22, fontWeight: '500' },
    authNote: { marginTop: 26, color: colors.muted, fontSize: 18, lineHeight: 25, textAlign: 'center', writingDirection: writing },
    formTop: { marginTop: 70, alignItems: 'center' },
    form: { gap: 14, marginTop: 32 },
    field: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, borderWidth: 1.5, borderColor: colors.line, borderRadius: 26, backgroundColor: colors.card },
    input: { flex: 1, minHeight: 52, color: colors.ink, fontSize: 21, fontWeight: '500' },
    errorBox: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: `${colors.danger}14` },
    error: { flex: 1, color: colors.danger, fontSize: 16, fontWeight: '600', lineHeight: 22 },
    rowReverse: { flexDirection: 'row-reverse' },
    textRight: { textAlign: 'right', writingDirection: 'rtl' },
    disabled: { opacity: 0.55 },
    pressed: { opacity: 0.74, transform: [{ scale: 0.985 }] },
  }), role)

  return {
    ...base,
    utilityBar: { ...base.utilityBar, flexDirection: rtl ? 'row-reverse' as const : 'row' as const },
    langText: { ...base.langText, fontFamily: fontFamily('ui', 700) },
  }
}
