/** Palette actions, pointer and keyboard canvas interactions, undo, and zoom controls. */
"use strict";

for (const type of PathwayModel.blockTypes) {
  const add = button("", () =>
    change(() => {
      const e = model.addBlock(type),
        viewport = $("#viewport");
      model.setPosition(e, viewport.scrollLeft / zoom + 65, viewport.scrollTop / zoom + 65);
      selection = e;
    }, true),
  );
  add.className = "palette";
  add.innerHTML = `<span class="dot" style="background:${colors[type]}"></span>${labels[type]}<span>＋</span>`;
  $("#palette").append(add);
}
$("#nodes").addEventListener("pointerdown", (event) => {
  const node = event.target.closest(".node");
  if (!node) return;
  const e = model.byId(node.dataset.id);
  if (connecting) {
    select(e);
    return;
  }
  drag = {
    e,
    node,
    startX: event.clientX,
    startY: event.clientY,
    ...model.position(e),
    moved: false,
  };
  node.setPointerCapture(event.pointerId);
});
$("#nodes").addEventListener("pointermove", (event) => {
  if (!drag) return;
  const dx = (event.clientX - drag.startX) / zoom,
    dy = (event.clientY - drag.startY) / zoom;
  if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) {
    snapshot();
    drag.moved = true;
  }
  if (!drag.moved) return;
  model.setPosition(drag.e, drag.x + dx, drag.y + dy);
  const p = model.position(drag.e);
  drag.node.style.left = p.x + "px";
  drag.node.style.top = p.y + "px";
  renderGeometry();
});
/** Finishes a drag by saving movement or selecting an unmoved block. */
function finishDrag(cancelled = false) {
  if (!drag) return;
  const finished = drag;
  drag = null;
  if (finished.moved) {
    save();
    render();
  } else if (!cancelled) select(finished.e);
}
$("#nodes").addEventListener("pointerup", () => finishDrag());
$("#nodes").addEventListener("pointercancel", () => finishDrag(true));
$("#nodes").addEventListener("keydown", (event) => {
  if (["Enter", " "].includes(event.key)) {
    const node = event.target.closest(".node");
    if (node) {
      event.preventDefault();
      select(model.byId(node.dataset.id));
    }
  }
});
$("#lines").onclick = (event) => {
  const link = event.target.closest("[data-edge], [data-condition]");
  if (link) navigate(model.byId(link.dataset.edge || link.dataset.condition));
};
$("#programme").onclick = () => navigate(null);
$("#accountability").onclick = () => {
  const y = model.ceilingY(nodeHeight);
  if (y === null) toast("Add an impact block to show the ceiling.");
  else
    $("#viewport").scrollTo({
      top: Math.max(0, y * zoom - $("#viewport").clientHeight / 2),
      behavior: "smooth",
    });
};
$("#connect").onclick = () => {
  connecting = !connecting;
  connectionStart = null;
  render();
};
$("#arrange").onclick = () => change(() => model.arrange());
$("#undo").onclick = () => {
  const previous = history.pop();
  if (!previous) return;
  load(previous.xml, false);
  if (model.initiatives().some((e) => model.id(e) === previous.initiativeId))
    model.initiativeId = previous.initiativeId;
  selection = null;
  render();
  inspect();
  save();
};
/** Applies bounded canvas zoom and refreshes its geometry. */
function setZoom(value) {
  zoom = Math.max(0.1, Math.min(1.8, value));
  renderGeometry();
}
$("#minus").onclick = () => setZoom(zoom - 0.1);
$("#plus").onclick = () => setZoom(zoom + 0.1);
$("#fit").onclick = () => {
  const size = graphExtent();
  setZoom(
    Math.min(
      1,
      ($("#viewport").clientWidth - 25) / size.width,
      ($("#viewport").clientHeight - 25) / size.height,
    ),
  );
  $("#viewport").scrollTo(0, 0);
};
