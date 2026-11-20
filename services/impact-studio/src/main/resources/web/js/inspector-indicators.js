/** Indicator definitions, monitoring fields, computation details, and change specifications. */
"use strict";

/** Builds editable monitoring, computation, and expected-change fields for indicators. */
function indicatorsInspector(owner) {
  const indicators = model.children(owner, "indicator"),
    section = details("Indicators · " + indicators.length);
  for (const ind of indicators) {
    const card = document.createElement("div");
    card.className = "indicator";
    card.append(
      attributeField(ind, "name", "Indicator name"),
      textField(ind, "definition", "Definition"),
    );
    if (model.child(ind, "description"))
      card.append(textField(ind, "description", "Description / limitations"));
    card.append(
      refField(
        ind,
        "dataSource",
        "Data source",
        model
          .elements(model.initiative)
          .filter((e) => e.localName === "dataSource" && e.hasAttribute("id")),
      ),
      refField(
        ind,
        "owner",
        "Owner",
        model
          .elements(model.initiative)
          .filter((e) => e.localName === "actor" && e.hasAttribute("id")),
      ),
      textField(ind, "calculation", "Calculation"),
      textField(ind, "unit", "Unit"),
      textField(ind, "collectionSchedule", "Collection schedule"),
    );
    const target = details("Expected change");
    for (const [name, title] of [
      ["population", "Who or what changes?"],
      ["coverage", "How many change?"],
      ["magnitude", "How much do they change?"],
      ["deadline", "By when?"],
    ]) {
      target.append(
        field(
          title,
          model.text(model.child(ind, "change"), name),
          (value) => model.setText(model.container(ind, "change"), name, value),
          true,
        ),
      );
    }
    card.append(target);
    const local = details("Local computation");
    local.open = false;
    for (const [name, title] of [
      ["localDataMapping", "Local data mapping"],
      ["calculationOrCodingRule", "Calculation or coding rule"],
      ["missingDataRule", "Missing data rule"],
      ["deduplicationRule", "Deduplication rule"],
      ["localFeasibilityAssessment", "Feasibility assessment"],
    ]) {
      local.append(
        field(
          title,
          model.text(model.child(ind, "localComputation"), name),
          (value) => model.setText(model.container(ind, "localComputation"), name, value),
          true,
        ),
      );
    }
    local.append(
      paragraph(
        "Computing-actor references and additional computation attributes are retained in XML source.",
      ),
    );
    card.append(
      local,
      button("Remove indicator", () => {
        if (confirm("Remove this indicator?")) change(() => model.remove(ind), true);
      }),
    );
    section.append(card);
  }
  section.append(button("＋ Add indicator", () => change(() => model.addIndicator(owner), true)));
  return section;
}
