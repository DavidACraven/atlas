// class_table.js

async function displayClassTable(data) {
  if (!data?.class_information) return;

  const container = document.getElementById("class-table");
  if (!container) return;

  // Fetch once
  const classInfo = await fetch(`./${data.class_information}`, { cache: "no-store" })
    .then(r => {
      if (!r.ok) throw new Error(`Failed to fetch ${data.class_information}: ${r.status}`);
      return r.json();
    });

  // UI + state live inside this function scope
  const state = {
    showCentralizerSmallGroup: false,
    showPowerClasses: false,
    showPowerMap: false,
    showRepresentative: false,
    showLength: false,
    showOrder: false,
    filterRationalOnly: false,
    filterRealOnly: false,
    numberDisplay: "integer",
  };

  render();


  async function render() {
    // Build controls + table HTML in one go

    // Preserve accordion open/closed state
    const oldAccordion = container.querySelector('.controls-accordion');
    const wasOpen = oldAccordion ? oldAccordion.open : false;
    const html = `
      ${renderControls(state)}
      ${renderTable(classInfo, state)}
    `;

    // Prefer setHTML if you have it (typesets). Otherwise do manual typeset.
    if (window.setHTML) {
      await setHTML(container, html);
    } else {
      container.innerHTML = html;
      if (window.typesetFresh) await typesetFresh(container);
    }

  // Restore accordion state
  const newAccordion = container.querySelector('.controls-accordion');
  if (newAccordion) newAccordion.open = wasOpen;

    // Wire events AFTER insertion (since controls were replaced)
    wireControls();
  }

  function wireControls() {
    // Column toggles
    bindCheckbox("cc-le", v => { state.showLength = v; render(); });
    bindCheckbox("cc-or", v => { state.showOrder = v; render(); });
    bindCheckbox("cc-sg", v => { state.showCentralizerSmallGroup = v; render(); });
    bindCheckbox("cc-pc", v => { state.showPowerClasses = v; render(); });
    bindCheckbox("cc-pm", v => { state.showPowerMap = v; render(); });
    bindCheckbox("cc-re", v => { state.showRepresentative = v; render(); });


    // Filters
    bindCheckbox("f-rat", v => { state.filterRationalOnly = v; render(); });
    bindCheckbox("f-real", v => { state.filterRealOnly = v; render(); });

    bindSelect("cc-number-display", v => {
      state.numberDisplay = v === "factorization" ? "factorization" : "integer";
      render();
    });
  }

  function bindCheckbox(id, onChange) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener("change", () => onChange(!!el.checked));
  }

  function bindSelect(id, onChange) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener("change", () => onChange(el.value));
  }
}

function renderControls(state) {
  return `
  <details class="controls-accordion">
    <summary>Table options</summary>
    <div class="table-controls" style="margin: 0.5rem 0 0.75rem 0;">
      <fieldset style="border: 1px solid #ddd; padding: 0.5rem; border-radius: 6px;">
        <legend style="padding: 0 0.25rem;">Show columns</legend>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-or" ${state.showOrder ? "checked" : ""}>
          Element Order
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-le" ${state.showLength ? "checked" : ""}>
          Length
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-sg" ${state.showCentralizerSmallGroup ? "checked" : ""}>
          Centralizer SmallGroup
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-pm" ${state.showPowerMap ? "checked" : ""}>
          Power map
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-pc" ${state.showPowerClasses ? "checked" : ""}>
          # power classes
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-re" ${state.showRepresentative ? "checked" : ""}>
          Representative
        </label>
      </fieldset>

      <fieldset style="border: 1px solid #ddd; padding: 0.5rem; border-radius: 6px; margin-top: 0.5rem;">
        <legend style="padding: 0 0.25rem;">Display format</legend>
        <label style="margin-right: 0.5rem;" for="cc-number-display">Length/Centralizer order:</label>
        <select id="cc-number-display">
          <option value="integer" ${state.numberDisplay === "integer" ? "selected" : ""}>Integer</option>
          <option value="factorization" ${state.numberDisplay === "factorization" ? "selected" : ""}>Factorization</option>
        </select>
      </fieldset>

      <fieldset style="border: 1px solid #ddd; padding: 0.5rem; border-radius: 6px; margin-top: 0.5rem;">
        <legend style="padding: 0 0.25rem;">Filter rows</legend>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="f-rat" ${state.filterRationalOnly ? "checked" : ""}>
          Rational only
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="f-real" ${state.filterRealOnly ? "checked" : ""}>
          Real only
        </label>
      </fieldset>
    </div>
  </details>
  `;
}

