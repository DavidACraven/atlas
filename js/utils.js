// utils.js

// Reminder: python -m http.server 8000 is the command for a local server.


// tiny local helper to avoid accidental HTML injection via JSON
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function extractFirstMathFragment(s) {
  if (!s) return "";
  const m = String(s).match(/\$(.+?)\$/);
  return m ? m[1] : "";
}


function formatSmallGroup(arr) {
  if (!arr || !Array.isArray(arr) || arr.length !== 2) return "";
  const [n, k] = arr;
  if (typeof n !== "number" || typeof k !== "number") return "";
  return `SmallGroup(${n},${k})`;
}



///////////////////////////////////
// Displaying maths
///////////////////////////////////

function renderMath(input) {
    const parts = input.split('$');
    let output = '';

    for (let i = 0; i < parts.length; i++) {
        if (i % 2 === 0) {
            // Plain text
            output += parts[i];
        } else {
            // MathJax content
            const orig = parts[i];
            const aria = renderMathAria(orig); 
            const math = renderMathHTML(orig); 

            output += `<span aria-label="${aria}">$${math}$</span>`;
        }
    }

    return output;
}

function renderMathAria(math) {
    let s = (math ?? '').trim();

    // 0) Twisted groups and classical groups dealt with right at the start.
    s = s
        .replace(/\^2E_6/g, ' twisted E 6 ')
        .replace(/\^2F_4/g, ' twisted F 4 ')
        .replace(/\^2G_2/g, ' twisted G 2 ')
        .replace(/\^2B_2/g, ' twisted B 2 ')
        .replace(/\^3D_4/g, ' three D 4')
        .replace(/O\^+/g, ' O plus ')
        .replace(/O\^-/g, ' O minus ')
        .replace(/GL/g, ' G L ')
        .replace(/GU/g, ' G U ')
        .replace(/SL/g, ' S L ')
        .replace(/SU/g, ' S U ')
        .replace(/Sp/g, ' S p ');

    // 1) Token replacements (with padding spaces to prevent concatenation)
    // Order matters a bit: do \times etc before dealing with other syntax.
    s = s
        .replace(/\\times/g, ' times ')
        .replace(/\\wr/g, ' wreath ')
        .replace(/\\circ/g, ' central product ')
        .replace(/:/g, ' colon ')
        .replace(/\./g, ' dot ')
        .replace(/\\cdot/g, ' dot ');

    // 2) Replace ^2 and ^3 (only when written without braces)
    // Do these before the general ^ rule.
    s = s
        .replace(/\^2\b/g, ' squared ')
        .replace(/\^3\b/g, ' cubed ');

    // 3) Replace all underscores by spaces and remove braces as they aren't pronounced
    s = s.replace(/_/g, ' ')
         .replace(/{/g, '')
         .replace(/}/g, '');

    // 4) Replace ^ by " to the "
        s = s.replace(/\^/g, ' to the ');

    // Final cleanup: collapse whitespace
    return s.replace(/\s+/g, ' ').trim();
}


function renderMathHTML(math) {
    let s = (math ?? '').trim();

    // We are going to be replacing all the maths with fonts from the current website. We are using MathJax for better stacking of symbols.

 //   s = s
 //       .replace(/\\times/g, ' × ')
 //       .replace(/\\wr/g, ' ≀ ')
 //       .replace(/\\circ/g, ' ∘ ')
 //       .replace(/\\cdot/g, '·');

    // Now make sure that all super- and subscripts are capturd in braces to make parsing easier

    s = s
        .replace(/\^([^{])/g, '\^{$1}')
        .replace(/_([^{])/g, '_{$1}');

    // Now replace ^{ } with ^\mathrm{ } and _{ } with _\mathrm{ }, but first cases where both are there

    s = s
        .replace(/\^{([^}]*)}_{([^}]*)}/g, '}^\\mathrm{$1}_\\mathrm{$2}\\mathrm{')
        .replace(/\^{([^}]*)}/g, '}\^\\mathrm{$1}\\mathrm{')
        .replace(/_{([^}]*)}/g, '}_\\mathrm{$1}\\mathrm{');

    s = '\\mathrm{'+s+'}';
    s = s.replace(/\\mathrm{}/, '');

    return s.replace(/\s+/g, ' ').trim();
}

/* Used for displaying maths in plain text, for instance on files you download. */

function stripMathDelimiters(s) {
  if (!s) return "";
  return String(s)
    .replace(/\$/g, "")      // remove $...$
    .replace(/\\times/g, "×")
    .replace(/\\circ/g, "∘")
    .replace(/\\wr/g, "≀")
    .replace(/\s+/g, " ")
    .trim();
}



///////////////////////////////////
// Displaying breadcrumbs
///////////////////////////////////

