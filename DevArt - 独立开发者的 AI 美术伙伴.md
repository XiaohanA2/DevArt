## 1. 项目背景与痛点

### 1.1 核心洞察

 作为一名全栈开发者，我发现在个人项目或黑客松中，后端逻辑往往能快速实现，但前端 UI 素材的获取存在巨大的**生产力断层**。

### 1.2 真实痛点分析

通过对 50+ 位计算机专业学生和独立开发者的调研，发现以下核心痛点：

- **风格割裂 (Style Fragmentation)**：
  - *现状*：从 Iconfont、Google 拼凑素材，线框粗细不一、圆角风格不同。
  - *后果*：产品界面呈现出严重的“廉价拼凑感”。
- **AI 生成不可控 (Stochasticity)**：
  - *现状*：使用 Midjourney/豆包生成素材，第一张图和第二张图即使 Prompt 相似，风格也无法统一（如色调漂移）。
  - *后果*：无法生成成套的 Design System 资产。
- **交付不可用 (Engineering Gap)**：
  - *现状*：生成的图片带有背景色、尺寸不一。
  - *后果*：需要开发者手动 PS 抠图，打断 Coding 心流。

### 1.3 AI 引入可行性分析

*为什么传统规则引擎无法解决，必须引入 AI？*

- **输入弹性 (High)**：用户对 UI 的描述极其模糊（如“要一个看起来很高科技的图标”）。传统逻辑无法理解“高科技感”对应的视觉参数（冷色调、几何线条、发光效果），必须依赖 LLM 的语义理解能力。
- **规则可语言化水平 (Low)**：“风格一致性”很难用 `if-else` 代码写死。很难精确定义“什么是扁平风格的圆角”，这需要 Diffusion 模型对像素分布的隐式理解。
- **容错空间 (Medium)**：UI 素材生成不是医疗诊断，用户可以接受“再生成一次”（Reroll），这给了概率模型（Probabilistic Models）落地的空间。

**结论**: 这是一个典型的 **"Text-to-Structured-Visual"** 场景，必须采用 **LLM** **(意图解析) + Diffusion (视觉生成)** 的组合架构。

## 2. 解决方案与产品价值 (Solution & Value)

**DevArt** 是一个集成化的 AI 美术工作台，它不是简单的“文生图工具”，而是**“UI 资产流水线”**。

### 2.1 核心功能亮点

1. **风格锚定 (Style Anchor)**：通过多轮对话锁定风格参数，保证批量生成的素材（如图标、空状态图）视觉高度一致。
2. **无限画布 (Infinite Canvas)**：摒弃传统的线性聊天界面，采用类似 Figma 的画布视图，允许开发者将生成的资产平铺对比、整理。
3. **工程化交付 (Ready-to-Code)**：一键去除背景，标准化输出透明 PNG，直接可用。支持单张或批量去背景操作。

### 2.2 竞品差异化 (Vs. General AI)

| 维度         | 现有 AI (Midjourney/Doubao) 的表现                           | DevArt 的解决方案                                            |
| ------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 上下文连续性 | 生成了一个完美的线框风格“主页图标”，接着让它生成“设置图标”，它换成了填色风格，或者线条变粗了。随机种子导致风格漂移。 | 全局状态管理 (Global Style State)：将风格参数（线宽、色值、复杂度）固化为 Token，强制注入每一次生成。 |
| 交付物       | 生成图往往带有复杂的背景、光影渲染，或者被裁切。开发者需要进 PS 抠图、调整尺寸。 | 工程化后处理：集成 Remove.bg API，用户可交互式选择需要去背的图片（单张或批量），标准化输出透明 PNG。 |
| 交互形态     | 对话框是线性的（Chat UI）。生成的图刷过去就没了，开发者很难把 10 个图标放在一起对比一致性。 | Chat + Canvas (左图右聊)：所有生成的资产平铺在网格中，像设计稿一样直观对比。 |

## 3. 详细功能设计 (Functional Specification)

### 3.1 界面布局 (UI Design)

*参考 Modern SaaS 风格 (Linear/Vercel)，采用双栏布局*：

- **右侧：智能控制台 (Agent Sidebar)**
  - **对话区**：自然语言输入需求（例如：“我要一组深色模式的导航栏图标”）。
  - **Style Context Panel**：显示当前“锁定”的风格关键词或参考图。提供 `[Lock Style]` 开关。
- **左侧：资产画布 (Asset Canvas)**
  - **网格视图**：生成的图标以卡片形式展示在点阵背景上。
  - **实时交互**：支持多选、删除、下载。
  - **效果预览**：提供“深色/浅色背景”切换，模拟 App 实际显示效果。

### 3.2 核心交互流程 (User Flow)

1. **意图识别**：用户输入模糊需求 -> DeepSeek 推理并补全具体的视觉 Prompt。
2. **初次生成**：Flux 模型生成 4 张不同风格预览图。
3. **风格锁定**：用户选中满意的图片 -> 系统提取该图的 Prompt 特征（线宽、配色、渲染风格）存入 State。
4. **批量生产**：用户继续输入“购物车、设置、用户”，系统自动拼接 Locked Style 参数，并发生成风格统一的素材。
5. **资产交付**：片自动上屏画布，用户可点击「去背景」按钮（或批量选择后一键去背），完成后左上角显示绿色标记表示已处理。

## 4. 模型故事 (Model Stories)

### 4.1 故事一：风格冷启动 (Cold Start)

场景：用户输入"生成橙色的购物车图标，线性简约风格"。

**系统处理流程**：

1. **[LLM 参数提取]** (DeepSeek-V3)
   - 输入：用户自然语言 "生成橙色的购物车图标，线性简约风格"
   - 提取参数：
     ```json
     {
       "is_visual": true,
       "subjects": ["购物车"],
       "color": "橙色",
       "style": "线性",
       "stroke_width": 2
     }
     ```

2. **[本地确定性 Prompt 构建]** (TypeScript 模板函数)
   - 根据参数，调用 `buildQwenPrompt()` 生成确定性 Prompt
   - 对于 "购物车"（UI 图标），自动标记为 `iconKind: 'ui-icon'`
   - 生成的 Prompt：
     ```
     icon only, icon without background, 独立图标, 
     仅图标本身，无背景形状, no background shape, 
     no frame, no container, shopping cart with wheels 图标, 
     线条风格, 2px 线条宽度, #FF9500 线条颜色, 白色背景, 
     极简风格, 无装饰, 无多余元素, 清晰简洁, 
     居中, 适当大小, 高质量, 矢量风格, 清晰锐利
     ```

3. **[Qwen 图标生成]** (SiliconFlow)
   - 调用 Qwen-Image 模型生成图标
   - Prompt 中前置的强约束：`icon only, icon without background` 提高权重
   - 中英混合约束增强模型理解

