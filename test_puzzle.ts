import { Puzzle, puzzles } from "./lib/puzzles";

export function validate_puzzle(p: Puzzle): boolean {
    // check each word
    for (const word of p.words) {
        const positions = p.wordPositions[word];
        if (!positions) {
            console.error(`Word "${word}" not found in wordPositions map`);
            return false;
        }

        if (positions.length !== word.length) {
            console.error(
                `Word "${word}" has ${word.length} letters but ${positions.length} positions`,
            );
            return false;
        }

        // each letter's position should match the value in the 2d grid of the puzzle
        for (let i = 0; i < word.length; i++) {
            const [row, col] = positions[i];
            const expectedLetter = word[i];
            const gridLetter = p.grid[row][col];

            if (gridLetter !== expectedLetter) {
                console.error(
                    `Word "${word}" position [${row},${col}] expected "${expectedLetter}" but grid has "${gridLetter}"`,
                );
                return false;
            }
        }

        // each word cannot have letters in the same place
        const positionStrings = positions.map(([r, c]) => `${r},${c}`);
        const uniquePositions = new Set(positionStrings);
        if (uniquePositions.size !== positions.length) {
            console.error(`Word "${word}" has duplicate positions`);
            return false;
        }

        // each word's letters must be adjacent either horizontally, vertically, or diagonally (in any direction)
        for (let i = 0; i < positions.length - 1; i++) {
            const [row1, col1] = positions[i];
            const [row2, col2] = positions[i + 1];

            const rowDiff = Math.abs(row2 - row1);
            const colDiff = Math.abs(col2 - col1);

            // Adjacent means difference of at most 1 in both row and col, and at least one must be 1
            const isAdjacent = rowDiff <= 1 && colDiff <= 1 && rowDiff + colDiff >= 1;

            if (!isAdjacent) {
                console.error(
                    `Word "${word}" has non-adjacent letters at positions [${row1},${col1}] and [${row2},${col2}]`,
                );
                return false;
            }
        }
    }

    return true;
}

function test_all_puzzles(): void {
    console.log("Testing all puzzles...\n");

    let totalPuzzles = 0;
    let validPuzzles = 0;

    // Test normal puzzles
    console.log("=== Normal Puzzles ===");
    for (const puzzle of puzzles.normal) {
        totalPuzzles++;
        console.log(`Testing "${puzzle.name}"...`);
        if (validate_puzzle(puzzle)) {
            console.log(`✓ "${puzzle.name}" is valid\n`);
            validPuzzles++;
        } else {
            console.log(`✗ "${puzzle.name}" is invalid\n`);
        }
    }

    // Test hard puzzles
    console.log("=== Hard Puzzles ===");
    for (const puzzle of puzzles.hard) {
        totalPuzzles++;
        console.log(`Testing "${puzzle.name}"...`);
        if (validate_puzzle(puzzle)) {
            console.log(`✓ "${puzzle.name}" is valid\n`);
            validPuzzles++;
        } else {
            console.log(`✗ "${puzzle.name}" is invalid\n`);
        }
    }

    console.log("\n=== Summary ===");
    console.log(`${validPuzzles}/${totalPuzzles} puzzles are valid`);

    if (validPuzzles === totalPuzzles) {
        console.log("🎉 All puzzles pass validation!");
    } else {
        console.log("❌ Some puzzles failed validation");
    }
}

// Run the tests
test_all_puzzles();
