importScripts("https://cdn.jsdelivr.net/npm/dspjs@1.0.0/dsp.js");

onmessage = function(e) {
    var data = e.data[0];
    var duration = e.data[1];
    var framesPerMinute = 1000 * 60 * data.length / duration;
    var obj = new FFT(data.length, framesPerMinute);
    obj.forward(data.map(it => it[0]));
    
    var heartRate = 0;
    var maxMagnitude = 0;
    var bpms = [];
    for (var i = 0; i < obj.spectrum.length; i++) {
        var bpm = obj.getBandFrequency(i);
        var magnitude = obj.spectrum[i];
        if (bpm > 50) {
            if (bpm < 180) {
                bpms.push([bpm, magnitude]);
                if (magnitude >= maxMagnitude) {
                    maxMagnitude = magnitude;
                    heartRate = bpm;
                }
            } else {
                break;
            }
        }
    }
    postMessage([heartRate, bpms]);
}
