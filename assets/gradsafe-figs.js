/* Animated figures for the GradSafe post. Dependency-free. Same player as the sprint explainer:
   each figure is a list of scenes; render(i, t) draws scene i at progress t (0..1) as an SVG string. */
(function () {
  "use strict";
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STATIC = /[?&]static=1/.test(location.search);
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function e(x) { x = clamp(x, 0, 1); return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function f(x) { return (+x).toFixed(1); }
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/'/g, "&#39;"); }
  function txt(x, y, cls, anchor, s) { return "<text class='" + cls + "' x='" + f(x) + "' y='" + f(y) + "' text-anchor='" + anchor + "'>" + esc(s) + "</text>"; }
  function svgOpen(W, H, label) { return "<svg viewBox='0 0 " + W + " " + H + "' width='" + W + "' height='" + H + "' role='img' aria-label='" + esc(label) + "'>"; }
  function arrow(x1, y1, x2, y2, cls, head, bg) {
    var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy); if (L < 2) return "";
    var ux = dx / L, uy = dy / L, hx = x2 - ux * 10, hy = y2 - uy * 10, s = "";
    if (bg) s += "<line class='arrow-bg' x1='" + f(x1) + "' y1='" + f(y1) + "' x2='" + f(hx) + "' y2='" + f(hy) + "'/>";
    s += "<line class='" + cls + "' x1='" + f(x1) + "' y1='" + f(y1) + "' x2='" + f(hx) + "' y2='" + f(hy) + "'/>";
    s += "<polygon class='" + head + "' points='" + f(x2) + "," + f(y2) + " " + f(hx - uy * 6) + "," + f(hy + ux * 6) + " " + f(hx + uy * 6) + "," + f(hy - ux * 6) + "'/>";
    return s;
  }
  function seg(el, opts, value, onChange) {
    el.innerHTML = opts.map(function (o) { return "<button type='button' data-v='" + o[0] + "' aria-pressed='" + (o[0] === value) + "'>" + o[1] + "</button>"; }).join("");
    el.addEventListener("click", function (ev) {
      var b = ev.target.closest("button"); if (!b) return;
      $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      onChange(b.getAttribute("data-v"));
    });
  }
  function onFirstVisible(el, fn) {
    if (STATIC || !("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); fn(); } }, { threshold: 0.35 });
    io.observe(el);
  }
  var players = [], redraws = [];
  function makePlayer(pre, figSel, scenes, render, staticIdx) {
    var fig = $(figSel); if (!fig) return null;
    var P = { i: 0, t: 1, playing: false, raf: null, timer: null };
    var dots = $("#" + pre + "Dots"), play = $("#" + pre + "Play"), prev = $("#" + pre + "Prev"), next = $("#" + pre + "Next"), steps = $("#" + pre + "Steps");
    dots.innerHTML = scenes.map(function (sc, j) { return "<button type='button' role='tab' aria-label='Step " + (j + 1) + ": " + esc(sc.t) + "'>" + (j + 1) + "</button>"; }).join("");
    var btns = $$("button", dots);
    /* the narration: every step's text sits beside the animation; the current one is highlighted and revealed sentence by sentence */
    var sentences = scenes.map(function (sc) { return sc.h.match(/[^.!?]+[.!?]+["\u201D]?\s*|[^.!?]+$/g) || [sc.h]; });
    steps.innerHTML = scenes.map(function (sc, j) {
      return "<div class='g-step' data-i='" + j + "'><span class='stepno'>Step " + (j + 1) + " of " + scenes.length + "</span><h4>" + esc(sc.t) + "</h4><p>" +
        sentences[j].map(function (x) { return "<span class='sent on'>" + esc(x) + "</span>"; }).join("") + "</p></div>";
    }).join("");
    var stepEls = $$(".g-step", steps);
    function reveal(i, t) {
      var sp = $$(".sent", stepEls[i]), n = sp.length;
      sp.forEach(function (x, k) { x.classList.toggle("on", k === 0 || t >= (k / n) * 0.85); });
    }
    function setPlaying(on) {
      if (on) players.forEach(function (o) { if (o !== api) o.pause(); });
      P.playing = on;
      play.textContent = on ? "Pause" : (P.i === scenes.length - 1 ? "Replay" : "Play");
      if (!on) clearTimeout(P.timer);
    }
    function show(i, animate) {
      clearTimeout(P.timer);
      if (P.raf) { cancelAnimationFrame(P.raf); P.raf = null; }
      P.i = i;
      btns.forEach(function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); b.classList.toggle("done", j < i); });
      stepEls.forEach(function (el, j) { if (j === i) el.setAttribute("aria-current", "step"); else el.removeAttribute("aria-current"); if (j !== i) $$(".sent", el).forEach(function (x) { x.classList.add("on"); }); });
      if (steps.scrollHeight > steps.clientHeight) { var el = stepEls[i]; steps.scrollTo({ top: Math.max(0, el.offsetTop - steps.offsetTop - 8), behavior: animate && !reduce ? "smooth" : "auto" }); }
      prev.disabled = i === 0; next.disabled = i === scenes.length - 1;
      if (!P.playing) play.textContent = i === scenes.length - 1 ? "Replay" : "Play";
      if (!animate || reduce) { P.t = 1; render(i, 1); reveal(i, 1); if (P.playing) setPlaying(false); return; }
      var t0 = performance.now(), ms = scenes[i].ms;
      (function frame(now) {
        var t = clamp((now - t0) / ms, 0, 1);
        P.t = t; render(i, t); reveal(i, t);
        if (t < 1) { P.raf = requestAnimationFrame(frame); return; }
        P.raf = null;
        if (!P.playing) return;
        if (i === scenes.length - 1) { setPlaying(false); return; }
        P.timer = setTimeout(function () { show(i + 1, true); }, Math.max(4000, scenes[i].h.length * 40));
      })(t0);
    }
    play.addEventListener("click", function () {
      if (P.playing) { setPlaying(false); return; }
      setPlaying(true);
      show(P.i === scenes.length - 1 ? 0 : (P.t < 1 ? P.i : Math.min(P.i + 1, scenes.length - 1)), true);
    });
    prev.addEventListener("click", function () { setPlaying(false); show(Math.max(0, P.i - 1), true); });
    next.addEventListener("click", function () { setPlaying(false); show(Math.min(scenes.length - 1, P.i + 1), true); });
    btns.forEach(function (b, j) { b.addEventListener("click", function () { setPlaying(false); show(j, true); }); });
    stepEls.forEach(function (el, j) { el.addEventListener("click", function () { if (j !== P.i) { setPlaying(false); show(j, true); } }); });
    var api = {
      pause: function () { if (P.playing) setPlaying(false); },
      redraw: function () { render(P.i, P.t); },
      frame: function (i, t) { setPlaying(false); show(i, false); P.t = t; render(i, t); reveal(i, t); }
    };
    players.push(api);
    show(STATIC ? staticIdx : 0, false);
    redraws.push(api.redraw);
    onFirstVisible(fig, function () { if (!reduce && !STATIC) { setPlaying(true); show(0, true); } });
    return api;
  }
  var rt = null;
  window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { redraws.forEach(function (r) { r(); }); }, 120); });

  /* =====================================================================
     Figure 1: what a gradient-based detector reads
     ===================================================================== */
  var G1 = [
    { t: "A request arrives, and the detector does not answer it",
      h: "GradSafe is a filter that runs before the model replies. It reads the user's text and asks a different question: how far is this model from agreeing to it?", ms: 2200 },
    { t: "Append the word “Sure,”",
      h: "The detector pairs the request with a compliance token, “Sure,”, as if the model had started to agree. Nothing is generated; this is only the text it will score.", ms: 2200 },
    { t: "Measure the model's surprise",
      h: "The loss says how unlikely “Sure,” is after this request. A safety-trained model is not surprised to agree to a harmless request, and very surprised to agree to a harmful one.", ms: 2600 },
    { t: "One backward pass turns surprise into a direction",
      h: "The gradient is the direction the model's safety-critical parameters would have to move to make “Sure,” likely. It is an arrow in a space with millions of dimensions; the plane here is a sketch of it.", ms: 3000 },
    { t: "Harmful requests all point the same way",
      h: "Known-harmful prompts push those parameters in nearly the same direction. Their average is computed once and stored as the unsafe reference direction. Harmless requests point elsewhere.", ms: 3000 },
    { t: "The score is the angle between the two arrows",
      h: "GradSafe scores an input by the cosine between its gradient and the reference. Close to the reference means unsafe. Switch the input above to see a harmless request score low.", ms: 2800 },
    { t: "In a conversation, benign turns pull the arrow away",
      h: "The paper scores windows of several user turns. The benign turns in a window add their own pull, so the arrow of a window that contains a harmful turn drifts off the reference and the score drops. The paper calls this dilution.", ms: 3200 }
  ];
  var g1kind = "harm";
  var G1K = { harm: { name: "a harmful request", loss: 0.86, ang: 50, cos: 0.83, dang: 86, dcos: 0.32 },
              safe: { name: "a harmless request", loss: 0.16, ang: 118, cos: 0.14, dang: 124, dcos: 0.09 } };
  var G1REF = 28, G1FAINT = [36, 22, 31, 25];
  function g1Render(i, t) {
    var box = $("#g1Chart"); if (!box) return;
    var W = box.clientWidth || 600, narrow = W < 520, H = narrow ? 440 : 340, k = G1K[g1kind], s = svgOpen(W, H, "Step " + (i + 1) + ": " + G1[i].t);
    /* layout: input card on the left and the parameter plane on the right; stacked on narrow screens */
    var cx0 = 14, cw = narrow ? W - 28 : W * 0.40, cy0 = narrow ? 20 : 26, ch = narrow ? 104 : 150;
    var lift = i === 6 ? e(t / 0.4) : 0;
    var cy = i === 6 ? cy0 + 58 * lift : cy0, chh = i === 6 ? ch - 30 * lift : ch;
    var px0 = narrow ? 14 : cx0 + cw + 18, px1 = W - 12, py0 = narrow ? cy + chh + 64 : 22, py1 = H - 34, ox = px0 + (px1 - px0) * 0.42, oy = py1 - 22, R = Math.min(px1 - ox - 14, oy - py0 - 10);
    /* ---- the request card ---- */
    s += "<g>";
    if (i === 6) {
      for (var b = 0; b < 2; b++) {
        var by = cy0 - 6 + b * 30 - 8 * (1 - lift) , bop = lift;
        s += "<g opacity='" + f(bop) + "'><rect class='bubble' x='" + cx0 + "' y='" + f(by) + "' width='" + f(cw) + "' height='24' rx='8'/>" +
          "<line class='tline' x1='" + (cx0 + 12) + "' x2='" + f(cx0 + cw * 0.62) + "' y1='" + f(by + 12) + "' y2='" + f(by + 12) + "'/>" + txt(cx0 + cw - 8, by + 16, "tx-m", "end", "benign turn") + "</g>";
      }
    }
    s += "<rect class='card" + (i === 0 ? " card-hi" : "") + "' x='" + cx0 + "' y='" + f(cy) + "' width='" + f(cw) + "' height='" + f(chh) + "' rx='12'/>";
    s += txt(cx0 + 12, cy + 20, "tx-m", "start", i === 6 ? "user turn: " + k.name : "user text: " + k.name);
    var nl = (i === 6 || narrow) ? 2 : 3, lw = [0.78, 0.62, 0.7];
    for (var l = 0; l < nl; l++) {
      var ly = cy + 38 + l * 16, vis = i === 0 ? e((t - l * 0.18) / 0.4) : 1;
      s += "<line class='tline" + (g1kind === "harm" ? " tline-hot" : "") + "' opacity='" + f(vis) + "' x1='" + (cx0 + 12) + "' x2='" + f(cx0 + 12 + (cw - 24) * lw[l] * vis) + "' y1='" + f(ly) + "' y2='" + f(ly) + "'/>";
    }
    /* the Sure, token */
    if (i >= 1) {
      var tu = i === 1 ? e(t / 0.7) : 1, tx = lerp(W + 40, cx0 + 12 + (cw - 24) * lw[nl - 1] + 10, tu), ty = cy + 38 + (nl - 1) * 16;
      if (tx + 52 > cx0 + cw - 8) { tx = cx0 + 12; ty += 20; }
      s += "<rect class='token' x='" + f(tx) + "' y='" + f(ty - 11) + "' width='52' height='22' rx='11'/>" + txt(tx + 26, ty + 4.5, "token-tx", "middle", "Sure,");
      if (i === 1 && t > 0.75) s += txt(cx0 + 12, cy + chh - 12, "tx-m", "start", "the compliance token, appended");
    }
    /* the surprise meter */
    if (i >= 2) {
      var mu = i === 2 ? e(t / 0.8) : 1, my = cy + chh + 22, mw = cw, mh = 14;
      s += txt(cx0, my - 8, "tx-2", "start", "surprise at “Sure,” (the loss)");
      s += "<rect class='meter' x='" + cx0 + "' y='" + f(my) + "' width='" + f(mw) + "' height='" + mh + "' rx='7'/>";
      s += "<rect class='" + (k.loss > 0.5 ? "meter-fill" : "meter-low") + "' x='" + cx0 + "' y='" + f(my) + "' width='" + f(mw * k.loss * mu) + "' height='" + mh + "' rx='7'/>";
      s += txt(cx0 + mw, my + mh + 16, "tx-b", "end", k.loss > 0.5 ? "high: it resists agreeing" : "low: agreeing is easy");
    }
    s += "</g>";
    /* ---- the model, as a stack of layers, until the plane takes over ---- */
    var mOp = i < 3 ? 1 : i === 3 ? 1 - e((t - 0.3) / 0.25) : 0;
    if (mOp > 0.01) {
      var NL = 6, sx = px0 + (px1 - px0) * 0.5, sw = Math.min(170, (px1 - px0) * 0.7), sh = narrow ? 15 : 20, sg = narrow ? 6 : 8, sy0 = py0 + 36, hot = [2, 4];
      s += "<g opacity='" + f(mOp) + "'>" + txt(sx, py0 + 14, "tx-2", "middle", "the safety-trained model");
      for (var L = 0; L < NL; L++) {
        var yy = sy0 + L * (sh + sg), isHot = hot.indexOf(L) >= 0 && i === 3 && t > 0.06 + (NL - 1 - L) * 0.04;
        s += "<rect class='" + (isHot ? "layer-hot" : "layer") + "' x='" + f(sx - sw / 2) + "' y='" + f(yy) + "' width='" + f(sw) + "' height='" + sh + "' rx='5'/>";
        if (i === 3 && isHot) s += txt(sx + sw / 2 + 8, yy + 14, "tx-acc", "start", "safety-critical");
      }
      s += txt(sx, sy0 + NL * (sh + sg) + 6, "tx-m", "middle", i < 3 ? "it reads the text and the “Sure,”" : "backward pass: output to input");
      if (i === 3 && t < 0.3) { var pu = e(t / 0.28), qy = lerp(sy0 + (NL - 1) * (sh + sg) + sh / 2, sy0 + sh / 2, pu); s += "<circle class='pulse' cx='" + f(sx - sw / 2 - 10) + "' cy='" + f(qy) + "' r='6'/>"; }
      s += "</g>";
    }
    /* ---- the plane ---- */
    var pOp = i < 3 ? 0 : i === 3 ? e((t - 0.38) / 0.25) : 1;
    if (pOp > 0.01) {
      s += "<g opacity='" + f(pOp) + "'>";
      s += "<line class='axisline' x1='" + f(px0) + "' x2='" + f(px1) + "' y1='" + f(oy) + "' y2='" + f(oy) + "'/><line class='axisline' x1='" + f(ox) + "' x2='" + f(ox) + "' y1='" + f(py0) + "' y2='" + f(py1) + "'/>";
      s += txt(px0, py0 + 4, "tx-m", "start", narrow ? "safety-critical parameters (a sketch)" : "safety-critical parameters (a sketch of a huge space)");
      var endAt = function (ang, len) { var r = ang * Math.PI / 180; return [ox + len * Math.cos(r), oy - len * Math.sin(r)]; };
      /* faint arrows of known-harmful prompts, then the reference */
      if (i >= 4) {
        var fOp = i === 4 ? 1 : i === 5 ? 0.6 : 0.35;
        G1FAINT.forEach(function (a, j) {
          var v = i === 4 ? e((t - j * 0.1) / 0.3) : 1; if (v <= 0) return;
          var pe = endAt(a, R * 0.78 * v);
          s += "<g opacity='" + f(fOp) + "'>" + arrow(ox, oy, pe[0], pe[1], "arr-faint", "head-faint", false) + "</g>";
        });
        var rv = i === 4 ? e((t - 0.45) / 0.4) : 1;
        if (rv > 0) {
          var re = endAt(G1REF, R * 0.92 * rv);
          s += arrow(ox, oy, re[0], re[1], "arr-crit", "head-crit", true);
          if (rv > 0.6) s += txt(Math.min(re[0] + 4, px1), re[1] + 18, "tx-crit halo", "end", "unsafe reference");
        }
        if (i === 4 && t > 0.3 && t < 0.95) s += txt(ox + 8, py0 + 24, "tx-m halo", "start", "dashed: gradients of known-harmful prompts");
      }
      /* the input's gradient */
      if (i >= 3) {
        var gv = i === 3 ? e((t - 0.55) / 0.42) : 1, ang = i === 6 ? lerp(k.ang, k.dang, e((t - 0.35) / 0.5)) : k.ang;
        var ge = endAt(ang, R * 0.9 * gv);
        if (i === 6) { var g0 = endAt(k.ang, R * 0.9); s += arrow(ox, oy, g0[0], g0[1], "arr-ghost", "head-faint", false); }
        s += arrow(ox, oy, ge[0], ge[1], "arr-acc", "head-acc", true);
        if (gv > 0.7) { var right = ang < 90 && ge[0] < W - 80; s += txt(ge[0] + (right ? 6 : -6), ge[1] - 8, "tx-acc halo", right ? "start" : "end", i === 6 ? "this window" : "this input"); }
        if (i === 3 && t > 0.9) s += txt(narrow ? px0 : ox + 6, oy + 18, "tx-m halo", "start", "the direction that would make “Sure,” likely");
      }
      /* the angle and the score */
      if (i >= 5) {
        var ang2 = i === 6 ? lerp(k.ang, k.dang, e((t - 0.35) / 0.5)) : k.ang, a0 = Math.min(G1REF, ang2), a1 = Math.max(G1REF, ang2);
        var sw = i === 5 ? e(t / 0.6) : 1, aEnd = a0 + (a1 - a0) * sw, ra = 46, p0 = endAt(a0, ra), p1 = endAt(aEnd, ra);
        s += "<path class='arc' d='M" + f(p0[0]) + "," + f(p0[1]) + " A" + ra + "," + ra + " 0 0,0 " + f(p1[0]) + "," + f(p1[1]) + "'/>";
        var score = i === 5 ? k.cos * e((t - 0.3) / 0.6) : lerp(k.cos, k.dcos, e((t - 0.35) / 0.5));
        var mid = endAt((a0 + aEnd) / 2, ra + 22);
        s += txt(clamp(mid[0], px0 + 40, px1 - 40), mid[1] + 5, "tx-b halo", "middle", "cos = " + score.toFixed(2));
        var flagged = score >= 0.5, label = flagged ? "score " + score.toFixed(2) + ": flagged unsafe" : "score " + score.toFixed(2) + ": passes", pw = label.length * 7.4 + 22, px = narrow ? W - 8 : px1 - 2, py = narrow ? H - 12 : py0 + 36;
        if (i === 5 ? t > 0.85 : true) {
          s += "<rect class='" + (flagged ? "pill-crit" : "pill-ok") + "' x='" + f(px - pw) + "' y='" + f(py - 16) + "' width='" + f(pw) + "' height='22' rx='11'/>" +
            txt(px - pw / 2, py, "token-tx", "middle", label);
        }
      }
      s += "</g>";
    }
    s += "</svg>";
    box.innerHTML = s;
  }

  /* =====================================================================
     Figure 2: the Context Window Scanner
     ===================================================================== */
  var G2 = [
    { t: "A conversation, not a prompt",
      h: "A multi-turn attack spreads its intent over several user turns, so that no single turn looks unsafe on its own. Here only turn 5 carries an unsafe cue (the red mark); the other turns are ordinary.", ms: 2600 },
    { t: "The detector sees only the user's turns",
      h: "GradSafe is prompt-only: it runs before each reply, so the assistant's answers are never part of what it scores. Drop them and keep the user turns.", ms: 2200 },
    { t: "Slide a window and score each one",
      h: "The Context Window Scanner scores the last W user turns at each point in the conversation. With W = 1 each turn is scored alone, and the window ending at turn 5 isolates the unsafe cue.", ms: 3600 },
    { t: "The conversation score is the maximum",
      h: "One high-scoring window is enough to flag the whole conversation, like a logical OR over the windows. That is the score the paper evaluates.", ms: 2200 },
    { t: "A bigger window dilutes the cue",
      h: "With W = 3 the window that contains turn 5 also contains two ordinary turns, and their gradients pull the average away from the unsafe reference. Scoring the whole history at once dilutes it further.", ms: 3600 },
    { t: "What the paper measured",
      h: "On 537 human-written multi-turn jailbreaks against 2,000 real WildChat conversations, ROC-AUC falls as the window grows, from 0.81 at one turn to 0.74 for the full history. Shorter windows win.", ms: 3000 }
  ];
  var CUE = [0.05, 0.08, 0.06, 0.10, 0.42, 0.07], NT = CUE.length;
  var AUC = [[1, 0.8101], [2, 0.7873], [3, 0.7614], [4, 0.7569], [5, 0.7503], [7, 0.7362], [NT, 0.7376]];   /* Table 3; the last entry is accumulated */
  function winScore(end, Wn) { var st = Math.max(0, end - Wn + 1), sum = 0; for (var j = st; j <= end; j++) sum += CUE[j]; return sum / (end - st + 1); }
  function g2Render(i, t) {
    var box = $("#g2Chart"); if (!box) return;
    var W = box.clientWidth || 600, H = W < 520 ? 330 : 340, s = svgOpen(W, H, "Step " + (i + 1) + ": " + G2[i].t);
    var narrow = W < 520;
    if (i === 5) { s += g2Auc(W, H, t); s += "</svg>"; box.innerHTML = s; return; }
    var ml = 16, mr = 12, gap = narrow ? 6 : 10, cwid = (W - ml - mr - gap * (NT - 1)) / NT, uh = 46, ah = 30, uyMid = H * 0.36, uyTop = 30;
    var uy = i <= 1 ? uyMid : i === 2 ? lerp(uyMid, uyTop, e(t / 0.3)) : uyTop, ay = uy + uh + 8;
    var aOp = i === 0 ? 1 : i === 1 ? 1 - e(t / 0.6) : 0;
    /* window size for the scene */
    var Wn = 1, winEnd = NT - 1, wu = 1;
    if (i === 2) { wu = clamp((t - 0.25) / 0.7, 0, 1); winEnd = Math.min(NT - 1, Math.floor(wu * NT)); }
    if (i === 4) { Wn = t < 0.5 ? lerp(1, 3, e(t / 0.45)) : lerp(3, NT, e((t - 0.55) / 0.45)); }
    var Wi = Math.round(Wn);
    /* chat bubbles */
    for (var j = 0; j < NT; j++) {
      var x = ml + j * (cwid + gap), vis = i === 0 ? e((t - j * 0.12) / 0.3) : 1; if (vis <= 0) continue;
      s += "<g opacity='" + f(vis) + "'>";
      s += "<rect class='bubble' x='" + f(x) + "' y='" + uy + "' width='" + f(cwid) + "' height='" + uh + "' rx='9'/>";
      s += txt(x + 8, uy + 16, "tx-m", "start", "turn " + (j + 1));
      s += "<line class='tline' x1='" + f(x + 8) + "' x2='" + f(x + cwid - 8) + "' y1='" + (uy + 28) + "' y2='" + (uy + 28) + "'/><line class='tline' x1='" + f(x + 8) + "' x2='" + f(x + cwid * 0.6) + "' y1='" + (uy + 38) + "' y2='" + (uy + 38) + "'/>";
      /* unsafe cue mark */
      s += "<rect class='cue-bg' x='" + f(x + cwid - 26) + "' y='" + (uy + 6) + "' width='18' height='6' rx='3'/><rect class='cue' x='" + f(x + cwid - 26) + "' y='" + (uy + 6) + "' width='" + f(18 * CUE[j] / 0.42) + "' height='6' rx='3'/>";
      if (aOp > 0.01) s += "<g opacity='" + f(aOp) + "'><rect class='bubble-a' x='" + f(x + 6) + "' y='" + ay + "' width='" + f(cwid - 6) + "' height='" + ah + "' rx='9'/>" + txt(x + 14, ay + 19, "tx-m", "start", "reply") + "</g>";
      s += "</g>";
    }
    if (i === 0 && t > 0.8) s += txt(W - mr, ay + ah + 22, "tx-m", "end", narrow ? "red mark: unsafe cue (only turn 5 has one)" : "red mark: how much unsafe cue the turn carries (only turn 5 has one)");
    if (i === 0) s += txt(ml, uy - 12, "tx-2", "start", narrow ? "six user turns and the replies between them" : "six user turns, with the assistant's replies between them");
    if (i === 1 && t > 0.5) s += txt(ml, ay + 20, "tx-2", "start", "assistant replies dropped: the detector is prompt-only");
    /* window box */
    var by0 = ay + (i >= 2 ? 16 : ah + 14), bh = H - by0 - 28, bx0 = ml, bar = cwid;
    if (i >= 2) {
      var endIdx = i === 2 ? winEnd : i === 3 ? 4 : NT - 1, stIdx = Math.max(0, endIdx - Wn + 1);
      var wx0 = ml + stIdx * (cwid + gap) - 4, wx1 = ml + endIdx * (cwid + gap) + cwid + 4;
      s += "<rect class='win' x='" + f(wx0) + "' y='" + (uy - 5) + "' width='" + f(wx1 - wx0) + "' height='" + (uh + 10) + "' rx='11'/>";
      s += txt(W - mr, uy - 12, "tx-acc halo", "end", i === 4 && Wi >= NT ? "window: all turns (accumulated)" : "window: the last " + Wi + " turn" + (Wi > 1 ? "s" : "") + " (W = " + Wi + ")");
    }
    /* score bars under the turns */
    if (i >= 2) {
      var base = by0 + bh, sc = bh / 0.5;
      s += "<line class='axisline' x1='" + ml + "' x2='" + (W - mr) + "' y1='" + f(base) + "' y2='" + f(base) + "'/>";
      s += txt(ml, by0 - 2, "tx-2", "start", "score of the window ending at each turn");
      var mx = 0, mxj = 0;
      for (var q = 0; q < NT; q++) {
        var sv = winScore(q, Wn), show = i === 2 ? (wu <= 0 ? 0 : q < winEnd ? 1 : q === winEnd ? e((wu * NT - q) / 1) : 0) : 1;
        if (show <= 0) continue;
        var hgt = sv * sc * show, x2 = ml + q * (cwid + gap);
        if (sv * show > mx) { mx = sv * show; mxj = q; }
        s += "<rect class='" + (i === 3 && q === 4 ? "bar-max" : "bar") + "' x='" + f(x2 + bar * 0.2) + "' y='" + f(base - hgt) + "' width='" + f(bar * 0.6) + "' height='" + f(hgt) + "' rx='3'/>";
        if (show > 0.9) s += txt(x2 + bar / 2, base - hgt - 5, "tx-m halo", "middle", (sv).toFixed(2));
      }
      if (i >= 3) {
        var lv = i === 3 ? e(t / 0.6) : 1, ly = base - mx * sc;
        s += "<g opacity='" + f(lv) + "'><line class='maxline' x1='" + ml + "' x2='" + (W - mr) + "' y1='" + f(ly) + "' y2='" + f(ly) + "'/>" + txt(ml, ly - 7, "tx-crit halo", "start", "conversation score = max = " + mx.toFixed(2)) + "</g>";
      }
    }
    s += "</svg>";
    box.innerHTML = s;
  }
  function g2Auc(W, H, t) {
    var ml = 54, mr = 16, mt = 34, mb = 44, x0 = ml, x1 = W - mr, y0 = mt, y1 = H - mb, s = "";
    var xs = AUC.map(function (a, j) { return x0 + (x1 - x0) * (j + 0.5) / AUC.length; });
    var ymin = 0.70, ymax = 0.83, Y = function (v) { return y1 - (v - ymin) / (ymax - ymin) * (y1 - y0); };
    [0.70, 0.74, 0.78, 0.82].forEach(function (v) { s += "<line class='gridline' x1='" + x0 + "' x2='" + x1 + "' y1='" + f(Y(v)) + "' y2='" + f(Y(v)) + "'/>" + txt(x0 - 8, Y(v) + 4, "tx-m", "end", v.toFixed(2)); });
    s += txt(x0, y0 - 14, "tx-2", "start", "ROC-AUC on the real benchmark (MHJ attacks vs WildChat benign), by window size");
    var n = Math.floor(e(t / 0.9) * AUC.length + 0.001), d = "";
    AUC.forEach(function (a, j) { if (j < n) d += (j ? " L" : "M") + f(xs[j]) + "," + f(Y(a[1])); });
    if (n >= 2) s += "<path class='auc-line' d='" + d + "'/>";
    AUC.forEach(function (a, j) {
      s += txt(xs[j], y1 + 18, "tx-m", "middle", j === AUC.length - 1 ? "all turns" : "W = " + a[0]);
      if (j < n) { s += "<circle class='auc-dot" + (j === 0 ? " auc-best" : "") + "' cx='" + f(xs[j]) + "' cy='" + f(Y(a[1])) + "' r='5'/>" + txt(xs[j], Y(a[1]) - 11, "tx-b halo", "middle", a[1].toFixed(3)); }
    });
    if (t > 0.92) s += txt(x1, y1 + 36, "tx-m", "end", "Table 3 of the paper. Llama-3.1-8B-Instruct, 537 MHJ vs 2,000 WildChat conversations.");
    return s;
  }

  /* ---- wire up ---- */
  function init() {
    var segEl = $("#g1Kind");
    if (segEl) seg(segEl, [["harm", "harmful request"], ["safe", "harmless request"]], g1kind, function (v) { g1kind = v; if (p1) p1.redraw(); });
    var p1 = makePlayer("g1", "#figGrad", G1, g1Render, 5);
    var p2 = makePlayer("g2", "#figCWS", G2, g2Render, 4);
    window.__g1 = p1 && p1.frame; window.__g2 = p2 && p2.frame;
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
