---
layout: post
title: "Does the Unsafe Gradient Survive a Conversation?"
date: 2026-10-12
summary: "Our paper on gradient-based jailbreak detection in multi-turn dialogue was accepted at CCS-LAMPS 2026. On synthetic benign data the detector looks nearly solved (ROC-AUC 0.98); on real WildChat conversations it drops to 0.76, and a threshold tuned on synthetic data flags more than 90% of benign conversations."
---
<div class="tldr" markdown="1">
<span class="tldr-label">TL;DR</span>

Our paper on gradient-based jailbreak detection in multi-turn dialogue was accepted at [CCS-LAMPS 2026](https://lamps2026-ccs.github.io/home/) and is on [arXiv](https://arxiv.org/abs/2609.36849). When evaluated against synthetic benign conversations, the detector achieves an ROC-AUC of 0.98 against human-authored multi-turn jailbreaks. When evaluated on WildChat benign conversations, ROC-AUC decreases to 0.76, and a threshold calibrated on synthetic data incorrectly classifies more than 90% of benign conversations as unsafe.
</div>

## Why

Safety-aligned language models are commonly deployed as multi-turn assistants, allowing adversaries to distribute unsafe intent across several user turns rather than expressing it in a single prompt. Existing gradient-based jailbreak detectors, such as GradSafe, were developed for single-prompt inputs. They detect unsafe prompts by measuring the alignment between an input-induced gradient and a fixed unsafe reference direction; however, their effectiveness in multi-turn dialogue remains unclear. This gap motivates a central question: when malicious intent is distributed across a dialogue, does the internal unsafe gradient signature remain detectable, weaken, or disappear?

<div class="gsw" id="gsw">
<style>
.gsw{border:1px solid #d8d8d8;border-radius:6px;padding:14px 16px 10px;margin:1.2em 0;font-size:0.92em;line-height:1.45}
.gsw-title{font-weight:600;margin:0 0 6px}
.gsw-ctl{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:6px 0 10px}
.gsw-ctl button{font:inherit;padding:3px 10px;border:1px solid #888;background:#fff;border-radius:4px;cursor:pointer}
.gsw-ctl button[aria-pressed=true]{background:#1f5fbf;border-color:#1f5fbf;color:#fff}
.gsw-ctl .gsw-sep{color:#999}
.gsw svg{width:100%;height:auto;display:block}
.gsw-cap{margin:8px 0 0;min-height:3.2em}
.gsw-note{color:#555;font-size:0.88em;margin:6px 0 0}
</style>
<p class="gsw-title">What a gradient-based detector reads: the model's surprise at saying "Sure"</p>
<div class="gsw-ctl">
  <button type="button" id="gsw-prev">Back</button>
  <button type="button" id="gsw-next">Next</button>
  <button type="button" id="gsw-play">Play</button>
  <span class="gsw-sep">|</span>
  <span>Input:</span>
  <button type="button" data-kind="unsafe" aria-pressed="true">harmful request</button>
  <button type="button" data-kind="benign" aria-pressed="false">benign request</button>
</div>
<svg id="gsw-svg" viewBox="0 0 640 300" role="img" aria-label="Five-step sketch of GradSafe scoring: input plus Sure, loss, gradient arrow, reference arrow, cosine score"></svg>
<p class="gsw-cap" id="gsw-cap"></p>
<p class="gsw-note">A sketch. The gradient lives in the space of the model's safety-critical parameters, drawn here as a plane; the arrows, angles and scores are illustrative. The scoring rule is the paper's Eq. 1: the cosine between the input's gradient and a fixed unsafe reference direction.</p>
</div>
<script>
(function(){
  var root=document.getElementById('gsw'); if(!root) return;
  var svg=document.getElementById('gsw-svg'), cap=document.getElementById('gsw-cap');
  var NS='http://www.w3.org/2000/svg';
  var kind='unsafe', step=0, timer=null, N=6;
  var K={unsafe:{label:'harmful request (not shown)',loss:0.85,ang:58,cos:'0.83',diluted:95,dcos:'0.32'},
         benign:{label:'benign request',loss:0.15,ang:112,cos:'0.14',diluted:118,dcos:'0.09'}};
  var REF=28;                                                  // angle of the unsafe reference direction
  var caps=[
    'Step 1. GradSafe takes the user text and appends the compliance token "Sure,". It never generates an answer; it asks a different question: how far is this model from agreeing?',
    'Step 2. The loss measures the model\'s surprise at "Sure,". A safety-trained model is not surprised to agree to a benign request, and very surprised to agree to a harmful one.',
    'Step 3. One backward pass turns that surprise into a gradient: the direction the safety-critical parameters would have to move to make "Sure," likely. This arrow is what the detector reads.',
    'Step 4. Harmful requests push the same parameters the same way, so their arrows line up. Their average over a few known-unsafe prompts is stored once as the unsafe reference direction.',
    'Step 5. The score is the cosine of the angle between the input\'s arrow and the reference. Close to the reference means unsafe; far from it means benign. Switch the input above to compare.',
    'Step 6. In a conversation, the window text is what gets paired with "Sure,". Benign turns inside the window add their own pull, so the arrow of a window that contains a harmful turn drifts away from the reference and the score drops. That is the dilution the paper measures.'
  ];
  function el(tag,attrs,text){ var e=document.createElementNS(NS,tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(text!=null) e.textContent=text; return e; }
  function arrow(x0,y0,ang,len,color,width,label,dash){
    var r=ang*Math.PI/180, x1=x0+len*Math.cos(r), y1=y0-len*Math.sin(r);
    var a={x1:x0,y1:y0,x2:x1,y2:y1,stroke:color,'stroke-width':width}; if(dash) a['stroke-dasharray']=dash;
    svg.appendChild(el('line',a));
    var h=9, r2=r+Math.PI;
    svg.appendChild(el('polygon',{points:[x1,y1, x1+h*Math.cos(r2-0.45),y1-h*Math.sin(r2-0.45), x1+h*Math.cos(r2+0.45),y1-h*Math.sin(r2+0.45)].join(' '),fill:color}));
    if(label) svg.appendChild(el('text',{x:x1+10*Math.cos(r),y:y1-10*Math.sin(r)+4,'font-size':'13',fill:color},label));
  }
  function draw(){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    var k=K[kind];
    // left panel: the input card
    svg.appendChild(el('rect',{x:20,y:30,width:250,height:110,rx:8,fill:'#f4f6fa',stroke:'#c9d0dc'}));
    svg.appendChild(el('text',{x:34,y:56,'font-size':'13',fill:'#333'},'user text: '+k.label));
    if(step>=0){
      svg.appendChild(el('rect',{x:34,y:72,width:70,height:26,rx:5,fill:step===0?'#1f5fbf':'#dfe7f5'}));
      svg.appendChild(el('text',{x:69,y:90,'text-anchor':'middle','font-size':'14',fill:step===0?'#fff':'#1f5fbf'},'Sure,'));
      svg.appendChild(el('text',{x:112,y:90,'font-size':'12',fill:'#555'},'appended compliance token'));
    }
    if(step>=1){
      svg.appendChild(el('text',{x:34,y:124,'font-size':'13',fill:'#333'},'surprise at "Sure," (loss)'));
      svg.appendChild(el('rect',{x:195,y:112,width:60,height:14,fill:'#e6e6e6'}));
      svg.appendChild(el('rect',{x:195,y:112,width:60*k.loss,height:14,fill:step===1?'#c0392b':'#e59a94'}));
    }
    // right panel: the parameter plane
    var ox=430, oy=215;
    svg.appendChild(el('text',{x:300,y:52,'font-size':'13',fill:'#555'},'safety-critical parameters (sketch)'));
    svg.appendChild(el('line',{x1:300,y1:oy,x2:620,y2:oy,stroke:'#ccc'})); svg.appendChild(el('line',{x1:ox,y1:60,x2:ox,y2:260,stroke:'#ccc'}));
    if(step>=3){
      arrow(ox,oy,REF,150,'#c0392b',2.5,'unsafe reference',null);
      if(step===3){ arrow(ox,oy,REF+9,120,'#e59a94',1.5,null,'4 3'); arrow(ox,oy,REF-8,130,'#e59a94',1.5,null,'4 3'); arrow(ox,oy,REF+3,110,'#e59a94',1.5,null,'4 3');
        svg.appendChild(el('text',{x:ox+8,y:oy+22,'font-size':'12',fill:'#c0392b'},'dashed: gradients of known-unsafe prompts')); }
    }
    if(step>=2){
      var ang=step===5?k.diluted:k.ang;
      arrow(ox,oy,ang,150,'#1f5fbf',2.5,step===5?'this window':'this input',null);
      if(step===5) arrow(ox,oy,k.ang,150,'#9fb8e0',1.5,null,'4 3');
    }
    if(step>=4){
      var a0=Math.min(REF, step===5?k.diluted:k.ang), a1=Math.max(REF, step===5?k.diluted:k.ang), r0=a0*Math.PI/180, r1=a1*Math.PI/180, R=48;
      svg.appendChild(el('path',{d:'M'+(ox+R*Math.cos(r0))+','+(oy-R*Math.sin(r0))+' A'+R+','+R+' 0 0,0 '+(ox+R*Math.cos(r1))+','+(oy-R*Math.sin(r1)),fill:'none',stroke:'#333','stroke-width':'1.5'}));
      var mid=(a0+a1)/2*Math.PI/180;
      svg.appendChild(el('text',{x:ox+64*Math.cos(mid),y:oy-64*Math.sin(mid)+5,'font-size':'15','font-weight':'600',fill:'#333'},'score = cos = '+(step===5?k.dcos:k.cos)));
    }
    if(step===5){
      svg.appendChild(el('rect',{x:20,y:160,width:250,height:100,rx:8,fill:'#f4f6fa',stroke:'#c9d0dc'}));
      svg.appendChild(el('text',{x:34,y:184,'font-size':'13',fill:'#333'},'window = benign turn + benign turn'));
      svg.appendChild(el('text',{x:34,y:204,'font-size':'13',fill:'#333'},'         + '+(kind==='unsafe'?'harmful turn':'benign turn')+' + "Sure,"'));
      svg.appendChild(el('text',{x:34,y:236,'font-size':'12',fill:'#555'},'light arrow: the turn alone. dark: the whole window.'));
    }
    svg.appendChild(el('text',{x:20,y:288,'font-size':'12',fill:'#777'},'step '+(step+1)+' of '+N));
    cap.textContent=caps[step];
  }
  function go(s){ step=(s+N)%N; draw(); }
  function stopPlay(){ if(timer){ clearInterval(timer); timer=null; document.getElementById('gsw-play').textContent='Play'; } }
  root.addEventListener('click',function(ev){
    var b=ev.target.closest('button'); if(!b) return;
    if(b.id==='gsw-prev'){ stopPlay(); go(step-1); }
    else if(b.id==='gsw-next'){ stopPlay(); go(step+1); }
    else if(b.id==='gsw-play'){ if(timer){ stopPlay(); } else { go(0); timer=setInterval(function(){ if(step===N-1){ stopPlay(); } else go(step+1); },2600); b.textContent='Pause'; } }
    else if(b.hasAttribute('data-kind')){ kind=b.getAttribute('data-kind'); var bs=root.querySelectorAll('button[data-kind]'); for(var i=0;i<bs.length;i++) bs[i].setAttribute('aria-pressed',String(bs[i]===b)); draw(); }
  });
  go(4);
})();
</script>

## What we did

We extend GradSafe with a Context Window Scanner that applies the detector to fixed-size windows of user turns and uses the maximum window score as the conversation-level score. We evaluate different window sizes, attack families, benign conversation distributions, and target models, on 537 human-authored multi-turn jailbreak (MHJ) conversations and 2,000 WildChat benign conversations sampled to match the MHJ turn-length distribution.

<div class="cws" id="cws">
<style>
.cws{border:1px solid #d8d8d8;border-radius:6px;padding:14px 16px 10px;margin:1.2em 0;font-size:0.92em;line-height:1.45}
.cws-title{font-weight:600;margin:0 0 6px}
.cws-ctl{display:flex;flex-wrap:wrap;gap:8px 18px;align-items:center;margin:6px 0 10px}
.cws-ctl button{font:inherit;padding:3px 10px;border:1px solid #888;background:#fff;border-radius:4px;cursor:pointer}
.cws-ctl button[aria-pressed=true]{background:#1f5fbf;border-color:#1f5fbf;color:#fff}
.cws svg{width:100%;height:auto;display:block}
.cws-read{margin:8px 0 0}
.cws-note{color:#555;font-size:0.88em;margin:6px 0 0}
</style>
<p class="cws-title">How the Context Window Scanner scores a conversation</p>
<div class="cws-ctl">
  <span>Window size:</span>
  <button type="button" data-w="1" aria-pressed="true">W=1</button>
  <button type="button" data-w="2" aria-pressed="false">W=2</button>
  <button type="button" data-w="3" aria-pressed="false">W=3</button>
  <button type="button" data-w="7" aria-pressed="false">Accumulated</button>
  <button type="button" id="cws-play">Play</button>
</div>
<svg id="cws-svg" viewBox="0 0 640 275" role="img" aria-label="Six user turns scored with a sliding window; the conversation score is the maximum window score"></svg>
<p class="cws-read" id="cws-read"></p>
<p class="cws-note">The six turns and their scores are illustrative. The ROC-AUC shown for each window size is the paper's measured value on MHJ attacks versus WildChat benign conversations (Table 3).</p>
</div>
<script>
(function(){
  var root=document.getElementById('cws'); if(!root) return;
  var svg=document.getElementById('cws-svg'), read=document.getElementById('cws-read');
  var NS='http://www.w3.org/2000/svg';
  // illustrative per-turn unsafe cue: only turn 5 carries a strong cue, the rest are benign context
  var cue=[0.05,0.08,0.06,0.10,0.42,0.07];
  var labels=['turn 1','turn 2','turn 3','turn 4','turn 5','turn 6'];
  var auc={1:0.810,2:0.787,3:0.761,7:0.738};          // Table 3 of the paper
  var W=1, t=0, timer=null;
  var n=cue.length, x0=24, bw=88, gap=14, top=40, barH=120, base=top+barH;
  function windowScore(end){ var s=Math.max(0,end-W+1), sum=0; for(var i=s;i<=end;i++) sum+=cue[i]; return sum/(end-s+1); } // mean over the window: benign turns dilute the cue
  function el(tag,attrs,text){ var e=document.createElementNS(NS,tag); for(var k in attrs) e.setAttribute(k,attrs[k]); if(text!=null) e.textContent=text; return e; }
  function draw(){
    while(svg.firstChild) svg.removeChild(svg.firstChild);
    var scores=[]; for(var e=0;e<n;e++) scores.push(windowScore(e));
    var best=0; for(var e=0;e<n;e++) if(scores[e]>scores[best]) best=e;
    // bars: per-turn cue (gray) and the current window's score (blue) at its end turn
    for(var i=0;i<n;i++){
      var x=x0+i*(bw+gap);
      svg.appendChild(el('rect',{x:x,y:base-cue[i]*barH*2,width:bw,height:cue[i]*barH*2,fill:'#cfd8e3'}));
      svg.appendChild(el('text',{x:x+bw/2,y:base+18,'text-anchor':'middle','font-size':'14',fill:'#333'},labels[i]));
    }
    // the window at step t
    var s=Math.max(0,t-W+1), wx=x0+s*(bw+gap)-5, ww=(t-s+1)*(bw+gap)-gap+10;
    svg.appendChild(el('rect',{x:wx,y:top-4,width:ww,height:barH+8,fill:'none',stroke:'#1f5fbf','stroke-width':'2',rx:'4'}));
    svg.appendChild(el('text',{x:x0,y:base+40,'font-size':'14',fill:'#1f5fbf'},'Blue box: the window ending at '+labels[t]+' ('+(t-s+1)+' turn'+(t-s?'s':'')+'). Blue dots: the score of each window.'));
    // window scores so far, as blue dots at the end turn of each window
    for(var e=0;e<=t;e++){
      var cx=x0+e*(bw+gap)+bw/2, cy=base-scores[e]*barH*2;
      svg.appendChild(el('circle',{cx:cx,cy:cy,r:5,fill:'#1f5fbf'}));
      svg.appendChild(el('text',{x:cx,y:cy-9,'text-anchor':'middle','font-size':'13',fill:'#1f5fbf'},scores[e].toFixed(2)));
    }
    // max-pooled conversation score
    var mx=0; for(var e=0;e<=t;e++) if(scores[e]>mx) mx=scores[e];
    var my=base-mx*barH*2;
    svg.appendChild(el('line',{x1:x0-8,y1:my,x2:x0+n*(bw+gap)-gap+8,y2:my,stroke:'#c0392b','stroke-width':'1.5','stroke-dasharray':'5 4'}));
    svg.appendChild(el('text',{x:x0,y:top-18,'font-size':'14',fill:'#c0392b'},'Red line: conversation score = max over windows = '+mx.toFixed(2)));
    svg.appendChild(el('text',{x:x0,y:base+60,'font-size':'14',fill:'#555'},'Gray bars: unsafe cue carried by each user turn (illustrative; only turn 5 carries one).'));
    read.textContent='With W='+(W===7?'all turns (accumulated)':W)+', the window that contains turn 5 scores '+scores[4].toFixed(2)+(W>1?' because the benign turns around it dilute the cue':' because the turn is scored on its own')+'. On the real benchmark this setting reaches ROC-AUC '+auc[W].toFixed(3)+'.';
  }
  function setW(w){ W=w; t=0; var bs=root.querySelectorAll('button[data-w]'); for(var i=0;i<bs.length;i++) bs[i].setAttribute('aria-pressed', String(+bs[i].getAttribute('data-w')===w)); draw(); }
  function step(){ t=(t+1)%n; draw(); if(t===n-1){ clearInterval(timer); timer=null; document.getElementById('cws-play').textContent='Play'; } }
  root.addEventListener('click',function(ev){
    var b=ev.target.closest('button'); if(!b) return;
    if(b.id==='cws-play'){ if(timer){ clearInterval(timer); timer=null; b.textContent='Play'; } else { t=-1; step(); timer=setInterval(step,700); b.textContent='Pause'; } return; }
    if(b.hasAttribute('data-w')){ if(timer){ clearInterval(timer); timer=null; document.getElementById('cws-play').textContent='Play'; } setW(+b.getAttribute('data-w')); }
  });
  t=n-1; draw();
})();
</script>

## What we found

![ROC curves for key methods on the real WildChat benchmark](/assets/images/gradsafe_roc.png)

*   The results show a substantial difference between synthetic and realistic benign settings. When evaluated against synthetic benign conversations, the detector achieves an ROC-AUC of 0.98 against human-authored multi-turn jailbreaks. When evaluated on WildChat benign conversations, ROC-AUC decreases to 0.76, and a threshold calibrated on synthetic data incorrectly classifies more than 90% of benign conversations as unsafe.
*   Under realistic benign distributions, single-turn windows provide the highest separability, whereas longer windows and accumulated conversation contexts reduce performance. A long conversation does not call for scoring its whole history; if anything, the extra length only creates more room for dilution.
*   The detector is also sensitive to the attack-generation method and target model: successful Crescendo-generated attacks receive scores comparable to or lower than benign conversations, and evaluation on Qwen2.5-7B-Instruct yields near-random separability with a different optimal window size.

## What it means

These findings show that gradient-based signals can support multi-turn jailbreak detection, but reliable deployment requires calibration on realistic benign conversations, short-window scoring, length-aware thresholds, and evaluation across attack types and model architectures.

## Paper

Omar Sheta, Rinku Deuja, Hadi Masoudi, and Minghong Fang. *Does the Unsafe Gradient Survive a Conversation? On the Fragility of Gradient-Based Jailbreak Detection in Multi-Turn Dialogue.* LAMPS '26, the 3rd ACM Workshop on Large AI Systems and Models with Privacy and Security Analysis, co-located with ACM CCS 2026. [arXiv:2609.36849](https://arxiv.org/abs/2609.36849). I will present it remotely at the workshop on November 15.
