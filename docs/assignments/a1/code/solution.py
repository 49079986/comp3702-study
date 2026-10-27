import heapq
import sys
from functools import lru_cache
from itertools import count

from game_env import GameEnv
from game_state import GameState

"""
solution.py

This file is a template you should use to implement your solution.

You should implement each of the method stubs below. You may add additional methods and/or classes to this file if you 
wish. You may also create additional source files and import to this file if you wish.

COMP3702 Assignment 1 Crystal Rover Support Code

Last updated by vp 03/08/26
"""


class Solver:

    STUDENT_NAME = "" # replace with your name
    STUDENT_ID = ""  # replace with your student ID
    GITHUB_USERNAME = "" # replace with your GitHub username

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


    @staticmethod
    def get_testcases():
        """
        Select which testcases you wish the autograder to test you on.
        The autograder will not run any excluded testcases.
        e.g. [1, 4, 6] will only run testcases 1, 4, and 6, excluding, 2, 3, and 5.
        :return: a list containing the testcase number to run (testcases in 1-6).
        """
        return [1, 2, 3, 4, 5, 6]

    # === Uniform Cost Search ==========================================================================================
    def search_ucs(self):
        """
        Find a path which solves the environment using Uniform Cost Search (UCS).
        :return: path (list of actions, where each action is an element of GameEnv.ACTIONS)
        """
        # Step1: get the initial state of the game env
        init_state = self.game_env.get_init_state()

        frontier = []
        counter = count()

        heapq.heappush(frontier, (0, next(counter), init_state, []))  # (cost, counter, state, path)

        visited_cost = {init_state: 0}  # (state, cost)

        while frontier:

            # Find the state with the lowest cost.
            cost, _, current_state, path = heapq.heappop(frontier)
            if self.game_env.is_solved(current_state):
                return path

            # If the cost of the current state is greater than the cost recorded in visited_cost, it means there is a better path to this state, so skip it.
            if cost > visited_cost[current_state]:
                continue

            # Try all possible actions, the specific actions of which are provided by GameEnv.ACTIONS.
            for action in self.action_order:
                next_state, success, error_msg = self.game_env.perform_action(current_state,action)
                if not success:
                    continue

                # If an error occurs, skip this state.
                if self.game_env.is_game_over(next_state):
                    continue

                new_cost = cost + self.game_env.ACTION_COST[action]

                # 1. I've never seen this state before; 2. I've seen this state before, but the cost is lower.
                if next_state not in visited_cost or new_cost < visited_cost[next_state]:
                    visited_cost[next_state] = new_cost
                    new_path = path + [action]
                    heapq.heappush(frontier, (new_cost, next(counter), next_state, new_path))

        return []  # Return an empty path if no solution is found

    # === A* Search ====================================================================================================
    def preprocess_heuristic(self):
        """
        Perform pre-processing (e.g. pre-computing repeatedly used values) necessary for your heuristic,
        """
        pass


    def compute_heuristic(self, state):
        """
        Compute a heuristic value h(n) for the given state.
        :param state: given state (GameState object)
        :return a real number h(n)
        """
        collected = sum(state.crystal_status)
        current = (state.row, state.col)
        samples_needed = self.game_env.min_samples - collected

        if samples_needed <= 0:
            return self._nearest_launch_distance(current)

        remaining_indexes = tuple(
            i for i, got in enumerate(state.crystal_status) if not got
        )

        return min(
            self._relaxed_distance(current, self.crystals[i])
            + self._crystal_tail_distance(i, tuple(j for j in remaining_indexes if j != i), samples_needed - 1)
            for i in remaining_indexes
        )

    def search_a_star(self):
        """
        Find a path which solves the environment using A* Search.
        Your heuristic computation must be implemented within compute_heuristic and called from this method
        If you have any expensive pre-computation you can implment it in preprocess_heuristic
        :return: path (list of actions, where each action is an element of GameEnv.ACTIONS)
        """
        init_state = self.game_env.get_init_state()

        frontier = []
        counter = count()

        start_h = self.compute_heuristic(init_state)
        heapq.heappush(frontier, (start_h, next(counter), 0, init_state))

        visited_cost = {init_state: 0}  # (state, cost)
        parent = {init_state: (None, None)}

        while frontier:
            _, _, cost, current_state = heapq.heappop(frontier)

            if self.game_env.is_solved(current_state):
                return self._reconstruct_path(parent, current_state)

            if cost > visited_cost[current_state]:
                continue

            for action in self.action_order:
                next_state, success, error_msg = self.game_env.perform_action(current_state, action)
                if not success:
                    continue

                if self.game_env.is_game_over(next_state):
                    continue

                new_cost = cost + self.game_env.ACTION_COST[action]

                if next_state not in visited_cost or new_cost < visited_cost[next_state]:
                    visited_cost[next_state] = new_cost
                    parent[next_state] = (current_state, action)
                    h = self.compute_heuristic(next_state)
                    f = new_cost + h
                    heapq.heappush(frontier, (f, next(counter), new_cost, next_state))
        return []

    def _reconstruct_path(self, parent, state):
        path = []
        while parent[state][0] is not None:
            state, action = parent[state]
            path.append(action)
        path.reverse()
        return path

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

    @lru_cache(maxsize=None)
    def _nearest_launch_distance(self, pos):
        return min(self._relaxed_distance(pos, launch) for launch in self.launches)

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

    @lru_cache(maxsize=None)
    def _line_distance(self, distance, walk_action):
        if distance == 0:
            return 0

        boost_action = {
            GameEnv.WALK_LEFT: GameEnv.BOOST_LEFT,
            GameEnv.WALK_RIGHT: GameEnv.BOOST_RIGHT,
            GameEnv.WALK_UP: GameEnv.BOOST_UP,
            GameEnv.WALK_DOWN: GameEnv.BOOST_DOWN,
        }[walk_action]

        walk_cost = self.game_env.ACTION_COST[walk_action]
        boost_cost = self.game_env.ACTION_COST[boost_action]

        walk_only = distance * walk_cost
        boost_and_walk = (distance // 2) * boost_cost + (distance % 2) * walk_cost
        return min(walk_only, boost_and_walk)
