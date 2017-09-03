/* ~~~ PLAYERS ~~~
 *
 * Wrapper for player names & contracts, and methods for requesting from server and inserting into DOM
 *
 * Property: names (array) - Holds player names found on page
 * Property: contracts (array) - Holds contracts returned by server
 * Methods: collectNames, getContracts, injectContracts, reInjectContracts
 */

var players = {
  names: [],
  contracts: [],

  /* collectNames
   *
   * Collects player names from DOM
   * Params: none
   * Return: none
   */
  collectNames: function() {
    var that = this;

    // Reset array of names
    this.names = [];

    // Find player names on page and store in array
    $('.name').each(function() {

      // Get name and remove accents and tildes
      var playerName = replaceSpanishChars($(this).text());

      // Prepare empty title attribute which will later display contract data
      $(this).attr('title', '');

      // Put name in data- attribute for easy identification when injecting contract info later
      $(this).attr('data-player', playerName);

      // Push name to array
      that.names.push(playerName);
    });
  },

  /* getContracts
   *
   * Requests contract data from server
   * Param: league (string) - Name of league
   * Param: cxn (object) - Persistent connection with background script
   * Return: (jQuery.Deferred object)
   */
  getContracts: function(league, cxn) {

    var that = this,
        promise = $.Deferred();

    // Concatenate names (use " in separator so apostrophes in names don't break string)
    var nameStr = '"' + this.names.join('", "') + '"';

    // Send request parameters to background script and listen for reply
    cxn.postMessage({
      requestType: 'contracts',
      configDate: config.settings.dateStamp,
      league: league,
      names: nameStr
    });
    cxn.onMessage.addListener(function callback(message) {
      var serverConfig;
      cxn.onMessage.removeListener(callback);

      // Make sure background script is replying to the correct request type
      if (message.requestType === 'contracts') {

        if (message.responseStatus === 'success') {
          serverConfig = message.data.config;

          // If server sent a new config, update local storage and active settings
          if (serverConfig) {
            chrome.storage.local.set(serverConfig);
            config.settings = serverConfig;
          }

          // Store returned contracts
          that.contracts = message.data.contracts;
          promise.resolve();

        } else if (message.responseStatus === 'error') {
          promise.reject();
        }
      }
    });
    return promise;
  },

  /* injectContracts
   *
   * Injects contract info into the DOM
   * Param: league (string) - Name of league
   * Return: none
   */
  injectContracts: function(league) {

    // Display contract info appropriate to league draft format
    switch (config.settings[league]['draftFormat']) {
      case 'auction':

        // For each contract returned...
        $.each(this.contracts, function(index, contract) {

          // Find corresponding DOM element and inject info into title attribute
          var el = $('a.name[data-player="' + contract.player + '"]');
          el.attr('title', '$' + contract.salary + ' y' + contract.year);
        });

        // For players without a contract in server database...
        $('a.name[title=""]').each(function() {

          // Set title attribute to entry-level contract
          $(this).attr('title', '$' + config.settings[league]['minSalary'] + ' y1');
        });
        break;

      case 'pick':

        // For each contract returned...
        $.each(this.contracts, function(index, contract) {

          // Find corresponding DOM element and inject info into title attribute
          var el = $('a.name[data-player="' + contract.player + '"]');
          el.attr('title', '$' + contract.salary + ' r' + contract.round + ' y' + contract.year);
        });

        // For players without a contract in server database...
        $('a.name[title=""]').each(function() {

          // Set title attribute to entry-level contract
          $(this).attr('title', '$' + config.settings[league]['minSalary'] + ' r' + (config.settings[league]['numRounds']+1) + ' y1');
        });
        break;
    }
  },

  /* reInjectContracts
   *
   * Re-injects the current set of contracts, or a new set if names have changed
   * Param: needNewContracts (boolean) - Flag indicating whether new contracts should be requested
   * Param: league (string) - Name of league
   * Param: cxn (object) - Persistent connection with background script
   * Return: (jQuery.Deferred object)
   */
  reInjectContracts: function(needNewContracts, league, cxn) {
    var that = this,
        delayTimer,
        promise = $.Deferred();

    // Wait 5 sec to allow time for Yahoo's script to make its HTTP request
    delayTimer = setTimeout(function() {
      that.collectNames();

      if (needNewContracts) {

        // Request contracts for a new set of names before injecting
        that.getContracts(league, cxn).then(function() {
          that.injectContracts(league);
          promise.resolve();
        });

      } else {
        that.injectContracts(league);
        promise.resolve();
      }
    }, 5000);
    return promise;
  }
};
