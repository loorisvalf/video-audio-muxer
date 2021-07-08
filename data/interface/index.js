var config = {
  "running": false,
  "video": {"data": null},
  "audio": {"data": null},
  "output": {"src": null},
  "nohandler": function (e) {
    e.preventDefault();
  },
  "reader": {
    "video": new FileReader(), 
    "audio": new FileReader()
  },
  "file": {
    "video": null, 
    "audio": null, 
    "output": null
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "app": {
    "start": function () {
      config.worker.init();
      config.listener.fileio();
    }
  },
  "prevent": {
    "scroll": false,
    "drop": function (e) {
      if (e.target.id.indexOf("-fileio") !== -1) return;
      e.preventDefault();
    }
  },
  "size": function (s) {
    if (s) {
      if (s >= Math.pow(2, 30)) {return (s / Math.pow(2, 30)).toFixed(1) + "GB"};
      if (s >= Math.pow(2, 20)) {return (s / Math.pow(2, 20)).toFixed(1) + "MB"};
      if (s >= Math.pow(2, 10)) {return (s / Math.pow(2, 10)).toFixed(1) + "KB"};
      /*  */
      return s + "B";
    } else {
      return '';
    }
  },
  "loadend": {
    "video": function (e) {
      var arraybuffer = e.target.result;
      if (arraybuffer) config.video.data = new Uint8Array(arraybuffer);
      config.loader.stop();
    },
    "audio": function (e) {
      var arraybuffer = e.target.result;
      if (arraybuffer) config.audio.data = new Uint8Array(arraybuffer);
      config.loader.stop();
    }
  },
  "loader": {
    "stop": function () {
      config.running = false;
      config.element.loader.style.display = "none";
    },
    "start": function () {
      config.running = true;
      config.create.output.player("none");
      config.element.open.style.display = "none";
      config.element.loader.style.display = "block";
      config.element.download.style.display = "none";
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      var context = document.documentElement.getAttribute("context");
      if (context === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(function () {
          config.storage.write("interface.size", {
            "width": window.innerWidth || window.outerWidth,
            "height": window.innerHeight || window.outerHeight
          });
        }, 300);
      }
    }
  },
  "element": {
    "file": null,
    "input": null,
    "output": null,
    "loader": null,
    "command": null,
    "preview": null,
    "info": {
      "video": null, 
      "audio": null
    },
    "drop": {
      "video": null, 
      "audio": null
    }
  },
  "download": function () {
    var a = document.querySelector('a');
    if (!a) {
      var src = config.create.output.src();
      if (src) {
        a = document.createElement('a');
        a.textContent = config.create.output.name;
        a.download = config.create.output.name;
        a.style.display = "none";
        a.href = src;
        a.click();
        /*  */
        window.setTimeout(function () {
          a.remove();
          URL.revokeObjectURL(config.create.output.blob);
        }, 1000);
      }
    }
  },
  "storage": {
    "local": {},
    "read": function (id) {
      return config.storage.local[id];
    },
    "load": function (callback) {
      chrome.storage.local.get(null, function (e) {
        config.storage.local = e;
        callback();
      });
    },
    "write": function (id, data) {
      if (id) {
        if (data !== '' && data !== null && data !== undefined) {
          var tmp = {};
          tmp[id] = data;
          config.storage.local[id] = data;
          chrome.storage.local.set(tmp, function () {});
        } else {
          delete config.storage.local[id];
          chrome.storage.local.remove(id, function () {});
        }
      }
    }
  },
  "port": {
    "name": '',
    "connect": function () {
      config.port.name = "webapp";
      var context = document.documentElement.getAttribute("context");
      /*  */
      if (chrome.runtime) {
        if (chrome.runtime.connect) {
          if (context !== config.port.name) {
            if (document.location.search === "?tab") config.port.name = "tab";
            if (document.location.search === "?win") config.port.name = "win";
            if (document.location.search === "?popup") config.port.name = "popup";
            /*  */
            if (config.port.name === "popup") {
              document.documentElement.style.width = "775px";
              document.documentElement.style.height = "575px";
            }
            /*  */
            chrome.runtime.connect({"name": config.port.name});
          }
        }
      }
      /*  */
      document.documentElement.setAttribute("context", config.port.name);
    }
  },
  "create": {
    "output": {
      "ext": null,
      "blob": null,
      "name": null,
      "data": null,
      "src": function () {
        var data = config.file.output.data;
        var name = config.file.output.name;
        var ext = name.split('.').length ? name.split('.')[1] : null;
        if (ext) {
          config.create.output.ext = ext;
          config.create.output.name = name;
          config.create.output.data = data;
          config.create.output.blob = new Blob([data], {"type": "video/" + ext});
          return URL.createObjectURL(config.create.output.blob);
        }
        /*  */
        return null;
      },
      "player": function (display) {
        config.element.preview.style.display = display;
        if (config.element.preview.children[1]) config.element.preview.children[1].remove();
        /*  */
        if (display === "block" && config.file.output) {
          var video = document.createElement("video");
          video.setAttribute("controls", "controls");
          video.setAttribute("preload", "metadata");
          config.element.preview.appendChild(video);
          /*  */
          config.element.preview.children[1].src = config.output.src + "#t=0.5";
        }
      }
    }
  },
  "listener": {
    "fileio": function () {
      config.element.drop.video.addEventListener("change", function (e) {
        if (e.target && e.target.files) {
          if (e.target.files.length && e.target.files[0]) {
            var file = e.target.files[0];
            /*  */
            config.loader.start();
            config.file.video = file;
            config.reader.video.readAsArrayBuffer(config.file.video);
            config.element.info.video.textContent = config.size(config.file.video.size);
            /*  */
            if (config.file.video) {
              window.setTimeout(function () {
                config.element.command.click();
                config.create.output.player("none");
              }, 300);
            }
          }
        }
      }, false);
      /*  */
      config.element.drop.audio.addEventListener("change", function (e) {
        if (e.target && e.target.files) {
          if (e.target.files.length && e.target.files[0]) {
            var file = e.target.files[0];
            /*  */
            config.loader.start();
            config.file.audio = file;
            config.reader.audio.readAsArrayBuffer(config.file.audio);
            config.element.info.audio.textContent = config.size(config.file.audio.size);
            /*  */
            if (config.file.audio) {
              window.setTimeout(function () {
                config.element.command.click();
                config.create.output.player("none");
              }, 300);
            }
          }
        }
      }, false);
    }
  },
  "worker": {
    "ready": false,
    "element": null,
    "init": function () {
      if (config.worker.element) config.worker.element.terminate();
      var path = chrome.runtime.getURL("/data/interface/vendor/worker-asm.js");
      /*  */
      config.worker.element = new Worker(path);
      config.worker.element.onmessage = function (e) {
        var message = e.data;
        if (message.type === "start") config.element.output.textContent = "Video & Audio Muxer received a command.\n\n";
        else if (message.type === "stdout") {
          config.element.output.textContent += message.data + "\n";
          if (config.prevent.scroll === false) config.element.output.scrollTop = config.element.output.scrollHeight || 0;
        } else if (message.type === "ready") {
          config.loader.stop();
          config.worker.ready = true;
          config.element.output.textContent = "Video & Audio Muxer is ready!\n\nPlease load separate video & audio files from the above file selectors.\nThen, click on a - Button - above and review/edit the inserted mux command.\nWhen the command is ready, please click on the - Mux - button to execute the command.\nOnce the final result is ready, a download button will appear. If you want to clear the console, please click on the - Clear - button.";
        } else if (message.type === "done") {
          config.loader.stop();
          config.file.output = message.data[0];
          /*  */
          if (config.file.output) {
            config.output.src = config.create.output.src();
            if (config.output.src) {
              config.element.open.style.display = "inline-block";
              config.element.download.style.display = "inline-block";
              window.setTimeout(function () {
                config.create.output.player("block");
              }, 300);
            }
          }
        }
      };
    }
  },
  "command": {
    "clear": function () {
      config.create.output.player("none");
      config.element.output.textContent = '';
      config.element.open.style.display = "none";
      config.element.download.style.display = "none";
    },
    "parse": function (text) {
      var args = [];
      text = text.replace(/\s+/g, ' ');
      text.split('"').forEach(function(t, i) {
        t = t.trim();
        if ((i % 2) === 1) args.push(t);
        else args = args.concat(t.split(" "));
      });
      /*  */
      return args;
    },
    "run": function (command) {
      if (!config.running && config.worker.ready) {
        config.loader.start();
        config.command.clear();
        /*  */
        var args = config.command.parse(command);
        if (args.length > 1) {
          var output = args[args.length - 1];
          if (output && output.indexOf('.') === -1) {
            config.element.input.value = command + ".mkv";
            args[args.length - 1] = args[args.length - 1] + ".mkv";
          }
        }
        /*  */
        var video = config.video.data && config.video.data.byteLength;
        var audio = config.audio.data && config.audio.data.byteLength;
        var files = [{"name": "video", "data": config.video.data}, {"name": "audio", "data": config.audio.data}];
        var options = (video && audio) ? {"type": "command", "arguments": args, "files": files} : {"type": "command", "arguments": args};
        /*  */
        config.worker.element.postMessage(options);
      }
    }
  },
  "load": function () {
    var run = document.querySelector(".run");
    var clear = document.querySelector(".clear");
    var reload = document.getElementById("reload");
    var support = document.getElementById("support");
    var donation = document.getElementById("donation");
    var actions = [...document.querySelectorAll(".action")];
    /*  */
    config.element.input = document.querySelector("#input");
    config.element.open = document.querySelector(".preview");
    config.element.output = document.querySelector("#output");
    config.element.loader = document.querySelector("#loader");
    config.element.preview = document.querySelector("#preview");
    config.element.download = document.querySelector(".download");
    config.element.drop.video = document.getElementById("video-fileio");
    config.element.drop.audio = document.getElementById("audio-fileio");
    config.element.info.video = document.getElementById("video-fileinfo");
    config.element.info.audio = document.getElementById("audio-fileinfo");
    config.element.command = document.querySelector("button[data-command*='output']");
    /*  */
    clear.addEventListener("click", function () {config.command.clear()});
    reload.addEventListener("click", function () {document.location.reload()});
    run.addEventListener("click", function () {config.command.run(config.element.input.value)});
    /*  */
    config.element.download.addEventListener("click", config.download);
    config.reader.video.addEventListener("loadend", config.loadend.video, false);
    config.reader.audio.addEventListener("loadend", config.loadend.audio, false);
    config.element.open.addEventListener("click", function () {config.create.output.player("block")});
    config.element.preview.children[0].addEventListener("click", function () {config.create.output.player("none")});
    config.element.input.addEventListener("keydown", function (e) {if (e.keyCode === 13) config.command.run(config.element.input.value)}, false);
    config.element.output.addEventListener("scroll", function (e) {config.prevent.scroll = config.element.output.scrollHeight - config.element.output.scrollTop > 450});
    /*  */
    support.addEventListener("click", function () {
      var url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      var url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    actions.map(function (action) {
      action.addEventListener("click", function (e) {
        var command = e.target.getAttribute("data-command");
        if (config.file.video && command.indexOf("output") !== -1) {
          var name = config.file.video.name;
          var ext = name.split('.').length ? name.split('.')[1] : "webm";
          command = command + '.' + ext;
        }
        /*  */
        config.element.input.value = command;
      });
    });
    /*  */
    config.storage.load(config.app.start);
    window.removeEventListener("load", config.load, false);
  }
};

config.port.connect();

window.addEventListener("load", config.load, false);
window.addEventListener("drop", config.prevent.drop, true);
window.addEventListener("resize", config.resize.method, false);
window.addEventListener("dragover", config.prevent.drop, true);
