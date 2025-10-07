import { Puzzle } from "./lib/puzzles";

export function validate_puzzle(p: Puzzle): boolean {
    // check each word
    for (const word of p.words) {
        const positions = p.wordPositions[word];
        if (!positions) {
            // console.error(`Word "${word}" not found in wordPositions map`);
            return false;
        }

        if (positions.length !== word.length) {
            // console.error(
            //     `Word "${word}" has ${word.length} letters but ${positions.length} positions`,
            // );
            return false;
        }

        // each letter's position should match the value in the 2d grid of the puzzle
        for (let i = 0; i < word.length; i++) {
            const [row, col] = positions[i];
            const expectedLetter = word[i];
            const gridLetter = p.grid[row][col];

            if (gridLetter !== expectedLetter) {
                // console.error(
                //     `Word "${word}" position [${row},${col}] expected "${expectedLetter}" but grid has "${gridLetter}"`,
                // );
                return false;
            }
        }

        // each word cannot have letters in the same place
        const positionStrings = positions.map(([r, c]) => `${r},${c}`);
        const uniquePositions = new Set(positionStrings);
        if (uniquePositions.size !== positions.length) {
            // console.error(`Word "${word}" has duplicate positions`);
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
                // console.error(
                //     `Word "${word}" has non-adjacent letters at positions [${row1},${col1}] and [${row2},${col2}]`,
                // );
                return false;
            }
        }

        // determine the direction of the word and check for extra letters
        if (positions.length >= 2) {
            const [firstRow, firstCol] = positions[0];
            const [secondRow, secondCol] = positions[1];

            // calculate direction vector
            const deltaRow = secondRow - firstRow;
            const deltaCol = secondCol - firstCol;

            // check position before first letter
            const beforeRow = firstRow - deltaRow;
            const beforeCol = firstCol - deltaCol;
            if (beforeRow >= 0 && beforeRow < 8 && beforeCol >= 0 && beforeCol < 8) {
                const beforeLetter = p.grid[beforeRow][beforeCol];
                if (beforeLetter && beforeLetter !== " ") {
                    // console.error(
                    //     `Word "${word}" has extra letter "${beforeLetter}" before start at position [${beforeRow},${beforeCol}]`,
                    // );
                    return false;
                }
            }

            // check position after last letter
            const [lastRow, lastCol] = positions[positions.length - 1];
            const afterRow = lastRow + deltaRow;
            const afterCol = lastCol + deltaCol;
            if (afterRow >= 0 && afterRow < 8 && afterCol >= 0 && afterCol < 8) {
                const afterLetter = p.grid[afterRow][afterCol];
                if (afterLetter && afterLetter !== " ") {
                    // console.error(
                    //     `Word "${word}" has extra letter "${afterLetter}" after end at position [${afterRow},${afterCol}]`,
                    // );
                    return false;
                }
            }
        }
    }

    return true;
}
