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
  const cls = "h-4 w-4 text-[var(--color-brand-primary)]";
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
  const [hovering, setHovering] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoRef = useRef(true);
  const resumeTimer = useRef<number>(0);
  const stateRef = useRef({ hovering: false, visible: true, hidden: false });
  stateRef.current.hovering = hovering;

  const scene = chatScenes[sceneIdx % chatScenes.length] ?? chatScenes[0];
  const sellerAvatar = avatarById(scene?.sellerAvatarId ?? "laptop");

  // Pause when hero scrolled away or tab hidden.
  useEffect(() => {
    const onVis = () => {
      stateRef.current.hidden = document.hidden;
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Playback loop. Timers only, no per-frame renders.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCount(scene?.items.length ?? 0);
      return;
    }
    let cancelled = false;
    let timer = 0;
    const step = () => {
      if (cancelled) return;
      const s = chatScenes[sceneIdx % chatScenes.length];
      if (!s) return;
      if (stateRef.current.hovering || stateRef.current.hidden) {
        timer = window.setTimeout(step, 600);
        return;
      }
      setCount((c) => {
        if (c >= s.items.length) {
          timer = window.setTimeout(() => {
            if (cancelled) return;
            setFading(true);
            timer = window.setTimeout(() => {
              if (cancelled) return;
              setSceneIdx((i) => (i + 1) % chatScenes.length);
              setCount(0);
              setTyping(false);
              setFading(false);
              step();
            }, 450);
          }, SCENE_REST_MS);
          return c;
        }
        const next = s.items[c];
        if (next?.kind === "seller") {
          setTyping(true);
          timer = window.setTimeout(() => {
            if (cancelled) return;
            setTyping(false);
            setCount(c + 1);
            timer = window.setTimeout(step, delay());
          }, TYPING_MS);
        } else {
          setCount(c + 1);
          timer = window.setTimeout(step, delay());
        }
        return c;
      });
    };
    timer = window.setTimeout(step, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [sceneIdx, scene?.items.length]);

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
    if (el && autoRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
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
      onHoverChange={setHovering}
    >
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className={`h-full space-y-2 overflow-y-auto px-3 py-3 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}
      >
        {visible.map((item, i) => {
          if (item.kind === "buyer") {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[82%] rounded-2xl rounded-br-md bg-[var(--color-brand-primary)] px-3 py-1.5 text-[12px] leading-snug text-white shadow-sm">
                  <p>{item.text}</p>
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-white/80">
                    9:41 <CheckCheck className="h-3 w-3" />
                  </p>
                </div>
              </div>
            );
          }
          if (item.kind === "seller") {
            return (
              <div key={i} className="flex justify-start">
                <div className="max-w-[82%] rounded-2xl rounded-bl-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-[12px] leading-snug text-[var(--color-text-main)] shadow-sm">
                  <p>{item.text}</p>
                  <p className="mt-0.5 text-right text-[9px] text-[var(--color-text-muted)]">9:41</p>
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="rounded-xl border border-[var(--color-brand-primary)]/25 bg-[var(--color-surface)] px-3 py-2 shadow-sm"
            >
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--color-text-main)]">
                <CardIcon variant={item.variant} /> {item.title}
              </p>
              {item.variant === "delivery-code" ? (
                <div className="mt-1 text-center">
                  <DeliveryCode code={item.body} />
                </div>
              ) : (
                <p className="mt-0.5 text-[11px] text-[var(--color-text-muted)]">{item.body}</p>
              )}
            </div>
          );
        })}
        {typing && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2" aria-label="Seller is typing">
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
