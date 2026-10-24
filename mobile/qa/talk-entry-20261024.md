# TALK menu entry

- Pressing TALK from another tab clears old post params and sends the existing reselect/reset event. Initial mount also gets a refresh token.
- Re-pressing TALK retains its existing reset behavior.
- Stack back from a detail does not execute tab onPress, preserving list state.
- Both iOS and Android need a new native build for previously mounted tab switching. Web fresh-navigation reset is deployed separately.
- Physical device QA: TALK binder tab + scroll > MY > TALK = All/top; detail > header back = prior tab/scroll.
