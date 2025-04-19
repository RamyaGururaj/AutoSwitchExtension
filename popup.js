document.addEventListener("DOMContentLoaded", () => {
  const statusEl = document.getElementById("status");
  const timeEl = document.getElementById("time");
  const errorCodeEl = document.getElementById("error-code");
  const suggestionsList = document.getElementById("suggestions");

  // Retrieve the failed domain data from storage
  chrome.storage.local.get(["failedDomain", "failedUrl", "failedTime", "errorCode"], (result) => {
    if (chrome.runtime.lastError) {
      statusEl.textContent = "Error retrieving data: " + chrome.runtime.lastError.message;
      return;
    }

    const { failedDomain, failedUrl, failedTime, errorCode } = result;

    if (failedDomain) {
      // Format the time
      const timeAgo = getTimeAgo(failedTime);
      
      // Update the UI with the failed domain info
      statusEl.innerHTML = `Could not access <span id="domain">${failedDomain}</span>`;
      timeEl.textContent = `Detected ${timeAgo}`;
      errorCodeEl.textContent = `Error: ${errorCode || "Unknown error"}`;
      
      // Get and display alternative suggestions
      getSuggestions(failedDomain, failedUrl).then(suggestions => {
        // Clear the loading indicator
        suggestionsList.innerHTML = '';
        
        // Add each suggestion as a list item
        suggestions.forEach(suggestion => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          
          a.className = "alternative-link";
          a.href = suggestion.url;
          a.textContent = suggestion.text;
          a.target = "_blank"; // Open in new tab
          
          // Add click handler
          a.addEventListener("click", (e) => {
            chrome.tabs.create({ url: suggestion.url });
            e.preventDefault();
          });
          
          li.appendChild(a);
          suggestionsList.appendChild(li);
        });
      });
    } else {
      statusEl.innerHTML = "<span class='no-domain'>No failed domains detected recently.</span>";
      timeEl.textContent = "";
      errorCodeEl.textContent = "";
    }
  });
});

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
function getSuggestions(domain) {
  // In a real-world scenario, you might want to call an API here
  return new Promise((resolve) => {
    const parsedUrl = new URL(`https://${domain}`);
    const path = parsedUrl.pathname;
    
    const suggestions = [
      {
        text: `Check web archive for ${domain}`,
        url: `https://web.archive.org/web/*/${domain}${path}`
      },
      {
        text: `Search for ${domain} on Google`,
        url: `https://www.google.com/search?q=${encodeURIComponent(domain)}`
      },
      {
        text: `Try similar website: ${domain.replace(/\./g, '-')}.com`,
        url: `https://${domain.replace(/\./g, '-')}.com`
      },
      {
        text: `Check if ${domain} is down for everyone`,
        url: `https://downforeveryoneorjustme.com/${domain}`
      }
    ];
    
    // Add industry-specific alternatives based on domain keywords
    if (domain.includes('news') || domain.includes('blog')) {
      suggestions.push({
        text: "Try alternative news site: Reuters",
        url: "https://www.reuters.com/"
      });
    } else if (domain.includes('shop') || domain.includes('store')) {
      suggestions.push({
        text: "Try alternative shopping site: Amazon",
        url: "https://www.amazon.com/"
      });
    }
    
    resolve(suggestions);
  });
}