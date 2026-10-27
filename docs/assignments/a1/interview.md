# COMP3702 A1 Interview Prep - Bilingual / 中英文对照

Sources used / 参考材料:

- `lecture/COMP3702_Module-0_IntroToAI.pdf`: agent design components and environment dimensions.
- `lecture/COMP3702_Module-1_Search.pdf`: search graphs, frontier, UCS, A*, admissible and consistent heuristics.
- `lecture/Demo_UQMapSearch_UCS.pdf`: priority queue examples using `f(n)`.
- `lecture/Demo_2DMaze_DFS_UCS_GBFS_wFringe.pdf`: frontier/expanded-node intuition and Manhattan heuristic example.
- `a1/2026-Assignment-1-Support-Code/solution.py`: submitted solver.
- `a1/a1-COMP3702-student-id.pdf`: submitted report.

Use this as a practice guide, not a script to read from. The interview checks whether you can explain the submitted work independently.

这份文档是复习提纲，不是面试时照读的稿子。Interview 的核心是验证你能不能独立解释自己提交的代码。

## 1. One-Minute Overview / 一分钟总览

English:

My solution formulates CrystalRover as a deterministic weighted search problem over a state graph. Each vertex is a `GameState`, and each edge is a valid game action with an associated cost. I implemented UCS and A*. UCS uses a priority queue ordered by `f(n)=g(n)`, so it always expands the lowest path-cost node first. A* uses `f(n)=g(n)+h(n)`, where `h(n)` is my relaxed-problem heuristic estimating the remaining cost to collect enough crystals and reach a launch site. The heuristic ignores rocks, craters, and jump restrictions to stay optimistic, but still uses storm-adjusted action costs and crystal/launch positions.

中文：

我的解法把 CrystalRover 建模成一个确定性的带权搜索问题，也就是在 state graph 上搜索。每个 vertex/node 是一个 `GameState`，每条 edge 是一个合法 action，并且有对应 cost。我实现了 UCS 和 A*。UCS 用 priority queue，优先级是 `f(n)=g(n)`，也就是优先扩展当前 path cost 最低的 node。A* 用 `f(n)=g(n)+h(n)`，其中 `h(n)` 是我设计的 relaxed-problem heuristic，用来估计还需要收集足够 crystals 并到达 launch site 的剩余 cost。这个 heuristic 忽略 rocks、craters 和 jump 限制来保持 optimistic，但仍然考虑 storm-adjusted action costs、crystal 位置和 launch 位置。

## 2. Lecture Terms To Use / 建议使用的课内术语

English:

- Agent design components: action space, state space, transition function, utility/path-cost function, initial state, goal test.
- State graph: vertices are states, edges are actions/transitions with costs.
- Search tree: generated paths during search; can contain repeated states.
- Frontier: nodes waiting to be expanded.
- Visited/reached dictionary: records the best known cost to reach each state.
- UCS: priority queue ordered by `g(n)`.
- A*: priority queue ordered by `g(n)+h(n)`.
- Heuristic `h(n)`: estimate of shortest remaining cost from node `n` to a goal.
- Admissible heuristic: never overestimates the true cost-to-goal.
- Consistent heuristic: satisfies triangle inequality, `h(n) <= c(n,a,n') + h(n')`.

中文：

- Agent design components：action space、state space、transition function、utility/path-cost function、initial state、goal test。
- State graph：vertex/node 表示 state，edge 表示 action/transition 和 cost。
- Search tree：搜索过程中生成的路径结构；同一个 state 可能重复出现。
- Frontier：已经生成但还没有 expanded 的 nodes。
- Visited/reached dictionary：记录到达每个 state 的当前最低 cost。
- UCS：priority queue 按 `g(n)` 排序。
- A*：priority queue 按 `g(n)+h(n)` 排序。
- Heuristic `h(n)`：从当前 node 到 goal 的剩余最短 cost 的估计。
- Admissible heuristic：不会高估真实 remaining cost。
- Consistent heuristic：满足三角不等式，`h(n) <= c(n,a,n') + h(n')`。

## 3. Agent Design Components / 智能体设计组件

English:

Action space:

- `GameEnv.ACTIONS` has 12 actions: 4 walks, 4 boosts, and 4 jumps.
- Walk moves one tile.
- Boost moves two tiles, but checks rocks and may fall into a crater.
- Jump is only valid from a crater and consumes one rocket jump.

State space:

- `GameState(row, col, crystal_status, rocket_jumps_left)`.
- `row`, `col`: rover position.
- `crystal_status`: tuple recording whether each crystal is collected.
- `rocket_jumps_left`: remaining rocket jumps.
- This is a factored state representation because the state is described by meaningful variables, not by one flat label.

Transition function:

- `GameEnv.perform_action(state, action)` is the transition model.
- It checks validity, computes the next position, updates crystal collection, and decrements jumps after jump actions.
- It is deterministic: the same state-action pair always returns the same successor.

Path cost / utility:

- The search objective is to minimise path cost.
- Path cost is the sum of `GameEnv.ACTION_COST[action]`.
- Base costs are modified by storm direction.

Goal test:

- `GameEnv.is_solved(state)` requires the rover to be on a launch site after collecting at least `min_samples` crystals.

中文：

Action space：

- `GameEnv.ACTIONS` 一共有 12 个动作：4 个 walk、4 个 boost、4 个 jump。
- Walk 移动一格。
- Boost 移动两格，但会检查 rock，也可能掉进 crater。
- Jump 只能在 crater 里使用，并且消耗一个 rocket jump。

State space：

- `GameState(row, col, crystal_status, rocket_jumps_left)`。
- `row`, `col`：rover 当前坐标。
- `crystal_status`：tuple，记录每个 crystal 是否已经收集。
- `rocket_jumps_left`：剩余 rocket jumps。
- 这是 factored state representation，因为 state 是由有意义的变量组成，而不是一个没有结构的标签。

Transition function：

- `GameEnv.perform_action(state, action)` 就是 transition model。
- 它检查 action 是否合法，计算 next position，更新 crystal collection，并在 jump 后减少 jumps。
- 它是 deterministic 的：同一个 state-action pair 总是得到同一个 successor。

Path cost / utility：

- 搜索目标是 minimise path cost。
- Path cost 是所有 `GameEnv.ACTION_COST[action]` 的和。
- Base costs 会根据 storm direction 被调整。

