(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // node_modules/mediasoup-client/node_modules/ms/index.js
  var require_ms = __commonJS({
    "node_modules/mediasoup-client/node_modules/ms/index.js"(exports, module) {
      var s = 1e3;
      var m = s * 60;
      var h = m * 60;
      var d = h * 24;
      var w = d * 7;
      var y = d * 365.25;
      module.exports = function(val, options) {
        options = options || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse(val);
        } else if (type === "number" && isFinite(val)) {
          return options.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error(
          "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
        );
      };
      function parse(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str
        );
        if (!match) {
          return;
        }
        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * y;
          case "weeks":
          case "week":
          case "w":
            return n * w;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return Math.round(ms / d) + "d";
        }
        if (msAbs >= h) {
          return Math.round(ms / h) + "h";
        }
        if (msAbs >= m) {
          return Math.round(ms / m) + "m";
        }
        if (msAbs >= s) {
          return Math.round(ms / s) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return plural(ms, msAbs, d, "day");
        }
        if (msAbs >= h) {
          return plural(ms, msAbs, h, "hour");
        }
        if (msAbs >= m) {
          return plural(ms, msAbs, m, "minute");
        }
        if (msAbs >= s) {
          return plural(ms, msAbs, s, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n, name) {
        var isPlural = msAbs >= n * 1.5;
        return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
      }
    }
  });

  // node_modules/mediasoup-client/node_modules/debug/src/common.js
  var require_common = __commonJS({
    "node_modules/mediasoup-client/node_modules/debug/src/common.js"(exports, module) {
      function setup(env) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require_ms();
        createDebug.destroy = destroy;
        Object.keys(env).forEach((key) => {
          createDebug[key] = env[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i = 0; i < namespace.length; i++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug(...args) {
            if (!debug.enabled) {
              return;
            }
            const self = debug;
            const curr = Number(/* @__PURE__ */ new Date());
            const ms = curr - (prevTime || curr);
            self.diff = ms;
            self.prev = prevTime;
            self.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self, args);
            const logFn = self.log || createDebug.log;
            logFn.apply(self, args);
          }
          debug.namespace = namespace;
          debug.useColors = createDebug.useColors();
          debug.color = createDebug.selectColor(namespace);
          debug.extend = extend;
          debug.destroy = createDebug.destroy;
          Object.defineProperty(debug, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v) => {
              enableOverride = v;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug);
          }
          return debug;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
          for (const ns of split) {
            if (ns[0] === "-") {
              createDebug.skips.push(ns.slice(1));
            } else {
              createDebug.names.push(ns);
            }
          }
        }
        function matchesTemplate(search, template) {
          let searchIndex = 0;
          let templateIndex = 0;
          let starIndex = -1;
          let matchIndex = 0;
          while (searchIndex < search.length) {
            if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
              if (template[templateIndex] === "*") {
                starIndex = templateIndex;
                matchIndex = searchIndex;
                templateIndex++;
              } else {
                searchIndex++;
                templateIndex++;
              }
            } else if (starIndex !== -1) {
              templateIndex = starIndex + 1;
              matchIndex++;
              searchIndex = matchIndex;
            } else {
              return false;
            }
          }
          while (templateIndex < template.length && template[templateIndex] === "*") {
            templateIndex++;
          }
          return templateIndex === template.length;
        }
        function disable() {
          const namespaces = [
            ...createDebug.names,
            ...createDebug.skips.map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name) {
          for (const skip of createDebug.skips) {
            if (matchesTemplate(name, skip)) {
              return false;
            }
          }
          for (const ns of createDebug.names) {
            if (matchesTemplate(name, ns)) {
              return true;
            }
          }
          return false;
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module.exports = setup;
    }
  });

  // node_modules/mediasoup-client/node_modules/debug/src/browser.js
  var require_browser = __commonJS({
    "node_modules/mediasoup-client/node_modules/debug/src/browser.js"(exports, module) {
      exports.formatArgs = formatArgs;
      exports.save = save;
      exports.load = load;
      exports.useColors = useColors;
      exports.storage = localstorage();
      exports.destroy = /* @__PURE__ */ (() => {
        let warned = false;
        return () => {
          if (!warned) {
            warned = true;
            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
          }
        };
      })();
      exports.colors = [
        "#0000CC",
        "#0000FF",
        "#0033CC",
        "#0033FF",
        "#0066CC",
        "#0066FF",
        "#0099CC",
        "#0099FF",
        "#00CC00",
        "#00CC33",
        "#00CC66",
        "#00CC99",
        "#00CCCC",
        "#00CCFF",
        "#3300CC",
        "#3300FF",
        "#3333CC",
        "#3333FF",
        "#3366CC",
        "#3366FF",
        "#3399CC",
        "#3399FF",
        "#33CC00",
        "#33CC33",
        "#33CC66",
        "#33CC99",
        "#33CCCC",
        "#33CCFF",
        "#6600CC",
        "#6600FF",
        "#6633CC",
        "#6633FF",
        "#66CC00",
        "#66CC33",
        "#9900CC",
        "#9900FF",
        "#9933CC",
        "#9933FF",
        "#99CC00",
        "#99CC33",
        "#CC0000",
        "#CC0033",
        "#CC0066",
        "#CC0099",
        "#CC00CC",
        "#CC00FF",
        "#CC3300",
        "#CC3333",
        "#CC3366",
        "#CC3399",
        "#CC33CC",
        "#CC33FF",
        "#CC6600",
        "#CC6633",
        "#CC9900",
        "#CC9933",
        "#CCCC00",
        "#CCCC33",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF0099",
        "#FF00CC",
        "#FF00FF",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF3399",
        "#FF33CC",
        "#FF33FF",
        "#FF6600",
        "#FF6633",
        "#FF9900",
        "#FF9933",
        "#FFCC00",
        "#FFCC33"
      ];
      function useColors() {
        if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
          return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
          return false;
        }
        let m;
        return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
        typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
      }
      function formatArgs(args) {
        args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
        if (!this.useColors) {
          return;
        }
        const c = "color: " + this.color;
        args.splice(1, 0, c, "color: inherit");
        let index = 0;
        let lastC = 0;
        args[0].replace(/%[a-zA-Z%]/g, (match) => {
          if (match === "%%") {
            return;
          }
          index++;
          if (match === "%c") {
            lastC = index;
          }
        });
        args.splice(lastC, 0, c);
      }
      exports.log = console.debug || console.log || (() => {
      });
      function save(namespaces) {
        try {
          if (namespaces) {
            exports.storage.setItem("debug", namespaces);
          } else {
            exports.storage.removeItem("debug");
          }
        } catch (error) {
        }
      }
      function load() {
        let r;
        try {
          r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
        } catch (error) {
        }
        if (!r && typeof process !== "undefined" && "env" in process) {
          r = process.env.DEBUG;
        }
        return r;
      }
      function localstorage() {
        try {
          return localStorage;
        } catch (error) {
        }
      }
      module.exports = require_common()(exports);
      var { formatters } = module.exports;
      formatters.j = function(v) {
        try {
          return JSON.stringify(v);
        } catch (error) {
          return "[UnexpectedJSONParseError]: " + error.message;
        }
      };
    }
  });

  // node_modules/mediasoup-client/lib/types.js
  var require_types = __commonJS({
    "node_modules/mediasoup-client/lib/types.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
    }
  });

  // node_modules/mediasoup-client/lib/Logger.js
  var require_Logger = __commonJS({
    "node_modules/mediasoup-client/lib/Logger.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Logger = void 0;
      var debug_1 = require_browser();
      var APP_NAME = "mediasoup-client";
      var Logger = class {
        _debug;
        _warn;
        _error;
        constructor(prefix) {
          if (prefix) {
            this._debug = (0, debug_1.default)(`${APP_NAME}:${prefix}`);
            this._warn = (0, debug_1.default)(`${APP_NAME}:WARN:${prefix}`);
            this._error = (0, debug_1.default)(`${APP_NAME}:ERROR:${prefix}`);
          } else {
            this._debug = (0, debug_1.default)(APP_NAME);
            this._warn = (0, debug_1.default)(`${APP_NAME}:WARN`);
            this._error = (0, debug_1.default)(`${APP_NAME}:ERROR`);
          }
          this._debug.log = console.info.bind(console);
          this._warn.log = console.warn.bind(console);
          this._error.log = console.error.bind(console);
        }
        get debug() {
          return this._debug;
        }
        get warn() {
          return this._warn;
        }
        get error() {
          return this._error;
        }
      };
      exports.Logger = Logger;
    }
  });

  // node_modules/events-alias/events.js
  var require_events = __commonJS({
    "node_modules/events-alias/events.js"(exports, module) {
      "use strict";
      var R = typeof Reflect === "object" ? Reflect : null;
      var ReflectApply = R && typeof R.apply === "function" ? R.apply : function ReflectApply2(target, receiver, args) {
        return Function.prototype.apply.call(target, receiver, args);
      };
      var ReflectOwnKeys;
      if (R && typeof R.ownKeys === "function") {
        ReflectOwnKeys = R.ownKeys;
      } else if (Object.getOwnPropertySymbols) {
        ReflectOwnKeys = function ReflectOwnKeys2(target) {
          return Object.getOwnPropertyNames(target).concat(Object.getOwnPropertySymbols(target));
        };
      } else {
        ReflectOwnKeys = function ReflectOwnKeys2(target) {
          return Object.getOwnPropertyNames(target);
        };
      }
      function ProcessEmitWarning(warning) {
        if (console && console.warn) console.warn(warning);
      }
      var NumberIsNaN = Number.isNaN || function NumberIsNaN2(value) {
        return value !== value;
      };
      function EventEmitter() {
        EventEmitter.init.call(this);
      }
      module.exports = EventEmitter;
      module.exports.once = once;
      EventEmitter.EventEmitter = EventEmitter;
      EventEmitter.prototype._events = void 0;
      EventEmitter.prototype._eventsCount = 0;
      EventEmitter.prototype._maxListeners = void 0;
      var defaultMaxListeners = 10;
      function checkListener(listener) {
        if (typeof listener !== "function") {
          throw new TypeError('The "listener" argument must be of type Function. Received type ' + typeof listener);
        }
      }
      Object.defineProperty(EventEmitter, "defaultMaxListeners", {
        enumerable: true,
        get: function() {
          return defaultMaxListeners;
        },
        set: function(arg) {
          if (typeof arg !== "number" || arg < 0 || NumberIsNaN(arg)) {
            throw new RangeError('The value of "defaultMaxListeners" is out of range. It must be a non-negative number. Received ' + arg + ".");
          }
          defaultMaxListeners = arg;
        }
      });
      EventEmitter.init = function() {
        if (this._events === void 0 || this._events === Object.getPrototypeOf(this)._events) {
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
        }
        this._maxListeners = this._maxListeners || void 0;
      };
      EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
        if (typeof n !== "number" || n < 0 || NumberIsNaN(n)) {
          throw new RangeError('The value of "n" is out of range. It must be a non-negative number. Received ' + n + ".");
        }
        this._maxListeners = n;
        return this;
      };
      function _getMaxListeners(that) {
        if (that._maxListeners === void 0)
          return EventEmitter.defaultMaxListeners;
        return that._maxListeners;
      }
      EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
        return _getMaxListeners(this);
      };
      EventEmitter.prototype.emit = function emit(type) {
        var args = [];
        for (var i = 1; i < arguments.length; i++) args.push(arguments[i]);
        var doError = type === "error";
        var events = this._events;
        if (events !== void 0)
          doError = doError && events.error === void 0;
        else if (!doError)
          return false;
        if (doError) {
          var er;
          if (args.length > 0)
            er = args[0];
          if (er instanceof Error) {
            throw er;
          }
          var err = new Error("Unhandled error." + (er ? " (" + er.message + ")" : ""));
          err.context = er;
          throw err;
        }
        var handler = events[type];
        if (handler === void 0)
          return false;
        if (typeof handler === "function") {
          ReflectApply(handler, this, args);
        } else {
          var len = handler.length;
          var listeners = arrayClone(handler, len);
          for (var i = 0; i < len; ++i)
            ReflectApply(listeners[i], this, args);
        }
        return true;
      };
      function _addListener(target, type, listener, prepend) {
        var m;
        var events;
        var existing;
        checkListener(listener);
        events = target._events;
        if (events === void 0) {
          events = target._events = /* @__PURE__ */ Object.create(null);
          target._eventsCount = 0;
        } else {
          if (events.newListener !== void 0) {
            target.emit(
              "newListener",
              type,
              listener.listener ? listener.listener : listener
            );
            events = target._events;
          }
          existing = events[type];
        }
        if (existing === void 0) {
          existing = events[type] = listener;
          ++target._eventsCount;
        } else {
          if (typeof existing === "function") {
            existing = events[type] = prepend ? [listener, existing] : [existing, listener];
          } else if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
          m = _getMaxListeners(target);
          if (m > 0 && existing.length > m && !existing.warned) {
            existing.warned = true;
            var w = new Error("Possible EventEmitter memory leak detected. " + existing.length + " " + String(type) + " listeners added. Use emitter.setMaxListeners() to increase limit");
            w.name = "MaxListenersExceededWarning";
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            ProcessEmitWarning(w);
          }
        }
        return target;
      }
      EventEmitter.prototype.addListener = function addListener(type, listener) {
        return _addListener(this, type, listener, false);
      };
      EventEmitter.prototype.on = EventEmitter.prototype.addListener;
      EventEmitter.prototype.prependListener = function prependListener(type, listener) {
        return _addListener(this, type, listener, true);
      };
      function onceWrapper() {
        if (!this.fired) {
          this.target.removeListener(this.type, this.wrapFn);
          this.fired = true;
          if (arguments.length === 0)
            return this.listener.call(this.target);
          return this.listener.apply(this.target, arguments);
        }
      }
      function _onceWrap(target, type, listener) {
        var state = { fired: false, wrapFn: void 0, target, type, listener };
        var wrapped = onceWrapper.bind(state);
        wrapped.listener = listener;
        state.wrapFn = wrapped;
        return wrapped;
      }
      EventEmitter.prototype.once = function once2(type, listener) {
        checkListener(listener);
        this.on(type, _onceWrap(this, type, listener));
        return this;
      };
      EventEmitter.prototype.prependOnceListener = function prependOnceListener(type, listener) {
        checkListener(listener);
        this.prependListener(type, _onceWrap(this, type, listener));
        return this;
      };
      EventEmitter.prototype.removeListener = function removeListener(type, listener) {
        var list, events, position, i, originalListener;
        checkListener(listener);
        events = this._events;
        if (events === void 0)
          return this;
        list = events[type];
        if (list === void 0)
          return this;
        if (list === listener || list.listener === listener) {
          if (--this._eventsCount === 0)
            this._events = /* @__PURE__ */ Object.create(null);
          else {
            delete events[type];
            if (events.removeListener)
              this.emit("removeListener", type, list.listener || listener);
          }
        } else if (typeof list !== "function") {
          position = -1;
          for (i = list.length - 1; i >= 0; i--) {
            if (list[i] === listener || list[i].listener === listener) {
              originalListener = list[i].listener;
              position = i;
              break;
            }
          }
          if (position < 0)
            return this;
          if (position === 0)
            list.shift();
          else {
            spliceOne(list, position);
          }
          if (list.length === 1)
            events[type] = list[0];
          if (events.removeListener !== void 0)
            this.emit("removeListener", type, originalListener || listener);
        }
        return this;
      };
      EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
      EventEmitter.prototype.removeAllListeners = function removeAllListeners(type) {
        var listeners, events, i;
        events = this._events;
        if (events === void 0)
          return this;
        if (events.removeListener === void 0) {
          if (arguments.length === 0) {
            this._events = /* @__PURE__ */ Object.create(null);
            this._eventsCount = 0;
          } else if (events[type] !== void 0) {
            if (--this._eventsCount === 0)
              this._events = /* @__PURE__ */ Object.create(null);
            else
              delete events[type];
          }
          return this;
        }
        if (arguments.length === 0) {
          var keys = Object.keys(events);
          var key;
          for (i = 0; i < keys.length; ++i) {
            key = keys[i];
            if (key === "removeListener") continue;
            this.removeAllListeners(key);
          }
          this.removeAllListeners("removeListener");
          this._events = /* @__PURE__ */ Object.create(null);
          this._eventsCount = 0;
          return this;
        }
        listeners = events[type];
        if (typeof listeners === "function") {
          this.removeListener(type, listeners);
        } else if (listeners !== void 0) {
          for (i = listeners.length - 1; i >= 0; i--) {
            this.removeListener(type, listeners[i]);
          }
        }
        return this;
      };
      function _listeners(target, type, unwrap) {
        var events = target._events;
        if (events === void 0)
          return [];
        var evlistener = events[type];
        if (evlistener === void 0)
          return [];
        if (typeof evlistener === "function")
          return unwrap ? [evlistener.listener || evlistener] : [evlistener];
        return unwrap ? unwrapListeners(evlistener) : arrayClone(evlistener, evlistener.length);
      }
      EventEmitter.prototype.listeners = function listeners(type) {
        return _listeners(this, type, true);
      };
      EventEmitter.prototype.rawListeners = function rawListeners(type) {
        return _listeners(this, type, false);
      };
      EventEmitter.listenerCount = function(emitter, type) {
        if (typeof emitter.listenerCount === "function") {
          return emitter.listenerCount(type);
        } else {
          return listenerCount.call(emitter, type);
        }
      };
      EventEmitter.prototype.listenerCount = listenerCount;
      function listenerCount(type) {
        var events = this._events;
        if (events !== void 0) {
          var evlistener = events[type];
          if (typeof evlistener === "function") {
            return 1;
          } else if (evlistener !== void 0) {
            return evlistener.length;
          }
        }
        return 0;
      }
      EventEmitter.prototype.eventNames = function eventNames() {
        return this._eventsCount > 0 ? ReflectOwnKeys(this._events) : [];
      };
      function arrayClone(arr, n) {
        var copy = new Array(n);
        for (var i = 0; i < n; ++i)
          copy[i] = arr[i];
        return copy;
      }
      function spliceOne(list, index) {
        for (; index + 1 < list.length; index++)
          list[index] = list[index + 1];
        list.pop();
      }
      function unwrapListeners(arr) {
        var ret = new Array(arr.length);
        for (var i = 0; i < ret.length; ++i) {
          ret[i] = arr[i].listener || arr[i];
        }
        return ret;
      }
      function once(emitter, name) {
        return new Promise(function(resolve, reject) {
          function errorListener(err) {
            emitter.removeListener(name, resolver);
            reject(err);
          }
          function resolver() {
            if (typeof emitter.removeListener === "function") {
              emitter.removeListener("error", errorListener);
            }
            resolve([].slice.call(arguments));
          }
          ;
          eventTargetAgnosticAddListener(emitter, name, resolver, { once: true });
          if (name !== "error") {
            addErrorHandlerIfEventEmitter(emitter, errorListener, { once: true });
          }
        });
      }
      function addErrorHandlerIfEventEmitter(emitter, handler, flags) {
        if (typeof emitter.on === "function") {
          eventTargetAgnosticAddListener(emitter, "error", handler, flags);
        }
      }
      function eventTargetAgnosticAddListener(emitter, name, listener, flags) {
        if (typeof emitter.on === "function") {
          if (flags.once) {
            emitter.once(name, listener);
          } else {
            emitter.on(name, listener);
          }
        } else if (typeof emitter.addEventListener === "function") {
          emitter.addEventListener(name, function wrapListener(arg) {
            if (flags.once) {
              emitter.removeEventListener(name, wrapListener);
            }
            listener(arg);
          });
        } else {
          throw new TypeError('The "emitter" argument must be of type EventEmitter. Received type ' + typeof emitter);
        }
      }
    }
  });

  // node_modules/mediasoup-client/lib/enhancedEvents.js
  var require_enhancedEvents = __commonJS({
    "node_modules/mediasoup-client/lib/enhancedEvents.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.EnhancedEventEmitter = void 0;
      var events_alias_1 = require_events();
      var Logger_1 = require_Logger();
      var enhancedEventEmitterLogger = new Logger_1.Logger("EnhancedEventEmitter");
      var EnhancedEventEmitter = class extends events_alias_1.EventEmitter {
        constructor() {
          super();
          this.setMaxListeners(Infinity);
        }
        /**
         * Empties all stored event listeners.
         */
        close() {
          super.removeAllListeners();
        }
        emit(eventName, ...args) {
          return super.emit(eventName, ...args);
        }
        /**
         * Special addition to the EventEmitter API.
         */
        safeEmit(eventName, ...args) {
          try {
            return super.emit(eventName, ...args);
          } catch (error) {
            enhancedEventEmitterLogger.error("safeEmit() | event listener threw an error [eventName:%s]:%o", eventName, error);
            try {
              super.emit("listenererror", eventName, error);
            } catch (error2) {
            }
            return Boolean(super.listenerCount(eventName));
          }
        }
        on(eventName, listener) {
          super.on(eventName, listener);
          return this;
        }
        off(eventName, listener) {
          super.off(eventName, listener);
          return this;
        }
        addListener(eventName, listener) {
          super.on(eventName, listener);
          return this;
        }
        prependListener(eventName, listener) {
          super.prependListener(eventName, listener);
          return this;
        }
        once(eventName, listener) {
          super.once(eventName, listener);
          return this;
        }
        prependOnceListener(eventName, listener) {
          super.prependOnceListener(eventName, listener);
          return this;
        }
        removeListener(eventName, listener) {
          super.off(eventName, listener);
          return this;
        }
        removeAllListeners(eventName) {
          super.removeAllListeners(eventName);
          return this;
        }
        listenerCount(eventName) {
          return super.listenerCount(eventName);
        }
        listeners(eventName) {
          return super.listeners(eventName);
        }
        rawListeners(eventName) {
          return super.rawListeners(eventName);
        }
      };
      exports.EnhancedEventEmitter = EnhancedEventEmitter;
    }
  });

  // node_modules/mediasoup-client/lib/errors.js
  var require_errors = __commonJS({
    "node_modules/mediasoup-client/lib/errors.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.InvalidStateError = exports.UnsupportedError = void 0;
      var UnsupportedError = class _UnsupportedError extends Error {
        constructor(message) {
          super(message);
          this.name = "UnsupportedError";
          if (Error.hasOwnProperty("captureStackTrace")) {
            Error.captureStackTrace(this, _UnsupportedError);
          } else {
            this.stack = new Error(message).stack;
          }
        }
      };
      exports.UnsupportedError = UnsupportedError;
      var InvalidStateError = class _InvalidStateError extends Error {
        constructor(message) {
          super(message);
          this.name = "InvalidStateError";
          if (Error.hasOwnProperty("captureStackTrace")) {
            Error.captureStackTrace(this, _InvalidStateError);
          } else {
            this.stack = new Error(message).stack;
          }
        }
      };
      exports.InvalidStateError = InvalidStateError;
    }
  });

  // node_modules/mediasoup-client/lib/utils.js
  var require_utils = __commonJS({
    "node_modules/mediasoup-client/lib/utils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.clone = clone;
      exports.generateRandomNumber = generateRandomNumber;
      exports.deepFreeze = deepFreeze;
      function clone(value) {
        if (value === void 0) {
          return void 0;
        } else if (Number.isNaN(value)) {
          return NaN;
        } else if (typeof structuredClone === "function") {
          return structuredClone(value);
        } else {
          return JSON.parse(JSON.stringify(value));
        }
      }
      function generateRandomNumber() {
        return Math.round(Math.random() * 1e7);
      }
      function deepFreeze(data) {
        const propNames = Reflect.ownKeys(data);
        for (const name of propNames) {
          const value = data[name];
          if (value && typeof value === "object" || typeof value === "function") {
            deepFreeze(value);
          }
        }
        return Object.freeze(data);
      }
    }
  });

  // node_modules/h264-profile-level-id/node_modules/ms/index.js
  var require_ms2 = __commonJS({
    "node_modules/h264-profile-level-id/node_modules/ms/index.js"(exports, module) {
      var s = 1e3;
      var m = s * 60;
      var h = m * 60;
      var d = h * 24;
      var w = d * 7;
      var y = d * 365.25;
      module.exports = function(val, options) {
        options = options || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse(val);
        } else if (type === "number" && isFinite(val)) {
          return options.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error(
          "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
        );
      };
      function parse(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str
        );
        if (!match) {
          return;
        }
        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * y;
          case "weeks":
          case "week":
          case "w":
            return n * w;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return Math.round(ms / d) + "d";
        }
        if (msAbs >= h) {
          return Math.round(ms / h) + "h";
        }
        if (msAbs >= m) {
          return Math.round(ms / m) + "m";
        }
        if (msAbs >= s) {
          return Math.round(ms / s) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return plural(ms, msAbs, d, "day");
        }
        if (msAbs >= h) {
          return plural(ms, msAbs, h, "hour");
        }
        if (msAbs >= m) {
          return plural(ms, msAbs, m, "minute");
        }
        if (msAbs >= s) {
          return plural(ms, msAbs, s, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n, name) {
        var isPlural = msAbs >= n * 1.5;
        return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
      }
    }
  });

  // node_modules/h264-profile-level-id/node_modules/debug/src/common.js
  var require_common2 = __commonJS({
    "node_modules/h264-profile-level-id/node_modules/debug/src/common.js"(exports, module) {
      function setup(env) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require_ms2();
        createDebug.destroy = destroy;
        Object.keys(env).forEach((key) => {
          createDebug[key] = env[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i = 0; i < namespace.length; i++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug(...args) {
            if (!debug.enabled) {
              return;
            }
            const self = debug;
            const curr = Number(/* @__PURE__ */ new Date());
            const ms = curr - (prevTime || curr);
            self.diff = ms;
            self.prev = prevTime;
            self.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self, args);
            const logFn = self.log || createDebug.log;
            logFn.apply(self, args);
          }
          debug.namespace = namespace;
          debug.useColors = createDebug.useColors();
          debug.color = createDebug.selectColor(namespace);
          debug.extend = extend;
          debug.destroy = createDebug.destroy;
          Object.defineProperty(debug, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v) => {
              enableOverride = v;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug);
          }
          return debug;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
          for (const ns of split) {
            if (ns[0] === "-") {
              createDebug.skips.push(ns.slice(1));
            } else {
              createDebug.names.push(ns);
            }
          }
        }
        function matchesTemplate(search, template) {
          let searchIndex = 0;
          let templateIndex = 0;
          let starIndex = -1;
          let matchIndex = 0;
          while (searchIndex < search.length) {
            if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
              if (template[templateIndex] === "*") {
                starIndex = templateIndex;
                matchIndex = searchIndex;
                templateIndex++;
              } else {
                searchIndex++;
                templateIndex++;
              }
            } else if (starIndex !== -1) {
              templateIndex = starIndex + 1;
              matchIndex++;
              searchIndex = matchIndex;
            } else {
              return false;
            }
          }
          while (templateIndex < template.length && template[templateIndex] === "*") {
            templateIndex++;
          }
          return templateIndex === template.length;
        }
        function disable() {
          const namespaces = [
            ...createDebug.names,
            ...createDebug.skips.map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name) {
          for (const skip of createDebug.skips) {
            if (matchesTemplate(name, skip)) {
              return false;
            }
          }
          for (const ns of createDebug.names) {
            if (matchesTemplate(name, ns)) {
              return true;
            }
          }
          return false;
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module.exports = setup;
    }
  });

  // node_modules/h264-profile-level-id/node_modules/debug/src/browser.js
  var require_browser2 = __commonJS({
    "node_modules/h264-profile-level-id/node_modules/debug/src/browser.js"(exports, module) {
      exports.formatArgs = formatArgs;
      exports.save = save;
      exports.load = load;
      exports.useColors = useColors;
      exports.storage = localstorage();
      exports.destroy = /* @__PURE__ */ (() => {
        let warned = false;
        return () => {
          if (!warned) {
            warned = true;
            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
          }
        };
      })();
      exports.colors = [
        "#0000CC",
        "#0000FF",
        "#0033CC",
        "#0033FF",
        "#0066CC",
        "#0066FF",
        "#0099CC",
        "#0099FF",
        "#00CC00",
        "#00CC33",
        "#00CC66",
        "#00CC99",
        "#00CCCC",
        "#00CCFF",
        "#3300CC",
        "#3300FF",
        "#3333CC",
        "#3333FF",
        "#3366CC",
        "#3366FF",
        "#3399CC",
        "#3399FF",
        "#33CC00",
        "#33CC33",
        "#33CC66",
        "#33CC99",
        "#33CCCC",
        "#33CCFF",
        "#6600CC",
        "#6600FF",
        "#6633CC",
        "#6633FF",
        "#66CC00",
        "#66CC33",
        "#9900CC",
        "#9900FF",
        "#9933CC",
        "#9933FF",
        "#99CC00",
        "#99CC33",
        "#CC0000",
        "#CC0033",
        "#CC0066",
        "#CC0099",
        "#CC00CC",
        "#CC00FF",
        "#CC3300",
        "#CC3333",
        "#CC3366",
        "#CC3399",
        "#CC33CC",
        "#CC33FF",
        "#CC6600",
        "#CC6633",
        "#CC9900",
        "#CC9933",
        "#CCCC00",
        "#CCCC33",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF0099",
        "#FF00CC",
        "#FF00FF",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF3399",
        "#FF33CC",
        "#FF33FF",
        "#FF6600",
        "#FF6633",
        "#FF9900",
        "#FF9933",
        "#FFCC00",
        "#FFCC33"
      ];
      function useColors() {
        if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
          return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
          return false;
        }
        let m;
        return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
        typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
      }
      function formatArgs(args) {
        args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
        if (!this.useColors) {
          return;
        }
        const c = "color: " + this.color;
        args.splice(1, 0, c, "color: inherit");
        let index = 0;
        let lastC = 0;
        args[0].replace(/%[a-zA-Z%]/g, (match) => {
          if (match === "%%") {
            return;
          }
          index++;
          if (match === "%c") {
            lastC = index;
          }
        });
        args.splice(lastC, 0, c);
      }
      exports.log = console.debug || console.log || (() => {
      });
      function save(namespaces) {
        try {
          if (namespaces) {
            exports.storage.setItem("debug", namespaces);
          } else {
            exports.storage.removeItem("debug");
          }
        } catch (error) {
        }
      }
      function load() {
        let r;
        try {
          r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
        } catch (error) {
        }
        if (!r && typeof process !== "undefined" && "env" in process) {
          r = process.env.DEBUG;
        }
        return r;
      }
      function localstorage() {
        try {
          return localStorage;
        } catch (error) {
        }
      }
      module.exports = require_common2()(exports);
      var { formatters } = module.exports;
      formatters.j = function(v) {
        try {
          return JSON.stringify(v);
        } catch (error) {
          return "[UnexpectedJSONParseError]: " + error.message;
        }
      };
    }
  });

  // node_modules/h264-profile-level-id/lib/Logger.js
  var require_Logger2 = __commonJS({
    "node_modules/h264-profile-level-id/lib/Logger.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Logger = void 0;
      var debug_1 = require_browser2();
      var APP_NAME = "h264-profile-level-id";
      var Logger = class {
        _debug;
        _warn;
        _error;
        constructor(prefix) {
          if (prefix) {
            this._debug = (0, debug_1.default)(`${APP_NAME}:${prefix}`);
            this._warn = (0, debug_1.default)(`${APP_NAME}:WARN:${prefix}`);
            this._error = (0, debug_1.default)(`${APP_NAME}:ERROR:${prefix}`);
          } else {
            this._debug = (0, debug_1.default)(APP_NAME);
            this._warn = (0, debug_1.default)(`${APP_NAME}:WARN`);
            this._error = (0, debug_1.default)(`${APP_NAME}:ERROR`);
          }
          this._debug.log = console.info.bind(console);
          this._warn.log = console.warn.bind(console);
          this._error.log = console.error.bind(console);
        }
        get debug() {
          return this._debug;
        }
        get warn() {
          return this._warn;
        }
        get error() {
          return this._error;
        }
      };
      exports.Logger = Logger;
    }
  });

  // node_modules/h264-profile-level-id/lib/index.js
  var require_lib = __commonJS({
    "node_modules/h264-profile-level-id/lib/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ProfileLevelId = exports.Level = exports.Profile = void 0;
      exports.parseProfileLevelId = parseProfileLevelId;
      exports.profileLevelIdToString = profileLevelIdToString;
      exports.profileToString = profileToString;
      exports.levelToString = levelToString;
      exports.parseSdpProfileLevelId = parseSdpProfileLevelId;
      exports.isSameProfile = isSameProfile;
      exports.isSameProfileAndLevel = isSameProfileAndLevel;
      exports.generateProfileLevelIdStringForAnswer = generateProfileLevelIdStringForAnswer;
      exports.supportedLevel = supportedLevel;
      var Logger_1 = require_Logger2();
      var logger = new Logger_1.Logger();
      var Profile;
      (function(Profile2) {
        Profile2[Profile2["ConstrainedBaseline"] = 1] = "ConstrainedBaseline";
        Profile2[Profile2["Baseline"] = 2] = "Baseline";
        Profile2[Profile2["Main"] = 3] = "Main";
        Profile2[Profile2["ConstrainedHigh"] = 4] = "ConstrainedHigh";
        Profile2[Profile2["High"] = 5] = "High";
        Profile2[Profile2["PredictiveHigh444"] = 6] = "PredictiveHigh444";
      })(Profile || (exports.Profile = Profile = {}));
      var Level;
      (function(Level2) {
        Level2[Level2["L1_b"] = 0] = "L1_b";
        Level2[Level2["L1"] = 10] = "L1";
        Level2[Level2["L1_1"] = 11] = "L1_1";
        Level2[Level2["L1_2"] = 12] = "L1_2";
        Level2[Level2["L1_3"] = 13] = "L1_3";
        Level2[Level2["L2"] = 20] = "L2";
        Level2[Level2["L2_1"] = 21] = "L2_1";
        Level2[Level2["L2_2"] = 22] = "L2_2";
        Level2[Level2["L3"] = 30] = "L3";
        Level2[Level2["L3_1"] = 31] = "L3_1";
        Level2[Level2["L3_2"] = 32] = "L3_2";
        Level2[Level2["L4"] = 40] = "L4";
        Level2[Level2["L4_1"] = 41] = "L4_1";
        Level2[Level2["L4_2"] = 42] = "L4_2";
        Level2[Level2["L5"] = 50] = "L5";
        Level2[Level2["L5_1"] = 51] = "L5_1";
        Level2[Level2["L5_2"] = 52] = "L5_2";
      })(Level || (exports.Level = Level = {}));
      var ProfileLevelId = class {
        profile;
        level;
        constructor(profile, level) {
          this.profile = profile;
          this.level = level;
        }
      };
      exports.ProfileLevelId = ProfileLevelId;
      var DefaultProfileLevelId = new ProfileLevelId(Profile.ConstrainedBaseline, Level.L3_1);
      var BitPattern = class {
        mask;
        masked_value;
        constructor(str) {
          this.mask = ~byteMaskString("x", str);
          this.masked_value = byteMaskString("1", str);
        }
        isMatch(value) {
          return this.masked_value === (value & this.mask);
        }
      };
      var ProfilePattern = class {
        profile_idc;
        profile_iop;
        profile;
        constructor(profile_idc, profile_iop, profile) {
          this.profile_idc = profile_idc;
          this.profile_iop = profile_iop;
          this.profile = profile;
        }
      };
      var ProfilePatterns = [
        new ProfilePattern(66, new BitPattern("x1xx0000"), Profile.ConstrainedBaseline),
        new ProfilePattern(77, new BitPattern("1xxx0000"), Profile.ConstrainedBaseline),
        new ProfilePattern(88, new BitPattern("11xx0000"), Profile.ConstrainedBaseline),
        new ProfilePattern(66, new BitPattern("x0xx0000"), Profile.Baseline),
        new ProfilePattern(88, new BitPattern("10xx0000"), Profile.Baseline),
        new ProfilePattern(77, new BitPattern("0x0x0000"), Profile.Main),
        new ProfilePattern(100, new BitPattern("00000000"), Profile.High),
        new ProfilePattern(100, new BitPattern("00001100"), Profile.ConstrainedHigh),
        new ProfilePattern(244, new BitPattern("00000000"), Profile.PredictiveHigh444)
      ];
      var LevelConstraints = [
        {
          max_macroblocks_per_second: 1485,
          max_macroblock_frame_size: 99,
          level: Level.L1
        },
        {
          max_macroblocks_per_second: 1485,
          max_macroblock_frame_size: 99,
          level: Level.L1_b
        },
        {
          max_macroblocks_per_second: 3e3,
          max_macroblock_frame_size: 396,
          level: Level.L1_1
        },
        {
          max_macroblocks_per_second: 6e3,
          max_macroblock_frame_size: 396,
          level: Level.L1_2
        },
        {
          max_macroblocks_per_second: 11880,
          max_macroblock_frame_size: 396,
          level: Level.L1_3
        },
        {
          max_macroblocks_per_second: 11880,
          max_macroblock_frame_size: 396,
          level: Level.L2
        },
        {
          max_macroblocks_per_second: 19800,
          max_macroblock_frame_size: 792,
          level: Level.L2_1
        },
        {
          max_macroblocks_per_second: 20250,
          max_macroblock_frame_size: 1620,
          level: Level.L2_2
        },
        {
          max_macroblocks_per_second: 40500,
          max_macroblock_frame_size: 1620,
          level: Level.L3
        },
        {
          max_macroblocks_per_second: 108e3,
          max_macroblock_frame_size: 3600,
          level: Level.L3_1
        },
        {
          max_macroblocks_per_second: 216e3,
          max_macroblock_frame_size: 5120,
          level: Level.L3_2
        },
        {
          max_macroblocks_per_second: 245760,
          max_macroblock_frame_size: 8192,
          level: Level.L4
        },
        {
          max_macroblocks_per_second: 245760,
          max_macroblock_frame_size: 8192,
          level: Level.L4_1
        },
        {
          max_macroblocks_per_second: 522240,
          max_macroblock_frame_size: 8704,
          level: Level.L4_2
        },
        {
          max_macroblocks_per_second: 589824,
          max_macroblock_frame_size: 22080,
          level: Level.L5
        },
        {
          max_macroblocks_per_second: 983040,
          max_macroblock_frame_size: 36864,
          level: Level.L5_1
        },
        {
          max_macroblocks_per_second: 2073600,
          max_macroblock_frame_size: 36864,
          level: Level.L5_2
        }
      ];
      function parseProfileLevelId(str) {
        const ConstraintSet3Flag = 16;
        if (typeof str !== "string" || str.length !== 6) {
          return void 0;
        }
        const profile_level_id_numeric = parseInt(str, 16);
        if (profile_level_id_numeric === 0) {
          return void 0;
        }
        const level_idc = profile_level_id_numeric & 255;
        const profile_iop = profile_level_id_numeric >> 8 & 255;
        const profile_idc = profile_level_id_numeric >> 16 & 255;
        let level;
        switch (level_idc) {
          case Level.L1_1: {
            level = (profile_iop & ConstraintSet3Flag) !== 0 ? Level.L1_b : Level.L1_1;
            break;
          }
          case Level.L1:
          case Level.L1_2:
          case Level.L1_3:
          case Level.L2:
          case Level.L2_1:
          case Level.L2_2:
          case Level.L3:
          case Level.L3_1:
          case Level.L3_2:
          case Level.L4:
          case Level.L4_1:
          case Level.L4_2:
          case Level.L5:
          case Level.L5_1:
          case Level.L5_2: {
            level = level_idc;
            break;
          }
          // Unrecognized level_idc.
          default: {
            logger.warn(`parseProfileLevelId() | unrecognized level_idc [str:${str}, level_idc:${level_idc}]`);
            return void 0;
          }
        }
        for (const pattern of ProfilePatterns) {
          if (profile_idc === pattern.profile_idc && pattern.profile_iop.isMatch(profile_iop)) {
            logger.debug(`parseProfileLevelId() | result [str:${str}, profile:${pattern.profile}, level:${level}]`);
            return new ProfileLevelId(pattern.profile, level);
          }
        }
        logger.warn(`parseProfileLevelId() | unrecognized profile_idc/profile_iop combination [str:${str}, profile_idc:${profile_idc}, profile_iop:${profile_iop}]`);
        return void 0;
      }
      function profileLevelIdToString(profile_level_id) {
        if (profile_level_id.level == Level.L1_b) {
          switch (profile_level_id.profile) {
            case Profile.ConstrainedBaseline: {
              return "42f00b";
            }
            case Profile.Baseline: {
              return "42100b";
            }
            case Profile.Main: {
              return "4d100b";
            }
            // Level 1_b is not allowed for other profiles.
            default: {
              logger.warn(`profileLevelIdToString() | Level 1_b not is allowed for profile ${profile_level_id.profile}`);
              return void 0;
            }
          }
        }
        let profile_idc_iop_string;
        switch (profile_level_id.profile) {
          case Profile.ConstrainedBaseline: {
            profile_idc_iop_string = "42e0";
            break;
          }
          case Profile.Baseline: {
            profile_idc_iop_string = "4200";
            break;
          }
          case Profile.Main: {
            profile_idc_iop_string = "4d00";
            break;
          }
          case Profile.ConstrainedHigh: {
            profile_idc_iop_string = "640c";
            break;
          }
          case Profile.High: {
            profile_idc_iop_string = "6400";
            break;
          }
          case Profile.PredictiveHigh444: {
            profile_idc_iop_string = "f400";
            break;
          }
          default: {
            logger.warn(`profileLevelIdToString() | unrecognized profile ${profile_level_id.profile}`);
            return void 0;
          }
        }
        let levelStr = profile_level_id.level.toString(16);
        if (levelStr.length === 1) {
          levelStr = `0${levelStr}`;
        }
        return `${profile_idc_iop_string}${levelStr}`;
      }
      function profileToString(profile) {
        switch (profile) {
          case Profile.ConstrainedBaseline: {
            return "ConstrainedBaseline";
          }
          case Profile.Baseline: {
            return "Baseline";
          }
          case Profile.Main: {
            return "Main";
          }
          case Profile.ConstrainedHigh: {
            return "ConstrainedHigh";
          }
          case Profile.High: {
            return "High";
          }
          case Profile.PredictiveHigh444: {
            return "PredictiveHigh444";
          }
          default: {
            logger.warn(`profileToString() | unrecognized profile ${profile}`);
            return void 0;
          }
        }
      }
      function levelToString(level) {
        switch (level) {
          case Level.L1_b: {
            return "1b";
          }
          case Level.L1: {
            return "1";
          }
          case Level.L1_1: {
            return "1.1";
          }
          case Level.L1_2: {
            return "1.2";
          }
          case Level.L1_3: {
            return "1.3";
          }
          case Level.L2: {
            return "2";
          }
          case Level.L2_1: {
            return "2.1";
          }
          case Level.L2_2: {
            return "2.2";
          }
          case Level.L3: {
            return "3";
          }
          case Level.L3_1: {
            return "3.1";
          }
          case Level.L3_2: {
            return "3.2";
          }
          case Level.L4: {
            return "4";
          }
          case Level.L4_1: {
            return "4.1";
          }
          case Level.L4_2: {
            return "4.2";
          }
          case Level.L5: {
            return "5";
          }
          case Level.L5_1: {
            return "5.1";
          }
          case Level.L5_2: {
            return "5.2";
          }
          default: {
            logger.warn(`levelToString() | unrecognized level ${level}`);
            return void 0;
          }
        }
      }
      function parseSdpProfileLevelId(params = {}) {
        const profile_level_id = params["profile-level-id"];
        return profile_level_id ? parseProfileLevelId(profile_level_id) : DefaultProfileLevelId;
      }
      function isSameProfile(params1 = {}, params2 = {}) {
        const profile_level_id_1 = parseSdpProfileLevelId(params1);
        const profile_level_id_2 = parseSdpProfileLevelId(params2);
        return Boolean(profile_level_id_1 && profile_level_id_2 && profile_level_id_1.profile === profile_level_id_2.profile);
      }
      function isSameProfileAndLevel(params1 = {}, params2 = {}) {
        const profile_level_id_1 = parseSdpProfileLevelId(params1);
        const profile_level_id_2 = parseSdpProfileLevelId(params2);
        return Boolean(profile_level_id_1 && profile_level_id_2 && profile_level_id_1.profile === profile_level_id_2.profile && profile_level_id_1.level == profile_level_id_2.level);
      }
      function generateProfileLevelIdStringForAnswer(local_supported_params = {}, remote_offered_params = {}) {
        if (!local_supported_params["profile-level-id"] && !remote_offered_params["profile-level-id"]) {
          logger.warn("generateProfileLevelIdStringForAnswer() | profile-level-id missing in local and remote params");
          return void 0;
        }
        const local_profile_level_id = parseSdpProfileLevelId(local_supported_params);
        const remote_profile_level_id = parseSdpProfileLevelId(remote_offered_params);
        if (!local_profile_level_id) {
          throw new TypeError("invalid local_profile_level_id");
        }
        if (!remote_profile_level_id) {
          throw new TypeError("invalid remote_profile_level_id");
        }
        if (local_profile_level_id.profile !== remote_profile_level_id.profile) {
          throw new TypeError("H264 Profile mismatch");
        }
        const level_asymmetry_allowed = isLevelAsymmetryAllowed(local_supported_params) && isLevelAsymmetryAllowed(remote_offered_params);
        const local_level = local_profile_level_id.level;
        const remote_level = remote_profile_level_id.level;
        const min_level = minLevel(local_level, remote_level);
        const answer_level = level_asymmetry_allowed ? local_level : min_level;
        logger.debug(`generateProfileLevelIdStringForAnswer() | result [profile:${local_profile_level_id.profile}, level:${answer_level}]`);
        return profileLevelIdToString(new ProfileLevelId(local_profile_level_id.profile, answer_level));
      }
      function supportedLevel(max_frame_pixel_count, max_fps) {
        const PixelsPerMacroblock = 16 * 16;
        for (let i = LevelConstraints.length - 1; i >= 0; --i) {
          const level_constraint = LevelConstraints[i];
          if (level_constraint.max_macroblock_frame_size * PixelsPerMacroblock <= max_frame_pixel_count && level_constraint.max_macroblocks_per_second <= max_fps * level_constraint.max_macroblock_frame_size) {
            logger.debug(`supportedLevel() | result [max_frame_pixel_count:${max_frame_pixel_count}, max_fps:${max_fps}, level:${level_constraint.level}]`);
            return level_constraint.level;
          }
        }
        logger.warn(`supportedLevel() | no level supported [max_frame_pixel_count:${max_frame_pixel_count}, max_fps:${max_fps}]`);
        return void 0;
      }
      function byteMaskString(c, str) {
        return Number(str[0] === c) << 7 | Number(str[1] === c) << 6 | Number(str[2] === c) << 5 | Number(str[3] === c) << 4 | Number(str[4] === c) << 3 | Number(str[5] === c) << 2 | Number(str[6] === c) << 1 | Number(str[7] === c) << 0;
      }
      function isLessLevel(a, b) {
        if (a === Level.L1_b) {
          return b !== Level.L1 && b !== Level.L1_b;
        }
        if (b === Level.L1_b) {
          return a !== Level.L1;
        }
        return a < b;
      }
      function minLevel(a, b) {
        return isLessLevel(a, b) ? a : b;
      }
      function isLevelAsymmetryAllowed(params = {}) {
        const level_asymmetry_allowed = params["level-asymmetry-allowed"];
        return level_asymmetry_allowed === true || level_asymmetry_allowed === 1 || level_asymmetry_allowed === "1";
      }
    }
  });

  // node_modules/mediasoup-client/lib/ortc.js
  var require_ortc = __commonJS({
    "node_modules/mediasoup-client/lib/ortc.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.validateAndNormalizeRtpCapabilities = validateAndNormalizeRtpCapabilities;
      exports.validateAndNormalizeRtpParameters = validateAndNormalizeRtpParameters;
      exports.validateAndNormalizeSctpStreamParameters = validateAndNormalizeSctpStreamParameters;
      exports.validateSctpCapabilities = validateSctpCapabilities;
      exports.getExtendedRtpCapabilities = getExtendedRtpCapabilities;
      exports.getRecvRtpCapabilities = getRecvRtpCapabilities;
      exports.getSendRtpCapabilities = getSendRtpCapabilities;
      exports.getSendingRtpParameters = getSendingRtpParameters;
      exports.getSendingRemoteRtpParameters = getSendingRemoteRtpParameters;
      exports.reduceCodecs = reduceCodecs;
      exports.generateProbatorRtpParameters = generateProbatorRtpParameters;
      exports.canSend = canSend;
      exports.canReceive = canReceive;
      var h264 = require_lib();
      var utils = require_utils();
      var RTP_PROBATOR_MID = "probator";
      var RTP_PROBATOR_SSRC = 1234;
      var RTP_PROBATOR_CODEC_PAYLOAD_TYPE = 127;
      function validateAndNormalizeRtpCapabilities(caps) {
        if (typeof caps !== "object") {
          throw new TypeError("caps is not an object");
        }
        if (caps.codecs && !Array.isArray(caps.codecs)) {
          throw new TypeError("caps.codecs is not an array");
        } else if (!caps.codecs) {
          caps.codecs = [];
        }
        for (const codec of caps.codecs) {
          validateAndNormalizeRtpCodecCapability(codec);
        }
        if (caps.headerExtensions && !Array.isArray(caps.headerExtensions)) {
          throw new TypeError("caps.headerExtensions is not an array");
        } else if (!caps.headerExtensions) {
          caps.headerExtensions = [];
        }
        for (const ext of caps.headerExtensions) {
          validateAndNormalizeRtpHeaderExtension(ext);
        }
      }
      function validateAndNormalizeRtpParameters(params) {
        if (typeof params !== "object") {
          throw new TypeError("params is not an object");
        }
        if (params.mid && typeof params.mid !== "string") {
          throw new TypeError("params.mid is not a string");
        }
        if (!Array.isArray(params.codecs)) {
          throw new TypeError("missing params.codecs");
        }
        for (const codec of params.codecs) {
          validateAndNormalizeRtpCodecParameters(codec);
        }
        if (params.headerExtensions && !Array.isArray(params.headerExtensions)) {
          throw new TypeError("params.headerExtensions is not an array");
        } else if (!params.headerExtensions) {
          params.headerExtensions = [];
        }
        for (const ext of params.headerExtensions) {
          validateRtpHeaderExtensionParameters(ext);
        }
        if (params.encodings && !Array.isArray(params.encodings)) {
          throw new TypeError("params.encodings is not an array");
        } else if (!params.encodings) {
          params.encodings = [];
        }
        for (const encoding of params.encodings) {
          validateAndNormalizeRtpEncodingParameters(encoding);
        }
        if (params.rtcp && typeof params.rtcp !== "object") {
          throw new TypeError("params.rtcp is not an object");
        } else if (!params.rtcp) {
          params.rtcp = {};
        }
        validateAndNormalizeRtcpParameters(params.rtcp);
      }
      function validateAndNormalizeSctpStreamParameters(params) {
        if (typeof params !== "object") {
          throw new TypeError("params is not an object");
        }
        if (typeof params.streamId !== "number") {
          throw new TypeError("missing params.streamId");
        }
        let orderedGiven = false;
        if (typeof params.ordered === "boolean") {
          orderedGiven = true;
        } else {
          params.ordered = true;
        }
        if (params.maxPacketLifeTime && typeof params.maxPacketLifeTime !== "number") {
          throw new TypeError("invalid params.maxPacketLifeTime");
        }
        if (params.maxRetransmits && typeof params.maxRetransmits !== "number") {
          throw new TypeError("invalid params.maxRetransmits");
        }
        if (params.maxPacketLifeTime && params.maxRetransmits) {
          throw new TypeError("cannot provide both maxPacketLifeTime and maxRetransmits");
        }
        if (orderedGiven && params.ordered && (params.maxPacketLifeTime || params.maxRetransmits)) {
          throw new TypeError("cannot be ordered with maxPacketLifeTime or maxRetransmits");
        } else if (!orderedGiven && (params.maxPacketLifeTime || params.maxRetransmits)) {
          params.ordered = false;
        }
        if (params.label && typeof params.label !== "string") {
          throw new TypeError("invalid params.label");
        }
        if (params.protocol && typeof params.protocol !== "string") {
          throw new TypeError("invalid params.protocol");
        }
      }
      function validateSctpCapabilities(caps) {
        if (typeof caps !== "object") {
          throw new TypeError("caps is not an object");
        }
        if (!caps.numStreams || typeof caps.numStreams !== "object") {
          throw new TypeError("missing caps.numStreams");
        }
        validateNumSctpStreams(caps.numStreams);
      }
      function getExtendedRtpCapabilities(localCaps, remoteCaps, preferLocalCodecsOrder) {
        const extendedRtpCapabilities = {
          codecs: [],
          headerExtensions: []
        };
        if (preferLocalCodecsOrder) {
          for (const localCodec of localCaps.codecs ?? []) {
            if (isRtxCodec(localCodec)) {
              continue;
            }
            const matchingRemoteCodec = (remoteCaps.codecs ?? []).find((remoteCodec) => matchCodecs(remoteCodec, localCodec, { strict: true, modify: true }));
            if (!matchingRemoteCodec) {
              continue;
            }
            const extendedCodec = {
              kind: localCodec.kind,
              mimeType: localCodec.mimeType,
              clockRate: localCodec.clockRate,
              channels: localCodec.channels,
              localPayloadType: localCodec.preferredPayloadType,
              localRtxPayloadType: void 0,
              remotePayloadType: matchingRemoteCodec.preferredPayloadType,
              remoteRtxPayloadType: void 0,
              localParameters: localCodec.parameters ?? {},
              remoteParameters: matchingRemoteCodec.parameters ?? {},
              rtcpFeedback: reduceRtcpFeedback(localCodec, matchingRemoteCodec)
            };
            extendedRtpCapabilities.codecs.push(extendedCodec);
          }
        } else {
          for (const remoteCodec of remoteCaps.codecs ?? []) {
            if (isRtxCodec(remoteCodec)) {
              continue;
            }
            const matchingLocalCodec = (localCaps.codecs ?? []).find((localCodec) => matchCodecs(localCodec, remoteCodec, { strict: true, modify: true }));
            if (!matchingLocalCodec) {
              continue;
            }
            const extendedCodec = {
              kind: matchingLocalCodec.kind,
              mimeType: matchingLocalCodec.mimeType,
              clockRate: matchingLocalCodec.clockRate,
              channels: matchingLocalCodec.channels,
              localPayloadType: matchingLocalCodec.preferredPayloadType,
              localRtxPayloadType: void 0,
              remotePayloadType: remoteCodec.preferredPayloadType,
              remoteRtxPayloadType: void 0,
              localParameters: matchingLocalCodec.parameters ?? {},
              remoteParameters: remoteCodec.parameters ?? {},
              rtcpFeedback: reduceRtcpFeedback(matchingLocalCodec, remoteCodec)
            };
            extendedRtpCapabilities.codecs.push(extendedCodec);
          }
        }
        for (const extendedCodec of extendedRtpCapabilities.codecs) {
          const matchingLocalRtxCodec = localCaps.codecs.find((localCodec) => {
            var _a47;
            return isRtxCodec(localCodec) && ((_a47 = localCodec.parameters) == null ? void 0 : _a47["apt"]) === extendedCodec.localPayloadType;
          });
          const matchingRemoteRtxCodec = remoteCaps.codecs.find((remoteCodec) => {
            var _a47;
            return isRtxCodec(remoteCodec) && ((_a47 = remoteCodec.parameters) == null ? void 0 : _a47["apt"]) === extendedCodec.remotePayloadType;
          });
          if (matchingLocalRtxCodec && matchingRemoteRtxCodec) {
            extendedCodec.localRtxPayloadType = matchingLocalRtxCodec.preferredPayloadType;
            extendedCodec.remoteRtxPayloadType = matchingRemoteRtxCodec.preferredPayloadType;
          }
        }
        for (const remoteExt of remoteCaps.headerExtensions) {
          const matchingLocalExt = localCaps.headerExtensions.find((localExt) => matchHeaderExtensions(localExt, remoteExt));
          if (!matchingLocalExt) {
            continue;
          }
          const extendedExt = {
            kind: remoteExt.kind,
            uri: remoteExt.uri,
            sendId: matchingLocalExt.preferredId,
            recvId: remoteExt.preferredId,
            encrypt: matchingLocalExt.preferredEncrypt ?? false,
            direction: "sendrecv"
          };
          switch (remoteExt.direction) {
            case "sendrecv": {
              extendedExt.direction = "sendrecv";
              break;
            }
            case "recvonly": {
              extendedExt.direction = "sendonly";
              break;
            }
            case "sendonly": {
              extendedExt.direction = "recvonly";
              break;
            }
            case "inactive": {
              extendedExt.direction = "inactive";
              break;
            }
          }
          extendedRtpCapabilities.headerExtensions.push(extendedExt);
        }
        return extendedRtpCapabilities;
      }
      function getRecvRtpCapabilities(extendedRtpCapabilities) {
        return getRtpCapabilities({ direction: "recvonly", extendedRtpCapabilities });
      }
      function getSendRtpCapabilities(extendedRtpCapabilities) {
        return getRtpCapabilities({ direction: "sendonly", extendedRtpCapabilities });
      }
      function getSendingRtpParameters(kind, extendedRtpCapabilities) {
        const rtpParameters = {
          mid: void 0,
          codecs: [],
          headerExtensions: [],
          encodings: [],
          rtcp: {}
        };
        for (const extendedCodec of extendedRtpCapabilities.codecs) {
          if (extendedCodec.kind !== kind) {
            continue;
          }
          const codec = {
            mimeType: extendedCodec.mimeType,
            payloadType: extendedCodec.localPayloadType,
            clockRate: extendedCodec.clockRate,
            channels: extendedCodec.channels,
            parameters: extendedCodec.localParameters,
            rtcpFeedback: extendedCodec.rtcpFeedback
          };
          rtpParameters.codecs.push(codec);
          if (extendedCodec.localRtxPayloadType) {
            const rtxCodec = {
              mimeType: `${extendedCodec.kind}/rtx`,
              payloadType: extendedCodec.localRtxPayloadType,
              clockRate: extendedCodec.clockRate,
              parameters: {
                apt: extendedCodec.localPayloadType
              },
              rtcpFeedback: []
            };
            rtpParameters.codecs.push(rtxCodec);
          }
        }
        for (const extendedExtension of extendedRtpCapabilities.headerExtensions) {
          if (extendedExtension.kind && extendedExtension.kind !== kind || extendedExtension.direction !== "sendrecv" && extendedExtension.direction !== "sendonly") {
            continue;
          }
          const ext = {
            uri: extendedExtension.uri,
            id: extendedExtension.sendId,
            encrypt: extendedExtension.encrypt,
            parameters: {}
          };
          rtpParameters.headerExtensions.push(ext);
        }
        return rtpParameters;
      }
      function getSendingRemoteRtpParameters(kind, extendedRtpCapabilities) {
        const rtpParameters = {
          mid: void 0,
          codecs: [],
          headerExtensions: [],
          encodings: [],
          rtcp: {}
        };
        for (const extendedCodec of extendedRtpCapabilities.codecs) {
          if (extendedCodec.kind !== kind) {
            continue;
          }
          const codec = {
            mimeType: extendedCodec.mimeType,
            payloadType: extendedCodec.localPayloadType,
            clockRate: extendedCodec.clockRate,
            channels: extendedCodec.channels,
            parameters: extendedCodec.remoteParameters,
            rtcpFeedback: extendedCodec.rtcpFeedback
          };
          rtpParameters.codecs.push(codec);
          if (extendedCodec.localRtxPayloadType) {
            const rtxCodec = {
              mimeType: `${extendedCodec.kind}/rtx`,
              payloadType: extendedCodec.localRtxPayloadType,
              clockRate: extendedCodec.clockRate,
              parameters: {
                apt: extendedCodec.localPayloadType
              },
              rtcpFeedback: []
            };
            rtpParameters.codecs.push(rtxCodec);
          }
        }
        for (const extendedExtension of extendedRtpCapabilities.headerExtensions) {
          if (extendedExtension.kind && extendedExtension.kind !== kind || extendedExtension.direction !== "sendrecv" && extendedExtension.direction !== "sendonly") {
            continue;
          }
          const ext = {
            uri: extendedExtension.uri,
            id: extendedExtension.sendId,
            encrypt: extendedExtension.encrypt,
            parameters: {}
          };
          rtpParameters.headerExtensions.push(ext);
        }
        if (rtpParameters.headerExtensions.some((ext) => ext.uri === "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01")) {
          for (const codec of rtpParameters.codecs) {
            codec.rtcpFeedback = (codec.rtcpFeedback ?? []).filter((fb) => fb.type !== "goog-remb");
          }
        } else if (rtpParameters.headerExtensions.some((ext) => ext.uri === "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time")) {
          for (const codec of rtpParameters.codecs) {
            codec.rtcpFeedback = (codec.rtcpFeedback ?? []).filter((fb) => fb.type !== "transport-cc");
          }
        } else {
          for (const codec of rtpParameters.codecs) {
            codec.rtcpFeedback = (codec.rtcpFeedback ?? []).filter((fb) => fb.type !== "transport-cc" && fb.type !== "goog-remb");
          }
        }
        return rtpParameters;
      }
      function reduceCodecs(codecs, capCodec) {
        const filteredCodecs = [];
        if (!capCodec) {
          filteredCodecs.push(codecs[0]);
          if (isRtxCodec(codecs[1])) {
            filteredCodecs.push(codecs[1]);
          }
        } else {
          for (let idx = 0; idx < codecs.length; ++idx) {
            if (matchCodecs(codecs[idx], capCodec, { strict: true })) {
              filteredCodecs.push(codecs[idx]);
              if (isRtxCodec(codecs[idx + 1])) {
                filteredCodecs.push(codecs[idx + 1]);
              }
              break;
            }
          }
          if (filteredCodecs.length === 0) {
            throw new TypeError("no matching codec found");
          }
        }
        return filteredCodecs;
      }
      function generateProbatorRtpParameters(videoRtpParameters) {
        videoRtpParameters = utils.clone(videoRtpParameters);
        validateAndNormalizeRtpParameters(videoRtpParameters);
        const rtpParameters = {
          mid: RTP_PROBATOR_MID,
          codecs: [],
          headerExtensions: [],
          encodings: [{ ssrc: RTP_PROBATOR_SSRC }],
          rtcp: { cname: "probator" }
        };
        rtpParameters.codecs.push(videoRtpParameters.codecs[0]);
        rtpParameters.codecs[0].payloadType = RTP_PROBATOR_CODEC_PAYLOAD_TYPE;
        rtpParameters.headerExtensions = videoRtpParameters.headerExtensions;
        return rtpParameters;
      }
      function canSend(kind, rtpCapabilities) {
        return (rtpCapabilities.codecs ?? []).some((codec) => codec.kind === kind);
      }
      function canReceive(rtpParameters, rtpCapabilities) {
        validateAndNormalizeRtpParameters(rtpParameters);
        if (rtpParameters.codecs.length === 0) {
          return false;
        }
        const firstMediaCodec = rtpParameters.codecs[0];
        return (rtpCapabilities.codecs ?? []).some((codec) => codec.preferredPayloadType === firstMediaCodec.payloadType);
      }
      function validateAndNormalizeRtpCodecCapability(codec) {
        const MimeTypeRegex = new RegExp("^(audio|video)/(.+)", "i");
        if (typeof codec !== "object") {
          throw new TypeError("codec is not an object");
        }
        if (!codec.mimeType || typeof codec.mimeType !== "string") {
          throw new TypeError("missing codec.mimeType");
        }
        const mimeTypeMatch = MimeTypeRegex.exec(codec.mimeType);
        if (!mimeTypeMatch) {
          throw new TypeError("invalid codec.mimeType");
        }
        codec.kind = mimeTypeMatch[1].toLowerCase();
        if (typeof codec.preferredPayloadType !== "number") {
          throw new TypeError("missing codec.preferredPayloadType");
        }
        if (typeof codec.clockRate !== "number") {
          throw new TypeError("missing codec.clockRate");
        }
        if (codec.kind === "audio") {
          if (typeof codec.channels !== "number") {
            codec.channels = 1;
          }
        } else {
          delete codec.channels;
        }
        if (!codec.parameters || typeof codec.parameters !== "object") {
          codec.parameters = {};
        }
        for (const key of Object.keys(codec.parameters)) {
          let value = codec.parameters[key];
          if (value === void 0) {
            codec.parameters[key] = "";
            value = "";
          }
          if (typeof value !== "string" && typeof value !== "number") {
            throw new TypeError(`invalid codec parameter [key:${key}s, value:${value}]`);
          }
          if (key === "apt") {
            if (typeof value !== "number") {
              throw new TypeError("invalid codec apt parameter");
            }
          }
        }
        if (!codec.rtcpFeedback || !Array.isArray(codec.rtcpFeedback)) {
          codec.rtcpFeedback = [];
        }
        for (const fb of codec.rtcpFeedback) {
          validateAndNormalizeRtcpFeedback(fb);
        }
      }
      function validateAndNormalizeRtcpFeedback(fb) {
        if (typeof fb !== "object") {
          throw new TypeError("fb is not an object");
        }
        if (!fb.type || typeof fb.type !== "string") {
          throw new TypeError("missing fb.type");
        }
        if (!fb.parameter || typeof fb.parameter !== "string") {
          fb.parameter = "";
        }
      }
      function validateAndNormalizeRtpHeaderExtension(ext) {
        if (typeof ext !== "object") {
          throw new TypeError("ext is not an object");
        }
        if (ext.kind !== "audio" && ext.kind !== "video") {
          throw new TypeError("invalid ext.kind");
        }
        if (!ext.uri || typeof ext.uri !== "string") {
          throw new TypeError("missing ext.uri");
        }
        if (typeof ext.preferredId !== "number") {
          throw new TypeError("missing ext.preferredId");
        }
        if (ext.preferredEncrypt && typeof ext.preferredEncrypt !== "boolean") {
          throw new TypeError("invalid ext.preferredEncrypt");
        } else if (!ext.preferredEncrypt) {
          ext.preferredEncrypt = false;
        }
        if (ext.direction && typeof ext.direction !== "string") {
          throw new TypeError("invalid ext.direction");
        } else if (!ext.direction) {
          ext.direction = "sendrecv";
        }
      }
      function validateAndNormalizeRtpCodecParameters(codec) {
        const MimeTypeRegex = new RegExp("^(audio|video)/(.+)", "i");
        if (typeof codec !== "object") {
          throw new TypeError("codec is not an object");
        }
        if (!codec.mimeType || typeof codec.mimeType !== "string") {
          throw new TypeError("missing codec.mimeType");
        }
        const mimeTypeMatch = MimeTypeRegex.exec(codec.mimeType);
        if (!mimeTypeMatch) {
          throw new TypeError("invalid codec.mimeType");
        }
        if (typeof codec.payloadType !== "number") {
          throw new TypeError("missing codec.payloadType");
        }
        if (typeof codec.clockRate !== "number") {
          throw new TypeError("missing codec.clockRate");
        }
        const kind = mimeTypeMatch[1].toLowerCase();
        if (kind === "audio") {
          if (typeof codec.channels !== "number") {
            codec.channels = 1;
          }
        } else {
          delete codec.channels;
        }
        if (!codec.parameters || typeof codec.parameters !== "object") {
          codec.parameters = {};
        }
        for (const key of Object.keys(codec.parameters)) {
          let value = codec.parameters[key];
          if (value === void 0) {
            codec.parameters[key] = "";
            value = "";
          }
          if (typeof value !== "string" && typeof value !== "number") {
            throw new TypeError(`invalid codec parameter [key:${key}s, value:${value}]`);
          }
          if (key === "apt") {
            if (typeof value !== "number") {
              throw new TypeError("invalid codec apt parameter");
            }
          }
        }
        if (!codec.rtcpFeedback || !Array.isArray(codec.rtcpFeedback)) {
          codec.rtcpFeedback = [];
        }
        for (const fb of codec.rtcpFeedback) {
          validateAndNormalizeRtcpFeedback(fb);
        }
      }
      function validateRtpHeaderExtensionParameters(ext) {
        if (typeof ext !== "object") {
          throw new TypeError("ext is not an object");
        }
        if (!ext.uri || typeof ext.uri !== "string") {
          throw new TypeError("missing ext.uri");
        }
        if (typeof ext.id !== "number") {
          throw new TypeError("missing ext.id");
        }
        if (ext.encrypt && typeof ext.encrypt !== "boolean") {
          throw new TypeError("invalid ext.encrypt");
        } else if (!ext.encrypt) {
          ext.encrypt = false;
        }
        if (!ext.parameters || typeof ext.parameters !== "object") {
          ext.parameters = {};
        }
        for (const key of Object.keys(ext.parameters)) {
          let value = ext.parameters[key];
          if (value === void 0) {
            ext.parameters[key] = "";
            value = "";
          }
          if (typeof value !== "string" && typeof value !== "number") {
            throw new TypeError("invalid header extension parameter");
          }
        }
      }
      function validateAndNormalizeRtpEncodingParameters(encoding) {
        if (typeof encoding !== "object") {
          throw new TypeError("encoding is not an object");
        }
        if (encoding.ssrc && typeof encoding.ssrc !== "number") {
          throw new TypeError("invalid encoding.ssrc");
        }
        if (encoding.rid && typeof encoding.rid !== "string") {
          throw new TypeError("invalid encoding.rid");
        }
        if (encoding.rtx && typeof encoding.rtx !== "object") {
          throw new TypeError("invalid encoding.rtx");
        } else if (encoding.rtx) {
          if (typeof encoding.rtx.ssrc !== "number") {
            throw new TypeError("missing encoding.rtx.ssrc");
          }
        }
        if (!encoding.dtx || typeof encoding.dtx !== "boolean") {
          encoding.dtx = false;
        }
        if (encoding.scalabilityMode && typeof encoding.scalabilityMode !== "string") {
          throw new TypeError("invalid encoding.scalabilityMode");
        }
      }
      function validateAndNormalizeRtcpParameters(rtcp) {
        if (typeof rtcp !== "object") {
          throw new TypeError("rtcp is not an object");
        }
        if (rtcp.cname && typeof rtcp.cname !== "string") {
          throw new TypeError("invalid rtcp.cname");
        }
        if (!rtcp.reducedSize || typeof rtcp.reducedSize !== "boolean") {
          rtcp.reducedSize = true;
        }
      }
      function validateNumSctpStreams(numStreams) {
        if (typeof numStreams !== "object") {
          throw new TypeError("numStreams is not an object");
        }
        if (typeof numStreams.OS !== "number") {
          throw new TypeError("missing numStreams.OS");
        }
        if (typeof numStreams.MIS !== "number") {
          throw new TypeError("missing numStreams.MIS");
        }
      }
      function getRtpCapabilities({ direction, extendedRtpCapabilities }) {
        const rtpCapabilities = {
          codecs: [],
          headerExtensions: []
        };
        for (const extendedCodec of extendedRtpCapabilities.codecs) {
          const codec = {
            kind: extendedCodec.kind,
            mimeType: extendedCodec.mimeType,
            preferredPayloadType: extendedCodec.remotePayloadType,
            clockRate: extendedCodec.clockRate,
            channels: extendedCodec.channels,
            parameters: extendedCodec.localParameters,
            rtcpFeedback: extendedCodec.rtcpFeedback
          };
          rtpCapabilities.codecs.push(codec);
          if (!extendedCodec.remoteRtxPayloadType) {
            continue;
          }
          const rtxCodec = {
            kind: extendedCodec.kind,
            mimeType: `${extendedCodec.kind}/rtx`,
            preferredPayloadType: extendedCodec.remoteRtxPayloadType,
            clockRate: extendedCodec.clockRate,
            parameters: {
              apt: extendedCodec.remotePayloadType
            },
            rtcpFeedback: []
          };
          rtpCapabilities.codecs.push(rtxCodec);
        }
        for (const extendedExtension of extendedRtpCapabilities.headerExtensions) {
          if (extendedExtension.direction !== "sendrecv" && extendedExtension.direction !== direction) {
            continue;
          }
          const ext = {
            kind: extendedExtension.kind,
            uri: extendedExtension.uri,
            preferredId: extendedExtension.recvId,
            preferredEncrypt: extendedExtension.encrypt ?? false,
            direction: extendedExtension.direction
          };
          rtpCapabilities.headerExtensions.push(ext);
        }
        return rtpCapabilities;
      }
      function isRtxCodec(codec) {
        if (!codec) {
          return false;
        }
        return /.+\/rtx$/i.test(codec.mimeType);
      }
      function matchCodecs(aCodec, bCodec, { strict = false, modify = false } = {}) {
        const aMimeType = aCodec.mimeType.toLowerCase();
        const bMimeType = bCodec.mimeType.toLowerCase();
        if (aMimeType !== bMimeType) {
          return false;
        }
        if (aCodec.clockRate !== bCodec.clockRate) {
          return false;
        }
        if (aCodec.channels !== bCodec.channels) {
          return false;
        }
        switch (aMimeType) {
          case "video/h264": {
            if (strict) {
              const aPacketizationMode = aCodec.parameters["packetization-mode"] ?? 0;
              const bPacketizationMode = bCodec.parameters["packetization-mode"] ?? 0;
              if (aPacketizationMode !== bPacketizationMode) {
                return false;
              }
              if (!h264.isSameProfile(aCodec.parameters, bCodec.parameters)) {
                return false;
              }
              let selectedProfileLevelId;
              try {
                selectedProfileLevelId = h264.generateProfileLevelIdStringForAnswer(aCodec.parameters, bCodec.parameters);
              } catch (error) {
                return false;
              }
              if (modify) {
                if (selectedProfileLevelId) {
                  aCodec.parameters["profile-level-id"] = selectedProfileLevelId;
                  bCodec.parameters["profile-level-id"] = selectedProfileLevelId;
                } else {
                  delete aCodec.parameters["profile-level-id"];
                  delete bCodec.parameters["profile-level-id"];
                }
              }
            }
            break;
          }
          case "video/vp9": {
            if (strict) {
              const aProfileId = aCodec.parameters["profile-id"] ?? 0;
              const bProfileId = bCodec.parameters["profile-id"] ?? 0;
              if (aProfileId !== bProfileId) {
                return false;
              }
            }
            break;
          }
        }
        return true;
      }
      function matchHeaderExtensions(aExt, bExt) {
        if (aExt.kind && bExt.kind && aExt.kind !== bExt.kind) {
          return false;
        }
        if (aExt.uri !== bExt.uri) {
          return false;
        }
        return true;
      }
      function reduceRtcpFeedback(codecA, codecB) {
        const reducedRtcpFeedback = [];
        for (const aFb of codecA.rtcpFeedback ?? []) {
          const matchingBFb = (codecB.rtcpFeedback ?? []).find((bFb) => bFb.type === aFb.type && (bFb.parameter === aFb.parameter || !bFb.parameter && !aFb.parameter));
          if (matchingBFb) {
            reducedRtcpFeedback.push(matchingBFb);
          }
        }
        return reducedRtcpFeedback;
      }
    }
  });

  // node_modules/awaitqueue/node_modules/ms/index.js
  var require_ms3 = __commonJS({
    "node_modules/awaitqueue/node_modules/ms/index.js"(exports, module) {
      var s = 1e3;
      var m = s * 60;
      var h = m * 60;
      var d = h * 24;
      var w = d * 7;
      var y = d * 365.25;
      module.exports = function(val, options) {
        options = options || {};
        var type = typeof val;
        if (type === "string" && val.length > 0) {
          return parse(val);
        } else if (type === "number" && isFinite(val)) {
          return options.long ? fmtLong(val) : fmtShort(val);
        }
        throw new Error(
          "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
        );
      };
      function parse(str) {
        str = String(str);
        if (str.length > 100) {
          return;
        }
        var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
          str
        );
        if (!match) {
          return;
        }
        var n = parseFloat(match[1]);
        var type = (match[2] || "ms").toLowerCase();
        switch (type) {
          case "years":
          case "year":
          case "yrs":
          case "yr":
          case "y":
            return n * y;
          case "weeks":
          case "week":
          case "w":
            return n * w;
          case "days":
          case "day":
          case "d":
            return n * d;
          case "hours":
          case "hour":
          case "hrs":
          case "hr":
          case "h":
            return n * h;
          case "minutes":
          case "minute":
          case "mins":
          case "min":
          case "m":
            return n * m;
          case "seconds":
          case "second":
          case "secs":
          case "sec":
          case "s":
            return n * s;
          case "milliseconds":
          case "millisecond":
          case "msecs":
          case "msec":
          case "ms":
            return n;
          default:
            return void 0;
        }
      }
      function fmtShort(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return Math.round(ms / d) + "d";
        }
        if (msAbs >= h) {
          return Math.round(ms / h) + "h";
        }
        if (msAbs >= m) {
          return Math.round(ms / m) + "m";
        }
        if (msAbs >= s) {
          return Math.round(ms / s) + "s";
        }
        return ms + "ms";
      }
      function fmtLong(ms) {
        var msAbs = Math.abs(ms);
        if (msAbs >= d) {
          return plural(ms, msAbs, d, "day");
        }
        if (msAbs >= h) {
          return plural(ms, msAbs, h, "hour");
        }
        if (msAbs >= m) {
          return plural(ms, msAbs, m, "minute");
        }
        if (msAbs >= s) {
          return plural(ms, msAbs, s, "second");
        }
        return ms + " ms";
      }
      function plural(ms, msAbs, n, name) {
        var isPlural = msAbs >= n * 1.5;
        return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
      }
    }
  });

  // node_modules/awaitqueue/node_modules/debug/src/common.js
  var require_common3 = __commonJS({
    "node_modules/awaitqueue/node_modules/debug/src/common.js"(exports, module) {
      function setup(env) {
        createDebug.debug = createDebug;
        createDebug.default = createDebug;
        createDebug.coerce = coerce;
        createDebug.disable = disable;
        createDebug.enable = enable;
        createDebug.enabled = enabled;
        createDebug.humanize = require_ms3();
        createDebug.destroy = destroy;
        Object.keys(env).forEach((key) => {
          createDebug[key] = env[key];
        });
        createDebug.names = [];
        createDebug.skips = [];
        createDebug.formatters = {};
        function selectColor(namespace) {
          let hash = 0;
          for (let i = 0; i < namespace.length; i++) {
            hash = (hash << 5) - hash + namespace.charCodeAt(i);
            hash |= 0;
          }
          return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
        }
        createDebug.selectColor = selectColor;
        function createDebug(namespace) {
          let prevTime;
          let enableOverride = null;
          let namespacesCache;
          let enabledCache;
          function debug(...args) {
            if (!debug.enabled) {
              return;
            }
            const self = debug;
            const curr = Number(/* @__PURE__ */ new Date());
            const ms = curr - (prevTime || curr);
            self.diff = ms;
            self.prev = prevTime;
            self.curr = curr;
            prevTime = curr;
            args[0] = createDebug.coerce(args[0]);
            if (typeof args[0] !== "string") {
              args.unshift("%O");
            }
            let index = 0;
            args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
              if (match === "%%") {
                return "%";
              }
              index++;
              const formatter = createDebug.formatters[format];
              if (typeof formatter === "function") {
                const val = args[index];
                match = formatter.call(self, val);
                args.splice(index, 1);
                index--;
              }
              return match;
            });
            createDebug.formatArgs.call(self, args);
            const logFn = self.log || createDebug.log;
            logFn.apply(self, args);
          }
          debug.namespace = namespace;
          debug.useColors = createDebug.useColors();
          debug.color = createDebug.selectColor(namespace);
          debug.extend = extend;
          debug.destroy = createDebug.destroy;
          Object.defineProperty(debug, "enabled", {
            enumerable: true,
            configurable: false,
            get: () => {
              if (enableOverride !== null) {
                return enableOverride;
              }
              if (namespacesCache !== createDebug.namespaces) {
                namespacesCache = createDebug.namespaces;
                enabledCache = createDebug.enabled(namespace);
              }
              return enabledCache;
            },
            set: (v) => {
              enableOverride = v;
            }
          });
          if (typeof createDebug.init === "function") {
            createDebug.init(debug);
          }
          return debug;
        }
        function extend(namespace, delimiter) {
          const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
          newDebug.log = this.log;
          return newDebug;
        }
        function enable(namespaces) {
          createDebug.save(namespaces);
          createDebug.namespaces = namespaces;
          createDebug.names = [];
          createDebug.skips = [];
          const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
          for (const ns of split) {
            if (ns[0] === "-") {
              createDebug.skips.push(ns.slice(1));
            } else {
              createDebug.names.push(ns);
            }
          }
        }
        function matchesTemplate(search, template) {
          let searchIndex = 0;
          let templateIndex = 0;
          let starIndex = -1;
          let matchIndex = 0;
          while (searchIndex < search.length) {
            if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
              if (template[templateIndex] === "*") {
                starIndex = templateIndex;
                matchIndex = searchIndex;
                templateIndex++;
              } else {
                searchIndex++;
                templateIndex++;
              }
            } else if (starIndex !== -1) {
              templateIndex = starIndex + 1;
              matchIndex++;
              searchIndex = matchIndex;
            } else {
              return false;
            }
          }
          while (templateIndex < template.length && template[templateIndex] === "*") {
            templateIndex++;
          }
          return templateIndex === template.length;
        }
        function disable() {
          const namespaces = [
            ...createDebug.names,
            ...createDebug.skips.map((namespace) => "-" + namespace)
          ].join(",");
          createDebug.enable("");
          return namespaces;
        }
        function enabled(name) {
          for (const skip of createDebug.skips) {
            if (matchesTemplate(name, skip)) {
              return false;
            }
          }
          for (const ns of createDebug.names) {
            if (matchesTemplate(name, ns)) {
              return true;
            }
          }
          return false;
        }
        function coerce(val) {
          if (val instanceof Error) {
            return val.stack || val.message;
          }
          return val;
        }
        function destroy() {
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
        createDebug.enable(createDebug.load());
        return createDebug;
      }
      module.exports = setup;
    }
  });

  // node_modules/awaitqueue/node_modules/debug/src/browser.js
  var require_browser3 = __commonJS({
    "node_modules/awaitqueue/node_modules/debug/src/browser.js"(exports, module) {
      exports.formatArgs = formatArgs;
      exports.save = save;
      exports.load = load;
      exports.useColors = useColors;
      exports.storage = localstorage();
      exports.destroy = /* @__PURE__ */ (() => {
        let warned = false;
        return () => {
          if (!warned) {
            warned = true;
            console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
          }
        };
      })();
      exports.colors = [
        "#0000CC",
        "#0000FF",
        "#0033CC",
        "#0033FF",
        "#0066CC",
        "#0066FF",
        "#0099CC",
        "#0099FF",
        "#00CC00",
        "#00CC33",
        "#00CC66",
        "#00CC99",
        "#00CCCC",
        "#00CCFF",
        "#3300CC",
        "#3300FF",
        "#3333CC",
        "#3333FF",
        "#3366CC",
        "#3366FF",
        "#3399CC",
        "#3399FF",
        "#33CC00",
        "#33CC33",
        "#33CC66",
        "#33CC99",
        "#33CCCC",
        "#33CCFF",
        "#6600CC",
        "#6600FF",
        "#6633CC",
        "#6633FF",
        "#66CC00",
        "#66CC33",
        "#9900CC",
        "#9900FF",
        "#9933CC",
        "#9933FF",
        "#99CC00",
        "#99CC33",
        "#CC0000",
        "#CC0033",
        "#CC0066",
        "#CC0099",
        "#CC00CC",
        "#CC00FF",
        "#CC3300",
        "#CC3333",
        "#CC3366",
        "#CC3399",
        "#CC33CC",
        "#CC33FF",
        "#CC6600",
        "#CC6633",
        "#CC9900",
        "#CC9933",
        "#CCCC00",
        "#CCCC33",
        "#FF0000",
        "#FF0033",
        "#FF0066",
        "#FF0099",
        "#FF00CC",
        "#FF00FF",
        "#FF3300",
        "#FF3333",
        "#FF3366",
        "#FF3399",
        "#FF33CC",
        "#FF33FF",
        "#FF6600",
        "#FF6633",
        "#FF9900",
        "#FF9933",
        "#FFCC00",
        "#FFCC33"
      ];
      function useColors() {
        if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
          return true;
        }
        if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
          return false;
        }
        let m;
        return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
        typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
        // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
        typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
        typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
      }
      function formatArgs(args) {
        args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module.exports.humanize(this.diff);
        if (!this.useColors) {
          return;
        }
        const c = "color: " + this.color;
        args.splice(1, 0, c, "color: inherit");
        let index = 0;
        let lastC = 0;
        args[0].replace(/%[a-zA-Z%]/g, (match) => {
          if (match === "%%") {
            return;
          }
          index++;
          if (match === "%c") {
            lastC = index;
          }
        });
        args.splice(lastC, 0, c);
      }
      exports.log = console.debug || console.log || (() => {
      });
      function save(namespaces) {
        try {
          if (namespaces) {
            exports.storage.setItem("debug", namespaces);
          } else {
            exports.storage.removeItem("debug");
          }
        } catch (error) {
        }
      }
      function load() {
        let r;
        try {
          r = exports.storage.getItem("debug") || exports.storage.getItem("DEBUG");
        } catch (error) {
        }
        if (!r && typeof process !== "undefined" && "env" in process) {
          r = process.env.DEBUG;
        }
        return r;
      }
      function localstorage() {
        try {
          return localStorage;
        } catch (error) {
        }
      }
      module.exports = require_common3()(exports);
      var { formatters } = module.exports;
      formatters.j = function(v) {
        try {
          return JSON.stringify(v);
        } catch (error) {
          return "[UnexpectedJSONParseError]: " + error.message;
        }
      };
    }
  });

  // node_modules/awaitqueue/lib/Logger.js
  var require_Logger3 = __commonJS({
    "node_modules/awaitqueue/lib/Logger.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Logger = void 0;
      var debug = require_browser3();
      var LIB_NAME = "awaitqueue";
      var Logger = class {
        _debug;
        _warn;
        _error;
        constructor(prefix) {
          if (prefix) {
            this._debug = debug(`${LIB_NAME}:${prefix}`);
            this._warn = debug(`${LIB_NAME}:WARN:${prefix}`);
            this._error = debug(`${LIB_NAME}:ERROR:${prefix}`);
          } else {
            this._debug = debug(LIB_NAME);
            this._warn = debug(`${LIB_NAME}:WARN`);
            this._error = debug(`${LIB_NAME}:ERROR`);
          }
          this._debug.log = console.info.bind(console);
          this._warn.log = console.warn.bind(console);
          this._error.log = console.error.bind(console);
        }
        get debug() {
          return this._debug;
        }
        get warn() {
          return this._warn;
        }
        get error() {
          return this._error;
        }
      };
      exports.Logger = Logger;
    }
  });

  // node_modules/awaitqueue/lib/errors.js
  var require_errors2 = __commonJS({
    "node_modules/awaitqueue/lib/errors.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.AwaitQueueRemovedTaskError = exports.AwaitQueueStoppedError = void 0;
      var AwaitQueueStoppedError = class _AwaitQueueStoppedError extends Error {
        constructor(message) {
          super(message ?? "queue stopped");
          this.name = "AwaitQueueStoppedError";
          if (typeof Error.captureStackTrace === "function") {
            Error.captureStackTrace(this, _AwaitQueueStoppedError);
          }
        }
      };
      exports.AwaitQueueStoppedError = AwaitQueueStoppedError;
      var AwaitQueueRemovedTaskError = class _AwaitQueueRemovedTaskError extends Error {
        constructor(message) {
          super(message ?? "queue task removed");
          this.name = "AwaitQueueRemovedTaskError";
          if (typeof Error.captureStackTrace === "function") {
            Error.captureStackTrace(this, _AwaitQueueRemovedTaskError);
          }
        }
      };
      exports.AwaitQueueRemovedTaskError = AwaitQueueRemovedTaskError;
    }
  });

  // node_modules/awaitqueue/lib/AwaitQueue.js
  var require_AwaitQueue = __commonJS({
    "node_modules/awaitqueue/lib/AwaitQueue.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.AwaitQueue = void 0;
      var Logger_1 = require_Logger3();
      var errors_1 = require_errors2();
      var logger = new Logger_1.Logger("AwaitQueue");
      var AwaitQueue = class {
        // Queue of pending tasks (map of PendingTasks indexed by id).
        pendingTasks = /* @__PURE__ */ new Map();
        // Incrementing PendingTask id.
        nextTaskId = 0;
        constructor() {
          logger.debug("constructor()");
        }
        get size() {
          return this.pendingTasks.size;
        }
        async push(task, name, options) {
          name = name ?? task.name;
          logger.debug(`push() [name:${name}, options:%o]`, options);
          if (typeof task !== "function") {
            throw new TypeError("given task is not a function");
          }
          if (name) {
            try {
              Object.defineProperty(task, "name", { value: name });
            } catch (error) {
            }
          }
          return new Promise((resolve, reject) => {
            if (name && (options == null ? void 0 : options.removeOngoingTasksWithSameName)) {
              for (const pendingTask2 of this.pendingTasks.values()) {
                if (pendingTask2.name === name) {
                  pendingTask2.reject(new errors_1.AwaitQueueRemovedTaskError(), {
                    canExecuteNextTask: false
                  });
                }
              }
            }
            const pendingTask = {
              id: this.nextTaskId++,
              task,
              name,
              enqueuedAt: Date.now(),
              executedAt: void 0,
              completed: false,
              resolve: (result) => {
                if (pendingTask.completed) {
                  return;
                }
                pendingTask.completed = true;
                this.pendingTasks.delete(pendingTask.id);
                logger.debug(`resolving task [name:${pendingTask.name}]`);
                resolve(result);
                const [nextPendingTask] = this.pendingTasks.values();
                if (nextPendingTask && !nextPendingTask.executedAt) {
                  void this.execute(nextPendingTask);
                }
              },
              reject: (error, { canExecuteNextTask }) => {
                if (pendingTask.completed) {
                  return;
                }
                pendingTask.completed = true;
                this.pendingTasks.delete(pendingTask.id);
                logger.debug(`rejecting task [name:${pendingTask.name}]: %s`, String(error));
                reject(error);
                if (canExecuteNextTask) {
                  const [nextPendingTask] = this.pendingTasks.values();
                  if (nextPendingTask && !nextPendingTask.executedAt) {
                    void this.execute(nextPendingTask);
                  }
                }
              }
            };
            this.pendingTasks.set(pendingTask.id, pendingTask);
            if (this.pendingTasks.size === 1) {
              void this.execute(pendingTask);
            }
          });
        }
        stop() {
          logger.debug("stop()");
          for (const pendingTask of this.pendingTasks.values()) {
            logger.debug(`stop() | stopping task [name:${pendingTask.name}]`);
            pendingTask.reject(new errors_1.AwaitQueueStoppedError(), {
              canExecuteNextTask: false
            });
          }
        }
        remove(taskIdx) {
          logger.debug(`remove() [taskIdx:${taskIdx}]`);
          const pendingTask = Array.from(this.pendingTasks.values())[taskIdx];
          if (!pendingTask) {
            logger.debug(`stop() | no task with given idx [taskIdx:${taskIdx}]`);
            return;
          }
          pendingTask.reject(new errors_1.AwaitQueueRemovedTaskError(), {
            canExecuteNextTask: true
          });
        }
        dump() {
          const now = Date.now();
          let idx = 0;
          return Array.from(this.pendingTasks.values()).map((pendingTask) => ({
            idx: idx++,
            task: pendingTask.task,
            name: pendingTask.name,
            enqueuedTime: pendingTask.executedAt ? pendingTask.executedAt - pendingTask.enqueuedAt : now - pendingTask.enqueuedAt,
            executionTime: pendingTask.executedAt ? now - pendingTask.executedAt : 0
          }));
        }
        async execute(pendingTask) {
          logger.debug(`execute() [name:${pendingTask.name}]`);
          if (pendingTask.executedAt) {
            throw new Error("task already being executed");
          }
          pendingTask.executedAt = Date.now();
          try {
            const result = await pendingTask.task();
            pendingTask.resolve(result);
          } catch (error) {
            pendingTask.reject(error, { canExecuteNextTask: true });
          }
        }
      };
      exports.AwaitQueue = AwaitQueue;
    }
  });

  // node_modules/awaitqueue/lib/index.js
  var require_lib2 = __commonJS({
    "node_modules/awaitqueue/lib/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.AwaitQueueRemovedTaskError = exports.AwaitQueueStoppedError = exports.AwaitQueue = void 0;
      var AwaitQueue_1 = require_AwaitQueue();
      Object.defineProperty(exports, "AwaitQueue", { enumerable: true, get: function() {
        return AwaitQueue_1.AwaitQueue;
      } });
      var errors_1 = require_errors2();
      Object.defineProperty(exports, "AwaitQueueStoppedError", { enumerable: true, get: function() {
        return errors_1.AwaitQueueStoppedError;
      } });
      Object.defineProperty(exports, "AwaitQueueRemovedTaskError", { enumerable: true, get: function() {
        return errors_1.AwaitQueueRemovedTaskError;
      } });
    }
  });

  // node_modules/mediasoup-client/lib/Producer.js
  var require_Producer = __commonJS({
    "node_modules/mediasoup-client/lib/Producer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Producer = void 0;
      var Logger_1 = require_Logger();
      var enhancedEvents_1 = require_enhancedEvents();
      var errors_1 = require_errors();
      var logger = new Logger_1.Logger("Producer");
      var Producer = class extends enhancedEvents_1.EnhancedEventEmitter {
        // Id.
        _id;
        // Local id.
        _localId;
        // Closed flag.
        _closed = false;
        // Associated RTCRtpSender.
        _rtpSender;
        // Local track.
        _track;
        // Producer kind.
        _kind;
        // RTP parameters.
        _rtpParameters;
        // Paused flag.
        _paused;
        // Video max spatial layer.
        _maxSpatialLayer;
        // Whether the Producer should call stop() in given tracks.
        _stopTracks;
        // Whether the Producer should set track.enabled = false when paused.
        _disableTrackOnPause;
        // Whether we should mark the transceiver as inactive when paused.
        _zeroRtpOnPause;
        // App custom data.
        _appData;
        // Observer instance.
        _observer = new enhancedEvents_1.EnhancedEventEmitter();
        constructor({ id, localId, rtpSender, track, rtpParameters, stopTracks, disableTrackOnPause, zeroRtpOnPause, appData }) {
          super();
          logger.debug("constructor()");
          this._id = id;
          this._localId = localId;
          this._rtpSender = rtpSender;
          this._track = track;
          this._kind = track.kind;
          this._rtpParameters = rtpParameters;
          this._paused = disableTrackOnPause ? !track.enabled : false;
          this._maxSpatialLayer = void 0;
          this._stopTracks = stopTracks;
          this._disableTrackOnPause = disableTrackOnPause;
          this._zeroRtpOnPause = zeroRtpOnPause;
          this._appData = appData ?? {};
          this.onTrackEnded = this.onTrackEnded.bind(this);
          this.handleTrack();
        }
        /**
         * Producer id.
         */
        get id() {
          return this._id;
        }
        /**
         * Local id.
         */
        get localId() {
          return this._localId;
        }
        /**
         * Whether the Producer is closed.
         */
        get closed() {
          return this._closed;
        }
        /**
         * Media kind.
         */
        get kind() {
          return this._kind;
        }
        /**
         * Associated RTCRtpSender.
         */
        get rtpSender() {
          return this._rtpSender;
        }
        /**
         * The associated track.
         */
        get track() {
          return this._track;
        }
        /**
         * RTP parameters.
         */
        get rtpParameters() {
          return this._rtpParameters;
        }
        /**
         * Whether the Producer is paused.
         */
        get paused() {
          return this._paused;
        }
        /**
         * Max spatial layer.
         *
         * @type {Number | undefined}
         */
        get maxSpatialLayer() {
          return this._maxSpatialLayer;
        }
        /**
         * App custom data.
         */
        get appData() {
          return this._appData;
        }
        /**
         * App custom data setter.
         */
        set appData(appData) {
          this._appData = appData;
        }
        get observer() {
          return this._observer;
        }
        /**
         * Closes the Producer.
         */
        close() {
          if (this._closed) {
            return;
          }
          logger.debug("close()");
          this._closed = true;
          this.destroyTrack();
          this.emit("@close");
          this._observer.safeEmit("close");
          super.close();
          this._observer.close();
        }
        /**
         * Transport was closed.
         */
        transportClosed() {
          if (this._closed) {
            return;
          }
          logger.debug("transportClosed()");
          this._closed = true;
          this.destroyTrack();
          this.safeEmit("transportclose");
          this._observer.safeEmit("close");
        }
        /**
         * Get associated RTCRtpSender stats.
         */
        async getStats() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          }
          return new Promise((resolve, reject) => {
            this.safeEmit("@getstats", resolve, reject);
          });
        }
        /**
         * Pauses sending media.
         */
        pause() {
          logger.debug("pause()");
          if (this._closed) {
            logger.error("pause() | Producer closed");
            return;
          }
          this._paused = true;
          if (this._track && this._disableTrackOnPause) {
            this._track.enabled = false;
          }
          if (this._zeroRtpOnPause) {
            new Promise((resolve, reject) => {
              this.safeEmit("@pause", resolve, reject);
            }).catch(() => {
            });
          }
          this._observer.safeEmit("pause");
        }
        /**
         * Resumes sending media.
         */
        resume() {
          logger.debug("resume()");
          if (this._closed) {
            logger.error("resume() | Producer closed");
            return;
          }
          this._paused = false;
          if (this._track && this._disableTrackOnPause) {
            this._track.enabled = true;
          }
          if (this._zeroRtpOnPause) {
            new Promise((resolve, reject) => {
              this.safeEmit("@resume", resolve, reject);
            }).catch(() => {
            });
          }
          this._observer.safeEmit("resume");
        }
        /**
         * Replaces the current track with a new one or null.
         */
        async replaceTrack({ track }) {
          logger.debug("replaceTrack() [track:%o]", track);
          if (this._closed) {
            if (track && this._stopTracks) {
              try {
                track.stop();
              } catch (error) {
              }
            }
            throw new errors_1.InvalidStateError("closed");
          } else if ((track == null ? void 0 : track.readyState) === "ended") {
            throw new errors_1.InvalidStateError("track ended");
          }
          if (track === this._track) {
            logger.debug("replaceTrack() | same track, ignored");
            return;
          }
          await new Promise((resolve, reject) => {
            this.safeEmit("@replacetrack", track, resolve, reject);
          });
          this.destroyTrack();
          this._track = track;
          if (this._track && this._disableTrackOnPause) {
            if (!this._paused) {
              this._track.enabled = true;
            } else if (this._paused) {
              this._track.enabled = false;
            }
          }
          this.handleTrack();
        }
        /**
         * Sets the video max spatial layer to be sent.
         */
        async setMaxSpatialLayer(spatialLayer) {
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          } else if (this._kind !== "video") {
            throw new errors_1.UnsupportedError("not a video Producer");
          } else if (typeof spatialLayer !== "number") {
            throw new TypeError("invalid spatialLayer");
          }
          if (spatialLayer === this._maxSpatialLayer) {
            return;
          }
          await new Promise((resolve, reject) => {
            this.safeEmit("@setmaxspatiallayer", spatialLayer, resolve, reject);
          }).catch(() => {
          });
          this._maxSpatialLayer = spatialLayer;
        }
        async setRtpEncodingParameters(params) {
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          } else if (typeof params !== "object") {
            throw new TypeError("invalid params");
          }
          await new Promise((resolve, reject) => {
            this.safeEmit("@setrtpencodingparameters", params, resolve, reject);
          });
        }
        onTrackEnded() {
          logger.debug('track "ended" event');
          this.safeEmit("trackended");
          this._observer.safeEmit("trackended");
        }
        handleTrack() {
          if (!this._track) {
            return;
          }
          this._track.addEventListener("ended", this.onTrackEnded);
        }
        destroyTrack() {
          if (!this._track) {
            return;
          }
          try {
            this._track.removeEventListener("ended", this.onTrackEnded);
            if (this._stopTracks) {
              this._track.stop();
            }
          } catch (error) {
          }
        }
      };
      exports.Producer = Producer;
    }
  });

  // node_modules/mediasoup-client/lib/Consumer.js
  var require_Consumer = __commonJS({
    "node_modules/mediasoup-client/lib/Consumer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Consumer = void 0;
      var Logger_1 = require_Logger();
      var enhancedEvents_1 = require_enhancedEvents();
      var errors_1 = require_errors();
      var logger = new Logger_1.Logger("Consumer");
      var Consumer = class extends enhancedEvents_1.EnhancedEventEmitter {
        // Id.
        _id;
        // Local id.
        _localId;
        // Associated Producer id.
        _producerId;
        // Closed flag.
        _closed = false;
        // Associated RTCRtpReceiver.
        _rtpReceiver;
        // Remote track.
        _track;
        // RTP parameters.
        _rtpParameters;
        // Paused flag.
        _paused;
        // App custom data.
        _appData;
        // Observer instance.
        _observer = new enhancedEvents_1.EnhancedEventEmitter();
        constructor({ id, localId, producerId, rtpReceiver, track, rtpParameters, appData }) {
          super();
          logger.debug("constructor()");
          this._id = id;
          this._localId = localId;
          this._producerId = producerId;
          this._rtpReceiver = rtpReceiver;
          this._track = track;
          this._rtpParameters = rtpParameters;
          this._paused = !track.enabled;
          this._appData = appData ?? {};
          this.onTrackEnded = this.onTrackEnded.bind(this);
          this.handleTrack();
        }
        /**
         * Consumer id.
         */
        get id() {
          return this._id;
        }
        /**
         * Local id.
         */
        get localId() {
          return this._localId;
        }
        /**
         * Associated Producer id.
         */
        get producerId() {
          return this._producerId;
        }
        /**
         * Whether the Consumer is closed.
         */
        get closed() {
          return this._closed;
        }
        /**
         * Media kind.
         */
        get kind() {
          return this._track.kind;
        }
        /**
         * Associated RTCRtpReceiver.
         */
        get rtpReceiver() {
          return this._rtpReceiver;
        }
        /**
         * The associated track.
         */
        get track() {
          return this._track;
        }
        /**
         * RTP parameters.
         */
        get rtpParameters() {
          return this._rtpParameters;
        }
        /**
         * Whether the Consumer is paused.
         */
        get paused() {
          return this._paused;
        }
        /**
         * App custom data.
         */
        get appData() {
          return this._appData;
        }
        /**
         * App custom data setter.
         */
        set appData(appData) {
          this._appData = appData;
        }
        get observer() {
          return this._observer;
        }
        /**
         * Closes the Consumer.
         */
        close() {
          if (this._closed) {
            return;
          }
          logger.debug("close()");
          this._closed = true;
          this.destroyTrack();
          this.emit("@close");
          this._observer.safeEmit("close");
          super.close();
          this._observer.close();
        }
        /**
         * Transport was closed.
         */
        transportClosed() {
          if (this._closed) {
            return;
          }
          logger.debug("transportClosed()");
          this._closed = true;
          this.destroyTrack();
          this.safeEmit("transportclose");
          this._observer.safeEmit("close");
        }
        /**
         * Get associated RTCRtpReceiver stats.
         */
        async getStats() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          }
          return new Promise((resolve, reject) => {
            this.safeEmit("@getstats", resolve, reject);
          });
        }
        /**
         * Pauses receiving media.
         */
        pause() {
          logger.debug("pause()");
          if (this._closed) {
            logger.error("pause() | Consumer closed");
            return;
          }
          if (this._paused) {
            logger.debug("pause() | Consumer is already paused");
            return;
          }
          this._paused = true;
          this._track.enabled = false;
          this.emit("@pause");
          this._observer.safeEmit("pause");
        }
        /**
         * Resumes receiving media.
         */
        resume() {
          logger.debug("resume()");
          if (this._closed) {
            logger.error("resume() | Consumer closed");
            return;
          }
          if (!this._paused) {
            logger.debug("resume() | Consumer is already resumed");
            return;
          }
          this._paused = false;
          this._track.enabled = true;
          this.emit("@resume");
          this._observer.safeEmit("resume");
        }
        onTrackEnded() {
          logger.debug('track "ended" event');
          this.safeEmit("trackended");
          this._observer.safeEmit("trackended");
        }
        handleTrack() {
          this._track.addEventListener("ended", this.onTrackEnded);
        }
        destroyTrack() {
          try {
            this._track.removeEventListener("ended", this.onTrackEnded);
            this._track.stop();
          } catch (error) {
          }
        }
      };
      exports.Consumer = Consumer;
    }
  });

  // node_modules/mediasoup-client/lib/DataProducer.js
  var require_DataProducer = __commonJS({
    "node_modules/mediasoup-client/lib/DataProducer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DataProducer = void 0;
      var Logger_1 = require_Logger();
      var enhancedEvents_1 = require_enhancedEvents();
      var errors_1 = require_errors();
      var logger = new Logger_1.Logger("DataProducer");
      var DataProducer = class extends enhancedEvents_1.EnhancedEventEmitter {
        // Id.
        _id;
        // The underlying RTCDataChannel instance.
        _dataChannel;
        // Closed flag.
        _closed = false;
        // SCTP stream parameters.
        _sctpStreamParameters;
        // App custom data.
        _appData;
        // Observer instance.
        _observer = new enhancedEvents_1.EnhancedEventEmitter();
        constructor({ id, dataChannel, sctpStreamParameters, appData }) {
          super();
          logger.debug("constructor()");
          this._id = id;
          this._dataChannel = dataChannel;
          this._sctpStreamParameters = sctpStreamParameters;
          this._appData = appData ?? {};
          this.handleDataChannel();
        }
        /**
         * DataProducer id.
         */
        get id() {
          return this._id;
        }
        /**
         * Whether the DataProducer is closed.
         */
        get closed() {
          return this._closed;
        }
        /**
         * SCTP stream parameters.
         */
        get sctpStreamParameters() {
          return this._sctpStreamParameters;
        }
        /**
         * DataChannel readyState.
         */
        get readyState() {
          return this._dataChannel.readyState;
        }
        /**
         * DataChannel label.
         */
        get label() {
          return this._dataChannel.label;
        }
        /**
         * DataChannel protocol.
         */
        get protocol() {
          return this._dataChannel.protocol;
        }
        /**
         * DataChannel bufferedAmount.
         */
        get bufferedAmount() {
          return this._dataChannel.bufferedAmount;
        }
        /**
         * DataChannel bufferedAmountLowThreshold.
         */
        get bufferedAmountLowThreshold() {
          return this._dataChannel.bufferedAmountLowThreshold;
        }
        /**
         * Set DataChannel bufferedAmountLowThreshold.
         */
        set bufferedAmountLowThreshold(bufferedAmountLowThreshold) {
          this._dataChannel.bufferedAmountLowThreshold = bufferedAmountLowThreshold;
        }
        /**
         * App custom data.
         */
        get appData() {
          return this._appData;
        }
        /**
         * App custom data setter.
         */
        set appData(appData) {
          this._appData = appData;
        }
        get observer() {
          return this._observer;
        }
        /**
         * Closes the DataProducer.
         */
        close() {
          if (this._closed) {
            return;
          }
          logger.debug("close()");
          this._closed = true;
          this._dataChannel.close();
          this.emit("@close");
          this._observer.safeEmit("close");
          super.close();
          this._observer.close();
        }
        /**
         * Transport was closed.
         */
        transportClosed() {
          if (this._closed) {
            return;
          }
          logger.debug("transportClosed()");
          this._closed = true;
          this._dataChannel.close();
          this.safeEmit("transportclose");
          this._observer.safeEmit("close");
        }
        /**
         * Send a message.
         *
         * @param {String|Blob|ArrayBuffer|ArrayBufferView} data.
         */
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        send(data) {
          logger.debug("send()");
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          }
          this._dataChannel.send(data);
        }
        handleDataChannel() {
          this._dataChannel.addEventListener("open", () => {
            if (this._closed) {
              return;
            }
            logger.debug('DataChannel "open" event');
            this.safeEmit("open");
          });
          this._dataChannel.addEventListener("error", (event) => {
            var _a47, _b;
            if (this._closed) {
              return;
            }
            const error = event.error ?? new Error("unknown DataChannel error");
            if (((_a47 = event.error) == null ? void 0 : _a47.errorDetail) === "sctp-failure") {
              logger.error("DataChannel SCTP error [sctpCauseCode:%s]: %s", (_b = event.error) == null ? void 0 : _b.sctpCauseCode, event.error.message);
            } else {
              logger.error('DataChannel "error" event: %o', error);
            }
            this.safeEmit("error", error);
          });
          this._dataChannel.addEventListener("close", () => {
            if (this._closed) {
              return;
            }
            logger.warn('DataChannel "close" event');
            this._closed = true;
            this.emit("@close");
            this.safeEmit("close");
            this._observer.safeEmit("close");
          });
          this._dataChannel.addEventListener("message", () => {
            if (this._closed) {
              return;
            }
            logger.warn('DataChannel "message" event in a DataProducer, message discarded');
          });
          this._dataChannel.addEventListener("bufferedamountlow", () => {
            if (this._closed) {
              return;
            }
            this.safeEmit("bufferedamountlow");
          });
        }
      };
      exports.DataProducer = DataProducer;
    }
  });

  // node_modules/mediasoup-client/lib/DataConsumer.js
  var require_DataConsumer = __commonJS({
    "node_modules/mediasoup-client/lib/DataConsumer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DataConsumer = void 0;
      var Logger_1 = require_Logger();
      var enhancedEvents_1 = require_enhancedEvents();
      var logger = new Logger_1.Logger("DataConsumer");
      var DataConsumer = class extends enhancedEvents_1.EnhancedEventEmitter {
        // Id.
        _id;
        // Associated DataProducer Id.
        _dataProducerId;
        // The underlying RTCDataChannel instance.
        _dataChannel;
        // Closed flag.
        _closed = false;
        // SCTP stream parameters.
        _sctpStreamParameters;
        // App custom data.
        _appData;
        // Observer instance.
        _observer = new enhancedEvents_1.EnhancedEventEmitter();
        constructor({ id, dataProducerId, dataChannel, sctpStreamParameters, appData }) {
          super();
          logger.debug("constructor()");
          this._id = id;
          this._dataProducerId = dataProducerId;
          this._dataChannel = dataChannel;
          this._sctpStreamParameters = sctpStreamParameters;
          this._appData = appData ?? {};
          this.handleDataChannel();
        }
        /**
         * DataConsumer id.
         */
        get id() {
          return this._id;
        }
        /**
         * Associated DataProducer id.
         */
        get dataProducerId() {
          return this._dataProducerId;
        }
        /**
         * Whether the DataConsumer is closed.
         */
        get closed() {
          return this._closed;
        }
        /**
         * SCTP stream parameters.
         */
        get sctpStreamParameters() {
          return this._sctpStreamParameters;
        }
        /**
         * DataChannel readyState.
         */
        get readyState() {
          return this._dataChannel.readyState;
        }
        /**
         * DataChannel label.
         */
        get label() {
          return this._dataChannel.label;
        }
        /**
         * DataChannel protocol.
         */
        get protocol() {
          return this._dataChannel.protocol;
        }
        /**
         * DataChannel binaryType.
         */
        get binaryType() {
          return this._dataChannel.binaryType;
        }
        /**
         * Set DataChannel binaryType.
         */
        set binaryType(binaryType) {
          this._dataChannel.binaryType = binaryType;
        }
        /**
         * App custom data.
         */
        get appData() {
          return this._appData;
        }
        /**
         * App custom data setter.
         */
        set appData(appData) {
          this._appData = appData;
        }
        get observer() {
          return this._observer;
        }
        /**
         * Closes the DataConsumer.
         */
        close() {
          if (this._closed) {
            return;
          }
          logger.debug("close()");
          this._closed = true;
          this._dataChannel.close();
          this.emit("@close");
          this._observer.safeEmit("close");
          super.close();
          this._observer.close();
        }
        /**
         * Transport was closed.
         */
        transportClosed() {
          if (this._closed) {
            return;
          }
          logger.debug("transportClosed()");
          this._closed = true;
          this._dataChannel.close();
          this.safeEmit("transportclose");
          this._observer.safeEmit("close");
        }
        handleDataChannel() {
          this._dataChannel.addEventListener("open", () => {
            if (this._closed) {
              return;
            }
            logger.debug('DataChannel "open" event');
            this.safeEmit("open");
          });
          this._dataChannel.addEventListener("error", (event) => {
            var _a47, _b;
            if (this._closed) {
              return;
            }
            const error = event.error ?? new Error("unknown DataChannel error");
            if (((_a47 = event.error) == null ? void 0 : _a47.errorDetail) === "sctp-failure") {
              logger.error("DataChannel SCTP error [sctpCauseCode:%s]: %s", (_b = event.error) == null ? void 0 : _b.sctpCauseCode, event.error.message);
            } else {
              logger.error('DataChannel "error" event: %o', error);
            }
            this.safeEmit("error", error);
          });
          this._dataChannel.addEventListener("close", () => {
            if (this._closed) {
              return;
            }
            logger.warn('DataChannel "close" event');
            this._closed = true;
            this.emit("@close");
            this.safeEmit("close");
            this._observer.safeEmit("close");
          });
          this._dataChannel.addEventListener("message", (event) => {
            if (this._closed) {
              return;
            }
            this.safeEmit("message", event.data);
          });
        }
      };
      exports.DataConsumer = DataConsumer;
    }
  });

  // node_modules/mediasoup-client/lib/Transport.js
  var require_Transport = __commonJS({
    "node_modules/mediasoup-client/lib/Transport.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Transport = void 0;
      var awaitqueue_1 = require_lib2();
      var Logger_1 = require_Logger();
      var enhancedEvents_1 = require_enhancedEvents();
      var errors_1 = require_errors();
      var utils = require_utils();
      var ortc = require_ortc();
      var Producer_1 = require_Producer();
      var Consumer_1 = require_Consumer();
      var DataProducer_1 = require_DataProducer();
      var DataConsumer_1 = require_DataConsumer();
      var logger = new Logger_1.Logger("Transport");
      var ConsumerCreationTask = class {
        consumerOptions;
        promise;
        resolve;
        reject;
        constructor(consumerOptions) {
          this.consumerOptions = consumerOptions;
          this.promise = new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
          });
        }
      };
      var Transport = class extends enhancedEvents_1.EnhancedEventEmitter {
        // Id.
        _id;
        // Closed flag.
        _closed = false;
        // Direction.
        _direction;
        // Callback for sending Transports to request sending extended RTP capabilities
        // on demand.
        _getSendExtendedRtpCapabilities;
        // Recv RTP capabilities.
        _recvRtpCapabilities;
        // Whether we can produce audio/video based on computed extended RTP
        // capabilities.
        _canProduceByKind;
        // SCTP max message size if enabled.
        _maxSctpMessageSize;
        // RTC handler isntance.
        _handler;
        // Transport ICE gathering state.
        _iceGatheringState = "new";
        // Transport connection state.
        _connectionState = "new";
        // App custom data.
        _appData;
        // Map of Producers indexed by id.
        _producers = /* @__PURE__ */ new Map();
        // Map of Consumers indexed by id.
        _consumers = /* @__PURE__ */ new Map();
        // Map of DataProducers indexed by id.
        _dataProducers = /* @__PURE__ */ new Map();
        // Map of DataConsumers indexed by id.
        _dataConsumers = /* @__PURE__ */ new Map();
        // Whether the Consumer for RTP probation has been created.
        _probatorConsumerCreated = false;
        // AwaitQueue instance to make async tasks happen sequentially.
        _awaitQueue = new awaitqueue_1.AwaitQueue();
        // Consumer creation tasks awaiting to be processed.
        _pendingConsumerTasks = [];
        // Consumer creation in progress flag.
        _consumerCreationInProgress = false;
        // Consumers pending to be paused.
        _pendingPauseConsumers = /* @__PURE__ */ new Map();
        // Consumer pause in progress flag.
        _consumerPauseInProgress = false;
        // Consumers pending to be resumed.
        _pendingResumeConsumers = /* @__PURE__ */ new Map();
        // Consumer resume in progress flag.
        _consumerResumeInProgress = false;
        // Consumers pending to be closed.
        _pendingCloseConsumers = /* @__PURE__ */ new Map();
        // Consumer close in progress flag.
        _consumerCloseInProgress = false;
        // Observer instance.
        _observer = new enhancedEvents_1.EnhancedEventEmitter();
        constructor({ direction, id, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, appData, handlerFactory, getSendExtendedRtpCapabilities, recvRtpCapabilities, canProduceByKind }) {
          super();
          logger.debug("constructor() [id:%s, direction:%s]", id, direction);
          this._id = id;
          this._direction = direction;
          this._getSendExtendedRtpCapabilities = getSendExtendedRtpCapabilities;
          this._recvRtpCapabilities = recvRtpCapabilities;
          this._canProduceByKind = canProduceByKind;
          this._maxSctpMessageSize = sctpParameters == null ? void 0 : sctpParameters.maxMessageSize;
          const clonedAdditionalSettings = utils.clone(additionalSettings) ?? {};
          delete clonedAdditionalSettings.iceServers;
          delete clonedAdditionalSettings.iceTransportPolicy;
          delete clonedAdditionalSettings.bundlePolicy;
          delete clonedAdditionalSettings.rtcpMuxPolicy;
          this._handler = handlerFactory.factory({
            direction,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
            iceServers,
            iceTransportPolicy,
            additionalSettings: clonedAdditionalSettings,
            getSendExtendedRtpCapabilities: this._getSendExtendedRtpCapabilities
          });
          this._appData = appData ?? {};
          this.handleHandler();
        }
        /**
         * Transport id.
         */
        get id() {
          return this._id;
        }
        /**
         * Whether the Transport is closed.
         */
        get closed() {
          return this._closed;
        }
        /**
         * Transport direction.
         */
        get direction() {
          return this._direction;
        }
        /**
         * RTC handler instance.
         */
        get handler() {
          return this._handler;
        }
        /**
         * ICE gathering state.
         */
        get iceGatheringState() {
          return this._iceGatheringState;
        }
        /**
         * Connection state.
         */
        get connectionState() {
          return this._connectionState;
        }
        /**
         * App custom data.
         */
        get appData() {
          return this._appData;
        }
        /**
         * App custom data setter.
         */
        set appData(appData) {
          this._appData = appData;
        }
        get observer() {
          return this._observer;
        }
        /**
         * Close the Transport.
         */
        close() {
          if (this._closed) {
            return;
          }
          logger.debug("close()");
          this._closed = true;
          this._awaitQueue.stop();
          this._handler.close();
          this._connectionState = "closed";
          for (const producer of this._producers.values()) {
            producer.transportClosed();
          }
          this._producers.clear();
          for (const consumer of this._consumers.values()) {
            consumer.transportClosed();
          }
          this._consumers.clear();
          for (const dataProducer of this._dataProducers.values()) {
            dataProducer.transportClosed();
          }
          this._dataProducers.clear();
          for (const dataConsumer of this._dataConsumers.values()) {
            dataConsumer.transportClosed();
          }
          this._dataConsumers.clear();
          this._observer.safeEmit("close");
          super.close();
          this._observer.close();
        }
        /**
         * Get associated Transport (RTCPeerConnection) stats.
         *
         * @returns {RTCStatsReport}
         */
        async getStats() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          }
          return this._handler.getTransportStats();
        }
        /**
         * Restart ICE connection.
         */
        async restartIce({ iceParameters }) {
          logger.debug("restartIce()");
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          } else if (!iceParameters) {
            throw new TypeError("missing iceParameters");
          }
          return this._awaitQueue.push(async () => await this._handler.restartIce(iceParameters), "transport.restartIce()");
        }
        /**
         * Update ICE servers.
         */
        async updateIceServers({ iceServers } = {}) {
          logger.debug("updateIceServers()");
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          } else if (!Array.isArray(iceServers)) {
            throw new TypeError("missing iceServers");
          }
          return this._awaitQueue.push(async () => this._handler.updateIceServers(iceServers), "transport.updateIceServers()");
        }
        /**
         * Create a Producer.
         */
        async produce({ track, streamId, encodings, codecOptions, headerExtensionOptions, codec, stopTracks = true, disableTrackOnPause = true, zeroRtpOnPause = false, onRtpSender, appData = {} } = {}) {
          logger.debug("produce() [track:%o]", track);
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          } else if (!track) {
            throw new TypeError("missing track");
          } else if (this._direction !== "send") {
            throw new errors_1.UnsupportedError("not a sending Transport");
          } else if (!this._canProduceByKind[track.kind]) {
            throw new errors_1.UnsupportedError(`cannot produce ${track.kind}`);
          } else if (track.readyState === "ended") {
            throw new errors_1.InvalidStateError("track ended");
          } else if (this.listenerCount("connect") === 0 && this._connectionState === "new") {
            throw new TypeError('no "connect" listener set into this transport');
          } else if (this.listenerCount("produce") === 0) {
            throw new TypeError('no "produce" listener set into this transport');
          } else if (appData && typeof appData !== "object") {
            throw new TypeError("if given, appData must be an object");
          }
          return this._awaitQueue.push(async () => {
            let normalizedEncodings;
            if (encodings && !Array.isArray(encodings)) {
              throw TypeError("encodings must be an array");
            } else if ((encodings == null ? void 0 : encodings.length) === 0) {
              normalizedEncodings = void 0;
            } else if (encodings) {
              normalizedEncodings = encodings.map((encoding) => {
                const normalizedEncoding = {
                  active: true
                };
                if (encoding.active === false) {
                  normalizedEncoding.active = false;
                }
                if (typeof encoding.dtx === "boolean") {
                  normalizedEncoding.dtx = encoding.dtx;
                }
                if (typeof encoding.scalabilityMode === "string") {
                  normalizedEncoding.scalabilityMode = encoding.scalabilityMode;
                }
                if (typeof encoding.scaleResolutionDownBy === "number") {
                  normalizedEncoding.scaleResolutionDownBy = encoding.scaleResolutionDownBy;
                }
                if (typeof encoding.maxBitrate === "number") {
                  normalizedEncoding.maxBitrate = encoding.maxBitrate;
                }
                if (typeof encoding.maxFramerate === "number") {
                  normalizedEncoding.maxFramerate = encoding.maxFramerate;
                }
                if (typeof encoding.adaptivePtime === "boolean") {
                  normalizedEncoding.adaptivePtime = encoding.adaptivePtime;
                }
                if (typeof encoding.priority === "string") {
                  normalizedEncoding.priority = encoding.priority;
                }
                if (typeof encoding.networkPriority === "string") {
                  normalizedEncoding.networkPriority = encoding.networkPriority;
                }
                return normalizedEncoding;
              });
            }
            const { localId, rtpParameters, rtpSender } = await this._handler.send({
              track,
              streamId,
              encodings: normalizedEncodings,
              codecOptions,
              headerExtensionOptions,
              codec,
              onRtpSender
            });
            try {
              ortc.validateAndNormalizeRtpParameters(rtpParameters);
              const { id } = await new Promise((resolve, reject) => {
                this.safeEmit("produce", {
                  kind: track.kind,
                  rtpParameters,
                  appData
                }, resolve, reject);
              });
              const producer = new Producer_1.Producer({
                id,
                localId,
                rtpSender,
                track,
                rtpParameters,
                stopTracks,
                disableTrackOnPause,
                zeroRtpOnPause,
                appData
              });
              this._producers.set(producer.id, producer);
              this.handleProducer(producer);
              this._observer.safeEmit("newproducer", producer);
              return producer;
            } catch (error) {
              this._handler.stopSending(localId).catch(() => {
              });
              throw error;
            }
          }, "transport.produce()").catch((error) => {
            if (stopTracks) {
              try {
                track.stop();
              } catch (error2) {
              }
            }
            throw error;
          });
        }
        /**
         * Create a Consumer to consume a remote Producer.
         */
        async consume({ id, producerId, kind, rtpParameters, streamId, onRtpReceiver, appData = {} }) {
          logger.debug("consume()");
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          } else if (this._direction !== "recv") {
            throw new errors_1.UnsupportedError("not a receiving Transport");
          } else if (typeof id !== "string") {
            throw new TypeError("missing id");
          } else if (typeof producerId !== "string") {
            throw new TypeError("missing producerId");
          } else if (kind !== "audio" && kind !== "video") {
            throw new TypeError(`invalid kind '${kind}'`);
          } else if (this.listenerCount("connect") === 0 && this._connectionState === "new") {
            throw new TypeError('no "connect" listener set into this transport');
          } else if (appData && typeof appData !== "object") {
            throw new TypeError("if given, appData must be an object");
          }
          const clonedRtpParameters = utils.clone(rtpParameters);
          const canConsume = ortc.canReceive(clonedRtpParameters, this._recvRtpCapabilities);
          if (!canConsume) {
            throw new errors_1.UnsupportedError("cannot consume this Producer");
          }
          const consumerCreationTask = new ConsumerCreationTask({
            id,
            producerId,
            kind,
            rtpParameters: clonedRtpParameters,
            streamId,
            onRtpReceiver,
            appData
          });
          this._pendingConsumerTasks.push(consumerCreationTask);
          queueMicrotask(() => {
            if (this._closed) {
              return;
            }
            if (this._consumerCreationInProgress === false) {
              this.createPendingConsumers();
            }
          });
          return consumerCreationTask.promise;
        }
        /**
         * Create a DataProducer
         */
        async produceData({ ordered = true, maxPacketLifeTime, maxRetransmits, label = "", protocol = "", appData = {} } = {}) {
          logger.debug("produceData()");
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          } else if (this._direction !== "send") {
            throw new errors_1.UnsupportedError("not a sending Transport");
          } else if (!this._maxSctpMessageSize) {
            throw new errors_1.UnsupportedError("SCTP not enabled by remote Transport");
          } else if (this.listenerCount("connect") === 0 && this._connectionState === "new") {
            throw new TypeError('no "connect" listener set into this transport');
          } else if (this.listenerCount("producedata") === 0) {
            throw new TypeError('no "producedata" listener set into this transport');
          } else if (appData && typeof appData !== "object") {
            throw new TypeError("if given, appData must be an object");
          }
          if (maxPacketLifeTime || maxRetransmits) {
            ordered = false;
          }
          return this._awaitQueue.push(async () => {
            const { dataChannel, sctpStreamParameters } = await this._handler.sendDataChannel({
              sctpStreamParameters: {
                ordered,
                maxPacketLifeTime,
                maxRetransmits,
                label,
                protocol
              }
            });
            ortc.validateAndNormalizeSctpStreamParameters(sctpStreamParameters);
            const { id } = await new Promise((resolve, reject) => {
              this.safeEmit("producedata", {
                sctpStreamParameters,
                label,
                protocol,
                appData
              }, resolve, reject);
            });
            const dataProducer = new DataProducer_1.DataProducer({
              id,
              dataChannel,
              sctpStreamParameters,
              appData
            });
            this._dataProducers.set(dataProducer.id, dataProducer);
            this.handleDataProducer(dataProducer);
            this._observer.safeEmit("newdataproducer", dataProducer);
            return dataProducer;
          }, "transport.produceData()");
        }
        /**
         * Create a DataConsumer
         */
        async consumeData({ id, dataProducerId, sctpStreamParameters, label = "", protocol = "", appData = {} }) {
          logger.debug("consumeData()");
          if (this._closed) {
            throw new errors_1.InvalidStateError("closed");
          } else if (this._direction !== "recv") {
            throw new errors_1.UnsupportedError("not a receiving Transport");
          } else if (!this._maxSctpMessageSize) {
            throw new errors_1.UnsupportedError("SCTP not enabled by remote Transport");
          } else if (typeof id !== "string") {
            throw new TypeError("missing id");
          } else if (typeof dataProducerId !== "string") {
            throw new TypeError("missing dataProducerId");
          } else if (this.listenerCount("connect") === 0 && this._connectionState === "new") {
            throw new TypeError('no "connect" listener set into this transport');
          } else if (appData && typeof appData !== "object") {
            throw new TypeError("if given, appData must be an object");
          }
          const clonedSctpStreamParameters = utils.clone(sctpStreamParameters);
          ortc.validateAndNormalizeSctpStreamParameters(clonedSctpStreamParameters);
          return this._awaitQueue.push(async () => {
            const { dataChannel } = await this._handler.receiveDataChannel({
              maxMessageSize: this._maxSctpMessageSize,
              sctpStreamParameters: clonedSctpStreamParameters,
              label,
              protocol
            });
            const dataConsumer = new DataConsumer_1.DataConsumer({
              id,
              dataProducerId,
              dataChannel,
              sctpStreamParameters: clonedSctpStreamParameters,
              appData
            });
            this._dataConsumers.set(dataConsumer.id, dataConsumer);
            this.handleDataConsumer(dataConsumer);
            this._observer.safeEmit("newdataconsumer", dataConsumer);
            return dataConsumer;
          }, "transport.consumeData()");
        }
        getDataChannelMaxMessageSize() {
          return this._handler.getDataChannelMaxMessageSize();
        }
        // This method is guaranteed to never throw.
        createPendingConsumers() {
          this._consumerCreationInProgress = true;
          this._awaitQueue.push(async () => {
            if (this._pendingConsumerTasks.length === 0) {
              logger.debug("createPendingConsumers() | there is no Consumer to be created");
              return;
            }
            const pendingConsumerTasks = [...this._pendingConsumerTasks];
            this._pendingConsumerTasks = [];
            let videoConsumerForProbator = void 0;
            const optionsList = [];
            for (const task of pendingConsumerTasks) {
              const { id, kind, rtpParameters, streamId, onRtpReceiver } = task.consumerOptions;
              optionsList.push({
                trackId: id,
                kind,
                rtpParameters,
                streamId,
                onRtpReceiver
              });
            }
            try {
              const results = await this._handler.receive(optionsList);
              for (let idx = 0; idx < results.length; ++idx) {
                const task = pendingConsumerTasks[idx];
                const result = results[idx];
                const { id, producerId, kind, rtpParameters, appData } = task.consumerOptions;
                const { localId, rtpReceiver, track } = result;
                const consumer = new Consumer_1.Consumer({
                  id,
                  localId,
                  producerId,
                  rtpReceiver,
                  track,
                  rtpParameters,
                  appData
                });
                this._consumers.set(consumer.id, consumer);
                this.handleConsumer(consumer);
                if (!this._probatorConsumerCreated && !videoConsumerForProbator && kind === "video") {
                  videoConsumerForProbator = consumer;
                }
                this._observer.safeEmit("newconsumer", consumer);
                task.resolve(consumer);
              }
            } catch (error) {
              for (const task of pendingConsumerTasks) {
                task.reject(error);
              }
            }
            if (videoConsumerForProbator) {
              try {
                const probatorRtpParameters = ortc.generateProbatorRtpParameters(videoConsumerForProbator.rtpParameters);
                await this._handler.receive([
                  {
                    trackId: "probator",
                    kind: "video",
                    rtpParameters: probatorRtpParameters
                  }
                ]);
                logger.debug("createPendingConsumers() | Consumer for RTP probation created");
                this._probatorConsumerCreated = true;
              } catch (error) {
                logger.error("createPendingConsumers() | failed to create Consumer for RTP probation:%o", error);
              }
            }
          }, "transport.createPendingConsumers()").then(() => {
            this._consumerCreationInProgress = false;
            if (this._pendingConsumerTasks.length > 0) {
              this.createPendingConsumers();
            }
          }).catch(() => {
          });
        }
        pausePendingConsumers() {
          this._consumerPauseInProgress = true;
          this._awaitQueue.push(async () => {
            if (this._pendingPauseConsumers.size === 0) {
              logger.debug("pausePendingConsumers() | there is no Consumer to be paused");
              return;
            }
            const pendingPauseConsumers = Array.from(this._pendingPauseConsumers.values());
            this._pendingPauseConsumers.clear();
            try {
              const localIds = pendingPauseConsumers.map((consumer) => consumer.localId);
              await this._handler.pauseReceiving(localIds);
            } catch (error) {
              logger.error("pausePendingConsumers() | failed to pause Consumers:", error);
            }
          }, "transport.pausePendingConsumers()").then(() => {
            this._consumerPauseInProgress = false;
            if (this._pendingPauseConsumers.size > 0) {
              this.pausePendingConsumers();
            }
          }).catch(() => {
          });
        }
        resumePendingConsumers() {
          this._consumerResumeInProgress = true;
          this._awaitQueue.push(async () => {
            if (this._pendingResumeConsumers.size === 0) {
              logger.debug("resumePendingConsumers() | there is no Consumer to be resumed");
              return;
            }
            const pendingResumeConsumers = Array.from(this._pendingResumeConsumers.values());
            this._pendingResumeConsumers.clear();
            try {
              const localIds = pendingResumeConsumers.map((consumer) => consumer.localId);
              await this._handler.resumeReceiving(localIds);
            } catch (error) {
              logger.error("resumePendingConsumers() | failed to resume Consumers:", error);
            }
          }, "transport.resumePendingConsumers()").then(() => {
            this._consumerResumeInProgress = false;
            if (this._pendingResumeConsumers.size > 0) {
              this.resumePendingConsumers();
            }
          }).catch(() => {
          });
        }
        closePendingConsumers() {
          this._consumerCloseInProgress = true;
          this._awaitQueue.push(async () => {
            if (this._pendingCloseConsumers.size === 0) {
              logger.debug("closePendingConsumers() | there is no Consumer to be closed");
              return;
            }
            const pendingCloseConsumers = Array.from(this._pendingCloseConsumers.values());
            this._pendingCloseConsumers.clear();
            try {
              await this._handler.stopReceiving(pendingCloseConsumers.map((consumer) => consumer.localId));
            } catch (error) {
              logger.error("closePendingConsumers() | failed to close Consumers:", error);
            }
          }, "transport.closePendingConsumers()").then(() => {
            this._consumerCloseInProgress = false;
            if (this._pendingCloseConsumers.size > 0) {
              this.closePendingConsumers();
            }
          }).catch(() => {
          });
        }
        handleHandler() {
          const handler = this._handler;
          handler.on("@connect", ({ dtlsParameters }, callback, errback) => {
            if (this._closed) {
              errback(new errors_1.InvalidStateError("closed"));
              return;
            }
            this.safeEmit("connect", { dtlsParameters }, callback, errback);
          });
          handler.on("@icegatheringstatechange", (iceGatheringState) => {
            if (iceGatheringState === this._iceGatheringState) {
              return;
            }
            logger.debug("ICE gathering state changed to %s", iceGatheringState);
            this._iceGatheringState = iceGatheringState;
            if (!this._closed) {
              this.safeEmit("icegatheringstatechange", iceGatheringState);
            }
          });
          handler.on("@icecandidateerror", (event) => {
            logger.warn(`ICE candidate error [url:${event.url}, localAddress:${event.address}, localPort:${event.port}]: ${event.errorCode} "${event.errorText}"`);
            this.safeEmit("icecandidateerror", event);
          });
          handler.on("@connectionstatechange", (connectionState) => {
            if (connectionState === this._connectionState) {
              return;
            }
            logger.debug("connection state changed to %s", connectionState);
            this._connectionState = connectionState;
            if (!this._closed) {
              this.safeEmit("connectionstatechange", connectionState);
            }
          });
        }
        handleProducer(producer) {
          producer.on("@close", () => {
            this._producers.delete(producer.id);
            if (this._closed) {
              return;
            }
            this._awaitQueue.push(async () => await this._handler.stopSending(producer.localId), "producer @close event").catch((error) => logger.warn("producer.close() failed:%o", error));
          });
          producer.on("@pause", (callback, errback) => {
            this._awaitQueue.push(async () => await this._handler.pauseSending(producer.localId), "producer @pause event").then(callback).catch(errback);
          });
          producer.on("@resume", (callback, errback) => {
            this._awaitQueue.push(async () => await this._handler.resumeSending(producer.localId), "producer @resume event").then(callback).catch(errback);
          });
          producer.on("@replacetrack", (track, callback, errback) => {
            this._awaitQueue.push(async () => await this._handler.replaceTrack(producer.localId, track), "producer @replacetrack event").then(callback).catch(errback);
          });
          producer.on("@setmaxspatiallayer", (spatialLayer, callback, errback) => {
            this._awaitQueue.push(async () => await this._handler.setMaxSpatialLayer(producer.localId, spatialLayer), "producer @setmaxspatiallayer event").then(callback).catch(errback);
          });
          producer.on("@setrtpencodingparameters", (params, callback, errback) => {
            this._awaitQueue.push(async () => await this._handler.setRtpEncodingParameters(producer.localId, params), "producer @setrtpencodingparameters event").then(callback).catch(errback);
          });
          producer.on("@getstats", (callback, errback) => {
            if (this._closed) {
              return errback(new errors_1.InvalidStateError("closed"));
            }
            this._handler.getSenderStats(producer.localId).then(callback).catch(errback);
          });
        }
        handleConsumer(consumer) {
          consumer.on("@close", () => {
            this._consumers.delete(consumer.id);
            this._pendingPauseConsumers.delete(consumer.id);
            this._pendingResumeConsumers.delete(consumer.id);
            if (this._closed) {
              return;
            }
            this._pendingCloseConsumers.set(consumer.id, consumer);
            if (this._consumerCloseInProgress === false) {
              this.closePendingConsumers();
            }
          });
          consumer.on("@pause", () => {
            if (this._pendingResumeConsumers.has(consumer.id)) {
              this._pendingResumeConsumers.delete(consumer.id);
            }
            this._pendingPauseConsumers.set(consumer.id, consumer);
            queueMicrotask(() => {
              if (this._closed) {
                return;
              }
              if (this._consumerPauseInProgress === false) {
                this.pausePendingConsumers();
              }
            });
          });
          consumer.on("@resume", () => {
            if (this._pendingPauseConsumers.has(consumer.id)) {
              this._pendingPauseConsumers.delete(consumer.id);
            }
            this._pendingResumeConsumers.set(consumer.id, consumer);
            queueMicrotask(() => {
              if (this._closed) {
                return;
              }
              if (this._consumerResumeInProgress === false) {
                this.resumePendingConsumers();
              }
            });
          });
          consumer.on("@getstats", (callback, errback) => {
            if (this._closed) {
              return errback(new errors_1.InvalidStateError("closed"));
            }
            this._handler.getReceiverStats(consumer.localId).then(callback).catch(errback);
          });
        }
        handleDataProducer(dataProducer) {
          dataProducer.on("@close", () => {
            this._dataProducers.delete(dataProducer.id);
          });
        }
        handleDataConsumer(dataConsumer) {
          dataConsumer.on("@close", () => {
            this._dataConsumers.delete(dataConsumer.id);
          });
        }
      };
      exports.Transport = Transport;
    }
  });

  // node_modules/sdp-transform/lib/grammar.js
  var require_grammar = __commonJS({
    "node_modules/sdp-transform/lib/grammar.js"(exports, module) {
      var grammar = module.exports = {
        v: [{
          name: "version",
          reg: /^(\d*)$/
        }],
        o: [{
          // o=- 20518 0 IN IP4 203.0.113.1
          // NB: sessionId will be a String in most cases because it is huge
          name: "origin",
          reg: /^(\S*) (\d*) (\d*) (\S*) IP(\d) (\S*)/,
          names: ["username", "sessionId", "sessionVersion", "netType", "ipVer", "address"],
          format: "%s %s %d %s IP%d %s"
        }],
        // default parsing of these only (though some of these feel outdated)
        s: [{ name: "name" }],
        i: [{ name: "description" }],
        u: [{ name: "uri" }],
        e: [{ name: "email" }],
        p: [{ name: "phone" }],
        z: [{ name: "timezones" }],
        // TODO: this one can actually be parsed properly...
        r: [{ name: "repeats" }],
        // TODO: this one can also be parsed properly
        // k: [{}], // outdated thing ignored
        t: [{
          // t=0 0
          name: "timing",
          reg: /^(\d*) (\d*)/,
          names: ["start", "stop"],
          format: "%d %d"
        }],
        c: [{
          // c=IN IP4 10.47.197.26
          name: "connection",
          reg: /^IN IP(\d) (\S*)/,
          names: ["version", "ip"],
          format: "IN IP%d %s"
        }],
        b: [{
          // b=AS:4000
          push: "bandwidth",
          reg: /^(TIAS|AS|CT|RR|RS):(\d*)/,
          names: ["type", "limit"],
          format: "%s:%s"
        }],
        m: [{
          // m=video 51744 RTP/AVP 126 97 98 34 31
          // NB: special - pushes to session
          // TODO: rtp/fmtp should be filtered by the payloads found here?
          reg: /^(\w*) (\d*) ([\w/]*)(?: (.*))?/,
          names: ["type", "port", "protocol", "payloads"],
          format: "%s %d %s %s"
        }],
        a: [
          {
            // a=rtpmap:110 opus/48000/2
            push: "rtp",
            reg: /^rtpmap:(\d*) ([\w\-.]*)(?:\s*\/(\d*)(?:\s*\/(\S*))?)?/,
            names: ["payload", "codec", "rate", "encoding"],
            format: function(o) {
              return o.encoding ? "rtpmap:%d %s/%s/%s" : o.rate ? "rtpmap:%d %s/%s" : "rtpmap:%d %s";
            }
          },
          {
            // a=fmtp:108 profile-level-id=24;object=23;bitrate=64000
            // a=fmtp:111 minptime=10; useinbandfec=1
            push: "fmtp",
            reg: /^fmtp:(\d*) ([\S| ]*)/,
            names: ["payload", "config"],
            format: "fmtp:%d %s"
          },
          {
            // a=control:streamid=0
            name: "control",
            reg: /^control:(.*)/,
            format: "control:%s"
          },
          {
            // a=rtcp:65179 IN IP4 193.84.77.194
            name: "rtcp",
            reg: /^rtcp:(\d*)(?: (\S*) IP(\d) (\S*))?/,
            names: ["port", "netType", "ipVer", "address"],
            format: function(o) {
              return o.address != null ? "rtcp:%d %s IP%d %s" : "rtcp:%d";
            }
          },
          {
            // a=rtcp-fb:98 trr-int 100
            push: "rtcpFbTrrInt",
            reg: /^rtcp-fb:(\*|\d*) trr-int (\d*)/,
            names: ["payload", "value"],
            format: "rtcp-fb:%s trr-int %d"
          },
          {
            // a=rtcp-fb:98 nack rpsi
            push: "rtcpFb",
            reg: /^rtcp-fb:(\*|\d*) ([\w-_]*)(?: ([\w-_]*))?/,
            names: ["payload", "type", "subtype"],
            format: function(o) {
              return o.subtype != null ? "rtcp-fb:%s %s %s" : "rtcp-fb:%s %s";
            }
          },
          {
            // a=extmap:2 urn:ietf:params:rtp-hdrext:toffset
            // a=extmap:1/recvonly URI-gps-string
            // a=extmap:3 urn:ietf:params:rtp-hdrext:encrypt urn:ietf:params:rtp-hdrext:smpte-tc 25@600/24
            push: "ext",
            reg: /^extmap:(\d+)(?:\/(\w+))?(?: (urn:ietf:params:rtp-hdrext:encrypt))? (\S*)(?: (\S*))?/,
            names: ["value", "direction", "encrypt-uri", "uri", "config"],
            format: function(o) {
              return "extmap:%d" + (o.direction ? "/%s" : "%v") + (o["encrypt-uri"] ? " %s" : "%v") + " %s" + (o.config ? " %s" : "");
            }
          },
          {
            // a=extmap-allow-mixed
            name: "extmapAllowMixed",
            reg: /^(extmap-allow-mixed)/
          },
          {
            // a=crypto:1 AES_CM_128_HMAC_SHA1_80 inline:PS1uQCVeeCFCanVmcjkpPywjNWhcYD0mXXtxaVBR|2^20|1:32
            push: "crypto",
            reg: /^crypto:(\d*) ([\w_]*) (\S*)(?: (\S*))?/,
            names: ["id", "suite", "config", "sessionConfig"],
            format: function(o) {
              return o.sessionConfig != null ? "crypto:%d %s %s %s" : "crypto:%d %s %s";
            }
          },
          {
            // a=setup:actpass
            name: "setup",
            reg: /^setup:(\w*)/,
            format: "setup:%s"
          },
          {
            // a=connection:new
            name: "connectionType",
            reg: /^connection:(new|existing)/,
            format: "connection:%s"
          },
          {
            // a=mid:1
            name: "mid",
            reg: /^mid:([^\s]*)/,
            format: "mid:%s"
          },
          {
            // a=msid:0c8b064d-d807-43b4-b434-f92a889d8587 98178685-d409-46e0-8e16-7ef0db0db64a
            push: "msid",
            reg: /^msid:([\w-]+)(?: ([\w-]+))?/,
            names: ["id", "appdata"],
            format: "msid:%s %s"
          },
          {
            // a=ptime:20
            name: "ptime",
            reg: /^ptime:(\d*(?:\.\d*)*)/,
            format: "ptime:%d"
          },
          {
            // a=maxptime:60
            name: "maxptime",
            reg: /^maxptime:(\d*(?:\.\d*)*)/,
            format: "maxptime:%d"
          },
          {
            // a=sendrecv
            name: "direction",
            reg: /^(sendrecv|recvonly|sendonly|inactive)/
          },
          {
            // a=ice-lite
            name: "icelite",
            reg: /^(ice-lite)/
          },
          {
            // a=ice-ufrag:F7gI
            name: "iceUfrag",
            reg: /^ice-ufrag:(\S*)/,
            format: "ice-ufrag:%s"
          },
          {
            // a=ice-pwd:x9cml/YzichV2+XlhiMu8g
            name: "icePwd",
            reg: /^ice-pwd:(\S*)/,
            format: "ice-pwd:%s"
          },
          {
            // a=fingerprint:SHA-1 00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD:EE:FF:00:11:22:33
            name: "fingerprint",
            reg: /^fingerprint:(\S*) (\S*)/,
            names: ["type", "hash"],
            format: "fingerprint:%s %s"
          },
          {
            // a=candidate:0 1 UDP 2113667327 203.0.113.1 54400 typ host
            // a=candidate:1162875081 1 udp 2113937151 192.168.34.75 60017 typ host generation 0 network-id 3 network-cost 10
            // a=candidate:3289912957 2 udp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 generation 0 network-id 3 network-cost 10
            // a=candidate:229815620 1 tcp 1518280447 192.168.150.19 60017 typ host tcptype active generation 0 network-id 3 network-cost 10
            // a=candidate:3289912957 2 tcp 1845501695 193.84.77.194 60017 typ srflx raddr 192.168.34.75 rport 60017 tcptype passive generation 0 network-id 3 network-cost 10
            push: "candidates",
            reg: /^candidate:(\S*) (\d*) (\S*) (\d*) (\S*) (\d*) typ (\S*)(?: raddr (\S*) rport (\d*))?(?: tcptype (\S*))?(?: generation (\d*))?(?: network-id (\d*))?(?: network-cost (\d*))?/,
            names: ["foundation", "component", "transport", "priority", "ip", "port", "type", "raddr", "rport", "tcptype", "generation", "network-id", "network-cost"],
            format: function(o) {
              var str = "candidate:%s %d %s %d %s %d typ %s";
              str += o.raddr != null ? " raddr %s rport %d" : "%v%v";
              str += o.tcptype != null ? " tcptype %s" : "%v";
              if (o.generation != null) {
                str += " generation %d";
              }
              str += o["network-id"] != null ? " network-id %d" : "%v";
              str += o["network-cost"] != null ? " network-cost %d" : "%v";
              return str;
            }
          },
          {
            // a=end-of-candidates (keep after the candidates line for readability)
            name: "endOfCandidates",
            reg: /^(end-of-candidates)/
          },
          {
            // a=remote-candidates:1 203.0.113.1 54400 2 203.0.113.1 54401 ...
            name: "remoteCandidates",
            reg: /^remote-candidates:(.*)/,
            format: "remote-candidates:%s"
          },
          {
            // a=ice-options:google-ice
            name: "iceOptions",
            reg: /^ice-options:(\S*)/,
            format: "ice-options:%s"
          },
          {
            // a=ssrc:2566107569 cname:t9YU8M1UxTF8Y1A1
            push: "ssrcs",
            reg: /^ssrc:(\d*) ([\w_-]*)(?::(.*))?/,
            names: ["id", "attribute", "value"],
            format: function(o) {
              var str = "ssrc:%d";
              if (o.attribute != null) {
                str += " %s";
                if (o.value != null) {
                  str += ":%s";
                }
              }
              return str;
            }
          },
          {
            // a=ssrc-group:FEC 1 2
            // a=ssrc-group:FEC-FR 3004364195 1080772241
            push: "ssrcGroups",
            // token-char = %x21 / %x23-27 / %x2A-2B / %x2D-2E / %x30-39 / %x41-5A / %x5E-7E
            reg: /^ssrc-group:([\x21\x23\x24\x25\x26\x27\x2A\x2B\x2D\x2E\w]*) (.*)/,
            names: ["semantics", "ssrcs"],
            format: "ssrc-group:%s %s"
          },
          {
            // a=msid-semantic: WMS Jvlam5X3SX1OP6pn20zWogvaKJz5Hjf9OnlV
            name: "msidSemantic",
            reg: /^msid-semantic:\s?(\w*) (\S*)/,
            names: ["semantic", "token"],
            format: "msid-semantic: %s %s"
            // space after ':' is not accidental
          },
          {
            // a=group:BUNDLE audio video
            push: "groups",
            reg: /^group:(\w*) (.*)/,
            names: ["type", "mids"],
            format: "group:%s %s"
          },
          {
            // a=rtcp-mux
            name: "rtcpMux",
            reg: /^(rtcp-mux)/
          },
          {
            // a=rtcp-rsize
            name: "rtcpRsize",
            reg: /^(rtcp-rsize)/
          },
          {
            // a=sctpmap:5000 webrtc-datachannel 1024
            name: "sctpmap",
            reg: /^sctpmap:([\w_/]*) (\S*)(?: (\S*))?/,
            names: ["sctpmapNumber", "app", "maxMessageSize"],
            format: function(o) {
              return o.maxMessageSize != null ? "sctpmap:%s %s %s" : "sctpmap:%s %s";
            }
          },
          {
            // a=x-google-flag:conference
            name: "xGoogleFlag",
            reg: /^x-google-flag:([^\s]*)/,
            format: "x-google-flag:%s"
          },
          {
            // a=rid:1 send max-width=1280;max-height=720;max-fps=30;depend=0
            push: "rids",
            reg: /^rid:([\d\w]+) (\w+)(?: ([\S| ]*))?/,
            names: ["id", "direction", "params"],
            format: function(o) {
              return o.params ? "rid:%s %s %s" : "rid:%s %s";
            }
          },
          {
            // a=imageattr:97 send [x=800,y=640,sar=1.1,q=0.6] [x=480,y=320] recv [x=330,y=250]
            // a=imageattr:* send [x=800,y=640] recv *
            // a=imageattr:100 recv [x=320,y=240]
            push: "imageattrs",
            reg: new RegExp(
              // a=imageattr:97
              "^imageattr:(\\d+|\\*)[\\s\\t]+(send|recv)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*)(?:[\\s\\t]+(recv|send)[\\s\\t]+(\\*|\\[\\S+\\](?:[\\s\\t]+\\[\\S+\\])*))?"
            ),
            names: ["pt", "dir1", "attrs1", "dir2", "attrs2"],
            format: function(o) {
              return "imageattr:%s %s %s" + (o.dir2 ? " %s %s" : "");
            }
          },
          {
            // a=simulcast:send 1,2,3;~4,~5 recv 6;~7,~8
            // a=simulcast:recv 1;4,5 send 6;7
            name: "simulcast",
            reg: new RegExp(
              // a=simulcast:
              "^simulcast:(send|recv) ([a-zA-Z0-9\\-_~;,]+)(?:\\s?(send|recv) ([a-zA-Z0-9\\-_~;,]+))?$"
            ),
            names: ["dir1", "list1", "dir2", "list2"],
            format: function(o) {
              return "simulcast:%s %s" + (o.dir2 ? " %s %s" : "");
            }
          },
          {
            // old simulcast draft 03 (implemented by Firefox)
            //   https://tools.ietf.org/html/draft-ietf-mmusic-sdp-simulcast-03
            // a=simulcast: recv pt=97;98 send pt=97
            // a=simulcast: send rid=5;6;7 paused=6,7
            name: "simulcast_03",
            reg: /^simulcast:[\s\t]+([\S+\s\t]+)$/,
            names: ["value"],
            format: "simulcast: %s"
          },
          {
            // a=framerate:25
            // a=framerate:29.97
            name: "framerate",
            reg: /^framerate:(\d+(?:$|\.\d+))/,
            format: "framerate:%s"
          },
          {
            // RFC4570
            // a=source-filter: incl IN IP4 239.5.2.31 10.1.15.5
            name: "sourceFilter",
            reg: /^source-filter: *(excl|incl) (\S*) (IP4|IP6|\*) (\S*) (.*)/,
            names: ["filterMode", "netType", "addressTypes", "destAddress", "srcList"],
            format: "source-filter: %s %s %s %s %s"
          },
          {
            // a=bundle-only
            name: "bundleOnly",
            reg: /^(bundle-only)/
          },
          {
            // a=label:1
            name: "label",
            reg: /^label:(.+)/,
            format: "label:%s"
          },
          {
            // RFC version 26 for SCTP over DTLS
            // https://tools.ietf.org/html/draft-ietf-mmusic-sctp-sdp-26#section-5
            name: "sctpPort",
            reg: /^sctp-port:(\d+)$/,
            format: "sctp-port:%s"
          },
          {
            // RFC version 26 for SCTP over DTLS
            // https://tools.ietf.org/html/draft-ietf-mmusic-sctp-sdp-26#section-6
            name: "maxMessageSize",
            reg: /^max-message-size:(\d+)$/,
            format: "max-message-size:%s"
          },
          {
            // RFC7273
            // a=ts-refclk:ptp=IEEE1588-2008:39-A7-94-FF-FE-07-CB-D0:37
            push: "tsRefClocks",
            reg: /^ts-refclk:([^\s=]*)(?:=(\S*))?/,
            names: ["clksrc", "clksrcExt"],
            format: function(o) {
              return "ts-refclk:%s" + (o.clksrcExt != null ? "=%s" : "");
            }
          },
          {
            // RFC7273
            // a=mediaclk:direct=963214424
            name: "mediaClk",
            reg: /^mediaclk:(?:id=(\S*))? *([^\s=]*)(?:=(\S*))?(?: *rate=(\d+)\/(\d+))?/,
            names: ["id", "mediaClockName", "mediaClockValue", "rateNumerator", "rateDenominator"],
            format: function(o) {
              var str = "mediaclk:";
              str += o.id != null ? "id=%s %s" : "%v%s";
              str += o.mediaClockValue != null ? "=%s" : "";
              str += o.rateNumerator != null ? " rate=%s" : "";
              str += o.rateDenominator != null ? "/%s" : "";
              return str;
            }
          },
          {
            // a=keywds:keywords
            name: "keywords",
            reg: /^keywds:(.+)$/,
            format: "keywds:%s"
          },
          {
            // a=content:main
            name: "content",
            reg: /^content:(.+)/,
            format: "content:%s"
          },
          // BFCP https://tools.ietf.org/html/rfc4583
          {
            // a=floorctrl:c-s
            name: "bfcpFloorCtrl",
            reg: /^floorctrl:(c-only|s-only|c-s)/,
            format: "floorctrl:%s"
          },
          {
            // a=confid:1
            name: "bfcpConfId",
            reg: /^confid:(\d+)/,
            format: "confid:%s"
          },
          {
            // a=userid:1
            name: "bfcpUserId",
            reg: /^userid:(\d+)/,
            format: "userid:%s"
          },
          {
            // a=floorid:1
            name: "bfcpFloorId",
            reg: /^floorid:(.+) (?:m-stream|mstrm):(.+)/,
            names: ["id", "mStream"],
            format: "floorid:%s mstrm:%s"
          },
          {
            // any a= that we don't understand is kept verbatim on media.invalid
            push: "invalid",
            names: ["value"]
          }
        ]
      };
      Object.keys(grammar).forEach(function(key) {
        var objs = grammar[key];
        objs.forEach(function(obj) {
          if (!obj.reg) {
            obj.reg = /(.*)/;
          }
          if (!obj.format) {
            obj.format = "%s";
          }
        });
      });
    }
  });

  // node_modules/sdp-transform/lib/parser.js
  var require_parser = __commonJS({
    "node_modules/sdp-transform/lib/parser.js"(exports) {
      var toIntIfInt = function(v) {
        return String(Number(v)) === v ? Number(v) : v;
      };
      var attachProperties = function(match, location2, names, rawName) {
        if (rawName && !names) {
          location2[rawName] = toIntIfInt(match[1]);
        } else {
          for (var i = 0; i < names.length; i += 1) {
            if (match[i + 1] != null) {
              location2[names[i]] = toIntIfInt(match[i + 1]);
            }
          }
        }
      };
      var parseReg = function(obj, location2, content) {
        var needsBlank = obj.name && obj.names;
        if (obj.push && !location2[obj.push]) {
          location2[obj.push] = [];
        } else if (needsBlank && !location2[obj.name]) {
          location2[obj.name] = {};
        }
        var keyLocation = obj.push ? {} : (
          // blank object that will be pushed
          needsBlank ? location2[obj.name] : location2
        );
        attachProperties(content.match(obj.reg), keyLocation, obj.names, obj.name);
        if (obj.push) {
          location2[obj.push].push(keyLocation);
        }
      };
      var grammar = require_grammar();
      var validLine = RegExp.prototype.test.bind(/^([a-z])=(.*)/);
      exports.parse = function(sdp) {
        var session = {}, media2 = [], location2 = session;
        sdp.split(/(\r\n|\r|\n)/).filter(validLine).forEach(function(l) {
          var type = l[0];
          var content = l.slice(2);
          if (type === "m") {
            media2.push({ rtp: [], fmtp: [] });
            location2 = media2[media2.length - 1];
          }
          for (var j = 0; j < (grammar[type] || []).length; j += 1) {
            var obj = grammar[type][j];
            if (obj.reg.test(content)) {
              return parseReg(obj, location2, content);
            }
          }
        });
        session.media = media2;
        return session;
      };
      var paramReducer = function(acc, expr) {
        var s = expr.split(/=(.+)/, 2);
        if (s.length === 2) {
          acc[s[0]] = toIntIfInt(s[1]);
        } else if (s.length === 1 && expr.length > 1) {
          acc[s[0]] = void 0;
        }
        return acc;
      };
      exports.parseParams = function(str) {
        return str.split(/;\s?/).reduce(paramReducer, {});
      };
      exports.parseFmtpConfig = exports.parseParams;
      exports.parsePayloads = function(str) {
        return str.toString().split(" ").map(Number);
      };
      exports.parseRemoteCandidates = function(str) {
        var candidates = [];
        var parts = str.split(" ").map(toIntIfInt);
        for (var i = 0; i < parts.length; i += 3) {
          candidates.push({
            component: parts[i],
            ip: parts[i + 1],
            port: parts[i + 2]
          });
        }
        return candidates;
      };
      exports.parseImageAttributes = function(str) {
        return str.split(" ").map(function(item) {
          return item.substring(1, item.length - 1).split(",").reduce(paramReducer, {});
        });
      };
      exports.parseSimulcastStreamList = function(str) {
        return str.split(";").map(function(stream) {
          return stream.split(",").map(function(format) {
            var scid, paused = false;
            if (format[0] !== "~") {
              scid = toIntIfInt(format);
            } else {
              scid = toIntIfInt(format.substring(1, format.length));
              paused = true;
            }
            return {
              scid,
              paused
            };
          });
        });
      };
    }
  });

  // node_modules/sdp-transform/lib/writer.js
  var require_writer = __commonJS({
    "node_modules/sdp-transform/lib/writer.js"(exports, module) {
      var grammar = require_grammar();
      var formatRegExp = /%[sdv%]/g;
      var format = function(formatStr) {
        var i = 1;
        var args = arguments;
        var len = args.length;
        return formatStr.replace(formatRegExp, function(x) {
          if (i >= len) {
            return x;
          }
          var arg = args[i];
          i += 1;
          switch (x) {
            case "%%":
              return "%";
            case "%s":
              return String(arg);
            case "%d":
              return Number(arg);
            case "%v":
              return "";
          }
        });
      };
      var makeLine = function(type, obj, location2) {
        var str = obj.format instanceof Function ? obj.format(obj.push ? location2 : location2[obj.name]) : obj.format;
        var args = [type + "=" + str];
        if (obj.names) {
          for (var i = 0; i < obj.names.length; i += 1) {
            var n = obj.names[i];
            if (obj.name) {
              args.push(location2[obj.name][n]);
            } else {
              args.push(location2[obj.names[i]]);
            }
          }
        } else {
          args.push(location2[obj.name]);
        }
        return format.apply(null, args);
      };
      var defaultOuterOrder = [
        "v",
        "o",
        "s",
        "i",
        "u",
        "e",
        "p",
        "c",
        "b",
        "t",
        "r",
        "z",
        "a"
      ];
      var defaultInnerOrder = ["i", "c", "b", "a"];
      module.exports = function(session, opts) {
        opts = opts || {};
        if (session.version == null) {
          session.version = 0;
        }
        if (session.name == null) {
          session.name = " ";
        }
        session.media.forEach(function(mLine) {
          if (mLine.payloads == null) {
            mLine.payloads = "";
          }
        });
        var outerOrder = opts.outerOrder || defaultOuterOrder;
        var innerOrder = opts.innerOrder || defaultInnerOrder;
        var sdp = [];
        outerOrder.forEach(function(type) {
          grammar[type].forEach(function(obj) {
            if (obj.name in session && session[obj.name] != null) {
              sdp.push(makeLine(type, obj, session));
            } else if (obj.push in session && session[obj.push] != null) {
              session[obj.push].forEach(function(el) {
                sdp.push(makeLine(type, obj, el));
              });
            }
          });
        });
        session.media.forEach(function(mLine) {
          sdp.push(makeLine("m", grammar.m[0], mLine));
          innerOrder.forEach(function(type) {
            grammar[type].forEach(function(obj) {
              if (obj.name in mLine && mLine[obj.name] != null) {
                sdp.push(makeLine(type, obj, mLine));
              } else if (obj.push in mLine && mLine[obj.push] != null) {
                mLine[obj.push].forEach(function(el) {
                  sdp.push(makeLine(type, obj, el));
                });
              }
            });
          });
        });
        return sdp.join("\r\n") + "\r\n";
      };
    }
  });

  // node_modules/sdp-transform/lib/index.js
  var require_lib3 = __commonJS({
    "node_modules/sdp-transform/lib/index.js"(exports) {
      var parser = require_parser();
      var writer = require_writer();
      var grammar = require_grammar();
      exports.grammar = grammar;
      exports.write = writer;
      exports.parse = parser.parse;
      exports.parseParams = parser.parseParams;
      exports.parseFmtpConfig = parser.parseFmtpConfig;
      exports.parsePayloads = parser.parsePayloads;
      exports.parseRemoteCandidates = parser.parseRemoteCandidates;
      exports.parseImageAttributes = parser.parseImageAttributes;
      exports.parseSimulcastStreamList = parser.parseSimulcastStreamList;
    }
  });

  // node_modules/mediasoup-client/lib/scalabilityModes.js
  var require_scalabilityModes = __commonJS({
    "node_modules/mediasoup-client/lib/scalabilityModes.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.parse = parse;
      var ScalabilityModeRegex = new RegExp("^[LS]([1-9]\\d{0,1})T([1-9]\\d{0,1})");
      function parse(scalabilityMode) {
        const match = ScalabilityModeRegex.exec(scalabilityMode ?? "");
        if (match) {
          return {
            spatialLayers: Number(match[1]),
            temporalLayers: Number(match[2])
          };
        } else {
          return {
            spatialLayers: 1,
            temporalLayers: 1
          };
        }
      }
    }
  });

  // node_modules/mediasoup-client/lib/handlers/sdp/MediaSection.js
  var require_MediaSection = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/sdp/MediaSection.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.OfferMediaSection = exports.AnswerMediaSection = exports.MediaSection = void 0;
      var sdpTransform = require_lib3();
      var utils = require_utils();
      var MediaSection = class {
        // SDP media object.
        _mediaObject;
        constructor({ iceParameters, iceCandidates, dtlsParameters }) {
          this._mediaObject = {
            type: "",
            port: 0,
            protocol: "",
            payloads: "",
            rtp: [],
            fmtp: []
          };
          if (iceParameters) {
            this.setIceParameters(iceParameters);
          }
          if (iceCandidates) {
            this._mediaObject.candidates = [];
            for (const candidate of iceCandidates) {
              const candidateObject = {
                foundation: candidate.foundation,
                // mediasoup does mandates rtcp-mux so candidates component is always
                // RTP (1).
                component: 1,
                // Be ready for new candidate.address field in mediasoup server side
                // field and keep backward compatibility with deprecated candidate.ip.
                ip: candidate.address ?? candidate.ip,
                port: candidate.port,
                priority: candidate.priority,
                transport: candidate.protocol,
                type: candidate.type
              };
              if (candidate.tcpType) {
                candidateObject.tcptype = candidate.tcpType;
              }
              this._mediaObject.candidates.push(candidateObject);
            }
            this._mediaObject.endOfCandidates = "end-of-candidates";
            this._mediaObject.iceOptions = "renomination";
          }
          if (dtlsParameters) {
            this.setDtlsRole(dtlsParameters.role);
          }
        }
        get mid() {
          return String(this._mediaObject.mid);
        }
        get closed() {
          return this._mediaObject.port === 0;
        }
        getObject() {
          return this._mediaObject;
        }
        setIceParameters(iceParameters) {
          this._mediaObject.iceUfrag = iceParameters.usernameFragment;
          this._mediaObject.icePwd = iceParameters.password;
        }
        pause() {
          this._mediaObject.direction = "inactive";
        }
        disable() {
          this.pause();
        }
        close() {
          this.disable();
          this._mediaObject.port = 0;
          delete this._mediaObject.candidates;
          delete this._mediaObject.endOfCandidates;
          delete this._mediaObject.iceUfrag;
          delete this._mediaObject.icePwd;
          delete this._mediaObject.iceOptions;
          this._mediaObject.rtp = [];
          this._mediaObject.fmtp = [];
          delete this._mediaObject.rtcp;
          delete this._mediaObject.rtcpFb;
          delete this._mediaObject.ssrcs;
          delete this._mediaObject.ssrcGroups;
          delete this._mediaObject.simulcast;
          delete this._mediaObject.simulcast_03;
          delete this._mediaObject.rids;
          delete this._mediaObject.extmapAllowMixed;
        }
      };
      exports.MediaSection = MediaSection;
      var AnswerMediaSection = class extends MediaSection {
        constructor({ iceParameters, iceCandidates, dtlsParameters, sctpParameters, plainRtpParameters, offerMediaObject, offerRtpParameters, answerRtpParameters, codecOptions }) {
          super({ iceParameters, iceCandidates, dtlsParameters });
          this._mediaObject.mid = String(offerMediaObject.mid);
          this._mediaObject.type = offerMediaObject.type;
          this._mediaObject.protocol = offerMediaObject.protocol;
          if (!plainRtpParameters) {
            this._mediaObject.connection = { ip: "127.0.0.1", version: 4 };
            this._mediaObject.port = 7;
          } else {
            this._mediaObject.connection = {
              ip: plainRtpParameters.ip,
              version: plainRtpParameters.ipVersion
            };
            this._mediaObject.port = plainRtpParameters.port;
          }
          switch (offerMediaObject.type) {
            case "audio":
            case "video": {
              this._mediaObject.direction = "recvonly";
              this._mediaObject.rtp = [];
              this._mediaObject.rtcpFb = [];
              this._mediaObject.fmtp = [];
              for (const codec of answerRtpParameters.codecs) {
                const rtp = {
                  payload: codec.payloadType,
                  codec: getCodecName(codec),
                  rate: codec.clockRate
                };
                if (codec.channels > 1) {
                  rtp.encoding = codec.channels;
                }
                this._mediaObject.rtp.push(rtp);
                const codecParameters = utils.clone(codec.parameters) ?? {};
                let codecRtcpFeedback = utils.clone(codec.rtcpFeedback) ?? [];
                if (codecOptions) {
                  const { opusStereo, opusFec, opusDtx, opusMaxPlaybackRate, opusMaxAverageBitrate, opusPtime, opusNack, videoGoogleStartBitrate, videoGoogleMaxBitrate, videoGoogleMinBitrate } = codecOptions;
                  const offerCodec = offerRtpParameters.codecs.find((c) => c.payloadType === codec.payloadType);
                  switch (codec.mimeType.toLowerCase()) {
                    case "audio/opus":
                    case "audio/multiopus": {
                      if (opusStereo !== void 0) {
                        offerCodec.parameters["sprop-stereo"] = opusStereo ? 1 : 0;
                        codecParameters["stereo"] = opusStereo ? 1 : 0;
                      }
                      if (opusFec !== void 0) {
                        offerCodec.parameters["useinbandfec"] = opusFec ? 1 : 0;
                        codecParameters["useinbandfec"] = opusFec ? 1 : 0;
                      }
                      if (opusDtx !== void 0) {
                        offerCodec.parameters["usedtx"] = opusDtx ? 1 : 0;
                        codecParameters["usedtx"] = opusDtx ? 1 : 0;
                      }
                      if (opusMaxPlaybackRate !== void 0) {
                        codecParameters["maxplaybackrate"] = opusMaxPlaybackRate;
                      }
                      if (opusMaxAverageBitrate !== void 0) {
                        codecParameters["maxaveragebitrate"] = opusMaxAverageBitrate;
                      }
                      if (opusPtime !== void 0) {
                        offerCodec.parameters["ptime"] = opusPtime;
                        codecParameters["ptime"] = opusPtime;
                      }
                      if (!opusNack) {
                        offerCodec.rtcpFeedback = offerCodec.rtcpFeedback.filter((fb) => fb.type !== "nack" || fb.parameter);
                        codecRtcpFeedback = codecRtcpFeedback.filter((fb) => fb.type !== "nack" || fb.parameter);
                      }
                      break;
                    }
                    case "video/vp8":
                    case "video/vp9":
                    case "video/h264":
                    case "video/h265":
                    case "video/av1": {
                      if (videoGoogleStartBitrate !== void 0) {
                        codecParameters["x-google-start-bitrate"] = videoGoogleStartBitrate;
                      }
                      if (videoGoogleMaxBitrate !== void 0) {
                        codecParameters["x-google-max-bitrate"] = videoGoogleMaxBitrate;
                      }
                      if (videoGoogleMinBitrate !== void 0) {
                        codecParameters["x-google-min-bitrate"] = videoGoogleMinBitrate;
                      }
                      break;
                    }
                  }
                }
                const fmtp = {
                  payload: codec.payloadType,
                  config: ""
                };
                for (const key of Object.keys(codecParameters)) {
                  if (fmtp.config) {
                    fmtp.config += ";";
                  }
                  fmtp.config += `${key}=${codecParameters[key]}`;
                }
                if (fmtp.config) {
                  this._mediaObject.fmtp.push(fmtp);
                }
                for (const fb of codecRtcpFeedback) {
                  this._mediaObject.rtcpFb.push({
                    payload: codec.payloadType,
                    type: fb.type,
                    subtype: fb.parameter
                  });
                }
              }
              this._mediaObject.payloads = answerRtpParameters.codecs.map((codec) => codec.payloadType).join(" ");
              this._mediaObject.ext = [];
              for (const ext of answerRtpParameters.headerExtensions) {
                const found = (offerMediaObject.ext ?? []).some((localExt) => localExt.uri === ext.uri);
                if (!found) {
                  continue;
                }
                this._mediaObject.ext.push({
                  uri: ext.uri,
                  value: ext.id
                });
              }
              if (offerMediaObject.extmapAllowMixed === "extmap-allow-mixed") {
                this._mediaObject.extmapAllowMixed = "extmap-allow-mixed";
              }
              if (offerMediaObject.simulcast) {
                this._mediaObject.simulcast = {
                  dir1: "recv",
                  list1: offerMediaObject.simulcast.list1
                };
                this._mediaObject.rids = [];
                for (const rid of offerMediaObject.rids ?? []) {
                  if (rid.direction !== "send") {
                    continue;
                  }
                  this._mediaObject.rids.push({
                    id: rid.id,
                    direction: "recv"
                  });
                }
              } else if (offerMediaObject.simulcast_03) {
                this._mediaObject.simulcast_03 = {
                  value: offerMediaObject.simulcast_03.value.replace(/send/g, "recv")
                };
                this._mediaObject.rids = [];
                for (const rid of offerMediaObject.rids ?? []) {
                  if (rid.direction !== "send") {
                    continue;
                  }
                  this._mediaObject.rids.push({
                    id: rid.id,
                    direction: "recv"
                  });
                }
              }
              this._mediaObject.rtcpMux = "rtcp-mux";
              this._mediaObject.rtcpRsize = "rtcp-rsize";
              break;
            }
            case "application": {
              if (typeof offerMediaObject.sctpPort === "number") {
                this._mediaObject.payloads = "webrtc-datachannel";
                this._mediaObject.sctpPort = sctpParameters.port;
                this._mediaObject.maxMessageSize = sctpParameters.maxMessageSize;
              } else if (offerMediaObject.sctpmap) {
                this._mediaObject.payloads = String(sctpParameters.port);
                this._mediaObject.sctpmap = {
                  app: "webrtc-datachannel",
                  sctpmapNumber: sctpParameters.port,
                  maxMessageSize: sctpParameters.maxMessageSize
                };
              }
              break;
            }
          }
        }
        setDtlsRole(role) {
          switch (role) {
            case "client": {
              this._mediaObject.setup = "active";
              break;
            }
            case "server": {
              this._mediaObject.setup = "passive";
              break;
            }
            case "auto": {
              this._mediaObject.setup = "actpass";
              break;
            }
          }
        }
        resume() {
          this._mediaObject.direction = "recvonly";
        }
        muxSimulcastStreams(encodings) {
          var _a47, _b;
          if (!((_a47 = this._mediaObject.simulcast) == null ? void 0 : _a47.list1)) {
            return;
          }
          const layers = {};
          for (const encoding of encodings) {
            if (encoding.rid) {
              layers[encoding.rid] = encoding;
            }
          }
          const raw = this._mediaObject.simulcast.list1;
          const simulcastStreams = sdpTransform.parseSimulcastStreamList(raw);
          for (const simulcastStream of simulcastStreams) {
            for (const simulcastFormat of simulcastStream) {
              simulcastFormat.paused = !((_b = layers[simulcastFormat.scid]) == null ? void 0 : _b.active);
            }
          }
          this._mediaObject.simulcast.list1 = simulcastStreams.map((simulcastFormats) => simulcastFormats.map((f) => `${f.paused ? "~" : ""}${f.scid}`).join(",")).join(";");
        }
      };
      exports.AnswerMediaSection = AnswerMediaSection;
      var OfferMediaSection = class extends MediaSection {
        constructor({ iceParameters, iceCandidates, dtlsParameters, sctpParameters, plainRtpParameters, mid, kind, offerRtpParameters, streamId, trackId }) {
          var _a47;
          super({ iceParameters, iceCandidates, dtlsParameters });
          this._mediaObject.mid = String(mid);
          this._mediaObject.type = kind;
          if (!plainRtpParameters) {
            this._mediaObject.connection = { ip: "127.0.0.1", version: 4 };
            if (!sctpParameters) {
              this._mediaObject.protocol = "UDP/TLS/RTP/SAVPF";
            } else {
              this._mediaObject.protocol = "UDP/DTLS/SCTP";
            }
            this._mediaObject.port = 7;
          } else {
            this._mediaObject.connection = {
              ip: plainRtpParameters.ip,
              version: plainRtpParameters.ipVersion
            };
            this._mediaObject.protocol = "RTP/AVP";
            this._mediaObject.port = plainRtpParameters.port;
          }
          this._mediaObject.extmapAllowMixed = "extmap-allow-mixed";
          switch (kind) {
            case "audio":
            case "video": {
              this._mediaObject.direction = "sendonly";
              this._mediaObject.rtp = [];
              this._mediaObject.rtcpFb = [];
              this._mediaObject.fmtp = [];
              this._mediaObject.msid = [{ id: streamId, appdata: trackId }];
              for (const codec of offerRtpParameters.codecs) {
                const rtp = {
                  payload: codec.payloadType,
                  codec: getCodecName(codec),
                  rate: codec.clockRate
                };
                if (codec.channels > 1) {
                  rtp.encoding = codec.channels;
                }
                this._mediaObject.rtp.push(rtp);
                const fmtp = {
                  payload: codec.payloadType,
                  config: ""
                };
                for (const key of Object.keys(codec.parameters ?? {})) {
                  if (fmtp.config) {
                    fmtp.config += ";";
                  }
                  fmtp.config += `${key}=${codec.parameters[key]}`;
                }
                if (fmtp.config) {
                  this._mediaObject.fmtp.push(fmtp);
                }
                for (const fb of codec.rtcpFeedback) {
                  this._mediaObject.rtcpFb.push({
                    payload: codec.payloadType,
                    type: fb.type,
                    subtype: fb.parameter
                  });
                }
              }
              this._mediaObject.payloads = offerRtpParameters.codecs.map((codec) => codec.payloadType).join(" ");
              this._mediaObject.ext = [];
              for (const ext of offerRtpParameters.headerExtensions) {
                this._mediaObject.ext.push({
                  uri: ext.uri,
                  value: ext.id
                });
              }
              this._mediaObject.rtcpMux = "rtcp-mux";
              this._mediaObject.rtcpRsize = "rtcp-rsize";
              const encoding = offerRtpParameters.encodings[0];
              const ssrc = encoding.ssrc;
              const rtxSsrc = (_a47 = encoding.rtx) == null ? void 0 : _a47.ssrc;
              this._mediaObject.ssrcs = [];
              this._mediaObject.ssrcGroups = [];
              if (ssrc && offerRtpParameters.rtcp.cname) {
                this._mediaObject.ssrcs.push({
                  id: ssrc,
                  attribute: "cname",
                  value: offerRtpParameters.rtcp.cname
                });
              }
              if (rtxSsrc) {
                if (offerRtpParameters.rtcp.cname) {
                  this._mediaObject.ssrcs.push({
                    id: rtxSsrc,
                    attribute: "cname",
                    value: offerRtpParameters.rtcp.cname
                  });
                }
                if (ssrc) {
                  this._mediaObject.ssrcGroups.push({
                    semantics: "FID",
                    ssrcs: `${ssrc} ${rtxSsrc}`
                  });
                }
              }
              break;
            }
            case "application": {
              this._mediaObject.payloads = "webrtc-datachannel";
              this._mediaObject.sctpPort = sctpParameters.port;
              this._mediaObject.maxMessageSize = sctpParameters.maxMessageSize;
              break;
            }
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        setDtlsRole(role) {
          this._mediaObject.setup = "actpass";
        }
        resume() {
          this._mediaObject.direction = "sendonly";
        }
      };
      exports.OfferMediaSection = OfferMediaSection;
      function getCodecName(codec) {
        const MimeTypeRegex = new RegExp("^(audio|video)/(.+)", "i");
        const mimeTypeMatch = MimeTypeRegex.exec(codec.mimeType);
        if (!mimeTypeMatch) {
          throw new TypeError("invalid codec.mimeType");
        }
        return mimeTypeMatch[2];
      }
    }
  });

  // node_modules/mediasoup-client/lib/handlers/sdp/RemoteSdp.js
  var require_RemoteSdp = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/sdp/RemoteSdp.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.RemoteSdp = void 0;
      var sdpTransform = require_lib3();
      var Logger_1 = require_Logger();
      var MediaSection_1 = require_MediaSection();
      var __1 = require_lib5();
      var DependencyDescriptorCodecs = ["av1", "h264"];
      var logger = new Logger_1.Logger("RemoteSdp");
      var RemoteSdp = class {
        // Remote ICE parameters.
        _iceParameters;
        // Remote ICE candidates.
        _iceCandidates;
        // Remote DTLS parameters.
        _dtlsParameters;
        // Remote SCTP parameters.
        _sctpParameters;
        // Parameters for plain RTP (no SRTP nor DTLS no BUNDLE).
        _plainRtpParameters;
        // MediaSection instances with same order as in the SDP.
        _mediaSections = [];
        // MediaSection indices indexed by MID.
        _midToIndex = /* @__PURE__ */ new Map();
        // First MID.
        _firstMid;
        // SDP object.
        _sdpObject;
        constructor({ iceParameters, iceCandidates, dtlsParameters, sctpParameters, plainRtpParameters }) {
          this._iceParameters = iceParameters;
          this._iceCandidates = iceCandidates;
          this._dtlsParameters = dtlsParameters;
          this._sctpParameters = sctpParameters;
          this._plainRtpParameters = plainRtpParameters;
          this._sdpObject = {
            version: 0,
            origin: {
              address: "0.0.0.0",
              ipVer: 4,
              netType: "IN",
              sessionId: "10000",
              sessionVersion: 0,
              username: `mediasoup-client-v${__1.version}`
            },
            name: "-",
            timing: { start: 0, stop: 0 },
            media: []
          };
          this._sdpObject.iceOptions = "ice2";
          if (iceParameters == null ? void 0 : iceParameters.iceLite) {
            this._sdpObject.icelite = "ice-lite";
          }
          if (dtlsParameters) {
            this._sdpObject.msidSemantic = { semantic: "WMS", token: "*" };
            const numFingerprints = this._dtlsParameters.fingerprints.length;
            this._sdpObject.fingerprint = {
              type: dtlsParameters.fingerprints[numFingerprints - 1].algorithm,
              hash: dtlsParameters.fingerprints[numFingerprints - 1].value
            };
            this._sdpObject.groups = [{ type: "BUNDLE", mids: "" }];
          }
          if (plainRtpParameters) {
            this._sdpObject.origin.address = plainRtpParameters.ip;
            this._sdpObject.origin.ipVer = plainRtpParameters.ipVersion;
          }
        }
        updateIceParameters(iceParameters) {
          logger.debug("updateIceParameters() [iceParameters:%o]", iceParameters);
          this._iceParameters = iceParameters;
          this._sdpObject.icelite = iceParameters.iceLite ? "ice-lite" : void 0;
          for (const mediaSection of this._mediaSections) {
            mediaSection.setIceParameters(iceParameters);
          }
        }
        updateDtlsRole(role) {
          logger.debug("updateDtlsRole() [role:%s]", role);
          this._dtlsParameters.role = role;
          for (const mediaSection of this._mediaSections) {
            mediaSection.setDtlsRole(role);
          }
        }
        /**
         * Set session level a=extmap-allow-mixed attibute.
         */
        setSessionExtmapAllowMixed() {
          logger.debug("setSessionExtmapAllowMixed()");
          this._sdpObject.extmapAllowMixed = "extmap-allow-mixed";
        }
        getNextMediaSectionIdx() {
          for (let idx = 0; idx < this._mediaSections.length; ++idx) {
            const mediaSection = this._mediaSections[idx];
            if (mediaSection.closed) {
              return { idx, reuseMid: mediaSection.mid };
            }
          }
          return { idx: this._mediaSections.length };
        }
        send({ offerMediaObject, reuseMid, offerRtpParameters, answerRtpParameters, codecOptions }) {
          var _a47;
          const mediaSection = new MediaSection_1.AnswerMediaSection({
            iceParameters: this._iceParameters,
            iceCandidates: this._iceCandidates,
            dtlsParameters: this._dtlsParameters,
            plainRtpParameters: this._plainRtpParameters,
            offerMediaObject,
            offerRtpParameters,
            answerRtpParameters,
            codecOptions
          });
          const mediaObject = mediaSection.getObject();
          const ddCodec = mediaObject.rtp.find((rtp) => DependencyDescriptorCodecs.includes(rtp.codec.toLowerCase()));
          if (!ddCodec) {
            mediaObject.ext = (_a47 = mediaObject.ext) == null ? void 0 : _a47.filter((extmap) => extmap.uri !== "https://aomediacodec.github.io/av1-rtp-spec/#dependency-descriptor-rtp-header-extension");
          }
          if (reuseMid) {
            this.replaceMediaSection(mediaSection, reuseMid);
          } else if (!this._midToIndex.has(mediaSection.mid)) {
            this.addMediaSection(mediaSection);
          } else {
            this.replaceMediaSection(mediaSection);
          }
        }
        receive({ mid, kind, offerRtpParameters, streamId, trackId }) {
          this.setSessionExtmapAllowMixed();
          const mediaSection = new MediaSection_1.OfferMediaSection({
            iceParameters: this._iceParameters,
            iceCandidates: this._iceCandidates,
            dtlsParameters: this._dtlsParameters,
            plainRtpParameters: this._plainRtpParameters,
            mid,
            kind,
            offerRtpParameters,
            streamId,
            trackId
          });
          const oldMediaSection = this._mediaSections.find((m) => m.closed && m.getObject().type === kind);
          if (oldMediaSection) {
            this.replaceMediaSection(mediaSection, oldMediaSection.mid);
          } else {
            this.addMediaSection(mediaSection);
          }
        }
        pauseMediaSection(mid) {
          const mediaSection = this.findMediaSection(mid);
          mediaSection.pause();
        }
        resumeSendingMediaSection(mid) {
          const mediaSection = this.findMediaSection(mid);
          mediaSection.resume();
        }
        resumeReceivingMediaSection(mid) {
          const mediaSection = this.findMediaSection(mid);
          mediaSection.resume();
        }
        disableMediaSection(mid) {
          const mediaSection = this.findMediaSection(mid);
          mediaSection.disable();
        }
        /**
         * Closes media section. Returns true if the given MID corresponds to a m
         * section that has been indeed closed. False otherwise.
         *
         * NOTE: Closing the first m section is a pain since it invalidates the bundled
         * transport, so instead closing it we just disable it.
         */
        closeMediaSection(mid) {
          const mediaSection = this.findMediaSection(mid);
          if (mid === this._firstMid) {
            logger.debug("closeMediaSection() | cannot close first media section, disabling it instead [mid:%s]", mid);
            this.disableMediaSection(mid);
            return false;
          }
          mediaSection.close();
          this.regenerateBundleMids();
          return true;
        }
        muxMediaSectionSimulcast(mid, encodings) {
          const mediaSection = this.findMediaSection(mid);
          mediaSection.muxSimulcastStreams(encodings);
          this.replaceMediaSection(mediaSection);
        }
        sendSctpAssociation({ offerMediaObject }) {
          const mediaSection = new MediaSection_1.AnswerMediaSection({
            iceParameters: this._iceParameters,
            iceCandidates: this._iceCandidates,
            dtlsParameters: this._dtlsParameters,
            sctpParameters: this._sctpParameters,
            plainRtpParameters: this._plainRtpParameters,
            offerMediaObject
          });
          this.addMediaSection(mediaSection);
        }
        receiveSctpAssociation() {
          const mediaSection = new MediaSection_1.OfferMediaSection({
            iceParameters: this._iceParameters,
            iceCandidates: this._iceCandidates,
            dtlsParameters: this._dtlsParameters,
            sctpParameters: this._sctpParameters,
            plainRtpParameters: this._plainRtpParameters,
            mid: "datachannel",
            kind: "application"
          });
          this.addMediaSection(mediaSection);
        }
        getSdp() {
          this._sdpObject.origin.sessionVersion++;
          return sdpTransform.write(this._sdpObject);
        }
        addMediaSection(newMediaSection) {
          if (!this._firstMid) {
            this._firstMid = newMediaSection.mid;
          }
          this._mediaSections.push(newMediaSection);
          this._midToIndex.set(newMediaSection.mid, this._mediaSections.length - 1);
          this._sdpObject.media.push(newMediaSection.getObject());
          this.regenerateBundleMids();
        }
        replaceMediaSection(newMediaSection, reuseMid) {
          if (typeof reuseMid === "string") {
            const idx = this._midToIndex.get(reuseMid);
            if (idx === void 0) {
              throw new Error(`no media section found for reuseMid '${reuseMid}'`);
            }
            const oldMediaSection = this._mediaSections[idx];
            this._mediaSections[idx] = newMediaSection;
            this._midToIndex.delete(oldMediaSection.mid);
            this._midToIndex.set(newMediaSection.mid, idx);
            this._sdpObject.media[idx] = newMediaSection.getObject();
            this.regenerateBundleMids();
          } else {
            const idx = this._midToIndex.get(newMediaSection.mid);
            if (idx === void 0) {
              throw new Error(`no media section found with mid '${newMediaSection.mid}'`);
            }
            this._mediaSections[idx] = newMediaSection;
            this._sdpObject.media[idx] = newMediaSection.getObject();
          }
        }
        findMediaSection(mid) {
          const idx = this._midToIndex.get(mid);
          if (idx === void 0) {
            throw new Error(`no media section found with mid '${mid}'`);
          }
          return this._mediaSections[idx];
        }
        regenerateBundleMids() {
          if (!this._dtlsParameters) {
            return;
          }
          this._sdpObject.groups[0].mids = this._mediaSections.filter((mediaSection) => !mediaSection.closed).map((mediaSection) => mediaSection.mid).join(" ");
        }
      };
      exports.RemoteSdp = RemoteSdp;
    }
  });

  // node_modules/mediasoup-client/lib/handlers/sdp/commonUtils.js
  var require_commonUtils = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/sdp/commonUtils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.extractRtpCapabilities = extractRtpCapabilities;
      exports.extractDtlsParameters = extractDtlsParameters;
      exports.getCname = getCname;
      exports.applyCodecParameters = applyCodecParameters;
      exports.addHeaderExtension = addHeaderExtension;
      var sdpTransform = require_lib3();
      function extractRtpCapabilities({ sdpObject }) {
        const codecsMap = /* @__PURE__ */ new Map();
        const headerExtensionMap = /* @__PURE__ */ new Map();
        for (const m of sdpObject.media) {
          const kind = m.type;
          switch (kind) {
            case "audio":
            case "video": {
              break;
            }
            default: {
              continue;
            }
          }
          for (const rtp of m.rtp) {
            const codec = {
              kind,
              mimeType: `${kind}/${rtp.codec}`,
              preferredPayloadType: rtp.payload,
              clockRate: rtp.rate,
              channels: rtp.encoding,
              parameters: {},
              rtcpFeedback: []
            };
            codecsMap.set(codec.preferredPayloadType, codec);
          }
          for (const fmtp of m.fmtp ?? []) {
            const parameters = sdpTransform.parseParams(fmtp.config);
            const codec = codecsMap.get(fmtp.payload);
            if (!codec) {
              continue;
            }
            if (parameters == null ? void 0 : parameters.hasOwnProperty("profile-level-id")) {
              parameters["profile-level-id"] = String(parameters["profile-level-id"]);
            }
            codec.parameters = parameters;
          }
          for (const fb of m.rtcpFb ?? []) {
            const feedback = {
              type: fb.type,
              parameter: fb.subtype
            };
            if (!feedback.parameter) {
              delete feedback.parameter;
            }
            if (fb.payload !== "*") {
              const codec = codecsMap.get(Number(fb.payload));
              if (!codec) {
                continue;
              }
              codec.rtcpFeedback.push(feedback);
            } else {
              for (const codec of codecsMap.values()) {
                if (codec.kind === kind && !/.+\/rtx$/i.test(codec.mimeType)) {
                  codec.rtcpFeedback.push(feedback);
                }
              }
            }
          }
          for (const ext of m.ext ?? []) {
            if (ext["encrypt-uri"]) {
              continue;
            }
            const headerExtension = {
              kind,
              uri: ext.uri,
              preferredId: ext.value
            };
            headerExtensionMap.set(headerExtension.preferredId, headerExtension);
          }
        }
        const rtpCapabilities = {
          codecs: Array.from(codecsMap.values()),
          headerExtensions: Array.from(headerExtensionMap.values())
        };
        return rtpCapabilities;
      }
      function extractDtlsParameters({ sdpObject }) {
        let setup = sdpObject.setup;
        let fingerprint = sdpObject.fingerprint;
        if (!setup || !fingerprint) {
          const mediaObject = (sdpObject.media ?? []).find((m) => m.port !== 0);
          if (mediaObject) {
            setup = setup ?? mediaObject.setup;
            fingerprint = fingerprint ?? mediaObject.fingerprint;
          }
        }
        if (!setup) {
          throw new Error("no a=setup found at SDP session or media level");
        } else if (!fingerprint) {
          throw new Error("no a=fingerprint found at SDP session or media level");
        }
        let role;
        switch (setup) {
          case "active": {
            role = "client";
            break;
          }
          case "passive": {
            role = "server";
            break;
          }
          case "actpass": {
            role = "auto";
            break;
          }
        }
        const dtlsParameters = {
          role,
          fingerprints: [
            {
              algorithm: fingerprint.type,
              value: fingerprint.hash
            }
          ]
        };
        return dtlsParameters;
      }
      function getCname({ offerMediaObject }) {
        const ssrcCnameLine = (offerMediaObject.ssrcs ?? []).find((line) => line.attribute === "cname");
        if (!ssrcCnameLine) {
          return "";
        }
        return ssrcCnameLine.value;
      }
      function applyCodecParameters({ offerRtpParameters, answerMediaObject }) {
        var _a47;
        for (const codec of offerRtpParameters.codecs) {
          const mimeType = codec.mimeType.toLowerCase();
          if (mimeType !== "audio/opus") {
            continue;
          }
          const rtp = (answerMediaObject.rtp ?? []).find((r) => r.payload === codec.payloadType);
          if (!rtp) {
            continue;
          }
          answerMediaObject.fmtp = answerMediaObject.fmtp ?? [];
          let fmtp = answerMediaObject.fmtp.find((f) => f.payload === codec.payloadType);
          if (!fmtp) {
            fmtp = { payload: codec.payloadType, config: "" };
            answerMediaObject.fmtp.push(fmtp);
          }
          const parameters = sdpTransform.parseParams(fmtp.config);
          switch (mimeType) {
            case "audio/opus": {
              const spropStereo = (_a47 = codec.parameters) == null ? void 0 : _a47["sprop-stereo"];
              if (spropStereo !== void 0) {
                parameters["stereo"] = Number(spropStereo) ? 1 : 0;
              }
              break;
            }
          }
          fmtp.config = "";
          for (const key of Object.keys(parameters)) {
            if (fmtp.config) {
              fmtp.config += ";";
            }
            fmtp.config += `${key}=${parameters[key]}`;
          }
        }
      }
      function addHeaderExtension({ offerMediaObject, headerExtensionUri, headerExtensionId }) {
        if (!offerMediaObject.ext) {
          offerMediaObject.ext = [];
        }
        offerMediaObject.ext.push({
          uri: headerExtensionUri,
          value: headerExtensionId
        });
      }
    }
  });

  // node_modules/mediasoup-client/lib/handlers/sdp/unifiedPlanUtils.js
  var require_unifiedPlanUtils = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/sdp/unifiedPlanUtils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.getRtpEncodings = getRtpEncodings;
      exports.addLegacySimulcast = addLegacySimulcast;
      function getRtpEncodings({ offerMediaObject, codecs }) {
        const ssrcs = /* @__PURE__ */ new Set();
        for (const line of offerMediaObject.ssrcs ?? []) {
          const ssrc = line.id;
          if (ssrc) {
            ssrcs.add(ssrc);
          }
        }
        if (ssrcs.size === 0) {
          throw new Error("no a=ssrc lines found");
        }
        const ssrcToRtxSsrc = /* @__PURE__ */ new Map();
        for (const line of offerMediaObject.ssrcGroups ?? []) {
          if (line.semantics !== "FID") {
            continue;
          }
          const ssrcsStr = line.ssrcs.split(/\s+/);
          const ssrc = Number(ssrcsStr[0]);
          const rtxSsrc = Number(ssrcsStr[1]);
          if (ssrcs.has(ssrc)) {
            ssrcs.delete(ssrc);
            ssrcs.delete(rtxSsrc);
            ssrcToRtxSsrc.set(ssrc, rtxSsrc);
          }
        }
        for (const ssrc of ssrcs) {
          ssrcToRtxSsrc.set(ssrc, void 0);
        }
        const encodings = [];
        for (const [ssrc, rtxSsrc] of ssrcToRtxSsrc) {
          const encoding = { ssrc };
          if (rtxSsrc && codecs.length > 1) {
            encoding.rtx = { ssrc: rtxSsrc };
          }
          encodings.push(encoding);
        }
        return encodings;
      }
      function addLegacySimulcast({ offerMediaObject, numStreams }) {
        if (numStreams <= 1) {
          throw new TypeError("numStreams must be greater than 1");
        }
        const ssrcMsidLine = (offerMediaObject.ssrcs ?? []).find((line) => line.attribute === "msid");
        if (!ssrcMsidLine) {
          throw new Error("a=ssrc line with msid information not found");
        }
        const [streamId, trackId] = ssrcMsidLine.value.split(" ");
        const firstSsrc = Number(ssrcMsidLine.id);
        let firstRtxSsrc;
        (offerMediaObject.ssrcGroups ?? []).some((line) => {
          if (line.semantics !== "FID") {
            return false;
          }
          const ssrcs2 = line.ssrcs.split(/\s+/);
          if (Number(ssrcs2[0]) === firstSsrc) {
            firstRtxSsrc = Number(ssrcs2[1]);
            return true;
          } else {
            return false;
          }
        });
        const ssrcCnameLine = (offerMediaObject.ssrcs ?? []).find((line) => line.attribute === "cname");
        if (!ssrcCnameLine) {
          throw new Error("a=ssrc line with cname information not found");
        }
        const cname = ssrcCnameLine.value;
        const ssrcs = [];
        const rtxSsrcs = [];
        for (let i = 0; i < numStreams; ++i) {
          ssrcs.push(firstSsrc + i);
          if (firstRtxSsrc) {
            rtxSsrcs.push(firstRtxSsrc + i);
          }
        }
        offerMediaObject.ssrcGroups = [];
        offerMediaObject.ssrcs = [];
        offerMediaObject.ssrcGroups.push({
          semantics: "SIM",
          ssrcs: ssrcs.join(" ")
        });
        for (const ssrc of ssrcs) {
          offerMediaObject.ssrcs.push({
            id: ssrc,
            attribute: "cname",
            value: cname
          });
          offerMediaObject.ssrcs.push({
            id: ssrc,
            attribute: "msid",
            value: `${streamId} ${trackId}`
          });
        }
        for (let i = 0; i < rtxSsrcs.length; ++i) {
          const ssrc = ssrcs[i];
          const rtxSsrc = rtxSsrcs[i];
          offerMediaObject.ssrcs.push({
            id: rtxSsrc,
            attribute: "cname",
            value: cname
          });
          offerMediaObject.ssrcs.push({
            id: rtxSsrc,
            attribute: "msid",
            value: `${streamId} ${trackId}`
          });
          offerMediaObject.ssrcGroups.push({
            semantics: "FID",
            ssrcs: `${ssrc} ${rtxSsrc}`
          });
        }
      }
    }
  });

  // node_modules/mediasoup-client/lib/handlers/ortc/utils.js
  var require_utils2 = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/ortc/utils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.addNackSupportForOpus = addNackSupportForOpus;
      exports.addHeaderExtensionSupport = addHeaderExtensionSupport;
      exports.getMsidStreamIdAndTrackId = getMsidStreamIdAndTrackId;
      function addNackSupportForOpus(rtpCapabilities) {
        var _a47;
        for (const codec of rtpCapabilities.codecs ?? []) {
          if ((codec.mimeType.toLowerCase() === "audio/opus" || codec.mimeType.toLowerCase() === "audio/multiopus") && !((_a47 = codec.rtcpFeedback) == null ? void 0 : _a47.some((fb) => fb.type === "nack" && !fb.parameter))) {
            if (!codec.rtcpFeedback) {
              codec.rtcpFeedback = [];
            }
            codec.rtcpFeedback.push({ type: "nack" });
          }
        }
      }
      function addHeaderExtensionSupport(rtpCapabilities, headerExtension) {
        var _a47;
        let preferredId;
        const existingHeaderExtension = (_a47 = rtpCapabilities.headerExtensions) == null ? void 0 : _a47.find((exten) => exten.uri === headerExtension.uri);
        if (existingHeaderExtension) {
          if (existingHeaderExtension.kind === headerExtension.kind) {
            return;
          } else {
            preferredId = existingHeaderExtension.preferredId;
          }
        }
        if (!rtpCapabilities.headerExtensions) {
          rtpCapabilities.headerExtensions = [];
        }
        if (preferredId === void 0) {
          preferredId = 1;
          const setPreferredIds = new Set(rtpCapabilities.headerExtensions.map((exten) => exten.preferredId));
          while (setPreferredIds.has(preferredId)) {
            ++preferredId;
          }
        }
        const newHeaderExtension = {
          kind: headerExtension.kind,
          uri: headerExtension.uri,
          preferredId,
          preferredEncrypt: false,
          direction: headerExtension.direction
        };
        rtpCapabilities.headerExtensions.push(newHeaderExtension);
      }
      function getMsidStreamIdAndTrackId(msid) {
        if (!msid || typeof msid !== "string") {
          return { msidStreamId: void 0, msidTrackId: void 0 };
        }
        const [msidStreamId, msidTrackId] = msid.trim().split(/\s+/);
        if (!msidStreamId) {
          return { msidStreamId: void 0, msidTrackId: void 0 };
        }
        return { msidStreamId, msidTrackId };
      }
    }
  });

  // node_modules/mediasoup-client/lib/handlers/Chrome111.js
  var require_Chrome111 = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/Chrome111.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Chrome111 = void 0;
      var sdpTransform = require_lib3();
      var enhancedEvents_1 = require_enhancedEvents();
      var Logger_1 = require_Logger();
      var ortc = require_ortc();
      var errors_1 = require_errors();
      var scalabilityModes_1 = require_scalabilityModes();
      var RemoteSdp_1 = require_RemoteSdp();
      var sdpCommonUtils = require_commonUtils();
      var sdpUnifiedPlanUtils = require_unifiedPlanUtils();
      var ortcUtils = require_utils2();
      var logger = new Logger_1.Logger("Chrome111");
      var NAME = "Chrome111";
      var SCTP_NUM_STREAMS = { OS: 65535, MIS: 65535 };
      var Chrome111 = class _Chrome111 extends enhancedEvents_1.EnhancedEventEmitter {
        // Closed flag.
        _closed = false;
        // Handler direction.
        _direction;
        // Remote SDP handler.
        _remoteSdp;
        // Callback to request sending extended RTP capabilities on demand.
        _getSendExtendedRtpCapabilities;
        // Initial server side DTLS role. If not 'auto', it will force the opposite
        // value in client side.
        _forcedLocalDtlsRole;
        // RTCPeerConnection instance.
        _pc;
        // Map of RTCTransceivers indexed by MID.
        _mapMidTransceiver = /* @__PURE__ */ new Map();
        // Default local stream for sending if no `streamId` is given in send().
        _sendStream = new MediaStream();
        // Whether a DataChannel m=application section has been created.
        _hasDataChannelMediaSection = false;
        // Sending DataChannel id value counter. Incremented for each new DataChannel.
        _nextSendSctpStreamId = 0;
        // Got transport local and remote parameters.
        _transportReady = false;
        /**
         * Creates a factory function.
         */
        static createFactory() {
          return {
            name: NAME,
            factory: (options) => new _Chrome111(options),
            getNativeRtpCapabilities: async ({ direction }) => {
              logger.debug("getNativeRtpCapabilities() [direction:%o]", direction);
              let pc = new RTCPeerConnection({
                iceServers: [],
                iceTransportPolicy: "all",
                bundlePolicy: "max-bundle",
                rtcpMuxPolicy: "require"
              });
              try {
                pc.addTransceiver("audio", { direction });
                pc.addTransceiver("video", {
                  direction,
                  sendEncodings: [{ scalabilityMode: "L3T3" }]
                });
                const offer = await pc.createOffer();
                try {
                  pc.close();
                } catch (error) {
                }
                pc = void 0;
                const sdpObject = sdpTransform.parse(offer.sdp);
                const nativeRtpCapabilities = _Chrome111.getLocalRtpCapabilities(sdpObject);
                return nativeRtpCapabilities;
              } catch (error) {
                try {
                  pc == null ? void 0 : pc.close();
                } catch (error2) {
                }
                pc = void 0;
                throw error;
              }
            },
            getNativeSctpCapabilities: async () => {
              logger.debug("getNativeSctpCapabilities()");
              return {
                numStreams: SCTP_NUM_STREAMS
              };
            }
          };
        }
        static getLocalRtpCapabilities(localSdpObject, extraHeaderExtensions = []) {
          const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities({
            sdpObject: localSdpObject
          });
          ortc.validateAndNormalizeRtpCapabilities(nativeRtpCapabilities);
          ortcUtils.addNackSupportForOpus(nativeRtpCapabilities);
          for (const headerExtension of extraHeaderExtensions) {
            ortcUtils.addHeaderExtensionSupport(nativeRtpCapabilities, headerExtension);
          }
          return nativeRtpCapabilities;
        }
        constructor({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, getSendExtendedRtpCapabilities }) {
          super();
          logger.debug("constructor()");
          this._direction = direction;
          this._remoteSdp = new RemoteSdp_1.RemoteSdp({
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters
          });
          this._getSendExtendedRtpCapabilities = getSendExtendedRtpCapabilities;
          if (dtlsParameters.role && dtlsParameters.role !== "auto") {
            this._forcedLocalDtlsRole = dtlsParameters.role === "server" ? "client" : "server";
          }
          this._pc = new RTCPeerConnection({
            iceServers: iceServers ?? [],
            iceTransportPolicy: iceTransportPolicy ?? "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            ...additionalSettings
          });
          this._pc.addEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.addEventListener("icecandidateerror", this.onIceCandidateError);
          if (this._pc.connectionState) {
            this._pc.addEventListener("connectionstatechange", this.onConnectionStateChange);
          } else {
            logger.warn("run() | pc.connectionState not supported, using pc.iceConnectionState");
            this._pc.addEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          }
        }
        get name() {
          return NAME;
        }
        close() {
          logger.debug("close()");
          if (this._closed) {
            return;
          }
          this._closed = true;
          try {
            this._pc.close();
          } catch (error) {
          }
          this._pc.removeEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.removeEventListener("icecandidateerror", this.onIceCandidateError);
          this._pc.removeEventListener("connectionstatechange", this.onConnectionStateChange);
          this._pc.removeEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          this.emit("@close");
          super.close();
        }
        async updateIceServers(iceServers) {
          this.assertNotClosed();
          logger.debug("updateIceServers()");
          const configuration = this._pc.getConfiguration();
          configuration.iceServers = iceServers;
          this._pc.setConfiguration(configuration);
        }
        async restartIce(iceParameters) {
          this.assertNotClosed();
          logger.debug("restartIce()");
          this._remoteSdp.updateIceParameters(iceParameters);
          if (!this._transportReady) {
            return;
          }
          if (this._direction === "send") {
            const offer = await this._pc.createOffer({ iceRestart: true });
            logger.debug("restartIce() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
          } else {
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            logger.debug("restartIce() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
          }
        }
        async getTransportStats() {
          this.assertNotClosed();
          return this._pc.getStats();
        }
        async send({ track, streamId, encodings, codecOptions, headerExtensionOptions, codec, onRtpSender }) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("send() [kind:%s, track.id:%s, streamId:%s]", track.kind, track.id, streamId);
          if (encodings && encodings.length > 1) {
            let maxTemporalLayers = 1;
            for (const encoding of encodings) {
              const temporalLayers = encoding.scalabilityMode ? (0, scalabilityModes_1.parse)(encoding.scalabilityMode).temporalLayers : 3;
              if (temporalLayers > maxTemporalLayers) {
                maxTemporalLayers = temporalLayers;
              }
            }
            encodings.forEach((encoding, idx) => {
              encoding.rid = `r${idx}`;
              encoding.scalabilityMode = `L1T${maxTemporalLayers}`;
            });
          }
          const mediaSectionIdx = this._remoteSdp.getNextMediaSectionIdx();
          const transceiver = this._pc.addTransceiver(track, {
            direction: "sendonly",
            streams: [this._sendStream],
            sendEncodings: encodings
          });
          if (onRtpSender) {
            onRtpSender(transceiver.sender);
          }
          let offer = await this._pc.createOffer();
          let localSdpObject = sdpTransform.parse(offer.sdp);
          if (localSdpObject.extmapAllowMixed) {
            this._remoteSdp.setSessionExtmapAllowMixed();
          }
          const extraHeaderExtensions = [];
          extraHeaderExtensions.push({
            uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time",
            kind: track.kind,
            direction: "sendonly"
          });
          const nativeRtpCapabilities = _Chrome111.getLocalRtpCapabilities(localSdpObject, extraHeaderExtensions);
          const sendExtendedRtpCapabilities = this._getSendExtendedRtpCapabilities(nativeRtpCapabilities);
          const sendingRtpParameters = ortc.getSendingRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs, codec);
          const sendingRemoteRtpParameters = ortc.getSendingRemoteRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(sendingRemoteRtpParameters.codecs, codec);
          if (!this._transportReady) {
            await this.setupTransport({
              localDtlsRole: this._forcedLocalDtlsRole ?? "client",
              localSdpObject
            });
          }
          if (headerExtensionOptions == null ? void 0 : headerExtensionOptions.absCaptureTime) {
            const offerMediaObject2 = localSdpObject.media[mediaSectionIdx.idx];
            sdpCommonUtils.addHeaderExtension({
              offerMediaObject: offerMediaObject2,
              headerExtensionUri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time",
              headerExtensionId: sendingRemoteRtpParameters.headerExtensions.find((headerExtension) => headerExtension.uri === "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time").id
            });
            offer = {
              type: "offer",
              sdp: sdpTransform.write(localSdpObject)
            };
          }
          logger.debug("send() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const localId = transceiver.mid;
          sendingRtpParameters.mid = localId;
          localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          const offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
          sendingRtpParameters.rtcp.cname = sdpCommonUtils.getCname({
            offerMediaObject
          });
          sendingRtpParameters.msid = `${streamId ?? this._sendStream.id} ${track.id}`;
          if (!encodings) {
            sendingRtpParameters.encodings = sdpUnifiedPlanUtils.getRtpEncodings({
              offerMediaObject,
              codecs: sendingRtpParameters.codecs
            });
          } else if (encodings.length === 1) {
            const newEncodings = sdpUnifiedPlanUtils.getRtpEncodings({
              offerMediaObject,
              codecs: sendingRtpParameters.codecs
            });
            Object.assign(newEncodings[0], encodings[0]);
            sendingRtpParameters.encodings = newEncodings;
          } else {
            sendingRtpParameters.encodings = encodings;
          }
          this._remoteSdp.send({
            offerMediaObject,
            reuseMid: mediaSectionIdx.reuseMid,
            offerRtpParameters: sendingRtpParameters,
            answerRtpParameters: sendingRemoteRtpParameters,
            codecOptions
          });
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("send() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.set(localId, transceiver);
          return {
            localId,
            rtpParameters: sendingRtpParameters,
            rtpSender: transceiver.sender
          };
        }
        async stopSending(localId) {
          this.assertSendDirection();
          logger.debug("stopSending() [localId:%s]", localId);
          if (this._closed) {
            return;
          }
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          void transceiver.sender.replaceTrack(null);
          this._pc.removeTrack(transceiver.sender);
          const mediaSectionClosed = this._remoteSdp.closeMediaSection(transceiver.mid);
          if (mediaSectionClosed) {
            try {
              transceiver.stop();
            } catch (error) {
            }
          }
          const offer = await this._pc.createOffer();
          logger.debug("stopSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.delete(localId);
        }
        async pauseSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("pauseSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "inactive";
          this._remoteSdp.pauseMediaSection(localId);
          const offer = await this._pc.createOffer();
          logger.debug("pauseSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async resumeSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("resumeSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          this._remoteSdp.resumeSendingMediaSection(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "sendonly";
          const offer = await this._pc.createOffer();
          logger.debug("resumeSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async replaceTrack(localId, track) {
          this.assertNotClosed();
          this.assertSendDirection();
          if (track) {
            logger.debug("replaceTrack() [localId:%s, track.id:%s]", localId, track.id);
          } else {
            logger.debug("replaceTrack() [localId:%s, no track]", localId);
          }
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          await transceiver.sender.replaceTrack(track);
        }
        async setMaxSpatialLayer(localId, spatialLayer) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setMaxSpatialLayer() [localId:%s, spatialLayer:%s]", localId, spatialLayer);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            if (idx <= spatialLayer) {
              encoding.active = true;
            } else {
              encoding.active = false;
            }
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setMaxSpatialLayer() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setMaxSpatialLayer() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async setRtpEncodingParameters(localId, params) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setRtpEncodingParameters() [localId:%s, params:%o]", localId, params);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            parameters.encodings[idx] = { ...encoding, ...params };
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setRtpEncodingParameters() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setRtpEncodingParameters() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async getSenderStats(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.sender.getStats();
        }
        async sendDataChannel({ sctpStreamParameters }) {
          this.assertNotClosed();
          this.assertSendDirection();
          const options = {
            negotiated: true,
            id: this._nextSendSctpStreamId,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits,
            protocol: sctpStreamParameters.protocol
          };
          logger.debug("sendDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(sctpStreamParameters.label, options);
          this._nextSendSctpStreamId = ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;
          if (!this._hasDataChannelMediaSection) {
            const offer = await this._pc.createOffer();
            const localSdpObject = sdpTransform.parse(offer.sdp);
            const offerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            if (!this._transportReady) {
              await this.setupTransport({
                localDtlsRole: this._forcedLocalDtlsRole ?? "client",
                localSdpObject
              });
            }
            logger.debug("sendDataChannel() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            this._remoteSdp.sendSctpAssociation({ offerMediaObject });
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          const newSctpStreamParameters = {
            streamId: options.id,
            ordered: options.ordered,
            maxPacketLifeTime: options.maxPacketLifeTime,
            maxRetransmits: options.maxRetransmits
          };
          return { dataChannel, sctpStreamParameters: newSctpStreamParameters };
        }
        async receive(optionsList) {
          var _a47;
          this.assertNotClosed();
          this.assertRecvDirection();
          const results = [];
          const mapLocalId = /* @__PURE__ */ new Map();
          for (const options of optionsList) {
            const { trackId, kind, rtpParameters, streamId } = options;
            logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);
            const localId = rtpParameters.mid ?? String(this._mapMidTransceiver.size);
            mapLocalId.set(trackId, localId);
            const { msidStreamId } = ortcUtils.getMsidStreamIdAndTrackId(rtpParameters.msid);
            this._remoteSdp.receive({
              mid: localId,
              kind,
              offerRtpParameters: rtpParameters,
              streamId: streamId ?? msidStreamId ?? ((_a47 = rtpParameters.rtcp) == null ? void 0 : _a47.cname) ?? "-",
              trackId
            });
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("receive() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          for (const options of optionsList) {
            const { trackId, onRtpReceiver } = options;
            if (onRtpReceiver) {
              const localId = mapLocalId.get(trackId);
              const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
              if (!transceiver) {
                throw new Error("transceiver not found");
              }
              onRtpReceiver(transceiver.receiver);
            }
          }
          let answer = await this._pc.createAnswer();
          const localSdpObject = sdpTransform.parse(answer.sdp);
          for (const options of optionsList) {
            const { trackId, rtpParameters } = options;
            const localId = mapLocalId.get(trackId);
            const answerMediaObject = localSdpObject.media.find((m) => String(m.mid) === localId);
            sdpCommonUtils.applyCodecParameters({
              offerRtpParameters: rtpParameters,
              answerMediaObject
            });
          }
          answer = {
            type: "answer",
            sdp: sdpTransform.write(localSdpObject)
          };
          if (!this._transportReady) {
            await this.setupTransport({
              localDtlsRole: this._forcedLocalDtlsRole ?? "client",
              localSdpObject
            });
          }
          logger.debug("receive() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const options of optionsList) {
            const { trackId } = options;
            const localId = mapLocalId.get(trackId);
            const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
            if (!transceiver) {
              throw new Error("new RTCRtpTransceiver not found");
            } else {
              this._mapMidTransceiver.set(localId, transceiver);
              results.push({
                localId,
                track: transceiver.receiver.track,
                rtpReceiver: transceiver.receiver
              });
            }
          }
          return results;
        }
        async stopReceiving(localIds) {
          this.assertRecvDirection();
          if (this._closed) {
            return;
          }
          for (const localId of localIds) {
            logger.debug("stopReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            this._remoteSdp.closeMediaSection(transceiver.mid);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("stopReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const localId of localIds) {
            this._mapMidTransceiver.delete(localId);
          }
        }
        async pauseReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("pauseReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "inactive";
            this._remoteSdp.pauseMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("pauseReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async resumeReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("resumeReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "recvonly";
            this._remoteSdp.resumeReceivingMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("resumeReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async getReceiverStats(localId) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.receiver.getStats();
        }
        async receiveDataChannel({ maxMessageSize, sctpStreamParameters, label, protocol }) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const { streamId, ordered, maxPacketLifeTime, maxRetransmits } = sctpStreamParameters;
          const options = {
            negotiated: true,
            id: streamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol
          };
          logger.debug("receiveDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(label, options);
          if (!this._hasDataChannelMediaSection) {
            this._remoteSdp.receiveSctpAssociation();
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            let answer = await this._pc.createAnswer();
            const localSdpObject = sdpTransform.parse(answer.sdp);
            const answerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            answerMediaObject.maxMessageSize = maxMessageSize;
            if (!this._transportReady) {
              await this.setupTransport({
                localDtlsRole: this._forcedLocalDtlsRole ?? "client",
                localSdpObject
              });
            }
            answer = {
              type: "answer",
              sdp: sdpTransform.write(localSdpObject)
            };
            logger.debug("receiveDataChannel() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          return { dataChannel };
        }
        getDataChannelMaxMessageSize() {
          var _a47;
          return (_a47 = this._pc.sctp) == null ? void 0 : _a47.maxMessageSize;
        }
        async setupTransport({ localDtlsRole, localSdpObject }) {
          if (!localSdpObject) {
            localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          }
          const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
            sdpObject: localSdpObject
          });
          dtlsParameters.role = localDtlsRole;
          this._remoteSdp.updateDtlsRole(localDtlsRole === "client" ? "server" : "client");
          await new Promise((resolve, reject) => {
            this.safeEmit("@connect", { dtlsParameters }, resolve, reject);
          });
          this._transportReady = true;
        }
        onIceGatheringStateChange = () => {
          this.emit("@icegatheringstatechange", this._pc.iceGatheringState);
        };
        onIceCandidateError = (event) => {
          this.emit("@icecandidateerror", event);
        };
        onConnectionStateChange = () => {
          this.emit("@connectionstatechange", this._pc.connectionState);
        };
        onIceConnectionStateChange = () => {
          switch (this._pc.iceConnectionState) {
            case "checking": {
              this.emit("@connectionstatechange", "connecting");
              break;
            }
            case "connected":
            case "completed": {
              this.emit("@connectionstatechange", "connected");
              break;
            }
            case "failed": {
              this.emit("@connectionstatechange", "failed");
              break;
            }
            case "disconnected": {
              this.emit("@connectionstatechange", "disconnected");
              break;
            }
            case "closed": {
              this.emit("@connectionstatechange", "closed");
              break;
            }
          }
        };
        assertNotClosed() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("method called in a closed handler");
          }
        }
        assertSendDirection() {
          if (this._direction !== "send") {
            throw new Error('method can just be called for handlers with "send" direction');
          }
        }
        assertRecvDirection() {
          if (this._direction !== "recv") {
            throw new Error('method can just be called for handlers with "recv" direction');
          }
        }
      };
      exports.Chrome111 = Chrome111;
    }
  });

  // node_modules/mediasoup-client/lib/handlers/Chrome74.js
  var require_Chrome74 = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/Chrome74.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Chrome74 = void 0;
      var sdpTransform = require_lib3();
      var Logger_1 = require_Logger();
      var enhancedEvents_1 = require_enhancedEvents();
      var ortc = require_ortc();
      var errors_1 = require_errors();
      var scalabilityModes_1 = require_scalabilityModes();
      var RemoteSdp_1 = require_RemoteSdp();
      var sdpCommonUtils = require_commonUtils();
      var sdpUnifiedPlanUtils = require_unifiedPlanUtils();
      var ortcUtils = require_utils2();
      var logger = new Logger_1.Logger("Chrome74");
      var NAME = "Chrome74";
      var SCTP_NUM_STREAMS = { OS: 1024, MIS: 1024 };
      var Chrome74 = class _Chrome74 extends enhancedEvents_1.EnhancedEventEmitter {
        // Closed flag.
        _closed = false;
        // Handler direction.
        _direction;
        // Remote SDP handler.
        _remoteSdp;
        // Callback to request sending extended RTP capabilities on demand.
        _getSendExtendedRtpCapabilities;
        // Initial server side DTLS role. If not 'auto', it will force the opposite
        // value in client side.
        _forcedLocalDtlsRole;
        // RTCPeerConnection instance.
        _pc;
        // Map of RTCTransceivers indexed by MID.
        _mapMidTransceiver = /* @__PURE__ */ new Map();
        // Default local stream for sending if no `streamId` is given in send().
        _sendStream = new MediaStream();
        // Whether a DataChannel m=application section has been created.
        _hasDataChannelMediaSection = false;
        // Sending DataChannel id value counter. Incremented for each new DataChannel.
        _nextSendSctpStreamId = 0;
        // Got transport local and remote parameters.
        _transportReady = false;
        /**
         * Creates a factory function.
         */
        static createFactory() {
          return {
            name: NAME,
            factory: (options) => new _Chrome74(options),
            getNativeRtpCapabilities: async ({ direction }) => {
              logger.debug("getNativeRtpCapabilities() [direction:%o]", direction);
              let pc = new RTCPeerConnection({
                iceServers: [],
                iceTransportPolicy: "all",
                bundlePolicy: "max-bundle",
                rtcpMuxPolicy: "require"
              });
              try {
                pc.addTransceiver("audio", { direction });
                pc.addTransceiver("video", { direction });
                const offer = await pc.createOffer();
                try {
                  pc.close();
                } catch (error) {
                }
                pc = void 0;
                const sdpObject = sdpTransform.parse(offer.sdp);
                const nativeRtpCapabilities = _Chrome74.getLocalRtpCapabilities(sdpObject);
                return nativeRtpCapabilities;
              } catch (error) {
                try {
                  pc == null ? void 0 : pc.close();
                } catch (error2) {
                }
                pc = void 0;
                throw error;
              }
            },
            getNativeSctpCapabilities: async () => {
              logger.debug("getNativeSctpCapabilities()");
              return {
                numStreams: SCTP_NUM_STREAMS
              };
            }
          };
        }
        static getLocalRtpCapabilities(localSdpObject, extraHeaderExtensions = []) {
          const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities({
            sdpObject: localSdpObject
          });
          ortc.validateAndNormalizeRtpCapabilities(nativeRtpCapabilities);
          ortcUtils.addNackSupportForOpus(nativeRtpCapabilities);
          for (const headerExtension of extraHeaderExtensions) {
            ortcUtils.addHeaderExtensionSupport(nativeRtpCapabilities, headerExtension);
          }
          return nativeRtpCapabilities;
        }
        constructor({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, getSendExtendedRtpCapabilities }) {
          super();
          logger.debug("constructor()");
          this._direction = direction;
          this._remoteSdp = new RemoteSdp_1.RemoteSdp({
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters
          });
          this._getSendExtendedRtpCapabilities = getSendExtendedRtpCapabilities;
          if (dtlsParameters.role && dtlsParameters.role !== "auto") {
            this._forcedLocalDtlsRole = dtlsParameters.role === "server" ? "client" : "server";
          }
          this._pc = new RTCPeerConnection({
            iceServers: iceServers ?? [],
            iceTransportPolicy: iceTransportPolicy ?? "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            ...additionalSettings
          });
          this._pc.addEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.addEventListener("icecandidateerror", this.onIceCandidateError);
          if (this._pc.connectionState) {
            this._pc.addEventListener("connectionstatechange", this.onConnectionStateChange);
          } else {
            logger.warn("run() | pc.connectionState not supported, using pc.iceConnectionState");
            this._pc.addEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          }
        }
        get name() {
          return NAME;
        }
        close() {
          logger.debug("close()");
          if (this._closed) {
            return;
          }
          this._closed = true;
          try {
            this._pc.close();
          } catch (error) {
          }
          this._pc.removeEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.removeEventListener("icecandidateerror", this.onIceCandidateError);
          this._pc.removeEventListener("connectionstatechange", this.onConnectionStateChange);
          this._pc.removeEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          this.emit("@close");
          super.close();
        }
        async updateIceServers(iceServers) {
          this.assertNotClosed();
          logger.debug("updateIceServers()");
          const configuration = this._pc.getConfiguration();
          configuration.iceServers = iceServers;
          this._pc.setConfiguration(configuration);
        }
        async restartIce(iceParameters) {
          this.assertNotClosed();
          logger.debug("restartIce()");
          this._remoteSdp.updateIceParameters(iceParameters);
          if (!this._transportReady) {
            return;
          }
          if (this._direction === "send") {
            const offer = await this._pc.createOffer({ iceRestart: true });
            logger.debug("restartIce() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
          } else {
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            logger.debug("restartIce() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
          }
        }
        async getTransportStats() {
          this.assertNotClosed();
          return this._pc.getStats();
        }
        async send({ track, streamId, encodings, codecOptions, headerExtensionOptions, codec }) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("send() [kind:%s, track.id:%s, streamId:%s]", track.kind, track.id, streamId);
          if (encodings && encodings.length > 1) {
            encodings.forEach((encoding, idx) => {
              encoding.rid = `r${idx}`;
            });
          }
          const mediaSectionIdx = this._remoteSdp.getNextMediaSectionIdx();
          const transceiver = this._pc.addTransceiver(track, {
            direction: "sendonly",
            streams: [this._sendStream],
            sendEncodings: encodings
          });
          let offer = await this._pc.createOffer();
          let localSdpObject = sdpTransform.parse(offer.sdp);
          if (localSdpObject.extmapAllowMixed) {
            this._remoteSdp.setSessionExtmapAllowMixed();
          }
          const extraHeaderExtensions = [];
          extraHeaderExtensions.push({
            uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time",
            kind: track.kind,
            direction: "sendonly"
          });
          const nativeRtpCapabilities = _Chrome74.getLocalRtpCapabilities(localSdpObject, extraHeaderExtensions);
          const sendExtendedRtpCapabilities = this._getSendExtendedRtpCapabilities(nativeRtpCapabilities);
          const sendingRtpParameters = ortc.getSendingRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs, codec);
          const sendingRemoteRtpParameters = ortc.getSendingRemoteRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(sendingRemoteRtpParameters.codecs, codec);
          if (!this._transportReady) {
            await this.setupTransport({
              localDtlsRole: this._forcedLocalDtlsRole ?? "client",
              localSdpObject
            });
          }
          let hackVp9Svc = false;
          const layers = (0, scalabilityModes_1.parse)((encodings ?? [{}])[0].scalabilityMode);
          let offerMediaObject;
          if ((encodings == null ? void 0 : encodings.length) === 1 && layers.spatialLayers > 1 && sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/vp9") {
            logger.debug("send() | enabling legacy simulcast for VP9 SVC");
            hackVp9Svc = true;
            localSdpObject = sdpTransform.parse(offer.sdp);
            offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
            sdpUnifiedPlanUtils.addLegacySimulcast({
              offerMediaObject,
              numStreams: layers.spatialLayers
            });
            offer = {
              type: "offer",
              sdp: sdpTransform.write(localSdpObject)
            };
          }
          logger.debug("send() | calling pc.setLocalDescription() [offer:%o]", offer);
          if (headerExtensionOptions == null ? void 0 : headerExtensionOptions.absCaptureTime) {
            offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
            sdpCommonUtils.addHeaderExtension({
              offerMediaObject,
              headerExtensionUri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time",
              headerExtensionId: sendingRemoteRtpParameters.headerExtensions.find((headerExtension) => headerExtension.uri === "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time").id
            });
            offer = {
              type: "offer",
              sdp: sdpTransform.write(localSdpObject)
            };
          }
          await this._pc.setLocalDescription(offer);
          const localId = transceiver.mid;
          sendingRtpParameters.mid = localId;
          localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
          sendingRtpParameters.rtcp.cname = sdpCommonUtils.getCname({
            offerMediaObject
          });
          sendingRtpParameters.msid = `${streamId ?? this._sendStream.id} ${track.id}`;
          if (!encodings) {
            sendingRtpParameters.encodings = sdpUnifiedPlanUtils.getRtpEncodings({
              offerMediaObject,
              codecs: sendingRtpParameters.codecs
            });
          } else if (encodings.length === 1) {
            let newEncodings = sdpUnifiedPlanUtils.getRtpEncodings({
              offerMediaObject,
              codecs: sendingRtpParameters.codecs
            });
            Object.assign(newEncodings[0], encodings[0]);
            if (hackVp9Svc) {
              newEncodings = [newEncodings[0]];
            }
            sendingRtpParameters.encodings = newEncodings;
          } else {
            sendingRtpParameters.encodings = encodings;
          }
          if (sendingRtpParameters.encodings.length > 1 && (sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/vp8" || sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/h264")) {
            for (const encoding of sendingRtpParameters.encodings) {
              if (encoding.scalabilityMode) {
                encoding.scalabilityMode = `L1T${layers.temporalLayers}`;
              } else {
                encoding.scalabilityMode = "L1T3";
              }
            }
          }
          this._remoteSdp.send({
            offerMediaObject,
            reuseMid: mediaSectionIdx.reuseMid,
            offerRtpParameters: sendingRtpParameters,
            answerRtpParameters: sendingRemoteRtpParameters,
            codecOptions
          });
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("send() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.set(localId, transceiver);
          return {
            localId,
            rtpParameters: sendingRtpParameters,
            rtpSender: transceiver.sender
          };
        }
        async stopSending(localId) {
          this.assertSendDirection();
          logger.debug("stopSending() [localId:%s]", localId);
          if (this._closed) {
            return;
          }
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          void transceiver.sender.replaceTrack(null);
          this._pc.removeTrack(transceiver.sender);
          const mediaSectionClosed = this._remoteSdp.closeMediaSection(transceiver.mid);
          if (mediaSectionClosed) {
            try {
              transceiver.stop();
            } catch (error) {
            }
          }
          const offer = await this._pc.createOffer();
          logger.debug("stopSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.delete(localId);
        }
        async pauseSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("pauseSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "inactive";
          this._remoteSdp.pauseMediaSection(localId);
          const offer = await this._pc.createOffer();
          logger.debug("pauseSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async resumeSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("resumeSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          this._remoteSdp.resumeSendingMediaSection(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "sendonly";
          const offer = await this._pc.createOffer();
          logger.debug("resumeSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async replaceTrack(localId, track) {
          this.assertNotClosed();
          this.assertSendDirection();
          if (track) {
            logger.debug("replaceTrack() [localId:%s, track.id:%s]", localId, track.id);
          } else {
            logger.debug("replaceTrack() [localId:%s, no track]", localId);
          }
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          await transceiver.sender.replaceTrack(track);
        }
        async setMaxSpatialLayer(localId, spatialLayer) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setMaxSpatialLayer() [localId:%s, spatialLayer:%s]", localId, spatialLayer);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            if (idx <= spatialLayer) {
              encoding.active = true;
            } else {
              encoding.active = false;
            }
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setMaxSpatialLayer() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setMaxSpatialLayer() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async setRtpEncodingParameters(localId, params) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setRtpEncodingParameters() [localId:%s, params:%o]", localId, params);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            parameters.encodings[idx] = { ...encoding, ...params };
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setRtpEncodingParameters() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setRtpEncodingParameters() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async getSenderStats(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.sender.getStats();
        }
        async sendDataChannel({ sctpStreamParameters }) {
          this.assertNotClosed();
          this.assertSendDirection();
          const options = {
            negotiated: true,
            id: this._nextSendSctpStreamId,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits,
            protocol: sctpStreamParameters.protocol
          };
          logger.debug("sendDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(sctpStreamParameters.label, options);
          this._nextSendSctpStreamId = ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;
          if (!this._hasDataChannelMediaSection) {
            const offer = await this._pc.createOffer();
            const localSdpObject = sdpTransform.parse(offer.sdp);
            const offerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            if (!this._transportReady) {
              await this.setupTransport({
                localDtlsRole: this._forcedLocalDtlsRole ?? "client",
                localSdpObject
              });
            }
            logger.debug("sendDataChannel() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            this._remoteSdp.sendSctpAssociation({ offerMediaObject });
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          const newSctpStreamParameters = {
            streamId: options.id,
            ordered: options.ordered,
            maxPacketLifeTime: options.maxPacketLifeTime,
            maxRetransmits: options.maxRetransmits
          };
          return { dataChannel, sctpStreamParameters: newSctpStreamParameters };
        }
        async receive(optionsList) {
          var _a47;
          this.assertNotClosed();
          this.assertRecvDirection();
          const results = [];
          const mapLocalId = /* @__PURE__ */ new Map();
          for (const options of optionsList) {
            const { trackId, kind, rtpParameters, streamId } = options;
            logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);
            const localId = rtpParameters.mid ?? String(this._mapMidTransceiver.size);
            mapLocalId.set(trackId, localId);
            const { msidStreamId } = ortcUtils.getMsidStreamIdAndTrackId(rtpParameters.msid);
            this._remoteSdp.receive({
              mid: localId,
              kind,
              offerRtpParameters: rtpParameters,
              streamId: streamId ?? msidStreamId ?? ((_a47 = rtpParameters.rtcp) == null ? void 0 : _a47.cname) ?? "-",
              trackId
            });
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("receive() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          let answer = await this._pc.createAnswer();
          const localSdpObject = sdpTransform.parse(answer.sdp);
          for (const options of optionsList) {
            const { trackId, rtpParameters } = options;
            const localId = mapLocalId.get(trackId);
            const answerMediaObject = localSdpObject.media.find((m) => String(m.mid) === localId);
            sdpCommonUtils.applyCodecParameters({
              offerRtpParameters: rtpParameters,
              answerMediaObject
            });
          }
          answer = {
            type: "answer",
            sdp: sdpTransform.write(localSdpObject)
          };
          if (!this._transportReady) {
            await this.setupTransport({
              localDtlsRole: this._forcedLocalDtlsRole ?? "client",
              localSdpObject
            });
          }
          logger.debug("receive() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const options of optionsList) {
            const { trackId } = options;
            const localId = mapLocalId.get(trackId);
            const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
            if (!transceiver) {
              throw new Error("new RTCRtpTransceiver not found");
            } else {
              this._mapMidTransceiver.set(localId, transceiver);
              results.push({
                localId,
                track: transceiver.receiver.track,
                rtpReceiver: transceiver.receiver
              });
            }
          }
          return results;
        }
        async stopReceiving(localIds) {
          this.assertRecvDirection();
          if (this._closed) {
            return;
          }
          for (const localId of localIds) {
            logger.debug("stopReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            this._remoteSdp.closeMediaSection(transceiver.mid);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("stopReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const localId of localIds) {
            this._mapMidTransceiver.delete(localId);
          }
        }
        async pauseReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("pauseReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "inactive";
            this._remoteSdp.pauseMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("pauseReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async resumeReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("resumeReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "recvonly";
            this._remoteSdp.resumeReceivingMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("resumeReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async getReceiverStats(localId) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.receiver.getStats();
        }
        async receiveDataChannel({ maxMessageSize, sctpStreamParameters, label, protocol }) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const { streamId, ordered, maxPacketLifeTime, maxRetransmits } = sctpStreamParameters;
          const options = {
            negotiated: true,
            id: streamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol
          };
          logger.debug("receiveDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(label, options);
          if (!this._hasDataChannelMediaSection) {
            this._remoteSdp.receiveSctpAssociation();
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            let answer = await this._pc.createAnswer();
            const localSdpObject = sdpTransform.parse(answer.sdp);
            const answerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            answerMediaObject.maxMessageSize = maxMessageSize;
            if (!this._transportReady) {
              await this.setupTransport({
                localDtlsRole: this._forcedLocalDtlsRole ?? "client",
                localSdpObject
              });
            }
            answer = {
              type: "answer",
              sdp: sdpTransform.write(localSdpObject)
            };
            logger.debug("receiveDataChannel() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          return { dataChannel };
        }
        getDataChannelMaxMessageSize() {
          var _a47;
          return (_a47 = this._pc.sctp) == null ? void 0 : _a47.maxMessageSize;
        }
        async setupTransport({ localDtlsRole, localSdpObject }) {
          if (!localSdpObject) {
            localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          }
          const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
            sdpObject: localSdpObject
          });
          dtlsParameters.role = localDtlsRole;
          this._remoteSdp.updateDtlsRole(localDtlsRole === "client" ? "server" : "client");
          await new Promise((resolve, reject) => {
            this.safeEmit("@connect", { dtlsParameters }, resolve, reject);
          });
          this._transportReady = true;
        }
        onIceGatheringStateChange = () => {
          this.emit("@icegatheringstatechange", this._pc.iceGatheringState);
        };
        onIceCandidateError = (event) => {
          this.emit("@icecandidateerror", event);
        };
        onConnectionStateChange = () => {
          this.emit("@connectionstatechange", this._pc.connectionState);
        };
        onIceConnectionStateChange = () => {
          switch (this._pc.iceConnectionState) {
            case "checking": {
              this.emit("@connectionstatechange", "connecting");
              break;
            }
            case "connected":
            case "completed": {
              this.emit("@connectionstatechange", "connected");
              break;
            }
            case "failed": {
              this.emit("@connectionstatechange", "failed");
              break;
            }
            case "disconnected": {
              this.emit("@connectionstatechange", "disconnected");
              break;
            }
            case "closed": {
              this.emit("@connectionstatechange", "closed");
              break;
            }
          }
        };
        assertNotClosed() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("method called in a closed handler");
          }
        }
        assertSendDirection() {
          if (this._direction !== "send") {
            throw new Error('method can just be called for handlers with "send" direction');
          }
        }
        assertRecvDirection() {
          if (this._direction !== "recv") {
            throw new Error('method can just be called for handlers with "recv" direction');
          }
        }
      };
      exports.Chrome74 = Chrome74;
    }
  });

  // node_modules/mediasoup-client/lib/handlers/Firefox120.js
  var require_Firefox120 = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/Firefox120.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Firefox120 = void 0;
      var sdpTransform = require_lib3();
      var enhancedEvents_1 = require_enhancedEvents();
      var Logger_1 = require_Logger();
      var errors_1 = require_errors();
      var ortc = require_ortc();
      var scalabilityModes_1 = require_scalabilityModes();
      var RemoteSdp_1 = require_RemoteSdp();
      var sdpCommonUtils = require_commonUtils();
      var sdpUnifiedPlanUtils = require_unifiedPlanUtils();
      var ortcUtils = require_utils2();
      var logger = new Logger_1.Logger("Firefox120");
      var NAME = "Firefox120";
      var SCTP_NUM_STREAMS = { OS: 16, MIS: 2048 };
      var Firefox120 = class _Firefox120 extends enhancedEvents_1.EnhancedEventEmitter {
        // Closed flag.
        _closed = false;
        // Handler direction.
        _direction;
        // Remote SDP handler.
        _remoteSdp;
        // Callback to request sending extended RTP capabilities on demand.
        _getSendExtendedRtpCapabilities;
        // RTCPeerConnection instance.
        _pc;
        // Map of RTCTransceivers indexed by MID.
        _mapMidTransceiver = /* @__PURE__ */ new Map();
        // Default local stream for sending if no `streamId` is given in send().
        _sendStream = new MediaStream();
        // Whether a DataChannel m=application section has been created.
        _hasDataChannelMediaSection = false;
        // Sending DataChannel id value counter. Incremented for each new DataChannel.
        _nextSendSctpStreamId = 0;
        // Got transport local and remote parameters.
        _transportReady = false;
        /**
         * Creates a factory function.
         */
        static createFactory() {
          return {
            name: NAME,
            factory: (options) => new _Firefox120(options),
            getNativeRtpCapabilities: async ({ direction }) => {
              logger.debug("getNativeRtpCapabilities() [direction:%o]", direction);
              let pc = new RTCPeerConnection({
                iceServers: [],
                iceTransportPolicy: "all",
                bundlePolicy: "max-bundle",
                rtcpMuxPolicy: "require"
              });
              const canvas = document.createElement("canvas");
              canvas.getContext("2d");
              const fakeStream = canvas.captureStream();
              const fakeVideoTrack = fakeStream.getVideoTracks()[0];
              try {
                pc.addTransceiver("audio", { direction });
                pc.addTransceiver(fakeVideoTrack, {
                  direction,
                  sendEncodings: [
                    { rid: "r0", maxBitrate: 1e5 },
                    { rid: "r1", maxBitrate: 5e5 }
                  ]
                });
                const offer = await pc.createOffer();
                try {
                  canvas.remove();
                } catch (error) {
                }
                try {
                  fakeVideoTrack.stop();
                } catch (error) {
                }
                try {
                  pc.close();
                } catch (error) {
                }
                pc = void 0;
                const sdpObject = sdpTransform.parse(offer.sdp);
                const nativeRtpCapabilities = _Firefox120.getLocalRtpCapabilities(sdpObject);
                return nativeRtpCapabilities;
              } catch (error) {
                try {
                  canvas.remove();
                } catch (error2) {
                }
                try {
                  fakeVideoTrack.stop();
                } catch (error2) {
                }
                try {
                  pc == null ? void 0 : pc.close();
                } catch (error2) {
                }
                pc = void 0;
                throw error;
              }
            },
            getNativeSctpCapabilities: async () => {
              logger.debug("getNativeSctpCapabilities()");
              return {
                numStreams: SCTP_NUM_STREAMS
              };
            }
          };
        }
        static getLocalRtpCapabilities(localSdpObject) {
          const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities({
            sdpObject: localSdpObject
          });
          ortc.validateAndNormalizeRtpCapabilities(nativeRtpCapabilities);
          return nativeRtpCapabilities;
        }
        constructor({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, getSendExtendedRtpCapabilities }) {
          super();
          logger.debug("constructor()");
          this._direction = direction;
          this._remoteSdp = new RemoteSdp_1.RemoteSdp({
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters
          });
          this._getSendExtendedRtpCapabilities = getSendExtendedRtpCapabilities;
          this._pc = new RTCPeerConnection({
            iceServers: iceServers ?? [],
            iceTransportPolicy: iceTransportPolicy ?? "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            ...additionalSettings
          });
          this._pc.addEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.addEventListener("icecandidateerror", this.onIceCandidateError);
          if (this._pc.connectionState) {
            this._pc.addEventListener("connectionstatechange", this.onConnectionStateChange);
          } else {
            logger.warn("run() | pc.connectionState not supported, using pc.iceConnectionState");
            this._pc.addEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          }
        }
        get name() {
          return NAME;
        }
        close() {
          logger.debug("close()");
          if (this._closed) {
            return;
          }
          this._closed = true;
          try {
            this._pc.close();
          } catch (error) {
          }
          this._pc.removeEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.removeEventListener("icecandidateerror", this.onIceCandidateError);
          this._pc.removeEventListener("connectionstatechange", this.onConnectionStateChange);
          this._pc.removeEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          this.emit("@close");
          super.close();
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async updateIceServers(iceServers) {
          this.assertNotClosed();
          throw new errors_1.UnsupportedError("not supported");
        }
        async restartIce(iceParameters) {
          this.assertNotClosed();
          logger.debug("restartIce()");
          this._remoteSdp.updateIceParameters(iceParameters);
          if (!this._transportReady) {
            return;
          }
          if (this._direction === "send") {
            const offer = await this._pc.createOffer({ iceRestart: true });
            logger.debug("restartIce() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
          } else {
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            logger.debug("restartIce() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
          }
        }
        async getTransportStats() {
          this.assertNotClosed();
          return this._pc.getStats();
        }
        async send({ track, streamId, encodings, codecOptions, codec, onRtpSender }) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("send() [kind:%s, track.id:%s, streamId:%s]", track.kind, track.id, streamId);
          if (encodings && encodings.length > 1) {
            encodings.forEach((encoding, idx) => {
              encoding.rid = `r${idx}`;
            });
          }
          const transceiver = this._pc.addTransceiver(track, {
            direction: "sendonly",
            streams: [this._sendStream],
            sendEncodings: encodings
          });
          if (onRtpSender) {
            onRtpSender(transceiver.sender);
          }
          const offer = await this._pc.createOffer();
          let localSdpObject = sdpTransform.parse(offer.sdp);
          if (localSdpObject.extmapAllowMixed) {
            this._remoteSdp.setSessionExtmapAllowMixed();
          }
          const nativeRtpCapabilities = _Firefox120.getLocalRtpCapabilities(localSdpObject);
          const sendExtendedRtpCapabilities = this._getSendExtendedRtpCapabilities(nativeRtpCapabilities);
          const sendingRtpParameters = ortc.getSendingRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs, codec);
          const sendingRemoteRtpParameters = ortc.getSendingRemoteRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(sendingRemoteRtpParameters.codecs, codec);
          if (!this._transportReady) {
            await this.setupTransport({ localDtlsRole: "client", localSdpObject });
          }
          const layers = (0, scalabilityModes_1.parse)((encodings ?? [{}])[0].scalabilityMode);
          logger.debug("send() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const localId = transceiver.mid;
          sendingRtpParameters.mid = localId;
          localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          const offerMediaObject = localSdpObject.media[localSdpObject.media.length - 1];
          sendingRtpParameters.rtcp.cname = sdpCommonUtils.getCname({
            offerMediaObject
          });
          sendingRtpParameters.msid = `${streamId ?? this._sendStream.id} ${track.id}`;
          if (!encodings) {
            sendingRtpParameters.encodings = sdpUnifiedPlanUtils.getRtpEncodings({
              offerMediaObject,
              codecs: sendingRtpParameters.codecs
            });
          } else if (encodings.length === 1) {
            const newEncodings = sdpUnifiedPlanUtils.getRtpEncodings({
              offerMediaObject,
              codecs: sendingRtpParameters.codecs
            });
            Object.assign(newEncodings[0], encodings[0]);
            sendingRtpParameters.encodings = newEncodings;
          } else {
            sendingRtpParameters.encodings = encodings;
          }
          if (sendingRtpParameters.encodings.length > 1 && (sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/vp8" || sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/h264")) {
            for (const encoding of sendingRtpParameters.encodings) {
              if (encoding.scalabilityMode) {
                encoding.scalabilityMode = `L1T${layers.temporalLayers}`;
              } else {
                encoding.scalabilityMode = "L1T3";
              }
            }
          }
          this._remoteSdp.send({
            offerMediaObject,
            offerRtpParameters: sendingRtpParameters,
            answerRtpParameters: sendingRemoteRtpParameters,
            codecOptions
          });
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("send() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.set(localId, transceiver);
          return {
            localId,
            rtpParameters: sendingRtpParameters,
            rtpSender: transceiver.sender
          };
        }
        async stopSending(localId) {
          this.assertSendDirection();
          logger.debug("stopSending() [localId:%s]", localId);
          if (this._closed) {
            return;
          }
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated transceiver not found");
          }
          void transceiver.sender.replaceTrack(null);
          this._pc.removeTrack(transceiver.sender);
          this._remoteSdp.disableMediaSection(transceiver.mid);
          const offer = await this._pc.createOffer();
          logger.debug("stopSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.delete(localId);
        }
        async pauseSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("pauseSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "inactive";
          this._remoteSdp.pauseMediaSection(localId);
          const offer = await this._pc.createOffer();
          logger.debug("pauseSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async resumeSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("resumeSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "sendonly";
          this._remoteSdp.resumeSendingMediaSection(localId);
          const offer = await this._pc.createOffer();
          logger.debug("resumeSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async replaceTrack(localId, track) {
          this.assertNotClosed();
          this.assertSendDirection();
          if (track) {
            logger.debug("replaceTrack() [localId:%s, track.id:%s]", localId, track.id);
          } else {
            logger.debug("replaceTrack() [localId:%s, no track]", localId);
          }
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          await transceiver.sender.replaceTrack(track);
        }
        async setMaxSpatialLayer(localId, spatialLayer) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setMaxSpatialLayer() [localId:%s, spatialLayer:%s]", localId, spatialLayer);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated transceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            if (idx <= spatialLayer) {
              encoding.active = true;
            } else {
              encoding.active = false;
            }
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setMaxSpatialLayer() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setMaxSpatialLayer() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async setRtpEncodingParameters(localId, params) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setRtpEncodingParameters() [localId:%s, params:%o]", localId, params);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            parameters.encodings[idx] = { ...encoding, ...params };
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setRtpEncodingParameters() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setRtpEncodingParameters() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async getSenderStats(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.sender.getStats();
        }
        async sendDataChannel({ sctpStreamParameters }) {
          this.assertNotClosed();
          this.assertSendDirection();
          const options = {
            negotiated: true,
            id: this._nextSendSctpStreamId,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits,
            protocol: sctpStreamParameters.protocol
          };
          logger.debug("sendDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(sctpStreamParameters.label, options);
          this._nextSendSctpStreamId = ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;
          if (!this._hasDataChannelMediaSection) {
            const offer = await this._pc.createOffer();
            const localSdpObject = sdpTransform.parse(offer.sdp);
            const offerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            if (!this._transportReady) {
              await this.setupTransport({ localDtlsRole: "client", localSdpObject });
            }
            logger.debug("sendDataChannel() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            this._remoteSdp.sendSctpAssociation({ offerMediaObject });
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          const newSctpStreamParameters = {
            streamId: options.id,
            ordered: options.ordered,
            maxPacketLifeTime: options.maxPacketLifeTime,
            maxRetransmits: options.maxRetransmits
          };
          return { dataChannel, sctpStreamParameters: newSctpStreamParameters };
        }
        async receive(optionsList) {
          var _a47;
          this.assertNotClosed();
          this.assertRecvDirection();
          const results = [];
          const mapLocalId = /* @__PURE__ */ new Map();
          for (const options of optionsList) {
            const { trackId, kind, rtpParameters, streamId } = options;
            logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);
            const localId = rtpParameters.mid ?? String(this._mapMidTransceiver.size);
            mapLocalId.set(trackId, localId);
            const { msidStreamId } = ortcUtils.getMsidStreamIdAndTrackId(rtpParameters.msid);
            this._remoteSdp.receive({
              mid: localId,
              kind,
              offerRtpParameters: rtpParameters,
              streamId: streamId ?? msidStreamId ?? ((_a47 = rtpParameters.rtcp) == null ? void 0 : _a47.cname) ?? "-",
              trackId
            });
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("receive() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          for (const options of optionsList) {
            const { trackId, onRtpReceiver } = options;
            if (onRtpReceiver) {
              const localId = mapLocalId.get(trackId);
              const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
              if (!transceiver) {
                throw new Error("transceiver not found");
              }
              onRtpReceiver(transceiver.receiver);
            }
          }
          let answer = await this._pc.createAnswer();
          const localSdpObject = sdpTransform.parse(answer.sdp);
          for (const options of optionsList) {
            const { trackId, rtpParameters } = options;
            const localId = mapLocalId.get(trackId);
            const answerMediaObject = localSdpObject.media.find((m) => String(m.mid) === localId);
            sdpCommonUtils.applyCodecParameters({
              offerRtpParameters: rtpParameters,
              answerMediaObject
            });
            answer = {
              type: "answer",
              sdp: sdpTransform.write(localSdpObject)
            };
          }
          if (!this._transportReady) {
            await this.setupTransport({ localDtlsRole: "client", localSdpObject });
          }
          logger.debug("receive() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const options of optionsList) {
            const { trackId } = options;
            const localId = mapLocalId.get(trackId);
            const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
            if (!transceiver) {
              throw new Error("new RTCRtpTransceiver not found");
            }
            this._mapMidTransceiver.set(localId, transceiver);
            results.push({
              localId,
              track: transceiver.receiver.track,
              rtpReceiver: transceiver.receiver
            });
          }
          return results;
        }
        async stopReceiving(localIds) {
          this.assertRecvDirection();
          if (this._closed) {
            return;
          }
          for (const localId of localIds) {
            logger.debug("stopReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            this._remoteSdp.closeMediaSection(transceiver.mid);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("stopReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const localId of localIds) {
            this._mapMidTransceiver.delete(localId);
          }
        }
        async pauseReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("pauseReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "inactive";
            this._remoteSdp.pauseMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("pauseReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async resumeReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("resumeReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "recvonly";
            this._remoteSdp.resumeReceivingMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("resumeReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async getReceiverStats(localId) {
          this.assertRecvDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.receiver.getStats();
        }
        async receiveDataChannel({ maxMessageSize, sctpStreamParameters, label, protocol }) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const { streamId, ordered, maxPacketLifeTime, maxRetransmits } = sctpStreamParameters;
          const options = {
            negotiated: true,
            id: streamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol
          };
          logger.debug("receiveDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(label, options);
          if (!this._hasDataChannelMediaSection) {
            this._remoteSdp.receiveSctpAssociation();
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            let answer = await this._pc.createAnswer();
            const localSdpObject = sdpTransform.parse(answer.sdp);
            const answerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            answerMediaObject.maxMessageSize = maxMessageSize;
            if (!this._transportReady) {
              await this.setupTransport({ localDtlsRole: "client", localSdpObject });
            }
            answer = {
              type: "answer",
              sdp: sdpTransform.write(localSdpObject)
            };
            logger.debug("receiveDataChannel() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          return { dataChannel };
        }
        getDataChannelMaxMessageSize() {
          var _a47;
          return (_a47 = this._pc.sctp) == null ? void 0 : _a47.maxMessageSize;
        }
        async setupTransport({ localDtlsRole, localSdpObject }) {
          if (!localSdpObject) {
            localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          }
          const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
            sdpObject: localSdpObject
          });
          dtlsParameters.role = localDtlsRole;
          this._remoteSdp.updateDtlsRole(localDtlsRole === "client" ? "server" : "client");
          await new Promise((resolve, reject) => {
            this.safeEmit("@connect", { dtlsParameters }, resolve, reject);
          });
          this._transportReady = true;
        }
        onIceGatheringStateChange = () => {
          this.emit("@icegatheringstatechange", this._pc.iceGatheringState);
        };
        onIceCandidateError = (event) => {
          this.emit("@icecandidateerror", event);
        };
        onConnectionStateChange = () => {
          this.emit("@connectionstatechange", this._pc.connectionState);
        };
        onIceConnectionStateChange = () => {
          switch (this._pc.iceConnectionState) {
            case "checking": {
              this.emit("@connectionstatechange", "connecting");
              break;
            }
            case "connected":
            case "completed": {
              this.emit("@connectionstatechange", "connected");
              break;
            }
            case "failed": {
              this.emit("@connectionstatechange", "failed");
              break;
            }
            case "disconnected": {
              this.emit("@connectionstatechange", "disconnected");
              break;
            }
            case "closed": {
              this.emit("@connectionstatechange", "closed");
              break;
            }
          }
        };
        assertNotClosed() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("method called in a closed handler");
          }
        }
        assertSendDirection() {
          if (this._direction !== "send") {
            throw new Error('method can just be called for handlers with "send" direction');
          }
        }
        assertRecvDirection() {
          if (this._direction !== "recv") {
            throw new Error('method can just be called for handlers with "recv" direction');
          }
        }
      };
      exports.Firefox120 = Firefox120;
    }
  });

  // node_modules/mediasoup-client/lib/handlers/Safari12.js
  var require_Safari12 = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/Safari12.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Safari12 = void 0;
      var sdpTransform = require_lib3();
      var enhancedEvents_1 = require_enhancedEvents();
      var Logger_1 = require_Logger();
      var ortc = require_ortc();
      var errors_1 = require_errors();
      var scalabilityModes_1 = require_scalabilityModes();
      var RemoteSdp_1 = require_RemoteSdp();
      var sdpCommonUtils = require_commonUtils();
      var sdpUnifiedPlanUtils = require_unifiedPlanUtils();
      var ortcUtils = require_utils2();
      var logger = new Logger_1.Logger("Safari12");
      var NAME = "Safari12";
      var SCTP_NUM_STREAMS = { OS: 65535, MIS: 65535 };
      var Safari12 = class _Safari12 extends enhancedEvents_1.EnhancedEventEmitter {
        // Closed flag.
        _closed = false;
        // Handler direction.
        _direction;
        // Remote SDP handler.
        _remoteSdp;
        // Callback to request sending extended RTP capabilities on demand.
        _getSendExtendedRtpCapabilities;
        // Initial server side DTLS role. If not 'auto', it will force the opposite
        // value in client side.
        _forcedLocalDtlsRole;
        // RTCPeerConnection instance.
        _pc;
        // Map of RTCTransceivers indexed by MID.
        _mapMidTransceiver = /* @__PURE__ */ new Map();
        // Default local stream for sending if no `streamId` is given in send().
        _sendStream = new MediaStream();
        // Whether a DataChannel m=application section has been created.
        _hasDataChannelMediaSection = false;
        // Sending DataChannel id value counter. Incremented for each new DataChannel.
        _nextSendSctpStreamId = 0;
        // Got transport local and remote parameters.
        _transportReady = false;
        /**
         * Creates a factory function.
         */
        static createFactory() {
          return {
            name: NAME,
            factory: (options) => new _Safari12(options),
            getNativeRtpCapabilities: async ({ direction }) => {
              logger.debug("getNativeRtpCapabilities() [direction:%o]", direction);
              let pc = new RTCPeerConnection({
                iceServers: [],
                iceTransportPolicy: "all",
                bundlePolicy: "max-bundle",
                rtcpMuxPolicy: "require"
              });
              try {
                pc.addTransceiver("audio", { direction });
                pc.addTransceiver("video", { direction });
                const offer = await pc.createOffer();
                try {
                  pc.close();
                } catch (error) {
                }
                pc = void 0;
                const sdpObject = sdpTransform.parse(offer.sdp);
                const nativeRtpCapabilities = _Safari12.getLocalRtpCapabilities(sdpObject);
                return nativeRtpCapabilities;
              } catch (error) {
                try {
                  pc == null ? void 0 : pc.close();
                } catch (error2) {
                }
                pc = void 0;
                throw error;
              }
            },
            getNativeSctpCapabilities: async () => {
              logger.debug("getNativeSctpCapabilities()");
              return {
                numStreams: SCTP_NUM_STREAMS
              };
            }
          };
        }
        static getLocalRtpCapabilities(localSdpObject, extraHeaderExtensions = []) {
          const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities({
            sdpObject: localSdpObject
          });
          ortc.validateAndNormalizeRtpCapabilities(nativeRtpCapabilities);
          ortcUtils.addNackSupportForOpus(nativeRtpCapabilities);
          for (const headerExtension of extraHeaderExtensions) {
            ortcUtils.addHeaderExtensionSupport(nativeRtpCapabilities, headerExtension);
          }
          return nativeRtpCapabilities;
        }
        constructor({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, getSendExtendedRtpCapabilities }) {
          super();
          logger.debug("constructor()");
          this._direction = direction;
          this._remoteSdp = new RemoteSdp_1.RemoteSdp({
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters
          });
          this._getSendExtendedRtpCapabilities = getSendExtendedRtpCapabilities;
          if (dtlsParameters.role && dtlsParameters.role !== "auto") {
            this._forcedLocalDtlsRole = dtlsParameters.role === "server" ? "client" : "server";
          }
          this._pc = new RTCPeerConnection({
            iceServers: iceServers ?? [],
            iceTransportPolicy: iceTransportPolicy ?? "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            ...additionalSettings
          });
          this._pc.addEventListener("icegatheringstatechange", () => {
            this.emit("@icegatheringstatechange", this._pc.iceGatheringState);
          });
          this._pc.addEventListener("icecandidateerror", (event) => {
            this.emit("@icecandidateerror", event);
          });
          this._pc.addEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.addEventListener("icecandidateerror", this.onIceCandidateError);
          if (this._pc.connectionState) {
            this._pc.addEventListener("connectionstatechange", this.onConnectionStateChange);
          } else {
            logger.warn("run() | pc.connectionState not supported, using pc.iceConnectionState");
            this._pc.addEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          }
        }
        get name() {
          return NAME;
        }
        close() {
          logger.debug("close()");
          if (this._closed) {
            return;
          }
          this._closed = true;
          try {
            this._pc.close();
          } catch (error) {
          }
          this._pc.removeEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.removeEventListener("icecandidateerror", this.onIceCandidateError);
          this._pc.removeEventListener("connectionstatechange", this.onConnectionStateChange);
          this._pc.removeEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          this.emit("@close");
          super.close();
        }
        async updateIceServers(iceServers) {
          this.assertNotClosed();
          logger.debug("updateIceServers()");
          const configuration = this._pc.getConfiguration();
          configuration.iceServers = iceServers;
          this._pc.setConfiguration(configuration);
        }
        async restartIce(iceParameters) {
          this.assertNotClosed();
          logger.debug("restartIce()");
          this._remoteSdp.updateIceParameters(iceParameters);
          if (!this._transportReady) {
            return;
          }
          if (this._direction === "send") {
            const offer = await this._pc.createOffer({ iceRestart: true });
            logger.debug("restartIce() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
          } else {
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            logger.debug("restartIce() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
          }
        }
        async getTransportStats() {
          this.assertNotClosed();
          return this._pc.getStats();
        }
        async send({ track, streamId, encodings, codecOptions, headerExtensionOptions, codec, onRtpSender }) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("send() [kind:%s, track.id:%s, streamId:%s]", track.kind, track.id, streamId);
          const mediaSectionIdx = this._remoteSdp.getNextMediaSectionIdx();
          const transceiver = this._pc.addTransceiver(track, {
            direction: "sendonly",
            streams: [this._sendStream]
          });
          if (onRtpSender) {
            onRtpSender(transceiver.sender);
          }
          let offer = await this._pc.createOffer();
          let localSdpObject = sdpTransform.parse(offer.sdp);
          if (localSdpObject.extmapAllowMixed) {
            this._remoteSdp.setSessionExtmapAllowMixed();
          }
          const extraHeaderExtensions = [];
          extraHeaderExtensions.push({
            uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time",
            kind: track.kind,
            direction: "sendonly"
          });
          const nativeRtpCapabilities = _Safari12.getLocalRtpCapabilities(localSdpObject, extraHeaderExtensions);
          const sendExtendedRtpCapabilities = this._getSendExtendedRtpCapabilities(nativeRtpCapabilities);
          const sendingRtpParameters = ortc.getSendingRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs, codec);
          const sendingRemoteRtpParameters = ortc.getSendingRemoteRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(sendingRemoteRtpParameters.codecs, codec);
          let offerMediaObject;
          if (!this._transportReady) {
            await this.setupTransport({
              localDtlsRole: this._forcedLocalDtlsRole ?? "client",
              localSdpObject
            });
          }
          const layers = (0, scalabilityModes_1.parse)((encodings ?? [{}])[0].scalabilityMode);
          if (encodings && encodings.length > 1) {
            logger.debug("send() | enabling legacy simulcast");
            localSdpObject = sdpTransform.parse(offer.sdp);
            offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
            sdpUnifiedPlanUtils.addLegacySimulcast({
              offerMediaObject,
              numStreams: encodings.length
            });
            offer = {
              type: "offer",
              sdp: sdpTransform.write(localSdpObject)
            };
          }
          if (headerExtensionOptions == null ? void 0 : headerExtensionOptions.absCaptureTime) {
            offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
            sdpCommonUtils.addHeaderExtension({
              offerMediaObject,
              headerExtensionUri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time",
              headerExtensionId: sendingRemoteRtpParameters.headerExtensions.find((headerExtension) => headerExtension.uri === "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time").id
            });
            offer = {
              type: "offer",
              sdp: sdpTransform.write(localSdpObject)
            };
          }
          logger.debug("send() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const localId = transceiver.mid;
          sendingRtpParameters.mid = localId;
          localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
          sendingRtpParameters.rtcp.cname = sdpCommonUtils.getCname({
            offerMediaObject
          });
          sendingRtpParameters.msid = `${streamId ?? this._sendStream.id} ${track.id}`;
          sendingRtpParameters.encodings = sdpUnifiedPlanUtils.getRtpEncodings({
            offerMediaObject,
            codecs: sendingRtpParameters.codecs
          });
          if (encodings) {
            for (let idx = 0; idx < sendingRtpParameters.encodings.length; ++idx) {
              if (encodings[idx]) {
                Object.assign(sendingRtpParameters.encodings[idx], encodings[idx]);
              }
            }
          }
          if (sendingRtpParameters.encodings.length > 1 && (sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/vp8" || sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/h264")) {
            for (const encoding of sendingRtpParameters.encodings) {
              if (encoding.scalabilityMode) {
                encoding.scalabilityMode = `L1T${layers.temporalLayers}`;
              } else {
                encoding.scalabilityMode = "L1T3";
              }
            }
          }
          this._remoteSdp.send({
            offerMediaObject,
            reuseMid: mediaSectionIdx.reuseMid,
            offerRtpParameters: sendingRtpParameters,
            answerRtpParameters: sendingRemoteRtpParameters,
            codecOptions
          });
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("send() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.set(localId, transceiver);
          return {
            localId,
            rtpParameters: sendingRtpParameters,
            rtpSender: transceiver.sender
          };
        }
        async stopSending(localId) {
          this.assertSendDirection();
          if (this._closed) {
            return;
          }
          logger.debug("stopSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          void transceiver.sender.replaceTrack(null);
          this._pc.removeTrack(transceiver.sender);
          const mediaSectionClosed = this._remoteSdp.closeMediaSection(transceiver.mid);
          if (mediaSectionClosed) {
            try {
              transceiver.stop();
            } catch (error) {
            }
          }
          const offer = await this._pc.createOffer();
          logger.debug("stopSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.delete(localId);
        }
        async pauseSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("pauseSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "inactive";
          this._remoteSdp.pauseMediaSection(localId);
          const offer = await this._pc.createOffer();
          logger.debug("pauseSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async resumeSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("resumeSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "sendonly";
          this._remoteSdp.resumeSendingMediaSection(localId);
          const offer = await this._pc.createOffer();
          logger.debug("resumeSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async replaceTrack(localId, track) {
          this.assertNotClosed();
          this.assertSendDirection();
          if (track) {
            logger.debug("replaceTrack() [localId:%s, track.id:%s]", localId, track.id);
          } else {
            logger.debug("replaceTrack() [localId:%s, no track]", localId);
          }
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          await transceiver.sender.replaceTrack(track);
        }
        async setMaxSpatialLayer(localId, spatialLayer) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setMaxSpatialLayer() [localId:%s, spatialLayer:%s]", localId, spatialLayer);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            if (idx <= spatialLayer) {
              encoding.active = true;
            } else {
              encoding.active = false;
            }
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setMaxSpatialLayer() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setMaxSpatialLayer() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async setRtpEncodingParameters(localId, params) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setRtpEncodingParameters() [localId:%s, params:%o]", localId, params);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            parameters.encodings[idx] = { ...encoding, ...params };
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setRtpEncodingParameters() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setRtpEncodingParameters() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async getSenderStats(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.sender.getStats();
        }
        async sendDataChannel({ sctpStreamParameters }) {
          this.assertNotClosed();
          this.assertSendDirection();
          const options = {
            negotiated: true,
            id: this._nextSendSctpStreamId,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits,
            protocol: sctpStreamParameters.protocol
          };
          logger.debug("sendDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(sctpStreamParameters.label, options);
          this._nextSendSctpStreamId = ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;
          if (!this._hasDataChannelMediaSection) {
            const offer = await this._pc.createOffer();
            const localSdpObject = sdpTransform.parse(offer.sdp);
            const offerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            if (!this._transportReady) {
              await this.setupTransport({
                localDtlsRole: this._forcedLocalDtlsRole ?? "client",
                localSdpObject
              });
            }
            logger.debug("sendDataChannel() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            this._remoteSdp.sendSctpAssociation({ offerMediaObject });
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          const newSctpStreamParameters = {
            streamId: options.id,
            ordered: options.ordered,
            maxPacketLifeTime: options.maxPacketLifeTime,
            maxRetransmits: options.maxRetransmits
          };
          return { dataChannel, sctpStreamParameters: newSctpStreamParameters };
        }
        async receive(optionsList) {
          var _a47;
          this.assertNotClosed();
          this.assertRecvDirection();
          const results = [];
          const mapLocalId = /* @__PURE__ */ new Map();
          for (const options of optionsList) {
            const { trackId, kind, rtpParameters, streamId } = options;
            logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);
            const localId = rtpParameters.mid ?? String(this._mapMidTransceiver.size);
            mapLocalId.set(trackId, localId);
            const { msidStreamId } = ortcUtils.getMsidStreamIdAndTrackId(rtpParameters.msid);
            this._remoteSdp.receive({
              mid: localId,
              kind,
              offerRtpParameters: rtpParameters,
              streamId: streamId ?? msidStreamId ?? ((_a47 = rtpParameters.rtcp) == null ? void 0 : _a47.cname) ?? "-",
              trackId
            });
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("receive() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          for (const options of optionsList) {
            const { trackId, onRtpReceiver } = options;
            if (onRtpReceiver) {
              const localId = mapLocalId.get(trackId);
              const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
              if (!transceiver) {
                throw new Error("transceiver not found");
              }
              onRtpReceiver(transceiver.receiver);
            }
          }
          let answer = await this._pc.createAnswer();
          const localSdpObject = sdpTransform.parse(answer.sdp);
          for (const options of optionsList) {
            const { trackId, rtpParameters } = options;
            const localId = mapLocalId.get(trackId);
            const answerMediaObject = localSdpObject.media.find((m) => String(m.mid) === localId);
            sdpCommonUtils.applyCodecParameters({
              offerRtpParameters: rtpParameters,
              answerMediaObject
            });
          }
          answer = {
            type: "answer",
            sdp: sdpTransform.write(localSdpObject)
          };
          if (!this._transportReady) {
            await this.setupTransport({
              localDtlsRole: this._forcedLocalDtlsRole ?? "client",
              localSdpObject
            });
          }
          logger.debug("receive() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const options of optionsList) {
            const { trackId } = options;
            const localId = mapLocalId.get(trackId);
            const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
            if (!transceiver) {
              throw new Error("new RTCRtpTransceiver not found");
            }
            this._mapMidTransceiver.set(localId, transceiver);
            results.push({
              localId,
              track: transceiver.receiver.track,
              rtpReceiver: transceiver.receiver
            });
          }
          return results;
        }
        async stopReceiving(localIds) {
          this.assertRecvDirection();
          if (this._closed) {
            return;
          }
          for (const localId of localIds) {
            logger.debug("stopReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            this._remoteSdp.closeMediaSection(transceiver.mid);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("stopReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const localId of localIds) {
            this._mapMidTransceiver.delete(localId);
          }
        }
        async pauseReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("pauseReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "inactive";
            this._remoteSdp.pauseMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("pauseReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async resumeReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("resumeReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "recvonly";
            this._remoteSdp.resumeReceivingMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("resumeReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async getReceiverStats(localId) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.receiver.getStats();
        }
        async receiveDataChannel({ maxMessageSize, sctpStreamParameters, label, protocol }) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const { streamId, ordered, maxPacketLifeTime, maxRetransmits } = sctpStreamParameters;
          const options = {
            negotiated: true,
            id: streamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol
          };
          logger.debug("receiveDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(label, options);
          if (!this._hasDataChannelMediaSection) {
            this._remoteSdp.receiveSctpAssociation();
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            let answer = await this._pc.createAnswer();
            const localSdpObject = sdpTransform.parse(answer.sdp);
            const answerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            answerMediaObject.maxMessageSize = maxMessageSize;
            if (!this._transportReady) {
              await this.setupTransport({
                localDtlsRole: this._forcedLocalDtlsRole ?? "client",
                localSdpObject
              });
            }
            answer = {
              type: "answer",
              sdp: sdpTransform.write(localSdpObject)
            };
            logger.debug("receiveDataChannel() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          return { dataChannel };
        }
        getDataChannelMaxMessageSize() {
          var _a47;
          return (_a47 = this._pc.sctp) == null ? void 0 : _a47.maxMessageSize;
        }
        async setupTransport({ localDtlsRole, localSdpObject }) {
          if (!localSdpObject) {
            localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          }
          const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
            sdpObject: localSdpObject
          });
          dtlsParameters.role = localDtlsRole;
          this._remoteSdp.updateDtlsRole(localDtlsRole === "client" ? "server" : "client");
          await new Promise((resolve, reject) => {
            this.safeEmit("@connect", { dtlsParameters }, resolve, reject);
          });
          this._transportReady = true;
        }
        onIceGatheringStateChange = () => {
          this.emit("@icegatheringstatechange", this._pc.iceGatheringState);
        };
        onIceCandidateError = (event) => {
          this.emit("@icecandidateerror", event);
        };
        onConnectionStateChange = () => {
          this.emit("@connectionstatechange", this._pc.connectionState);
        };
        onIceConnectionStateChange = () => {
          switch (this._pc.iceConnectionState) {
            case "checking": {
              this.emit("@connectionstatechange", "connecting");
              break;
            }
            case "connected":
            case "completed": {
              this.emit("@connectionstatechange", "connected");
              break;
            }
            case "failed": {
              this.emit("@connectionstatechange", "failed");
              break;
            }
            case "disconnected": {
              this.emit("@connectionstatechange", "disconnected");
              break;
            }
            case "closed": {
              this.emit("@connectionstatechange", "closed");
              break;
            }
          }
        };
        assertNotClosed() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("method called in a closed handler");
          }
        }
        assertSendDirection() {
          if (this._direction !== "send") {
            throw new Error('method can just be called for handlers with "send" direction');
          }
        }
        assertRecvDirection() {
          if (this._direction !== "recv") {
            throw new Error('method can just be called for handlers with "recv" direction');
          }
        }
      };
      exports.Safari12 = Safari12;
    }
  });

  // node_modules/mediasoup-client/lib/handlers/ReactNative106.js
  var require_ReactNative106 = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/ReactNative106.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ReactNative106 = void 0;
      var sdpTransform = require_lib3();
      var enhancedEvents_1 = require_enhancedEvents();
      var Logger_1 = require_Logger();
      var ortc = require_ortc();
      var errors_1 = require_errors();
      var scalabilityModes_1 = require_scalabilityModes();
      var RemoteSdp_1 = require_RemoteSdp();
      var sdpCommonUtils = require_commonUtils();
      var sdpUnifiedPlanUtils = require_unifiedPlanUtils();
      var ortcUtils = require_utils2();
      var logger = new Logger_1.Logger("ReactNative106");
      var NAME = "ReactNative106";
      var SCTP_NUM_STREAMS = { OS: 65535, MIS: 65535 };
      var ReactNative106 = class _ReactNative106 extends enhancedEvents_1.EnhancedEventEmitter {
        // Closed flag.
        _closed = false;
        // Handler direction.
        _direction;
        // Remote SDP handler.
        _remoteSdp;
        // Callback to request sending extended RTP capabilities on demand.
        _getSendExtendedRtpCapabilities;
        // Initial server side DTLS role. If not 'auto', it will force the opposite
        // value in client side.
        _forcedLocalDtlsRole;
        // RTCPeerConnection instance.
        _pc;
        // Map of RTCTransceivers indexed by MID.
        _mapMidTransceiver = /* @__PURE__ */ new Map();
        // Default local stream for sending if no `streamId` is given in send().
        _sendStream = new MediaStream();
        // Whether a DataChannel m=application section has been created.
        _hasDataChannelMediaSection = false;
        // Sending DataChannel id value counter. Incremented for each new DataChannel.
        _nextSendSctpStreamId = 0;
        // Got transport local and remote parameters.
        _transportReady = false;
        /**
         * Creates a factory function.
         */
        static createFactory() {
          return {
            name: NAME,
            factory: (options) => new _ReactNative106(options),
            getNativeRtpCapabilities: async ({ direction }) => {
              logger.debug("getNativeRtpCapabilities() [direction:%o]", direction);
              let pc = new RTCPeerConnection({
                iceServers: [],
                iceTransportPolicy: "all",
                bundlePolicy: "max-bundle",
                rtcpMuxPolicy: "require"
              });
              try {
                pc.addTransceiver("audio", { direction });
                pc.addTransceiver("video", { direction });
                const offer = await pc.createOffer();
                try {
                  pc.close();
                } catch (error) {
                }
                pc = void 0;
                const sdpObject = sdpTransform.parse(offer.sdp);
                const nativeRtpCapabilities = _ReactNative106.getLocalRtpCapabilities(sdpObject);
                return nativeRtpCapabilities;
              } catch (error) {
                try {
                  pc == null ? void 0 : pc.close();
                } catch (error2) {
                }
                pc = void 0;
                throw error;
              }
            },
            getNativeSctpCapabilities: async () => {
              logger.debug("getNativeSctpCapabilities()");
              return {
                numStreams: SCTP_NUM_STREAMS
              };
            }
          };
        }
        static getLocalRtpCapabilities(localSdpObject, extraHeaderExtensions = []) {
          const nativeRtpCapabilities = sdpCommonUtils.extractRtpCapabilities({
            sdpObject: localSdpObject
          });
          ortc.validateAndNormalizeRtpCapabilities(nativeRtpCapabilities);
          ortcUtils.addNackSupportForOpus(nativeRtpCapabilities);
          for (const headerExtension of extraHeaderExtensions) {
            ortcUtils.addHeaderExtensionSupport(nativeRtpCapabilities, headerExtension);
          }
          return nativeRtpCapabilities;
        }
        constructor({ direction, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, getSendExtendedRtpCapabilities }) {
          super();
          logger.debug("constructor()");
          this._direction = direction;
          this._remoteSdp = new RemoteSdp_1.RemoteSdp({
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters
          });
          this._getSendExtendedRtpCapabilities = getSendExtendedRtpCapabilities;
          if (dtlsParameters.role && dtlsParameters.role !== "auto") {
            this._forcedLocalDtlsRole = dtlsParameters.role === "server" ? "client" : "server";
          }
          this._pc = new RTCPeerConnection({
            iceServers: iceServers ?? [],
            iceTransportPolicy: iceTransportPolicy ?? "all",
            bundlePolicy: "max-bundle",
            rtcpMuxPolicy: "require",
            ...additionalSettings
          });
          this._pc.addEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.addEventListener("icecandidateerror", this.onIceCandidateError);
          if (this._pc.connectionState) {
            this._pc.addEventListener("connectionstatechange", this.onConnectionStateChange);
          } else {
            logger.warn("run() | pc.connectionState not supported, using pc.iceConnectionState");
            this._pc.addEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          }
        }
        get name() {
          return NAME;
        }
        close() {
          logger.debug("close()");
          if (this._closed) {
            return;
          }
          this._closed = true;
          this._sendStream.release(
            /* releaseTracks */
            false
          );
          try {
            this._pc.close();
          } catch (error) {
          }
          this._pc.removeEventListener("icegatheringstatechange", this.onIceGatheringStateChange);
          this._pc.removeEventListener("icecandidateerror", this.onIceCandidateError);
          this._pc.removeEventListener("connectionstatechange", this.onConnectionStateChange);
          this._pc.removeEventListener("iceconnectionstatechange", this.onIceConnectionStateChange);
          this.emit("@close");
          super.close();
        }
        async updateIceServers(iceServers) {
          this.assertNotClosed();
          logger.debug("updateIceServers()");
          const configuration = this._pc.getConfiguration();
          configuration.iceServers = iceServers;
          this._pc.setConfiguration(configuration);
        }
        async restartIce(iceParameters) {
          this.assertNotClosed();
          logger.debug("restartIce()");
          this._remoteSdp.updateIceParameters(iceParameters);
          if (!this._transportReady) {
            return;
          }
          if (this._direction === "send") {
            const offer = await this._pc.createOffer({ iceRestart: true });
            logger.debug("restartIce() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
          } else {
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("restartIce() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            const answer = await this._pc.createAnswer();
            logger.debug("restartIce() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
          }
        }
        async getTransportStats() {
          this.assertNotClosed();
          return this._pc.getStats();
        }
        async send({ track, streamId, encodings, codecOptions, headerExtensionOptions, codec, onRtpSender }) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("send() [kind:%s, track.id:%s, streamId:%s]", track.kind, track.id, streamId);
          if (encodings && encodings.length > 1) {
            encodings.forEach((encoding, idx) => {
              encoding.rid = `r${idx}`;
            });
          }
          const mediaSectionIdx = this._remoteSdp.getNextMediaSectionIdx();
          const transceiver = this._pc.addTransceiver(track, {
            direction: "sendonly",
            streams: [this._sendStream],
            sendEncodings: encodings
          });
          if (onRtpSender) {
            onRtpSender(transceiver.sender);
          }
          let offer = await this._pc.createOffer();
          let localSdpObject = sdpTransform.parse(offer.sdp);
          if (localSdpObject.extmapAllowMixed) {
            this._remoteSdp.setSessionExtmapAllowMixed();
          }
          const extraHeaderExtensions = [];
          extraHeaderExtensions.push({
            uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time",
            kind: track.kind,
            direction: "sendonly"
          });
          const nativeRtpCapabilities = _ReactNative106.getLocalRtpCapabilities(localSdpObject, extraHeaderExtensions);
          const sendExtendedRtpCapabilities = this._getSendExtendedRtpCapabilities(nativeRtpCapabilities);
          const sendingRtpParameters = ortc.getSendingRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs, codec);
          const sendingRemoteRtpParameters = ortc.getSendingRemoteRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRemoteRtpParameters.codecs = ortc.reduceCodecs(sendingRemoteRtpParameters.codecs, codec);
          if (!this._transportReady) {
            await this.setupTransport({
              localDtlsRole: this._forcedLocalDtlsRole ?? "client",
              localSdpObject
            });
          }
          let hackVp9Svc = false;
          const layers = (0, scalabilityModes_1.parse)((encodings ?? [{}])[0].scalabilityMode);
          let offerMediaObject;
          if ((encodings == null ? void 0 : encodings.length) === 1 && layers.spatialLayers > 1 && sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/vp9") {
            logger.debug("send() | enabling legacy simulcast for VP9 SVC");
            hackVp9Svc = true;
            localSdpObject = sdpTransform.parse(offer.sdp);
            offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
            sdpUnifiedPlanUtils.addLegacySimulcast({
              offerMediaObject,
              numStreams: layers.spatialLayers
            });
            offer = {
              type: "offer",
              sdp: sdpTransform.write(localSdpObject)
            };
          }
          if (headerExtensionOptions == null ? void 0 : headerExtensionOptions.absCaptureTime) {
            offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
            sdpCommonUtils.addHeaderExtension({
              offerMediaObject,
              headerExtensionUri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time",
              headerExtensionId: sendingRemoteRtpParameters.headerExtensions.find((headerExtension) => headerExtension.uri === "http://www.webrtc.org/experiments/rtp-hdrext/abs-capture-time").id
            });
            offer = {
              type: "offer",
              sdp: sdpTransform.write(localSdpObject)
            };
          }
          logger.debug("send() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          let localId = transceiver.mid ?? void 0;
          if (!localId) {
            logger.warn("send() | missing transceiver.mid (bug in react-native-webrtc, using a workaround");
          }
          sendingRtpParameters.mid = localId;
          localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          offerMediaObject = localSdpObject.media[mediaSectionIdx.idx];
          sendingRtpParameters.rtcp.cname = sdpCommonUtils.getCname({
            offerMediaObject
          });
          sendingRtpParameters.msid = `${streamId ?? this._sendStream.id} ${track.id}`;
          if (!encodings) {
            sendingRtpParameters.encodings = sdpUnifiedPlanUtils.getRtpEncodings({
              offerMediaObject,
              codecs: sendingRtpParameters.codecs
            });
          } else if (encodings.length === 1) {
            let newEncodings = sdpUnifiedPlanUtils.getRtpEncodings({
              offerMediaObject,
              codecs: sendingRtpParameters.codecs
            });
            Object.assign(newEncodings[0], encodings[0]);
            if (hackVp9Svc) {
              newEncodings = [newEncodings[0]];
            }
            sendingRtpParameters.encodings = newEncodings;
          } else {
            sendingRtpParameters.encodings = encodings;
          }
          if (sendingRtpParameters.encodings.length > 1 && (sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/vp8" || sendingRtpParameters.codecs[0].mimeType.toLowerCase() === "video/h264")) {
            for (const encoding of sendingRtpParameters.encodings) {
              if (encoding.scalabilityMode) {
                encoding.scalabilityMode = `L1T${layers.temporalLayers}`;
              } else {
                encoding.scalabilityMode = "L1T3";
              }
            }
          }
          this._remoteSdp.send({
            offerMediaObject,
            reuseMid: mediaSectionIdx.reuseMid,
            offerRtpParameters: sendingRtpParameters,
            answerRtpParameters: sendingRemoteRtpParameters,
            codecOptions
          });
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("send() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          if (!localId) {
            localId = transceiver.mid;
            sendingRtpParameters.mid = localId;
          }
          this._mapMidTransceiver.set(localId, transceiver);
          return {
            localId,
            rtpParameters: sendingRtpParameters,
            rtpSender: transceiver.sender
          };
        }
        async stopSending(localId) {
          this.assertSendDirection();
          if (this._closed) {
            return;
          }
          logger.debug("stopSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          void transceiver.sender.replaceTrack(null);
          this._pc.removeTrack(transceiver.sender);
          const mediaSectionClosed = this._remoteSdp.closeMediaSection(transceiver.mid);
          if (mediaSectionClosed) {
            try {
              transceiver.stop();
            } catch (error) {
            }
          }
          const offer = await this._pc.createOffer();
          logger.debug("stopSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
          this._mapMidTransceiver.delete(localId);
        }
        async pauseSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("pauseSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "inactive";
          this._remoteSdp.pauseMediaSection(localId);
          const offer = await this._pc.createOffer();
          logger.debug("pauseSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async resumeSending(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("resumeSending() [localId:%s]", localId);
          const transceiver = this._mapMidTransceiver.get(localId);
          this._remoteSdp.resumeSendingMediaSection(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          transceiver.direction = "sendonly";
          const offer = await this._pc.createOffer();
          logger.debug("resumeSending() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeSending() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async replaceTrack(localId, track) {
          this.assertNotClosed();
          this.assertSendDirection();
          if (track) {
            logger.debug("replaceTrack() [localId:%s, track.id:%s]", localId, track.id);
          } else {
            logger.debug("replaceTrack() [localId:%s, no track]", localId);
          }
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          await transceiver.sender.replaceTrack(track);
        }
        async setMaxSpatialLayer(localId, spatialLayer) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setMaxSpatialLayer() [localId:%s, spatialLayer:%s]", localId, spatialLayer);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            if (idx <= spatialLayer) {
              encoding.active = true;
            } else {
              encoding.active = false;
            }
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setMaxSpatialLayer() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setMaxSpatialLayer() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async setRtpEncodingParameters(localId, params) {
          this.assertNotClosed();
          this.assertSendDirection();
          logger.debug("setRtpEncodingParameters() [localId:%s, params:%o]", localId, params);
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          const parameters = transceiver.sender.getParameters();
          parameters.encodings.forEach((encoding, idx) => {
            parameters.encodings[idx] = { ...encoding, ...params };
          });
          await transceiver.sender.setParameters(parameters);
          this._remoteSdp.muxMediaSectionSimulcast(localId, parameters.encodings);
          const offer = await this._pc.createOffer();
          logger.debug("setRtpEncodingParameters() | calling pc.setLocalDescription() [offer:%o]", offer);
          await this._pc.setLocalDescription(offer);
          const answer = {
            type: "answer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("setRtpEncodingParameters() | calling pc.setRemoteDescription() [answer:%o]", answer);
          await this._pc.setRemoteDescription(answer);
        }
        async getSenderStats(localId) {
          this.assertNotClosed();
          this.assertSendDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.sender.getStats();
        }
        async sendDataChannel({ sctpStreamParameters }) {
          this.assertNotClosed();
          this.assertSendDirection();
          const options = {
            negotiated: true,
            id: this._nextSendSctpStreamId,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits,
            protocol: sctpStreamParameters.protocol
          };
          logger.debug("sendDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(sctpStreamParameters.label, options);
          this._nextSendSctpStreamId = ++this._nextSendSctpStreamId % SCTP_NUM_STREAMS.MIS;
          if (!this._hasDataChannelMediaSection) {
            const offer = await this._pc.createOffer();
            const localSdpObject = sdpTransform.parse(offer.sdp);
            const offerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            if (!this._transportReady) {
              await this.setupTransport({
                localDtlsRole: this._forcedLocalDtlsRole ?? "client",
                localSdpObject
              });
            }
            logger.debug("sendDataChannel() | calling pc.setLocalDescription() [offer:%o]", offer);
            await this._pc.setLocalDescription(offer);
            this._remoteSdp.sendSctpAssociation({ offerMediaObject });
            const answer = {
              type: "answer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("sendDataChannel() | calling pc.setRemoteDescription() [answer:%o]", answer);
            await this._pc.setRemoteDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          const newSctpStreamParameters = {
            streamId: options.id,
            ordered: options.ordered,
            maxPacketLifeTime: options.maxPacketLifeTime,
            maxRetransmits: options.maxRetransmits
          };
          return { dataChannel, sctpStreamParameters: newSctpStreamParameters };
        }
        async receive(optionsList) {
          var _a47;
          this.assertNotClosed();
          this.assertRecvDirection();
          const results = [];
          const mapLocalId = /* @__PURE__ */ new Map();
          for (const options of optionsList) {
            const { trackId, kind, rtpParameters, streamId } = options;
            logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);
            const localId = rtpParameters.mid ?? String(this._mapMidTransceiver.size);
            mapLocalId.set(trackId, localId);
            const { msidStreamId } = ortcUtils.getMsidStreamIdAndTrackId(rtpParameters.msid);
            this._remoteSdp.receive({
              mid: localId,
              kind,
              offerRtpParameters: rtpParameters,
              streamId: streamId ?? msidStreamId ?? ((_a47 = rtpParameters.rtcp) == null ? void 0 : _a47.cname) ?? "-",
              trackId
            });
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("receive() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          for (const options of optionsList) {
            const { trackId, onRtpReceiver } = options;
            if (onRtpReceiver) {
              const localId = mapLocalId.get(trackId);
              const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
              if (!transceiver) {
                throw new Error("transceiver not found");
              }
              onRtpReceiver(transceiver.receiver);
            }
          }
          let answer = await this._pc.createAnswer();
          const localSdpObject = sdpTransform.parse(answer.sdp);
          for (const options of optionsList) {
            const { trackId, rtpParameters } = options;
            const localId = mapLocalId.get(trackId);
            const answerMediaObject = localSdpObject.media.find((m) => String(m.mid) === localId);
            sdpCommonUtils.applyCodecParameters({
              offerRtpParameters: rtpParameters,
              answerMediaObject
            });
          }
          answer = {
            type: "answer",
            sdp: sdpTransform.write(localSdpObject)
          };
          if (!this._transportReady) {
            await this.setupTransport({
              localDtlsRole: this._forcedLocalDtlsRole ?? "client",
              localSdpObject
            });
          }
          logger.debug("receive() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const options of optionsList) {
            const { trackId } = options;
            const localId = mapLocalId.get(trackId);
            const transceiver = this._pc.getTransceivers().find((t) => t.mid === localId);
            if (!transceiver) {
              throw new Error("new RTCRtpTransceiver not found");
            } else {
              this._mapMidTransceiver.set(localId, transceiver);
              results.push({
                localId,
                track: transceiver.receiver.track,
                rtpReceiver: transceiver.receiver
              });
            }
          }
          return results;
        }
        async stopReceiving(localIds) {
          this.assertRecvDirection();
          if (this._closed) {
            return;
          }
          for (const localId of localIds) {
            logger.debug("stopReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            this._remoteSdp.closeMediaSection(transceiver.mid);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("stopReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("stopReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
          for (const localId of localIds) {
            this._mapMidTransceiver.delete(localId);
          }
        }
        async pauseReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("pauseReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "inactive";
            this._remoteSdp.pauseMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("pauseReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("pauseReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async resumeReceiving(localIds) {
          this.assertNotClosed();
          this.assertRecvDirection();
          for (const localId of localIds) {
            logger.debug("resumeReceiving() [localId:%s]", localId);
            const transceiver = this._mapMidTransceiver.get(localId);
            if (!transceiver) {
              throw new Error("associated RTCRtpTransceiver not found");
            }
            transceiver.direction = "recvonly";
            this._remoteSdp.resumeReceivingMediaSection(localId);
          }
          const offer = {
            type: "offer",
            sdp: this._remoteSdp.getSdp()
          };
          logger.debug("resumeReceiving() | calling pc.setRemoteDescription() [offer:%o]", offer);
          await this._pc.setRemoteDescription(offer);
          const answer = await this._pc.createAnswer();
          logger.debug("resumeReceiving() | calling pc.setLocalDescription() [answer:%o]", answer);
          await this._pc.setLocalDescription(answer);
        }
        async getReceiverStats(localId) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const transceiver = this._mapMidTransceiver.get(localId);
          if (!transceiver) {
            throw new Error("associated RTCRtpTransceiver not found");
          }
          return transceiver.receiver.getStats();
        }
        async receiveDataChannel({ maxMessageSize, sctpStreamParameters, label, protocol }) {
          this.assertNotClosed();
          this.assertRecvDirection();
          const { streamId, ordered, maxPacketLifeTime, maxRetransmits } = sctpStreamParameters;
          const options = {
            negotiated: true,
            id: streamId,
            ordered,
            maxPacketLifeTime,
            maxRetransmits,
            protocol
          };
          logger.debug("receiveDataChannel() [options:%o]", options);
          const dataChannel = this._pc.createDataChannel(label, options);
          if (!this._hasDataChannelMediaSection) {
            this._remoteSdp.receiveSctpAssociation();
            const offer = {
              type: "offer",
              sdp: this._remoteSdp.getSdp()
            };
            logger.debug("receiveDataChannel() | calling pc.setRemoteDescription() [offer:%o]", offer);
            await this._pc.setRemoteDescription(offer);
            let answer = await this._pc.createAnswer();
            const localSdpObject = sdpTransform.parse(answer.sdp);
            const answerMediaObject = localSdpObject.media.find((m) => m.type === "application");
            answerMediaObject.maxMessageSize = maxMessageSize;
            if (!this._transportReady) {
              await this.setupTransport({
                localDtlsRole: this._forcedLocalDtlsRole ?? "client",
                localSdpObject
              });
            }
            answer = {
              type: "answer",
              sdp: sdpTransform.write(localSdpObject)
            };
            logger.debug("receiveDataChannel() | calling pc.setLocalDescription() [answer:%o]", answer);
            await this._pc.setLocalDescription(answer);
            this._hasDataChannelMediaSection = true;
          }
          return { dataChannel };
        }
        getDataChannelMaxMessageSize() {
          var _a47;
          return (_a47 = this._pc.sctp) == null ? void 0 : _a47.maxMessageSize;
        }
        async setupTransport({ localDtlsRole, localSdpObject }) {
          if (!localSdpObject) {
            localSdpObject = sdpTransform.parse(this._pc.localDescription.sdp);
          }
          const dtlsParameters = sdpCommonUtils.extractDtlsParameters({
            sdpObject: localSdpObject
          });
          dtlsParameters.role = localDtlsRole;
          this._remoteSdp.updateDtlsRole(localDtlsRole === "client" ? "server" : "client");
          await new Promise((resolve, reject) => {
            this.safeEmit("@connect", { dtlsParameters }, resolve, reject);
          });
          this._transportReady = true;
        }
        onIceGatheringStateChange = () => {
          this.emit("@icegatheringstatechange", this._pc.iceGatheringState);
        };
        onIceCandidateError = (event) => {
          this.emit("@icecandidateerror", event);
        };
        onConnectionStateChange = () => {
          this.emit("@connectionstatechange", this._pc.connectionState);
        };
        onIceConnectionStateChange = () => {
          switch (this._pc.iceConnectionState) {
            case "checking": {
              this.emit("@connectionstatechange", "connecting");
              break;
            }
            case "connected":
            case "completed": {
              this.emit("@connectionstatechange", "connected");
              break;
            }
            case "failed": {
              this.emit("@connectionstatechange", "failed");
              break;
            }
            case "disconnected": {
              this.emit("@connectionstatechange", "disconnected");
              break;
            }
            case "closed": {
              this.emit("@connectionstatechange", "closed");
              break;
            }
          }
        };
        assertNotClosed() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("method called in a closed handler");
          }
        }
        assertSendDirection() {
          if (this._direction !== "send") {
            throw new Error('method can just be called for handlers with "send" direction');
          }
        }
        assertRecvDirection() {
          if (this._direction !== "recv") {
            throw new Error('method can just be called for handlers with "recv" direction');
          }
        }
      };
      exports.ReactNative106 = ReactNative106;
    }
  });

  // node_modules/mediasoup-client/lib/Device.js
  var require_Device = __commonJS({
    "node_modules/mediasoup-client/lib/Device.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.Device = void 0;
      exports.detectDevice = detectDevice;
      exports.detectDeviceAsync = detectDeviceAsync;
      var Logger_1 = require_Logger();
      var enhancedEvents_1 = require_enhancedEvents();
      var errors_1 = require_errors();
      var utils = require_utils();
      var ortc = require_ortc();
      var Transport_1 = require_Transport();
      var Chrome111_1 = require_Chrome111();
      var Chrome74_1 = require_Chrome74();
      var Firefox120_1 = require_Firefox120();
      var Safari12_1 = require_Safari12();
      var ReactNative106_1 = require_ReactNative106();
      var logger = new Logger_1.Logger("Device");
      function detectDevice(userAgent, userAgentData) {
        logger.debug("detectDevice()");
        if (!userAgent && typeof navigator === "object") {
          userAgent = navigator.userAgent;
        }
        if (!userAgentData && typeof navigator === "object") {
          userAgentData = navigator.userAgentData;
        }
        return detectDeviceImpl(userAgent, userAgentData);
      }
      async function detectDeviceAsync(userAgent, userAgentData) {
        logger.debug("detectDeviceAsync()");
        if (!userAgent && typeof navigator === "object") {
          userAgent = navigator.userAgent;
        }
        if (!userAgentData && typeof navigator === "object") {
          userAgentData = navigator.userAgentData;
        }
        return detectDeviceImpl(userAgent, userAgentData);
      }
      var Device2 = class _Device {
        // RTC handler factory.
        _handlerFactory;
        // Handler name.
        _handlerName;
        // Loaded flag.
        _loaded = false;
        // Callback for sending Transports to request sending extended RTP capabilities
        // on demand.
        _getSendExtendedRtpCapabilities;
        // Local RTP capabilities for receiving media.
        _recvRtpCapabilities;
        // Local RTP capabilities for sending media.
        _sendRtpCapabilities;
        // Whether we can produce audio/video based on remote RTP capabilities.
        _canProduceByKind = {
          audio: false,
          video: false
        };
        // Local SCTP capabilities.
        _sctpCapabilities;
        // Observer instance.
        _observer = new enhancedEvents_1.EnhancedEventEmitter();
        /**
         * Create a new Device to connect to mediasoup server. It uses a more advanced
         * device detection.
         *
         * @throws {UnsupportedError} if device is not supported.
         */
        static async factory({ handlerName, handlerFactory } = {}) {
          logger.debug("factory()");
          if (handlerName && handlerFactory) {
            throw new TypeError("just one of handlerName or handlerInterface can be given");
          }
          if (!handlerName && !handlerFactory) {
            handlerName = await detectDeviceAsync();
            if (!handlerName) {
              throw new errors_1.UnsupportedError("device not supported");
            }
          }
          return new _Device({ handlerName, handlerFactory });
        }
        /**
         * Create a new Device to connect to mediasoup server.
         *
         * @throws {UnsupportedError} if device is not supported.
         */
        constructor({ handlerName, handlerFactory } = {}) {
          logger.debug("constructor()");
          if (handlerName && handlerFactory) {
            throw new TypeError("just one of handlerName or handlerInterface can be given");
          }
          if (handlerFactory) {
            this._handlerFactory = handlerFactory;
          } else {
            if (handlerName) {
              logger.debug("constructor() | handler given: %s", handlerName);
            } else {
              handlerName = detectDevice();
              if (handlerName) {
                logger.debug("constructor() | detected handler: %s", handlerName);
              } else {
                throw new errors_1.UnsupportedError("device not supported");
              }
            }
            switch (handlerName) {
              case "Chrome111": {
                this._handlerFactory = Chrome111_1.Chrome111.createFactory();
                break;
              }
              case "Chrome74": {
                this._handlerFactory = Chrome74_1.Chrome74.createFactory();
                break;
              }
              case "Firefox120": {
                this._handlerFactory = Firefox120_1.Firefox120.createFactory();
                break;
              }
              case "Safari12": {
                this._handlerFactory = Safari12_1.Safari12.createFactory();
                break;
              }
              case "ReactNative106": {
                this._handlerFactory = ReactNative106_1.ReactNative106.createFactory();
                break;
              }
              default: {
                throw new TypeError(`unknown handlerName "${handlerName}"`);
              }
            }
          }
          this._handlerName = this._handlerFactory.name;
        }
        /**
         * The RTC handler name.
         */
        get handlerName() {
          return this._handlerName;
        }
        /**
         * Whether the Device is loaded.
         */
        get loaded() {
          return this._loaded;
        }
        /**
         * RTP capabilities of the Device for receiving media.
         *
         * @deprecated Use {@link recvRtpCapabilities} instead.
         *
         * @throws {InvalidStateError} if not loaded.
         */
        get rtpCapabilities() {
          return this.recvRtpCapabilities;
        }
        /**
         * RTP capabilities of the Device for receiving media.
         *
         * @throws {InvalidStateError} if not loaded.
         */
        get recvRtpCapabilities() {
          if (!this._loaded) {
            throw new errors_1.InvalidStateError("not loaded");
          }
          return this._recvRtpCapabilities;
        }
        /**
         * RTP capabilities of the Device for sending media.
         *
         * @throws {InvalidStateError} if not loaded.
         */
        get sendRtpCapabilities() {
          if (!this._loaded) {
            throw new errors_1.InvalidStateError("not loaded");
          }
          return this._sendRtpCapabilities;
        }
        /**
         * SCTP capabilities of the Device.
         *
         * @throws {InvalidStateError} if not loaded.
         */
        get sctpCapabilities() {
          if (!this._loaded) {
            throw new errors_1.InvalidStateError("not loaded");
          }
          return this._sctpCapabilities;
        }
        get observer() {
          return this._observer;
        }
        /**
         * Initialize the Device.
         */
        async load({ routerRtpCapabilities, preferLocalCodecsOrder = false }) {
          logger.debug("load() [routerRtpCapabilities:%o]", routerRtpCapabilities);
          if (this._loaded) {
            throw new errors_1.InvalidStateError("already loaded");
          }
          const clonedRouterRtpCapabilities = utils.clone(routerRtpCapabilities);
          ortc.validateAndNormalizeRtpCapabilities(clonedRouterRtpCapabilities);
          const { getNativeRtpCapabilities, getNativeSctpCapabilities } = this._handlerFactory;
          const clonedNativeRecvRtpCapabilities = utils.clone(await getNativeRtpCapabilities({ direction: "recvonly" }));
          logger.debug("load() | got native receiving RTP capabilities:%o", clonedNativeRecvRtpCapabilities);
          ortc.validateAndNormalizeRtpCapabilities(clonedNativeRecvRtpCapabilities);
          const clonedNativeSendRtpCapabilities = utils.clone(await getNativeRtpCapabilities({ direction: "sendonly" }));
          logger.debug("load() | got native sending RTP capabilities:%o", clonedNativeSendRtpCapabilities);
          ortc.validateAndNormalizeRtpCapabilities(clonedNativeSendRtpCapabilities);
          this._getSendExtendedRtpCapabilities = (nativeSendRtpCapabilities) => {
            return utils.clone(ortc.getExtendedRtpCapabilities(nativeSendRtpCapabilities, clonedRouterRtpCapabilities, preferLocalCodecsOrder));
          };
          const recvExtendedRtpCapabilities = ortc.getExtendedRtpCapabilities(
            clonedNativeRecvRtpCapabilities,
            clonedRouterRtpCapabilities,
            /* preferLocalCodecsOrder */
            false
          );
          this._recvRtpCapabilities = ortc.getRecvRtpCapabilities(recvExtendedRtpCapabilities);
          logger.debug("load() | got receiving RTP capabilities:%o", this._recvRtpCapabilities);
          ortc.validateAndNormalizeRtpCapabilities(this._recvRtpCapabilities);
          const sendExtendedRtpCapabilities = ortc.getExtendedRtpCapabilities(clonedNativeSendRtpCapabilities, clonedRouterRtpCapabilities, preferLocalCodecsOrder);
          this._sendRtpCapabilities = ortc.getSendRtpCapabilities(sendExtendedRtpCapabilities);
          logger.debug("load() | got sending RTP capabilities:%o", this._sendRtpCapabilities);
          ortc.validateAndNormalizeRtpCapabilities(this._sendRtpCapabilities);
          this._canProduceByKind.audio = ortc.canSend("audio", this._sendRtpCapabilities);
          this._canProduceByKind.video = ortc.canSend("video", this._sendRtpCapabilities);
          this._sctpCapabilities = await getNativeSctpCapabilities();
          ortc.validateSctpCapabilities(this._sctpCapabilities);
          logger.debug("load() | got native SCTP capabilities:%o", this._sctpCapabilities);
          logger.debug("load() succeeded");
          this._loaded = true;
        }
        /**
         * Whether we can produce audio/video.
         *
         * @throws {InvalidStateError} if not loaded.
         * @throws {TypeError} if wrong arguments.
         */
        canProduce(kind) {
          if (!this._loaded) {
            throw new errors_1.InvalidStateError("not loaded");
          } else if (kind !== "audio" && kind !== "video") {
            throw new TypeError(`invalid kind "${kind}"`);
          }
          return this._canProduceByKind[kind];
        }
        /**
         * Creates a Transport for sending media.
         *
         * @throws {InvalidStateError} if not loaded.
         * @throws {TypeError} if wrong arguments.
         */
        createSendTransport({ id, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, appData }) {
          logger.debug("createSendTransport()");
          return this.createTransport({
            direction: "send",
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
            iceServers,
            iceTransportPolicy,
            additionalSettings,
            appData
          });
        }
        /**
         * Creates a Transport for receiving media.
         *
         * @throws {InvalidStateError} if not loaded.
         * @throws {TypeError} if wrong arguments.
         */
        createRecvTransport({ id, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, appData }) {
          logger.debug("createRecvTransport()");
          return this.createTransport({
            direction: "recv",
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
            iceServers,
            iceTransportPolicy,
            additionalSettings,
            appData
          });
        }
        createTransport({ direction, id, iceParameters, iceCandidates, dtlsParameters, sctpParameters, iceServers, iceTransportPolicy, additionalSettings, appData }) {
          if (!this._loaded) {
            throw new errors_1.InvalidStateError("not loaded");
          } else if (typeof id !== "string") {
            throw new TypeError("missing id");
          } else if (typeof iceParameters !== "object") {
            throw new TypeError("missing iceParameters");
          } else if (!Array.isArray(iceCandidates)) {
            throw new TypeError("missing iceCandidates");
          } else if (typeof dtlsParameters !== "object") {
            throw new TypeError("missing dtlsParameters");
          } else if (sctpParameters && typeof sctpParameters !== "object") {
            throw new TypeError("wrong sctpParameters");
          } else if (appData && typeof appData !== "object") {
            throw new TypeError("if given, appData must be an object");
          }
          const transport = new Transport_1.Transport({
            direction,
            id,
            iceParameters,
            iceCandidates,
            dtlsParameters,
            sctpParameters,
            iceServers,
            iceTransportPolicy,
            additionalSettings,
            appData,
            handlerFactory: this._handlerFactory,
            getSendExtendedRtpCapabilities: this._getSendExtendedRtpCapabilities,
            recvRtpCapabilities: this._recvRtpCapabilities,
            canProduceByKind: this._canProduceByKind
          });
          this._observer.safeEmit("newtransport", transport);
          return transport;
        }
      };
      exports.Device = Device2;
      function detectDeviceImpl(userAgent, userAgentData) {
        logger.debug('detectDeviceImpl() [userAgent:"%s", userAgentData:%o]', userAgent, userAgentData);
        const chromiumMajorVersion = getChromiumMajorVersion(userAgent, userAgentData);
        if (chromiumMajorVersion) {
          if (chromiumMajorVersion >= 111) {
            logger.debug("detectDeviceImpl() | using Chrome111 handler");
            return "Chrome111";
          } else if (chromiumMajorVersion >= 74) {
            logger.debug("detectDeviceImpl() | using Chrome74 handler");
            return "Chrome74";
          } else {
            logger.warn("detectDeviceImpl() | unsupported Chromium based browser/version");
            return void 0;
          }
        }
        const firefoxMajorVersion = getFirefoxMajorVersion(userAgent);
        if (firefoxMajorVersion) {
          if (firefoxMajorVersion >= 120) {
            logger.debug("detectDeviceImpl() | using Firefox120 handler");
            return "Firefox120";
          } else {
            logger.warn("detectDeviceImpl() | unsupported Firefox browser/version");
            return void 0;
          }
        }
        const macOSWebKitMajorVersion = getMacOSWebKitMajorVersion(userAgent);
        if (macOSWebKitMajorVersion) {
          if (macOSWebKitMajorVersion >= 605) {
            logger.debug("detectDeviceImpl() | using Safari12 handler");
            return "Safari12";
          } else {
            logger.warn("detectDeviceImpl() | unsupported desktop Safari browser/version");
            return void 0;
          }
        }
        const iOSWebKitMajorVersion = getIOSWebKitMajorVersion(userAgent);
        if (iOSWebKitMajorVersion) {
          if (iOSWebKitMajorVersion >= 605) {
            logger.debug("detectDeviceImpl() | using Safari12 handler");
            return "Safari12";
          } else {
            logger.warn("detectDeviceImpl() | unsupported iOS Safari based browser/version");
            return void 0;
          }
        }
        if (isReactNative()) {
          if (typeof RTCPeerConnection !== "undefined" && typeof RTCRtpTransceiver !== "undefined") {
            logger.debug("detectDeviceImpl() | using ReactNative106 handler");
            return "ReactNative106";
          } else {
            logger.warn("detectDeviceImpl() | unsupported react-native-webrtc version without RTCPeerConnection or RTCRtpTransceiver, forgot to call registerGlobals() on it?");
            return void 0;
          }
        }
        logger.warn('detectDeviceImpl() | device not supported [userAgent:"%s", userAgentData:%o]', userAgent, userAgentData);
        return void 0;
      }
      function getChromiumMajorVersion(userAgent, userAgentData) {
        logger.debug("getChromiumMajorVersion()");
        if (isIOS(userAgent, userAgentData)) {
          logger.debug("getChromiumMajorVersion() | this is iOS => undefined");
          return void 0;
        }
        if (isReactNative()) {
          logger.debug("getChromiumMajorVersion() | this is React-Native => undefined");
          return void 0;
        }
        if (userAgentData) {
          const brands = Array.isArray(userAgentData.brands) ? userAgentData.brands : [];
          const chromiumBrand = brands.find((b) => b.brand === "Chromium");
          if (chromiumBrand) {
            const majorVersion = Number(chromiumBrand.version);
            logger.debug(`getChromiumMajorVersion() | Chromium major version based on NavigatorUAData => ${majorVersion}`);
            return majorVersion;
          }
        }
        const match = userAgent == null ? void 0 : userAgent.match(/\b(?:Chrome|Chromium)\/(\w+)/i);
        if (match == null ? void 0 : match[1]) {
          const majorVersion = Number(match[1]);
          logger.debug(`getChromiumMajorVersion() | Chromium major version based on User-Agent => ${majorVersion}`);
          return majorVersion;
        }
        logger.debug("getChromiumMajorVersion() | this is not Chromium => undefined");
        return void 0;
      }
      function getFirefoxMajorVersion(userAgent) {
        logger.debug("getFirefoxMajorVersion()");
        if (isIOS(userAgent)) {
          logger.debug("getFirefoxMajorVersion() | this is iOS => undefined");
          return void 0;
        }
        if (isReactNative()) {
          logger.debug("getFirefoxMajorVersion() | this is React-Native => undefined");
          return void 0;
        }
        const match = userAgent == null ? void 0 : userAgent.match(/\bFirefox\/(\w+)/i);
        if (match == null ? void 0 : match[1]) {
          const majorVersion = Number(match[1]);
          logger.debug(`getFirefoxMajorVersion() | Firefox major version based on User-Agent => ${majorVersion}`);
          return majorVersion;
        }
        logger.debug("getFirefoxMajorVersion() | this is not Firefox => undefined");
        return void 0;
      }
      function getMacOSWebKitMajorVersion(userAgent) {
        logger.debug("getMacOSWebKitMajorVersion()");
        if (isIOS(userAgent)) {
          logger.debug("getMacOSWebKitMajorVersion() | this is iOS => undefined");
          return void 0;
        }
        if (isReactNative()) {
          logger.debug("getMacOSWebKitMajorVersion() | this is React-Native => undefined");
          return void 0;
        }
        const isSafari = userAgent && /\bSafari\b/i.test(userAgent) && !/\bChrome\b/i.test(userAgent) && !/\bChromium\b/i.test(userAgent) && !/\bFirefox\b/i.test(userAgent);
        if (!isSafari) {
          logger.debug("getMacOSWebKitMajorVersion() | this is not Safari => undefined");
          return void 0;
        }
        const match = userAgent.match(/AppleWebKit\/(\w+)/i);
        if (match == null ? void 0 : match[1]) {
          const majorVersion = Number(match[1]);
          logger.debug(`getMacOSWebKitMajorVersion() | WebKit major version based on User-Agent => ${majorVersion}`);
          return majorVersion;
        }
        logger.debug("getMacOSWebKitMajorVersion() | this is not WebKit => undefined");
        return void 0;
      }
      function getIOSWebKitMajorVersion(userAgent) {
        logger.debug("getIOSWebKitMajorVersion()");
        if (!isIOS(userAgent)) {
          logger.debug("getIOSWebKitMajorVersion() | this is not iOS => undefined");
          return void 0;
        }
        if (isReactNative()) {
          logger.debug("getIOSWebKitMajorVersion() | this is React-Native => undefined");
          return void 0;
        }
        const match = userAgent == null ? void 0 : userAgent.match(/AppleWebKit\/(\w+)/i);
        if (match == null ? void 0 : match[1]) {
          const majorVersion = Number(match[1]);
          logger.debug(`getIOSWebKitMajorVersion() | WebKit major version based on User-Agent => ${majorVersion}`);
          return majorVersion;
        }
        logger.debug("getIOSWebKitMajorVersion() | this is not WebKit => undefined");
        return void 0;
      }
      function isIOS(userAgent, userAgentData) {
        logger.debug("isIOS()");
        if ((userAgentData == null ? void 0 : userAgentData.platform) === "iOS") {
          logger.debug("isIOS() | this is iOS based on NavigatorUAData.platform => true");
          return true;
        }
        if (userAgentData == null ? void 0 : userAgentData.platform) {
          logger.debug("isIOS() | this is not iOS based on NavigatorUAData.platform => false");
          return false;
        }
        if (userAgent && /iPad|iPhone|iPod/.test(userAgent)) {
          logger.debug("isIOS() | this is iOS based on User-Agent => true");
          return true;
        }
        if (typeof navigator === "object" && navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
          logger.debug("isIOS() | this is iPadOS 13+ based on User-Agent => true");
          return true;
        }
        logger.debug("isIOS() | this is not iOS => false");
        return false;
      }
      function isReactNative() {
        logger.debug("isReactNative()");
        if (typeof navigator === "object" && navigator.product === "ReactNative") {
          logger.debug("isReactNative() | this is React-Native based on navigator.product");
          return true;
        }
        logger.debug("isReactNative() | this is not React-Native => false");
        return false;
      }
    }
  });

  // node_modules/@lukeed/uuid/dist/index.js
  var require_dist = __commonJS({
    "node_modules/@lukeed/uuid/dist/index.js"(exports) {
      var IDX = 256;
      var HEX = [];
      var BUFFER;
      while (IDX--) HEX[IDX] = (IDX + 256).toString(16).substring(1);
      function v4() {
        var i = 0, num, out = "";
        if (!BUFFER || IDX + 16 > 256) {
          BUFFER = Array(i = 256);
          while (i--) BUFFER[i] = 256 * Math.random() | 0;
          i = IDX = 0;
        }
        for (; i < 16; i++) {
          num = BUFFER[IDX + i];
          if (i == 6) out += HEX[num & 15 | 64];
          else if (i == 8) out += HEX[num & 63 | 128];
          else out += HEX[num];
          if (i & 1 && i > 1 && i < 11) out += "-";
        }
        IDX++;
        return out;
      }
      exports.v4 = v4;
    }
  });

  // node_modules/fake-mediastreamtrack/lib/fakeEvents/FakeEventTarget.js
  var require_FakeEventTarget = __commonJS({
    "node_modules/fake-mediastreamtrack/lib/fakeEvents/FakeEventTarget.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.FakeEventTarget = void 0;
      var FakeEventTarget = class {
        listeners = {};
        addEventListener(type, callback, options) {
          if (!callback) {
            return;
          }
          this.listeners[type] = this.listeners[type] ?? [];
          this.listeners[type].push({
            callback: (
              // eslint-disable-next-line @typescript-eslint/unbound-method
              typeof callback === "function" ? callback : callback.handleEvent
            ),
            once: typeof options === "object" && options.once === true
          });
        }
        removeEventListener(type, callback, options) {
          if (!this.listeners[type]) {
            return;
          }
          if (!callback) {
            return;
          }
          this.listeners[type] = this.listeners[type].filter((listener) => listener.callback !== // eslint-disable-next-line @typescript-eslint/unbound-method
          (typeof callback === "function" ? callback : callback.handleEvent));
        }
        dispatchEvent(event) {
          if (!event || typeof event.type !== "string") {
            throw new Error("invalid event object");
          }
          const entries = this.listeners[event.type];
          if (!entries) {
            return true;
          }
          for (const listener of [...entries]) {
            try {
              listener.callback.call(this, event);
            } catch (error) {
              setTimeout(() => {
                throw error;
              }, 0);
            }
            if (listener.once) {
              this.removeEventListener(event.type, listener.callback);
            }
          }
          return !event.defaultPrevented;
        }
      };
      exports.FakeEventTarget = FakeEventTarget;
    }
  });

  // node_modules/fake-mediastreamtrack/lib/fakeEvents/FakeEvent.js
  var require_FakeEvent = __commonJS({
    "node_modules/fake-mediastreamtrack/lib/fakeEvents/FakeEvent.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.FakeEvent = void 0;
      var FakeEvent = class {
        /**
         * Constants.
         */
        NONE = 0;
        CAPTURING_PHASE = 1;
        AT_TARGET = 2;
        BUBBLING_PHASE = 3;
        /**
         * Members.
         */
        type;
        bubbles;
        cancelable;
        defaultPrevented = false;
        composed = false;
        currentTarget = null;
        // Not implemented.
        eventPhase = this.NONE;
        isTrusted = true;
        target = null;
        timeStamp = 0;
        // Deprecated.
        cancelBubble = false;
        returnValue = true;
        srcElement = null;
        constructor(type, options = {}) {
          this.type = type;
          this.bubbles = options.bubbles ?? false;
          this.cancelable = options.cancelable ?? false;
        }
        preventDefault() {
          if (this.cancelable) {
            this.defaultPrevented = true;
          }
        }
        /**
         * Not implemented.
         */
        stopPropagation() {
        }
        /**
         * Not implemented.
         */
        stopImmediatePropagation() {
        }
        /**
         * Not implemented.
         */
        composedPath() {
          return [];
        }
        /**
         * Not implemented.
         * @deprecated
         */
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        initEvent(type, bubbles, cancelable) {
        }
      };
      exports.FakeEvent = FakeEvent;
    }
  });

  // node_modules/fake-mediastreamtrack/lib/utils.js
  var require_utils3 = __commonJS({
    "node_modules/fake-mediastreamtrack/lib/utils.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.clone = clone;
      function clone(value) {
        if (value === void 0) {
          return void 0;
        } else if (Number.isNaN(value)) {
          return NaN;
        } else if (typeof structuredClone === "function") {
          return structuredClone(value);
        } else {
          return JSON.parse(JSON.stringify(value));
        }
      }
    }
  });

  // node_modules/fake-mediastreamtrack/lib/index.js
  var require_lib4 = __commonJS({
    "node_modules/fake-mediastreamtrack/lib/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.FakeMediaStreamTrack = void 0;
      var uuid_1 = require_dist();
      var FakeEventTarget_1 = require_FakeEventTarget();
      var FakeEvent_1 = require_FakeEvent();
      var utils_1 = require_utils3();
      var FakeMediaStreamTrack = class _FakeMediaStreamTrack extends FakeEventTarget_1.FakeEventTarget {
        #id;
        #kind;
        #label;
        #readyState;
        #enabled;
        #muted;
        #contentHint;
        #capabilities;
        #constraints;
        #settings;
        #data;
        // Events.
        #onmute = null;
        #onunmute = null;
        #onended = null;
        // Custom events.
        #onenabledchange = null;
        #onstopped = null;
        constructor({ kind, id, label, contentHint, enabled, muted, readyState, capabilities, constraints, settings, data }) {
          super();
          this.#id = id ?? (0, uuid_1.v4)();
          this.#kind = kind;
          this.#label = label ?? "";
          this.#contentHint = contentHint ?? "";
          this.#enabled = enabled ?? true;
          this.#muted = muted ?? false;
          this.#readyState = readyState ?? "live";
          this.#capabilities = capabilities ?? {};
          this.#constraints = constraints ?? {};
          this.#settings = settings ?? {};
          this.#data = data ?? {};
        }
        get id() {
          return this.#id;
        }
        get kind() {
          return this.#kind;
        }
        get label() {
          return this.#label;
        }
        get contentHint() {
          return this.#contentHint;
        }
        set contentHint(contentHint) {
          this.#contentHint = contentHint;
        }
        get enabled() {
          return this.#enabled;
        }
        /**
         * Changes `enabled` member value and fires a custom "enabledchange" event.
         */
        set enabled(enabled) {
          const changed = this.#enabled !== enabled;
          this.#enabled = enabled;
          if (changed) {
            this.dispatchEvent(new FakeEvent_1.FakeEvent("enabledchange"));
          }
        }
        get muted() {
          return this.#muted;
        }
        get readyState() {
          return this.#readyState;
        }
        /**
         * Application custom data getter.
         */
        get data() {
          return this.#data;
        }
        /**
         * Application custom data setter.
         */
        set data(data) {
          this.#data = data;
        }
        get onmute() {
          return this.#onmute;
        }
        set onmute(handler) {
          if (this.#onmute) {
            this.removeEventListener("mute", this.#onmute);
          }
          this.#onmute = handler;
          if (handler) {
            this.addEventListener("mute", handler);
          }
        }
        get onunmute() {
          return this.#onunmute;
        }
        set onunmute(handler) {
          if (this.#onunmute) {
            this.removeEventListener("unmute", this.#onunmute);
          }
          this.#onunmute = handler;
          if (handler) {
            this.addEventListener("unmute", handler);
          }
        }
        get onended() {
          return this.#onended;
        }
        set onended(handler) {
          if (this.#onended) {
            this.removeEventListener("ended", this.#onended);
          }
          this.#onended = handler;
          if (handler) {
            this.addEventListener("ended", handler);
          }
        }
        get onenabledchange() {
          return this.#onenabledchange;
        }
        set onenabledchange(handler) {
          if (this.#onenabledchange) {
            this.removeEventListener("enabledchange", this.#onenabledchange);
          }
          this.#onenabledchange = handler;
          if (handler) {
            this.addEventListener("enabledchange", handler);
          }
        }
        get onstopped() {
          return this.#onstopped;
        }
        set onstopped(handler) {
          if (this.#onstopped) {
            this.removeEventListener("stopped", this.#onstopped);
          }
          this.#onstopped = handler;
          if (handler) {
            this.addEventListener("stopped", handler);
          }
        }
        addEventListener(type, listener, options) {
          super.addEventListener(type, listener, options);
        }
        removeEventListener(type, listener, options) {
          super.removeEventListener(type, listener, options);
        }
        /**
         * Changes `readyState` member to "ended" and fires a custom "stopped" event
         * (if not already stopped).
         */
        stop() {
          if (this.#readyState === "ended") {
            return;
          }
          this.#readyState = "ended";
          this.dispatchEvent(new FakeEvent_1.FakeEvent("stopped"));
        }
        /**
         * Clones current track into another FakeMediaStreamTrack. `id` and `data`
         * can be optionally given.
         */
        clone({ id, data } = {}) {
          return new _FakeMediaStreamTrack({
            id: id ?? (0, uuid_1.v4)(),
            kind: this.#kind,
            label: this.#label,
            contentHint: this.#contentHint,
            enabled: this.#enabled,
            muted: this.#muted,
            readyState: this.#readyState,
            capabilities: (0, utils_1.clone)(this.#capabilities),
            constraints: (0, utils_1.clone)(this.#constraints),
            settings: (0, utils_1.clone)(this.#settings),
            data: data ?? (0, utils_1.clone)(this.#data)
          });
        }
        getCapabilities() {
          return this.#capabilities;
        }
        getConstraints() {
          return this.#constraints;
        }
        async applyConstraints(constraints = {}) {
          this.#constraints = constraints;
          return Promise.resolve();
        }
        getSettings() {
          return this.#settings;
        }
        /**
         * Simulates a remotely triggered stop. It fires a custom "stopped" event and
         * the standard "ended" event (if the track was not already stopped).
         */
        remoteStop() {
          if (this.#readyState === "ended") {
            return;
          }
          this.#readyState = "ended";
          this.dispatchEvent(new FakeEvent_1.FakeEvent("stopped"));
          this.dispatchEvent(new FakeEvent_1.FakeEvent("ended"));
        }
        /**
         * Simulates a remotely triggered mute. It fires a "mute" event (if the track
         * was not already muted).
         */
        remoteMute() {
          if (this.#muted) {
            return;
          }
          this.#muted = true;
          this.dispatchEvent(new FakeEvent_1.FakeEvent("mute"));
        }
        /**
         * Simulates a remotely triggered unmute. It fires an "unmute" event (if the
         * track was muted).
         */
        remoteUnmute() {
          if (!this.#muted) {
            return;
          }
          this.#muted = false;
          this.dispatchEvent(new FakeEvent_1.FakeEvent("unmute"));
        }
      };
      exports.FakeMediaStreamTrack = FakeMediaStreamTrack;
    }
  });

  // node_modules/mediasoup-client/lib/handlers/fakeEvents/FakeEventTarget.js
  var require_FakeEventTarget2 = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/fakeEvents/FakeEventTarget.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.FakeEventTarget = void 0;
      var FakeEventTarget = class {
        listeners = {};
        addEventListener(type, callback, options) {
          if (!callback) {
            return;
          }
          this.listeners[type] = this.listeners[type] ?? [];
          this.listeners[type].push({
            callback: typeof callback === "function" ? callback : callback.handleEvent,
            once: typeof options === "object" && options.once === true
          });
        }
        removeEventListener(type, callback, options) {
          if (!this.listeners[type]) {
            return;
          }
          if (!callback) {
            return;
          }
          this.listeners[type] = this.listeners[type].filter((listener) => listener.callback !== (typeof callback === "function" ? callback : callback.handleEvent));
        }
        dispatchEvent(event) {
          if (!event || typeof event.type !== "string") {
            throw new Error("invalid event object");
          }
          const entries = this.listeners[event.type];
          if (!entries) {
            return true;
          }
          for (const listener of [...entries]) {
            try {
              listener.callback.call(this, event);
            } catch (error) {
              setTimeout(() => {
                throw error;
              }, 0);
            }
            if (listener.once) {
              this.removeEventListener(event.type, listener.callback);
            }
          }
          return !event.defaultPrevented;
        }
      };
      exports.FakeEventTarget = FakeEventTarget;
    }
  });

  // node_modules/mediasoup-client/lib/handlers/FakeHandler.js
  var require_FakeHandler = __commonJS({
    "node_modules/mediasoup-client/lib/handlers/FakeHandler.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.FakeHandler = void 0;
      var fake_mediastreamtrack_1 = require_lib4();
      var enhancedEvents_1 = require_enhancedEvents();
      var Logger_1 = require_Logger();
      var utils = require_utils();
      var ortc = require_ortc();
      var errors_1 = require_errors();
      var FakeEventTarget_1 = require_FakeEventTarget2();
      var logger = new Logger_1.Logger("FakeHandler");
      var NAME = "FakeHandler";
      var FakeHandler = class _FakeHandler extends enhancedEvents_1.EnhancedEventEmitter {
        // Closed flag.
        _closed = false;
        // Fake parameters source of RTP and SCTP parameters and capabilities.
        _fakeParameters;
        // Callback to request sending extended RTP capabilities on demand.
        _getSendExtendedRtpCapabilities;
        // Local RTCP CNAME.
        _cname = `CNAME-${utils.generateRandomNumber()}`;
        // Default sending MediaStream id.
        _defaultSendStreamId = `${utils.generateRandomNumber()}`;
        // Got transport local and remote parameters.
        _transportReady = false;
        // Next localId.
        _nextLocalId = 1;
        // Sending and receiving tracks indexed by localId.
        _tracks = /* @__PURE__ */ new Map();
        // DataChannel id value counter. It must be incremented for each new DataChannel.
        _nextSctpStreamId = 0;
        /**
         * Creates a factory function.
         */
        static createFactory(fakeParameters) {
          return {
            name: NAME,
            factory: (options) => new _FakeHandler(options, fakeParameters),
            getNativeRtpCapabilities: async ({ direction }) => {
              logger.debug("getNativeRtpCapabilities() [direction:%o]", direction);
              return _FakeHandler.getLocalRtpCapabilities(fakeParameters);
            },
            getNativeSctpCapabilities: async () => {
              logger.debug("getNativeSctpCapabilities()");
              return fakeParameters.generateNativeSctpCapabilities();
            }
          };
        }
        static getLocalRtpCapabilities(fakeParameters) {
          const nativeRtpCapabilities = fakeParameters.generateNativeRtpCapabilities();
          ortc.validateAndNormalizeRtpCapabilities(nativeRtpCapabilities);
          return nativeRtpCapabilities;
        }
        constructor({
          // direction,
          // iceParameters,
          // iceCandidates,
          // dtlsParameters,
          // sctpParameters,
          // iceServers,
          // iceTransportPolicy,
          // additionalSettings,
          getSendExtendedRtpCapabilities
        }, fakeParameters) {
          super();
          logger.debug("constructor()");
          this._getSendExtendedRtpCapabilities = getSendExtendedRtpCapabilities;
          this._fakeParameters = fakeParameters;
        }
        get name() {
          return NAME;
        }
        close() {
          logger.debug("close()");
          if (this._closed) {
            return;
          }
          this._closed = true;
          super.close();
        }
        // NOTE: Custom method for simulation purposes.
        setIceGatheringState(iceGatheringState) {
          this.emit("@icegatheringstatechange", iceGatheringState);
        }
        // NOTE: Custom method for simulation purposes.
        setConnectionState(connectionState) {
          this.emit("@connectionstatechange", connectionState);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async updateIceServers(iceServers) {
          this.assertNotClosed();
          logger.debug("updateIceServers()");
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async restartIce(iceParameters) {
          this.assertNotClosed();
          logger.debug("restartIce()");
        }
        async getTransportStats() {
          this.assertNotClosed();
          return /* @__PURE__ */ new Map();
        }
        async send({ track, streamId, encodings, codecOptions, codec }) {
          this.assertNotClosed();
          logger.debug("send() [kind:%s, track.id:%s]", track.kind, track.id);
          if (!this._transportReady) {
            await this.setupTransport({ localDtlsRole: "server" });
          }
          const nativeRtpCapabilities = _FakeHandler.getLocalRtpCapabilities(this._fakeParameters);
          const sendExtendedRtpCapabilities = this._getSendExtendedRtpCapabilities(nativeRtpCapabilities);
          const sendingRtpParameters = ortc.getSendingRtpParameters(track.kind, sendExtendedRtpCapabilities);
          sendingRtpParameters.codecs = ortc.reduceCodecs(sendingRtpParameters.codecs, codec);
          const useRtx = sendingRtpParameters.codecs.some((_codec) => /.+\/rtx$/i.test(_codec.mimeType));
          sendingRtpParameters.mid = `mid-${utils.generateRandomNumber()}`;
          sendingRtpParameters.msid = `${streamId ?? "-"} ${track.id}`;
          if (!encodings) {
            encodings = [{}];
          }
          for (const encoding of encodings) {
            encoding.ssrc = utils.generateRandomNumber();
            if (useRtx) {
              encoding.rtx = { ssrc: utils.generateRandomNumber() };
            }
          }
          sendingRtpParameters.encodings = encodings;
          sendingRtpParameters.rtcp = {
            cname: this._cname,
            reducedSize: true,
            mux: true
          };
          sendingRtpParameters.msid = `${streamId ?? this._defaultSendStreamId} ${track.id}`;
          const localId = this._nextLocalId++;
          this._tracks.set(localId, track);
          return { localId: String(localId), rtpParameters: sendingRtpParameters };
        }
        async stopSending(localId) {
          logger.debug("stopSending() [localId:%s]", localId);
          if (this._closed) {
            return;
          }
          if (!this._tracks.has(Number(localId))) {
            throw new Error("local track not found");
          }
          this._tracks.delete(Number(localId));
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async pauseSending(localId) {
          this.assertNotClosed();
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async resumeSending(localId) {
          this.assertNotClosed();
        }
        async replaceTrack(localId, track) {
          this.assertNotClosed();
          if (track) {
            logger.debug("replaceTrack() [localId:%s, track.id:%s]", localId, track.id);
          } else {
            logger.debug("replaceTrack() [localId:%s, no track]", localId);
          }
          this._tracks.delete(Number(localId));
          this._tracks.set(Number(localId), track);
        }
        async setMaxSpatialLayer(localId, spatialLayer) {
          this.assertNotClosed();
          logger.debug("setMaxSpatialLayer() [localId:%s, spatialLayer:%s]", localId, spatialLayer);
        }
        async setRtpEncodingParameters(localId, params) {
          this.assertNotClosed();
          logger.debug("setRtpEncodingParameters() [localId:%s, params:%o]", localId, params);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async getSenderStats(localId) {
          this.assertNotClosed();
          return /* @__PURE__ */ new Map();
        }
        async sendDataChannel({ sctpStreamParameters }) {
          this.assertNotClosed();
          if (!this._transportReady) {
            await this.setupTransport({ localDtlsRole: "server" });
          }
          logger.debug("sendDataChannel()");
          const dataChannel = new FakeRTCDataChannel({
            id: this._nextSctpStreamId++,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits,
            label: sctpStreamParameters.label,
            protocol: sctpStreamParameters.protocol
          });
          const newSctpStreamParameters = {
            streamId: this._nextSctpStreamId,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits
          };
          return { dataChannel, sctpStreamParameters: newSctpStreamParameters };
        }
        async receive(optionsList) {
          this.assertNotClosed();
          const results = [];
          for (const options of optionsList) {
            const { trackId, kind } = options;
            if (!this._transportReady) {
              await this.setupTransport({ localDtlsRole: "client" });
            }
            logger.debug("receive() [trackId:%s, kind:%s]", trackId, kind);
            const localId = this._nextLocalId++;
            const track = new fake_mediastreamtrack_1.FakeMediaStreamTrack({ kind });
            this._tracks.set(localId, track);
            results.push({ localId: String(localId), track });
          }
          return results;
        }
        async stopReceiving(localIds) {
          if (this._closed) {
            return;
          }
          for (const localId of localIds) {
            logger.debug("stopReceiving() [localId:%s]", localId);
            this._tracks.delete(Number(localId));
          }
        }
        async pauseReceiving(localIds) {
          this.assertNotClosed();
        }
        async resumeReceiving(localIds) {
          this.assertNotClosed();
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        async getReceiverStats(localId) {
          this.assertNotClosed();
          return /* @__PURE__ */ new Map();
        }
        async receiveDataChannel({
          // maxMessageSize,
          sctpStreamParameters,
          label,
          protocol
        }) {
          this.assertNotClosed();
          if (!this._transportReady) {
            await this.setupTransport({ localDtlsRole: "client" });
          }
          logger.debug("receiveDataChannel()");
          const dataChannel = new FakeRTCDataChannel({
            id: sctpStreamParameters.streamId,
            ordered: sctpStreamParameters.ordered,
            maxPacketLifeTime: sctpStreamParameters.maxPacketLifeTime,
            maxRetransmits: sctpStreamParameters.maxRetransmits,
            label,
            protocol
          });
          return { dataChannel };
        }
        getDataChannelMaxMessageSize() {
          return 5e5;
        }
        async setupTransport({
          localDtlsRole,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          localSdpObject
        }) {
          const dtlsParameters = utils.clone(this._fakeParameters.generateLocalDtlsParameters());
          if (localDtlsRole) {
            dtlsParameters.role = localDtlsRole;
          }
          this.emit("@connectionstatechange", "connecting");
          await new Promise((resolve, reject) => this.emit("@connect", { dtlsParameters }, resolve, reject));
          this._transportReady = true;
        }
        assertNotClosed() {
          if (this._closed) {
            throw new errors_1.InvalidStateError("method called in a closed handler");
          }
        }
      };
      exports.FakeHandler = FakeHandler;
      var FakeRTCDataChannel = class extends FakeEventTarget_1.FakeEventTarget {
        // Members for RTCDataChannel standard public getters/setters.
        _id;
        _negotiated = true;
        // mediasoup just uses negotiated DataChannels.
        _ordered;
        _maxPacketLifeTime;
        _maxRetransmits;
        _label;
        _protocol;
        _readyState = "connecting";
        _bufferedAmount = 0;
        _bufferedAmountLowThreshold = 0;
        _binaryType = "arraybuffer";
        // Events.
        _onopen = null;
        _onclosing = null;
        _onclose = null;
        _onmessage = null;
        _onbufferedamountlow = null;
        _onerror = null;
        constructor({ id, ordered = true, maxPacketLifeTime = null, maxRetransmits = null, label = "", protocol = "" }) {
          super();
          logger.debug(`constructor() [id:${id}, ordered:${ordered}, maxPacketLifeTime:${maxPacketLifeTime}, maxRetransmits:${maxRetransmits}, label:${label}, protocol:${protocol}`);
          this._id = id;
          this._ordered = ordered;
          this._maxPacketLifeTime = maxPacketLifeTime;
          this._maxRetransmits = maxRetransmits;
          this._label = label;
          this._protocol = protocol;
        }
        get id() {
          return this._id;
        }
        get negotiated() {
          return this._negotiated;
        }
        get ordered() {
          return this._ordered;
        }
        get maxPacketLifeTime() {
          return this._maxPacketLifeTime;
        }
        get maxRetransmits() {
          return this._maxRetransmits;
        }
        get label() {
          return this._label;
        }
        get protocol() {
          return this._protocol;
        }
        get readyState() {
          return this._readyState;
        }
        get bufferedAmount() {
          return this._bufferedAmount;
        }
        get bufferedAmountLowThreshold() {
          return this._bufferedAmountLowThreshold;
        }
        set bufferedAmountLowThreshold(value) {
          this._bufferedAmountLowThreshold = value;
        }
        get binaryType() {
          return this._binaryType;
        }
        set binaryType(binaryType) {
          this._binaryType = binaryType;
        }
        get onopen() {
          return this._onopen;
        }
        set onopen(handler) {
          if (this._onopen) {
            this.removeEventListener("open", this._onopen);
          }
          this._onopen = handler;
          if (handler) {
            this.addEventListener("open", handler);
          }
        }
        get onclosing() {
          return this._onclosing;
        }
        set onclosing(handler) {
          if (this._onclosing) {
            this.removeEventListener("closing", this._onclosing);
          }
          this._onclosing = handler;
          if (handler) {
            this.addEventListener("closing", handler);
          }
        }
        get onclose() {
          return this._onclose;
        }
        set onclose(handler) {
          if (this._onclose) {
            this.removeEventListener("close", this._onclose);
          }
          this._onclose = handler;
          if (handler) {
            this.addEventListener("close", handler);
          }
        }
        get onmessage() {
          return this._onmessage;
        }
        set onmessage(handler) {
          if (this._onmessage) {
            this.removeEventListener("message", this._onmessage);
          }
          this._onmessage = handler;
          if (handler) {
            this.addEventListener("message", handler);
          }
        }
        get onbufferedamountlow() {
          return this._onbufferedamountlow;
        }
        set onbufferedamountlow(handler) {
          if (this._onbufferedamountlow) {
            this.removeEventListener("bufferedamountlow", this._onbufferedamountlow);
          }
          this._onbufferedamountlow = handler;
          if (handler) {
            this.addEventListener("bufferedamountlow", handler);
          }
        }
        get onerror() {
          return this._onerror;
        }
        set onerror(handler) {
          if (this._onerror) {
            this.removeEventListener("error", this._onerror);
          }
          this._onerror = handler;
          if (handler) {
            this.addEventListener("error", handler);
          }
        }
        addEventListener(type, listener, options) {
          super.addEventListener(type, listener, options);
        }
        removeEventListener(type, listener, options) {
          super.removeEventListener(type, listener, options);
        }
        close() {
          if (["closing", "closed"].includes(this._readyState)) {
            return;
          }
          this._readyState = "closed";
        }
        /**
         * We extend the definition of send() to allow Node Buffer. However
         * ArrayBufferView and Blob do not exist in Node.
         */
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        send(data) {
          if (this._readyState !== "open") {
            throw new errors_1.InvalidStateError("not open");
          }
        }
      };
    }
  });

  // node_modules/mediasoup-client/lib/test/fakeParameters.js
  var require_fakeParameters = __commonJS({
    "node_modules/mediasoup-client/lib/test/fakeParameters.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.generateRouterRtpCapabilities = generateRouterRtpCapabilities;
      exports.generateNativeRtpCapabilities = generateNativeRtpCapabilities;
      exports.generateNativeSctpCapabilities = generateNativeSctpCapabilities;
      exports.generateLocalDtlsParameters = generateLocalDtlsParameters;
      exports.generateTransportRemoteParameters = generateTransportRemoteParameters;
      exports.generateProducerRemoteParameters = generateProducerRemoteParameters;
      exports.generateConsumerRemoteParameters = generateConsumerRemoteParameters;
      exports.generateDataProducerRemoteParameters = generateDataProducerRemoteParameters;
      exports.generateDataConsumerRemoteParameters = generateDataConsumerRemoteParameters;
      var utils = require_utils();
      function generateFakeUuid() {
        return String(utils.generateRandomNumber());
      }
      function generateRouterRtpCapabilities() {
        return utils.deepFreeze({
          codecs: [
            {
              mimeType: "audio/opus",
              kind: "audio",
              preferredPayloadType: 100,
              clockRate: 48e3,
              channels: 2,
              rtcpFeedback: [{ type: "transport-cc" }],
              parameters: {
                useinbandfec: 1,
                foo: "bar"
              }
            },
            {
              mimeType: "video/VP8",
              kind: "video",
              preferredPayloadType: 101,
              clockRate: 9e4,
              rtcpFeedback: [
                { type: "nack" },
                { type: "nack", parameter: "pli" },
                { type: "ccm", parameter: "fir" },
                { type: "goog-remb" },
                { type: "transport-cc" }
              ],
              parameters: {
                "x-google-start-bitrate": 1500
              }
            },
            {
              mimeType: "video/rtx",
              kind: "video",
              preferredPayloadType: 102,
              clockRate: 9e4,
              rtcpFeedback: [],
              parameters: {
                apt: 101
              }
            },
            {
              mimeType: "video/H264",
              kind: "video",
              preferredPayloadType: 103,
              clockRate: 9e4,
              rtcpFeedback: [
                { type: "nack" },
                { type: "nack", parameter: "pli" },
                { type: "ccm", parameter: "fir" },
                { type: "goog-remb" },
                { type: "transport-cc" }
              ],
              parameters: {
                "level-asymmetry-allowed": 1,
                "packetization-mode": 1,
                "profile-level-id": "42e01f"
              }
            },
            {
              mimeType: "video/rtx",
              kind: "video",
              preferredPayloadType: 104,
              clockRate: 9e4,
              rtcpFeedback: [],
              parameters: {
                apt: 103
              }
            },
            {
              mimeType: "video/VP9",
              kind: "video",
              preferredPayloadType: 105,
              clockRate: 9e4,
              rtcpFeedback: [
                { type: "nack" },
                { type: "nack", parameter: "pli" },
                { type: "ccm", parameter: "fir" },
                { type: "goog-remb" },
                { type: "transport-cc" }
              ],
              parameters: {
                "profile-id": 0,
                "x-google-start-bitrate": 1500
              }
            },
            {
              mimeType: "video/rtx",
              kind: "video",
              preferredPayloadType: 106,
              clockRate: 9e4,
              rtcpFeedback: [],
              parameters: {
                apt: 105
              }
            }
          ],
          headerExtensions: [
            {
              kind: "audio",
              uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
              preferredId: 1,
              preferredEncrypt: false,
              direction: "sendrecv"
            },
            {
              kind: "video",
              uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
              preferredId: 1,
              preferredEncrypt: false,
              direction: "sendrecv"
            },
            {
              kind: "video",
              uri: "urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id",
              preferredId: 2,
              preferredEncrypt: false,
              direction: "recvonly"
            },
            {
              kind: "video",
              uri: "urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id",
              preferredId: 3,
              preferredEncrypt: false,
              direction: "recvonly"
            },
            {
              kind: "audio",
              uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
              preferredId: 4,
              preferredEncrypt: false,
              direction: "sendrecv"
            },
            {
              kind: "video",
              uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
              preferredId: 4,
              preferredEncrypt: false,
              direction: "sendrecv"
            },
            {
              kind: "audio",
              uri: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
              preferredId: 5,
              preferredEncrypt: false,
              direction: "recvonly"
            },
            {
              kind: "video",
              uri: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
              preferredId: 5,
              preferredEncrypt: false,
              direction: "sendrecv"
            },
            {
              kind: "audio",
              uri: "urn:ietf:params:rtp-hdrext:ssrc-audio-level",
              preferredId: 10,
              preferredEncrypt: false,
              direction: "sendrecv"
            },
            {
              kind: "video",
              uri: "urn:3gpp:video-orientation",
              preferredId: 11,
              preferredEncrypt: false,
              direction: "sendrecv"
            },
            {
              kind: "video",
              uri: "urn:ietf:params:rtp-hdrext:toffset",
              preferredId: 12,
              preferredEncrypt: false,
              direction: "sendrecv"
            }
          ]
        });
      }
      function generateNativeRtpCapabilities() {
        return {
          codecs: [
            {
              mimeType: "audio/opus",
              kind: "audio",
              preferredPayloadType: 111,
              clockRate: 48e3,
              channels: 2,
              rtcpFeedback: [{ type: "transport-cc" }],
              parameters: {
                minptime: 10,
                useinbandfec: 1
              }
            },
            {
              mimeType: "audio/ISAC",
              kind: "audio",
              preferredPayloadType: 103,
              clockRate: 16e3,
              channels: 1,
              rtcpFeedback: [{ type: "transport-cc" }],
              parameters: {}
            },
            {
              mimeType: "audio/CN",
              kind: "audio",
              preferredPayloadType: 106,
              clockRate: 32e3,
              channels: 1,
              rtcpFeedback: [{ type: "transport-cc" }],
              parameters: {}
            },
            {
              mimeType: "audio/foo",
              kind: "audio",
              preferredPayloadType: 107,
              clockRate: 9e4,
              channels: 4,
              rtcpFeedback: [{ type: "foo-qwe-qwe" }],
              parameters: {
                foo: "lalala"
              }
            },
            {
              mimeType: "video/BAZCODEC",
              kind: "video",
              preferredPayloadType: 100,
              clockRate: 9e4,
              rtcpFeedback: [
                { type: "foo" },
                { type: "transport-cc" },
                { type: "ccm", parameter: "fir" },
                { type: "nack" },
                { type: "nack", parameter: "pli" }
              ],
              parameters: {
                baz: "1234abcd"
              }
            },
            {
              mimeType: "video/rtx",
              kind: "video",
              preferredPayloadType: 101,
              clockRate: 9e4,
              rtcpFeedback: [],
              parameters: {
                apt: 100
              }
            },
            {
              mimeType: "video/VP8",
              kind: "video",
              preferredPayloadType: 96,
              clockRate: 9e4,
              rtcpFeedback: [
                { type: "goog-remb" },
                { type: "transport-cc" },
                { type: "ccm", parameter: "fir" },
                { type: "nack" },
                { type: "nack", parameter: "pli" }
              ],
              parameters: {
                baz: "1234abcd"
              }
            },
            {
              mimeType: "video/rtx",
              kind: "video",
              preferredPayloadType: 97,
              clockRate: 9e4,
              rtcpFeedback: [],
              parameters: {
                apt: 96
              }
            },
            {
              mimeType: "video/VP9",
              kind: "video",
              preferredPayloadType: 98,
              clockRate: 9e4,
              rtcpFeedback: [
                { type: "goog-remb" },
                { type: "transport-cc" },
                { type: "ccm", parameter: "fir" },
                { type: "nack" },
                { type: "nack", parameter: "pli" }
              ],
              parameters: {
                "profile-id": 0
              }
            },
            {
              mimeType: "video/rtx",
              kind: "video",
              preferredPayloadType: 99,
              clockRate: 9e4,
              rtcpFeedback: [],
              parameters: {
                apt: 98
              }
            }
          ],
          headerExtensions: [
            {
              kind: "audio",
              uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
              preferredId: 1
            },
            {
              kind: "video",
              uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
              preferredId: 1
            },
            {
              kind: "video",
              uri: "urn:ietf:params:rtp-hdrext:toffset",
              preferredId: 2
            },
            {
              kind: "video",
              uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
              preferredId: 3
            },
            {
              kind: "video",
              uri: "urn:3gpp:video-orientation",
              preferredId: 4
            },
            {
              kind: "video",
              uri: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
              preferredId: 5
            },
            {
              kind: "video",
              uri: "http://www.webrtc.org/experiments/rtp-hdrext/playout-delay",
              preferredId: 6
            },
            {
              kind: "video",
              // @ts-expect-error --- ON purpose.
              uri: "http://www.webrtc.org/experiments/rtp-hdrext/video-content-type",
              preferredId: 7
            },
            {
              kind: "video",
              // @ts-expect-error --- ON purpose.
              uri: "http://www.webrtc.org/experiments/rtp-hdrext/video-timing",
              preferredId: 8
            },
            {
              kind: "audio",
              uri: "urn:ietf:params:rtp-hdrext:ssrc-audio-level",
              preferredId: 10
            }
          ]
        };
      }
      function generateNativeSctpCapabilities() {
        return utils.deepFreeze({
          numStreams: { OS: 2048, MIS: 2048 }
        });
      }
      function generateLocalDtlsParameters() {
        return utils.deepFreeze({
          fingerprints: [
            {
              algorithm: "sha-256",
              value: "82:5A:68:3D:36:C3:0A:DE:AF:E7:32:43:D2:88:83:57:AC:2D:65:E5:80:C4:B6:FB:AF:1A:A0:21:9F:6D:0C:AD"
            }
          ],
          role: "auto"
        });
      }
      function generateTransportRemoteParameters() {
        return {
          id: generateFakeUuid(),
          iceParameters: utils.deepFreeze({
            iceLite: true,
            password: "yku5ej8nvfaor28lvtrabcx0wkrpkztz",
            usernameFragment: "h3hk1iz6qqlnqlne"
          }),
          iceCandidates: utils.deepFreeze([
            {
              foundation: "udpcandidate",
              address: "9.9.9.9",
              ip: "9.9.9.9",
              port: 40533,
              priority: 1078862079,
              protocol: "udp",
              type: "host",
              tcpType: "passive"
            },
            {
              foundation: "udpcandidate",
              address: "9.9.9.9",
              ip: "9:9:9:9:9:9",
              port: 41333,
              priority: 1078862089,
              protocol: "udp",
              type: "host",
              tcpType: "passive"
            }
          ]),
          dtlsParameters: utils.deepFreeze({
            fingerprints: [
              {
                algorithm: "sha-256",
                value: "A9:F4:E0:D2:74:D3:0F:D9:CA:A5:2F:9F:7F:47:FA:F0:C4:72:DD:73:49:D0:3B:14:90:20:51:30:1B:90:8E:71"
              },
              {
                algorithm: "sha-384",
                value: "03:D9:0B:87:13:98:F6:6D:BC:FC:92:2E:39:D4:E1:97:32:61:30:56:84:70:81:6E:D1:82:97:EA:D9:C1:21:0F:6B:C5:E7:7F:E1:97:0C:17:97:6E:CF:B3:EF:2E:74:B0"
              },
              {
                algorithm: "sha-512",
                value: "84:27:A4:28:A4:73:AF:43:02:2A:44:68:FF:2F:29:5C:3B:11:9A:60:F4:A8:F0:F5:AC:A0:E3:49:3E:B1:34:53:A9:85:CE:51:9B:ED:87:5E:B8:F4:8E:3D:FA:20:51:B8:96:EE:DA:56:DC:2F:5C:62:79:15:23:E0:21:82:2B:2C"
              }
            ],
            role: "auto"
          }),
          sctpParameters: utils.deepFreeze({
            port: 5e3,
            OS: 2048,
            MIS: 2048,
            maxMessageSize: 2e6
          })
        };
      }
      function generateProducerRemoteParameters() {
        return utils.deepFreeze({
          id: generateFakeUuid()
        });
      }
      function generateConsumerRemoteParameters({ id, codecMimeType } = {}) {
        switch (codecMimeType) {
          case "audio/opus": {
            return {
              id: id ?? generateFakeUuid(),
              producerId: generateFakeUuid(),
              kind: "audio",
              rtpParameters: utils.deepFreeze({
                codecs: [
                  {
                    mimeType: "audio/opus",
                    payloadType: 100,
                    clockRate: 48e3,
                    channels: 2,
                    rtcpFeedback: [{ type: "transport-cc" }],
                    parameters: {
                      useinbandfec: 1,
                      foo: "bar"
                    }
                  }
                ],
                encodings: [
                  {
                    ssrc: 46687003
                  }
                ],
                headerExtensions: [
                  {
                    uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
                    id: 1
                  },
                  {
                    uri: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
                    id: 5
                  },
                  {
                    uri: "urn:ietf:params:rtp-hdrext:ssrc-audio-level",
                    id: 10
                  }
                ],
                rtcp: {
                  cname: "wB4Ql4lrsxYLjzuN",
                  reducedSize: true,
                  mux: true
                }
              })
            };
          }
          case "audio/ISAC": {
            return {
              id: id ?? generateFakeUuid(),
              producerId: generateFakeUuid(),
              kind: "audio",
              rtpParameters: utils.deepFreeze({
                codecs: [
                  {
                    mimeType: "audio/ISAC",
                    payloadType: 111,
                    clockRate: 16e3,
                    channels: 1,
                    rtcpFeedback: [{ type: "transport-cc" }],
                    parameters: {}
                  }
                ],
                encodings: [
                  {
                    ssrc: 46687004
                  }
                ],
                headerExtensions: [
                  {
                    uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
                    id: 1
                  },
                  {
                    uri: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
                    id: 5
                  }
                ],
                rtcp: {
                  cname: "wB4Ql4lrsxYLjzuN",
                  reducedSize: true,
                  mux: true
                }
              })
            };
          }
          case "video/VP8": {
            return {
              id: id ?? generateFakeUuid(),
              producerId: generateFakeUuid(),
              kind: "video",
              rtpParameters: utils.deepFreeze({
                codecs: [
                  {
                    mimeType: "video/VP8",
                    payloadType: 101,
                    clockRate: 9e4,
                    rtcpFeedback: [
                      { type: "nack" },
                      { type: "nack", parameter: "pli" },
                      { type: "ccm", parameter: "fir" },
                      { type: "goog-remb" },
                      { type: "transport-cc" }
                    ],
                    parameters: {
                      "x-google-start-bitrate": 1500
                    }
                  },
                  {
                    mimeType: "video/rtx",
                    payloadType: 102,
                    clockRate: 9e4,
                    rtcpFeedback: [],
                    parameters: {
                      apt: 101
                    }
                  }
                ],
                encodings: [
                  {
                    ssrc: 99991111,
                    rtx: {
                      ssrc: 99991112
                    }
                  }
                ],
                headerExtensions: [
                  {
                    uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
                    id: 1
                  },
                  {
                    uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
                    id: 4
                  },
                  {
                    uri: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
                    id: 5
                  },
                  {
                    uri: "urn:3gpp:video-orientation",
                    id: 11
                  },
                  {
                    uri: "urn:ietf:params:rtp-hdrext:toffset",
                    id: 12
                  }
                ],
                rtcp: {
                  cname: "wB4Ql4lrsxYLjzuN",
                  reducedSize: true,
                  mux: true
                }
              })
            };
          }
          case "video/H264": {
            return {
              id: id ?? generateFakeUuid(),
              producerId: generateFakeUuid(),
              kind: "video",
              rtpParameters: utils.deepFreeze({
                codecs: [
                  {
                    mimeType: "video/H264",
                    payloadType: 103,
                    clockRate: 9e4,
                    rtcpFeedback: [
                      { type: "nack" },
                      { type: "nack", parameter: "pli" },
                      { type: "ccm", parameter: "fir" },
                      { type: "goog-remb" },
                      { type: "transport-cc" }
                    ],
                    parameters: {
                      "level-asymmetry-allowed": 1,
                      "packetization-mode": 1,
                      "profile-level-id": "42e01f"
                    }
                  },
                  {
                    mimeType: "video/rtx",
                    payloadType: 104,
                    clockRate: 9e4,
                    rtcpFeedback: [],
                    parameters: {
                      apt: 103
                    }
                  }
                ],
                encodings: [
                  {
                    ssrc: 99991113,
                    rtx: {
                      ssrc: 99991114
                    }
                  }
                ],
                headerExtensions: [
                  {
                    uri: "urn:ietf:params:rtp-hdrext:sdes:mid",
                    id: 1
                  },
                  {
                    uri: "http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time",
                    id: 4
                  },
                  {
                    uri: "http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01",
                    id: 5
                  },
                  {
                    uri: "urn:3gpp:video-orientation",
                    id: 11
                  },
                  {
                    uri: "urn:ietf:params:rtp-hdrext:toffset",
                    id: 12
                  }
                ],
                rtcp: {
                  cname: "wB4Ql4lrsxYLjzuN",
                  reducedSize: true,
                  mux: true
                }
              })
            };
          }
          default: {
            throw new TypeError(`unknown codecMimeType '${codecMimeType}'`);
          }
        }
      }
      function generateDataProducerRemoteParameters() {
        return utils.deepFreeze({
          id: generateFakeUuid()
        });
      }
      function generateDataConsumerRemoteParameters({ id } = {}) {
        return {
          id: id ?? generateFakeUuid(),
          dataProducerId: generateFakeUuid(),
          sctpStreamParameters: utils.deepFreeze({
            streamId: 666,
            maxPacketLifeTime: 5e3,
            maxRetransmits: void 0
          })
        };
      }
    }
  });

  // node_modules/mediasoup-client/lib/index.js
  var require_lib5 = __commonJS({
    "node_modules/mediasoup-client/lib/index.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.debug = exports.testFakeParameters = exports.FakeHandler = exports.enhancedEvents = exports.ortc = exports.parseScalabilityMode = exports.detectDeviceAsync = exports.detectDevice = exports.Device = exports.version = exports.types = void 0;
      var debug_1 = require_browser();
      exports.debug = debug_1.default;
      exports.types = require_types();
      exports.version = "3.20.0";
      var Device_1 = require_Device();
      Object.defineProperty(exports, "Device", { enumerable: true, get: function() {
        return Device_1.Device;
      } });
      Object.defineProperty(exports, "detectDevice", { enumerable: true, get: function() {
        return Device_1.detectDevice;
      } });
      Object.defineProperty(exports, "detectDeviceAsync", { enumerable: true, get: function() {
        return Device_1.detectDeviceAsync;
      } });
      var scalabilityModes_1 = require_scalabilityModes();
      Object.defineProperty(exports, "parseScalabilityMode", { enumerable: true, get: function() {
        return scalabilityModes_1.parse;
      } });
      exports.ortc = require_ortc();
      exports.enhancedEvents = require_enhancedEvents();
      var FakeHandler_1 = require_FakeHandler();
      Object.defineProperty(exports, "FakeHandler", { enumerable: true, get: function() {
        return FakeHandler_1.FakeHandler;
      } });
      exports.testFakeParameters = require_fakeParameters();
    }
  });

  // src/shared/signaling-client.js
  var ConnectionState = {
    IDLE: "idle",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    RECONNECTING: "reconnecting",
    DISCONNECTED: "disconnected",
    FAILED: "failed"
  };
  function wsUrl() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${location.host}/ws`;
  }
  var SignalingClient = class {
    constructor(url, options = {}) {
      this.url = url;
      this.onOpen = options.onOpen;
      this.onClose = options.onClose;
      this.onLog = options.onLog || (() => {
      });
      this.onStateChange = options.onStateChange || (() => {
      });
      this.enableReconnect = options.enableReconnect !== false;
      this.maxReconnectAttempts = options.maxReconnectAttempts ?? 12;
      this.ws = null;
      this.intentionalClose = false;
      this.reconnectAttempt = 0;
      this.listeners = /* @__PURE__ */ new Set();
      this._state = ConnectionState.IDLE;
      this._pendingCritical = [];
      this._onceHandlers = /* @__PURE__ */ new Map();
      this._lastCloseCode = null;
      this._lastCloseReason = "";
      this.authenticated = false;
    }
    get state() {
      return this._state;
    }
    get connected() {
      var _a47;
      return ((_a47 = this.ws) == null ? void 0 : _a47.readyState) === WebSocket.OPEN;
    }
    setState(next) {
      if (this._state === next) return;
      this._state = next;
      this.onStateChange(next);
    }
    addListener(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    }
    removeListener(fn) {
      this.listeners.delete(fn);
    }
    dispatch(msg) {
      for (const fn of this.listeners) fn(msg);
      this._resolveOnce(msg);
    }
    _resolveOnce(msg) {
      if (!(msg == null ? void 0 : msg.type)) return;
      const key = msg.type;
      if (key === "erro") {
        for (const [type, list2] of this._onceHandlers.entries()) {
          const remaining2 = [];
          for (const entry of list2) {
            try {
              if (entry.filter(msg)) {
                clearTimeout(entry.timer);
                entry.resolve(msg.payload);
              } else {
                remaining2.push(entry);
              }
            } catch (e) {
              remaining2.push(entry);
            }
          }
          if (remaining2.length) this._onceHandlers.set(type, remaining2);
          else this._onceHandlers.delete(type);
        }
        return;
      }
      const list = this._onceHandlers.get(key);
      if (!(list == null ? void 0 : list.length)) return;
      const remaining = [];
      for (const entry of list) {
        try {
          if (entry.filter(msg)) {
            clearTimeout(entry.timer);
            entry.resolve(msg.payload);
          } else {
            remaining.push(entry);
          }
        } catch (e) {
          remaining.push(entry);
        }
      }
      if (remaining.length) this._onceHandlers.set(key, remaining);
      else this._onceHandlers.delete(key);
    }
    onceType(type, filter = () => true, timeoutMs = 25e3) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          this._removeOnce(type, resolve);
          reject(new Error(`Timeout aguardando: ${type}`));
        }, timeoutMs);
        const entry = {
          resolve,
          filter: (msg) => {
            var _a47;
            if (msg.type === "erro") {
              clearTimeout(timer);
              reject(new Error(((_a47 = msg.payload) == null ? void 0 : _a47.mensagem) || "Erro do servidor"));
              return true;
            }
            return msg.type === type && filter(msg);
          },
          timer
        };
        if (!this._onceHandlers.has(type)) this._onceHandlers.set(type, []);
        this._onceHandlers.get(type).push(entry);
      });
    }
    _removeOnce(type, resolve) {
      const list = this._onceHandlers.get(type);
      if (!list) return;
      this._onceHandlers.set(
        type,
        list.filter((e) => e.resolve !== resolve)
      );
    }
    connect() {
      this._retireSocket(this.ws);
      this.intentionalClose = false;
      this.setState(
        this.reconnectAttempt > 0 ? ConnectionState.RECONNECTING : ConnectionState.CONNECTING
      );
      const socket = new WebSocket(this.url);
      this.ws = socket;
      socket.onopen = () => {
        var _a47;
        if (this.ws !== socket) return;
        this.reconnectAttempt = 0;
        this.authenticated = false;
        this._lastCloseCode = null;
        this._lastCloseReason = "";
        this.setState(ConnectionState.CONNECTED);
        this.onLog("WebSocket conectado", "info");
        if (this.enableReconnect) {
          this._pendingCritical = this._pendingCritical.filter((packet) => {
            try {
              return JSON.parse(packet).type !== "entrar";
            } catch {
              return false;
            }
          });
        }
        this._flushCriticalQueue();
        (_a47 = this.onOpen) == null ? void 0 : _a47.call(this);
      };
      socket.onmessage = (ev) => {
        if (this.ws !== socket) return;
        try {
          const msg = JSON.parse(ev.data);
          this.dispatch(msg);
        } catch {
          this.onLog("Mensagem WebSocket inv\xE1lida", "warn");
        }
      };
      socket.onclose = (ev) => {
        var _a47;
        if (this.ws !== socket) return;
        this.authenticated = false;
        this._lastCloseCode = (ev == null ? void 0 : ev.code) ?? null;
        this._lastCloseReason = (ev == null ? void 0 : ev.reason) || "";
        this.setState(ConnectionState.DISCONNECTED);
        (_a47 = this.onClose) == null ? void 0 : _a47.call(this, this._lastCloseCode, this._lastCloseReason);
        if (!this.intentionalClose && this.enableReconnect) {
          this.scheduleReconnect();
        }
      };
      socket.onerror = () => {
        if (this.ws !== socket) return;
        this.onLog("Erro no WebSocket", "error");
      };
    }
    _retireSocket(ws) {
      if (!ws) return;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        try {
          ws.close(1e3, "Nova conex\xE3o");
        } catch (_) {
        }
      }
    }
    scheduleReconnect() {
      if (this.reconnectAttempt >= this.maxReconnectAttempts) {
        this.setState(ConnectionState.FAILED);
        this.onLog("Reconex\xE3o esgotada \u2014 recarregue a p\xE1gina", "error");
        return;
      }
      const delay = Math.min(3e4, 1e3 * 2 ** this.reconnectAttempt);
      this.reconnectAttempt += 1;
      this.setState(ConnectionState.RECONNECTING);
      this.onLog(`Reconectando em ${Math.round(delay / 1e3)}s (tentativa ${this.reconnectAttempt})`, "warn");
      setTimeout(() => {
        if (!this.intentionalClose) this.connect();
      }, delay);
    }
    send(type, payload = {}, { critical = false } = {}) {
      const packet = JSON.stringify({ type, payload });
      if (!this.connected) {
        if (critical) {
          this._pendingCritical.push(packet);
          this.onLog(`Mensagem ${type} enfileirada (WS desconectado)`, "warn");
          return;
        }
        throw new Error("WebSocket n\xE3o conectado");
      }
      this.ws.send(packet);
    }
    _flushCriticalQueue() {
      while (this.connected && this._pendingCritical.length) {
        this.ws.send(this._pendingCritical.shift());
      }
    }
    markAuthenticated(value = true) {
      this.authenticated = value;
    }
    close() {
      this.intentionalClose = true;
      this.authenticated = false;
      this.setState(ConnectionState.DISCONNECTED);
      this._retireSocket(this.ws);
      this.ws = null;
      this.clearPending();
      this._pendingCritical = [];
    }
    clearPending() {
      this._onceHandlers.clear();
    }
  };

  // src/shared/media-client.js
  var mediasoupClient = __toESM(require_lib5(), 1);

  // src/shared/quality-manager.js
  var PRESETS = {
    highQuality: {
      id: "highQuality",
      label: "M\xE1xima (32 Mbps)",
      description: "Resolu\xE7\xE3o nativa, m\xE1xima nitidez \u2014 recomendado em LAN",
      maxBitrate: 32e6,
      startBitrateKbps: 26e3,
      targetFrameRate: 30,
      maxFrameRate: 30,
      preferH264: true,
      lowLatency: true,
      contentHint: "detail",
      videoBitsPerSecond: 28e6
    },
    balanced: {
      id: "balanced",
      label: "Alta (16 Mbps)",
      description: "Excelente nitidez com uso moderado de banda",
      maxBitrate: 16e6,
      startBitrateKbps: 13e3,
      targetFrameRate: 30,
      maxFrameRate: 30,
      preferH264: true,
      lowLatency: true,
      contentHint: "detail",
      videoBitsPerSecond: 14e6
    },
    standard: {
      id: "standard",
      label: "Padr\xE3o (12 Mbps)",
      description: "Boa qualidade para uso geral em rede local",
      maxBitrate: 12e6,
      startBitrateKbps: 1e4,
      targetFrameRate: 30,
      maxFrameRate: 30,
      preferH264: true,
      lowLatency: true,
      contentHint: "detail",
      videoBitsPerSecond: 1e7
    },
    lowLatency: {
      id: "lowLatency",
      label: "Baixa (8 Mbps)",
      description: "Qualidade adequada para redes mais limitadas",
      maxBitrate: 8e6,
      startBitrateKbps: 6500,
      targetFrameRate: 30,
      maxFrameRate: 30,
      preferH264: true,
      lowLatency: true,
      contentHint: "detail",
      videoBitsPerSecond: 6e6
    }
  };
  var STORAGE_KEY = "sharescreen_quality_preset";
  function getDefaultPresetId() {
    return "highQuality";
  }
  function bitrateMbps(preset) {
    return Math.round(((preset == null ? void 0 : preset.maxBitrate) ?? 0) / 1e6);
  }
  function loadPresetId() {
    try {
      return localStorage.getItem(STORAGE_KEY) || getDefaultPresetId();
    } catch {
      return getDefaultPresetId();
    }
  }
  function savePresetId(id) {
    localStorage.setItem(STORAGE_KEY, id);
  }
  function getPreset(id) {
    return PRESETS[id] || PRESETS.highQuality;
  }
  function mergeServerQuality(serverQuality = {}, presetId = loadPresetId()) {
    const preset = getPreset(presetId);
    const serverMax = serverQuality.maxBitrate ?? preset.maxBitrate;
    return {
      ...serverQuality,
      maxBitrate: Math.min(preset.maxBitrate, serverMax),
      startBitrateKbps: Math.max(
        preset.startBitrateKbps,
        serverQuality.startBitrateKbps ?? 0
      ),
      targetFrameRate: Math.min(
        preset.targetFrameRate,
        serverQuality.targetFrameRate ?? preset.targetFrameRate
      ),
      maxFrameRate: Math.min(
        preset.maxFrameRate,
        serverQuality.maxFrameRate ?? preset.maxFrameRate
      ),
      preferH264: preset.preferH264,
      lowLatency: preset.lowLatency,
      contentHint: preset.contentHint,
      videoBitsPerSecond: preset.videoBitsPerSecond,
      presetId: preset.id,
      presetLabel: preset.label,
      stunServers: serverQuality.stunServers,
      turnServers: serverQuality.turnServers,
      turnEnabled: serverQuality.turnEnabled
    };
  }
  function buildDisplayMediaConstraints(quality = {}) {
    const fpsIdeal = quality.targetFrameRate ?? 30;
    const fpsMax = quality.maxFrameRate ?? 30;
    const video = {
      frameRate: { ideal: fpsIdeal, max: fpsMax },
      resizeMode: "none"
    };
    if (typeof screen !== "undefined" && screen.width > 0 && screen.height > 0) {
      video.width = { ideal: screen.width };
      video.height = { ideal: screen.height };
    }
    return {
      video,
      audio: false,
      preferCurrentTab: false,
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
      systemAudio: "exclude"
    };
  }
  function buildDisplayConstraintsWithAudio(quality, wantSystemAudio) {
    const base = buildDisplayMediaConstraints(quality);
    if (wantSystemAudio) {
      base.audio = true;
      base.systemAudio = "include";
    }
    return base;
  }
  function pickScreenCodec(device, preferH264 = true) {
    var _a47;
    if (!((_a47 = device == null ? void 0 : device.rtpCapabilities) == null ? void 0 : _a47.codecs)) return null;
    const codecs = device.rtpCapabilities.codecs;
    if (preferH264) {
      return codecs.find((c) => c.mimeType.toLowerCase() === "video/h264") || codecs.find((c) => c.mimeType.toLowerCase() === "video/vp8");
    }
    return codecs.find((c) => c.mimeType.toLowerCase() === "video/vp8") || codecs.find((c) => c.mimeType.toLowerCase() === "video/h264");
  }
  function buildVideoProduceOptions(track, device, quality = {}) {
    const maxBitrate = quality.maxBitrate ?? 1e7;
    const maxFramerate = quality.targetFrameRate ?? 30;
    const maxKbps = Math.floor(maxBitrate / 1e3);
    const startKbps = quality.startBitrateKbps ?? Math.floor(maxKbps * 0.85);
    const opts = {
      track,
      encodings: [
        {
          maxBitrate,
          maxFramerate,
          scalabilityMode: "L1T1",
          priority: "high"
        }
      ],
      codecOptions: {
        videoGoogleStartBitrate: startKbps,
        videoGoogleMaxBitrate: maxKbps,
        videoGoogleMinBitrate: Math.floor(maxKbps * 0.6)
      },
      appData: { mediaTag: "screen" }
    };
    const codec = pickScreenCodec(device, quality.preferH264 !== false);
    if (codec) opts.codec = codec;
    return opts;
  }
  function buildAudioProduceOptions(device, quality = {}) {
    var _a47, _b;
    const maxBitrate = quality.maxAudioBitrate ?? 128e3;
    const opts = {
      track: null,
      encodings: [{ maxBitrate }],
      appData: { mediaTag: "audio" }
    };
    const opus = (_b = (_a47 = device == null ? void 0 : device.rtpCapabilities) == null ? void 0 : _a47.codecs) == null ? void 0 : _b.find(
      (c) => c.mimeType.toLowerCase() === "audio/opus"
    );
    if (opus) opts.codec = opus;
    return opts;
  }
  function applyContentHint(track, hint = "motion") {
    if (!track || !("contentHint" in track)) return;
    try {
      track.contentHint = hint;
    } catch (_) {
    }
  }

  // src/shared/audio-level-meter.js
  var DEFAULT_SMOOTHING = 0.68;
  function rmsFromFloat32(samples) {
    if (!(samples == null ? void 0 : samples.length)) return 0;
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.min(1, Math.sqrt(sum / samples.length) * 5.5);
  }
  function rmsFromByteFrequency(freqBuf) {
    let sum = 0;
    for (let i = 0; i < freqBuf.length; i++) sum += freqBuf[i];
    return Math.min(1, sum / freqBuf.length / 255 * 3.2);
  }
  function rmsFromTimeDomain(timeBuf) {
    let sum = 0;
    for (let i = 0; i < timeBuf.length; i++) {
      const n = (timeBuf[i] - 128) / 128;
      sum += n * n;
    }
    return Math.min(1, Math.sqrt(sum / timeBuf.length) * 5.5);
  }
  function startProcessorMeter(track, onLevel, smoothing) {
    if (typeof MediaStreamTrackProcessor === "undefined") return null;
    let stopped = false;
    let smoothed = 0;
    const processor = new MediaStreamTrackProcessor({ track });
    const reader = processor.readable.getReader();
    const scratch = new Float32Array(2048);
    const pump = async () => {
      var _a47;
      while (!stopped) {
        let value = null;
        try {
          const { value: val, done } = await reader.read();
          value = val;
          if (done || stopped) break;
          if (value && value.numberOfFrames > 0) {
            const n = Math.min(scratch.length, value.numberOfFrames);
            value.copyTo(scratch.subarray(0, n), { planeIndex: 0, format: "f32-planar" });
            const raw = rmsFromFloat32(scratch.subarray(0, n));
            smoothed = smoothed * smoothing + raw * (1 - smoothing);
            onLevel(smoothed, raw);
          }
        } catch (e) {
          break;
        } finally {
          (_a47 = value == null ? void 0 : value.close) == null ? void 0 : _a47.call(value);
        }
      }
    };
    pump();
    return () => {
      stopped = true;
      reader.cancel().catch(() => {
      });
    };
  }
  function startAnalyserMeter(track, onLevel, smoothing) {
    let stopped = false;
    let smoothed = 0;
    let ctx = null;
    let raf = null;
    try {
      ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.45;
      const silent = ctx.createGain();
      silent.gain.value = 0;
      const stream = new MediaStream([track]);
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.connect(silent);
      silent.connect(ctx.destination);
      ctx.resume().catch(() => {
      });
      const freqBuf = new Uint8Array(analyser.frequencyBinCount);
      const timeBuf = new Uint8Array(analyser.fftSize);
      const tick = () => {
        if (stopped) return;
        const dummy = stream.id;
        analyser.getByteFrequencyData(freqBuf);
        let raw = rmsFromByteFrequency(freqBuf);
        if (raw < 0.01) {
          analyser.getByteTimeDomainData(timeBuf);
          raw = Math.max(raw, rmsFromTimeDomain(timeBuf));
        }
        smoothed = smoothed * smoothing + raw * (1 - smoothing);
        onLevel(smoothed, raw);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      return null;
    }
    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      ctx == null ? void 0 : ctx.close().catch(() => {
      });
    };
  }
  function startTrackLevelMeter(track, { onLevel, smoothing = DEFAULT_SMOOTHING } = {}) {
    if (!track || track.readyState !== "live" || typeof onLevel !== "function") {
      return () => {
      };
    }
    let stop = startProcessorMeter(track, onLevel, smoothing);
    if (stop) return stop;
    stop = startAnalyserMeter(track, onLevel, smoothing);
    return stop || (() => {
    });
  }

  // src/shared/audio-manager.js
  var DEFAULT_CAPTURE_PREFS = {
    systemAudio: true,
    microphone: true,
    microphoneDeviceId: ""
  };
  var STORAGE_KEY2 = "sharescreen_capture_prefs";
  function loadCapturePrefs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY2);
      if (!raw) return { ...DEFAULT_CAPTURE_PREFS };
      return { ...DEFAULT_CAPTURE_PREFS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_CAPTURE_PREFS };
    }
  }
  function saveCapturePrefs(prefs) {
    localStorage.setItem(STORAGE_KEY2, JSON.stringify(prefs));
  }
  function installAudioUnlock(onUnlock) {
    const unlock = () => {
      onUnlock == null ? void 0 : onUnlock();
      document.removeEventListener("pointerdown", unlock, true);
      document.removeEventListener("keydown", unlock, true);
    };
    document.addEventListener("pointerdown", unlock, { once: true, capture: true });
    document.addEventListener("keydown", unlock, { once: true, capture: true });
  }
  function buildMicrophoneConstraints(deviceId = "", { disableAutoGainControl = false } = {}) {
    const audio = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: !disableAutoGainControl,
      channelCount: 2
    };
    if (deviceId) audio.deviceId = { ideal: deviceId };
    return { audio, video: false };
  }
  async function requestMicrophonePermission(onLog) {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: buildMicrophoneConstraints().audio,
      video: false
    });
    stream.getTracks().forEach((t) => t.stop());
    onLog == null ? void 0 : onLog("Permiss\xE3o de microfone concedida");
  }
  async function listMicrophoneDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter((d) => d.kind === "audioinput" && d.deviceId).map((d, i) => {
      var _a47;
      return {
        deviceId: d.deviceId,
        label: ((_a47 = d.label) == null ? void 0 : _a47.trim()) || `Microfone ${i + 1}`
      };
    });
  }
  async function populateMicrophoneSelect(selectEl, { deviceId = "", onLog } = {}) {
    if (!selectEl) return [];
    await requestMicrophonePermission(onLog);
    const devices = await listMicrophoneDevices();
    selectEl.innerHTML = "";
    const padrao = document.createElement("option");
    padrao.value = "";
    padrao.textContent = "Microfone padr\xE3o do sistema";
    selectEl.appendChild(padrao);
    for (const d of devices) {
      const opt = document.createElement("option");
      opt.value = d.deviceId;
      opt.textContent = d.label;
      selectEl.appendChild(opt);
    }
    if (deviceId && [...selectEl.options].some((o) => o.value === deviceId)) {
      selectEl.value = deviceId;
    }
    return devices;
  }
  async function acquireMicrophoneTrack(deviceId, onLog, options = {}) {
    const constraints = buildMicrophoneConstraints(deviceId || "", options);
    onLog == null ? void 0 : onLog(deviceId ? "Capturando microfone selecionado\u2026" : "Capturando microfone padr\xE3o\u2026");
    const micStream = await navigator.mediaDevices.getUserMedia(constraints);
    const micTrack = micStream.getAudioTracks()[0];
    if (!micTrack) {
      micStream.getTracks().forEach((t) => t.stop());
      throw new Error("Nenhuma pista de microfone obtida");
    }
    micTrack.addEventListener("ended", () => onLog == null ? void 0 : onLog("Microfone encerrado", "warn"));
    return micTrack;
  }
  function setupMicrophonePicker({
    checkbox,
    wrap,
    select,
    refreshBtn,
    savedDeviceId = "",
    onLog,
    onError,
    onSelectChange
  }) {
    const sync = async () => {
      if (!(checkbox == null ? void 0 : checkbox.checked)) {
        wrap == null ? void 0 : wrap.setAttribute("hidden", "");
        return;
      }
      wrap == null ? void 0 : wrap.removeAttribute("hidden");
      try {
        await populateMicrophoneSelect(select, { deviceId: savedDeviceId, onLog });
      } catch (e) {
        onError == null ? void 0 : onError(e.message);
      }
    };
    checkbox == null ? void 0 : checkbox.addEventListener("change", sync);
    refreshBtn == null ? void 0 : refreshBtn.addEventListener("click", () => sync());
    select == null ? void 0 : select.addEventListener("change", () => onSelectChange == null ? void 0 : onSelectChange());
    sync();
  }

  // src/shared/audio-sources.js
  var AUDIO_SOURCES = ["microphone", "system", "mixed"];
  function isAudioSource(value) {
    return AUDIO_SOURCES.includes(value);
  }
  function normalizeAudioSource(value, fallback = "microphone") {
    return isAudioSource(value) ? value : fallback;
  }
  function audioChannelKey(peerId, source = "microphone") {
    return `${String(peerId)}:${normalizeAudioSource(source, "microphone")}`;
  }
  function parseAudioChannelKey(key) {
    const idx = String(key).lastIndexOf(":");
    if (idx <= 0) return { peerId: String(key), source: "microphone" };
    return {
      peerId: String(key).slice(0, idx),
      source: normalizeAudioSource(String(key).slice(idx + 1), "microphone")
    };
  }
  function audioTrace(event, data = {}) {
    try {
      console.info(`[audio] ${event}`, data);
    } catch (_) {
    }
  }
  function normalizeRemoteAudioSources(sources, { excludePeerId = null, excludeSourceTypes = [] } = {}) {
    var _a47;
    const excludedTypes = new Set(
      (excludeSourceTypes || []).map((t) => normalizeAudioSource(t, t))
    );
    const byProducer = /* @__PURE__ */ new Map();
    for (const raw of sources || []) {
      const peerId = (raw == null ? void 0 : raw.peerId) || (raw == null ? void 0 : raw.id);
      const producerId = (raw == null ? void 0 : raw.producerId) || ((_a47 = raw == null ? void 0 : raw.producerIds) == null ? void 0 : _a47.audio);
      const source = normalizeAudioSource((raw == null ? void 0 : raw.source) || "microphone", "microphone");
      if (!peerId || !producerId) continue;
      if (excludePeerId && String(peerId) === String(excludePeerId)) continue;
      if (byProducer.has(producerId)) continue;
      byProducer.set(producerId, {
        peerId: String(peerId),
        producerId,
        source,
        name: (raw == null ? void 0 : raw.name) || (raw == null ? void 0 : raw.displayName) || ""
      });
    }
    return [...byProducer.values()];
  }
  function audioSourcesSignature(sources) {
    return normalizeRemoteAudioSources(sources).map((s) => `${s.peerId}:${s.source}:${s.producerId}`).sort().join("|");
  }
  function audioTraceSync(event, sources, extra = {}) {
    const normalized = normalizeRemoteAudioSources(sources);
    audioTrace(event, {
      signature: audioSourcesSignature(sources),
      sourceCount: normalized.length,
      ...extra
    });
  }

  // src/shared/ice-servers.js
  function buildIceServers(videoQuality = {}) {
    const servers = [];
    for (const entry of videoQuality.stunServers || []) {
      if (!(entry == null ? void 0 : entry.urls)) continue;
      servers.push({ urls: entry.urls });
    }
    for (const entry of videoQuality.turnServers || []) {
      if (!(entry == null ? void 0 : entry.urls)) continue;
      const urls = Array.isArray(entry.urls) ? entry.urls : [entry.urls];
      const server = { urls: urls.filter(Boolean) };
      if (!server.urls.length) continue;
      if (entry.username) server.username = entry.username;
      if (entry.credential) server.credential = entry.credential;
      servers.push(server);
    }
    return servers;
  }
  function hasTurnServers(videoQuality = {}) {
    return (videoQuality.turnServers || []).some((entry) => {
      const urls = entry == null ? void 0 : entry.urls;
      if (Array.isArray(urls)) return urls.length > 0;
      return !!urls;
    });
  }

  // src/shared/mic-dsp.js
  var MIC_FILTER_DEFAULTS = {
    gain: 1,
    bass: 0,
    treble: 0,
    highpass: false,
    highpassFreq: 80,
    peaking: false,
    peakingFreq: 3e3,
    peakingGain: 3,
    compressor: false,
    noiseGate: false,
    noiseGateThreshold: -45,
    micSensitivity: false,
    micCaptureDistance: 6
  };
  var HOST_MIC_PUBLISH_DEFAULTS = {
    gain: 1.4,
    bass: 0,
    treble: 0,
    highpass: false,
    highpassFreq: 80,
    peaking: true,
    peakingFreq: 3e3,
    peakingGain: 2,
    compressor: true,
    noiseGate: false,
    noiseGateThreshold: -45,
    micSensitivity: false,
    micCaptureDistance: 6
  };
  var CLIENT_MIC_PUBLISH_DEFAULTS = {
    gain: 1.2,
    bass: 0,
    treble: 0,
    highpass: false,
    highpassFreq: 80,
    peaking: false,
    peakingFreq: 3e3,
    peakingGain: 3,
    compressor: true,
    noiseGate: false,
    noiseGateThreshold: -45,
    micSensitivity: false,
    micCaptureDistance: 6
  };
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
  function normalizeMicrophoneFilterPrefs(prefs = {}) {
    const merged = { ...MIC_FILTER_DEFAULTS, ...prefs || {} };
    return {
      gain: clamp(Number(merged.gain ?? 1), 0, 3),
      bass: clamp(Number(merged.bass ?? 0), -12, 12),
      treble: clamp(Number(merged.treble ?? 0), -12, 12),
      highpass: !!merged.highpass,
      highpassFreq: clamp(Number(merged.highpassFreq ?? 80), 50, 300),
      peaking: !!merged.peaking,
      peakingFreq: clamp(Number(merged.peakingFreq ?? 3e3), 1e3, 5e3),
      peakingGain: clamp(Number(merged.peakingGain ?? 3), 0, 12),
      compressor: !!merged.compressor,
      noiseGate: !!merged.noiseGate,
      noiseGateThreshold: clamp(Number(merged.noiseGateThreshold ?? -45), -70, -20),
      micSensitivity: !!merged.micSensitivity,
      micCaptureDistance: clamp(Number(merged.micCaptureDistance ?? 6), 1, 10)
    };
  }
  function hasActiveMicrophoneFilter(prefs) {
    const p = normalizeMicrophoneFilterPrefs(prefs);
    return Math.abs(p.gain - 1) > 0.01 || Math.abs(p.bass) > 0.01 || Math.abs(p.treble) > 0.01 || p.highpass || p.peaking || p.compressor || p.noiseGate || p.micSensitivity;
  }
  function closeMicrophoneFilterGraph(graph) {
    var _a47, _b, _c;
    if (!graph) return;
    if (graph.rafId) cancelAnimationFrame(graph.rafId);
    for (const node of graph.nodes || []) {
      try {
        (_a47 = node.disconnect) == null ? void 0 : _a47.call(node);
      } catch (_) {
      }
    }
    for (const track of graph.outputTracks || []) {
      try {
        track.stop();
      } catch (_) {
      }
    }
    try {
      (_c = (_b = graph.ctx) == null ? void 0 : _b.close) == null ? void 0 : _c.call(_b);
    } catch (_) {
    }
  }
  function proximityGateThresholdDb(prefs) {
    const normalized = normalizeMicrophoneFilterPrefs(prefs);
    const distance = normalized.micCaptureDistance;
    return clamp(-18 - (10 - distance) * 4, -60, -18);
  }
  function noiseGateThresholdDb(prefs) {
    const normalized = normalizeMicrophoneFilterPrefs(prefs);
    const distanceShift = (6 - normalized.micCaptureDistance) * 3;
    return clamp(normalized.noiseGateThreshold + distanceShift, -70, -18);
  }
  function combinedGateOpenThresholdDb(prefs) {
    const normalized = normalizeMicrophoneFilterPrefs(prefs);
    const thresholds = [];
    if (normalized.micSensitivity) {
      thresholds.push(proximityGateThresholdDb(normalized));
    }
    if (normalized.noiseGate) {
      thresholds.push(noiseGateThresholdDb(normalized));
    }
    if (!thresholds.length) return -100;
    return Math.max(...thresholds);
  }
  function createMicrophoneFilterGraph(inputTrack, prefs) {
    const normalized = normalizeMicrophoneFilterPrefs(prefs);
    if (!inputTrack || inputTrack.readyState !== "live" || !hasActiveMicrophoneFilter(normalized)) {
      return { track: inputTrack, graph: null };
    }
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return { track: inputTrack, graph: null };
    try {
      const ctx = new AudioContextCtor({ latencyHint: "interactive" });
      const inputStream = new MediaStream([inputTrack]);
      const sourceNode = ctx.createMediaStreamSource(inputStream);
      const highpassNode = ctx.createBiquadFilter();
      const bassNode = ctx.createBiquadFilter();
      const trebleNode = ctx.createBiquadFilter();
      const peakingNode = ctx.createBiquadFilter();
      const compressorNode = ctx.createDynamicsCompressor();
      const gateGainNode = ctx.createGain();
      const gainNode = ctx.createGain();
      const analyserNode = ctx.createAnalyser();
      const dest = ctx.createMediaStreamDestination();
      highpassNode.type = "highpass";
      highpassNode.frequency.value = normalized.highpass ? normalized.highpassFreq : 20;
      bassNode.type = "lowshelf";
      bassNode.frequency.value = 150;
      bassNode.gain.value = normalized.bass;
      trebleNode.type = "highshelf";
      trebleNode.frequency.value = 4e3;
      trebleNode.gain.value = normalized.treble;
      peakingNode.type = "peaking";
      peakingNode.frequency.value = normalized.peakingFreq;
      peakingNode.Q.value = 1.2;
      peakingNode.gain.value = normalized.peaking ? normalized.peakingGain : 0;
      compressorNode.threshold.value = normalized.compressor ? -26 : 0;
      compressorNode.knee.value = normalized.compressor ? 24 : 0;
      compressorNode.ratio.value = normalized.compressor ? 5 : 1;
      compressorNode.attack.value = 4e-3;
      compressorNode.release.value = 0.16;
      gateGainNode.gain.value = 1;
      gainNode.gain.value = normalized.gain;
      analyserNode.fftSize = 512;
      analyserNode.smoothingTimeConstant = 0.55;
      sourceNode.connect(highpassNode);
      highpassNode.connect(bassNode);
      bassNode.connect(trebleNode);
      trebleNode.connect(peakingNode);
      peakingNode.connect(compressorNode);
      compressorNode.connect(analyserNode);
      compressorNode.connect(gateGainNode);
      gateGainNode.connect(gainNode);
      gainNode.connect(dest);
      const graph = {
        ctx,
        nodes: [sourceNode, highpassNode, bassNode, trebleNode, peakingNode, compressorNode, analyserNode, gateGainNode, gainNode],
        outputTracks: dest.stream.getAudioTracks(),
        rafId: null
      };
      const gateActive = normalized.noiseGate || normalized.micSensitivity;
      if (gateActive) {
        const data = new Uint8Array(analyserNode.fftSize);
        let gateOpen = true;
        let lastOpenAt = performance.now();
        const holdMs = 180;
        const tick = () => {
          const openDb = combinedGateOpenThresholdDb(normalized);
          const closeDb = openDb - 8;
          analyserNode.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const n = (data[i] - 128) / 128;
            sum += n * n;
          }
          const rms = Math.sqrt(sum / data.length) || 1e-6;
          const db = 20 * Math.log10(rms);
          const now = performance.now();
          if (db >= openDb) {
            gateOpen = true;
            lastOpenAt = now;
            gateGainNode.gain.setTargetAtTime(1, ctx.currentTime, 0.015);
          } else if (gateOpen && db < closeDb && now - lastOpenAt > holdMs) {
            gateOpen = false;
            gateGainNode.gain.setTargetAtTime(0, ctx.currentTime, 0.045);
          }
          gainNode.gain.setTargetAtTime(normalized.gain, ctx.currentTime, 0.02);
          graph.rafId = requestAnimationFrame(tick);
        };
        tick();
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {
      });
      return { track: graph.outputTracks[0] || inputTrack, graph };
    } catch (err) {
      console.warn("[mic-dsp] Filtro de microfone indisponivel:", err);
      return { track: inputTrack, graph: null };
    }
  }

  // src/shared/media-client.js
  var MediaClient = class {
    constructor(signaling2, { onLog, onIceState, splitRecvTransports = false, applyHostMicPublishChain = false } = {}) {
      this.signaling = signaling2;
      this.onLog = onLog || (() => {
      });
      this.onIceState = onIceState || (() => {
      });
      this.splitRecvTransports = splitRecvTransports;
      this.applyHostMicPublishChain = !!applyHostMicPublishChain;
      this.device = null;
      this.sendTransport = null;
      this.recvTransport = null;
      this.recvTransports = /* @__PURE__ */ new Map();
      this._creatingTransports = /* @__PURE__ */ new Map();
      this.producers = { video: null, microphone: null, system: null, mixed: null };
      this.remoteConsumers = { video: null, audio: null };
      this.videoConsumersByProducerId = /* @__PURE__ */ new Map();
      this.currentActiveVideoProducerId = null;
      this.auxAudioConsumers = /* @__PURE__ */ new Map();
      this.consumeGeneration = 0;
      this.localScreenStream = null;
      this._micTrack = null;
      this._micFilterPrefs = normalizeMicrophoneFilterPrefs();
      this._micFilterGraph = null;
      this.localMicTracks = [];
      this.videoQuality = {};
      this.capturePrefs = { systemAudio: true, microphone: false };
      this._producing = false;
      this._publishedMicMuted = false;
      this._mediaOps = Promise.resolve();
      this._videoMediaOps = Promise.resolve();
      this._audioMediaOps = Promise.resolve();
    }
    _audioProducer(source) {
      const key = normalizeAudioSource(source, "mixed");
      return this.producers[key] || null;
    }
    hasPublishedMicrophone() {
      var _a47;
      const producer = this.producers.microphone;
      return !!(producer && !producer.closed && ((_a47 = producer.track) == null ? void 0 : _a47.readyState) === "live");
    }
    hasPublishedSystemAudio() {
      var _a47;
      const producer = this.producers.system;
      return !!(producer && !producer.closed && ((_a47 = producer.track) == null ? void 0 : _a47.readyState) === "live");
    }
    hasPublishedAudio() {
      return this.hasPublishedMicrophone() || this.hasPublishedSystemAudio() || !!(this.producers.mixed && !this.producers.mixed.closed);
    }
    isPublishedAudioMuted() {
      return !!this._publishedMicMuted;
    }
    setPublishedAudioMuted(muted) {
      this._publishedMicMuted = !!muted;
      const track = this.getLocalMicrophoneTrack();
      if (track) track.enabled = !muted;
      return this._publishedMicMuted;
    }
    togglePublishedAudioMuted() {
      return this.setPublishedAudioMuted(!this.isPublishedAudioMuted());
    }
    getLocalMicrophoneTrack() {
      var _a47, _b;
      const published = (_a47 = this.producers.microphone) == null ? void 0 : _a47.track;
      if ((published == null ? void 0 : published.readyState) === "live") return published;
      if (((_b = this._micTrack) == null ? void 0 : _b.readyState) === "live") return this._micTrack;
      return this.localMicTracks.find((t) => t.readyState === "live") || null;
    }
    getLocalAudioTrack() {
      return this.getLocalMicrophoneTrack();
    }
    _runMediaOp(fn) {
      const task = this._mediaOps.then(() => fn());
      this._mediaOps = task.catch(() => {
      });
      return task;
    }
    _runVideoMediaOp(fn) {
      const task = this._videoMediaOps.then(() => fn());
      this._videoMediaOps = task.catch(() => {
      });
      return task;
    }
    _runAudioMediaOp(fn) {
      const task = this._audioMediaOps.then(() => fn());
      this._audioMediaOps = task.catch(() => {
      });
      return task;
    }
    setVideoQuality(quality) {
      if (quality) this.videoQuality = { ...quality };
      if ((quality == null ? void 0 : quality.systemAudioDefault) !== void 0) {
        this.capturePrefs.systemAudio = quality.systemAudioDefault;
      }
      if ((quality == null ? void 0 : quality.microphoneDefault) !== void 0) {
        this.capturePrefs.microphone = quality.microphoneDefault;
      }
    }
    setCapturePrefs(prefs) {
      this.capturePrefs = { ...this.capturePrefs, ...prefs };
    }
    _resolvePublishMicFilterPrefs() {
      const user = normalizeMicrophoneFilterPrefs(this._micFilterPrefs);
      if (!this.applyHostMicPublishChain) return user;
      const q = this.videoQuality || {};
      return normalizeMicrophoneFilterPrefs({
        ...HOST_MIC_PUBLISH_DEFAULTS,
        gain: Number(q.hostMicPublishGain ?? HOST_MIC_PUBLISH_DEFAULTS.gain),
        compressor: q.hostMicCompressor !== false,
        peaking: q.hostMicPeaking !== false,
        peakingGain: 2,
        ...user
      });
    }
    async loadDevice(rtpCapabilities) {
      this.device = new mediasoupClient.Device();
      await Promise.race([
        this.device.load({ routerRtpCapabilities: rtpCapabilities }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Timeout ao carregar dispositivo de m?fidia")), 2e4);
        })
      ]);
      this.onLog("Dispositivo mediasoup carregado", "info");
    }
    _videoRecvTag() {
      return this.splitRecvTransports ? "video" : "default";
    }
    _audioRecvTag() {
      return this.splitRecvTransports ? "audio" : "default";
    }
    async createTransport(direction, tag = "default") {
      const recvTag = direction === "recv" ? tag : "default";
      const createdPromise = this.signaling.onceType(
        "transporteCriado",
        (m) => {
          var _a47, _b;
          return ((_a47 = m.payload) == null ? void 0 : _a47.direction) === direction && (((_b = m.payload) == null ? void 0 : _b.tag) || "default") === recvTag;
        }
      );
      this.signaling.send("criarTransporte", {
        direction,
        tag: direction === "recv" ? recvTag : void 0
      });
      const payload = await createdPromise;
      const transportOptions = {
        id: payload.id,
        iceParameters: payload.iceParameters,
        iceCandidates: payload.iceCandidates,
        dtlsParameters: payload.dtlsParameters
      };
      const iceServers = buildIceServers(this.videoQuality);
      if (iceServers.length) {
        transportOptions.iceServers = iceServers;
      }
      const transport = direction === "send" ? this.device.createSendTransport(transportOptions) : this.device.createRecvTransport(transportOptions);
      if (hasTurnServers(this.videoQuality) && direction === "recv") {
        this.onLog("TURN dispon?fivel i?,???? fallback se conex?fio direta falhar", "info");
      }
      transport.on("connect", ({ dtlsParameters }, callback, errback) => {
        try {
          const connectedPromise = this.signaling.onceType(
            "transporteConectado",
            (m) => {
              var _a47;
              return ((_a47 = m.payload) == null ? void 0 : _a47.transportId) === transport.id;
            }
          );
          this.signaling.send("conectarTransporte", {
            transportId: transport.id,
            dtlsParameters,
            direction
          });
          connectedPromise.then(() => callback()).catch((e) => errback(e));
        } catch (e) {
          errback(e);
        }
      });
      transport.on("connectionstatechange", (state) => {
        var _a47, _b, _c, _d, _e;
        const level = state === "failed" ? "error" : "info";
        let msg = `Transport ${direction}${recvTag !== "default" ? `/${recvTag}` : ""}: ${state}`;
        if (state === "failed") {
          const ice = ((_a47 = transport.iceCandidates) == null ? void 0 : _a47.map((c) => c.ip).filter(Boolean).join(", ")) || ((_b = this.videoQuality) == null ? void 0 : _b.serverHost) || "?";
          const ports = ((_c = this.videoQuality) == null ? void 0 : _c.rtcPortRange) || "40000-40100";
          msg += ` i?,???? verifique firewall UDP ${ports} em ${ice}`;
          (_d = this.onIceState) == null ? void 0 : _d.call(this, "failed", direction);
        } else if (state === "connected") {
          (_e = this.onIceState) == null ? void 0 : _e.call(this, "connected", direction);
        }
        this.onLog(msg, level);
      });
      if (direction === "send") {
        transport.on("produce", ({ kind, rtpParameters, appData }, callback, errback) => {
          try {
            const source = (appData == null ? void 0 : appData.source) || null;
            const producedPromise = this.signaling.onceType(
              "produzido",
              (m) => {
                var _a47, _b;
                if (((_a47 = m.payload) == null ? void 0 : _a47.kind) !== kind) return false;
                if (kind === "audio" && source) {
                  return ((_b = m.payload) == null ? void 0 : _b.source) === source;
                }
                return true;
              }
            );
            this.signaling.send("produzir", {
              transportId: transport.id,
              kind,
              rtpParameters,
              appData
            });
            producedPromise.then((p) => callback({ id: p.id })).catch((e) => errback(e));
          } catch (e) {
            errback(e);
          }
        });
        this.sendTransport = transport;
      } else {
        this.recvTransports.set(recvTag, transport);
        if (recvTag === "default") this.recvTransport = transport;
      }
      return transport;
    }
    async ensureSendTransport() {
      if (this.sendTransport) return;
      const key = "send/default";
      if (this._creatingTransports.has(key)) {
        await this._creatingTransports.get(key);
        return;
      }
      const promise = this.createTransport("send");
      this._creatingTransports.set(key, promise);
      try {
        await promise;
      } finally {
        this._creatingTransports.delete(key);
      }
    }
    async ensureRecvTransport(tag = "default") {
      const existing = this.recvTransports.get(tag);
      if (existing && !existing.closed) {
        return existing;
      }
      if (existing == null ? void 0 : existing.closed) {
        this.recvTransports.delete(tag);
        if (tag === "default") this.recvTransport = null;
      }
      const key = `recv/${tag}`;
      if (this._creatingTransports.has(key)) {
        await this._creatingTransports.get(key);
        return this.recvTransports.get(tag);
      }
      const promise = this.createTransport("recv", tag);
      this._creatingTransports.set(key, promise);
      try {
        await promise;
      } finally {
        this._creatingTransports.delete(key);
      }
      return this.recvTransports.get(tag);
    }
    hasVideoProducer() {
      var _a47;
      const producer = this.producers.video;
      return !!(producer && !producer.closed && ((_a47 = producer.track) == null ? void 0 : _a47.readyState) === "live");
    }
    isSharingVideo() {
      return this.hasVideoProducer();
    }
    _stopLocalMicTracks(keepTrack = null) {
      const kept = [];
      for (const track of this.localMicTracks) {
        if (keepTrack && track === keepTrack) {
          kept.push(track);
          continue;
        }
        if (this._micTrack && track === this._micTrack) continue;
        try {
          track.stop();
        } catch (_) {
        }
      }
      this.localMicTracks = kept;
    }
    async _closeAudioProducerBySource(source, { stopMicTrack = false } = {}) {
      var _a47;
      const key = normalizeAudioSource(source, "mixed");
      const producer = this.producers[key];
      if (producer && !producer.closed) {
        audioTrace("producer fechado", {
          source: key,
          producerId: (_a47 = producer.id) == null ? void 0 : _a47.slice(0, 8)
        });
        producer.close();
      }
      this.producers[key] = null;
      if (key === "microphone") {
        closeMicrophoneFilterGraph(this._micFilterGraph);
        this._micFilterGraph = null;
      }
      if (key === "microphone" && stopMicTrack) {
        if (this._micTrack) {
          try {
            this._micTrack.stop();
          } catch (_) {
          }
          this._micTrack = null;
        }
        this._stopLocalMicTracks();
      }
    }
    async _publishAudioTrack(audioTrack, source) {
      var _a47, _b, _c;
      const key = normalizeAudioSource(source, "mixed");
      if (!audioTrack || audioTrack.readyState !== "live") return false;
      await this.ensureSendTransport();
      const existing = this.producers[key];
      if (existing && !existing.closed && existing.track === audioTrack && ((_a47 = existing.track) == null ? void 0 : _a47.readyState) === "live") {
        return true;
      }
      if (existing && !existing.closed) {
        if (key === "microphone" && typeof existing.replaceTrack === "function") {
          await existing.replaceTrack({ track: audioTrack });
          if (key === "microphone" && this._publishedMicMuted) audioTrack.enabled = false;
          return true;
        }
        existing.close();
        this.producers[key] = null;
      }
      const audioOpts = buildAudioProduceOptions(this.device, this.videoQuality);
      audioOpts.track = audioTrack;
      this.producers[key] = await this.sendTransport.produce({
        ...audioOpts,
        appData: { source: key }
      });
      audioTrace("producer criado", {
        source: key,
        producerId: (_c = (_b = this.producers[key]) == null ? void 0 : _b.id) == null ? void 0 : _c.slice(0, 8)
      });
      if (key === "microphone" && this._publishedMicMuted) {
        audioTrack.enabled = false;
      }
      return true;
    }
    async publishMicrophone(capturePrefs) {
      this.setCapturePrefs(capturePrefs);
      if (!(capturePrefs == null ? void 0 : capturePrefs.microphone)) {
        return this.stopMicrophone();
      }
      await this.ensureSendTransport();
      let track = capturePrefs.prefetchedMicTrack || this._micTrack || null;
      const publishPrefs = this._resolvePublishMicFilterPrefs();
      const micCaptureOptions = this.applyHostMicPublishChain && hasActiveMicrophoneFilter(publishPrefs) ? { disableAutoGainControl: true } : {};
      if (!track || track.readyState !== "live") {
        track = await acquireMicrophoneTrack(
          capturePrefs.microphoneDeviceId || "",
          this.onLog,
          micCaptureOptions
        );
      }
      this._micTrack = track;
      if (!this.localMicTracks.includes(track)) {
        this.localMicTracks.push(track);
      }
      const prepared = createMicrophoneFilterGraph(track, publishPrefs);
      const previousGraph = this._micFilterGraph;
      const ok = await this._publishAudioTrack(prepared.track, "microphone");
      if (ok) {
        this._micFilterGraph = prepared.graph;
        closeMicrophoneFilterGraph(previousGraph);
        this.onLog(prepared.graph ? "Microfone publicado com filtros" : "Microfone publicado", "info");
      } else {
        closeMicrophoneFilterGraph(prepared.graph);
        throw new Error("Falha ao publicar microfone no servidor");
      }
      return ok;
    }
    async setMicrophoneFilterPrefs(prefs) {
      var _a47, _b;
      this._micFilterPrefs = normalizeMicrophoneFilterPrefs(prefs || {});
      if (((_a47 = this.capturePrefs) == null ? void 0 : _a47.microphone) && ((_b = this._micTrack) == null ? void 0 : _b.readyState) === "live") {
        return this.publishMicrophone({ ...this.capturePrefs, microphone: true });
      }
      return true;
    }
    async stopMicrophone() {
      await this._closeAudioProducerBySource("microphone", { stopMicTrack: true });
      this.onLog("Microfone encerrado", "info");
      return false;
    }
    async publishSystemAudioFromDisplay(displayStream = null) {
      const stream = displayStream ?? this.localScreenStream;
      if (!stream || this.capturePrefs.systemAudio === false) {
        return this.stopSystemAudio();
      }
      const systemTrack = stream.getAudioTracks().find((t) => t.readyState === "live");
      if (!systemTrack) {
        this.onLog(
          '?fiudio do sistema n?fio capturado i?,???? marque "Compartilhar ?fiudio" no di?filogo do Chrome',
          "warn"
        );
        return this.stopSystemAudio();
      }
      const ok = await this._publishAudioTrack(systemTrack, "system");
      if (ok) this.onLog("?fiudio do sistema publicado", "info");
      return ok;
    }
    async stopSystemAudio() {
      await this._closeAudioProducerBySource("system");
      this.onLog("?fiudio do sistema encerrado", "info");
      return false;
    }
    /** Sincroniza microfone e ?fiudio do sistema conforme prefs (sem mixar). */
    async syncPublishedAudio(capturePrefs, displayStream = null) {
      this.setCapturePrefs(capturePrefs);
      let micOk = true;
      let sysOk = true;
      if (capturePrefs.microphone) {
        micOk = await this.publishMicrophone(capturePrefs);
      } else if (this.hasPublishedMicrophone()) {
        await this.stopMicrophone();
      }
      const screenStream = displayStream ?? this.localScreenStream ?? null;
      if (screenStream && capturePrefs.systemAudio !== false) {
        sysOk = await this.publishSystemAudioFromDisplay(screenStream);
      } else if (this.hasPublishedSystemAudio()) {
        await this.stopSystemAudio();
      }
      return micOk || sysOk;
    }
    async ensureAudioPublished(capturePrefs) {
      return this.syncPublishedAudio(capturePrefs);
    }
    /** @deprecated Use syncPublishedAudio / publishMicrophone */
    async refreshPublishedAudio(capturePrefs, displayStream = null) {
      return this.syncPublishedAudio(capturePrefs, displayStream);
    }
    async stopVideoShare() {
      if (this.producers.video && !this.producers.video.closed) {
        this.producers.video.close();
        this.producers.video = null;
      }
      await this.stopSystemAudio();
      if (this.localScreenStream) {
        for (const track of this.localScreenStream.getTracks()) {
          try {
            track.stop();
          } catch (_) {
          }
        }
        this.localScreenStream = null;
      }
      this._producing = this.hasVideoProducer();
    }
    async requestDisplayCapture(capturePrefs) {
      this.setCapturePrefs(capturePrefs);
      const constraints = buildDisplayConstraintsWithAudio(
        this.videoQuality,
        capturePrefs.systemAudio !== false
      );
      this.onLog("Solicitando captura de telai?,?i", "info");
      return navigator.mediaDevices.getDisplayMedia(constraints);
    }
    async publishDisplayStream(displayStream, capturePrefs) {
      var _a47;
      if (!displayStream) throw new Error("Nenhuma captura de tela fornecida");
      this.setCapturePrefs(capturePrefs);
      await this.ensureSendTransport();
      if (this.producers.video && !this.producers.video.closed) {
        this.producers.video.close();
        this.producers.video = null;
      }
      if (this.localScreenStream && this.localScreenStream !== displayStream) {
        const keepTrackIds = new Set(displayStream.getTracks().map((t) => t.id));
        for (const track of this.localScreenStream.getTracks()) {
          if (keepTrackIds.has(track.id)) continue;
          try {
            track.stop();
          } catch (_) {
          }
        }
        await this.stopSystemAudio();
      }
      const videoTrack = displayStream.getVideoTracks().find((t) => t.readyState === "live");
      if (!videoTrack) {
        throw new Error("Pista de video indisponivel - selecione a tela novamente");
      }
      this.localScreenStream = displayStream;
      try {
        applyContentHint(videoTrack, this.videoQuality.contentHint || "detail");
        const settings = ((_a47 = videoTrack.getSettings) == null ? void 0 : _a47.call(videoTrack)) || {};
        if (settings.width && settings.height) {
          this.onLog(
            `Captura: ${settings.width}?f??"${settings.height} @ ${settings.frameRate || "?"}fps`,
            "info"
          );
        }
        videoTrack.addEventListener("ended", () => {
          window.dispatchEvent(new CustomEvent("sharescreen-ended"));
        });
        const videoOpts = buildVideoProduceOptions(videoTrack, this.device, this.videoQuality);
        videoOpts.track = videoTrack;
        this.producers.video = await this.sendTransport.produce(videoOpts);
        try {
          await this.producers.video.requestKeyFrame();
        } catch (_) {
        }
        if (capturePrefs.systemAudio !== false) {
          await this.publishSystemAudioFromDisplay(displayStream);
        } else {
          await this.stopSystemAudio();
        }
        if (capturePrefs.microphone) {
          await this.publishMicrophone(capturePrefs);
        }
        this._producing = true;
        this.onLog("Tela compartilhada com sucesso", "info");
        return displayStream;
      } catch (err) {
        if (!this.hasVideoProducer()) {
          this.localScreenStream = null;
          this._producing = false;
        }
        throw err;
      }
    }
    async startScreenShare(capturePrefs) {
      await this.stopVideoShare();
      this.setCapturePrefs(capturePrefs);
      await this.ensureSendTransport();
      const displayStream = await this.requestDisplayCapture(capturePrefs);
      return this.publishDisplayStream(displayStream, capturePrefs);
    }
    applyLowLatencyPlayback(consumer) {
      try {
        const receiver = consumer.rtpReceiver;
        if (receiver && "playoutDelayHint" in receiver) {
          receiver.playoutDelayHint = 0;
        }
      } catch (_) {
      }
    }
    async stopScreenShare({ notifyServer = true, stopMicrophone = false } = {}) {
      const hadVideo = this.hasVideoProducer();
      await this.stopVideoShare();
      if (stopMicrophone) {
        await this.stopMicrophone();
      }
      try {
        if (notifyServer && hadVideo && !this.hasVideoProducer() && !this.hasPublishedAudio() && this.signaling.connected && this.signaling.authenticated) {
          this.signaling.send("pararProducao", {});
        }
      } catch (_) {
      }
    }
    _ensureAudioPlaybackContext() {
      try {
        const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextCtor) return;
        if (!this._playbackAudioCtx) {
          this._playbackAudioCtx = new AudioContextCtor({ latencyHint: "interactive" });
        }
        if (this._playbackAudioCtx.state === "suspended") {
          this._playbackAudioCtx.resume().catch(() => {
          });
        }
      } catch (_) {
      }
    }
    async _resumeRemoteConsumer(consumer) {
      var _a47;
      if (!consumer || consumer.closed) return;
      if (consumer.kind === "audio" || ((_a47 = consumer.track) == null ? void 0 : _a47.kind) === "audio") {
        this._ensureAudioPlaybackContext();
      }
      if (!consumer.paused) return;
      try {
        const resumePromise = this.signaling.onceType(
          "consumerRetomado",
          (m) => {
            var _a48;
            return ((_a48 = m.payload) == null ? void 0 : _a48.consumerId) === consumer.id;
          }
        );
        this.signaling.send("retomarConsumer", { consumerId: consumer.id });
        await Promise.race([
          resumePromise,
          new Promise((resolve) => setTimeout(resolve, 3e3))
        ]);
      } catch (_) {
      }
      try {
        await consumer.resume();
      } catch (_) {
      }
    }
    async _consumeOne(producerId, mediaEl, kindHint, consumerTag = "default") {
      const transport = await this.ensureRecvTransport(consumerTag);
      const payload = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout aguardando: consumido (${producerId.slice(0, 8)})`));
        }, 25e3);
        const onConsumido = (msg) => {
          var _a47;
          if (msg.type !== "consumido") return;
          if (((_a47 = msg.payload) == null ? void 0 : _a47.producerId) !== producerId) return;
          cleanup();
          resolve(msg.payload);
        };
        const onErro = (msg) => {
          var _a47, _b;
          if (msg.type !== "erro") return;
          const text = String(((_a47 = msg.payload) == null ? void 0 : _a47.mensagem) || "").toLowerCase();
          const consumeRelated = text.includes("consumir") || text.includes("producer") || text.includes("capacidades") || text.includes("transport");
          if (!consumeRelated) return;
          cleanup();
          reject(new Error(((_b = msg.payload) == null ? void 0 : _b.mensagem) || "Erro ao consumir m?fidia"));
        };
        const cleanup = () => {
          clearTimeout(timer);
          this.signaling.removeListener(onConsumido);
          this.signaling.removeListener(onErro);
        };
        this.signaling.addListener(onConsumido);
        this.signaling.addListener(onErro);
        try {
          this.signaling.send("consumir", {
            producerId,
            rtpCapabilities: this.device.rtpCapabilities,
            consumerTag
          });
        } catch (err) {
          cleanup();
          reject(err);
        }
      });
      const consumer = await transport.consume({
        id: payload.id,
        producerId: payload.producerId,
        kind: payload.kind,
        rtpParameters: payload.rtpParameters
      });
      consumer.on("trackended", () => {
        this.onLog(`Track remota encerrada (${payload.kind})`, "warn");
      });
      const stream = new MediaStream([consumer.track]);
      consumer.appStream = stream;
      const isAudio = payload.kind === "audio" || kindHint === "audio";
      if (mediaEl) {
        mediaEl.srcObject = stream;
        mediaEl.playsInline = true;
        if (isAudio) {
          mediaEl.muted = false;
        } else {
          mediaEl.muted = true;
        }
        try {
          await mediaEl.play();
        } catch (playErr) {
          if (isAudio) {
            const err = new Error("Autoplay bloqueado para ?fiudio");
            err.name = "NotAllowedError";
            throw err;
          }
          mediaEl.muted = true;
          await mediaEl.play();
        }
      }
      if (this.videoQuality.lowLatency !== false) {
        this.applyLowLatencyPlayback(consumer);
      }
      await this._resumeRemoteConsumer(consumer);
      if (isAudio) {
        this._ensureAudioPlaybackContext();
        if (consumer.track) consumer.track.enabled = true;
      }
      if (!isAudio) {
        try {
          await consumer.requestKeyFrame();
        } catch (_) {
        }
      }
      return consumer;
    }
    async closeActiveVideoConsumer({ videoEl: videoEl2 = null, notifyServer = true } = {}) {
      return this._runVideoMediaOp(async () => {
        const currentVideo = this.remoteConsumers.video;
        if (!currentVideo || currentVideo.closed) {
          this.remoteConsumers.video = null;
          this.currentActiveVideoProducerId = null;
          if (videoEl2) videoEl2.srcObject = null;
          return;
        }
        const producerId = currentVideo.producerId;
        currentVideo.close();
        if (notifyServer && this.signaling.connected) {
          try {
            this.signaling.send("fecharConsumer", { consumerId: currentVideo.id });
          } catch (_) {
          }
        }
        this.remoteConsumers.video = null;
        if (producerId) this.videoConsumersByProducerId.delete(producerId);
        this.currentActiveVideoProducerId = null;
        if (videoEl2) videoEl2.srcObject = null;
      });
    }
    async closeRemoteConsumers() {
      return this._runMediaOp(async () => {
        for (const slot of ["video", "audio"]) {
          const consumer = this.remoteConsumers[slot];
          if (!consumer || consumer.closed) continue;
          if (slot === "video") {
            if (consumer.producerId) this.videoConsumersByProducerId.delete(consumer.producerId);
            this.currentActiveVideoProducerId = null;
          }
          consumer.close();
          try {
            if (this.signaling.connected) {
              this.signaling.send("fecharConsumer", { consumerId: consumer.id });
            }
          } catch (_) {
          }
          this.remoteConsumers[slot] = null;
        }
      });
    }
    async closeAuxiliaryAudio(peerId, source = null) {
      return this._runAudioMediaOp(async () => {
        const closeEntry = (key, entry) => {
          var _a47;
          if (!entry || entry.consumer.closed) return;
          const { source: entrySource } = parseAudioChannelKey(key);
          audioTrace("consumer fechado", {
            peerId: String(peerId).slice(0, 8),
            source: entrySource,
            consumerId: (_a47 = entry.consumer.id) == null ? void 0 : _a47.slice(0, 8)
          });
          entry.consumer.close();
          try {
            if (this.signaling.connected) {
              this.signaling.send("fecharConsumer", { consumerId: entry.consumer.id });
            }
          } catch (_) {
          }
        };
        if (source) {
          const channelKey = `${String(peerId)}:${normalizeAudioSource(source, "microphone")}`;
          const entry = this.auxAudioConsumers.get(channelKey);
          if (!entry) return;
          this.auxAudioConsumers.delete(channelKey);
          closeEntry(channelKey, entry);
          return;
        }
        const prefix = `${String(peerId)}:`;
        for (const [key, entry] of [...this.auxAudioConsumers.entries()]) {
          if (!key.startsWith(prefix)) continue;
          this.auxAudioConsumers.delete(key);
          closeEntry(key, entry);
        }
      });
    }
    async closeAllAuxiliaryAudio() {
      for (const channelKey of [...this.auxAudioConsumers.keys()]) {
        const { peerId, source } = parseAudioChannelKey(channelKey);
        await this.closeAuxiliaryAudio(peerId, source);
      }
    }
    async consumeAuxiliaryAudio(peerId, producerId, source = "microphone") {
      return this._runAudioMediaOp(async () => {
        var _a47;
        const channelKey = `${String(peerId)}:${normalizeAudioSource(source, "microphone")}`;
        const existing = this.auxAudioConsumers.get(channelKey);
        if (existing && !existing.consumer.closed && existing.producerId === producerId) {
          return existing.consumer;
        }
        if (existing) {
          this.auxAudioConsumers.delete(channelKey);
          if (!existing.consumer.closed) {
            existing.consumer.close();
            try {
              if (this.signaling.connected) {
                this.signaling.send("fecharConsumer", {
                  consumerId: existing.consumer.id
                });
              }
            } catch (_) {
            }
          }
        }
        await this.ensureRecvTransport(this._audioRecvTag());
        const consumer = await this._consumeOne(
          producerId,
          null,
          "audio",
          this._audioRecvTag()
        );
        this.auxAudioConsumers.set(channelKey, { consumer, producerId, source });
        audioTrace("consumer criado", {
          peerId: String(peerId).slice(0, 8),
          producerId: String(producerId).slice(0, 8),
          source: normalizeAudioSource(source, "microphone"),
          consumerId: (_a47 = consumer.id) == null ? void 0 : _a47.slice(0, 8)
        });
        return consumer;
      });
    }
    async consumeRemoteMedia(producerIds, { videoEl: videoEl2 = null, audioEl = null, ownProducerIds = null } = {}) {
      return this._runVideoMediaOp(async () => {
        var _a47, _b;
        if ((producerIds == null ? void 0 : producerIds.video) && videoEl2) {
          const ownVideoIds = new Set(
            [ownProducerIds == null ? void 0 : ownProducerIds.video, (_a47 = this.producers.video) == null ? void 0 : _a47.id].filter(Boolean)
          );
          if (ownVideoIds.has(producerIds.video)) {
            this.onLog("Ignorando consumo do proprio producer de video", "warn");
            return;
          }
          const cached = this.videoConsumersByProducerId.get(producerIds.video);
          const currentVideo = this.remoteConsumers.video;
          if (cached && !cached.closed && (currentVideo == null ? void 0 : currentVideo.id) === cached.id && currentVideo.producerId === producerIds.video) {
            if (cached.appStream && videoEl2.srcObject !== cached.appStream) {
              videoEl2.srcObject = cached.appStream;
              videoEl2.muted = true;
              try {
                await videoEl2.play();
              } catch (_) {
              }
            }
            this.currentActiveVideoProducerId = producerIds.video;
            return;
          }
          if (currentVideo && !currentVideo.closed && currentVideo.producerId === producerIds.video) {
            if (currentVideo.appStream && videoEl2.srcObject !== currentVideo.appStream) {
              videoEl2.srcObject = currentVideo.appStream;
              videoEl2.muted = true;
              try {
                await videoEl2.play();
              } catch (_) {
              }
            }
            this.currentActiveVideoProducerId = producerIds.video;
            this.videoConsumersByProducerId.set(producerIds.video, currentVideo);
            return;
          }
          await this.ensureRecvTransport(this._videoRecvTag());
          if (currentVideo && !currentVideo.closed) {
            if (currentVideo.producerId) {
              this.videoConsumersByProducerId.delete(currentVideo.producerId);
            }
            currentVideo.close();
            try {
              if (this.signaling.connected) {
                this.signaling.send("fecharConsumer", { consumerId: currentVideo.id });
              }
            } catch (_) {
            }
            this.remoteConsumers.video = null;
          }
          this.remoteConsumers.video = await this._consumeOne(
            producerIds.video,
            videoEl2,
            "video",
            this._videoRecvTag()
          );
          this.videoConsumersByProducerId.set(producerIds.video, this.remoteConsumers.video);
          this.currentActiveVideoProducerId = producerIds.video;
        } else if (!(producerIds == null ? void 0 : producerIds.video) && this.remoteConsumers.video) {
          await this.closeActiveVideoConsumer({ videoEl: videoEl2, notifyServer: true });
        }
        if ((producerIds == null ? void 0 : producerIds.audio) && audioEl) {
          const currentAudio = this.remoteConsumers.audio;
          if (currentAudio && !currentAudio.closed && currentAudio.producerId === producerIds.audio) {
            if (currentAudio.appStream && audioEl.srcObject !== currentAudio.appStream) {
              audioEl.srcObject = currentAudio.appStream;
              audioEl.muted = false;
              try {
                await audioEl.play();
              } catch (playErr) {
                const err = new Error("Autoplay bloqueado para ?fiudio");
                err.name = "NotAllowedError";
                throw err;
              }
            }
          } else {
            await this.ensureRecvTransport(this._audioRecvTag());
            if (currentAudio && !currentAudio.closed) {
              currentAudio.close();
              try {
                if (this.signaling.connected) {
                  this.signaling.send("fecharConsumer", { consumerId: currentAudio.id });
                }
              } catch (_) {
              }
              this.remoteConsumers.audio = null;
            }
            this.remoteConsumers.audio = await this._consumeOne(
              producerIds.audio,
              audioEl,
              "audio",
              this._audioRecvTag()
            );
          }
        } else if (!(producerIds == null ? void 0 : producerIds.audio) && this.remoteConsumers.audio) {
          const currentAudio = this.remoteConsumers.audio;
          if (currentAudio && !currentAudio.closed) {
            currentAudio.close();
            try {
              if (this.signaling.connected) {
                this.signaling.send("fecharConsumer", { consumerId: currentAudio.id });
              }
            } catch (_) {
            }
          }
          this.remoteConsumers.audio = null;
          if (audioEl) {
            audioEl.srcObject = null;
            (_b = audioEl.pause) == null ? void 0 : _b.call(audioEl);
          }
        }
      });
    }
    detachMedia({ videoEl: videoEl2 = null, audioEl = null } = {}) {
      var _a47;
      if (videoEl2) videoEl2.srcObject = null;
      if (audioEl) {
        audioEl.srcObject = null;
        (_a47 = audioEl.pause) == null ? void 0 : _a47.call(audioEl);
      }
      return this.closeRemoteConsumers();
    }
    async setRemoteAudioMuted(muted) {
      const consumer = this.remoteConsumers.audio;
      if (!consumer || consumer.closed) return;
      if (muted) {
        if (!consumer.paused) await consumer.pause();
      } else if (consumer.paused) {
        await consumer.resume();
      }
    }
    isRemoteAudioMuted() {
      const consumer = this.remoteConsumers.audio;
      return !!consumer && !consumer.closed && consumer.paused;
    }
    getRecordableStream({ hostPeerId: hostPeerId2, selectedPeerId } = {}) {
      var _a47;
      const own = hostPeerId2 && selectedPeerId && String(selectedPeerId) === String(hostPeerId2);
      if (own && this.localScreenStream) {
        const vt = this.localScreenStream.getVideoTracks()[0];
        if ((vt == null ? void 0 : vt.readyState) === "live") return this.localScreenStream;
      }
      const tracks = [];
      const rv = (_a47 = this.remoteConsumers.video) == null ? void 0 : _a47.track;
      const audioConsumer = this.remoteConsumers.audio;
      const ra = audioConsumer == null ? void 0 : audioConsumer.track;
      if ((rv == null ? void 0 : rv.readyState) === "live") tracks.push(rv);
      if ((ra == null ? void 0 : ra.readyState) === "live" && audioConsumer && !audioConsumer.paused) tracks.push(ra);
      if (tracks.length) return new MediaStream(tracks);
      if (this.localScreenStream) {
        const vt = this.localScreenStream.getVideoTracks()[0];
        if ((vt == null ? void 0 : vt.readyState) === "live") return this.localScreenStream;
      }
      return null;
    }
    getStatsTargets() {
      const targets = [];
      for (const slot of ["video", "audio"]) {
        const c = this.remoteConsumers[slot];
        if (c && !c.closed) targets.push({ kind: slot, consumer: c });
      }
      if (this.producers.video && !this.producers.video.closed) {
        targets.push({ kind: "video", producer: this.producers.video });
      }
      for (const source of ["microphone", "system", "mixed"]) {
        const p = this.producers[source];
        if (p && !p.closed) targets.push({ kind: "audio", producer: p, source });
      }
      return targets;
    }
    async _closeAllAudioProducers({ stopMicTrack = false } = {}) {
      for (const source of ["microphone", "system", "mixed"]) {
        await this._closeAudioProducerBySource(source, {
          stopMicTrack: stopMicTrack && source === "microphone"
        });
      }
    }
    async detachProducers({ notifyServer = false, keepMicTrack = false } = {}) {
      if (this.producers.video && !this.producers.video.closed) {
        this.producers.video.close();
        this.producers.video = null;
      }
      await this.stopSystemAudio();
      if (!keepMicTrack) {
        await this.stopMicrophone();
      }
      this._producing = false;
      if (notifyServer && this.signaling.connected && this.signaling.authenticated) {
        try {
          this.signaling.send("pararProducao", {});
        } catch (_) {
        }
      }
    }
    async dispose({ notifyServer = false, keepLocalScreenStream = false, keepMicTrack = false } = {}) {
      var _a47;
      if (keepLocalScreenStream) {
        await this.detachProducers({ notifyServer, keepMicTrack });
      } else {
        await this.stopScreenShare({ notifyServer, stopMicrophone: !keepMicTrack });
      }
      await this.closeRemoteConsumers();
      await this.closeAllAuxiliaryAudio();
      (_a47 = this.sendTransport) == null ? void 0 : _a47.close();
      for (const transport of this.recvTransports.values()) {
        transport == null ? void 0 : transport.close();
      }
      this.recvTransports.clear();
      this.sendTransport = null;
      this.recvTransport = null;
    }
  };

  // src/shared/transmission.js
  function normalizeTransmission(payload = {}) {
    const producerIds = payload.producerIds || {
      video: payload.producerId ?? null,
      audio: null
    };
    return {
      selectedPeerId: payload.selectedPeerId ?? null,
      producerId: producerIds.video,
      producerIds,
      peerName: payload.peerName ?? null,
      paused: !!payload.paused,
      lowerThird: payload.lowerThird ?? null,
      interrompidaPor: payload.interrompidaPor ?? null,
      finalizadaPor: payload.finalizadaPor ?? null
    };
  }
  function hasActiveVideo(payload) {
    const { producerIds } = normalizeTransmission(payload);
    return !!producerIds.video;
  }
  function parseRoomSnapshot(snapshot = {}) {
    var _a47;
    const transmission = normalizeTransmission(
      snapshot.transmission || snapshot.transmissaoAtiva || snapshot
    );
    const audioSources = snapshot.audioSources || snapshot.audioProducers || ((_a47 = snapshot.fontesAudio) == null ? void 0 : _a47.sources) || [];
    return {
      transmission,
      audioSources,
      peers: snapshot.peers || snapshot.clients || [],
      host: snapshot.host || null,
      displayControl: snapshot.displayControl || null,
      snapshotAt: snapshot.snapshotAt || 0,
      mutedPeerIds: snapshot.mutedPeerIds || [],
      version: snapshot.version || 0,
      reason: snapshot.reason || null
    };
  }
  function roomSnapshotMediaKey(snapshot = {}) {
    var _a47;
    const { transmission, audioSources } = parseRoomSnapshot(snapshot);
    const videoId = ((_a47 = transmission.producerIds) == null ? void 0 : _a47.video) || "";
    const audioIds = (audioSources || []).map((s) => `${s.peerId || s.id}:${s.producerId}`).sort().join("|");
    return `${transmission.selectedPeerId || ""}:${videoId}:${transmission.paused ? "1" : "0"}:${audioIds}`;
  }
  function activeVideoTransmissionKey(transmission) {
    var _a47;
    const t = normalizeTransmission(transmission);
    return `${t.selectedPeerId || ""}:${((_a47 = t.producerIds) == null ? void 0 : _a47.video) || ""}:${t.paused ? "1" : "0"}`;
  }
  function remoteVideoConsumeNeeded(transmission, { currentProducerId = null, isSelfSelected = false, hasVideoElement = false, consumerClosed = false } = {}) {
    var _a47;
    const tx = normalizeTransmission(transmission);
    if (isSelfSelected) return false;
    if (!hasActiveVideo(tx) || tx.paused) return false;
    const nextId = (_a47 = tx.producerIds) == null ? void 0 : _a47.video;
    if (!nextId) return false;
    if (consumerClosed || !currentProducerId || currentProducerId !== nextId) return true;
    return !hasVideoElement;
  }
  function mergeSourceWithTransmission(source, tx, { isSelected = false } = {}) {
    var _a47, _b, _c, _d;
    if (!source) return source;
    const normalized = normalizeTransmission(tx);
    if (!hasActiveVideo(normalized)) return source;
    const videoId = ((_a47 = normalized.producerIds) == null ? void 0 : _a47.video) || null;
    return {
      ...source,
      selectable: source.selectable ?? ((_b = source.mediaReady) == null ? void 0 : _b.video) ?? true,
      isProducing: true,
      hasVideo: true,
      producerIds: {
        ...source.producerIds || {},
        video: videoId || ((_c = source.producerIds) == null ? void 0 : _c.video) || source.producerId || null
      },
      producerId: videoId || ((_d = source.producerIds) == null ? void 0 : _d.video) || source.producerId || null,
      selecionado: !!isSelected,
      pausado: isSelected ? normalized.paused : source.pausado
    };
  }
  function enrichRoomSourcesState(estado2 = {}, transmission) {
    var _a47;
    if (!estado2) return estado2;
    const tx = normalizeTransmission(transmission || {});
    if (!hasActiveVideo(tx)) return { ...estado2 };
    const selectedId = tx.selectedPeerId;
    const videoId = (_a47 = tx.producerIds) == null ? void 0 : _a47.video;
    const clients = (estado2.clients || []).map((c) => {
      var _a48;
      if (selectedId && String(c.id) === String(selectedId)) {
        return mergeSourceWithTransmission(c, tx, { isSelected: true });
      }
      if (videoId && (((_a48 = c.producerIds) == null ? void 0 : _a48.video) === videoId || c.producerId === videoId)) {
        return mergeSourceWithTransmission(c, tx);
      }
      return selectedId ? { ...c, selecionado: false } : c;
    });
    let selecionado = estado2.selecionado;
    if (selectedId) {
      const match = clients.find((c) => String(c.id) === String(selectedId));
      selecionado = match ? { ...match, selecionado: true, pausado: tx.paused } : {
        id: selectedId,
        displayName: tx.peerName || "Fonte",
        isProducing: true,
        hasVideo: true,
        producerIds: tx.producerIds,
        producerId: tx.producerId,
        selecionado: true,
        pausado: tx.paused
      };
    } else if (selecionado) {
      selecionado = mergeSourceWithTransmission(selecionado, tx, { isSelected: true });
    }
    return { ...estado2, clients, selecionado };
  }

  // src/shared/recording-filename.js
  var MESES = [
    "Janeiro",
    "Fevereiro",
    "Mar\xE7o",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ];
  function formatLegacyRecordingFilename(endDate) {
    const y = endDate.getFullYear();
    const m = endDate.getMonth();
    const mes = MESES[m] || "Mes";
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(endDate.getDate()).padStart(2, "0");
    const hh = String(endDate.getHours()).padStart(2, "0");
    const nn = String(endDate.getMinutes()).padStart(2, "0");
    return `${y} ${mes}${mm} ${dd} ${hh}h${nn}.webm`;
  }
  function buildRecordingFilenameVars(endDate) {
    const m = endDate.getMonth();
    return {
      YYYY: String(endDate.getFullYear()),
      MM: String(m + 1).padStart(2, "0"),
      DD: String(endDate.getDate()).padStart(2, "0"),
      HH: String(endDate.getHours()).padStart(2, "0"),
      NN: String(endDate.getMinutes()).padStart(2, "0"),
      MES: MESES[m] || "Mes"
    };
  }
  function formatRecordingFilename(endDate = /* @__PURE__ */ new Date(), pattern) {
    const trimmed = String(pattern ?? "").trim();
    if (!trimmed) {
      return formatLegacyRecordingFilename(endDate);
    }
    const vars = buildRecordingFilenameVars(endDate);
    let name = trimmed;
    for (const [key, value] of Object.entries(vars)) {
      const token = `{${key}}`;
      name = name.split(token).join(value);
    }
    if (!name.toLowerCase().endsWith(".webm")) {
      name += ".webm";
    }
    return name;
  }
  function isValidRecordingFilename(name) {
    if (!name || typeof name !== "string") return false;
    const base = name.replace(/\\/g, "/").split("/").pop();
    if (!base || base === "." || base === "..") return false;
    if (!base.toLowerCase().endsWith(".webm")) return false;
    if (base.length > 200 || base.length <= 5) return false;
    if (/[<>:"|?*\x00-\x1f]/.test(base)) return false;
    if (base.includes("..")) return false;
    return true;
  }

  // src/shared/recording-client.js
  var RecordingState = {
    IDLE: "idle",
    RECORDING: "recording",
    FINALIZING: "finalizing",
    UPLOADING: "uploading",
    SAVED: "saved",
    ERROR: "error"
  };
  var CHUNK_UPLOAD_RETRIES = 3;
  var CHUNK_RETRY_DELAY_MS = 1500;
  var RecordingClient = class {
    constructor({ onLog, onStateChange, onProgress, onTimer } = {}) {
      this.onLog = onLog || (() => {
      });
      this.onStateChange = onStateChange || (() => {
      });
      this.onProgress = onProgress || (() => {
      });
      this.onTimer = onTimer || (() => {
      });
      this.mediaRecorder = null;
      this.chunks = [];
      this._mimeType = "video/webm";
      this._state = RecordingState.IDLE;
      this._timerInterval = null;
      this._startedAt = 0;
      this._approxBytes = 0;
      this._bytesPersisted = 0;
      this._hostToken = "";
      this._streamingEnabled = true;
      this._streamSessionId = null;
      this._nextChunkIndex = 0;
      this._customDir = "";
      this._uploadQueue = [];
      this._uploadQueueActive = false;
      this._stopResolve = null;
      this._legacyMode = false;
      this._finishRequested = false;
    }
    get state() {
      return this._state;
    }
    get bytesPersisted() {
      return this._bytesPersisted;
    }
    isStreaming() {
      return !!this._streamSessionId && !this._legacyMode;
    }
    setState(s) {
      this._state = s;
      this.onStateChange(s);
    }
    setHostToken(token) {
      this._hostToken = token || "";
    }
    _headers(extra = {}) {
      const headers = { ...extra };
      if (this._hostToken) headers["X-Host-Token"] = this._hostToken;
      return headers;
    }
    _pickMimeType() {
      const candidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
      ];
      for (const t of candidates) {
        if (MediaRecorder.isTypeSupported(t)) return t;
      }
      return "video/webm";
    }
    async _startStreamSession(customDir = "") {
      const res = await fetch("/api/gravacao/stream/start", {
        method: "POST",
        headers: {
          ...this._headers(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ customDir: customDir || "" })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok || !data.sessionId) {
        throw new Error(data.erro || `Falha ao iniciar streaming (${res.status})`);
      }
      return data.sessionId;
    }
    _enqueueChunk(blob) {
      if (!(blob == null ? void 0 : blob.size)) return;
      const index = this._nextChunkIndex++;
      this._uploadQueue.push({ index, blob });
      this._drainUploadQueue();
    }
    async _drainUploadQueue() {
      if (this._uploadQueueActive || this._legacyMode || !this._streamSessionId) return;
      this._uploadQueueActive = true;
      try {
        while (this._uploadQueue.length > 0) {
          const item = this._uploadQueue[0];
          let lastError = null;
          for (let attempt = 0; attempt < CHUNK_UPLOAD_RETRIES; attempt++) {
            try {
              const res = await fetch("/api/gravacao/stream/chunk", {
                method: "POST",
                headers: {
                  ...this._headers(),
                  "X-Session-Id": this._streamSessionId,
                  "X-Chunk-Index": String(item.index),
                  "Content-Type": "application/octet-stream"
                },
                body: item.blob
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok || !data.ok) {
                throw new Error(data.erro || `Chunk ${item.index} falhou (${res.status})`);
              }
              this._bytesPersisted = data.bytesWritten ?? this._bytesPersisted + item.blob.size;
              this._uploadQueue.shift();
              lastError = null;
              break;
            } catch (err) {
              lastError = err;
              if (attempt < CHUNK_UPLOAD_RETRIES - 1) {
                await new Promise((r) => setTimeout(r, CHUNK_RETRY_DELAY_MS * (attempt + 1)));
              }
            }
          }
          if (lastError) {
            this.setState(RecordingState.ERROR);
            this.onLog(`Falha ao enviar chunk ${item.index}: ${lastError.message}`, "error");
            throw lastError;
          }
        }
      } finally {
        this._uploadQueueActive = false;
        if (this._stopResolve && this._uploadQueue.length === 0) {
          const resolve = this._stopResolve;
          this._stopResolve = null;
          resolve();
        }
      }
    }
    async _flushUploadQueue() {
      if (this._legacyMode) return;
      await this._drainUploadQueue();
      if (this._uploadQueue.length > 0) {
        await new Promise((resolve) => {
          this._stopResolve = resolve;
          this._drainUploadQueue().catch(() => resolve());
        });
      }
    }
    async start(stream, quality = {}, { customDir = "" } = {}) {
      var _a47, _b;
      if (!((_a47 = stream == null ? void 0 : stream.getVideoTracks) == null ? void 0 : _a47.call(stream).length)) {
        throw new Error("Nenhum v\xEDdeo dispon\xEDvel para gravar");
      }
      const liveVideo = stream.getVideoTracks().some((t) => t.readyState === "live");
      if (!liveVideo) throw new Error("Stream de v\xEDdeo n\xE3o est\xE1 ativo");
      if (((_b = this.mediaRecorder) == null ? void 0 : _b.state) === "recording") {
        throw new Error("Grava\xE7\xE3o j\xE1 em andamento");
      }
      this.chunks = [];
      this._approxBytes = 0;
      this._bytesPersisted = 0;
      this._nextChunkIndex = 0;
      this._uploadQueue = [];
      this._legacyMode = false;
      this._streamSessionId = null;
      this._customDir = customDir || "";
      this._finishRequested = false;
      this._mimeType = this._pickMimeType();
      const vbps = quality.videoBitsPerSecond ?? 25e5;
      if (this._streamingEnabled) {
        try {
          this._streamSessionId = await this._startStreamSession(this._customDir);
          this.onLog("Grava\xE7\xE3o em streaming para o servidor", "info");
        } catch (err) {
          this._legacyMode = true;
          this.onLog(`Streaming indispon\xEDvel, usando buffer local: ${err.message}`, "warn");
        }
      } else {
        this._legacyMode = true;
      }
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this._mimeType,
        videoBitsPerSecond: vbps
      });
      this.mediaRecorder.ondataavailable = (e) => {
        var _a48;
        if (!((_a48 = e.data) == null ? void 0 : _a48.size)) return;
        this._approxBytes += e.data.size;
        if (this._legacyMode) {
          this.chunks.push(e.data);
        } else {
          this._enqueueChunk(e.data);
        }
      };
      this.mediaRecorder.onerror = () => {
        this.setState(RecordingState.ERROR);
        this.onLog("Erro no MediaRecorder", "error");
      };
      this.mediaRecorder.start(1e3);
      this._startedAt = Date.now();
      this._timerInterval = setInterval(() => {
        const sec = Math.floor((Date.now() - this._startedAt) / 1e3);
        const bytes = this.isStreaming() ? this._bytesPersisted : this._approxBytes;
        this.onTimer(sec, bytes);
      }, 1e3);
      this.setState(RecordingState.RECORDING);
      this.onLog("Grava\xE7\xE3o iniciada", "info");
    }
    stop() {
      return new Promise((resolve, reject) => {
        const mr = this.mediaRecorder;
        if (!mr || mr.state === "inactive") {
          resolve(this._legacyMode ? null : { streaming: true });
          return;
        }
        this.setState(RecordingState.FINALIZING);
        clearInterval(this._timerInterval);
        mr.onstop = async () => {
          this.mediaRecorder = null;
          try {
            if (this._legacyMode) {
              const blob = new Blob(this.chunks, { type: this._mimeType });
              this.chunks = [];
              resolve(blob.size > 0 ? blob : null);
              return;
            }
            await this._flushUploadQueue();
            resolve({ streaming: true });
          } catch (err) {
            this.setState(RecordingState.ERROR);
            reject(err);
          }
        };
        mr.onerror = () => {
          this.setState(RecordingState.ERROR);
          reject(new Error("Falha ao finalizar grava\xE7\xE3o"));
        };
        try {
          mr.stop();
        } catch (e) {
          reject(e);
        }
      });
    }
    async finishStream(filename, customDir = "") {
      if (!this._streamSessionId || this._legacyMode) {
        return null;
      }
      if (this._finishRequested) return null;
      this._finishRequested = true;
      try {
        await this._flushUploadQueue();
        const res = await fetch("/api/gravacao/stream/finish", {
          method: "POST",
          headers: {
            ...this._headers(),
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            sessionId: this._streamSessionId,
            filename,
            customDir: customDir || this._customDir || "",
            incomplete: false
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) {
          throw new Error(data.erro || `Falha ao finalizar grava\xE7\xE3o (${res.status})`);
        }
        this._streamSessionId = null;
        this.setState(RecordingState.SAVED);
        this.onProgress(100);
        return data;
      } catch (err) {
        this.setState(RecordingState.ERROR);
        throw err;
      }
    }
    finishIncomplete(filename = "") {
      if (!this._streamSessionId || this._legacyMode || this._finishRequested) return;
      this._finishRequested = true;
      const payload = {
        sessionId: this._streamSessionId,
        filename,
        incomplete: true
      };
      fetch("/api/gravacao/stream/finish", {
        method: "POST",
        headers: {
          ...this._headers(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {
      });
      this._streamSessionId = null;
    }
    prepareIncompleteFinish(filename = "") {
      if (this.isRecording() && this.mediaRecorder) {
        try {
          clearInterval(this._timerInterval);
          this.mediaRecorder.stop();
        } catch (_) {
        }
      }
      this.finishIncomplete(filename);
    }
    resetIdle() {
      this._streamSessionId = null;
      this._legacyMode = false;
      this._finishRequested = false;
      this._uploadQueue = [];
      this.setState(RecordingState.IDLE);
    }
    isRecording() {
      var _a47;
      return ((_a47 = this.mediaRecorder) == null ? void 0 : _a47.state) === "recording";
    }
    async upload(blob, filename = formatRecordingFilename(/* @__PURE__ */ new Date()), customDir = "") {
      if (!(blob == null ? void 0 : blob.size)) throw new Error("Grava\xE7\xE3o vazia");
      this.setState(RecordingState.UPLOADING);
      const headers = {
        "Content-Type": "application/octet-stream",
        "X-Recording-Filename": filename
      };
      if (customDir) headers["X-Recording-Dir"] = customDir;
      if (this._hostToken) headers["X-Host-Token"] = this._hostToken;
      const useChunked = blob.size > 8 * 1024 * 1024;
      try {
        if (useChunked && typeof fetch === "function") {
          return await this._uploadChunked(blob, filename, headers, customDir);
        }
        return await this._uploadSimple(blob, filename, headers);
      } catch (e) {
        this.setState(RecordingState.ERROR);
        throw e;
      }
    }
    _uploadSimple(blob, filename, headers) {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/gravacao");
        for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) {
            this.onProgress(Math.round(ev.loaded / ev.total * 100));
          }
        };
        xhr.onload = () => {
          let data = {};
          try {
            data = JSON.parse(xhr.responseText);
          } catch (_) {
          }
          if (xhr.status >= 200 && xhr.status < 300) {
            this.setState(RecordingState.SAVED);
            this.onProgress(100);
            resolve(data);
          } else {
            reject(new Error(data.erro || `HTTP ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error("Falha de rede ao enviar grava\xE7\xE3o"));
        xhr.send(blob);
      });
    }
    async _uploadChunked(blob, filename, headers, customDir = "") {
      const chunkSize = 2 * 1024 * 1024;
      const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const total = Math.ceil(blob.size / chunkSize);
      for (let i = 0; i < total; i++) {
        const start = i * chunkSize;
        const part = blob.slice(start, start + chunkSize);
        const res = await fetch("/api/gravacao/chunk", {
          method: "POST",
          headers: {
            ...headers,
            "X-Upload-Id": uploadId,
            "X-Chunk-Index": String(i),
            "X-Chunk-Total": String(total),
            "Content-Type": "application/octet-stream"
          },
          body: part
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.erro || `Chunk ${i} falhou`);
        this.onProgress(Math.round((i + 1) / total * 90));
      }
      const finishRes = await fetch("/api/gravacao/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this._hostToken ? { "X-Host-Token": this._hostToken } : {}
        },
        body: JSON.stringify({ uploadId, filename, customDir })
      });
      const result = await finishRes.json().catch(() => ({}));
      if (!finishRes.ok) throw new Error(result.erro || "Falha ao finalizar upload");
      this.setState(RecordingState.SAVED);
      this.onProgress(100);
      return result;
    }
    async stopAndUpload(stream, quality) {
      const result = await this.stop();
      if (!result) {
        this.setState(RecordingState.IDLE);
        return null;
      }
      if (result.streaming) {
        const filename2 = formatRecordingFilename(/* @__PURE__ */ new Date());
        return this.finishStream(filename2);
      }
      const filename = formatRecordingFilename(/* @__PURE__ */ new Date());
      return this.upload(result, filename);
    }
  };

  // src/shared/recording-compositor.js
  function getLiveVideoTrack(stream) {
    var _a47;
    return ((_a47 = stream == null ? void 0 : stream.getVideoTracks) == null ? void 0 : _a47.call(stream).find((track) => track.readyState === "live")) || null;
  }
  function getVideoDimensions(videoEl2, fallbackStream) {
    var _a47;
    const fallbackTrack = getLiveVideoTrack(fallbackStream);
    const settings = ((_a47 = fallbackTrack == null ? void 0 : fallbackTrack.getSettings) == null ? void 0 : _a47.call(fallbackTrack)) || {};
    const width = (videoEl2 == null ? void 0 : videoEl2.videoWidth) || settings.width || 1280;
    const height = (videoEl2 == null ? void 0 : videoEl2.videoHeight) || settings.height || 720;
    return {
      width: Math.max(2, Math.floor(width)),
      height: Math.max(2, Math.floor(height))
    };
  }
  function createFallbackVideo(fallbackStream) {
    if (!getLiveVideoTrack(fallbackStream)) return null;
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.srcObject = fallbackStream;
    video.play().catch(() => {
    });
    return video;
  }
  function drawBadge(ctx, canvas, text) {
    const label = String(text || "").trim();
    if (!label) return;
    const fontSize = 11;
    const paddingX = 14;
    const paddingTop = 3;
    const paddingBottom = 5;
    const radius = 5;
    const maxWidth = Math.min(420, Math.round(canvas.width * 0.72));
    ctx.save();
    ctx.font = `400 ${fontSize}px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif`;
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    let displayText = label;
    let textWidth = ctx.measureText(displayText).width;
    if (textWidth > maxWidth - paddingX * 2) {
      while (displayText.length > 1 && ctx.measureText(`${displayText}...`).width > maxWidth - paddingX * 2) {
        displayText = displayText.slice(0, -1);
      }
      displayText = `${displayText}...`;
      textWidth = ctx.measureText(displayText).width;
    }
    const width = Math.min(maxWidth, Math.ceil(textWidth + paddingX * 2));
    const height = fontSize * 1.35 + paddingTop + paddingBottom;
    const x = Math.round((canvas.width - width) / 2);
    const y = 0;
    const bottom = y + height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width, bottom - radius);
    ctx.quadraticCurveTo(x + width, bottom, x + width - radius, bottom);
    ctx.lineTo(x + radius, bottom);
    ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, y, 0, bottom);
    gradient.addColorStop(0, "#5a9fd4");
    gradient.addColorStop(0.55, "#2a6eb5");
    gradient.addColorStop(1, "#1e5a96");
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = "#174a7a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = "#fff";
    ctx.fillText(displayText, x + width / 2, y + height / 2);
    ctx.restore();
  }
  function drawVideoFrame(ctx, canvas, source) {
    if (!source || source.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return false;
    if (!source.videoWidth || !source.videoHeight) return false;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    return true;
  }
  var RecordingCompositor = {
    start({ videoEl: videoEl2, fallbackStream, badgeText, getBadgeText, visible = true, getBadgeVisible } = {}) {
      const sourceStream = (videoEl2 == null ? void 0 : videoEl2.srcObject) instanceof MediaStream ? videoEl2.srcObject : fallbackStream;
      const rawTrack = getLiveVideoTrack(sourceStream) || getLiveVideoTrack(fallbackStream);
      if (!rawTrack) return null;
      const resolveBadgeText = () => {
        if (typeof getBadgeText === "function") return getBadgeText();
        return badgeText;
      };
      const resolveBadgeVisible = () => {
        if (typeof getBadgeVisible === "function") return !!getBadgeVisible();
        return visible;
      };
      const canvas = document.createElement("canvas");
      const dims = getVideoDimensions(videoEl2, fallbackStream || sourceStream);
      canvas.width = dims.width;
      canvas.height = dims.height;
      const ctx = canvas.getContext("2d", { alpha: false });
      if (!ctx || typeof canvas.captureStream !== "function") {
        console.warn("[RecordingCompositor] canvas.captureStream indisponivel; gravando video bruto");
        return {
          stream: new MediaStream([rawTrack]),
          stop() {
          }
        };
      }
      const fallbackVideo = createFallbackVideo(fallbackStream);
      let raf = 0;
      let stopped = false;
      const tick = () => {
        if (stopped) return;
        const drawn = drawVideoFrame(ctx, canvas, videoEl2) || drawVideoFrame(ctx, canvas, fallbackVideo);
        if (!drawn) {
          ctx.fillStyle = "#000";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        if (resolveBadgeVisible()) drawBadge(ctx, canvas, resolveBadgeText());
        raf = requestAnimationFrame(tick);
      };
      tick();
      const capturedStream = canvas.captureStream(30);
      return {
        stream: capturedStream,
        stop() {
          stopped = true;
          if (raf) cancelAnimationFrame(raf);
          for (const track of capturedStream.getTracks()) {
            track.stop();
          }
          if (fallbackVideo) {
            fallbackVideo.pause();
            fallbackVideo.srcObject = null;
          }
        }
      };
    }
  };

  // src/shared/recording-audio-mixer.js
  function liveAudioTrack(track) {
    return (track == null ? void 0 : track.readyState) === "live" ? track : null;
  }
  function addTrackOnce(list, track) {
    const live = liveAudioTrack(track);
    if (!live || list.some((item) => item.track === live || item.track.id === live.id)) return;
    list.push({ track: live });
  }
  function matchesPeerFilter(peerId, restrictToPeerId) {
    if (!restrictToPeerId) return true;
    return String(peerId) === String(restrictToPeerId);
  }
  function collectOwnAudioTracks(media2, { excludeSystem = false } = {}) {
    var _a47, _b, _c, _d, _e, _f, _g;
    const tracks = [];
    if (!excludeSystem) {
      addTrackOnce(tracks, (_b = (_a47 = media2 == null ? void 0 : media2.producers) == null ? void 0 : _a47.system) == null ? void 0 : _b.track);
      addTrackOnce(tracks, (_d = (_c = media2 == null ? void 0 : media2.localScreenStream) == null ? void 0 : _c.getAudioTracks) == null ? void 0 : _d.call(_c)[0]);
    }
    addTrackOnce(tracks, (_f = (_e = media2 == null ? void 0 : media2.producers) == null ? void 0 : _e.microphone) == null ? void 0 : _f.track);
    addTrackOnce(tracks, (_g = media2 == null ? void 0 : media2.getLocalMicrophoneTrack) == null ? void 0 : _g.call(media2));
    return tracks;
  }
  function collectMonitorAudioTracks(hostAudioMonitor2, mutedClients2, restrictToPeerId = null) {
    var _a47, _b;
    const sources = [];
    if (!hostAudioMonitor2) return sources;
    const muted = new Set([...mutedClients2 || []].map(String));
    const peerFilter = restrictToPeerId ? String(restrictToPeerId) : null;
    for (const ch of ((_a47 = hostAudioMonitor2.channels) == null ? void 0 : _a47.values()) || []) {
      if (muted.has(String(ch.peerId))) continue;
      if (peerFilter && !matchesPeerFilter(ch.peerId, peerFilter)) continue;
      addTrackOnce(sources, (_b = ch.consumer) == null ? void 0 : _b.track);
    }
    return sources;
  }
  var RecordingAudioMixer = {
    async build({
      hostAudioMonitor: hostAudioMonitor2,
      media: media2,
      own = false,
      mutedClients: mutedClients2,
      excludeOwnSystem = false,
      restrictToPeerId = null
    } = {}) {
      var _a47;
      await ((_a47 = hostAudioMonitor2 == null ? void 0 : hostAudioMonitor2.resume) == null ? void 0 : _a47.call(hostAudioMonitor2));
      const sources = collectMonitorAudioTracks(hostAudioMonitor2, mutedClients2, restrictToPeerId);
      if (own) {
        for (const source of collectOwnAudioTracks(media2, { excludeSystem: excludeOwnSystem })) {
          addTrackOnce(sources, source.track);
        }
      }
      if (!sources.length) {
        return { track: null, stop() {
        } };
      }
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) {
        return { track: sources[0].track, stop() {
        } };
      }
      const ctx = new AudioContextCtor();
      const dest = ctx.createMediaStreamDestination();
      const nodes = [];
      for (const source of sources) {
        try {
          const stream = new MediaStream([source.track]);
          const input = ctx.createMediaStreamSource(stream);
          const gain = ctx.createGain();
          gain.gain.value = 1;
          input.connect(gain);
          gain.connect(dest);
          nodes.push({ input, gain });
        } catch (err) {
          console.warn("[RecordingAudioMixer] falha ao conectar audio", err);
        }
      }
      if (ctx.state === "suspended") {
        await ctx.resume().catch(() => {
        });
      }
      const track = dest.stream.getAudioTracks()[0] || null;
      return {
        track: liveAudioTrack(track),
        stop() {
          for (const node of nodes) {
            try {
              node.input.disconnect();
            } catch (_) {
            }
            try {
              node.gain.disconnect();
            } catch (_) {
            }
          }
          ctx.close().catch(() => {
          });
        }
      };
    }
  };

  // src/shared/error-manager.js
  var ErrorCodes = {
    PERMISSION_DENIED: "permission_denied",
    INSECURE_CONTEXT: "insecure_context",
    MIC_UNAVAILABLE: "mic_unavailable",
    SCREEN_NOT_SELECTED: "screen_not_selected",
    WS_DISCONNECTED: "ws_disconnected",
    ICE_FAILED: "ice_failed",
    MEDIASOUP_FAILED: "mediasoup_failed",
    AUTOPLAY_BLOCKED: "autoplay_blocked",
    RECORDING_UNAVAILABLE: "recording_unavailable",
    UPLOAD_FAILED: "upload_failed",
    SERVER_UNAVAILABLE: "server_unavailable",
    AUTH_FAILED: "auth_failed",
    ROOM_FULL: "room_full",
    FORBIDDEN: "forbidden",
    NOT_AUTHENTICATED: "not_authenticated",
    NO_SELECTION: "no_selection",
    TRANSPORT_ERROR: "transport_error",
    UNKNOWN: "unknown"
  };
  var FRIENDLY = {
    [ErrorCodes.PERMISSION_DENIED]: "Permiss\xE3o negada. Clique em permitir quando o navegador solicitar tela ou microfone.",
    [ErrorCodes.INSECURE_CONTEXT]: "Conex\xE3o n\xE3o segura. Use HTTPS (ou localhost) para compartilhar tela e microfone.",
    [ErrorCodes.MIC_UNAVAILABLE]: "Microfone indispon\xEDvel. Verifique se h\xE1 um dispositivo conectado e tente novamente.",
    [ErrorCodes.SCREEN_NOT_SELECTED]: "Nenhuma tela foi selecionada. Escolha um monitor ou janela no di\xE1logo do navegador.",
    [ErrorCodes.WS_DISCONNECTED]: "Conex\xE3o com o servidor perdida. Reconectando automaticamente\u2026",
    [ErrorCodes.ICE_FAILED]: "Falha na conex\xE3o de m\xEDdia (ICE). Verifique firewall UDP 40000\u201340100 na rede.",
    [ErrorCodes.MEDIASOUP_FAILED]: "Falha ao publicar ou receber m\xEDdia. Tente recompartilhar a tela.",
    [ErrorCodes.AUTOPLAY_BLOCKED]: 'O navegador bloqueou a reprodu\xE7\xE3o de \xE1udio. Clique em "Ativar \xE1udio".',
    [ErrorCodes.RECORDING_UNAVAILABLE]: "Grava\xE7\xE3o indispon\xEDvel. Selecione uma transmiss\xE3o ativa antes de gravar.",
    [ErrorCodes.UPLOAD_FAILED]: "Falha ao enviar a grava\xE7\xE3o ao servidor. Verifique espa\xE7o em disco e conex\xE3o.",
    [ErrorCodes.SERVER_UNAVAILABLE]: "Servidor indispon\xEDvel. Verifique se o ShareScreen est\xE1 em execu\xE7\xE3o.",
    [ErrorCodes.AUTH_FAILED]: "Acesso negado. Verifique o PIN ou credenciais de host.",
    [ErrorCodes.ROOM_FULL]: "Sala cheia. Aguarde ou pe\xE7a ao host para liberar vagas.",
    [ErrorCodes.FORBIDDEN]: "Sem permiss\xE3o para esta a\xE7\xE3o.",
    [ErrorCodes.NOT_AUTHENTICATED]: "Sess\xE3o expirada. Reconectando automaticamente\u2026",
    [ErrorCodes.NO_SELECTION]: "Nenhuma fonte selecionada para esta opera\xE7\xE3o.",
    [ErrorCodes.TRANSPORT_ERROR]: "Conex\xE3o de m\xEDdia inst\xE1vel. Aguarde a reconex\xE3o autom\xE1tica.",
    [ErrorCodes.UNKNOWN]: "Ocorreu um erro inesperado. Tente novamente em instantes."
  };
  function classifyServerMessage(msg) {
    const text = String(msg || "").toLowerCase();
    if (text.includes("limite de") && text.includes("client")) {
      return ErrorCodes.ROOM_FULL;
    }
    if (text.includes("pin inv\xE1lido") || text.includes("pin invalido") || text.includes("acesso negado") || text.includes("link de acesso inv\xE1lido") || text.includes("link de acesso invalido")) {
      return ErrorCodes.AUTH_FAILED;
    }
    if (text.includes("n\xE3o autenticado") || text.includes("nao autenticado")) {
      return ErrorCodes.NOT_AUTHENTICATED;
    }
    if (text.includes("apenas o host") || text.includes("sem permissao") || text.includes("sem permiss\xE3o")) {
      return ErrorCodes.FORBIDDEN;
    }
    if (text.includes("nenhum client selecionado") || text.includes("nenhuma transmiss")) {
      return ErrorCodes.NO_SELECTION;
    }
    if (text.includes("transport") && (text.includes("inv\xE1lido") || text.includes("invalido"))) {
      return ErrorCodes.TRANSPORT_ERROR;
    }
    if (text.includes("timeout") || text.includes("servidor indispon")) {
      return ErrorCodes.SERVER_UNAVAILABLE;
    }
    return null;
  }
  function isTransientServerError(msg, { joinInProgress: joinInProgress2 = false } = {}) {
    const text = String(msg || "").toLowerCase();
    if (joinInProgress2 && (text.includes("n\xE3o autenticado") || text.includes("nao autenticado"))) {
      return true;
    }
    if (text.includes("tipo de mensagem desconhecido")) return true;
    return false;
  }
  function classifyError(err) {
    const name = (err == null ? void 0 : err.name) || "";
    const msg = String((err == null ? void 0 : err.message) || err || "").toLowerCase();
    const serverCode = classifyServerMessage(msg);
    if (serverCode) return serverCode;
    if (name === "NotAllowedError" || msg.includes("permission")) {
      if (msg.includes("local network") || msg.includes("private network") || msg.includes("private ip") || msg.includes("mdns")) {
        return ErrorCodes.ICE_FAILED;
      }
      if (msg.includes("microphone") || msg.includes("microfone")) {
        return ErrorCodes.MIC_UNAVAILABLE;
      }
      return ErrorCodes.PERMISSION_DENIED;
    }
    if (msg.includes("secure context") || msg.includes("https")) {
      return ErrorCodes.INSECURE_CONTEXT;
    }
    if (msg.includes("ice") || msg.includes("transport") && msg.includes("failed")) {
      return ErrorCodes.ICE_FAILED;
    }
    if (msg.includes("websocket") || msg.includes("desconect")) {
      return ErrorCodes.WS_DISCONNECTED;
    }
    if (msg.includes("autoplay") || msg.includes("play()")) {
      return ErrorCodes.AUTOPLAY_BLOCKED;
    }
    if (msg.includes("grav") || msg.includes("record")) {
      return ErrorCodes.RECORDING_UNAVAILABLE;
    }
    if (msg.includes("upload") || msg.includes("enviar grava")) {
      return ErrorCodes.UPLOAD_FAILED;
    }
    if (msg.includes("pin inv\xE1lido") || msg.includes("pin invalido") || msg.includes("acesso negado")) {
      return ErrorCodes.AUTH_FAILED;
    }
    if (msg.includes("n\xE3o autenticado") || msg.includes("nao autenticado")) {
      return ErrorCodes.NOT_AUTHENTICATED;
    }
    if (msg.includes("timeout")) {
      return ErrorCodes.SERVER_UNAVAILABLE;
    }
    return ErrorCodes.UNKNOWN;
  }
  var ErrorManager = class {
    constructor({ onToast, onTechnicalLog, toastDedupeMs = 3e3 } = {}) {
      this.onToast = onToast || (() => {
      });
      this.onTechnicalLog = onTechnicalLog || (() => {
      });
      this.lastErrors = [];
      this.maxHistory = 50;
      this.toastDedupeMs = toastDedupeMs;
      this._lastToast = { code: "", at: 0 };
    }
    handle(err, context = "") {
      const code = classifyError(err);
      const technical = (err == null ? void 0 : err.stack) || String((err == null ? void 0 : err.message) || err);
      const friendly = FRIENDLY[code] || FRIENDLY[ErrorCodes.UNKNOWN];
      const entry = {
        code,
        friendly,
        technical,
        context,
        at: (/* @__PURE__ */ new Date()).toISOString()
      };
      this.lastErrors.unshift(entry);
      if (this.lastErrors.length > this.maxHistory) this.lastErrors.pop();
      this.onTechnicalLog(`[${code}] ${context}: ${technical}`, "error");
      const now = Date.now();
      if (code !== this._lastToast.code || now - this._lastToast.at >= this.toastDedupeMs) {
        this._lastToast = { code, at: now };
        this.onToast(friendly, "error");
      }
      return entry;
    }
    handleServerMessage(message, context = "servidor", { joinInProgress: joinInProgress2 = false } = {}) {
      const technical = String(message || "");
      if (isTransientServerError(technical, { joinInProgress: joinInProgress2 })) {
        this.onTechnicalLog(`[transient] ${context}: ${technical}`, "warn");
        return null;
      }
      return this.handle(new Error(technical), context);
    }
    getHistory() {
      return [...this.lastErrors];
    }
  };
  function assertSecureContext() {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      const e = new Error("Secure context required for getDisplayMedia");
      e.code = ErrorCodes.INSECURE_CONTEXT;
      throw e;
    }
  }

  // src/shared/ui-state.js
  var UiState = {
    IDLE: "idle",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    WAITING_PERMISSION: "waiting-permission",
    SHARING: "sharing",
    SELECTED_LIVE: "selected-live",
    WATCHING: "watching",
    PAUSED: "paused",
    RECONNECTING: "reconnecting",
    RECORDING: "recording",
    ERROR: "error"
  };
  var UiStateMachine = class {
    constructor({ onChange } = {}) {
      this.state = UiState.IDLE;
      this.onChange = onChange || (() => {
      });
      this._flags = {
        hasSelection: false,
        isPaused: false,
        isSharing: false,
        isRecording: false,
        isUploading: false,
        isRecordingBusy: false,
        wsConnected: false,
        wsWasConnected: false,
        hasPreview: false
      };
    }
    set(partial) {
      Object.assign(this._flags, partial);
      const next = this._derive();
      if (next !== this.state) {
        this.state = next;
      }
      this.onChange(this.state, { ...this._flags });
      return this.state;
    }
    _derive() {
      const f = this._flags;
      if (f.isRecording) return UiState.RECORDING;
      if (!f.wsConnected && f.wsWasConnected) return UiState.RECONNECTING;
      if (!f.wsConnected) return UiState.CONNECTING;
      if (f.isPaused && f.hasSelection) return UiState.PAUSED;
      if (f.isSharing && f.hasSelection) return UiState.SELECTED_LIVE;
      if (f.isSharing) return UiState.SHARING;
      if (f.hasPreview) return UiState.WATCHING;
      if (f.wsConnected) return UiState.CONNECTED;
      return UiState.IDLE;
    }
    /** Controles host */
    canSelect() {
      return this._flags.wsConnected && !this._flags.isRecording;
    }
    canPause() {
      return this._flags.wsConnected && this._flags.hasSelection && !this._flags.isPaused;
    }
    canResume() {
      return this._flags.wsConnected && this._flags.hasSelection && this._flags.isPaused;
    }
    canRecord() {
      return this._flags.wsConnected && this._flags.hasPreview && !this._flags.isRecording && !this._flags.isUploading;
    }
    canStopRecord() {
      return this._flags.isRecording;
    }
  };

  // src/shared/toast.js
  function createToastContainer(id = "toast-root") {
    let root = document.getElementById(id);
    if (!root) {
      root = document.createElement("div");
      root.id = id;
      root.className = "toast-root";
      root.setAttribute("aria-live", "polite");
      document.body.appendChild(root);
    }
    return root;
  }
  function showToast(message, type = "info", durationMs = 5e3) {
    if (type !== "error") return;
    const root = createToastContainer();
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add("toast-visible"));
    setTimeout(() => {
      el.classList.remove("toast-visible");
      setTimeout(() => el.remove(), 300);
    }, durationMs);
  }

  // src/shared/build-verify.js
  async function verifyServerBuild({ onToast, onTitlePrefix } = {}) {
    try {
      const info = await fetch("/api/info", { cache: "no-store" }).then((r) => r.json());
      const env = info.dev ? "DEV" : "PROD";
      const proto = info.roomStateProtocol ? "roomState" : "legacy";
      const label = `${env} ${info.buildId} ${proto}`;
      onTitlePrefix == null ? void 0 : onTitlePrefix(`[${label}] `);
      if (info.dev) {
        onToast == null ? void 0 : onToast(`Servidor DEV ativo (${info.buildId}, ${proto})`, "info");
      } else if (!info.roomStateProtocol) {
        onToast == null ? void 0 : onToast(
          "Servidor PROD/legado \u2014 para testar mudancas use start-dev.bat neste PC (nao cgrafsysvm)",
          "warn"
        );
      }
      return info;
    } catch (e) {
      onToast == null ? void 0 : onToast("Nao foi possivel verificar /api/info do servidor", "warn");
      return null;
    }
  }

  // src/shared/debug-session-client.js
  function debugClientSessionLog(hypothesisId, location2, message, data = {}) {
    fetch("/api/client-debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hypothesisId, location: location2, message, data })
    }).catch(() => {
    });
  }

  // src/shared/stats-collector.js
  var prevSamples = /* @__PURE__ */ new WeakMap();
  async function collectWebRtcStats(mediaClient) {
    var _a47;
    const out = {
      bitrateKbps: null,
      packetLoss: null,
      rttMs: null,
      fps: null,
      timestamp: Date.now()
    };
    const targets = ((_a47 = mediaClient == null ? void 0 : mediaClient.getStatsTargets) == null ? void 0 : _a47.call(mediaClient)) || [];
    if (!targets.length) return out;
    let packetsLost = 0;
    let packetsReceived = 0;
    let rttSum = 0;
    let rttCount = 0;
    let bytesReceived = 0;
    for (const { consumer, producer, kind } of targets) {
      const target = consumer || producer;
      if (!(target == null ? void 0 : target.getStats)) continue;
      try {
        const statsReport = await target.getStats();
        statsReport.forEach((report) => {
          if (report.type === "inbound-rtp" && report.kind === kind) {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
            bytesReceived += report.bytesReceived || 0;
            if (report.framesPerSecond) out.fps = report.framesPerSecond;
          }
          if (report.type === "candidate-pair" && report.state === "succeeded") {
            if (report.currentRoundTripTime != null) {
              rttSum += report.currentRoundTripTime * 1e3;
              rttCount += 1;
            }
          }
        });
      } catch (_) {
      }
    }
    if (packetsReceived + packetsLost > 0) {
      out.packetLoss = Math.round(packetsLost / (packetsReceived + packetsLost) * 1e3) / 10;
    }
    if (rttCount) out.rttMs = Math.round(rttSum / rttCount);
    const prev = prevSamples.get(mediaClient);
    if (prev && bytesReceived > prev.bytes && out.timestamp > prev.ts) {
      const dtSec = (out.timestamp - prev.ts) / 1e3;
      if (dtSec > 0) {
        out.bitrateKbps = Math.round((bytesReceived - prev.bytes) * 8 / dtSec / 1e3);
      }
    }
    prevSamples.set(mediaClient, { bytes: bytesReceived, ts: out.timestamp });
    return out;
  }

  // src/shared/host-audio-monitor.js
  function sourcePriority(source) {
    if (source === "microphone") return 0;
    if (source === "system") return 1;
    return 2;
  }
  function pickAntiEchoSources(list, { allowDualPeerAudio = false } = {}) {
    if (allowDualPeerAudio) return list || [];
    const byPeer = /* @__PURE__ */ new Map();
    for (const entry of list || []) {
      const pid = String(entry.peerId);
      const existing = byPeer.get(pid);
      if (!existing || sourcePriority(entry.source) < sourcePriority(existing.source)) {
        byPeer.set(pid, entry);
      }
    }
    return [...byPeer.values()];
  }
  function loadPresetFromLocalStorage(name) {
    try {
      const raw = localStorage.getItem("sharescreen_audio_presets");
      if (!raw) return null;
      const presets = JSON.parse(raw);
      return presets[name] || null;
    } catch {
      return null;
    }
  }
  function savePresetToLocalStorage(name, prefs) {
    try {
      const raw = localStorage.getItem("sharescreen_audio_presets") || "{}";
      const presets = JSON.parse(raw);
      presets[name] = prefs;
      localStorage.setItem("sharescreen_audio_presets", JSON.stringify(presets));
    } catch {
    }
  }
  function renamePresetInLocalStorage(oldName, newName) {
    const oldTrimmed = String(oldName || "").trim();
    const newTrimmed = String(newName || "").trim();
    if (!oldTrimmed || !newTrimmed) return;
    if (oldTrimmed.toLowerCase() === newTrimmed.toLowerCase()) return;
    const prefs = loadPresetFromLocalStorage(oldTrimmed);
    if (!prefs) return;
    try {
      const raw = localStorage.getItem("sharescreen_audio_presets") || "{}";
      const presets = JSON.parse(raw);
      for (const key of Object.keys(presets)) {
        if (key.toLowerCase() === oldTrimmed.toLowerCase()) {
          delete presets[key];
        }
      }
      presets[newTrimmed] = prefs;
      localStorage.setItem("sharescreen_audio_presets", JSON.stringify(presets));
    } catch {
    }
  }
  function waitForPlayingTrack(track, timeoutMs = 8e3) {
    if (!track) return Promise.resolve(null);
    const ready = () => track.readyState === "live";
    if (ready()) return Promise.resolve(track);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        if (track.readyState === "live") resolve(track);
        else reject(new Error("track n\xE3o ficou live"));
      }, timeoutMs);
      const tryResolve = () => {
        if (ready()) {
          cleanup();
          resolve(track);
        }
      };
      const cleanup = () => {
        clearTimeout(timer);
        track.removeEventListener("unmute", tryResolve);
        track.removeEventListener("ended", onEnded);
      };
      const onEnded = () => {
        cleanup();
        reject(new Error("track encerrada"));
      };
      track.addEventListener("unmute", tryResolve);
      track.addEventListener("ended", onEnded);
      tryResolve();
    });
  }
  var HostAudioMonitor = class {
    constructor(media2, options = {}) {
      this.media = media2;
      this.opts = options;
      this.excludePeerId = options.excludePeerId ? String(options.excludePeerId) : null;
      this.channels = /* @__PURE__ */ new Map();
      this.outputEl = null;
      this.masterVolume = 1;
      this.onLevels = null;
      this._outputStream = null;
      this._levelsRaf = null;
      this._mutedPeerIds = /* @__PURE__ */ new Set();
      this._autoplayBlocked = false;
      this.ctx = null;
      this.dest = null;
      this.filterPrefs = /* @__PURE__ */ new Map();
      this.stream = new MediaStream();
      this.peerNames = /* @__PURE__ */ new Map();
      this.pinnedPeerIds = new Set(
        [...options.pinnedPeerIds || []].map((id) => String(id))
      );
      this.allChannelsRoutedToDest = false;
      this.allowDualPeerAudio = options.allowDualPeerAudio === true;
    }
    setPinnedPeerIds(peerIds = []) {
      this.pinnedPeerIds = new Set([...peerIds || []].map((id) => String(id)));
    }
    countLiveChannelsForPeer(peerId) {
      var _a47, _b;
      if (!peerId) return 0;
      const key = String(peerId);
      let count = 0;
      for (const ch of this.channels.values()) {
        if (String(ch.peerId) !== key) continue;
        const track = (_a47 = ch.consumer) == null ? void 0 : _a47.track;
        if ((track == null ? void 0 : track.readyState) === "live" && !((_b = ch.consumer) == null ? void 0 : _b.closed)) count += 1;
      }
      return count;
    }
    _log(event, data = {}) {
      var _a47, _b;
      audioTrace(event, data);
      (_b = (_a47 = this.opts).onLog) == null ? void 0 : _b.call(_a47, event, data);
    }
    setManualMuted(mutedPeerIds) {
      var _a47;
      this._mutedPeerIds = new Set(
        [...mutedPeerIds || []].map((id) => String(id))
      );
      for (const ch of this.channels.values()) {
        const track = (_a47 = ch.consumer) == null ? void 0 : _a47.track;
        if (track) {
          const silenced = this._isChannelMuted(ch.peerId);
          track.enabled = !silenced;
        }
        this._applyChannelFilters(ch);
      }
      this._refreshDirectOutput();
    }
    _isChannelMuted(peerId) {
      const key = String(peerId);
      return this._mutedPeerIds.has(key);
    }
    setMasterVolume(volume) {
      this.masterVolume = Math.max(0, Math.min(1, volume));
      if (this.outputEl) this.outputEl.volume = this.masterVolume;
    }
    get channelCount() {
      return this.channels.size;
    }
    countLiveChannels() {
      var _a47, _b;
      let count = 0;
      for (const ch of this.channels.values()) {
        const track = (_a47 = ch.consumer) == null ? void 0 : _a47.track;
        if ((track == null ? void 0 : track.readyState) === "live" && !((_b = ch.consumer) == null ? void 0 : _b.closed)) count += 1;
      }
      return count;
    }
    async recoverOutputIfSilent() {
      var _a47, _b, _c, _d;
      if (!this.channels.size) return;
      this._rebuildAudioRoutes();
      const mixedTrack = (_c = (_b = (_a47 = this.dest) == null ? void 0 : _a47.stream) == null ? void 0 : _b.getAudioTracks) == null ? void 0 : _c.call(_b)[0];
      const hasLiveOutput = (mixedTrack == null ? void 0 : mixedTrack.readyState) === "live" || this.stream.getAudioTracks().some((t) => t.readyState === "live");
      if (!hasLiveOutput) {
        this._ensureAudioContext();
        if (((_d = this.ctx) == null ? void 0 : _d.state) === "suspended") {
          await this.ctx.resume().catch(() => {
          });
        }
        this._rebuildAudioRoutes();
      }
      this._refreshDirectOutput();
      await this._tryPlayOutput();
    }
    connectOutput(audioEl) {
      this.outputEl = audioEl;
      if (audioEl && audioEl.srcObject !== this.stream) {
        audioEl.srcObject = this.stream;
      }
      this._refreshDirectOutput();
    }
    async resume() {
      await this._refreshDirectOutput();
      await this._tryPlayOutput();
    }
    async _tryPlayOutput() {
      var _a47, _b;
      const el = this.outputEl;
      if (!el || !this.channels.size) return;
      try {
        await el.play();
        if (this._autoplayBlocked) {
          this._autoplayBlocked = false;
        }
      } catch (err) {
        if ((err == null ? void 0 : err.name) === "NotAllowedError" || /autoplay/i.test(String((err == null ? void 0 : err.message) || ""))) {
          this._autoplayBlocked = true;
          this._log("autoplay bloqueado", { channels: this.channels.size });
          (_b = (_a47 = this.opts).onAutoplayBlocked) == null ? void 0 : _b.call(_a47, err);
        }
      }
    }
    getOutputTrack() {
      var _a47;
      for (const ch of this.channels.values()) {
        const track = (_a47 = ch.consumer) == null ? void 0 : _a47.track;
        if ((track == null ? void 0 : track.readyState) === "live") return track;
      }
      return null;
    }
    getMixedOutputTrack() {
      var _a47, _b, _c;
      this._ensureAudioContext();
      this._rebuildAudioRoutes();
      const dspTrack = (_c = (_b = (_a47 = this.dest) == null ? void 0 : _a47.stream) == null ? void 0 : _b.getAudioTracks) == null ? void 0 : _c.call(_b)[0];
      if ((dspTrack == null ? void 0 : dspTrack.readyState) === "live") {
        return dspTrack;
      }
      for (const track of this.stream.getAudioTracks()) {
        if (track.readyState === "live") return track;
      }
      return this.getOutputTrack();
    }
    _rebuildAudioRoutes() {
      var _a47, _b, _c, _d;
      const liveChannels = [];
      for (const ch of this.channels.values()) {
        const track = (_a47 = ch.consumer) == null ? void 0 : _a47.track;
        if (!track || track.readyState !== "live") continue;
        liveChannels.push({ ch, track });
      }
      if (!liveChannels.length) {
        this.allChannelsRoutedToDest = false;
        for (const t of [...this.stream.getAudioTracks()]) {
          this.stream.removeTrack(t);
        }
        return { tracksToPlay: [], mixedTrack: null };
      }
      this._ensureAudioContext();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {
        });
      }
      for (const { ch, track } of liveChannels) {
        const wantsDsp = this._hasAnyFilter(ch.peerId);
        if (wantsDsp) {
          if (!ch.highpassNode) {
            this._clearChannelDsp(ch);
            this._setupChannelDsp(ch, track);
          }
        } else {
          if (ch.highpassNode) {
            this._clearChannelDsp(ch);
          }
          if (!ch.sourceNode) {
            this._setupChannelPassthrough(ch, track);
          }
        }
        this._applyChannelFilters(ch);
      }
      this.allChannelsRoutedToDest = !!(this.ctx && this.dest);
      const mixedTrack = ((_d = (_c = (_b = this.dest) == null ? void 0 : _b.stream) == null ? void 0 : _c.getAudioTracks) == null ? void 0 : _d.call(_c)[0]) || null;
      const tracksToPlay = (mixedTrack == null ? void 0 : mixedTrack.readyState) === "live" ? [mixedTrack] : [];
      const currentTracks = this.stream.getAudioTracks();
      for (const t of currentTracks) {
        if (!tracksToPlay.some((p) => p.id === t.id)) {
          this.stream.removeTrack(t);
        }
      }
      for (const t of tracksToPlay) {
        if (!currentTracks.some((p) => p.id === t.id)) {
          this.stream.addTrack(t);
        }
      }
      return { tracksToPlay, mixedTrack };
    }
    _refreshDirectOutput() {
      this._rebuildAudioRoutes();
      const el = this.outputEl;
      if (!el) return;
      if (el.srcObject !== this.stream) {
        el.srcObject = this.stream;
      }
      el.muted = false;
      el.volume = this.masterVolume;
      this._tryPlayOutput();
    }
    _startLevelsLoop() {
      if (this._levelsRaf) return;
      const tick = () => {
        var _a47;
        const levels = /* @__PURE__ */ new Map();
        for (const ch of this.channels.values()) {
          if (ch.analyserNode) {
            const fftSize = ch.analyserNode.fftSize;
            const timeBuf = new Uint8Array(fftSize);
            ch.analyserNode.getByteTimeDomainData(timeBuf);
            let sum = 0;
            for (let i = 0; i < fftSize; i++) {
              const n = (timeBuf[i] - 128) / 128;
              sum += n * n;
            }
            const raw = Math.min(1, Math.sqrt(sum / fftSize) * 5.5);
            const smoothing = 0.68;
            ch.rawLevel = raw;
            ch.smoothedLevel = (ch.smoothedLevel || 0) * smoothing + raw * (1 - smoothing);
          }
          levels.set(ch.peerId, {
            level: ch.smoothedLevel || 0,
            active: (ch.rawLevel || 0) > 0.015 || (ch.smoothedLevel || 0) > 0.02,
            speaking: (ch.rawLevel || 0) > 0.04 || (ch.smoothedLevel || 0) > 0.05
          });
        }
        if (levels.size) (_a47 = this.onLevels) == null ? void 0 : _a47.call(this, levels);
        this._levelsRaf = requestAnimationFrame(tick);
      };
      tick();
    }
    _stopLevelsLoop() {
      if (!this._levelsRaf) return;
      cancelAnimationFrame(this._levelsRaf);
      this._levelsRaf = null;
    }
    _startChannelMeter(ch) {
      var _a47, _b;
      (_a47 = ch.stopMeter) == null ? void 0 : _a47.call(ch);
      const track = (_b = ch.consumer) == null ? void 0 : _b.track;
      if (!track) return;
      ch.stopMeter = startTrackLevelMeter(track, {
        onLevel: (smoothed, raw) => {
          ch.smoothedLevel = smoothed;
          ch.rawLevel = raw;
        }
      });
    }
    _ensureAudioContext() {
      if (this.ctx) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.dest = this.ctx.createMediaStreamDestination();
      } catch (e) {
        console.error("[HostAudioMonitor] Falha ao criar AudioContext:", e);
      }
    }
    _hasAnyFilter(channelKeyOrPeerId) {
      return hasActiveMicrophoneFilter(this.getFilterPrefs(channelKeyOrPeerId));
    }
    _clearChannelDsp(ch) {
      if (ch.gateInterval) {
        clearInterval(ch.gateInterval);
        ch.gateInterval = null;
      }
      if (ch.sourceNode) {
        try {
          ch.sourceNode.disconnect();
        } catch (_) {
        }
        ch.sourceNode = null;
      }
      if (ch.highpassNode) {
        try {
          ch.highpassNode.disconnect();
        } catch (_) {
        }
        ch.highpassNode = null;
      }
      if (ch.bassNode) {
        try {
          ch.bassNode.disconnect();
        } catch (_) {
        }
        ch.bassNode = null;
      }
      if (ch.trebleNode) {
        try {
          ch.trebleNode.disconnect();
        } catch (_) {
        }
        ch.trebleNode = null;
      }
      if (ch.peakingNode) {
        try {
          ch.peakingNode.disconnect();
        } catch (_) {
        }
        ch.peakingNode = null;
      }
      if (ch.compressorNode) {
        try {
          ch.compressorNode.disconnect();
        } catch (_) {
        }
        ch.compressorNode = null;
      }
      if (ch.gainNode) {
        try {
          ch.gainNode.disconnect();
        } catch (_) {
        }
        ch.gainNode = null;
      }
      if (ch.analyserNode) {
        try {
          ch.analyserNode.disconnect();
        } catch (_) {
        }
        ch.analyserNode = null;
      }
      if (ch.dummyEl) {
        try {
          ch.dummyEl.srcObject = null;
          ch.dummyEl.remove();
        } catch (_) {
        }
        ch.dummyEl = null;
      }
      ch.stream = null;
    }
    getFilterPrefs(channelKeyOrPeerId) {
      const key = String(channelKeyOrPeerId);
      const peerId = key.includes(":") ? key.split(":")[0] : key;
      const source = key.includes(":") ? key.split(":").slice(1).join(":") : "microphone";
      if (!this.filterPrefs.has(key)) {
        const name = this.peerNames.get(peerId) || "";
        let saved = null;
        if (name && source === "microphone") {
          saved = loadPresetFromLocalStorage(name);
        }
        const defaults = source === "system" ? { ...MIC_FILTER_DEFAULTS, noiseGate: false, micSensitivity: false } : { ...MIC_FILTER_DEFAULTS };
        this.filterPrefs.set(key, saved || defaults);
      }
      return this.filterPrefs.get(key);
    }
    setFilterPrefs(channelKeyOrPeerId, prefs) {
      const key = String(channelKeyOrPeerId);
      this.filterPrefs.set(key, { ...this.getFilterPrefs(key), ...prefs });
      for (const ch of this.channels.values()) {
        const chKey = audioChannelKey(ch.peerId, ch.source);
        if (chKey === key || ch.peerId === key) {
          this._applyChannelFilters(ch);
        }
      }
      this._refreshDirectOutput();
    }
    _setupChannelDsp(ch, track) {
      if (ch.sourceNode) return;
      this._ensureAudioContext();
      if (!this.ctx || !this.dest) return;
      try {
        const stream = new MediaStream([track]);
        ch.stream = stream;
        ch.sourceNode = this.ctx.createMediaStreamSource(stream);
        const dummyEl = document.createElement("audio");
        dummyEl.muted = true;
        dummyEl.srcObject = stream;
        dummyEl.play().catch(() => {
        });
        ch.dummyEl = dummyEl;
        ch.highpassNode = this.ctx.createBiquadFilter();
        ch.highpassNode.type = "highpass";
        ch.highpassNode.frequency.value = 80;
        ch.bassNode = this.ctx.createBiquadFilter();
        ch.bassNode.type = "lowshelf";
        ch.bassNode.frequency.value = 150;
        ch.bassNode.gain.value = 0;
        ch.trebleNode = this.ctx.createBiquadFilter();
        ch.trebleNode.type = "highshelf";
        ch.trebleNode.frequency.value = 4e3;
        ch.trebleNode.gain.value = 0;
        ch.peakingNode = this.ctx.createBiquadFilter();
        ch.peakingNode.type = "peaking";
        ch.peakingNode.frequency.value = 3e3;
        ch.peakingNode.Q.value = 1.2;
        ch.peakingNode.gain.value = 3;
        ch.compressorNode = this.ctx.createDynamicsCompressor();
        ch.compressorNode.threshold.value = -24;
        ch.compressorNode.knee.value = 30;
        ch.compressorNode.ratio.value = 4;
        ch.compressorNode.attack.value = 3e-3;
        ch.compressorNode.release.value = 0.25;
        ch.gainNode = this.ctx.createGain();
        ch.gainNode.gain.value = 1;
        ch.analyserNode = this.ctx.createAnalyser();
        ch.analyserNode.fftSize = 256;
        ch.sourceNode.connect(ch.highpassNode);
        ch.highpassNode.connect(ch.bassNode);
        ch.bassNode.connect(ch.trebleNode);
        ch.trebleNode.connect(ch.peakingNode);
        ch.peakingNode.connect(ch.compressorNode);
        ch.compressorNode.connect(ch.gainNode);
        ch.gainNode.connect(ch.analyserNode);
        ch.gainNode.connect(this.dest);
        this._applyChannelFilters(ch);
        this._startNoiseGateLoop(ch);
      } catch (err) {
        console.warn("[HostAudioMonitor] Erro ao configurar DSP do canal:", err);
      }
    }
    _setupChannelPassthrough(ch, track) {
      if (ch.sourceNode) return;
      this._ensureAudioContext();
      if (!this.ctx || !this.dest) return;
      try {
        const stream = new MediaStream([track]);
        ch.stream = stream;
        ch.sourceNode = this.ctx.createMediaStreamSource(stream);
        const dummyEl = document.createElement("audio");
        dummyEl.muted = true;
        dummyEl.srcObject = stream;
        dummyEl.play().catch(() => {
        });
        ch.dummyEl = dummyEl;
        ch.gainNode = this.ctx.createGain();
        ch.gainNode.gain.value = this._isChannelMuted(ch.peerId) ? 0 : 1;
        ch.sourceNode.connect(ch.gainNode);
        ch.gainNode.connect(this.dest);
      } catch (err) {
        console.warn("[HostAudioMonitor] Erro ao configurar passthrough do canal:", err);
      }
    }
    _applyChannelFilters(ch) {
      if (!this.ctx) return;
      const channelKey = audioChannelKey(ch.peerId, ch.source);
      const prefs = this.getFilterPrefs(channelKey);
      const useDsp = ch.source !== "system";
      if (ch.gainNode) {
        if (this._isChannelMuted(ch.peerId)) {
          ch.gainNode.gain.value = 0;
        } else if (useDsp && this._hasAnyFilter(channelKey)) {
          ch.gainNode.gain.value = prefs.gain !== void 0 ? prefs.gain : 1;
        } else {
          ch.gainNode.gain.value = 1;
        }
      }
      if (ch.bassNode) {
        ch.bassNode.gain.value = prefs.bass !== void 0 ? prefs.bass : 0;
      }
      if (ch.trebleNode) {
        ch.trebleNode.gain.value = prefs.treble !== void 0 ? prefs.treble : 0;
      }
      if (ch.highpassNode) {
        if (prefs.highpass) {
          ch.highpassNode.frequency.value = prefs.highpassFreq || 80;
        } else {
          ch.highpassNode.frequency.value = 10;
        }
      }
      if (ch.peakingNode) {
        if (prefs.peaking) {
          ch.peakingNode.frequency.value = prefs.peakingFreq || 3e3;
          ch.peakingNode.gain.value = prefs.peakingGain !== void 0 ? prefs.peakingGain : 3;
        } else {
          ch.peakingNode.gain.value = 0;
        }
      }
      if (ch.compressorNode) {
        if (prefs.compressor) {
          ch.compressorNode.threshold.value = -24;
          ch.compressorNode.ratio.value = 4;
        } else {
          ch.compressorNode.threshold.value = 0;
          ch.compressorNode.ratio.value = 1;
        }
      }
    }
    _startNoiseGateLoop(ch) {
      if (ch.gateInterval) clearInterval(ch.gateInterval);
      let isOpen = true;
      let lastOpenAt = performance.now();
      ch.gateInterval = setInterval(() => {
        if (!ch.gainNode || !this.ctx) return;
        const isMuted = this._isChannelMuted(ch.peerId);
        if (isMuted) {
          ch.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
          isOpen = false;
          return;
        }
        const channelKey = audioChannelKey(ch.peerId, ch.source);
        const prefs = this.getFilterPrefs(channelKey);
        const targetGain = prefs.gain !== void 0 ? prefs.gain : 1;
        const gateActive = ch.source !== "system" && (prefs.noiseGate || prefs.micSensitivity);
        if (!gateActive) {
          if (!isOpen) isOpen = true;
          ch.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
          return;
        }
        const openDb = combinedGateOpenThresholdDb(prefs);
        const closeDb = openDb - 8;
        const currentLevel = Math.max(ch.rawLevel || 0, 1e-6);
        const currentDb = 20 * Math.log10(currentLevel);
        const now = performance.now();
        if (currentDb >= openDb) {
          isOpen = true;
          lastOpenAt = now;
          ch.gainNode.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.02);
        } else if (isOpen && currentDb < closeDb && now - lastOpenAt > 180) {
          isOpen = false;
          ch.gainNode.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        }
      }, 35);
    }
    async syncFromSources(sources) {
      var _a47, _b;
      if (!this.media) return;
      for (const s of sources || []) {
        if (s.peerId && s.name) {
          this.peerNames.set(String(s.peerId), s.name);
        }
      }
      const list = pickAntiEchoSources(
        normalizeRemoteAudioSources(sources, {
          excludePeerId: this.excludePeerId
        }),
        { allowDualPeerAudio: this.allowDualPeerAudio }
      );
      const wanted = /* @__PURE__ */ new Map();
      for (const entry of list) {
        const channelKey = audioChannelKey(entry.peerId, entry.source);
        wanted.set(channelKey, entry);
      }
      const wantedProducerIds = new Set([...wanted.values()].map((e) => e.producerId));
      for (const [channelKey, entry] of wanted) {
        const ch = this.channels.get(channelKey);
        if (ch && ch.producerId === entry.producerId && ch.consumer && !ch.consumer.closed) {
          continue;
        }
        await this._addChannel(channelKey, entry.peerId, entry.producerId, entry.source);
      }
      const toRemove = [];
      for (const channelKey of [...this.channels.keys()]) {
        if (wanted.has(channelKey)) continue;
        const ch = this.channels.get(channelKey);
        if ((ch == null ? void 0 : ch.producerId) && wantedProducerIds.has(ch.producerId) && ch.consumer && !ch.consumer.closed && ((_a47 = ch.consumer.track) == null ? void 0 : _a47.readyState) === "live") {
          continue;
        }
        const isPinned = (ch == null ? void 0 : ch.peerId) && this.pinnedPeerIds.has(String(ch.peerId));
        if (isPinned && (ch == null ? void 0 : ch.consumer) && !ch.consumer.closed && ((_b = ch.consumer.track) == null ? void 0 : _b.readyState) === "live") {
          continue;
        }
        toRemove.push(channelKey);
      }
      for (const channelKey of toRemove) {
        await this._removeChannel(channelKey);
      }
      if (this.channels.size) this._startLevelsLoop();
      else this._stopLevelsLoop();
      this._refreshDirectOutput();
      await this.recoverOutputIfSilent();
      await this._tryPlayOutput();
    }
    async syncPeerSources(peerId, sources) {
      if (!this.media || !peerId) return;
      const list = normalizeRemoteAudioSources(sources, {
        excludePeerId: this.excludePeerId
      }).filter((entry) => String(entry.peerId) === String(peerId));
      for (const entry of list) {
        const channelKey = audioChannelKey(entry.peerId, entry.source);
        const ch = this.channels.get(channelKey);
        if (ch && ch.producerId === entry.producerId && ch.consumer && !ch.consumer.closed) {
          continue;
        }
        await this._addChannel(channelKey, entry.peerId, entry.producerId, entry.source);
      }
      if (this.channels.size) this._startLevelsLoop();
      this._refreshDirectOutput();
      await this.recoverOutputIfSilent();
      await this._tryPlayOutput();
    }
    async syncClients(clients, { excludePeerId = null } = {}) {
      const sources = [];
      for (const c of clients || []) {
        if (excludePeerId && String(c.id) === String(excludePeerId)) continue;
        const ids = c.producerIds || {};
        if (ids.microphone) {
          sources.push({ peerId: c.id, producerId: ids.microphone, source: "microphone" });
        }
        if (ids.system) {
          sources.push({ peerId: c.id, producerId: ids.system, source: "system" });
        }
        if (ids.mixed) {
          sources.push({ peerId: c.id, producerId: ids.mixed, source: "mixed" });
        } else if (ids.audio && !ids.microphone && !ids.system) {
          sources.push({ peerId: c.id, producerId: ids.audio, source: "microphone" });
        }
      }
      return this.syncFromSources(
        pickAntiEchoSources(sources, { allowDualPeerAudio: this.allowDualPeerAudio })
      );
    }
    async _addChannel(channelKey, peerId, producerId, source = "microphone", attempt = 0) {
      var _a47, _b, _c, _d;
      const existing = this.channels.get(channelKey);
      if (existing && existing.producerId === producerId && existing.consumer && !existing.consumer.closed) {
        return;
      }
      if (existing) await this._removeChannel(channelKey);
      try {
        const consumer = await this.media.consumeAuxiliaryAudio(peerId, producerId, source);
        let track = consumer.track;
        if (!track) return;
        this._log("consumer criado", {
          peerId: String(peerId).slice(0, 8),
          producerId: String(producerId).slice(0, 8),
          source
        });
        track.enabled = true;
        await ((_b = (_a47 = this.media)._resumeRemoteConsumer) == null ? void 0 : _b.call(_a47, consumer));
        if (consumer.paused) await consumer.resume();
        const onProducerClosed = () => {
          this._log("producer fechado", {
            peerId: String(peerId).slice(0, 8),
            producerId: String(producerId).slice(0, 8),
            source
          });
          this._removeChannel(channelKey).catch(() => {
          });
        };
        consumer.on("producerclose", onProducerClosed);
        consumer.on("transportclose", onProducerClosed);
        try {
          track = await waitForPlayingTrack(track);
        } catch (err) {
          console.warn("[HostAudioMonitor] aguardando track", channelKey, (err == null ? void 0 : err.message) || err);
        }
        const ch = {
          peerId: String(peerId),
          channelKey,
          source,
          producerId,
          consumer,
          smoothedLevel: 0,
          rawLevel: 0,
          stopMeter: null,
          sourceNode: null,
          highpassNode: null,
          peakingNode: null,
          compressorNode: null,
          gainNode: null,
          gateInterval: null,
          _onProducerClosed: onProducerClosed
        };
        this.channels.set(channelKey, ch);
        const wireMeter = () => this._startChannelMeter(ch);
        wireMeter();
        track.addEventListener("unmute", wireMeter, { once: false });
        track.addEventListener("ended", () => {
          var _a48;
          (_a48 = ch.stopMeter) == null ? void 0 : _a48.call(ch);
          this._removeChannel(channelKey).catch(() => {
          });
        }, { once: true });
        this._refreshDirectOutput();
      } catch (err) {
        const maxAttempts = 5;
        if (attempt < maxAttempts - 1) {
          const delayMs = 400 * 2 ** attempt;
          await new Promise((r) => setTimeout(r, delayMs));
          return this._addChannel(channelKey, peerId, producerId, source, attempt + 1);
        }
        console.warn("[HostAudioMonitor] falha ao consumir \xE1udio", channelKey, (err == null ? void 0 : err.message) || err);
        (_d = (_c = this.opts).onConsumeError) == null ? void 0 : _d.call(_c, channelKey, err);
      }
    }
    async removeByConsumerId(consumerId) {
      var _a47;
      if (!consumerId) return;
      for (const [channelKey, ch] of this.channels.entries()) {
        if (((_a47 = ch.consumer) == null ? void 0 : _a47.id) === consumerId) {
          await this._removeChannel(channelKey);
          return;
        }
      }
    }
    isAutoplayBlocked() {
      return !!this._autoplayBlocked;
    }
    async _removeChannel(channelKey) {
      var _a47, _b, _c, _d;
      const ch = this.channels.get(channelKey);
      if (!ch) return;
      (_a47 = ch.stopMeter) == null ? void 0 : _a47.call(ch);
      this._clearChannelDsp(ch);
      if (ch.consumer && ch._onProducerClosed) {
        try {
          ch.consumer.off("producerclose", ch._onProducerClosed);
          ch.consumer.off("transportclose", ch._onProducerClosed);
        } catch (_) {
        }
      }
      if (ch.consumer && !ch.consumer.closed) {
        this._log("consumer fechado", {
          peerId: (_b = ch.peerId) == null ? void 0 : _b.slice(0, 8),
          producerId: (_c = ch.producerId) == null ? void 0 : _c.slice(0, 8),
          source: ch.source
        });
      }
      await ((_d = this.media) == null ? void 0 : _d.closeAuxiliaryAudio(ch.peerId, ch.source));
      this.channels.delete(channelKey);
      for (const t of [...this.stream.getAudioTracks()]) {
        if (t.readyState !== "live") this.stream.removeTrack(t);
      }
      this._refreshDirectOutput();
    }
    async dispose() {
      this._stopLevelsLoop();
      for (const channelKey of [...this.channels.keys()]) {
        await this._removeChannel(channelKey);
      }
      if (this.outputEl) this.outputEl.srcObject = null;
      this.outputEl = null;
      this._outputStream = null;
      if (this.ctx) {
        await this.ctx.close().catch(() => {
        });
        this.ctx = null;
      }
      this.dest = null;
      for (const t of this.stream.getTracks()) {
        this.stream.removeTrack(t);
      }
    }
  };

  // src/shared/source-cards.js
  function hasVideoAvailable(c) {
    var _a47, _b;
    return !!((c == null ? void 0 : c.selectable) || ((_a47 = c == null ? void 0 : c.mediaReady) == null ? void 0 : _a47.video) || (c == null ? void 0 : c.isProducing) || (c == null ? void 0 : c.hasVideo) || ((_b = c == null ? void 0 : c.producerIds) == null ? void 0 : _b.video) || (c == null ? void 0 : c.producerId) || (c == null ? void 0 : c.status) === "transmitindo");
  }
  function isConnectedPeer(c) {
    return !!(c == null ? void 0 : c.id) && (c == null ? void 0 : c.status) !== "desconectado";
  }
  function getSourceCardState(c) {
    if (!hasVideoAvailable(c)) {
      if (isConnectedPeer(c)) {
        return {
          kind: "viewer",
          description: "Espectador - Participando sem compartilhar tela",
          statusText: "Assistindo",
          blocked: true
        };
      }
      return {
        kind: "spectator",
        description: "Espectador - Participando com tela nao compartilhada",
        statusText: "Tela nao disponivel",
        blocked: true
      };
    }
    if (c.selecionado) {
      return {
        kind: "sharing",
        description: "Transmitindo",
        statusText: "Transmitindo",
        blocked: true
      };
    }
    return {
      kind: "available",
      description: "Disponivel - Participando com tela compartilhada",
      statusText: "Tela disponivel",
      blocked: false
    };
  }
  function formatSourceDisplayName(c) {
    return c.displayName || c.id || "";
  }
  function appendRoleBadge(nameWrap, c) {
    if (c.isCoHost) {
      const badge = document.createElement("span");
      badge.className = "source-role-badge source-role-badge--cohost";
      badge.textContent = "co-host";
      nameWrap.append(badge);
      return;
    }
    if (c.ehHost) {
      const badge = document.createElement("span");
      badge.className = "source-role-badge source-role-badge--host";
      badge.textContent = "host";
      nameWrap.append(badge);
    }
  }
  function createSourceStatusBar(cardState, onActivate) {
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = `source-status-bar source-status-bar--${cardState.kind}`;
    bar.textContent = cardState.statusText;
    bar.disabled = cardState.blocked;
    if (!cardState.blocked) {
      bar.addEventListener("click", (e) => {
        e.stopPropagation();
        onActivate();
      });
    }
    return bar;
  }
  function buildDisplaySourceCard(c, onSelect, options = {}) {
    var _a47, _b;
    const cardState = getSourceCardState(c);
    const li = document.createElement("li");
    li.className = "card card-selectable source-card";
    if (cardState.kind === "sharing") {
      if (!options.noSharingHighlight) {
        li.classList.add("sharing");
      }
    }
    if (cardState.kind === "spectator" || cardState.kind === "viewer") {
      li.classList.add("disabled", "spectator");
    }
    if (cardState.kind === "available") li.classList.add("available");
    const body = document.createElement("div");
    body.className = "source-card-body";
    (_a47 = options.decorateBody) == null ? void 0 : _a47.call(options, body, c);
    const nameWrap = document.createElement("div");
    nameWrap.className = "source-name-wrap";
    const name = document.createElement("div");
    name.className = "source-name";
    name.textContent = formatSourceDisplayName(c);
    nameWrap.append(name);
    appendRoleBadge(nameWrap, c);
    body.append(nameWrap);
    const row = document.createElement("div");
    row.className = "source-card-row";
    row.append(body);
    (_b = options.decorateRow) == null ? void 0 : _b.call(options, row, c);
    const activate = () => onSelect(c.id);
    const statusBar = createSourceStatusBar(cardState, activate);
    li.append(row, statusBar);
    if (!cardState.blocked) {
      li.addEventListener("click", activate);
    }
    return li;
  }

  // src/shared/display-sources.js
  function sortDisplaySources(clients) {
    return [...clients || []].sort((a, b) => {
      const aHost = a.ehHost || a.role === "host";
      const bHost = b.ehHost || b.role === "host";
      if (aHost && !bHost) return -1;
      if (!aHost && bHost) return 1;
      return (a.displayName || "").localeCompare(b.displayName || "", "pt-BR");
    });
  }

  // src/shared/stream-source-badge.js
  function updateStreamSourceBadge(el, name, visible = true) {
    if (!el) return;
    const show = visible && String(name || "").trim();
    if (!show) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.textContent = String(name).trim();
    el.hidden = false;
  }

  // src/shared/lt-overlay.js
  var REF_WIDTH = 1920;
  var overlayEl = null;
  var canvasEl = null;
  var videoEl = null;
  var renderer = null;
  var currentConfig = null;
  var lastSessionKey = null;
  function scaleOverlaySize(config, previewArea) {
    const areaWidth = (previewArea == null ? void 0 : previewArea.clientWidth) || window.innerWidth;
    const scale = areaWidth / REF_WIDTH;
    const width = Math.max(40, Math.round((config.width || 640) * scale));
    const height = Math.max(24, Math.round((config.height || 360) * scale));
    return { width, height };
  }
  function applyOverlayLayout(config, previewArea) {
    if (!overlayEl || !config) return;
    const { width, height } = scaleOverlaySize(config, previewArea);
    overlayEl.style.width = `${width}px`;
    overlayEl.style.height = `${height}px`;
    canvasEl.style.width = "100%";
    canvasEl.style.height = "100%";
  }
  function hideLtOverlay() {
    lastSessionKey = null;
    currentConfig = null;
    if (renderer) {
      renderer.stop();
      renderer = null;
    }
    if (overlayEl) overlayEl.hidden = true;
    if (videoEl) {
      videoEl.onended = null;
      videoEl.pause();
      videoEl.removeAttribute("src");
      videoEl.load();
      delete videoEl.dataset.ltSrc;
    }
  }
  function refreshLtOverlayLayout(previewArea) {
    if (!currentConfig || !overlayEl || overlayEl.hidden) return;
    applyOverlayLayout(currentConfig, previewArea);
  }
  var resizeBound = false;
  function bindLtOverlayResize(previewArea) {
    if (resizeBound) return;
    resizeBound = true;
    window.addEventListener("resize", () => {
      refreshLtOverlayLayout(previewArea || document.getElementById("preview-area"));
    });
  }

  // src/shared/live-annotation.js
  var DEFAULT_COLOR = "#e53935";
  var DEFAULT_WIDTH = 3;
  var FADE_DELAY_MS = 3e3;
  var FADE_DURATION_MS = 400;
  var SEND_THROTTLE_MS = 32;
  function getVideoContentRect(videoEl2, containerEl) {
    const container = containerEl || (videoEl2 == null ? void 0 : videoEl2.parentElement);
    if (!container) return { x: 0, y: 0, width: 0, height: 0 };
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    if (!cw || !ch) return { x: 0, y: 0, width: cw, height: ch };
    const vw = (videoEl2 == null ? void 0 : videoEl2.videoWidth) || cw;
    const vh = (videoEl2 == null ? void 0 : videoEl2.videoHeight) || ch;
    if (!vw || !vh) return { x: 0, y: 0, width: cw, height: ch };
    const scale = Math.min(cw / vw, ch / vh);
    const width = vw * scale;
    const height = vh * scale;
    const x = (cw - width) / 2;
    const y = (ch - height) / 2;
    return { x, y, width, height };
  }
  function clientToNormalized(clientX, clientY, videoEl2, containerEl) {
    const container = containerEl || (videoEl2 == null ? void 0 : videoEl2.parentElement);
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const content = getVideoContentRect(videoEl2, container);
    const localX = clientX - rect.left - content.x;
    const localY = clientY - rect.top - content.y;
    if (content.width <= 0 || content.height <= 0) return null;
    if (localX < 0 || localY < 0 || localX > content.width || localY > content.height) return null;
    return { x: localX / content.width, y: localY / content.height };
  }
  function normalizedToCanvas(x, y, contentRect) {
    return {
      x: contentRect.x + x * contentRect.width,
      y: contentRect.y + y * contentRect.height
    };
  }
  function createLiveAnnotation({
    previewArea,
    videoEl: videoEl2,
    canvasEl: canvasEl2,
    btnDraw,
    btnRect,
    drawStack,
    getPeerId,
    getPeerName,
    onSegment,
    onModeChange
  }) {
    let toolMode = null;
    let drawing = false;
    let strokeId = null;
    let strokeSeq = 0;
    let lastPoint = null;
    let pendingPoints = [];
    let lastSendAt = 0;
    let resizeObserver = null;
    const strokes = /* @__PURE__ */ new Map();
    const ctx = canvasEl2 == null ? void 0 : canvasEl2.getContext("2d");
    function getContentRect() {
      return getVideoContentRect(videoEl2, previewArea);
    }
    function isToolActive() {
      return toolMode !== null;
    }
    function resizeCanvas() {
      if (!canvasEl2 || !previewArea) return;
      const w = previewArea.clientWidth;
      const h = previewArea.clientHeight;
      if (canvasEl2.width !== w || canvasEl2.height !== h) {
        canvasEl2.width = w;
        canvasEl2.height = h;
        redrawAll();
      }
    }
    function redrawAll() {
      if (!ctx || !canvasEl2) return;
      ctx.clearRect(0, 0, canvasEl2.width, canvasEl2.height);
      const content = getContentRect();
      for (const stroke of strokes.values()) {
        drawShape(stroke, content);
      }
    }
    function drawShape(stroke, content) {
      if (!ctx || stroke.points.length < 1) return;
      ctx.save();
      ctx.globalAlpha = stroke.opacity;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      if (stroke.shape === "rect" && stroke.points.length >= 2) {
        const p1 = normalizedToCanvas(stroke.points[0].x, stroke.points[0].y, content);
        const p2 = normalizedToCanvas(stroke.points[1].x, stroke.points[1].y, content);
        const x = Math.min(p1.x, p2.x);
        const y = Math.min(p1.y, p2.y);
        const w = Math.abs(p2.x - p1.x);
        const h = Math.abs(p2.y - p1.y);
        ctx.strokeRect(x, y, w, h);
      } else if (stroke.points.length >= 2) {
        ctx.beginPath();
        const first = normalizedToCanvas(stroke.points[0].x, stroke.points[0].y, content);
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < stroke.points.length; i++) {
          const p = normalizedToCanvas(stroke.points[i].x, stroke.points[i].y, content);
          ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    function appendPoints(stroke, points) {
      if (!(points == null ? void 0 : points.length)) return;
      if (stroke.shape === "rect") return;
      for (const p of points) {
        const last = stroke.points[stroke.points.length - 1];
        if (last && last.x === p.x && last.y === p.y) continue;
        stroke.points.push({ x: p.x, y: p.y });
      }
    }
    function scheduleFade(strokeIdKey) {
      const stroke = strokes.get(strokeIdKey);
      if (!stroke) return;
      if (stroke.fadeTimer) clearTimeout(stroke.fadeTimer);
      if (stroke.removeTimer) cancelAnimationFrame(stroke.removeTimer);
      stroke.opacity = 1;
      stroke.fadeTimer = window.setTimeout(() => {
        const start = performance.now();
        const tick = (now) => {
          const strokeRef2 = strokes.get(strokeIdKey);
          if (!strokeRef2) return;
          const t = Math.min(1, (now - start) / FADE_DURATION_MS);
          strokeRef2.opacity = 1 - t;
          redrawAll();
          if (t < 1) {
            strokeRef2.removeTimer = requestAnimationFrame(tick);
          } else {
            strokes.delete(strokeIdKey);
            redrawAll();
          }
        };
        const strokeRef = strokes.get(strokeIdKey);
        if (strokeRef) strokeRef.removeTimer = requestAnimationFrame(tick);
      }, FADE_DELAY_MS);
    }
    function receiveSegment(payload) {
      if (!(payload == null ? void 0 : payload.strokeId) || !Array.isArray(payload.points)) return;
      const {
        strokeId: id,
        points,
        color = DEFAULT_COLOR,
        width = DEFAULT_WIDTH,
        final = false,
        shape = "stroke"
      } = payload;
      let stroke = strokes.get(id);
      if (!stroke) {
        stroke = { shape, points: [], color, width, opacity: 1 };
        strokes.set(id, stroke);
      }
      stroke.shape = shape === "rect" ? "rect" : "stroke";
      if (stroke.shape === "rect") {
        stroke.points = points.slice(0, 2).map((p) => ({ x: p.x, y: p.y }));
      } else {
        appendPoints(stroke, points);
      }
      redrawAll();
      if (final) scheduleFade(id);
    }
    function sendSegment({ final = false, points = null } = {}) {
      if (!onSegment || !strokeId) return;
      const stroke = strokes.get(strokeId);
      const batch = points || ((stroke == null ? void 0 : stroke.shape) === "rect" && stroke.points.length >= 2 ? stroke.points.slice(0, 2) : pendingPoints.length ? pendingPoints.splice(0) : lastPoint ? [lastPoint] : []);
      if (!batch.length) return;
      onSegment({
        strokeId,
        peerId: (getPeerId == null ? void 0 : getPeerId()) || "",
        peerName: (getPeerName == null ? void 0 : getPeerName()) || "",
        points: batch.map((p) => ({ x: p.x, y: p.y })),
        color: DEFAULT_COLOR,
        width: DEFAULT_WIDTH,
        shape: (stroke == null ? void 0 : stroke.shape) === "rect" ? "rect" : "stroke",
        final
      });
    }
    function flushSend(force = false) {
      if (!strokeId || pendingPoints.length === 0) return;
      const now = Date.now();
      if (!force && now - lastSendAt < SEND_THROTTLE_MS) return;
      lastSendAt = now;
      const stroke = strokes.get(strokeId);
      const batch = (stroke == null ? void 0 : stroke.shape) === "rect" && stroke.points.length >= 2 ? stroke.points.slice(0, 2) : pendingPoints.splice(0, pendingPoints.length);
      if (!batch.length) return;
      onSegment == null ? void 0 : onSegment({
        strokeId,
        peerId: (getPeerId == null ? void 0 : getPeerId()) || "",
        peerName: (getPeerName == null ? void 0 : getPeerName()) || "",
        points: batch.map((p) => ({ x: p.x, y: p.y })),
        color: DEFAULT_COLOR,
        width: DEFAULT_WIDTH,
        shape: (stroke == null ? void 0 : stroke.shape) === "rect" ? "rect" : "stroke",
        final: false
      });
    }
    function beginShape(clientX, clientY) {
      const norm = clientToNormalized(clientX, clientY, videoEl2, previewArea);
      if (!norm) return;
      drawing = true;
      strokeSeq += 1;
      strokeId = `${(getPeerId == null ? void 0 : getPeerId()) || "local"}-${Date.now()}-${strokeSeq}`;
      lastPoint = norm;
      pendingPoints = [norm];
      const shape = toolMode === "rect" ? "rect" : "stroke";
      const points = shape === "rect" ? [norm, { ...norm }] : [norm];
      const stroke = { shape, points, color: DEFAULT_COLOR, width: DEFAULT_WIDTH, opacity: 1 };
      strokes.set(strokeId, stroke);
      redrawAll();
    }
    function extendShape(clientX, clientY) {
      if (!drawing || !strokeId) return;
      const norm = clientToNormalized(clientX, clientY, videoEl2, previewArea);
      if (!norm) return;
      const stroke = strokes.get(strokeId);
      if (!stroke) return;
      if (stroke.shape === "rect") {
        stroke.points = [{ ...stroke.points[0] }, { ...norm }];
        pendingPoints = stroke.points.map((p) => ({ ...p }));
      } else {
        appendPoints(stroke, [norm]);
        pendingPoints.push(norm);
      }
      lastPoint = norm;
      redrawAll();
      flushSend(false);
    }
    function endShape() {
      if (!drawing || !strokeId) return;
      drawing = false;
      const id = strokeId;
      flushSend(true);
      sendSegment({ final: true });
      pendingPoints = [];
      scheduleFade(id);
      strokeId = null;
      lastPoint = null;
    }
    function syncToolUi() {
      const active = isToolActive();
      if (canvasEl2) {
        canvasEl2.classList.toggle("is-draw-active", active);
        canvasEl2.style.pointerEvents = active ? "auto" : "none";
      }
      if (previewArea) {
        previewArea.classList.toggle("is-draw-mode", active);
      }
      if (btnDraw) {
        btnDraw.classList.toggle("is-active", toolMode === "stroke");
        btnDraw.setAttribute("aria-pressed", String(toolMode === "stroke"));
        btnDraw.title = toolMode === "stroke" ? "Desativar lapis" : "Desenho livre";
      }
      if (btnRect) {
        btnRect.classList.toggle("is-active", toolMode === "rect");
        btnRect.setAttribute("aria-pressed", String(toolMode === "rect"));
        btnRect.title = toolMode === "rect" ? "Desativar retangulo" : "Desenhar retangulo";
      }
      onModeChange == null ? void 0 : onModeChange(active, toolMode);
    }
    function setToolMode(mode) {
      const next = toolMode === mode ? null : mode;
      if (drawing) endShape();
      toolMode = next;
      syncToolUi();
      return toolMode;
    }
    function setActive(next) {
      if (!next) {
        if (drawing) endShape();
        toolMode = null;
        syncToolUi();
        return false;
      }
      if (!toolMode) toolMode = "stroke";
      syncToolUi();
      return true;
    }
    function toggle() {
      return setToolMode(toolMode === "stroke" ? null : "stroke");
    }
    function toggleRect() {
      return setToolMode(toolMode === "rect" ? null : "rect");
    }
    function isActive() {
      return isToolActive();
    }
    function updateButtonVisibility(visible) {
      if (drawStack) {
        drawStack.hidden = !visible;
        return;
      }
      if (btnDraw) btnDraw.hidden = !visible;
      if (btnRect) btnRect.hidden = !visible;
    }
    function onPointerDown(e) {
      var _a47;
      if (!isToolActive() || e.button !== 0) return;
      e.preventDefault();
      (_a47 = canvasEl2 == null ? void 0 : canvasEl2.setPointerCapture) == null ? void 0 : _a47.call(canvasEl2, e.pointerId);
      beginShape(e.clientX, e.clientY);
    }
    function onPointerMove(e) {
      if (!isToolActive() || !drawing) return;
      e.preventDefault();
      extendShape(e.clientX, e.clientY);
    }
    function onPointerUp(e) {
      var _a47;
      if (!drawing) return;
      e.preventDefault();
      try {
        (_a47 = canvasEl2 == null ? void 0 : canvasEl2.releasePointerCapture) == null ? void 0 : _a47.call(canvasEl2, e.pointerId);
      } catch (_) {
      }
      endShape();
    }
    canvasEl2 == null ? void 0 : canvasEl2.addEventListener("pointerdown", onPointerDown);
    canvasEl2 == null ? void 0 : canvasEl2.addEventListener("pointermove", onPointerMove);
    canvasEl2 == null ? void 0 : canvasEl2.addEventListener("pointerup", onPointerUp);
    canvasEl2 == null ? void 0 : canvasEl2.addEventListener("pointercancel", onPointerUp);
    canvasEl2 == null ? void 0 : canvasEl2.addEventListener("pointerleave", (e) => {
      if (drawing && e.buttons === 0) endShape();
    });
    btnDraw == null ? void 0 : btnDraw.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    btnRect == null ? void 0 : btnRect.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleRect();
    });
    if (previewArea && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => resizeCanvas());
      resizeObserver.observe(previewArea);
    }
    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();
    return {
      toggle,
      toggleRect,
      setToolMode,
      setActive,
      isActive,
      receive: receiveSegment,
      updateButtonVisibility,
      resize: resizeCanvas,
      dispose() {
        setActive(false);
        resizeObserver == null ? void 0 : resizeObserver.disconnect();
        window.removeEventListener("resize", resizeCanvas);
        canvasEl2 == null ? void 0 : canvasEl2.removeEventListener("pointerdown", onPointerDown);
        canvasEl2 == null ? void 0 : canvasEl2.removeEventListener("pointermove", onPointerMove);
        canvasEl2 == null ? void 0 : canvasEl2.removeEventListener("pointerup", onPointerUp);
        canvasEl2 == null ? void 0 : canvasEl2.removeEventListener("pointercancel", onPointerUp);
        for (const stroke of strokes.values()) {
          if (stroke.fadeTimer) clearTimeout(stroke.fadeTimer);
          if (stroke.removeTimer) cancelAnimationFrame(stroke.removeTimer);
        }
        strokes.clear();
      }
    };
  }

  // src/host/app.js
  var STORAGE_HOST_NAME = "sharescreen_host_name";
  var STORAGE_RECORDINGS_DIR = "sharescreen_recordings_dir";
  var STORAGE_RECORDING_FILENAME_PATTERN = "sharescreen_recording_filename_pattern";
  var STORAGE_REC_EXCLUDE_OWN_SYSTEM = "sharescreen_rec_exclude_own_system";
  var STORAGE_REC_SELECTED_PEER_ONLY = "sharescreen_rec_selected_peer_only";
  var STORAGE_REC_DEFAULT_AUDIO_CLIENT = "sharescreen_rec_default_audio_client";
  function showToast2(message, type, durationMs) {
    const lower = String(message || "").toLowerCase();
    if (lower.includes("fonte selecionada") || lower.includes("tela compartilhada")) {
      return;
    }
    showToast(message, type, durationMs);
  }
  function readQueryParam(key) {
    var _a47;
    try {
      return ((_a47 = new URLSearchParams(location.search).get(key)) == null ? void 0 : _a47.trim()) || "";
    } catch {
      return "";
    }
  }
  var $ = (id) => document.getElementById(id);
  var els = {
    statusBadge: $("status-badge"),
    secureBadge: $("secure-badge"),
    preview: $("preview-video") || $("video-remoto"),
    previewAudio: $("preview-audio") || $("audio-remoto"),
    previewEmpty: $("preview-empty"),
    previewWaiting: $("preview-waiting"),
    previewPaused: $("preview-paused"),
    previewReconnecting: $("preview-reconnecting"),
    previewError: $("preview-error"),
    previewErrorMsg: $("preview-error-msg"),
    previewInfo: $("preview-info"),
    previewSourceName: $("preview-source-name"),
    streamSourceBadge: $("stream-source-badge"),
    previewQuality: $("preview-quality-label"),
    lista: $("lista-clients"),
    selecionado: $("selecionado-info"),
    logs: $("logs"),
    sidebar: $("sidebar"),
    appMain: document.querySelector(".app-main") || document.querySelector(".client-main"),
    btnPausar: $("btn-pausar"),
    btnRetomar: $("btn-retomar"),
    btnLimpar: $("btn-limpar"),
    btnGravar: $("btn-gravar"),
    btnPararGravar: $("btn-parar-gravar"),
    btnPlayPause: $("btn-playpause"),
    btnRecordingToggle: $("btn-gravacao-toggle"),
    recordingsDirInput: $("recordings-dir-input"),
    recordingFilenamePatternInput: $("recording-filename-pattern-input"),
    btnSaveFilenamePattern: $("btn-save-filename-pattern"),
    recordingFilenamePatternStatus: $("recording-filename-pattern-status"),
    transmissionCardContainer: $("transmission-card-container"),
    transmissionVuColumn: $("transmission-vu-column"),
    transmissionVuFill: $("transmission-vu-fill"),
    recordingStatus: $("recording-status"),
    recordingTimer: $("recording-timer"),
    uploadProgressWrap: $("upload-progress-wrap"),
    uploadProgress: $("upload-progress"),
    recordingFilename: $("recording-filename"),
    recExcludeOwnSystem: $("rec-exclude-own-system"),
    recSelectedPeerOnly: $("rec-selected-peer-only"),
    chkMeetBridgeLive: $("chk-meet-bridge-live"),
    btnRecMeetBridgePreset: $("btn-rec-meet-bridge-preset"),
    recMeetBridgeHint: $("rec-meet-bridge-hint"),
    recDefaultAudioHint: $("rec-default-audio-hint"),
    btnRecClearDefaultAudio: $("btn-rec-clear-default-audio"),
    controlesAudio: $("controles-audio"),
    volumeSlider: $("volume-slider"),
    btnMute: $("btn-mute-audio"),
    hostChkSystem: $("host-chk-system-audio"),
    hostChkMic: $("host-chk-microphone"),
    hostMicWrap: $("host-mic-picker-wrap"),
    hostMicSelect: $("host-mic-select"),
    hostBtnRefreshMics: $("host-btn-refresh-mics"),
    hostMicGainSlider: $("host-mic-gain-slider"),
    hostMicGainVal: $("host-mic-gain-val"),
    btnHostMic: $("btn-host-mic"),
    btnDraw: $("btn-draw-toggle"),
    drawCanvas: $("live-annotation-canvas"),
    btnRect: $("btn-rect-toggle"),
    drawStack: $("preview-draw-stack"),
    statusBar: $("status-bar"),
    qualityPreset: $("quality-preset"),
    qualityHint: $("quality-hint"),
    techDrawer: $("tech-drawer"),
    btnTech: $("btn-tech-panel"),
    btnCloseTech: $("btn-close-tech"),
    btnCopyClient: $("btn-copy-client"),
    btnCopyHost: $("btn-copy-host"),
    btnExternalLink: $("btn-external-link"),
    externalLinkModal: $("external-link-modal"),
    externalGuestName: $("external-guest-name"),
    btnExternalLinkSubmit: $("btn-external-link-submit"),
    btnExternalLinkCancel: $("btn-external-link-cancel"),
    btnFullscreen: $("btn-fullscreen"),
    btnFsSources: $("btn-fs-sources"),
    fsSourceMenu: $("fs-source-menu"),
    fsSourceList: $("fs-source-list"),
    previewArea: $("preview-area"),
    btnSidebarCollapse: $("btn-sidebar-collapse"),
    hostEntryModal: $("host-entry-modal"),
    hostNameInput: $("host-name-input"),
    hostPinWrap: $("host-pin-wrap"),
    pinInput: $("pin-input"),
    btnHostEntrySubmit: $("btn-host-entry-submit"),
    statBitrate: $("stat-bitrate"),
    statLoss: $("stat-loss"),
    statRtt: $("stat-rtt"),
    statFps: $("stat-fps")
  };
  var signaling = null;
  var media = null;
  var estado = { clients: [], selecionado: null, controleExibicao: [] };
  var hostPeerId = null;
  var hostReady = false;
  var joinInProgress = false;
  var joinGeneration = 0;
  var transmissionWork = Promise.resolve();
  var transmissionGeneration = 0;
  var audioMuted = false;
  var mutedClients = /* @__PURE__ */ new Set();
  var cardVuElements = /* @__PURE__ */ new Map();
  var hostAudioMonitor = null;
  var syncAudioMonitorPromise = null;
  var syncAudioMonitorPending = false;
  var hostMicAutoplayNeeded = false;
  var lastAudioSources = [];
  var lastAppliedAudioSig = "";
  var fontesAudioDebounceTimer = null;
  var meetBridgeLiveMode = false;
  var pendingRoomSnapshot = null;
  var lastAppliedSnapshotKey = "";
  var lastAppliedActiveVideoKey = "";
  var lastActiveTransmission = null;
  var pendingHostAudioSync = null;
  var peerDisplayNameById = /* @__PURE__ */ new Map();
  var HOST_MIC_GAIN_STORAGE_KEY = "sharescreen_host_mic_gain";
  async function fetchAudioFilterPresetApi(kind, name) {
    const trimmed = String(name || "").trim();
    if (!trimmed) return null;
    try {
      const res = await fetch(
        `/api/audio-filter/${encodeURIComponent(kind)}/${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();
      return (data == null ? void 0 : data.preset) || null;
    } catch {
      return null;
    }
  }
  async function saveAudioFilterPresetApi(kind, name, prefs) {
    const trimmed = String(name || "").trim();
    if (!trimmed || !hostToken) return { ok: false };
    try {
      const res = await fetch("/api/audio-filter", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...hostToken ? { "X-Host-Token": hostToken } : {}
        },
        body: JSON.stringify({ kind, name: trimmed, prefs: normalizeMicrophoneFilterPrefs(prefs) })
      });
      return await res.json();
    } catch {
      return { ok: false };
    }
  }
  function getDefaultRecordingAudioClientName() {
    return String(localStorage.getItem(STORAGE_REC_DEFAULT_AUDIO_CLIENT) || "").trim();
  }
  function setDefaultRecordingAudioClientName(name) {
    const trimmed = String(name || "").trim();
    if (trimmed) {
      localStorage.setItem(STORAGE_REC_DEFAULT_AUDIO_CLIENT, trimmed);
    } else {
      localStorage.removeItem(STORAGE_REC_DEFAULT_AUDIO_CLIENT);
    }
    syncRecordingDefaultAudioClientUi();
  }
  function syncRecordingDefaultAudioClientUi() {
    const name = getDefaultRecordingAudioClientName();
    if (els.recDefaultAudioHint) {
      els.recDefaultAudioHint.textContent = name ? `\xC1udio padr\xE3o da grava\xE7\xE3o: ${name}` : "\xC1udio padr\xE3o da grava\xE7\xE3o: nenhum";
    }
    if (els.btnRecClearDefaultAudio) {
      els.btnRecClearDefaultAudio.hidden = !name;
    }
  }
  function resolveRecordingAudioPeer(clients, displayName) {
    const wanted = String(displayName || "").trim().toLowerCase();
    if (!wanted) return null;
    const withAudio = (clients || []).find((c) => {
      var _a47, _b, _c;
      if (c.ehHost || String(c.id) === String(hostPeerId)) return false;
      if (String(c.displayName || "").trim().toLowerCase() !== wanted) return false;
      return !!(c.hasAudio || ((_a47 = c.producerIds) == null ? void 0 : _a47.microphone) || ((_b = c.producerIds) == null ? void 0 : _b.system) || ((_c = c.producerIds) == null ? void 0 : _c.audio));
    });
    if (withAudio) return withAudio;
    return (clients || []).find((c) => {
      if (c.ehHost) return false;
      return String(c.displayName || "").trim().toLowerCase() === wanted;
    }) || null;
  }
  function trackClientDisplayNameChanges(clients) {
    for (const c of clients || []) {
      if (!(c == null ? void 0 : c.id) || c.ehHost) continue;
      const id = String(c.id);
      const newName = String(c.displayName || "").trim();
      if (!newName) continue;
      const oldName = peerDisplayNameById.get(id);
      if (oldName && oldName.toLowerCase() !== newName.toLowerCase()) {
        renamePresetInLocalStorage(oldName, newName);
        const defaultRec = getDefaultRecordingAudioClientName();
        if (defaultRec && defaultRec.toLowerCase() === oldName.toLowerCase()) {
          setDefaultRecordingAudioClientName(newName);
        }
      }
      peerDisplayNameById.set(id, newName);
    }
  }
  function toggleDefaultRecordingAudioClient(client) {
    if (!(client == null ? void 0 : client.displayName)) return;
    const current = getDefaultRecordingAudioClientName();
    if (current && current.toLowerCase() === client.displayName.toLowerCase()) {
      setDefaultRecordingAudioClientName("");
      showToast2("\xC1udio padr\xE3o da grava\xE7\xE3o removido", "info");
    } else {
      setDefaultRecordingAudioClientName(client.displayName);
      showToast2(`${client.displayName} definido como \xE1udio padr\xE3o da grava\xE7\xE3o`, "success");
    }
    renderLista();
  }
  function loadHostMicPublishGain(fallback = 1.4) {
    try {
      const raw = localStorage.getItem(HOST_MIC_GAIN_STORAGE_KEY);
      if (raw == null || raw === "") return fallback;
      const value = Number(raw);
      if (!Number.isFinite(value)) return fallback;
      return Math.max(0.5, Math.min(2.5, value));
    } catch {
      return fallback;
    }
  }
  function saveHostMicPublishGain(value) {
    localStorage.setItem(HOST_MIC_GAIN_STORAGE_KEY, String(value));
  }
  function getDefaultHostMicPublishGain() {
    var _a47;
    return Number(((_a47 = media == null ? void 0 : media.videoQuality) == null ? void 0 : _a47.hostMicPublishGain) ?? 1.4);
  }
  function syncHostMicGainUi(value = loadHostMicPublishGain(getDefaultHostMicPublishGain())) {
    if (els.hostMicGainSlider) els.hostMicGainSlider.value = String(value);
    if (els.hostMicGainVal) els.hostMicGainVal.textContent = `${value.toFixed(1)}x`;
  }
  async function applyHostMicPublishGain(value) {
    const gain = Math.max(0.5, Math.min(2.5, Number(value)));
    saveHostMicPublishGain(gain);
    syncHostMicGainUi(gain);
    if (!(media == null ? void 0 : media.applyHostMicPublishChain)) return;
    const prefs = normalizeMicrophoneFilterPrefs({
      ...HOST_MIC_PUBLISH_DEFAULTS,
      gain,
      compressor: true,
      peaking: true,
      peakingGain: 2
    });
    await media.setMicrophoneFilterPrefs(prefs);
    if (hostDisplayName) {
      saveAudioFiltersPresetDebounced(hostDisplayName, prefs, "host");
    }
  }
  async function loadHostMicPresetFromStorage() {
    if (!(media == null ? void 0 : media.applyHostMicPublishChain)) {
      syncHostMicGainUi(loadHostMicPublishGain(getDefaultHostMicPublishGain()));
      return;
    }
    let prefs = null;
    if (hostDisplayName) {
      const apiPreset = await fetchAudioFilterPresetApi("host", hostDisplayName);
      if (apiPreset == null ? void 0 : apiPreset.prefs) {
        prefs = normalizeMicrophoneFilterPrefs(apiPreset.prefs);
      }
    }
    if (!prefs) {
      const gain = loadHostMicPublishGain(getDefaultHostMicPublishGain());
      prefs = normalizeMicrophoneFilterPrefs({
        ...HOST_MIC_PUBLISH_DEFAULTS,
        gain,
        compressor: true,
        peaking: true,
        peakingGain: 2
      });
      if (hostDisplayName && hasActiveMicrophoneFilter(prefs)) {
        saveAudioFilterPresetApi("host", hostDisplayName, prefs).catch(() => {
        });
      }
    }
    if (prefs.gain != null) saveHostMicPublishGain(prefs.gain);
    syncHostMicGainUi(prefs.gain ?? loadHostMicPublishGain());
    await media.setMicrophoneFilterPrefs(prefs);
  }
  var localHostVuStop = null;
  var isCoHostInstance = readQueryParam("cohost") === "true";
  if (readQueryParam("nome")) localStorage.setItem(STORAGE_HOST_NAME, readQueryParam("nome"));
  function promptHostEntry(roomPinRequired) {
    return new Promise((resolve) => {
      var _a47, _b, _c;
      if (els.hostNameInput && hostDisplayName) {
        els.hostNameInput.value = hostDisplayName;
      }
      if (els.hostPinWrap) {
        els.hostPinWrap.hidden = !roomPinRequired;
      }
      if (els.hostEntryModal) {
        els.hostEntryModal.hidden = false;
      }
      const submit = () => {
        var _a48, _b2, _c2, _d;
        const name = ((_a48 = els.hostNameInput) == null ? void 0 : _a48.value.trim()) || "";
        if (!name) {
          showToast2("Informe seu nome para aparecer no painel", "warn");
          (_b2 = els.hostNameInput) == null ? void 0 : _b2.focus();
          return;
        }
        if (roomPinRequired) {
          roomPin = ((_c2 = els.pinInput) == null ? void 0 : _c2.value.trim()) || "";
          if (!roomPin) {
            showToast2("Informe o PIN da sala", "warn");
            (_d = els.pinInput) == null ? void 0 : _d.focus();
            return;
          }
        }
        hostDisplayName = name;
        localStorage.setItem(STORAGE_HOST_NAME, name);
        if (els.hostEntryModal) els.hostEntryModal.hidden = true;
        resolve();
      };
      els.btnHostEntrySubmit.onclick = submit;
      (_a47 = els.hostNameInput) == null ? void 0 : _a47.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
      (_b = els.pinInput) == null ? void 0 : _b.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          submit();
        }
      });
      (_c = els.hostNameInput) == null ? void 0 : _c.focus();
    });
  }
  var roomPin = "";
  var hostToken = "";
  var hostDisplayName = readQueryParam("nome") || localStorage.getItem(STORAGE_HOST_NAME) || "";
  var statsTimer = null;
  var HOST_TAB_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  var HOST_LOCK_KEY = "sharescreen-host-lock";
  var HOST_LOCK_TTL_MS = 8e3;
  var hostTabBlocked = false;
  var hostLockTimer = null;
  var hostSessionJoined = false;
  function debugHostLog(_hypothesisId, _message, _data = {}) {
  }
  function readHostLock() {
    try {
      return JSON.parse(localStorage.getItem(HOST_LOCK_KEY) || "null");
    } catch {
      return null;
    }
  }
  function tryAcquireHostLock() {
    const now = Date.now();
    const current = readHostLock();
    if (current && current.tabId !== HOST_TAB_ID && now - current.ts < HOST_LOCK_TTL_MS) {
      return false;
    }
    localStorage.setItem(HOST_LOCK_KEY, JSON.stringify({ tabId: HOST_TAB_ID, ts: now }));
    const verify = readHostLock();
    return (verify == null ? void 0 : verify.tabId) === HOST_TAB_ID;
  }
  function refreshHostLock() {
    var _a47;
    if (((_a47 = readHostLock()) == null ? void 0 : _a47.tabId) !== HOST_TAB_ID) return;
    localStorage.setItem(HOST_LOCK_KEY, JSON.stringify({ tabId: HOST_TAB_ID, ts: Date.now() }));
  }
  function releaseHostLock() {
    const current = readHostLock();
    if ((current == null ? void 0 : current.tabId) === HOST_TAB_ID) {
      localStorage.removeItem(HOST_LOCK_KEY);
    }
  }
  var ui = new UiStateMachine({ onChange: syncControlButtons });
  var errors = new ErrorManager({
    onToast: (msg, type) => showToast2(msg, type),
    onTechnicalLog: (msg, level) => log(msg, level)
  });
  var recorder = new RecordingClient({
    onLog: log,
    onStateChange: updateRecordingUi,
    onProgress: (pct) => {
      if (els.uploadProgress) els.uploadProgress.style.width = `${pct}%`;
    },
    onTimer: (sec, bytes) => {
      if (els.recordingTimer) {
        const sizeHint = bytes ? ` \xB7 ${formatRecordingBytes(bytes)} no servidor` : "";
        els.recordingTimer.textContent = `${formatTimer(sec)}${sizeHint}`;
        els.recordingTimer.hidden = false;
      }
    }
  });
  var recordingCapture = null;
  var hostCapturePrefs = loadCapturePrefs();
  if (els.hostChkSystem) els.hostChkSystem.checked = hostCapturePrefs.systemAudio !== false;
  if (els.hostChkMic) els.hostChkMic.checked = !!hostCapturePrefs.microphone;
  if (els.qualityPreset) {
    els.qualityPreset.value = loadPresetId();
    updateQualityHint();
    els.qualityPreset.addEventListener("change", () => applyHostQuality(els.qualityPreset.value));
  }
  function updateQualityHint() {
    var _a47;
    const preset = getPreset(((_a47 = els.qualityPreset) == null ? void 0 : _a47.value) || loadPresetId());
    if (els.qualityHint) {
      els.qualityHint.textContent = `${preset.description} - ate ${bitrateMbps(preset)} Mbps`;
    }
  }
  function applyHostQuality(presetId) {
    savePresetId(presetId);
    updateQualityHint();
    const quality = mergeServerQuality((media == null ? void 0 : media.videoQuality) || {}, presetId);
    media == null ? void 0 : media.setVideoQuality(quality);
    if (els.previewQuality && ui._flags.hasPreview) {
      els.previewQuality.textContent = getPreset(presetId).label;
    }
    if (canHostCommand()) {
      signaling.send("definirQualidade", { presetId });
    }
    showToast2(`Qualidade: ${getPreset(presetId).label}`, "info");
  }
  setupMicrophonePicker({
    checkbox: els.hostChkMic,
    wrap: els.hostMicWrap,
    select: els.hostMicSelect,
    refreshBtn: els.hostBtnRefreshMics,
    savedDeviceId: hostCapturePrefs.microphoneDeviceId || "",
    onLog: log,
    onError: (m) => errors.handle(new Error(m), "microfone"),
    onSelectChange: () => onHostAudioPrefsChange()
  });
  var _a;
  (_a = els.hostChkMic) == null ? void 0 : _a.addEventListener("change", () => onHostAudioPrefsChange());
  var _a2;
  (_a2 = els.hostChkSystem) == null ? void 0 : _a2.addEventListener("change", () => onHostAudioPrefsChange());
  syncHostMicGainUi(loadHostMicPublishGain(1.4));
  var _a3;
  (_a3 = els.hostMicGainSlider) == null ? void 0 : _a3.addEventListener("input", () => {
    var _a47;
    const gain = Number(((_a47 = els.hostMicGainSlider) == null ? void 0 : _a47.value) || 1.4);
    if (els.hostMicGainVal) els.hostMicGainVal.textContent = `${gain.toFixed(1)}x`;
  });
  var _a4;
  (_a4 = els.hostMicGainSlider) == null ? void 0 : _a4.addEventListener("change", () => {
    var _a47;
    applyHostMicPublishGain(Number(((_a47 = els.hostMicGainSlider) == null ? void 0 : _a47.value) || 1.4)).catch(
      (e) => errors.handle(e, "host-mic-gain")
    );
  });
  async function onHostAudioPrefsChange() {
    var _a47, _b;
    saveCapturePrefs(getHostCapturePrefs());
    if (els.hostMicWrap) {
      els.hostMicWrap.hidden = !((_a47 = els.hostChkMic) == null ? void 0 : _a47.checked);
    }
    updateHostMicUi();
    if (!media || !hostReady) return;
    try {
      const prefs = getHostCapturePrefs();
      await media.ensureSendTransport();
      if (prefs.microphone) {
        await applyHostMicPublishGain(loadHostMicPublishGain(getDefaultHostMicPublishGain()));
        await media.publishMicrophone(prefs);
      } else {
        await media.stopMicrophone();
      }
      if (((_b = media.hasVideoProducer) == null ? void 0 : _b.call(media)) || media.localScreenStream) {
        if (prefs.systemAudio !== false) {
          await media.publishSystemAudioFromDisplay();
        } else {
          await media.stopSystemAudio();
        }
      } else if (!prefs.systemAudio) {
        await media.stopSystemAudio();
      }
      syncLocalHostVu();
      if (prefs.microphone && !media.hasPublishedMicrophone()) {
        showToast2("Microfone nao publicado - verifique permissao do navegador", "warn");
      } else if (!prefs.microphone && !prefs.systemAudio) {
        showToast2("Audio desativado", "info");
      } else if (!prefs.microphone) {
        showToast2("Microfone desativado - so audio do sistema", "info");
      } else if (media.hasPublishedMicrophone()) {
        showToast2("Microfone atualizado", "info");
      }
    } catch (e) {
      errors.handle(e, "audio-prefs");
    }
  }
  function formatTimer(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  function formatRecordingBytes(bytes) {
    if (!bytes || bytes < 1024) return `${bytes || 0} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  function log(msg, level = "info") {
    var _a47;
    if (!els.logs) return;
    const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("pt-BR");
    const line = document.createElement("div");
    line.className = `log-line log-${level}`;
    line.textContent = `[${time}] ${msg}`;
    els.logs.prepend(line);
    while (els.logs.children.length > 150) (_a47 = els.logs.lastChild) == null ? void 0 : _a47.remove();
    if (level === "error") console.error(msg);
  }
  function setStatus(text) {
    if (els.statusBar) els.statusBar.textContent = text;
  }
  function setBadge(text, type = "muted") {
    if (!els.statusBadge) return;
    els.statusBadge.textContent = text;
    els.statusBadge.className = `badge badge-${type}`;
  }
  function getHostCapturePrefs() {
    var _a47, _b, _c;
    return {
      systemAudio: ((_a47 = els.hostChkSystem) == null ? void 0 : _a47.checked) !== false,
      microphone: !!((_b = els.hostChkMic) == null ? void 0 : _b.checked),
      microphoneDeviceId: ((_c = els.hostMicSelect) == null ? void 0 : _c.value) || ""
    };
  }
  function syncControlButtons() {
    if (els.btnPausar) {
      els.btnPausar.disabled = !ui.canPause();
      els.btnPausar.hidden = ui._flags.isPaused;
    }
    if (els.btnRetomar) {
      els.btnRetomar.hidden = !ui._flags.isPaused;
      els.btnRetomar.disabled = !ui.canResume();
    }
    if (els.btnLimpar) {
      els.btnLimpar.disabled = !ui._flags.hasSelection;
    }
    if (els.btnGravar) {
      els.btnGravar.disabled = !ui.canRecord();
    }
    if (els.btnPararGravar) {
      els.btnPararGravar.disabled = !ui.canStopRecord();
      els.btnPararGravar.hidden = !ui._flags.isRecording;
    }
    if (els.btnPlayPause) {
      const isPaused = ui._flags.isPaused;
      els.btnPlayPause.disabled = isPaused ? !ui.canResume() : !ui.canPause();
      els.btnPlayPause.title = isPaused ? "Retomar transmissao" : "Pausar transmissao";
      els.btnPlayPause.innerHTML = isPaused ? `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>` : `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
    }
    if (els.btnRecordingToggle) {
      const isRec = ui._flags.isRecording;
      const busy = ui._flags.isUploading || ui._flags.isRecordingBusy;
      els.btnRecordingToggle.disabled = isRec ? !ui.canStopRecord() : !ui.canRecord() || busy;
      els.btnRecordingToggle.title = isRec ? "Parar gravacao" : "Gravar transmissao";
      if (isRec) {
        els.btnRecordingToggle.classList.add("btn-danger");
        els.btnRecordingToggle.classList.remove("btn-secondary");
        els.btnRecordingToggle.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="white"><rect x="4" y="4" width="16" height="16" rx="2"></rect></svg>`;
      } else {
        els.btnRecordingToggle.classList.add("btn-secondary");
        els.btnRecordingToggle.classList.remove("btn-danger");
        els.btnRecordingToggle.innerHTML = `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="red"><circle cx="12" cy="12" r="8"></circle></svg>`;
      }
    }
  }
  function updatePreviewOverlays() {
    if (!els.previewEmpty) return;
    const sel = estado.selecionado;
    const paused = sel == null ? void 0 : sel.pausado;
    const hasPreview = ui._flags.hasPreview;
    els.previewEmpty.hidden = hasPreview || paused || !!sel;
    els.previewWaiting.hidden = hasPreview || paused || !sel;
    els.previewPaused.hidden = !paused;
    els.previewInfo.hidden = true;
    const showBadge = hasPreview && sel && !paused;
    updateStreamSourceBadge(els.streamSourceBadge, sel == null ? void 0 : sel.displayName, showBadge);
    if (sel && hasPreview && els.previewSourceName) {
      els.previewSourceName.textContent = sel.displayName || "Fonte";
      if (els.previewQuality) {
        els.previewQuality.textContent = getPreset(loadPresetId()).label;
      }
    }
    liveAnnotation == null ? void 0 : liveAnnotation.updateButtonVisibility(hostReady && hasPreview);
    liveAnnotation == null ? void 0 : liveAnnotation.resize();
  }
  function sortClientsForDisplay(clients) {
    return sortDisplaySources(clients);
  }
  function buildSourceCard(c, onSelect, isTransmissionSection = false) {
    const card = buildDisplaySourceCard(c, onSelect, {
      noSharingHighlight: !isTransmissionSection,
      decorateBody: (body, source) => {
        if (source.hasAudio) {
          const isMuted = mutedClients.has(source.id);
          const muteBtn = document.createElement("button");
          muteBtn.type = "button";
          muteBtn.className = `source-mute-btn${isMuted ? " is-muted" : ""}`;
          muteBtn.setAttribute("aria-label", isMuted ? "Ativar audio do client" : "Silenciar audio do client");
          muteBtn.title = isMuted ? "Ativar audio" : "Silenciar audio";
          muteBtn.innerHTML = isMuted ? '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>' : '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.91-3c0 3.28-2.64 5.91-5.91 5.91S6.09 14.28 6.09 11H4.07c0 3.95 2.87 7.23 6.65 7.88v2.02h2.56v-2.02c3.78-.65 6.65-3.93 6.65-7.88h-2.02z"/></svg>';
          muteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleClientMute(source.id);
          });
          body.append(muteBtn);
        }
      },
      decorateRow: (row, source) => {
        const defaultRecName = getDefaultRecordingAudioClientName();
        if (defaultRecName && source.displayName && defaultRecName.toLowerCase() === String(source.displayName).toLowerCase()) {
          const badge = document.createElement("span");
          badge.className = "source-role-badge source-role-badge--rec-audio";
          badge.textContent = "\xE1udio grava\xE7\xE3o";
          badge.title = "\xC1udio padr\xE3o da grava\xE7\xE3o";
          const nameWrap = row.querySelector(".source-name-wrap");
          if (nameWrap) nameWrap.append(badge);
        }
        if (!source.hasAudio) return;
        const vuColumn = document.createElement("div");
        vuColumn.className = "source-vu-column";
        vuColumn.title = "Nivel de audio";
        const vuFill = document.createElement("div");
        vuFill.className = "source-vu-fill";
        vuColumn.append(vuFill);
        row.append(vuColumn);
        const key = String(source.id);
        if (!cardVuElements.has(key)) {
          cardVuElements.set(key, []);
        }
        cardVuElements.get(key).push({ fill: vuFill, column: vuColumn });
      }
    });
    if (!isTransmissionSection) {
      card.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openContextMenu(e, c);
      });
    }
    return card;
  }
  function updateHostMicUi() {
    var _a47, _b;
    const btn = els.btnHostMic;
    if (!btn) return;
    const micPublished = (_a47 = media == null ? void 0 : media.hasPublishedMicrophone) == null ? void 0 : _a47.call(media);
    const show = micPublished || hostMicAutoplayNeeded;
    btn.hidden = !show;
    if (!show) return;
    const muted = ((_b = media == null ? void 0 : media.isPublishedAudioMuted) == null ? void 0 : _b.call(media)) ?? false;
    btn.classList.toggle("is-muted", muted || hostMicAutoplayNeeded);
    btn.setAttribute("aria-pressed", String(muted));
    btn.title = hostMicAutoplayNeeded ? "Ativar audio" : muted ? "Ativar microfone" : "Silenciar microfone";
    btn.setAttribute(
      "aria-label",
      hostMicAutoplayNeeded ? "Ativar audio" : muted ? "Ativar microfone" : "Silenciar microfone"
    );
    syncLocalHostVu();
  }
  async function onHostMicClick() {
    var _a47, _b;
    if (!els.btnHostMic) return;
    try {
      if (hostMicAutoplayNeeded) {
        await (hostAudioMonitor == null ? void 0 : hostAudioMonitor.resume());
        hostAudioMonitor == null ? void 0 : hostAudioMonitor.connectOutput(els.previewAudio);
        await ((_a47 = els.previewAudio) == null ? void 0 : _a47.play());
        hostMicAutoplayNeeded = false;
        updateHostMicUi();
        return;
      }
      if (!((_b = media == null ? void 0 : media.hasPublishedMicrophone) == null ? void 0 : _b.call(media))) return;
      media.togglePublishedAudioMuted();
      updateHostMicUi();
      showToast2(media.isPublishedAudioMuted() ? "Microfone silenciado" : "Microfone ativado", "info");
    } catch (e) {
      errors.handle(e, "mic-toggle");
    }
  }
  function toggleClientMute(peerId) {
    const muted = !mutedClients.has(peerId);
    signaling.send("definirClientMute", { peerId, muted });
  }
  async function toggleDisplayControl(peerId, ativo) {
    if (!canHostCommand()) {
      showToast2("Aguarde o painel conectar ao servidor", "warn");
      return;
    }
    try {
      const resultPromise = signaling.onceType("controleExibicaoResultado");
      signaling.send("definirControleExibicao", { peerId, ativo });
      const res = await resultPromise;
      if (!res.ok) throw new Error(res.erro || "Falha ao delegar controle");
      showToast2(
        ativo ? "Controle de exibicao delegado ao client" : "Controle de exibicao revogado",
        "success"
      );
    } catch (e) {
      errors.handle(e, "controle-exibicao");
    }
  }
  function updateTransmissionSectionVu(level, active) {
    const fill = els.transmissionVuFill;
    const col = els.transmissionVuColumn;
    if (!fill || !col) return;
    const pct = Math.min(100, Math.max(0, Math.round(level * 120)));
    fill.style.height = `${pct}%`;
    col.classList.toggle("is-active", active);
  }
  function syncLocalHostVu() {
    var _a47;
    localHostVuStop == null ? void 0 : localHostVuStop();
    localHostVuStop = null;
    if (!hostPeerId) return;
    const list = cardVuElements.get(String(hostPeerId));
    if (!list || !list.length) return;
    const track = (_a47 = media == null ? void 0 : media.getLocalAudioTrack) == null ? void 0 : _a47.call(media);
    if (!track || track.readyState !== "live") return;
    localHostVuStop = startTrackLevelMeter(track, {
      onLevel: (level) => {
        const currentList = cardVuElements.get(String(hostPeerId));
        if (!currentList) return;
        const pct = Math.min(100, Math.max(2, Math.round(level * 120)));
        for (const vu of currentList) {
          vu.fill.style.height = `${pct}%`;
          vu.column.classList.toggle("is-active", level > 0.02);
        }
        if (estado.selecionado && String(estado.selecionado.id) === String(hostPeerId)) {
          updateTransmissionSectionVu(level, level > 0.02);
        }
      }
    });
  }
  function updateCardVuMeters(levels) {
    let selectedLevel = 0;
    let selectedActive = false;
    for (const [peerId, { level, active }] of levels) {
      if (hostPeerId && String(peerId) === String(hostPeerId)) continue;
      const id = String(peerId);
      if (estado.selecionado && String(estado.selecionado.id) === id) {
        selectedLevel = level;
        selectedActive = active;
      }
      const list = cardVuElements.get(id) || cardVuElements.get(peerId);
      if (!list) continue;
      const pct = Math.min(100, Math.max(2, Math.round(level * 120)));
      const arr = Array.isArray(list) ? list : [list];
      for (const refs of arr) {
        refs.fill.style.height = `${pct}%`;
        refs.column.classList.toggle("is-active", active);
      }
    }
    if (estado.selecionado && String(estado.selecionado.id) !== String(hostPeerId)) {
      updateTransmissionSectionVu(selectedLevel, selectedActive);
    }
  }
  function onHostRemoteAudioAutoplayBlocked() {
    hostMicAutoplayNeeded = true;
    updateHostMicUi();
  }
  function ensureHostAudioMonitor() {
    if (!media) return null;
    if (!hostAudioMonitor) {
      hostAudioMonitor = new HostAudioMonitor(media, {
        excludePeerId: hostPeerId,
        onAutoplayBlocked: onHostRemoteAudioAutoplayBlocked
      });
      hostAudioMonitor.onLevels = updateCardVuMeters;
    } else if (hostPeerId) {
      hostAudioMonitor.excludePeerId = String(hostPeerId);
    }
    return hostAudioMonitor;
  }
  function mergeLastAudioSourcesFromEstado(payload = {}) {
    var _a47;
    if ((_a47 = payload.audioSources) == null ? void 0 : _a47.length) {
      lastAudioSources = payload.audioSources;
      return;
    }
    const merged = buildHostAudioSources();
    if (!merged.length) return;
    const nextSig = audioSourcesSignature(merged);
    const prevSig = audioSourcesSignature(lastAudioSources);
    if (nextSig !== prevSig) {
      lastAudioSources = merged;
    }
  }
  function resolveHostAudioSources() {
    const fromServer = normalizeRemoteAudioSources(lastAudioSources, { excludePeerId: hostPeerId });
    if (fromServer.length) return fromServer;
    return buildHostAudioSources();
  }
  function countActiveHostAudioChannels(monitor) {
    var _a47;
    return ((_a47 = monitor == null ? void 0 : monitor.countLiveChannels) == null ? void 0 : _a47.call(monitor)) ?? 0;
  }
  async function repairHostRemoteAudioIfNeeded() {
    var _a47, _b;
    if (!hostPeerId || !(media == null ? void 0 : media.device)) return;
    const monitor = ensureHostAudioMonitor();
    if (!monitor) return;
    const list = resolveHostAudioSources();
    const expected = list.length;
    if (!expected) return;
    const active = countActiveHostAudioChannels(monitor);
    if (active >= expected) {
      await ((_a47 = monitor.recoverOutputIfSilent) == null ? void 0 : _a47.call(monitor));
      return;
    }
    audioTrace("audio-health", { event: "repair-all", expected, active, role: "host" });
    const backoffs = [0, 400, 800, 1600];
    for (const delay of backoffs) {
      if (delay) await new Promise((r) => setTimeout(r, delay));
      await monitor.syncFromSources(list);
      if (countActiveHostAudioChannels(monitor) >= expected) break;
    }
    await ((_b = monitor.recoverOutputIfSilent) == null ? void 0 : _b.call(monitor));
    monitor.connectOutput(els.previewAudio);
    applyVolumeFromSlider();
    await monitor.resume();
  }
  async function syncHostAudioMonitor(sources = null, { force = false } = {}) {
    if (!hostPeerId || !(media == null ? void 0 : media.device)) {
      pendingHostAudioSync = sources ?? "merge";
      return;
    }
    if (syncAudioMonitorPromise) {
      syncAudioMonitorPending = true;
      return syncAudioMonitorPromise;
    }
    syncAudioMonitorPromise = (async () => {
      var _a47, _b, _c, _d;
      do {
        syncAudioMonitorPending = false;
        if (!media || !hostPeerId) return;
        await media.ensureRecvTransport(media._audioRecvTag());
        const monitor = ensureHostAudioMonitor();
        if (!monitor) return;
        monitor.setMasterVolume(Number(((_a47 = els.volumeSlider) == null ? void 0 : _a47.value) || 100) / 100);
        monitor.setManualMuted(mutedClients);
        if (sources == null ? void 0 : sources.length) {
          lastAudioSources = sources;
        }
        const audioSources = resolveHostAudioSources();
        const sig = audioSourcesSignature(audioSources);
        const expected = audioSources.length;
        const active = countActiveHostAudioChannels(monitor);
        if (!force && sig === lastAppliedAudioSig && (expected > 0 && active >= expected || expected === 0 && active === 0)) {
          return;
        }
        await monitor.syncFromSources(audioSources);
        await syncPublishedAudioFiltersToClients(audioSources);
        const retryBackoffs = [800, 1600, 3200];
        let retryCycle = 0;
        while (audioSources.length && monitor.channelCount === 0 && retryCycle < retryBackoffs.length) {
          log(
            `Audio remoto: ${audioSources.length} fonte(s) detectada(s), 0 canal ativo - tentativa ${retryCycle + 1}/${retryBackoffs.length}...`,
            "warn"
          );
          await new Promise((r) => setTimeout(r, retryBackoffs[retryCycle]));
          retryCycle += 1;
          await monitor.syncFromSources(resolveHostAudioSources());
        }
        await ((_b = monitor.recoverOutputIfSilent) == null ? void 0 : _b.call(monitor));
        monitor.connectOutput(els.previewAudio);
        applyVolumeFromSlider();
        await monitor.resume();
        if (els.controlesAudio) {
          els.controlesAudio.hidden = !hasAnyClientAudio() && monitor.channelCount === 0;
        }
        if (((_c = monitor.isAutoplayBlocked) == null ? void 0 : _c.call(monitor)) || ((_d = els.previewAudio) == null ? void 0 : _d.paused) && monitor.channelCount > 0) {
          onHostRemoteAudioAutoplayBlocked();
        } else if (!monitor.channelCount) {
          hostMicAutoplayNeeded = false;
          updateHostMicUi();
        }
        syncLocalHostVu();
        if (monitor.channelCount > 0) {
          log(`Audio remoto: ${monitor.channelCount} canal(is) ativo(s)`, "info");
          audioTraceSync("sync-ok", audioSources, { channels: monitor.channelCount, role: "host" });
        } else if (audioSources.length) {
          audioTraceSync("sync-falhou", audioSources, { channels: 0, role: "host" });
        }
        if (monitor.channelCount >= expected || expected === 0 && monitor.channelCount === 0) {
          lastAppliedAudioSig = sig;
        }
        await repairHostRemoteAudioIfNeeded();
      } while (syncAudioMonitorPending);
    })().finally(() => {
      syncAudioMonitorPromise = null;
    });
    return syncAudioMonitorPromise;
  }
  async function flushPendingHostAudioSync() {
    if (!pendingHostAudioSync || !hostPeerId || !(media == null ? void 0 : media.device)) return;
    const pending = pendingHostAudioSync;
    pendingHostAudioSync = null;
    if (pending === "merge" || pending === "estado") {
      await syncHostAudioMonitor();
    } else {
      await syncHostAudioMonitor(pending);
    }
  }
  function applyClientAudioMute() {
    hostAudioMonitor == null ? void 0 : hostAudioMonitor.setManualMuted(mutedClients);
    applyVolumeFromSlider();
  }
  function queueTransmission(raw) {
    const gen = ++transmissionGeneration;
    transmissionWork = transmissionWork.then(() => runTransmission(raw, gen)).catch((e) => errors.handle(e, "applyTransmission"));
  }
  function hasAnyClientAudio() {
    return estado.clients.some(
      (c) => c.hasAudio && String(c.id) !== String(hostPeerId)
    );
  }
  function buildHostAudioSources() {
    const map = /* @__PURE__ */ new Map();
    for (const s of lastAudioSources || []) {
      const peerId = String(s.peerId || s.id);
      if (!peerId || !s.producerId || peerId === String(hostPeerId)) continue;
      const source = s.source || "microphone";
      map.set(`${peerId}:${source}`, {
        peerId,
        producerId: s.producerId,
        name: s.name || s.displayName || peerId,
        source
      });
    }
    for (const c of estado.clients || []) {
      if (String(c.id) === String(hostPeerId)) continue;
      const ids = c.producerIds || {};
      const entries = [
        ["microphone", ids.microphone],
        ["system", ids.system],
        ["mixed", ids.mixed]
      ];
      for (const [source, producerId] of entries) {
        if (!producerId) continue;
        const peerId = String(c.id);
        const mapKey = `${peerId}:${source}`;
        if (map.has(mapKey)) continue;
        map.set(mapKey, {
          peerId: c.id,
          producerId,
          name: c.displayName,
          source
        });
      }
      if (!ids.microphone && !ids.system && !ids.mixed && c.hasAudio && ids.audio) {
        const peerId = String(c.id);
        const mapKey = `${peerId}:microphone`;
        if (!map.has(mapKey)) {
          map.set(mapKey, {
            peerId: c.id,
            producerId: ids.audio,
            name: c.displayName,
            source: "microphone"
          });
        }
      }
    }
    return normalizeRemoteAudioSources([...map.values()], { excludePeerId: hostPeerId });
  }
  function renderFsSourceMenu() {
    if (!els.fsSourceList) return;
    els.fsSourceList.innerHTML = "";
    if (!estado.clients.length) {
      const li = document.createElement("li");
      li.className = "fs-source-empty";
      li.textContent = "Nenhuma fonte conectada";
      els.fsSourceList.appendChild(li);
      return;
    }
    for (const c of sortClientsForDisplay(estado.clients)) {
      els.fsSourceList.appendChild(
        buildSourceCard(c, (peerId) => {
          closeFsSourceMenu();
          selecionar(peerId);
        })
      );
    }
  }
  function isPreviewFullscreen() {
    return document.fullscreenElement === els.previewArea;
  }
  function syncFsSourceUi() {
    const fs = isPreviewFullscreen();
    if (els.btnFsSources) els.btnFsSources.hidden = !fs;
    if (!fs) closeFsSourceMenu();
  }
  function closeFsSourceMenu() {
    var _a47;
    if (!els.fsSourceMenu) return;
    els.fsSourceMenu.hidden = true;
    (_a47 = els.btnFsSources) == null ? void 0 : _a47.setAttribute("aria-expanded", "false");
  }
  function toggleFsSourceMenu() {
    var _a47;
    if (!els.fsSourceMenu || !isPreviewFullscreen()) return;
    const open = els.fsSourceMenu.hidden;
    if (open) renderFsSourceMenu();
    els.fsSourceMenu.hidden = !open;
    (_a47 = els.btnFsSources) == null ? void 0 : _a47.setAttribute("aria-expanded", String(open));
  }
  function updateTransmissionCard() {
    if (!els.transmissionCardContainer) return;
    els.transmissionCardContainer.innerHTML = "";
    const sel = estado.selecionado;
    if (sel && sel.isProducing) {
      const card = buildSourceCard(sel, () => {
      }, true);
      els.transmissionCardContainer.appendChild(card);
    } else {
      const empty = document.createElement("div");
      empty.className = "transmission-card-empty";
      empty.textContent = "Nenhuma transmissao ativa";
      els.transmissionCardContainer.appendChild(empty);
    }
  }
  function renderLista() {
    var _a47;
    if (!els.lista) return;
    els.lista.innerHTML = "";
    cardVuElements.clear();
    if (!estado.clients.length) {
      const li = document.createElement("li");
      li.className = "hint-text";
      li.textContent = "Nenhuma fonte conectada";
      els.lista.appendChild(li);
      renderFsSourceMenu();
      updateTransmissionCard();
      if (!estado.selecionado) {
        updateTransmissionSectionVu(0, false);
      }
      return;
    }
    for (const c of sortClientsForDisplay(estado.clients)) {
      els.lista.appendChild(buildSourceCard(c, (peerId) => selecionar(peerId), false));
    }
    if (els.selecionado) {
      els.selecionado.textContent = estado.selecionado ? `Selecionado: ${estado.selecionado.displayName}` : "Nenhuma fonte selecionada";
    }
    renderFsSourceMenu();
    syncLocalHostVu();
    updateTransmissionCard();
    if (!estado.selecionado) {
      updateTransmissionSectionVu(0, false);
    }
    ui.set({
      hasSelection: !!estado.selecionado,
      isPaused: !!((_a47 = estado.selecionado) == null ? void 0 : _a47.pausado)
    });
    updatePreviewOverlays();
  }
  async function selecionar(peerId) {
    if (!canHostCommand()) {
      debugHostLog("H", "selecionar blocked", {
        hostPeerId: !!hostPeerId,
        hostReady,
        connected: signaling == null ? void 0 : signaling.connected,
        authenticated: signaling == null ? void 0 : signaling.authenticated,
        joinInProgress
      });
      showToast2("Aguarde o painel conectar ao servidor", "warn");
      return;
    }
    try {
      setStatus("Selecionando fonte...");
      const resultPromise = signaling.onceType("selecaoResultado");
      signaling.send("selecionarClient", { peerId });
      const res = await resultPromise;
      if (!res.ok) throw new Error(res.erro || "Falha na selecao");
      showToast2("Fonte selecionada", "success");
      setStatus("Carregando video da fonte...");
    } catch (e) {
      errors.handle(e, "selecionar");
      setStatus("Conectado ao painel host");
    }
  }
  async function runTransmission(raw, gen = transmissionGeneration) {
    var _a47, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s;
    if (gen !== transmissionGeneration) return;
    const tx = normalizeTransmission(raw);
    lastActiveTransmission = tx;
    if (tx.selectedPeerId) {
      const client = estado.clients.find((c) => String(c.id) === String(tx.selectedPeerId));
      if (client) {
        estado.selecionado = {
          ...client,
          isProducing: hasActiveVideo(tx) || client.isProducing,
          hasVideo: hasActiveVideo(tx) || client.hasVideo,
          producerIds: {
            ...client.producerIds || {},
            video: ((_a47 = tx.producerIds) == null ? void 0 : _a47.video) || ((_b = client.producerIds) == null ? void 0 : _b.video) || client.producerId || null
          },
          producerId: ((_c = tx.producerIds) == null ? void 0 : _c.video) || ((_d = client.producerIds) == null ? void 0 : _d.video) || client.producerId || null,
          selecionado: true,
          pausado: tx.paused
        };
      } else {
        estado.selecionado = {
          id: tx.selectedPeerId,
          displayName: tx.peerName || "Fonte",
          isProducing: hasActiveVideo(tx),
          producerIds: tx.producerIds,
          selecionado: true,
          pausado: tx.paused
        };
      }
    } else {
      estado.selecionado = null;
    }
    for (const c of estado.clients || []) {
      c.selecionado = String(c.id) === String(tx.selectedPeerId);
    }
    if (isCoHostInstance) {
      renderLista();
      return;
    }
    try {
      if (!tx.producerId) {
        await (media == null ? void 0 : media.closeActiveVideoConsumer({ videoEl: els.preview, notifyServer: true }));
        hideLtOverlay();
        if (els.controlesAudio) els.controlesAudio.hidden = !hasAnyClientAudio();
        ui.set({ hasPreview: false, isPaused: tx.paused });
        updatePreviewOverlays();
        setStatus("Nenhuma transmissao ativa");
      } else if (String(tx.selectedPeerId) === String(hostPeerId)) {
        await (media == null ? void 0 : media.closeActiveVideoConsumer({ videoEl: els.preview, notifyServer: true }));
        const localVideoTrack = (_f = (_e = media == null ? void 0 : media.localScreenStream) == null ? void 0 : _e.getVideoTracks) == null ? void 0 : _f.call(_e)[0];
        if (els.preview && (localVideoTrack == null ? void 0 : localVideoTrack.readyState) === "live") {
          if (els.preview.srcObject !== media.localScreenStream) {
            els.preview.srcObject = media.localScreenStream;
          }
          (_h = (_g = els.preview).play) == null ? void 0 : _h.call(_g).catch(() => {
          });
        }
        applyLtOverlayForTransmission(tx);
        ui.set({ hasPreview: true, isSharing: true });
        updatePreviewOverlays();
        setStatus("Exibindo sua tela");
      } else {
        if (gen !== transmissionGeneration) return;
        const ownProducerId = ((_j = (_i = media.producers) == null ? void 0 : _i.video) == null ? void 0 : _j.id) || null;
        const currentProducerId = media.currentActiveVideoProducerId || ((_l = (_k = media.remoteConsumers) == null ? void 0 : _k.video) == null ? void 0 : _l.producerId);
        const needsConsume = remoteVideoConsumeNeeded(tx, {
          currentProducerId,
          isSelfSelected: false,
          hasVideoElement: !!((_m = els.preview) == null ? void 0 : _m.srcObject),
          consumerClosed: !((_n = media == null ? void 0 : media.remoteConsumers) == null ? void 0 : _n.video) || media.remoteConsumers.video.closed
        });
        if (needsConsume) {
          debugHostLog("H2", "[CLIENT_CONSUME] host consumindo video ativo", {
            producerVideo: ((_p = (_o = tx.producerIds) == null ? void 0 : _o.video) == null ? void 0 : _p.slice(0, 8)) || null,
            previousProducer: (currentProducerId == null ? void 0 : currentProducerId.slice(0, 8)) || null
          });
          await media.consumeRemoteMedia(tx.producerIds, {
            videoEl: els.preview,
            audioEl: null,
            ownProducerIds: { video: ownProducerId }
          });
        }
        els.previewError.hidden = true;
        if (els.controlesAudio) {
          els.controlesAudio.hidden = !hasAnyClientAudio();
        }
        updateHostMicUi();
        ui.set({ hasPreview: true, isPaused: tx.paused });
        updatePreviewOverlays();
        applyLtOverlayForTransmission(tx);
        setStatus(tx.paused ? "Transmissao pausada" : `Exibindo: ${tx.peerName || "fonte"}`);
        if (!tx.paused) {
          try {
            await ((_r = (_q = els.preview) == null ? void 0 : _q.play) == null ? void 0 : _r.call(_q));
          } catch (_) {
          }
        }
      }
    } catch (e) {
      if (((_s = e.message) == null ? void 0 : _s.includes("Autoplay")) || e.name === "NotAllowedError") {
        hostMicAutoplayNeeded = true;
        updateHostMicUi();
      }
      errors.handle(e, "applyTransmission");
      els.previewError.hidden = false;
      if (els.previewErrorMsg) els.previewErrorMsg.textContent = e.message;
      setStatus(`Erro ao exibir fonte: ${e.message}`);
    } finally {
      if (gen === transmissionGeneration) {
        syncHostAudioMonitor().catch(
          (e) => errors.handle(e, "audio-monitor")
        );
        renderLista();
      }
    }
  }
  function applyTransmission(raw) {
    queueTransmission(raw);
  }
  function shouldHostApplyActiveVideo(tx) {
    var _a47, _b, _c, _d;
    const activeKey = activeVideoTransmissionKey(tx);
    const currentProducerId = (media == null ? void 0 : media.currentActiveVideoProducerId) || ((_b = (_a47 = media == null ? void 0 : media.remoteConsumers) == null ? void 0 : _a47.video) == null ? void 0 : _b.producerId) || null;
    const isOwn = String(normalizeTransmission(tx).selectedPeerId) === String(hostPeerId);
    const needsConsume = remoteVideoConsumeNeeded(tx, {
      currentProducerId,
      isSelfSelected: isOwn,
      hasVideoElement: !!((_c = els.preview) == null ? void 0 : _c.srcObject),
      consumerClosed: !((_d = media == null ? void 0 : media.remoteConsumers) == null ? void 0 : _d.video) || media.remoteConsumers.video.closed
    });
    const keyChanged = activeKey !== lastAppliedActiveVideoKey;
    if (!hasActiveVideo(tx)) return keyChanged || !!currentProducerId;
    if (isOwn) return keyChanged || !!currentProducerId;
    return keyChanged || needsConsume;
  }
  async function applyRoomSnapshot(snapshot, { force = false } = {}) {
    var _a47, _b, _c, _d, _e, _f, _g;
    if (!snapshot) return;
    const parsed = parseRoomSnapshot(snapshot);
    if (snapshot.meetBridgeLiveMode !== void 0) {
      applyMeetBridgeLiveModeFromRoom(snapshot.meetBridgeLiveMode);
    }
    if (parsed.mutedPeerIds) {
      mutedClients.clear();
      for (const id of parsed.mutedPeerIds) {
        mutedClients.add(String(id));
      }
      applyClientAudioMute();
    }
    const mediaKey = roomSnapshotMediaKey(snapshot);
    const activeKey = activeVideoTransmissionKey(parsed.transmission);
    debugHostLog("H1", "[ROOM_STATE] snapshot recebido", {
      activeKey,
      producerVideo: ((_c = (_b = (_a47 = parsed.transmission) == null ? void 0 : _a47.producerIds) == null ? void 0 : _b.video) == null ? void 0 : _c.slice(0, 8)) || null,
      clients: (snapshot.clients || parsed.peers || []).length
    });
    if (!hostReady || joinInProgress) {
      trackClientDisplayNameChanges(snapshot.clients || parsed.peers || []);
      pendingRoomSnapshot = snapshot;
      if (((_d = snapshot.clients) == null ? void 0 : _d.length) || ((_e = parsed.peers) == null ? void 0 : _e.length)) {
        estado = enrichRoomSourcesState(
          {
            clients: snapshot.clients || parsed.peers || [],
            selecionado: snapshot.selecionado || null,
            controleExibicao: snapshot.controleExibicao || []
          },
          parsed.transmission
        );
        renderLista();
      }
      if ((_f = parsed.audioSources) == null ? void 0 : _f.length) {
        lastAudioSources = parsed.audioSources;
        pendingHostAudioSync = parsed.audioSources;
      }
      return;
    }
    trackClientDisplayNameChanges(snapshot.clients || parsed.peers || []);
    estado = enrichRoomSourcesState(
      {
        clients: snapshot.clients || parsed.peers || [],
        selecionado: snapshot.selecionado ? { ...snapshot.selecionado, selecionado: true } : null,
        controleExibicao: snapshot.controleExibicao || []
      },
      parsed.transmission
    );
    const me = estado.clients.find((c) => String(c.id) === String(hostPeerId));
    if (me) isCoHostInstance = !!me.isCoHost;
    if ((_g = parsed.audioSources) == null ? void 0 : _g.length) {
      lastAudioSources = parsed.audioSources;
    }
    renderLista();
    const applyVideo = force || shouldHostApplyActiveVideo(parsed.transmission);
    if (!applyVideo && !force && mediaKey && mediaKey === lastAppliedSnapshotKey) return;
    lastAppliedSnapshotKey = mediaKey;
    lastAppliedActiveVideoKey = activeKey;
    applyTransmission(parsed.transmission);
    await syncHostAudioMonitor(parsed.audioSources).catch(
      (e) => errors.handle(e, "audio-monitor")
    );
  }
  async function flushPendingRoomSnapshot() {
    if (!pendingRoomSnapshot || !hostReady) return;
    const snap = pendingRoomSnapshot;
    pendingRoomSnapshot = null;
    await applyRoomSnapshot(snap, { force: true });
  }
  async function iniciarCompartilhamentoHost() {
    try {
      assertSecureContext();
      saveCapturePrefs(getHostCapturePrefs());
      setStatus("Selecione a tela para compartilhar...");
      await media.ensureSendTransport();
      await media.startScreenShare(getHostCapturePrefs());
      const prefs = getHostCapturePrefs();
      if (prefs.microphone && !media.hasPublishedMicrophone()) {
        await applyHostMicPublishGain(loadHostMicPublishGain(getDefaultHostMicPublishGain()));
        await media.publishMicrophone(prefs);
      }
      signaling.send("status", { status: "transmitindo" });
      ui.set({ isSharing: true });
      updateHostMicUi();
      if (prefs.microphone && !media.hasPublishedMicrophone()) {
        showToast2("Marque Microfone no painel e conceda permissao ao navegador", "warn");
      }
      showToast2("Tela compartilhada neste painel", "success");
    } catch (e) {
      errors.handle(e, "compartilhar");
      updateHostMicUi();
    }
  }
  function updateRecordingUi(state) {
    const labels = {
      [RecordingState.IDLE]: "Pronto para gravar",
      [RecordingState.RECORDING]: "Gravando...",
      [RecordingState.FINALIZING]: "Finalizando...",
      [RecordingState.UPLOADING]: "Enviando gravacao...",
      [RecordingState.SAVED]: "Gravacao salva",
      [RecordingState.ERROR]: "Erro na gravacao"
    };
    if (els.recordingStatus) els.recordingStatus.textContent = labels[state] || state;
    ui.set({
      isRecording: state === RecordingState.RECORDING,
      isUploading: state === RecordingState.UPLOADING,
      isRecordingBusy: state === RecordingState.FINALIZING || state === RecordingState.UPLOADING
    });
    if (els.uploadProgressWrap) els.uploadProgressWrap.hidden = state !== RecordingState.UPLOADING;
    if (state === RecordingState.IDLE) {
      if (els.recordingTimer) els.recordingTimer.hidden = true;
    }
  }
  async function iniciarGravacao() {
    if (ui._flags.isRecording || ui._flags.isUploading || ui._flags.isRecordingBusy) return;
    try {
      const stream = await getRecordingStream();
      if (!stream) {
        if (els.recordingStatus) els.recordingStatus.textContent = "Nenhuma transmissao ativa para gravar";
        setStatus("Nenhuma transmissao ativa para gravar");
        showToast2("Nenhuma transmissao ativa para gravar", "warn");
        return;
      }
      const quality = mergeServerQuality(media.videoQuality, loadPresetId());
      const customDir = localStorage.getItem(STORAGE_RECORDINGS_DIR) || "";
      recorder.setHostToken(hostToken);
      await recorder.start(stream, quality, { customDir });
      showToast2("Gravacao iniciada", "info");
    } catch (e) {
      stopRecordingCapture();
      errors.handle(e, "gravacao");
    }
  }
  async function pararGravacao() {
    try {
      const stopResult = await recorder.stop();
      stopRecordingCapture();
      const pattern = localStorage.getItem(STORAGE_RECORDING_FILENAME_PATTERN) || "";
      const filename = formatRecordingFilename(/* @__PURE__ */ new Date(), pattern);
      if (!isValidRecordingFilename(filename)) {
        showToast2("Nome de arquivo invalido. Revise o padrao nas configuracoes.", "warn");
        recorder.resetIdle();
        return;
      }
      const customDir = localStorage.getItem(STORAGE_RECORDINGS_DIR) || "";
      if (stopResult == null ? void 0 : stopResult.streaming) {
        if (!recorder.bytesPersisted) {
          showToast2("Gravacao vazia", "warn");
          recorder.resetIdle();
          return;
        }
        const uploadResult2 = await recorder.finishStream(filename, customDir);
        if (els.recordingFilename) {
          els.recordingFilename.textContent = uploadResult2.filename || filename;
        }
        showToast2("Gravacao salva com sucesso", "success");
        setStatus(`Gravacao salva: ${uploadResult2.filename || filename}`);
        setTimeout(() => recorder.resetIdle(), 4e3);
        return;
      }
      if (!stopResult) {
        showToast2("Gravacao vazia", "warn");
        recorder.resetIdle();
        return;
      }
      const uploadResult = await recorder.upload(stopResult, filename, customDir);
      if (els.recordingFilename) {
        els.recordingFilename.textContent = uploadResult.filename || filename;
      }
      showToast2("Gravacao salva com sucesso", "success");
      setStatus(`Gravacao salva: ${uploadResult.filename || filename}`);
      setTimeout(() => recorder.resetIdle(), 4e3);
    } catch (e) {
      stopRecordingCapture();
      errors.handle(e, "upload");
      recorder.resetIdle();
    }
  }
  function applyVolumeFromSlider() {
    var _a47;
    const vol = Number(((_a47 = els.volumeSlider) == null ? void 0 : _a47.value) || 100) / 100;
    hostAudioMonitor == null ? void 0 : hostAudioMonitor.setMasterVolume(audioMuted ? 0 : vol);
    if (els.previewAudio) {
      els.previewAudio.volume = audioMuted ? 0 : vol;
      els.previewAudio.muted = !!audioMuted;
    }
  }
  function stopRecordingCapture() {
    var _a47;
    (_a47 = recordingCapture == null ? void 0 : recordingCapture.stop) == null ? void 0 : _a47.call(recordingCapture);
    recordingCapture = null;
  }
  function getActiveRecordingSelection() {
    var _a47, _b, _c, _d, _e, _f;
    if ((_a47 = estado.selecionado) == null ? void 0 : _a47.id) return estado.selecionado;
    const tx = normalizeTransmission(lastActiveTransmission || {});
    if (tx.selectedPeerId && hasActiveVideo(tx)) {
      const client = estado.clients.find((c) => String(c.id) === String(tx.selectedPeerId));
      return {
        ...client || {},
        id: tx.selectedPeerId,
        displayName: (client == null ? void 0 : client.displayName) || tx.peerName || "Fonte",
        isProducing: true,
        hasVideo: true,
        producerIds: tx.producerIds,
        producerId: ((_b = tx.producerIds) == null ? void 0 : _b.video) || tx.producerId || null,
        selecionado: true,
        pausado: tx.paused
      };
    }
    const previewStream = (_c = els.preview) == null ? void 0 : _c.srcObject;
    const previewTrack = previewStream instanceof MediaStream ? (_d = previewStream.getVideoTracks) == null ? void 0 : _d.call(previewStream).find((track) => track.readyState === "live") : null;
    if (!previewTrack || !ui._flags.hasPreview) return null;
    const localTrack = ((_f = (_e = media == null ? void 0 : media.localScreenStream) == null ? void 0 : _e.getVideoTracks) == null ? void 0 : _f.call(_e)[0]) || null;
    const isOwnPreview = !!localTrack && localTrack.readyState === "live" && localTrack.id === previewTrack.id;
    return {
      id: isOwnPreview && hostPeerId ? hostPeerId : "preview",
      displayName: isOwnPreview ? hostDisplayName || "Host" : "Fonte",
      isProducing: true,
      hasVideo: true,
      producerIds: { video: null },
      producerId: null,
      selecionado: true,
      pausado: false
    };
  }
  async function getRecordingStream() {
    var _a47, _b, _c, _d;
    const selected = getActiveRecordingSelection();
    const selectedPeerId = selected == null ? void 0 : selected.id;
    const own = hostPeerId && selectedPeerId && String(selectedPeerId) === String(hostPeerId);
    if (!selectedPeerId || (selected == null ? void 0 : selected.pausado)) return null;
    stopRecordingCapture();
    const compositor = RecordingCompositor.start({
      videoEl: els.preview,
      fallbackStream: own ? media == null ? void 0 : media.localScreenStream : null,
      getBadgeText: () => {
        var _a48;
        return ((_a48 = getActiveRecordingSelection()) == null ? void 0 : _a48.displayName) || "Fonte";
      },
      getBadgeVisible: () => {
        const active = getActiveRecordingSelection();
        return !!active && !active.pausado;
      }
    });
    const videoTrack = (_b = (_a47 = compositor == null ? void 0 : compositor.stream) == null ? void 0 : _a47.getVideoTracks) == null ? void 0 : _b.call(_a47)[0];
    if ((videoTrack == null ? void 0 : videoTrack.readyState) !== "live") {
      (_c = compositor == null ? void 0 : compositor.stop) == null ? void 0 : _c.call(compositor);
      return null;
    }
    let mixer = null;
    try {
      const recPrefs = getRecordingAudioPrefs();
      let restrictToPeerId = null;
      let ownForRec = own;
      let excludeOwnSystem = recPrefs.excludeOwnSystem;
      const defaultAudioName = getDefaultRecordingAudioClientName();
      if (defaultAudioName) {
        const defaultPeer = resolveRecordingAudioPeer(estado.clients, defaultAudioName);
        if (defaultPeer == null ? void 0 : defaultPeer.id) {
          restrictToPeerId = defaultPeer.id;
          ownForRec = false;
          excludeOwnSystem = true;
        } else {
          showToast2("Client padrao de gravacao indisponivel \u2014 usando mix normal", "warn");
        }
      } else if (recPrefs.selectedPeerOnly) {
        restrictToPeerId = selectedPeerId;
      }
      mixer = await RecordingAudioMixer.build({
        hostAudioMonitor,
        media,
        own: ownForRec,
        mutedClients,
        excludeOwnSystem,
        restrictToPeerId
      });
    } catch (err) {
      compositor.stop();
      throw err;
    }
    const tracks = [videoTrack];
    if (((_d = mixer == null ? void 0 : mixer.track) == null ? void 0 : _d.readyState) === "live") tracks.push(mixer.track);
    const stream = new MediaStream(tracks);
    recordingCapture = {
      stream,
      stop() {
        var _a48;
        compositor.stop();
        (_a48 = mixer == null ? void 0 : mixer.stop) == null ? void 0 : _a48.call(mixer);
      }
    };
    return stream;
  }
  function handleMessage(msg) {
    var _a47, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p;
    if (msg.type === "roomState") {
      debugClientSessionLog("H5", "host:handleMessage", "roomState", {
        version: (_a47 = msg.payload) == null ? void 0 : _a47.version,
        clients: (((_b = msg.payload) == null ? void 0 : _b.clients) || []).map((c) => {
          var _a48, _b2, _c2, _d2;
          return {
            id: (_a48 = c.id) == null ? void 0 : _a48.slice(0, 8),
            name: c.displayName,
            selectable: c.selectable,
            mediaReadyVideo: (_b2 = c.mediaReady) == null ? void 0 : _b2.video,
            hasVideo: c.hasVideo,
            producerVideo: ((_d2 = (_c2 = c.producerIds) == null ? void 0 : _c2.video) == null ? void 0 : _d2.slice(0, 8)) || null
          };
        })
      });
      applyRoomSnapshot(msg.payload, { force: true }).catch((e) => errors.handle(e, "room-state"));
      return;
    }
    if (msg.type === "estadoSala") {
      applyRoomSnapshot(msg.payload).catch((e) => errors.handle(e, "estado-sala"));
      return;
    }
    if (msg.type === "modoPonteMeetDefinido") {
      if (((_c = msg.payload) == null ? void 0 : _c.ativo) !== void 0) {
        applyMeetBridgeLiveModeFromRoom(msg.payload.ativo);
      }
      return;
    }
    if (msg.type === "clientesSilenciados") {
      const mutedIds = ((_d = msg.payload) == null ? void 0 : _d.mutedPeerIds) || [];
      mutedClients.clear();
      for (const id of mutedIds) {
        mutedClients.add(String(id));
      }
      applyClientAudioMute();
      renderLista();
      return;
    }
    if (msg.type === "anotacaoSegmento") {
      liveAnnotation == null ? void 0 : liveAnnotation.receive(msg.payload);
      return;
    }
    if (msg.type === "estado") {
      debugClientSessionLog("H5", "host:handleMessage", "estado", {
        clients: (((_e = msg.payload) == null ? void 0 : _e.clients) || []).map((c) => {
          var _a48, _b2, _c2, _d2;
          return {
            id: (_a48 = c.id) == null ? void 0 : _a48.slice(0, 8),
            name: c.displayName,
            selectable: c.selectable,
            mediaReadyVideo: (_b2 = c.mediaReady) == null ? void 0 : _b2.video,
            hasVideo: c.hasVideo,
            isProducing: c.isProducing,
            producerVideo: ((_d2 = (_c2 = c.producerIds) == null ? void 0 : _c2.video) == null ? void 0 : _d2.slice(0, 8)) || null
          };
        })
      });
      estado = enrichRoomSourcesState(
        {
          clients: msg.payload.clients || [],
          selecionado: msg.payload.selecionado ? { ...msg.payload.selecionado, selecionado: true } : null,
          controleExibicao: msg.payload.controleExibicao || []
        },
        lastActiveTransmission
      );
      const me = estado.clients.find((c) => String(c.id) === String(hostPeerId));
      if (me) {
        isCoHostInstance = !!me.isCoHost;
      }
      const videoProducers = (estado.clients || []).filter((c) => {
        var _a48;
        return c.hasVideo || c.isProducing || ((_a48 = c.producerIds) == null ? void 0 : _a48.video);
      }).map((c) => {
        var _a48, _b2, _c2, _d2;
        return {
          peerId: (_a48 = c.id) == null ? void 0 : _a48.slice(0, 8),
          producerId: ((_c2 = (_b2 = c.producerIds) == null ? void 0 : _b2.video) == null ? void 0 : _c2.slice(0, 8)) || ((_d2 = c.producerId) == null ? void 0 : _d2.slice(0, 8)) || null,
          name: c.displayName
        };
      });
      debugHostLog("H3", "[HOST_LIST] estado recebido", {
        totalClients: estado.clients.length,
        videoProducers
      });
      if (((_f = msg.payload) == null ? void 0 : _f.meetBridgeLiveMode) !== void 0) {
        applyMeetBridgeLiveModeFromRoom(msg.payload.meetBridgeLiveMode);
      }
      mergeLastAudioSourcesFromEstado(msg.payload || {});
      renderLista();
      syncHostAudioMonitor(((_h = (_g = msg.payload) == null ? void 0 : _g.audioSources) == null ? void 0 : _h.length) ? msg.payload.audioSources : null).catch(
        (e) => errors.handle(e, "audio-monitor")
      );
    }
    if (msg.type === "demovidoCoHost") {
      if (isCoHostInstance) {
        teardownCoHost();
        return;
      }
      window.location.href = `/client/?nome=${encodeURIComponent(hostDisplayName)}`;
    }
    if (msg.type === "fontesAudio") {
      const sources = ((_i = msg.payload) == null ? void 0 : _i.sources) || [];
      const forceMicSync = sources.some(
        (s) => (s.source || "microphone") === "microphone" && String(s.peerId || s.id) !== String(hostPeerId)
      );
      lastAudioSources = sources;
      if (fontesAudioDebounceTimer) clearTimeout(fontesAudioDebounceTimer);
      fontesAudioDebounceTimer = setTimeout(() => {
        fontesAudioDebounceTimer = null;
        syncHostAudioMonitor(sources, { force: forceMicSync }).catch(
          (e) => errors.handle(e, "audio-monitor")
        );
      }, 80);
      return;
    }
    if (msg.type === "consumerFechado") {
      const consumerId = (_j = msg.payload) == null ? void 0 : _j.consumerId;
      const wasVideoConsumer = ((_l = (_k = media == null ? void 0 : media.remoteConsumers) == null ? void 0 : _k.video) == null ? void 0 : _l.id) === consumerId;
      if (consumerId) {
        hostAudioMonitor == null ? void 0 : hostAudioMonitor.removeByConsumerId(consumerId).catch(() => {
        });
      }
      if (wasVideoConsumer) {
        media.remoteConsumers.video = null;
        media.currentActiveVideoProducerId = null;
        if (els.preview) els.preview.srcObject = null;
        lastAppliedSnapshotKey = "";
        lastAppliedActiveVideoKey = "";
        if (lastActiveTransmission && hasActiveVideo(lastActiveTransmission)) {
          applyTransmission(lastActiveTransmission);
        } else {
          hideLtOverlay();
          ui.set({ hasPreview: false });
          updatePreviewOverlays();
          setStatus("Nenhuma transmissao ativa");
        }
        lastAppliedAudioSig = "";
        syncHostAudioMonitor(null, { force: true }).catch(
          (e) => errors.handle(e, "audio-monitor")
        );
      } else {
        lastAppliedAudioSig = "";
        syncHostAudioMonitor(null, { force: true }).catch(
          (e) => errors.handle(e, "audio-monitor")
        );
      }
    }
    if (msg.type === "transmissaoAtiva") {
      const tx = normalizeTransmission(msg.payload);
      debugHostLog("H2", "[ACTIVE_VIDEO] evento de transmissao ativa recebido no host", {
        selectedPeerId: ((_m = tx.selectedPeerId) == null ? void 0 : _m.slice(0, 8)) || null,
        producerVideo: ((_o = (_n = tx.producerIds) == null ? void 0 : _n.video) == null ? void 0 : _o.slice(0, 8)) || null,
        activeKey: activeVideoTransmissionKey(tx),
        lastAppliedActiveVideoKey
      });
      if (!shouldHostApplyActiveVideo(msg.payload)) return;
      lastAppliedActiveVideoKey = activeVideoTransmissionKey(tx);
      lastAppliedSnapshotKey = roomSnapshotMediaKey({
        transmission: msg.payload,
        audioSources: lastAudioSources
      });
      applyTransmission(msg.payload);
      return;
    }
    if (msg.type === "erro") {
      const mensagem = ((_p = msg.payload) == null ? void 0 : _p.mensagem) || "";
      if (isTransientServerError(mensagem, { joinInProgress })) {
        log(mensagem || "Erro transitorio", "warn");
        return;
      }
      errors.handleServerMessage(mensagem, "servidor", { joinInProgress });
    }
  }
  function coHostHandleMessage(msg) {
    if (msg.type === "transmissaoAtiva") {
      applyTransmission(msg.payload);
      return;
    }
    handleMessage(msg);
  }
  function canHostCommand() {
    const ok = !!hostPeerId && !!hostReady && (signaling == null ? void 0 : signaling.connected) && (signaling == null ? void 0 : signaling.authenticated) && !joinInProgress;
    return ok;
  }
  function renderTechErrors() {
    const box = $("tech-errors");
    if (!box) return;
    const history = errors.getHistory().slice(0, 8);
    if (!history.length) {
      box.innerHTML = '<p class="hint-text">Nenhum erro recente.</p>';
      return;
    }
    box.innerHTML = "";
    for (const entry of history) {
      const details = document.createElement("details");
      details.className = "tech-error-item";
      const summary = document.createElement("summary");
      summary.textContent = entry.friendly;
      const pre = document.createElement("pre");
      pre.textContent = `[${entry.code}] ${entry.context}
${entry.technical}`;
      details.append(summary, pre);
      box.appendChild(details);
    }
  }
  async function joinHost({ autoShare = true } = {}) {
    const gen = ++joinGeneration;
    joinInProgress = true;
    hostPeerId = null;
    lastAppliedSnapshotKey = "";
    lastAppliedActiveVideoKey = "";
    pendingRoomSnapshot = null;
    signaling == null ? void 0 : signaling.markAuthenticated(false);
    updateHostMicUi();
    debugHostLog("F", "joinHost start", { gen, autoShare });
    try {
      await (hostAudioMonitor == null ? void 0 : hostAudioMonitor.dispose());
      hostAudioMonitor = null;
      await (media == null ? void 0 : media.dispose());
      media = null;
      const payload = {
        papel: "host",
        nome: hostDisplayName,
        pin: roomPin || void 0,
        hostToken: hostToken || void 0,
        isCoHost: !!isCoHostInstance
      };
      const entrouPromise = signaling.onceType("entrou");
      signaling.send("entrar", payload, { critical: true });
      const entrou = await entrouPromise;
      if (gen !== joinGeneration) return;
      hostPeerId = entrou.peerId;
      hostToken = entrou.hostToken || hostToken;
      signaling.markAuthenticated(true);
      debugHostLog("F", "joinHost entrou", { gen, hostPeerId });
      media = new MediaClient(signaling, {
        splitRecvTransports: true,
        applyHostMicPublishChain: true,
        onLog: log,
        onIceState: (state) => {
          if (state === "failed") showToast2("Problema na conexao de midia (ICE)", "error");
        }
      });
      const quality = mergeServerQuality(entrou.videoQuality, loadPresetId());
      await media.loadDevice(entrou.rtpCapabilities);
      if (gen !== joinGeneration) return;
      await media.ensureRecvTransport();
      await media.ensureRecvTransport(media._audioRecvTag());
      if (gen !== joinGeneration) return;
      media.setVideoQuality(quality);
      syncHostMicGainUi(loadHostMicPublishGain(Number(quality.hostMicPublishGain ?? 1.4)));
      recorder.setHostToken(hostToken);
      hostReady = true;
      ui.set({ wsConnected: true, wsWasConnected: true });
      setBadge("Online", "online");
      if (gen === joinGeneration) {
        joinInProgress = false;
        updateHostMicUi();
      }
      if (autoShare) {
        await iniciarCompartilhamentoHost();
      } else {
        setStatus("Conectado ao painel host");
        updateHostMicUi();
      }
      if (gen !== joinGeneration) return;
      const joinPrefs = getHostCapturePrefs();
      if (joinPrefs.microphone) {
        try {
          await media.ensureSendTransport();
          await loadHostMicPresetFromStorage();
          await media.publishMicrophone(joinPrefs);
          syncLocalHostVu();
        } catch (e) {
          errors.handle(e, "mic-join");
        }
      }
      signaling.send("solicitarEstado", {});
      await flushPendingRoomSnapshot();
      await flushPendingHostAudioSync();
      syncHostAudioMonitor().catch((e) => errors.handle(e, "audio-monitor"));
      signaling.send("definirQualidade", { presetId: loadPresetId() });
      startStatsPolling();
    } finally {
      if (gen === joinGeneration) {
        joinInProgress = false;
        updateHostMicUi();
      }
    }
  }
  function startStatsPolling() {
    clearInterval(statsTimer);
    statsTimer = setInterval(async () => {
      if (!media) return;
      const s = await collectWebRtcStats(media);
      if (els.statBitrate && s.bitrateKbps != null) els.statBitrate.textContent = `${s.bitrateKbps} kbps`;
      if (els.statLoss) els.statLoss.textContent = s.packetLoss != null ? `${s.packetLoss}%` : "-";
      if (els.statRtt) els.statRtt.textContent = s.rttMs != null ? `${s.rttMs} ms` : "-";
      if (els.statFps) els.statFps.textContent = s.fps != null ? String(s.fps) : "-";
    }, 3e3);
  }
  async function bootstrap() {
    if (!window.isSecureContext) {
      showToast2("Use HTTPS para captura de tela confiavel", "warn");
    }
    hostTabBlocked = !tryAcquireHostLock();
    if (hostTabBlocked) {
      debugHostLog("A", "duplicate host tab blocked", { lock: readHostLock() });
      setBadge("Aba duplicada", "error");
      setStatus("Ja existe outro painel host aberto neste navegador. Feche a outra aba.");
      showToast2("Feche a outra aba do painel host antes de continuar", "error");
      return;
    }
    hostLockTimer = setInterval(refreshHostLock, 2e3);
    window.addEventListener("beforeunload", () => {
      clearInterval(hostLockTimer);
      releaseHostLock();
    });
    const cohostParam = readQueryParam("cohost") === "true";
    const tokenParam = readQueryParam("token");
    const nomeParam = readQueryParam("nome");
    if (cohostParam && tokenParam) {
      hostToken = tokenParam;
      if (nomeParam) {
        hostDisplayName = nomeParam;
      } else {
        hostDisplayName = "Co-host";
      }
    } else {
      try {
        const info = await fetch("/api/info").then((r) => r.json());
        await promptHostEntry(!!info.roomPinRequired);
      } catch (_) {
        await promptHostEntry(false);
      }
    }
    signaling = new SignalingClient(wsUrl(), {
      onLog: (m, l) => log(m, l),
      onStateChange: (state) => {
        if (state === ConnectionState.RECONNECTING) {
          els.previewReconnecting.hidden = false;
          setBadge("Reconectando", "warn");
          ui.set({ wsConnected: false, wsWasConnected: true });
        }
        if (state === ConnectionState.CONNECTED) {
          els.previewReconnecting.hidden = true;
          setBadge("Online", "online");
          ui.set({ wsConnected: true, wsWasConnected: true });
        }
        if (state === ConnectionState.FAILED) {
          setBadge("Falha", "error");
        }
      },
      onOpen: async () => {
        if (hostTabBlocked) return;
        try {
          const isReconnect = hostSessionJoined;
          debugHostLog("B", "ws onOpen", { isReconnect });
          await joinHost({ autoShare: !isReconnect });
          hostSessionJoined = true;
          if (isReconnect) {
            setStatus("Reconectado ao painel host");
            showToast2("Reconectado ao servidor", "info");
          }
        } catch (e) {
          errors.handle(e, "join");
        }
      },
      onClose: (code, reason) => {
        const wasAuthenticated = signaling == null ? void 0 : signaling.authenticated;
        const hadPeer = !!hostPeerId;
        debugHostLog("C", "ws onClose", { code, reason, wasAuthenticated, hadPeer, joinInProgress });
        if (code === 4e3 && !wasAuthenticated && !hadPeer) {
          debugHostLog("G", "ignored stale 4000 during join", { code, reason });
          return;
        }
        joinGeneration += 1;
        joinInProgress = false;
        hostPeerId = null;
        hostReady = false;
        signaling == null ? void 0 : signaling.markAuthenticated(false);
        signaling == null ? void 0 : signaling.clearPending();
        if (code === 4e3 && (wasAuthenticated || hadPeer)) {
          signaling.enableReconnect = false;
          releaseHostLock();
          setBadge("Substituido", "error");
          setStatus(
            "Outro painel host assumiu esta sessao. Feche abas duplicadas ou use apenas uma URL do host."
          );
          showToast2("Painel host substituido - reconexao automatica desativada", "error");
          debugHostLog("A", "host replaced - reconnect disabled", { code, reason });
          return;
        }
        setStatus("Desconectado - reconectando...");
        ui.set({ wsConnected: false });
      }
    });
    signaling.addListener(handleMessage);
    signaling.connect();
  }
  var _a5;
  (_a5 = els.btnPausar) == null ? void 0 : _a5.addEventListener("click", async () => {
    if (!canHostCommand()) return;
    const resultPromise = signaling.onceType("pausaResultado");
    signaling.send("pausarTransmissao", {});
    const r = await resultPromise;
    if (!r.ok) errors.handle(new Error(r.erro), "pausar");
    else {
      ui.set({ isPaused: true, hasPreview: true });
      updatePreviewOverlays();
      showToast2("Transmissao pausada", "info");
    }
  });
  var _a6;
  (_a6 = els.btnRetomar) == null ? void 0 : _a6.addEventListener("click", async () => {
    if (!canHostCommand()) return;
    const resultPromise = signaling.onceType("retomadaResultado");
    signaling.send("retomarTransmissao", {});
    const r = await resultPromise;
    if (!r.ok) errors.handle(new Error(r.erro), "retomar");
    else {
      ui.set({ isPaused: false });
      showToast2("Transmissao retomada", "success");
    }
  });
  var _a7;
  (_a7 = els.btnLimpar) == null ? void 0 : _a7.addEventListener("click", async () => {
    if (!canHostCommand()) return;
    const resultPromise = signaling.onceType("limpezaResultado");
    signaling.send("limparTransmissao", {});
    await resultPromise;
    await (media == null ? void 0 : media.detachMedia({ videoEl: els.preview, audioEl: null }));
    syncHostAudioMonitor().catch(
      (e) => errors.handle(e, "audio-monitor")
    );
    estado.selecionado = null;
    ui.set({ hasSelection: false, hasPreview: false });
    renderLista();
  });
  var _a8;
  (_a8 = els.btnGravar) == null ? void 0 : _a8.addEventListener("click", () => iniciarGravacao());
  var _a9;
  (_a9 = els.btnPararGravar) == null ? void 0 : _a9.addEventListener("click", () => pararGravacao());
  var _a10;
  (_a10 = els.btnPlayPause) == null ? void 0 : _a10.addEventListener("click", () => {
    var _a47, _b;
    if (ui._flags.isPaused) {
      (_a47 = els.btnRetomar) == null ? void 0 : _a47.click();
    } else {
      (_b = els.btnPausar) == null ? void 0 : _b.click();
    }
  });
  var _a11;
  (_a11 = els.btnRecordingToggle) == null ? void 0 : _a11.addEventListener("click", () => {
    if (ui._flags.isRecording) {
      pararGravacao();
    } else {
      iniciarGravacao();
    }
  });
  var _a12;
  (_a12 = els.volumeSlider) == null ? void 0 : _a12.addEventListener("input", applyVolumeFromSlider);
  var _a13;
  (_a13 = els.btnMute) == null ? void 0 : _a13.addEventListener("click", () => {
    audioMuted = !audioMuted;
    applyVolumeFromSlider();
    updateMuteButtonIcon();
  });
  function updateMuteButtonIcon() {
    if (!els.btnMute) return;
    els.btnMute.title = audioMuted ? "Ativar audio" : "Silenciar audio";
    els.btnMute.innerHTML = audioMuted ? `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="1" x2="1" y2="23"></line></svg>` : `<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
  }
  function toggleSidebarCollapsed() {
    var _a47, _b, _c, _d, _e, _f;
    const collapsed = !((_a47 = els.sidebar) == null ? void 0 : _a47.classList.contains("is-collapsed"));
    (_b = els.sidebar) == null ? void 0 : _b.classList.toggle("is-collapsed", collapsed);
    (_c = els.appMain) == null ? void 0 : _c.classList.toggle("sidebar-collapsed", collapsed);
    (_d = els.btnSidebarCollapse) == null ? void 0 : _d.setAttribute("aria-expanded", String(!collapsed));
    (_e = els.btnSidebarCollapse) == null ? void 0 : _e.setAttribute(
      "aria-label",
      collapsed ? "Expandir painel" : "Recolher painel"
    );
    (_f = els.btnSidebarCollapse) == null ? void 0 : _f.setAttribute("title", collapsed ? "Expandir painel" : "Recolher painel");
  }
  var _a14;
  (_a14 = els.btnSidebarCollapse) == null ? void 0 : _a14.addEventListener("click", toggleSidebarCollapsed);
  var _a15;
  (_a15 = els.btnTech) == null ? void 0 : _a15.addEventListener("click", () => {
    const open = els.techDrawer.hidden;
    els.techDrawer.hidden = !open;
    if (open) renderTechErrors();
  });
  var _a16;
  (_a16 = els.btnCloseTech) == null ? void 0 : _a16.addEventListener("click", () => {
    els.techDrawer.hidden = true;
  });
  async function gerarLinkExterno(guestName) {
    const nome = String(guestName || "").trim();
    if (!nome) {
      showToast2("Informe o nome do convidado", "warn");
      return;
    }
    try {
      const res = await fetch("/api/link-externo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...hostToken ? { "X-Host-Token": hostToken } : {}
        },
        body: JSON.stringify({ nome })
      });
      let data = {};
      const raw = await res.text();
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          res.ok ? "Resposta invalida do servidor ao gerar link" : `Servidor indisponivel (${res.status}). Verifique se o ShareScreen foi reiniciado.`
        );
      }
      if (!res.ok) throw new Error(data.erro || `Falha ao gerar link externo (${res.status})`);
      if (!data.url) throw new Error("Servidor nao retornou o link externo");
      await navigator.clipboard.writeText(data.url);
      const hours = Math.round((data.expiresInMs || 0) / 36e5);
      showToast2(
        hours ? `Link de ${nome} copiado (valido por ~${hours}h)` : `Link de ${nome} copiado`,
        "success"
      );
    } catch (e) {
      if (e.name === "NotAllowedError") {
        showToast2("Permita acesso a area de transferencia para copiar o link", "warn");
      } else {
        errors.handle(e, "link-externo");
      }
    }
  }
  function copyUrl(path) {
    const url = `${location.origin}${path}`;
    navigator.clipboard.writeText(url).then(
      () => showToast2("Link copiado", "success"),
      () => showToast2(url, "info")
    );
  }
  var _a17;
  (_a17 = els.btnCopyClient) == null ? void 0 : _a17.addEventListener("click", () => copyUrl("/client"));
  var _a18;
  (_a18 = els.btnCopyHost) == null ? void 0 : _a18.addEventListener("click", () => copyUrl("/host"));
  function openExternalLinkModal() {
    var _a47;
    if (!canHostCommand()) {
      showToast2("Aguarde o painel conectar ao servidor", "warn");
      return;
    }
    if (els.externalGuestName) els.externalGuestName.value = "";
    if (els.externalLinkModal) els.externalLinkModal.hidden = false;
    (_a47 = els.externalGuestName) == null ? void 0 : _a47.focus();
  }
  function closeExternalLinkModal() {
    if (els.externalLinkModal) els.externalLinkModal.hidden = true;
  }
  async function submitExternalLink() {
    var _a47, _b;
    const nome = ((_a47 = els.externalGuestName) == null ? void 0 : _a47.value.trim()) || "";
    if (!nome) {
      showToast2("Informe o nome do convidado", "warn");
      (_b = els.externalGuestName) == null ? void 0 : _b.focus();
      return;
    }
    closeExternalLinkModal();
    await gerarLinkExterno(nome);
  }
  var _a19;
  (_a19 = els.btnExternalLink) == null ? void 0 : _a19.addEventListener("click", () => openExternalLinkModal());
  var _a20;
  (_a20 = els.btnExternalLinkSubmit) == null ? void 0 : _a20.addEventListener("click", () => submitExternalLink());
  var _a21;
  (_a21 = els.btnExternalLinkCancel) == null ? void 0 : _a21.addEventListener("click", () => closeExternalLinkModal());
  var _a22;
  (_a22 = els.externalGuestName) == null ? void 0 : _a22.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitExternalLink();
    }
  });
  var _a23;
  (_a23 = els.btnFullscreen) == null ? void 0 : _a23.addEventListener("click", () => {
    var _a47, _b;
    if (document.fullscreenElement) document.exitFullscreen();
    else (_b = (_a47 = els.previewArea) == null ? void 0 : _a47.requestFullscreen) == null ? void 0 : _b.call(_a47);
  });
  var _a24;
  (_a24 = els.btnFsSources) == null ? void 0 : _a24.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleFsSourceMenu();
  });
  document.addEventListener("fullscreenchange", syncFsSourceUi);
  document.addEventListener("click", (e) => {
    var _a47, _b, _c;
    if ((_a47 = els.fsSourceMenu) == null ? void 0 : _a47.hidden) return;
    if (e.target === els.btnFsSources || ((_b = els.btnFsSources) == null ? void 0 : _b.contains(e.target))) return;
    if ((_c = els.fsSourceMenu) == null ? void 0 : _c.contains(e.target)) return;
    closeFsSourceMenu();
  });
  var _a25;
  (_a25 = els.btnHostMic) == null ? void 0 : _a25.addEventListener("click", () => onHostMicClick());
  window.addEventListener("sharescreen-ended", async () => {
    var _a47;
    if (recorder.isRecording()) pararGravacao();
    try {
      await (media == null ? void 0 : media.stopVideoShare());
    } catch (_) {
    }
    ui.set({ isSharing: false });
    updateHostMicUi();
    signaling == null ? void 0 : signaling.send("status", {
      status: ((_a47 = media == null ? void 0 : media.hasPublishedMicrophone) == null ? void 0 : _a47.call(media)) ? "transmitindo" : "conectado"
    });
  });
  window.addEventListener("beforeunload", () => {
    clearInterval(hostLockTimer);
    releaseHostLock();
    localHostVuStop == null ? void 0 : localHostVuStop();
    stopRecordingCapture();
    hostAudioMonitor == null ? void 0 : hostAudioMonitor.dispose();
    media == null ? void 0 : media.dispose();
    signaling == null ? void 0 : signaling.close();
  });
  window.addEventListener("pagehide", () => {
    if (!recorder.isRecording() && !recorder.isStreaming()) return;
    const pattern = localStorage.getItem(STORAGE_RECORDING_FILENAME_PATTERN) || "";
    const filename = formatRecordingFilename(/* @__PURE__ */ new Date(), pattern);
    recorder.prepareIncompleteFinish(filename);
  });
  var currentPickerPath = "";
  async function loadDir(pathValue) {
    const listEl = document.getElementById("dir-picker-list");
    const pathEl = document.getElementById("dir-picker-current-path");
    if (!listEl || !pathEl) return;
    listEl.innerHTML = '<div style="padding: 10px; color: var(--color-text-muted);">Carregando...</div>';
    pathEl.textContent = pathValue || "Aguarde...";
    try {
      const res = await fetch("/api/browse-dir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...hostToken ? { "X-Host-Token": hostToken } : {}
        },
        body: JSON.stringify({ path: pathValue })
      });
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        listEl.innerHTML = '<div style="padding: 10px; color: var(--color-danger);">Rota /api/browse-dir indispon\xEDvel no proxy. Atualize o NGINX ou acesse o host diretamente.</div>';
        return;
      }
      const data = await res.json();
      if (!data.ok) {
        listEl.innerHTML = `<div style="padding: 10px; color: var(--color-danger);">${data.erro || "Erro ao listar"}</div>`;
        return;
      }
      currentPickerPath = data.currentPath;
      pathEl.textContent = currentPickerPath;
      listEl.innerHTML = "";
      const upBtn = document.getElementById("btn-dir-picker-up");
      if (upBtn) {
        upBtn.disabled = !data.parent;
        upBtn.onclick = () => {
          if (data.parent) loadDir(data.parent);
        };
      }
      if (data.dirs.length === 0) {
        listEl.innerHTML = '<div style="padding: 10px; color: var(--color-text-muted);">Pasta vazia</div>';
        return;
      }
      data.dirs.forEach((dirName) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-ghost";
        btn.style.width = "100%";
        btn.style.textAlign = "left";
        btn.style.padding = "0.4rem 0.6rem";
        btn.style.fontSize = "0.9rem";
        btn.style.justifyContent = "flex-start";
        btn.style.display = "flex";
        btn.style.alignItems = "center";
        btn.style.gap = "var(--space-xs)";
        btn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="flex-shrink: 0;"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${dirName}</span>
      `;
        btn.addEventListener("click", () => {
          const separator = currentPickerPath.includes("/") ? "/" : "\\";
          const newPath = currentPickerPath.endsWith(separator) ? `${currentPickerPath}${dirName}` : `${currentPickerPath}${separator}${dirName}`;
          loadDir(newPath);
        });
        listEl.appendChild(btn);
      });
    } catch (e) {
      listEl.innerHTML = `<div style="padding: 10px; color: var(--color-danger);">${e.message}</div>`;
    }
  }
  function syncMeetBridgeLiveUi() {
    if (els.chkMeetBridgeLive) {
      els.chkMeetBridgeLive.checked = meetBridgeLiveMode;
    }
    const recPrefs = getRecordingAudioPrefs();
    if (els.recMeetBridgeHint) {
      els.recMeetBridgeHint.hidden = !(recPrefs.excludeOwnSystem || recPrefs.selectedPeerOnly || meetBridgeLiveMode);
    }
  }
  function applyMeetBridgeLiveModeFromRoom(ativo) {
    meetBridgeLiveMode = !!ativo;
    syncMeetBridgeLiveUi();
  }
  function sendMeetBridgeLiveMode(ativo) {
    meetBridgeLiveMode = !!ativo;
    syncMeetBridgeLiveUi();
    if (signaling && hostReady) {
      signaling.send("definirModoPonteMeet", { ativo: meetBridgeLiveMode });
    }
  }
  function getRecordingAudioPrefs() {
    return {
      excludeOwnSystem: localStorage.getItem(STORAGE_REC_EXCLUDE_OWN_SYSTEM) === "1",
      selectedPeerOnly: localStorage.getItem(STORAGE_REC_SELECTED_PEER_ONLY) === "1"
    };
  }
  function syncRecordingAudioPrefsUi() {
    const prefs = getRecordingAudioPrefs();
    if (els.recExcludeOwnSystem) {
      els.recExcludeOwnSystem.checked = prefs.excludeOwnSystem;
    }
    if (els.recSelectedPeerOnly) {
      els.recSelectedPeerOnly.checked = prefs.selectedPeerOnly;
    }
    syncMeetBridgeLiveUi();
  }
  function setRecordingAudioPref(key, value) {
    localStorage.setItem(key, value ? "1" : "0");
    syncRecordingAudioPrefsUi();
  }
  function setupRecordingAudioPrefs() {
    var _a47, _b, _c, _d, _e;
    syncRecordingAudioPrefsUi();
    syncRecordingDefaultAudioClientUi();
    (_a47 = els.recExcludeOwnSystem) == null ? void 0 : _a47.addEventListener("change", () => {
      setRecordingAudioPref(STORAGE_REC_EXCLUDE_OWN_SYSTEM, els.recExcludeOwnSystem.checked);
    });
    (_b = els.recSelectedPeerOnly) == null ? void 0 : _b.addEventListener("change", () => {
      setRecordingAudioPref(STORAGE_REC_SELECTED_PEER_ONLY, els.recSelectedPeerOnly.checked);
    });
    (_c = els.chkMeetBridgeLive) == null ? void 0 : _c.addEventListener("change", () => {
      sendMeetBridgeLiveMode(!!els.chkMeetBridgeLive.checked);
    });
    (_d = els.btnRecMeetBridgePreset) == null ? void 0 : _d.addEventListener("click", () => {
      setRecordingAudioPref(STORAGE_REC_EXCLUDE_OWN_SYSTEM, true);
      setRecordingAudioPref(STORAGE_REC_SELECTED_PEER_ONLY, true);
      if (els.recExcludeOwnSystem) els.recExcludeOwnSystem.checked = true;
      if (els.recSelectedPeerOnly) els.recSelectedPeerOnly.checked = true;
      sendMeetBridgeLiveMode(true);
    });
    (_e = els.btnRecClearDefaultAudio) == null ? void 0 : _e.addEventListener("click", () => {
      setDefaultRecordingAudioClientName("");
      showToast2("\xC1udio padr\xE3o da grava\xE7\xE3o removido", "info");
      renderLista();
    });
  }
  var recordingFilenamePatternReady = false;
  function updateRecordingFilenamePatternStatus(pattern = "") {
    if (!els.recordingFilenamePatternStatus) return;
    const trimmed = String(pattern).trim();
    if (!trimmed) {
      els.recordingFilenamePatternStatus.textContent = `Padrao salvo: ${formatRecordingFilename(/* @__PURE__ */ new Date())}`;
    } else {
      els.recordingFilenamePatternStatus.textContent = `Padrao salvo. Exemplo: ${formatRecordingFilename(/* @__PURE__ */ new Date(), trimmed)}`;
    }
    els.recordingFilenamePatternStatus.hidden = false;
  }
  function saveRecordingFilenamePattern() {
    var _a47;
    const pattern = ((_a47 = els.recordingFilenamePatternInput) == null ? void 0 : _a47.value.trim()) || "";
    if (pattern) {
      localStorage.setItem(STORAGE_RECORDING_FILENAME_PATTERN, pattern);
    } else {
      localStorage.removeItem(STORAGE_RECORDING_FILENAME_PATTERN);
    }
    updateRecordingFilenamePatternStatus(pattern);
    showToast2(pattern ? "Padrao de nome salvo" : "Padrao de nome restaurado ao padrao do sistema", "success");
  }
  function setupRecordingFilenamePattern() {
    var _a47;
    if (!els.recordingFilenamePatternInput || recordingFilenamePatternReady) return;
    recordingFilenamePatternReady = true;
    const saved = localStorage.getItem(STORAGE_RECORDING_FILENAME_PATTERN) || "";
    els.recordingFilenamePatternInput.value = saved;
    if (saved) updateRecordingFilenamePatternStatus(saved);
    (_a47 = els.btnSaveFilenamePattern) == null ? void 0 : _a47.addEventListener("click", (e) => {
      e.stopPropagation();
      saveRecordingFilenamePattern();
    });
    els.recordingFilenamePatternInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveRecordingFilenamePattern();
      }
    });
  }
  function setupRecordingsDirInput() {
    var _a47, _b;
    if (!els.recordingsDirInput) return;
    els.recordingsDirInput.value = localStorage.getItem(STORAGE_RECORDINGS_DIR) || "";
    els.recordingsDirInput.addEventListener("input", () => {
      localStorage.setItem(STORAGE_RECORDINGS_DIR, els.recordingsDirInput.value.trim());
    });
    const btnBrowse = document.getElementById("btn-browse-dir");
    const pickerModal = document.getElementById("dir-picker-modal");
    btnBrowse == null ? void 0 : btnBrowse.addEventListener("click", () => {
      if (pickerModal) pickerModal.hidden = false;
      loadDir(els.recordingsDirInput.value.trim());
    });
    (_a47 = document.getElementById("btn-dir-picker-cancel")) == null ? void 0 : _a47.addEventListener("click", () => {
      if (pickerModal) pickerModal.hidden = true;
    });
    (_b = document.getElementById("btn-dir-picker-select")) == null ? void 0 : _b.addEventListener("click", () => {
      if (els.recordingsDirInput && currentPickerPath) {
        els.recordingsDirInput.value = currentPickerPath;
        localStorage.setItem(STORAGE_RECORDINGS_DIR, currentPickerPath);
      }
      if (pickerModal) pickerModal.hidden = true;
    });
  }
  function setupSettingsInteraction() {
    const subdetails = document.querySelectorAll(".settings-subdetails");
    subdetails.forEach((details) => {
      details.addEventListener("toggle", () => {
        if (details.open) {
          subdetails.forEach((other) => {
            if (other !== details && other.open) {
              other.removeAttribute("open");
            }
          });
        }
      });
    });
    const settingsSection = document.getElementById("settings-details");
    document.addEventListener("click", (e) => {
      if (settingsSection && settingsSection.open && !settingsSection.contains(e.target)) {
        settingsSection.removeAttribute("open");
      }
    });
  }
  var isHost = window.location.pathname.includes("/host") || !!document.getElementById("host-entry-modal");
  var _a26;
  if (isHost) {
    if (els.sidebar) els.sidebar.hidden = false;
    (_a26 = els.appMain) == null ? void 0 : _a26.classList.add("sidebar-open");
    updateRecordingUi(RecordingState.IDLE);
    updateMuteButtonIcon();
    setupRecordingsDirInput();
    setupRecordingFilenamePattern();
    setupRecordingAudioPrefs();
    setupSettingsInteraction();
    installAudioUnlock(() => {
      var _a47, _b, _c;
      hostAudioMonitor == null ? void 0 : hostAudioMonitor.resume();
      (_b = (_a47 = els.previewAudio) == null ? void 0 : _a47.play) == null ? void 0 : _b.call(_a47).catch(() => {
      });
      if (hostAudioMonitor && !((_c = hostAudioMonitor.isAutoplayBlocked) == null ? void 0 : _c.call(hostAudioMonitor))) {
        hostMicAutoplayNeeded = false;
        updateHostMicUi();
      }
    });
  }
  var activeContextClient = null;
  var activeAudioFiltersClient = null;
  bindLtOverlayResize(els.previewArea);
  var liveAnnotation = createLiveAnnotation({
    previewArea: els.previewArea,
    videoEl: els.preview,
    canvasEl: els.drawCanvas,
    btnDraw: els.btnDraw,
    btnRect: els.btnRect,
    drawStack: els.drawStack,
    getPeerId: () => hostPeerId,
    getPeerName: () => hostDisplayName || "Host",
    onSegment: (payload) => {
      if (signaling == null ? void 0 : signaling.connected) signaling.send("anotacaoSegmento", payload);
    }
  });
  function applyLtOverlayForTransmission(_tx) {
    hideLtOverlay();
  }
  function openContextMenu(e, client) {
    activeContextClient = client;
    const menu = $("custom-context-menu");
    if (!menu) return;
    const isHostCard = !!client.ehHost;
    const isCoHost = !!client.isCoHost;
    const isTrocaTelas = (estado.controleExibicao || []).includes(client.id);
    const cohostBtn = $("ctx-cohost");
    const trocaTelasBtn = $("ctx-troca-telas");
    if (cohostBtn) {
      cohostBtn.hidden = isHostCard;
      if (!isHostCard) cohostBtn.classList.toggle("is-active", isCoHost);
    }
    if (trocaTelasBtn) {
      trocaTelasBtn.hidden = isHostCard;
      if (!isHostCard) trocaTelasBtn.classList.toggle("is-active", isTrocaTelas);
    }
    const audioBtn = $("ctx-audio");
    if (audioBtn) audioBtn.hidden = isHostCard;
    const recAudioBtn = $("ctx-rec-audio");
    if (recAudioBtn) {
      recAudioBtn.hidden = isHostCard || !client.hasAudio;
      const isDefault = !!(client.displayName && getDefaultRecordingAudioClientName().toLowerCase() === String(client.displayName).toLowerCase());
      recAudioBtn.classList.toggle("is-active", isDefault);
      const textEl = recAudioBtn.querySelector(".ctx-text");
      if (textEl) {
        textEl.textContent = isDefault ? "Remover \xE1udio padr\xE3o da grava\xE7\xE3o" : "Definir como \xE1udio padr\xE3o da grava\xE7\xE3o";
      }
    }
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    menu.hidden = false;
  }
  function closeContextMenu() {
    const menu = $("custom-context-menu");
    if (menu) menu.hidden = true;
    activeContextClient = null;
  }
  var _a27;
  (_a27 = $("ctx-cohost")) == null ? void 0 : _a27.addEventListener("click", () => {
    if (!activeContextClient) return;
    const targetState = !activeContextClient.isCoHost;
    signaling.send("definirCoHost", { peerId: activeContextClient.id, ativo: targetState });
    closeContextMenu();
  });
  var _a28;
  (_a28 = $("ctx-troca-telas")) == null ? void 0 : _a28.addEventListener("click", () => {
    if (!activeContextClient) return;
    const isTrocaTelas = (estado.controleExibicao || []).includes(activeContextClient.id);
    toggleDisplayControl(activeContextClient.id, !isTrocaTelas);
    closeContextMenu();
  });
  var originalAudioFilterPrefs = null;
  var saveTimeout = null;
  var sentAudioFilterKeys = /* @__PURE__ */ new Map();
  function saveAudioFiltersPresetDebounced(name, prefs, kind = "client") {
    if (saveTimeout) clearTimeout(saveTimeout);
    const normalized = normalizeMicrophoneFilterPrefs(prefs);
    saveTimeout = setTimeout(() => {
      savePresetToLocalStorage(name, normalized);
      saveAudioFilterPresetApi(kind, name, normalized).catch(() => {
      });
    }, 1e3);
  }
  function normalizeAudioFilterPrefsForClient(prefs = {}) {
    return {
      gain: Number(prefs.gain !== void 0 ? prefs.gain : 1),
      bass: Number(prefs.bass || 0),
      treble: Number(prefs.treble || 0),
      highpass: !!prefs.highpass,
      highpassFreq: Number(prefs.highpassFreq || 80),
      peaking: !!prefs.peaking,
      peakingFreq: Number(prefs.peakingFreq || 3e3),
      peakingGain: Number(prefs.peakingGain !== void 0 ? prefs.peakingGain : 3),
      compressor: !!prefs.compressor,
      noiseGate: !!prefs.noiseGate,
      noiseGateThreshold: Number(prefs.noiseGateThreshold !== void 0 ? prefs.noiseGateThreshold : -45),
      micSensitivity: !!prefs.micSensitivity,
      micCaptureDistance: Number(prefs.micCaptureDistance || 6)
    };
  }
  function sendAudioFiltersToClient(client, prefs, { force = false } = {}) {
    if (!(client == null ? void 0 : client.id) || !signaling || !hostReady) return;
    if (String(client.id) === String(hostPeerId)) return;
    const normalized = normalizeAudioFilterPrefsForClient(prefs);
    const key = JSON.stringify(normalized);
    const id = String(client.id);
    if (!force && sentAudioFilterKeys.get(id) === key) return;
    sentAudioFilterKeys.set(id, key);
    signaling.send("definirFiltroAudioClient", { peerId: client.id, prefs: normalized });
  }
  function syncPublishedAudioFiltersToClients(audioSources = []) {
    return syncPublishedAudioFiltersToClientsAsync(audioSources);
  }
  async function syncPublishedAudioFiltersToClientsAsync(audioSources = []) {
    var _a47, _b;
    const monitor = hostAudioMonitor;
    if (!monitor) return;
    const sent = /* @__PURE__ */ new Set();
    for (const source of audioSources || []) {
      if (!(source == null ? void 0 : source.peerId) || source.source !== "microphone") continue;
      const id = String(source.peerId);
      if (sent.has(id)) continue;
      sent.add(id);
      const client = estado.clients.find((c) => String(c.id) === id);
      const displayName = (client == null ? void 0 : client.displayName) || source.name || ((_b = (_a47 = monitor.peerNames) == null ? void 0 : _a47.get) == null ? void 0 : _b.call(_a47, id)) || "";
      let stored = normalizeMicrophoneFilterPrefs(monitor.getFilterPrefs(id));
      if (displayName) {
        const apiPreset = await fetchAudioFilterPresetApi("client", displayName);
        if (apiPreset == null ? void 0 : apiPreset.prefs) {
          stored = normalizeMicrophoneFilterPrefs(apiPreset.prefs);
          monitor.setFilterPrefs(id, stored);
        } else if (hasActiveMicrophoneFilter(stored)) {
          saveAudioFilterPresetApi("client", displayName, stored).catch(() => {
          });
        }
      }
      const prefs = hasActiveMicrophoneFilter(stored) ? stored : normalizeMicrophoneFilterPrefs(CLIENT_MIC_PUBLISH_DEFAULTS);
      if (!hasActiveMicrophoneFilter(stored)) {
        monitor.setFilterPrefs(id, prefs);
      }
      sendAudioFiltersToClient({ id }, prefs);
    }
  }
  function getAppliedClientAudioFilterPrefs(peerId) {
    const id = String(peerId);
    const sentKey = sentAudioFilterKeys.get(id);
    if (sentKey) {
      try {
        return normalizeMicrophoneFilterPrefs(JSON.parse(sentKey));
      } catch {
      }
    }
    const monitor = hostAudioMonitor;
    if (monitor) {
      return normalizeMicrophoneFilterPrefs(monitor.getFilterPrefs(id));
    }
    return normalizeMicrophoneFilterPrefs(CLIENT_MIC_PUBLISH_DEFAULTS);
  }
  function populateAudioFiltersUi(prefs) {
    const gainInput = $("audio-gain");
    if (gainInput) {
      gainInput.value = prefs.gain !== void 0 ? prefs.gain : 1;
      const gainVal = $("audio-gain-val");
      if (gainVal) gainVal.textContent = `${Number(gainInput.value).toFixed(1)}x`;
    }
    const bassInput = $("audio-bass");
    if (bassInput) {
      bassInput.value = prefs.bass !== void 0 ? prefs.bass : 0;
      const bassVal = $("audio-bass-val");
      if (bassVal) bassVal.textContent = `${bassInput.value} dB`;
    }
    const trebleInput = $("audio-treble");
    if (trebleInput) {
      trebleInput.value = prefs.treble !== void 0 ? prefs.treble : 0;
      const trebleVal = $("audio-treble-val");
      if (trebleVal) trebleVal.textContent = `${trebleInput.value} dB`;
    }
    const hpEnabled = $("audio-hp-enabled");
    if (hpEnabled) hpEnabled.checked = !!prefs.highpass;
    const peakEnabled = $("audio-peak-enabled");
    if (peakEnabled) peakEnabled.checked = !!prefs.peaking;
    const compEnabled = $("audio-comp-enabled");
    if (compEnabled) compEnabled.checked = !!prefs.compressor;
    const gateEnabled = $("audio-gate-enabled");
    if (gateEnabled) gateEnabled.checked = !!prefs.noiseGate;
    const sensitivityEnabled = $("audio-sensitivity-enabled");
    if (sensitivityEnabled) sensitivityEnabled.checked = !!prefs.micSensitivity;
    const hpFreq = $("audio-hp-frequency");
    if (hpFreq) {
      hpFreq.value = prefs.highpassFreq || 80;
      const hpFreqVal = $("audio-hp-freq-val");
      if (hpFreqVal) hpFreqVal.textContent = `${hpFreq.value} Hz`;
    }
    const peakFreq = $("audio-peak-frequency");
    if (peakFreq) {
      peakFreq.value = prefs.peakingFreq || 3e3;
      const peakFreqVal = $("audio-peak-freq-val");
      if (peakFreqVal) peakFreqVal.textContent = `${peakFreq.value} Hz`;
    }
    const peakGain = $("audio-peak-gain");
    if (peakGain) {
      peakGain.value = prefs.peakingGain !== void 0 ? prefs.peakingGain : 3;
      const peakGainVal = $("audio-peak-gain-val");
      if (peakGainVal) peakGainVal.textContent = `${peakGain.value} dB`;
    }
    const gateThresh = $("audio-gate-threshold");
    if (gateThresh) {
      gateThresh.value = prefs.noiseGateThreshold !== void 0 ? prefs.noiseGateThreshold : -45;
      const gateThreshVal = $("audio-gate-thresh-val");
      if (gateThreshVal) gateThreshVal.textContent = `${gateThresh.value} dB`;
    }
    const captureDistance = $("audio-capture-distance");
    if (captureDistance) {
      captureDistance.value = prefs.micCaptureDistance !== void 0 ? prefs.micCaptureDistance : 6;
      const captureDistanceVal = $("audio-capture-distance-val");
      if (captureDistanceVal) captureDistanceVal.textContent = `${captureDistance.value}/10`;
    }
  }
  function readAudioFilterPrefsFromUi() {
    var _a47, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n;
    return {
      gain: Number(((_a47 = $("audio-gain")) == null ? void 0 : _a47.value) !== void 0 ? (_b = $("audio-gain")) == null ? void 0 : _b.value : 1),
      bass: Number(((_c = $("audio-bass")) == null ? void 0 : _c.value) || 0),
      treble: Number(((_d = $("audio-treble")) == null ? void 0 : _d.value) || 0),
      highpass: !!((_e = $("audio-hp-enabled")) == null ? void 0 : _e.checked),
      highpassFreq: Number(((_f = $("audio-hp-frequency")) == null ? void 0 : _f.value) || 80),
      peaking: !!((_g = $("audio-peak-enabled")) == null ? void 0 : _g.checked),
      peakingFreq: Number(((_h = $("audio-peak-frequency")) == null ? void 0 : _h.value) || 3e3),
      peakingGain: Number(((_i = $("audio-peak-gain")) == null ? void 0 : _i.value) || 3),
      compressor: !!((_j = $("audio-comp-enabled")) == null ? void 0 : _j.checked),
      noiseGate: !!((_k = $("audio-gate-enabled")) == null ? void 0 : _k.checked),
      noiseGateThreshold: Number(((_l = $("audio-gate-threshold")) == null ? void 0 : _l.value) || -45),
      micSensitivity: !!((_m = $("audio-sensitivity-enabled")) == null ? void 0 : _m.checked),
      micCaptureDistance: Number(((_n = $("audio-capture-distance")) == null ? void 0 : _n.value) || 6)
    };
  }
  function previewAudioFiltersFromUi() {
    const client = activeAudioFiltersClient;
    const monitor = hostAudioMonitor;
    if (!client || !monitor) return;
    const prefs = readAudioFilterPrefsFromUi();
    monitor.setFilterPrefs(client.id, prefs);
    sendAudioFiltersToClient(client, prefs, { force: true });
  }
  function openAudioFiltersModal(client) {
    if (!client) return;
    activeAudioFiltersClient = client;
    const monitor = hostAudioMonitor;
    if (!monitor) {
      showToast2("Monitor de audio nao inicializado", "warn");
      return;
    }
    const prefs = getAppliedClientAudioFilterPrefs(client.id);
    originalAudioFilterPrefs = { ...prefs };
    const nameEl = $("audio-filters-client-name");
    if (nameEl) nameEl.textContent = client.displayName || "-";
    populateAudioFiltersUi(prefs);
    const modal = $("audio-filters-modal");
    if (modal) modal.hidden = false;
  }
  function saveAudioFiltersModal() {
    const client = activeAudioFiltersClient;
    if (!client) return;
    const prefs = normalizeMicrophoneFilterPrefs(readAudioFilterPrefsFromUi());
    previewAudioFiltersFromUi();
    savePresetToLocalStorage(client.displayName, prefs);
    saveAudioFilterPresetApi("client", client.displayName, prefs).catch(() => {
    });
    showToast2(`Filtros de audio atualizados para ${client.displayName}`, "success");
    closeAudioFiltersModal(false);
  }
  function closeAudioFiltersModal(revert = false) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    const modal = $("audio-filters-modal");
    if (modal) modal.hidden = true;
    const client = activeAudioFiltersClient;
    const monitor = hostAudioMonitor;
    if (revert && client && monitor && originalAudioFilterPrefs) {
      monitor.setFilterPrefs(client.id, originalAudioFilterPrefs);
      sendAudioFiltersToClient(client, originalAudioFilterPrefs, { force: true });
    }
    activeAudioFiltersClient = null;
    originalAudioFilterPrefs = null;
  }
  var _a29;
  (_a29 = $("audio-gain")) == null ? void 0 : _a29.addEventListener("input", (e) => {
    const el = $("audio-gain-val");
    if (el) el.textContent = `${Number(e.target.value).toFixed(1)}x`;
    previewAudioFiltersFromUi();
  });
  var _a30;
  (_a30 = $("audio-bass")) == null ? void 0 : _a30.addEventListener("input", (e) => {
    const el = $("audio-bass-val");
    if (el) el.textContent = `${e.target.value} dB`;
    previewAudioFiltersFromUi();
  });
  var _a31;
  (_a31 = $("audio-treble")) == null ? void 0 : _a31.addEventListener("input", (e) => {
    const el = $("audio-treble-val");
    if (el) el.textContent = `${e.target.value} dB`;
    previewAudioFiltersFromUi();
  });
  var _a32;
  (_a32 = $("audio-hp-enabled")) == null ? void 0 : _a32.addEventListener("change", previewAudioFiltersFromUi);
  var _a33;
  (_a33 = $("audio-hp-frequency")) == null ? void 0 : _a33.addEventListener("input", (e) => {
    const el = $("audio-hp-freq-val");
    if (el) el.textContent = `${e.target.value} Hz`;
    previewAudioFiltersFromUi();
  });
  var _a34;
  (_a34 = $("audio-peak-enabled")) == null ? void 0 : _a34.addEventListener("change", previewAudioFiltersFromUi);
  var _a35;
  (_a35 = $("audio-peak-frequency")) == null ? void 0 : _a35.addEventListener("input", (e) => {
    const el = $("audio-peak-freq-val");
    if (el) el.textContent = `${e.target.value} Hz`;
    previewAudioFiltersFromUi();
  });
  var _a36;
  (_a36 = $("audio-peak-gain")) == null ? void 0 : _a36.addEventListener("input", (e) => {
    const el = $("audio-peak-gain-val");
    if (el) el.textContent = `${e.target.value} dB`;
    previewAudioFiltersFromUi();
  });
  var _a37;
  (_a37 = $("audio-comp-enabled")) == null ? void 0 : _a37.addEventListener("change", previewAudioFiltersFromUi);
  var _a38;
  (_a38 = $("audio-sensitivity-enabled")) == null ? void 0 : _a38.addEventListener("change", previewAudioFiltersFromUi);
  var _a39;
  (_a39 = $("audio-gate-enabled")) == null ? void 0 : _a39.addEventListener("change", previewAudioFiltersFromUi);
  var _a40;
  (_a40 = $("audio-gate-threshold")) == null ? void 0 : _a40.addEventListener("input", (e) => {
    const el = $("audio-gate-thresh-val");
    if (el) el.textContent = `${e.target.value} dB`;
    previewAudioFiltersFromUi();
  });
  var _a41;
  (_a41 = $("audio-capture-distance")) == null ? void 0 : _a41.addEventListener("input", (e) => {
    const el = $("audio-capture-distance-val");
    if (el) el.textContent = `${e.target.value}/10`;
    previewAudioFiltersFromUi();
  });
  var _a42;
  (_a42 = $("btn-audio-filters-reset")) == null ? void 0 : _a42.addEventListener("click", () => {
    const client = activeAudioFiltersClient;
    if (!client) return;
    const gain = $("audio-gain");
    if (gain) gain.value = 1;
    const gainVal = $("audio-gain-val");
    if (gainVal) gainVal.textContent = "1.0x";
    const bass = $("audio-bass");
    if (bass) bass.value = 0;
    const bassVal = $("audio-bass-val");
    if (bassVal) bassVal.textContent = "0 dB";
    const treble = $("audio-treble");
    if (treble) treble.value = 0;
    const trebleVal = $("audio-treble-val");
    if (trebleVal) trebleVal.textContent = "0 dB";
    const hp = $("audio-hp-enabled");
    if (hp) hp.checked = false;
    const hpFreq = $("audio-hp-frequency");
    if (hpFreq) hpFreq.value = 80;
    const hpFreqVal = $("audio-hp-freq-val");
    if (hpFreqVal) hpFreqVal.textContent = "80 Hz";
    const peak = $("audio-peak-enabled");
    if (peak) peak.checked = false;
    const peakFreq = $("audio-peak-frequency");
    if (peakFreq) peakFreq.value = 3e3;
    const peakFreqVal = $("audio-peak-freq-val");
    if (peakFreqVal) peakFreqVal.textContent = "3000 Hz";
    const peakGain = $("audio-peak-gain");
    if (peakGain) peakGain.value = 3;
    const peakGainVal = $("audio-peak-gain-val");
    if (peakGainVal) peakGainVal.textContent = "3 dB";
    const comp = $("audio-comp-enabled");
    if (comp) comp.checked = false;
    const sensitivity = $("audio-sensitivity-enabled");
    if (sensitivity) sensitivity.checked = false;
    const gate = $("audio-gate-enabled");
    if (gate) gate.checked = false;
    const gateThresh = $("audio-gate-threshold");
    if (gateThresh) gateThresh.value = -45;
    const gateThreshVal = $("audio-gate-thresh-val");
    if (gateThreshVal) gateThreshVal.textContent = "-45 dB";
    const captureDistance = $("audio-capture-distance");
    if (captureDistance) captureDistance.value = 6;
    const captureDistanceVal = $("audio-capture-distance-val");
    if (captureDistanceVal) captureDistanceVal.textContent = "6/10";
    previewAudioFiltersFromUi();
  });
  var _a43;
  (_a43 = $("ctx-audio")) == null ? void 0 : _a43.addEventListener("click", () => {
    const client = activeContextClient;
    closeContextMenu();
    if (client) openAudioFiltersModal(client);
  });
  var _a44;
  (_a44 = $("ctx-rec-audio")) == null ? void 0 : _a44.addEventListener("click", () => {
    const client = activeContextClient;
    closeContextMenu();
    if (client) toggleDefaultRecordingAudioClient(client);
  });
  var _a45;
  (_a45 = $("btn-audio-filters-cancel")) == null ? void 0 : _a45.addEventListener("click", () => closeAudioFiltersModal(true));
  var _a46;
  (_a46 = $("btn-audio-filters-save")) == null ? void 0 : _a46.addEventListener("click", saveAudioFiltersModal);
  document.addEventListener("click", (e) => {
    const menu = $("custom-context-menu");
    if (menu && !menu.hidden) {
      const isMenuClick = menu.contains(e.target) || e.target.closest(".ctx-item");
      if (!isMenuClick) {
        closeContextMenu();
      }
    }
  });
  function teardownCoHost() {
    var _a47, _b, _c;
    if (!isCoHostInstance) return;
    isCoHostInstance = false;
    hostReady = false;
    if (signaling) signaling.removeListener(coHostHandleMessage);
    if (els.sidebar) els.sidebar.hidden = true;
    (_a47 = els.appMain) == null ? void 0 : _a47.classList.remove("sidebar-open");
    (_b = els.appMain) == null ? void 0 : _b.classList.remove("sidebar-collapsed");
    (_c = els.sidebar) == null ? void 0 : _c.classList.remove("is-collapsed");
    if (els.btnSidebarCollapse) {
      els.btnSidebarCollapse.setAttribute("aria-expanded", "false");
    }
  }
  function initCoHost(clientSignaling, clientMedia, clientPeerId) {
    var _a47;
    signaling = clientSignaling;
    media = clientMedia;
    hostPeerId = clientPeerId;
    isCoHostInstance = true;
    hostReady = true;
    if (els.sidebar) els.sidebar.hidden = false;
    (_a47 = els.appMain) == null ? void 0 : _a47.classList.add("sidebar-open");
    updateRecordingUi(RecordingState.IDLE);
    updateMuteButtonIcon();
    setupRecordingsDirInput();
    setupRecordingFilenamePattern();
    setupRecordingAudioPrefs();
    setupSettingsInteraction();
    installAudioUnlock(() => {
      var _a48, _b, _c;
      hostAudioMonitor == null ? void 0 : hostAudioMonitor.resume();
      (_b = (_a48 = els.previewAudio) == null ? void 0 : _a48.play) == null ? void 0 : _b.call(_a48).catch(() => {
      });
      if (hostAudioMonitor && !((_c = hostAudioMonitor.isAutoplayBlocked) == null ? void 0 : _c.call(hostAudioMonitor))) {
        hostMicAutoplayNeeded = false;
        updateHostMicUi();
      }
    });
    signaling.addListener(coHostHandleMessage);
    signaling.send("solicitarEstado", {});
  }
  var isHostPage = window.location.pathname.includes("/host");
  if (isHostPage) {
    verifyServerBuild({
      onToast: (m, t) => showToast2(m, t),
      onTitlePrefix: (prefix) => {
        document.title = prefix + (document.title.replace(/^\[[^\]]+\]\s*/, "") || "ShareScreen Host");
      }
    });
    bootstrap();
  }
})();
//# sourceMappingURL=app.bundle.js.map
