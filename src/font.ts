const cairoWeightMap: Record<string, string> = {
  normal: 'Cairo_400Regular', '400': 'Cairo_400Regular', '500': 'Cairo_500Medium', '600': 'Cairo_600SemiBold',
  bold: 'Cairo_700Bold', '700': 'Cairo_700Bold', '800': 'Cairo_800ExtraBold', '900': 'Cairo_900Black',
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
