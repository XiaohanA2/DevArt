/**
 * DevArt Style System - Qwen/Qwen-Image 优化版
 * 
 * 核心特性：
 * 1. 完整的主题、风格、颜色映射表
 * 2. Qwen 优化的 Prompt 构建
 * 3. 中英混合提示词支持
 */

// ============= 基础类型定义 =============

export type StyleType = 
  | 'flat-line'        // 扁平线性
  | 'flat-fill'        // 扁平填充
  | '3d-soft'          // 3D 软萌
  | '3d-glossy'        // 3D 光泽
  | 'outline'          // 轮廓线
  | 'glyph'            // 符号字形
  | 'pixel'            // 像素风
  | 'hand-drawn'       // 手绘风
  | 'neon'             // 霓虹效果
  | 'glassmorphic'     // 玻璃态

export type IconCategory = 
  | 'navigation'       // 导航
  | 'action'           // 操作/功能
  | 'ecommerce'        // 电商
  | 'finance'          // 财务
  | 'user'             // 用户相关
  | 'social'           // 社交
  | 'communication'    // 通讯
  | 'system'           // 系统/设置
  | 'media'            // 媒体
  | 'file'             // 文件
  | 'utility'          // 工具
  | 'security'         // 安全
  | 'general'          // 通用

export interface ColorParams {
  primary: string      // 主色 hex (e.g., "#007AFF")
  secondary?: string   // 次要色 hex (可选)
  background: 'white' | 'transparent' | 'dark' | 'gradient' | string
  accent?: string      // 强调色 (用于 neon 等风格)
}

export interface StrokeParams {
  width: number        // 线宽 (像素)
  style: 'solid' | 'dashed' | 'none'
}

export interface StyleParams {
  type: StyleType
  color: ColorParams
  stroke: StrokeParams
  modifiers: string[]   // 额外修饰词
  quality?: 'standard' | 'high' | 'ultra'  // 质量等级
}

export interface SubjectItem {
  original: string       // 用户原始输入
  english: string        // 英文描述
  iconType: IconCategory // 图标类型
  visual?: string        // 视觉提示词
  iconKind?: 'ui-icon' | 'app-icon'  // 图标类别：UI 图标（导航栏等）vs 应用图标（品牌等）
}

export interface PromptItem {
  subject: string
  prompt: string
  seed: number
}

// ============= 完整的预设映射表 =============

// 扩展的颜色预设（40+ 种）
export const COLOR_PRESETS: Record<string, string> = {
  // iOS 标准色系
  '蓝色': '#007AFF', '蓝': '#007AFF', 'blue': '#007AFF',
  '深蓝': '#0A84FF', '天蓝': '#5AC8FA', 'cyan': '#32ADE6',
  '绿色': '#34C759', '绿': '#34C759', 'green': '#34C759',
  '深绿': '#30D158', '浅绿': '#A8F29A', 'teal': '#30B0C7',
  '红色': '#FF3B30', '红': '#FF3B30', 'red': '#FF3B30',
  '深红': '#D70015', '暗红': '#8B0000', 'crimson': '#DC143C',
  '粉红': '#FF2D55', '粉色': '#FF2D55', 'pink': '#FF2D55',
  '橙色': '#FF9500', '橙': '#FF9500', 'orange': '#FF9500',
  '深橙': '#FF5722', '浅橙': '#FFB347',
  '黄色': '#FFCC00', '黄': '#FFCC00', 'yellow': '#FFCC00',
  '金色': '#FFD60A', 'gold': '#FFD700',
  '紫色': '#AF52DE', '紫': '#AF52DE', 'purple': '#AF52DE',
  '深紫': '#5856D6', '浅紫': '#BF5AF2', 'violet': '#8B00FF',
  '灰色': '#8E8E93', '灰': '#8E8E93', 'gray': '#8E8E93',
  '深灰': '#48484A', '浅灰': '#C7C7CC', 'silver': '#C0C0C0',
  '黑色': '#1C1C1E', '黑': '#1C1C1E', 'black': '#000000',
  '白色': '#FFFFFF', '白': '#FFFFFF', 'white': '#FFFFFF',
  '棕色': '#A2845E', '棕': '#A2845E', 'brown': '#8B4513',
  '咖啡': '#704214', '巧克力': '#663300',
  '薄荷': '#00C7BE', '青': '#32ADE6', 'turquoise': '#40E0D0',
  
  // 品牌色
  '企业蓝': '#0052CC',    // Jira Blue
  '支付宝': '#1890FF',    // Alipay Blue
  '微信绿': '#09B83E',    // WeChat Green
  '字节': '#000000',      // ByteDance Black
  '阿里红': '#E02020',    // Alibaba Red
  '腾讯': '#0066FF',      // Tencent Blue
  '星巴克': '#00704A',    // Starbucks Green
}

