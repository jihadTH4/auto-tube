// api/getVideo.js - Minimal working version (CORRECTED)
export default function handler(req, res) {
  // Set the HTTP status code directly
  res.statusCode = 200;

  // Set the content type header
  res.setHeader("Content-Type", "application/json");

  // End the response, sending the JSON string payload
  res.end(JSON.stringify({ message: "Hello from Minimal API!" }));
}
