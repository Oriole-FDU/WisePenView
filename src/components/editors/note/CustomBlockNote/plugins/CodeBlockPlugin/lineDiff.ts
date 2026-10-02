export type CodeLineDiffEntry = {
  kind: 'equal' | 'delete' | 'insert';
  text: string;
  oldLineNumber?: number;
  newLineNumber?: number;
};

type LineDiffSegment = Pick<CodeLineDiffEntry, 'kind' | 'text'>;

const MAX_LINE_DIFF_CELLS = 250_000;

function splitCodeLines(code: string): string[] {
  return code ? code.split('\n') : [];
}

function buildLinearFallback(oldLines: readonly string[], newLines: readonly string[]) {
  let prefixLength = 0;
  while (
    prefixLength < oldLines.length &&
    prefixLength < newLines.length &&
    oldLines[prefixLength] === newLines[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < oldLines.length - prefixLength &&
    suffixLength < newLines.length - prefixLength &&
    oldLines[oldLines.length - 1 - suffixLength] === newLines[newLines.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  return [
    ...oldLines.slice(0, prefixLength).map((text) => ({ kind: 'equal' as const, text })),
    ...oldLines
      .slice(prefixLength, oldLines.length - suffixLength)
      .map((text) => ({ kind: 'delete' as const, text })),
    ...newLines
      .slice(prefixLength, newLines.length - suffixLength)
      .map((text) => ({ kind: 'insert' as const, text })),
    ...oldLines
      .slice(oldLines.length - suffixLength)
      .map((text) => ({ kind: 'equal' as const, text })),
  ];
}

function diffCodeLines(
  oldLines: readonly string[],
  newLines: readonly string[]
): LineDiffSegment[] {
  if (oldLines.length * newLines.length > MAX_LINE_DIFF_CELLS) {
    return buildLinearFallback(oldLines, newLines);
  }

  const matrix: number[][] = Array.from({ length: oldLines.length + 1 }, () =>
    Array(newLines.length + 1).fill(0)
  );
  for (let oldIndex = 1; oldIndex <= oldLines.length; oldIndex += 1) {
    for (let newIndex = 1; newIndex <= newLines.length; newIndex += 1) {
      matrix[oldIndex][newIndex] =
        oldLines[oldIndex - 1] === newLines[newIndex - 1]
          ? matrix[oldIndex - 1][newIndex - 1] + 1
          : Math.max(matrix[oldIndex - 1][newIndex], matrix[oldIndex][newIndex - 1]);
    }
  }

  const reversed: LineDiffSegment[] = [];
  let oldIndex = oldLines.length;
  let newIndex = newLines.length;
  while (oldIndex > 0 || newIndex > 0) {
    if (oldIndex > 0 && newIndex > 0 && oldLines[oldIndex - 1] === newLines[newIndex - 1]) {
      reversed.push({ kind: 'equal', text: oldLines[oldIndex - 1] });
      oldIndex -= 1;
      newIndex -= 1;
    } else if (
      newIndex > 0 &&
      (oldIndex === 0 || matrix[oldIndex][newIndex - 1] >= matrix[oldIndex - 1][newIndex])
    ) {
      reversed.push({ kind: 'insert', text: newLines[newIndex - 1] });
      newIndex -= 1;
    } else {
      reversed.push({ kind: 'delete', text: oldLines[oldIndex - 1] });
      oldIndex -= 1;
    }
  }
  return reversed.reverse();
}

/** 按完整代码行比较，行号分别跟随旧版本与新版本递增。 */
export function buildCodeLineDiff(oldCode: string, newCode: string): CodeLineDiffEntry[] {
  let oldLineNumber = 1;
  let newLineNumber = 1;
  return diffCodeLines(splitCodeLines(oldCode), splitCodeLines(newCode)).map((entry) => {
    if (entry.kind === 'equal') {
      const result = { ...entry, oldLineNumber, newLineNumber };
      oldLineNumber += 1;
      newLineNumber += 1;
      return result;
    }
    if (entry.kind === 'delete') {
      const result = { ...entry, oldLineNumber };
      oldLineNumber += 1;
      return result;
    }
    const result = { ...entry, newLineNumber };
    newLineNumber += 1;
    return result;
  });
}