// 扩展的风格预设（20+ 种）
export const STYLE_PRESETS: Record<string, { 
  type: StyleType
  stroke: number
  modifiers: string[]
  quality?: 'standard' | 'high' | 'ultra'
}> = {
  // 线性风格
  '线性': { type: 'flat-line', stroke: 2, modifiers: ['线艺术', '基于笔画'] },
  '线条': { type: 'flat-line', stroke: 2, modifiers: ['线艺术', '轮廓'] },
  '描边': { type: 'outline', stroke: 2, modifiers: ['仅轮廓', '无填充'] },
  '轮廓': { type: 'outline', stroke: 2, modifiers: ['轮廓风格', '矢量'] },
  '细线': { type: 'flat-line', stroke: 1, modifiers: ['细笔画', '精致'] },
  '粗线': { type: 'flat-line', stroke: 3, modifiers: ['粗笔画', '粗线'] },
  
  // 扁平风格
  '扁平': { type: 'flat-fill', stroke: 0, modifiers: ['扁平设计', '实心填充'] },
  '填充': { type: 'flat-fill', stroke: 0, modifiers: ['填充', '纯色'] },
  '极简': { type: 'flat-fill', stroke: 0, modifiers: ['极简', '超简洁', '干净'] },
  '现代': { type: 'flat-fill', stroke: 0, modifiers: ['现代设计', '当代风格'] },
  
  // 3D 风格
  '3D': { type: '3d-soft', stroke: 0, modifiers: ['柔和3D', '细微深度'], quality: 'high' },
  '3d': { type: '3d-soft', stroke: 0, modifiers: ['3D效果', '体积感'] },
  '立体': { type: '3d-soft', stroke: 0, modifiers: ['3D深度', '维度感'] },
  '圆润': { type: '3d-soft', stroke: 0, modifiers: ['圆角', '柔和边缘', '光滑'] },
  '可爱': { type: '3d-soft', stroke: 0, modifiers: ['可爱', '萌萌', '友好'] },
  '软萌': { type: '3d-soft', stroke: 0, modifiers: ['柔软', '可爱', '蓬松', '圆角'] },
  '胖胖': { type: '3d-soft', stroke: 0, modifiers: ['厚重', '圆角', '可爱', '俏皮'] },
  '光泽': { type: '3d-glossy', stroke: 0, modifiers: ['光泽', '闪闪发光', '反光', '平滑'], quality: 'high' },
  '玻璃': { type: 'glassmorphic', stroke: 0, modifiers: ['玻璃态', '毛玻璃', '半透明'], quality: 'ultra' },
  
  // 特殊风格
  '像素': { type: 'pixel', stroke: 0, modifiers: ['像素艺术', '8位风格', '复古'] },
  '手绘': { type: 'hand-drawn', stroke: 2, modifiers: ['手绘', '草图风', '有机'] },
  '科技': { type: 'flat-line', stroke: 1.5, modifiers: ['科技风', '几何', '未来感', '赛博朋克'] },
  '科技感': { type: 'flat-line', stroke: 1.5, modifiers: ['科技风', '现代', '几何'] },
  '霓虹': { type: 'neon', stroke: 1, modifiers: ['霓虹发光', '发光线条', '电感'], quality: 'ultra' },
  '渐变': { type: 'flat-fill', stroke: 0, modifiers: ['渐变色', '色彩过渡', '平滑混合'], quality: 'high' },
  '水彩': { type: 'hand-drawn', stroke: 0, modifiers: ['水彩', '艺术', '绘画风'] },
}

