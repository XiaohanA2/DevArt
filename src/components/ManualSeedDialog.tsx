'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useStore, Asset } from '@/store/useStore'
import { cn } from '@/lib/utils'
import { showSuccessToast, showErrorToast } from '@/lib/toast'

interface ManualSeedDialogProps {
  asset: Asset
  onClose: () => void
}

export function ManualSeedDialog({ asset, onClose }: ManualSeedDialogProps) {
  const [seed, setSeed] = useState(asset.seed?.toString() || '')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { addAsset } = useStore()

  const handleGenerate = async () => {
    // Validate seed
    const seedNum = parseInt(seed, 10)
    if (isNaN(seedNum) || seed < 0 || seed > 2147483647) {
      setError('Seed 必须是 0 到 2147483647 之间的整数')
      return
    }

    setError(null)
    setIsGenerating(true)

    try {
      const generateRes = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: asset.prompt,
          seed: seedNum
        })
      })

      if (!generateRes.ok) {
        throw new Error('重新生成失败')
      }

      const generateData = await generateRes.json()

      // Add new asset with manual seed
      const newAssetId = Date.now().toString()
      const position = asset.position || { x: 0, y: 0 }

      addAsset({
        id: newAssetId,
        imageUrl: generateData.imageUrl,
        prompt: asset.prompt,
        userPrompt: `${asset.userPrompt} (手动 Seed: ${seedNum})`,
        timestamp: Date.now(),
        isProcessing: false,
        seed: generateData.seed,
        styleParams: asset.styleParams,
        position: {
          x: position.x + 220, // Offset to the right
          y: position.y
        }
      })

      showSuccessToast(`使用 Seed ${seedNum} 重新生成成功！`)
      onClose()
    } catch (err) {
      console.error('Manual seed generation failed:', err)
      showErrorToast('重新生成失败，请重试')
      setError('生成失败，请检查 Seed 值或稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyCurrentSeed = () => {
    if (asset.seed) {
      navigator.clipboard.writeText(asset.seed.toString())
      showSuccessToast('当前 Seed 已复制到剪贴板')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl w-[400px] max-w-[90vw]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white">手动指定 Seed</h2>
            <p className="text-xs text-white/50 mt-1">
              使用相同的 Seed 和 Prompt 可以生成相同的图像
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Current Seed */}
          {asset.seed && (
            <div className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/50 mb-1">当前 Seed</p>
                  <p className="text-sm font-mono text-white">{asset.seed}</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-violet-400 hover:text-violet-300"
                  onClick={handleCopyCurrentSeed}
                >
                  复制
                </Button>
              </div>
            </div>
          )}

          {/* Seed Input */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              输入新的 Seed (0 - 2147483647)
            </label>
            <input
              type="number"
              min="0"
              max="2147483647"
              value={seed}
              onChange={(e) => {
                setSeed(e.target.value)
                setError(null)
              }}
              placeholder="例如：1234567890"
              className={cn(
                "w-full px-3 py-2 bg-white/5 border rounded-lg",
                "text-white placeholder:text-white/30",
                "focus:outline-none focus:ring-2 focus:ring-violet-500/50",
                error ? "border-red-500/50" : "border-white/10"
              )}
              disabled={isGenerating}
            />
            {error && (
              <p className="mt-2 text-xs text-red-400">{error}</p>
            )}
          </div>

          {/* Info */}
          <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-3">
            <p className="text-xs text-violet-300">
              💡 <strong>提示：</strong>Seed 是生成图像的随机种子。使用相同的 Seed 和 Prompt
              可以完全复现图像，适合调试或分享生成参数。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isGenerating}
            className="text-white/70 hover:text-white"
          >
            取消
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !seed}
            className="bg-violet-500 hover:bg-violet-600 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                生成中...
              </>
            ) : (
              '使用此 Seed 重新生成'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
