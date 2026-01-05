import { NextRequest, NextResponse } from 'next/server'
import {
  parseColor,
  parseStyle,
  parseSubject,
  buildQwenPrompt,
  generateSeed,
  styleToDescription,
  styleToPromptFragment,
  StyleParams,
  SubjectItem,
  PromptItem,
  SUBJECT_PRESETS,
} from '@/lib/style-system'
import { validateInput, isNonIconRequest } from '@/lib/validation'

/**
 * DevArt Unified Processing API - Qwen 专用版
 * 
 * 核心设计原则：
 * 1. 单次 LLM 调用 + 确定性 Prompt 构建
 * 2. LLM 只负责意图理解和参数提取，不负责生成最终 prompt
 * 3. 最终 prompt 由确定性模板生成，确保一致性
 * 4. Qwen 模型优化的中英混合 prompt
 */

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions'
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || ''

// 精简的 System Prompt - 只做参数提取，不生成最终 prompt
const SYSTEM_PROMPT = `你是 DevArt 的意图分析器。分析用户输入，提取结构化的生成参数。

## 产品边界声明
DevArt 专注于生成 UI 图标（App 图标、导航栏图标、功能图标等）。
以下需求应该被识别为非图标需求并友好拒绝：

- 插画需求："生成一张日落海滩的插画"、"帮我画一个可爱的小女孩"、"画一只猫"、"生成风景画"
- 背景图需求："生成一个深色背景"、"做一个渐变背景"、"创建背景图"
- 照片写实："生成一张人物照片"、"AI 头像"、"真人照片"
- LOGO 设计（复杂品牌）："设计一个咖啡店的完整 LOGO"、"创建品牌标识系统"
- 艺术创作："抽象风格的油画"、"水彩风景画"、"艺术创作"

如果用户输入上述类型的需求，应该：
1. 设置 is_visual: false
2. 在 chat_response 中友好说明 DevArt 的产品定位
3. 提供图标生成的引导示例

## 任务
1. 判断是否为图像生成请求
2. 如果是，提取：
   - subjects: 要生成的主题列表（每个图标一个主题）
   - color: 颜色（如 "蓝色"、"#FF5722"）
   - style: 风格描述（如 "扁平线性"、"3D软萌"）
   - stroke_width: 线宽（1-4px，默认2px，仅线性风格需要）
3. 如果不是生成请求，提供友好回复

## 主题拆分规则
- "首页、购物车、订单、我的" → ["首页", "购物车", "订单", "我的"]
- "一套电商图标" → 分解为具体图标：["首页", "购物车", "订单", "我的", "收藏"]
- 单个需求如 "设置图标" → ["设置"]

## 风格识别
- 线性/线条/描边 → style: "线性"
- 扁平/填充/极简 → style: "扁平"
- 3D/立体/圆润/可爱/软萌 → style: "3D"
- 像素/8位 → style: "像素"
- 科技感/未来/几何 → style: "科技"

## 颜色识别
- 保持用户原始表述（如 "蓝色"、"橙色"、"#007AFF"）
- 如果未指定，默认 "黑色"

## 输出格式（JSON）
{
  "is_visual": true,
  "subjects": ["主题1", "主题2"],
  "color": "黑色",
  "style": "扁平线性",
  "stroke_width": 2,
  "chat_response": ""
}

或非视觉请求：
{
  "is_visual": false,
  "subjects": [],
  "color": "",
  "style": "",
  "stroke_width": 0,
  "chat_response": "友好的回复内容"
}

## 示例

输入: "生成一组电商 App 图标：首页、购物车、订单、我的，要扁平线性风格，主色蓝色"
输出: {"is_visual":true,"subjects":["首页","购物车","订单","我的"],"color":"蓝色","style":"扁平线性","stroke_width":2,"chat_response":""}

输入: "帮我画一个设置图标，圆润可爱的3D风格，橙色"
输出: {"is_visual":true,"subjects":["设置"],"color":"橙色","style":"3D可爱","stroke_width":0,"chat_response":""}

输入: "生成一张日落海滩的插画"
输出: {"is_visual":false,"subjects":[],"color":"","style":"","stroke_width":0,"chat_response":"DevArt 专注于生成 UI 图标，不支持插画生成。试试生成一些 UI 图标，例如：「生成蓝色购物车图标」或「画一个设置图标」"}

输入: "你好"
输出: {"is_visual":false,"subjects":[],"color":"","style":"","stroke_width":0,"chat_response":"你好！我是 DevArt，你的 AI 美术伙伴。我可以帮你生成风格统一的 UI 图标。试试说「生成一组电商图标：首页、购物车、订单」"}`

