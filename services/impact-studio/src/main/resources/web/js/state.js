/** Shared editor state, undo history, persistence, and document loading. */
"use strict";

const $ = (selector) => document.querySelector(selector);
const labels = {
    input: "Input / resource",
    activity: "Activity",
    output: "Output",
    outcome: "Outcome",
    impact: "Impact",
    precondition: "Precondition",
};
const colors = {
    input: "#9b9467",
    activity: "#769985",
    output: "#5a989e",
    outcome: "#8b80ac",
    impact: "#b39754",
    precondition: "#ad8777",
};
const storageKey = "pathway-studio-language-0.1";
let model,
    selection = null,
    zoom = 1,
    connecting = false,
    connectionStart = null,
    drag = null,
    history = [];
const escapeHtml = (value) =>
    String(value ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
    );
const isLink = (e) => e && ["contributesTo", "supports"].includes(e.localName);

/** Displays a temporary notification and replaces any pending notification timeout. */
function toast(message) {
    $("#toast").textContent = message;
    $("#toast").style.display = "block";
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => ($("#toast").style.display = "none"), 4500);
}
/** Captures the current document and active initiative for undo. */
function snapshot() {
    history.push({ xml: model.serialize(), initiativeId: model.initiativeId });
    if (history.length > 60) history.shift();
}
/** Persists the current XML in browser storage and refreshes the save and undo indicators. */
function save() {
    try {
        localStorage.setItem(storageKey, model.serialize());
        $("#saved").textContent = "Saved on this browser";
    } catch {
        $("#saved").textContent = "Storage unavailable — export XML";
    }
    $("#undo").disabled = !history.length;
}
/** Applies an undoable model edit and restores the previous document if the edit fails. */
function change(update, rebuildInspector = false) {
    snapshot();
    try {
        update();
        save();
        render();
        if (rebuildInspector) inspect();
    } catch (error) {
        // A failed edit must not leave a partially modified document or stale element selection.
        const previous = history.pop(),
            selectedId = selection ? model.id(selection) : null;
        if (previous) {
            model = new PathwayModel(previous.xml);
            model.initiativeId = previous.initiativeId;
            selection = selectedId ? model.byId(selectedId) || null : null;
            connecting = false;
            connectionStart = null;
            save();
            render();
            inspect();
        }
        toast(error.message);
    }
}
/** Loads a validated document, fills missing positions, and resets the editor selection. */
function load(xml, keepUndo = true) {
    const next = new PathwayModel(xml);
    if (model && keepUndo) snapshot();
    model = next;
    model.arrange(true);
    selection = null;
    connectionStart = null;
    connecting = false;
    save();
    render();
    inspect();
    $("#viewport").scrollTo(0, 0);
}
