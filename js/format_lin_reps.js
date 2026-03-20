function formatLinearRepAsMagma(rep) {
  const header = [
    "/*",
    `Online Atlas of Group Representations, version ${rep.atlas_version}.`,
    "",
    `${renderMath(rep.name, "plain")}`,
    "",
    `Type: ${rep.irreducibility}.`,
    "",
    `${rep.sources || ""}`,
    "*/\n"
  ];

  const tag = rep.field > 9 ? 3 : 1;

  const body = [
    `F:=GF(${rep.field});`,
    ``,
    `G:=MatrixGroup<${rep.dimension},F|`
  ];

  const matrices = rep.values || [];
  const formatMatrix = (matrix) => {
    if (rep.field <= 9) {
      // Cambridge tag 1: compact string-per-row format
      const rows = matrix.map(row => `"${row.join("")}"`);
      return `CambridgeMatrix(1,F,${rep.dimension},[\n  ${rows.join(",\n  ")}\n])`;
    } else {
      // Cambridge tag 3: list of integer rows
    const rowLines = matrix.map(row => "  " + row.join(","));
    return `CambridgeMatrix(3,F,${rep.dimension},[\n${rowLines.join(",\n")}\n])`;
    }
  };

  const matrixBlocks = matrices.map(formatMatrix);

  body.push(matrixBlocks.join(",\n"), ">;");
  body.push(`print "Group G is ${extractGroupSymbol(rep.name)} < GL(${rep.dimension},${rep.field})";`);

  return [...header, ...body].join("\n");
}
