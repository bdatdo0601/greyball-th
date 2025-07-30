/**
 * Myers diff algorithm implementation for better change detection
 * Based on Eugene Myers' "An O(ND) Difference Algorithm and Its Variations" (1986)
 */
// Diff operation types
export interface DiffOperation {
  operation: "equal" | "delete" | "insert";
  text: string;
  oldIndex?: number;
  newIndex?: number;
}

interface EditScript {
  operations: Array<{
    type: "insert" | "delete" | "equal";
    oldStart: number;
    oldEnd: number;
    newStart: number;
    newEnd: number;
    text: string;
  }>;
}

export class MyersDiff {
  /**
   * Compute the shortest edit script between two sequences using Myers algorithm
   */
  static computeDiff<T>(
    oldSeq: T[],
    newSeq: T[],
    equals: (a: T, b: T) => boolean = (a, b) => a === b,
  ): EditScript {
    const N = oldSeq.length;
    const M = newSeq.length;
    const MAX = N + M;

    // V array stores the furthest reaching x values for each k-line
    const V: { [k: number]: number } = {};
    const trace: Array<{ [k: number]: number }> = [];

    V[1] = 0;

    for (let D = 0; D <= MAX; D++) {
      // Save current V for backtracking
      trace.push({ ...V });

      for (let k = -D; k <= D; k += 2) {
        let x: number;

        // Determine if we came from above (delete) or left (insert)
        if (k === -D || (k !== D && V[k - 1] < V[k + 1])) {
          x = V[k + 1]; // came from above (delete from old)
        } else {
          x = V[k - 1] + 1; // came from left (insert to new)
        }

        let y = x - k;

        // Follow diagonal as far as possible (equal elements)
        while (x < N && y < M && equals(oldSeq[x], newSeq[y])) {
          x++;
          y++;
        }

        V[k] = x;

        // Check if we've reached the end
        if (x >= N && y >= M) {
          return MyersDiff.backtrack(oldSeq, newSeq, trace, equals);
        }
      }
    }

    // Fallback - shouldn't reach here with correct algorithm
    return { operations: [] };
  }

  /**
   * Backtrack through the trace to construct the edit script
   */
  private static backtrack<T>(
    oldSeq: T[],
    newSeq: T[],
    trace: Array<{ [k: number]: number }>,
    equals: (a: T, b: T) => boolean,
  ): EditScript {
    const operations: EditScript["operations"] = [];
    let x = oldSeq.length;
    let y = newSeq.length;

    for (let D = trace.length - 1; D >= 0; D--) {
      const V = trace[D];
      const k = x - y;

      let prevK: number;
      let prevX: number;
      let prevY: number;

      if (k === -D || (k !== D && V[k - 1] < V[k + 1])) {
        prevK = k + 1;
      } else {
        prevK = k - 1;
      }

      prevX = V[prevK];
      prevY = prevX - prevK;

      // Follow diagonal backwards
      while (x > prevX && y > prevY) {
        // Equal elements - add to front of operations
        operations.unshift({
          type: "equal",
          oldStart: x - 1,
          oldEnd: x,
          newStart: y - 1,
          newEnd: y,
          text: MyersDiff.sequenceToString([oldSeq[x - 1]]),
        });
        x--;
        y--;
      }

      if (D > 0) {
        if (x > prevX) {
          // Delete operation
          operations.unshift({
            type: "delete",
            oldStart: prevX,
            oldEnd: x,
            newStart: y,
            newEnd: y,
            text: MyersDiff.sequenceToString(oldSeq.slice(prevX, x)),
          });
        } else if (y > prevY) {
          // Insert operation
          operations.unshift({
            type: "insert",
            oldStart: x,
            oldEnd: x,
            newStart: prevY,
            newEnd: y,
            text: MyersDiff.sequenceToString(newSeq.slice(prevY, y)),
          });
        }

        x = prevX;
        y = prevY;
      }
    }

    return { operations };
  }