// 扩展的主题预设（70+ 种）
export const SUBJECT_PRESETS: Record<string, { 
  english: string
  iconType: IconCategory
  visual?: string
  iconKind?: 'ui-icon' | 'app-icon'  // ui-icon: 导航栏、按钮等工程图标; app-icon: 品牌、应用图标
}> = {
  // 导航类 (10种) - UI 图标
  '首页': { english: 'home house', iconType: 'navigation', visual: '简单建筑轮廓', iconKind: 'ui-icon' },
  '主页': { english: 'home', iconType: 'navigation', iconKind: 'ui-icon' },
  'home': { english: 'home', iconType: 'navigation', iconKind: 'ui-icon' },
  '返回': { english: 'back arrow left', iconType: 'navigation', iconKind: 'ui-icon' },
  '前进': { english: 'forward arrow right', iconType: 'navigation', iconKind: 'ui-icon' },
  '刷新': { english: 'refresh reload circular arrows', iconType: 'action', iconKind: 'ui-icon' },
  '更多': { english: 'more dots menu', iconType: 'navigation', iconKind: 'ui-icon' },
  '菜单': { english: 'menu hamburger lines', iconType: 'navigation', iconKind: 'ui-icon' },
  '关闭': { english: 'close x cross', iconType: 'action', iconKind: 'ui-icon' },
  '缩小': { english: 'minimize collapse', iconType: 'action', iconKind: 'ui-icon' },

  // 电商类 (15种) - UI 图标
  '购物车': { english: 'shopping cart with wheels', iconType: 'ecommerce', visual: '带物品的购物车', iconKind: 'ui-icon' },
  'cart': { english: 'shopping cart', iconType: 'ecommerce', iconKind: 'ui-icon' },
  '订单': { english: 'order receipt clipboard', iconType: 'ecommerce', visual: '带复选标记的文档', iconKind: 'ui-icon' },
  'order': { english: 'order document', iconType: 'ecommerce', iconKind: 'ui-icon' },
  '商品': { english: 'product box package', iconType: 'ecommerce', iconKind: 'ui-icon' },
  '优惠券': { english: 'ticket coupon discount', iconType: 'ecommerce', visual: '折叠的票券', iconKind: 'ui-icon' },
  '支付': { english: 'payment credit card wallet', iconType: 'finance', iconKind: 'ui-icon' },
  '钱包': { english: 'wallet money purse', iconType: 'finance', iconKind: 'ui-icon' },
  '收藏': { english: 'heart favorite star', iconType: 'action', iconKind: 'ui-icon' },
  '收藏夹': { english: 'heart bookmark favorite', iconType: 'action', iconKind: 'ui-icon' },
  '评价': { english: 'star rating review', iconType: 'action', iconKind: 'ui-icon' },
  '分享': { english: 'share arrow forward', iconType: 'action', iconKind: 'ui-icon' },
  '邮寄': { english: 'shipping package delivery', iconType: 'ecommerce', iconKind: 'ui-icon' },
  '退货': { english: 'return back arrow', iconType: 'ecommerce', iconKind: 'ui-icon' },
  '库存': { english: 'inventory boxes warehouse', iconType: 'ecommerce', iconKind: 'ui-icon' },

  // 用户类 (10种) - UI 图标
  '我的': { english: 'my profile user person', iconType: 'user', visual: '头部剪影', iconKind: 'ui-icon' },
  '个人': { english: 'person user profile', iconType: 'user', iconKind: 'ui-icon' },
  '用户': { english: 'user account person', iconType: 'user', iconKind: 'ui-icon' },
  'profile': { english: 'user profile', iconType: 'user', iconKind: 'ui-icon' },
  '头像': { english: 'avatar profile picture', iconType: 'user', iconKind: 'ui-icon' },
  '好友': { english: 'friends people two', iconType: 'social', iconKind: 'ui-icon' },
  '粉丝': { english: 'followers users group', iconType: 'social', iconKind: 'ui-icon' },
  '关注': { english: 'follow plus circle', iconType: 'social', iconKind: 'ui-icon' },
  '阻止': { english: 'block ban forbidden', iconType: 'user', iconKind: 'ui-icon' },
  '邀请': { english: 'invite share send', iconType: 'social', iconKind: 'ui-icon' },

  // 通讯类 (10种) - UI 图标
  '消息': { english: 'chat message bubble', iconType: 'communication', visual: '对话气泡', iconKind: 'ui-icon' },
  'message': { english: 'message chat', iconType: 'communication', iconKind: 'ui-icon' },
  '通知': { english: 'notification bell alert', iconType: 'communication', visual: '带徽章的铃铛', iconKind: 'ui-icon' },
  '邮件': { english: 'email envelope mail', iconType: 'communication', iconKind: 'ui-icon' },
  '电话': { english: 'phone call telephone', iconType: 'communication', iconKind: 'ui-icon' },
  '评论': { english: 'comment reply message', iconType: 'communication', iconKind: 'ui-icon' },
  '提及': { english: 'mention at symbol', iconType: 'communication', iconKind: 'ui-icon' },
  '回复': { english: 'reply arrow message', iconType: 'communication', iconKind: 'ui-icon' },
  '举报': { english: 'report flag warning', iconType: 'communication', iconKind: 'ui-icon' },
  '翻译': { english: 'translate language globe', iconType: 'utility', iconKind: 'ui-icon' },

  // 功能类 (15种) - UI 图标
  '设置': { english: 'settings gear cog', iconType: 'system', visual: '齿轮轮', iconKind: 'ui-icon' },
  'settings': { english: 'settings gear', iconType: 'system', iconKind: 'ui-icon' },
  '搜索': { english: 'search magnifying glass', iconType: 'action', iconKind: 'ui-icon' },
  'search': { english: 'search', iconType: 'action', iconKind: 'ui-icon' },
  '发现': { english: 'discover explore compass', iconType: 'navigation', iconKind: 'ui-icon' },
  '推荐': { english: 'recommend suggestion lightning', iconType: 'action', iconKind: 'ui-icon' },
  '排序': { english: 'sort filter lines', iconType: 'action', iconKind: 'ui-icon' },
  '筛选': { english: 'filter funnel options', iconType: 'action', iconKind: 'ui-icon' },
  '下载': { english: 'download arrow down', iconType: 'action', iconKind: 'ui-icon' },
  '上传': { english: 'upload arrow up', iconType: 'action', iconKind: 'ui-icon' },
  '添加': { english: 'add plus circle', iconType: 'action', iconKind: 'ui-icon' },
  '删除': { english: 'delete trash bin remove', iconType: 'action', iconKind: 'ui-icon' },
  '编辑': { english: 'edit pencil write', iconType: 'action', iconKind: 'ui-icon' },
  '复制': { english: 'copy duplicate clone', iconType: 'action', iconKind: 'ui-icon' },
  '保存': { english: 'save floppy disk disk', iconType: 'action', iconKind: 'ui-icon' },

  // 媒体类 (10种) - UI 图标
  '相机': { english: 'camera photo picture', iconType: 'media', iconKind: 'ui-icon' },
  '图片': { english: 'image photo gallery', iconType: 'media', iconKind: 'ui-icon' },
  '视频': { english: 'video play film', iconType: 'media', iconKind: 'ui-icon' },
  '音乐': { english: 'music note sound', iconType: 'media', iconKind: 'ui-icon' },
  '播放': { english: 'play triangle button', iconType: 'media', visual: '播放按钮符号', iconKind: 'ui-icon' },
  '暂停': { english: 'pause bars button', iconType: 'media', iconKind: 'ui-icon' },
  '停止': { english: 'stop square button', iconType: 'media', iconKind: 'ui-icon' },
  '音量': { english: 'volume speaker sound', iconType: 'media', iconKind: 'ui-icon' },
  '麦克风': { english: 'microphone mic voice', iconType: 'media', iconKind: 'ui-icon' },
  '录制': { english: 'record circle dot', iconType: 'media', iconKind: 'ui-icon' },

  // 文件类 (12种) - UI 图标
  '文件': { english: 'file document paper', iconType: 'file', iconKind: 'ui-icon' },
  '文件夹': { english: 'folder directory', iconType: 'file', iconKind: 'ui-icon' },
  '文档': { english: 'document page text', iconType: 'file', iconKind: 'ui-icon' },
  'PDF': { english: 'pdf file document', iconType: 'file', iconKind: 'ui-icon' },
  '图片文件': { english: 'image file gallery', iconType: 'file', iconKind: 'ui-icon' },
  '压缩': { english: 'compress zip archive', iconType: 'file', iconKind: 'ui-icon' },
  '解压': { english: 'decompress unzip extract', iconType: 'file', iconKind: 'ui-icon' },
  '日历': { english: 'calendar date day', iconType: 'utility', visual: '日历网格', iconKind: 'ui-icon' },
  '时钟': { english: 'clock time watch', iconType: 'utility', iconKind: 'ui-icon' },
  '计时': { english: 'timer stopwatch', iconType: 'utility', iconKind: 'ui-icon' },
  '位置': { english: 'location pin map marker', iconType: 'utility', iconKind: 'ui-icon' },
  '地图': { english: 'map navigation world', iconType: 'utility', iconKind: 'ui-icon' },
  '历史': { english: 'history clock arrow back', iconType: 'action', visual: '回退箭头或时钟符号', iconKind: 'ui-icon' },
  '历史记录': { english: 'history clock arrow back', iconType: 'action', visual: '回退箭头或时钟符号', iconKind: 'ui-icon' },

  // 系统/状态类 (12种) - UI 图标
  '帮助': { english: 'help question mark circle', iconType: 'system', iconKind: 'ui-icon' },
  '信息': { english: 'info information circle', iconType: 'system', iconKind: 'ui-icon' },
  '警告': { english: 'warning alert triangle', iconType: 'system', iconKind: 'ui-icon' },
  '成功': { english: 'success checkmark tick', iconType: 'system', visual: '绿色对勾', iconKind: 'ui-icon' },
  '错误': { english: 'error cross x mark', iconType: 'system', visual: '红叉', iconKind: 'ui-icon' },
  '锁定': { english: 'lock padlock security', iconType: 'security', iconKind: 'ui-icon' },
  '解锁': { english: 'unlock padlock open', iconType: 'security', iconKind: 'ui-icon' },
  '隐藏': { english: 'hide eye slash', iconType: 'action', iconKind: 'ui-icon' },
  '显示': { english: 'show eye open', iconType: 'action', iconKind: 'ui-icon' },
  '深色': { english: 'dark mode moon', iconType: 'system', iconKind: 'ui-icon' },
  '浅色': { english: 'light mode sun', iconType: 'system', iconKind: 'ui-icon' },
  '切换': { english: 'toggle switch button', iconType: 'action', iconKind: 'ui-icon' },

  // 其他工具类 (6种) - UI 图标
  '二维码': { english: 'qr code barcode', iconType: 'utility', iconKind: 'ui-icon' },
  '标签': { english: 'tag label', iconType: 'utility', iconKind: 'ui-icon' },
  '分类': { english: 'category classify', iconType: 'utility', iconKind: 'ui-icon' },
  '统计': { english: 'statistics chart graph', iconType: 'utility', iconKind: 'ui-icon' },
  '详情': { english: 'details info expand', iconType: 'action', iconKind: 'ui-icon' },
  '预览': { english: 'preview eye view', iconType: 'action', iconKind: 'ui-icon' },
  
  // 品牌图标 (应用图标)
  '星巴克': { english: 'starbucks siren logo coffee', iconType: 'general', visual: '美人鱼logo符号', iconKind: 'app-icon' },
}