Goal test：

- `GameEnv.is_solved(state)` 要求 rover 在 launch site 上，并且已经收集至少 `min_samples` 个 crystals。

## 4. Environment Classification / 环境分类

English:

How I classify CrystalRover using lecture terminology:

- Discrete: grid positions, actions, crystal statuses, and jump counts are finite/discrete.
- Fully observable: the solver knows the full map, storm direction, action costs, crystals, launch sites, and current state.
- Deterministic: each valid state-action pair has one fixed next state.
- Single agent: only the rover chooses actions.
- Static/offline: the environment does not change while the solver plans; the full path is computed before execution.
- Resource-bounded: the theoretical search space can be large, so time and memory limits matter.
- No learning: the solver uses the provided model rather than learning from experience.

中文：

按照 lecture 的术语，CrystalRover 可以这样分类：

- Discrete：grid positions、actions、crystal statuses、jump counts 都是有限/离散的。
- Fully observable：solver 知道完整地图、storm direction、action costs、crystals、launch sites 和当前 state。
- Deterministic：每个合法的 state-action pair 只有一个确定的 next state。
- Single agent：只有 rover 在选择 actions。
- Static/offline：solver 思考时环境不会自己变化；完整 path 可以先计划好再执行。
- Resource-bounded：理论 state space 很大，所以 time 和 memory limits 很重要。
- No learning：solver 使用给定模型，不是通过经验学习。

## 5. UCS Explanation / UCS 解释

Relevant code: `solution.py`, lines 52-96.

English:

UCS is a best-first search where the priority function is `f(n)=g(n)`. In my code, `g(n)` is the accumulated action cost from the initial state to the current state. I keep a priority queue called `frontier`, and each entry stores the current cost, a tie-breaking counter, the state, and the path. I also keep `visited_cost`, a dictionary mapping each state to the cheapest known cost for reaching it.

When I pop a state from the frontier, it is the currently lowest-cost frontier node. If it is a goal, I can return the path because UCS with positive edge costs is optimal. If the popped cost is worse than the recorded best cost, I skip it as a stale heap entry. Otherwise, I generate successors by trying each action through `perform_action`, skip invalid or game-over results, compute the new cost, and push the successor if it is new or cheaper than before.

中文：

UCS 是一种 best-first search，它的 priority function 是 `f(n)=g(n)`。在我的代码里，`g(n)` 是从 initial state 到 current state 的累计 action cost。我用 priority queue 作为 `frontier`，每个 entry 存 current cost、tie-breaking counter、state 和 path。我还用 `visited_cost` dictionary 记录到达每个 state 的当前最低 cost。

每次从 frontier pop 出来的 state，都是当前 frontier 里 cost 最低的 node。如果它已经是 goal，就可以返回 path，因为在所有 edge costs 都为正的情况下，UCS 是 optimal 的。如果 pop 出来的 cost 比 `visited_cost` 里记录的更差，就说明这是旧的 heap entry，可以跳过。否则我尝试每个 action，用 `perform_action` 生成 successor，跳过 invalid 或 game-over 的结果，计算 new cost。如果 successor 没见过，或者这条 path 更便宜，就更新 dictionary 并放回 frontier。

Key interview sentence / 面试句：

English: "My UCS matches the lecture structure: frontier is a priority queue ordered by path cost `g(n)`, and the reached dictionary stores the best known `g(n)` for each state."

中文：“我的 UCS 和 lecture 里的结构一致：frontier 是按 path cost `g(n)` 排序的 priority queue，reached/visited dictionary 存每个 state 当前已知的最小 `g(n)`。”

## 6. A* Explanation / A* 解释

Relevant code: `solution.py`, lines 129-172.

English:

A* is also best-first search, but it uses `f(n)=g(n)+h(n)`. The `g(n)` part is the real cost already paid, like UCS. The `h(n)` part is the heuristic estimate of the remaining cost to reach a goal. In my code, the frontier heap stores `(f, counter, g, state)`. I use `visited_cost` to record the best `g(n)` for each state, and `parent` to reconstruct the final action sequence.

Compared with UCS, A* is more goal-directed. It still considers path cost so far, but also prefers states that look closer to completing the mission under the heuristic. This is why it explores far fewer states on the supplied tests.

中文：

A* 也是 best-first search，但它使用 `f(n)=g(n)+h(n)`。`g(n)` 是已经真实付出的 cost，和 UCS 一样。`h(n)` 是 heuristic，对从当前 node 到 goal 的 remaining cost 的估计。在我的代码里，frontier heap 存 `(f, counter, g, state)`。我用 `visited_cost` 记录每个 state 的最佳 `g(n)`，用 `parent` 回溯最终 action sequence。

和 UCS 相比，A* 更有方向感。它不仅看目前已经花了多少 cost，也会优先考虑 heuristic 下看起来更接近完成任务的 states。所以在提供的 tests 上，它 explored states 少很多。

Key interview sentence / 面试句：

English: "UCS only uses cost-so-far, while A* uses cost-so-far plus an estimated cost-to-goal."

中文：“UCS 只看 cost-so-far，而 A* 看 cost-so-far 加上 estimated cost-to-goal。”

## 7. Heuristic Design / Heuristic 设计

Relevant code: `solution.py`, lines 106-127 and 182-232.

English:

My heuristic is based on solving a simpler, less constrained version of the problem, which matches the lecture advice for generating heuristics. It estimates the relaxed cost to:

1. collect enough remaining crystals, then
2. travel to the nearest launch site.

The relaxation:

- ignores rocks,
- ignores craters,
- ignores rocket-jump restrictions,
- ignores exact boost collision geometry,
- but keeps crystal positions, launch positions, the number of samples still needed, and storm-adjusted directional costs.

If the state already has enough crystals, `compute_heuristic` returns the relaxed distance to the nearest launch site. Otherwise, it tries each uncollected crystal as the next crystal, adds the relaxed distance to reach it, and recursively chooses the cheapest remaining relaxed sequence until enough samples are collected.

中文：

我的 heuristic 是通过 solving a simpler, less constrained version of the problem 得到的，这和 lecture 里 “solve relaxed problem” 的方法一致。它估计一个 relaxed cost：

1. 先收集足够数量的 remaining crystals，
2. 然后到最近的 launch site。

这个 relaxation：

