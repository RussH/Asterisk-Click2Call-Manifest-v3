// Content script to intercept tel: and callto: links

(function() {
  'use strict';

  function extractPhoneNumber(href) {
    // Remove the protocol (tel: or callto:)
    let number = href.replace(/^(tel:|callto:)/i, '');
    
    // Remove common formatting characters but keep the raw number
    number = number.replace(/[\s\-\(\)\.\[\]]/g, '');
    
    // Remove any extensions or additional parameters
    number = number.split(/[;,]/)[0];
    
    return number;
  }

  // Function to handle link clicks
  function handleLinkClick(event) {
    const link = event.target.closest('a[href^="tel:"], a[href^="callto:"]');
    
    if (link) {
      const href = link.getAttribute('href');
      if (href) {
        // Prevent the default action
        event.preventDefault();
        
        const phoneNumber = extractPhoneNumber(href);
        
        console.log('Intercepted link click for:', phoneNumber);
        
        // Send message to background script to place the call
        chrome.runtime.sendMessage({
          action: 'clickToCall',
          phoneNumber: phoneNumber
        }, function(response) {
          if (chrome.runtime.lastError) {
            console.error('Error sending message:', chrome.runtime.lastError);
          }
        });
      }
    }
  }

  document.addEventListener('click', handleLinkClick, true);

  console.log('Content script loaded and monitoring tel:/callto: links');
})();
