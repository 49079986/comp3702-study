# Assignment 1 Support Code

This is the support code for COMP3702 2026 Assignment 1.

The following files are provided:

**game_env.py**

This file contains a class representing an Crystral Rover level environment, storing the 
dimensions of the environment, initial rover position, crater positions, rock positions, 
storm direction and cost, exit positions, crystal sample positions 
and the available actions. This also stores a time limit and cost target.

This file contains a number of functions which will be useful in developing your solver:

~~~~~
__init__(filename)
~~~~~
Constructs a new instance based on the given input filename.


~~~~~
get_init_state()
~~~~~
Returns a GameState object (see below) representing the initial state of the level.


~~~~~
perform_action(state, action)
~~~~~
Simulates the outcome of performing the given 'action' starting from the given 'state', where 'action' is an element of
GameEnv.ACTIONS and 'state' is a GameState object. Returns a tuple (next_state, success, error_msg), where next_state is a GameState Object,
success is True (if the action is valid and does not collide) and error_msg. 


~~~~~
is_solved(state)
~~~~~
Checks whether the given 'state' (a GameState object) is solved (i.e. minimum crystals collected and player at exit). Returns
True (solved) or False (not solved).


~~~~~
is_game_over(state)
~~~~~
Checks whether the given 'state' (a GameState object) results in Game Over (i.e. player is in a crater with no more boosts).
Returns True (Game Over) or False (not Game Over).


~~~~~
render(state)
~~~~~
Prints a graphical representation of the given 'state' (a GameState object) to the terminal.


**game_state.py**

This file contains a class representing a Crystal Rover state, storing the position of the player and the status
of all crystals in the level (1 for collected, 0 for remaining) and the number of rocket boosts remaining.

~~~~~
__init__(row, col, crystal_status, rocket_jumps_left)
~~~~~
Constructs a new GameState instance, where row and column are integers between 0 and n_rows, n_cols respectively,
crystal_status is a tuple of length n_crystals, where each element is 1 or 0 and rocket_jumps_left is an integer representing
the number of rocket jumps remaining.


**play_game.py**

This file contains a script which launches an interactive game session when run. Becoming familiar with the game
mechanics may be helpful in designing your solution.

The script takes 1 or 2 command line argument:
- input_filename, which must be a valid testcase file (e.g. one of the provided files in the testcases directory)
- --no-storm-particles (optional), to turn off the storm particle animation

When prompted for an action, type one of the available action strings (e.g. wr, wl, etc) and press enter to perform the
entered action.


**solution.py**

Template file for you to implement your solution to Assignment 1.

This file is called by tester.py

You will need to fill in the methods:
- search_ucs
- preprocess_heuristic (optional)
- compute_heuristic
- search_a_star

We recommend you implement UCS first, then attempt A* after your UCS implementation is working.


**tester.py**

This file contains a script which loads a given map file and tests your solution on it.

The script takes up to 4 command line arguments:
- search_type ('ucs' or 'a_star')
- input_filename, which must be a valid testcase file (e.g. one of the provided files in the testcases directory)
- -v (optional), to visualise the solution
- --no-storm-particles (optional), to turn off the storm particle animation

Use this script to evaluate your solution.


**testcases**

A directory containing input files which can be used to evaluate your solution.

The format of a testcase file is:
~~~~~
num_rows, num_cols
rocket jumps
min samples
storm direction
storm directional cost
cost_tgt
nodes_tgt
time_limit_UCS
time_limit_A*
grid_data (row 1)
...
grid_data (row num_rows)
~~~~~
Testcase files can contain comments, starting with '#', which are ignored by the input file parser.