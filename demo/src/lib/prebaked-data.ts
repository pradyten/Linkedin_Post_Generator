import { TrendItem, AnalyzedTrend, TopicSuggestion } from "@/types";

export const PREBAKED_SOURCES: TrendItem[] = [
  {
    title: "Claude 4.5 Sonnet Shows Major Gains in Agentic Coding Benchmarks",
    summary: "Anthropic's latest Claude 4.5 Sonnet model achieves state-of-the-art results on SWE-bench and agentic coding evaluations, demonstrating significant improvements in multi-step reasoning and tool use.",
    url: "https://www.anthropic.com/news/claude-4-5-sonnet",
    source: "tavily",
    timestamp: new Date().toISOString(),
  },
  {
    title: "OpenAI Introduces Codex CLI for Terminal-Based AI Coding",
    summary: "OpenAI launches Codex CLI, an open-source tool that brings AI-powered coding assistance directly to the terminal with multi-file editing capabilities.",
    url: "https://openai.com/index/codex-cli",
    source: "tavily",
    timestamp: new Date().toISOString(),
  },
  {
    title: "Google DeepMind Publishes Gemini 2.5 Technical Report",
    summary: "Google DeepMind releases the full technical report for Gemini 2.5, detailing its hybrid architecture and improvements in multimodal reasoning.",
    url: "https://blog.google/technology/ai/gemini-model-updates",
    source: "rss",
    timestamp: new Date().toISOString(),
  },
  {
    title: "Show HN: Open-source AI agent framework with tool use and memory",
    summary: "A new open-source framework for building AI agents with persistent memory, tool use, and multi-agent collaboration (HN score: 342, 89 comments)",
    url: "https://news.ycombinator.com/item?id=example",
    source: "hackernews",
    timestamp: new Date().toISOString(),
  },
  {
    title: "Meta Releases Llama 4 Scout and Maverick Models",
    summary: "Meta announces Llama 4 family including Scout (109B params, 10M context) and Maverick models, introducing a new mixture-of-experts architecture.",
    url: "https://ai.meta.com/blog/llama-4",
    source: "rss",
    timestamp: new Date().toISOString(),
  },
  {
    title: "AI Coding Assistants Now Write 25% of All New Code at Google",
    summary: "Google CEO reveals that AI coding tools now generate over 25% of new code at the company, marking a significant milestone in AI-assisted software development.",
    url: "https://techcrunch.com/ai-google-coding",
    source: "tavily",
    timestamp: new Date().toISOString(),
  },
  {
    title: "Microsoft Introduces Magnetic-One Multi-Agent System",
    summary: "Microsoft Research publishes Magnetic-One, a generalist multi-agent system for solving complex tasks with specialized agent roles and orchestration.",
    url: "https://www.microsoft.com/research/magnetic-one",
    source: "rss",
    timestamp: new Date().toISOString(),
  },
  {
    title: "DeepSeek-R1 Achieves Near-GPT-4 Performance at Fraction of Cost",
    summary: "Chinese AI lab DeepSeek releases R1, a reasoning model that matches GPT-4 on multiple benchmarks while being significantly more cost-efficient to run.",
    url: "https://huggingface.co/deepseek-ai",
    source: "hackernews",
    timestamp: new Date().toISOString(),
  },
];

