"""Check protocol and numerical properties using the official public interfaces."""
import ast
import math
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "code"))
from game_env import GameEnv
from game_state import GameState
from harness import check_feature_vectors, find_numeric_arrays, check_initial_weights, seed_solver_randomness
from solution import Solver


def main():
    source = (ROOT / "code" / "solution.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    assert not any(isinstance(n, ast.Try) for n in ast.walk(tree)), "Solver must not catch budget exceptions"
    checks = []
    # A deterministic one-transition fixture checks the numerical update,
    # especially that an already-terminal next state is never bootstrapped.
    for algorithm in ("ql", "fq"):
        env = GameEnv(str(ROOT / "code" / "testcases" / "L1.txt"))
        env.set_training_budget(100, -10000)
        env.max_episode_steps = 1
        state = env.get_init_state()
        terminal = GameState(*env.launch_positions[0], (1,) * len(env.crystal_positions))
        observed = []
        def one_transition(current, action):
            assert current == state
            observed.append(action)
            env.training_steps_used += 1
            return terminal, -2.0, None
        env.perform_action = one_transition
        solver = Solver(env)
        solver.EPSILON_START = solver.EPSILON_END = 0.0
        getattr(solver, f"{algorithm}_initialise")()
        if algorithm == "ql":
            solver.q_table[state] = [1.0] + [0.0] * 11
            solver.q_table[terminal] = [10000.0] * 12
            solver.ql_train_episode()
            assert math.isclose(solver.q_table[state][0], 0.4, abs_tol=1e-12)
        else:
            solver.fq_train_episode()
            vector = solver.fq_get_features(state, observed[0])
            assert all(math.isclose(w, solver.fq_alpha * -2.0 * f, abs_tol=1e-12)
                       for w, f in zip(solver.fq_weights, vector))
        checks.append(f"{algorithm}: exact one-step terminal update OK")
    for level in ("L1", "L2", "L3", "L4"):
        for algorithm in ("ql", "fq"):
            env = GameEnv(str(ROOT / "code" / "testcases" / f"{level}.txt"))
            env.set_training_budget(3000, -1000000)
            seed_solver_randomness(env.episode_seed)
            started = time.perf_counter()
            solver = Solver(env)
            constructor_seconds = time.perf_counter() - started
            assert constructor_seconds < 0.1
            initialise = getattr(solver, f"{algorithm}_initialise")
            started = time.perf_counter()
            initialise()
            init_seconds = time.perf_counter() - started
            assert env.training_steps_used == 0 and init_seconds < 30
            initial_arrays = find_numeric_arrays(solver) if algorithm == "fq" else None
            train = getattr(solver, f"{algorithm}_train_episode")
            # Avoid catching TrainingBudgetExhausted: each episode is at most 500 steps.
            while env.training_step_budget - env.training_steps_used >= env.max_episode_steps:
                train()
            if algorithm == "fq":
                length, problem = check_feature_vectors(env, solver.fq_get_features)
                assert problem is None, problem
                assert length == len(Solver.FEATURE_NAMES) and length <= 256
                check_initial_weights(solver, initial_arrays, length)
                assert all(math.isfinite(w) for w in solver.fq_weights)
                before = tuple(solver.fq_weights)
            else:
                before = {s: tuple(row) for s, row in solver.q_table.items()}
                assert all(math.isfinite(v) for row in before.values() for v in row)
            select = getattr(solver, f"{algorithm}_select_action")
            no_crystals = (0,) * len(env.crystal_positions)
            states = [env.get_init_state()] + [GameState(r, c, no_crystals)
                       for r, c in env.generalisation_start_positions]
            used = env.training_steps_used
            for state in states:
                first = select(state)
                assert first in env.get_valid_actions(state)
                assert all(select(state) == first for _ in range(5))
            after = tuple(solver.fq_weights) if algorithm == "fq" else {
                s: tuple(row) for s, row in solver.q_table.items()}
            assert before == after and env.training_steps_used == used
            checks.append(f"{level} {algorithm}: constructor, initialisation, training chain, "
                          "finite values, valid deterministic evaluation, no evaluation learning OK")
    print("\n".join(checks))


if __name__ == "__main__":
    main()