(function () {
  function renderBreadcrumbs(data) {
    const crumbs = [];
    const middlecrumbs = [];

    // 1) All groups
    crumbs.push(`<a href="../index.html">All groups</a>`);

    // 2) One link per type class (comma-separated)
    const types = parseTypeList(data.type);
    for (const t of types) {
      const href = `../types/${encodeURIComponent(t)}.html`;
      const label = `${titleCase(t)} groups`;
      middlecrumbs.push(`<a href="${href}">${escapeHtml(label)}</a>`);
    }
    crumbs.push(middlecrumbs.join(', '));
    // 3) Current group name (MathJax + ARIA)
    crumbs.push(`<span class="breadcrumb-group">${renderMath(data.name ?? '')}</span>`);

    return crumbs.join(' &gt; ');
  }

  function parseTypeList(typeField) {
    if (!typeField) return [];
    return String(typeField)
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);
  }

  function titleCase(s) {
    // simple: alternating -> Alternating, groups-of-lie-type -> Groups-of-lie-type
    // (we can refine later if you want nicer names)
    return s.length ? s[0].toUpperCase() + s.slice(1) : s;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  window.renderBreadcrumbs = renderBreadcrumbs;
})();

///////////////////////////////////
// Displaying group properties
///////////////////////////////////


(function () {
  function renderGroupProperties(data) {
    const order = (data.order ?? '').toString();
    const factoredRaw = (data.factored_order ?? '').toString().trim();
//    const factoredTex = factoredRaw ? factoredRaw.replace(/\./g, '\\cdot ') : '';
    const factoredTex = factoredRaw ? formatPowerUp(factoredRaw) : '';


    const schur = (data.schur_multiplier ?? '').toString().trim();
    const outer = (data.outer_automorphism_group ?? '').toString().trim();

    const orderLine =
      factoredTex
        ? `Order: ${order} = ${factoredTex}.`
        : `Order: ${order}.`;

    const extra = [];
    if (schur) extra.push(`Schur multiplier: ${renderMath(`${schur}`)}.`);
    if (outer) extra.push(`Outer automorphism group: ${renderMath(`${outer}`)}.`);

    return `<p>${orderLine}${extra.length ? '<br>' + extra.join('<br>') : ''}</p>`;
  }

  window.renderGroupProperties = renderGroupProperties;
})();


///////////////////////////////////
// Displaying standard generators
///////////////////////////////////


// Converts the standard generators data type into the sentence.

function formatStandardGenerators(generators) {
  const formatEntry = ([word, label]) => {
    const isNumber = !isNaN(Number(label));
    return isNumber ? `<i>${word}</i> has order ${label}` : `<i>${word}</i> is in class ${label}`;
  };

  const formattedList = generators.map(formatEntry);
  const [genA, genB, ...rest] = formattedList;

  const genIntro = `Standard generators are <i>${generators[0][0]}</i> and <i>${generators[1][0]}</i>, where `;

  let desc = "";

  if (formattedList.length === 1) {
    desc = formattedList[0];
  } else if (formattedList.length === 2) {
    desc = formattedList.join(" and ");
  } else {
    desc =
      formattedList.slice(0, -1).join(", ") +
      ", and " +
      formattedList[formattedList.length - 1];
  }

  return genIntro + desc + ".";
}

(function () {
  function renderStandardGenerators(data) {
    if (!data.standard_generators) return '';

    return `
      <h2 id="std-gens-head">Standard generators</h2>
      <p>${formatStandardGenerators(data.standard_generators)}</p>
    `;
  }

  window.renderStandardGenerators = renderStandardGenerators;
})();


///////////////////////////////////
// Displaying variants
///////////////////////////////////

// Global widest across page load (as you had)
let variantSelectorWidest = 0;

