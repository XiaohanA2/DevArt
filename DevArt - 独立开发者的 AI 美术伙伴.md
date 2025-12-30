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

### 9.3 核心数据结构

```TypeScript
// 风格参数结构化表示
interface StyleParams {
  type: 'flat-line' | 'flat-fill' | '3d-soft' | 'outline' | ...
  color: { primary: string, background: string }
  stroke: { width: number, style: 'solid' | 'dashed' | 'none' }
  modifiers: string[]
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

## 10. 面试预备问题 (Q&A)

- **Q: 为什么从 Flux 换成 Qwen-Image？**
  - *A:* Flux 是通用图像生成模型，对"无框约束"理解不够精准。Qwen-Image 对中英混合 Prompt 和结构化约束遵循度更高，特别是在"禁止特定视觉元素"方面表现更优。同时支持图标专用的视觉理解。
- **Q: 风格一致性是如何保证的？**
  - *A:* 核心是将 Prompt 构造从 LLM 转移至本地 TypeScript 模板函数。只要输入参数相同，输出 Prompt 文本 100% 一致，避免了 LLM 生成的随机性，这是"确定性 Prompt 生成"的核心。
- **Q: 项目最难的部分是什么？**
  - *A:* **Prompt 工程的自动化与约束设计**。用户通常不会描述"2px 线宽的蓝色线性图标"，需要通过大量迭代找到最优约束组合：哪些词汇最有效、顺序如何排列、如何消除模型的"默认装饰框"行为等。这中间进行了数十次生成测试和反复精调。特别是在解决"生成图标带框"问题时，从模糊的"无框"到具体的"无圆形背景、无矩形背景"是关键迭代。
- **Q: 为什么选择本地参数提取而非端到端 LLM 生成？**
  - *A:* 本地模板确保一致性和可控性，但失去了 LLM 的灵活性。这是权衡：对于"风格一致的批量生成"这个核心场景，可控性和一致性优先于灵活性。如果未来需要支持多样化风格，可再引入条件化的 LLM Prompt 优化。
- **Q：迭代方向**
  - *A:* 支持"以图生图"：上传一张截图，分析风格并生成同风格图标、风格历史记录与快速切换

### 挑战一：生成图标外框问题

**问题现象**：

- 即使 Prompt 中明确写"无边框"，Qwen 仍生成带圆形/矩形框的图标
- 线条风格的图标被包裹在蓝色圆框或黑色矩形框中

**根本原因**：

- 术语"填充色"被误解为生成背景填充而非线条颜色
- 模糊的"无框"约束权重不足，无法对抗模型的默认"图标+框"模式
- Prompt 过长，修饰词冗余，反而降低了核心约束的可控性

**解决方案**：

1. **严格区分线条与填充语义** - 线条风格明确使用"线条颜色"，从不提及"填充"
2. **具体化禁止项** - 将"无边框"拆解为 `无圆形背景、无矩形背景、无圆角框、无阴影框`
3. **前置权重** - 关键约束 "纯图标，不含任何框" 置于 Prompt 开头

**效果**：通过这一系列调整，生成的图标已不再带多余框架。

### 挑战二：风格一致性与参数管理

**问题**：

- 初版完全依赖 LLM 生成最终 Prompt，导致同一参数在不同调用时生成不同文本
- 风格锁定时无法保证一致性

**解决方案**：

- 将 Prompt 生成逻辑从 LLM 移至本地 TypeScript 函数 (`buildQwenPrompt`)
- 参数一旦确定，输出 Prompt 文本 100% 一致
- LLM 只负责"理解意图" → "提取参数"，不生成 Prompt
