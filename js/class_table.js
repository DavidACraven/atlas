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
    showLength: false,
    showOrder: false,
    filterRationalOnly: false,
    filterRealOnly: false,
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


    // Filters
    bindCheckbox("f-rat", v => { state.filterRationalOnly = v; render(); });
    bindCheckbox("f-real", v => { state.filterRealOnly = v; render(); });
  }

  function bindCheckbox(id, onChange) {
    const el = container.querySelector(`#${id}`);
    if (!el) return;
    el.addEventListener("change", () => onChange(!!el.checked));
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
          <input type="checkbox" id="cc-le" ${state.showLength ? "checked" : ""}>
          Length
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-or" ${state.showOrder ? "checked" : ""}>
          Element Order
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-sg" ${state.showCentralizerSmallGroup ? "checked" : ""}>
          Centralizer SmallGroup
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-pc" ${state.showPowerClasses ? "checked" : ""}>
          # power classes
        </label>
        <label style="margin-right: 1rem;">
          <input type="checkbox" id="cc-pm" ${state.showPowerMap ? "checked" : ""}>
          Power map
        </label>
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
  const showLE = state.showLength;
  const showOR = state.showOrder;

  const headExtras = []
  if (showLE) headExtras.push(`<th>Length</th>`);
  if (showOR) headExtras.push(`<th>Element Order</th>`);
  if (showSG) headExtras.push(`<th>Centralizer SG</th>`);
  if (showPC) headExtras.push(`<th># classes</th>`);
  if (showPM) headExtras.push(`<th>Power map</th>`);

  const rows = classes.map(c => {
    const extras = [];
    if (showLE) extras.push(`<td style="text-align:right;">${escapeHtml(String(c.length ?? ""))}</td>`);
    if (showOR) extras.push(`<td style="text-align:right;">${escapeHtml(String(c.order ?? ""))}</td>`);
    if (showSG) extras.push(`<td>${formatSmallGroup(c.centralizer_small_group)}</td>`);
    if (showPC) extras.push(`<td style="text-align:right;">${escapeHtml(String(c.power_classes ?? ""))}</td>`);
    if (showPM) extras.push(`<td>${escapeHtml(String(c.power_map ?? ""))}</td>`);

    return `
      <tr>
        <td>${escapeHtml(c.id ?? "")}</td>
        <td>${renderMath(c.centralizer_shape ?? "")}</td>
        <td style="text-align:right;">${escapeHtml(String(c.centralizer_order ?? ""))}</td>
        <td>${formatPowerUp ? formatPowerUp(c.power_up) : escapeHtml(String(c.power_up ?? ""))}</td>
        <td>${formatClassReps(c.representative ?? "")}</td>
        ${extras.join("")}
      </tr>
    `;
  }).join("");

  return `
    <table class="class-table" "border=1">
      <thead>
        <tr>
          <th>Class</th>
          <th>Centralizer</th>
          <th>Centralizer order</th>
          <th>Power up</th>
          <th>Representative</th>
          ${headExtras.join("")}
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="${5 + headExtras.length}">No classes match the current filters.</td></tr>`}
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
