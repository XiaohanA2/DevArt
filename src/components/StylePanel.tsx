'use client'

import { useStore } from '@/store/useStore'
import { Lock, Unlock, Sparkles, Palette, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function StylePanel() {
  const { styleContext, unlockStyle } = useStore()
  
  if (!styleContext.isLocked) {
    return (
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 text-white/40">
          <Sparkles className="w-4 h-4" />
          <span className="text-xs">风格未锁定 - 首次生成后将自动锁定风格</span>
        </div>
      </div>
    )
  }
  
  // 提取风格参数用于显示
  const params = styleContext.params
  const colorHex = params?.color.primary || '#007AFF'
  const strokeWidth = params?.stroke.width || 0
  const styleType = params?.type || 'flat-fill'
  
  // 风格类型中文名
  const styleTypeNames: Record<string, string> = {
    'flat-line': '扁平线性',
    'flat-fill': '扁平填充',
    '3d-soft': '3D 软萌',
    '3d-glossy': '3D 光泽',
    'outline': '轮廓线',
    'glyph': '符号',
    'pixel': '像素风',
    'hand-drawn': '手绘风'
  }
  
  return (
    <div className="px-4 py-3 border-b border-violet-500/20 bg-violet-500/5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-violet-400" />
          <span className="text-sm font-medium text-violet-400">风格已锁定</span>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-white/60 hover:text-white"
          onClick={unlockStyle}
        >
          <Unlock className="w-3 h-3 mr-1" />
          解锁
        </Button>
      </div>
      
      {/* 风格描述 */}
      <p className="text-xs text-white/60 mb-3">{styleContext.description}</p>
      
      {/* 风格参数可视化 */}
      <div className="flex flex-wrap gap-2">
        {/* 风格类型 */}
        <Badge 
          variant="secondary"
          className="text-[10px] bg-white/5 text-white/80 hover:bg-white/10 gap-1"
        >
          <Sparkles className="w-3 h-3" />
          {styleTypeNames[styleType] || styleType}
        </Badge>
        
        {/* 主色 */}
        <Badge 
          variant="secondary"
          className="text-[10px] bg-white/5 text-white/80 hover:bg-white/10 gap-1"
        >
          <div 
            className="w-3 h-3 rounded-sm border border-white/20"
            style={{ backgroundColor: colorHex }}
          />
          <Palette className="w-3 h-3" />
          {colorHex}
        </Badge>
        
        {/* 线宽（仅线性风格显示） */}
        {strokeWidth > 0 && (
          <Badge 
            variant="secondary"
            className="text-[10px] bg-white/5 text-white/80 hover:bg-white/10 gap-1"
          >
            <Minus className="w-3 h-3" />
            {strokeWidth}px
          </Badge>
        )}
      </div>
      
      {/* 提示 */}
      <p className="text-[10px] text-white/30 mt-2">
        后续生成将使用相同风格参数
      </p>
    </div>
  )
}
