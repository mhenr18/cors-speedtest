var BUFFER_WINDOW_MS = 2000;
var buffer = null;
var lastLoaded = null;
var startTime = null;
var xhr = null;
var requestTime = null;
var renderInterval = null;
var targetLoaded = null;
var peakSpeed = null;
var progress = null;

function getParameterByName(name, url) {
    if (!url) {
      url = window.location.href;
    }
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return null;
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

// remove everything from the buffer that's older than the window
function trimBuffer () {
  var now = Date.now();
  buffer = buffer.filter(function (entry) {
    return now - entry.time < BUFFER_WINDOW_MS;
  });
}

function onProgress (e) {
  var now = Date.now();
  if (e.lengthComputable) {
    targetLoaded = e.total;
  }

  // when we get the first bytes, set the start time and check cache
  if (startTime == null) {
    startTime = now;
  }

  var currLoaded = e.loaded;
  var amount = currLoaded - lastLoaded;
  lastLoaded = currLoaded;

  buffer.push({
    time: now,
    amount: amount
  });
}

function onLoad (e) {
  setTimeout(render, 10);
  clearInterval(renderInterval);
  renderInterval = null;
  document.querySelector('#load-message').style.display = 'block';
}

function onError (e) {
  setTimeout(render, 10);
  clearInterval(renderInterval);
  renderInterval = null;
  document.querySelector('#error-message').style.display = 'block';
}

function onAbort (e) {
  setTimeout(render, 10);
  clearInterval(renderInterval);
  renderInterval = null;
  document.querySelector('#abort-message').style.display = 'block';
}

function render () {
  var now = Date.now();
  trimBuffer();

  var st = startTime;
  if (st === null) {
    st = now;
  }

  var total = buffer.reduce(function (acc, val) {
    return acc + val.amount;
  }, 0);

  var avgBitRate = 0;
  var totalTime = now - st;
  if (totalTime > 0) {
    avgBitRate = (lastLoaded * 8) / (totalTime / 1000);
  }

  var instBitRate = (total * 8) / (BUFFER_WINDOW_MS / 1000);
  if (totalTime < BUFFER_WINDOW_MS) {
    instBitRate = avgBitRate;
  }

  if (instBitRate > peakSpeed) {
    peakSpeed = instBitRate;
  }

  var mbps = instBitRate / 1000000;
  var avgMbps = avgBitRate / 1000000;
  var peakMbps = peakSpeed / 1000000;

  var mibs = (instBitRate / 8) / (1024 * 1024);
  var avgMibs = (avgBitRate / 8) / (1024 * 1024);
  var peakMibs = (peakSpeed / 8) / (1024 * 1024);

  var ttfbMs = st - requestTime;
  var dlMiB = lastLoaded / (1024 * 1024);
  var totalTimeSeconds = totalTime / 1000;

  if (targetLoaded > 0) {
    let fracLoaded = lastLoaded / targetLoaded;
    progress = (fracLoaded * 100).toFixed(2) + '%';
  }

  document.querySelector('#status').innerHTML = xhr.status;
  document.querySelector('#progress').innerHTML = progress;

  document.querySelector('#peak-dl-speed-value').innerHTML = peakMbps.toFixed(2);
  document.querySelector('#inst-dl-speed-value').innerHTML = mbps.toFixed(2);
  document.querySelector('#avg-dl-speed-value').innerHTML = avgMbps.toFixed(2);

  document.querySelector('#peak-dl-speed-mib-value').innerHTML = peakMibs.toFixed(2);
  document.querySelector('#inst-dl-speed-mib-value').innerHTML = mibs.toFixed(2);
  document.querySelector('#avg-dl-speed-mib-value').innerHTML = avgMibs.toFixed(2);

  document.querySelector('#ttfb-value').innerHTML = Math.round(ttfbMs);
  document.querySelector('#amt-downloaded-value').innerHTML = dlMiB.toFixed(2);
  document.querySelector('#time-value').innerHTML = totalTimeSeconds.toFixed(2);
}

function test (url) {
  document.querySelector('#test').style.display = 'block';
  document.querySelector('#load-message').style.display = 'none';
  document.querySelector('#error-message').style.display = 'none';
  document.querySelector('#abort-message').style.display = 'none';

  if (renderInterval !== null) {
    clearInterval(renderInterval);
  }

  requestTime = Date.now();
  lastLoaded = 0;
  buffer = [];
  renderInterval = setInterval(render, 250);
  peakSpeed = 0;
  progress = 'N/A';
  startTime = null;
  targetLoaded = null;

  xhr = new XMLHttpRequest();
  xhr.open('GET', url);
  xhr.addEventListener("loadend", onProgress);
  xhr.addEventListener("progress", onProgress);
  xhr.addEventListener("load", onLoad);
  xhr.addEventListener("error", onError);
  xhr.addEventListener("abort", onAbort);
  xhr.send();
}

function geoip (json) {
  var locations = [json.city, json.region_name, json.country_name];
  var uniqueLocations = locations.filter(function (item, pos) {
    return locations.indexOf(item) == pos;
  });

  document.querySelector('#geo-location').innerHTML = uniqueLocations.join(', ');
}

var f = document.querySelector('form');
f.onsubmit = function (e) {
  //document.querySelector('button').remove();
  //document.querySelector('input').disabled = true;
  var url = f.elements['test-url'].value;
  test(url);
  
  e.preventDefault();
  return false;
};

var testUrl = getParameterByName('url');
if (testUrl != null) {
  f.elements['test-url'].value = testUrl;
}