// ============= 工具函数 =============

export function parseColor(input: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(input)) {
    return input.toUpperCase()
  }
  
  const normalized = input.toLowerCase().trim()
  
  if (COLOR_PRESETS[normalized]) {
    return COLOR_PRESETS[normalized]
  }
  
  for (const [key, value] of Object.entries(COLOR_PRESETS)) {
    if (key.length > 1 && normalized.includes(key)) {
      return value
    }
  }
  
  return '#000000'
}

export function parseStyle(input: string): {
  type: StyleType
  stroke: number
  modifiers: string[]
  quality?: 'standard' | 'high' | 'ultra'
} {
  const normalized = input.toLowerCase()
  const sortedKeys = Object.keys(STYLE_PRESETS).sort((a, b) => b.length - a.length)
  
  for (const key of sortedKeys) {
    if (normalized.includes(key)) {
      return STYLE_PRESETS[key]
    }
  }
  
  return { type: 'flat-fill', stroke: 0, modifiers: ['扁平设计'] }
}

export function parseSubject(input: string): SubjectItem {
  const normalized = input.toLowerCase().trim()
  
  if (SUBJECT_PRESETS[normalized] || SUBJECT_PRESETS[input]) {
    const preset = SUBJECT_PRESETS[normalized] || SUBJECT_PRESETS[input]
    return {
      original: input,
      english: preset.english,
      iconType: preset.iconType,
      visual: preset.visual,
      iconKind: preset.iconKind || 'ui-icon'  // 默认为 UI 图标
    }
  }
  
  for (const [key, value] of Object.entries(SUBJECT_PRESETS)) {
    if (key.length > 1 && normalized.includes(key)) {
      return {
        original: input,
        english: value.english,
        iconType: value.iconType,
        visual: value.visual,
        iconKind: value.iconKind || 'ui-icon'  // 默认为 UI 图标
      }
    }
  }
  
  return {
    original: input,
    english: input,
    iconType: 'general',
    visual: '清晰可识别的图标',
    iconKind: 'ui-icon'  // 默认为 UI 图标
  }
}

