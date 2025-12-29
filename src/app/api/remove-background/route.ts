import { NextRequest, NextResponse } from 'next/server'

// Remove.bg API 配置
// 获取地址: https://www.remove.bg/api (每月 50 次免费)
const REMOVEBG_API_KEY = process.env.REMOVEBG_API_KEY || ''

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json()
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: '请提供图片 URL' },
        { status: 400 }
      )
    }
    
    // 如果没有配置 API Key，直接返回原图
    if (!REMOVEBG_API_KEY) {
      console.log('REMOVEBG_API_KEY not configured, returning original image')
      return NextResponse.json({
        transparentUrl: imageUrl,
        note: '背景移除服务未配置，返回原图'
      })
    }
    
    console.log('Removing background from:', imageUrl)
    
    // 调用 Remove.bg API
    const formData = new FormData()
    formData.append('image_url', imageUrl)
    formData.append('size', 'auto')
    formData.append('format', 'png')
    
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVEBG_API_KEY
      },
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Remove.bg API error:', response.status, errorData)
      
      if (response.status === 402) {
        // 额度用完，返回原图
        console.warn('Remove.bg quota exceeded, returning original image')
        return NextResponse.json({
          transparentUrl: imageUrl,
          note: 'Remove.bg 免费额度已用完，返回原图'
        })
      }
      
      // 其他错误也返回原图，不影响主流程
      return NextResponse.json({
        transparentUrl: imageUrl,
        note: '背景移除失败，返回原图'
      })
    }
    
    // Remove.bg 返回的是图片二进制数据
    const imageBuffer = await response.arrayBuffer()
    const base64 = Buffer.from(imageBuffer).toString('base64')
    const transparentUrl = `data:image/png;base64,${base64}`
    
    console.log('Background removed successfully')
    
    return NextResponse.json({
      transparentUrl
    })
    
  } catch (error) {
    console.error('Remove background error:', error)
    
    // 出错时尝试返回原图
    try {
      const { imageUrl } = await request.clone().json()
      return NextResponse.json({
        transparentUrl: imageUrl,
        note: '背景移除出错，返回原图'
      })
    } catch {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '背景移除失败' },
        { status: 500 }
      )
    }
  }
}
