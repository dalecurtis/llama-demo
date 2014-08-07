// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Cache XHRs to avoid repeated requests.
var xhr_cache = {};

// Simple XHR based file loader.  Requests |url| as an ArrayBuffer and delivers
// it to |callback| once the request completes successfully.
function GET(url, callback) {
  if (url in xhr_cache) {
    if (xhr_cache[url] == 'pending')
      setTimeout(function() { GET(url, callback); }, 10);
    else
      setTimeout(function() { callback(xhr_cache[url]); }, 0);
    return;
  }
  xhr_cache[url] = 'pending';

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function(e) {
    if (xhr.status == 200) {
      xhr_cache[url] = xhr.response;
      callback(xhr.response);
    } else {
      console.log('GET ' + url + ' failed: ' + xhr.status);
    }
  };
  xhr.send();
}

// Hard coded sample rate for test data; this could be parsed from the container
// instead, but for the sake of focus I've hard coded it.
var SECONDS_PER_SAMPLE = 1 / 44100.0;

// Number of audio chunks to load.
var SEGMENTS = 5;

// Base path for Sintel audio segments.
var SINTEL_BASE_PATH = 'sintel/sintel_';

var llama = {};

// Convert bytes into an integer.  Probably doesn't work right for > 31 bits.
llama.readInt = function(buffer) {
  var result = buffer.charCodeAt(0);
  for (var i = 1; i < buffer.length; ++i) {
    result <<= 8;
    result += buffer.charCodeAt(i);
  }
  return result;
}

llama.parseGaplessData = function(arrayBuffer) {
  // Gapless data is generally within the first 512 bytes, so limit parsing.
  var byteStr = String.fromCharCode.apply(
      null, new Uint8Array(arrayBuffer.slice(0, 512)));

  var frontPadding = 0, endPadding = 0, realSamples = 0;

  // iTunes encodes the gapless data as hex strings like so:
  //
  //    'iTunSMPB\0 0000000 00000840 000001C0 0000000000046E00'
  //    'iTunSMPB\0 ####### frontpad  endpad    real samples'
  //
  var iTunesDataIndex = byteStr.indexOf('iTunSMPB');
  if (iTunesDataIndex != -1) {
    var frontPaddingIndex = iTunesDataIndex + 19;
    frontPadding = parseInt(byteStr.substr(frontPaddingIndex, 8), 16);

    var endPaddingIndex = frontPaddingIndex + 9;
    endPadding = parseInt(byteStr.substr(endPaddingIndex, 8), 16);

    var sampleCountIndex = endPaddingIndex + 9;
    realSamples = parseInt(byteStr.substr(sampleCountIndex, 16), 16);
  }

  // Xing padding is encoded as 24bits within the header.  Note: This code will
  // only work for Layer3 Version 1 and Layer2 MP3 files with XING frame counts
  // and gapless information.  See the following documents for more details:
  // http://teslabs.com/openplayer/docs/docs/specs/mp3_structure2.pdf (2.1.5)
  // http://gingko.homeip.net/docs/file_formats/dxhead.html (FRAMES_FLAG)
  var xingDataIndex = byteStr.indexOf('Xing');
  if (xingDataIndex == -1) xingDataIndex = byteStr.indexOf('Info');
  if (xingDataIndex != -1) {
    var frameCountIndex = xingDataIndex + 8;
    var frameCount = llama.readInt(byteStr.substr(frameCountIndex, 4));

    // For Layer3 Version 1 and Layer2 there are 1152 samples per frame.
    realSamples = frameCount * 1152;

    xingDataIndex = byteStr.indexOf('LAME');
    if (xingDataIndex == -1) xingDataIndex = byteStr.indexOf('Lavf');
    if (xingDataIndex != -1) {
      var gaplessDataIndex = xingDataIndex + 21;
      var gaplessBits = llama.readInt(byteStr.substr(gaplessDataIndex, 3));

      // Upper 12 bits are the front padding, lower are the end padding.
      frontPadding = gaplessBits >> 12;
      endPadding = gaplessBits & 0xFFF;
    }

    realSamples -= frontPadding + endPadding;
  }

  console.log('pad: ' + frontPadding +
              ', end: ' + endPadding +
              ', samples: ' + realSamples);
  return [frontPadding, endPadding, realSamples];
}

