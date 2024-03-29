interface MouseEvent {
	_stopped?: boolean;
}

namespace L { 

	export interface MapOptions {
		canvasEventsOptions?: EventForwarderOptions;
		canvasEvents?: boolean;
	}
	export interface Map {
		canvasEvents: EventForwarder;
	}
	export class EventForwarderOptions {
		events: { [name: string]: boolean } = {
			click: true,
			mousemove: true
		};
        throttleMs: number = 100;
		throttleOptions: { [name: string]: boolean } = {
			leading: true,
			trailing: false
		};
	}

	export class EventForwarder extends L.Handler {
		private _options: EventForwarderOptions;
		private _prevTarget: any = null;
		private _map: L.Map;

		initialize(map: L.Map) {
			this._options = map.options && map.options.canvasEventsOptions ?
				{ ...new EventForwarderOptions(), ...map.options.canvasEventsOptions }
				: new EventForwarderOptions();
			this._map = map;
			this._map.canvasEvents = this;
		}

		override enable () : this {
			if (this._options.events.click === true) {
				this._map.on('click contextmenu dblclick', this._handleClick, this);
			}
			if (this._options.events.mousemove === true) {
				this._map.on('mousemove', this._throttle(this._handleMouseMove, this._options.throttleMs, this._options.throttleOptions), this);
			}
			return this;
		}

		override disable () : this {
			this._map.off('click contextmenu dblclick', this._handleClick, this);
            this._map.off('mousemove', this._throttle(this._handleMouseMove, this._options.throttleMs, this._options.throttleOptions), this);
			return this;
		}
		_isElementInsideControl(element: HTMLElement) :boolean {
			if (element.classList.value.indexOf('leaflet-bar') >= 0
                || element.classList.value.indexOf('leaflet-control-container') >= 0
                || element.classList.value.indexOf('leaflet-control') >= 0)
				return true;

            if (element.parentElement != null)
                return this._isElementInsideControl(element.parentElement);
			return false;
        }

		/**
		 * Handle `mousemove` event from map, i.e. forwards unhandled events
		 * @param event
		 * @private
		 */
		_handleMouseMove(event: L.LeafletMouseEvent) {

			// we use the maps mousemove event to avoid registering listeners
			// for each individual layer, however this means we don't receive
			// the layers mouseover/out events so we need to fudge it a little

			if (event.originalEvent._stopped) { return; }

			// get the target pane
			var currentTarget = event.originalEvent.target;
			var stopped;
			var removed;

			//we shound't add any magic when user is clicking leaflet controls
			//only forward clicks on true map surface
			if (currentTarget && currentTarget instanceof HTMLElement && this._isElementInsideControl(currentTarget)){
                return;
			}
				
			// hide the target node
			removed = { node: currentTarget, pointerEvents: currentTarget.style.pointerEvents };
			currentTarget.style.pointerEvents = 'none';

			// attempt to grab the next layer below
			const nextTarget = document.elementFromPoint(event.originalEvent.clientX, event.originalEvent.clientY);
			const isCanvas = nextTarget && nextTarget.localName && nextTarget.localName.toLowerCase() === 'canvas';

			// target has changed so trigger mouseout previous
			if (this._prevTarget && this._prevTarget != nextTarget) {
				this._prevTarget.dispatchEvent(new MouseEvent('mouseout', event.originalEvent));
				this._prevTarget.dispatchEvent(new MouseEvent('mouseleave', event.originalEvent));
				if (this._map) {
					L.DomUtil.removeClass(this._map.getContainer(), 'leaflet-interactive');
				}
			}
			this._prevTarget = nextTarget;

			// we keep drilling down until we get stopped,
			// or we reach the map container itself
			if (
				nextTarget &&
				nextTarget.nodeName.toLowerCase() !== 'body' &&
				nextTarget.classList.value.indexOf('leaflet-container') === -1
			) {
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

			// restore pointerEvents
			removed.node.style.pointerEvents = removed.pointerEvents;
		}

		/**
		 * Handle `click` event from map, i.e. forwards unhandled events
		 * @param event
		 * @private
		 */
		_handleClick (event: L.LeafletMouseEvent) {

			if (event.originalEvent._stopped) { return; }

			// get the target pane
			var currentTarget = event.originalEvent.target;
			var stopped;
			var removed;

			// hide the target node
			removed = { node: currentTarget, pointerEvents: currentTarget.style.pointerEvents };
			currentTarget.style.pointerEvents = 'none';

			// attempt to grab the next layer below
			let nextTarget = document.elementFromPoint(event.originalEvent.clientX, event.originalEvent.clientY);

			// we keep drilling down until we get stopped,
			// or we reach the map container itself
			if (
				nextTarget &&
				nextTarget.nodeName.toLowerCase() !== 'body' &&
				nextTarget.classList.value.indexOf('leaflet-container') === -1
			) {
				let ev;
				if (event.originalEvent instanceof MouseEvent && event.originalEvent._simulated) {
					ev = new MouseEvent(event.originalEvent.type, event.originalEvent) as MouseEvent & { originalEvent: Partial<MouseEvent> & {_simulated: boolean}};
					ev.originalEvent = event.originalEvent && {_simulated: true};
				}
				else {
					ev = new PointerEvent(event.originalEvent.type, event.originalEvent) as PointerEvent & { originalEvent: Partial<PointerEvent> & { _simulated: boolean } };;
                    ev.originalEvent = event.originalEvent && { _simulated: true };
				};
				stopped = !nextTarget.dispatchEvent(ev);
				if (stopped || ev._stopped) {
					L.DomEvent.stop(event);
				}
			}

			// restore pointerEvents
			removed.node.style.pointerEvents = removed.pointerEvents;
		}

		/**
		 * Pinched from underscore
		 * @param func
		 * @param wait
		 * @param options
		 * @returns {Function}
		 * @private
		 */
		_throttle(func: Function, wait: number, options: {trailing: boolean, leading: boolean}) {
			var context: any, args: any, result: any;
			var timeout: number | null = null;
			var previous = 0;
			if (!options) options = {};
			var later = function () {
				previous = options.leading === false ? 0 : Date.now();
				timeout = null;
				result = func.apply(context, args);
				if (!timeout) context = args = null;
			};
			return function () {
				var now = Date.now();
				if (!previous && options.leading === false) previous = now;
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
					if (!timeout) context = args = null;
				} else if (!timeout && options.trailing !== false) {
					timeout = setTimeout(later, remaining);
				}
				return result;
			};
		}
	}

	export function eventForwarder (map: L.Map) {
		return new L.EventForwarder(map);
	}
	L.Map.addInitHook("addHandler", "canvasEvents", L.eventForwarder);
}