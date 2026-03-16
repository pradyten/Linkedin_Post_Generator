import { TopicSuggestion } from "@/types";

export const HARDCODED_TOPICS: TopicSuggestion[] = [
  {
    title: "AI Writes 25% of Google's Code Now",
    hook: "One in four lines of new code at Google wasn't written by a human. And that number is accelerating.",
    reasoning: "The 25% threshold is a concrete milestone that sparks debate about the future of software engineering.",
    source_material: "Google CEO confirmed 25% figure. Codex CLI launched. SWE-bench scores up 40% YoY. GitHub Copilot: 30% acceptance rate. 76% of devs use AI tools.",
  },
  {
    title: "The Multi-Agent Tipping Point Is Here",
    hook: "Single-model AI is hitting a ceiling. The future isn't one brilliant model, it's an orchestra of specialized agents.",
    reasoning: "Multi-agent systems are moving from research papers to production with practical open-source frameworks.",
    source_material: "Microsoft Magnetic-One for complex tasks. Open-source agent frameworks with memory and tool use. Production multi-agent patterns emerging at scale.",
  },
  {
    title: "Open-Source AI Is Closing the Gap Faster Than Anyone Expected",
    hook: "The most expensive AI lab in the world just got matched by an open-source model at 1/10th the cost.",
    reasoning: "DeepSeek R1 and Llama 4 demonstrate that open-source models are reaching parity with closed-source, reshaping competitive dynamics.",
    source_material: "DeepSeek R1 matches GPT-4 reasoning. Llama 4 Scout: 10M context window. Training costs dropping exponentially. Open weights enable fine-tuning for specific domains.",
  },
  {
    title: "Why AI Safety Just Became an Engineering Problem",
    hook: "AI safety used to be a philosophy debate. Now it's a systems engineering challenge with real deadlines.",
    reasoning: "With multi-agent deployments going production, safety has shifted from theoretical alignment to practical systems engineering.",
    source_material: "Google DeepMind's Distributional AGI Safety paper. Agent security vulnerabilities in production. Emergent behaviors in multi-agent systems. Regulatory deadlines approaching.",
  },
];