function renderTable(classInfo, state) {
  const classes = (classInfo.classes || []).filter(c => {
    if (state.filterRationalOnly && !c.rational) return false;
    if (state.filterRealOnly && !c.real) return false;
    return true;
  });

  const showSG = state.showCentralizerSmallGroup;
  const showPC = state.showPowerClasses;
  const showPM = state.showPowerMap;
  const showRE = state.showRepresentative;
  const showLE = state.showLength;
  const showOR = state.showOrder;

  const middleHeadExtras = [];
  if (showOR) middleHeadExtras.push(`<th>Element Order</th>`);
  if (showLE) middleHeadExtras.push(`<th>Length</th>`);

  const postCentralizerHeadExtras = [];
  if (showSG) postCentralizerHeadExtras.push(`<th>Centralizer SG</th>`);

  const tailHeadExtras = [];
  if (showPM) tailHeadExtras.push(`<th>Power map</th>`);
  if (showPC) tailHeadExtras.push(`<th># classes</th>`);
  if (showRE) tailHeadExtras.push(`<th>Representative</th>`);

  const headExtras = [...middleHeadExtras, ...postCentralizerHeadExtras, ...tailHeadExtras];

  const rows = classes.map(c => {
    const middleExtras = [];
    if (showOR) middleExtras.push(`<td style="text-align:right;">${escapeHtml(String(c.order ?? ""))}</td>`);
    if (showLE) middleExtras.push(`<td style="text-align:right;">${renderFactoredCell(c, state.numberDisplay, "length", "factored_length")}</td>`);

    const postCentralizerExtras = [];
    if (showSG) postCentralizerExtras.push(`<td>${formatSmallGroup(c.centralizer_small_group)}</td>`);

    const tailExtras = [];
    if (showPM) tailExtras.push(`<td>${escapeHtml(String(c.power_map ?? ""))}</td>`);
    if (showPC) tailExtras.push(`<td style="text-align:right;">${escapeHtml(String(c.power_classes ?? ""))}</td>`);
    if (showRE) tailExtras.push(`<td>${formatClassReps(c.representative ?? "")}</td>`);

    return `
      <tr>
        <td>${escapeHtml(c.id ?? "")}</td>
        ${middleExtras.join("")}
        <td style="text-align:right;">${renderFactoredCell(c, state.numberDisplay, "centralizer_order", "factored_centralizer_order")}</td>
        <td>${renderMath(c.centralizer_shape ?? "")}</td>
        ${postCentralizerExtras.join("")}
        <td>${formatPowerUp ? formatPowerUp(c.power_up) : escapeHtml(String(c.power_up ?? ""))}</td>
        ${tailExtras.join("")}
      </tr>
    `;
  }).join("");

  return `
    <table class="class-table" "border=1">
      <thead>
        <tr>
          <th>Class</th>
          ${middleHeadExtras.join("")}
          <th>Centralizer order</th>
          <th>Centralizer</th>
          ${postCentralizerHeadExtras.join("")}
          <th>Power up</th>
          ${tailHeadExtras.join("")}
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="${4 + headExtras.length}">No classes match the current filters.</td></tr>`}
      </tbody>
    </table>
  `;
}

function formatSmallGroup(arr) {
  // arr like [4,2] -> SmallGroup(4,2)
  if (!arr || !Array.isArray(arr) || arr.length !== 2) return "";
  const [n, k] = arr;
  if (typeof n !== "number" || typeof k !== "number") return "";
  return `SmallGroup(${n},${k})`;
}

