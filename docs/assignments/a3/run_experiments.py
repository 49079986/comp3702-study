"""A3 local experiments. This file is not part of the Gradescope solver.

Uses the unmodified official harness for training and seeded evaluation.
AI assistance: OpenAI Codex, 26 October 2026.
"""

import argparse
from bisect import bisect_left
import csv
from datetime import datetime
import hashlib
import json
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "code"))
from game_env import GameEnv, TrainingBudgetExhausted
from harness import (train_agent, evaluate_policy, evaluate_generalisation,
                     check_feature_vectors, check_initial_weights,
                     get_learning_threshold, get_phase_value,
                     seed_solver_randomness)
from solution import Solver


def moving_average(values, window=50):
    result = []
    total = 0.0
    for i, value in enumerate(values):
        total += value
        if i >= window:
            total -= values[i - window]
        result.append(total / min(i + 1, window))
    return result


def write_csv(path, rows, fields=None):
    if fields is None:
        fields = list(rows[0]) if rows else []
    with path.open("w", newline="", encoding="utf-8-sig") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def run_one(level, algorithm, out, alpha=None, fair=False, eval_trials=1000):
    testcase = ROOT / "code" / "testcases" / f"{level}.txt"
    training_env = GameEnv(str(testcase))
    control_env = GameEnv(str(testcase))
    step_budget = get_phase_value(training_env, algorithm, "training_step_budget")
    reward_budget = get_phase_value(training_env, algorithm, "training_reward_budget")
    if fair:
        # Local controlled comparison: same interaction and reward budgets,
        # threshold, reward cutoff, and evaluation seeds for QL and FQ.
        # Simulator dynamics, hidden parameters and official source are untouched.
        step_budget = min(training_env.ql_training_step_budget,
                          training_env.fq_training_step_budget)
        reward_budget = max(training_env.ql_training_reward_budget,
                            training_env.fq_training_reward_budget)
        floor = min(training_env.ql_reward_min_tgt, training_env.fq_reward_min_tgt)
        ceiling = max(training_env.ql_reward_max_tgt, training_env.fq_reward_max_tgt)
        for env in (training_env, control_env):
            env.ql_reward_min_tgt = env.fq_reward_min_tgt = floor
            env.ql_reward_max_tgt = env.fq_reward_max_tgt = ceiling
    training_env.set_training_budget(step_budget, reward_budget)
    seed_solver_randomness(control_env.episode_seed)
    solver = Solver(training_env)
    if alpha is not None:
        if algorithm == "ql":
            solver.QL_ALPHA = alpha
        else:
            solver.FQ_ALPHA = alpha
    started = time.perf_counter()
    result = train_agent(training_env, control_env, solver, algorithm, TrainingBudgetExhausted)
    train_wall_seconds = time.perf_counter() - started
    select = getattr(solver, f"{algorithm}_select_action")
    floor = get_phase_value(control_env, algorithm, "reward_min_tgt")
    mean_reward, solved_count = evaluate_policy(
        control_env, select, control_env.get_init_state(), eval_trials, floor)
    feature_count = None
    generalisation = None
    if algorithm == "fq":
        feature_count, problem = check_feature_vectors(control_env, solver.fq_get_features)
        if problem:
            raise ValueError(problem)
        check_initial_weights(solver, result.initial_numeric_arrays, feature_count)
        generalisation = evaluate_generalisation(control_env, select)
    history = getattr(solver, f"{algorithm}_history")
    means = moving_average([r["reward"] for r in history])
    history = [dict(row, moving_average_50=mean) for row, mean in zip(history, means)]
    run_name = f"{level}_{algorithm}" + (f"_alpha{alpha:g}" if alpha is not None else "")
    write_csv(out / f"{run_name}_episodes.csv", history)
    step_counts = [r["training_steps"] for r in history]
    checkpoint_rows = []
    for steps, reward in result.checkpoint_history:
        checkpoint_rows.append({"training_steps": steps,
                                "training_episode": bisect_left(step_counts, steps) + 1,
                                "mean_greedy_reward": reward})
    write_csv(out / f"{run_name}_checkpoints.csv", checkpoint_rows,
              ["training_steps", "training_episode", "mean_greedy_reward"])
    learned_at_episodes = None
    if result.learned_at_steps is not None:
        learned_at_episodes = bisect_left(step_counts, result.learned_at_steps) + 1
    summary = {
        "run": run_name, "level": level, "algorithm": algorithm,
        "protocol": "common_budget_common_threshold" if fair else "official_budget",
        "episode_seed": control_env.episode_seed,
        "alpha": solver.ql_alpha if algorithm == "ql" else solver.fq_alpha,
        "epsilon_start": solver.EPSILON_START, "epsilon_end": solver.EPSILON_END,
        "epsilon_decay_fraction": solver.EPSILON_DECAY_FRACTION,
        "step_budget": step_budget, "reward_budget": reward_budget,
        "training_steps": result.steps_used, "training_episodes": len(history),
        "harness_episode_calls": result.episodes,
        "learning_threshold": get_learning_threshold(control_env, algorithm),
        "learned_at_steps": result.learned_at_steps,
        "learned_at_episodes": learned_at_episodes,
        "evaluation_reward_floor": floor,
        "evaluation_mean_reward": mean_reward, "solved_trials": solved_count,
        "evaluation_trials": eval_trials, "generalisation_mean_reward": generalisation,
        "feature_count": feature_count, "training_reward": result.training_reward,
        "time_per_training_step": result.get_time_per_step(),
        "train_wall_seconds_including_checkpoints": train_wall_seconds,
        "ended_without_progress": result.ended_without_progress,
        "solver_sha256": hashlib.sha256((ROOT / "code" / "solution.py").read_bytes()).hexdigest(),
    }
    if algorithm == "fq":
        weight_rows = [{"feature": name, "weight": weight}
                       for name, weight in zip(solver.FEATURE_NAMES, solver.fq_weights)]
        write_csv(out / f"{run_name}_weights.csv", weight_rows)
    (out / f"{run_name}_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"{run_name}: {result.steps_used} steps, {len(history)} episodes, "
          f"evaluation {mean_reward:.2f}, solved {solved_count}/{eval_trials}", flush=True)
    return summary


