"""
game_state.py

This file contains a class representing an Crystal Rover game state. You should make use of this class in your solver.

COMP3702 Assignment 1 "Crystal Rover" Support Code

Last updated by vp 03/08/26
"""


class GameState:
    """
    Instance of an Crystal Rover game state. row and col represent the current player position. crystal_status is 1 for
    each collected crystal, and 0 for each remaining crystal and number of rocket jumps left.
    """

    def __init__(self, row, col, crystal_status, rocket_jumps_left):
        self.row = row
        self.col = col
        assert isinstance(crystal_status, tuple), '!!! crystal_status should be a tuple !!!'
        self.crystal_status = crystal_status
        self.rocket_jumps_left = rocket_jumps_left

    def __eq__(self, other):
        if not isinstance(other, GameState):
            return False
        return self.row == other.row and self.col == other.col and self.crystal_status == other.crystal_status and self.rocket_jumps_left == other.rocket_jumps_left

    def __hash__(self):
        return hash((self.row, self.col, *self.crystal_status, self.rocket_jumps_left))

    def __repr__(self):
        return f'row: {self.row},\t\t col: {self.col},\t\t crystal status: {self.crystal_status},\t\t rocket jumps left: {self.rocket_jumps_left}'

    def deepcopy(self):
        return GameState(self.row, self.col, self.crystal_status, self.rocket_jumps_left)


