/**Connects the compiler workspace to the Java validatioln and build API.*/

const editor = document.getElementById("xml");
editor.value = sessionStorage.getItem('impact-studio-build-source') || '';
const report = document.getElementById('report');
const buttons = [...document.querySelectorAll('button')];
document.getElementById('file').addEventListener('change', async (event) => {
    if (event.target.files[0]) editor.value = await event.target.files[0].text();
});
document.getElementById("example").addEventListener('click', async (event) => {
    editor.value = (await fetch('example.xml')).text();
});

/**
 * Validates the model or deploys it to the configured database.
 * Both operations display a JSON report instead of downloading files.
 */
async function build(action) {
  const token = document.getElementById("deploy-token").value;

  if (action === "compile" && !token) {
    report.textContent = "Enter the deployment token.";
    return;
  }

  buttons.forEach((button) => {
    button.disabled = true;
  });

  report.textContent =
    action === "compile"
      ? "Compiling and deploying..."
      : "Validating...";

  try {
    const headers = {
      "Content-Type": "application/xml"
    };

    if (action === "compile") {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`api/${action}`, {
      method: "POST",
      headers,
      body: editor.value
    });

    const text = await response.text();

    try {
      report.textContent = JSON.stringify(
        JSON.parse(text),
        null,
        2
      );
    } catch {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
  } catch (error) {
    report.textContent = error.message;
  } finally {
    buttons.forEach((button) => {
      button.disabled = false;
    });
  }
}
document.getElementById('validate').addEventListener('click', () => build('validate'));
document.getElementById('compile').addEventListener('click', () => build('compile'));

