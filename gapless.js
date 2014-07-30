// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Cache XHRs to avoid repeated requests.
var xhr_cache = {};

// Simple XHR based file loader.  Requests |url| as an ArrayBuffer and delivers
// it to |callback| once the request completes successfully.
function GET(url, callback) {
  if (url in xhr_cache) {
    setTimeout(function() { callback(xhr_cache[url]); }, 0);
    return;
  }

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
  //    "iTunSMPB\0 0000000 00000840 000001C0 0000000000046E00"
  //    "iTunSMPB\0 ####### frontpad  endpad    real samples"
  //
  var iTunesDataIndex = byteStr.indexOf("iTunSMPB");
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
  var xingDataIndex = byteStr.indexOf("Xing");
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

llama.drawGraph = function(container, format, is_gapless) {
  var mediaSource = new MediaSource();
  var context = window.URL.createObjectURL(mediaSource);
  var waveform = Object.create(WaveSurfer);
  waveform.init({
      container: document.querySelector('#waveform_adts_gap'),
      waveColor: 'violet',
      progressColor: 'purple',
      scrollParent: false,
      backend: 'AudioElement',
      height: 300,
  });


};



document.addEventListener("DOMContentLoaded", function(event) {
  llama.drawGraph('waveform_adts_gap', 'audio/aac', false);
});


var peaks = ['0.065188', '0.887799', '0.391675', '0.554872', '0.244652', '0.256417', '0.24865', '0.242561', '0.196158', '0.267281', '0.20867', '0.127903', '0.172155', '0.303049', '0.18009', '0.190512', '0.139119', '0.099597', '0.126118', '0.179464', '0.108798', '0.119922', '0.112537', '0.13419', '0.103107', '0.135289', '0.0936', '0.102298', '0.117985', '0.132191', '0.107501', '0.110004', '0.115955', '0.074969', '0.072207', '0.03058', '0.053423', '0.042482', '0.060518', '0.045717', '0.032746', '0.055071', '0.065905', '0.048601', '0.049135', '0.045015', '0.038224', '0.037431', '0.028443', '0.057466', '0.045152', '0.056322', '0.021104', '0.036042', '0.041475', '0.028871', '0.02971', '0.029771', '0.033784', '0.023972', '0.036836', '0.026276', '0.029557', '0.031709', '0.031449', '0.031465', '0.020829', '0.015839', '0.030274', '0.018738', '0.022385', '0.022874', '0.021989', '0.011261', '0.018281', '0.016831', '0.012574', '0.018845', '0.026185', '0.02205', '0.024445', '0.026826', '0.020875', '0.025681', '0.02121', '0.018296', '0.019715', '0.014451', '0.020341', '0.029511', '0.024232', '0.017136', '0.016938', '0.03061', '0.023606', '0.021943', '0.020417', '0.027421', '0.034654', '0.029466', '0.019456', '0.022874', '0.033738', '0.018937', '0.021546', '0.030671', '0.024674', '0.018342', '0.023621', '0.020356', '0.021287', '0.030885', '0.027482', '0.024049', '0.022507', '0.029191', '0.032792', '0.028001', '0.024796', '0.029145', '0.028596', '0.019257', '0.022889', '0.032533', '0.021409', '0.020188', '0.023438', '0.03882', '0.030168', '0.029313', '0.040147', '0.021775', '0.022324', '0.041749', '0.035096', '0.026383', '0.030671', '0.027375', '0.018754', '0.034608', '0.033326', '0.016099', '0.030076', '0.028581', '0.024277', '0.032151', '0.023286', '0.030427', '0.025452', '0.022813', '0.038301', '0.026307', '0.027497', '0.020234', '0.021241', '0.033967', '0.022965', '0.027848', '0.172124', '0.112598', '0.176031', '0.100787', '0.071154', '0.095386', '0.147023', '0.139531', '0.063997', '0.078051', '0.08945', '0.067064', '0.107471', '0.072985', '0.066607', '0.097873', '0.064074', '0.061953', '0.068255', '0.064287', '0.064028', '0.057115', '0.050935', '0.048616', '0.072207', '0.055101', '0.043229', '0.053728', '0.058687', '0.047258', '0.05736', '0.049196', '0.054125', '0.049974', '0.04265', '0.051698', '0.065401', '0.064196', '0.067095', '0.061846', '0.067034', '0.045839', '0.043199', '0.079287', '0.089511', '0.079073', '0.042817', '0.062883', '0.066057', '0.066774', '0.060259', '0.036622', '0.031983', '0.040803', '0.041444', '0.042421', '0.041856', '0.051195', '0.044862', '0.046876', '0.043764', '0.048235', '0.061556', '0.061739', '0.063662', '0.057405', '0.05533', '0.047945', '0.056276', '0.047334', '0.050951', '0.060076', '0.043367', '0.048097', '0.039857', '0.053423', '0.059908', '0.038057', '0.036546', '0.043855', '0.046953', '0.047365', '0.043458', '0.044084', '0.052416', '0.052232', '0.057772', '0.052217', '0.057237', '0.054109', '0.051363', '0.044145', '0.041169', '0.04503', '0.047731', '0.043962', '0.043519', '0.044755', '0.043977', '0.038957', '0.046251', '0.038774', '0.042405', '0.037858', '0.039567', '0.050798', '0.044923', '0.04474', '0.037721', '0.042375', '0.042894', '0.043886', '0.045717', '0.03592', '0.044954', '0.051347', '0.048158', '0.052797', '0.049303', '0.049684', '0.043687', '0.050737', '0.050523', '0.044649', '0.046876', '0.051881', '0.063387', '0.06061', '0.053591', '0.053133', '0.06737', '0.061998', '0.074282', '0.061418', '0.066317', '0.062883', '0.0656', '0.070132', '0.050859', '0.053652', '0.050584', '0.067248', '0.041551', '0.046571', '0.039552', '0.04297', '0.091342', '0.088855', '0.094989', '0.102924', '0.120396', '0.072466', '0.083316', '0.098361', '0.107425', '0.083132', '0.077181', '0.056764', '0.074923', '0.071474', '0.075152', '0.061083', '0.042955', '0.048204', '0.056063', '0.053835', '0.058947', '0.062273', '0.0571', '0.04004', '0.040208', '0.041734', '0.045854', '0.043992', '0.034425', '0.031709', '0.039796', '0.042161', '0.03946', '0.054415', '0.037263', '0.034516', '0.024644', '0.065615', '0.070956', '0.052141', '0.066073', '0.073305', '0.074129', '0.062716', '0.055239', '0.054018', '0.042482', '0.041276', '0.04471', '0.042985', '0.035188', '0.041643', '0.052171', '0.051592', '0.042665', '0.043046', '0.065874', '0.058123', '0.063112', '0.061647', '0.054445', '0.046297', '0.063692', '0.058535', '0.046434', '0.061281', '0.064455', '0.067782', '0.06151', '0.059526', '0.077181', '0.08475', '0.074755', '0.058', '0.061647', '0.05092', '0.050233', '0.036729', '0.051378', '0.044343', '0.045763', '0.051164', '0.056978', '0.05858', '0.063478', '0.054964', '0.065935', '0.077822', '0.088687', '0.078295', '0.083758', '0.081622', '0.073183', '0.068255', '0.067248', '0.067858', '0.064425', '0.062059', '0.077029', '0.0627', '0.0562', '0.069689', '0.06917', '0.065706', '0.053102', '0.053987', '0.046648', '0.047594', '0.055635', '0.043977', '0.066439', '0.090182', '0.067003', '0.087283', '0.091662', '0.074252', '0.053316', '0.059099', '0.045381', '0.043519', '0.037492', '0.036836', '0.038804', '0.042879', '0.045625', '0.038881', '0.047258', '0.042497', '0.044115', '0.046678', '0.045183', '0.063524', '0.067217', '0.077441', '0.08121', '0.082095', '0.091113', '0.089846', '0.108402', '0.103092', '0.081362', '0.07387', '0.084658', '0.08388', '0.07213', '0.075518', '0.09592', '0.158666', '0.149464', '0.158238', '0.137379', '0.118717', '0.126835', '0.124241', '0.118519', '0.102832', '0.094546', '0.085803', '0.082263', '0.096667', '0.102435', '0.072588', '0.072024', '0.087558', '0.079318', '0.093234', '0.08742', '0.084735', '0.102161', '0.08182', '0.08565', '0.112049', '0.095676', '0.087405', '0.103015', '0.111835', '0.088031', '0.122547', '0.107486', '0.106098', '0.0992', '0.099017', '0.098148', '0.107471', '0.13863', '0.124363', '0.146626', '0.151051', '0.155812', '0.102786', '0.066408', '0.072802', '0.067003', '0.078936', '0.090091', '0.089892', '0.084796', '0.083956', '0.085192', '0.104923', '0.123981', '0.112339', '0.080004', '0.07915', '0.148991', '0.134297', '0.124622', '0.110752', '0.128117', '0.161275', '0.132603', '0.09975', '0.096545', '0.10239', '0.114093', '0.092883', '0.078417', '0.096103', '0.08826', '0.089801', '0.095248', '0.104663', '0.092273', '0.098666', '0.100909', '0.104282', '0.081118', '0.073672', '0.069552', '0.051683', '0.064043', '0.055986', '0.065554', '0.063128', '0.075762', '0.087481', '0.107334', '0.119236', '0.120167', '0.147679', '0.141835', '0.149144', '0.139378', '0.116962', '0.11272', '0.141285', '0.095248', '0.104831', '0.120731', '0.098254', '0.084124', '0.104053', '0.108432', '0.112278', '0.115619', '0.119175', '0.09856', '0.118748', '0.111164', '0.128758', '0.090243', '0.103', '0.10918', '0.120548', '0.118351', '0.129658', '0.095401', '0.097919', '0.094333', '0.087863', '0.089602', '0.1442', '0.144215', '0.15038', '0.146626', '0.15453', '0.143529', '0.158467', '0.157521', '0.216224', '0.248329', '0.193487', '0.282098', '0.212394', '0.300089', '0.280709', '0.295679', '0.34872', '0.314493', '0.350429', '0.306299', '0.407193', '0.362575', '0.360317', '0.253945', '0.324122', '0.265938', '0.291452', '0.409268', '0.592273', '0.753929', '0.63422', '0.718528', '0.716376', '0.544465', '0.762062', '0.473373', '0.466323', '0.62363', '0.556352', '0.471206', '0.491211', '0.545167', '0.415357', '0.422758', '0.45851', '0.424177', '0.404569', '0.381207', '0.312769', '0.324534', '0.36137', '0.283914', '0.281396', '0.309015', '0.415311', '0.352535', '0.360073', '0.282586', '0.31431', '0.376339', '0.350719', '0.255181', '0.245979', '0.269662', '0.283807', '0.28721', '0.289026', '0.311975', '0.231117', '0.252434', '0.295206', '0.242775', '0.238075', '0.266381', '0.287652', '0.328379', '0.266411', '0.288003', '0.336177', '0.280374', '0.242912', '0.319361', '0.307092', '0.29284', '0.329234', '0.283471', '0.293939', '0.22512', '0.329066', '0.347179', '0.312967', '0.332331', '0.282693', '0.370861', '0.376339', '0.350276', '0.351329', '0.289743', '0.373775', '0.392392', '0.341639', '0.363033', '0.374844', '0.361827', '0.302591', '0.341182', '0.306024', '0.292383', '0.340785', '0.451674', '0.398312', '0.328028', '0.341334', '0.400891', '0.312235', '0.316324', '0.26812', '0.256462', '0.316599', '0.345424', '0.388913', '0.363506', '0.303507', '0.369823', '0.365444', '0.318735', '0.346339', '0.245582', '0.279122', '0.276177', '0.328486', '0.343837', '0.255058', '0.244453', '0.234779', '0.252266', '0.228736', '0.185492', '0.226157', '0.251549', '0.217109', '0.235527', '0.26133', '0.245689', '0.249977', '0.244224', '0.160451', '0.186758', '0.181997', '0.153859', '0.221564', '0.196585', '0.192969', '0.215293', '0.161031', '0.153264', '0.127155', '0.123157', '0.126011', '0.133671', '0.111881', '0.097644', '0.083956', '0.071245', '0.047349', '0.051866', '0.048952', '0.033891', '0.028871', '0.023164', '0.012375', '0.007889', '0.004242', '0.000793', '0.0', ]

var playbackIndex = 0;

function onPlaybackReady() {
  playbackReady = true;
  startPlayback(0);
}

var use_gapless = false;
var regions = [];

function startPlayback(e) {
  if (!playbackReady) {
    console.log('Playback not ready...');
    setTimeout(startPlayback, 100, e);
    return;
  }

  sourceBuffer = mediaSource.addSourceBuffer("audio/aac");

  // As each buffer ends, queue the next one via loadAudio().
  sourceBuffer.addEventListener('updateend', loadAudio);

  function loadAudio(e) {
    if (playbackIndex > 4) {
      mediaSource.endOfStream();
      waveform.drawBuffer();


      while (regions.length > 0) {
        var mark_region = regions.shift();
        if (mark_region[0] == mark_region[1])
          waveform.mark({position: mark_region[0], width:1, color: '#00FF00'});
        else {
          console.log('marking: ' + mark_region[0] + ', ' + mark_region[1] + 'width: ' + (mark_region[1] - mark_region[0]) * waveform.params.minPxPerSec);
          waveform.mark({position: mark_region[0], width:Math.ceil((mark_region[1] - mark_region[0]) * waveform.params.minPxPerSec), color: '#FF0000'});
        }
      }

      return;
    }
    var audioFile = 'sintel/sintel_' + playbackIndex++ + '.adts';

    console.log('Loading: ', audioFile);
    GET(audioFile, function(data) {
      var gapless = llama.parseGaplessData(data);
      var appendTime =
          sourceBuffer.buffered.length > 0 ? sourceBuffer.buffered.end(0) : 0;
      if (use_gapless) {
        sourceBuffer.timestampOffset =
            appendTime - gapless[0] * SECONDS_PER_SAMPLE;
        sourceBuffer.appendWindowStart = appendTime;
        sourceBuffer.appendWindowEnd =
            appendTime + gapless[2] * SECONDS_PER_SAMPLE;
        if (appendTime != 0)
          regions.push([appendTime, appendTime]);
      } else {
        if (regions.length == 0) {
          regions
              .push([ appendTime, appendTime + gapless[0] * SECONDS_PER_SAMPLE ]);
        } else {
          regions[regions.length - 1][1] = appendTime + gapless[0] * SECONDS_PER_SAMPLE;
        }
        var end_pad_start =
            appendTime + (gapless[0] + gapless[2]) * SECONDS_PER_SAMPLE;
        regions.push(
            [ end_pad_start, end_pad_start + gapless[1] * SECONDS_PER_SAMPLE ]);
      }
      sourceBuffer.appendBuffer(data);
    });
  }

  // Load the first file and start playback.
  loadAudio(null);
 // audio.play();
}

function tagIt() {
  playbackReady = false;
  mediaSource = new MediaSource();
  context = window.URL.createObjectURL(mediaSource);
  mediaSource.addEventListener('sourceopen', onPlaybackReady, false);

  waveform = Object.create(WaveSurfer);
  waveform.init({
      container: document.querySelector('#waveform_adts_gap'),
      waveColor: 'violet',
      progressColor: 'purple',
      scrollParent: false,
      backend: 'AudioElement',
      height: 300,
  });



    waveform.on('error', function (msg) {
        console.log(msg);
    });

  waveform.load(context, peaks);

}