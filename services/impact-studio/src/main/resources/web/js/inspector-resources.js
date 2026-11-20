/** Resource-support inspection and attachment controls. */
"use strict";

/** Builds controls for inspecting and editing resource-support relationships. */
function resourcesInspector(e) {
  const own = e.localName === "input",
    section = details(own ? "Supports activities" : "Supporting inputs / resources");
  const links = model
    .links()
    .filter(
      (l) => l.localName === "supports" && l.getAttribute(own ? "from" : "to") === model.id(e),
    );
  for (const link of links) {
    const target = model.byId(link.getAttribute(own ? "to" : "from"));
    section.append(
      linkRow(model.label(target), target),
      button("Edit support link", () => navigate(link)),
    );
  }
  if (!links.length) section.append(paragraph("No resource support links defined."));
  const candidates = model
    .blocks()
    .filter(
      (n) =>
        n.localName === (own ? "activity" : "input") &&
        !links.some((l) => l.getAttribute(own ? "to" : "from") === model.id(n)),
    );
  section.append(
    picker(
      own ? "Link an activity" : "Attach a resource",
      "",
      [["", "Choose…"], ...candidates.map((n) => [model.id(n), model.label(n)])],
      (value) => {
        if (value) model.connect(own ? e : model.byId(value), own ? model.byId(value) : e);
      },
    ),
    paragraph(
      "A supports link describes enabling support, not proof of actual allocation or causal sufficiency.",
    ),
  );
  return section;
}