export const PREBAKED_TRENDS: AnalyzedTrend[] = [
  {
    theme: "AI Coding Revolution",
    title: "AI-Generated Code Crosses 25% Threshold at Major Tech Companies",
    summary: "Google reports 25% of new code is AI-generated, while new tools like Codex CLI push AI coding into the terminal. This marks a tipping point where AI isn't just assisting developers, it's becoming a primary code author, raising questions about code quality, ownership, and the changing role of software engineers.",
    sources: [
      "https://techcrunch.com/ai-google-coding",
      "https://openai.com/index/codex-cli",
    ],
    relevance_score: 9,
  },
  {
    theme: "Model Releases",
    title: "Claude 4.5, Gemini 2.5, and Llama 4 Reshape the Foundation Model Landscape",
    summary: "Three major model families receive significant upgrades within the same week. Claude 4.5 Sonnet leads agentic benchmarks, Gemini 2.5 introduces hybrid architectures, and Llama 4 pushes open-source boundaries with 10M context windows. The competitive dynamics are accelerating faster than ever.",
    sources: [
      "https://www.anthropic.com/news/claude-4-5-sonnet",
      "https://blog.google/technology/ai/gemini-model-updates",
      "https://ai.meta.com/blog/llama-4",
    ],
    relevance_score: 9,
  },
  {
    theme: "Multi-Agent Systems",
    title: "Multi-Agent Architectures Go Mainstream with Microsoft and Open-Source Frameworks",
    summary: "Microsoft's Magnetic-One and a surge in open-source agent frameworks signal that multi-agent systems are moving from research to production. Engineers now have practical tools for orchestrating specialized agents, but reliability and debugging remain open challenges.",
    sources: [
      "https://www.microsoft.com/research/magnetic-one",
      "https://news.ycombinator.com/item?id=example",
    ],
    relevance_score: 8,
  },
  {
    theme: "Open Source AI",
    title: "DeepSeek R1 Proves High-Quality Reasoning Doesn't Require Massive Budgets",
    summary: "DeepSeek's R1 model matches GPT-4 level reasoning at a fraction of the training and inference cost. This challenges the narrative that only well-funded Western labs can produce frontier models, with significant implications for AI democratization.",
    sources: ["https://huggingface.co/deepseek-ai"],
    relevance_score: 8,
  },
];

export const PREBAKED_TOPICS: TopicSuggestion[] = [
  {
    title: "AI Writes 25% of Google's Code Now",
    hook: "One in four lines of new code at Google wasn't written by a human. And that number is accelerating.",
    reasoning: "The 25% threshold is a concrete, quotable milestone that will surprise many engineers and spark debate about the future of their profession.",
    source_material: "Google CEO confirmed 25% figure. Codex CLI launched for terminal-based AI coding. Multiple companies reporting similar trends. SWE-bench scores improving rapidly.",
  },
  {
    title: "The Multi-Agent Tipping Point Is Here",
    hook: "Single-model AI is hitting a ceiling. The future isn't one brilliant model, it's an orchestra of specialized agents.",
    reasoning: "Microsoft's Magnetic-One and new open-source frameworks make multi-agent systems practical for the first time, shifting how engineers architect AI applications.",
    source_material: "Microsoft Magnetic-One for complex tasks. Open-source agent frameworks with memory and tool use. Production multi-agent patterns emerging.",
  },
  {
    title: "Three Foundation Models Launched in One Week",
    hook: "Claude 4.5, Gemini 2.5, and Llama 4 all dropped in the same week. The model wars just went nuclear.",
    reasoning: "The simultaneous release of three major model upgrades is unprecedented and signals a new pace of competition that directly impacts engineering decisions.",
    source_material: "Claude 4.5 Sonnet leads agentic benchmarks. Gemini 2.5 hybrid architecture. Llama 4 Scout with 10M context. Each targeting different strengths.",
  },
];

export const PREBAKED_RESEARCH = `### Key Data Points
- Google CEO confirmed that AI tools now generate over 25% of all new code at the company, up from under 10% just 18 months ago
- OpenAI's Codex CLI enables multi-file editing directly from the terminal, bridging the gap between AI assistants and developer workflows
- SWE-bench scores for leading AI models have improved by 40% in the past year, with Claude 4.5 Sonnet achieving state-of-the-art results
- GitHub Copilot reports that developers accept AI suggestions for 30% of their code on average
- Stack Overflow's 2024 survey shows 76% of developers now use or plan to use AI tools in their workflow

### Credible Sources
TechCrunch AI Coverage: https://techcrunch.com/ai-google-coding
OpenAI Codex CLI Announcement: https://openai.com/index/codex-cli
Anthropic Claude Release: https://www.anthropic.com/news/claude-4-5-sonnet

### Narrative Angles
- The "25% threshold" is a psychological milestone that forces the industry to reckon with AI's role: we've moved from "AI assists coding" to "AI is a primary code author"
- Terminal-native AI tools (Codex CLI) vs IDE-integrated tools (Copilot, Cursor) represent two competing visions for the developer experience
- The quality gap is closing fast: with SWE-bench improvements of 40% YoY, the question shifts from "can AI code?" to "when does AI code better than humans for routine tasks?"

### Strategic Keywords & Hashtags
Keywords: AI coding, code generation, developer productivity, software engineering future
#AICoding #SoftwareEngineering #DeveloperProductivity #CodeGeneration #AITools #FutureOfWork #TechTrends #AIEngineering

### Contrarian/Surprising Takes
- More AI-generated code doesn't necessarily mean fewer developers. Google's engineering headcount hasn't decreased; engineers are shifting to higher-level architecture and review roles
- The real disruption isn't code generation, it's code review. When 25% of code is AI-written, the bottleneck becomes verification, not creation
- Open-source AI coding tools may democratize software development more than coding bootcamps ever did`;