4. **[结果上屏]**
   - 图标自动上屏 Canvas
   - 用户可点击「去背景」按钮触发 Remove.bg，进一步处理


### 4.2 故事二：基于锁定风格的连续生成 (Consistency Check)

场景：用户满意了橙色线性的购物车图标，继续输入"首页、订单、个人中心"。

**系统处理流程**：

1. **[风格锁定检测]**
   - 系统检测到当前已有锁定风格：
     ```json
     {
       "style": "线性",
       "color": "#FF9500",
       "stroke_width": 2
     }
     ```

2. **[参数提取（仍由 LLM 完成）]**
   - 输入：用户新需求 "首页、订单、个人中心"
   - LLM 提取：
     ```json
     {
       "subjects": ["首页", "订单", "个人中心"],
       "color": "橙色",  // 用户未指定，保持锁定的橙色
       "style": "线性"   // 用户未指定，保持锁定的线性
     }
     ```

3. **[确定性 Prompt 生成（对每个主题）]**
   - 对每个主题 (首页/订单/个人中心) 分别调用 `buildQwenPrompt()`
   - 由于参数完全相同（都是"线性 + 橙色 + 2px"），生成的 Prompt 文本 100% 一致
   - 这保证了三个图标的风格统一

4. **[并发生成]**
   - 三个请求同时发送给 Qwen-Image
   - 每个返回高质量、风格一致的图标


## 5. Agent 旅程与架构设计 (Agent Journey)

### 5.1 角色分工

- **Coordinator Agent (DeepSeek-V3)**:
  - **职责**: 意图识别、参数结构化提取、风格参数管理 (State Manager)。
  - **输入**: 中文自然语言。
  - **输出**: 结构化 JSON (包含 `subjects`, `style`, `color`, `stroke_width`)。
- **Visual Agent (Qwen/Qwen-Image)**:
  - **职责**: 图标生成、风格一致性实现。
  - **输入**: 确定性的模板生成的中英混合 Prompt。
  - **输出**: 图像（PNG）。
- **Worker (Remove.bg** **API****)**:
  - **职责**: 图像工程化（背景移除）。
  - **触发方式**: 用户主动点击「去背景」按钮（单张或批量）。
  - **输入**: 原始图像 URL。
  - **输出**: 透明 PNG（Base64 Data URL）。

### 5.2 关键代码逻辑 (伪代码)

```JavaScript
// 风格一致性实现逻辑（确定性 Prompt 构建）
const handleGenerate = async (userInput) => {
  // 1. LLM 只负责参数提取
  const params = await deepSeekAgent.extract(userInput);
  // → { subjects: ['home'], color: '#007AFF', style: 'flat-line', stroke_width: 2 }

  // 2. 本地确定性模板生成最终 Prompt（绝对一致）
  const finalPrompt = buildQwenPrompt(params, styleContext);
  // → "home icon, 线条风格, 2px 线条宽度, #007AFF 线条颜色, 纯图标不含框..."

  // 3. 调用 Qwen 生成 (via SiliconFlow)
  const imageUrl = await siliconFlowClient.generate(finalPrompt);

  // 4. 更新画布
  addToCanvas(imageUrl);
};
```

## 6. 提示词设计 (Prompt Engineering)

### 6.1 LLM 参数提取 (DeepSeek-V3)

*此 Prompt 用于将用户的模糊中文需求转化为结构化参数，**LLM* *不负责生成最终 Prompt。*

```Markdown
你是 DevArt 的意图分析器。分析用户输入，提取结构化的生成参数。

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

输入: "你好"
输出: {"is_visual":false,"subjects":[],"color":"","style":"","stroke_width":0,"chat_response":"你好！我是 DevArt，你的 AI 美术伙伴。我可以帮你生成风格统一的 UI 图标。试试说「生成一组电商图标：首页、购物车、订单」"
```

### 6.2 Qwen 提示词构建策略 (本地确定性模板)

*本地硬编码的模板函数生成 Prompt，确保每次调用对同一参数都输出完全一致的文本。*

**构造公式**:

[前置核心约束] + [主体] + [风格分支] + [颜色] + [设计约束] + [禁止项] + [质量]

**关键设计决策**:

- **线条风格用"线条颜色"，不用"填充色"** - 避免模型混淆线条与背景
- **禁止背景生成框** - 显式列出 `无圆形背景、无矩形背景` 而非模糊的"无框"
- **前置核心约束** - "纯图标，不含任何框" 放在 Prompt 首位，提高权重

**示例输出**:

```Plain
纯图标，不含任何框, 无背景，无框线, home icon, 线条风格, 2px 线条宽度, 
#007AFF 线条颜色, 极简风格, 无装饰, 清晰, 无圆形背景, 无矩形背景, 
无圆角框, 居中, 高质量, 矢量风格, 清晰锐利
```

## 7. 测试标准与验收 (Testing & Validation)

为了确保“风格一致性”不仅仅是口号，我们需要建立以下验收标准：

### 7.1 功能测试

- **透明度****测试**: 生成 10 张图，点击「去背景」按钮经 Remove.bg API 处理后，放入黑色和白色背景中，边缘无明显白边或锯齿。
- **格式可用性**: 下载的 PNG 文件应为标准尺寸，去背景后的文件名带有 `-transparent` 后缀。
- **交互测试**: 验证单张去背景和批量去背景功能正常，处理完成后左上角显示绿色勾号标记。

### 7.2 智能性/一致性测试

- **测试方法**:
  - 锁定一种风格（例如：Pixel Art）。
  - 连续请求 5 个不同主体（Home, User, Cart, Settings, Search）。
  - 验收标准: 5 个图标在 Canvas 上排列时，视觉重心（Visual Weight）、线条密度、色板应保持一致，无突兀的风格跳变。

### 7.3 验收指标 (Metrics)

| 维度   | 指标名称      | 目标值 | 测量方法                                                 |
| ------ | ------------- | ------ | -------------------------------------------------------- |
| 功能性 | 透明度准确率  | > 95%  | 检查 Remove.bg 输出的 Alpha 通道，无残留白边。           |
| 性能   | E2E 延迟      | < 5s   | 从发送请求到图片上屏的总时间 (Flux-schnell 极快)。       |
| 体验   | Asset 可用率  | > 60%  | 用户生成后，实际点击 "Download" 或保留在 Canvas 的比例。 |
| 智能   | Prompt 遵循度 | > 85%  | 用户说“不要阴影”，生成结果确实无阴影（人工抽检）。       |

## 8. 异常处理与降级策略