- 忽略 rocks，
- 忽略 craters，
- 忽略 rocket-jump 限制，
- 忽略 boost 的精确 collision geometry，
- 但保留 crystal positions、launch positions、还需要的 sample 数量，以及 storm-adjusted directional costs。

如果当前 state 已经收集够 crystals，`compute_heuristic` 返回到最近 launch site 的 relaxed distance。否则，它会尝试每一个未收集的 crystal 作为 next crystal，加上到它的 relaxed distance，然后递归选择剩余 crystals 中最便宜的 relaxed sequence，直到收集够 samples。

## 8. Relaxed Distance / 放松距离

English:

`_relaxed_distance(start, goal)` splits the distance into vertical and horizontal components. For each axis, `_line_distance` chooses the cheaper of:

- walking every tile, or
- using as many boosts as possible plus one walk if the distance is odd.

This is not exact real game distance because it ignores obstacles and special terrain, but it is cheap to compute and optimistic. It also uses the actual `ACTION_COST`, so moving with or against the storm is reflected.

中文：

`_relaxed_distance(start, goal)` 把距离分成 vertical 和 horizontal 两个方向。对每个 axis，`_line_distance` 选择更便宜的方式：

- 每一格都 walk，
- 或者尽可能用 boost，两格两格走，如果距离是奇数再补一个 walk。

这不是游戏里的真实最短距离，因为它忽略了障碍物和特殊地形，但它计算快，而且是 optimistic。它也使用真实的 `ACTION_COST`，所以顺风/逆风的影响会被考虑进去。

## 9. Admissibility And Consistency / 可采纳性与一致性

English:

Admissibility means the heuristic never overestimates the true shortest remaining cost. My heuristic should be admissible because it removes constraints from the real game. Removing rocks, craters, and jump restrictions can only make the problem easier, not harder. Therefore the relaxed solution should be a lower bound on the real solution cost.

I did not rely on a separate formal consistency proof. A consistent heuristic must satisfy `h(n) <= c(n,a,n') + h(n')`. My A* implementation is robust because it records best `g(n)` values and reinserts a state if a cheaper path is found. This protects correctness even if a rare inconsistency existed, though it may mean extra work.

中文：

Admissibility 的意思是 heuristic 不会高估真实的最短 remaining cost。我的 heuristic 应该是 admissible，因为它从真实游戏中移除了限制。去掉 rocks、craters 和 jump restrictions 只会让问题变容易，不会变更难。所以 relaxed solution 应该是真实 solution cost 的 lower bound。

我没有依赖一个单独的 formal consistency proof。Consistent heuristic 需要满足 `h(n) <= c(n,a,n') + h(n')`。我的 A* 实现比较稳，因为它记录每个 state 的最佳 `g(n)`，如果发现更便宜的 path，会重新插入这个 state。即使出现少数 inconsistent 的情况，也能保持正确性，只是可能多做一些搜索。

Good answer if asked / 如果被问可以这样说：

English: "I am confident about admissibility because the heuristic solves a relaxed problem. I would be more careful about claiming consistency, so my implementation allows state re-opening through the best-cost dictionary."

中文：“我对 admissibility 比较有信心，因为 heuristic 解的是 relaxed problem。对于 consistency 我会更谨慎，所以我的实现通过 best-cost dictionary 允许更便宜路径重新打开 state。”

## 10. Why The State Needs All Fields / 为什么 state 需要这些字段

English:

The same grid cell is not necessarily the same search state. Being at `(r,c)` with different crystals collected changes whether the goal can be completed. Being at `(r,c)` with different rocket jumps left changes future valid actions, especially around craters. Therefore `row`, `col`, `crystal_status`, and `rocket_jumps_left` are all necessary.

中文：

同一个 grid cell 不一定是同一个 search state。在 `(r,c)` 但收集了不同 crystals，会影响是否已经满足 goal 条件。在 `(r,c)` 但剩余 rocket jumps 不同，会影响之后哪些 actions 合法，尤其是 crater 附近。所以 `row`、`col`、`crystal_status` 和 `rocket_jumps_left` 都是必要的。

## 11. Frontier, Expanded, Visited / Frontier、Expanded、Visited

English:

Lecture distinction:

- Frontier: generated but not yet expanded nodes.
- Expanded node: a node popped from frontier whose successors are generated.
- Visited/reached dictionary: remembers states already reached, usually with their best path cost.

In my code:

- `frontier` is the heap.
- A state is expanded after it is popped and passes the stale-cost check.
- `visited_cost` is the reached dictionary storing best known `g(n)`.

中文：

Lecture 里的区分：

- Frontier：已经生成但还没 expanded 的 nodes。
- Expanded node：从 frontier pop 出来并生成 successors 的 node。
- Visited/reached dictionary：记录已经到达过的 states，通常还记录 best path cost。

在我的代码里：

- `frontier` 是 heap。
- 一个 state 被 pop 出来并通过 stale-cost check 后，才算 expanded。
- `visited_cost` 是 reached dictionary，存每个 state 的 best known `g(n)`。

## 12. Why Use `counter` In The Heap / 为什么 heap 里要用 counter

English:

Python heap compares tuple elements from left to right. If two entries have the same priority, Python may try to compare `GameState` objects, which are not orderable. The counter is a numeric tie-breaker, so heap entries remain comparable and deterministic.

中文：

Python heap 会从 tuple 的第一个元素开始比较。如果两个 entry 的 priority 一样，Python 可能会继续比较 `GameState` objects，但它们没有定义大小顺序。`counter` 是一个数字 tie-breaker，让 heap entries 总是可以比较，也更稳定。

## 13. Why Use `visited_cost` Instead Of A Set / 为什么不用普通 visited set

English:

Because this is weighted graph search. The same state can be reached through different paths with different costs. A normal visited set would only remember whether the state was seen, but not whether the new path is cheaper. `visited_cost` lets the algorithm update a state when a lower-cost path is found.

中文：

因为这是 weighted graph search。同一个 state 可能通过不同 paths 到达，而且 costs 不同。普通 visited set 只能记录见没见过，不能判断新的 path 是否更便宜。`visited_cost` 可以在发现 lower-cost path 时更新这个 state。

## 14. Code Walkthrough: How I Wrote It / 代码串讲：我是怎么写出来的

This section is for when the interviewer opens `solution.py` and asks you to explain your own code.

