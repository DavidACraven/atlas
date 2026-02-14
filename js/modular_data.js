function renderBlockInterface(blocks, prime, container, symbols, groupData) {
  if (!blocks || blocks.length === 0) return;

  const label = document.createElement("label");
  label.textContent = "Select a block: ";
  label.setAttribute("for", "block-select");

  const select = document.createElement("select");
  select.id = "block-select";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- choose a block --";
  select.appendChild(defaultOption);

  blocks.forEach((block, i) => {
    const option = document.createElement("option");
    let text = `Block ${i + 1} (defect ${block.defect}`;
    if (block.principal) text += ", principal";
    text += ")";
    option.value = i;
    option.textContent = text;
    select.appendChild(option);
  });

  const info = document.createElement("p");
  info.id = "block-info";
  info.style.marginTop = "1em";

  container.appendChild(label);
  container.appendChild(select);
  container.appendChild(info);

  const matrixContainer = document.createElement("div");
  matrixContainer.id = "decomposition-matrix";
  matrixContainer.style.marginTop = "1em";
  matrixContainer.innerHTML = "";
  container.appendChild(matrixContainer);

  select.addEventListener("change", async () => {
    const index = parseInt(select.value, 10);
    if (isNaN(index)) {
      info.textContent = "";
      matrixContainer.innerHTML = "";
      return;
    }

    const block = blocks[index];
    const numOrdinary = block.ordinary_characters.length;
    const numModular = block.modular_characters.length;

    info.textContent =
      `Block ${index + 1} contains ${numOrdinary} ordinary character${numOrdinary !== 1 ? "s" : ""} ` +
      `and ${numModular} modular character${numModular !== 1 ? "s" : ""}.`;

    matrixContainer.innerHTML = "";

    if (block.decomposition_matrix) {
      const matrixTitle = document.createElement("h4");
      matrixTitle.textContent = "Decomposition matrix";
      matrixContainer.appendChild(matrixTitle);

      const table = document.createElement("table");
      table.classList.add("dec-table");

      // THEAD
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");
      headerRow.appendChild(document.createElement("th"));

      block.modular_characters.forEach(modChar => {
        const th = document.createElement("th");
        th.innerHTML = formatCharacterID(modChar);
        th.style.textAlign = "right";
        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);

      // TBODY
      const tbody = document.createElement("tbody");

      block.ordinary_characters.forEach((ordChar, i) => {
        const row = document.createElement("tr");

        const rowHeader = document.createElement("th");
        rowHeader.innerHTML = formatCharacterID(ordChar);
        row.appendChild(rowHeader);

        block.decomposition_matrix[i].forEach(entry => {
          const td = document.createElement("td");
          td.textContent = String(entry) === "0" ? "." : String(entry);
          td.style.textAlign = "right";
          row.appendChild(td);
        });

        tbody.appendChild(row);
      });

      table.appendChild(tbody);
      matrixContainer.appendChild(table);

      if (block.cartan_matrix) {
        const cartanTitle = document.createElement("h4");
        cartanTitle.textContent = "Cartan matrix";
        matrixContainer.appendChild(cartanTitle);

        const cartanTable = document.createElement("table");
        cartanTable.classList.add("cartan-matrix");

        const cartanBody = document.createElement("tbody");
        block.cartan_matrix.forEach(rowData => {
          const row = document.createElement("tr");
          rowData.forEach(entry => {
            const cell = document.createElement("td");
            cell.textContent = String(entry);
            cell.style.textAlign = "right";
            row.appendChild(cell);
          });
          cartanBody.appendChild(row);
        });

        cartanTable.appendChild(cartanBody);
        matrixContainer.appendChild(cartanTable);
      }

      if (block.ext_1_matrix) {
        const extTitle = document.createElement("h4");
        extTitle.innerHTML = "Ext<sup>1</sup> matrix";
        matrixContainer.appendChild(extTitle);

        const extTable = document.createElement("table");
        extTable.classList.add("cartan-matrix");

        const extBody = document.createElement("tbody");
        block.ext_1_matrix.forEach(rowData => {
          const row = document.createElement("tr");
          rowData.forEach(entry => {
            const td = document.createElement("td");
            td.textContent = entry === null ? "?" : String(entry);
            td.style.textAlign = "right";
            row.appendChild(td);
          });
          extBody.appendChild(row);
        });

        extTable.appendChild(extBody);
        matrixContainer.appendChild(extTable);
      }

      // Typeset any MathJax in character ids etc.
      if (window.typesetFresh) {
        await typesetFresh(matrixContainer);
      } else if (window.MathJax?.typesetPromise) {
        await MathJax.typesetPromise([matrixContainer]);
      }

      // Highlighting (works after DOM exists)
      enableCharTableHighlighting("decomposition-matrix");
    }
  });
}

async function displayModularData(data) {
  const container = document.getElementById("mod-info");
  if (!container || !data.brauer_information) return;

  const symbols = await fetch(data.symbol_definitions, { cache: "no-store" }).then(r => r.json());

  container.innerHTML = "";

  const label = document.createElement("label");
  label.textContent = "Select a prime: ";
  label.setAttribute("for", "prime-select");

  const select = document.createElement("select");
  select.id = "prime-select";

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "-- choose a prime --";
  select.appendChild(defaultOption);

  // data.brauer_information is assumed to be a map prime -> filename
  for (const prime in data.brauer_information) {
    const option = document.createElement("option");
    option.value = data.brauer_information[prime];
    option.textContent = `Prime ${prime}`;
    select.appendChild(option);
  }

  const output = document.createElement("div");
  output.id = "brauer-output";
  output.style.marginTop = "1em";

  container.appendChild(label);
  container.appendChild(select);
  container.appendChild(output);

  select.addEventListener("change", async () => {
    const file = select.value;
    if (!file) {
      output.innerHTML = "";
      return;
    }

    try {
      const brauerData = await fetch(`./${file}`, { cache: "no-store" }).then(r => {
        if (!r.ok) throw new Error(`Failed to load ${file}`);
        return r.json();
      });

      output.innerHTML = "";

      const phi1 = brauerData.characters.find(c => c.id === "phi1");
      if (!phi1) {
        output.textContent = "Error: phi1 not found in character list.";
        return;
      }

      const keepIndices = phi1.values
        .map((v, i) => (v !== "0" ? i : null))
        .filter(i => i !== null);

      const primeText = select.options[select.selectedIndex].textContent;
      const p = primeText.replace("Prime ", "").trim();

      const heading = document.createElement("h3");
      heading.textContent = "Brauer character table";

      const intro = document.createElement("p");
      intro.textContent =
        `There are ${keepIndices.length} classes of ${p}-regular elements in the group. ` +
        `The Brauer character table is as follows.`;

      output.appendChild(heading);
      output.appendChild(intro);

      const table = document.createElement("table");
      table.classList.add("brauer-char-table");

      // THEAD
      const thead = document.createElement("thead");
      const header = document.createElement("tr");
      header.appendChild(document.createElement("th"));

      for (const i of keepIndices) {
        const th = document.createElement("th");
        th.textContent = data.class_names[i];
        header.appendChild(th);
      }
      thead.appendChild(header);
      table.appendChild(thead);

      // TBODY
      const tbody = document.createElement("tbody");
      for (const char of brauerData.characters) {
        const row = document.createElement("tr");

        const idCell = document.createElement("th");
        idCell.innerHTML = formatCharacterID(char.id);
        row.appendChild(idCell);

        for (const i of keepIndices) {
          const valCell = document.createElement("td");
          valCell.style.textAlign = "right";
          valCell.innerHTML = substitute(char.values[i], symbols);
          row.appendChild(valCell);
        }

        tbody.appendChild(row);
      }
      table.appendChild(tbody);
      output.appendChild(table);

      // Typeset MathJax in substitute() outputs / character ids
      if (window.typesetFresh) {
        await typesetFresh(output);
      } else if (window.MathJax?.typesetPromise) {
        await MathJax.typesetPromise([output]);
      }

      enableCharTableHighlighting("mod-info");

      const blockHeader = document.createElement("h3");
      blockHeader.textContent = "Block information";
      output.appendChild(blockHeader);

      const blockIntro = document.createElement("p");
      const numBlocks = brauerData.blocks.length;
      blockIntro.textContent =
        `There ${numBlocks === 1 ? "is" : "are"} ${numBlocks} block${numBlocks === 1 ? "" : "s"} for the prime ${p}.`;
      output.appendChild(blockIntro);

      renderBlockInterface(brauerData.blocks, p, output, symbols, data);

    } catch (err) {
      output.textContent = `Error loading Brauer data: ${err}`;
    }
  });
}
