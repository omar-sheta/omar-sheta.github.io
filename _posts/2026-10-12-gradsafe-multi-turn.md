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

<figure style="margin:1.6em 0">
  <video controls muted playsinline preload="metadata" poster="/assets/images/gradsafe-gradient-poster.png" aria-label="Animation: what a gradient-based detector reads" style="width:100%;height:auto;border-radius:12px;display:block;background:#0f1117">
    <source src="/assets/video/gradsafe-gradient.mp4" type="video/mp4">
  </video>
  <figcaption style="font-size:.85em;color:#666;margin-top:.5em">What a gradient-based detector reads, in seven steps (1.5 minutes, no sound). A sketch: the plane, the arrows, the angles and the scores are illustrative. The scoring rule is Eq. 1 of the paper, the cosine between the input's gradient and a fixed unsafe reference direction.</figcaption>
</figure>


## What we did

We extend GradSafe with a Context Window Scanner that applies the detector to fixed-size windows of user turns and uses the maximum window score as the conversation-level score. We evaluate different window sizes, attack families, benign conversation distributions, and target models, on 537 human-authored multi-turn jailbreak (MHJ) conversations and 2,000 WildChat benign conversations sampled to match the MHJ turn-length distribution.

<figure style="margin:1.6em 0">
  <video controls muted playsinline preload="metadata" poster="/assets/images/gradsafe-window-poster.png" aria-label="Animation: how the Context Window Scanner scores a conversation" style="width:100%;height:auto;border-radius:12px;display:block;background:#0f1117">
    <source src="/assets/video/gradsafe-window.mp4" type="video/mp4">
  </video>
  <figcaption style="font-size:.85em;color:#666;margin-top:.5em">How the Context Window Scanner scores a conversation, in six steps (1.3 minutes, no sound). The six turns and their scores are illustrative. The ROC-AUC values in the last step are the paper's measured numbers (Table 3).</figcaption>
</figure>


## What we found

![ROC curves for key methods on the real WildChat benchmark](/assets/images/gradsafe_roc.png)

*   The results show a substantial difference between synthetic and realistic benign settings. When evaluated against synthetic benign conversations, the detector achieves an ROC-AUC of 0.98 against human-authored multi-turn jailbreaks. When evaluated on WildChat benign conversations, ROC-AUC decreases to 0.76, and a threshold calibrated on synthetic data incorrectly classifies more than 90% of benign conversations as unsafe.
*   Under realistic benign distributions, single-turn windows provide the highest separability, whereas longer windows and accumulated conversation contexts reduce performance. A long conversation does not call for scoring its whole history; if anything, the extra length only creates more room for dilution.
*   The detector is also sensitive to the attack-generation method and target model: successful Crescendo-generated attacks receive scores comparable to or lower than benign conversations, and evaluation on Qwen2.5-7B-Instruct yields near-random separability with a different optimal window size.

## What it means

These findings show that gradient-based signals can support multi-turn jailbreak detection, but reliable deployment requires calibration on realistic benign conversations, short-window scoring, length-aware thresholds, and evaluation across attack types and model architectures.

## Paper

Omar Sheta, Rinku Deuja, Hadi Masoudi, and Minghong Fang. *Does the Unsafe Gradient Survive a Conversation? On the Fragility of Gradient-Based Jailbreak Detection in Multi-Turn Dialogue.* LAMPS '26, the 3rd ACM Workshop on Large AI Systems and Models with Privacy and Security Analysis, co-located with ACM CCS 2026. [arXiv:2609.36849](https://arxiv.org/abs/2609.36849). I will present it remotely at the workshop on November 15.