这一节用于面试官打开 `solution.py` 让你讲代码时使用。

### 14.1 Imports And Solver Setup / imports 和 Solver 初始化

Code:

```python
import heapq
from functools import lru_cache
from itertools import count

from game_env import GameEnv
from game_state import GameState
```

English:

I started from the lecture structure of best-first search. Since both UCS and A* need a priority queue, I used Python's `heapq`. I used `count` as a tie-breaker in the heap, because if two nodes have the same priority, Python should compare a number instead of trying to compare `GameState` objects. I used `lru_cache` for the heuristic helper functions because A* calls them many times with repeated inputs.

中文：

我是从 lecture 里的 best-first search 结构开始写的。因为 UCS 和 A* 都需要 priority queue，所以我用了 Python 的 `heapq`。我用 `count` 做 heap 的 tie-breaker，因为如果两个 nodes priority 相同，Python 应该比较一个数字，而不是尝试比较 `GameState` objects。我用 `lru_cache` 是因为 A* 会大量重复调用 heuristic helper functions，缓存可以减少重复计算。

Code:

```python
def __init__(self, game_env):
    self.game_env = game_env
    self.crystals = game_env.crystal_positions
    self.launches = game_env.launch_positions
    self.min_action_cost = min(game_env.ACTION_COST.values())
    self.action_order = [
        GameEnv.WALK_LEFT, GameEnv.WALK_RIGHT, GameEnv.WALK_UP, GameEnv.WALK_DOWN,
        GameEnv.BOOST_LEFT, GameEnv.BOOST_RIGHT, GameEnv.BOOST_UP, GameEnv.BOOST_DOWN,
        GameEnv.JUMP_LEFT, GameEnv.JUMP_RIGHT, GameEnv.JUMP_UP, GameEnv.JUMP_DOWN,
    ]
```

English:

I stored `game_env` because the solver needs the environment's transition function, goal test, costs, crystal positions, and launch positions. I copied `crystals` and `launches` into shorter fields because the heuristic uses them repeatedly. I also made an explicit `action_order` instead of relying on the unordered `GameEnv.ACTIONS` set. This makes the search behaviour more reproducible.

中文：

我保存 `game_env`，因为 solver 需要环境里的 transition function、goal test、costs、crystal positions 和 launch positions。我把 `crystals` 和 `launches` 存成短一点的 field，因为 heuristic 会反复用它们。我还写了一个固定的 `action_order`，而不是直接依赖无序的 `GameEnv.ACTIONS` set。这样 search 的行为更稳定、更可复现。

First-person answer / 第一人称说法：

English: "I first identified what information the solver repeatedly needs from the environment, then cached those references in `__init__`. The explicit action order was mainly for reproducibility."

中文：“我先找出 solver 会反复从 environment 里用到的信息，然后在 `__init__` 里保存引用。固定 action order 主要是为了让结果更可复现。”

### 14.2 UCS: From Lecture Pseudocode To Code / UCS：从课件伪代码到实现

Code:

```python
init_state = self.game_env.get_init_state()

frontier = []
counter = count()
heapq.heappush(frontier, (0, next(counter), init_state, []))

visited_cost = {init_state: 0}
```

English:

This directly follows the lecture's generic search algorithm: put the initial node in the frontier and create a reached/visited dictionary. The priority is `0` because the path cost at the initial state is zero. The path is initially an empty list because no actions have been taken yet.

中文：

这部分直接对应 lecture 的 generic search algorithm：把 initial node 放进 frontier，并创建 reached/visited dictionary。priority 是 `0`，因为 initial state 的 path cost 是 0。path 一开始是 empty list，因为还没有执行任何 actions。

Code:

```python
while frontier:
    cost, _, current_state, path = heapq.heappop(frontier)
    if self.game_env.is_solved(current_state):
        return path

    if cost > visited_cost[current_state]:
        continue
```

English:

Each loop expands the currently cheapest frontier node. I check the goal after popping, which is the correct UCS style from the lecture: for UCS, a generated goal is not necessarily optimal until it is selected from the priority queue. The stale-cost check handles old heap entries after a cheaper route to the same state has been found.

中文：

每次循环扩展当前 frontier 里 cost 最低的 node。我在 pop 之后检查 goal，这和 lecture 里 UCS 的做法一致：对 UCS 来说，一个刚生成的 goal 不一定已经 optimal，必须等它从 priority queue 里被选出来。`cost > visited_cost[current_state]` 这个检查用于跳过旧的 heap entry，因为同一个 state 可能后来被更便宜的 path 到达。

Code:

```python
for action in self.action_order:
    next_state, success, error_msg = self.game_env.perform_action(current_state, action)
    if not success:
        continue

    if self.game_env.is_game_over(next_state):
        continue

    new_cost = cost + self.game_env.ACTION_COST[action]

    if next_state not in visited_cost or new_cost < visited_cost[next_state]:
        visited_cost[next_state] = new_cost
        new_path = path + [action]
        heapq.heappush(frontier, (new_cost, next(counter), next_state, new_path))
```

English:

This is my successor generation. I did not reimplement the game rules inside the solver; I used `perform_action`, because the support code already defines the transition function. I skip invalid actions and game-over states. Then I apply the weighted-search rule: update the reached dictionary only if this state is new or the new path cost is lower.

中文：

这是我的 successor generation。我没有在 solver 里面重新实现游戏规则，而是调用 `perform_action`，因为 support code 已经定义了 transition function。我跳过 invalid actions 和 game-over states。然后按照 weighted search 的规则：只有当这个 state 没见过，或者新的 path cost 更低时，才更新 reached dictionary。

First-person answer / 第一人称说法：

English: "I wrote UCS first because it is the baseline algorithm. Once I had `frontier`, `visited_cost`, successor generation, and cost updates working, I could reuse the same structure for A*."

中文：“我先写 UCS，因为它是 baseline algorithm。当 `frontier`、`visited_cost`、successor generation 和 cost update 都跑通后，我就能复用这个结构写 A*。”

### 14.3 A*: Reusing UCS Structure With `g+h` / A*：复用 UCS 结构并加入 `g+h`

Code:

```python
start_h = self.compute_heuristic(init_state)
heapq.heappush(frontier, (start_h, next(counter), 0, init_state))

visited_cost = {init_state: 0}
parent = {init_state: (None, None)}
```