async function initVariantSelector(data, currentHtmlFilename) {
  const container = document.getElementById('variant-selector');
  if (!container) return;

  // Guard: initialise once only
  if (container.dataset.vsInit === '1') return;
  container.dataset.vsInit = '1';

  const button = container.querySelector('.dropdown-button');
  const optionsBox = container.querySelector('.dropdown-options');
  if (!button || !optionsBox) return;

  const currentId = currentHtmlFilename.replace(/\.html$/i, '');

  // Caption
  let caption = 'Select';
  for (const v of data.variants || []) {
    if (v['var-id'] === currentId) { caption = v.name; break; }
  }
  button.innerHTML = renderMath(caption);

  // Options
  optionsBox.innerHTML = '';
  for (const v of data.variants || []) {
    const div = document.createElement('div');
    div.className = 'dropdown-item';
    div.innerHTML = renderMath(v.name);

    div.addEventListener('click', () => {
      const id = v['var-id'];
      if (id && id !== currentId) {
        window.location.href = `../${id}/${id}.html`;
      } else {
        optionsBox.style.display = 'none';
      }
    });

    optionsBox.appendChild(div);
  }

  // --- IMPORTANT: typeset while options are measurable ---
  const oldDisp = optionsBox.style.display;
  const oldVis  = optionsBox.style.visibility;

  optionsBox.style.visibility = 'hidden';
  optionsBox.style.display = 'block';

  await typesetOne(container);

  optionsBox.style.display = oldDisp;       // usually 'none'
  optionsBox.style.visibility = oldVis;     // usually ''

  // Measure widest only once per page load
  if (variantSelectorWidest === 0) {
    const oldDisp = optionsBox.style.display;
    const oldVis  = optionsBox.style.visibility;

    optionsBox.style.visibility = 'hidden';
    optionsBox.style.display = 'block';

    // Measure the widest of: button label OR any option
    let maxPx = button.offsetWidth;
    const items = optionsBox.querySelectorAll('.dropdown-item');
    for (const item of items) maxPx = Math.max(maxPx, item.offsetWidth);

    // A small padding buffer; tweak if your CSS adds padding/borders
    variantSelectorWidest = maxPx + 6;

    // Clamp to viewport
    const vw = document.documentElement.clientWidth - 8;
    if (variantSelectorWidest > vw) variantSelectorWidest = vw;

    optionsBox.style.display = oldDisp;
    optionsBox.style.visibility = oldVis;
  }

  button.style.width = variantSelectorWidest + 'px';
  optionsBox.style.width = variantSelectorWidest + 'px';

  // Open/close behaviour (wired once)
  button.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    optionsBox.style.display = (optionsBox.style.display === 'block') ? 'none' : 'block';
  });

  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) optionsBox.style.display = 'none';
  }, { capture: true });
}

async function typesetOne(el) {
  if (window.typesetFresh) return window.typesetFresh(el);
  if (window.MathJax?.startup?.promise && window.MathJax?.typesetPromise) {
    await MathJax.startup.promise;
    return MathJax.typesetPromise([el]);
  }
}



function renderVariantSelectorShell(data) {
  if (!data.variants || data.variants.length <= 1) return '';

  return `
    <h2>Variants</h2>
    <div id="variant-selector" class="custom-dropdown" data-vs-init="0">
      <button class="dropdown-button" type="button">Loading...</button>
      <div class="dropdown-options" style="display:none;"></div>
    </div>
  `;
}


///////////////////////////////////
// Format characters
///////////////////////////////////


function formatCharacterID(id) {
  // Match chi or phi followed by a number, and optionally + between terms
  return id.replace(/(chi|phi)(\d+)/g, (match, prefix, num) => {
    const symbol = prefix === "chi" ? "χ" : "φ";
    return `${symbol}<sub>${num}</sub>`;
  });
}

function substitute(x) { return x;}

function enableCharTableHighlighting(tableId) {
const table = document.getElementById(tableId).querySelector("table");

  // Highlight column when clicking <th> in thead
  table.querySelectorAll("thead th").forEach((th, colIndex) => {
    if (colIndex === 0) return; // skip top-left corner
    th.addEventListener("click", () => {
      [...table.rows].forEach(row => {
        const cell = row.cells[colIndex];
        if (cell) cell.classList.toggle("highlight-col");
      });
    });
  });

  // Highlight row when clicking <th> in tbody
  table.querySelectorAll("tbody tr").forEach(row => {
    row.querySelector("th").addEventListener("click", () => {
      row.classList.toggle("highlight-row");
    });
  });
}

///////////////////////////////////
// Format class power up and reps
///////////////////////////////////

function formatPowerUp(s) {
  return s.replace(/\^([0-9-]*)/g, '<sup>$1</sup>').replace(/\./g, '·');
}

function formatClassReps(s) {
  s = s
        .replace(/\(/,'</i>\(<i>')
        .replace(/\)/,'</i>\)<i>')
        .replace(/\^([0-9-]*)/g, '</i><sup>$1</sup><i>');
  return '<i>'+s+'</i>';
}


///////////////////////////////////
// Nav panel functions
///////////////////////////////////


