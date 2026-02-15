(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => main().catch(console.error));

  async function main() {
    const htmlFilename = window.location.pathname.split('/').pop();
    const jsonFilename = htmlFilename.replace(/\.html$/i, '.json');

    const data = await fetch(jsonFilename, { cache: 'no-store' }).then(r => r.json());

    const header = document.getElementById('page-header');
    const main = document.getElementById('main-content');

    // Header
    header.innerHTML = `
      <h1>ATLAS of Group Representations V4</h1>
      <nav id="breadcrumbs" aria-label="Breadcrumbs"></nav>
    `;
const bc = document.getElementById('breadcrumbs');
await setHTML(bc, renderBreadcrumbs(data));
setupCollapsibleHeader(header);

    // Main
    const html = `
      <a id="main-cont" tabindex="-1"></a>
      <h1 id="top">${renderMath(data.name)}</h1>
      ${renderGroupProperties(data)}
      ${renderVariantSelectorShell(data)}
      ${renderStandardGenerators(data)}
      ${data.sylow_information ? `
        <h2 id="sylow-head">Sylow information</h2>
        <div id="sylow-table">Loading...</div>
      ` : ''}
      ${data.maximals_information ? `
        <h2 id="max-head">Maximal subgroups</h2>
        <div id="max-table">Loading...</div>
      ` : ''}
      ${data.class_information ? `
        <h2 id="class-head">Conjugacy classes</h2>
        <div id="class-table">Loading...</div>
      ` : ''}
      ${data.character_information ? `
        <h2 id="char-head">Character table</h2>
        <div id="char-table">Loading...</div>
      ` : ''}
      ${data.brauer_information ? `
        <h2 id="mod-head">Modular information</h2>
        <div id="mod-info">Loading...</div>
      ` : ''}
      ${data.representations?.permutation ? `
        <h2 id="perm-head">Permutation representations</h2>
        <div id="perm-table">Loading...</div>
      ` : ''}
      ${data.representations?.linear ? `
        <h2 id="lin-head">Linear representations</h2>
        <div id="lin-table">Loading...</div>
      ` : ''}

    `;
    await setHTML(main, html); // setHTML should typeset

    if (data.variants && data.variants.length > 1) {
      await initVariantSelector(data, window.location.pathname.split('/').pop());
    }

    if (data.sylow_information && window.displaySylowInformation) {
      await displaySylowInformation(data);
    }

    if (data.maximals_information && window.displayMaxTable) {
      await displayMaxTable(data);
    }

    if (data.class_information && window.displayClassTable) {
      await displayClassTable(data);
    }

    if (data.character_information && window.displayCharTable) {
      await displayCharTable(data);
    }

    if (data.brauer_information && window.displayModularData) {
      await displayModularData(data);
    }

    if (data.representations?.permutation && window.displayPermTable) {
      await displayPermTable(data);
    }

    if (data.representations?.linear && window.displayLinTable) {
      await displayLinTable(data);
    }

await typesetFresh(main);

let navPanel = document.getElementById('nav-panel');
if (!navPanel) {
  navPanel = document.createElement('div');
  navPanel.id = 'nav-panel';
  document.body.appendChild(navPanel);
}


const navpaneldata = renderNavPanelHTML(data);
navPanel.innerHTML = navpaneldata.html;
navPanel.classList.add('collapsed');
setupScrollHighlighting(navpaneldata.sections);

  }

})();