export function generateSeed(content: string, baseSeed?: number): number {
  let hash = baseSeed || 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash) % 2147483647
}

/**
 * 构建 Qwen 优化的 Prompt
 * 关键策略：
 * 1. 严格区分线条风格和填充风格的描述
 * 2. 线条风格使用"线条颜色"，不提及填充
 * 3. 使用"纯图标"和"无装饰框架"约束（不禁止白色背景，用工具去背）
 * 4. 前置放置核心约束，让模型优先理解
 * 5. 支持两种图标类型：UI 图标（极简）和应用图标（可含细节）
 */
export function buildQwenPrompt(
  subject: SubjectItem,
  style: StyleParams
): string {
  const parts: string[] = []
  
  // 判断图标类型（默认为 UI 图标）
  const isAppIcon = subject.iconKind === 'app-icon'
  
  // ===== 前置关键约束 =====
  if (isAppIcon) {
    // 应用图标：允许品牌特色
    parts.push('应用图标')
    parts.push('品牌形象')
    parts.push('清晰可识别')
  } else {
    // UI 图标：用更强硬的约束
    // 中英混合，增加模型对约束的理解
    parts.push('icon only')
    parts.push('icon without background')
    parts.push('独立图标')
    parts.push('仅图标本身，无背景形状')
    parts.push('no background shape, no frame, no container')
    parts.push('无任何包含框架、容器、背景形状')
  }
  
  // ===== 主体 =====
  parts.push(`${subject.english} 图标`)
  
  // ===== 风格和颜色（区分线条 vs 填充） =====
  if (style.type === 'flat-line' || style.type === 'outline') {
    // 线条风格：只描述线条，不提填充
    parts.push('线条风格')
    parts.push(`${style.stroke.width}px 线条宽度`)
    parts.push(`${style.color.primary} 线条颜色`)
  } else if (style.type === 'flat-fill') {
    // 填充风格：描述填充
    parts.push('填充风格')
    parts.push(`${style.color.primary} 颜色填充`)
  } else if (style.type.startsWith('3d')) {
    parts.push('3D 风格')
    parts.push(`${style.color.primary} 主色`)
    // 应用图标允许阴影和反光
    if (isAppIcon) {
      parts.push('可包含细微阴影和反光')
    }
  } else {
    parts.push(`${style.color.primary} 单色图标`)
  }
  
  // ===== 背景 =====
  parts.push('白色背景')
  
  // ===== 设计约束 =====
  if (isAppIcon) {
    // 应用图标约束较宽松，允许细节和品牌特色
    parts.push('清晰')
    parts.push('可识别')
    parts.push('专业')
    if (style.type === 'flat-fill') {
      parts.push('可包含细节')
    }
  } else {
    // UI 图标约束严格：极简、无装饰
    parts.push('极简风格')
    parts.push('无装饰')
    parts.push('无多余元素')
    parts.push('清晰简洁')
  }
  
  // ===== 布局 =====
  parts.push('居中')
  parts.push('适当大小')
  
  // ===== 禁止文字 =====
  parts.push('无文字')
  parts.push('无标记')
  parts.push('无数字')
  
  // ===== 质量 =====
  parts.push('高质量')
  parts.push('矢量风格')
  parts.push('清晰锐利')
  
  return parts.join(', ')
}