llama.loadAudio = function(format, isGapless, mediaSource, waveform) {
  var regions = [];
  var segmentsLeft = SEGMENTS;
  var sourceBuffer = mediaSource.addSourceBuffer(format);

  function loadSegment(e) {
    if (!segmentsLeft) {
      mediaSource.endOfStream();

      // Wavesurfer doesn't account for the marker width when setting up the
      // graph, so extend it by a pixel after loading is complete.
      waveform.params.container.style.width =
          (waveform.params.container.clientWidth + 1) + 'px';

      // Wavesurfer doesn't seem to handle dynamic loads very well, so ensure
      // the peaks and graph are all drawn out appropriately before marking.
      waveform.drawBuffer();

      // Draw marks for the join points in gapless mode and highlight the gaps
      // when in regular mode.
      while (regions.length > 0) {
        var mark_region = regions.shift();
        if (mark_region[0] == mark_region[1]) {
          waveform.mark({color: '#00FF00', position: mark_region[0], width: 1});
        } else {
          waveform.mark({
            color: '#FF0000',
            position: mark_region[0],
            width: Math.ceil((mark_region[1] - mark_region[0]) *
                             waveform.params.minPxPerSec)
          });
        }
      }
      return;
    }

    var segment = SEGMENTS - segmentsLeft--;
    var audioFile =
        SINTEL_BASE_PATH + segment + (format == 'audio/aac' ? '.adts' : '.mp3');
    console.log('Loading: ', audioFile);

    GET(audioFile, function(data) {
      var gapless = llama.parseGaplessData(data);
      var appendTime =
          sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.end(0) : 0;
      if (isGapless) {
        sourceBuffer.timestampOffset =
            appendTime - gapless[0] * SECONDS_PER_SAMPLE;
        sourceBuffer.appendWindowStart = appendTime;
        sourceBuffer.appendWindowEnd =
            appendTime + gapless[2] * SECONDS_PER_SAMPLE;
        regions.push([appendTime, appendTime]);
      } else {
        // Coalesce front and end padding between segments.
        var frontPadDuration = gapless[0] * SECONDS_PER_SAMPLE;
        if (regions.length == 0)
          regions.push([appendTime, appendTime + frontPadDuration]);
        else
          regions[regions.length - 1][1] = appendTime + frontPadDuration;

        var endOfSegment =
            appendTime + (gapless[0] + gapless[2]) * SECONDS_PER_SAMPLE;
        regions.push(
            [endOfSegment, endOfSegment + gapless[1] * SECONDS_PER_SAMPLE]);
      }
      sourceBuffer.appendBuffer(data);
    });
  }

  // As each buffer ends, queue the next one via loadSegment().
  sourceBuffer.addEventListener('updateend', loadSegment);
  loadSegment();
}

llama.drawGraph = function(container, format, isGapless, peaks) {
  var mediaSource = new MediaSource();
  var context = window.URL.createObjectURL(mediaSource);
  var waveform = Object.create(WaveSurfer);

  var waveformContainer = document.getElementById(container);
  waveform.init({
      backend: 'AudioElement',
      container: waveformContainer,
      dragSelection: false,
      height: waveformContainer.clientHeight,
      progressColor: 'purple',
      scrollParent: false,
      waveColor: 'violet',
  });

  mediaSource.addEventListener('sourceopen', function(event) {
    llama.loadAudio(format, isGapless, mediaSource, waveform);
  }, false);

  var overlay = waveformContainer.parentElement.querySelector('.play-overlay');
  overlay.onclick = function(e) {
    e.target.style.visibility = 'hidden';
    waveform.play();
  }

  waveform.load(context, peaks);

  waveform.media.addEventListener('ended', function(event) {
    waveform.seekTo(0);
    overlay.style.visibility = 'visible';
  }, false);
};

document.addEventListener('DOMContentLoaded', function(event) {
  llama.drawGraph(
      'waveform_adts_gapless', 'audio/aac', true, adts_gapless_peaks);
  llama.drawGraph('waveform_adts_gap', 'audio/aac', false, adts_gap_peaks);
});
