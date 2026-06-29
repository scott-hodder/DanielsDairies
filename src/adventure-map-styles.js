// Adventure Map V4 - CSS Styles
// Extracted from dashboard-enhanced.js

export function injectAdventureMapStyles() {
    if (document.getElementById('adventure-map-v4-styles')) return;
    
    var css = [];
    css.push('.adventure-map-section { background: linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(245,250,255,0.4) 30%, rgba(240,248,255,0.3) 100%); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); border-radius: 24px; padding: 0; box-shadow: 0 8px 32px rgba(64,88,120,0.08), 0 2px 8px rgba(64,88,120,0.04), inset 0 1px 0 rgba(255,255,255,0.8); border: 2px solid rgba(255,255,255,0.5); margin-top: 0; overflow: hidden; position: relative; }');
    css.push('.adventure-map-header-fixed { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 8px 8px 16px; text-align: center; }');
    css.push('.adventure-header { display: flex; align-items: center; gap: 12px; padding: 16px 20px 10px; position: relative; background: linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%); }');
    css.push('.adventure-title { font-family: "Fredoka", sans-serif; font-size: 22px; margin: 0; color: #1E293B; font-weight: 700; white-space: nowrap; }');
    css.push('.adventure-subtitle { margin: 0; color: #64748B; font-size: 13px; font-weight: 500; }');
    css.push('.adventure-header-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; flex: 1; }');
    css.push('.adventure-header-zone { display: flex; align-items: center; gap: 8px; }');
    css.push('.stage-dots { display: flex; gap: 4px; }');
    css.push('.stage-dot { width: 24px; height: 24px; border-radius: 50%; background: #E2E8F0; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid #CBD5E1; opacity: 0.5; transition: all 0.3s ease; }');
    css.push('.stage-dot.done { background: linear-gradient(135deg, #22C55E, #4ADE80); border-color: #22C55E; opacity: 1; }');
    css.push('.stage-dot.active { background: linear-gradient(135deg, #6366F1, #818CF8); border-color: #6366F1; opacity: 1; box-shadow: 0 0 0 3px rgba(99,102,241,0.2); }');
    css.push('.stage-label { font-family: "Fredoka", sans-serif; font-size: 12px; font-weight: 700; color: #6366F1; white-space: nowrap; }');
    css.push('.cycle-select-compact { font-family: "Fredoka", sans-serif; font-size: 13px; font-weight: 600; padding: 6px 28px 6px 10px; border-radius: 10px; border: 1.5px solid rgba(64,88,120,0.12); background: rgba(255,255,255,0.85); color: #1E293B; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'10\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748B\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 8px center; }');
    css.push('.category-filter-label { font-family: "Fredoka", sans-serif; font-size: 13px; font-weight: 600; color: #64748B; }');
    css.push('.category-filter-select { font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 600; padding: 10px 36px 10px 16px; border-radius: 14px; border: 1.5px solid rgba(64,88,120,0.12); background: rgba(255,255,255,0.85); color: #1E293B; cursor: pointer; appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2364748B\' d=\'M6 8L1 3h10z\'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; min-width: 180px; transition: all 0.25s ease; box-shadow: 0 2px 6px rgba(0,0,0,0.04); }');
    css.push('.category-filter-select:hover { border-color: rgba(99,102,241,0.35); box-shadow: 0 2px 8px rgba(99,102,241,0.08); }');
    css.push('.category-filter-select:focus { outline: none; border-color: rgba(99,102,241,0.4); box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }');
    css.push('.category-badge { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; color: white; box-shadow: 0 2px 6px rgba(0,0,0,0.1); letter-spacing: 0.2px; }');
    css.push('.cycle-badge { background: rgba(255,255,255,0.85); color: #405878; border: 1.5px solid rgba(64,88,120,0.1); box-shadow: 0 1px 4px rgba(0,0,0,0.04); }');
    css.push('.town-progress-cue { margin: 0 20px 12px; border-radius: 18px; border: none; background: linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(248,250,255,0.5) 100%); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); box-shadow: 0 2px 12px rgba(64,88,120,0.06), inset 0 1px 0 rgba(255,255,255,0.7); border: 1.5px solid rgba(255,255,255,0.55); overflow: hidden; }');
    css.push('.town-progress-cue-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 20px 8px; }');
    css.push('.town-progress-cue-title { font-family: "Fredoka", sans-serif; font-size: 13px; font-weight: 700; color: #334155; display: flex; align-items: center; gap: 6px; }');
    css.push('.town-progress-cue-stage { font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 700; color: #6366F1; background: rgba(99,102,241,0.1); border-radius: 999px; padding: 5px 12px; }');
    css.push('.town-progress-cue-copy { padding: 0 20px 14px; font-size: 12px; line-height: 1.5; color: #64748B; }');
    css.push('.town-progress-cue-strong { color: #1E293B; font-weight: 700; }');
    css.push('.town-progress-cue-timeline { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; margin-top: 10px; position: relative; }');
    css.push('.town-progress-cue-timeline::before { content: ""; position: absolute; top: 24px; left: 12%; right: 12%; height: 4px; background: #E2E8F0; border-radius: 2px; z-index: 0; }');
    css.push('.town-progress-cue-step { text-align: center; padding: 10px 8px; position: relative; z-index: 1; transition: all 0.3s ease; border-radius: 14px; }');
    css.push('.town-progress-cue-step-dot { width: 28px; height: 28px; border-radius: 50%; margin: 0 auto 6px; display: flex; align-items: center; justify-content: center; font-size: 14px; background: #F1F5F9; border: 3px solid #E2E8F0; transition: all 0.3s ease; }');
    css.push('.town-progress-cue-step strong { display: block; font-family: "Fredoka", sans-serif; color: #94A3B8; font-size: 11px; margin-top: 1px; font-weight: 600; }');
    css.push('.town-progress-cue-step small { font-size: 10px; color: #CBD5E1; font-weight: 500; }');
    css.push('.town-progress-cue-step.active { background: rgba(99,102,241,0.06); }');
    css.push('.town-progress-cue-step.active .town-progress-cue-step-dot { background: linear-gradient(135deg, #6366F1, #818CF8); border-color: #6366F1; box-shadow: 0 0 0 4px rgba(99,102,241,0.15), 0 3px 8px rgba(99,102,241,0.25); }');
    css.push('.town-progress-cue-step.active strong { color: #4338CA; font-weight: 700; }');
    css.push('.town-progress-cue-step.active small { color: #6366F1; font-weight: 600; }');
    css.push('.town-progress-cue-step.done .town-progress-cue-step-dot { background: linear-gradient(135deg, #22C55E, #4ADE80); border-color: #22C55E; box-shadow: 0 2px 6px rgba(34,197,94,0.25); }');
    css.push('.town-progress-cue-step.done strong { color: #16A34A; font-weight: 700; }');
    css.push('.town-progress-cue-step.done small { color: #22C55E; }');
    css.push('@media (max-width: 768px) { .town-progress-cue-title { display: none; } .town-progress-cue-copy { display: none; } .town-progress-cue-head { padding: 10px 16px 6px; } .town-progress-cue { margin: 0 12px 10px; } }');

    // Compact progression tracker
    css.push('.progression-tracker { margin: 0 16px 6px; padding: 10px 16px 8px; border-radius: 14px; background: linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(248,250,255,0.45) 100%); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1.5px solid rgba(255,255,255,0.5); box-shadow: 0 2px 8px rgba(64,88,120,0.05); }');
    css.push('.progression-steps { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; position: relative; }');
    css.push('.progression-steps::before { content: ""; position: absolute; top: 16px; left: 12%; right: 12%; height: 3px; background: #E2E8F0; border-radius: 2px; z-index: 0; }');
    css.push('.progression-step { text-align: center; position: relative; z-index: 1; padding: 4px 2px; border-radius: 10px; transition: all 0.3s ease; }');
    css.push('.progression-step-icon { width: 32px; height: 32px; border-radius: 50%; margin: 0 auto 4px; display: flex; align-items: center; justify-content: center; font-size: 14px; background: #F1F5F9; border: 2.5px solid #E2E8F0; transition: all 0.3s ease; }');
    css.push('.progression-step-label { font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 600; color: #94A3B8; line-height: 1.2; }');
    css.push('.progression-step-range { font-size: 9px; color: #CBD5E1; font-weight: 500; }');
    css.push('.progression-step.active { background: rgba(99,102,241,0.06); }');
    css.push('.progression-step.active .progression-step-icon { background: linear-gradient(135deg, #6366F1, #818CF8); border-color: #6366F1; box-shadow: 0 0 0 3px rgba(99,102,241,0.15), 0 2px 6px rgba(99,102,241,0.2); }');
    css.push('.progression-step.active .progression-step-label { color: #4338CA; font-weight: 700; }');
    css.push('.progression-step.active .progression-step-range { color: #6366F1; font-weight: 600; }');
    css.push('.progression-step.done .progression-step-icon { background: linear-gradient(135deg, #22C55E, #4ADE80); border-color: #22C55E; box-shadow: 0 2px 4px rgba(34,197,94,0.2); }');
    css.push('.progression-step.done .progression-step-label { color: #16A34A; font-weight: 700; }');
    css.push('.progression-step.done .progression-step-range { color: #22C55E; }');
    css.push('.progression-note { text-align: center; font-size: 11px; color: #64748B; margin-top: 4px; font-weight: 500; }');
    css.push('@media (max-width: 480px) { .progression-tracker { margin: 0 10px 4px; padding: 8px 10px 6px; } .progression-step-label { font-size: 10px; } .progression-step-icon { width: 28px; height: 28px; font-size: 12px; } }');

    css.push('.adventure-viewport { position: relative; width: 100%; height: 500px; border-radius: 0 0 22px 22px; overflow: hidden; cursor: grab; border: none; border-top: 1px solid rgba(64,88,120,0.06); box-shadow: inset 0 0 80px rgba(135,206,235,0.15); user-select: none; -webkit-user-select: none; touch-action: none; background: linear-gradient(180deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.05) 100%); }');
    css.push('.adventure-viewport[data-zone] { background-color: #e9f2f8; background-size: cover; background-position: center; background-repeat: no-repeat; }');
    css.push('.adventure-viewport[data-zone="1"] { background-image: url("/images/zones/zone1.webp"); }');
    css.push('.adventure-viewport[data-zone="2"] { background-image: url("/images/zones/zone2.webp"); }');
    css.push('.adventure-viewport[data-zone="3"] { background-image: url("/images/zones/zone3.webp"); }');
    css.push('.adventure-viewport[data-zone="4"] { background-image: url("/images/zones/zone4.webp"); }');
    css.push('.adventure-viewport::before { content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1; background-image: radial-gradient(circle at 15% 30%, rgba(255,255,200,0.08) 0%, transparent 50%), radial-gradient(circle at 85% 60%, rgba(255,255,200,0.06) 0%, transparent 50%), radial-gradient(circle at 50% 80%, rgba(0,80,0,0.05) 0%, transparent 40%); }');
    css.push('.adventure-viewport::after { content: ""; position: absolute; inset: 0; border-radius: 0 0 22px 22px; pointer-events: none; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.15), inset 0 -20px 40px rgba(15, 23, 42, 0.04); }');
    css.push('.adventure-viewport:active, .adventure-viewport.dragging { cursor: grabbing; }');
    css.push('.map-bg-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }');
    css.push('.map-bg-sky { display: none; }');
    css.push('.map-bg-hills { display: none; }');
    css.push('.map-bg-grass { display: none; }');
    css.push('.map-bg-clouds { display: none; }');
    css.push('@keyframes cloudsDrift { from { background-position-x: 0; } to { background-position-x: 600px; } }');
    css.push('.map-bg-trees { display: none; }');
    css.push('.adventure-canvas { position: absolute; top: 0; left: 0; width: 100%; will-change: transform; transition: transform 0.05s linear; z-index: 5; }');
    css.push('.adventure-viewport.dragging .adventure-canvas { transition: none; }');
    css.push('.map-bg-stack { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; }');
    css.push('.map-bg-layer { z-index: 0; }');
    css.push('.map-decorations { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 2; }');
    css.push('.map-decoration { position: absolute; font-size: 26px; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.18)); opacity: 0.85; }');
    css.push('.map-decoration.animate { animation: decorSway 4s ease-in-out infinite; }');
    css.push('.map-town { position: absolute; display: flex; align-items: flex-end; gap: 6px; z-index: 2; pointer-events: none; }');
    css.push('.map-town-item { font-size: 26px; filter: drop-shadow(0 3px 6px rgba(15, 23, 42, 0.25)); }');
    css.push('.map-town-label { margin-left: 8px; padding: 4px 10px; border-radius: 12px; background: rgba(255, 255, 255, 0.9); color: #1e293b; font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; box-shadow: 0 6px 14px rgba(15, 23, 42, 0.18); }');
    css.push('@keyframes decorSway { 0%, 100% { transform: rotate(-3deg) scale(1); } 50% { transform: rotate(3deg) scale(1.05); } }');
    css.push('.adventure-path-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 4; }');
    css.push('.path-shadow { fill: none; stroke-width: 36; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-main { fill: none; stroke-width: 30; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-light { fill: none; stroke-width: 22; stroke-linecap: round; stroke-linejoin: round; }');
    css.push('.path-dashes { fill: none; stroke: rgba(255,255,255,0.5); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 0 18; animation: dashMove 1s linear infinite; }');
    css.push('@keyframes dashMove { to { stroke-dashoffset: -36; } }');
    css.push('@keyframes roadDashFlow0 { to { stroke-dashoffset: -40; } }');
    css.push('@keyframes roadDashFlow1 { to { stroke-dashoffset: -56; } }');
    css.push('@keyframes roadDashFlow2 { to { stroke-dashoffset: -60; } }');
    css.push('@keyframes roadDashFlow3 { to { stroke-dashoffset: -68; } }');
    css.push('.road-dash-s0 { animation: roadDashFlow0 3s linear infinite; }');
    css.push('.road-dash-s1 { animation: roadDashFlow1 2s linear infinite; }');
    css.push('.road-dash-s2 { animation: roadDashFlow2 1.4s linear infinite; }');
    css.push('.road-dash-s3 { animation: roadDashFlow3 1s linear infinite; }');
    css.push('.adventure-nodes { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 10; }');
    css.push('.adventure-node { position: absolute; width: 72px; height: 72px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; transform: translate(-50%, -50%); transition: transform 0.2s ease, box-shadow 0.2s ease; z-index: 10; overflow: visible; }');
    css.push('.adventure-node:hover { transform: translate(-50%, -50%) scale(1.15); z-index: 20; }');
    css.push('.adventure-node .node-emoji { font-size: 28px; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.15)); }');
    css.push('.adventure-node.completed { background: linear-gradient(145deg, #4ADE80 0%, #22C55E 100%); border: 4px solid #fff; box-shadow: 0 4px 12px rgba(34, 197, 94, 0.35), 0 0 0 3px rgba(34, 197, 94, 0.15); }');
    css.push('.adventure-node.available { background: linear-gradient(145deg, #FBBF24 0%, #F59E0B 100%); border: 4px solid #fff; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(245, 158, 11, 0.25); animation: availablePulse 2s ease-in-out infinite; }');
    css.push('@keyframes availablePulse { 0%, 100% { box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(245, 158, 11, 0.25); } 50% { box-shadow: 0 8px 30px rgba(245, 158, 11, 0.7), 0 0 0 8px rgba(245, 158, 11, 0.15); } }');
    css.push('.adventure-node.locked { background: linear-gradient(145deg, #B8BFC9 0%, #9CA3AF 100%); border: 4px solid rgba(255,255,255,0.5); box-shadow: 0 4px 12px rgba(0,0,0,0.15); cursor: pointer; opacity: 0.55; filter: saturate(0.3); }');
    css.push('.adventure-node.locked .node-emoji { filter: grayscale(0.8) drop-shadow(0 2px 3px rgba(0,0,0,0.2)); opacity: 0.5; }');
    css.push('.adventure-node.locked .node-lock { position: absolute; bottom: -4px; right: -4px; width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(145deg, #94A3B8 0%, #64748B 100%); border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }');
    css.push('.node-number { position: absolute; top: -6px; right: -6px; width: 26px; height: 26px; border-radius: 50%; background: #fff; border: 2px solid rgba(64,88,120,0.15); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; color: #405878; box-shadow: 0 2px 8px rgba(0,0,0,0.15); font-family: "Fredoka", sans-serif; }');
    css.push('.node-badge { position: absolute; bottom: -4px; right: -4px; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; border: 2px solid #fff; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }');
    css.push('.node-badge.check { background: linear-gradient(145deg, #10B981 0%, #059669 100%); color: #fff; }');
    css.push('.node-badge.star { background: linear-gradient(145deg, #FBBF24 0%, #F59E0B 100%); color: #fff; font-size: 14px; }');
    css.push('.node-category-dot { position: absolute; top: -4px; left: -4px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #fff; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }');
    css.push('.node-tooltip { position: absolute; bottom: calc(100% + 14px); left: 50%; transform: translateX(-50%) translateY(8px); background: rgba(30, 41, 59, 0.95); color: #fff; padding: 12px 16px; border-radius: 12px; font-size: 13px; white-space: nowrap; opacity: 0; pointer-events: none; transition: all 0.2s ease; z-index: 100; box-shadow: 0 4px 20px rgba(0,0,0,0.3); }');
    css.push('.node-tooltip::after { content: ""; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 8px solid transparent; border-top-color: rgba(30, 41, 59, 0.95); }');
    css.push('.adventure-node:hover .node-tooltip { opacity: 1; transform: translateX(-50%) translateY(0); }');
    css.push('.tooltip-title { font-weight: 700; font-size: 14px; margin-bottom: 4px; }');
    css.push('.tooltip-category { font-size: 11px; opacity: 0.7; margin-bottom: 4px; }');
    css.push('.tooltip-status { font-size: 12px; opacity: 0.85; }');
    css.push('.tooltip-status.ready { color: #FBBF24; }');
    css.push('.tooltip-status.done { color: #4ADE80; }');
    css.push('.current-indicator { position: absolute; top: -90px; left: calc(50% + 110px); transform: translateX(-50%); width: 132px; height: 132px; display: flex; align-items: center; justify-content: center; filter: drop-shadow(0 16px 18px rgba(15, 23, 42, 0.45)); animation: characterBounce 1.2s ease-in-out infinite; z-index: 15; }');
    css.push('.current-indicator img { width: 100%; height: 100%; object-fit: contain; border-radius: 0; pointer-events: none; }');
    css.push('.current-indicator-label { position: absolute; bottom: -18px; left: 50%; transform: translateX(-50%); padding: 4px 10px; border-radius: 12px; background: rgba(255, 255, 255, 0.95); color: #1e3a8a; font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; box-shadow: 0 6px 14px rgba(30, 64, 175, 0.2); white-space: nowrap; }');
    css.push('.adventure-node.is-current::after { content: ""; position: absolute; inset: -10px; border-radius: 50%; border: 3px dashed rgba(255, 255, 255, 0.9); box-shadow: 0 0 0 6px rgba(96, 165, 250, 0.25), 0 12px 24px rgba(30, 64, 175, 0.25); animation: currentRing 2.2s ease-in-out infinite; }');
    css.push('@keyframes currentRing { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.06); opacity: 0.6; } }');
    css.push('@keyframes characterBounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-8px); } }');
    css.push('.map-progress { position: absolute; top: 12px; left: 12px; background: rgba(255,255,255,0.95); padding: 10px 16px; border-radius: 14px; display: flex; align-items: center; gap: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.12); border: 1px solid rgba(64,88,120,0.1); font-family: "Fredoka", sans-serif; z-index: 50; }');
    css.push('.cycle-complete-popup-overlay { position: fixed; inset: 0; background: rgba(17, 24, 39, 0.45); display: flex; align-items: center; justify-content: center; z-index: 12000; padding: 16px; animation: fadeInOverlay 0.25s ease; }');
    css.push('.cycle-complete-popup-wrap { position: relative; width: min(560px, 96vw); }');
    css.push('.cycle-complete-popup-daniel { position: absolute; top: -112px; left: 50%; transform: translateX(-50%); width: 180px; height: 180px; object-fit: contain; filter: drop-shadow(0 12px 16px rgba(0,0,0,0.28)); pointer-events: none; }');
    css.push('.cycle-complete-popup { margin-top: 56px; width: 100%; background: linear-gradient(180deg, #ffffff 0%, #fef3c7 100%); border-radius: 20px; border: 2px solid rgba(245, 158, 11, 0.35); box-shadow: 0 16px 38px rgba(15, 23, 42, 0.3); padding: 18px; font-family: "Fredoka", sans-serif; color: #7c5c00; }');
    css.push('.cycle-complete-popup-header { display: flex; align-items: center; gap: 12px; margin-bottom: 10px; }');
    css.push('.cycle-complete-popup-title { font-size: 22px; font-weight: 700; margin: 0; color: #9a6500; }');
    css.push('.cycle-complete-popup-text { font-size: 14px; color: #8f6a00; margin: 0 0 14px 0; line-height: 1.5; }');
    css.push('.cycle-complete-popup-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 10px; }');
    css.push('.cycle-popup-btn { border: 0; border-radius: 12px; padding: 10px 14px; font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease; }');
    css.push('.cycle-popup-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(124, 92, 0, 0.2); }');
    css.push('.cycle-popup-btn.primary { background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; }');
    css.push('.cycle-popup-btn.secondary { background: #fff; color: #8f6a00; border: 2px solid rgba(245, 158, 11, 0.3); }');
    css.push('.cycle-complete-popup-selectors { display: none; gap: 8px; flex-wrap: wrap; align-items: center; }');
    css.push('.cycle-complete-popup-selectors.visible { display: flex; }');
    css.push('@keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }');
    css.push('.progress-icon { font-size: 20px; }');
    css.push('.progress-text { font-size: 14px; font-weight: 600; color: #405878; }');
    css.push('.progress-bar { width: 80px; height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden; }');
    css.push('.progress-fill { height: 100%; border-radius: 4px; transition: width 0.5s ease; }');
    css.push('.scroll-hint { position: absolute; bottom: 16px; left: 50%; transform: translateX(-50%); background: rgba(30, 41, 59, 0.85); color: #fff; padding: 10px 20px; border-radius: 24px; font-size: 13px; font-weight: 500; display: flex; align-items: center; gap: 8px; z-index: 50; animation: hintFade 3s ease-in-out infinite; }');
    css.push('@keyframes hintFade { 0%, 100% { opacity: 0.9; } 50% { opacity: 0.6; } }');
    css.push('.scroll-hint.hidden { opacity: 0; pointer-events: none; }');
    css.push('.scroll-hint-icon { font-size: 16px; animation: hintBounce 1s ease-in-out infinite; }');
    css.push('@keyframes hintBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }');
    css.push('.map-controls { position: absolute; bottom: 16px; right: 16px; display: flex; flex-direction: column; gap: 8px; z-index: 50; }');
    css.push('.map-btn { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.95); border: 1px solid rgba(64,88,120,0.12); display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; transition: all 0.15s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }');
    css.push('.map-btn:hover { background: #fff; transform: scale(1.08); }');
    css.push('@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }');
    css.push('.map-marker { position: absolute; width: 46px; height: 46px; z-index: 5; filter: drop-shadow(0 3px 6px rgba(0,0,0,0.25)); pointer-events: none; background-repeat: no-repeat; background-position: center; background-size: contain; }');
    css.push('.map-marker.start { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Cpath fill=\'%23ffffff\' d=\'M32 6c-9 0-16 7-16 16 0 12 16 32 16 32s16-20 16-32c0-9-7-16-16-16z\'/%3E%3Cpath fill=\'%234f6b8f\' d=\'M32 10c-6.6 0-12 5.4-12 12 0 8.8 12 26 12 26s12-17.2 12-26c0-6.6-5.4-12-12-12z\'/%3E%3Ccircle cx=\'32\' cy=\'22\' r=\'6\' fill=\'%23f8fafc\'/%3E%3C/svg%3E"); animation: markerPop 0.5s ease-out; }');
    css.push('.map-marker.finish { background-image: url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 64 64\'%3E%3Cpath fill=\'%2340597a\' d=\'M16 10h4v44h-4z\'/%3E%3Cpath fill=\'%23ffffff\' d=\'M20 14l28 6-12 6 12 6-28 6z\'/%3E%3Cpath fill=\'%23e2e8f0\' d=\'M20 14l20 4-10 5 10 5-20 4z\'/%3E%3C/svg%3E"); animation: flagWave 1.5s ease-in-out infinite; }');
    css.push('@keyframes markerPop { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }');
    css.push('@keyframes flagWave { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(5deg); } }');
    css.push('.floating-cloud { position: absolute; font-size: 40px; opacity: 0.6; z-index: 0; animation: cloudFloat 20s linear infinite; pointer-events: none; }');
    css.push('@keyframes cloudFloat { 0% { transform: translateX(-100px); } 100% { transform: translateX(calc(100% + 100px)); } }');
    css.push('.zone-label { position: absolute; font-family: "Fredoka", sans-serif; font-size: 13px; font-weight: 700; color: rgba(255, 255, 255, 0.95); text-transform: uppercase; letter-spacing: 1.3px; pointer-events: none; z-index: 4; text-shadow: 0 2px 6px rgba(0,0,0,0.4); background: rgba(15, 23, 42, 0.35); padding: 6px 14px; border-radius: 16px; }');
    css.push('.map-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; text-align: center; color: #6d86a8; }');
    css.push('.map-empty-emoji { font-size: 64px; margin-bottom: 16px; opacity: 0.6; }');
    css.push('.map-empty-title { font-family: "Fredoka", sans-serif; font-size: 20px; font-weight: 600; color: #405878; margin-bottom: 8px; }');
    css.push('.map-empty-text { font-size: 14px; max-width: 300px; }');
    
    // Enhanced "next" node styles - bigger, pulsing, dramatic
    css.push('.adventure-node.available { width: 82px; height: 82px; background: linear-gradient(145deg, #FBBF24 0%, #F59E0B 50%, #D97706 100%); animation: nextNodePulse 2s ease-in-out infinite, nextNodeGlow 1.5s ease-in-out infinite alternate; }');
    css.push('.adventure-node.available .node-emoji { font-size: 32px; animation: emojiShake 2s ease-in-out infinite; }');
    css.push('@keyframes nextNodePulse { 0%, 100% { transform: translate(-50%, -50%) scale(1); } 50% { transform: translate(-50%, -50%) scale(1.08); } }');
    css.push('@keyframes nextNodeGlow { 0% { box-shadow: 0 6px 20px rgba(245, 158, 11, 0.5), 0 0 0 4px rgba(245, 158, 11, 0.25), 0 0 30px rgba(245, 158, 11, 0.3); } 100% { box-shadow: 0 8px 35px rgba(245, 158, 11, 0.8), 0 0 0 8px rgba(245, 158, 11, 0.2), 0 0 50px rgba(245, 158, 11, 0.5); } }');
    css.push('@keyframes emojiShake { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }');
    
    // Available-next: unlocked modules beyond the current one — subtler style
    css.push('.adventure-node.available-next { width: 72px; height: 72px; background: linear-gradient(145deg, #FDE68A 0%, #FCD34D 50%, #FBBF24 100%); border: 4px solid rgba(255,255,255,0.85); box-shadow: 0 4px 14px rgba(251, 191, 36, 0.3), 0 0 0 3px rgba(251, 191, 36, 0.15); animation: nextAvailSoft 3s ease-in-out infinite; }');
    css.push('.adventure-node.available-next .node-emoji { font-size: 28px; animation: none; opacity: 0.8; }');
    css.push('@keyframes nextAvailSoft { 0%, 100% { box-shadow: 0 4px 14px rgba(251, 191, 36, 0.3), 0 0 0 3px rgba(251, 191, 36, 0.15); } 50% { box-shadow: 0 6px 20px rgba(251, 191, 36, 0.4), 0 0 0 5px rgba(251, 191, 36, 0.1); } }');

    // Node loading state - gentle pulse on click while async checks run
    css.push('@keyframes nodeLoadingPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }');
    css.push('.adventure-node.node-loading { animation: nodeLoadingPulse 0.8s ease-in-out infinite !important; pointer-events: none !important; }');

    // Daniel companion on path styles
    css.push('.daniel-companion { position: absolute; width: 64px; height: 64px; z-index: 12; pointer-events: none; transition: all 0.5s ease; }');
    css.push('.daniel-companion-inner { width: 100%; height: 100%; border-radius: 50%; background: rgba(255,255,255,0.95); padding: 4px; box-shadow: 0 4px 15px rgba(0,0,0,0.2); animation: danielWalk 1s ease-in-out infinite; }');
    css.push('.daniel-companion img { width: 100%; height: 100%; object-fit: contain; border-radius: 50%; }');
    css.push('.daniel-expression-label { position: absolute; bottom: -20px; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: 600; color: #405878; white-space: nowrap; background: rgba(255,255,255,0.9); padding: 2px 8px; border-radius: 10px; font-family: "Fredoka", sans-serif; }');
    css.push('@keyframes danielWalk { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }');
    
    // Destination marker styles
    css.push('.destination-marker { position: absolute; z-index: 6; text-align: center; pointer-events: none; animation: destinationFloat 3s ease-in-out infinite; }');
    css.push('.destination-icon { font-size: 52px; filter: drop-shadow(0 5px 10px rgba(0,0,0,0.3)); }');
    css.push('.destination-label { font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 700; color: #fff; background: linear-gradient(135deg, rgba(34,197,94,0.9), rgba(22,163,74,0.9)); padding: 6px 14px; border-radius: 20px; margin-top: 8px; display: inline-block; box-shadow: 0 3px 10px rgba(0,0,0,0.2); }');
    css.push('@keyframes destinationFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }');
    
    // Mini-moments on path (signposts, campfires)
    css.push('.path-moment { position: absolute; z-index: 3; pointer-events: none; text-align: center; }');
    css.push('.path-moment-icon { font-size: 28px; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); }');
    css.push('.path-moment-label { font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 600; color: #405878; background: rgba(255,255,255,0.9); padding: 3px 8px; border-radius: 8px; margin-top: 4px; display: block; box-shadow: 0 2px 6px rgba(0,0,0,0.1); }');
    css.push('.path-moment.campfire .path-moment-icon { animation: campfireFlicker 0.5s ease-in-out infinite alternate; }');
    css.push('@keyframes campfireFlicker { 0% { transform: scale(1); filter: drop-shadow(0 2px 4px rgba(255,100,0,0.4)); } 100% { transform: scale(1.1); filter: drop-shadow(0 2px 8px rgba(255,150,0,0.6)); } }');
    
    // Environmental feedback elements
    css.push('.env-element { position: absolute; pointer-events: none; z-index: 1; transition: opacity 0.5s ease; }');
    css.push('.env-element.bloom { animation: bloomIn 0.8s ease-out forwards; }');
    css.push('@keyframes bloomIn { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }');
    css.push('.env-butterfly { animation: butterflyFloat 4s ease-in-out infinite; }');
    css.push('@keyframes butterflyFloat { 0%, 100% { transform: translate(0, 0) rotate(0deg); } 25% { transform: translate(10px, -15px) rotate(5deg); } 50% { transform: translate(20px, 0) rotate(0deg); } 75% { transform: translate(10px, 10px) rotate(-5deg); } }');
    css.push('.env-bird { animation: birdFly 6s ease-in-out infinite; }');
    css.push('@keyframes birdFly { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -20px); } }');
    css.push('.env-sparkle { animation: sparkleShine 1.5s ease-in-out infinite; }');
    css.push('@keyframes sparkleShine { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }');
    
    // Progress-reactive grass layer
    css.push('.map-bg-grass-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 50%; pointer-events: none; transition: background 0.8s ease; }');
    
    // Cracked ground effect for start zone
    css.push('.env-crack { position: absolute; font-size: 20px; opacity: 0.6; pointer-events: none; }');
    
    // Zone upgrade celebration styles
    css.push('.zone-upgrade-shimmer { position: absolute; inset: 0; z-index: 60; pointer-events: none; background: linear-gradient(135deg, rgba(255,215,0,0.0) 0%, rgba(255,215,0,0.45) 40%, rgba(255,255,255,0.7) 50%, rgba(255,215,0,0.45) 60%, rgba(255,215,0,0.0) 100%); background-size: 300% 300%; animation: zoneShimmerSweep 1.2s ease-out forwards; border-radius: 20px; }');
    css.push('@keyframes zoneShimmerSweep { 0% { background-position: 150% 150%; opacity: 0; } 30% { opacity: 1; } 100% { background-position: -50% -50%; opacity: 0; } }');
    
    css.push('.zone-upgrade-banner { position: absolute; top: 0; left: 0; right: 0; z-index: 80; display: flex; flex-direction: column; align-items: center; padding: 0; animation: zoneBannerSlideIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; transform: translateY(-100%); pointer-events: auto; }');
    css.push('.zone-upgrade-banner.dismissing { animation: zoneBannerSlideOut 0.5s ease-in forwards; }');
    css.push('@keyframes zoneBannerSlideIn { 0% { transform: translateY(-100%); } 100% { transform: translateY(0); } }');
    css.push('@keyframes zoneBannerSlideOut { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-100%); opacity: 0; } }');
    
    css.push('.zone-upgrade-card { position: relative; width: 92%; max-width: 420px; margin-top: 16px; background: linear-gradient(135deg, #fffbe6 0%, #fff7cc 40%, #fff3b0 100%); border: 3px solid #f59e0b; border-radius: 20px; padding: 20px 20px 18px; box-shadow: 0 8px 32px rgba(245, 158, 11, 0.35), 0 0 0 6px rgba(245, 158, 11, 0.12), inset 0 1px 0 rgba(255,255,255,0.8); text-align: center; overflow: visible; cursor: pointer; }');
    css.push('.zone-upgrade-card::before { content: ""; position: absolute; inset: -3px; border-radius: 22px; background: linear-gradient(135deg, #fbbf24, #f59e0b, #fbbf24, #fcd34d); z-index: -1; animation: zoneBorderGlow 2s ease-in-out infinite; }');
    css.push('@keyframes zoneBorderGlow { 0%, 100% { opacity: 0.6; } 50% { opacity: 1; } }');
    
    css.push('.zone-upgrade-daniel { width: 80px; height: 80px; margin: -56px auto 8px; filter: drop-shadow(0 6px 12px rgba(0,0,0,0.25)); animation: zoneDanielBounce 0.8s ease-in-out 0.4s infinite alternate; }');
    css.push('.zone-upgrade-daniel img { width: 100%; height: 100%; object-fit: contain; }');
    css.push('@keyframes zoneDanielBounce { 0% { transform: translateY(0) scale(1); } 100% { transform: translateY(-8px) scale(1.05); } }');
    
    css.push('.zone-upgrade-emoji { font-size: 36px; margin-bottom: 4px; animation: zoneEmojiPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s both; }');
    css.push('@keyframes zoneEmojiPop { 0% { transform: scale(0); } 100% { transform: scale(1); } }');
    
    css.push('.zone-upgrade-title { font-family: "Fredoka", "Fredoka", system-ui, sans-serif; font-size: 20px; font-weight: 700; color: #92400e; margin: 0 0 4px; line-height: 1.2; }');
    css.push('.zone-upgrade-subtitle { font-family: "Fredoka", sans-serif; font-size: 13px; color: #b45309; margin: 0 0 10px; line-height: 1.4; }');
    
    css.push('.zone-upgrade-new-label { display: inline-flex; align-items: center; gap: 6px; background: linear-gradient(135deg, #f59e0b, #d97706); color: #fff; font-family: "Fredoka", sans-serif; font-size: 12px; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px; box-shadow: 0 3px 8px rgba(217, 119, 6, 0.35); }');
    
    css.push('.zone-upgrade-tap-hint { font-family: "Fredoka", sans-serif; font-size: 11px; color: #d97706; margin-top: 8px; opacity: 0.7; }');
    
    css.push('.zone-upgrade-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; border-radius: 20px; z-index: 79; }');
    css.push('.zone-confetti-piece { position: absolute; width: 8px; height: 8px; border-radius: 2px; animation: zoneConfettiFall 2.5s ease-in forwards; }');
    css.push('@keyframes zoneConfettiFall { 0% { transform: translateY(-20px) rotate(0deg) scale(1); opacity: 1; } 100% { transform: translateY(500px) rotate(720deg) scale(0.3); opacity: 0; } }');

    css.push('.return-celebration { position: fixed; inset: 0; z-index: 10000; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.3); animation: fadeIn 0.3s ease; }');
    css.push('.return-celebration-content { background: #fff; border-radius: 24px; padding: 32px 40px; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.2); animation: celebrationPop 0.5s ease; }');
    css.push('.return-celebration-emoji { font-size: 56px; margin-bottom: 8px; }');
    css.push('.return-celebration-text { font-family: "Fredoka", sans-serif; font-size: 28px; font-weight: 700; color: #1E293B; }');
    css.push('.return-celebration-sub { font-family: "Fredoka", sans-serif; font-size: 15px; color: #64748B; margin-top: 6px; }');
    css.push('@keyframes celebrationPop { 0% { transform: scale(0.5); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }');
    css.push('@keyframes returnConfettiFall { 0% { transform: translateY(0) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }');

    css.push('@media (max-width: 768px) { .adventure-header { flex-direction: column; align-items: stretch; padding: 12px 14px 8px; gap: 8px; } .adventure-header-top { flex-wrap: wrap; } .adventure-header-zone { justify-content: center; } .adventure-viewport { height: 420px; } .adventure-node { width: 58px; height: 58px; } .adventure-node .node-emoji { font-size: 24px; } .adventure-node.available { width: 68px; height: 68px; } .node-number { width: 20px; height: 20px; font-size: 9px; } .node-badge { width: 22px; height: 22px; font-size: 11px; } .path-shadow { stroke-width: 24 !important; } .path-main { stroke-width: 20 !important; } .path-light { stroke-width: 14 !important; } .map-decoration { font-size: 20px; } .current-indicator { width: 104px; height: 104px; top: -80px; left: calc(50% + 78px); } .current-indicator-label { font-size: 10px; } .adventure-node.is-current::after { inset: -8px; } .node-tooltip { font-size: 12px; padding: 10px 12px; } .map-progress { padding: 8px 12px; font-size: 12px; } .progress-bar { width: 60px; } .progress-text { font-size: 12px; } .progress-icon { font-size: 16px; } .cycle-complete-popup-title { font-size: 19px; } .cycle-complete-popup-actions, .cycle-complete-popup-selectors { flex-direction: column; } .cycle-popup-btn { width: 100%; } .cycle-complete-popup-daniel { width: 140px; height: 140px; top: -86px; } .zone-upgrade-card { padding: 16px 14px 14px; max-width: 340px; } .zone-upgrade-title { font-size: 17px; } .zone-upgrade-subtitle { font-size: 12px; } .zone-upgrade-daniel { width: 64px; height: 64px; margin-top: -44px; } .zone-upgrade-emoji { font-size: 28px; } }');

    // =============================================
    // SKILL PICKER CARDS & HELP ME CHOOSE QUIZ
    // =============================================
    css.push('.skill-picker-inline { padding: 8px 0; }');
    css.push('.skill-picker-header { text-align: center; padding: 28px 24px 8px; }');
    css.push('.skill-picker-title { font-family: "Fredoka", sans-serif; font-size: 28px; font-weight: 700; color: #1E293B; margin: 0; }');
    css.push('.skill-picker-subtitle { font-family: "Fredoka", sans-serif; font-size: 15px; color: #64748B; margin: 6px 0 0; }');
    css.push('.skill-picker-help-wrap { text-align: center; margin: 18px 0 4px; }');
    css.push('.skill-picker-help-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; background: linear-gradient(135deg, #6366F1, #4f46e5); color: #fff; border: none; border-radius: 50px; font-family: "Fredoka", sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 18px rgba(99,102,241,0.35); transition: transform 0.15s, box-shadow 0.15s; animation: helpBtnGlow 2s ease-in-out infinite; }');
    css.push('.skill-picker-help-btn:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(99,102,241,0.5); }');
    css.push('@keyframes helpBtnGlow { 0%, 100% { box-shadow: 0 4px 18px rgba(99,102,241,0.35); } 50% { box-shadow: 0 4px 24px rgba(99,102,241,0.55); } }');
    css.push('.skill-picker-help-hint { font-family: "Fredoka", sans-serif; font-size: 13px; color: #94a3b8; margin-top: 8px; }');

    // Card grid - center last item if odd
    css.push('.skill-picker-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 18px; padding: 18px 24px 28px; justify-items: center; }');
    css.push('.skill-picker-cards > .skill-card:last-child:nth-child(odd) { grid-column: 1 / -1; max-width: 380px; }');

    // Themed cards
    css.push('.skill-card { border-radius: 20px; border: 2.5px solid var(--card-border); padding: 22px 20px 18px; cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden; background: var(--card-bg); width: 100%; }');
    css.push('.skill-card:hover { transform: translateY(-4px); box-shadow: 0 10px 28px rgba(0,0,0,0.1); }');
    css.push('.skill-card-decos { position: absolute; top: 0; right: 0; bottom: 0; left: 0; pointer-events: none; overflow: hidden; z-index: 0; }');
    css.push('.skill-card-deco { position: absolute; font-size: 22px; opacity: 0.12; }');
    css.push('.skill-card-deco:nth-child(1) { top: 8px; right: 56px; transform: rotate(-15deg); }');
    css.push('.skill-card-deco:nth-child(2) { bottom: 12px; right: 14px; transform: rotate(20deg); font-size: 18px; }');
    css.push('.skill-card-deco:nth-child(3) { bottom: 40px; left: 10px; transform: rotate(-10deg); font-size: 16px; }');

    // Current adventure card
    css.push('.skill-picker-cards.has-chosen .skill-card:not(.last-chosen) { filter: grayscale(0.6) opacity(0.55); }');
    css.push('.skill-picker-cards.has-chosen .skill-card:not(.last-chosen):hover { filter: grayscale(0.15) opacity(0.9); }');
    css.push('.skill-card.last-chosen { border-width: 3px; box-shadow: 0 0 0 4px rgba(99,102,241,0.12), 0 8px 24px rgba(0,0,0,0.08); }');
    css.push('.skill-card-continue-badge { display: inline-flex; align-items: center; gap: 6px; position: absolute; top: 0; left: 20px; background: linear-gradient(135deg, #6366F1, #818CF8); color: #fff; font-family: "Fredoka", sans-serif; font-size: 11px; font-weight: 700; padding: 5px 14px 6px; border-radius: 0 0 12px 12px; letter-spacing: 0.3px; z-index: 2; box-shadow: 0 3px 10px rgba(99,102,241,0.3); }');

    // Speech bubble
    css.push('.skill-card-speech { position: relative; background: #fff; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 6px 12px; font-family: "Fredoka", sans-serif; font-size: 12px; font-weight: 500; color: #64748B; margin-bottom: 10px; display: inline-block; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }');
    css.push('.skill-card-speech::after { content: ""; position: absolute; bottom: -6px; left: 20px; width: 10px; height: 10px; background: #fff; border-right: 1.5px solid #e2e8f0; border-bottom: 1.5px solid #e2e8f0; transform: rotate(45deg); }');

    css.push('.skill-card-top { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; position: relative; z-index: 1; }');
    css.push('.skill-card-emoji { font-size: 38px; width: 56px; height: 56px; display: flex; align-items: center; justify-content: center; border-radius: 16px; background: rgba(255,255,255,0.7); flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }');
    css.push('.skill-card-name { font-family: "Fredoka", sans-serif; font-size: 20px; font-weight: 700; color: #1E293B; }');
    css.push('.skill-card-desc { font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 8px; position: relative; z-index: 1; }');
    css.push('.skill-card-pick-label { font-family: "Fredoka", sans-serif; font-size: 12px; font-weight: 700; color: #64748B; margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; position: relative; z-index: 1; }');
    css.push('.skill-card-pick-text { font-size: 13px; color: #475569; line-height: 1.4; margin-bottom: 12px; position: relative; z-index: 1; }');
    css.push('.skill-card-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; position: relative; z-index: 1; }');
    css.push('.skill-card-tag { display: inline-flex; align-items: center; gap: 4px; padding: 4px 11px; border-radius: 20px; font-size: 12px; font-weight: 600; background: rgba(255,255,255,0.7); color: #405878; border: 1px solid rgba(0,0,0,0.06); }');

    // Progress - game-like
    css.push('.skill-card-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; position: relative; z-index: 1; }');
    css.push('.skill-card-progress-icon { font-size: 16px; }');
    css.push('.skill-card-progress-bar { flex: 1; height: 10px; background: rgba(255,255,255,0.6); border-radius: 5px; overflow: hidden; border: 1px solid rgba(0,0,0,0.06); }');
    css.push('.skill-card-progress-fill { height: 100%; border-radius: 5px; transition: width 0.3s; }');
    css.push('.skill-card-progress-text { font-size: 12px; font-weight: 700; color: #405878; white-space: nowrap; font-family: "Fredoka", sans-serif; }');

    // Button
    css.push('.skill-card-btn { display: block; width: 100%; padding: 12px; border: none; border-radius: 14px; font-family: "Fredoka", sans-serif; font-size: 15px; font-weight: 700; color: #fff; cursor: pointer; transition: filter 0.15s, transform 0.1s; position: relative; z-index: 1; letter-spacing: 0.2px; }');
    css.push('.skill-card-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }');
    css.push('.skill-card-character { position: absolute; top: 14px; right: 14px; width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 3px 10px rgba(0,0,0,0.12); z-index: 1; }');

    // Preview modal
    css.push('.skill-preview-overlay { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; animation: fadeInOverlay 0.2s ease; padding: 20px; }');
    css.push('.skill-preview-modal { background: #fff; border-radius: 24px; max-width: 480px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden; }');
    css.push('.skill-preview-header { padding: 24px 24px 16px; text-align: center; }');
    css.push('.skill-preview-top { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 8px; }');
    css.push('.skill-preview-emoji { font-size: 48px; width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; border-radius: 20px; background: rgba(255,255,255,0.7); flex-shrink: 0; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }');
    css.push('.skill-preview-name { font-family: "Fredoka", sans-serif; font-size: 26px; font-weight: 700; color: #1E293B; }');
    css.push('.skill-preview-character { width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.8); box-shadow: 0 3px 12px rgba(0,0,0,0.12); }');
    css.push('.skill-preview-body { padding: 0 24px 24px; }');
    css.push('.skill-preview-desc { font-size: 15px; color: #475569; line-height: 1.6; margin-bottom: 18px; text-align: center; }');
    css.push('.skill-preview-learn-label { font-family: "Fredoka", sans-serif; font-size: 14px; font-weight: 700; color: #405878; margin-bottom: 10px; }');
    css.push('.skill-preview-learn-list { list-style: none; padding: 0; margin: 0 0 22px; }');
    css.push('.skill-preview-learn-list li { font-size: 14px; color: #475569; padding: 6px 0; display: flex; align-items: center; gap: 10px; }');
    css.push('.skill-preview-learn-list li::before { content: "⭐"; font-size: 14px; }');
    css.push('.skill-preview-actions { display: flex; gap: 10px; }');
    css.push('.skill-preview-btn { flex: 1; padding: 14px; border: none; border-radius: 14px; font-family: "Fredoka", sans-serif; font-size: 15px; font-weight: 700; cursor: pointer; transition: filter 0.15s, transform 0.1s; }');
    css.push('.skill-preview-btn.primary { color: #fff; }');
    css.push('.skill-preview-btn.secondary { background: #f1f5f9; color: #405878; border: 2px solid #e2e8f0; }');
    css.push('.skill-preview-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }');
    css.push('@media (max-width: 768px) { .skill-picker-cards { grid-template-columns: 1fr; padding: 12px 16px 24px; } .skill-picker-cards > .skill-card:last-child:nth-child(odd) { max-width: 100%; } .skill-preview-modal { max-width: 100%; } .skill-preview-actions { flex-direction: column; } .skill-picker-title { font-size: 22px; } }');

    // Current skill badge (replaces the dropdown)
    css.push('.current-skill-badge { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: #fff; border: 2px solid #e2e8f0; border-radius: 14px; cursor: pointer; transition: all 0.15s; font-family: "Fredoka", sans-serif; }');
    css.push('.current-skill-badge:hover { border-color: #405878; box-shadow: 0 2px 8px rgba(64,88,120,0.12); }');
    css.push('.current-skill-badge-emoji { font-size: 20px; }');
    css.push('.current-skill-badge-name { font-size: 14px; font-weight: 600; color: #1E293B; }');
    css.push('.current-skill-badge-change { font-size: 12px; color: #405878; font-weight: 600; }');

    // Help Me Choose Quiz
    css.push('.quiz-overlay { position: fixed; inset: 0; z-index: 10000; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; animation: fadeInOverlay 0.2s ease; padding: 20px; }');
    css.push('.quiz-container { background: #fff; border-radius: 24px; max-width: 520px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden; }');
    css.push('.quiz-header { text-align: center; padding: 28px 24px 16px; background: linear-gradient(135deg, #eef2f7, #e0f2fe); }');
    css.push('.quiz-title { font-family: "Fredoka", sans-serif; font-size: 24px; font-weight: 700; color: #1E293B; margin: 0; }');
    css.push('.quiz-subtitle { font-family: "Fredoka", sans-serif; font-size: 14px; color: #64748B; margin: 6px 0 0; }');
    css.push('.quiz-progress-dots { display: flex; justify-content: center; gap: 8px; margin-top: 14px; }');
    css.push('.quiz-dot { width: 10px; height: 10px; border-radius: 50%; background: #cbd5e1; transition: background 0.2s; }');
    css.push('.quiz-dot.active { background: #6366F1; }');
    css.push('.quiz-dot.done { background: #818CF8; }');
    css.push('.quiz-body { padding: 20px 24px 24px; }');
    css.push('.quiz-question { font-family: "Fredoka", sans-serif; font-size: 18px; font-weight: 600; color: #1E293B; text-align: center; margin-bottom: 16px; }');
    css.push('.quiz-options { display: flex; flex-direction: column; gap: 10px; }');
    css.push('.quiz-option { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border: 2.5px solid #e2e8f0; border-radius: 14px; background: #fff; cursor: pointer; transition: all 0.15s; font-family: "Fredoka", sans-serif; font-size: 15px; font-weight: 500; color: #334155; }');
    css.push('.quiz-option:hover { border-color: #818CF8; background: #f0f2ff; }');
    css.push('.quiz-option.selected { border-color: #6366F1; background: #eef0ff; color: #405878; font-weight: 600; }');
    css.push('.quiz-option-emoji { font-size: 24px; flex-shrink: 0; }');
    css.push('.quiz-next-btn { display: block; width: 100%; margin-top: 18px; padding: 14px; border: none; border-radius: 14px; background: linear-gradient(135deg, #6366F1, #4f46e5); color: #fff; font-family: "Fredoka", sans-serif; font-size: 16px; font-weight: 600; cursor: pointer; transition: filter 0.15s, opacity 0.15s; }');
    css.push('.quiz-next-btn:hover:not(:disabled) { filter: brightness(1.08); }');
    css.push('.quiz-next-btn:disabled { opacity: 0.5; cursor: not-allowed; }');
    css.push('.quiz-result { text-align: center; padding: 24px; }');
    css.push('.quiz-result-label { font-family: "Fredoka", sans-serif; font-size: 14px; color: #64748B; margin-bottom: 8px; }');
    css.push('.quiz-result-skill { display: inline-flex; align-items: center; gap: 10px; font-family: "Fredoka", sans-serif; font-size: 24px; font-weight: 700; margin-bottom: 10px; }');
    css.push('.quiz-result-desc { font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 20px; }');
    css.push('.quiz-result-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }');
    css.push('.quiz-result-btn { padding: 12px 24px; border-radius: 14px; font-family: "Fredoka", sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; border: none; transition: filter 0.15s; }');
    css.push('.quiz-result-btn.primary { background: linear-gradient(135deg, #6366F1, #4f46e5); color: #fff; }');
    css.push('.quiz-result-btn.secondary { background: #f1f5f9; color: #475569; border: 2px solid #e2e8f0; }');
    css.push('.quiz-result-btn:hover { filter: brightness(1.06); }');
    css.push('@media (max-width: 768px) { .skill-picker-cards { grid-template-columns: 1fr; padding: 12px 16px 20px; } .skill-picker-title { font-size: 22px; } .quiz-container { max-width: 100%; } }');
    
    var styles = document.createElement('style');
    styles.id = 'adventure-map-v4-styles';
    styles.textContent = css.join('\n');
    document.head.appendChild(styles);
}
