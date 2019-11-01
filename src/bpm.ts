import MusicTempo from "music-tempo"

function getPeaks(data) {
  let partSize = 22050,
    parts = data[0].length / partSize,
    peaks = [];

  for (let i = 0; i < parts; i++) {
    let max: { position: number; volume: number };
    for (let j = i * partSize; j < (i + 1) * partSize; j++) {
      let volume = Math.max(Math.abs(data[0][j]), Math.abs(data[1][j]));
      if (!max || volume > max.volume) {
        max = {
          position: j,
          volume: volume
        };
      }
    }
    peaks.push(max);
  }

  peaks.sort(function(a, b) {
    return b.volume - a.volume;
  });

  peaks = peaks.splice(0, peaks.length * 0.5);

  peaks.sort(function(a, b) {
    return a.position - b.position;
  });

  console.log(peaks);

  return peaks;
}

function getIntervals(peaks) {
  let groups = [];

  peaks.forEach(function(peak, index) {
    for (let i = 1; index + i < peaks.length && i < 10; i++) {
      let group = {
        tempo: (60 * 44100) / (peaks[index + i].position - peak.position),
        count: 1
      };

      while (group.tempo < 90) {
        group.tempo *= 2;
      }

      while (group.tempo > 180) {
        group.tempo /= 2;
      }

      group.tempo = Math.round(group.tempo);

      if (
        !groups.some(function(interval) {
          return interval.tempo === group.tempo ? interval.count++ : 0;
        })
      ) {
        groups.push(group);
      }
    }
  });

  return groups;
}

let OfflineContext = window.OfflineAudioContext;
let offlineContext = new OfflineContext(2, 30 * 44100, 44100);

async function calculateBPMFromData(data: ArrayBuffer) {
  let sourceBuffer = await offlineContext.decodeAudioData(data);

  let source = offlineContext.createBufferSource();
  source.buffer = sourceBuffer;

  let lowpass = offlineContext.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 150;
  lowpass.Q.value = 1;

  source.connect(lowpass);

  let highpass = offlineContext.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 100;
  highpass.Q.value = 1;
  lowpass.connect(highpass);

  highpass.connect(offlineContext.destination);

  source.start(0);

  let filteredBuffer = await offlineContext.startRendering()

  let peaks = getPeaks([
    filteredBuffer.getChannelData(0),
    filteredBuffer.getChannelData(1)
  ]);

  let groups = getIntervals(peaks);

  groups = groups.sort(function(intA, intB) {
    return intB.count - intA.count;
  });

  console.log(groups);

  return groups[0].tempo;
}

function loadFile(uri: string) {
  return new Promise<ArrayBuffer>(resolve => {
    let request = new XMLHttpRequest();
    request.open("GET", uri, true);
    request.responseType = "arraybuffer";
    request.onload = () => resolve(request.response);
    request.send();
  });
}

export async function calculateBPM(uri: string) {
  let data = await loadFile(uri);
  return calcMusicTempo(data)
  //return calculateBPMFromData(data);
}

export async function playFile(uri: string) {
  let data = await loadFile(uri);

  let audioCtx = new window.AudioContext();
  let source = audioCtx.createBufferSource();
  let buffer = await audioCtx.decodeAudioData(data);

  source.buffer = buffer;
  source.connect(audioCtx.destination);
  source.start(0);

  return audioCtx;
}

async function calcMusicTempo (raw:ArrayBuffer) : Promise<{bpm:number, initial:number}> {
  let buffer = await offlineContext.decodeAudioData(raw);

  let audioData = new Float32Array(buffer.getChannelData(0).length);
  
  // Take the average of the two channels
  if (buffer.numberOfChannels == 2) {
    let channel1Data = buffer.getChannelData(0);
    let channel2Data = buffer.getChannelData(1);
    let length = channel1Data.length;
    for (let i = 0; i < length; i++) {
      audioData[i] = (channel1Data[i] + channel2Data[i]) / 2;
    }
  } else {
    audioData = buffer.getChannelData(0);
  }

  console.time("calc")
  let mt = new MusicTempo(audioData);
  console.timeEnd("calc")
  console.log(mt);

  return {bpm:mt.tempo, initial:mt.bestAgent.initialBeatInterval};
}

/*document.addEventListener("mousedown", e => {
        source.connect(new window.AudioContext().destination)
      })*/

/*offlineContext.startRendering().then(renderedBuffer => {
        console.log("Rendering completed successfully");
        document.addEventListener("mousedown", e => {
          let audioCtx = new window.AudioContext();
          let song = audioCtx.createBufferSource();
          song.buffer = renderedBuffer;

          song.connect(audioCtx.destination);

          song.start();
        });

      });*/
