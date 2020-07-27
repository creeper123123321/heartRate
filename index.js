var canvas, context, video, canvasCoef, dataPoints, heartRateText;
var unprocessedData=[];
var processedData=[];
var bpmAverage=[0,0];

$(document).ready(function(){
    // Put event listeners into place

    // Grab elements, create settings, etc.
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    video = document.getElementById("video");
    dataPoints = document.getElementById("dataPoints");
    heartRateText = document.getElementById("heartRate");
    var videoObj = { "video": true };
    var errBack = error => console.log("Video capture error: ", error.code); 

    // Put video listeners into place
    navigator.mediaDevices.getUserMedia(videoObj).then(function(stream) {
      video.srcObject = stream;
      video.play();
    }).catch(errBack);

    canvasCoef=1;
    
    
    function updateCanvasImage()
    {
        var cNewHeight = video.videoHeight * canvasCoef;
        var cNewWidth = video.videoWidth * canvasCoef;
        if (canvas.width != cNewWidth) canvas.width = cNewWidth;
        if (canvas.height != cNewHeight) canvas.height = cNewHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        processImage();
        requestAnimationFrame(updateCanvasImage);
    }
    
    function processImage()
    {
       
        var mRect = [canvas.width/2 - 25, canvas.height/2 - 15, 50, 30];
  
        var i = 0;
        var average = context.getImageData(mRect[0], mRect[1], mRect[2], mRect[3]).data.filter(it => (i++ % 4) == 1)
            .reduce((a, b) => a + b) / (mRect[2] * mRect[3]);
                
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
        unprocessedData.push([average,Date.now()]);
        processedData = normalizeArray(unprocessedData, 450);
        
        dataPoints.innerHTML = processedData.length + "/450: " + processedData.map(it => parseInt(it[0])).join(' ');
        
        if (processedData.length == 450) {
            var duration = processedData[processedData.length-1][1] - processedData[0][1];
            console.log(duration);
            var rate = findHeartRate(dft(processedData), duration).toFixed(1);
            heartRateText.innerHTML = rate;
            context.font = "20px monospaced";
            context.strokeText(rate, mRect[0], mRect[1]);
        }
        unprocessedData=processedData;
        
    }
   
    
    updateCanvasImage();
});
function normalizeArray(data, length)
{
    var res = [];
    if (data.length<length)
        return data;
    for (var i=data.length-length;i<data.length;i++)
        res.push(data[i]);
    return res;        
}
function dft(data)
{
    var i,j;
    var res=[];
    for (i=0;i<data.length;i++)
    {
        res.push(0);
        for (j=0;j<data.length;j++)
        {
            res[i]+=data[j][0]*Math.cos(2 * Math.PI * i * j /data.length);
        }
    }
    return res;
}
function findHeartRate(data, duration) {
    var framesPerSecond = 1000 * data.length / duration;
    var framesPerMinute = framesPerSecond * 60;
    var heartRate = (intSequence(data.length)
        .map(i => [i * framesPerMinute / data.length, data[i]])
        .filter(it => it[0] > 50 && it[0] < 150)
        .sort((a, b) => a[1] - b[1])[0] || [0])[0];
    if (heartRate != 0) {
        bpmAverage[0] += heartRate;
        bpmAverage[1]++;
    }
    return bpmAverage[0] / bpmAverage[1];
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
