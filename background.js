// Background script for Website Unavailable Helper Extension with AI

// Listen for web request errors
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    // Filter for main_frame requests (page loads) and exclude extension URLs
    if (details.type === 'main_frame' && !details.url.startsWith('chrome-extension://')) {
      // Parse the domain from the URL
      try {
        const url = new URL(details.url);
        const domain = url.hostname;
        
        // Skip localhost and IP addresses
        if (domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
          return;
        }
        
        // Save the failed domain to storage
        chrome.storage.local.set({
          failedDomain: domain,
          failedUrl: details.url,
          failedTime: Date.now(),
          errorCode: details.error
        }).then(() => {
          console.log(`Saved failed domain: ${domain} (${details.error})`);
        }).catch((error) => {
          console.error('Error saving failed domain:', error);
        });
        
      } catch (error) {
        console.error("Error parsing URL:", error);
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// Listen for navigation errors (additional coverage)
chrome.webNavigation.onErrorOccurred.addListener(
  (details) => {
    // Filter for main_frame requests
    if (details.frameId === 0) {
      try {
        const url = new URL(details.url);
        const domain = url.hostname;
        
        // Skip localhost and IP addresses
        if (domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
          return;
        }
        
        // Save the failed domain to storage
        chrome.storage.local.set({
          failedDomain: domain,
          failedUrl: details.url,
          failedTime: Date.now(),
          errorCode: details.error
        }).then(() => {
          console.log(`Saved failed domain from navigation: ${domain} (${details.error})`);
        }).catch((error) => {
          console.error('Error saving failed domain:', error);
        });
        
      } catch (error) {
        console.error("Error parsing navigation URL:", error);
      }
    }
  }
);

// Initialize when the extension is installed
chrome.runtime.onInstalled.addListener((details) => {
  console.log("Website Unavailable Helper Extension installed.");
  
  // Clear any previous data on install/update
  if (details.reason === 'install' || details.reason === 'update') {
    chrome.storage.local.remove(["failedDomain", "failedUrl", "failedTime", "errorCode"]).then(() => {
      console.log('Storage cleared successfully');
    }).catch((error) => {
      console.error('Error clearing storage:', error);
    });
  }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  console.log("Website Unavailable Helper Extension started.");
});
