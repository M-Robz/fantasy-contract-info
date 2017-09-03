/* ~~~ CONFIG ~~~
 *
 * Wrapper for app configuration and methods for accessing/updating
 *
 * Property: settings (object) - The currently active settings
 * Methods: getLocal, isExpired, getServerConfig
 */

var config = {
  settings: {},

  /* getLocal
   *
   * Retrieves config from local storage
   * Params: none
   * Return: promise (jQuery.Deferred object)
   */
  getLocal: function() {
    var that = this,
        promise = $.Deferred();

    // Retrieve config from local storage
    chrome.storage.local.get(function(localConfig) {
      if (chrome.runtime.lastError) {
        promise.reject();

      } else {
        // On success, store retrieved config
        that.settings = localConfig;
        promise.resolve();
      }
    });
    return promise;
  },

  /* isExpired
   *
   * Determines whether datestamp on local config expired before today's date
   * Params: none
   * Return: (boolean) - Whether config is expired
   */
  isExpired: function() {
    var expiryDate = this.settings.expires;

    // Return true if no locally stored config or stored config is expired
    if (expiryDate === undefined || parseDate(expiryDate) < Date.now()) {
      return true;
    } else {
      return false;
    }
  },

  /* getServerConfig
   *
   * Requests config from server (http://www.m-robz.net); if newer, updates local config
   * Param: cxn (object) - Persistent connection with background script
   * Return: (jQuery.Deferred object)
   */
  getServerConfig: function(cxn) {
    var that = this,
        promise = $.Deferred();

    // Send request parameters to background script and listen for reply
    cxn.postMessage({requestType: 'config'});
    cxn.onMessage.addListener(function callback(response) {

      cxn.onMessage.removeListener(callback);

      // Make sure background script is replying to the correct request type
      if (response.requestType === 'config') {

        if (response.responseStatus === 'success') {

          // Update local storage and active settings
          chrome.storage.local.set(response.data);
          that.settings = response.data;
          promise.resolve();

        } else if (response.responseStatus === 'error') {
          promise.reject();
        }
      }
    });
    return promise;
  }
};
