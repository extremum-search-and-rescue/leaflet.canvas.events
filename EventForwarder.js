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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiRXZlbnRGb3J3YXJkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJFdmVudEZvcndhcmRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFJQSxJQUFVLENBQUMsQ0FvT1Y7QUFwT0QsV0FBVSxDQUFDO0lBU1YsTUFBYSxxQkFBcUI7UUFBbEM7WUFDQyxXQUFNLEdBQWdDO2dCQUNyQyxLQUFLLEVBQUUsSUFBSTtnQkFDWCxTQUFTLEVBQUUsSUFBSTthQUNmLENBQUM7WUFDSSxlQUFVLEdBQVcsR0FBRyxDQUFDO1lBQy9CLG9CQUFlLEdBQWdDO2dCQUM5QyxPQUFPLEVBQUUsSUFBSTtnQkFDYixRQUFRLEVBQUUsS0FBSzthQUNmLENBQUM7UUFDSCxDQUFDO0tBQUE7SUFWWSx1QkFBcUIsd0JBVWpDLENBQUE7SUFFRCxNQUFhLGNBQWUsU0FBUSxDQUFDLENBQUMsT0FBTztRQUE3Qzs7WUFFUyxnQkFBVyxHQUFRLElBQUksQ0FBQztRQXVNakMsQ0FBQztRQXBNQSxVQUFVLENBQUMsR0FBVTtZQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxPQUFPLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLGlDQUMxRCxJQUFJLHFCQUFxQixFQUFFLEdBQUssR0FBRyxDQUFDLE9BQU8sQ0FBQyxtQkFBbUIsRUFDcEUsQ0FBQyxDQUFDLElBQUkscUJBQXFCLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQztZQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDL0IsQ0FBQztRQUVRLE1BQU07WUFDZCxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssS0FBSyxJQUFJLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLDRCQUE0QixFQUFFLElBQUksQ0FBQyxZQUFZLEVBQUUsSUFBSSxDQUFDLENBQUM7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