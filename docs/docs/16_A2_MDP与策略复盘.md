# A2 MDP values and policies / A2 MDP与策略求解

Inspect the stochastic model, in-place VI, linear-system policy evaluation and policy visualiser.

把随机结果与奖励建模清楚，再追踪原地 VI、线性代数 PI 和策略可视化。

## Read the MDP model / 读懂 MDP 模型

**English**

The state records rover position and collected crystals. Rocket jumps are unlimited in A2. Walks, boosts and jumps can have random outcomes; collisions, lava and the storm affect rewards. The task is to obtain a policy over states with a high expected discounted return.

Start at `_build_model()`: a breadth-first traversal collects reachable states and caches valid actions and transition outcomes. A successor reached with zero probability should not enlarge the reachable state space. Terminal states are retained but not updated as ordinary decision states.

**中文**

状态记录位置和已收集水晶，A2 的火箭跳跃次数不再有限。动作有随机结果，碰撞、岩浆和风暴影响奖励。目标是求出每个状态应采取什么动作的策略，使预期折扣回报尽可能高。

从 `_build_model()` 开始读：BFS 枚举可达状态，缓存合法动作和转移结果。概率为零的结果不应扩大可达状态空间。终止状态可以保留，但不应作为普通决策状态继续更新。

## Audit transition probabilities / 核对转移概率

**English**

`_transition_outcomes()` enumerates no drift, clockwise drift and counterclockwise drift, together with single and double moves. For a boost it also enumerates each distance. It merges equal successor/reward outcomes. Check that probabilities are nonnegative and sum to 1 for each valid state/action pair, and that early termination stops a multi-move outcome.

For the assignment example with drift 0.3 and double-move 0.2, the six branch probabilities are 0.56, 0.14, 0.12, 0.03, 0.12, 0.03 when grouped as normal single/double, CW single/double, CCW single/double. The two drift directions split the total drift probability equally. The report's Venn diagram itself must be hand drawn.

**中文**

`_transition_outcomes()` 枚举不漂移、顺时针漂移、逆时针漂移，并组合单次和双重移动；boost 还要枚举每次移动的距离。相同后继和奖励的结果会合并。逐个合法状态动作对检查概率非负、总和为 1，以及多次移动途中终止是否及时停止。

题目示例中漂移概率 0.3、双重移动概率 0.2。按普通单次/双次、CW单次/双次、CCW单次/双次排列，六个分支概率为 0.56、0.14、0.12、0.03、0.12、0.03。漂移总概率在两个方向间均分。正式报告要求的 Venn 图仍须手绘。

## Trace value iteration / 追踪价值迭代

**English**

`_q_value()` sums `p * (reward + gamma * successor_value)` over outcomes. Terminal successors contribute no future value. `_best_action()` compares legal actions. `vi_iteration()` writes updated values directly into `vi_values`, so later states in the same sweep can use earlier updates; convergence uses the largest change in that sweep against epsilon.

For a separate numerical example, outcomes (p=0.8, r=2, next V=5) and (p=0.2, r=-1, next V=1), with gamma=0.9, give Q=5.18. If the second successor were terminal, its next value would instead be 0 and the result would be 5.00. Keep transition rewards and continuation values separate.

**中文**

`_q_value()` 对所有结果累加 `p * (reward + gamma * successor_value)`。终止后继的未来价值为零。`_best_action()` 比较合法动作。`vi_iteration()` 直接改写 `vi_values`，因此同一轮后面的状态能使用前面刚更新的值；收敛判断使用这一轮最大的价值变化与 epsilon 比较。

独立数值例子：两个结果分别为 p=0.8、r=2、后继价值5，以及 p=0.2、r=-1、后继价值1；gamma=0.9，算得 Q=5.18。如果第二个后继终止，它的未来价值变为0，结果是5.00。进入状态时收到的奖励和此后的价值要分开。

## Trace policy iteration / 追踪策略迭代

**English**

Read `pi_iteration()`. The archived implementation builds a matrix over nonterminal states and solves `(I - gamma P_pi) v = r_pi` for the current policy. It then improves the policy using the evaluated values and declares stability when no action changes.

A small number of outer policy iterations does not by itself establish a faster runtime. Record total convergence time and the kind of policy evaluation being used. Cached transitions and a smaller reachable-state set reduce repeated work; do not describe in-place updates or linear algebra as the only optimisations if the report asks for additional ones.

**中文**

读 `pi_iteration()`：已有代码在非终止状态上建立矩阵，求解 `(I - gamma P_pi) v = r_pi` 得到当前策略的价值；再据此改进策略，所有动作都不再变化时判定稳定。

外层策略迭代次数较少，本身不能证明总耗时较低。记录完整收敛时间，并说明策略评估的方式。缓存转移和只保留可达状态可减少重复计算；报告要求额外优化时，要说明原地更新或线性代数之外具体做了什么。

## Reproduce the report evidence / 复现实验与报告证据

**English**

From `assignments/a2/code`, use `python tester.py vi testcases/L1.txt` or replace `vi` with `pi`. The archive also contains `policy_visualiser.py` and its own checks. The report requires three representative testcase comparisons and a 3 by 3 experiment varying drift probability and game-over penalty on L4.

Open the helper guide and rubric alongside the report. Match the values and arrows in a visualisation to a particular crystal-status slice and iteration. Historical documents are preserved as they were; their experiment claims have not been rerun for this integration.

**中文**

在 `assignments/a2/code` 中运行 `python tester.py vi testcases/L1.txt`，或将 `vi` 改为 `pi`。归档中也有 `policy_visualiser.py` 和检查脚本。报告要求比较三个代表关卡，并在 L4 上做漂移概率与死亡惩罚的 3×3 组合实验。

将辅助指南、评分表和报告放在一起核对。可视化中的价值与箭头应对应明确的水晶状态切片和迭代轮数。历史文档按原样保存；本次整合没有重新运行或确认其中全部实验结论。

## 资料入口

- [Assignment brief / 作业说明](../assignments/a2/brief.pdf)
- [Report rubric / 报告评分表](../assignments/a2/rubric.pdf)
- [Helper guide / 辅助指南](../assignments/a2/helper_guide.pdf)
- [Existing report PDF / 已有报告 PDF](../assignments/a2/report.pdf)
- [Existing report Word / 已有报告 Word](../assignments/a2/report.docx)
- [Official report template / 原报告模板](../assignments/a2/report_template.docx)
- [Solver source / 求解器源码](../assignments/a2/code/solution.py)
- [Policy visualiser source / 策略可视化源码](../assignments/a2/code/policy_visualiser.py)