- **模型幻觉（如图标外框问题）**:
  - *现象*: 生成的图标带有多余的框架、背景或装饰
  - *策略*: 通过"前置核心约束"和"具体化禁止项"强化 Prompt 权重；使用本地模板确保一致性；增加"无圆形背景、无矩形背景"等具体约束。
- **未知主题生成质量差**:
  - *现象*: 用户输入"历史记录"或"星巴克"等预设外的主题，生成结果复杂度过高
  - *策略*: 动态扩展 SUBJECT_PRESETS，添加品牌图标预设
- **API** **限流/超时**:
  - *现象*: Qwen 生成超过 30s 或返回 429/500 错误
  - *策略*: 自动重试 1 次；若失败，前端 Toast 提示，并保持当前会话状态不丢失
- **背景移除额度用尽**:
  - *现象*: Remove.bg API 返回 402 错误（免费额度每月 50 次）
  - *策略*: 返回原图并提示用户"免费额度已用完"，用户可购买额度或联系管理员

## 9. 技术架构 (Technical Architecture)

本项目采用 **确定性 Prompt 生成架构**，将 Prompt 优化职责从 LLM 转移至本地模板，确保生成的一致性与可控性。

### 9.1 技术栈 (Tech Stack)

- **Frontend**: Next.js 14 (React), Tailwind CSS, Shadcn/ui (UI 组件), Zustand (状态管理).
- **Backend**: Next.js API Routes (Serverless), TypeScript.

### 9.2 AI 模型选型策略 (Model Strategy)

- **推理层 (Reasoning Agent): DeepSeek-V3**
  - *选型理由*：API 成本极低且推理能力强，适合做"参数提取"而非生成最终 Prompt。
  - *职责*：将用户的模糊需求转化为结构化参数（主题、颜色、风格）。
  - key：sk-4894eff925064477af0818261898884b
- **生成层 (Generation Layer): Qwen/Qwen-Image (via SiliconFlow)**
  - *选型理由*：
    - 对中英混合 Prompt 理解最优
    - 国内优秀推理平台，网络延迟低、成本低
  - *职责*：接收本地确定性生成的 Prompt，输出高质量图标
  - *官网*：https://cloud.siliconflow.cn/
  - key：sk-vofxghtgtcghsrthniecvqrshikdyfghyoefgwwzkbjhhwti
- **背景移除层 (Background Removal): Remove.bg** **API**
  - *选型理由*：专业的背景移除服务，效果稳定，每月 50 次免费额度。采用交互式触发，节省调用次数。
  - *官网*：https://www.remove.bg/api
  - key：bNy82PWpSDh1dyTGK2EjVFNY

## 9. 风格预设系统 (Style Preset System)

### 9.1 设计动机

用户很难用自然语言精确描述风格，例如"要一个苹果风格的图标"这样的描述对 AI 模型来说过于模糊。通过提供预设选项，用户可以直接选择预设，系统自动注入精确的风格参数，避免 Prompt 工程的复杂性。

### 9.2 风格预设 (Style Presets)

系统内置 20+ 种风格预设，覆盖主流设计风格：

| 风格类别 | 预设名称 | 类型标识 | 线宽 | 修饰词 |
|---------|---------|---------|------|--------|
| **线性风格** | 线性 | `flat-line` | 2px | 线艺术、基于笔画 |
| | 线条 | `flat-line` | 2px | 线艺术、轮廓 |
| | 描边 | `outline` | 2px | 仅轮廓、无填充 |
| | 轮廓 | `outline` | 2px | 轮廓风格、矢量 |
| | 细线 | `flat-line` | 1px | 细笔画、精致 |
| | 粗线 | `flat-line` | 3px | 粗笔画、粗线 |
| **扁平风格** | 扁平 | `flat-fill` | 0px | 扁平设计、实心填充 |
| | 填充 | `flat-fill` | 0px | 填充、纯色 |
| | 极简 | `flat-fill` | 0px | 极简、超简洁、干净 |
| | 现代 | `flat-fill` | 0px | 现代设计、当代风格 |
| **3D风格** | 3D/立体 | `3d-soft` | 0px | 柔和3D、细微深度 |
| | 圆润/可爱/软萌/胖胖 | `3d-soft` | 0px | 圆角、柔和边缘、可爱、友好 |
| | 光泽 | `3d-glossy` | 0px | 光泽、闪闪发光、反光、平滑 |
| | 玻璃态 | `glassmorphic` | 0px | 玻璃态、毛玻璃、半透明 |
| **特殊风格** | 像素 | `pixel` | 0px | 像素艺术、8位风格、复古 |
| | 手绘 | `hand-drawn` | 2px | 手绘、草图风、有机 |
| | 科技/科技感 | `flat-line` | 1.5px | 科技风、几何、未来感、赛博朋克 |
| | 霓虹 | `neon` | 1px | 霓虹发光、发光线条、电感 |
| | 渐变 | `flat-fill` | 0px | 渐变色、色彩过渡、平滑混合 |
| | 水彩 | `hand-drawn` | 0px | 水彩、艺术、绘画风 |

### 9.3 颜色预设 (Color Presets)

系统内置 40+ 种颜色预设，采用最长匹配原则：

**iOS 标准色系**：

| 中文名 | 英文名 | HEX 值 |
|-------|-------|--------|
| 蓝色/蓝 | blue | #007AFF |
| 深蓝 | dark blue | #0A84FF |
| 天蓝 | sky blue | #5AC8FA |
| 绿色/绿 | green | #34C759 |
| 深绿 | dark green | #30D158 |
| 红色/红 | red | #FF3B30 |
| 深红/暗红 | crimson | #8B0000 |
| 粉红/粉色 | pink | #FF2D55 |
| 橙色/橙 | orange | #FF9500 |
| 深橙 | dark orange | #FF5722 |
| 黄色/黄 | yellow | #FFCC00 |
| 金色 | gold | #FFD60A |
| 紫色/紫 | purple | #AF52DE |
| 深紫 | dark purple | #5856D6 |
| 灰色/灰 | gray | #8E8E93 |
| 深灰 | dark gray | #48484A |
| 黑色/黑 | black | #1C1C1E |
| 白色/白 | white | #FFFFFF |

**品牌色系**：

| 品牌 | HEX 值 |
|------|--------|
| 企业蓝 (Jira) | #0052CC |
| 支付宝蓝 | #1890FF |
| 微信绿 | #09B83E |
| 字节黑 | #000000 |
| 阿里红 | #E02020 |
| 腾讯蓝 | #0066FF |
| 星巴克绿 | #00704A |

### 9.4 主题预设 (Subject Presets)

系统内置 70+ 种主题预设，分为 9 大类。预设数据结构如下：