  /**
   * Convert sequence to string representation
   */
  private static sequenceToString<T>(seq: T[]): string {
    return seq.map((item) => String(item)).join("");
  }

  /**
   * Diff two strings using Myers algorithm with character-level granularity
   */
  static diffStrings(oldText: string, newText: string): DiffOperation[] {
    const oldChars = Array.from(oldText);
    const newChars = Array.from(newText);

    const editScript = MyersDiff.computeDiff(oldChars, newChars);
    const diffOps: DiffOperation[] = [];

    for (const op of editScript.operations) {
      switch (op.type) {
        case "equal":
          diffOps.push({
            operation: "equal",
            text: op.text,
          });
          break;
        case "delete":
          diffOps.push({
            operation: "delete",
            text: op.text,
            oldIndex: op.oldStart,
          });
          break;
        case "insert":
          diffOps.push({
            operation: "insert",
            text: op.text,
            newIndex: op.newStart,
          });
          break;
      }
    }

    return MyersDiff.consolidateOperations(diffOps);
  }

  /**
   * Diff two strings using Myers algorithm with word-level granularity
   */
  static diffWords(oldText: string, newText: string): DiffOperation[] {
    const oldWords = MyersDiff.splitIntoWords(oldText);
    const newWords = MyersDiff.splitIntoWords(newText);

    const editScript = MyersDiff.computeDiff(oldWords, newWords);
    const diffOps: DiffOperation[] = [];
    let oldPos = 0;
    let newPos = 0;

    for (const op of editScript.operations) {
      switch (op.type) {
        case "equal":
          diffOps.push({
            operation: "equal",
            text: op.text,
          });
          oldPos += op.text.length;
          newPos += op.text.length;
          break;
        case "delete":
          diffOps.push({
            operation: "delete",
            text: op.text,
            oldIndex: oldPos,
          });
          oldPos += op.text.length;
          break;
        case "insert":
          diffOps.push({
            operation: "insert",
            text: op.text,
            newIndex: newPos,
          });
          newPos += op.text.length;
          break;
      }
    }

    return MyersDiff.consolidateOperations(diffOps);
  }

  /**
   * Split text into words while preserving whitespace and boundaries
   */
  private static splitIntoWords(text: string): string[] {
    const words: string[] = [];
    const regex = /(\S+|\s+)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
      words.push(match[0]);
    }

    return words;
  }

  /**
   * Consolidate consecutive operations of the same type
   */
  private static consolidateOperations(
    operations: DiffOperation[],
  ): DiffOperation[] {
    const consolidated: DiffOperation[] = [];
    let i = 0;

    while (i < operations.length) {
      const current = operations[i];

      if (current.operation === "equal") {
        // Consolidate consecutive equal operations
        let text = current.text;
        let j = i + 1;

        while (j < operations.length && operations[j].operation === "equal") {
          text += operations[j].text;
          j++;
        }

        consolidated.push({
          operation: "equal",
          text,
        });
        i = j;
      } else if (current.operation === "delete") {
        // Consolidate consecutive delete operations
        let text = current.text;
        const startIndex = current.oldIndex;
        let j = i + 1;

        while (j < operations.length && operations[j].operation === "delete") {
          text += operations[j].text;
          j++;
        }

        consolidated.push({
          operation: "delete",
          text,
          oldIndex: startIndex,
        });
        i = j;
      } else if (current.operation === "insert") {
        // Consolidate consecutive insert operations
        let text = current.text;
        const startIndex = current.newIndex;
        let j = i + 1;

        while (j < operations.length && operations[j].operation === "insert") {
          text += operations[j].text;
          j++;
        }

        consolidated.push({
          operation: "insert",
          text,
          newIndex: startIndex,
        });
        i = j;
      } else {
        consolidated.push(current);
        i++;
      }
    }

    return consolidated;
  }
}
