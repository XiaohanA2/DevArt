/**
 * Color Correction Utilities for DevArt Icons
 *
 * 功能：自动校正 AI 生成图标的颜色到目标值
 * 原理：检测主色调 → 计算颜色映射 → 应用像素级替换
 */

import sharp from 'sharp'

/**
 * 颜色校正配置
 */
export interface ColorCorrectionOptions {
  targetColor: string        // 目标颜色 HEX，如 "#8E8E93"
  tolerance?: number         // 颜色容差（0-255），默认 30
  preserveAlpha?: boolean    // 保持透明通道，默认 true
  strength?: number          // 校正强度（0-1），默认 1.0（完全校正）
}

/**
 * RGB 颜色表示
 */
interface RGB {
  r: number
  g: number
  b: number
}

/**
 * HSL 颜色表示
 */
interface HSL {
  h: number  // 色相 0-360
  s: number  // 饱和度 0-1
  l: number  // 亮度 0-1
}

/**
 * 主色调检测结果
 */
interface DominantColorResult {
  color: RGB
  frequency: number  // 出现频率（像素数）
  percentage: number  // 占比（0-1）
}

/**
 * 从 Prompt 中提取目标颜色
 *
 * @param prompt - AI 生成使用的 prompt
 * @returns 目标颜色 HEX，未找到则返回 null
 */
export function extractTargetColor(prompt: string): string | null {
  const hexMatch = prompt.match(/#[0-9A-Fa-f]{6}/g)
  return hexMatch ? hexMatch[0].toUpperCase() : null
}

/**
 * 校正图像颜色到目标值
 *
 * 策略：检测图像中心区域的主色调（忽略边缘），然后应用全局变换
 * 原因：
 * 1. 中心区域是图标主体，避免被背景干扰
 * 2. AI 生成的"纯色"图标有细微变化，中心区域更能代表真实颜色
 * 3. 全局 HSL 变换会自然处理边缘的抗锯齿和细微变化
 *
 * @param imageBuffer - 输入图像 buffer（PNG 格式）
 * @param options - 校正配置
 * @returns 校正后的图像 buffer
 */
export async function correctIconColor(
  imageBuffer: Buffer,
  options: ColorCorrectionOptions
): Promise<Buffer> {
  const {
    targetColor,
    tolerance = 30,
    preserveAlpha: _preserveAlpha = true,  // Sharp 默认保持 alpha 通道，保留参数以保持接口兼容性
    strength = 1.0
  } = options

  console.log(`[颜色校正] 目标颜色: ${targetColor}, 容差: ${tolerance}, 强度: ${strength}`)

  try {
    // 1. 解析目标颜色
    const targetRGB = hexToRGB(targetColor)

    // 2. 检测中心区域的主色调（忽略边缘）
    const centerDominantColor = await detectCenterRegionDominantColor(imageBuffer)
    console.log(`[颜色校正] 检测到中心区域主色调: rgb(${centerDominantColor.color.r}, ${centerDominantColor.color.g}, ${centerDominantColor.color.b}), 占比: ${(centerDominantColor.percentage * 100).toFixed(1)}%`)

    // 3. 计算颜色是否需要校正
    const colorDistance = rgbDistance(centerDominantColor.color, targetRGB)
    if (colorDistance < tolerance) {
      console.log(`[颜色校正] 颜色差异较小 (${colorDistance.toFixed(1)} < ${tolerance})，跳过校正`)
      return imageBuffer
    }

    console.log(`[颜色校正] 颜色差异: ${colorDistance.toFixed(1)}，开始校正`)

    // 4. 计算颜色校正参数（HSL 空间）
    const dominantHSL = rgbToHSL(centerDominantColor.color)
    const targetHSL = rgbToHSL(targetRGB)

    const hDelta = (targetHSL.h - dominantHSL.h + 540) % 360 - 180  // 最短路径旋转
    const sDelta = (targetHSL.s - dominantHSL.s) * strength
    const lDelta = (targetHSL.l - dominantHSL.l) * strength

    console.log(`[颜色校正] HSL 调整: h${hDelta > 0 ? '+' : ''}${hDelta.toFixed(1)}°, s${sDelta > 0 ? '+' : ''}${(sDelta * 100).toFixed(1)}%, l${lDelta > 0 ? '+' : ''}${(lDelta * 100).toFixed(1)}%`)

    // 5. 应用颜色变换
    const correctedBuffer = await applyColorTransform(imageBuffer, {
      hDelta,
      sDelta,
      lDelta
    })

    console.log(`[颜色校正] 完成 ✅`)
    return Buffer.from(correctedBuffer)

  } catch (error) {
    console.error('[颜色校正] 失败:', error)
    // 出错时返回原图
    return imageBuffer
  }
}

/**
 * 检测图像中心区域的主色调（忽略边缘）
 *
 * 策略：
 * - 只分析中心 50% 区域（图标主体）
 * - 忽略边缘（透明背景、抗锯齿）
 * - 使用较大的量化桶（容错细微颜色变化）
 *
 * @param imageBuffer - 输入图像 buffer
 * @returns 中心区域的主色调检测结果
 */
async function detectCenterRegionDominantColor(imageBuffer: Buffer): Promise<DominantColorResult> {
  const { data, info } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info

  // 定义中心区域（中心 50%）
  const marginX = Math.floor(width * 0.25)
  const marginY = Math.floor(height * 0.25)
  const centerX = width - 2 * marginX
  const centerY = height - 2 * marginY

  console.log(`[颜色校正] 分析中心区域: ${centerX}x${centerY} (全图 ${width}x${height})`)

  // 统计中心区域的颜色分布（只统计非透明像素）
  const colorCounts = new Map<string, number>()
  let nonTransparentPixels = 0
  let skippedWhitePixels = 0

  for (let y = marginY; y < height - marginY; y++) {
    for (let x = marginX; x < width - marginX; x++) {
      const i = (y * width + x) * channels
      const alpha = channels >= 4 ? data[i + 3] : 255

      // 只处理不透明像素（alpha > 128）
      if (alpha > 128) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]

        // 跳过白色/亮灰色像素（避免白色背景干扰）
        // 判断标准：RGB 均大于 200 且 互相差异小于 30
        const brightness = (r + g + b) / 3
        const maxDiff = Math.max(r, g, b) - Math.min(r, g, b)

        if (brightness > 200 && maxDiff < 30) {
          skippedWhitePixels++
          continue
        }

        // 使用较大的量化桶（容错 AI 生成的细微颜色变化）
        const quantizedR = Math.round(r / 32) * 32
        const quantizedG = Math.round(g / 32) * 32
        const quantizedB = Math.round(b / 32) * 32

        const key = `${quantizedR},${quantizedG},${quantizedB}`
        colorCounts.set(key, (colorCounts.get(key) || 0) + 1)
        nonTransparentPixels++
      }
    }
  }

  if (nonTransparentPixels === 0) {
    throw new Error('图像中心区域没有非透明像素（或全是白色像素）')
  }

  console.log(`[颜色校正] 中心区域非透明像素: ${nonTransparentPixels}, 跳过白色像素: ${skippedWhitePixels}, 颜色种类: ${colorCounts.size}`)

  // 找到出现次数最多的颜色
  const sortedColors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])

  const [dominantKey, frequency] = sortedColors[0]!
  const [r, g, b] = dominantKey.split(',').map(Number)

  return {
    color: { r, g, b },
    frequency,
    percentage: frequency / nonTransparentPixels
  }
}