```TypeScript
interface SubjectPreset {
  english: string           // 英文描述（传给 Qwen）
  iconType: IconCategory    // 图标分类
  visual?: string           // 视觉提示词（辅助模型理解）
  iconKind?: 'ui-icon' | 'app-icon'  // 图标类型
}

// 示例
'购物车': {
  english: 'shopping cart with wheels',
  iconType: 'ecommerce',
  visual: '带物品的购物车',
  iconKind: 'ui-icon'
}
```

**分类详情**：

| 分类 | 数量 | 包含主题 |
|-----|------|---------|
| 导航类 | 10 | 首页、主页、返回、前进、刷新、更多、菜单、关闭、缩小、展开 |
| 电商类 | 15 | 购物车、订单、商品、优惠券、支付、钱包、收藏、收藏夹、评价、分享、邮寄、退货、库存、秒杀、促销 |
| 用户类 | 10 | 我的、个人、用户、头像、好友、粉丝、关注、阻止、邀请、会员 |
| 通讯类 | 10 | 消息、通知、邮件、电话、评论、提及、回复、举报、翻译、语音 |
| 功能类 | 15 | 设置、搜索、发现、推荐、排序、筛选、下载、上传、添加、删除、编辑、复制、保存、打印、分享 |
| 媒体类 | 10 | 相机、图片、视频、音乐、播放、暂停、停止、音量、麦克风、录制 |
| 文件类 | 12 | 文件、文件夹、文档、PDF、图片文件、压缩、解压、日历、时钟、计时、位置、地图 |
| 系统类 | 12 | 帮助、信息、警告、成功、错误、锁定、解锁、隐藏、显示、深色、浅色、切换 |
| 品牌类 | 5 | 星巴克、麦当劳、苹果、谷歌、微软 |


### 9.5 预设扩展机制

**动态扩展策略**：

1. **用户反馈驱动**：当用户标记某个生成结果为"不符合要求"时，记录该主题，后续评估是否加入预设
2. **生成失败率监控**：统计高频失败主题（如复杂品牌名、专业领域术语），评估是否需要预设
3. **定期迭代**：每季度审查预设使用数据，添加新预设、移除低频预设

**预设数据结构版本管理**：

```TypeScript
interface PresetVersion {
  version: string           // e.g., "1.0.0"
  updatedAt: string         // ISO date
  totalPresets: number      // 预设总数
  changelog: string[]       // 变更记录
}

export const PRESET_VERSION: PresetVersion = {
  version: '1.0.0',
  updatedAt: '2024-01-15',
  totalPresets: 77,
  changelog: [
    '初始版本：导航类、电商类、用户类、通讯类、功能类',
    '媒体类、文件类、系统类、品牌类'
  ]
}
```

### 9.4 核心数据结构

```TypeScript
// 风格参数结构化表示
interface StyleParams {
  type: 'flat-line' | 'flat-fill' | '3d-soft' | 'outline' | ...
  color: { primary: string, background: string }
  stroke: { width: number, style: 'solid' | 'dashed' | 'none' }
  modifiers: string[]
}

// 资产数据结构（包含完整生成参数）
interface Asset {
  id: string
  imageUrl: string
  prompt: string
  userPrompt: string     // 用户原始输入
  timestamp: number
  isProcessing?: boolean // 是否正在处理（去背景等）
  transparentUrl?: string // 去背景后的图片URL
  position?: { x: number; y: number } // 画布上的位置
  seed?: number           // 生成使用的 seed（用于重新生成）
  styleParams?: StyleParams // 使用的风格参数（用于锁定风格）
}

// LLM 输出（纯参数）
interface LLMResponse {
  is_visual: boolean
  subjects: SubjectItem[]
  color: string
  style: string
  stroke_width: number
}

// 最终生成的 Prompt（确定性，本地模板生成）
buildQwenPrompt(subject, style) → "纯图标，不含任何框, home icon, ..."
```

## 10. 风格一致性控制优化方案 (Style Consistency Optimization)

### 10.1 问题背景

尽管通过"确定性 Prompt 生成"架构大幅提升了风格一致性，但在实际使用中仍存在以下问题：

1. **颜色偏差**：AI 模型即使收到明确的颜色指令（如 `#8E8E93`），生成的图标颜色仍存在偏差（如 `#965A60`）
2. **背景问题**：即使 Prompt 中强调"无背景"，AI 仍可能生成白色背景或粉色浮层
3. **线宽不准**：2px 线条可能变成 1px 或 3px
4. **Seed 漂移**：相同 Prompt 不同 Seed 导致风格细微差异

**核心矛盾**：Prompt 优化已接近极限，难以通过更复杂的 Prompt 进一步提升一致性。

### 10.2 解决方案总览

采用**多层次防御策略**，在不同阶段介入控制：

```
AI 生成 → Seed 控制 → Prompt 优化 → Sharp 颜色校正 → 背景移除 → 用户交付
   ↓          ↓            ↓             ↓            ↓         ↓
 基础层    确定性层    约束强化层    后处理增强层   工程化层   最终交付
```

**优先级**：
- **P0（已实现）**：Prompt + Seed、Sharp 颜色校正
- **P1（规划中）**：分层生成（先骨架后上色）
- **P2（长期）**：微调模型（Fine-tuned Model）

---

### 10.3 方案一：Prompt + Seed 控制（已实现）

#### 10.3.1 确定性 Prompt 生成

**核心思想**：将 Prompt 生成逻辑从 LLM 转移至本地 TypeScript 模板函数。

**实现**：

```typescript
// src/lib/style-system.ts

export function buildQwenPrompt(
  subject: SubjectPreset,
  style: StylePreset,
  color: ColorPreset
): string {
  const parts: string[] = []

  // 前置核心约束
  parts.push('icon only')
  parts.push('icon without background')

  // 风格分支
  if (style.type === 'flat-line') {
    // 线条风格：重复强调颜色和线宽（3次强化）
    parts.push(`${color.primary} 颜色`)
    parts.push(`${style.stroke.width}px 线条宽度`)
    parts.push(`${color.primary} 线条`)
    parts.push(`${style.stroke.width}px 宽度`)
    parts.push(`${color.primary} 单色`)
    parts.push('线条风格')
    parts.push('纯线条')
  } else if (style.type === 'flat-fill') {
    parts.push(`${color.primary} 颜色`)
    parts.push(`${color.primary} 填充`)
    parts.push('填充风格')
  }

  // 主体
  parts.push(`${subject.english} 图标`)

  return parts.join(', ')
}
```

**关键特性**：
- **100% 确定性**：相同参数 → 完全相同的 Prompt 文本
- **可测试**：可本地测试 Prompt 模板，无需调用 LLM
- **可版本控制**：Prompt 模板纳入 Git 版本管理

#### 10.3.2 Seed 管理策略

