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
                this._map.on('click contextmenu dblclick', this._handleClick, this);
            }
            if (this._options.events.mousemove === true) {
                this._map.on('mousemove', this._throttle(this._handleMouseMove, this._options.throttleMs, this._options.throttleOptions), this);
            }
            return this;
        }
        disable() {
            this._map.off('click contextmenu dblclick', this._handleClick, this);
            this._map.off('mousemove', this._throttle(this._handleMouseMove, this._options.throttleMs, this._options.throttleOptions), this);
            return this;
        }
        _isElementInsideControl(element) {
            if (element.classList.value.indexOf('leaflet-bar') >= 0
                || element.classList.value.indexOf('leaflet-control-container') >= 0
                || element.classList.value.indexOf('leaflet-control') >= 0)
                return true;
            if (element.parentElement != null)
                return this._isElementInsideControl(element.parentElement);
            return false;
        }
        _handleMouseMove(event) {
            if (event.originalEvent._stopped) {
                return;
            }
            var currentTarget = event.originalEvent.target;
            var stopped;
            var removed;
            if (currentTarget && currentTarget instanceof HTMLElement && this._isElementInsideControl(currentTarget)) {
                return;
            }
            removed = { node: currentTarget, pointerEvents: currentTarget.style.pointerEvents };
            currentTarget.style.pointerEvents = 'none';
            const nextTarget = document.elementFromPoint(event.originalEvent.clientX, event.originalEvent.clientY);
            const isCanvas = nextTarget && nextTarget.localName && nextTarget.localName.toLowerCase() === 'canvas';
            if (this._prevTarget && this._prevTarget != nextTarget) {
                this._prevTarget.dispatchEvent(new MouseEvent('mouseout', event.originalEvent));
                this._prevTarget.dispatchEvent(new MouseEvent('mouseleave', event.originalEvent));
                if (this._map) {
                    L.DomUtil.removeClass(this._map.getContainer(), 'leaflet-interactive');
                }
            }
            this._prevTarget = nextTarget;
            if (nextTarget &&
                nextTarget.nodeName.toLowerCase() !== 'body' &&
                nextTarget.classList.value.indexOf('leaflet-container') === -1) {
                if (nextTarget.classList.value.indexOf('gis-clickable') >= 0 || nextTarget.classList.value.indexOf('gis-tooltip') >= 0) {
                    if (this._map) {
                        L.DomUtil.addClass(this._map.getContainer(), 'leaflet-interactive');
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
                    ev.originalEvent = event.originalEvent && { _simulated: true };
                }
                else {
                    ev = new PointerEvent(event.originalEvent.type, event.originalEvent);
                    ;
                    ev.originalEvent = event.originalEvent && { _simulated: true };
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
    function eventForwarder(map) {
        return new L.EventForwarder(map);
    }
    L.eventForwarder = eventForwarder;
    L.Map.addInitHook("addHandler", "canvasEvents", L.eventForwarder);
})(L || (L = {}));
//# sourceMappingURL=EventForwarder.js.map