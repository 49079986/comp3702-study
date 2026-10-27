# Transfer Practice Mock B · 100 marks

Original practice paper. Suggested duration: 120 minutes. This is not an official examination paper or duration. Answer in English and show all working.

## 1 · An A* counterexample (14 marks)

Use edges S→A:2, S→B:1, B→A:.5, A→G:2 and h(S, A, B, G)=(3,0,2,0). Prove admissibility but not consistency. Trace the suboptimal result without reopening and give the correction.

## 2 · CSP and ordering heuristics (10 marks)

Why does AC delete nothing from a two-colour triangle despite unsatisfiability? Contrast forward checking with AC and explain MRV/LCV.

## 3 · Markov chains and discounting (10 marks)

P=[[.8,.2],[.4,.6]], x₀=[1,0]. Find x₂ and the stationary distribution. Find infinite return for reward 2 per step and γ=.8. What changes at γ=1?

## 4 · AND-OR planning (6 marks)

S has actions a→{G, DEAD} and b→{A, B}; A/B both have an action to G. Give a strong conditional plan. Can a self-loop be labelled solved unconditionally?

## 5 · PI and online planning (14 marks)

At X, stay gives 2 and returns to X; exit gives 25 and terminates; γ=.9. Start with always-stay. Evaluate, improve, re-evaluate and check stability. Compare computation scope and model requirements of VI, PI, RTDP and MCTS.

## 6 · RL and function approximation (16 marks)

Old Q=5, r=−1,γ=.8,α=.2; successor Q=[7,2] and behaviour chooses2. Compute Q-learning and SARSA. Separately w=[1,2,−1], f=[1,.5,2], r=3,γ=.5, max next Q=4,α=.1: find δ and new weights.

## 7 · DQN: concepts and numbers (10 marks)

The selected action has current Q=2, r=1,γ=.8 and next target outputs [3,5]. Compute nonterminal/terminal targets and losses. Explain replay and target networks. Why is a continuous joystick difficult for standard DQN?

## 8 · Adversarial search and a general-sum game (14 marks)

A MAX root has MIN children A=[5,7], B=[4,1], C=[6,9]. Apply left-to-right alpha-beta. Then find all pure and interior mixed Nash equilibria of (U, L)=(3,3),(U, R)=(0,2),(D, L)=(2,0),(D, R)=(1,1).

## 9 · Human-centred design and warranted trust (6 marks)

A team evaluates an older-adult companion robot by conversation duration. Explain the metric's limitations and propose co-design, wellbeing evaluation and trustworthy governance.


# Mock B: solutions and marking guide

## 1 · An A* counterexample

True remaining costs are A=2, B=2.5, S=3.5, so h never overestimates. S→A and B→A violate consistency. A is expanded first and generates G4; B later finds A with g=1.5. Closing A permanently returns 4. Reopening gives optimal S-B-A-G at 3.5.

- 4 marks: Admissibility.
- 3 marks: Inconsistency.
- 4 marks: Suboptimal trace.
- 3 marks: Reopening and optimal cost 3.5.

## 2 · CSP and ordering heuristics

Each colour has the opposite colour as pairwise support, but three pairwise-distinct vertices cannot use only two colours. Forward checking propagates from a new assignment to neighbours; AC continues propagating support losses between unassigned variables. MRV chooses the smallest remaining domain; LCV tries the least restrictive value.

- 4 marks: Local supports and global failure.
- 3 marks: Forward checking versus AC.
- 3 marks: MRV and LCV.

## 3 · Markov chains and discounting

x₁=[.8,.2], x₂=[.72,.28]; stationary distribution [2/3,1/3]. Return=2/(1−.8)=10. At γ=1 the infinite positive-reward sum diverges, so the discounted result does not apply.

- 3 marks: x₂.
- 3 marks: Stationary distribution.
- 2 marks: Return10.
- 2 marks: Limitation at γ=1.

## 4 · AND-OR planning

Action a fails the strong condition because of DEAD. Choose b and then take the appropriate action from the observed A or B to G. A loop requires a specified strong/strong-cyclic success criterion and assumptions such as fairness; it is not automatically solved.

- 4 marks: Full-branch conditional plan.
- 2 marks: Conditions on loops.

## 5 · PI and online planning

V_stay=20; exit 25 improves it. New V=25; one stay then exit gives 24.5<25, so the policy is stable. VI/PI typically solve over all states offline using a model: VI sweeps max backups, PI alternates fixed-policy evaluation and improvement. RTDP backs up visited trajectory states; MCTS spends simulation budget on the current decision. Neither online planner is automatically model-free.

- 4 marks: Initial value 20.
- 3 marks: Improvement and stability.
- 3 marks: VI versus PI.
- 4 marks: RTDP/MCTS scope and model.

## 6 · RL and function approximation

Q-learning gives 4.92 and SARSA 4.12. For the linear case, old Q=0, target 5,δ=5, new weights [1.5,2.25,0]. All components use the same pre-update error.

- 4 marks: Q-learning.
- 4 marks: SARSA.
- 3 marks: Old Q, target and error.
- 4 marks: New weights.
- 1 marks: Common error.

## 7 · DQN: concepts and numbers

Nonterminal target 5, loss9; terminal target 1, loss1. Replay reduces sequential correlation and reuses samples; a target network slows target movement. Finite outputs enumerate discrete actions, not a continuous joystick. A continuous policy-gradient method or suitable action discretisation is an alternative.

- 3 marks: Nonterminal calculation.
- 2 marks: Terminal calculation.
- 3 marks: Two stabilisation mechanisms.
- 2 marks: Continuous-action limitation.

## 8 · Adversarial search and a general-sum game

Choose C with value 6; B's first 4≤α=5 permits pruning 1; five leaves are visited. Pure equilibria are(U, L),(D, R). Let p=P(U), q=P(L). Row indifference3q=2q+1−q givesq=.5; column indifference3p=2p+1−p givesp=.5. Supported actions are best responses.

- 5 marks: Cutoff trace and root.
- 3 marks: Both pure equilibria.
- 4 marks: Mixed equations and solution.
- 2 marks: Best-response explanation.

## 9 · Human-centred design and warranted trust

Long use may reflect dependence or manipulation rather than benefit. Co-design with older adults and caregivers to identify needs. Evaluate autonomy, loneliness, relationships, burden and adverse impacts. Disclose limitations, assign responsibility, allow stopping/review/feedback and monitor after deployment.

- 2 marks: Risk of the proxy metric.
- 2 marks: Co-design and wellbeing measures.
- 2 marks: Trustworthy governance.

