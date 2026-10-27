# COMP3702 A3 学习模板

这份材料供你先运行、读懂，再从官方空白代码独立重写。核心参考实现已经补齐 QL 与 FQ 的所有接口。报告工作稿只填写允许 AI 协助的内容；题目明确禁止 AI 的小问保留题目和空白，由你独立作答。

## 从哪里开始

1. 先读 `明天自己重写.md`，按顺序理解一次训练 episode。
2. 打开 `code/solution.py` 看带中文注释的参考实现。
3. 对照 `code/solution_starter.py`，在单独的练习副本中自己实现。
4. 运行实验后，先核对原始 CSV，再填写自己的报告。

## 文件说明

| 文件 | 用途 |
|---|---|
| `code/solution.py` | 已实现的学习参考，只有标准库依赖，包含 QL、21 维 FQ 和训练记录 |
| `code/solution_starter.py` | 未改动的官方空白 starter，供你独立重写 |
| `code/game_env.py`、`code/harness.py` 等 | 官方支持文件，保持原样 |
| `run_experiments.py` | 调用官方 harness，记录实验、导出 CSV 和学习曲线 |
| `verify_protocol.py` | 检查训练链、初始权重、特征长度、评估不学习等规则 |
| `results/baseline/` | 官方预算下 L1–L4 两种算法的真实运行数据 |
| `results/learning_rates/` | Q2(b) 的三个固定学习率实验 |
| `results/comparison/` | Q4(a) 的共同预算与共同阈值比较 |
| `A3_报告学习工作稿.docx` | 可编辑的报告练习材料，包含图表与独立作答空白 |
| `报告学习工作稿.md` | 相同用途的文本版本 |

报告工作稿是自行整理的练习材料。这里尚未取得课程正式报告模板；正式提交时需要迁移到 Blackboard 提供的模板，并遵守它的分页。

## 快速运行

在本目录打开 PowerShell：

```powershell
.\run_study.ps1 verify
.\run_study.ps1 baseline
.\run_study.ps1 rates
.\run_study.ps1 compare
```

也可以使用你自己的 Python。官方测试在 `code` 目录运行：

```text
python tester.py ql testcases/L1.txt
python tester.py fq testcases/L1.txt
```

实验脚本在本目录运行：

```text
python run_experiments.py baseline
python run_experiments.py rates --levels L1 --rates 0.1 0.2 0.4
python run_experiments.py compare --levels L1 L3
```

绘图需要 Matplotlib，评分用的 `solution.py` 不需要。当前机器的绘图库放在 `tmp/python_deps`，不会被评分代码导入。如果换机器，可执行：

```text
python -m pip install matplotlib
```

每次运行默认新建带时间的结果目录，不覆盖此前数据。原始演示结果中，每个最终策略用 1000 个有固定种子的评估 episode；FQ 另按官方流程做泛化评估。探索使用官方种子，实验可重现，但计时会随机器负载变化。

## 三组实验分别测什么

`baseline`：保留官方每种算法各自的训练预算、阈值与奖励截断，用于检查公开测试表现。QL 和 FQ 的官方预算不同，不把这组当作严格控制训练资源的对照实验。

`rates`：只改变 QL 的固定学习率，其余参数、地图、随机种子、训练预算和评估方法相同。每个学习率独立创建环境和 Solver。所有候选值都导出，不能只留下有利的一条曲线。

`compare`：对每个关卡，QL 和 FQ 使用相同的训练步数上限（两种官方预算的较小值）、累计训练奖励下限（两种官方下限中较严格者）、评估回报截断和学习阈值。共同回报区间取两种官方区间的包络：下限取较小值，上限取较大值；阈值为下限加区间宽度的 75%。这些设置只用于本地控制实验，不修改模拟器动力学或官方源码。QL 与 FQ 使用各自记录在表中的学习率。

`learning_curves.png` 的纵轴是训练 episode 回报的 50-episode 移动平均，包含探索；`greedy_checkpoints.png` 的纵轴是阶段性贪心策略的 50 次评估平均回报。两者不是同一个统计量。官方 checkpoint 在第一次达到阈值后停止，因此 checkpoint 曲线可能提前结束。

如果没达到阈值，数据中写 `null`，报告应写“未达到”，不能拿训练结束步数冒充达到阈值的步数。训练 episode 可能因终止、步数上限、回报截断或总预算停止。官方 harness 可能额外调用一次已耗尽预算的 episode；表中同时保存真实记录 episode 数和 harness 调用数。

## 参考实现的范围

这是方便理解的基线，不保证隐藏关卡分数。FQ 只看最近目标和有限的地图特征；特征本身不包含隐藏概率或动作成本。最优的超参数和特征需要你通过自己的实验验证。

QL 使用固定 alpha=0.2，FQ 使用固定 alpha=0.03；epsilon 按已用训练步数从 0.25 线性降到 0.02，在预算的前 80% 完成衰减。FQ 权重从全 0 开始。所有真实奖励直接来自 `perform_action`，不增加通关奖励或修改死亡惩罚。

## 报告中 AI 的使用范围

| 小问 | 处理方式 |
|---|---|
| Q1(a)、Q1(b) | 仅保留题目和空白，你独立完成 |
| Q2(a)、Q3(a) | 有参考材料；你必须实际验证，并写清验证方法与结果 |
| Q2(b)、Q3(b)、Q4(a) | 提供实验代码与实测图表供你复核 |
| Q2(c)、Q3(c)、Q4(b)、Q4(c) | 仅保留题目和空白，你独立完成 |

AI 声明草稿：OpenAI Codex 于 2026 年 10 月 26 日协助生成学习参考代码、实验脚本、图表及报告工作稿中允许 AI 的部分。请按实际使用情况补充界面显示的模型版本、保留或修改的内容、你实际完成的验证；不得声明尚未做过的验证。

## 源码与提交记录

官方支持代码来自：
https://github.com/comp3702-2026/2026-Assignment-3-Support-Code

下载时的提交：`0e498b0adbe94b0e6b084945e575de3df4988d0e`。

本地 `code/.git` 是官方 starter 的历史，不是你的开发记录。本次没有创建学生提交、没有推送代码。你应在课程指定的私有仓库中真实、逐步开发，保留至少 5 次有意义的提交；不要把参考实现拆成提交来凑次数。

正式提交前填写个人信息，按官方要求仅提交自己的 `solution.py` 及必要辅助源码；绘图脚本、图表、结果文件和官方支持代码不属于 solver 提交内容。报告需使用正式模板，独立完成的部分也要由你自己写。
