"""Explicit state machines for reviewed records.

Each workflow lists every allowed move. Services call `check()` while holding
a row lock (select_for_update), so two reviewers acting at once are applied
one after the other and the second sees the first one's result.
"""


class InvalidTransition(Exception):
    """The requested status change is not allowed from the current status."""

    def __init__(self, message):
        super().__init__(message)
        self.message = message


class Workflow:
    def __init__(self, name, transitions, labels):
        self.name = name
        self.transitions = {state: frozenset(targets) for state, targets in transitions.items()}
        self.labels = dict(labels)

    def allowed(self, current):
        """Statuses reachable from `current`, in declaration order of `labels`."""
        targets = self.transitions.get(current, frozenset())
        return [state for state in self.labels if state in targets]

    def is_final(self, state):
        return not self.transitions.get(state)

    def check(self, current, target):
        if target not in self.labels:
            raise InvalidTransition(f"'{target}' is not a valid {self.name} status.")
        if target not in self.transitions.get(current, ()):
            raise InvalidTransition(
                f"A {self.name} that is {self.labels[current].lower()} cannot be moved to {self.labels[target].lower()}."
            )
