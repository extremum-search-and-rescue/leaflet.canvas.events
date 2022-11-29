var L;
(function (L) {
    class EventForwarderOptions {
        constructor() {
            this.events = {
                click: true,
                mousemove: true
            };
            this.throttleMs = 100;
            this.throttleOptions = {
                leading: true,
                trailing: false
            };
        }
    }
    L.EventForwarderOptions = EventForwarderOptions;
    class EventForwarder extends L.Handler {
        constructor() {
            super(...arguments);
            this._prevTarget = null;
        }
        initialize(map) {
            this._options = map.options && map.options.canvasEventsOptions ? Object.assign(Object.assign({}, new EventForwarderOptions()), map.options.canvasEventsOptions) : new EventForwarderOptions();
            this._map = map;
            this._map.canvasEvents = this;
        }
        enable() {
            if (this._options.events.click === true) {
                this._map.on('click', this._handleClick, this);
            }
            if (this._options.events.mousemove === true) {
                this._map.on('mousemove', this._throttle(this._handleMouseMove, this._options.throttleMs, this._options.throttleOptions), this);
            }
            return this;
        }
        disable() {
            L.DomEvent.off(this._map.getContainer(), 'click', this._handleClick, this);
            L.DomEvent.off(this._map.getContainer(), 'mousemove', this._throttle(this._handleMouseMove, this._options.throttleMs, this._options.throttleOptions), this);
            return this;
        }
        _handleMouseMove(event) {
            if (event.originalEvent._stopped) {
                return;
            }
            var currentTarget = event.originalEvent.target;
            var stopped;
            var removed;
            removed = { node: currentTarget, pointerEvents: currentTarget.style.pointerEvents };
            currentTarget.style.pointerEvents = 'none';
            const nextTarget = document.elementFromPoint(event.originalEvent.clientX, event.originalEvent.clientY);
            const isCanvas = nextTarget && nextTarget.localName && nextTarget.localName.toLowerCase() === 'canvas';
            if (this._prevTarget && this._prevTarget != nextTarget) {
                this._prevTarget.dispatchEvent(new MouseEvent('mouseout', event.originalEvent));
                this._prevTarget.dispatchEvent(new MouseEvent('mouseleave', event.originalEvent));
                if (this._map) {
                    L.DomUtil.removeClass(this._map.getPane('overlayPane'), 'leaflet-interactive');
                }
            }
            this._prevTarget = nextTarget;
            if (nextTarget &&
                nextTarget.nodeName.toLowerCase() !== 'body' &&
                nextTarget.classList.value.indexOf('leaflet-container') === -1) {
                if (nextTarget.classList.value.indexOf('gis-clickable') >= 0 || nextTarget.classList.value.indexOf('gis-tooltip') >= 0) {
                    if (this._map) {
                        L.DomUtil.addClass(this._map.getPane('overlayPane'), 'leaflet-interactive');
                        if (nextTarget.children.length > 0 && nextTarget.children[0].textContent) {
                            this._map.fire('gis:tooltip', {
                                message: nextTarget.children[0].textContent,
                                sourceTarget: nextTarget,
                                x: event.originalEvent.clientX,
                                y: event.originalEvent.clientY
                            });
                        }
                    }
                }
                let eventType = isCanvas ? 'mousemove' : 'mouseover';
                var ev = new MouseEvent(eventType, event.originalEvent);
                stopped = !nextTarget.dispatchEvent(ev);
                if (stopped || ev._stopped) {
                    L.DomEvent.stop(event);
                }
            }
            removed.node.style.pointerEvents = removed.pointerEvents;
        }
        _handleClick(event) {
            if (event.originalEvent._stopped) {
                return;
            }
            var currentTarget = event.originalEvent.target;
            var stopped;
            var removed;
            removed = { node: currentTarget, pointerEvents: currentTarget.style.pointerEvents };
            currentTarget.style.pointerEvents = 'none';
            let nextTarget = document.elementFromPoint(event.originalEvent.clientX, event.originalEvent.clientY);
            if (nextTarget &&
                nextTarget.nodeName.toLowerCase() !== 'body' &&
                nextTarget.classList.value.indexOf('leaflet-container') === -1) {
                let ev;
                if (event.originalEvent instanceof MouseEvent && event.originalEvent._simulated) {
                    ev = new MouseEvent(event.originalEvent.type, event.originalEvent);
                    ev.originalEvent._simulated = true;
                }
                else {
                    ev = new PointerEvent(event.originalEvent.type, event.originalEvent);
                }
                ;
                stopped = !nextTarget.dispatchEvent(ev);
                if (stopped || ev._stopped) {
                    L.DomEvent.stop(event);
                }
            }
            removed.node.style.pointerEvents = removed.pointerEvents;
        }
        _throttle(func, wait, options) {
            var context, args, result;
            var timeout = null;
            var previous = 0;
            if (!options)
                options = {};
            var later = function () {
                previous = options.leading === false ? 0 : Date.now();
                timeout = null;
                result = func.apply(context, args);
                if (!timeout)
                    context = args = null;
            };
            return function () {
                var now = Date.now();
                if (!previous && options.leading === false)
                    previous = now;
                var remaining = wait - (now - previous);
                context = this;
                args = arguments;
                if (remaining <= 0 || remaining > wait) {
                    if (timeout) {
                        clearTimeout(timeout);
                        timeout = null;
                    }
                    previous = now;
                    result = func.apply(context, args);
                    if (!timeout)
                        context = args = null;
                }
                else if (!timeout && options.trailing !== false) {
                    timeout = setTimeout(later, remaining);
                }
                return result;
            };
        }
    }
    L.EventForwarder = EventForwarder;
    function eventForwarder(options) {
        return new L.EventForwarder(options);
    }
    L.eventForwarder = eventForwarder;
    L.Map.addInitHook("addHandler", "canvasEvents", L.EventForwarder);
})(L || (L = {}));
