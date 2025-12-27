'use client';

import { AnimatePresence, motion } from 'framer-motion';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * KV STUDIO PRO - Dark Mode Creative Suite
 * 重构说明：
 * 1. 修复了 ReferenceError: tailwind 错误，确保所有样式通过标准 className 传递。
 * 2. 修复了图标库引起的 TypeError，改用内联 SVG 以确保在所有环境下 100% 可运行。
 * 3. 保持了深色模式 (zinc-950) 和 Bento Grid 布局。
 */

// --- 视觉风格数据 ---
const VISUAL_STYLES = [
  {
    id: 'magazine',
    label: '杂志编辑',
    desc: 'Editorial',
    gradient: 'from-zinc-100 to-zinc-400',
    tooltip: '杂志编辑（适合：时尚 / 美妆 / 高端生活方式）',
  },
  {
    id: 'watercolor',
    label: '水彩艺术',
    desc: 'Artistic',
    gradient: 'from-pink-200 to-rose-300',
    tooltip: '水彩艺术（适合：礼品 / 家居 / 手作氛围）',
  },
  {
    id: 'tech',
    label: '科技未来',
    desc: 'Cybernetic',
    gradient: 'from-cyan-500 to-blue-600',
    tooltip: '科技未来（适合：数码 / 电子 / 工业产品）',
  },
  {
    id: 'film',
    label: '复古胶片',
    desc: 'Nostalgic',
    gradient: 'from-amber-700 to-orange-900',
    tooltip: '复古胶片（适合：咖啡 / 酒类 / 复古品牌故事）',
  },
  {
    id: 'nordic',
    label: '极简北欧',
    desc: 'Minimal',
    gradient: 'from-stone-200 to-stone-400',
    tooltip: '极简北欧（适合：家居 / 生活用品 / 极简品牌）',
  },
  {
    id: 'neon',
    label: '霓虹赛博',
    desc: 'Cyberpunk',
    gradient: 'from-purple-500 to-fuchsia-600',
    tooltip: '霓虹赛博（适合：潮玩 / 游戏 / 夜景氛围）',
  },
  {
    id: 'organic',
    label: '自然有机',
    desc: 'Organic',
    gradient: 'from-emerald-600 to-teal-800',
    tooltip: '自然有机（适合：食品 / 护肤 / 可持续品牌）',
  },
] as const;

const TYPOGRAPHY_STYLES = [
  {
    id: 'serif_grid',
    label: '粗衬线大标题',
    styleClass: 'font-serif font-bold tracking-tight',
  },
  {
    id: 'glass',
    label: '玻璃拟态',
    styleClass: 'font-sans font-light tracking-wide opacity-80',
  },
  {
    id: '3d',
    label: '3D 浮雕质感',
    styleClass: 'font-black uppercase tracking-widest',
  },
  {
    id: 'handwritten',
    label: '手写体艺术',
    styleClass: 'italic font-serif',
  },
  {
    id: 'neon_line',
    label: '霓虹描边',
    styleClass: 'font-mono text-xs uppercase',
  },
  {
    id: 'thin',
    label: '极细线条留白',
    styleClass: 'font-sans font-thin tracking-[0.2em]',
  },
] as const;

const CARD_TYPES = [
  {
    id: 1,
    code: '01',
    title: '主KV / Hero Shot',
    goal: '吸引注意',
    usage: '详情页首屏，必须在 0.5 秒内抓住眼球。',
    type: 'Hero',
  },
  {
    id: 2,
    code: '02',
    title: '使用场景 / Lifestyle',
    goal: '建立代入感',
    usage: '展示产品在真实环境中的状态。',
    type: 'Lifestyle',
  },
  {
    id: 3,
    code: '03',
    title: '工艺概念 / Process',
    goal: '建立信任',
    usage: '展示原料、科技或制作工艺。',
    type: 'Process',
  },
  {
    id: 4,
    code: '04',
    title: '细节特写 / Detail A',
    goal: '消除疑虑',
    usage: '放大质感，展示材质纹理。',
    type: 'Detail',
  },
  {
    id: 5,
    code: '05',
    title: '细节特写 / Detail B',
    goal: '强化认知',
    usage: '侧面或背面的关键设计细节。',
    type: 'Detail',
  },
  {
    id: 6,
    code: '06',
    title: '细节特写 / Detail C',
    goal: '功能展示',
    usage: '核心功能的视觉化呈现。',
    type: 'Detail',
  },
  {
    id: 7,
    code: '07',
    title: '细节特写 / Detail D',
    goal: '补充说明',
    usage: '包装或配件的展示。',
    type: 'Detail',
  },
  {
    id: 8,
    code: '08',
    title: '品牌故事 / Brand',
    goal: '情感共鸣',
    usage: '传递品牌理念。',
    type: 'Brand',
  },
  {
    id: 9,
    code: '09',
    title: '参数规格 / Specs',
    goal: '理性决策',
    usage: '清晰的数据化呈现。',
    type: 'Specs',
  },
  {
    id: 10,
    code: '10',
    title: '使用指南 / Guide',
    goal: '降低门槛',
    usage: '步骤图或注意事项。',
    type: 'Guide',
  },
] as const;

type VisualStyleId = (typeof VISUAL_STYLES)[number]['id'];

type TypographyStyleId = (typeof TYPOGRAPHY_STYLES)[number]['id'];

type CardType = (typeof CARD_TYPES)[number];

// --- 简单 SVG 图标组件 (替代 lucide-react 以防加载失败) ---
const IconBox = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

const IconWand = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M15 4V2" />
    <path d="M15 16v-2" />
    <path d="M8 9H6" />
    <path d="M20 9h-2" />
    <path d="M17.66 6.34 19 5" />
    <path d="M11 13l2-2" />
    <path d="M5 13l1.34-1.34" />
    <path d="M12 22l-2-2" />
    <path d="M14 20l-4-4" />
  </svg>
);
const IconSparkles = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="m5 3 1 1" />
    <path d="m19 3-1 1" />
    <path d="m5 21 1-1" />
    <path d="m19 21-1-1" />
  </svg>
);
const IconSettings = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const SectionHeader = ({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType;
  title: string;
}) => (
  <div className="mb-4 flex items-center gap-2 text-zinc-400">
    <Icon />
    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
      {title}
    </span>
  </div>
);

