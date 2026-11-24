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
@keyframes tl-drop { 0% { transform: translate(-50%, -70px) rotate(-8deg); opacity: 0 } 25% { opacity: 1 } 55%,100% { transform: translate(-50%, 0) rotate(0); opacity: 1 } }
@keyframes tl-check { 0%,55% { transform: scale(0); opacity: 0 } 70% { transform: scale(1.25); opacity: 1 } 100% { transform: scale(1); opacity: 1 } }
@keyframes tl-spin { from { transform: rotateX(-24deg) rotateY(0) } to { transform: rotateX(-24deg) rotateY(360deg) } }
@keyframes tl-pick { 0%,30% { background: #fff; border-color: #e5e5e5 } 33%,63% { background: #FFAE00; border-color: #FFAE00 } 66%,100% { background: #fff; border-color: #e5e5e5 } }
@keyframes tl-swatch { 0%,22% { transform: scale(1); box-shadow: 0 0 0 0 #111 } 25%,47% { transform: scale(1.25); box-shadow: 0 0 0 3px #111 } 50%,100% { transform: scale(1); box-shadow: 0 0 0 0 #111 } }
@keyframes tl-truck { 0% { transform: translateX(-30px) } 100% { transform: translateX(170px) } }
@keyframes tl-road { from { background-position: 0 0 } to { background-position: -40px 0 } }
@keyframes tl-layer { from { transform: scaleX(0) } to { transform: scaleX(1) } }

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

/* prehliadka — scény */
.tl-scene { position: relative; height: 150px; border-radius: 16px; overflow: hidden; background: linear-gradient(135deg, #fff7e6, #fff); border: 1px solid #f1e3c2; }
.tl-drop-zone { position: absolute; left: 50%; bottom: 18px; width: 170px; height: 70px; transform: translateX(-50%); border: 2.5px dashed #FFAE00; border-radius: 14px; background: #fffdf7; }
.tl-file { position: absolute; left: 50%; bottom: 30px; width: 40px; height: 50px; background: #fff; border: 2px solid #111; border-radius: 4px 12px 4px 4px; font-weight: 800; font-size: 11px; line-height: 46px; text-align: center; animation: tl-drop 2.4s cubic-bezier(.34,1.3,.64,1) infinite; }
.tl-ok { position: absolute; left: calc(50% + 26px); bottom: 70px; width: 24px; height: 24px; border-radius: 50%; background: #16a34a; color: #fff; font-weight: 800; font-size: 14px; line-height: 24px; text-align: center; animation: tl-check 2.4s ease-out infinite; }
.tl-cube-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; perspective: 500px; }
.tl-cube { position: relative; width: 70px; height: 70px; transform-style: preserve-3d; animation: tl-spin 6s linear infinite; }
.tl-cube div { position: absolute; inset: 0; border: 2px solid #111; background: rgba(255,174,0,.85); }
.tl-cube div:nth-child(1) { transform: translateZ(35px) } .tl-cube div:nth-child(2) { transform: rotateY(180deg) translateZ(35px) }
.tl-cube div:nth-child(3) { transform: rotateY(90deg) translateZ(35px); background: rgba(230,150,0,.9) } .tl-cube div:nth-child(4) { transform: rotateY(-90deg) translateZ(35px); background: rgba(230,150,0,.9) }
.tl-cube div:nth-child(5) { transform: rotateX(90deg) translateZ(35px); background: #ffd36b } .tl-cube div:nth-child(6) { transform: rotateX(-90deg) translateZ(35px) }
.tl-chiprow { display: flex; gap: 6px; justify-content: center; }
.tl-chiprow span { padding: 5px 10px; border: 1.5px solid #e5e5e5; border-radius: 999px; font-size: 12px; font-weight: 800; background: #fff; animation: tl-pick 4.5s infinite; }
.tl-chiprow span:nth-child(2) { animation-delay: 1.5s } .tl-chiprow span:nth-child(3) { animation-delay: 3s }
.tl-swatches { display: flex; gap: 9px; justify-content: center; margin-top: 12px; }
.tl-swatches i { width: 20px; height: 20px; border-radius: 50%; border: 1.5px solid rgba(0,0,0,.15); animation: tl-swatch 4s infinite; }
.tl-swatches i:nth-child(2) { animation-delay: 1s } .tl-swatches i:nth-child(3) { animation-delay: 2s } .tl-swatches i:nth-child(4) { animation-delay: 3s }
.tl-layers { display: flex; flex-direction: column-reverse; gap: 2px; width: 120px; margin: 10px auto 0; }
.tl-layers b { display: block; height: 5px; border-radius: 3px; background: #111; transform-origin: left; animation: tl-layer .5s ease-out both; }
.tl-road { position: absolute; left: 0; right: 0; bottom: 26px; height: 3px; background: repeating-linear-gradient(90deg, #111 0 20px, transparent 20px 40px); animation: tl-road .5s linear infinite; }
.tl-truck { position: absolute; bottom: 30px; left: 0; font-size: 38px; animation: tl-truck 3s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .tl-root *, .tl-root { animation-duration: .001s !important; animation-iteration-count: 1 !important; }
}
`;
