var background = {
  "port": null,
  "message": {},
  "receive": function (id, callback) {
    if (id) {
      background.message[id] = callback;
    }
  },
  "connect": function (port) {
    chrome.runtime.onMessage.addListener(background.listener); 
    /*  */
    if (port) {
      background.port = port;
      background.port.onMessage.addListener(background.listener);
      background.port.onDisconnect.addListener(function () {
        background.port = null;
      });
    }
  },
  "send": function (id, data) {
    if (id) {
      if (background.port) {
        if (background.port.name !== "webapp") {
          chrome.runtime.sendMessage({
            "method": id,
            "data": data,
            "path": "interface-to-background"
          }, function () {
            return chrome.runtime.lastError;
          });
        }
      }
    }
  },
  "post": function (id, data) {
    if (id) {
      if (background.port) {
        background.port.postMessage({
          "method": id,
          "data": data,
          "port": background.port.name,
          "path": "interface-to-background"
        });
      }
    }
  },
  "listener": function (e) {
    if (e) {
      for (let id in background.message) {
        if (background.message[id]) {
          if ((typeof background.message[id]) === "function") {
            if (e.path === "background-to-interface") {
              if (e.method === id) {
                background.message[id](e.data);
              }
            }
          }
        }
      }
    }
  }
};

var config = {
  "running": false,
  "video": {
    "data": null,
    "buffer": null
  },
  "audio": {
    "data": null,
    "buffer": null
  },
  "reader": {
    "video": new FileReader(), 
    "audio": new FileReader()
  },
  "file": {
    "output": {},
    "video": null, 
    "audio": null,
  },
  "addon": {
    "homepage": function () {
      return chrome.runtime.getManifest().homepage_url;
    }
  },
  "prevent": {
    "scroll": false,
    "drop": function (e) {
      if (e.target.id.indexOf("-fileio") !== -1) return;
      e.preventDefault();
    }
  },
  "ffmpeg": {
    "options": null,
    "URL": {
      "base": chrome.runtime.getURL("/data/interface/vendor/"),
      "core": chrome.runtime.getURL("/data/interface/vendor/ffmpeg-core.js"),
      "wasm": chrome.runtime.getURL("/data/interface/vendor/ffmpeg-core.wasm")
    }
  },
  "app": {
    "start": function () {
      config.worker.init();
      config.listener.fileio();
      /*  */
      const theme = config.storage.read("theme") !== undefined ? config.storage.read("theme") : "light";
      document.documentElement.setAttribute("theme", theme !== undefined ? theme : "light");
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
      document.documentElement.removeAttribute("preview");
    }
  },
  "resize": {
    "timeout": null,
    "method": function () {
      if (config.port.name === "win") {
        if (config.resize.timeout) window.clearTimeout(config.resize.timeout);
        config.resize.timeout = window.setTimeout(async function () {
          const current = await chrome.windows.getCurrent();
          /*  */
          config.storage.write("interface.size", {
            "top": current.top,
            "left": current.left,
            "width": current.width,
            "height": current.height
          });
        }, 1000);
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
    let a = document.querySelector('a');
    if (!a) {
      let src = config.create.output.src();
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
          let tmp = {};
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
      const context = document.documentElement.getAttribute("context");
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
  "loadend": {
    "video": function (e) {
      if (e) {
        if (e.target) {
          const arraybuffer = e.target.result;
          if (arraybuffer) {
            config.video.buffer = arraybuffer;
            config.video.data = new Uint8Array(config.video.buffer);
            /*  */
            const size = config.size(config.file.video.size);
            config.element.output.textContent += "> The input " + config.file.video.name + " (" + size + ") is ready." + "\n";
          }
          /*  */
          config.loader.stop();
        }
      }
    },
    "audio": function (e) {
      if (e) {
        if (e.target) {
          const arraybuffer = e.target.result;
          if (arraybuffer) {
            config.audio.buffer = arraybuffer;
            config.audio.data = new Uint8Array(config.audio.buffer);
            /*  */
            const size = config.size(config.file.audio.size);
            config.element.output.textContent += "> The input " + config.file.audio.name + " (" + size + ") is ready." + "\n";
          }
          /*  */
          config.loader.stop();
        }
      }
    }
  },
  "create": {
    "output": {
      "ext": null,
      "blob": null,
      "name": null,
      "data": null,
      "src": function () {
        const data = config.file.output.data;
        const name = config.file.output.name;
        const ext = name.split('.').length ? name.split('.')[1] : null;
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
        if (config.element.preview.children[2]) config.element.preview.children[2].remove();
        /*  */
        if (display === "block" && config.video.src) {
          const video = document.createElement("video");
          video.setAttribute("controls", "controls");
          video.setAttribute("preload", "metadata");
          config.element.preview.appendChild(video);
          /*  */
          config.element.preview.children[2].src = config.video.src + "#t=0.5";
        }
      }
    }
  },
  "listener": {
    "fileio": function () {
      config.element.drop.video.addEventListener("change", function (e) {
        if (e.target) {
          if (e.target.files) {
            if (e.target.files.length && e.target.files[0]) {
              const file = e.target.files[0];
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
        }
      }, false);
      /*  */
      config.element.drop.audio.addEventListener("change", function (e) {
        if (e.target) {
          if (e.target.files) {
            if (e.target.files.length && e.target.files[0]) {
              const file = e.target.files[0];
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
        }
      }, false);
    }
  },
  "worker": {
    "ready": false,
    "init": async function () {
      try {
        config.element.output.textContent = "Video & Audio Muxer is getting ready, please wait...\n";
        config.ffmpeg.options = {
          "coreURL": config.ffmpeg.URL.core, 
          "wasmURL": config.ffmpeg.URL.wasm
        };
        /*  */
        await import(config.ffmpeg.URL.base + "ffmpeg.js");
        config.ffmpeg.core = new FFmpegWASM.FFmpeg();
        await config.ffmpeg.core.load(config.ffmpeg.options);
        /*  */
        config.loader.stop(4);
        config.worker.ready = true;
        config.element.output.textContent = "Video & Audio Muxer is ready!\n\nPlease load separate video & audio files from the above file selectors.\nThen, click on a - Button - above and review/edit the inserted mux command.\nWhen the command is ready, please click on the - Mux - button to execute the command.\nOnce the final result is ready, a download button will appear. If you want to clear the console, please click on the - Clear - button.\n\n";
        /*  */
        config.ffmpeg.core.on("log", function (e) {
          if (e) {
            let type = e.type;
            let message = e.message;
            let prefix = type === "stdout" ? "> " : "• ";
            let aborted = message.indexOf("Aborted") !== -1;
            /*  */
            if (message) {
              if (aborted) config.loader.stop(5);
              config.element.output.textContent += (aborted ? ">> End" : prefix + message) + "\n";
              if (config.prevent.scroll === false) {
                config.element.output.scrollTop = config.element.output.scrollHeight || 0;
              }
            }
          }
        });
        /*  */
        config.ffmpeg.core.on("progress", async function (e) {
          if (e) {
            if (e.progress === 1) {
              config.loader.stop(5);
              config.element.run.textContent = "run";
              /*  */
              config.file.output.data = await config.ffmpeg.core.readFile(config.file.output.name);
              if (config.file.output.data) {
                config.video.src = config.create.output.src();
                if (config.video.src) {
                  config.element.open.style.display = "inline-block";
                  config.element.download.style.display = "inline-block";
                  document.documentElement.setAttribute("preview", '');
                  /*  */
                  window.setTimeout(function () {
                    config.create.output.player("block");
                  }, 300);
                }
              } else {
                /*  */
              }
              /*  */
              await config.ffmpeg.core.deleteFile(config.file.audio.name);
              await config.ffmpeg.core.deleteFile(config.file.video.name);
              await config.ffmpeg.core.deleteFile(config.file.output.name);
              await config.ffmpeg.core.terminate();
            } else {
              config.element.run.textContent = e.progress < 1 ? Math.floor(e.progress * 100) + '%' : "•••";
            }
          }
        });
      } catch (e) {
        config.loader.stop(6);
        config.element.run.textContent = "run";
        config.element.output.textContent += "> An unexpected error happened!" + "\n";
      }
    }
  },
  "command": {
    "clear": function () {
      config.create.output.player("none");
      config.element.output.textContent = '';
      config.element.open.style.display = "none";
      config.element.download.style.display = "none";
      document.documentElement.removeAttribute("preview");
    },
    "parse": function (text) {
      let args = [];
      text = text.replace(/\s+/g, ' ');
      text.split('"').forEach(function(t, i) {
        t = t.trim();
        if ((i % 2) === 1) {
          args.push(t);
        } else {
          args = args.concat(t.split(" "));
        }
      });
      /*  */
      return args;
    },
    "run": async function (command) {
      if (config.worker.ready) {
        if (config.running === false) {
          config.loader.start();
          config.command.clear();
          await config.ffmpeg.core.terminate();
          await config.ffmpeg.core.load(config.ffmpeg.options);
          /*  */
          try {
            if (config.file.audio && config.file.video) {
              if (config.file.audio.name && config.file.video.name) {
                if (command.indexOf("-i video -i audio") !== -1) {
                  command = command.replace("-i audio", "-i " + config.file.audio.name);
                  command = command.replace("-i video", "-i " + config.file.video.name);
                }
              }
            }
            /*  */
            const args = config.command.parse(command);
            if (args && args.length) {
              if (config.audio.data && config.video.data) {
                if (config.audio.data.byteLength && config.video.data.byteLength) {
                  const _audio = config.audio.data.slice(0);
                  const _video = config.video.data.slice(0);
                  config.file.output.name = args[args.length - 1];
                  /*  */
                  await config.ffmpeg.core.writeFile(config.file.audio.name, _audio);
                  await config.ffmpeg.core.writeFile(config.file.video.name, _video);
                } else {
                  config.reader.audio.readAsArrayBuffer(config.file.audio);
                  config.reader.video.readAsArrayBuffer(config.file.video);
                  config.element.output.textContent += "> Reading the input files, please wait..." + "\n";
                  return;
                }
              } else {
                config.loader.stop(2);
              }
              /*  */
              config.ffmpeg.core.exec(args);
            }
          } catch (e) {            
            config.loader.stop(3);
            config.element.run.textContent = "run";
            config.element.output.textContent += "> An unexpected error happened!" + "\n";
          }
        }
      }
    }
  },
  "load": function () {
    const clear = document.querySelector(".clear");
    const theme = document.querySelector(".theme");
    const reload = document.getElementById("reload");
    const support = document.getElementById("support");
    const donation = document.getElementById("donation");
    const actions = [...document.querySelectorAll(".action")];
    /*  */
    config.element.run = document.querySelector(".run");
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
    /*  */
    config.element.download.addEventListener("click", config.download);
    config.reader.video.addEventListener("loadend", config.loadend.video, false);
    config.reader.audio.addEventListener("loadend", config.loadend.audio, false);
    config.element.open.addEventListener("click", function () {config.create.output.player("block")});
    config.element.run.addEventListener("click", function () {config.command.run(config.element.input.value)});
    config.element.preview.children[1].addEventListener("click", function () {config.element.download.click()});
    config.element.preview.children[0].addEventListener("click", function () {config.create.output.player("none")});
    /*  */
    config.element.output.addEventListener("scroll", function () {
      const threshold = window.innerHeight - 224;
      config.prevent.scroll = config.element.output.scrollHeight - config.element.output.scrollTop > threshold;
    });
    /*  */
    support.addEventListener("click", function () {
      const url = config.addon.homepage();
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    donation.addEventListener("click", function () {
      const url = config.addon.homepage() + "?reason=support";
      chrome.tabs.create({"url": url, "active": true});
    }, false);
    /*  */
    theme.addEventListener("click", function () {
      let attribute = document.documentElement.getAttribute("theme");
      attribute = attribute === "dark" ? "light" : "dark";
      /*  */
      document.documentElement.setAttribute("theme", attribute);
      config.storage.write("theme", attribute);
    }, false);
    /*  */
    config.element.input.addEventListener("keydown", function (e) {
      if (e.keyCode === 13) {
        config.command.run(config.element.input.value);
      }
    }, false);
    /*  */
    actions.forEach(function (action) {
      action.addEventListener("click", function (e) {
        let command = e.target.getAttribute("data-command");
        if (config.file.audio && config.file.video) {
          const cond_1 = command.indexOf("output") !== -1;
          const cond_2 = command.indexOf("output.") === -1;
          /*  */
          if (cond_1 && cond_2) {
            const audioext = '.' + config.file.audio.name.split('.')[1];
            const videoext = '.' + config.file.video.name.split('.')[1];
            const lookupext = {
              ".mov": {
                ".ogg": [".mkv"],
                ".opus": [".mkv"],
                ".m4a": [".mp4", ".mov"],
                ".aac": [".mp4", ".mov"],
                ".mp3": [".mp4", ".mov"]
              },
              ".avi": {
                ".ogg": [".mkv"],
                ".opus": [".mkv"],
                ".aac": [".mp4", ".mkv"],
                ".m4a": [".mp4", ".mkv"],
                ".mp3": [".avi", ".mkv", ".mp4"]
              },
              ".flv": {
                ".ogg": [".mkv"],
                ".opus": [".mkv"],
                ".aac": [".mp4", ".mkv"],
                ".mp3": [".mp4", ".mkv"],
                ".m4a": [".mp4", ".mkv"]
              },
              ".webm": {
                ".mp3": [".mkv"],
                ".ogg": [".webm"],
                ".opus": [".webm"],
                ".aac": [".mkv", ".mp4"],
                ".m4a": [".mp4", ".mkv"]
              },
              ".mp4": {
                ".ogg": [".mkv"],
                ".m4a": [".mp4"],
                ".aac": [".mp4"],
                ".opus": [".mkv"],
                ".mp3": [".mp4", ".mkv"]
              },
              ".mkv": {
                ".m4a": [".mkv", ".mp4"],
                ".aac": [".mkv", ".mp4"],
                ".mp3": [".mkv", ".mp4"],
                ".ogg": [".mkv", ".webm"],
                ".opus": [".mkv", ".webm"]
              }
            };
            /*  */
            const outputext = lookupext[videoext]?.[audioext];
            if (outputext && outputext.length) {
              command = command + outputext[0];
            }
          }
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
