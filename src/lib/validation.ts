/**
 * Input Validation Utilities for DevArt
 *
 * Provides validation functions to improve user input quality
 * and detect invalid/malformed inputs before sending to API.
 */

import { SUBJECT_PRESETS } from './style-system'

/**
 * Invalid instruction patterns that don't represent actual generation requests
 */
export const INVALID_PATTERNS = [
  '嗯嗯',
  '好的',
  '好的好的',
  '随便',
  '都可以',
  '你看着办',
  '哦哦',
  '噢',
  '啊',
  '呃',
  '嗯',
  '行',
  '行吧',
  'ok',
  'okay',
  'okk',
  '嗯嗯',
  '啊啊',
  '噢噢',
]

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
  suggestions?: string[]
}

/**
 * Validate user input for icon generation
 *
 * @param input - Raw user input string
 * @returns ValidationResult with error message and suggestions if invalid
 */
export function validateInput(input: string): ValidationResult {
  const trimmed = input.trim()

  // Check for empty input
  if (!trimmed) {
    return {
      isValid: false,
      error: '请输入描述你想生成的图标内容',
    }
  }

  // Check for whitespace-only input
  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: '请输入描述你想生成的图标内容',
    }
  }

  // Check minimum length (at least 2 characters)
  if (trimmed.length < 2) {
    return {
      isValid: false,
      error: '描述太短了，请输入更具体的图标描述（至少 2 个字符）',
    }
  }

  // Check for invalid/instructional patterns
  const lowerInput = trimmed.toLowerCase()
  for (const pattern of INVALID_PATTERNS) {
    if (lowerInput === pattern.toLowerCase() || lowerInput.startsWith(pattern.toLowerCase() + '，')) {
      return {
        isValid: false,
        error: '我需要更具体的描述才能帮你生成图标',
        suggestions: [
          '「生成一组电商 App 图标：首页、购物车、订单」',
          '「画一个设置图标，蓝色线性风格」',
          '「一套社交 App 的图标，极简线条风格」',
        ],
      }
    }
  }

  // Check for single characters that are likely typos
  if (trimmed.length === 1 && !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(trimmed)) {
    return {
      isValid: false,
      error: '请输入更具体的图标描述',
      suggestions: getSuggestions(trimmed),
    }
  }

  // If input contains only common particles
  if (/^[啊吧呢吗哦噢呀呗嘛，。！！]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: '我需要更具体的描述才能帮你生成图标',
      suggestions: [
        '「生成蓝色风格的购物车图标」',
        '「画一个设置图标」',
        '「一套电商 App 的图标」',
      ],
    }
  }

  return { isValid: true }
}

/**
 * Get subject suggestions based on input
 *
 * @param input - User input to match against
 * @param limit - Maximum number of suggestions to return (default: 5)
 * @returns Array of suggested subjects
 */
export function getSuggestions(input: string, limit: number = 5): string[] {
  const trimmed = input.trim().toLowerCase()

  // If input is empty or too short, return popular presets
  if (trimmed.length < 2) {
    return [
      '生成一组电商 App 图标：首页、购物车、订单、我的，要扁平线性风格，主色蓝色',
      '画一个设置图标，圆润可爱的3D风格，橙色',
      '一套社交 App 的图标，极简线条风格，深灰色',
      '生成导航栏图标：首页、发现、消息、我的',
      '画一个用户个人中心图标，蓝色',
    ].slice(0, limit)
  }

  // Find matching subjects
  const matches: Array<{ key: string; score: number }> = []

  for (const [key, value] of Object.entries(SUBJECT_PRESETS)) {
    // Exact match gets highest score
    if (key === trimmed) {
      matches.push({ key, score: 100 })
      continue
    }

    // Prefix match
    if (key.startsWith(trimmed)) {
      matches.push({ key, score: 80 })
      continue
    }

    // Contains match
    if (key.includes(trimmed) || trimmed.includes(key)) {
      matches.push({ key, score: 60 })
      continue
    }

    // Fuzzy match (character overlap)
    const overlap = calculateOverlap(trimmed, key)
    if (overlap > 0.5) {
      matches.push({ key, score: overlap * 40 })
    }
  }

  // Sort by score and return top N
  matches.sort((a, b) => b.score - a.score)

  return matches
    .slice(0, limit)
    .map((m) => `生成${m.key}图标`)
}

