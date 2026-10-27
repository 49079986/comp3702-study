# A3 的9个 commit 点

适合你明天从官方starter独立重写时使用。每个commit表示一段真实完成、已经验证的进展。不要把已有完整参考实现人为拆成九次，或补造昨天的历史。网页的勾选只保存学习进度，不会操作Git；本次也没有自动创建commit。

先确认Git根目录是自己的A3仓库。`study/assignments/a3` 是学习资料副本，不一定是提交仓库。在自己的仓库中检查 `git status`、`git diff`，只暂存这一步相关文件，再用下面建议的消息提交。阶段检查工具依照本学习版的 `q_table` / `fq_weights` 字段布局，使用其他组织方式可相应调整检查工具；它不替代官方tester。

| 点 | 做到哪里再commit | 主要文件 | 必须能解释、验证的事 | 建议消息 |
|---|---|---|---|---|
| 1 | 最小骨架能导入 | `solution.py`、本地运行说明 | 构造函数只保存环境，不训练；身份信息自己填写 | `chore: set up the A3 solver and local runner` |
| 2 | Q表与贪心选择完成 | `solution.py`、本地小测试 | 未见状态仍合法；-2大于-6；评估不为新状态插表 | `feat: add Q-table storage and valid greedy selection` |
| 3 | 单次Q更新算对 | `solution.py`、手算检查 | 非终止有后继项；旧Q=1、r=-2、alpha=.2，终止更新=.4 | `feat: implement one-step Q-learning and terminal handling` |
| 4 | 一幕训练与探索连起来 | `solution.py` | 下一动作使用环境返回状态；新一幕重置位置、保留表；不吞预算异常 | `feat: add episode training and epsilon decay` |
| 5 | QL实验能复现 | 实验脚本、配置与CSV | 记录种子/预算/alpha/奖励/步数；固定其他条件比较3个alpha；平均数可手算核对 | `test: record tabular learning and fixed-rate experiments` |
| 6 | FQ特征输出稳定 | `solution.py`、特征检查 | 固定长度≤256；所有值有限；归一化包括bias；权重初始全0或全1 | `feat: add normalised map-based FQ features` |
| 7 | FQ训练更新正确 | `solution.py`、手算检查 | 所有坐标用同一个旧TD误差；零权重、phi=[1,.5]、r=-2、alpha=.1，终止后[-.2,-.1] | `feat: train linear Q weights with TD updates` |
| 8 | 评估与导出分开 | `solution.py`、实验导出脚本 | 评估无探索、不更新Q/权重、不消耗训练步数；权重名和向量顺序对应 | `feat: separate greedy evaluation and export learned weights` |
| 9 | 最终版本完整验证 | 测试记录、README、最终代码/数据 | 公开关卡、预算协议、共同条件对照；报告数据对应最终代码；真实声明辅助和验证 | `test: validate levels and document reproducible experiments` |

在 `study/assignments/a3` 运行，例如第3点：

```powershell
# 默认：先看参考实现能否通过，熟悉检查的输出
python practice_checks.py --stage 3

# 自己重写后：指向包含你自己 solution.py 的目录
python practice_checks.py --stage 3 --solver-dir "C:\你的路径\自己的A3代码"
```

检查是累积的：`--stage 7` 同时检查1至7。第5阶段只做三个alpha的短运行，不证明你已保存完整实验；第9阶段是L1–L4短运行和预算异常检查，不代表达到所有评分门槛。仍须运行官方tester，并保存你自己的全量实测。L5文件不在当前公开测试集，不能声称已经检查。

每个点提交前，用自己的话回答三句：

1. 这次改了哪个输入到输出的过程？
2. 我用什么手算或实际运行确认它？
3. 如果老师改变一个条件，我知道哪一行的结果会变化吗？

只提交实际编写和验证的阶段。不需要为了凑数量把同一改动重复提交；如果一个阶段发现错误，修正后单独作真实修复提交也合理。
