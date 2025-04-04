const ytdl = require("ytdl-core");

export default async function handler(req, res) {
  // Set CORS headers to allow requests from your frontend domain
  // Replace '*' with your frontend's domain in production for security
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle OPTIONS preflight request for CORS
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // Ensure it's a GET request
  if (req.method !== "GET") {
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  }

  const videoUrl = req.query.url; // Get URL from query param like /api/getVideo?url=...

  if (!videoUrl) {
    return res
      .status(400)
      .json({
        success: false,
        message: "YouTube URL query parameter is required.",
      });
  }

  // Basic validation - ytdl-core also provides validateURL
  if (!ytdl.validateURL(videoUrl)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid YouTube URL provided." });
  }

  try {
    const info = await ytdl.getInfo(videoUrl);

    // Extract essential data
    const title = info.videoDetails.title;
    // Get the highest resolution thumbnail available
    const thumbnail =
      info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1].url;

    // --- Filter and Format Video+Audio Streams ---
    const videoFormats = ytdl
      .filterFormats(info.formats, "videoandaudio")
      .filter((format) => format.container === "mp4" && format.qualityLabel) // Prefer MP4 with quality labels
      .map((format) => ({
        quality: format.qualityLabel,
        type: format.container.toUpperCase(), // Should be MP4
        url: format.url, // Direct download URL
        itag: format.itag,
        hasAudio: format.hasAudio,
        hasVideo: format.hasVideo,
        approxDurationMs: format.approxDurationMs, // Optional: duration
        // Note: File size is harder to get accurately without downloading/probing
      }))
      .sort((a, b) => {
        // Sort by quality (height) descending
        const qualA = parseInt(a.quality);
        const qualB = parseInt(b.quality);
        return qualB - qualA;
      });

    // --- Filter and Format Audio-Only Streams ---
    const audioFormats = ytdl
      .filterFormats(info.formats, "audioonly")
      .filter((format) => format.container === "mp4") // Usually M4A in an MP4 container
      .sort((a, b) => b.audioBitrate - a.audioBitrate) // Sort by bitrate descending
      .map((format) => ({
        quality: `${Math.round(format.audioBitrate)}kbps`, // Label based on bitrate
        type: "M4A", // Label appropriately as M4A
        url: format.url,
        itag: format.itag,
        hasAudio: format.hasAudio,
        hasVideo: format.hasVideo,
        approxDurationMs: format.approxDurationMs,
      }));

    // Combine video and audio formats (prioritize video)
    // Remove potential duplicates based on itag if necessary (though filtering often handles this)
    const uniqueFormats = [];
    const seenItags = new Set();

    [...videoFormats, ...audioFormats].forEach((format) => {
      if (!seenItags.has(format.itag)) {
        uniqueFormats.push(format);
        seenItags.add(format.itag);
      }
    });

    // --- Send Success Response ---
    res.status(200).json({
      success: true,
      title,
      thumbnailUrl: thumbnail,
      formats: uniqueFormats, // Send the combined & sorted list
      duration: info.videoDetails.lengthSeconds, // Optional: duration in seconds
    });
  } catch (error) {
    console.error("ytdl-core Error:", error.message); // Log the specific error on the server

    // Provide a user-friendly error message
    let clientMessage = "Failed to fetch video information.";
    if (
      error.message.includes("private") ||
      (error.statusCode && error.statusCode === 403)
    ) {
      clientMessage =
        "This video might be private, age-restricted, or unavailable in your region.";
    } else if (error.message.includes("getaddrinfo ENOTFOUND")) {
      clientMessage =
        "Could not connect to YouTube. Please check your network connection.";
    } else if (
      error.message.includes("No video id found") ||
      error.message.includes("Invalid URL")
    ) {
      clientMessage = "Invalid YouTube URL or video not found.";
    } else if (error.message.includes("410")) {
      clientMessage =
        "YouTube may have updated its systems, preventing downloads at this time. Please try again later.";
    }

    res.status(500).json({ success: false, message: clientMessage });
  }
}
