"""Nine incremental checks for the study reference layout; no commits are created.

AI assistance: OpenAI Codex, 27 October 2026. These are learning checks, not
the official grader. Alternate field names may require adapting this checker.
"""
import argparse
import copy
import importlib.util
import json
import math
from pathlib import Path
import random
import sys

ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage', type=int, choices=range(1, 10), default=9)
    parser.add_argument('--solver-dir', type=Path, default=ROOT / 'code',
                        help='Directory containing YOUR solution.py (default: study reference).')
    args = parser.parse_args()
    folder = args.solver_dir.resolve()
    sys.path.insert(0, str(ROOT / 'code'))
    from game_env import GameEnv, TrainingBudgetExhausted
    from game_state import GameState
    spec = importlib.util.spec_from_file_location('a3_practice_solution', folder / 'solution.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    Solver = module.Solver
    print('Checking:', folder / 'solution.py')
    print('Local learning checks; NOT an official grade. Field layout: q_table / fq_weights.')

    def env_for(level='L1', steps=1000):
        env = GameEnv(str(ROOT / 'code/testcases' / (level + '.txt')))
        env.set_training_budget(steps, -1000000)
        return env

    def make(algorithm='ql', level='L1'):
        env = env_for(level)
        solver = Solver(env)
        getattr(solver, algorithm + '_initialise')()
        return env, solver

    def checked(stage, message):
        print(f'PASS {stage}: {message}')

    env = env_for()
    solver = Solver(env)
    assert env.training_steps_used == 0, 'Constructor must not train.'
    checked(1, 'Solver imports; constructor does not perform training actions.')
    if args.stage < 2:
        return
    env, solver = make()
    state = env.get_init_state()
    before = copy.deepcopy(solver.q_table)
    assert solver.ql_select_action(state) in env.get_valid_actions(state)
    assert solver.q_table == before, 'Evaluation must not insert unseen rows.'
    valid = env.get_valid_actions(state)
    row = [-10.0] * len(env.ACTIONS)
    row[env.ACTIONS.index(valid[-1])] = -2.0
    solver.q_table[state] = row
    assert solver.ql_select_action(state) == valid[-1]
    checked(2, 'Unseen states and negative Q-values select valid greedy actions without learning.')
    if args.stage < 3:
        return

    # A one-action public-interface fixture isolates exact arithmetic.
    for terminal in (False, True):
        env, solver = make()
        env.max_episode_steps = 1
        solver.EPSILON_START = solver.EPSILON_END = 0.0
        solver.ql_alpha = 0.2
        state = env.get_init_state()
        nxt = GameState(*env.launch_positions[0], (1 if terminal else 0,) * len(env.crystal_positions))
        assert env.is_terminal(nxt) == terminal
        solver.q_table[state] = [1.0] + [0.0] * 11
        solver.q_table[nxt] = [10000.0 if terminal else 5.0] * 12

        def sample(current, action):
            assert current == state
            env.training_steps_used += 1
            return nxt, -2.0, None

        env.perform_action = sample
        solver.ql_train_episode()
        expected = 0.4 if terminal else 1 + .2 * (-2 + env.gamma * 5 - 1)
        assert math.isclose(solver.q_table[state][0], expected, abs_tol=1e-10)
    checked(3, 'Exact one-step update; terminal targets do not bootstrap.')
    if args.stage < 4:
        return

    env, solver = make()
    env.max_episode_steps = 6
    original = env.perform_action
    returned = None

    def chain(current, action):
        nonlocal returned
        assert current == (returned if returned is not None else env.get_init_state()), 'Broken state chain.'
        assert action in env.get_valid_actions(current)
        result = original(current, action)
        returned = result[0]
        return result

    env.perform_action = chain
    random.seed(3702)
    solver.ql_train_episode()
    assert env.training_steps_used > 0
    returned = None
    solver.ql_train_episode()
    if hasattr(solver, '_epsilon'):
        env.training_steps_used = 0
        early = solver._epsilon()
        env.training_steps_used = env.training_step_budget
        assert 0 <= solver._epsilon() <= early <= 1
    checked(4, 'Real state chain, legal actions, new episode reset and epsilon bounds.')
    if args.stage < 5:
        return
    history = solver.ql_history
    assert len(history) == 2
    assert all(math.isfinite(r['reward']) and r['steps'] > 0 for r in history)
    for alpha in (.1, .2, .3):
        run_env, run_solver = make()
        run_env.max_episode_steps = 4
        run_solver.ql_alpha = alpha
        random.seed(3702)
        run_solver.ql_train_episode()
        assert run_solver.ql_history[-1]['steps'] > 0
    print('NOTE: keep your own full experiment CSVs and configuration; this short check cannot certify them.')
    checked(5, 'Per-episode logs and three independent fixed-alpha smoke runs.')
    if args.stage < 6:
        return
    env, solver = make('fq')
    assert len(solver.fq_weights) <= 256
    assert all(w == 0 for w in solver.fq_weights) or all(w == 1 for w in solver.fq_weights)
    length = len(solver.fq_weights)
    for action in env.get_valid_actions(env.get_init_state()):
        phi = solver.fq_get_features(env.get_init_state(), action)
        assert len(phi) == length > 0 and all(math.isfinite(v) for v in phi)
        assert math.sqrt(sum(v*v for v in phi)) <= 1.00000001
    checked(6, 'Fixed finite feature length, uniform initial weights and normalisation.')
    if args.stage < 7:
        return
    env.max_episode_steps = 1
    state = env.get_init_state()
    end = GameState(*env.launch_positions[0], (1,) * len(env.crystal_positions))
    old = list(solver.fq_weights)
    actions = []

    def fq_sample(current, action):
        actions.append(action)
        env.training_steps_used += 1
        return end, -2.0, None

    env.perform_action = fq_sample
    solver.fq_train_episode()
    phi = solver.fq_get_features(state, actions[0])
    error = -2 - sum(w*f for w, f in zip(old, phi))
    assert all(math.isclose(w, o+solver.fq_alpha*error*f, abs_tol=1e-10)
               for w, o, f in zip(solver.fq_weights, old, phi))
    checked(7, 'Exact terminal FQ update, all coordinates use the same old TD error.')
    if args.stage < 8:
        return
    for algorithm in ('ql', 'fq'):
        env, solver = make(algorithm)
        env.max_episode_steps = 6
        getattr(solver, algorithm + '_train_episode')()
        learned = 'q_table' if algorithm == 'ql' else 'fq_weights'
        before = copy.deepcopy(getattr(solver, learned))
        used = env.training_steps_used
        select = getattr(solver, algorithm + '_select_action')
        state = env.get_init_state()
        action = select(state)
        assert action in env.get_valid_actions(state)
        assert all(select(state) == action for _ in range(5))
        assert getattr(solver, learned) == before and env.training_steps_used == used
    if hasattr(solver, 'FEATURE_NAMES'):
        assert len(solver.FEATURE_NAMES) == len(solver.fq_weights)
    checked(8, 'Deterministic greedy evaluation leaves learned values and training budget unchanged.')
    if args.stage < 9:
        return
    for level in ('L1', 'L2', 'L3', 'L4'):
        for algorithm in ('ql', 'fq'):
            env, solver = make(algorithm, level)
            env.max_episode_steps = 6
            getattr(solver, algorithm + '_train_episode')()
            assert getattr(solver, algorithm + '_select_action')(env.get_init_state()) in env.get_valid_actions(env.get_init_state())
    # Actual budget exception must propagate, regardless of action choices.
    for algorithm in ('ql', 'fq'):
        env, solver = make(algorithm)

        def exhausted(*unused):
            raise TrainingBudgetExhausted()

        env.perform_action = exhausted
        try:
            getattr(solver, algorithm + '_train_episode')()
        except TrainingBudgetExhausted:
            pass
        else:
            raise AssertionError('Solver swallowed the training-budget exception.')
    checked(9, 'L1–L4 smoke runs; both algorithms propagate training-budget exceptions.')
    print('All requested stages passed. Also run the official tester and retain your own real experiment records.')


if __name__ == '__main__':
    main()
