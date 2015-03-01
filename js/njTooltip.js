 /*!
 * njTooltip - v0.1
 * nejikrofl@gmail.com
 * Copyright (c) 2015 N.J.
*/
;(function(window, document, undefined){
'use strict';
var $ = window.jQuery || window.j;


//constructor
window.njPopover = function (opts) {
	opts = opts || {};
	if(!(this instanceof njPopover)) {//when we call njTabs not as a contructor, make instance and call it
		// return new njTabs(opts);
		return;
	}


	var o = this.o = $.extend(true, {}, njPopover.defaults, opts),
		that = this;


	o.$elem = $(o.elem);

	this._o = {};//inner options

	this.v = {};//object with cached variables

	o.elem.njPopover = this;


	
	//bind
	if(o.trigger) {
		var showEvent = '',
			hideEvent = '';
		switch(o.trigger) {
		case 'hover':
			showEvent = 'mouseenter.njPopover'
			hideEvent = 'mouseleave.njPopover'
		break;
		case 'click':
			o.$elem.on('click.njPopover', function (e) {
						e.preventDefault();

						if(this.njPopover._o.shown) {
							this.njPopover.hide();
							return;
						}
						this.njPopover.show()

					})
		break;
		case 'focus':
			showEvent = 'focus.njPopover'
			hideEvent = 'blur.njPopover'
		break;
		}


		if(showEvent) {
			o.$elem.on(showEvent, function (e) {
						this.njPopover.show()

						e.preventDefault();
					})
		}

		if(hideEvent) {
			o.$elem.on(hideEvent, function (e) {
				e.preventDefault();
				this.njPopover.hide();
			})
		}
	}
}

var njt = njPopover.prototype;

njt.show = function () {
	if(this._o.shown) return;
	var o = this.o;


	o.content = o.elem.getAttribute('data-tooltip');
	this.v.container = $(o.container);


	this.v.tooltip = document.createElement('div');
	this.v.tooltip.className = 'njPopover';

	if(o.html) {
		this.v.tooltip.html(o.content);
	} else {
		this.v.tooltip.text(o.content);
	}


	this.v.container[0].appendChild(this.v.tooltip);



	var coords = this._getCoords(o.elem);
	var scroll = this._getPageScroll();



	var left = coords.left + (o.elem.offsetWidth - this.v.tooltip.offsetWidth)/2^0;
	if (left < scroll.left) left = scroll.left; // не вылезать за левую границу экрана

	var top = coords.top - this.v.tooltip.offsetHeight - o.margin;
	if (top < scroll.top) top = coords.top + o.elem.offsetHeight + o.margin;


	this.v.tooltip.style.left = left + 'px';
	this.v.tooltip.style.top = top + 'px';


	this._o.shown = true;
}

njt.hide = function () {
	if(!this._o.shown) return;
	var o = this.o;
	document.body.removeChild(this.v.tooltip);

	delete this.v.tooltip;
	this.o.content = null;

	this._o.shown = false;
}








njt._getCoords = function (elem) {
	var box = elem.getBoundingClientRect();
	
	var body = document.body;
	var docEl = document.documentElement;

	var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
	var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

	var clientTop = docEl.clientTop || body.clientTop || 0;
	var clientLeft = docEl.clientLeft || body.clientLeft || 0;

	var top  = box.top +  scrollTop - clientTop;
	var left = box.left + scrollLeft - clientLeft;

	return { top: Math.round(top), left: Math.round(left) };
}


njt._getPageScroll = function () {
	if (window.pageXOffset != undefined) {
	  return {
		left: pageXOffset,
		top: pageYOffset
	  }
	}

	var html = document.documentElement;
	var body = document.body;

	var top = html.scrollTop || body && body.scrollTop || 0;
	top -= html.clientTop;

	var left = html.scrollLeft || body && body.scrollLeft || 0;
	left -= html.clientLeft;

	return { top: top, left: left };
}

njPopover.defaults = {
	selector: 'data-tooltip',
	container: 'body',
	html: false,
	trigger: 'hover',
	out: true,//click outside popover will close it
	margin: 5
}


//autobind
$(document).on('DOMContentLoaded', function () {
	$('['+njPopover.defaults.selector+']').each(function () {
		new njPopover({elem:this});
	})
})

})(window, document);