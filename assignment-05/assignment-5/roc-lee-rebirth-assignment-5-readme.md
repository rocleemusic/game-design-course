# Assignment #5 — Goal-Oriented Coding Agent

**Roc Lee · game-project (working title: *Rebirth*)**
A cozy roguelite point-and-click adventure, built with ink inside Unreal 5.8.

To demonstrated Goal-Oriented Agents I am presenting two components of my project:
- A one-time use /goal command as demonstrated in class, to prove that ink integration could work for my project.
- A choice-designer agent that helps built out narrative branching dialogue graphs.

# /Goal prompt

## What I built

- following the in-class demonstration I used the following prompt that read a series of tasks on my taskboard generated with a PM agent after reading my Gdd:
- /goal complete gp-34, 58, 59, and 60 to prove that ink integration is possible to unblock decision on whether to continue with unreal as the shipping target. goal is complete when current ink story is playable end-to-end in ureal.
## What the Agent Does

- The task items the agent completed![[paca-tasks-ink-integration.jpg]]
## Were you able to run this in your game?

- Using this prompt was able to have it pull the ink integration github https://github.com/The-Chinese-Room/Inkpot, update it for Unreal 5.8, and have my ink script dialogue play in Unreal
- This allowed peace of mind in continuing to create dialogue using ink.
- ![[ink-in-unreal.png]]
- video also in `images/ink in unreal demo.mp4`
# Choice-Designer Agent
## What I built

- `choice-designer.md`
- I built a choice-designer agent to help design more varied branching dialogue shapes.
- The problem: When I started generating dialogue initially it created the exact same dialogue shape every time without fail.  And each conversation was only 6 beats like this:  ![[toby-before-mermaid.jpg]]
## What the Agent Does

- The choice-designer is part of my narrative pipeline (see `pipeline-position`)
- When session kicks off I orchestrate with a narrative architect on what story threads we should author.  
- A package of the npc's personality as a .json, and a .md file the thread is passed to the choice-designer that then fills out each conversation slot with a branching dialogue tree. 
- ![[toby-after-mermaid.jpg]]
## Were you able to run this in your game?

- Before using the choice-designer dialogue was one-dimensional and flat all the time. 
- After the generated content was much more interesting and was something that was worth editing.
- And here is the dialogue imported as ink script into my review tool:
- ![[dialogue-review-1.jpg]]

- And I can play through the dialogue in sequence:
- ![[dialogue-in-play.jpg]]
## Appendix

- choice-node-schema.md -- output format for nodes with reasoning
- guardrails.md -- used by Consistency-Verifier after Choice-Designer runs