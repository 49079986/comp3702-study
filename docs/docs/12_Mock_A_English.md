# Comprehensive Mock A · 100 marks

Original practice paper. Suggested duration: 120 minutes. This is not an official examination paper or duration. Answer in English and show all working.

## 1 · Search and heuristics (16 marks)

Directed edges: S→A:2, S→B:1, A→C:2, A→G:9, B→C:2, B→D:6, C→G:3, D→G:1. h(S, A, B, C, D, G)=(5,5,4,3,1,0). Use listed successor order, insertion-order priority ties and removal-time goal tests. BFS marks on generation; UCS/A* retain minimum g. Give removal orders, paths and costs for BFS, UCS, A*, then test consistency.

## 2 · CSP propagation (12 marks)

D(A)=D(B)=D(C)={1,2,3}, with A<B and B<C. Start with arcs A→B, B→A, B→C, C→B and reinsert affected arcs as required. Show deletions and final domains. Explain why AC does not generally establish global satisfiability.

## 3 · Probability and utility (10 marks)

P(H)=.1, P(E|H)=.8, P(E|¬H)=.2. Find the posterior. Separately compare certain 16 with an equally likely 0/36 lottery under U(x)=√x.

## 4 · MDP and value iteration (18 marks)

A moves to B for 0 or exits for 4; B only exits for 10; E absorbs with 0 reward. γ=.9, V₀=0. Compute synchronous V₁, V₂, V₃ and the policy. Also calculate Q for an action reaching X with probability .8, reward 2, V(X)=5, or Y with probability .2, reward −1, V(Y)=1. Explain entry versus exit rewards.

## 5 · Bandits and MCTS (10 marks)

Two arms have means 2.3575/1.795, counts 4/2, total N=6. Select using Q+√(5lnN/n). Name the four MCTS phases. An edge with old N=3, Q=2 receives return 6; update its mean.

## 6 · Reinforcement learning (14 marks)

Q(s, a)=3, r=2,γ=.9,α=.5. Successor Q=[8,1] and behaviour selects the second action. Compute Q-learning and SARSA updates, including a terminal-successor variant. Give the MC return of rewards [2,0,10] and explain bootstrapping/on-policy/off-policy.

## 7 · Adversarial search and mixed equilibrium (14 marks)

A MAX root has MIN subtrees A=[3,5,6], B=[2,9,1], C=[4,7,8]. Apply left-to-right alpha-beta; give root value, chosen action, pruned leaves and justification. For penalty kicks with matrix[[.6,.2],[.3,.9]], find both players' right-action probabilities and goal probability.

## 8 · Responsible AI (6 marks)

A care-allocation AI uses past healthcare expenditure to estimate need, allocating less care to one group. Explain the risk and propose two measurable improvements using the course framework.


# Mock A: solutions and marking guide

## 1 · Search and heuristics

BFS: S, A, B, C, G; path S-A-G, cost 11. UCS: S, B, A, C, G; path S-B-C-G, cost 6. A*: S, B, C, G; same path and cost 6. All edge inequalities hold: 5≤2+5,5≤1+4,5≤2+3,5≤9+0,4≤2+3,4≤6+1,3≤3+0,1≤1+0. Thus h is consistent. A fewest-edge path need not be cheapest.

- 4 marks: BFS trace, path and cost.
- 4 marks: UCS trace, path and cost.
- 4 marks: A* trace, path and cost.
- 4 marks: Consistency inequalities and explanation.

## 2 · CSP propagation

A→B deletes A3; B→A deletes B1; B→C deletes B3 and requires A→B again; C→B deletes C1,2; A→B deletes A2. Final domains are A{1}, B{2}, C{3}. Pairwise supports can conflict globally; a two-colour triangle is a counterexample.

- 6 marks: Deletion and reinsertion trace.
- 3 marks: Final domains.
- 3 marks: Counterexample and explanation.

## 3 · Probability and utility

P(E)=.26 and P(H|E)=.08/.26=4/13. Certain utility is 4; lottery EU is 3, so choose 16 even though the lottery has expected monetary payoff 18.

- 5 marks: Total-probability denominator and posterior.
- 3 marks: Utilities and decision.
- 2 marks: Distinguish expected money from expected utility.

## 4 · MDP and value iteration

V₁=(4,10,0), V₂=V₃=(9,10,0); A moves to B and B exits. Q=.8(2+.9×5)+.2(−1+.9×1)=5.18. With exit rewards the coloured cell has its exit value and the final absorbing state has value 0; a neighbouring move introduces another discount. Entry rewards pay on the preceding transition and leave terminal future value 0.

- 6 marks: VI sweeps.
- 3 marks: Policy comparison.
- 5 marks: Probability-weighted Q calculation.
- 4 marks: Reward-timing distinction.

## 5 · Bandits and MCTS

UCB scores are approximately 3.8541/3.9115, so choose the second arm. The phases are selection, expansion, simulation and backpropagation. The new edge count is 4 and mean is(3×2+6)/4=3.

- 4 marks: UCB calculation and selection.
- 3 marks: Four phases.
- 3 marks: Mean and count update.

## 6 · Reinforcement learning

Q-learning target 9.2, new Q=6.1. SARSA target 2.9, new Q=2.95. If terminal, target 2, new Q=2.5 for both. MC return 10.1; MC does not bootstrap. TD uses a successor estimate. Q-learning can learn a greedy target differing from behaviour; SARSA learns the behaviour policy.

- 4 marks: Q-learning.
- 4 marks: SARSA.
- 2 marks: Terminal handling.
- 2 marks: MC return.
- 2 marks: Conceptual comparison.

## 7 · Adversarial search and mixed equilibrium

A returns 3, setting root α=3. B's first 2 gives β=2≤3, so prune 9 and 1. C returns 4; choose C, value 4. Goalkeeper-column indifference gives kicker-right probability .4; kicker-row indifference gives goalkeeper-right probability .3. The goal probability is .48.

- 6 marks: Minimax, cutoffs and justification.
- 3 marks: Equation and kicker-right probability .4.
- 3 marks: Equation and goalkeeper-right probability .3.
- 2 marks: Equilibrium value .48.

## 8 · Responsible AI

Expenditure encodes historical under-access, causing underestimated need and further under-allocation. Validate a more direct need label and co-design with patients and clinicians. Evaluate errors, allocation and health outcomes by group, and provide human review, appeal, monitoring and accountable ownership.

- 2 marks: Causal mechanism.
- 2 marks: Specific interventions.
- 2 marks: Measures and governance.

