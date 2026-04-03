(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => main().catch(console.error));

  async function main() {
    const htmlFilename = window.location.pathname.split('/').pop();
    const jsonFilename = htmlFilename.replace(/\.html$/i, '.json');

    const data = await fetch(jsonFilename, { cache: 'no-store' }).then(r => r.json());
    const variants = await loadVariantData(data);
    const footerMeta = {
      max: null,
      classInfo: null,
      char: null,
    };


    const header = document.getElementById('page-header');
    const main = document.getElementById('main-content');
    const footer = document.getElementById('page-footer');

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
      ${renderVariantSelectorShell(variants)}
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

    if (variants.length > 1) {
      await initVariantSelector(variants, window.location.pathname.split('/').pop());
    }

    if (data.sylow_information && window.displaySylowInformation) {
      await displaySylowInformation(data);
    }

    if (data.maximals_information && window.displayMaxTable) {
      footerMeta.max = await displayMaxTable(data);
      updatePageFooter(data, footerMeta);
    }

    if (data.class_information && window.displayClassTable) {
      footerMeta.classInfo = await displayClassTable(data);
      updatePageFooter(data, footerMeta);
    }

    if (data.character_information && window.displayCharTable) {
      footerMeta.char = await displayCharTable(data);
      updatePageFooter(data, footerMeta);
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

 //     <div id="group-page-footer-slot">
        footer.innerHTML =`${renderPageFooter(data, footerMeta)}`;
 //     </div>

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

  function renderPageFooter(data, footerMeta) {
    const maxDetails = footerMeta?.max ? `
      <details id="maximal-subgroups-footer-metadata">
        <summary>Maximal subgroups</summary>
        ${renderFileMetadataInfo(footerMeta.max, "Maximal subgroups information created by")}
      </details>
    ` : '';
    const classDetails = footerMeta?.classInfo ? `
      <details id="conjugacy-classes-footer-metadata">
        <summary>Conjugacy classes</summary>
        ${renderFileMetadataInfo(footerMeta.classInfo, "Conjugacy class information created by")}
      </details>
    ` : '';
    const charDetails = footerMeta?.char ? `
      <details id="character-table-footer-metadata">
        <summary>Character table</summary>
        ${renderFileMetadataInfo(footerMeta.char, "Ordinary character information created by")}
      </details>
    ` : '';


    return `
      <footer id="group-page-footer">
          ${renderFileMetadataInfo(data, "Main page created by")}
          ${maxDetails}
          ${classDetails}
          ${charDetails}
      </footer>
    `;
  }

  function updatePageFooter(data, footerMeta) {
    const slot = document.getElementById('group-page-footer-slot');
    if (!slot) return;
    slot.innerHTML = renderPageFooter(data, footerMeta);
  }



})();
