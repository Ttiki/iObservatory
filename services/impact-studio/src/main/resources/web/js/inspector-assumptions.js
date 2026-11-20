/** Assumption inspection and attachment controls. */
"use strict";

/** Builds controls for viewing, editing, attaching, and detaching assumptions. */
function assumptionsInspector(owner) {
  const section = details("Assumptions");
  for (const ref of model.children(owner, "assumption").filter((e) => e.hasAttribute("ref"))) {
    const assumption = model.byId(ref.getAttribute("ref")),
      card = document.createElement("div");
    card.className = "indicator";
    if (!assumption) {
      card.append(paragraph("Unresolved assumption reference."));
      section.append(card);
      continue;
    }
    card.append(
      textField(assumption, "description", "Assumption"),
      textField(assumption, "risk", "Risk"),
    );
    const uses = model
      .elements(model.initiative)
      .filter(
        (e) => e.localName === "assumption" && e.getAttribute("ref") === model.id(assumption),
      ).length;
    if (uses > 1)
      card.append(paragraph(`Shared by ${uses} references. Edits update the shared assumption.`));
    if (model.children(assumption, "indicator").length)
      card.append(indicatorsInspector(assumption));
    card.append(
      button("Detach from this element", () => change(() => ref.parentNode.removeChild(ref), true)),
    );
    section.append(card);
  }
  const attached = model.children(owner, "assumption").map((e) => e.getAttribute("ref"));
  section.append(
    picker(
      "Attach existing assumption",
      "",
      [
        ["", "Choose an assumption…"],
        ...model
          .assumptions()
          .filter((e) => !attached.includes(model.id(e)))
          .map((e) => [model.id(e), model.label(e)]),
      ],
      (value) => {
        if (value) model.attachAssumption(owner, model.byId(value));
      },
    ),
    button("＋ New assumption", () => change(() => model.addAssumption(owner), true)),
  );
  return section;
}
