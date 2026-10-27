from game_state import GameState

"""
game_env.py

Environment for the Crystal Rover game.
"""


class GameEnv:
    """
    Instance of an Crystal Rover Game environment. Stores the dimensions of the environment, initial rover position,
    crater positions, rock positions, storm direction and cost, exit positions, crystal sample positions
    and the available actions.
    """

    # input file symbols
    GROUND_TILE = ' '
    ROCK_TILE = 'R'
    CRATER_TILE = '*'
    CRYSTAL_TILE = 'C'
    LAUNCH_TILE = 'E'
    ROVER_TILE = 'P'
    VALID_TILES = {GROUND_TILE, ROCK_TILE, CRATER_TILE, CRYSTAL_TILE, LAUNCH_TILE, ROVER_TILE}

    # action symbols (i.e. output file symbols)
    WALK_LEFT = 'wl'
    WALK_RIGHT = 'wr'
    WALK_UP = 'wu'
    WALK_DOWN = 'wd'
    BOOST_LEFT = 'bl'
    BOOST_RIGHT = 'br'
    BOOST_UP = 'bu'
    BOOST_DOWN = 'bd'
    JUMP_LEFT = 'jl'
    JUMP_RIGHT = 'jr'
    JUMP_UP = 'ju'
    JUMP_DOWN = 'jd'

    ACTIONS = {
        WALK_LEFT, WALK_RIGHT, WALK_UP, WALK_DOWN,
        BOOST_LEFT, BOOST_RIGHT, BOOST_UP, BOOST_DOWN,
        JUMP_LEFT, JUMP_RIGHT, JUMP_UP, JUMP_DOWN,
    }
    ACTION_BASE_COST = {
        WALK_LEFT: 1.0, WALK_RIGHT: 1.0, WALK_UP: 1.0, WALK_DOWN: 1.0,
        BOOST_LEFT: 1.5, BOOST_RIGHT: 1.5, BOOST_UP: 1.5, BOOST_DOWN: 1.5,
        JUMP_LEFT: 2.0, JUMP_RIGHT: 2.0, JUMP_UP: 2.0, JUMP_DOWN: 2.0,
    }
    WALK_ACTIONS = {WALK_LEFT, WALK_RIGHT, WALK_UP, WALK_DOWN}
    BOOST_ACTIONS = {BOOST_LEFT, BOOST_RIGHT, BOOST_UP, BOOST_DOWN}
    JUMP_ACTIONS = {JUMP_LEFT, JUMP_RIGHT, JUMP_UP, JUMP_DOWN}

    # perform action return statuses
    SUCCESS = 0
    GAME_OVER = 2

    def __init__(self, filename):
        """
        Parse the supplied testcase file and initialise the environment.
        """
        try:
            with open(filename, 'r') as f:
                lines = [line.rstrip('\n') for line in f]
        except FileNotFoundError:
            assert False, '/!\\ ERROR: Testcase file not found'

        cleaned = []
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith('#'):
                continue
            cleaned.append(stripped)

        assert len(cleaned) >= 9, '/!\\ ERROR: Invalid input file - expected header and grid data'

        try:
            self.n_rows, self.n_cols = tuple(int(x) for x in cleaned[0].split(','))
            self.num_rocket_jumps = int(cleaned[1])
            self.min_samples = int(cleaned[2])
            self.storm_direction = cleaned[3].upper()
            self.storm_directional_cost = float(cleaned[4])
            self.cost_min_tgt, self.cost_max_tgt = tuple(float(x) for x in cleaned[5].split(','))
            self.nodes_min_tgt, self.nodes_max_tgt = tuple(float(x) for x in cleaned[6].split(','))
            self.ucs_time_min_tgt, self.ucs_time_max_tgt = tuple(float(x) for x in cleaned[7].split(','))
            self.a_star_time_min_tgt, self.a_star_time_max_tgt = tuple(float(x) for x in cleaned[8].split(','))
        except (ValueError, IndexError):
            assert False, '/!\\ ERROR: Invalid input file - malformed header values'

        grid_lines = cleaned[9:9 + self.n_rows]
        assert len(grid_lines) == self.n_rows, '/!\\ ERROR: Invalid input file - incorrect number of map rows - expected {} but got {}'.format(self.n_rows, len(grid_lines))

        self.grid_data = []
        self.init_row, self.init_col = None, None
        self.crystal_positions = []
        self.launch_positions = []

        for r, row in enumerate(grid_lines):
            chars = list(row)
            assert len(chars) == self.n_cols, '/!\\ ERROR: Invalid input file - incorrect map row length - expected {} but got {}'.format(self.n_cols, len(chars))
            for c, ch in enumerate(chars):
                if ch == self.ROVER_TILE:
                    assert self.init_row is None and self.init_col is None, '/!\\ ERROR: Invalid input file - more than one initial player position'
                    self.init_row, self.init_col = r, c
                    chars[c] = self.GROUND_TILE
                elif ch == self.LAUNCH_TILE:
                    self.launch_positions.append((r, c))
                    chars[c] = self.LAUNCH_TILE
                elif ch == self.CRYSTAL_TILE:
                    self.crystal_positions.append((r, c))
                    chars[c] = self.GROUND_TILE
            self.grid_data.append(chars)

        assert self.init_row is not None and self.init_col is not None, '/!\\ ERROR: Invalid input file - No player initial position'
        assert len(self.launch_positions) > 0, '/!\\ ERROR: Invalid input file - No launch position'

        self.n_crystals = len(self.crystal_positions)
        self.all_crystals_tuple = tuple([1 for _ in range(self.n_crystals)])
        self.ACTION_COST = self._build_action_costs()

    def _build_action_costs(self):
        action_costs = {}
        for action, base_cost in self.ACTION_BASE_COST.items():
            direction = self._action_direction(action)
            if direction is None:
                cost = base_cost
            elif direction == self.storm_direction:
                cost = base_cost - self.storm_directional_cost
            elif direction == self._opposite_direction(self.storm_direction):
                cost = base_cost + self.storm_directional_cost
            else:
                cost = base_cost
            action_costs[action] = cost
        return action_costs

    def _action_direction(self, action):
        mapping = {
            self.WALK_LEFT: 'LEFT', self.BOOST_LEFT: 'LEFT', self.JUMP_LEFT: 'LEFT',
            self.WALK_RIGHT: 'RIGHT', self.BOOST_RIGHT: 'RIGHT', self.JUMP_RIGHT: 'RIGHT',
            self.WALK_UP: 'UP', self.BOOST_UP: 'UP', self.JUMP_UP: 'UP',
            self.WALK_DOWN: 'DOWN', self.BOOST_DOWN: 'DOWN', self.JUMP_DOWN: 'DOWN',
        }
        return mapping.get(action)

    def _opposite_direction(self, direction):
        return {
            'LEFT': 'RIGHT',
            'RIGHT': 'LEFT',
            'UP': 'DOWN',
            'DOWN': 'UP',
        }.get(direction)

    def get_init_state(self):
        """
        Get a state representation instance for the initial state.
        :return: initial state
        """
        state = GameState(self.init_row, self.init_col, tuple(0 for _ in self.crystal_positions), self.num_rocket_jumps)
        return state

    def perform_action(self, state, action):
        """
        Perform the given action on the given state and return whether the action was successful
        plus the resulting new state.
        """
        success, error_msg, next_row, next_col = self.is_valid_action(state, action)
        if not success:
            return state.deepcopy(), False, error_msg

        next_crystal_status = list(state.crystal_status)
        if (next_row, next_col) in self.crystal_positions:
            index = self.crystal_positions.index((next_row, next_col))
            if next_crystal_status[index] == 0:
                next_crystal_status[index] = 1

        next_state = GameState(next_row, next_col, tuple(next_crystal_status), state.rocket_jumps_left)
        if action in self.JUMP_ACTIONS:
            next_state.rocket_jumps_left -= 1

        return next_state, True, None

    def is_solved(self, state):
        """
        Check if the game has been solved (i.e. player at exit and minimum number of crystals collected)
        :param state: current GameState
        :return: True if solved, False otherwise
        """
        collected = sum(state.crystal_status)
        return (state.row, state.col) in self.launch_positions and collected >= self.min_samples

    def is_game_over(self, state):
        """
        The game is over if the player is in a crater and has no rocket jumps left.
        :param state: current GameState
        :return: True if game is over, False otherwise
        """
        return self.grid_data[state.row][state.col] == self.CRATER_TILE and state.rocket_jumps_left == 0

    def render(self, state):
        """
        Render the map's current state to terminal.
        """
        for r in range(self.n_rows):
            line = ''
            for c in range(self.n_cols):
                if state.row == r and state.col == c:
                    line += 'P'
                elif (r, c) in self.launch_positions:
                    line += 'E'
                elif (r, c) in self.crystal_positions and state.crystal_status[self.crystal_positions.index((r, c))] == 0:
                    line += 'C'
                else:
                    line += self.grid_data[r][c]
            print(line)
        print('\n' * 2)

    def get_valid_actions(self, state):
        """
        Get a list of valid actions from the given state.
        :param state: current GameState
        :return: list of valid action strings
        """
        valid_actions = []
        for action in self.ACTIONS:
            valid, error_msg, next_row, next_col = self.is_valid_action(state, action)
            if valid:
                valid_actions.append(action)
        return valid_actions

    def is_valid_action(self, state, action):
        """
        Check if the given action is valid from the given state.
        :param state: current GameState
        :param action: action string
        :return: True if valid, False otherwise
        """
        error_msg = None
        if action not in self.ACTIONS:
            error_msg = "Invalid action"
            return False, error_msg, None, None
        if action in self.JUMP_ACTIONS:
            if self.grid_data[state.row][state.col] != self.CRATER_TILE or state.rocket_jumps_left <= 0:
                error_msg = "Cannot perform rocket jump"
                return False, error_msg, None, None
            direction = self._action_direction(action)
            if direction == 'LEFT':
                delta_row, delta_col = 0, -1
            elif direction == 'RIGHT':
                delta_row, delta_col = 0, 1
            elif direction == 'UP':
                delta_row, delta_col = -1, 0
            elif direction == 'DOWN':
                delta_row, delta_col = 1, 0
            next_row = state.row + delta_row
            next_col = state.col + delta_col
            if not (0 <= next_row < self.n_rows and 0 <= next_col < self.n_cols):
                error_msg = "Cannot perform rocket jump: out of bounds"
                return False, error_msg, None, None
            if self.grid_data[next_row][next_col] == self.ROCK_TILE:
                error_msg = "Cannot perform rocket jump: rock in the way"
                return False, error_msg, None, None

        if action in self.BOOST_ACTIONS or action in self.WALK_ACTIONS:
            if self.grid_data[state.row][state.col] == self.CRATER_TILE:
                error_msg = "Cannot perform action: in a crater"
                return False, error_msg, None, None

            direction = self._action_direction(action)
            if direction == 'LEFT':
                delta_row, delta_col = 0, -1
            elif direction == 'RIGHT':
                delta_row, delta_col = 0, 1
            elif direction == 'UP':
                delta_row, delta_col = -1, 0
            elif direction == 'DOWN':
                delta_row, delta_col = 1, 0
            next_row = state.row + delta_row
            next_col = state.col + delta_col
            if not (0 <= next_row < self.n_rows and 0 <= next_col < self.n_cols):
                error_msg = "Cannot perform action: out of bounds"
                return False, error_msg, None, None
            if self.grid_data[next_row][next_col] == self.ROCK_TILE:
                error_msg = "Cannot perform action: rock in the way"
                return False, error_msg, None, None

            if action in self.BOOST_ACTIONS:
                # if it a boost action, check if you have fallen into a crater
                if self.grid_data[next_row][next_col] == self.CRATER_TILE:
                    return True, None, next_row, next_col

                next_row += delta_row
                next_col += delta_col
                if not (0 <= next_row < self.n_rows and 0 <= next_col < self.n_cols):
                    error_msg = "Cannot perform boost: out of bounds"
                    return False, error_msg, None, None
                if self.grid_data[next_row][next_col] == self.ROCK_TILE:
                    error_msg = "Cannot perform boost: rock in the way"
                    return False, error_msg, None, None

        return True, None, next_row, next_col