interface RequestBody {
  userInput: string
  lockedStyle?: StyleParams  // 已锁定的风格
  baseSeed?: number          // 基础种子（用于重新生成）
}

interface LLMResponse {
  is_visual: boolean
  subjects: string[]
  color: string
  style: string
  stroke_width: number
  chat_response: string
}

export async function POST(request: NextRequest) {
  try {
    const { userInput, lockedStyle, baseSeed }: RequestBody = await request.json()

    if (!userInput) {
      return NextResponse.json({ error: '请输入描述' }, { status: 400 })
    }

    // ========== Server-side validation ==========
    const validationResult = validateInput(userInput)
    if (!validationResult.isValid) {
      return NextResponse.json({
        isVisual: false,
        chatResponse: validationResult.error || '输入无效，请提供更具体的描述',
        prompts: [],
        error: validationResult.error
      }, { status: 400 })
    }

    // Check for non-icon requests
    if (isNonIconRequest(userInput)) {
      return NextResponse.json({
        isVisual: false,
        chatResponse: `DevArt 专注于生成 UI 图标，不支持${userInput.includes('插画') ? '插画' : userInput.includes('背景') ? '背景图' : '此类'}生成。\n\n试试生成一些 UI 图标，例如：「生成蓝色购物车图标」或「画一个设置图标」`,
        prompts: []
      })
    }
    
    // ========== Step 1: LLM 意图识别 ==========
    let llmResult: LLMResponse
    
    if (DEEPSEEK_API_KEY) {
      const response = await fetch(DEEPSEEK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userInput }
          ],
          temperature: 0.2, // 极低温度确保稳定输出
          max_tokens: 500,
          response_format: { type: 'json_object' }
        })
      })
      
      if (!response.ok) {
        throw new Error('意图解析失败')
      }
      
      const data = await response.json()
      llmResult = JSON.parse(data.choices?.[0]?.message?.content || '{}')
    } else {
      // Fallback：简单解析
      llmResult = fallbackParse(userInput)
    }
    
    // ========== Step 2: 处理非视觉请求 ==========
    if (!llmResult.is_visual) {
      return NextResponse.json({
        isVisual: false,
        chatResponse: llmResult.chat_response || '有什么我可以帮你的吗？',
        prompts: []
      })
    }
    
    // ========== Step 3: 构建风格参数 ==========
    let styleParams: StyleParams
    
    if (lockedStyle) {
      // 使用锁定的风格
      styleParams = lockedStyle
    } else {
      // 从 LLM 结果解析风格
      const parsedStyle = parseStyle(llmResult.style || '')
      const parsedColor = parseColor(llmResult.color || '黑色')
      
      styleParams = {
        type: parsedStyle.type,
        color: {
          primary: parsedColor,
          background: 'white'
        },
        stroke: {
          width: llmResult.stroke_width || parsedStyle.stroke,
          style: parsedStyle.stroke > 0 ? 'solid' : 'none'
        },
        modifiers: parsedStyle.modifiers
      }
    }
    
    // ========== Step 4: 解析主题并构建 Prompts ==========
    const subjects: SubjectItem[] = llmResult.subjects.map(s => parseSubject(s))

    // 生成基础种子（确保批量生成的一致性）
    // 风格锁定时使用 baseSeed，否则生成新的
    const basePromptSeed = baseSeed || generateSeed(userInput + JSON.stringify(styleParams))

    console.log('🔍 Seed Debug:', {
      userInput,
      lockedStyle: !!lockedStyle,
      baseSeed,
      basePromptSeed,
      subjectsCount: subjects.length
    })

    // 构建每个主题的 prompt
    const prompts: PromptItem[] = subjects.map((subject, index) => {
      const prompt = buildQwenPrompt(subject, styleParams)
      // 使用主题内容作为 seed 的一部分，确保：
      // 1. 相同主题得到相同 seed（可复现性）
      // 2. 不同主题得到不同 seed（更好的适应性）
      const seed = generateSeed(subject.original, basePromptSeed)

      console.log(`  - Subject ${index}: ${subject.original}, seed: ${seed}`)

      return {
        subject: subject.original,
        prompt,
        seed
      }
    })

    // 返回 basePromptSeed 用于后续锁定风格
    const finalBaseSeed = basePromptSeed
    
    // ========== Step 5: 生成用户提示 ==========
    const styleDescription = styleToDescription(styleParams)
    const subjectNames = subjects.map(s => s.original).join('、')
    
    const userSuggestion = prompts.length === 1
      ? `正在生成 ${styleDescription} 风格的「${subjectNames}」图标...`
      : `正在生成 ${prompts.length} 个 ${styleDescription} 风格的图标：${subjectNames}...`
    
    return NextResponse.json({
      isVisual: true,
      prompts,
      styleParams,
      styleDescription,
      stylePromptFragment: styleToPromptFragment(styleParams),
      baseSeed: finalBaseSeed,  // 使用最终生成的 seed（首个主题的 seed）
      userSuggestion
    })
    
  } catch (error) {
    console.error('Process error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '处理失败' },
      { status: 500 }
    )
  }
}

