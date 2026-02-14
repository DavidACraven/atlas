// max_table.js

function viewMaximalSubgroup(max, maxInfo, fmt) {
  const text = generateMaximalText(max, maxInfo, fmt);

  const groupName = stripMathDelimiters(maxInfo.group || "");
  const maxName   = stripMathDelimiters(max.name || "");

  const title = `Maximal subgroup ${maxName} < ${groupName}`;

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
    <body><pre>${escapeHtml(text)}</pre></body>
    </html>`;

  // Create a Blob and a URL for it
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  // Open the URL directly
  const w = window.open(url, "_blank", "noopener,noreferrer");

if (!w) {
    // Check if the browser actually supports the window reference
    // If it's null but you see the tab, the alert is just noise.
    console.warn("window.open returned null. This may be due to noopener security.");
    
    // Optional: Only alert if you aren't using 'noopener'
    // Or, simply remove the alert and let the browser's "Popup Blocked" icon show.
  }

  // Clean up the URL memory after a delay to ensure the new tab loaded it
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

function downloadMaximalSubgroup(max, maxInfo, fmt) {
  const text = generateMaximalText(max, maxInfo, fmt);

  const filename = maximalFilename(max, maxInfo, fmt);

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


function maximalFilename(maxData, meta, fmt) {

  const prefix =
    (meta.id ? meta.id.replace(/_maxes.*$/, "") : "G") + "_";

  const ext =
    fmt === "Magma"  ? "m" :
    fmt === "GAP"    ? "g" :
    fmt === "Meataxe"? "" :   // decide later
    "txt";

  return `${prefix}${maxData.id}.${ext}`;
}

function generateMaximalText(max, maxInfo, fmt) {
  switch (fmt) {
    case "Magma":
      return formatMaximalSubgroupAsMagma(max, maxInfo);
    case "Meataxe":
      return formatMaximalSubgroupAsMeataxe(max, maxInfo);
    case "Text":
      return formatMaximalSubgroupAsText(max, maxInfo);
    default:
      return `Format ${fmt} not implemented yet.`;
  }
}


//////////////////////////////
// Formatting the SLP
//////////////////////////////

function formatMaximalSubgroupAsMagma(maxData, meta) {

  const prefix =
    (meta.id ? meta.id.replace(/_maxes.*$/, "") : "G") + "_";

  const groupName = stripMathDelimiters(meta.group || "");
  const maxName   = stripMathDelimiters(maxData.name || "");

  // Header comment
  const lines = [
    "/*",
    `Online Atlas of Group Representations, version ${meta.atlas_version || "unknown"}.`,
    "",
    "Straight-line program for maximal subgroup generator.",
    "",
    `${maxName} < ${groupName}.`,
    "",
    `Order: ${maxData.order}, Index: ${maxData.index}`
  ];

  if (meta.sources) {
    lines.push("", meta.sources);
  }

  lines.push("*/", "");

  // Detect Ngens convention: last entry of SLP is [n]
  let slp = Array.isArray(maxData.slp) ? maxData.slp : [];
  let ngens = 2;
  if (slp.length > 0) {
    const last = slp[slp.length - 1];
    if (Array.isArray(last) && last.length === 1 && Number.isInteger(last[0])) {
      ngens = last[0];
      slp = slp.slice(0, -1); // prune the [ngens] marker
    }
  }


  // Function header
  lines.push(`function ${prefix}${maxData.id}(G)`);
  lines.push("");
  lines.push("w1 := G.1; w2 := G.2;");

  // SLP
  for (const [i, j, k, l] of slp) {
    const lhs = `w${i}`;
    const rhs = (k === 0)
      ? `w${j} * w${l}`
      : `w${j} ^ ${l}`;
    lines.push(`${lhs} := ${rhs};`);
  }
  const gensList = Array.from({ length: ngens }, (_, t) => `w${t + 1}`).join(", ");
  lines.push("");
  lines.push(`return sub<G |[${gensList}]>;`);
  lines.push("");
  lines.push("end function;");

  return lines.join("\n");
}

function formatMaximalSubgroupAsMeataxe(maxData, meta) {
  let slp = Array.isArray(maxData.slp) ? maxData.slp : [];
  let ngens = 2;

  // trailing [n] marker
  if (slp.length > 0) {
    const last = slp[slp.length - 1];
    if (Array.isArray(last) && last.length === 1 && Number.isInteger(last[0])) {
      ngens = last[0];
      slp = slp.slice(0, -1);
    }
  }

  const groupName = stripMathDelimiters(meta.group || "");
  const maxName   = stripMathDelimiters(maxData.name || "");
  const lines = [];

  // preamble

  lines.push(`# Online Atlas of Group Representations, version ${meta.atlas_version || "unknown"}.`);
  lines.push(`#`);
  lines.push(`# Straight-line program for maximal subgroup generator.`);
  lines.push(`#`);
  lines.push(`# ${maxName} < ${groupName}.`);
  lines.push(`# Order: ${maxData.order}, Index: ${maxData.index}`);

  if (meta.sources) {
    const srcLines = String(meta.sources).split(/\r?\n/);
    for (const l of srcLines) {
      lines.push(`# ${l}`);
    }
  }

  lines.push(""); // blank line after header
  // Inputs
  for (let i = 1; i <= ngens; i++) {
    lines.push(`cp g.${i} z${i}`);
  }

  // SLP
  for (const step of slp) {
    if (!Array.isArray(step) || step.length !== 4) continue;
    const [i, j, k, l] = step;

    if (k === 0) {
      // w_i := w_j * w_l
      lines.push(`zmu z${j} z${l} z${i}`);
    } else if (l === -1) {
      // w_i := w_j^-1
      lines.push(`ziv z${j} z${i}`);
    } else {
      // w_i := w_j^l
      lines.push(`zpo z${j} ${l} z${i}`);
    }
  }

  // Outputs: default to first ngens registers
  for (let i = 1; i <= ngens; i++) {
    lines.push(`cp z${i} h.${i}`);
  }

  return lines.join("\n");
}

