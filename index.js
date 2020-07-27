var canvas,conxtext;
var unprocessedData=[];
var processedData=[];
var bpmAverage=[0,0];

$(document).ready(function(){
    // Put event listeners into place

    // Grab elements, create settings, etc.
    canvas = document.getElementById("canvas");
    context = canvas.getContext("2d");
    var video = document.getElementById("video");
    var videoObj = { "video": true };
    var errBack = error => console.log("Video capture error: ", error.code); 

    // Put video listeners into place
    navigator.mediaDevices.getUserMedia(videoObj).then(function(stream) {
      video.srcObject = stream;
      video.play();
    }).catch(errBack);

    var videoHeight, videoWidth;
    var canvasCoef=1;
    
    
    function updateCanvasImage()
    {
        videoHeight= $(video).height();
        videoWidth=$(video).width();
        canvas.width=videoWidth*canvasCoef;
        canvas.height=videoHeight*canvasCoef;
        //var startTime=Date.now();
        context.drawImage(video, 0, 0, videoWidth*canvasCoef, videoHeight*canvasCoef);
        processImage();
        setTimeout(updateCanvasImage,33);
    }
    
    function processImage()
    {
       
        var mRect=[canvas.width/2-25, canvas.height/2-15, 50, 30];
  
        
        var average=0;
        for (var i=mRect[0];i<mRect[0]+mRect[2];i++)
        {
            for (var j=mRect[1];j<mRect[1]+mRect[3];j++)
            {
                average+=context.getImageData(i, j, 1, 1).data[1];
            }
        }
        average/=mRect[2]*mRect[3];
                
        context.beginPath();
        context.rect(mRect[0],mRect[1],mRect[2],mRect[3]);
        context.fillStyle = 'rgb('+parseInt(average)+','+parseInt(average)+','+parseInt(average)+')';
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = 'blue';
        context.stroke();
        
        if (unprocessedData.length != 0 && Math.abs(average - unprocessedData[unprocessedData.length - 1][0]) > 10) {
            reset();
        }
        unprocessedData.push([average,Date.now()]);
        processedData = normalizeArray(unprocessedData,450);
        
        $('#dataPoints').text(processedData.map(it => parseInt(it)).join(', '));
        
        if (processedData.length>449)
        {
            $('#heartRate').text(findHeartRate(dft(processedData),processedData[processedData.length-1][1]-processedData[0][1]));
            $("#heartRateAvg").text(parseInt(bpmAverage[0]/bpmAverage[1]));
            console.log(processedData[processedData.length-1][1]-processedData[0][1]);
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
function findHeartRate(data, duration)
{
    var fps=data.length*60*1000/duration;
    var heartRate=0;
    var maxData=0;
    for (var i=0;i<data.length;i++)
    {
        if (i*fps/data.length>50 && i*fps/data.length<150 && data[i]>maxData)
        {
            maxData=data[i];
            heartRate=i*fps/data.length;
        }
    }
    bpmAverage[0]+=heartRate;
    bpmAverage[1]++;
    return heartRate;
}
function reset() {
    unprocessedData = [];
    processedData = [];
    average = [0, 0];
    $('#heartRate').text("N/A");
    $("#heartRateAvg").text("");
}