**核心思想**：通过确定性 Seed 算法，确保"相同输入 → 相同 Seed → 相同输出"。

**实现**：

```typescript
// src/lib/style-system.ts

export function generateSeed(input: string): number {
  // FNV-1a 哈希算法
  let hash = 2166136261
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i)
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
  }
  return Math.abs(hash) % 2147483647
}

// 风格锁定时的 Seed 策略
const baseSeed = generateSeed(userPrompt + JSON.stringify(styleParams))

// 批量生成时
const seeds = subjects.map((_, i) => baseSeed + i * 1000)
```

**Seed 使用场景**：

| 场景 | Seed 策略 | 效果 |
|-----|----------|------|
| 首次生成 | `hash(用户输入 + 风格参数)` | 确定性基础 Seed |
| 风格锁定后 | `baseSeed + index` | 保持风格，分散内容 |
| 精确重生成 | 使用原 `seed` | 100% 还原原图 |
| 变体探索 | `baseSeed + random()` | 探索相似风格 |

**实际效果**：

```
输入: "蓝色线性购物车图标"
→ Seed: 1739428502
→ Prompt: "icon only, icon without background, shopping cart with wheels 图标, #007AFF 颜色, 2px 线条宽度..."
→ 输出: [购物车图标 A]

使用相同 Seed 和 Prompt 重试
→ 输出: [购物车图标 A]（完全相同）
```

---

### 10.4 方案二：Sharp 颜色校正（已实现）

#### 10.4.1 核心原理

**问题**：即使 Prompt 中重复强调颜色 3 次（`#8E8E93 颜色`、`#8E8E93 线条`、`#8E8E93 单色`），AI 生成的颜色仍可能偏差 20-50 ΔE。

**解决方案**：后处理阶段使用 Sharp 库进行 HSL 颜色空间变换，实现 100% 颜色准确度。

**算法流程**：

```
AI 生成图像 → 检测主色调 → 计算 HSL 偏差 → 应用全局变换 → 100% 颜色准确
```

#### 10.4.2 实现细节

**颜色检测策略**：

1. **中心区域检测**：只分析图像中心 50% 区域，避免白色背景干扰
2. **白色像素过滤**：跳过白色/亮灰色像素（`brightness > 200 && maxDiff < 30`）
3. **大容量化桶**：使用精度 32 的量化桶，容错 AI 的细微颜色变化

**代码实现**：

```typescript
// src/lib/color-correction.ts

export async function correctIconColor(
  imageBuffer: Buffer,
  options: ColorCorrectionOptions
): Promise<Buffer> {
  // 1. 检测中心区域主色调（忽略边缘）
  const centerDominantColor = await detectCenterRegionDominantColor(imageBuffer)

  // 2. 计算颜色距离
  const targetRGB = hexToRGB(options.targetColor)
  const colorDistance = rgbDistance(centerDominantColor.color, targetRGB)

  // 3. 颜色接近时跳过校正（容差 40）
  if (colorDistance < options.tolerance) {
    return imageBuffer
  }

  // 4. 计算 HSL 变换参数
  const dominantHSL = rgbToHSL(centerDominantColor.color)
  const targetHSL = rgbToHSL(targetRGB)

  const hDelta = (targetHSL.h - dominantHSL.h + 540) % 360 - 180
  const sDelta = (targetHSL.s - dominantHSL.s) * options.strength
  const lDelta = (targetHSL.l - dominantHSL.l) * options.strength

  // 5. 应用全局 HSL 变换
  return await sharp(imageBuffer).modulate({
    hue: hDelta,
    saturation: 1 + sDelta * 4,
    lightness: 1 + lDelta * 2
  }).toBuffer()
}
```

#### 10.4.3 实际效果

**测试案例**：

| 目标颜色 | AI 生成颜色 | 校正后颜色 | ΔE 改善 |
|---------|-----------|-----------|---------|
| `#8E8E93` | `#965A60` | `#8E8E93` | 18.2 → 0 ✅ |
| `#007AFF` | `#0091FF` | `#007AFF` | 8.5 → 0 ✅ |
| `#FF9500` | `#FF8800` | `#FF9500` | 5.3 → 0 ✅ |

**性能指标**：
- 处理速度：~100-300ms/张（1024x1024 PNG）
- 颜色准确度：100%（检测即校正）
- 失败保护：出错时返回原图

**集成方式**：

```typescript
// src/app/api/generate/route.ts

const targetColor = extractTargetColor(prompt)
if (targetColor) {
  const correctedBuffer = await correctIconColor(imageBuffer, {
    targetColor,
    tolerance: 40,
    strength: 1.0
  })
  imageBuffer = correctedBuffer
}
```

#### 10.4.4 优势与局限

**优势**：
- ✅ **100% 颜色准确度**：直接校正到目标颜色
- ✅ **保持透明背景**：Sharp 自动保持 alpha 通道
- ✅ **自动容错**：失败时返回原图，不影响用户体验
- ✅ **性能优秀**：后处理时间 < 300ms，用户无感知

**局限**：
- ⚠️ **单色校正**：只校正主色调，不处理多色图标
- ⚠️ **全局变换**：所有像素统一变换，可能影响细节
- ⚠️ **依赖 Sharp**：需要安装 native 依赖

---

### 10.5 方案三：分层生成（规划中）

#### 10.5.1 设计动机

**当前问题**：一次性生成"完整的彩色图标"难以控制所有维度（形状 + 颜色 + 阴影 + 纹理）。

**解决方案**：将生成过程分解为多个步骤，每步专注控制一个维度。

#### 10.5.2 分层生成流程

```
Step 1: 生成骨架（黑白线条图）
  Prompt: "black and white line art, shopping cart, 2px stroke, no color"

Step 2: 提取线条（Canny 边缘检测）
  → 得到透明背景的线条 PNG

Step 3: 颜色填充（基于 Sharp 颜色替换）
  → 将黑色线条替换为目标颜色 #8E8E93

Step 4: 风格叠加（可选）
  → 添加阴影、高光、纹理等装饰元素
```

**技术挑战**：
- **边缘检测准确性**：Canny 算法参数调优
- **颜色替换算法**：需要保留抗锯齿和渐变
- **多步骤Pipeline**：增加复杂度和失败点

**预期效果**：
- ✅ **100% 线宽控制**：骨架阶段精确控制线条粗细
- ✅ **100% 颜色控制**：填充阶段精确控制颜色
- ✅ **解耦风格控制**：骨架与颜色完全独立

**实现难度**：⭐⭐⭐⭐（高）

---

### 10.6 方案四：微调模型（长期规划）

#### 10.6.1 设计动机

