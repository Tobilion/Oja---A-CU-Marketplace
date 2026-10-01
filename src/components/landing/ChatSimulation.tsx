import React, { useEffect, useRef, useState } from "react";
import { CheckCheck, KeyRound, Package, ShieldCheck, Truck } from "lucide-react";
import { avatarById } from "../../data/heroAvatars";
import { chatScenes, type ChatItem } from "../../data/heroChatScript";
import { PhoneMockup } from "./PhoneMockup";

const TYPING_MS = 1200;
const BETWEEN_MIN = 800;
const BETWEEN_MAX = 2200;
const SCENE_REST_MS = 3500;
const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#________";

function delay(min = BETWEEN_MIN, max = BETWEEN_MAX): number {
  return min + Math.random() * (max - min);
}

// Delivery code reveal borrows the console scramble feel: glyphs resolve
// into the honest code. Reduced motion shows the code instantly.
const DeliveryCode: React.FC<{ code: string }> = ({ code }) => {
  const [text, setText] = useState(code);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(code);
      return;
    }
    let frame = 0;
    let raf = 0;
    const clean = code.replace(/ /g, "");
    const tick = () => {
      frame += 1;
      const resolved = Math.floor((frame / 36) * clean.length);
      let out = "";
      for (let i = 0; i < clean.length; i++) {
        out += i < resolved ? clean[i] : SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
        if (i < clean.length - 1) out += " ";
      }
      setText(out);
      if (resolved < clean.length) raf = requestAnimationFrame(tick);
      else setText(code);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [code]);
  return (
    <span className="font-mono text-sm font-bold tracking-[0.3em] text-[var(--color-text-main)]" aria-label={`Delivery code ${code}`}>
      {text}
    </span>
  );
};

function CardIcon({ variant }: { variant: Extract<ChatItem, { kind: "card" }>["variant"] }) {
  const cls = "h-3.5 w-3.5 text-[var(--color-brand-primary)]";
  if (variant === "payment-held") return <ShieldCheck className={cls} />;
  if (variant === "order-placed") return <Package className={cls} />;
  if (variant === "delivery-code") return <KeyRound className={cls} />;
  return <Truck className={cls} />;
}

export const ChatSimulation: React.FC<{ phoneRef: React.RefObject<HTMLDivElement | null> }> = ({ phoneRef }) => {
  const [sceneIdx, setSceneIdx] = useState(0);
  const [count, setCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [fading, setFading] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoRef = useRef(true);
  const resumeTimer = useRef<number>(0);
  // Stepper state lives in refs so scheduling never happens inside a state
  // updater (updaters must stay pure). The effect below owns all timers.
  // Hover never pauses playback: a full freeze reads as broken. Manual
  // scrolling still pauses auto-scroll (see onScroll below), and the loop
  // still yields when the tab is hidden.
  const stepRef = useRef({ scene: 0, count: 0, typing: false, resting: false, hidden: false });

  const scene = chatScenes[stepRef.current.scene % chatScenes.length] ?? chatScenes[0];
  const sellerAvatar = avatarById(scene?.sellerAvatarId ?? "laptop");
  const reduceMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Keep render state in sync with the stepper after each tick.
  const sync = () => {
    const s = stepRef.current;
    setSceneIdx(s.scene % chatScenes.length);
    setCount(s.count);
    setTyping(s.typing);
  };

  // Playback loop. Timers only, no per-frame renders.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      stepRef.current.count = chatScenes[0]?.items.length ?? 0;
      sync();
      return;
    }
    let cancelled = false;
    let timer = 0;
    const tick = () => {
      if (cancelled) return;
      const st = stepRef.current;
      const s = chatScenes[st.scene % chatScenes.length];
      if (!s) return;
      if (st.hidden || document.hidden) {
        timer = window.setTimeout(tick, 600);
        return;
      }
      if (st.resting) {
        st.resting = false;
        st.scene = (st.scene + 1) % chatScenes.length;
        st.count = 0;
        st.typing = false;
        setFading(false);
        sync();
        timer = window.setTimeout(tick, delay());
        return;
      }
      if (st.count >= s.items.length) {
        st.resting = true;
        setFading(true);
        timer = window.setTimeout(tick, SCENE_REST_MS);
        return;
      }
      const next = s.items[st.count];
      if (next?.kind === "seller" && !st.typing) {
        st.typing = true;
        sync();
        timer = window.setTimeout(tick, TYPING_MS);
        return;
      }
      st.typing = false;
      st.count += 1;
      sync();
      timer = window.setTimeout(tick, delay());
    };
    timer = window.setTimeout(tick, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = (scene?.items ?? []).slice(0, count);

  // Highlight sync: pulse the matching avatar chip.
  useEffect(() => {
    const last = visible[visible.length - 1];
    if (last && "highlight" in last && last.highlight) {
      window.dispatchEvent(new CustomEvent("oja:hero-highlight", { detail: last.highlight }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, sceneIdx]);

  // Auto-scroll unless the user recently scrolled manually.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && autoRef.current) el.scrollTo({ top: el.scrollHeight, behavior: reduceMotion ? "auto" : "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, typing, sceneIdx]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    autoRef.current = nearBottom;
    window.clearTimeout(resumeTimer.current);
    if (!nearBottom) {
      resumeTimer.current = window.setTimeout(() => {
        autoRef.current = true;
      }, 3000);
    }
  };

  return (
    <PhoneMockup
      sellerAvatarSrc={sellerAvatar?.src ?? "/avatars/laptop.webp"}
      sellerName={scene?.sellerName ?? ""}
      status={typing ? "typing..." : "online"}
      outerRef={phoneRef}
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={`h-full space-y-1.5 overflow-y-auto px-2.5 py-2 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      >
        <p className="pb-1 text-center text-[9px] font-medium text-[var(--color-text-muted)]">Today 9:41 AM</p>
        {visible.map((item, i) => {
          if (item.kind === "buyer") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[78%] rounded-[18px] rounded-br-[5px] bg-[var(--color-brand-primary)] px-2.5 py-1 text-[11.5px] leading-snug text-white">
                  <p>{item.text}</p>
                  <p className="mt-0.5 flex items-center justify-end gap-0.5 text-[8px] leading-none text-white/75">
                    9:41 <CheckCheck className="h-2.5 w-2.5" />
                  </p>
                </div>
              </div>
            );
          }
          if (item.kind === "seller") {
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[78%] rounded-[18px] rounded-bl-[5px] bg-[var(--color-surface-subtle)] px-2.5 py-1 text-[11.5px] leading-snug text-[var(--color-text-main)]">
                  <p>{item.text}</p>
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="mx-1 rounded-xl border border-[var(--color-brand-primary)]/25 bg-[var(--color-surface)] px-2.5 py-1.5 shadow-sm"
            >
              <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-[var(--color-text-main)]">
                <CardIcon variant={item.variant} /> {item.title}
              </p>
              {item.variant === "delivery-code" ? (
                <div className="mt-0.5 text-center">
                  <DeliveryCode code={item.body} />
                </div>
              ) : (
                <p className="mt-0.5 text-[10.5px] leading-snug text-[var(--color-text-muted)]">{item.body}</p>
              )}
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-[18px] rounded-bl-[5px] bg-[var(--color-surface-subtle)] px-3 py-2" aria-label="Seller is typing">
              {[0, 1, 2].map((d) => (
                <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--color-text-muted)]" style={{ animationDelay: `${d * 0.18}s` }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </PhoneMockup>
  );
};
