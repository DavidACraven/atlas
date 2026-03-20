function formatPermutationRepAsMagma(rep) {
  const header = [
    "/*",
    `Online Atlas of Group Representations, version ${rep.atlas_version}.`,
    "",
    `${renderMath(rep.name, "plain")}.`,
    "",
    `Type111: ${rep.type}`,
  ];

  if ("rank" in rep) header.push(`Rank: ${rep.rank}`);
  if ("suborbit_lengths" in rep) header.push(`Suborbit lengths: [${rep.suborbit_lengths.join(",")}]`);

  header.push("", `${rep.sources}`, "*/\n");

  // Generators
  const gens = rep.generators?.array || [];
  //const genLines = gens.map(gen => "[" + gen.join(",") + "]");
  const genLines = gens.map(gen => wrapArray(gen));


  const magma = [
    ...header,
    `G<x,y>:=PermutationGroup<${rep.degree}|`,
    genLines.map((line, i) => `${line}${i < genLines.length - 1 ? ',' : ''}`).join("\n")` + `>;`,
    `print "Group G is ${extractGroupSymbol(rep.name)} < Sym(${rep.degree})";`
  ];

  return magma.join("\n");
}
