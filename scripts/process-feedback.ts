import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { stdin as input, stdout as output } from "node:process";
import { spawnSync } from "node:child_process";
import readline from "node:readline/promises";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import { desc, gte, inArray } from "drizzle-orm";
import { feedback } from "../server/schema.ts";
import { DICTIONARY } from "../lib/dictionary.ts";

const { Pool } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, "..");

type FeedbackRow = {
  id: number;
  username: string;
  feedback: string;
  submittedAt: Date;
};

type ActionType = "add" | "remove" | "skip" | "ignore" | "quit";

type DictionaryMap = Record<number, string[]>;

function loadEnv(projectRoot: string): void {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(".env file not found at project root");
  }

  dotenv.config({ path: envPath });

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === null || databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required in .env");
  }
}

function parseNumberArg(args: string[], flag: string): number | null {
  const flagIndex = args.indexOf(flag);
  if (flagIndex === -1) {
    return null;
  }

  const value = args[flagIndex + 1];
  if (value === null || value === undefined) {
    throw new Error(`Missing value for ${flag}`);
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number for ${flag}: ${value}`);
  }

  return parsed;
}

function normalizeWord(inputText: string): string | null {
  const trimmed = inputText.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const upper = trimmed.toUpperCase();
  const isAlpha = /^[A-Z]+$/.test(upper);
  if (!isAlpha) {
    return null;
  }

  return upper;
}

function loadDictionaries(): DictionaryMap {
  const result: DictionaryMap = {};
  const lengths = [3, 4, 5, 6, 7];

  for (const length of lengths) {
    const words = DICTIONARY[length];
    if (words === null || words === undefined) {
      throw new Error(`Dictionary for length ${length} is missing`);
    }
    result[length] = [...words];
  }

  return result;
}

function sortUnique(words: string[]): string[] {
  const unique = Array.from(new Set(words.map((word) => word.toUpperCase())));
  unique.sort();
  return unique;
}

function applyDictionaryChange(
  dictionaries: DictionaryMap,
  action: "add" | "remove",
  word: string,
): { updated: boolean; message: string } {
  const length = word.length;
  const list = dictionaries[length];

  if (list === null || list === undefined) {
    return { updated: false, message: `No dictionary for word length ${length}` };
  }

  if (action === "add") {
    if (list.includes(word)) {
      return { updated: false, message: `${word} already exists in dictionary_${length}` };
    }
    list.push(word);
    dictionaries[length] = sortUnique(list);
    return { updated: true, message: `Added ${word} to dictionary_${length}` };
  }

  const index = list.indexOf(word);
  if (index === -1) {
    return { updated: false, message: `${word} not found in dictionary_${length}` };
  }

  list.splice(index, 1);
  dictionaries[length] = sortUnique(list);
  return { updated: true, message: `Removed ${word} from dictionary_${length}` };
}

function writeDictionaryFiles(projectRoot: string, dictionaries: DictionaryMap): void {
  const lengths = [3, 4, 5, 6, 7];

  for (const length of lengths) {
    const words = dictionaries[length];
    if (words === null || words === undefined) {
      throw new Error(`Dictionary for length ${length} is missing`);
    }

    const filePath = path.join(projectRoot, "lib", `dictionary_${length}.ts`);
    const content = `export const DICTIONARY_${length} = [\n${words
      .map((word) => `  \"${word}\",`)
      .join("\n")}\n];\n`;

    fs.writeFileSync(filePath, content, "utf-8");
  }
}

async function promptForAction(
  rl: readline.Interface,
  row: FeedbackRow,
): Promise<ActionType> {
  while (true) {
    const answer = await rl.question(
      `Action for feedback ${row.id}? (a=add, r=remove, i=ignore, s=skip, q=quit): `,
    );
    const normalized = answer.trim().toLowerCase();

    if (normalized === "a" || normalized === "add") {
      return "add";
    }

    if (normalized === "r" || normalized === "remove") {
      return "remove";
    }

    if (normalized === "s" || normalized === "skip") {
      return "skip";
    }

    if (normalized === "i" || normalized === "ignore") {
      return "ignore";
    }

    if (normalized === "q" || normalized === "quit") {
      return "quit";
    }

    console.log("Invalid input. Please enter a, r, i, s, or q.");
  }
}

async function promptForWord(
  rl: readline.Interface,
  action: "add" | "remove",
): Promise<string | null> {
  while (true) {
    const answer = await rl.question(`Type the word to ${action} (blank to cancel): `);
    const normalized = normalizeWord(answer);

    if (normalized === null || normalized === undefined) {
      if (answer.trim().length === 0) {
        return null;
      }
      console.log("Invalid word. Use A-Z letters only.");
      continue;
    }

    if (normalized.length < 3 || normalized.length > 7) {
      console.log("Word length must be between 3 and 7 characters.");
      continue;
    }

    return normalized;
  }
}

function runCommand(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { stdio: "inherit", cwd });
  if (result.error !== null && result.error !== undefined) {
    throw result.error;
  }
  if (result.status !== 0 && result.status !== null) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const daysArg = parseNumberArg(args, "--days");
  const limitArg = parseNumberArg(args, "--limit");
  const shouldDeploy = args.includes("--deploy");

  const days = daysArg ?? 7;
  if (days <= 0) {
    throw new Error("--days must be greater than 0");
  }

  loadEnv(PROJECT_ROOT);

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === null || databaseUrl === undefined) {
    throw new Error("DATABASE_URL is required in .env");
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);
  const rl = readline.createInterface({ input, output });

  try {
    const since = new Date();
    since.setDate(since.getDate() - days);

    let query = db
      .select()
      .from(feedback)
      .where(gte(feedback.submittedAt, since))
      .orderBy(desc(feedback.submittedAt));

    if (limitArg !== null && limitArg !== undefined) {
      if (limitArg <= 0) {
        throw new Error("--limit must be greater than 0");
      }
      query = query.limit(limitArg);
    }

    const rows = (await query) as FeedbackRow[];

    if (rows.length === 0) {
      console.log("No feedback found for the requested window.");
      return;
    }

    const dictionaries = loadDictionaries();
    const actionedIds: number[] = [];
    let dictionaryChanged = false;

    console.log(`Loaded ${rows.length} feedback items from the last ${days} days.`);

    for (const row of rows) {
      console.log("\n----------------------------------------");
      console.log(`ID: ${row.id}`);
      console.log(`User: ${row.username}`);
      const submittedAt = row.submittedAt;
      const submittedAtText =
        submittedAt === null || submittedAt === undefined
          ? "unknown"
          : submittedAt.toISOString();
      console.log(`Submitted: ${submittedAtText}`);
      console.log(`Feedback: ${row.feedback}`);

      const action = await promptForAction(rl, row);

      if (action === "quit") {
        console.log("Stopping early by request.");
        break;
      }

      if (action === "ignore") {
        actionedIds.push(row.id);
        console.log("Ignored feedback; removing entry from database.");
        continue;
      }

      if (action === "skip") {
        continue;
      }

      const word = await promptForWord(rl, action);
      if (word === null || word === undefined) {
        console.log("No word entered; skipping this feedback.");
        continue;
      }

      const result = applyDictionaryChange(dictionaries, action, word);
      console.log(result.message);
      if (result.updated) {
        dictionaryChanged = true;
        actionedIds.push(row.id);
      } else {
        console.log("No dictionary change applied; leaving feedback in the database.");
      }
    }

    if (dictionaryChanged) {
      console.log("\nWriting updated dictionary files...");
      writeDictionaryFiles(PROJECT_ROOT, dictionaries);
    } else {
      console.log("\nNo dictionary changes to write.");
    }

    if (actionedIds.length > 0) {
      console.log(`\nDeleting ${actionedIds.length} actioned feedback rows...`);
      await db.delete(feedback).where(inArray(feedback.id, actionedIds));
    } else {
      console.log("\nNo feedback items were actioned.");
    }

    if (shouldDeploy) {
      console.log("\nDeploy requested, but deploy steps are currently disabled.");
      // Uncomment when ready to deploy:
      // runCommand("bash", ["scripts/build.sh"], PROJECT_ROOT);
      // runCommand("bash", ["scripts/deploy-full.sh"], PROJECT_ROOT);
    }
  } finally {
    rl.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Error processing feedback:", error);
  process.exitCode = 1;
});
