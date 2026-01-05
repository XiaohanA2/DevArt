import { NextRequest, NextResponse } from 'next/server'
import { correctIconColor, extractTargetColor } from '@/lib/color-correction'

/**
 * DevArt Image Generation API - Qwen/Qwen-Image 版本
 *
 * 直接调用阿里开源的 Qwen/Qwen-Image 模型
 * 通过硅基流动 (SiliconFlow) 接入
 *
 * 新增：自动颜色校正功能
 */

interface GenerateRequest {
  prompt: string
  seed?: number
  negativePrompt?: string
}

interface GenerateResponse {
  imageUrl: string
  prompt: string
  seed: number
  generationTime?: number
}

const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/images/generations'
const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY || ''

// 默认负面提示词
const DEFAULT_NEGATIVE_PROMPT = [
  '文字', '单词', '字母', '数字', '水印', '签名', '标签', '标题',
  '书写', '字体', '排版', '模糊', '低质', '畸变', '变形',
  '丑陋', '重复', '裁切', '超出框外', '额外肢体', '解剖错误',
  '写实', '照片式', '照片',
  // 禁止任何填充背景（白色、彩色、渐变）
  'white filled background', 'solid white background', '白色填充背景',
  'colored background', 'colorful background', '彩色背景',
  'pink background', 'pink overlay', '粉色背景', '粉色浮层',
  'gradient background', 'gradient overlay', '渐变背景', '渐变浮层',
  'background container', 'background shape', 'circle background',
  'square background', 'rounded background', '背景容器', '背景形状',
  'background layer', 'overlay', 'floating layer', '背景层', '浮层',
  'solid background fill', '实心背景填充', '背景填充'
].join(', ')

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const { prompt, seed, negativePrompt }: GenerateRequest = await request.json()
    
    if (!prompt) {
      return NextResponse.json(
        { error: '请提供 prompt' },
        { status: 400 }
      )
    }
    
    if (!SILICONFLOW_API_KEY) {
      return NextResponse.json(
        { error: 'SILICONFLOW_API_KEY 未配置' },
        { status: 500 }
      )
    }
    
    const useSeed = seed ?? Math.floor(Math.random() * 2147483647)
    
    console.log('\n[QWEN] 开始生成图像')
    console.log(`  Prompt: ${prompt.substring(0, 100)}...`)
    console.log(`  Seed: ${useSeed}`)
    
    // 调用 SiliconFlow API，使用 Qwen/Qwen-Image 模型
    const response = await fetch(SILICONFLOW_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen-Image',
        prompt: prompt,
        image_size: '1024x1024',
        num_inference_steps: 50,
        seed: useSeed,
        batch_size: 1,
        guidance_scale: 7.5,
        negative_prompt: negativePrompt || DEFAULT_NEGATIVE_PROMPT
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('[QWEN] API 错误:', response.status, errorText)
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'SiliconFlow API Key 无效' },
          { status: 401 }
        )
      }
      if (response.status === 402) {
        return NextResponse.json(
          { error: 'SiliconFlow 账户余额不足' },
          { status: 402 }
        )
      }
      if (response.status === 429) {
        return NextResponse.json(
          { error: 'API 请求频率限制，请稍后重试' },
          { status: 429 }
        )
      }
      
      throw new Error(`Qwen API 错误: ${response.status}`)
    }
    
    const data = await response.json()

    // SiliconFlow 返回格式: { images: [{ url: "..." }] }
    const imageUrl = data.images?.[0]?.url

    if (!imageUrl) {
      console.error('[QWEN] 响应数据:', data)
      throw new Error('图像生成失败，未返回 URL')
    }

    // 下载图片并转换为 base64 格式以实现永久存储
    console.log('[QWEN] 下载图片并转换为 base64...')
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('图片下载失败')
    }

    const arrayBuffer = await imageResponse.arrayBuffer()
    let imageBuffer = Buffer.from(arrayBuffer)

    // 🧹 背景移除（在颜色校正之前）
    // 注释：节省 Remove.bg API 额度，颜色校正有白色像素过滤，可以不依赖前置背景移除
    // const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY
    // if (REMOVEBG_API_KEY) {
    //   console.log('[QWEN] 检测到 REMOVEBG_API_KEY，开始移除背景...')
    //
    //   try {
    //     const formData = new FormData()
    //     formData.append('image_file', new Blob([arrayBuffer], { type: 'image/png' }), 'image.png')
    //     formData.append('size', 'auto')
    //     formData.append('format', 'png')
    //
    //     const removeBgStart = Date.now()
    //     const removeBgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
    //       method: 'POST',
    //       headers: {
    //         'X-Api-Key': REMOVEBG_API_KEY
    //       },
    //       body: formData
    //     })
    //
    //     if (removeBgResponse.ok) {
    //       const removeBgBuffer = Buffer.from(await removeBgResponse.arrayBuffer())
    //       imageBuffer = removeBgBuffer
    //       const removeBgTime = Date.now() - removeBgStart
    //       console.log(`[QWEN] 背景移除完成 (${removeBgTime}ms)`)
    //     } else if (removeBgResponse.status === 402) {
    //       console.warn('[QWEN] Remove.bg 额度用完，跳过背景移除')
    //     } else {
    //       console.warn('[QWEN] 背景移除失败，继续使用原图')
    //     }
    //   } catch (error) {
    //     console.error('[QWEN] 背景移除失败:', error)
    //     // 继续使用原图
    //   }
    // } else {
    //   console.log('[QWEN] 未配置 REMOVEBG_API_KEY，跳过背景移除')
    // }

    // 🎨 自动颜色校正：检测目标颜色并校正
    const targetColor = extractTargetColor(prompt)
    if (targetColor) {
      console.log(`[QWEN] 检测到目标颜色 ${targetColor}，应用颜色校正...`)
      const colorCorrectionStart = Date.now()

      try {
        const correctedBuffer = await correctIconColor(imageBuffer, {
          targetColor,
          tolerance: 40,  // 颜色差异小于 40 时不校正
          preserveAlpha: true,
          strength: 1.0  // 完全校正强度
        })

        imageBuffer = Buffer.from(correctedBuffer)

        const colorCorrectionTime = Date.now() - colorCorrectionStart
        console.log(`[QWEN] 颜色校正完成 (${colorCorrectionTime}ms)`)
      } catch (error) {
        console.error('[QWEN] 颜色校正失败，使用原图:', error)
        // 校正失败时使用原图
      }
    } else {
      console.log('[QWEN] 未检测到目标颜色，跳过颜色校正')
    }

    const base64Image = imageBuffer.toString('base64')
    const base64Url = `data:image/png;base64,${base64Image}`

    const generationTime = Date.now() - startTime

    console.log(`[QWEN] 生成完成 (${generationTime}ms)`)
    console.log(`  原 URL: ${imageUrl.substring(0, 80)}...`)
    console.log(`  Base64 URL 已生成`)

    return NextResponse.json<GenerateResponse>({
      imageUrl: base64Url,  // 返回 base64 格式的图片
      prompt,
      seed: useSeed,
      generationTime
    })
    
  } catch (error) {
    console.error('[GENERATE] 错误:', error)
    
    const message = error instanceof Error ? error.message : '图像生成失败'
    const statusCode = message.includes('余额不足') ? 402 : 500
    
    return NextResponse.json(
      { error: message },
      { status: statusCode }
    )
  }
}
