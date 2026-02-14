// perm_table.js

function viewPermutationRepresentation(rep,fmt) {
  const text = generatePermutationText(rep,fmt);

  const title = stripMathDelimiters(rep.name || "");

  const htmlContent = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: monospace; margin: 1rem; }
    pre { white-space: pre; overflow: auto; padding: 1rem; border: 1px solid #ccc; }
  </style>
</head>
<body>
  <pre>${escapeHtml(text)}</pre>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    console.warn("window.open returned null. This may be due to noopener security.");
  }

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function downloadPermutationRepresentation(rep, repInfo, fmt) {
  const text = generatePermutationText(rep, repInfo, fmt);

  const filename = permutationFilename(rep, repInfo, fmt);

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function permutationFilename(rep, fmt) {

  const ext =
    fmt === "Magma"  ? "m" :
    fmt === "GAP"    ? "g" :
    fmt === "Meataxe"? "" :   // decide later
    "txt";

  return `${rep.id}.${ext}`;
}

function generatePermutationText(rep, fmt) {
  switch (fmt) {
    case "Magma":
      return formatPermutationRepAsMagma(rep);
//    case "Meataxe":
//      return formatPermutationRepAsMeataxe(rep, repInfo);
//    case "Text":
//      return formatPermutationRepAsText(rep, repInfo);
    default:
      return `Format ${fmt} not implemented yet.`;
  }
}


//////////////////////////////
// Formatting the Rep
//////////////////////////////


function formatPermutationRepAsMagma(rep) {
  const header = [
    "/*",
    `Online Atlas of Group Representations, version ${rep.atlas_version}.`,
    "",
    `${stripMathDelimiters(rep.name)}.`,
    "",
    `Type: ${rep.type}`,
  ];

  if ("rank" in rep) header.push(`Rank: ${rep.rank}`);
  if ("suborbit_lengths" in rep) header.push(`Suborbit lengths: [${rep.suborbit_lengths.join(",")}]`);
  if (rep.sources) header.push("", String(rep.sources));
  header.push("*/", "");

  // Generators
  const gens = rep.generators?.array || [];
  const genLines = gens.map(gen => "\\[" + gen.join(",") + "]");
  //const genLines = gens.map(gen => wrapArray(gen));


  const magma = [
    ...header,
    `G<x,y>:=PermutationGroup<${rep.degree}|`,
    genLines.map((line, i) => `${line}${i < genLines.length - 1 ? ',' : ''}`).join("\n") + `>;`,
    `print "Group G is ${stripMathDelimiters(rep.name)} < Sym(${rep.degree})";`
  ];

  return magma.join("\n");
}


///////////////////////////
// Main function
///////////////////////////

async function displayPermTable(data) {
  if (!data?.representations?.permutation) return;

  const container = document.getElementById("perm-table");
  if (!container) return;

  const groupId = data.id;              // required
  const listFile = `./perm/${groupId}_perm_list.json`;

  const permList = await fetch(listFile, { cache: "no-store" }).then(r => {
    if (!r.ok) throw new Error(`Failed to fetch ${listFile}: ${r.status}`);
    return r.json();
  });

  await render();

  async function render() {
    const html = renderPermTable(permList);
    if (window.setHTML) {
      await setHTML(container, html);
    } else {
      container.innerHTML = html;
      if (window.typesetFresh) await typesetFresh(container);
    }
    wire();
  }

  function wire() {
    // Delegated click handling for View / Download / Details
    container.addEventListener("click", async (e) => {
      const viewBtn = e.target.closest(".perm-view");
      const dlBtn   = e.target.closest(".perm-dl");
      const detBtn  = e.target.closest(".perm-details");
      const btn = viewBtn || dlBtn || detBtn;
      if (!btn) return;

      const idx = Number(btn.dataset.permIndex);
      if (!Number.isFinite(idx)) return;

      const row = btn.closest("tr");
      const select = row ? row.querySelector(".perm-format") : null;
      const fmt = select ? select.value : "Magma";

      const entry = permList[idx];
      if (!entry?.file) return;

      const repPath = `./perm/${entry.file}`;

      if (detBtn) {
        const rep = await fetch(repPath, { cache: "no-store" }).then(r => {
          if (!r.ok) throw new Error(`Failed to fetch ${repPath}: ${r.status}`);
          return r.json();
        });

        viewPermutationDetails(rep, data.class_names || [],data.standard_generators || []);
        return;
      }

      // Fetch representation JSON only when needed
      const rep = await fetch(repPath, { cache: "no-store" }).then(r => {
        if (!r.ok) throw new Error(`Failed to fetch ${repPath}: ${r.status}`);
        return r.json();
      });

      if (viewBtn) viewPermutationRepresentation(rep, fmt);
      if (dlBtn) downloadPermutationRepresentation(rep, fmt);
    }, { passive: true });
  }
}

function renderPermTable(permList) {
  const rows = (permList || []).map((p, i) => {
    const desc = p.description ? renderMath(p.description) : "";
    const type = escapeHtml(p.type || "");
    const degree = escapeHtml(String(p.degree ?? ""));

    // Format dropdown: keep simple now. We’ll enable/disable later once we read rep.generators_format.
    const select = `
      <select class="perm-format">
        <option value="Magma">Magma</option>
        <option value="GAP">GAP</option>
        <option value="Text">Text</option>
        <option value="Cycle">Cycles</option>
        <option value="Array">Array</option>
      </select>
    `;

    const repActions = `
      ${select}
      <button type="button" class="perm-view" data-perm-index="${i}">View</button>
      <button type="button" class="perm-dl" data-perm-index="${i}">Download</button>
    `;

    const infoAction = `
      <button type="button" class="perm-details" data-perm-index="${i}">
        Details
      </button>
    `;


    return `
      <tr>
        <td style="text-align:right;">${degree}</td>
        <td>${type}</td>
        <td>${desc}</td>
        <td>${infoAction}</td>
        <td>${repActions}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="perm-table">
      <thead>
        <tr>
          <th>Degree</th>
          <th>Type</th>
          <th>Description</th>
          <th>More Info</th>
          <th>Representation</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="5">No permutation representations listed.</td></tr>`}
      </tbody>
    </table>
  `;
}

/* ---------------- View / Download / Details (stubs first) ---------------- */

function viewPermutationDetails(rep, classNames, standardGenerators) {
  const rank = rep.rank ?? "";
  const suborbits = Array.isArray(rep.suborbit_lengths) ? rep.suborbit_lengths : [];
  const stab = rep.point_stabilizer ?? "";
  const cycleTypes = Array.isArray(rep.cycle_types) ? rep.cycle_types : [];

  const repName = (rep.name || rep.id || "Permutation representation");
  const title = `Permutation representation details: ${repName}`;

  // Build cycle-type table rows aligned with classNames
  const n = Math.max(classNames.length, cycleTypes.length);
  let rows = "";
  for (let i = 0; i < n; i++) {
    const cls = classNames[i] ?? `#${i + 1}`;
    const ct  = cycleTypes[i] ?? "";
    rows += `<tr><td>${escapeHtml(cls)}</td><td>${formatPowerUp(ct)}</td></tr>`;
  }

  const mismatchNote =
    (classNames.length && cycleTypes.length && classNames.length !== cycleTypes.length)
      ? `<p style="margin-top:0.5rem; color:#a00;">
           Note: class_names has length ${classNames.length} but cycle_types has length ${cycleTypes.length}.
         </p>`
      : ``;

  const deg = Number(rep.degree);
  const cycles = Array.isArray(rep?.generators?.cycle) ? rep.generators.cycle : null;
  
  const labels = Array.isArray(standardGenerators)
    ? standardGenerators.map(x => Array.isArray(x) ? String(x[0] ?? "") : "").filter(Boolean)
    : [];
  
  const showCycles = Number.isFinite(deg) && deg < 101 && cycles && cycles.length;
  
  let cyclesHTML = "";
  if (showCycles) {
    const lines = cycles.map((cyc, i) => {
      const lab = labels[i] || `g${i + 1}`;
      return `${lab} = ${cyc}`;
    });

    cyclesHTML = `
      <h2>Generators as cycles</h2>
      <pre>${escapeHtml(lines.join("\n"))}</pre>
    `;
  }

  const htmlContent = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(title)}</title>
<!-- MathJax configuration -->
<script>
window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    processEscapes: true
  },
  chtml: {
    // Inherit font for all text-like math
    mtextInheritFont: true
  },
  options: {
    renderActions: { addMenu: [] }
  }
};
</script>
<script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-chtml.js" defer></script>

  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 1rem; }
    code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }
    table { border-collapse: collapse; border: 1px solid #444; margin-top: 0.75rem; }
    th, td { border: 1px solid #444; padding: 4px 6px; }
    th { background: #f3f3f3; text-align: left; }
    .meta { margin: 0.25rem 0; }
  </style>
</head>
<body>
  <h1 style="margin-top:0;">${renderMath(repName)}</h1>

  <div class="meta"><strong>Rank:</strong> ${escapeHtml(String(rank))}</div>
  <div class="meta"><strong>Suborbit lengths:</strong> ${escapeHtml(suborbits.join(", "))}</div>
  <div class="meta"><strong>Point stabilizer:</strong> ${renderMath(String(stab))}</div>


  ${cyclesHTML}

  <h2>Cycle types by conjugacy class</h2>
  ${mismatchNote}
  <table>
    <thead>
      <tr><th>Class</th><th>Cycle type</th></tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="2">No cycle type data available.</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([htmlContent], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  window.open(url, "_blank", "noopener,noreferrer");

  setTimeout(() => URL.revokeObjectURL(url), 10000);
}


