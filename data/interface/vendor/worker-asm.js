var core = {};

core.now = Date.now;

core.log = function (data) {
  postMessage({"type": "stdout", "data": data});
};

core.ffmpeg = {
  "url": '', 
  "path": '',
  "data": '', 
  "urls": [],
  "fetch": null,
};

for (var i = 1; i < 10; i++) {
  core.ffmpeg.urls.push("ffmpeg-all-codecs.part0" + i);
}

core.ffmpeg.fetch = () => {
  var url = core.ffmpeg.path + core.ffmpeg.urls.shift();
  fetch(url).then(e => e.text()).then(t => core.ffmpeg.data = core.ffmpeg.data + t).then(() => {
    if (core.ffmpeg.urls.length) core.ffmpeg.fetch();
    else {
      var blob = new Blob([core.ffmpeg.data], {"type": "text/javascript"});
      core.ffmpeg.url = URL.createObjectURL(blob);
      importScripts(core.ffmpeg.url);
      /*  */
      postMessage({"type" : "ready"});
    }
  });
};

onmessage = function (e) {
  if (e.data.type === "import") {
    core.ffmpeg.path = e.data.path;
    /*  */
    if (core.ffmpeg.path) {
      core.ffmpeg.fetch();
    }
  }
  /*  */
  if (e.data.type === "command") {
    var Module = {
      "print": core.log,
      "printErr": core.log,
      "TOTAL_MEMORY": 268435456,
      "files": e.data.files || [],
      "arguments": e.data.arguments || []
    };
    /*  */
    postMessage({"type" : "start", "data" : Module.arguments.join(' ')});
    postMessage({"type" : "stdout", "data" : ">> Command: " + Module.arguments.join(' ') + ((Module.TOTAL_MEMORY) ? ".\nProcessing with " + Module.TOTAL_MEMORY + " bits. Please wait...\n" : '')});
    /*  */
    var time = core.now();
    var result = ffmpeg_run(Module);
    var totaltimespent = core.now() - time;
    postMessage({"type" : "stdout", "data" : "\n>> Finished processing (" + totaltimespent / 1000 + " Seconds)"});
    postMessage({"type" : "done", "data" : result, "time" : totaltimespent});
  }
};