function setupScrollHighlighting(sections) {
  const sectionEls = sections
    .map(id => document.getElementById(id))
    .filter(Boolean);

  const links = sections
    .map(id => document.querySelector(`#nav-panel a[href="#${id}"]`))
    .filter(Boolean);

  function onScroll() {
    let current = sectionEls[0]?.id;
    if (!current) return;

    for (let i = 0; i < sectionEls.length; i++) {
      const nextEl = sectionEls[i + 1];
      const nextTop = nextEl ? nextEl.getBoundingClientRect().top : Infinity;

      if (nextTop > 0) {
        current = sectionEls[i].id;
        break;
      }
    }

    links.forEach(link => link.classList.remove("active"));
    const activeLink = document.querySelector(`#nav-panel a[href="#${current}"]`);
    if (activeLink) activeLink.classList.add("active");
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

function renderNavPanelHTML(data) {
  let navHTML = `<h3>Navigate</h3><ul>`;
  navHTML += `<li><a href="#top">Group properties</a></li>`; const presentSections = ["top"];
  if (data.standard_generators) { navHTML += `<li><a href="#std-gens-head">Standard generators</a></li>`; presentSections.push("std-gens-head"); }
  if (data.maximals_information) { navHTML += `<li><a href="#max-head">Maximal subgroups</a></li>`; presentSections.push("max-head"); }
  if (data.class_information) { navHTML += `<li><a href="#class-head">Conjugacy classes</a></li>`; presentSections.push("class-head"); }
  if (data.character_information) { navHTML += `<li><a href="#char-head">Character table</a></li>`; presentSections.push("char-head"); }
  if (data.brauer_information) { navHTML += `<li><a href="#mod-head">Modular information</a></li>`; presentSections.push("mod-head"); }
  if (data.representations?.permutation) { navHTML += `<li><a href="#perm-head">Permutation representations</a></li>`; presentSections.push("perm-head"); }
  if (data.representations?.linear) { navHTML += `<li><a href="#lin-head">Linear representations</a></li>`; presentSections.push("lin-head"); }
  navHTML += `</ul>`;
  return { html: navHTML, sections: presentSections };
}

///////////////////////////////////
// MathJax stuff
///////////////////////////////////

let mathjaxReadyResolve;
const mathjaxReady = new Promise(res => (mathjaxReadyResolve = res));
let typesetChain = Promise.resolve();

function initMathJaxManager() {
  if (window.MathJax?.startup?.promise) {
    MathJax.startup.promise.then(() => mathjaxReadyResolve());
  } else {
    const t = setInterval(() => {
      if (window.MathJax?.startup?.promise) {
        clearInterval(t);
        MathJax.startup.promise.then(() => mathjaxReadyResolve());
      }
    }, 25);
  }
}

async function typeset(elementOrElements) {
  await mathjaxReady;

  const elems = Array.isArray(elementOrElements)
    ? elementOrElements
    : [elementOrElements];

  typesetChain = typesetChain
    .then(() => MathJax.typesetPromise(elems))
    .catch(err => console.error('MathJax error:', err));

  return typesetChain;
}

async function setHTML(container, html) {
  container.innerHTML = html;
  await typeset(container);
}

async function appendHTML(container, html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  container.append(...tmp.childNodes);
  await typeset(container);
}

// Expose the bits other scripts need (classic-script style)
window.renderMath = renderMath;
window.initMathJaxManager = initMathJaxManager;
window.typesetFresh = typeset;
window.setHTML = setHTML;
window.appendHTML = appendHTML;

function setupCollapsibleHeader(headerEl) {
  if (!headerEl) return;

  if (!document.getElementById('collapsible-header-style')) {
    const style = document.createElement('style');
    style.id = 'collapsible-header-style';
    style.textContent = `
      #page-header h1 {
        margin: 0;
        transition: opacity 0.2s ease, max-height 0.2s ease, margin 0.2s ease;
        max-height: 6rem;
        overflow: hidden;
      }

      #page-header.is-collapsed {
        row-gap: 0;
        padding-top: 0.25rem;
      }

      #page-header.is-collapsed h1 {
        opacity: 0;
        max-height: 0;
        margin: 0;
        pointer-events: none;
      }
    `;
    document.head.appendChild(style);
  }

  let lastY = window.scrollY;
  const collapseAt = 56;
  const expandAt = 8;
  const toggleCooldownMs = 220;
  let isCollapsed = false;
  let lastToggleAt = -Infinity;
  let ticking = false;

  function setCollapsed(collapsed, now) {
    if (collapsed === isCollapsed) return;
    isCollapsed = collapsed;
    lastToggleAt = now;
    headerEl.classList.toggle('is-collapsed', collapsed);
  }

  function handleScroll() {
    ticking = false;
    const currentY = window.scrollY;
    const delta = currentY - lastY;
    const now = performance.now();

    if (now - lastToggleAt < toggleCooldownMs) {
      lastY = currentY;
      return;
    }

    if (!isCollapsed && currentY > collapseAt && delta > 0) {
      setCollapsed(true, now);
    } else if (isCollapsed && (currentY <= expandAt || (delta < 0 && currentY < collapseAt))) {
      setCollapsed(false, now);
    }

    lastY = currentY;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(handleScroll);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  handleScroll();
}

window.setupCollapsibleHeader = setupCollapsibleHeader;

// Kick off MathJax readiness polling immediately
initMathJaxManager();