export function extractStyleFromPrompt(prompt: string): StyleParams {
  const colorMatch = prompt.match(/#[0-9A-Fa-f]{6}/)
  const primaryColor = colorMatch ? colorMatch[0] : '#000000'
  
  const strokeMatch = prompt.match(/(\d+)px/)
  const strokeWidth = strokeMatch ? parseInt(strokeMatch[1]) : 0
  
  let styleType: StyleType = 'flat-fill'
  const modifiers: string[] = []
  
  if (prompt.includes('线艺术') || prompt.includes('stroke')) {
    styleType = 'flat-line'
    modifiers.push('线艺术')
  } else if (prompt.includes('3d') || prompt.includes('3D')) {
    styleType = prompt.includes('光泽') ? '3d-glossy' : '3d-soft'
    modifiers.push('柔和3D')
  } else if (prompt.includes('轮廓')) {
    styleType = 'outline'
    modifiers.push('仅轮廓')
  } else if (prompt.includes('像素')) {
    styleType = 'pixel'
    modifiers.push('像素艺术')
  }
  
  const modifierPatterns = ['扁平设计', '极简', '圆角', '可爱', '现代', '几何', '手绘']
  for (const pattern of modifierPatterns) {
    if (prompt.includes(pattern)) {
      modifiers.push(pattern)
    }
  }
  
  return {
    type: styleType,
    color: {
      primary: primaryColor,
      background: prompt.includes('白色背景') ? 'white' : 'transparent'
    },
    stroke: {
      width: strokeWidth,
      style: strokeWidth > 0 ? 'solid' : 'none'
    },
    modifiers: [...new Set(modifiers)]
  }
}

export function styleToDescription(style: StyleParams): string {
  const parts: string[] = []
  
  const typeNames: Record<StyleType, string> = {
    'flat-line': '扁平线性',
    'flat-fill': '扁平填充',
    '3d-soft': '3D 软萌',
    '3d-glossy': '3D 光泽',
    'outline': '轮廓线',
    'glyph': '符号',
    'pixel': '像素风',
    'hand-drawn': '手绘风',
    'neon': '霓虹风',
    'glassmorphic': '玻璃态'
  }
  parts.push(typeNames[style.type] || style.type)
  parts.push(`主色 ${style.color.primary}`)
  
  if (style.stroke.width > 0) {
    parts.push(`${style.stroke.width}px 线宽`)
  }
  
  if (style.quality) {
    const qualityNames = { standard: '标准', high: '高质', ultra: '超高' }
    parts.push(qualityNames[style.quality] || '')
  }
  
  return parts.filter(Boolean).join('，')
}

export function styleToPromptFragment(style: StyleParams): string {
  const parts: string[] = []
  parts.push(...style.modifiers)
  
  if (style.stroke.width > 0) {
    parts.push(`${style.stroke.width}px 均匀线条宽度`)
  }
  
  parts.push(`单色 ${style.color.primary}`)
  
  if (style.color.background) {
    parts.push(`${style.color.background} 背景`)
  }
  
  return parts.join(', ')
}
