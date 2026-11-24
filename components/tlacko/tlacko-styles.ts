import { SCENES_CSS } from "./TlackoScenes";
/** CSS animácie Tlačka (vkladá sa raz cez <style>; trieda tl-* je jedinečná). */
export const BRAND = "#FFAE00";

export const TLACKO_CSS = `
.tl-root, .tl-root * { box-sizing: border-box; }
.tl-root { font-family: inherit; }
@keyframes tl-pop { 0% { transform: scale(.6) translateY(12px); opacity: 0 } 70% { transform: scale(1.04) } 100% { transform: scale(1) translateY(0); opacity: 1 } }
@keyframes tl-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
@keyframes tl-blink { 0%,92%,100% { transform: scaleY(1) } 95% { transform: scaleY(.1) } }
@keyframes tl-wave { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-12deg) } 40% { transform: rotate(10deg) } 60% { transform: rotate(-8deg) } 80% { transform: rotate(6deg) } }
@keyframes tl-ring { 0% { box-shadow: 0 0 0 0 rgba(255,174,0,.55) } 100% { box-shadow: 0 0 0 18px rgba(255,174,0,0) } }
@keyframes tl-dot { 0%,80%,100% { transform: translateY(0); opacity: .4 } 40% { transform: translateY(-4px); opacity: 1 } }
@keyframes tl-in { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes tl-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes tl-pulse { 0%,100% { box-shadow: 0 0 0 9999px rgba(10,10,10,.55), 0 0 0 0 rgba(255,174,0,.9) } 50% { box-shadow: 0 0 0 9999px rgba(10,10,10,.55), 0 0 0 10px rgba(255,174,0,.25) } }
@keyframes tl-bounce { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }

.tl-mascot .tl-eyes { transform-origin: 32px 29px; animation: tl-blink 4.5s infinite; }
.tl-mascot .tl-antenna { transform-origin: 32px 9px; }
.tl-fab { animation: tl-pop .5s cubic-bezier(.34,1.56,.64,1) both; }
.tl-fab:hover .tl-mascot { animation: tl-wave .8s ease-in-out; }
.tl-fab-idle .tl-mascot { animation: tl-float 3s ease-in-out infinite; }
.tl-fab-call { animation: tl-ring 1.4s ease-out infinite; }
.tl-fab-call .tl-mascot { animation: tl-wave 1.2s ease-in-out 2; }
.tl-teaser { animation: tl-pop .45s cubic-bezier(.34,1.56,.64,1) both; transform-origin: bottom right; }
.tl-panel { animation: tl-pop .35s cubic-bezier(.34,1.56,.64,1) both; transform-origin: bottom right; }
.tl-msg { animation: tl-in .25s ease-out both; }
.tl-typing span { display: inline-block; width: 7px; height: 7px; margin: 0 2px; border-radius: 50%; background: #a3a3a3; animation: tl-dot 1s infinite; }
.tl-typing span:nth-child(2) { animation-delay: .15s } .tl-typing span:nth-child(3) { animation-delay: .3s }
.tl-chip { transition: transform .15s, background .15s; }
.tl-chip:hover { transform: translateY(-1px); background: #FFE2A3 !important; }
.tl-spot { animation: tl-pulse 1.6s ease-in-out infinite; }
.tl-spot-label { animation: tl-pop .4s cubic-bezier(.34,1.56,.64,1) both, tl-bounce 1.4s ease-in-out .5s infinite; }
.tl-overlay { animation: tl-fade .2s ease-out both; }

${SCENES_CSS}
@media (prefers-reduced-motion: reduce) {
  .tl-root *, .tl-root { animation-duration: .001s !important; animation-iteration-count: 1 !important; }
}
`;
