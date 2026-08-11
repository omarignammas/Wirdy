import { type ComponentProps, useState } from 'react'
import { Image, KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { signIn, signUp, type WirdProfile } from './services/auth-service'
import type { Language } from './locales'

type Mode = 'onboarding' | 'signIn' | 'signUp'

const words = {
  ar: {
    name: 'الاسم الكامل', email: 'البريد الإلكتروني', password: 'كلمة المرور', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب',
    welcome: 'وردك، في وقتك.', intro: 'خطط لقراءتك، تابع تقدمك، وارجع إلى موضعك بهدوء حتى دون اتصال.',
    continue: 'متابعة', haveAccount: 'لديك حساب؟', newAccount: 'مستخدم جديد؟', private: 'حساب محلي آمن. تبقى بياناتك على جهازك.',
    invalid: 'تحقق من البريد وكلمة المرور.', form: 'أدخل اسمًا صحيحًا وبريدًا صالحًا وكلمة مرور من 8 أحرف.', exists: 'يوجد حساب محلي بهذا البريد.',
  },
  en: {
    name: 'Full name', email: 'Email', password: 'Password', signIn: 'Sign in', signUp: 'Create account',
    welcome: 'Your Wird, in your time.', intro: 'Plan your reading, follow your progress, and return calmly to your place, even offline.',
    continue: 'Continue', haveAccount: 'Already have an account?', newAccount: 'New to Wird?', private: 'Secure local account. Your data stays on this device.',
    invalid: 'Check your email and password.', form: 'Enter a valid name and email, with an 8-character password.', exists: 'A local account already uses this email.',
  },
}

export function AuthFlow({ initialMode = 'onboarding', language, onLanguage, onAuthenticated }: { initialMode?: Mode; language: Language; onLanguage: (language: Language) => void; onAuthenticated: (profile: WirdProfile) => void }) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const t = words[language]
  const rtl = language === 'ar'

  async function submit() {
    setBusy(true); setError('')
    try {
      const profile = mode === 'signUp' ? await signUp(name, email, password) : await signIn(email, password)
      onAuthenticated(profile)
    } catch (reason) {
      const code = reason instanceof Error ? reason.message : 'invalid'
      setError(code === 'exists' ? t.exists : ['name', 'email', 'password'].includes(code) ? t.form : t.invalid)
    } finally { setBusy(false) }
  }

  return <SafeAreaView style={styles.safe}>
    <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.languageRow}><Pressable style={styles.languageButton} onPress={() => onLanguage(language === 'ar' ? 'en' : 'ar')}><Ionicons name="language-outline" size={18} color="#175C43" /><Text style={styles.languageText}>{language === 'ar' ? 'English' : 'العربية'}</Text></Pressable></View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image source={require('../assets/wird-app-icon.png')} style={styles.logo} />
        {mode === 'onboarding' ? <>
          <View style={[styles.copy, rtl && styles.rtl]}><Text style={styles.brand}>{language === 'ar' ? 'وِرد' : 'Wird'}</Text><Text style={styles.title}>{t.welcome}</Text><Text style={styles.subtitle}>{t.intro}</Text></View>
          <View style={styles.features}>
            {[
              ['calendar-outline', language === 'ar' ? 'جلسات مرنة وتذكيرات هادئة' : 'Flexible sessions and calm reminders'],
              ['book-outline', language === 'ar' ? 'المصحف والتفسير من نفس مصادر سطح المكتب' : 'Mushaf and Tafsir from the desktop sources'],
              ['shield-checkmark-outline', t.private],
            ].map(([icon, label]) => <View key={label} style={[styles.feature, rtl && styles.rowReverse]}><View style={styles.featureIcon}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={20} color="#175C43" /></View><Text style={[styles.featureText, rtl && styles.textRight]}>{label}</Text></View>)}
          </View>
          <Pressable style={styles.primary} onPress={() => setMode('signUp')}><Text style={styles.primaryText}>{t.continue}</Text><Ionicons name={rtl ? 'arrow-back' : 'arrow-forward'} size={18} color="#FFFFFF" /></Pressable>
          <Pressable style={styles.link} onPress={() => setMode('signIn')}><Text style={styles.linkMuted}>{t.haveAccount} </Text><Text style={styles.linkStrong}>{t.signIn}</Text></Pressable>
        </> : <>
          <View style={[styles.copy, rtl && styles.rtl]}><Text style={styles.brand}>{language === 'ar' ? 'وِرد' : 'Wird'}</Text><Text style={styles.title}>{mode === 'signIn' ? t.signIn : t.signUp}</Text><Text style={styles.subtitle}>{t.private}</Text></View>
          <View style={styles.form}>
            {mode === 'signUp' && <Field icon="person-outline" label={t.name} value={name} onChangeText={setName} rtl={rtl} />}
            <Field icon="mail-outline" label={t.email} value={email} onChangeText={setEmail} rtl={rtl} keyboardType="email-address" autoCapitalize="none" />
            <Field icon="lock-closed-outline" label={t.password} value={password} onChangeText={setPassword} rtl={rtl} secureTextEntry />
            {Boolean(error) && <Text style={[styles.error, rtl && styles.textRight]}>{error}</Text>}
          </View>
          <Pressable disabled={busy} style={[styles.primary, busy && styles.disabled]} onPress={submit}><Text style={styles.primaryText}>{busy ? '...' : mode === 'signIn' ? t.signIn : t.signUp}</Text></Pressable>
          <Pressable style={styles.link} onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError('') }}><Text style={styles.linkMuted}>{mode === 'signIn' ? t.newAccount : t.haveAccount} </Text><Text style={styles.linkStrong}>{mode === 'signIn' ? t.signUp : t.signIn}</Text></Pressable>
        </>}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>
}

