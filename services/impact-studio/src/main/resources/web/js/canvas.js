/** Canvas rendering, connection curves, zoom geometry, and accountability ceiling. */
"use strict";

/** Uses the rendered block height when available, otherwise the model estimate. */
function nodeHeight(e){
    return (
        Array.from(document.querySelectorAll("#nodes .node")).find(
            (node) => node.dataset.id === model.id(e),
            )?.offsetHeight || model.estimatedHeight(e)
    );
}

/** Calculates canvas bounds large enouigh to contain every visible blocks */
function graphExtent(){
    return {
        width: Math.max(900, ...model.blocks().map((e) => model.position(e).x + 260)),
        height: Math.max(650, ...model.blocks().map((e) => model.position(e).y + nodeHeight(e)+100)),
    };
}

/** Rebuilds the pathway blocks and updates canvas geometry and editor status */
function render() {
    model.arrange(true);
    $("#title").textContent = model.initiative.getAttribute("name") || "Untitled initiative";
    $("#summary").textContent =
        "Impact Pathway 0.1 · " +
        (model.initiative.getAttribute("type") || "programme") +
        " · one initiative per canvas";
    $("#nodes").innerHTML = model
        .blocks()
        .map((e) => {
            const p = model.position(e),
                count = model.children(e, "indicator").length;
            const description = model.label(e);
            return `<article class="node ${selection === e ? "selected" : ""}" style="left:${p.x}px;top:${p.y}px;--accent:${colors[e.localName]}" data-id="${escapeHtml(model.id(e))}" tabindex="0" role="button" aria-label="Edit ${escapeHtml(description)}"><div class="type">${labels[e.localName]}</div><h3>${escapeHtml(description)}</h3><div class="meta">${count} indicators${e.localName === "precondition" ? (e.getAttribute("targetRef") ? " · attached" : " · no target") : ""}</div></article>`;
        })
        .join("");
    renderGeometry();
    const links = model.links(),
        conditions = model.blocks().filter((e) => e.localName === "precondition");
    $("#counts").textContent =
        `${model.blocks().length} blocks · ${links.filter((e) => e.localName === "contributesTo").length} contributions · ${links.filter((e) => e.localName === "supports").length} resource links · ${conditions.filter((e) => e.getAttribute("targetRef")).length} preconditions`;
    $("#connect").classList.toggle("active", connecting);
    $("#hint").textContent = connecting
        ? connectionStart
            ? "Select the destination · Esc cancels"
            : "Select the starting block · Esc cancels"
        : "Blue: resource support · Grey: contribution · Dashed: precondition";
    $("#undo").disabled = !history.length;
}

/** Updates canvas dimensions, zoom, connections and the accountability ceiling.*/
function renderGeometry(){
    const size = graphExtent();
    $("#world").style.width = size.width + "px";
    $("#world").style.height = size.height + "px";
    $("#world").style.transform = `scale(${zoom})`;
    $("#canvas-space").style.width = Math.ceil(size.width * zoom) + "px";
    $("#canvas-space").style.height = Math.ceil(size.height*zoom) + "px";
    $("#zoom").textContent = Math.round(zoom*100)+"px";
    drawLinks();
    drawCeiling();
}

/** Constructs a curved SVG connection between the facing edges of two blocks. */
function curve(a, b) {
    const p = model.position(a),
        q = model.position(b),
        upward = q.y < p.y;
    const x = p.x + 104,
        y = p.y + (upward ? 0 : nodeHeight(a)),
        tx = q.x + 104,
        ty = q.y + (upward ? nodeHeight(b) : 0);
    // A minimum bend keeps short links readable without changing their endpoints.
    const bend = Math.max(65, Math.abs(ty - y) * 0.45) * (upward ? -1 : 1);
    return `M${x},${y} C${x},${y + bend} ${tx},${ty - bend} ${tx},${ty}`;
}

/** Renders contribution, resource-support, and precondition connections. */
function drawLinks() {
    const visible = new Set(model.blocks());
    $("#lines").innerHTML = model
        .links()
        .map((link) => {
            const a = model.byId(link.getAttribute("from")),
                b = model.byId(link.getAttribute("to"));
            if (!visible.has(a) || !visible.has(b)) return "";
            const path = curve(a, b),
                selected = selection === link ? "selected" : "";
            return `<g data-edge="${escapeHtml(model.id(link))}"><path d="${path}" class="edge-line ${link.localName === "supports" ? "resource-support" : ""} ${selected}"/><path d="${path}" class="edge-hit"/><title>${escapeHtml(model.text(link, "rationale") || "Select to explain this connection")}</title></g>`;
        })
        .join("");
    $("#lines").innerHTML += model
        .blocks()
        .filter((e) => e.localName === "precondition")
        .map((e) => {
            const target = model.byId(e.getAttribute("targetRef"));
            if (!visible.has(target)) return "";
            const path = curve(e, target);
            return `<g data-condition="${escapeHtml(model.id(e))}"><path d="${path}" class="support-line ${selection === e || selection === target ? "selected" : ""}"/><path d="${path}" class="edge-hit"/><title>${escapeHtml(model.label(e) + " is required for " + model.label(target))}</title></g>`;
        })
        .join("");
}

/** Renders contribution, resource-support and precodntion connection*/
function drawCeiling(){
    const y = model.ceilingY(nodeHeight),
        layer = $("#accountability-ceiling");
    layer.replaceChildren();
    $("#accountability").textContent =
        y===null?"Ceiling: add an impact":"Accountability ceiling";
    if(y===null) return;
    layer.className = "ceiling-line";
    layer.style.top = y+"px";
    const label = button("ACCOUNTABILITY CEILING", () => {
        $("#viewport").scrollTo({
            top: Math.max(0,y*zoom-$("#viewport").clientHeight /2),
            behavior: "smooth",
        });
    });
    label.classname="ceiling-label";
    label.title =
        "Automatically placed below the lowest impact block. No accountability memberhips are added to XML.";
    layer.append(label);
    const misplaced = model
        .blocks()
        .filter(
            (e) =>
                ["outcome", "output", "activity", "input"].includes(e.localName) && model.position(e).y < y,
        );
    if (misplaced.length) label.textContent += " • arrange vertically to keep other results below";
}