/**
 * Fallback 解析（当 API Key 不可用时）
 */
function fallbackParse(input: string): LLMResponse {
  // 检查是否为非图标请求
  const nonIconPatterns = [
    ['插画', '画'],
    ['背景', '图'],
    ['照片', '写实'],
    ['logo', '设计'],
    ['艺术', '油画', '水彩'],
    ['风景', '场景'],
    ['人物', '女孩', '男孩'],
    ['动物', '猫', '狗']
  ]

  for (const patterns of nonIconPatterns) {
    if (patterns.every(p => input.toLowerCase().includes(p.toLowerCase()))) {
      let requestType = ''
      if (input.includes('插画') || input.includes('画')) {
        requestType = '插画'
      } else if (input.includes('背景')) {
        requestType = '背景图'
      } else if (input.includes('照片') || input.includes('写实')) {
        requestType = '照片'
      } else if (input.includes('LOGO') || input.includes('logo') || input.includes('品牌')) {
        requestType = '完整 LOGO 设计'
      } else if (input.includes('艺术') || input.includes('油画') || input.includes('水彩')) {
        requestType = '艺术创作'
      } else {
        requestType = '此类内容'
      }

      return {
        is_visual: false,
        subjects: [],
        color: '',
        style: '',
        stroke_width: 0,
        chat_response: `DevArt 专注于生成 UI 图标，不支持${requestType}生成。\n\n试试生成一些 UI 图标，例如：「生成蓝色购物车图标」或「画一个设置图标」`
      }
    }
  }

  // 检查是否为视觉请求
  const visualKeywords = ['生成', '画', '图标', '图片', '设计', 'icon', '素材', '一套', '一组']
  const isVisual = visualKeywords.some(k => input.includes(k))

  if (!isVisual) {
    return {
      is_visual: false,
      subjects: [],
      color: '',
      style: '',
      stroke_width: 0,
      chat_response: '你好！我是 DevArt，可以帮你生成 UI 图标。试试说「生成一个设置图标」'
    }
  }

  // 简单提取主题
  const subjects: string[] = []
  
  // 尝试匹配中文顿号分隔的列表
  const listMatch = input.match(/[：:]([\u4e00-\u9fa5、]+)/)?.[1]
  if (listMatch) {
    subjects.push(...listMatch.split('、').filter(s => s.length > 0 && s.length < 10))
  }
  
  // 如果没有找到列表，尝试匹配已知主题
  if (subjects.length === 0) {
    for (const key of Object.keys(SUBJECT_PRESETS)) {
      if (input.includes(key)) {
        subjects.push(key)
      }
    }
  }
  
  // 仍然没有，使用整个输入
  if (subjects.length === 0) {
    subjects.push(input.slice(0, 20))
  }
  
  // 检测颜色
  let color = '黑色'
  const colorPatterns = ['蓝', '红', '绿', '橙', '黄', '紫', '粉', '黑', '白', '灰']
  for (const c of colorPatterns) {
    if (input.includes(c)) {
      color = c + '色'
      break
    }
  }
  
  // 检测风格
  let style = '扁平'
  let strokeWidth = 0
  if (input.includes('线') || input.includes('描边')) {
    style = '线性'
    strokeWidth = 2
  } else if (input.includes('3D') || input.includes('3d') || input.includes('立体') || input.includes('圆润')) {
    style = '3D'
  }
  
  return {
    is_visual: true,
    subjects,
    color,
    style,
    stroke_width: strokeWidth,
    chat_response: ''
  }
}
