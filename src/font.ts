type FontRole = 'ui' | 'arabic' | 'editorial'

const fontMaps: Record<FontRole, Record<string, string>> = {
  ui: {
    normal: 'Cairo_400Regular', '400': 'Cairo_400Regular', '500': 'Cairo_500Medium', '600': 'Cairo_600SemiBold',
    bold: 'Cairo_700Bold', '700': 'Cairo_700Bold', '800': 'Cairo_800ExtraBold', '900': 'Cairo_900Black',
  },
  arabic: {
    normal: 'Lateef_400Regular', '400': 'Lateef_400Regular', '500': 'Lateef_500Medium', '600': 'Lateef_600SemiBold',
    bold: 'Lateef_700Bold', '700': 'Lateef_700Bold', '800': 'Lateef_800ExtraBold', '900': 'Lateef_800ExtraBold',
  },
  editorial: {
    normal: 'CormorantGaramond_400Regular', '400': 'CormorantGaramond_400Regular', '500': 'CormorantGaramond_500Medium',
    '600': 'CormorantGaramond_600SemiBold', bold: 'CormorantGaramond_700Bold', '700': 'CormorantGaramond_700Bold',
    '800': 'CormorantGaramond_700Bold', '900': 'CormorantGaramond_700Bold',
  },
}

const cairoWeightMap: Record<string, string> = {
  normal: 'Cairo_400Regular', '400': 'Cairo_400Regular', '500': 'Cairo_500Medium', '600': 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold', '700': 'Cairo_700Bold', '800': 'Cairo_800ExtraBold', '900': 'Cairo_900Black',
}

export function fontFamily(role: FontRole, weight: string | number = '400') {
  const key = String(weight)
  return fontMaps[role][key] ?? fontMaps[role].normal
}

export function withCairoFont<T extends Record<string, object>>(styles: T): T {
  const next: Record<string, object> = {}
  for (const key in styles) {
    const style = styles[key] as { fontSize?: number; fontWeight?: string }
    next[key] = ('fontSize' in style || 'fontWeight' in style)
      ? { ...style, fontFamily: cairoWeightMap[style.fontWeight ?? 'normal'] ?? 'Cairo_400Regular' }
      : style
  }
  return next as T
}

export function withAppFont<T extends Record<string, object>>(styles: T, role: FontRole): T {
  const next: Record<string, object> = {}
  for (const key in styles) {
    const style = styles[key] as { fontSize?: number; fontWeight?: string | number; fontFamily?: string }
    next[key] = ('fontSize' in style || 'fontWeight' in style)
      ? { ...style, fontFamily: style.fontFamily ?? fontFamily(role, style.fontWeight ?? '400') }
      : style
  }
  return next as T
}
