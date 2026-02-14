function formatIndicator(ind) {
  if (ind === 1) return "+";
  if (ind === 0) return "&#9675;";
  if (ind === -1) return "&minus;";
  return "?";
}

/*
function substitute(value, symbols) {
  if (symbols[value]) {
    return symbols[value].html;
  }

  // Handle negated symbols like "-i2" or "-b11"
  if (value.startsWith("-") && symbols[value.slice(1)]) {
    return "&minus;" + symbols[value.slice(1)].html;
  }

  // Handle plain numbers with minus sign (replace minus only at start)
  return value.replace(/^-(\d)/, "&minus;$1");
}
*/

// char_table.js

async function displayCharTable(groupData) {
  const container = document.getElementById("char-table");
  if (!container) return;

  // Fetch char table + symbol definitions
  const charData = await fetch(`./${groupData.character_information}`, { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch ${groupData.character_information}: ${r.status}`);
      return r.json();
    });

  const symbols = await fetch(groupData.symbol_definitions, { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch ${groupData.symbol_definitions}: ${r.status}`);
      return r.json();
    });

  // UI state (mirrors the pattern used by class_table.js)
  const state = {
    showSchurIndex: false,
    includePlusType: true,
    includeZeroType: true,
    includeMinusType: true
  };


  render();

  async function render() {
    // Preserve accordion open/closed state
    const oldAccordion = container.querySelector(".controls-accordion");
    const wasOpen = oldAccordion ? oldAccordion.open : false;

    const html = `
      ${renderCharControls(state)}
      ${renderCharTableHTML(groupData, charData, symbols, state)}
    `;

  if (window.setHTML) {
    await setHTML(container, html);   // ensures MathJax runs
  } else {
    container.innerHTML = html;
    if (window.typesetFresh) await typesetFresh(container);
  }

    // Restore accordion state
    const newAccordion = container.querySelector(".controls-accordion");
    if (newAccordion) newAccordion.open = wasOpen;

    wireControls();
    enableCharTableHighlighting("char-table");
  }

  function wireControls() {
    bindCheckbox("ct-si", v => { state.showSchurIndex = v; render(); });
    bindCheckbox("ct-pt", v => { state.includePlusType = v; render(); });
    bindCheckbox("ct-zt", v => { state.includeZeroType = v; render(); });
    bindCheckbox("ct-mt", v => { state.includeMinusType = v; render(); });
  }

  function bindCheckbox(id, onChange) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener("change", () => onChange(!!el.checked));
  }


}


function renderCharControls(state) {
  return `
  <details class="controls-accordion">
    <summary>Table options</summary>
    <div class="table-controls" style="margin: 0.5rem 0 0.75rem 0;">
      <fieldset style="border: 1px solid #ddd; padding: 0.5rem; border-radius: 6px;">
        <legend style="padding: 0 0.25rem;">Show columns</legend>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="ct-si" ${state.showSchurIndex ? "checked" : ""}>
          Schur index
        </label>
      </fieldset>

      <fieldset style="border: 1px solid #ddd; padding: 0.5rem; border-radius: 6px; margin-top: 0.5rem;">
        <legend style="padding: 0 0.25rem;">Filter by indicator type</legend>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="ct-pt" ${state.includePlusType ? "checked" : ""}>
          Include + characters
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="ct-zt" ${state.includeZeroType ? "checked" : ""}>
          Include 0 characters
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="ct-mt" ${state.includeMinusType ? "checked" : ""}>
          Include - characters
        </label>
      </fieldset>

    </div>
  </details>
  `;
}


function renderCharTableHTML(groupData, charData, symbols, state) {
  const classLabels = groupData.class_names || [];
  const characters = charData.characters || [];
  const showSI = !!state?.showSchurIndex;
  const IncPT = !!state?.includePlusType;
  const IncZT = !!state?.includeZeroType;
  const IncMT = !!state?.includeMinusType;

  const head =
    `<thead><tr>` +
    `<th></th><th>ind</th>` +
    (showSI ? `<th>Schur index</th>` : ``) +
    classLabels.map(lbl => `<th>${escapeHtml(lbl)}</th>`).join("") +
    `</tr></thead>`;

  const rows = characters
    .filter(ch => {
      // 1. First, they must be irreducible
      if (!ch.irreducible) return false;

      // 2. Then check if their indicator type is enabled in the UI
      if (ch.indicator === 1) return IncPT;
      if (ch.indicator === 0) return IncZT;
      if (ch.indicator === -1) return IncMT;

      // Fallback for unknown indicators (optional)
      return true; 
    })
    .map(ch => {
      const label = `<th>${formatCharacterID(ch.id)}</th>`;
      const indicator = `<td style="text-align:center;">${formatIndicator(ch.indicator)}</td>`;
      const schurIndex = showSI
        ? `<td style="text-align:center;">${escapeHtml(String(ch.schur_index ?? ""))}</td>`
        : ``;
      const values = (ch.values || [])
        .map(v => `<td style="text-align:right;">${substitute(v, symbols)}</td>`)
        .join("");
      return `<tr>${label}${indicator}${schurIndex}${values}</tr>`;
    })
    .join("");

  const body = `<tbody>${rows}</tbody>`;

  return `
    <table class="char-table">
      ${head}
      ${body}
    </table>
  `;
}
