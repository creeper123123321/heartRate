var canvas, context, video, canvasCoef, dataPoints, heartRateText, nDataPoints, pointsDetails, spec;
var data = [];
var bpmAverage = 0;
var rectangleHeight, rectangleWidth;
var maxPoints;
var canvasCoef;
var worker = new Worker(URL.createObjectURL(new Blob([`
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
        if (bpm >= 50) {
            if (bpm <= 180) {
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
`], {type:"text/javascript"})));

$(() => {
    // Put event listeners into place

    function updateData() {
        rectangleHeight = parseInt($("#rectangleHeight").val());
        rectangleWidth = parseInt($("#rectangleWidth").val());
        maxPoints = 2 ** parseInt($("#maxPoints").val());
        canvasCoef = parseFloat($("#canvasCoef").val());
    }
    
    $("#settings").on("change", updateData);
    updateData();

    // Grab elements, create settings, etc.
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    video = document.getElementById("video");
    dataPoints = document.getElementById("dataPoints");
    heartRateText = document.getElementById("heartRate");
    nDataPoints = document.getElementById("nDataPoints");
    pointsDetails = document.getElementById("pointsDetails");
    spec = document.getElementById("spec");
    var videoObj = { "video": true };
    var errBack = error => console.log("Video capture error: ", error.code); 

    worker.onmessage = e => {
        bpmAverage = bpmAverage * 0.97 + e.data[0] * 0.03;
        let maxVal = e.data[1].map(it => it[1]).reduce((a, b) => a > b ? a : b);
        let htmlSpec = "";
        e.data[1].forEach((val, i) => htmlSpec += "<p><meter id='bpm_" + i + "' value=" + val[1] + " min='0' max=" + maxVal + "></meter><label for='bpm_" + i + "'>" + val[0].toFixed(1) + "</label></p>");
        spec.innerHTML = htmlSpec;
        heartRateText.innerHTML = bpmAverage;
    }

    // Put video listeners into place
    navigator.mediaDevices.getUserMedia(videoObj).then(stream => {
      video.srcObject = stream;
      video.play();
    }).catch(errBack);
    
    function updateCanvasImage() {
        var timeStart = Date.now();
        var cNewHeight = video.videoHeight * canvasCoef;
        var cNewWidth = video.videoWidth * canvasCoef;
        if (canvas.width != cNewWidth) canvas.width = cNewWidth;
        if (canvas.height != cNewHeight) canvas.height = cNewHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        processImage();
        requestAnimationFrame(updateCanvasImage);
    }
    
    function processImage() {
        var mRect = [(canvas.width - rectangleWidth) / 2, (canvas.height - rectangleHeight) / 2, rectangleWidth, rectangleHeight];
  
        var pixels = mRect[2] * mRect[3];
        var imageData = context.getImageData(mRect[0], mRect[1], mRect[2], mRect[3]).data;
        
        var average = 0;
        for (var i = 0; i < pixels; i++) {
            average += imageData[i * 4 + 1];
        }
        average /= pixels;
                
        context.beginPath();
        context.rect(mRect[0], mRect[1], mRect[2], mRect[3]);
        context.lineWidth = 2;
        context.strokeStyle = 'rgba(0,' + (parseInt(average) * 0.5 + 30) +',0,0.5)';
        context.stroke();
        
        if (data.length != 0 && Math.abs(average - data[data.length - 1][0]) > 10) {
            reset();
        }
        var time = Date.now();
        data.push([average, time]);
        data = normalizeArray(data, maxPoints);
        
        nDataPoints.innerHTML = data.length;
        if (pointsDetails.open) {
            dataPoints.innerHTML = data.map(it => parseInt(it[0])).join(' ');
        }
        
        if (data.length == maxPoints) {
            var duration = time - data[0][1];
            context.font = "20px monospaced";
            context.strokeStyle = "green";
            context.strokeText(bpmAverage.toFixed(1), mRect[0], mRect[1]);
            worker.postMessage([data, duration]);
        }
    }
   
    
    updateCanvasImage();
});

function normalizeArray(data, length) {
    return (data.length <= length) ? data : data.slice(-length);
}

function reset() {
    data = [];
    average = [0, 0];
    heartRateText.innerHTML = "N/A";
}
