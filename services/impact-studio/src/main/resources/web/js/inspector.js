/** Inspector dispatch and connection-mode selection. */
"use strict";

/** Rebuilds the inspector for the programme, selected block, or selected relationship. */
function inspect() {
  const box = $("#inspector");
  box.replaceChildren();
  const e = selection || model.initiative;
  const badge = document.createElement("span");
  badge.className = "badge";
  badge.textContent =
    e === model.initiative
      ? "Initiative"
      : isLink(e)
        ? e.localName === "supports"
          ? "Resource support"
          : "Expected contribution"
        : labels[e.localName] || e.localName;
  box.append(
    badge,
    Object.assign(document.createElement("h2"), {
      textContent: e === model.initiative ? "Programme details" : "Edit details",
    }),
  );
  if (e === model.initiative) {
    if (model.initiatives().length > 1)
      box.append(
        picker(
          "Active initiative",
          model.initiativeId,
          model.initiatives().map((n) => [model.id(n), model.label(n)]),
          (value) => {
            model.initiativeId = value;
            selection = null;
            $("#viewport").scrollTo(0, 0);
          },
        ),
      );
    box.append(
      attributeField(e, "name", "Name"),
      attributeField(e, "type", "Initiative type"),
      textField(e, "description", "Description"),
      paragraph(
        "The accountability ceiling is drawn below the lowest impact block. It is a canvas convention, not an XML membership or per-result attribute.",
      ),
      paragraph("XML namespace: " + PathwayModel.namespace),
    );
    return;
  }
  box.append(paragraph("ID: " + model.id(e)));
  if (isLink(e)) {
    box.append(
      paragraph(
        model.label(model.byId(e.getAttribute("from"))) +
          " → " +
          model.label(model.byId(e.getAttribute("to"))),
      ),
    );
    const rationale = model.child(e, "rationale");
    box.append(
      field(
        "Rationale",
        rationale ? model.text(rationale, "description") || rationale.textContent : "",
        (value) => {
          const r = model.container(e, "rationale");
          if (model.children(r).length) model.setText(r, "description", value);
          else r.textContent = value;
        },
        true,
      ),
      textField(e, "validationQuestion", "Validation question"),
    );
    if (e.localName === "contributesTo") box.append(assumptionsInspector(e));
  } else {
    if (e.localName !== "precondition") box.append(attributeField(e, "name", "Name"));
    box.append(
      textField(e, "description", e.localName === "precondition" ? "Precondition" : "Description"),
    );
    if (e.localName === "outcome") box.append(attributeField(e, "horizon", "Outcome horizon"));
    if (e.localName === "input") box.append(attributeField(e, "type", "Resource type"));
    box.append(indicatorsInspector(e), preconditionsInspector(e));
    if (["input", "activity"].includes(e.localName)) box.append(resourcesInspector(e));
    if (e.localName === "precondition") box.append(assumptionsInspector(e));
  }
  const extra = details("Additional XML attributes");
  extra.open = false;
  for (const attr of Array.from(e.attributes))
    if (
      !["id", "name", "from", "to", "targetRef", "type", "horizon"].includes(attr.name) &&
      !attr.name.startsWith("xmlns")
    )
      extra.append(attributeField(e, attr.name, attr.name));
  extra.append(
    paragraph(
      "Unexposed nested elements, sources and provenance are retained. Use XML source to edit the complete document.",
    ),
  );
  box.append(extra);
  const remove = button(isLink(e) ? "Delete connection" : "Delete block", () => {
    if (confirm("Delete this element and its references? Undo can restore it."))
      change(() => {
        model.remove(e);
        selection = null;
      }, true);
  });
  remove.className = "delete";
  box.append(remove);
}

/** Selects an element or completes a connection when connection mode is active. */
function select(e) {
  if (!connecting) {
    navigate(e);
    return;
  }
  if (!connectionStart) {
    connectionStart = e;
    render();
    return;
  }
  const a = connectionStart;
  if ((a.localName === "precondition" || e.localName === "precondition") && a !== e) {
    const condition = a.localName === "precondition" ? a : e,
      target = condition === a ? e : a;
    if (
      condition.getAttribute("targetRef") &&
      condition.getAttribute("targetRef") !== model.id(target)
    ) {
      toast(
        "This precondition already has a target. Select it and change Required for to move it.",
      );
      connecting = false;
      connectionStart = null;
      render();
      return;
    }
  }
  change(() => {
    selection = model.connect(a, e);
    connecting = false;
    connectionStart = null;
  }, true);
}