English:

For A*, the start state's priority is `0 + h(start)`, so I compute the heuristic before pushing the first node. I also changed path storage. In UCS I stored the whole path in each heap item, which is simple. In A*, I used a `parent` dictionary, because it is more memory efficient: each state stores only its predecessor and the action used to reach it.

中文：

对 A* 来说，start state 的 priority 是 `0 + h(start)`，所以我先计算 heuristic 再 push 第一个 node。我也改变了 path 的存储方式。UCS 里我在每个 heap item 里存完整 path，这样写最直观。A* 里我用了 `parent` dictionary，因为它更省内存：每个 state 只存 predecessor 和到达它的 action。

Code:

```python
new_cost = cost + self.game_env.ACTION_COST[action]

if next_state not in visited_cost or new_cost < visited_cost[next_state]:
    visited_cost[next_state] = new_cost
    parent[next_state] = (current_state, action)
    h = self.compute_heuristic(next_state)
    f = new_cost + h
    heapq.heappush(frontier, (f, next(counter), new_cost, next_state))
```

English:

This is the main difference from UCS. `new_cost` is `g(n)`. I compute `h(n)` using `compute_heuristic`, then push the state with priority `f(n)=g(n)+h(n)`. The update rule is still based on `g(n)`, not `f(n)`, because `visited_cost` should record the real best cost to reach the state.

中文：

这是和 UCS 最主要的区别。`new_cost` 是 `g(n)`。我用 `compute_heuristic` 计算 `h(n)`，然后用 `f(n)=g(n)+h(n)` 作为 priority push 进 frontier。注意 update rule 仍然基于 `g(n)`，不是 `f(n)`，因为 `visited_cost` 应该记录到达 state 的真实最低 cost。

Code:

```python
def _reconstruct_path(self, parent, state):
    path = []
    while parent[state][0] is not None:
        state, action = parent[state]
        path.append(action)
    path.reverse()
    return path
```

English:

When A* finds a goal, I reconstruct the path by following parent pointers backward from the goal to the initial state. Since that gives actions in reverse order, I reverse the list at the end.

中文：

当 A* 找到 goal 后，我通过 parent pointers 从 goal 往 initial state 回溯路径。因为这样得到的 action order 是反的，所以最后要 `reverse()`。

First-person answer / 第一人称说法：

English: "After UCS worked, I kept the same successor logic and changed only the priority from `g` to `g+h`. I also switched to parent pointers because A* may push many states and storing full paths everywhere wastes memory."

中文：“UCS 跑通以后，我保留了同样的 successor logic，只把 priority 从 `g` 改成 `g+h`。我也改用了 parent pointers，因为 A* 可能 push 很多 states，在每个 heap item 里存完整 path 会浪费内存。”

### 14.4 Heuristic: How I Designed It / Heuristic：我是怎么设计的

Code:

```python
collected = sum(state.crystal_status)
current = (state.row, state.col)
samples_needed = self.game_env.min_samples - collected

if samples_needed <= 0:
    return self._nearest_launch_distance(current)
```

English:

I first ask: from this state, what is still missing? If enough crystals have already been collected, the only remaining task is to reach a launch site, so the heuristic becomes the relaxed distance to the nearest launch.

中文：

我先问：从当前 state 看，还缺什么？如果 crystals 已经收集够了，剩下的任务只有到 launch site，所以 heuristic 就变成到最近 launch 的 relaxed distance。

Code:

```python
remaining_indexes = tuple(
    i for i, got in enumerate(state.crystal_status) if not got
)

return min(
    self._relaxed_distance(current, self.crystals[i])
    + self._crystal_tail_distance(i, tuple(j for j in remaining_indexes if j != i), samples_needed - 1)
    for i in remaining_indexes
)
```

English:

If more crystals are needed, I consider every uncollected crystal as a possible next target. For each option, I add the relaxed distance to that crystal plus the best relaxed cost after collecting it. Taking the minimum means the heuristic chooses the cheapest relaxed crystal order.

中文：

如果还需要更多 crystals，我把每个未收集的 crystal 都当作可能的 next target。对每个选择，我加上到这个 crystal 的 relaxed distance，再加上收集它之后的最佳 relaxed 剩余 cost。取 `min` 表示 heuristic 会选择最便宜的 relaxed crystal order。

Code:

```python
@lru_cache(maxsize=None)
def _crystal_tail_distance(self, current_index, remaining_indexes, samples_needed):
    current = self.crystals[current_index]
    if samples_needed <= 0:
        return self._nearest_launch_distance(current)

    return min(
        self._relaxed_distance(current, self.crystals[i])
        + self._crystal_tail_distance(
            i,
            tuple(j for j in remaining_indexes if j != i),
            samples_needed - 1,
        )
        for i in remaining_indexes
    )
```

English:

This helper is the recursive part of the relaxed travelling-salesperson-style estimate. It does not necessarily collect every crystal; it only collects as many as still required by `min_samples`. I cached it because many A* states share the same remaining-crystal subproblems.

中文：

这个 helper 是 relaxed travelling-salesperson-style estimate 的递归部分。它不一定收集所有 crystals，只收集 `min_samples` 还需要的数量。我给它加 cache，因为很多 A* states 会共享相同的 remaining-crystal subproblems。

Code:

```python
@lru_cache(maxsize=None)
def _relaxed_distance(self, start, goal):
    row_distance = abs(start[0] - goal[0])
    col_distance = abs(start[1] - goal[1])

    vertical_action = GameEnv.WALK_DOWN if goal[0] >= start[0] else GameEnv.WALK_UP
    horizontal_action = GameEnv.WALK_RIGHT if goal[1] >= start[1] else GameEnv.WALK_LEFT

    return (
        self._line_distance(row_distance, vertical_action)
        + self._line_distance(col_distance, horizontal_action)
    )
```

English:

This is similar in spirit to Manhattan distance from the lecture, but adapted to this game. Instead of counting grid steps only, I estimate the cheapest relaxed cost along the row and column directions, using the actual storm-adjusted action costs.

中文：

这和 lecture 里的 Manhattan distance 思路相似，但我把它适配到了这个游戏。它不是只数 grid steps，而是沿 row 和 column 方向估计 cheapest relaxed cost，并且使用真实的 storm-adjusted action costs。

Code:

