CLAUDE.md

Understand docs/README.md and any subdocs related to the current prompt before starting any planning or work.
Ask clarifying questions.
List pros and cons if there are multiple possible approaches.
Estimate complexity of a given task.
Propose function signatures before implementing.
Propose solutions with the most minimal function signature changes.
Always use explicit null checks.
Always remove unused variables and imports. 
After writing code, inspect it and the surrounding code to DRY and make the code simpler and cleaner.
Update tests after changing backend code. Do not run or write tests for the frontend code.
Update relevant docs in docs/ after changing code. Update docs for both code/architecture changes as well as product changes to the game behavior or user experience.