def plot_runs(out, summaries):
    # Plotting dependencies are isolated from solution.py and the official code.
    local_packages = ROOT / "tmp" / "python_deps"
    if local_packages.exists():
        sys.path.insert(0, str(local_packages))
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    plt.rcParams.update({"font.size": 10, "axes.spines.top": False,
                         "axes.spines.right": False})
    levels = list(dict.fromkeys(r["level"] for r in summaries))
    fig, axes = plt.subplots(len(levels), 1, figsize=(9, 3.6 * len(levels)), squeeze=False)
    for ax, level in zip(axes[:, 0], levels):
        rows = [r for r in summaries if r["level"] == level]
        for summary in rows:
            with (out / f"{summary['run']}_episodes.csv").open(encoding="utf-8-sig") as stream:
                history = list(csv.DictReader(stream))
            label = f"{summary['algorithm'].upper()} alpha={summary['alpha']:g}"
            ax.plot([int(r["episode"]) for r in history],
                    [float(r["moving_average_50"]) for r in history],
                    label=label, linewidth=1.3, alpha=0.9)
        ax.set_title(f"{level}: training episode reward, moving average of 50 episodes")
        ax.set_xlabel("Training episode")
        ax.set_ylabel("Mean reward (50 episodes)")
        ax.grid(alpha=0.2)
        ax.legend(loc="best")
    fig.tight_layout()
    fig.savefig(out / "learning_curves.png", dpi=180)
    fig.savefig(out / "learning_curves.pdf")
    plt.close(fig)
    # Greedy checkpoint rewards are a separate statistic from training rewards.
    fig, axes = plt.subplots(len(levels), 1, figsize=(9, 3.4 * len(levels)), squeeze=False)
    for ax, level in zip(axes[:, 0], levels):
        rows = [r for r in summaries if r["level"] == level]
        for summary in rows:
            with (out / f"{summary['run']}_checkpoints.csv").open(encoding="utf-8-sig") as stream:
                checkpoints = list(csv.DictReader(stream))
            ax.plot([int(r["training_steps"]) for r in checkpoints],
                    [float(r["mean_greedy_reward"]) for r in checkpoints], "o-",
                    label=f"{summary['algorithm'].upper()} alpha={summary['alpha']:g}", markersize=3)
        ax.axhline(rows[0]["learning_threshold"], linestyle="--", color="#666666",
                   label="Learning threshold (first run)")
        ax.set_title(f"{level}: greedy evaluation checkpoints (50 trials each)")
        ax.set_xlabel("Training steps")
        ax.set_ylabel("Mean greedy evaluation reward")
        ax.grid(alpha=0.2)
        ax.legend(loc="best")
    fig.tight_layout()
    fig.savefig(out / "greedy_checkpoints.png", dpi=180)
    plt.close(fig)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["baseline", "rates", "compare"])
    parser.add_argument("--levels", nargs="+", default=None)
    parser.add_argument("--rates", nargs="+", type=float, default=[0.1, 0.2, 0.4])
    parser.add_argument("--tag", default=None)
    parser.add_argument("--eval-trials", type=int, default=1000)
    args = parser.parse_args()
    levels = args.levels or (["L1"] if args.mode == "rates" else
                            ["L1", "L3"] if args.mode == "compare" else
                            ["L1", "L2", "L3", "L4"])
    allowed_levels = {"L1", "L2", "L3", "L4"}
    if not set(levels) <= allowed_levels or args.eval_trials < 1:
        parser.error("Choose L1-L4 and a positive evaluation trial count")
    if any(not 0 < rate <= 1 for rate in args.rates):
        parser.error("Learning rates must lie in (0, 1]")
    tag = args.tag or f"{args.mode}_{datetime.now():%Y%m%d_%H%M%S}"
    if Path(tag).name != tag or tag in (".", ".."):
        parser.error("tag must be a single folder name")
    out = ROOT / "results" / tag
    out.mkdir(parents=True, exist_ok=False)
    summaries = []
    for level in levels:
        if args.mode == "rates":
            for alpha in args.rates:
                summaries.append(run_one(level, "ql", out, alpha, eval_trials=args.eval_trials))
        else:
            for algorithm in ("ql", "fq"):
                summaries.append(run_one(level, algorithm, out, fair=args.mode == "compare",
                                         eval_trials=args.eval_trials))
    (out / "summary.json").write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(out / "metrics.csv", summaries)
    plot_runs(out, summaries)
    print(f"Saved data and figures to {out}", flush=True)


if __name__ == "__main__":
    main()