```python
walk_only = distance * walk_cost
boost_and_walk = (distance // 2) * boost_cost + (distance % 2) * walk_cost
return min(walk_only, boost_and_walk)
```

English:

For movement along one axis, I compare walking all the way with using as many boosts as possible. I take the cheaper option because in the relaxed problem I am allowing the rover to move directly without obstacle restrictions.

中文：

对一个方向上的移动，我比较全程 walk 和尽可能使用 boost 哪个更便宜。取更便宜的那个，因为在 relaxed problem 里，我允许 rover 不受障碍限制地直接移动。

First-person answer / 第一人称说法：

English: "I designed the heuristic by asking what information should still guide the search without risking overestimation. I kept crystals, launch sites, required sample count, and storm-adjusted costs, but removed rocks and crater restrictions. That gave me a useful relaxed lower bound."

中文：“我设计 heuristic 时先想：哪些信息能指导搜索，同时不会导致高估？我保留 crystals、launch sites、required sample count 和 storm-adjusted costs，但移除 rocks 和 crater restrictions。这样得到一个有用的 relaxed lower bound。”

### 14.5 Development Story / 我是怎么一步步写出来的

English:

1. I first read `game_env.py` and `game_state.py` to identify the agent design components from the lecture: states, actions, transition function, costs, and goal test.
2. I implemented UCS first because it is the simplest correct baseline for weighted search.
3. I tested UCS on the supplied levels to make sure successor generation and cost updates were correct.
4. Then I implemented A* by reusing the UCS structure and changing the heap priority from `g(n)` to `g(n)+h(n)`.
5. I designed the heuristic from a relaxed problem, following the lecture idea that good heuristics can come from simpler versions of the original problem.
6. I added caching after noticing the heuristic repeatedly asks for similar distances and crystal-order subproblems.
7. Finally, I compared UCS and A* results. Since A* found the same costs but explored much less, the heuristic was useful on the supplied tests.

中文：

1. 我先读了 `game_env.py` 和 `game_state.py`，根据 lecture 里的 agent design components 找出 states、actions、transition function、costs 和 goal test。
2. 我先实现 UCS，因为它是 weighted search 里最直接、正确的 baseline。
3. 我用提供的 levels 测试 UCS，确认 successor generation 和 cost updates 是正确的。
4. 然后我复用 UCS 的结构实现 A*，主要把 heap priority 从 `g(n)` 改成 `g(n)+h(n)`。
5. 我根据 relaxed problem 设计 heuristic，这对应 lecture 里说的：heuristics 可以来自 simpler versions of the original problem。
6. 我加了 caching，因为 heuristic 会反复查询类似的 distances 和 crystal-order subproblems。
7. 最后我比较 UCS 和 A*。A* 找到相同 costs，但 explored states 少很多，说明这个 heuristic 在提供的 tests 上是有用的。

Short version to memorise / 可背的短版：

English: "I wrote UCS first from the lecture's priority-queue search pattern. Then I reused that search loop for A*, replacing the priority with `g+h`. The heuristic came from a relaxed version of CrystalRover: ignore obstacles and crater restrictions, but keep the important mission structure of collecting enough crystals and reaching launch."

中文：“我先按 lecture 的 priority-queue search pattern 写出 UCS。然后复用这个 search loop 写 A*，把 priority 换成 `g+h`。Heuristic 是从 CrystalRover 的 relaxed version 来的：忽略障碍和 crater 限制，但保留收集足够 crystals 并到达 launch 的任务结构。”

## 15. Performance Discussion / 性能讨论

Current local run / 当前本地运行：

| Test | UCS cost | A* cost |
| --- | ---: | ---: |
| L1 | 10.5 | 10.5 |
| L2 | 13.5 | 13.5 |
| L3 | 26.0 | 26.0 |
| L4 | 21.5 | 21.5 |

English:

The solution costs match between UCS and A* on the supplied tests. This is good evidence that A* is preserving optimality on these cases while reducing search effort. The runtime varies by machine, but A* was much faster locally because the heuristic gave useful direction and avoided exploring many irrelevant low-cost states.

中文：

在提供的 tests 上，UCS 和 A* 的 solution costs 一致。这说明在这些 cases 上，A* 保持了 optimality，同时减少了 search effort。Runtime 会随机器变化，但本地 A* 明显更快，因为 heuristic 给了搜索方向，避免扩展很多低 cost 但不相关的 states。

## 16. Limitations / 局限性

English:

The main limitation is that the heuristic ignores obstacles and crater constraints. On maps where rocks force large detours, or where crater/jump management is the main challenge, the heuristic may be loose. A loose heuristic is still safe if admissible, but it gives weaker guidance, so A* may expand more states.

中文：

主要局限是 heuristic 忽略了 obstacles 和 crater constraints。如果地图里 rocks 导致很长绕路，或者 crater/jump 管理是主要难点，这个 heuristic 可能会比较 loose。Loose heuristic 如果 admissible 仍然安全，但 guidance 较弱，所以 A* 可能扩展更多 states。

## 17. AI Usage Explanation / AI 使用说明

English:

I used Codex/ChatGPT as an assistant during preparation. It helped with drafting and polishing report wording, generating local experiment tables from my solver output, and checking whether explanations matched the code. I reviewed the final code and report, and I can explain the algorithms, state representation, heuristic, and limitations myself.

中文：

我在准备过程中使用了 Codex/ChatGPT 作为辅助工具。它帮助我润色 report 表达、根据 solver 输出整理本地实验表格，并检查解释是否和代码一致。最终代码和报告我自己 review 过，我能独立解释 algorithms、state representation、heuristic 和 limitations。

If asked whether AI wrote the assignment / 如果被问是不是 AI 写的：

English:

I used AI support, but I did not treat it as a black box. I studied and verified the final implementation. The important parts I understand are how UCS expands by path cost, how A* uses `g+h`, how `visited_cost` handles repeated states, how the heuristic is computed from a relaxed problem, and where the heuristic is limited.

中文：

我使用了 AI 辅助，但没有把它当黑箱。我学习并验证了最终实现。我理解的关键部分包括：UCS 如何按 path cost 扩展，A* 如何使用 `g+h`，`visited_cost` 如何处理 repeated states，heuristic 如何来自 relaxed problem，以及这个 heuristic 的局限在哪里。

