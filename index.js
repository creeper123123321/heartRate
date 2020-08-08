var canvas, context, video, canvasCoef, dataPoints, heartRateText, nDataPoints, pointsDetails;
var unprocessedData=[];
var processedData=[];
var bpmAverage=[0,0];
var rectangleHeight, rectangleWidth;
var maxPoints;
var canvasCoef;
var worker = new Worker("worker.js");

$(() => {
    // Put event listeners into place

    function updateData() {
        rectangleHeight = parseInt($("#rectangleHeight").val());
        rectangleWidth = parseInt($("#rectangleWidth").val());
        maxPoints = 2 ** parseInt($("#maxPoints").val());
        canvasCoef = parseFloat($("#canvasCoef").val());
    }
    
    $("#rectangleHeight, #rectangleWidth, #maxPoints, #canvasCoef").on("change", updateData);
    updateData();

    // Grab elements, create settings, etc.
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    video = document.getElementById("video");
    dataPoints = document.getElementById("dataPoints");
    heartRateText = document.getElementById("heartRate");
    nDataPoints = document.getElementById("nDataPoints");
    pointsDetails = document.getElementById("pointsDetails");
    var videoObj = { "video": true };
    var errBack = error => console.log("Video capture error: ", error.code); 

    worker.onmessage = e => {
        bpmAverage[0] += e.data;
        heartRateText.innerHTML = bpmAverage[0] / ++bpmAverage[1];
    }

    // Put video listeners into place
    navigator.mediaDevices.getUserMedia(videoObj).then(stream => {
      video.srcObject = stream;
      video.play();
    }).catch(errBack);
    
    function updateCanvasImage()
    {
        var timeStart = Date.now();
        var cNewHeight = video.videoHeight * canvasCoef;
        var cNewWidth = video.videoWidth * canvasCoef;
        if (canvas.width != cNewWidth) canvas.width = cNewWidth;
        if (canvas.height != cNewHeight) canvas.height = cNewHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        processImage();
        requestAnimationFrame(updateCanvasImage);
        //setTimeout(() => requestAnimationFrame(updateCanvasImage), 33 - (Date.now() - timeStart));
    }
    
    function processImage()
    {
       
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
        context.fillStyle = 'rgba(0,'+parseInt(average)+',0,0.5)';
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = "green";
        context.stroke();
        
        if (unprocessedData.length != 0 && Math.abs(average - unprocessedData[unprocessedData.length - 1][0]) > 10) {
            reset();
        }
        var time = Date.now();
        unprocessedData.push([average, time]);
        processedData = normalizeArray(unprocessedData, maxPoints);
        
        nDataPoints.innerHTML = processedData.length;
        if (pointsDetails.open) {
            dataPoints.innerHTML = processedData.map(it => parseInt(it[0])).join(' ');
        }
        
        if (processedData.length == maxPoints) {
            var duration = time - processedData[0][1];
            context.font = "20px monospaced";
            context.strokeText((bpmAverage[0] / bpmAverage[1]).toFixed(1), mRect[0], mRect[1]);
            worker.postMessage([processedData, duration]);

//            heartRateText.innerHTML = rate;
//            context.font = "20px monospaced";
//            context.strokeText(rate, mRect[0], mRect[1]);
        }
        unprocessedData = processedData;
        
    }
   
    
    updateCanvasImage();
});
function normalizeArray(data, length) {
    return (data.length <= length) ? data : data.slice(-length);
}
function findHeartRate(data, context, duration) {
    var framesPerSecond = 1000 * data.length / duration;
    var obj = new FFT(data.length, framesPerSecond);
    obj.forward(data.map(it => it[0]));
    
    var heartRate = 0;
    var maxMagnitude = 0;
    var bpms = [];
    for (var i = 0; i < obj.spectrum.length; i++) {
        var bpm = obj.getBandFrequency(i) * 60;
        var magnitude = obj.spectrum[i];
        if (bpm > 50) {
            if (bpm < 180) {
                bpms.push(bpm);
                if (magnitude >= maxMagnitude) {
                    maxMagnitude = magnitude;
                    heartRate = bpm;
                }
            } else {
                break;
            }
        }
    }
    console.log(bpms);
    if (heartRate != 0) {
        context.strokeText(heartRate.toFixed(), 0, canvas.height);
        bpmAverage[0] += heartRate;
        bpmAverage[1]++;
    }
    return (bpmAverage[0] / bpmAverage[1]).toFixed(1);
}
function reset() {
    unprocessedData = [];
    processedData = [];
    average = [0, 0];
    heartRateText.innerHTML = "N/A";
}
function intSequence(length, start = 0) {
    return [...Array(length).keys()].map(it => it + start);
}
