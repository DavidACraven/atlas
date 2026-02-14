function renderBreadcrumbsForTypePage() {
  const container = document.getElementById("breadcrumbs");
  container.innerHTML = ""; // Clear placeholder

  const crumbs = [];

  // "All groups" link
  const allGroups = document.createElement("a");
  allGroups.href = "../index.html";
  allGroups.textContent = "All groups";
  crumbs.push(allGroups);

  // Get filename like "alternating.html"
  const pathParts = window.location.pathname.split('/');
  const filename = pathParts[pathParts.length - 1];
  const type = filename.replace(/\.html$/, '');

  // Capitalize and format
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1) + " groups";
  const typeSpan = document.createElement("span");
  typeSpan.textContent = typeLabel;
  crumbs.push(typeSpan);

  // Join with >
  for (let i = 0; i < crumbs.length; i++) {
    container.appendChild(crumbs[i]);
    if (i < crumbs.length - 1) {
      container.appendChild(document.createTextNode(" > "));
    }
  }
}

document.getElementById("page-header").innerHTML =
  `<h1>ATLAS of Finite Groups V4</h1><nav id="breadcrumbs">Loading breadcrumbs...</nav>`;

renderBreadcrumbsForTypePage(); // Add breadcrumbs
