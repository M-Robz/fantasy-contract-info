/* ~~~ BACKGROUND SCRIPT ~~~
 *
 * Makes request to server (http://www.m-robz.net) on behalf of content script, and relays response back to content script
 */

// Establish persistent connection with content script
chrome.runtime.onConnect.addListener(function(cxn) {

  // Listen for message from content script
  cxn.onMessage.addListener(function(request) {

    switch (request.requestType) {
      case 'config':
        // Request config from server; response will be JSON
        $.ajax('http://www.m-robz.net/fantasy/contract-info-extension/server.php', {
          type: 'POST',
          dataType: 'json',
          crossDomain: true,
          data: { "configDate": 0 }, // So server always sends new config
          success: function(response) {
            // Pass new config back to content script
            cxn.postMessage({
              responseStatus: 'success',
              data: response,
              requestType: 'config'
            });
          },
          error: function(request, errorType, errorMessage) {
            cxn.postMessage({
              responseStatus: 'error',
              request: request,
              errorType: errorType,
              errorMessage: errorMessage
            });
          }
        });
        break;
      case 'contracts':
        // Request contracts from server; response will be JSON
        $.ajax('http://www.m-robz.net/fantasy/contract-info-extension/server.php', {
          type: 'POST',
          dataType: 'json',
          crossDomain: true,
          data: {
            "configDate": request.configDate, // datestamp on currently active settings
            "league": request.league, // name of league
            "names": request.names // the string of player names
          },
          success: function(response) {
            // Pass contract data back to content script
            cxn.postMessage({
              responseStatus: 'success',
              data: response,
              requestType: 'contracts'
            });
          },
          error: function(request, errorType, errorMessage) {
            cxn.postMessage({
              responseStatus: 'error',
              request: request,
              errorType: errorType,
              errorMessage: errorMessage
            });
          }
        });
        break;
    }
    return true;
  });
});