function Field({ icon, label, rtl, ...props }: { icon: keyof typeof Ionicons.glyphMap; label: string; rtl: boolean } & ComponentProps<typeof TextInput>) {
  return <View style={styles.field}><Ionicons name={icon} size={19} color="#6E7A74" /><TextInput placeholder={label} placeholderTextColor="#8A938E" style={[styles.input, rtl && styles.textRight]} {...props} /></View>
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' }, languageRow: { alignItems: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  languageButton: { minHeight: 38, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 12, backgroundColor: '#E8F2EE' }, languageText: { color: '#175C43', fontSize: 12, fontWeight: '700' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 30 }, logo: { width: 94, height: 94, alignSelf: 'center', borderRadius: 24, marginBottom: 24 },
  copy: { alignItems: 'flex-start' }, rtl: { alignItems: 'flex-end' }, brand: { color: '#175C43', fontSize: 17, fontWeight: '800' }, title: { marginTop: 8, color: '#171A18', fontSize: 32, fontWeight: '900', textAlign: 'left' }, subtitle: { marginTop: 10, color: '#69736E', fontSize: 15, lineHeight: 23, textAlign: 'left' },
  features: { gap: 14, marginVertical: 28 }, feature: { flexDirection: 'row', alignItems: 'center', gap: 12 }, rowReverse: { flexDirection: 'row-reverse' }, featureIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 13, backgroundColor: '#E8F2EE' }, featureText: { flex: 1, color: '#2A302D', fontSize: 14, lineHeight: 20 }, textRight: { textAlign: 'right', writingDirection: 'rtl' },
  form: { gap: 12, marginVertical: 25 }, field: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1, borderColor: '#E1E7E4', borderRadius: 14, backgroundColor: '#F8FAF9' }, input: { flex: 1, color: '#171A18', fontSize: 15 }, error: { color: '#B54747', fontSize: 12, lineHeight: 18 },
  primary: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 15, backgroundColor: '#175C43' }, primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' }, disabled: { opacity: 0.55 },
  link: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }, linkMuted: { color: '#737B77', fontSize: 13 }, linkStrong: { color: '#175C43', fontSize: 13, fontWeight: '800' },
})