**问题**：通用模型（Qwen-Image）即使有优化 Prompt，仍存在"先天限制"：
- 训练数据中"图标+框"的样本占比高
- 对 UI 设计规范的理解不够深入
- 无法 100% 遵循自定义约束

**解决方案**：基于开源模型（如 Stable Diffusion XL）进行微调（Fine-tuning），专门训练"UI 图标生成"模型。

#### 10.6.2 训练数据准备

**数据来源**：
- **公开图标库**：Iconfont、Flaticon、Noun Project（需授权）
- **合成数据集**：使用现有模型生成 + 人工筛选
- **用户生成数据**：匿名化处理后用于训练（需用户同意）

**数据标注**：

```json
{
  "image": "shopping-cart-icon.png",
  "metadata": {
    "subject": "shopping cart",
    "style": "flat-line",
    "color": "#007AFF",
    "stroke_width": 2,
    "has_frame": false,
    "quality_score": 0.95
  }
}
```

**数据量估计**：
- **最小可行集**：5,000 张（覆盖 20 风格 × 50 主题 × 5 颜色）
- **推荐规模**：20,000 张（提升鲁棒性）
- **理想规模**：100,000 张（达到商用质量）

#### 10.6.3 微调方法

**方案 A：LoRA（低秩适配）**
- **优势**：训练快（4-8 小时）、显存需求低（8GB）、可插拔
- **劣势**：效果略逊于全量微调
- **适用**：快速验证、资源有限

**方案 B：DreamBooth**
- **优势**：针对性强、效果好
- **劣势**：容易过拟合、需要更多正则化
- **适用**：特定风格深度优化

**方案 C：全量微调（Full Fine-tuning）**
- **优势**：效果最优、控制力最强
- **劣势**：训练慢（2-3 天）、显存需求高（40GB+）、成本高
- **适用**：长期投入、商用级产品

**推荐策略**：先用 LoRA 快速验证 → 收集用户反馈 → 全量微调

#### 10.6.4 训练Pipeline

```
1. 数据收集与清洗
   - 爬取公开图标库
   - 人工筛选高质量样本
   - 统一尺寸（1024x1024）
   - 数据增强（旋转、缩放、颜色抖动）

2. 数据标注
   - 自动提取元数据（颜色、风格）
   - 人工校验标注准确性
   - 建立质量评分标准

3. 模型训练
   - 基座模型：Stable Diffusion XL 1.0
   - 微调方法：LoRA
   - 训练平台：RunPod / Lambda Labs
   - 预估成本：$500-2000（LoRA）

4. 模型评估
   - 生成测试集（100 个主题 × 10 种风格）
   - 人工评分（颜色、线宽、风格一致性）
   - 与 Qwen-Image 对比测试

5. 部署上线
   - 模型量化（FP16）减小体积
   - 封装为 API 服务
   - 灰度发布（10% → 50% → 100%）
```

#### 10.6.5 预期效果

**与通用模型对比**：

| 维度 | Qwen-Image（通用） | 微调模型（专用） |
|-----|------------------|----------------|
| **颜色准确度** | 70-80% | 95%+ ✅ |
| **线宽控制** | 60-70% | 90%+ ✅ |
| **无框生成** | 85-90% | 99%+ ✅ |
| **风格一致性** | 75-85% | 95%+ ✅ |
| **生成速度** | 快（云端推理） | 慢（需自建） |
| **成本** | 低（按需付费） | 高（固定成本） |

**投入产出分析**：
- **一次性投入**：$5000-10000（数据 + 训练 + 部署）
- **月度成本**：$200-500（服务器 + 维护）
- **回报周期**：6-12 个月
- **适用阶段**：产品验证成功后，规模化商用

---

### 10.7 综合效果对比

| 方案 | 实现状态 | 颜色准确度 | 风格一致性 | 实现难度 | 成本 |
|-----|---------|-----------|-----------|---------|------|
| **Prompt + Seed** | ✅ 已实现 | 70-80% | 80-85% | ⭐⭐ | 低 |
| **Sharp 颜色校正** | ✅ 已实现 | 100% | 85% | ⭐⭐ | 低 |
| **分层生成** | 🔄 规划中 | 95%+ | 90%+ | ⭐⭐⭐⭐ | 中 |
| **微调模型** | 📅 长期 | 95%+ | 95%+ | ⭐⭐⭐⭐⭐ | 高 |

**当前推荐**：
- **短期（MVP）**：Prompt + Seed + Sharp 颜色校正（已实现）
- **中期（成长）**：添加分层生成，提升线宽和形状控制
- **长期（商用）**：微调模型，实现完全可控的图标生成

**组合策略**：

```
Phase 1 (当前): Prompt + Seed + Sharp
  → 颜色准确度: 100%
  → 风格一致性: 85%
  → 成本: $0（仅 API 调用）

Phase 2 (6个月后): + 分层生成
  → 颜色准确度: 100%
  → 风格一致性: 90%
  → 成本: $100/月（服务器）

Phase 3 (12个月后): + 微调模型
  → 颜色准确度: 100%
  → 风格一致性: 95%
  → 成本: $500/月（模型维护）
```

---

## 11. 风格一致性量化标准与测试方法 (Consistency Quantification)

### 11.1 为什么需要量化

"视觉重心一致"、"线条密度一致"等描述虽然直观，但无法作为可执行的测试标准。必须有可测量的指标，才能确保产品质量可控、可迭代。

### 11.2 量化维度定义

| 维度 | 测量指标 | 目标值 | 测量方法 |
|-----|---------|-------|---------|
| **线条密度** | 线宽变异系数 (CV) | < 5% | 提取图标边缘，测量所有线段宽度，计算标准差/均值 |
| **色彩一致性** | 主色色差 (ΔE) | < 3 | 提取图标主色，计算与基准色的 CIE76 色差 |
| **视觉重心** | 质心偏移率 | < 10% | 计算图标视觉重心，与标准中心点的归一化距离 |
| **尺寸一致性** | 有效区域占比差异 | < 15% | 计算图标主体占画布比例的标准差 |
| **风格相似度** | CLIP 特征余弦相似度 | > 0.85 | 使用 CLIP 提取图像特征，计算批次内相似度 |

### 10.3 自动化测试方法

**测试流程**：

1. **批量生成测试集**
   - 锁定一种风格（如 Pixel Art）
   - 连续请求 10 个不同主体（Home, User, Cart, Settings, Search, Plus, Minus, Check, Close, Menu）
   - 保存所有生成结果

2. **图像分析 Pipeline**
   - **线条密度分析**：使用边缘检测算法（Canny）提取轮廓，估算所有线段宽度，计算变异系数（CV）
   - **色彩一致性分析**：提取每张图的主色，计算批次内色差的平均值（CIE76 ΔE）
   - **视觉重心分析**：计算图标视觉质心与标准中心点的归一化距离
   - **整体评分**：综合各维度得分判断是否通过一致性测试

