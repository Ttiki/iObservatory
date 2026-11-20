/** Application startup, example loading, global shortcurts and compiuler navifation */
"use strict";

const starter = `<?xml version="1.0" encoding="UTF-8"?>
<impactModel xmlns="urn:impact-pathway:0.1" id="new-model" version="0.1" xml:lang="en">
  <initiative id="new-programme" name="Untitled programme" type="programme">
    <inputs/><assumptions/><preconditions/><activities>
      <activity id="activity-1" name="Deliver programme activities"/>
    </activities>
    <pathway><impact id="impact-1" name="Sustained positive change"/><outcome id="outcome-1" name="Participants apply new capabilities"/><output id="output-1" name="Participants complete activities"/></pathway>
    <relationships><contributesTo id="link-1" from="activity-1" to="output-1"/><contributesTo id="link-2" from="output-1" to="outcome-1"/><contributesTo id="link-3" from="outcome-1" to="impact-1"/></relationships>
  </initiative>
</impactModel>`;
$("#new").onclick = () => {
    if (
        confirm(
            "Start a nwew programme? Export current work if you need a separate copy. You can undo this.",
        )
    )
        load(starter);
};

$("#example").onclick = async () => {
    if (!confirm("Replace the canvas with the new DTO-BIP example? You can undo this.")) return;
    try{
        const response = await fetch("example.xml");
        if (!response.ok) throw new Error("Example unavailable");
        load(await response.text());
    }catch{
        toast("For a local file, use Import XML and choose example.xml from this folder.");
    }
};

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        connecting = false;
        connectionStart=null;
        render();
    }
    if (
        (event.ctrlKey || event.metaKey) &&
        event.key === "z" &&
        !event.target.matches("input, textarea")
    ){
        event.preventDefault();
        $("#undo".click());
    }
});
try{
    const saved = localStorage.getItem(storageKey);
    load(saved || starter, false);
}catch(error){
    load(starter, false);
    toast("Could not restore this editor's autosave: "+ error.message);
}
history=[];
$("#undo").disabled=true;

/** Opens the compiler with the current programme XML. */
document.getElementById("build-model").onclick = () => {
    try {
        sessionStorage.setItem(
            "impact-studio-build-source",
            model.serialize()
        );
        window.location.href = "build.html";
    } catch (error) {
        console.error("Could not open the compiler:", error);
        alert("Could not open the compiler: " + error.message);
    }
};
