 /*!
 * njPopover - v0.2
 * nejikrofl@gmail.com
 * Copyright (c) 2015 N.J.
*/
;(function(window, document, undefined){
'use strict';
var $ = window.jQuery || window.j;

if(!$) {
	throw new Error('njPopover requires jQuery or "j" library (https://github.com/Nejik/j)');
	return false;
}

//constructor
window.njPopover = function(opts) {
	opts = opts || {};

	if(!(this instanceof njPopover)) {//when we call njPopover not as a contructor, make instance and call it
		return new njPopover(opts);
	}

	this._init(opts);
	return this;
};

njPopover.forElement = function (elem) {//return instance
	return $(elem)[0].njPopover;
}

var proto = njPopover.prototype;

proto._init = function (opts) {
	opts = opts || {};
	var o = this.o = $.extend(true, {}, njPopover.defaults, opts),
		that = this;

	this._o = {};//inner options

	this.v = {};//object with cached variables

	o.$elem = $(o.elem);
	o.elem = $(o.elem)[0];

	if(o.attr === 'title') {
		this._o.origTitle = o.$elem.attr(o.attr);
		o.elem.removeAttribute(o.attr);
	}

	if(o.trigger) {
		var showEvent = '',
			hideEvent = '';

		switch(o.trigger) {
		case 'click':
			o.$elem.on('click.njp', function (e) {
						e.preventDefault();

						if(this.njPopover._o.shown) {
							this.njPopover.hide();
							return;
						}
						this.njPopover.show()

					})
		break;
		case 'hover':
			showEvent = 'mouseenter.njp'
			hideEvent = 'mouseleave.njp'
		break;
		
		case 'focus':
			showEvent = 'focus.njp'
			hideEvent = 'blur.njp'
		break;
		case 'follow':
			o.$elem.on('mouseenter.njp', function (e) {
						this.njPopover.show();

						$(document).off('mousemove.njp').on('mousemove.njp', function (e) {
							that.setPosition(e);
						})
					})
			.on('mouseleave.njp', function (e) {
				this.njPopover.hide();
				$(document).off('mousemove.njp');
			})
		break;
		}

		if(showEvent) {
			o.$elem.on(showEvent, function (e) {
						this.njPopover.show();

						e.preventDefault();
					})
		}

		if(hideEvent) {
			o.$elem.on(hideEvent, function (e) {
				var that = this;
				if(o.trigger === 'hover') {
					//if out popover loacated above trigger element, don't hide popover
					if($(e.relatedTarget).closest('.njPopover').length) {
						$(e.relatedTarget).closest('.njPopover').on(hideEvent, function () {
							that.njPopover.hide();
						})
						return;
					}
				}
				e.preventDefault();
				this.njPopover.hide();
			})
		}
	}

	o.elem.njPopover = this;
}

proto.show = function () {
	if(this._o.shown) return;
	var o = this.o,
			that = this;

	this._o.shown = true;
}

proto.hide = function () {
	console.log('hide')

	this._o.shown = false;
}

proto.setPosition = function () {
	console.log('move')
}


proto.destroy = function () {
	
}

njPopover.defaults = {
	container: 'body',//(selector) appends the tooltip to a specific element

	template:'',//(string) base HTML to use when creating the popover.
	attr: 'title',//get content for tooltip form this attribute
	type: 'text',//(text || html || selector) type of content, if selector used, whole element will be inserted in tooltip
	content: '',//(string || function) content for tooltip

	waitImg: true,//if we have img in tooltip with [data-njp-img="true"], wait until img begin downloading(to know it's size), only than show tooltip
	
	trigger: 'click',//(false || click || hover || focus || follow) how popover is triggered. false - manual triggering
	out: true,//(boolean) click outside popover will close it
	margin: 5,//(number) margin from element

	placement: 'top',//(top || bottom || left || right) how to position the popover
	auto: true,//(boolean) this option dynamically reorient the popover. For example, if placement is "left", the popover will display to the left when possible, otherwise it will display right.

	viewport: 'document'//(selector || false) keeps the popover within the bounds of this element.
}

})(window, document);