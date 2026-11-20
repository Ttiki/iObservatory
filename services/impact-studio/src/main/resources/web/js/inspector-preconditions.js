/** Precondition editing and target navigation. */
"use strict";

/** Shows required conditions on targets and the target reference on a precondition. */
function preconditionsInspector(e) {
  const own = e.localName === "precondition",
    section = details(own ? "Required for" : "Required preconditions");
  if (own) {
    const target = model.byId(e.getAttribute("targetRef"));
    if (target)
      section.append(
        linkRow(model.label(target), target, () =>
          change(() => e.removeAttribute("targetRef"), true),
        ),
      );
    section.append(
      picker(
        "Required for",
        e.getAttribute("targetRef"),
        [
          ["", "Unattached"],
          ...model
            .blocks()
            .filter((n) => n.localName !== "precondition")
            .map((n) => [model.id(n), model.label(n)]),
        ],
        (value) => {
          if (value) e.setAttribute("targetRef", value);
          else e.removeAttribute("targetRef");
        },
      ),
      textField(e, "rationale", "Why this precondition matters"),
      paragraph(
        "A precondition has one target in this language. Changing the target moves the attachment; it does not create a reverse requirement.",
      ),
    );
  } else {
    const attached = model.preconditionsFor(e);
    for (const condition of attached)
      section.append(
        linkRow(model.label(condition), condition, () =>
          change(() => condition.removeAttribute("targetRef"), true),
        ),
      );
    if (!attached.length) section.append(paragraph("No preconditions attached."));
    section.append(
      picker(
        "Attach an unassigned precondition",
        "",
        [
          ["", "Choose a precondition…"],
          ...model
            .blocks()
            .filter((n) => n.localName === "precondition" && !n.getAttribute("targetRef"))
            .map((n) => [model.id(n), model.label(n)]),
        ],
        (value) => {
          if (value) model.assignPrecondition(model.byId(value), e);
        },
      ),
      button("＋ New precondition", () =>
        change(() => {
          const condition = model.addBlock("precondition");
          model.assignPrecondition(condition, e);
          model.arrange(true);
        }, true),
      ),
      paragraph(
        "Individual targetRef attachments are preserved. This version of the language does not define all/any groups.",
      ),
    );
  }
  return section;
}