## 18. GitHub Commit History / GitHub 提交记录怎么解释

Repository / 仓库:

- Local repo: `a1/2026-Assignment-1-Support-Code`
- Remote: `https://github.com/49079986/2026-Assignment-1-Support-Code.git`
- Branch: `main`

Important note / 重要提醒:

- Current local `solution.py` is marked modified because of line-ending differences (`LF`/`CRLF` warning). The latest pushed commit is `1e638ce Update Solution.py V3`.
- Some commits include `__pycache__` files. Those were generated automatically when running Python tests and are not part of the algorithm design. If asked, say that the meaningful authored files are mainly `solution.py`, `Results.md`, and `test_l1_l4.bat`.

### 18.1 Commit Timeline / 提交时间线

| Commit | Date | Message | What it shows |
| --- | --- | --- | --- |
| `6a62fdb` | 2026-08-30 | `Update soultuion.py UCS search function` | First meaningful UCS implementation in `solution.py`. |
| `f7f7deb` | 2026-08-30 | `Test ucs funtion and find a error` | I ran/testing UCS and made a small correction after finding an issue. |
| `7a1ed2e` | 2026-09-01 | `Finish A* Version1` | First A* version added, reusing UCS structure with heuristic priority. |
| `25b6ac9` | 2026-09-01 | `Add a script to test` | Added `test_l1_l4.bat` to run repeated local checks more easily. |
| `72b0489` | 2026-09-01 | `Update solution V2` | Improved/adjusted solution and recorded results in `Results.md`. |
| `1e638ce` | 2026-09-01 | `Update Solution.py V3` | Final refinement of `solution.py` and results before submission. |

中文表述：

| Commit | 日期 | 信息 | 说明 |
| --- | --- | --- | --- |
| `6a62fdb` | 2026-08-30 | `Update soultuion.py UCS search function` | 第一次主要实现 UCS。 |
| `f7f7deb` | 2026-08-30 | `Test ucs funtion and find a error` | 测试 UCS 后发现问题，并做了小修正。 |
| `7a1ed2e` | 2026-09-01 | `Finish A* Version1` | 加入第一版 A*，在 UCS 结构上加入 heuristic priority。 |
| `25b6ac9` | 2026-09-01 | `Add a script to test` | 加入 `test_l1_l4.bat`，方便重复运行本地测试。 |
| `72b0489` | 2026-09-01 | `Update solution V2` | 改进 solution，并把测试结果记录到 `Results.md`。 |
| `1e638ce` | 2026-09-01 | `Update Solution.py V3` | 提交前对 `solution.py` 和 results 做最终整理。 |

### 18.2 Why I Made These Commits / 我为什么要这样提交

English:

I used commits as development checkpoints. Each commit records a stage of the assignment: implementing UCS, testing and correcting it, implementing A*, adding a testing script, and refining the final solution. This helped me avoid losing work, compare versions if a change made results worse, and show an honest development process rather than one unexplained final upload.

中文：

我把 commits 当作开发过程中的 checkpoints。每个 commit 记录 assignment 的一个阶段：实现 UCS、测试并修正 UCS、实现 A*、加入测试脚本、最后优化和整理 solution。这样做可以防止丢失工作，也方便在某个改动让结果变差时回看之前版本，同时展示一个真实的开发过程，而不是只有一个无法解释的最终上传。

### 18.3 How To Explain The Development Process / 怎么用第一人称讲开发过程

English:

"My Git history shows the order I worked in. I started with UCS because the lecture suggests implementing uninformed weighted search first, and UCS is the baseline for optimal path cost. After testing UCS, I fixed an issue and then moved to A*. For A*, I reused the same frontier and `visited_cost` idea, but changed the priority from `g(n)` to `g(n)+h(n)`. After that I added a batch script so I could quickly rerun L1-L4 and compare UCS and A* costs. The later V2 and V3 commits were refinements to the heuristic and final results."

中文：

“我的 Git history 可以看出我的开发顺序。我先写 UCS，因为 lecture 里 weighted search 的基础就是 UCS，它也是 optimal path cost 的 baseline。测试 UCS 后我修了一个问题，然后开始写 A*。A* 复用了同样的 frontier 和 `visited_cost` 思路，只是把 priority 从 `g(n)` 改成 `g(n)+h(n)`。之后我加了一个 batch script，方便快速重跑 L1-L4，并比较 UCS 和 A* 的 costs。后面的 V2 和 V3 commits 主要是 heuristic 和最终结果的 refinement。”

### 18.4 If Asked About Commit Messages / 如果被问 commit message 写得不规范

English:

"Some commit messages have typos, like `soultuion` and `funtion`. That was just my informal development history while working. The content still shows the development progression: UCS, testing, A*, testing script, and final revisions."

中文：

“有些 commit message 有 typo，比如 `soultuion` 和 `funtion`。这是我开发时比较随手写的历史记录。但内容上还是能看出开发过程：UCS、测试、A*、测试脚本、最终修改。”

### 18.5 If Asked About `__pycache__` / 如果被问为什么提交了 `__pycache__`

English:

"Those files were generated automatically when I ran Python tests. They were accidentally committed, but they are not part of my algorithm. The meaningful source changes are in `solution.py`, and the testing support is `test_l1_l4.bat` and `Results.md`."

中文：

“这些文件是我运行 Python 测试时自动生成的，后来不小心也被 commit 进去了。它们不是算法的一部分。真正有意义的 source changes 在 `solution.py`，测试辅助文件是 `test_l1_l4.bat` 和 `Results.md`。”

### 18.6 Short Answer To Memorise / 可背短答

English:

"I committed after meaningful milestones so the history records how the solution developed: first UCS, then testing and fixing, then A*, then a testing script, and finally heuristic/result refinements. The commits are useful evidence that I built and checked the solver iteratively."

中文：

“我是在有意义的 milestones 后提交的，所以 history 记录了 solution 的发展过程：先 UCS，然后测试和修错，然后 A*，再加测试脚本，最后做 heuristic 和 result 的 refinement。这些 commits 可以说明我是逐步 build 和 check 这个 solver 的。”

## 19. Likely Questions / 常见问题

Q: What is the search graph in this assignment?

A: The vertices are `GameState`s, and the edges are valid actions returned by `perform_action`. Edge cost is `ACTION_COST[action]`.

问：这个 assignment 里的 search graph 是什么？

