// Encoding: UTF-8

/*-----------
   GLOBALS 
-----------*/

var thisPage = window.location.href,
    league = '';

if (thisPage.indexOf('baseball') > -1) {
  league = 'alooo';
} else if (thisPage.indexOf('hockey') > -1) {
  league = 'rhl';
}

/*-----------
   CONFIG 
-----------*/
// Container for app configuration and methods for accessing/updating

var config = {
  settings: {}, // The currently active settings
  
  getLocal: function() {
    var thisObj = this,
        getLocalPromise = $.Deferred();
        
    // Retrieve config from local storage
    chrome.storage.local.get(function(result) {
      if (chrome.runtime.lastError) {
        getLocalPromise.reject('Failed to access locally stored config. Terminating script. ' + chrome.runtime.lastError);
        
      } else {
        // On success, store retrieved config
        thisObj.settings = result;
        getLocalPromise.resolve();
      }
    }); 
    return getLocalPromise;
  },
  
  checkExpired: function() {
    var thisObj = this,
        checkExpiredPromise = $.Deferred();
        
    // If no locally stored config or stored config is expired...
    if (thisObj.settings.expires == undefined || parseDate(thisObj.settings.expires) < Date.now()) {
      
      // Call getServerConfig() to request config from server
      thisObj.getServerConfig().done(function(result) {
        
        // On success, update local storage and active settings
        chrome.storage.local.set(result);
        thisObj.settings = result;
        checkExpiredPromise.resolve();
        
      }).fail(function(error) {
        checkExpiredPromise.reject(error);
      });
      
    } else {
      // Exit function if local config exists and is not expired
      checkExpiredPromise.resolve();
    }
    
    return checkExpiredPromise;
  },
  
  getServerConfig: function() {
    var getServerConfigPromise = $.Deferred();
    
    // Request config from server; response will be JSON
    $.ajax('http://www.m-robz.net/fantasy/get-contracts/server.php', { 
      type: 'POST',
      dataType: 'json',
      crossDomain: true,
      data: { "configDate": 0 }, // So server always sends new config
      success: function(newConfig) {
        // Pass new config to back to checkExpired()
        getServerConfigPromise.resolve(newConfig);
      },
      error: function(request, errorType, errorMessage) {
        getServerConfigPromise.reject('Failed to get config from server. Terminating script. ' + errorType + ' ' + errorMessage);
      },
      timeout: 9999
    });
    
    return getServerConfigPromise;
  }
};

/*-----------
   PLAYERS 
-----------*/
// Container for player names & contracts, and methods for requesting from server and inserting into DOM

var players = {
  names: [], // Holds player names found on page
  contracts: [], // Holds contracts returned by server
  
  collectNames: function() {
    
    // Find player names on page and store in array
    $('.name').each(function() {
      
      // Get name and remove accents and tildes
      var playerName = replaceSpanishChars($(this).text());
      
      // Prepare empty title attribute which will later display contract data
      $(this).attr('title', '');
      
      // Put name in data- attribute for easy identification when injecting contract info later
      $(this).attr('data-player', playerName); 
      
      // Push name to array
      players.names.push(playerName);
    });
  },
  
  getContracts: function() {
    
    // Concatenate array of names 
    var nameStr = '';
    for (i=0, x=this.names.length; i<x; i++) {
      if (i == x-1) {
        nameStr += "'" + this.names[i] + "'";
      } else {
        nameStr += "'" + this.names[i] + "', ";
      }
    }
    
    var thisObj = this,
        getContractsPromise = $.Deferred();
        
    // Request contracts from server; response will be JSON
    $.ajax('http://www.m-robz.net/fantasy/get-contracts/server.php', {
      type: 'POST',
      dataType: 'json',
      crossDomain: true,
      data: { 
        "configDate": config.settings.dateStamp, // datestamp on currently active settings
        "league": league, // 'rhl' or 'alooo'
        "names": nameStr // the string of names
      },
      success: function(response) { 
        var newConfig = response.config;
        
        // If server sent a new config, update local storage and active settings
        if (newConfig) {
          chrome.storage.local.set(newConfig);
          config.settings = newConfig;
        }
        
        // Store returned contracts
        thisObj.contracts = response.contracts;
        getContractsPromise.resolve();
      },
      error: function(request, errorType, errorMessage) {
        getContractsPromise.reject('Failed to get contracts from server. Terminating script. ' + errorType + ' ' + errorMessage);
      },
      timeout: 9999
    });
    return getContractsPromise;
  },
  
  injectContracts: function() {
    
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
  }
};

/*-----------
 MAIN SCRIPT 
-----------*/

// Retrieve locally stored configuration
config.getLocal().done(function() {
  
  // Check expiration date on settings and request update from server if needed
  config.checkExpired().done(function() {
    
    // Confirm that user is on a Yahoo page for ALOOO or RHL leagues
    if (thisPage.indexOf(config.settings[league]['url']) > -1) {
      
      // Collect player names from DOM
      players.collectNames();
      
      // Request contract data from server
      players.getContracts().done(function() {
        
        // Inject contract data into DOM
        players.injectContracts();
        
      }).fail(function(error) {
        console.log(error);
      });
    }
  }).fail(function(error) {
    console.log(error);
  });
}).fail(function(error) {
  console.log(error);
});

/*-----------------
 UTILITY FUNCTIONS 
-----------------*/

// Remove accent marks and tildes
function replaceSpanishChars(str) {
  var arr = [
    ['\u00E1','a'],
    ['\u00E9','e'],
    ['\u00Ed','i'],
    ['\u00F3','o'],
    ['\u00Fa','u'],
    ['\u00F1','n'],
    ['\u00C1','A'],
    ['\u00C9','E'],
    ['\u00Cd','I'],
    ['\u00D3','O'],
    ['\u00Da','U'],
    ['\u00D1','N']
  ];
  for (i in arr) {
    var regex = new RegExp(arr[i][0], 'g');
    str = str.replace(regex, arr[i][1]);
  } 
  return str;
}

// parse a date in yyyy-mm-dd format
function parseDate(input) {
  var parts = input.split('-');
  // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
  return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
}
