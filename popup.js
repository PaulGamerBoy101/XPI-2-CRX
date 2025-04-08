document.getElementById('convertBtn').addEventListener('click', async () => {
  const fileInput = document.getElementById('xpiFile');
  const status = document.getElementById('status');
  
  if (!fileInput.files.length) {
    status.textContent = "Please upload an XPI file.";
    return;
  }

  status.textContent = "Processing...";
  const xpiFile = fileInput.files[0];

  try {
    // Load JSZip library dynamically (you'll need to include it)
    const zip = new JSZip();
    const xpiContents = await zip.loadAsync(xpiFile);

    // Check for manifest.json
    const manifestFile = xpiContents.files['manifest.json'];
    if (!manifestFile) {
      status.textContent = "Error: No manifest.json found in XPI.";
      return;
    }

    // Read and modify manifest.json for Chrome compatibility
    let manifest = JSON.parse(await manifestFile.async('string'));
    manifest = makeChromeCompatible(manifest);

    // Update manifest in the ZIP
    xpiContents.file('manifest.json', JSON.stringify(manifest, null, 2));

    // Generate a new ZIP file
    const newZipBlob = await xpiContents.generateAsync({ type: 'blob' });

    // Save the file for download
    const url = URL.createObjectURL(newZipBlob);
    chrome.downloads.download({
      url: url,
      filename: 'converted_extension.zip'
    });

    status.textContent = "Conversion complete! Download the ZIP file, extract it, and load it in Chrome via 'Developer Mode' (chrome://extensions/).";
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
  }
});

// Function to adjust manifest for Chrome compatibility
function makeChromeCompatible(manifest) {
  // Ensure manifest_version is 2 or 3 (Chrome requirement)
  if (!manifest.manifest_version) {
    manifest.manifest_version = 2; // Default to 2 for broader compatibility
  }

  // Remove Firefox-specific properties
  delete manifest.applications; // Firefox uses 'applications.gecko'
  delete manifest.gecko; 

  // Add Chrome-specific defaults if missing
  if (!manifest.background && manifest.background_scripts) {
    manifest.background = { scripts: manifest.background_scripts };
    delete manifest.background_scripts;
  }

  if (manifest.permissions) {
    // Filter out Firefox-specific permissions
    manifest.permissions = manifest.permissions.filter(p => !p.startsWith('gecko'));
  }

  return manifest;
}