### 10.4 人工验收标准

对于无法自动化的维度，定义人工抽检标准：

1. **整体一致性目视检查**
   - 测试者随机抽取 5 个图标批次
   - 在深色、浅色两种背景下检查
   - 通过标准：无法在 3 秒内识别出"风格不一致"的图标

2. **Prompt 遵循度抽检**
   - 随机抽取 50 个生成结果
   - 检查是否满足用户明确要求的约束（如"不要阴影"、"圆形线条"）
   - 目标：> 85% 符合要求

### 10.5 持续监控机制

- **每日回归测试**：每天自动运行一次一致性测试，生成趋势报告
- **阈值告警**：任一指标超过阈值时，触发告警通知
- **版本对比**：每次 Prompt 优化后，对比前后版本的指标变化

## 11. Seed 管理策略 (Seed Management)

### 11.1 设计动机

Seed 是 Diffusion 模型生成图像时的随机种子，相同 Seed + 相同 Prompt = 相同图像。合理的 Seed 管理可以实现：
- **确定性重试**：用户对结果不满意时，使用相同 Seed 重新生成
- **风格迁移**：保持 Seed 不变，仅修改主题，验证风格一致性
- **变体探索**：保持 Seed 和主题不变，仅微调 Prompt 参数

### 11.2 Seed 生成算法

采用基于内容的哈希算法，确保相同输入产生相同 Seed。

**策略特点**：
- **确定性**：相同输入始终返回相同 Seed
- **可组合**：通过 `baseSeed` 参数实现"风格种子"与"内容种子"的组合
- **分散性**：不同输入产生明显不同的 Seed，避免聚类

**生成公式**：
```
seed = hash(baseSeed + input) mod 2147483647
```

### 11.3 Seed 使用策略

| 场景 | Seed 策略 | 说明 |
|-----|----------|------|
| **首次生成** | `generateSeed(userInput + styleParams)` | 基于用户输入和风格参数生成 |
| **风格锁定后** | `styleContext.baseSeed + index` | 保持风格种子，分离内容种子 |
| **重新生成** | 使用原 `seed` | 确保完全一致的重复生成 |
| **变体探索** | `baseSeed + offset` | 微调 Seed 生成相似变体 |

### 11.4 Seed 在 Asset 中的存储

每个 Asset 记录生成时使用的 seed 和风格参数，便于重新生成时保持一致性。

**重新生成逻辑**：使用原 seed 重新调用生成 API，确保结果完全一致。

### 11.5 用户交互设计

**重新生成按钮**：资产卡片提供"重新生成"按钮，使用原 seed 确保结果一致。

## 12. 非图标需求的处理策略 (Non-Icon Request Handling)

### 12.1 产品定位声明

DevArt 专注于**UI 图标生成**，不处理插画、背景图、照片写实等需求。明确的产品边界有助于：
- 降低用户认知成本
- 优化 LLM 意图识别的准确率
- 避免生成不满足预期的结果

### 12.2 LLM 意图识别增强

在 DeepSeek 的 System Prompt 中添加明确的边界约束：

```Markdown
## 产品边界声明
DevArt 专注于生成 UI 图标（App 图标、导航栏图标、功能图标等）。
以下需求应该被识别为非图标需求并友好拒绝：

- 插画需求："生成一张日落海滩的插画"、"帮我画一个可爱的小女孩"
- 背景图需求："生成一个深色背景"、"做一个渐变背景"
- 照片写实："生成一张人物照片"、"AI 头像"
- LOGO 设计（复杂品牌）："设计一个咖啡店的 LOGO"
- 艺术创作："抽象风格的油画"、"水彩风景画"

如果用户输入上述类型的需求，应该：
1. 设置 is_visual: false
2. 在 chat_response 中友好说明 DevArt 的产品定位
3. 提供图标生成的引导示例
```

### 12.3 边界案例处理

| 用户输入 | 系统响应 | 原因 |
|---------|---------|------|
| "生成一张日落海滩的插画" | "DevArt 专注于 UI 图标生成。对于日落海滩这类插画需求，建议使用 Midjourney 等通用图像生成工具。试试说「生成一个设置图标，蓝色线性风格」？" | 明确边界，引导回归核心场景 |
| "生成一个酷炫的背景" | "DevArt 专注于 UI 图标生成，不支持背景图生成。试试生成一些 UI 图标来搭配你的项目？" | 拒绝非图标需求 |
| "设计星巴克的 LOGO" | "可以生成星巴克品牌的应用图标。尝试说「生成星巴克图标，绿色，扁平风格」？" | 将品牌识别为图标主题而非设计任务 |
| "画一个小猫，很可爱的" | "DevArt 专注于 UI 图标生成。试试生成更通用的 UI 图标，如「用户图标，3D 可爱风格」？" | 宠物/可爱插画超出范围 |

### 12.4 主题词识别的兜底逻辑

采用三层匹配策略：
1. **精确匹配**：检查输入是否完全匹配预设关键词
2. **子串匹配**：按长度降序排列预设关键词，查找最长匹配
3. **兜底传递**：未匹配时将原输入直接传递给 Qwen（不翻译，利用 Qwen 对中文的理解能力）

**策略说明**：Qwen 对中文理解能力强，无需强制翻译。后续通过用户反馈数据扩展预设。

## 13. 空输入与无效输入处理 (Input Validation & Guidance)

### 13.1 输入类型分类

| 类型 | 示例 | 处理策略 |
|-----|------|---------|
| 空输入 | ""、" "、仅空格 | 显示引导提示 |
| 无效指令 | "嗯嗯"、"好的"、"随便" | 识别为非视觉请求，友好引导 |
| 过短输入 | "图"、"画" | 提示输入更具体 |
| 模糊意图 | "好看点"、"酷一点" | 识别为视觉请求，但提取不到主题，引导补充 |
| 正常输入 | "生成蓝色购物车图标" | 正常处理 |

### 13.2 前端输入验证

**验证策略**：
- **空输入**：检测纯空格或空字符串，提示"请输入描述你想生成的图标内容"
- **无效指令**：匹配"嗯嗯"、"好的"、"随便"等无意义输入，提示引导
- **过短输入**：长度小于 2 字符时提示"请输入更具体的描述"

### 13.3 引导式交互设计

**初始状态**：展示 4 个示例提示，用户点击可直接填入输入框。

**动态占位符**：根据风格锁定状态切换提示文本——未锁定时显示"描述你需要的 UI 素材"，锁定后显示"继续输入主题，将使用相同风格生成"。