/**
 * Get style suggestions
 *
 * @param input - User input to match against
 * @param limit - Maximum number of suggestions to return (default: 5)
 * @returns Array of suggested style combinations
 */
export function getStyleSuggestions(input: string, limit: number = 5): string[] {
  const trimmed = input.trim().toLowerCase()

  // Common style presets to recommend
  const stylePresets = [
    { name: '扁平线性', desc: '现代简洁，适合各类应用', template: '{subject}图标，扁平线性风格，{color}' },
    { name: '3D软萌', desc: '圆润可爱，适合C端应用', template: '{subject}图标，3D软萌风格，{color}' },
    { name: '极简填充', desc: '干净利落，适合iOS风格', template: '{subject}图标，极简填充风格，{color}' },
    { name: '轮廓线', desc: '精致线条，适合导航栏', template: '{subject}图标，轮廓线风格，{color}' },
    { name: '手绘风', desc: '自然有机，适合创意应用', template: '{subject}图标，手绘风格，{color}' },
    { name: '像素风', desc: '复古游戏，适合娱乐应用', template: '{subject}图标，像素风格，{color}' },
    { name: '科技感', desc: '未来主义，适合科技产品', template: '{subject}图标，科技感风格，{color}' },
    { name: '霓虹', desc: '发光效果，适合暗色主题', template: '{subject}图标，霓虹风格，{color}' },
    { name: '玻璃态', desc: '毛玻璃质感，适合现代UI', template: '{subject}图标，玻璃态风格，{color}' },
    { name: '渐变', desc: '色彩过渡，适合视觉强调', template: '{subject}图标，渐变风格，{color}' },
  ]

  // Extract subject from input if possible
  const subjectMatch = trimmed.match(/(生成|画|制作)?(.{1,4})(图标|图像|图片)?/)
  const subject = subjectMatch ? subjectMatch[2] : '主题'

  // If input is very short or empty, return top style presets
  if (trimmed.length < 2) {
    return stylePresets.slice(0, limit).map(s =>
      s.template.replace('{subject}', '设置').replace('{color}', '蓝色')
    )
  }

  // Filter styles that match the input
  const filteredStyles = stylePresets.filter(s =>
    s.name.includes(trimmed) || trimmed.includes(s.name.toLowerCase())
  )

  if (filteredStyles.length > 0) {
    return filteredStyles.slice(0, limit).map(s =>
      s.template.replace('{subject}', subject).replace('{color}', '蓝色')
    )
  }

  // No direct style match, return popular styles
  return stylePresets.slice(0, limit).map(s =>
    s.template.replace('{subject}', subject).replace('{color}', '蓝色')
  )
}

/**
 * Get all suggestions (both subjects and styles)
 *
 * @param input - User input to match against
 * @returns Object with subject and style suggestions
 */
export function getAllSuggestions(input: string) {
  return {
    subjects: getSuggestions(input, 5),
    styles: getStyleSuggestions(input, 5)
  }
}

/**
 * Calculate character overlap ratio between two strings
 *
 * @param str1 - First string
 * @param str2 - Second string
 * @returns Overlap ratio (0-1)
 */
function calculateOverlap(str1: string, str2: string): number {
  const set1 = new Set(str1.split(''))
  const set2 = new Set(str2.split(''))

  let intersection = 0
  for (const char of set1) {
    if (set2.has(char)) {
      intersection++
    }
  }

  const union = new Set([...set1, ...set2])
  return intersection / union.size
}

/**
 * Check if input is likely a non-icon request
 *
 * @param input - User input string
 * @returns true if input appears to be a non-icon request
 */
export function isNonIconRequest(input: string): boolean {
  const trimmed = input.trim().toLowerCase()

  // Keywords for non-icon requests
  const nonIconKeywords = [
    ['插画', '画'],
    ['背景', '图'],
    ['照片', '写实'],
    ['logo', '设计'],
    ['艺术', '油画', '水彩'],
    ['风景', '场景'],
    ['人物', '女孩', '男孩'],
    ['动物', '猫', '狗'],
  ]

  for (const keywords of nonIconKeywords) {
    if (keywords.every(kw => trimmed.includes(kw))) {
      return true
    }
  }

  return false
}
