'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { useStore, Asset } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { 
  ZoomIn,
  ZoomOut,
  Maximize2,
  Moon, 
  Sun, 
  Grid3X3,
  Trash2,
  Download,
  Eraser,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { CanvasAssetCard } from './CanvasAssetCard'

const MIN_SCALE = 0.25
const MAX_SCALE = 2
const SCALE_STEP = 0.1

export function InfiniteCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [startPan, setStartPan] = useState({ x: 0, y: 0 })
  
  const { 
    assets,
    canvasBackground, 
    setCanvasBackground,
    canvasViewport,
    setCanvasViewport,
    resetCanvasViewport,
    selectedAssetIds,
    clearSelection,
    removeAsset,
    updateAsset,
    clearAssets
  } = useStore()
  
  const [isRemovingBg, setIsRemovingBg] = useState(false)
  
  // 处理鼠标滚轮缩放
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -SCALE_STEP : SCALE_STEP
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, canvasViewport.scale + delta))
      
      // 以鼠标位置为中心缩放
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        
        const scaleRatio = newScale / canvasViewport.scale
        const newX = mouseX - (mouseX - canvasViewport.x) * scaleRatio
        const newY = mouseY - (mouseY - canvasViewport.y) * scaleRatio
        
        setCanvasViewport({ x: newX, y: newY, scale: newScale })
      }
    }
  }, [canvasViewport, setCanvasViewport])
  
  // 处理画布拖拽开始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 只有点击画布背景才开始拖拽
    if (e.target === e.currentTarget || (e.target as HTMLElement).dataset.canvas === 'true') {
      setIsPanning(true)
      setStartPan({ x: e.clientX - canvasViewport.x, y: e.clientY - canvasViewport.y })
      clearSelection()
    }
  }, [canvasViewport, clearSelection])
  
  // 处理画布拖拽
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setCanvasViewport({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      })
    }
  }, [isPanning, startPan, setCanvasViewport])
  
  // 处理画布拖拽结束
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])
  
  // 缩放控制
  const zoomIn = () => {
    const newScale = Math.min(MAX_SCALE, canvasViewport.scale + SCALE_STEP)
    setCanvasViewport({ scale: newScale })
  }
  
  const zoomOut = () => {
    const newScale = Math.max(MIN_SCALE, canvasViewport.scale - SCALE_STEP)
    setCanvasViewport({ scale: newScale })
  }
  
  const resetView = () => {
    resetCanvasViewport()
  }
  
  // 批量下载选中的资产
  const handleBatchDownload = async () => {
    const selectedAssets = assets.filter(a => selectedAssetIds.includes(a.id))
    for (const asset of selectedAssets) {
      const url = asset.transparentUrl || asset.imageUrl
      const response = await fetch(url)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `devart-${asset.id}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)
      await new Promise(r => setTimeout(r, 100))
    }
  }
  
  // 批量删除选中
  const handleBatchDelete = () => {
    selectedAssetIds.forEach(id => removeAsset(id))
  }
  
  // 批量去除背景
  const handleBatchRemoveBg = async () => {
    const selectedAssets = assets.filter(
      a => selectedAssetIds.includes(a.id) && !a.transparentUrl
    )
    
    if (selectedAssets.length === 0) return
    
    setIsRemovingBg(true)
    
    for (const asset of selectedAssets) {
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
        console.error('Batch remove bg error:', err)
      }
    }
    
    setIsRemovingBg(false)
  }
  
  // 计算选中中有多少未去背景的
  const selectedWithoutBg = assets.filter(
    a => selectedAssetIds.includes(a.id) && !a.transparentUrl
  ).length
  
  // 背景样式
  const getBackgroundStyle = () => {
    const gridSize = 20 * canvasViewport.scale
    const offsetX = canvasViewport.x % gridSize
    const offsetY = canvasViewport.y % gridSize
    
    switch (canvasBackground) {
      case 'dark':
        return {
          backgroundColor: '#0a0a0a',
        }
      case 'light':
        return {
          backgroundColor: '#f5f5f5',
        }
      case 'grid':
      default:
        return {
          backgroundColor: '#0f0f1a',
          backgroundImage: `
            radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)
          `,
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${offsetX}px ${offsetY}px`
        }
    }
  }
  
  return (
    <TooltipProvider>
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0a0a12]">
        {/* 顶部工具栏 */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-medium text-white/70">
              画布
            </h2>
            {assets.length > 0 && (
              <span className="text-xs text-white/40">
                ({assets.length} 个资产)
              </span>
            )}
            <span className="text-xs text-white/30 ml-2">
              {Math.round(canvasViewport.scale * 100)}%
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* 选中操作 */}
            {selectedAssetIds.length > 0 && (
              <div className="flex items-center gap-1 mr-2 pr-2 border-r border-white/10">
                <span className="text-xs text-violet-400 mr-1">
                  已选 {selectedAssetIds.length}
                </span>
                {selectedWithoutBg > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 text-white/60 hover:text-emerald-400 hover:bg-emerald-500/10"
                        onClick={handleBatchRemoveBg}
                        disabled={isRemovingBg}
                      >
                        {isRemovingBg ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Eraser className="w-4 h-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>去除背景 ({selectedWithoutBg})</TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-white/60 hover:text-white hover:bg-white/10"
                      onClick={handleBatchDownload}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>下载选中</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-white/60 hover:text-red-400 hover:bg-red-500/10"
                      onClick={handleBatchDelete}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>删除选中</TooltipContent>
                </Tooltip>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-white/40 hover:text-white"
                  onClick={clearSelection}
                >
                  取消
                </Button>
              </div>
            )}
            
            {/* 缩放控制 */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 mr-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-md text-white/40 hover:text-white"
                    onClick={zoomOut}
                    disabled={canvasViewport.scale <= MIN_SCALE}
                  >
                    <ZoomOut className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>缩小</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-md text-white/40 hover:text-white"
                    onClick={resetView}
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>重置视图</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 rounded-md text-white/40 hover:text-white"
                    onClick={zoomIn}
                    disabled={canvasViewport.scale >= MAX_SCALE}
                  >
                    <ZoomIn className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>放大</TooltipContent>
              </Tooltip>
            </div>
            
            {/* 背景切换 */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "w-7 h-7 rounded-md",
                      canvasBackground === 'dark' 
                        ? "bg-white/10 text-white" 
                        : "text-white/40 hover:text-white"
                    )}
                    onClick={() => setCanvasBackground('dark')}
                  >
                    <Moon className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>深色背景</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "w-7 h-7 rounded-md",
                      canvasBackground === 'light' 
                        ? "bg-white/10 text-white" 
                        : "text-white/40 hover:text-white"
                    )}
                    onClick={() => setCanvasBackground('light')}
                  >
                    <Sun className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>浅色背景</TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "w-7 h-7 rounded-md",
                      canvasBackground === 'grid' 
                        ? "bg-white/10 text-white" 
                        : "text-white/40 hover:text-white"
                    )}
                    onClick={() => setCanvasBackground('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>网格背景</TooltipContent>
              </Tooltip>
            </div>
            
            {/* 清空画布 */}
            {assets.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-7 h-7 ml-1 text-white/40 hover:text-red-400 hover:bg-red-500/10"
                    onClick={clearAssets}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>清空画布</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
        
        {/* 无限画布区域 */}
        <div
          ref={containerRef}
          className={cn(
            "flex-1 overflow-hidden relative",
            isPanning ? "cursor-grabbing" : "cursor-grab"
          )}
          style={getBackgroundStyle()}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          data-canvas="true"
        >
          {assets.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 pointer-events-none">
              <div className="w-24 h-24 mb-4 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center">
                <Grid3X3 className="w-10 h-10" />
              </div>
              <p className="text-sm">在右侧对话框输入描述开始生成</p>
              <p className="text-xs mt-1 text-white/20">支持中文描述，AI 会自动优化为专业 Prompt</p>
              <p className="text-xs mt-4 text-white/15">滚轮 + Ctrl/Cmd 缩放 | 拖拽移动画布</p>
            </div>
          ) : (
            <div
              className="absolute"
              style={{
                transform: `translate(${canvasViewport.x}px, ${canvasViewport.y}px) scale(${canvasViewport.scale})`,
                transformOrigin: '0 0'
              }}
            >
              {assets.map((asset) => (
                <CanvasAssetCard
                  key={asset.id}
                  asset={asset}
                  canvasBackground={canvasBackground}
                  scale={canvasViewport.scale}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}