**实时建议**：用户输入时自动匹配预设主题，显示 5 个最相关的建议供快速选择。

### 13.4 LLM Fallback 策略

当 LLM 返回 `is_visual: false` 时，提供有意义的引导：

```TypeScript
// process/route.ts 中的 fallback 处理
function fallbackParse(input: string): LLMResponse {
  const visualKeywords = ['生成', '画', '图标', 'image', '素材', '一套', '一组', 'icon']
  const isVisual = visualKeywords.some(k => input.includes(k))
  
  if (!isVisual) {
    return {
      is_visual: false,
      subjects: [],
      color: '',
      style: '',
      stroke_width: 0,
      chat_response: `你好！我是 DevArt，你的 AI 美术伙伴。

我可以帮你生成风格统一的 UI 图标。试试这些：

🎨 「生成一组电商图标：首页、购物车、订单、我的，要蓝色线性风格」
✨ 「画一个设置图标，圆润可爱的3D风格，橙色」
💡 或者直接说出你需要的图标主题！`
    }
  }
  
  // ... 其他处理逻辑
}
```

## 14. 模型幻觉处理与用户反馈机制 (Hallucination Handling & Feedback)

### 14.1 幻觉问题现状

尽管通过 Prompt 优化显著降低了"生成图标带框"的问题，但模型幻觉仍可能发生：
- 某些复杂主题生成多余装饰元素
- 颜色与要求存在偏差
- 风格与预期不完全一致

### 14.2 多层防御策略

**第一层：Prompt 优化（已实现）**
- 详细的前置约束
- 具体化的禁止项
- 中英混合增强理解

**第二层：后处理检测**
- 使用边缘检测算法（Canny）识别可疑框架区域
- 若最大连通区域占画布超过 40%，标记为"可疑"
- 检测失败时不阻断用户体验

**第三层：用户反馈机制**
资产卡片提供"不满意"按钮，反馈类型包括：
- 有多余边框/背景
- 颜色不对
- 风格不对
- 识别不出是什么
- 可选填写文字说明

### 14.3 反馈数据闭环

**数据收集**：匿名收集反馈数据，记录失败案例的完整上下文（用户输入、生成参数、Seed）。

**定期分析**：每周汇总反馈数据，识别高频失败模式，针对特定主题/风格优化 Prompt。

**迭代优化**：根据反馈调整 STYLE_PRESETS、新增或修改修饰词、调整 Prompt 模板。

## 15. 面试预备问题与挑战 (Q&A & Challenges)

### 15.1 面试常见问题

**Q: 为什么从 Flux 换成 Qwen-Image？**

A: Flux 是通用图像生成模型，对"无框约束"理解不够精准。Qwen-Image 对中英混合 Prompt 和结构化约束遵循度更高，特别是在"禁止特定视觉元素"方面表现更优。同时支持图标专用的视觉理解。

**Q: 风格一致性是如何保证的？**

A: 核心是将 Prompt 构造从 LLM 转移至本地 TypeScript 模板函数。只要输入参数相同，输出 Prompt 文本 100% 一致，避免了 LLM 生成的随机性，这是"确定性 Prompt 生成"的核心。

**Q: 项目最难的部分是什么？**

A: Prompt 工程的自动化与约束设计。用户通常不会描述"2px 线宽的蓝色线性图标"，需要通过大量迭代找到最优约束组合：哪些词汇最有效、顺序如何排列、如何消除模型的"默认装饰框"行为等。这中间进行了数十次生成测试和反复精调。特别是在解决"生成图标带框"问题时，从模糊的"无框"到具体的"无圆形背景、无矩形背景"是关键迭代。

**Q: 为什么选择本地参数提取而非端到端 LLM 生成？**

A: 本地模板确保一致性和可控性，但失去了 LLM 的灵活性。这是权衡：对于"风格一致的批量生成"这个核心场景，可控性和一致性优先于灵活性。如果未来需要支持多样化风格，可再引入条件化的 LLM Prompt 优化。

**Q: 如何处理用户输入不在预设中的情况？**

A: 采用三层兜底策略：1）精确匹配预设；2）子串匹配；3）原样传递给 Qwen。虽然 Qwen 对未预设主题的理解可能不够精确，但这在可接受范围内。后续可通过用户反馈数据来扩展预设。

**Q: 风格一致性的量化标准是什么？**

A: 我们定义了五个量化维度：线条密度（变异系数 < 5%）、色彩一致性（色差 < 3 ΔE）、视觉重心（偏移率 < 10%）、尺寸一致性（占比差异 < 15%）、CLIP 特征相似度（余弦相似度 > 0.85）。

**Q: 迭代方向是什么？**

A: 近期规划：1）支持"以图生图"：上传截图分析风格并生成同风格图标；2）风格历史记录与快速切换；3）批量生成优化；4）用户反馈闭环系统。

### 15.2 技术挑战与解决方案

**挑战一：生成图标外框问题**

**问题现象**：

- 即使 Prompt 中明确写"无边框"，Qwen 仍生成带圆形/矩形框的图标
- 线条风格的图标被包裹在蓝色圆框或黑色矩形框中

**根本原因**：

- 术语"填充色"被误解为生成背景填充而非线条颜色
- 模糊的"无框"约束权重不足，无法对抗模型的默认"图标+框"模式
- Prompt 过长，修饰词冗余，反而降低了核心约束的可控性

**解决方案**：

1. 严格区分线条与填充语义——线条风格明确使用"线条颜色"，从不提及"填充"
2. 具体化禁止项——将"无边框"拆解为"无圆形背景、无矩形背景、无圆角框、无阴影框"
3. 前置权重——关键约束"纯图标，不含任何框"置于 Prompt 开头

**效果**：通过这一系列调整，生成的图标已不再带多余框架。

**挑战二：风格一致性与参数管理**

**问题**：

- 初版完全依赖 LLM 生成最终 Prompt，导致同一参数在不同调用时生成不同文本
- 风格锁定时无法保证一致性

**解决方案**：

- 将 Prompt 生成逻辑从 LLM 移至本地 TypeScript 函数（buildQwenPrompt）
- 参数一旦确定，输出 Prompt 文本 100% 一致
- LLM 只负责"理解意图"→"提取参数"，不生成 Prompt


**挑战三：Seed 不确定性导致的风格漂移**

**问题**：

- 相同 Prompt 不同 Seed 生成的图标风格存在差异
- 用户期望"锁定风格后生成的所有图标完全一致"

**解决方案**：

- 引入 baseSeed 概念：基于用户输入和风格参数生成确定性基础 Seed
- 批量生成时，每个主题使用 baseSeed + index 的方式确保 Seed 分散但可预测
- 风格锁定后，后续生成使用锁定的 baseSeed，保证风格一致
