import { NextRequest, NextResponse } from 'next/server'

/**
 * DevArt Image Generation API - Qwen/Qwen-Image 版本
 * 
 * 直接调用阿里开源的 Qwen/Qwen-Image 模型
 * 通过硅基流动 (SiliconFlow) 接入
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
  '写实', '照片式', '照片', '3D渲染'
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
    
    const generationTime = Date.now() - startTime
    
    console.log(`[QWEN] 生成完成 (${generationTime}ms)`)
    console.log(`  图像 URL: ${imageUrl.substring(0, 80)}...`)
    
    return NextResponse.json<GenerateResponse>({
      imageUrl,
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