答：Vertices 是 `GameState`，edges 是 `perform_action` 产生的合法 actions。Edge cost 是 `ACTION_COST[action]`。

Q: Why is CrystalRover not just shortest path on grid cells?

A: Because the state includes more than position. Crystal collection status and rocket jumps left affect future validity and goal satisfaction.

问：为什么 CrystalRover 不只是 grid cell 上的 shortest path？

答：因为 state 不只是 position。Crystal collection status 和 rocket jumps left 会影响之后 action 是否合法，以及 goal 是否满足。

Q: Why can UCS return when the first goal is popped?

A: UCS pops nodes in nondecreasing `g(n)`. With positive edge costs, no unexpanded frontier path can lead to a cheaper goal once a goal is popped.

问：为什么 UCS 第一次 pop 到 goal 就可以返回？

答：UCS 按非递减的 `g(n)` pop nodes。所有 edge costs 为正时，一旦 goal 被 pop，frontier 里不可能还有能通向更便宜 goal 的 path。

Q: What is the difference between Greedy Best-First Search and A*?

A: Greedy best-first uses only `h(n)`, so it chases what looks closest to the goal and is not optimal in general. A* uses `g(n)+h(n)`, combining real cost so far with estimated remaining cost.

问：Greedy Best-First Search 和 A* 有什么区别？

答：Greedy best-first 只用 `h(n)`，所以它追逐看起来离 goal 最近的方向，一般不保证 optimal。A* 用 `g(n)+h(n)`，结合已经付出的真实 cost 和剩余 cost 估计。

Q: What makes a heuristic admissible?

A: It never overestimates the true shortest cost-to-goal. My heuristic is optimistic because it solves an easier version of the game.

问：什么是 admissible heuristic？

答：它不会高估真实的 shortest cost-to-goal。我的 heuristic 是 optimistic 的，因为它解的是更容易的版本。

Q: What would happen if the heuristic were zero everywhere?

A: A* would become UCS because `f(n)=g(n)+0`.

问：如果 heuristic 全部是 0 会怎样？

答：A* 会退化成 UCS，因为 `f(n)=g(n)+0`。

Q: What would happen if the heuristic overestimated?

A: A* might become faster, but it would no longer guarantee optimality.

问：如果 heuristic 高估了会怎样？

答：A* 可能更快，但不再保证 optimality。

Q: Why do you cache heuristic components?

A: A* calls the heuristic many times, and many calls reuse the same pairwise distances or crystal-tail subproblems. `lru_cache` avoids recomputation.

问：为什么要 cache heuristic components？

答：A* 会调用很多次 heuristic，而且很多调用会重复同样的 pairwise distances 或 crystal-tail subproblems。`lru_cache` 可以避免重复计算。

Q: What is one improvement you could make?

A: Precompute more accurate shortest-path lower bounds between important locations while still preserving admissibility, or incorporate obstacle-aware distances carefully.

问：你可以怎么改进？

答：可以在重要位置之间预计算更准确的 shortest-path lower bounds，同时保持 admissibility；或者谨慎加入 obstacle-aware distances。

Q: Why did you make multiple GitHub commits?

A: I used commits as checkpoints: UCS implementation, UCS testing/fix, first A* version, testing script, and later refinements. This helped me track progress and verify changes step by step.

问：为什么你有多个 GitHub commits？

答：我把 commits 当 checkpoints：UCS implementation、UCS testing/fix、first A* version、testing script，以及后续 refinements。这样可以记录进度，也方便一步步验证改动。

Q: What do your commits show about authorship?

A: They show an iterative development process instead of one final unexplained upload. I can connect the commits to the code: UCS first, then A*, then testing and refinements.

问：你的 commits 如何说明 authorship？

答：它们显示的是一个 iterative development process，而不是只有一个最终上传。我能把 commits 和代码对应起来：先 UCS，然后 A*，再测试和优化。

## 20. Practice Script / 口头练习稿

English:

I treated CrystalRover as a state-space search problem. The state graph has `GameState`s as nodes and valid actions as weighted edges. My UCS follows the lecture version of best-first search with priority `f(n)=g(n)`, so it expands the cheapest path so far. My A* changes the priority to `f(n)=g(n)+h(n)`. The heuristic estimates the relaxed remaining cost: collect the required number of remaining crystals in the cheapest relaxed order, then travel to the nearest launch. The relaxed problem ignores rocks, craters, and jump restrictions, so it should not overestimate the true cost. My Git commits match this process: I first implemented UCS, tested and fixed it, added A*, then added a testing script and final refinements. That makes A* much more directed than UCS while still aiming to preserve optimality.

中文：

我把 CrystalRover 当作 state-space search problem。State graph 里的 nodes 是 `GameState`，合法 actions 是带 cost 的 edges。我的 UCS 对应 lecture 里的 best-first search，priority 是 `f(n)=g(n)`，所以它扩展目前 path cost 最低的 node。我的 A* 把 priority 改成 `f(n)=g(n)+h(n)`。Heuristic 估计 relaxed remaining cost：用最便宜的 relaxed order 收集还需要的 crystals，然后到最近的 launch。这个 relaxed problem 忽略 rocks、craters 和 jump restrictions，所以它不应该高估真实 cost。我的 Git commits 也对应这个过程：先实现 UCS，测试并修正，然后加入 A*，再加测试脚本和最终 refinement。这样 A* 比 UCS 更有方向，同时仍然尽量保持 optimality。

## 21. Before Interview Checklist / 面试前清单

- Student ID card / 学生证。
- Laptop / 笔记本电脑。
- Submitted `solution.py` and report / 提交的代码和报告。
- AI usage logs if available / 如果有 AI 使用记录，带上。
- GitHub repository and commit history / GitHub 仓库和提交记录。
- Practise explaining `GameState` / 练习解释 `GameState`。
- Practise explaining UCS with `frontier` and `visited_cost` / 练习用 `frontier` 和 `visited_cost` 解释 UCS。
- Practise explaining A* with `g`, `h`, and `f` / 练习解释 A* 的 `g`、`h`、`f`。
- Practise explaining why your heuristic is admissible / 练习解释 heuristic 为什么 admissible。
- Practise explaining why each commit was made / 练习解释每个 commit 为什么提交。
- Be ready to name one limitation / 准备说出一个局限。
