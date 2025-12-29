'use client'

import { useState, useRef, useEffect } from 'react'
import { useStore, ChatMessage } from '@/store/useStore'
import { StylePanel } from './StylePanel'
import { cn } from '@/lib/utils'
import { StyleParams } from '@/lib/style-system'
import { 
  Send, 
  Loader2, 
  Sparkles,
  Bot,
  User,
  AlertCircle,
  MessageSquarePlus
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// API 响应类型
interface ProcessResponse {
  isVisual: boolean
  chatResponse?: string
  prompts?: Array<{
    subject: string
    prompt: string
    seed: number
  }>
  styleParams?: StyleParams
  styleDescription?: string
  stylePromptFragment?: string
  baseSeed?: number
  userSuggestion?: string
  error?: string
}

interface GenerateResponse {
  imageUrl: string
  prompt: string
  seed: number
  generationTime?: number
  error?: string
}

export function AgentSidebar() {
  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
  const { 
    messages, 
    addMessage,
    clearMessages,
    addAsset,
    assets,
    isGenerating, 
    setIsGenerating,
    styleContext,
    lockStyle,
    unlockStyle
  } = useStore()
  
  // 自动滚动到底部
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages, isGenerating])
  
  // 新建聊天
  const handleNewChat = () => {
    clearMessages()
    unlockStyle()
    setInput('')
    setError(null)
  }
  
  // 处理发送消息
  const handleSubmit = async () => {
    if (!input.trim() || isGenerating) return
    
    const userInput = input.trim()
    setInput('')
    setError(null)
    
    // 添加用户消息
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userInput,
      timestamp: Date.now()
    }
    addMessage(userMessage)
    
    setIsGenerating(true)
    
    try {
      // ========== 使用新的统一处理 API ==========
      const processRes = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          // 如果已锁定风格，传递锁定的参数
          lockedStyle: styleContext.isLocked ? styleContext.params : undefined,
          baseSeed: styleContext.isLocked ? styleContext.baseSeed : undefined
        })
      })
      
      if (!processRes.ok) {
        const errData = await processRes.json()
        throw new Error(errData.error || '处理失败')
      }
      
      const processData: ProcessResponse = await processRes.json()
      
      // 如果不是视觉请求，直接回复
      if (!processData.isVisual) {
        addMessage({
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: processData.chatResponse || '有什么我可以帮您的吗？',
          timestamp: Date.now()
        })
        return
      }
      
      const prompts = processData.prompts || []
      
      if (prompts.length === 0) {
        throw new Error('未能生成有效的 Prompt')
      }
      
      // 添加助手消息
      addMessage({
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: processData.userSuggestion || `正在生成 ${prompts.length} 个图标...`,
        timestamp: Date.now()
      })
      
      // 计算新图标的起始 X 位置（在现有图标的右侧）
      const CARD_SIZE = 200
      const CARD_GAP = 40
      const START_Y = 100
      
      // 找到第一行最右侧的位置
      const firstRowAssets = assets.filter(a => a.position && a.position.y < START_Y + CARD_SIZE)
      const maxX = firstRowAssets.length > 0 
        ? Math.max(...firstRowAssets.map(a => a.position?.x || 0)) + CARD_SIZE + CARD_GAP
        : 100
      
      // 批量生成图片
      const generatedAssetIds: string[] = []
      
      for (let i = 0; i < prompts.length; i++) {
        const { subject, prompt, seed } = prompts[i]
        
        const generateRes = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            prompt,
            seed  // 使用确定性 seed
          })
        })
        
        if (!generateRes.ok) {
          const errData: GenerateResponse = await generateRes.json()
          throw new Error(errData.error || '图像生成失败')
        }
        
        const generateData: GenerateResponse = await generateRes.json()
        
        // 添加生成的资产
        const assetId = (Date.now() + i * 10).toString()
        generatedAssetIds.push(assetId)
        
        addAsset({
          id: assetId,
          imageUrl: generateData.imageUrl,
          prompt: prompt,
          userPrompt: userInput,
          timestamp: Date.now(),
          isProcessing: false,
          seed: generateData.seed,  // 保存 seed 以便重新生成
          styleParams: processData.styleParams, // 保存风格参数以便锁定
          position: {
            x: maxX + i * (CARD_SIZE + CARD_GAP),
            y: START_Y
          }
        })
        
        // 稍微延迟，避免 ID 冲突
        if (i < prompts.length - 1) {
          await new Promise(r => setTimeout(r, 50))
        }
      }
      
      // 如果是首次生成且未锁定风格，自动锁定风格
      // 这确保后续生成保持一致
      if (!styleContext.isLocked && processData.styleParams && generatedAssetIds.length > 0) {
        lockStyle(
          processData.styleParams,
          processData.styleDescription || '',
          processData.stylePromptFragment || '',
          generatedAssetIds[0],
          processData.baseSeed
        )
        
        // 提示用户风格已锁定
        addMessage({
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: `✨ 风格已自动锁定：${processData.styleDescription}。后续生成将保持一致风格。如需更换风格，请点击「解锁风格」。`,
          timestamp: Date.now()
        })
      }
      
    } catch (err) {
      console.error('Generation error:', err)
      setError(err instanceof Error ? err.message : '生成失败，请重试')
      
      // 添加错误消息
      addMessage({
        id: (Date.now() + 2).toString(),
        role: 'system',
        content: `❌ ${err instanceof Error ? err.message : '生成失败，请重试'}`,
        timestamp: Date.now()
      })
    } finally {
      setIsGenerating(false)
    }
  }
  
  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }
  
  return (
    <TooltipProvider>
      <div className="w-[400px] h-full flex flex-col border-l border-white/5 bg-[#0a0a12] overflow-hidden">
        {/* 头部 */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-semibold text-white">DevArt</h1>
                <p className="text-[10px] text-white/40">AI 美术伙伴</p>
              </div>
            </div>
            
            {/* 新建聊天按钮 */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-8 h-8 text-white/60 hover:text-white hover:bg-white/10"
                  onClick={handleNewChat}
                >
                  <MessageSquarePlus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>新建聊天（解锁风格）</TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {/* 风格面板 */}
        <div className="flex-shrink-0">
          <StylePanel />
        </div>
        
        {/* 消息区 - 使用原生滚动 */}
        <div 
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto px-4 min-h-0"
        >
          <div className="py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-violet-400" />
                </div>
              <h3 className="text-sm font-medium text-white/70 mb-2">
                DevArt - 独立开发者的 AI 美术伙伴
              </h3>
              <p className="text-xs text-white/40 max-w-[280px] mx-auto">
                一句话描述，批量生成风格统一的 UI 素材。
              </p>
              <p className="text-xs text-white/40 max-w-[280px] mx-auto mt-2">
                🎨 <strong className="text-white/60">风格锁定</strong>：首次生成后自动锁定风格
              </p>
              <p className="text-xs text-white/40 max-w-[280px] mx-auto">
              试试这些：
              </p>
                <div className="mt-4 space-y-2">
                  {[
                    '生成一组电商 App 图标：首页、购物车、订单、我的，要扁平线性风格，主色蓝色',
                    '画一个设置图标，圆润可爱的3D风格，橙色',
                    '一套社交 App 的图标，极简线条风格，深灰色'
                  ].map((example, i) => (
                    <button
                      key={i}
                      className="block w-full px-3 py-2 text-xs text-left text-white/50 bg-white/5 rounded-lg hover:bg-white/10 hover:text-white/70 transition-colors"
                      onClick={() => setInput(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex gap-3",
                    msg.role === 'user' && "flex-row-reverse"
                  )}
                >
                  {/* 头像 */}
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center",
                    msg.role === 'user' 
                      ? "bg-violet-500" 
                      : msg.role === 'system'
                      ? "bg-red-500/20"
                      : "bg-gradient-to-br from-violet-500/50 to-fuchsia-500/50"
                  )}>
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : msg.role === 'system' ? (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>
                  
                  {/* 消息内容 */}
                  <div className={cn(
                    "max-w-[280px] px-3 py-2 rounded-xl text-sm",
                    msg.role === 'user' 
                      ? "bg-violet-500 text-white rounded-tr-none"
                      : msg.role === 'system'
                      ? "bg-red-500/10 text-red-300 rounded-tl-none"
                      : "bg-white/5 text-white/80 rounded-tl-none"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            
            {/* 生成中状态 */}
            {isGenerating && (
              <div className="flex gap-3">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/50 to-fuchsia-500/50 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-3 py-2 rounded-xl rounded-tl-none bg-white/5">
                  <div className="flex items-center gap-2 text-white/60">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">正在创作中...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </div>
        
        {/* 输入区 */}
        <div className="flex-shrink-0 p-4 border-t border-white/5">
          {/* 风格锁定提示 */}
          {styleContext.isLocked && (
            <div className="mb-2 px-3 py-2 bg-violet-500/10 border border-violet-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                  <span className="text-xs text-violet-300">
                    风格已锁定：{styleContext.description}
                  </span>
                </div>
                <button
                  onClick={unlockStyle}
                  className="text-xs text-violet-400 hover:text-violet-300"
                >
                  解锁
                </button>
              </div>
            </div>
          )}
          
          <div className="relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={styleContext.isLocked 
                ? "继续输入主题，将使用相同风格生成..."
                : "描述你需要的 UI 素材..."
              }
              className={cn(
                "min-h-[80px] max-h-[160px] pr-12 resize-none",
                "bg-white/5 border-white/10 text-white placeholder:text-white/30",
                "focus:border-violet-500/50 focus:ring-violet-500/20"
              )}
              disabled={isGenerating}
            />
            <Button
              size="icon"
              className={cn(
                "absolute right-2 bottom-2 w-8 h-8",
                "bg-violet-500 hover:bg-violet-600",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              onClick={handleSubmit}
              disabled={!input.trim() || isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-[10px] text-white/30 text-center">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </TooltipProvider>
  )
}
