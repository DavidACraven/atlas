// lin_table.js

function viewLinearRepresentation(rep,fmt) {
  const text = generateLinearText(rep,fmt);

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

function downloadLinearRepresentation(rep, fmt) {
  const text = generateLinearText(rep, fmt);

  const filename = linearFilename(rep, fmt);

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

function linearFilename(rep, fmt) {

  const ext =
    fmt === "Magma"  ? "m" :
    fmt === "GAP"    ? "g" :
    fmt === "Meataxe"? "" :   // decide later
    "txt";

  return `${rep.id}.${ext}`;
}

function generateLinearText(rep, fmt) {
  switch (fmt) {
    case "Magma":
      return formatLinearRepresentationAsMagma(rep);
//    case "Meataxe":
//      return formatLinearRepresentationAsMeataxe(rep, repInfo);
//    case "Text":
//      return formatLinearRepresentationAsText(rep, repInfo);
    default:
      return `Format ${fmt} not implemented yet.`;
  }
}

function formatLinearRepresentationAsMagma(rep) {
  const header = [
    "/*",
    `Online Atlas of Group Representations, version ${rep.atlas_version}.`,
    "",
    `${stripMathDelimiters(rep.name)}`,
    "",
    `Type: ${rep.irreducibility}.`,
    ...(Object.hasOwn(rep,"1-cohomology") ? [`1-cohomology dimension: ${rep["1-cohomology"]}.`] : []),
    ...(Object.hasOwn(rep,"2-cohomology") ? [`2-cohomology dimension: ${rep["2-cohomology"]}.`] : []),

    "",
    `${rep.sources || ""}`,
    "*/\n"
  ];

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
  body.push(`print "Group G is ${extractFirstMathFragment(rep.name)} < GL(${rep.dimension},${rep.field})";`);

  return [...header, ...body].join("\n");
}



////////////////////////////////
// Main program
////////////////////////////////

async function displayLinTable(data) {
  const container = document.getElementById("lin-table");
  if (!container) return;

  const groupId = data.id;              // required
  const listFile = `./lin/${groupId}_lin_list.json`;

  const linList = await fetch(listFile, { cache: "no-store" }).then(r => {
    if (!r.ok) throw new Error(`Failed to fetch ${listFile}: ${r.status}`);
    return r.json();
  });

// 1. Identify all unique characteristics present in the data
  const uniqueChars = [...new Set(linList.map(r => r.characteristic))].sort((a, b) => a - b);

  // 2. Initialize UI state
  const state = {
    showCohomology1: false,
    showCohomology2: false,
    // Initialize all found characteristics to true (checked)
    visibleChars: Object.fromEntries(uniqueChars.map(c => [c, true]))
  };

  await render();

  async function render() {
    // Preserve accordion state
    const oldAccordion = container.querySelector(".controls-accordion");
    const wasOpen = oldAccordion ? oldAccordion.open : false;

    const html = `
      ${renderLinControls(state, uniqueChars)}
      ${renderLinTableHTML(linList, state)}
    `;

    if (window.setHTML) {
      await setHTML(container, html); // ensures MathJax if Character column contains $...$
    } else {
      container.innerHTML = html;
      if (window.typesetFresh) await typesetFresh(container);
    }

    // Restore accordion state
    const newAccordion = container.querySelector(".controls-accordion");
    if (newAccordion) newAccordion.open = wasOpen;

    wire();
  }
/*
  function wire() {
    // Bind Cohomology toggles
    bindCheckbox("lin-coh1", v => { state.showCohomology1 = v; render(); });
    bindCheckbox("lin-coh2", v => { state.showCohomology2 = v; render(); });

    // Bind dynamic Characteristic toggles
    uniqueChars.forEach(c => {
      bindCheckbox(`lin-char-${c}`, v => {
        state.visibleChars[c] = v;
        render();
      });
    });

    container.addEventListener("click", async (e) => {
      const viewBtn = e.target.closest(".lin-view");
      const dlBtn   = e.target.closest(".lin-dl");
      const btn = viewBtn || dlBtn;
      if (!btn) return;

      const idx = Number(btn.dataset.linIndex);
      if (!Number.isFinite(idx)) return;

      const row = btn.closest("tr");
      const select = row ? row.querySelector(".lin-format") : null;
      const fmt = select ? select.value : "Magma";

      const entry = linList[idx];
      if (!entry?.file) return;

      const repPath = `./lin/${entry.file}`;
      const rep = await fetch(repPath, { cache: "no-store" }).then(r => {
        if (!r.ok) throw new Error(`Failed to fetch ${repPath}: ${r.status}`);
        return r.json();
      });

      if (viewBtn && window.viewLinearRepresentation) {
        viewLinearRepresentation(rep, fmt);
      }
      if (dlBtn && window.downloadLinearRepresentation) {
        downloadLinearRepresentation(rep, fmt);
      }
    }, { passive: true });
  }

  function bindCheckbox(id, onChange) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener("change", () => onChange(!!el.checked));
  }
*/

  function wire() {
    if (container.dataset.linWired === "1") return;
    container.dataset.linWired = "1";

    container.addEventListener("change", (e) => {
      const t = e.target;
      if (!t || t.tagName !== "INPUT" || t.type !== "checkbox") return;

      if (t.id === "lin-coh1") { state.showCohomology1 = !!t.checked; render(); return; }
      if (t.id === "lin-coh2") { state.showCohomology2 = !!t.checked; render(); return; }

      const m = t.id.match(/^lin-char-(.+)$/);
      if (m) {
        const c = Number(m[1]);
        state.visibleChars[c] = !!t.checked;
        render();
      }
    });

    container.addEventListener("click", async (e) => {
      const viewBtn = e.target.closest(".lin-view");
      const dlBtn   = e.target.closest(".lin-dl");
      const btn = viewBtn || dlBtn;
      if (!btn) return;

      const idx = Number(btn.dataset.linIndex);
      if (!Number.isFinite(idx)) return;

      const row = btn.closest("tr");
      const select = row ? row.querySelector(".lin-format") : null;
      const fmt = select ? select.value : "Magma";

      const entry = linList[idx];
      if (!entry?.file) return;

      const repPath = `./lin/${entry.file}`;
      const rep = await fetch(repPath, { cache: "no-store" }).then(r => {
        if (!r.ok) throw new Error(`Failed to fetch ${repPath}: ${r.status}`);
        return r.json();
      });

      if (viewBtn) viewLinearRepresentation(rep, fmt);
      if (dlBtn) downloadLinearRepresentation(rep, fmt);
    }, { passive: true });
  }

}

function renderLinControls(state, uniqueChars) {
  const charCheckboxes = uniqueChars.map(c => `
    <label style="margin-right: 1rem;">
      <input type="checkbox" id="lin-char-${c}" ${state.visibleChars[c] ? "checked" : ""}>
      Char ${c === 0 ? "0" : c}
    </label>
  `).join("");

  return `
  <details class="controls-accordion">
    <summary>Table options</summary>
    <div class="table-controls" style="margin: 0.5rem 0 0.75rem 0;">
      <fieldset style="border: 1px solid #ddd; padding: 0.5rem; border-radius: 6px;">
        <legend style="padding: 0 0.25rem;">Show columns</legend>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="lin-coh1" ${state.showCohomology1 ? "checked" : ""}>
          1-cohomology
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="lin-coh2" ${state.showCohomology2 ? "checked" : ""}>
          2-cohomology
        </label>
      </fieldset>

      <fieldset style="border: 1px solid #ddd; padding: 0.5rem; border-radius: 6px; margin-top: 0.5rem;">
        <legend style="padding: 0 0.25rem;">Filter by characteristic</legend>
        ${charCheckboxes}
      </fieldset>
    </div>
  </details>
  `;
}
function renderLinTableHTML(linList,state) {
  const showC1 = !!state.showCohomology1;
  const showC2 = !!state.showCohomology2;

  const rows = (linList || [])
    .map((r, origIdx) => ({ r, origIdx }))                 // <-- keep original index
    .filter(({r}) => state.visibleChars[r.characteristic] !== false)
    .map(({r, origIdx},i) => {
      const ch = escapeHtml(String(r.characteristic ?? ""));
      const ring = r.characteristic !== 0 ? `GF(`+String(r.field)+`)` : String(r.field).replace(/Z/g,"ℤ").replace(/Q/g,"ℚ").replace(/sqrt/g,"√");
      const dim = escapeHtml(String(r.degree ?? ""));
      const charName = r.character ? formatCharacterID(String(r.character)) : "";
      const irr = escapeHtml(String(r.irreducibility ?? r.irreducible ?? ""));

      // Pull cohomology values from JSON
      const coh1 = showC1 ? `<td>${escapeHtml(String(r["1-cohomology"] ?? ""))}</td>` : "";
      const coh2 = showC2 ? `<td>${escapeHtml(String(r["2-cohomology"] ?? ""))}</td>` : "";

    const actions = `
      <select class="lin-format">
        <option value="Magma">Magma</option>
        <option value="GAP">GAP</option>
        <option value="Meataxe">Meataxe</option>
        <option value="Text">Text</option>
      </select>
      <button type="button" class="lin-view" data-lin-index="${origIdx}">View</button>
      <button type="button" class="lin-dl" data-lin-index="${origIdx}">Download</button>
    `;

    return `
      <tr>
        <td style="text-align:right;">${ch}</td>
        <td>${ring}</td>
        <td style="text-align:right;">${dim}</td>
        <td>${charName}</td>
        <td>${irr}</td>
        ${coh1}
        ${coh2}
        <td>${actions}</td>
      </tr>
    `;
  }).join("");

  const totalCols = 6 + (showC1 ? 1 : 0) + (showC2 ? 1 : 0);

  return `
    <table class="lin-table">
      <thead>
        <tr>
          <th>Characteristic</th>
          <th>Ring</th>
          <th>Dimension</th>
          <th>Character</th>
          <th>Irreducibility</th>
          ${showC1 ? "<th>1-cohomology</th>" : ""}
          ${showC2 ? "<th>2-cohomology</th>" : ""}
          <th>Representation</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="${totalCols}">No linear representations listed.</td></tr>`}
      </tbody>
    </table>
  `;
}