export const PREBAKED_DRAFT = `One in four lines of new code at Google wasn't written by a human.

And that number is accelerating fast.

Google's CEO just confirmed that AI tools now generate over 25% of all new code at the company. Meanwhile, OpenAI dropped Codex CLI (https://openai.com/index/codex-cli), bringing AI coding straight to the terminal.

Here's what most people are missing about this shift:

1\uFE0F\u20E3 \u{1F3AF} The 25% threshold changes the conversation entirely

This isn't about "AI-assisted coding" anymore. When a quarter of production code comes from AI, we've crossed into "AI as primary author" territory. SWE-bench scores improved 40% year-over-year, with Claude 4.5 Sonnet now leading agentic coding benchmarks.

2\uFE0F\u20E3 \u26A1 The real bottleneck just shifted

More AI-generated code doesn't mean fewer developers. Google's engineering headcount hasn't shrunk. What's changing is the job itself: engineers are becoming architects and reviewers. The bottleneck isn't writing code anymore. It's verifying AI-written code at scale.

3\uFE0F\u20E3 \u{1F310} Two competing visions for AI-native development

IDE-integrated tools (Copilot, Cursor) vs. terminal-native tools (Codex CLI). The developer experience is splitting in two. IDE tools win on UX. Terminal tools win on composability and automation. The winner will shape how the next generation of software gets built.

\u{1F9E0} The bigger picture: we're not replacing developers. We're redefining what "developer" means in 2025.

When 25% of code is machine-generated, the most valuable skill isn't writing code. It's knowing what to build and how to verify it works.

What's your experience with AI coding tools? Has it changed how you work day-to-day?

\u{1F447} Let's discuss in the comments.

#AICoding #SoftwareEngineering #AITools #DeveloperProductivity #CodeGeneration #FutureOfWork #AIEngineering`;

export const PREBAKED_REFINED = `One in four lines of new code at Google wasn't written by a human.

And that number is accelerating.

Google's CEO confirmed AI tools now generate 25% of all new code. Meanwhile, OpenAI just dropped Codex CLI (https://openai.com/index/codex-cli), bringing AI coding straight to the terminal.

Here's what most people are missing:

1\uFE0F\u20E3 \u{1F3AF} The 25% mark changes everything

This isn't "AI-assisted coding" anymore. A quarter of production code now comes from AI. SWE-bench scores improved 40% YoY, with Claude 4.5 Sonnet leading agentic benchmarks (https://www.anthropic.com/news/claude-4-5-sonnet).

We crossed from assistant to co-author.

2\uFE0F\u20E3 \u26A1 The bottleneck just shifted

Google's engineering headcount hasn't shrunk. Engineers are becoming architects and reviewers. The constraint isn't writing code anymore, it's verifying AI-written code at scale.

3\uFE0F\u20E3 \u{1F310} Two competing visions emerging

IDE tools (Copilot, Cursor) vs. terminal-native tools (Codex CLI). IDE wins on UX. Terminal wins on composability and automation. The winner shapes how the next generation of software gets built.

\u{1F9E0} We're not replacing developers. We're redefining what "developer" means.

When 25% of code is machine-generated, the most valuable skill isn't writing code. It's knowing what to build and verifying it works.

Has AI coding changed how you work day-to-day?

\u{1F447} Let's discuss in the comments.

#AICoding #SoftwareEngineering #AITools #DeveloperProductivity #AIEngineering`;
