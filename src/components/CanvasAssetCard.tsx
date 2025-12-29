'use client'

import { useState, useRef, useCallback } from 'react'
import { useStore, Asset } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { 
  extractStyleFromPrompt, 
  styleToDescription, 
  styleToPromptFragment,
  generateSeed 
} from '@/lib/style-system'
import { 
  Download, 
  Trash2, 
  Lock, 
  RotateCcw, 
  Check,
  Loader2,
  Eraser,
  CheckCircle2,
  GripVertical,
  Shuffle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface CanvasAssetCardProps {
  asset: Asset
  canvasBackground: 'dark' | 'light' | 'grid'
  scale: number
}

const CARD_SIZE = 200

export function CanvasAssetCard({ asset, canvasBackground, scale }: CanvasAssetCardProps) {
  const { 
    selectedAssetIds, 
    toggleAssetSelection,
    removeAsset,
    updateAsset,
    addAsset,
    lockStyle,
    styleContext
  } = useStore()
  
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isRerolling, setIsRerolling] = useState(false)
  const [isRemovingBg, setIsRemovingBg] = useState(false)
  const dragStartRef = useRef({ x: 0, y: 0, assetX: 0, assetY: 0 })
  
  const isSelected = selectedAssetIds.includes(asset.id)
  const isLockedFrom = styleContext.lockedFromAssetId === asset.id
  const hasTransparentBg = !!asset.transparentUrl
  
  const position = asset.position || { x: 0, y: 0 }
  
  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDragging(true)
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      assetX: position.x,
      assetY: position.y
    }
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - dragStartRef.current.x) / scale
      const deltaY = (moveEvent.clientY - dragStartRef.current.y) / scale
      
      updateAsset(asset.id, {
        position: {
          x: dragStartRef.current.assetX + deltaX,
          y: dragStartRef.current.assetY + deltaY
        }
      })
    }
    
    const handleMouseUp = () => {
      setIsDragging(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
    
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [asset.id, position, scale, updateAsset])
  
  // 下载图片
  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const url = asset.transparentUrl || asset.imageUrl
    const response = await fetch(url)
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `devart-${asset.id}${hasTransparentBg ? '-transparent' : ''}.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  }
  
  // 锁定风格 - 使用新的结构化风格系统
  const handleLockStyle = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // 优先使用资产保存的风格参数，否则从 prompt 提取
    const styleParams = asset.styleParams || extractStyleFromPrompt(asset.prompt)
    const description = styleToDescription(styleParams)
    const promptFragment = styleToPromptFragment(styleParams)
    
    lockStyle(
      styleParams,
      description,
      promptFragment,
      asset.id,
      asset.seed // 使用资产的 seed 作为基础
    )
  }
  
  // 去除背景
  const handleRemoveBackground = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRemovingBg || hasTransparentBg) return
    setIsRemovingBg(true)
    
    try {
      const res = await fetch('/api/remove-background', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: asset.imageUrl })
      })
      
      if (res.ok) {
        const data = await res.json()
        if (data.transparentUrl && data.transparentUrl !== asset.imageUrl) {
          updateAsset(asset.id, { transparentUrl: data.transparentUrl })
        }
      }
    } catch (err) {
      console.error('Remove background error:', err)
    } finally {
      setIsRemovingBg(false)
    }
  }
  
  // 重新生成变体 - 使用相同 prompt 但不同 seed
  const handleReroll = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRerolling) return
    setIsRerolling(true)
    
    try {
      // 生成新的随机 seed（使用当前时间确保唯一性）
      const newSeed = generateSeed(asset.prompt + Date.now().toString())
      
      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: asset.prompt,
          seed: newSeed  // 使用新 seed 生成变体
        })
      })
      
      if (!generateRes.ok) throw new Error('重新生成失败')
      
      const generateData = await generateRes.json()
      
      const newAssetId = Date.now().toString()
      addAsset({
        id: newAssetId,
        imageUrl: generateData.imageUrl,
        prompt: asset.prompt,
        userPrompt: asset.userPrompt,
        timestamp: Date.now(),
        isProcessing: false,
        seed: generateData.seed,
        styleParams: asset.styleParams, // 保留原始风格参数
        position: {
          x: position.x,
          y: position.y + CARD_SIZE + 20
        }
      })
    } catch (err) {
      console.error('Reroll failed:', err)
    } finally {
      setIsRerolling(false)
    }
  }
  
  // 精确重生成 - 使用相同 seed 生成几乎相同的图（用于验证一致性）
  const handleExactRegenerate = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isRerolling || !asset.seed) return
    setIsRerolling(true)
    
    try {
      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: asset.prompt,
          seed: asset.seed  // 使用相同 seed
        })
      })
      
      if (!generateRes.ok) throw new Error('重新生成失败')
      
      const generateData = await generateRes.json()
      
      const newAssetId = Date.now().toString()
      addAsset({
        id: newAssetId,
        imageUrl: generateData.imageUrl,
        prompt: asset.prompt,
        userPrompt: asset.userPrompt,
        timestamp: Date.now(),
        isProcessing: false,
        seed: generateData.seed,
        styleParams: asset.styleParams,
        position: {
          x: position.x + CARD_SIZE + 20,
          y: position.y
        }
      })
    } catch (err) {
      console.error('Exact regenerate failed:', err)
    } finally {
      setIsRerolling(false)
    }
  }
  
  // 删除
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeAsset(asset.id)
  }
  
  // 选择
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isDragging) {
      toggleAssetSelection(asset.id)
    }
  }
  
  // 背景样式
  const getBgStyle = () => {
    switch (canvasBackground) {
      case 'dark':
        return 'bg-neutral-900'
      case 'light':
        return 'bg-white'
      case 'grid':
      default:
        return 'bg-[#1a1a2e]'
    }
  }
  
  return (
    <TooltipProvider>
      <div
        className={cn(
          "absolute group rounded-xl overflow-hidden transition-shadow duration-200",
          "border-2 shadow-lg",
          isSelected 
            ? "border-violet-500 shadow-violet-500/30" 
            : "border-white/10 hover:border-violet-400/50",
          isLockedFrom && "ring-2 ring-violet-400 ring-offset-2 ring-offset-[#0f0f1a]",
          isDragging && "shadow-2xl z-50"
        )}
        style={{
          left: position.x,
          top: position.y,
          width: CARD_SIZE,
          height: CARD_SIZE,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleSelect}
      >
        {/* 拖拽手柄 */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-6 flex items-center justify-center cursor-grab z-10",
            "bg-gradient-to-b from-black/40 to-transparent",
            "opacity-0 group-hover:opacity-100 transition-opacity",
            isDragging && "cursor-grabbing opacity-100"
          )}
          onMouseDown={handleDragStart}
        >
          <GripVertical className="w-4 h-4 text-white/60" />
        </div>
        
        {/* 图片容器 */}
        <div className={cn("w-full h-full", getBgStyle())}>
          {asset.isProcessing ? (
            <div className="w-full h-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
            </div>
          ) : (
            <img
              src={asset.transparentUrl || asset.imageUrl}
              alt={asset.userPrompt}
              className="w-full h-full object-contain p-3"
              draggable={false}
            />
          )}
        </div>
        
        {/* 选中指示器 */}
        {isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center z-20">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* 已去背景标识 */}
        {hasTransparentBg && !isSelected && (
          <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center z-20">
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* 锁定标识 */}
        {isLockedFrom && (
          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-400 flex items-center justify-center z-20">
            <Lock className="w-3 h-3 text-white" />
          </div>
        )}
        
        {/* Hover 操作栏 */}
        <div 
          className={cn(
            "absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent",
            "flex items-center justify-center gap-0.5",
            "transition-opacity duration-200 z-20",
            isHovered && !isDragging ? "opacity-100" : "opacity-0"
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "w-7 h-7 text-white hover:bg-white/20",
                  hasTransparentBg && "text-emerald-400"
                )}
                onClick={handleRemoveBackground}
                disabled={isRemovingBg || hasTransparentBg}
              >
                {isRemovingBg ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Eraser className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {hasTransparentBg ? '已去背景' : '去背景'}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 text-white hover:bg-white/20"
                onClick={handleDownload}
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">下载</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  "w-7 h-7 text-white hover:bg-white/20",
                  isLockedFrom && "text-violet-400"
                )}
                onClick={handleLockStyle}
              >
                <Lock className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isLockedFrom ? '已锁定此风格' : '锁定此风格'}
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 text-white hover:bg-white/20"
                onClick={handleReroll}
                disabled={isRerolling}
              >
                {isRerolling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Shuffle className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">生成变体（不同seed）</TooltipContent>
          </Tooltip>
          
          {asset.seed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="w-7 h-7 text-white hover:bg-white/20"
                  onClick={handleExactRegenerate}
                  disabled={isRerolling}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">精确重生成（相同seed）</TooltipContent>
            </Tooltip>
          )}
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="w-7 h-7 text-white hover:bg-red-500/50"
                onClick={handleDelete}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">删除</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