function formatMaximalSubgroupAsText(maxData, meta) {

  let slp = Array.isArray(maxData.slp) ? maxData.slp : [];
  let ngens = 2;

  // Detect Ngens marker
  if (slp.length > 0) {
    const last = slp[slp.length - 1];
    if (Array.isArray(last) && last.length === 1 && Number.isInteger(last[0])) {
      ngens = last[0];
      slp = slp.slice(0, -1);
    }
  }

  const groupName = stripMathDelimiters(meta.group || "");
  const maxName   = stripMathDelimiters(maxData.name || "");

  const lines = [];

  lines.push(`Straight-line program for a maximal subgroup.`);
  lines.push(`${maxName} < ${groupName}.`);
  lines.push(`Order: ${maxData.order}, Index: ${maxData.index}`);
  lines.push("");
  lines.push(`Initial generators: w1, w2${ngens > 2 ? `, …, w${ngens}` : ""}`);
  lines.push("");

  for (const step of slp) {
    if (!Array.isArray(step) || step.length !== 4) continue;

    const [i, j, k, l] = step;

    if (k === 0) {
      lines.push(`Set w${i} = w${j} · w${l}.`);
    } else {
      lines.push(`Set w${i} = w${j}^${l}.`);
    }
  }

  lines.push("");
  lines.push(
    `The maximal subgroup is generated by ` +
    Array.from({ length: ngens }, (_, t) => `w${t + 1}`).join(", ") +
    `.`
  );

  return lines.join("\n");
}

////////////////////////////////
// Main program
////////////////////////////////

async function displayMaxTable(data) {
  if (!data?.maximals_information) return;

  let wired = false;

  const container = document.getElementById("max-table");
  if (!container) return;

  // Fetch once
  const maxInfo = await fetch(`./${data.maximals_information}`, { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch ${data.maximals_information}: ${r.status}`);
      return r.json();
    });

  const state = {
    showSmallGroup: false,
  };

  await render();

if (!wired) {
  wired = true;

container.addEventListener("click", (e) => {
  const viewBtn = e.target.closest(".mx-view");
  const dlBtn   = e.target.closest(".mx-dl");
  const btn = viewBtn || dlBtn;
  if (!btn) return;

  const idx = Number(btn.dataset.mxIndex);
  if (!Number.isFinite(idx)) return;

  const row = btn.closest("tr");
  const select = row ? row.querySelector(".mx-prog") : null;
  const fmt = select ? select.value : "Magma";

  const max = (maxInfo.maximals || [])[idx];
  if (!max) return;

  if (viewBtn) viewMaximalSubgroup(max, maxInfo, fmt);
  if (dlBtn) downloadMaximalSubgroup(max, maxInfo, fmt);
});
}

  async function render() {
    // Preserve accordion open/closed across rerenders
    const oldAcc = container.querySelector(".controls-accordion");
    const wasOpen = oldAcc ? oldAcc.open : false;

    const html = `
      ${renderMaxControls(state)}
      ${renderMaxTable(maxInfo, state)}
    `;

    if (window.setHTML) {
      await setHTML(container, html);
    } else {
      container.innerHTML = html;
      if (window.typesetFresh) await typesetFresh(container);
    }

    // Restore accordion state
    const newAcc = container.querySelector(".controls-accordion");
    if (newAcc) newAcc.open = wasOpen;

    wire();
  }

  function wire() {
    const cb = container.querySelector("#mx-sg");
    if (cb) {
      cb.addEventListener("change", () => {
        state.showSmallGroup = !!cb.checked;
        render();
      });
    }
  }
}

function renderMaxControls(state) {
  return `
    <details class="controls-accordion">
      <summary>Table options</summary>
      <div style="margin-top:0.5rem;">
        <label>
          <input type="checkbox" id="mx-sg" ${state.showSmallGroup ? "checked" : ""}>
          Show SmallGroup id
        </label>
      </div>
    </details>
  `;
}

function renderMaxTable(maxInfo, state) {
  const showSG = state.showSmallGroup;

  const headExtras = showSG ? `<th>SmallGroup</th>` : ``;

  const rows = (maxInfo.maximals || []).map((m,i) => {
    const sgCell = showSG ? `<td>${formatSmallGroup(m.maximal_small_group)}</td>` : ``;

  const slpAvail = Array.isArray(m.slp) && m.slp.length;
  const progCell = slpAvail
    ? `
        <select class="mx-prog">
          <option value="Magma">Magma</option>
          <option value="GAP">GAP</option>
          <option value="Meataxe">Meataxe</option>
          <option value="Text">Text</option>
        </select>
        <button type="button" class="mx-view" data-mx-index="${i}">View</button>
        <button type="button" class="mx-dl" data-mx-index="${i}">Download</button>

      `
    : `-`;

    return `
      <tr>
        <td>${renderMath(m.name ?? "")}</td>
        <td style="text-align:right;">${escapeHtml(String(m.order ?? ""))}</td>
        <td style="text-align:right;">${escapeHtml(String(m.index ?? ""))}</td>
        ${sgCell}
        <td>${progCell}</td>
      </tr>
    `;
  }).join("");

  return `
    <table class="max-table">
      <thead>
        <tr>
          <th>Maximal subgroup</th>
          <th>Order</th>
          <th>Index</th>
          ${headExtras}
          <th>Program</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="${4 + (showSG ? 1 : 0)}">No maximal subgroup data.</td></tr>`}
      </tbody>
    </table>
  `;
}