const VisualStyleCard = ({
  selected,
  onClick,
  style,
  isAiSelected,
}: {
  selected: boolean;
  onClick: () => void;
  style: (typeof VISUAL_STYLES)[number];
  isAiSelected: boolean;
}) => (
  <div
    onClick={onClick}
    title={style.tooltip}
    className={`group relative cursor-pointer select-none overflow-hidden rounded-xl border p-3 transition-all duration-300 ${
      selected
        ? 'border-purple-500/70 bg-zinc-900/40'
        : 'border-zinc-800/70 bg-zinc-950/30 hover:border-zinc-600/70'
    } ${isAiSelected ? 'kv-ai-shimmer' : ''}`}
  >
    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(112,67,241,0.25),transparent_45%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.18),transparent_40%)] opacity-80" />
    <div className="relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">{style.label}</span>
        {selected && (
          <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold text-purple-300">
            ACTIVE
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div
          className={`h-2 w-10 rounded bg-gradient-to-r ${style.gradient} opacity-80`}
        ></div>
        <span className="text-[10px] text-zinc-500">{style.desc}</span>
      </div>
    </div>
  </div>
);

const TypoStyleCard = ({
  selected,
  onClick,
  typo,
}: {
  selected: boolean;
  onClick: () => void;
  typo: (typeof TYPOGRAPHY_STYLES)[number];
}) => (
  <div
    onClick={onClick}
    className={`group cursor-pointer rounded-xl border p-3 transition-all duration-300 ${
      selected
        ? 'border-purple-500/70 bg-zinc-900/40'
        : 'border-zinc-800/70 bg-zinc-950/30 hover:border-zinc-600/70'
    }`}
  >
    <span className="text-xs font-bold">{typo.label}</span>
    <div className="mt-2 rounded-lg border border-white/5 bg-black/20 px-2 py-2">
      <span
        className={`block text-[12px] leading-tight text-zinc-200 ${typo.styleClass}`}
        style={
          typo.id === 'neon_line'
            ? {
                textShadow:
                  '0 0 10px rgba(112,67,241,0.55), 0 0 28px rgba(112,67,241,0.25)',
                WebkitTextStroke: '0.6px rgba(195, 171, 255, 0.65)',
                color: 'rgba(255,255,255,0.06)',
              }
            : typo.id === '3d'
              ? {
                  textShadow:
                    '0 1px 0 rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.55)',
                }
              : typo.id === 'glass'
                ? {
                    textShadow: '0 0 22px rgba(255,255,255,0.08)',
                  }
                : undefined
        }
      >
        KV STUDIO
      </span>
      <span className="mt-1 block text-[10px] text-zinc-500">Preview</span>
    </div>
  </div>
);

export default function KvWorkshopPage() {
  const [magicMatchEnabled, setMagicMatchEnabled] = useState(true);
  const [productName, setProductName] = useState('量子降噪耳机');
  const [sellingPoints, setSellingPoints] = useState(
    '42dB深度降噪\n液态硅胶耳罩\n70小时超长续航'
  );

  const [productImageUrl, setProductImageUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [productIntroFileName, setProductIntroFileName] = useState<string | null>(
    null
  );
  const [isIntroDragOver, setIsIntroDragOver] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<VisualStyleId>('tech');
  const [selectedTypo, setSelectedTypo] = useState<TypographyStyleId>('neon_line');

  const [hasModel, setHasModel] = useState(false);
  const [modelDesc, setModelDesc] = useState('');
  const [hasScene, setHasScene] = useState(false);
  const [sceneDesc, setSceneDesc] = useState('');
  const [hasDataViz, setHasDataViz] = useState(false);
  const [dataVizNotes, setDataVizNotes] = useState('');
  const [otherReqs, setOtherReqs] = useState('');

  const [flippedCardIds, setFlippedCardIds] = useState<number[]>([]);
  const [expandedCardId, setExpandedCardId] = useState<number | null>(null);
  const [copiedCardId, setCopiedCardId] = useState<number | null>(null);

  const [activePromptEditorCardId, setActivePromptEditorCardId] = useState<number | null>(null);

  type GenerationPhase = 'idle' | 'scanning' | 'thinking' | 'revealing' | 'typing' | 'done';
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('idle');
  const [aiThinkingText, setAiThinkingText] = useState('');
  const [autoRevealIndex, setAutoRevealIndex] = useState(0);

  type CardRenderStatus = 'idle' | 'loading' | 'done';
  const [cardRenderStatusById, setCardRenderStatusById] = useState<Record<number, CardRenderStatus>>({});
  const [cardRefreshPulseById, setCardRefreshPulseById] = useState<Record<number, number>>({});
  const [hasTypedOnceByCardId, setHasTypedOnceByCardId] = useState<Record<number, boolean>>({});

  const [fullPromptByCardId, setFullPromptByCardId] = useState<Record<number, string>>({});
  const [typedPromptByCardId, setTypedPromptByCardId] = useState<Record<number, string>>({});
  const [isTypingByCardId, setIsTypingByCardId] = useState<Record<number, boolean>>({});

  const typingTimersRef = useRef<Record<number, number>>({});
  const promptTextareaRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});

  const [isClientMounted, setIsClientMounted] = useState(false);

  const normalizedSellingPoints = useMemo(() => {
    return sellingPoints
      .split(/\r?\n/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .join(', ');
  }, [sellingPoints]);

  const THINKING_PHRASES = useMemo(
    () => [
      '匹配科技未来光影矩阵...',
      '构思 70 小时续航视觉卖点...',
      '分析工业设计比例与材质反光...',
      '推演电商视觉层级与信息密度...',
      '生成镜头语言与品牌情绪曲线...',
    ],
    []
  );

  const cleanupTypingTimers = () => {
    Object.values(typingTimersRef.current).forEach((t) => window.clearInterval(t));
    typingTimersRef.current = {};
  };

  const stopTypewriterAndFocus = (cardId: number) => {
    const full = fullPromptByCardId[cardId] ?? '';
    if (typingTimersRef.current[cardId]) {
      window.clearInterval(typingTimersRef.current[cardId]);
      delete typingTimersRef.current[cardId];
    }
    setTypedPromptByCardId((prev) => ({ ...prev, [cardId]: full }));
    setIsTypingByCardId((prev) => ({ ...prev, [cardId]: false }));
    setActivePromptEditorCardId(cardId);
    window.setTimeout(() => {
      const el = promptTextareaRefs.current[cardId];
      el?.focus();
    }, 0);
  };

  const startTypewriterForCard = (cardId: number) => {
    const full = fullPromptByCardId[cardId] ?? '';
    setIsTypingByCardId((prev) => ({ ...prev, [cardId]: true }));
    setTypedPromptByCardId((prev) => ({ ...prev, [cardId]: '' }));
    if (typingTimersRef.current[cardId]) window.clearInterval(typingTimersRef.current[cardId]);

    let i = 0;
    typingTimersRef.current[cardId] = window.setInterval(() => {
      i += 2;
      const next = full.slice(0, i);
      setTypedPromptByCardId((prev) => ({ ...prev, [cardId]: next }));
      if (i >= full.length) {
        window.clearInterval(typingTimersRef.current[cardId]);
        delete typingTimersRef.current[cardId];
        setIsTypingByCardId((prev) => ({ ...prev, [cardId]: false }));
      }
    }, 18);
  };

  const runGeneration = () => {
    cleanupTypingTimers();
    setActivePromptEditorCardId(null);
    setExpandedCardId(null);
    setGenerationPhase('scanning');

    const computed: Record<number, string> = {};
    CARD_TYPES.forEach((c) => {
      computed[c.id] = getPrompt(c.type).replace(/^\/imagine prompt:\s*/i, '');
    });
    setFullPromptByCardId(computed);
    setTypedPromptByCardId({});
    setIsTypingByCardId({});
    setFlippedCardIds([]);
    setAutoRevealIndex(0);

    const nextStatus: Record<number, CardRenderStatus> = {};
    CARD_TYPES.forEach((c) => {
      nextStatus[c.id] = 'loading';
    });
    setCardRenderStatusById(nextStatus);

    window.setTimeout(() => {
      setGenerationPhase('thinking');
    }, 1500);
  };

  useEffect(() => {
    if (generationPhase !== 'thinking') return;
    setAiThinkingText(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);
    const t1 = window.setInterval(() => {
      setAiThinkingText(THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)]);
    }, 650);
    const t2 = window.setTimeout(() => {
      window.clearInterval(t1);
      setGenerationPhase('revealing');
    }, 1200 + Math.floor(Math.random() * 800));
    return () => {
      window.clearInterval(t1);
      window.clearTimeout(t2);
    };
  }, [THINKING_PHRASES, generationPhase]);

  useEffect(() => {
    if (generationPhase !== 'revealing') return;
    setAutoRevealIndex(0);
    setFlippedCardIds([]);
    const t = window.setInterval(() => {
      setAutoRevealIndex((prev) => {
        const next = prev + 1;
        const idx = prev;
        const card = CARD_TYPES[idx];
        if (card) {
          setCardRenderStatusById((p) => ({ ...p, [card.id]: 'done' }));
        }

        if (next >= CARD_TYPES.length) {
          window.clearInterval(t);
          window.setTimeout(() => setGenerationPhase('done'), 900);
          return next;
        }
        return next;
      });
    }, 300);
    return () => window.clearInterval(t);
  }, [generationPhase]);

  useEffect(() => {
    if (generationPhase !== 'typing') return;
    setGenerationPhase('revealing');
  }, [generationPhase]);

  useEffect(() => {
    return () => cleanupTypingTimers();
  }, []);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  const handleProductImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setProductImageUrl(url);
  };

  const onDropProductImage = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleProductImageFile(file);
  };

  const handleProductIntroFile = (file: File) => {
    setProductIntroFileName(file.name);
  };

  const onDropProductIntro = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsIntroDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleProductIntroFile(file);
  };

  const getPrompt = (cardType: string) => {
    const styleLabel = VISUAL_STYLES.find((s) => s.id === selectedStyle)?.label || '';
    const typoLabel =
      TYPOGRAPHY_STYLES.find((t) => t.id === selectedTypo)?.label || '';

    let prompt = `/imagine prompt: ${productName}`;

    if (normalizedSellingPoints) {
      prompt += `, selling points: ${normalizedSellingPoints}`;
    }

    prompt += `, ${cardType} shot. Style: ${styleLabel} aesthetic. `;

    if (hasModel) prompt += `Model: ${modelDesc}. `;
    if (hasScene) prompt += `Environment: ${sceneDesc}. `;
    if (hasDataViz) {
      prompt += `Overlay: Infographic data. `;
      if (dataVizNotes.trim()) prompt += `DataViz Notes: ${dataVizNotes.trim()}. `;
    }
    if (otherReqs.trim()) prompt += `Notes: ${otherReqs.trim()}. `;

    prompt += `Typography: ${typoLabel}. --v 6.0`;

    return prompt;
  };

  const aiRecommendedStyleIds = useMemo<VisualStyleId[]>(() => {
    if (!magicMatchEnabled) return [];
    const seed = `${productName}|${sellingPoints}`.toLowerCase();
    if (/(耳机|headphone|耳塞|audio|降噪)/.test(seed)) return ['tech', 'neon'];
    if (/(护肤|skincare|美妆|cosmetic|香水|perfume)/.test(seed)) return ['magazine', 'watercolor'];
    if (/(食品|food|organic|有机|茶|coffee|咖啡)/.test(seed)) return ['organic', 'film'];
    return ['tech'];
  }, [magicMatchEnabled, productName, sellingPoints]);

  const primaryCta = (
    <motion.button
      type="button"
      whileTap={{ scale: 0.95 }}
      onClick={runGeneration}
      className="kv-primary-btn relative overflow-hidden rounded-md px-4 py-1.5 text-xs font-bold text-white"
    >
      <span className="relative z-10">开始生成</span>
      <span className="kv-primary-btn__bg" aria-hidden="true" />
    </motion.button>
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 font-sans text-zinc-100 selection:bg-purple-500/30">
      <style jsx global>{`
        .kv-glass {
          background: rgba(18, 18, 24, 0.42);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.02) inset,
            0 18px 60px rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(14px);
        }

        .kv-ai-shimmer {
          position: relative;
        }
        .kv-ai-shimmer::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: 12px;
          padding: 1px;
          background: linear-gradient(
            110deg,
            rgba(112, 67, 241, 0) 0%,
            rgba(112, 67, 241, 0.85) 25%,
            rgba(59, 130, 246, 0.55) 50%,
            rgba(112, 67, 241, 0.85) 75%,
            rgba(112, 67, 241, 0) 100%
          );
          -webkit-mask:
            linear-gradient(#000 0 0) content-box,
            linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: kv-shimmer 2.2s linear infinite;
          pointer-events: none;
          opacity: 0.75;
        }
        @keyframes kv-shimmer {
          0% {
            filter: hue-rotate(0deg);
          }
          100% {
            filter: hue-rotate(360deg);
          }
        }

        .kv-primary-btn {
          box-shadow:
            0 0 0 1px rgba(112, 67, 241, 0.35) inset,
            0 18px 60px rgba(112, 67, 241, 0.18);
          animation: kv-pulse 2.4s ease-in-out infinite;
        }
        .kv-primary-btn__bg {
          position: absolute;
          inset: -80px;
          background:
            radial-gradient(circle at 30% 20%, rgba(112, 67, 241, 0.95), transparent 55%),
            radial-gradient(circle at 70% 20%, rgba(59, 130, 246, 0.75), transparent 55%),
            radial-gradient(circle at 40% 80%, rgba(236, 72, 153, 0.55), transparent 60%),
            radial-gradient(circle at 85% 85%, rgba(59, 130, 246, 0.55), transparent 60%);
          filter: blur(12px);
          animation: kv-flow 3.2s ease-in-out infinite;
        }
        @keyframes kv-flow {
          0% {
            transform: translate3d(-4%, -2%, 0) scale(1.02);
          }
          50% {
            transform: translate3d(4%, 2%, 0) scale(1.05);
          }
          100% {
            transform: translate3d(-4%, -2%, 0) scale(1.02);
          }
        }
        @keyframes kv-pulse {
          0%,
          100% {
            transform: translateZ(0);
          }
          50% {
            transform: translateZ(0) scale(1.01);
          }
        }

        .kv-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(112, 67, 241, 0.9), transparent);
          box-shadow: 0 0 18px rgba(112, 67, 241, 0.55);
          animation: kv-scan 1.2s linear infinite;
        }
        @keyframes kv-scan {
          0% {
            transform: translate3d(0, -10%, 0);
          }
          100% {
            transform: translate3d(0, 110%, 0);
          }
        }

        .kv-skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.08), rgba(255,255,255,0.04));
          background-size: 200% 100%;
          animation: kv-skeleton 1.1s ease-in-out infinite;
        }
        @keyframes kv-skeleton {
          0% {
            background-position: 0% 50%;
            opacity: 0.75;
          }
          50% {
            background-position: 100% 50%;
            opacity: 1;
          }
          100% {
            background-position: 0% 50%;
            opacity: 0.75;
          }
        }

        .kv-magic-border {
          position: absolute;
          inset: -1px;
          border-radius: 9999px;
          padding: 1px;
          background: linear-gradient(
            90deg,
            rgba(112, 67, 241, 0.15),
            rgba(112, 67, 241, 0.85),
            rgba(59, 130, 246, 0.7),
            rgba(236, 72, 153, 0.6),
            rgba(112, 67, 241, 0.15)
          );
          background-size: 300% 100%;
          animation: kv-magic-border 3.2s ease-in-out infinite;
          pointer-events: none;
        }
        @keyframes kv-magic-border {
          0% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
          100% {
            background-position: 0% 50%;
          }
        }

        .kv-magic-border__inner {
          position: absolute;
          inset: 1px;
          border-radius: 9999px;
          background: rgba(10, 10, 15, 0.62);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          pointer-events: none;
        }

        @keyframes kv-card-pulse {
          0% {
            transform: scale(1);
            filter: brightness(1);
          }
          50% {
            transform: scale(1.01);
            filter: brightness(1.08);
          }
          100% {
            transform: scale(1);
            filter: brightness(1);
          }
        }
      `}</style>
      {/* Header */}
      <header className="sticky top-0 z-50 flex h-12 items-center justify-between border-b border-zinc-800 bg-zinc-950/80 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-tr from-purple-500 to-pink-500 text-[10px] font-bold text-white">
            V
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-tight">KV视觉工坊</div>
            <div className="text-[10px] font-medium uppercase text-zinc-500">KV STUDIO</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
          >
            示例
          </button>
          <button
            type="button"
            className="rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-900"
          >
            帮助
          </button>
          {primaryCta}
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-zinc-800 bg-zinc-950 px-6 py-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h2 className="text-4xl font-bold tracking-tight">KV视觉工坊</h2>
            <p className="mt-3 text-lg font-semibold text-zinc-200">
              把营销逻辑，直接变成能卖的详情图
            </p>
            <p className="mt-2 text-sm text-zinc-400">基于营销模型的电商 KV 视觉生成系统</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-zinc-800 bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-100 hover:bg-zinc-900">
                上传产品图
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    handleProductImageFile(file);
                  }}
                />
              </label>
              <motion.button
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={runGeneration}
                className="kv-primary-btn relative overflow-hidden rounded-md px-4 py-2 text-xs font-bold text-white"
              >
                <span className="relative z-10">开始生成 KV</span>
                <span className="kv-primary-btn__bg" aria-hidden="true" />
              </motion.button>
            </div>
          </div>

          <div className="w-full max-w-xl">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-5">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold text-zinc-200">KV 卡片结构示意</div>
                <div className="text-[10px] font-medium text-zinc-500">Preview</div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-2 row-span-2 aspect-[16/10] rounded-xl border border-zinc-800 bg-zinc-950/40"></div>
                <div className="aspect-square rounded-xl border border-zinc-800 bg-zinc-950/30"></div>
                <div className="aspect-square rounded-xl border border-zinc-800 bg-zinc-950/30"></div>
                <div className="aspect-square rounded-xl border border-zinc-800 bg-zinc-950/30"></div>
                <div className="aspect-square rounded-xl border border-zinc-800 bg-zinc-950/30"></div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-12 rounded-xl border border-zinc-800 bg-zinc-950/30"></div>
                <div className="h-12 rounded-xl border border-zinc-800 bg-zinc-950/30"></div>
                <div className="h-12 rounded-xl border border-zinc-800 bg-zinc-950/30"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[25%] min-w-[320px] max-w-[420px] flex-shrink-0 space-y-6 overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-5">
          <section>
            <SectionHeader icon={IconBox} title="产品基础信息" />
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
              <div
                className={`relative overflow-hidden rounded-xl border border-dashed bg-zinc-950/40 p-4 transition-colors ${
                  isDragOver
                    ? 'border-purple-500/70 bg-purple-500/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={onDropProductImage}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 text-zinc-500">
                    <IconBox />
                  </div>
                  <div className="flex-1">
                    <div className="text-xs font-semibold text-zinc-200">上传产品图片</div>
                    <div className="mt-1 text-[11px] text-zinc-500">
                      拖拽到这里，或点击选择
                    </div>
                  </div>
                  <label className="cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-900">
                    选择文件
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleProductImageFile(file);
                      }}
                    />
                  </label>
                </div>

                {productImageUrl && (
                  <div className="mt-4 overflow-hidden rounded-xl border border-zinc-800">
                    <div className="relative h-32 w-full">
                      <img
                        src={productImageUrl}
                        alt="product"
                        className="h-32 w-full object-cover"
                      />
                      {generationPhase === 'scanning' ? (
                        <div className="pointer-events-none absolute inset-0">
                          <div className="kv-scan-line" />
                        </div>
                      ) : null}
                    </div>
                    {generationPhase === 'scanning' ? (
                      <div className="border-t border-zinc-800 bg-black/30 px-3 py-2 text-[11px] text-zinc-300">
                        正在分析产品工业设计特征及材质...
                      </div>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  产品名称
                </label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setProductName(e.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/15"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  核心卖点
                </label>
                <textarea
                  rows={3}
                  value={sellingPoints}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setSellingPoints(e.target.value)
                  }
                  className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm outline-none placeholder:text-zinc-600 focus:border-purple-500/70 focus:ring-2 focus:ring-purple-500/15"
                />
              </div>

              <div
                className={`relative overflow-hidden rounded-xl border border-dashed bg-zinc-950/40 p-3 transition-colors ${
                  isIntroDragOver
                    ? 'border-purple-500/70 bg-purple-500/10'
                    : 'border-zinc-800 hover:border-zinc-700'
                }`}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => {
                  e.preventDefault();
                  setIsIntroDragOver(true);
                }}
                onDragLeave={() => setIsIntroDragOver(false)}
                onDrop={onDropProductIntro}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-200">
                      上传产品介绍图/说明书（可选）
                    </div>
                    <div className="mt-1 truncate text-[11px] text-zinc-500">
                      {productIntroFileName ? productIntroFileName : '拖拽到这里，或点击选择'}
                    </div>
                  </div>
                  <label className="flex-shrink-0 cursor-pointer rounded-md border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-zinc-900">
                    选择文件
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        handleProductIntroFile(file);
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section>
            <SectionHeader icon={IconSparkles} title="视觉风格定义" />
            <div className="mb-3 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
                <span className="text-zinc-400">
                  <IconWand />
                </span>
                AI Magic Match
              </div>
              <button
                type="button"
                onClick={() => setMagicMatchEnabled((v) => !v)}
                className={`relative h-6 w-11 rounded-full border transition-colors ${
                  magicMatchEnabled
                    ? 'border-purple-500/40 bg-purple-500/20'
                    : 'border-zinc-700 bg-zinc-950'
                }`}
                aria-pressed={magicMatchEnabled}
              >
                <span
                  className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-zinc-100 shadow transition-all ${
                    magicMatchEnabled ? 'left-5' : 'left-1'
                  }`}
                />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {VISUAL_STYLES.map((style) => (
                <VisualStyleCard
                  key={style.id}
                  style={style}
                  selected={selectedStyle === style.id}
                  isAiSelected={magicMatchEnabled && aiRecommendedStyleIds.includes(style.id)}
                  onClick={() => setSelectedStyle(style.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <SectionHeader icon={IconSparkles} title="文字排版效果" />
            <div className="grid grid-cols-2 gap-2">
              {TYPOGRAPHY_STYLES.map((typo) => (
                <TypoStyleCard
                  key={typo.id}
                  typo={typo}
                  selected={selectedTypo === typo.id}
                  onClick={() => setSelectedTypo(typo.id)}
                />
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <SectionHeader icon={IconSettings} title="高级生成参数" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs">是否需要模特</span>
                <input
                  type="checkbox"
                  checked={hasModel}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHasModel(e.target.checked)
                  }
                  className="accent-purple-500"
                />
              </div>
              {hasModel && (
                <input
                  placeholder="描述模特..."
                  value={modelDesc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setModelDesc(e.target.value)
                  }
                  className="w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-xs outline-none"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs">是否需要场景</span>
                <input
                  type="checkbox"
                  checked={hasScene}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHasScene(e.target.checked)
                  }
                  className="accent-purple-500"
                />
              </div>
              {hasScene && (
                <input
                  placeholder="描述场景..."
                  value={sceneDesc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSceneDesc(e.target.value)
                  }
                  className="w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-xs outline-none"
                />
              )}

              <div className="flex items-center justify-between">
                <span className="text-xs">是否需要数据可视化</span>
                <input
                  type="checkbox"
                  checked={hasDataViz}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setHasDataViz(e.target.checked)
                  }
                  className="accent-purple-500"
                />
              </div>

              {hasDataViz && (
                <input
                  placeholder="描述数据可视化..."
                  value={dataVizNotes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setDataVizNotes(e.target.value)
                  }
                  className="w-full rounded border border-zinc-800 bg-zinc-950 p-2 text-xs outline-none"
                />
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-zinc-500">
                  其他要求
                </label>
                <textarea
                  rows={3}
                  value={otherReqs}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setOtherReqs(e.target.value)
                  }
                  className="w-full resize-none rounded border border-zinc-800 bg-zinc-950 p-2 text-xs outline-none"
                />
              </div>
            </div>
          </section>
        </aside>

        {/* Main Grid */}
        <main className="flex-1 overflow-y-auto bg-zinc-950 px-6 py-6 pb-28">
          <div className="mx-auto w-full max-w-6xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-xs font-bold text-zinc-200">主KV / Hero Shot</div>
              <AnimatePresence initial={false}>
                {flippedCardIds.length > 0 ? (
                  <motion.button
                    key="collapse-all"
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => setFlippedCardIds([])}
                    className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-white/5"
                  >
                    一键收起
                  </motion.button>
                ) : null}
              </AnimatePresence>
            </div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {CARD_TYPES.map((card) => {
                const isFlipped = flippedCardIds.includes(card.id);
                const renderStatus = cardRenderStatusById[card.id] ?? 'idle';
                const isFrontLoading = renderStatus === 'loading';
                const hasPoster = renderStatus === 'done';
                const showSkeleton = generationPhase === 'thinking' && !isFrontLoading;
                const refreshKey = cardRefreshPulseById[card.id] ?? 0;
                const fallbackPrompt = getPrompt(card.type).replace(/^\/imagine prompt:\s*/i, '');
                const fullPrompt = fullPromptByCardId[card.id] ?? fallbackPrompt;
                const typedPrompt = typedPromptByCardId[card.id] ?? '';
                const isTyping = Boolean(isTypingByCardId[card.id]);
                return (
                  <div
                    key={card.id}
                    className="aspect-[4/5]"
                  >
                    {showSkeleton ? (
                      <div className="kv-glass relative h-full w-full overflow-hidden rounded-2xl">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(112,67,241,0.14),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(59,130,246,0.10),transparent_48%)]" />
                        <div className="relative flex h-full flex-col p-4">
                          <div className="kv-skeleton h-3 w-20 rounded" />
                          <div className="mt-3 kv-skeleton h-5 w-3/4 rounded" />
                          <div className="mt-2 kv-skeleton h-3 w-2/3 rounded" />
                          <div className="mt-5 flex-1 rounded-xl border border-white/5 bg-black/20 p-3">
                            <div className="kv-skeleton h-3 w-16 rounded" />
                            <div className="mt-3 space-y-2">
                              <div className="kv-skeleton h-3 w-full rounded" />
                              <div className="kv-skeleton h-3 w-11/12 rounded" />
                              <div className="kv-skeleton h-3 w-10/12 rounded" />
                              <div className="kv-skeleton h-3 w-9/12 rounded" />
                            </div>
                          </div>

                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="rounded-full border border-[#7043f1]/25 bg-black/35 px-4 py-2 text-[11px] font-semibold text-zinc-200">
                              {aiThinkingText}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                    <div
                      className="group relative h-full w-full cursor-pointer [perspective:1500px]"
                      onClick={() =>
                        generationPhase === 'idle' || generationPhase === 'done'
                          ? setFlippedCardIds((prev) => {
                              const willFlipToBack = !prev.includes(card.id);
                              const next = willFlipToBack
                                ? [...prev, card.id]
                                : prev.filter((id) => id !== card.id);

                              if (willFlipToBack && !hasTypedOnceByCardId[card.id]) {
                                setHasTypedOnceByCardId((p) => ({ ...p, [card.id]: true }));
                                window.setTimeout(() => startTypewriterForCard(card.id), 0);
                              }

                              return next;
                            })
                          : null
                      }
                    >
                      <motion.div
                        layoutId={`card-${card.id}`}
                        className="relative h-full w-full [transform-style:preserve-3d] [will-change:transform]"
                        animate={{ rotateY: isFlipped ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        {/* Front */}
                        <div className="kv-glass absolute inset-0 overflow-hidden rounded-2xl [backface-visibility:hidden] transition-transform duration-300 group-hover:-translate-y-1">
                          <div className="absolute left-3 top-3 z-10">
                            <span className="rounded border border-white/10 bg-black/40 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-zinc-300">
                              {card.code}
                            </span>
                          </div>

                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(112,67,241,0.22),transparent_40%),radial-gradient(circle_at_80%_100%,rgba(59,130,246,0.18),transparent_45%)]" />

                          <div className="relative flex h-full items-center justify-center rounded-2xl transition-all duration-300 group-hover:scale-[1.02]">
                            <motion.div
                              key={refreshKey}
                              className="relative flex h-full w-full items-center justify-center"
                              animate={refreshKey > 0 ? { opacity: [1, 0.95, 1] } : { opacity: 1 }}
                              transition={{ duration: 0.55 }}
                              style={refreshKey > 0 ? { animation: 'kv-card-pulse 0.55s ease-in-out' } : undefined}
                            >
                              {isFrontLoading ? (
                                <div className="relative h-full w-full">
                                  <div className="absolute inset-0 kv-skeleton opacity-40" />
                                  <div className="pointer-events-none absolute inset-0">
                                    <div className="kv-scan-line" />
                                  </div>
                                  <div className="relative flex h-full flex-col items-center justify-center">
                                    <div className="text-xs font-bold text-zinc-200">正在生成海报...</div>
                                    <div className="mt-1 text-[11px] text-zinc-500">{card.title}</div>
                                    {generationPhase === 'thinking' ? (
                                      <div className="mt-1 text-[10px] text-zinc-500">{aiThinkingText}</div>
                                    ) : null}
                                  </div>
                                </div>
                              ) : hasPoster ? (
                                <div className="relative h-full w-full">
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(112,67,241,0.25),transparent_55%),radial-gradient(circle_at_75%_80%,rgba(59,130,246,0.16),transparent_55%)]" />
                                  <div className="absolute inset-4 rounded-xl border border-white/10 bg-black/25" />
                                  <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
                                    <div className="text-xs font-bold text-zinc-100">海报结果（占位）</div>
                                    <div className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                                      点击卡片可微调提示词
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-zinc-600 transition-colors group-hover:text-[#7043f1]">
                                  <IconBox />
                                </div>
                              )}
                            </motion.div>
                          </div>

                          <div className="absolute inset-0 rounded-2xl border border-white/5 transition-all duration-300 group-hover:border-[#7043f1]/60 group-hover:shadow-[0_0_0_1px_rgba(112,67,241,0.35),0_0_28px_rgba(112,67,241,0.25)]" />

                          <div className="absolute bottom-0 left-0 w-full border-t border-white/5 bg-black/20 p-3">
                            <h4 className="text-xs font-bold text-zinc-200">{card.title}</h4>
                            <div className="mt-1 text-[10px] text-zinc-500">
                              点击配置 Prompt
                            </div>
                          </div>
                        </div>

                        {/* Back */}
                        <div className="kv-glass absolute inset-0 overflow-hidden rounded-2xl [transform:rotateY(180deg)] [backface-visibility:hidden] transition-transform duration-300 group-hover:-translate-y-1">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(112,67,241,0.16),transparent_42%),radial-gradient(circle_at_85%_90%,rgba(59,130,246,0.12),transparent_45%)]" />
                          <div className="absolute inset-0 bg-black/5" />

                          <div className="relative flex h-full min-h-0 flex-col p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-xs font-bold text-zinc-100">{card.title}</div>
                                <div className="mt-1 text-[10px] text-zinc-500">
                                  {card.goal}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <motion.button
                                  type="button"
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    void navigator.clipboard.writeText(`/imagine prompt: ${fullPrompt}`);
                                    setCopiedCardId(card.id);
                                    window.setTimeout(() => setCopiedCardId(null), 1200);
                                  }}
                                  className="opacity-0 transition-opacity group-hover:opacity-100 rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[10px] font-semibold text-zinc-200 hover:bg-black/40"
                                >
                                  {copiedCardId === card.id ? '已复制' : 'Copy Prompt'}
                                </motion.button>

                                <motion.button
                                  type="button"
                                  whileTap={{ scale: 0.95 }}
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.stopPropagation();
                                    setExpandedCardId(card.id);
                                  }}
                                  className="opacity-0 transition-opacity group-hover:opacity-100 rounded-md border border-white/10 bg-black/30 p-1.5 text-zinc-200 hover:bg-black/40"
                                  aria-label="Expand"
                                >
                                  <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M15 3h6v6" />
                                    <path d="M9 21H3v-6" />
                                    <path d="M21 3l-7 7" />
                                    <path d="M3 21l7-7" />
                                  </svg>
                                </motion.button>
                              </div>
                            </div>

                            <div className="mt-3 flex-1 overflow-hidden min-h-0">
                              <div className="relative h-full min-h-0 overflow-hidden rounded-xl border border-white/10 bg-black/25 p-3">
                                <div className="mb-2 flex items-center justify-between">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                    Prompt
                                  </span>
                                </div>

                                <div
                                  className="h-full min-h-0"
                                  onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
                                    e.stopPropagation();
                                    if (!isTyping) return;
                                    e.preventDefault();
                                    stopTypewriterAndFocus(card.id);
                                  }}
                                  onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  <div className="mb-2 font-mono text-[11px] text-purple-300">/imagine prompt:</div>
                                  <textarea
                                    ref={(el) => {
                                      promptTextareaRefs.current[card.id] = el;
                                    }}
                                    value={
                                      activePromptEditorCardId === card.id
                                        ? fullPrompt
                                        : isTyping
                                          ? typedPrompt
                                          : fullPrompt
                                    }
                                    onFocus={() => setActivePromptEditorCardId(card.id)}
                                    onBlur={() => {
                                      if (activePromptEditorCardId === card.id) setActivePromptEditorCardId(null);
                                    }}
                                    onPointerDown={(e: React.PointerEvent<HTMLTextAreaElement>) => {
                                      e.stopPropagation();
                                    }}
                                    onClick={(e: React.MouseEvent<HTMLTextAreaElement>) => {
                                      e.stopPropagation();
                                    }}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                      const v = e.target.value;
                                      setFullPromptByCardId((prev) => ({ ...prev, [card.id]: v }));
                                      setTypedPromptByCardId((prev) => ({ ...prev, [card.id]: v }));
                                      setActivePromptEditorCardId(card.id);
                                    }}
                                    className="h-[calc(100%-18px)] w-full resize-none bg-transparent p-0 font-mono text-[11px] leading-relaxed text-zinc-100 outline-none placeholder:text-zinc-600"
                                  />

                                  {isTyping ? (
                                    <div className="pointer-events-none absolute inset-x-3 bottom-3 text-[10px] text-zinc-500">
                                      点击文字区域立即进入编辑
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 rounded-xl border border-[#7043f1]/20 bg-[#7043f1]/10 p-3">
                              <div className="flex items-start gap-2">
                                <div className="mt-0.5 h-5 w-5 rounded-md bg-[#7043f1]/20 text-[#b7a5ff] flex items-center justify-center text-[11px] font-bold">
                                  i
                                </div>
                                <div>
                                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#b7a5ff]">
                                    Expert Tip
                                  </div>
                                  <div className="mt-1 text-[11px] text-zinc-200">{card.usage}</div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex items-center gap-2">
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                }}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/10 bg-black/20 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-black/30"
                              >
                                <svg
                                  width="14"
                                  height="14"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                                  <path d="M21 3v6h-6" />
                                </svg>
                                重新生成
                              </motion.button>
                              <motion.button
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.stopPropagation();
                                  setCardRenderStatusById((p) => ({ ...p, [card.id]: 'loading' }));
                                  setCardRefreshPulseById((p) => ({ ...p, [card.id]: (p[card.id] ?? 0) + 1 }));
                                  window.setTimeout(() => {
                                    setCardRenderStatusById((p) => ({ ...p, [card.id]: 'done' }));
                                    setFlippedCardIds((prev) => prev.filter((id) => id !== card.id));
                                  }, 650);
                                }}
                                className="kv-primary-btn relative w-full overflow-hidden rounded-md px-3 py-2 text-xs font-bold text-white"
                              >
                                <span className="relative z-10">保存/应用</span>
                                <span className="kv-primary-btn__bg" aria-hidden="true" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>

      <motion.div
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2"
        animate={{ opacity: activePromptEditorCardId !== null ? 0.3 : 1 }}
        transition={{ duration: 0.18 }}
      >
        <div className="relative w-[460px] max-w-[92vw]">
          <div className="kv-magic-border" aria-hidden="true" />
          <div className="kv-magic-border__inner" aria-hidden="true" />
          <div className="relative rounded-full px-3 py-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={runGeneration}
              className="kv-primary-btn relative w-full overflow-hidden rounded-full px-6 py-3 text-sm font-extrabold text-white"
            >
              <span className="relative z-10">✨ 立即生成全套视觉海报</span>
              <span className="kv-primary-btn__bg" aria-hidden="true" />
            </motion.button>
          </div>
        </div>
      </motion.div>

      {isClientMounted
        ? createPortal(
            <AnimatePresence>
              {expandedCardId !== null ? (
                <motion.div
                  key="kv-fullscreen"
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-6 backdrop-blur-xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setExpandedCardId(null)}
                >
                  {(() => {
                    const card = CARD_TYPES.find((c) => c.id === expandedCardId);
                    if (!card) return null;
                    const fallbackPrompt = getPrompt(card.type).replace(/^\/imagine prompt:\s*/i, '');
                    const fullPrompt = fullPromptByCardId[card.id] ?? fallbackPrompt;
                    return (
                      <motion.div
                        layoutId={`card-${expandedCardId}`}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        className="kv-glass relative h-[85vh] w-[85vw] max-w-none overflow-hidden rounded-2xl border border-white/10"
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(112,67,241,0.14),transparent_45%),radial-gradient(circle_at_85%_90%,rgba(59,130,246,0.10),transparent_45%)]" />
                        <div className="absolute inset-0 bg-black/15" />

                        <div className="relative flex h-full flex-col">
                          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                            <div>
                              <div className="text-sm font-bold text-zinc-100">{card.title}</div>
                              <div className="mt-1 text-[11px] text-zinc-400">{card.goal}</div>
                            </div>
                            <motion.button
                              type="button"
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setExpandedCardId(null)}
                              className="rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-[11px] font-semibold text-zinc-200 hover:bg-black/30"
                            >
                              关闭
                            </motion.button>
                          </div>

                          <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-2">
                            <div className="min-h-0 border-b border-white/10 p-5 md:border-b-0 md:border-r">
                              <div className="mb-3 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                超精细编辑
                              </div>
                              <textarea
                                value={fullPrompt}
                                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                                  const v = e.target.value;
                                  setFullPromptByCardId((prev) => ({ ...prev, [card.id]: v }));
                                  setTypedPromptByCardId((prev) => ({ ...prev, [card.id]: v }));
                                }}
                                className="h-[calc(85vh-170px)] w-full resize-none rounded-xl border border-white/10 bg-zinc-950/60 p-4 font-mono text-sm leading-7 text-zinc-100 outline-none focus:border-[#7043f1]/60"
                              />
                            </div>

                            <div className="min-h-0 p-5">
                              <div className="mb-3 flex items-center justify-between">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                                  海报预览
                                </div>
                                <div className="text-[11px] font-semibold text-zinc-200">Render</div>
                              </div>

                              <div className="relative h-[calc(85vh-170px)] overflow-hidden rounded-xl border border-white/10 bg-black/20">
                                <div className="absolute inset-0 kv-skeleton opacity-60" />
                                <div className="relative flex h-full flex-col items-center justify-center p-6 text-center">
                                  <div className="text-xs font-semibold text-zinc-200">渲染结果图（占位）</div>
                                  <div className="mt-2 max-w-md text-[11px] leading-relaxed text-zinc-400">
                                    当前 Prompt 将用于生成右侧海报渲染结果。后续接入生成接口后，这里会显示真实产出图。
                                  </div>
                                  {productImageUrl ? (
                                    <div className="mt-5 overflow-hidden rounded-lg border border-white/10">
                                      <img src={productImageUrl} alt="ref" className="h-28 w-48 object-cover" />
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })()}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body
          )
        : null}
    </div>
  );
}
