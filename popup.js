document.addEventListener("DOMContentLoaded", async () => {
  const statusEl = document.getElementById("status");
  const timeEl = document.getElementById("time");
  const errorCodeEl = document.getElementById("error-code");
  const suggestionsList = document.getElementById("suggestions");

  // Check if Chrome APIs are available
  if (typeof chrome === 'undefined' || !chrome.storage) {
    statusEl.innerHTML = '<div class="error">Chrome extension APIs not available</div>';
    suggestionsList.innerHTML = '';
    return;
  }

  try {
    // Retrieve the failed domain data from storage
    const result = await chrome.storage.local.get(["failedDomain", "failedUrl", "failedTime", "errorCode"]);
    const { failedDomain, failedUrl, failedTime, errorCode } = result;

    if (failedDomain) {
      // Format the time
      const timeAgo = getTimeAgo(failedTime);
      
      // Update the UI with the failed domain info
      statusEl.innerHTML = `Could not access <span id="domain">${escapeHtml(failedDomain)}</span>`;
      timeEl.textContent = `Detected ${timeAgo}`;
      errorCodeEl.textContent = `Error: ${errorCode || "Unknown error"}`;
      
      try {
        // Get and display alternative suggestions
        const suggestions = await getSuggestions(failedDomain, failedUrl);
        
        // Clear the loading indicator
        suggestionsList.innerHTML = '';
        
        if (suggestions.length === 0) {
          suggestionsList.innerHTML = '<li class="no-domain">No suggestions available</li>';
          return;
        }
        
        // Add each suggestion as a list item
        suggestions.forEach(suggestion => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          
          a.className = "alternative-link";
          a.href = suggestion.url;
          a.textContent = suggestion.text;
          a.target = "_blank";
          
          // Add click handler
          a.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
              if (chrome.tabs && chrome.tabs.create) {
                await chrome.tabs.create({ url: suggestion.url });
              } else {
                window.open(suggestion.url, '_blank');
              }
            } catch (error) {
              console.error('Error opening tab:', error);
              window.open(suggestion.url, '_blank');
            }
          });
          
          li.appendChild(a);
          suggestionsList.appendChild(li);
        });
      } catch (error) {
        suggestionsList.innerHTML = `<li class="error">Error loading suggestions: ${error.message}</li>`;
      }
    } else {
      statusEl.innerHTML = "<span class='no-domain'>No failed domains detected recently.</span>";
      timeEl.textContent = "";
      errorCodeEl.textContent = "";
      suggestionsList.innerHTML = '';
    }
  } catch (error) {
    statusEl.innerHTML = `<div class="error">Error retrieving data: ${error.message}</div>`;
    suggestionsList.innerHTML = '';
  }
});

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get time ago in human readable format
 */
function getTimeAgo(timestamp) {
  if (!timestamp) return "just now";
  
  const now = Date.now();
  const secondsAgo = Math.floor((now - timestamp) / 1000);
  
  if (secondsAgo < 60) {
    return `${secondsAgo} seconds ago`;
  } else if (secondsAgo < 3600) {
    const minutesAgo = Math.floor(secondsAgo / 60);
    return `${minutesAgo} minute${minutesAgo !== 1 ? 's' : ''} ago`;
  } else if (secondsAgo < 86400) {
    const hoursAgo = Math.floor(secondsAgo / 3600);
    return `${hoursAgo} hour${hoursAgo !== 1 ? 's' : ''} ago`;
  } else {
    const daysAgo = Math.floor(secondsAgo / 86400);
    return `${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago`;
  }
}

/**
 * Get alternative website suggestions for a failed domain
 */
async function getSuggestions(domain, originalUrl) {
  return new Promise((resolve, reject) => {
    try {
      // Clean the domain
      const cleanDomain = domain.replace(/^www\./, '');
      
      // Extract path from original URL if available
      let path = '';
      if (originalUrl) {
        try {
          const parsedUrl = new URL(originalUrl);
          path = parsedUrl.pathname;
        } catch (e) {
          // If URL parsing fails, use empty path
          path = '';
        }
      }
      
      const suggestions = [
        {
          text: `Check web archive for ${cleanDomain}`,
          url: `https://web.archive.org/web/*/${cleanDomain}${path}`
        },
        {
          text: `Search for ${cleanDomain} on Google`,
          url: `https://www.google.com/search?q=${encodeURIComponent(cleanDomain)}`
        },
        {
          text: `Check if ${cleanDomain} is down for everyone`,
          url: `https://downforeveryoneorjustme.com/${cleanDomain}`
        },
        {
          text: `Try HTTPS version of ${cleanDomain}`,
          url: `https://${cleanDomain}${path}`
        }
      ];
      
      // Add industry-specific alternatives based on domain keywords
      const lowerDomain = cleanDomain.toLowerCase();
      
      if (lowerDomain.includes('news') || lowerDomain.includes('blog')) {
        suggestions.push({
          text: "Try alternative news site: Reuters",
          url: "https://www.reuters.com/"
        });
        suggestions.push({
          text: "Try alternative news site: BBC",
          url: "https://www.bbc.com/"
        });
      } else if (lowerDomain.includes('shop') || lowerDomain.includes('store') || lowerDomain.includes('buy')) {
        suggestions.push({
          text: "Try alternative shopping site: Amazon",
          url: "https://www.amazon.com/"
        });
      } else if (lowerDomain.includes('social') || lowerDomain.includes('facebook') || lowerDomain.includes('twitter')) {
        suggestions.push({
          text: "Try alternative social site: Reddit",
          url: "https://www.reddit.com/"
        });
      } else if (lowerDomain.includes('video') || lowerDomain.includes('youtube')) {
        suggestions.push({
          text: "Try alternative video site: Vimeo",
          url: "https://vimeo.com/"
        });
      }
      
      resolve(suggestions);
    } catch (error) {
      reject(error);
    }
  });
}
