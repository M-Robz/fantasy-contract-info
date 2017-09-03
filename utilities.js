/* ~~~ UTILITY FUNCTIONS ~~~ */

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

// Parse a date in yyyy-mm-dd format
function parseDate(input) {
  var parts = input.split('-');
  // new Date(year, month [, day [, hours[, minutes[, seconds[, ms]]]]])
  return new Date(parts[0], parts[1]-1, parts[2]); // Note: months are 0-based
}
