"""CrystalRover A3 readable reference for independent practice.

AI assistance: OpenAI Codex, 26 October 2026, generated this study reference,
comments, and experiment scripts. Review, verify, and declare any use.
The original starter is preserved as solution_starter.py.
Interface: https://github.com/comp3702-2026/2026-Assignment-3-Support-Code
No private environment APIs, transition model, reward shaping, or plotting.
"""

from collections import deque
import math
import random

from game_env import GameEnv
from game_state import GameState


class Solver:
    # Fill these in yourself before making your own submission.
    STUDENT_NAME = ""
    STUDENT_ID = ""
    GITHUB_USERNAME = ""

    QL_ALPHA = 0.2
    FQ_ALPHA = 0.03
    EPSILON_START = 0.25
    EPSILON_END = 0.02
    EPSILON_DECAY_FRACTION = 0.8

    DIRECTIONS = {"l": (0, -1), "r": (0, 1), "u": (-1, 0), "d": (1, 0)}
    FEATURE_NAMES = (
        "bias", "walk", "boost", "jump",
        "left", "right", "up", "down",
        "target_distance", "target_distance_ahead_1",
        "target_progress_ahead_1", "target_progress_ahead_2",
        "target_progress_ahead_4", "lava_forward", "lava_side",
        "rock_forward", "crater_forward", "crystals_remaining_fraction",
        "ready_for_launch", "uncollected_crystal_ahead", "launch_ahead",
    )

    def __init__(self, game_env: GameEnv):
        # 中文：构造函数只保存引用；耗时的工作放在 initialise。
        self.game_env = game_env

    @staticmethod
    def testcases_to_attempt():
        return [1, 2, 3, 4, 5]

    def ql_initialise(self):
        self.q_table = {}     # GameState -> 12 个动作的 Q 值
        self.ql_history = []  # 只记录数据，不在评分代码中绘图
        self.ql_alpha = self.QL_ALPHA

    def ql_train_episode(self):
        env = self.game_env
        state = env.get_init_state()
        total_reward = 0.0
        steps = 0
        epsilon = self._epsilon()
        for _ in range(env.max_episode_steps):
            if env.is_terminal(state):
                break
            row = self.q_table.setdefault(state, [0.0] * len(env.ACTIONS))
            valid = env.get_valid_actions(state)
            action = self._training_action(valid, row, epsilon)
            index = env.ACTIONS.index(action)
            # 只调用公开模拟器。预算异常由官方 harness 处理，不在这里捕获。
            next_state, reward, _ = env.perform_action(state, action)
            target = reward
            if not env.is_terminal(next_state):
                next_row = self.q_table.get(next_state)
                if next_row is not None:
                    target += env.gamma * max(
                        next_row[env.ACTIONS.index(a)]
                        for a in env.get_valid_actions(next_state)
                    )
            # 唯一的表格更新：Q <- Q + alpha * (target - Q)。
            row[index] += self.ql_alpha * (target - row[index])
            state = next_state
            total_reward += reward
            steps += 1
            if (env.is_terminal(state)
                    or total_reward <= env.ql_reward_min_tgt
                    or env.is_training_budget_exhausted()):
                break
        self._record_episode(self.ql_history, total_reward, steps, epsilon, state)

    def ql_select_action(self, state: GameState):
        # 中文：评估只读表、不探索，也不为未见状态添加新表项。
        valid = self.game_env.get_valid_actions(state)
        row = self.q_table.get(state)
        if row is None:
            return valid[0]  # 全零 Q 值并列时的确定性选择
        return max(valid, key=lambda a: row[self.game_env.ACTIONS.index(a)])

    def fq_initialise(self):
        self.fq_weights = [0.0] * len(self.FEATURE_NAMES)
        self.fq_history = []
        self.fq_alpha = self.FQ_ALPHA
        self._feature_cache = {}
        env = self.game_env
        self._distance_scale = float(max(1, env.n_rows + env.n_cols))
        # 地图距离仅是特征描述：不推断隐藏概率，不做 Bellman 规划。
        targets = list(env.crystal_positions) + list(env.launch_positions)
        self._map_distances = {pos: self._bfs_map_distances(pos) for pos in targets}
        self._target_fields = {}

    def fq_get_features(self, state: GameState, action):
        key = (state, action)
        cached = self._feature_cache.get(key)
        if cached is not None:
            return list(cached)
        env = self.game_env
        row, col = state.row, state.col
        dr, dc = self.DIRECTIONS[action[1]]
        ready = sum(state.crystal_status) >= env.min_samples
        field = self._target_distance_field(state.crystal_status)
        far = self._distance_scale
        current = field.get((row, col), far)
        ahead = [self._ray_position(row, col, dr, dc, n) for n in (1, 2, 4)]
        distances = [field.get(pos, far) for pos in ahead]
        progress = [(current - d) / far for d in distances]
        # 步行和跳跃只使用一格方向特征；boost 也看前方两格和四格。
        is_boost = action[0] == "b"
        side1 = self._tile(row - dc, col + dr)
        side2 = self._tile(row + dc, col - dr)
        forward = self._tile(row + dr, col + dc)
        pending = {p for i, p in enumerate(env.crystal_positions)
                   if not state.crystal_status[i]}
        values = [
            1.0, float(action[0] == "w"), float(is_boost), float(action[0] == "j"),
            float(action[1] == "l"), float(action[1] == "r"),
            float(action[1] == "u"), float(action[1] == "d"),
            min(current / far, 1.0), min(distances[0] / far, 1.0),
            progress[0], progress[1] if is_boost else 0.0,
            progress[2] if is_boost else 0.0,
            float(forward == env.LAVA_TILE),
            0.5 * (int(side1 == env.LAVA_TILE) + int(side2 == env.LAVA_TILE)),
            float(forward == env.ROCK_TILE), float(forward == env.CRATER_TILE),
            max(0, env.min_samples - sum(state.crystal_status)) / max(1, env.min_samples),
            float(ready), float(ahead[0] in pending),
            float(ready and ahead[0] in env.launch_positions),
        ]
        # 统一 L2 缩放以限制单步权重更新幅度；长度固定为 21。
        norm = max(1.0, math.sqrt(sum(v * v for v in values)))
        result = tuple(v / norm for v in values)
        self._feature_cache[key] = result
        return list(result)

    def fq_train_episode(self):
        env = self.game_env
        state = env.get_init_state()
        total_reward = 0.0
        steps = 0
        epsilon = self._epsilon()
        for _ in range(env.max_episode_steps):
            if env.is_terminal(state):
                break
            valid = env.get_valid_actions(state)
            features = {a: self.fq_get_features(state, a) for a in valid}
            values = {a: self._dot(self.fq_weights, features[a]) for a in valid}
            if random.random() < epsilon:
                action = random.choice(valid)
            else:
                best = max(values.values())
                action = random.choice([a for a in valid if values[a] == best])
            next_state, reward, _ = env.perform_action(state, action)
            target = reward
            if not env.is_terminal(next_state):
                target += env.gamma * max(
                    self._dot(self.fq_weights, self.fq_get_features(next_state, a))
                    for a in env.get_valid_actions(next_state)
                )
            error = target - values[action]
            # 半梯度更新：w_i <- w_i + alpha * TD_error * feature_i。
            for i, value in enumerate(features[action]):
                self.fq_weights[i] += self.fq_alpha * error * value
            state = next_state
            total_reward += reward
            steps += 1
            if (env.is_terminal(state)
                    or total_reward <= env.fq_reward_min_tgt
                    or env.is_training_budget_exhausted()):
                break
        self._record_episode(self.fq_history, total_reward, steps, epsilon, state)

    def fq_select_action(self, state: GameState):
        valid = self.game_env.get_valid_actions(state)
        return max(valid, key=lambda a: self._dot(
            self.fq_weights, self.fq_get_features(state, a)))

    def _epsilon(self):
        env = self.game_env
        budget = env.training_step_budget or 1
        fraction = min(1.0, env.training_steps_used /
                       max(1.0, budget * self.EPSILON_DECAY_FRACTION))
        return self.EPSILON_START + fraction * (self.EPSILON_END - self.EPSILON_START)

    def _training_action(self, valid, row, epsilon):
        if random.random() < epsilon:
            return random.choice(valid)
        best = max(row[self.game_env.ACTIONS.index(a)] for a in valid)
        return random.choice([a for a in valid
                              if row[self.game_env.ACTIONS.index(a)] == best])

    def _record_episode(self, history, reward, steps, epsilon, state):
        history.append({"episode": len(history) + 1,
                        "training_steps": self.game_env.training_steps_used,
                        "reward": reward, "steps": steps, "epsilon": epsilon,
                        "solved": self.game_env.is_solved(state),
                        "terminal": self.game_env.is_terminal(state)})

    @staticmethod
    def _dot(weights, features):
        return sum(w * f for w, f in zip(weights, features))

    def _tile(self, row, col):
        env = self.game_env
        if not (0 <= row < env.n_rows and 0 <= col < env.n_cols):
            return env.ROCK_TILE
        return env.grid_data[row][col]

    def _bfs_map_distances(self, target):
        distances = {target: 0}
        queue = deque([target])
        while queue:
            row, col = queue.popleft()
            for dr, dc in self.DIRECTIONS.values():
                other = (row + dr, col + dc)
                if (other not in distances and self._tile(*other)
                        not in (self.game_env.ROCK_TILE, self.game_env.LAVA_TILE)):
                    distances[other] = distances[(row, col)] + 1
                    queue.append(other)
        return distances

    def _target_distance_field(self, crystal_status):
        if crystal_status not in self._target_fields:
            env = self.game_env
            if sum(crystal_status) >= env.min_samples:
                targets = env.launch_positions
            else:
                targets = [p for i, p in enumerate(env.crystal_positions)
                           if not crystal_status[i]]
            cells = set().union(*(self._map_distances[p] for p in targets))
            self._target_fields[crystal_status] = {
                cell: min(self._map_distances[p].get(cell, self._distance_scale)
                          for p in targets) for cell in cells}
        return self._target_fields[crystal_status]

    def _ray_position(self, row, col, dr, dc, length):
        # 只查看公开地图中的直线位置，不调用环境的动力学函数。
        for _ in range(length):
            other = row + dr, col + dc
            if self._tile(*other) in (self.game_env.ROCK_TILE, self.game_env.LAVA_TILE):
                break
            row, col = other
            if self._tile(row, col) == self.game_env.CRATER_TILE:
                break
        return row, col
