/* ~~~ CONTROL FLOW ~~~
 *
 * Controls script execution sequence
 * Var: thisPage (string) - URL of page the user is currently visiting
 * Var: league (string) - Name of league
 * Var: cxn (object) - Persistent connection with background script
 * Function: setDOMListeners
 */

(function() {

var thisPage = window.location.href,
    league = '';

if (thisPage.indexOf('baseball') > -1) {
  league = 'alooo';
} else if (thisPage.indexOf('hockey') > -1) {
  league = 'rhl';
}

// Initialize persistent connection to background script
var cxn = chrome.runtime.connect({name: "cxn"});

// Retrieve locally stored configuration
config.getLocal()
  .then(function() {
    var promise = $.Deferred();

    if (config.isExpired()) {

      // Request config from server
      config.getServerConfig(cxn)
        .then(function() {
          promise.resolve();
        });
    } else {

      // Continue if local config exists and is not expired
      promise.resolve();
    }
    return promise;
  })

  .then(function() {

    // Confirm that user is on a Yahoo page for ALOOO or RHL leagues
    if (thisPage.indexOf(config.settings[league]['url']) > -1) {
      var promise = $.Deferred();

      // Collect player names from DOM and continue if any found
      players.collectNames();
      if (players.names.length) {

        // Request contract data from server
        players.getContracts(league, cxn)
          .then(function() {
            promise.resolve();
          });

      }
      return promise;
    }
  })

  .then(function() {

    // Inject contract data into the DOM and attach listeners
    players.injectContracts(league);
    setDOMListeners();
  });

// Attach listeners for user actions on page
function setDOMListeners() {

  // Re-inject contracts on "Team" page when user clicks on tabs (e.g., stats, ranks)
  $('#yspmaincontent').on('click', '.Navtarget', false, reInject);

  // Re-inject contracts on "Players" page when user searches, filters, sorts, or clicks pagination link
  $('#yspmaincontent').on('click', '.Btn-primary', true, reInject);
  $('div.players').find('thead').on('click', 'a', true, reInject);
  $('div.pagingnav').on('click', 'a', true, reInject);

  // Call players.reInjectContracts() and reset DOM listeners when finished
  function reInject(needNewContracts) {
    players.reInjectContracts(needNewContracts, league, cxn)
      .then(function() {
        setDOMListeners();
      });
  }
}

})();