/**
 * 检测图像主色调（忽略透明像素）
 *
 * @deprecated 使用 detectCenterRegionDominantColor 代替
 * @param imageBuffer - 输入图像 buffer
 * @returns 主色调检测结果
 */
async function detectDominantColor(imageBuffer: Buffer): Promise<DominantColorResult> {
  // 使用 Sharp 获取原始像素数据
  const { data, info } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const totalPixels = width * height

  // 统计颜色分布（只统计非透明像素）
  const colorCounts = new Map<string, number>()
  let nonTransparentPixels = 0

  for (let i = 0; i < data.length; i += channels) {
    const alpha = channels >= 4 ? data[i + 3] : 255

    // 只处理不透明像素（alpha > 128）
    if (alpha > 128) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]

      // 量化颜色（减少精度以提高统计效率）
      const quantizedR = Math.round(r / 16) * 16
      const quantizedG = Math.round(g / 16) * 16
      const quantizedB = Math.round(b / 16) * 16

      const key = `${quantizedR},${quantizedG},${quantizedB}`
      colorCounts.set(key, (colorCounts.get(key) || 0) + 1)
      nonTransparentPixels++
    }
  }

  if (nonTransparentPixels === 0) {
    throw new Error('图像中没有非透明像素')
  }

  // 找到出现次数最多的颜色
  const sortedColors = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])

  const [dominantKey, frequency] = sortedColors[0]!
  const [r, g, b] = dominantKey.split(',').map(Number)

  return {
    color: { r, g, b },
    frequency,
    percentage: frequency / nonTransparentPixels
  }
}

/**
 * 应用颜色变换到图像
 *
 * @param imageBuffer - 输入图像 buffer
 * @param transform - 变换参数
 * @returns 变换后的图像 buffer
 */
async function applyColorTransform(
  imageBuffer: Buffer,
  transform: {
    hDelta: number
    sDelta: number
    lDelta: number
    // preserveAlpha: boolean  // Sharp 默认保持 alpha 通道
  }
): Promise<Buffer> {
  const { hDelta, sDelta, lDelta } = transform

  // 计算 Sharp 的 modulate 参数（必须 > 0）
  // saturation 和 lightness 是乘数，范围 (0, ∞)
  // 1.0 = 不变，< 1.0 降低，> 1.0 提高

  // 限制 sDelta 范围：[-0.75, 1]，确保 1 + sDelta * 4 > 0
  const clampedSDelta = Math.max(-0.75, Math.min(1, sDelta))
  const saturation = 1 + clampedSDelta * 4

  // 限制 lDelta 范围：[-0.5, 1]，确保 1 + lDelta * 2 > 0
  const clampedLDelta = Math.max(-0.5, Math.min(1, lDelta))
  const lightness = 1 + clampedLDelta * 2

  console.log(`[颜色校正] Sharp 参数: hue=${hDelta.toFixed(1)}°, saturation=${saturation.toFixed(2)}x, lightness=${lightness.toFixed(2)}x`)

  return await sharp(imageBuffer)
    .modulate({
      hue: hDelta,
      saturation,
      lightness
    })
    .toBuffer()
}

/**
 * HEX 颜色转 RGB
 */
function hexToRGB(hex: string): RGB {
  const cleanHex = hex.replace('#', '')
  return {
    r: parseInt(cleanHex.substring(0, 2), 16),
    g: parseInt(cleanHex.substring(2, 4), 16),
    b: parseInt(cleanHex.substring(4, 6), 16)
  }
}

/**
 * RGB 转 HSL
 */
function rgbToHSL(rgb: RGB): HSL {
  const r = rgb.r / 255
  const g = rgb.g / 255
  const b = rgb.b / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: h * 360,
    s,
    l
  }
}

/**
 * 计算两个 RGB 颜色的欧氏距离
 */
function rgbDistance(color1: RGB, color2: RGB): number {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
    Math.pow(color1.g - color2.g, 2) +
    Math.pow(color1.b - color2.b, 2)
  )
}
