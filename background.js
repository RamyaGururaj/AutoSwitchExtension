// Listen for web request errors
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    // Filter for main_frame requests (page loads)
    if (details.type === 'main_frame') {
      // Parse the domain from the URL
      try {
        const url = new URL(details.url);
        const domain = url.hostname;
        
        // Save the failed domain to storage
        chrome.storage.local.set({ 
          failedDomain: domain,
          failedUrl: details.url,
          failedTime: Date.now(),
          errorCode: details.error
        });
        
        console.log(`Saved failed domain: ${domain}`);
      } catch (error) {
        console.error("Error parsing URL:", error);
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Initialize when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  console.log("Failed Domain Suggestion Extension installed.");
  // Clear any previous data
  chrome.storage.local.remove(["failedDomain", "failedUrl", "failedTime", "errorCode"]);
});