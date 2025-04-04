const downloadForm = document.getElementById("downloadForm");
const urlInput = document.getElementById("youtubeUrl");
const fetchButton = document.getElementById("fetchButton");
const loadingDiv = document.getElementById("loading");
const errorDiv = document.getElementById("error");
const resultsDiv = document.getElementById("results");
const videoTitle = document.getElementById("videoTitle");
const videoThumbnail = document.getElementById("videoThumbnail");
const downloadLinksList = document.getElementById("downloadLinks");

downloadForm.addEventListener("submit", async (event) => {
  event.preventDefault(); // Prevent default form submission

  const videoUrl = urlInput.value.trim();
  if (!videoUrl) {
    displayError("Please enter a YouTube URL.");
    return;
  }

  // --- UI Reset and Loading State ---
  resultsDiv.style.display = "none";
  errorDiv.style.display = "none";
  downloadLinksList.innerHTML = ""; // Clear previous links
  loadingDiv.style.display = "flex"; // Use flex for alignment with spinner
  fetchButton.disabled = true;
  fetchButton.textContent = "Fetching...";

  try {
    // --- Make API Call ---
    // The endpoint '/api/getVideo' assumes your serverless function
    // is deployed correctly by Vercel/Netlify at this path.
    const response = await fetch(
      `/api/getVideo?url=${encodeURIComponent(videoUrl)}`
    );

    if (!response.ok) {
      // Try to get error message from backend response body
      let errorMsg = `HTTP error! Status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.message || errorMsg; // Use backend message if available
      } catch (jsonError) {
        // Ignore if response wasn't valid JSON
        console.error("Could not parse error response:", jsonError);
      }
      throw new Error(errorMsg);
    }

    const data = await response.json();

    if (data.success) {
      displayResults(data);
    } else {
      displayError(data.message || "Could not fetch video details.");
    }
  } catch (error) {
    console.error("Fetch error:", error);
    displayError(
      `An error occurred: ${error.message}. Check the console or try again.`
    );
  } finally {
    // --- Reset UI from Loading State ---
    loadingDiv.style.display = "none";
    fetchButton.disabled = false;
    fetchButton.textContent = "Fetch Video";
  }
});

function displayResults(data) {
  videoTitle.textContent = data.title;
  videoThumbnail.src = data.thumbnailUrl;
  videoThumbnail.alt = `Thumbnail for ${data.title}`;
  downloadLinksList.innerHTML = ""; // Clear previous links again just in case

  if (data.formats && data.formats.length > 0) {
    data.formats.forEach((format) => {
      const listItem = document.createElement("li");
      const link = document.createElement("a");

      link.href = format.url;
      link.target = "_blank"; // Open download in new tab/window
      // Suggesting a filename - browsers/managers might override this
      link.download = `${data.title.replace(/[\\/:*?"<>|]/g, "")} - ${
        format.quality
      }.${format.type.toLowerCase()}`;

      let linkText = `${format.quality} (${format.type})`;
      if (!format.hasVideo && format.hasAudio) {
        linkText += " [Audio Only]";
      }
      // You could add file size here if the API provided it:
      // if (format.size) linkText += ` - ${format.size}`;

      link.textContent = linkText;

      listItem.appendChild(link);
      downloadLinksList.appendChild(listItem);
    });
  } else {
    const listItem = document.createElement("li");
    listItem.textContent = "No downloadable formats found.";
    downloadLinksList.appendChild(listItem);
  }

  resultsDiv.style.display = "block";
  errorDiv.style.display = "none";
}

function displayError(message) {
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  resultsDiv.style.display = "none"; // Hide results if error occurs
}
